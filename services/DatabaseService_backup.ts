/**
 * Enhanced Database Service for Receipt Management
 * 
 * This service handles step 4 of the receipt processing workflow:
 * Store structured and categorized receipt data in NoSQL database (Firestore or AsyncStorage)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, getFirestore, limit, orderBy, query, Timestamp, updateDoc, where } from 'firebase/firestore';
import getConfig from '../config/environment';
import { ProcessedReceipt, ProcessingResult } from '../types/receipt';

// Firebase configuration interface
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

/**
 * Enhanced Database Service
 * 
 * Supports both Firestore (production) and AsyncStorage (development/offline)
 * This is step 4 of the receipt processing workflow.
 */
class DatabaseService {
  private config = getConfig();
  private firestore: any = null;
  private isInitialized = false;

  // Collection names
  private readonly COLLECTIONS = {
    RECEIPTS: 'receipts',
    USERS: 'users',
    INSIGHTS: 'monthly_insights',
    CATEGORIES: 'categories',
    SETTINGS: 'settings',
  };

  // AsyncStorage keys (fallback)
  private readonly STORAGE_KEYS = {
    RECEIPTS: '@slipscan_receipts',
    INSIGHTS: '@slipscan_insights',
    CATEGORIES: '@slipscan_categories',
    SETTINGS: '@slipscan_settings',
  };

  constructor() {
    this.initialize();
  }

  /**
   * Initialize database connection
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (this.config.database.provider === 'firestore' && this.config.database.projectId) {
        await this.initializeFirestore();
      } else {
        if (this.config.app.enableLogging) {
          console.log('📱 Using AsyncStorage for local database');
        }
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      if (this.config.app.enableLogging) {
        console.log('📱 Falling back to AsyncStorage');
      }
      this.isInitialized = true;
    }
  }

  /**
   * Initialize Firestore connection
   */
  private async initializeFirestore(): Promise<void> {
    try {
      // Use existing Firebase config from firebaseConfig.js or create new
      const firebaseConfig: FirebaseConfig = {
        apiKey: this.config.googleCloud.apiKey ?? '',
        authDomain: `${this.config.database.projectId}.firebaseapp.com`,
        projectId: this.config.database.projectId!,
        storageBucket: `${this.config.database.projectId}.appspot.com`,
        messagingSenderId: '123456789',
        appId: '1:123456789:web:abcdef123456',
      };

      const app = initializeApp(firebaseConfig, 'slipscan-db');
      this.firestore = getFirestore(app);
      
      if (this.config.app.enableLogging) {
        console.log('🔥 Firestore initialized successfully');
      }
    } catch (error) {
      console.error('Failed to initialize Firestore:', error);
      throw error;
    }
  }

