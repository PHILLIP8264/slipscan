/**
 * Database Service for SlipScan (No Categorization)
 * 
 * Handles data storage and retrieval using AsyncStorage (local) or Firestore (cloud)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDoc, collection, doc, getDocs, orderBy, query, Timestamp, updateDoc, where } from 'firebase/firestore';
import getConfig from '../config/environment';
import { ProcessedReceipt, ProcessingResult } from '../types/receipt';

// Firestore interface
interface ReceiptFilters {
  dateFrom?: string;
  dateTo?: string;
  merchant?: string;
  minAmount?: number;
  maxAmount?: number;
}

/**
 * Database Service for Receipt Storage (No Categorization)
 */
class DatabaseService {
  private config = getConfig();
  private firestore?: any = null;
  
  // AsyncStorage keys
  private readonly STORAGE_KEYS = {
    RECEIPTS: 'slipscan_receipts',
    SETTINGS: 'slipscan_settings',
  };

  // Firestore collection names
  private readonly COLLECTIONS = {
    RECEIPTS: 'receipts',
  };

  constructor() {
    if (this.config.app.enableLogging) {
      console.log('💾 DatabaseService initialized');
    }
  }

  /**
   * Initialize database connection
   */
  async initialize(): Promise<void> {
    if (this.config.database.provider === 'firestore') {
      try {
        // Initialize Firestore (implementation depends on your Firebase setup)
        // this.firestore = getFirestore();
        console.log('🔥 Firestore initialization skipped (not configured)');
      } catch (error) {
        console.error('❌ Firestore initialization failed:', error);
        console.log('📱 Falling back to AsyncStorage');
      }
    }
  }

  /**
   * Store a processed receipt
   */
  async storeReceipt(receipt: ProcessedReceipt): Promise<ProcessingResult<{ id: string }>> {
    await this.initialize();
    
    console.log('💾 DATABASE STORE DEBUG - Receipt being stored:');
    console.log('  - ID:', receipt.id);
    console.log('  - Merchant:', receipt.merchant?.name);
    console.log('  - Total:', receipt.totals?.total);
    console.log('  - VAT:', receipt.totals?.tax);
    console.log('  - Tip:', receipt.totals?.tip);
    console.log('  - Payment Method:', receipt.payment?.method);
    console.log('  - Items Count:', receipt.items?.length);
    console.log('  - Items with Categories:', receipt.items?.map(item => ({ 
      name: (item as any).name, 
      category: (item as any).category,
      categoryConfidence: (item as any).categoryConfidence
    })));
    console.log('  - Raw Fields Present:', !!receipt.rawFields);
    console.log('  - Metadata Present:', !!receipt.metadata);
    console.log('  - Full Receipt Structure:', JSON.stringify(receipt, null, 2));
    
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
        const existingReceipts = await this.getAsyncStorageCollection<ProcessedReceipt>(this.STORAGE_KEYS.RECEIPTS);
        const newReceipt = {
          ...receipt,
          id: receipt.id || this.generateId(),
        };
        
        existingReceipts.push(newReceipt);
        await AsyncStorage.setItem(this.STORAGE_KEYS.RECEIPTS, JSON.stringify(existingReceipts));
        id = newReceipt.id;
      }

      if (this.config.app.enableLogging) {
        console.log(`✅ Receipt stored with ID: ${id}`);
      }

      console.log('💾 DATABASE STORE SUCCESS - Confirmed stored with ID:', id);
      console.log('✅ All Gemini data preservation completed successfully!');

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
   * Update an existing receipt
   */
  async updateReceipt(receiptId: string, updates: Partial<ProcessedReceipt>): Promise<ProcessingResult<void>> {
    await this.initialize();
    
    try {
      if (this.firestore) {
        // Update in Firestore
        const receiptRef = doc(this.firestore, this.COLLECTIONS.RECEIPTS, receiptId);
        await updateDoc(receiptRef, {
          ...updates,
          updatedAt: Timestamp.now(),
        });
      } else {
        // Update in AsyncStorage
        const receipts = await this.getAsyncStorageCollection<ProcessedReceipt>(this.STORAGE_KEYS.RECEIPTS);
        const receiptIndex = receipts.findIndex(r => r.id === receiptId);
        
        if (receiptIndex === -1) {
          throw new Error('Receipt not found');
        }

        receipts[receiptIndex] = {
          ...receipts[receiptIndex],
          ...updates,
          updatedAt: new Date().toISOString(),
        };

        await AsyncStorage.setItem(this.STORAGE_KEYS.RECEIPTS, JSON.stringify(receipts));
      }

      if (this.config.app.enableLogging) {
        console.log(`✅ Receipt ${receiptId} updated`);
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
   * Get receipts with optional filtering
   */
  async getReceipts(filters?: ReceiptFilters): Promise<ProcessingResult<ProcessedReceipt[]>> {
    await this.initialize();
    
    try {
      let receipts: ProcessedReceipt[] = [];

      if (this.firestore) {
        // Query Firestore
        let q = query(
          collection(this.firestore, this.COLLECTIONS.RECEIPTS),
          orderBy('createdAt', 'desc')
        );

        if (filters?.dateFrom) {
          q = query(q, where('transaction.date', '>=', filters.dateFrom));
        }
        if (filters?.dateTo) {
          q = query(q, where('transaction.date', '<=', filters.dateTo));
        }
        if (filters?.merchant) {
          q = query(q, where('merchant.name', '==', filters.merchant));
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
        receipts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }

      // Apply local filters (for both storage types)
      if (filters) {
        if (filters.dateFrom) {
          receipts = receipts.filter(r => r.transaction.date >= filters.dateFrom!);
        }
        if (filters.dateTo) {
          receipts = receipts.filter(r => r.transaction.date <= filters.dateTo!);
        }
        if (filters.merchant) {
          receipts = receipts.filter(r => r.merchant.name.toLowerCase().includes(filters.merchant!.toLowerCase()));
        }
        if (filters.minAmount !== undefined) {
          receipts = receipts.filter(r => r.totals.total >= filters.minAmount!);
        }
        if (filters.maxAmount !== undefined) {
          receipts = receipts.filter(r => r.totals.total <= filters.maxAmount!);
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
   * Get a single receipt by ID
   */
  async getReceipt(receiptId: string): Promise<ProcessingResult<ProcessedReceipt | null>> {
    await this.initialize();
    
    try {
      if (this.firestore) {
        // Get from Firestore
        const docSnap = await getDocs(query(collection(this.firestore, this.COLLECTIONS.RECEIPTS), where('__name__', '==', receiptId)));
        
        if (docSnap.empty) {
          return {
            success: true,
            data: null,
          };
        }

        const docSnapshot = docSnap.docs[0];
        const data = docSnapshot.data();
        const receipt: ProcessedReceipt = {
          ...data,
          id: docSnapshot.id,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        } as ProcessedReceipt;

        return {
          success: true,
          data: receipt,
        };
      } else {
        // Get from AsyncStorage
        const receipts = await this.getAsyncStorageCollection<ProcessedReceipt>(this.STORAGE_KEYS.RECEIPTS);
        const receipt = receipts.find(r => r.id === receiptId) || null;

        return {
          success: true,
          data: receipt,
        };
      }

    } catch (error) {
      console.error('❌ Failed to get receipt:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get basic spending analytics for a date range
   */
  async getSpendingAnalytics(dateFrom: string, dateTo: string): Promise<ProcessingResult<{
    totalSpent: number;
    transactionCount: number;
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
export type { ProcessedReceipt };