  /**
   * Store processed receipt in database
   */
  async storeReceipt(receipt: ProcessedReceipt): Promise<ProcessingResult<{ id: string }>> {
    await this.initialize();
    
    try {
      let id: string;

      if (this.firestore) {
        // Store in Firestore
        const docRef = await addDoc(collection(this.firestore, this.COLLECTIONS.RECEIPTS), {
          ...receipt,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        id = docRef.id;
      } else {
        // Store in AsyncStorage
        const receipts = await this.getAsyncStorageCollection<ProcessedReceipt>(this.STORAGE_KEYS.RECEIPTS);
        const newReceipt = {
          ...receipt,
          id: receipt.id || this.generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        receipts.push(newReceipt);
        await AsyncStorage.setItem(this.STORAGE_KEYS.RECEIPTS, JSON.stringify(receipts));
        id = newReceipt.id;
      }

      if (this.config.app.enableLogging) {
        console.log(`✅ Receipt stored successfully with ID: ${id}`);
      }

      return {
        success: true,
        data: { id },
      };

    } catch (error) {
      console.error('❌ Failed to store receipt:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Retrieve receipt by ID
   */
  async getReceipt(id: string): Promise<ProcessingResult<ProcessedReceipt>> {
    await this.initialize();
    
    try {
      let receipt: ProcessedReceipt | null = null;

      if (this.firestore) {
        // Get from Firestore
        const docRef = doc(this.firestore, this.COLLECTIONS.RECEIPTS, id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          receipt = {
            ...data,
            id: docSnap.id,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
          } as ProcessedReceipt;
        }
      } else {
        // Get from AsyncStorage
        const receipts = await this.getAsyncStorageCollection<ProcessedReceipt>(this.STORAGE_KEYS.RECEIPTS);
        receipt = receipts.find(r => r.id === id) || null;
      }

      if (!receipt) {
        return {
          success: false,
          error: 'Receipt not found',
        };
      }

      return {
        success: true,
        data: receipt,
      };

    } catch (error) {
      console.error('❌ Failed to get receipt:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get all receipts with optional filtering
   */
  async getReceipts(filters?: {
    category?: ItemCategory;
    merchantName?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }): Promise<ProcessingResult<ProcessedReceipt[]>> {
    await this.initialize();
    
    try {
      let receipts: ProcessedReceipt[] = [];

      if (this.firestore) {
        // Query Firestore
        let q = query(
          collection(this.firestore, this.COLLECTIONS.RECEIPTS),
          orderBy('createdAt', 'desc')
        );

        if (filters?.category) {
          q = query(q, where('overallCategory', '==', filters.category));
        }

        if (filters?.merchantName) {
          q = query(q, where('merchant.name', '==', filters.merchantName));
        }

        if (filters?.limit) {
          q = query(q, limit(filters.limit));
        }

        const querySnapshot = await getDocs(q);
        receipts = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
          } as ProcessedReceipt;
        });
      } else {
        // Get from AsyncStorage
        receipts = await this.getAsyncStorageCollection<ProcessedReceipt>(this.STORAGE_KEYS.RECEIPTS);
        
        // Apply filters
        if (filters?.category) {
          receipts = receipts.filter(r => r.overallCategory === filters.category);
        }
        
        if (filters?.merchantName) {
          receipts = receipts.filter(r => 
            r.merchant.name.toLowerCase().includes(filters.merchantName!.toLowerCase())
          );
        }
        
        if (filters?.dateFrom) {
          receipts = receipts.filter(r => r.createdAt >= filters.dateFrom!);
        }
        
        if (filters?.dateTo) {
          receipts = receipts.filter(r => r.createdAt <= filters.dateTo!);
        }
        
        // Sort by creation date (newest first)
        receipts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        if (filters?.limit) {
          receipts = receipts.slice(0, filters.limit);
        }
      }

      return {
        success: true,
        data: receipts,
      };

    } catch (error) {
      console.error('❌ Failed to get receipts:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update receipt
   */
  async updateReceipt(id: string, updates: Partial<ProcessedReceipt>): Promise<ProcessingResult<void>> {
    await this.initialize();
    
    try {
      if (this.firestore) {
        // Update in Firestore
        const docRef = doc(this.firestore, this.COLLECTIONS.RECEIPTS, id);
        await updateDoc(docRef, {
          ...updates,
          updatedAt: Timestamp.now(),
        });
      } else {
        // Update in AsyncStorage
        const receipts = await this.getAsyncStorageCollection<ProcessedReceipt>(this.STORAGE_KEYS.RECEIPTS);
        const index = receipts.findIndex(r => r.id === id);
        
        if (index === -1) {
          throw new Error('Receipt not found');
        }
        
        receipts[index] = {
          ...receipts[index],
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        
        await AsyncStorage.setItem(this.STORAGE_KEYS.RECEIPTS, JSON.stringify(receipts));
      }

      if (this.config.app.enableLogging) {
        console.log(`✅ Receipt ${id} updated successfully`);
      }

      return {
        success: true,
      };

    } catch (error) {
      console.error('❌ Failed to update receipt:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete receipt
   */
  async deleteReceipt(id: string): Promise<ProcessingResult<void>> {
    await this.initialize();
    
    try {
      if (this.firestore) {
        // Delete from Firestore
        await deleteDoc(doc(this.firestore, this.COLLECTIONS.RECEIPTS, id));
      } else {
        // Delete from AsyncStorage
        const receipts = await this.getAsyncStorageCollection<ProcessedReceipt>(this.STORAGE_KEYS.RECEIPTS);
        const filtered = receipts.filter(r => r.id !== id);
        await AsyncStorage.setItem(this.STORAGE_KEYS.RECEIPTS, JSON.stringify(filtered));
      }

      if (this.config.app.enableLogging) {
        console.log(`✅ Receipt ${id} deleted successfully`);
      }

      return {
        success: true,
      };

    } catch (error) {
      console.error('❌ Failed to delete receipt:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Store monthly insights
   */
  async storeInsights(insights: MonthlyInsights): Promise<ProcessingResult<{ id: string }>> {
    await this.initialize();
    
    try {
      let id: string;

      if (this.firestore) {
        // Store in Firestore
        const docRef = await addDoc(collection(this.firestore, this.COLLECTIONS.INSIGHTS), {
          ...insights,
          generatedAt: Timestamp.now(),
        });
        id = docRef.id;
      } else {
        // Store in AsyncStorage
        const allInsights = await this.getAsyncStorageCollection<MonthlyInsights>(this.STORAGE_KEYS.INSIGHTS);
        const newInsights = {
          ...insights,
          generatedAt: new Date().toISOString(),
        };
        
        // Replace existing insights for the same month
        const filtered = allInsights.filter(i => i.month !== insights.month);
        filtered.push(newInsights);
        
        await AsyncStorage.setItem(this.STORAGE_KEYS.INSIGHTS, JSON.stringify(filtered));
        id = `insights_${insights.month}`;
      }

      if (this.config.app.enableLogging) {
        console.log(`✅ Monthly insights stored for ${insights.month}`);
      }

      return {
        success: true,
        data: { id },
      };

    } catch (error) {
      console.error('❌ Failed to store insights:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get monthly insights
   */
  async getInsights(month?: string): Promise<ProcessingResult<MonthlyInsights[]>> {
    await this.initialize();
    
    try {
      let insights: MonthlyInsights[] = [];

      if (this.firestore) {
        // Query Firestore
        let q = query(
          collection(this.firestore, this.COLLECTIONS.INSIGHTS),
          orderBy('month', 'desc')
        );

        if (month) {
          q = query(q, where('month', '==', month));
        }

        const querySnapshot = await getDocs(q);
        insights = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            generatedAt: data.generatedAt?.toDate?.()?.toISOString() || data.generatedAt,
          } as MonthlyInsights;
        });
      } else {
        // Get from AsyncStorage
        insights = await this.getAsyncStorageCollection<MonthlyInsights>(this.STORAGE_KEYS.INSIGHTS);
        
        if (month) {
          insights = insights.filter(i => i.month === month);
        }
        
        insights.sort((a, b) => b.month.localeCompare(a.month));
      }

      return {
        success: true,
        data: insights,
      };

    } catch (error) {
      console.error('❌ Failed to get insights:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get spending analytics for a date range
   */
  async getSpendingAnalytics(dateFrom: string, dateTo: string): Promise<ProcessingResult<{
    totalSpent: number;
    transactionCount: number;
    categoryBreakdown: Array<{ category: ItemCategory; amount: number; count: number }>;
    merchantBreakdown: Array<{ merchant: string; amount: number; count: number }>;
  }>> {
    try {
      const receiptsResult = await this.getReceipts({ dateFrom, dateTo });
      
      if (!receiptsResult.success || !receiptsResult.data) {
        return {
          success: false,
          error: receiptsResult.error || 'Failed to get receipts',
        };
      }

      const receipts = receiptsResult.data;
      const totalSpent = receipts.reduce((sum, r) => sum + r.totals.total, 0);
      const transactionCount = receipts.length;

      // Category breakdown
      const categoryMap = new Map<ItemCategory, { amount: number; count: number }>();
      receipts.forEach(receipt => {
        const existing = categoryMap.get(receipt.overallCategory) || { amount: 0, count: 0 };
        categoryMap.set(receipt.overallCategory, {
          amount: existing.amount + receipt.totals.total,
          count: existing.count + 1,
        });
      });

      const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
      }));

      // Merchant breakdown
      const merchantMap = new Map<string, { amount: number; count: number }>();
      receipts.forEach(receipt => {
        const merchantName = receipt.merchant.name;
        const existing = merchantMap.get(merchantName) || { amount: 0, count: 0 };
        merchantMap.set(merchantName, {
          amount: existing.amount + receipt.totals.total,
          count: existing.count + 1,
        });
      });

      const merchantBreakdown = Array.from(merchantMap.entries())
        .map(([merchant, data]) => ({
          merchant,
          amount: data.amount,
          count: data.count,
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10); // Top 10 merchants

      return {
        success: true,
        data: {
          totalSpent,
          transactionCount,
          categoryBreakdown,
          merchantBreakdown,
        },
      };

    } catch (error) {
      console.error('❌ Failed to get spending analytics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Helper method to get collection from AsyncStorage
   */
  private async getAsyncStorageCollection<T>(key: string): Promise<T[]> {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error(`Failed to get AsyncStorage collection ${key}:`, error);
      return [];
    }
  }

  /**
   * Generate unique ID for AsyncStorage records
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all data (for testing/development)
   */
  async clearAllData(): Promise<ProcessingResult<void>> {
    try {
      if (this.firestore) {
        // Note: In production, you'd want to batch delete or use server-side functions
        console.warn('Clearing Firestore data not implemented (requires batch operations)');
      } else {
        // Clear AsyncStorage
        await Promise.all([
          AsyncStorage.removeItem(this.STORAGE_KEYS.RECEIPTS),
          AsyncStorage.removeItem(this.STORAGE_KEYS.INSIGHTS),
          AsyncStorage.removeItem(this.STORAGE_KEYS.CATEGORIES),
          AsyncStorage.removeItem(this.STORAGE_KEYS.SETTINGS),
        ]);
      }

      if (this.config.app.enableLogging) {
        console.log('✅ All data cleared');
      }

      return {
        success: true,
      };

    } catch (error) {
      console.error('❌ Failed to clear data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
const databaseService = new DatabaseService();
export default databaseService;

// Export types for use in other modules
export type { MonthlyInsights, ProcessedReceipt };
