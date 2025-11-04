import AsyncStorage from "@react-native-async-storage/async-storage";

// React Native compatible UUID generator
function generateUUID(): string {
  let d = new Date().getTime();
  let d2 = (typeof performance !== 'undefined' && performance.now && (performance.now() * 1000)) || 0;
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    let r = Math.random() * 16;
    if (d > 0) {
      r = (d + r) % 16 | 0;
      d = Math.floor(d / 16);
    } else {
      r = (d2 + r) % 16 | 0;
      d2 = Math.floor(d2 / 16);
    }
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// Define your document interfaces (NoSQL style)
export interface Category {
  _id: string;
  name: string;
  color: string;
  budgetAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryBudget {
  categoryId: string;
  categoryName: string; // Add category name for easier lookup
  budgetAmount: number;
  spent: number; // Track how much has been spent
  remainingAmount: number; // Calculated: budgetAmount - spent
}

export interface Budget {
  _id: string;
  month: string;
  categoryBudgets: CategoryBudget[];
  totalBudget: number; // Calculated from categoryBudgets
  remainingBudget: number; // Calculated from categoryBudgets
  createdAt: Date;
  updatedAt: Date;
}

export interface Receipt {
  _id: string;
  // Merchant Information
  merchant: string;
  merchantPhone?: string;
  merchantAddress?: string;
  
  // Transaction Details
  amount: number;
  tax?: number;
  subtotal?: number;
  date: Date;
  paymentMethod?: string; // Payment method from receipt
  
  // Line Items
  items: ReceiptItem[];
  
  // Legacy fields
  tags: string[];
  
  // Media & Processing
  imageUrl?: string;
  ocrText: string;
  
  // Metadata
  currency: string; // e.g., "ZAR"
  locale: string;   // e.g., "en-ZA"
  confidence: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  itemPrice: number;  // Unit price
  lineTotal: number;  // Total for this line item
  confidence: number;
  category?: string;  // Category name (matches budget categories)
  categoryConfidence?: number;  // AI confidence in category assignment
}

export interface User {
  _id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  settings?: string;
  categoryIds: string[]; // References to categories
  budgetIds: string[]; // References to budgets
  receiptIds: string[]; // References to receipts
}

// Collection keys for AsyncStorage
export const COLLECTIONS = {
  USERS: "users",
  CATEGORIES: "categories",
  BUDGETS: "budgets",
  RECEIPTS: "receipts",
} as const;

// NoSQL Database Manager
export class NoSQLDB {
  // Generic method to get all documents from a collection
  static async getCollection<T>(collectionName: string): Promise<T[]> {
    try {
      console.log(`Getting collection: ${collectionName}`);
      const data = await AsyncStorage.getItem(collectionName);
      console.log(`Raw data for ${collectionName}:`, data ? 'Found data' : 'No data');
      const result = data ? JSON.parse(data) : [];
      console.log(`Parsed ${collectionName}:`, result.length, 'items');
      return result;
    } catch (error) {
      console.error(`Error getting collection ${collectionName}:`, error);
      return [];
    }
  }

  // Generic method to save entire collection
  static async saveCollection<T>(
    collectionName: string,
    documents: T[]
  ): Promise<void> {
    try {
      console.log(`Saving collection ${collectionName} with ${documents.length} items`);
      await AsyncStorage.setItem(collectionName, JSON.stringify(documents));
      console.log(`Successfully saved ${collectionName}`);
    } catch (error) {
      console.error(`Error saving collection ${collectionName}:`, error);
      throw error;
    }
  }

  // Get document by ID from collection
  static async getDocumentById<T extends { _id: string }>(
    collectionName: string,
    id: string
  ): Promise<T | null> {
    const collection = await this.getCollection<T>(collectionName);
    return collection.find((doc) => doc._id === id) || null;
  }

  // Add document to collection
  static async addDocument<
    T extends { _id: string; createdAt: Date; updatedAt: Date }
  >(
    collectionName: string,
    document: Omit<T, "_id" | "createdAt" | "updatedAt"> & { _id?: string }
  ): Promise<T> {
    const collection = await this.getCollection<T>(collectionName);
    const now = new Date();

    const newDocument = {
      ...document,
      _id: document._id || generateUUID(),
      createdAt: now,
      updatedAt: now,
    } as unknown as T;

    collection.push(newDocument);
    await this.saveCollection(collectionName, collection);
    return newDocument;
  }

  // Update document in collection
  static async updateDocument<T extends { _id: string; updatedAt: Date }>(
    collectionName: string,
    id: string,
    updates: Partial<Omit<T, "_id" | "createdAt">>
  ): Promise<T | null> {
    const collection = await this.getCollection<T>(collectionName);
    const index = collection.findIndex((doc) => doc._id === id);

    if (index === -1) return null;

    const updatedDocument = {
      ...collection[index],
      ...updates,
      updatedAt: new Date(),
    } as T;

    collection[index] = updatedDocument;
    await this.saveCollection(collectionName, collection);
    return updatedDocument;
  }

  // Delete document from collection
  static async deleteDocument<T extends { _id: string }>(
    collectionName: string,
    id: string
  ): Promise<boolean> {
    const collection = await this.getCollection<T>(collectionName);
    const initialLength = collection.length;
    const filtered = collection.filter((doc) => doc._id !== id);

    if (filtered.length < initialLength) {
      await this.saveCollection(collectionName, filtered);
      return true;
    }
    return false;
  }

  // Query documents with filter function
  static async queryDocuments<T>(
    collectionName: string,
    filterFn: (doc: T) => boolean
  ): Promise<T[]> {
    const collection = await this.getCollection<T>(collectionName);
    return collection.filter(filterFn);
  }

  // Clear all data (useful for development/testing)
  static async clearAllData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(COLLECTIONS.USERS),
        AsyncStorage.removeItem(COLLECTIONS.CATEGORIES),
        AsyncStorage.removeItem(COLLECTIONS.BUDGETS),
        AsyncStorage.removeItem(COLLECTIONS.RECEIPTS),
      ]);
    } catch (error) {
      console.error("Error clearing all data:", error);
      throw error;
    }
  }

  // Clear only budgets (useful for fixing budget issues)
  static async clearAllBudgets(): Promise<void> {
    try {
      await AsyncStorage.removeItem(COLLECTIONS.BUDGETS);
      
      // Also clear budget IDs from all users
      const users = await this.getCollection<User>(COLLECTIONS.USERS);
      const updatedUsers = users.map(user => ({
        ...user,
        budgetIds: []
      }));
      
      await AsyncStorage.setItem(COLLECTIONS.USERS, JSON.stringify(updatedUsers));
      
      console.log('✅ Cleared all budgets and reset user budget links');
    } catch (error) {
      console.error("Error clearing budgets:", error);
      throw error;
    }
  }
}

// Conversion helper to transform ProcessedReceipt to local Receipt format
// Convert Receipt back to ProcessedReceipt format
export function convertLocalReceiptToProcessed(receipt: Receipt): any {
  console.log('🔄 CONVERT BACK DEBUG - Input Receipt:', JSON.stringify(receipt, null, 2));
  
  const processedReceipt = {
    id: receipt._id,
    originalImageUri: receipt.imageUrl || '',
    rawText: receipt.ocrText,
    
    merchant: {
      name: receipt.merchant,
      phone_number: receipt.merchantPhone,
      address: receipt.merchantAddress,
      confidence: receipt.confidence || 0.8
    },
    
    transaction: {
      date: receipt.date instanceof Date ? receipt.date.toISOString().split('T')[0] : new Date(receipt.date).toISOString().split('T')[0],
      confidence: receipt.confidence || 0.8
    },
    
    items: receipt.items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.itemPrice,
      totalPrice: item.lineTotal,
      confidence: item.confidence || 0.8,
      category: item.category,
      categoryConfidence: item.categoryConfidence
    })),
    
    totals: {
      subtotal: receipt.subtotal || (receipt.amount - (receipt.tax || 0)),
      tax: receipt.tax || 0,
      total: receipt.amount,
      confidence: receipt.confidence || 0.8
    },
    
    payment: {
      method: receipt.paymentMethod || 'other',
      confidence: 0.5
    },
    
    processingSteps: [{
      step: 'database_storage',
      status: 'success',
      confidence: receipt.confidence || 0.8,
      processingTime: 0
    }],
    
    confidence: {
      overall: receipt.confidence || 0.8,
      textExtraction: 0.8,
      documentParsing: 0.8,
      dataQuality: (receipt.confidence || 0.8) > 0.8 ? 'high' : 'medium'
    },
    
    createdAt: receipt.createdAt instanceof Date ? receipt.createdAt.toISOString() : new Date(receipt.createdAt).toISOString(),
    updatedAt: receipt.updatedAt instanceof Date ? receipt.updatedAt.toISOString() : new Date(receipt.updatedAt).toISOString(),
    tags: receipt.tags || [],
    notes: '',
    
    // Additional fields for compatibility
    currency: receipt.currency,
    locale: receipt.locale
  };
  
  console.log('✅ CONVERT BACK DEBUG - Output ProcessedReceipt:', JSON.stringify(processedReceipt, null, 2));
  console.log('💳 PAYMENT DEBUG - Payment method being loaded:', processedReceipt.payment.method);
  console.log('📅 DATE DEBUG - Date being loaded:', processedReceipt.transaction.date);
  return processedReceipt;
}

export function convertProcessedReceiptToLocal(processedReceipt: any, imageUrl?: string): Omit<Receipt, "_id" | "createdAt" | "updatedAt"> {
  console.log('🔄 CONVERT DEBUG - Input ProcessedReceipt:', JSON.stringify(processedReceipt, null, 2));
  
  // Simple date extraction from OCR text or provided date
  const extractReceiptDate = (): Date => {
    // First try the provided date fields
    let dateStr = processedReceipt.transaction?.date || 
                  processedReceipt.transactionInfo?.date || 
                  processedReceipt.date;
    
    // If no date in fields, try to extract from OCR text
    if (!dateStr) {
      const ocrText = processedReceipt.rawText || processedReceipt.ocrText || '';
      const dateMatch = ocrText.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
      if (dateMatch) {
        dateStr = dateMatch[1];
        console.log('📅 Found date in OCR text:', dateStr);
      }
    }
    
    if (!dateStr) {
      console.log('📅 No date found, using current date');
      return new Date();
    }
    
    // Parse YY/MM/DD format (Gemini's consistent format)
    const yymmddMatch = String(dateStr).match(/(\d{2})\/(\d{1,2})\/(\d{1,2})/);
    if (yymmddMatch) {
      const year = parseInt(yymmddMatch[1]) + 2000; // Convert YY to 20YY
      const month = parseInt(yymmddMatch[2]) - 1; // 0-indexed
      const day = parseInt(yymmddMatch[3]);
      const parsed = new Date(year, month, day);
      console.log('📅 Parsed YY/MM/DD date:', dateStr, '→', parsed.toDateString());
      return parsed;
    }
    
    // Fallback: Parse YYYY/MM/DD or DD/MM/YYYY format
    const fullDateMatch = String(dateStr).match(/(\d{1,4})\/(\d{1,2})\/(\d{1,4})/);
    if (fullDateMatch) {
      const part1 = parseInt(fullDateMatch[1]);
      const part2 = parseInt(fullDateMatch[2]);
      const part3 = parseInt(fullDateMatch[3]);
      
      // If first part is 4 digits, it's YYYY/MM/DD
      if (part1 > 31) {
        const year = part1;
        const month = part2 - 1;
        const day = part3;
        const parsed = new Date(year, month, day);
        console.log('📅 Parsed YYYY/MM/DD date:', dateStr, '→', parsed.toDateString());
        return parsed;
      }
      // If third part is 4 digits, it's DD/MM/YYYY
      else if (part3 > 31) {
        const day = part1;
        const month = part2 - 1;
        const year = part3;
        const parsed = new Date(year, month, day);
        console.log('📅 Parsed DD/MM/YYYY date:', dateStr, '→', parsed.toDateString());
        return parsed;
      }
    }
    
    console.log('📅 Could not parse date:', dateStr, '- using current date');
    return new Date();
  };

  // Extract receipt date using simplified approach
  const receiptDate = extractReceiptDate();
  
  // Handle merchant info more comprehensively
  const merchantName = processedReceipt.merchant?.name || 
                      processedReceipt.merchantInfo?.name || 
                      processedReceipt.merchant || 
                      'Unknown Merchant';
  
  // Handle merchant contact info
  const merchantPhone = processedReceipt.merchant?.phone_number || 
                       processedReceipt.merchant?.phone || 
                       processedReceipt.merchantInfo?.phone_number ||
                       processedReceipt.merchantInfo?.phone;
  
  const merchantAddress = processedReceipt.merchant?.address || 
                         processedReceipt.merchantInfo?.address;
  
  // Handle amounts more carefully
  const totalAmount = processedReceipt.totals?.total || 
                     processedReceipt.total || 
                     processedReceipt.amount || 
                     0;
  
  const taxAmount = processedReceipt.totals?.tax || 
                   processedReceipt.tax || 
                   0;
  
  const subtotalAmount = processedReceipt.totals?.subtotal || 
                        processedReceipt.subtotal || 
                        (totalAmount - taxAmount);
  
  // Handle items conversion with better mapping
  const items = (processedReceipt.items || processedReceipt.lineItems || []).map((item: any, index: number) => {
    const itemName = item.name || item.description || 'Unknown Item';
    const quantity = item.quantity || 1;
    const unitPrice = item.unitPrice || item.itemprice || item.itemPrice || 0;
    const lineTotal = item.totalPrice || item.linetotal || item.lineTotal || (unitPrice * quantity);
    
    console.log(`🔄 CONVERT ITEM ${index + 1}:`, {
      original_name: item.name,
      original_category: item.category,
      original_linetotal: item.linetotal,
      original_lineTotal: item.lineTotal,
      original_totalPrice: item.totalPrice,
      converted_name: itemName,
      converted_category: item.category,
      converted_lineTotal: lineTotal
    });
    
    return {
      name: itemName,
      quantity: quantity,
      itemPrice: unitPrice,
      lineTotal: lineTotal,
      confidence: item.confidence || 0.8,
      category: item.category, // This should preserve the category
      categoryConfidence: item.categoryConfidence
    };
  });
  
  const convertedReceipt = {
    // Merchant info
    merchant: merchantName,
    merchantPhone: merchantPhone,
    merchantAddress: typeof merchantAddress === 'string' ? merchantAddress : 
                    (merchantAddress ? JSON.stringify(merchantAddress) : undefined),
    
    // Transaction totals
    amount: totalAmount,
    tax: taxAmount,
    subtotal: subtotalAmount,
    
    // Date
    date: receiptDate,
    paymentMethod: processedReceipt.payment?.method || processedReceipt.paymentInfo?.method || processedReceipt.paymentMethod,
    
    // Line items
    items: items,
    
    // Tags
    tags: processedReceipt.tags || [],
    
    // Media and processing
    imageUrl: imageUrl || processedReceipt.originalImageUri || processedReceipt.imageUrl,
    ocrText: processedReceipt.rawText || processedReceipt.ocrText || '',
    
    // Metadata
    currency: processedReceipt.currency || processedReceipt.metadata?.currency || 'ZAR',
    locale: processedReceipt.locale || processedReceipt.metadata?.locale || 'en-ZA',
    confidence: processedReceipt.confidence?.overall || processedReceipt.confidence || 0.8,
  };
  
  console.log('✅ CONVERT DEBUG - Output Receipt:', JSON.stringify(convertedReceipt, null, 2));
  console.log('💳 PAYMENT DEBUG - Payment method being saved:', convertedReceipt.paymentMethod);
  console.log('📅 DATE DEBUG - Final date being saved to database:', receiptDate.toISOString(), '(', receiptDate.toLocaleDateString(), ')');
  return convertedReceipt;
}

// Helper functions for relationships (NoSQL style)
export class RelationshipHelpers {
  // Get user with populated categories, budgets, and receipts
  static async getUserWithRelations(userId: string): Promise<{
    user: User;
    categories: Category[];
    budgets: Budget[];
    receipts: Receipt[];
  } | null> {
    const user = await NoSQLDB.getDocumentById<User>(COLLECTIONS.USERS, userId);
    if (!user) return null;

    const [categories, budgets, receipts] = await Promise.all([
      Promise.all(
        user.categoryIds.map((id) =>
          NoSQLDB.getDocumentById<Category>(COLLECTIONS.CATEGORIES, id)
        )
      ),
      Promise.all(
        user.budgetIds.map((id) =>
          NoSQLDB.getDocumentById<Budget>(COLLECTIONS.BUDGETS, id)
        )
      ),
      Promise.all(
        user.receiptIds.map((id) =>
          NoSQLDB.getDocumentById<Receipt>(COLLECTIONS.RECEIPTS, id)
        )
      ),
    ]);

    return {
      user,
      categories: categories.filter(Boolean) as Category[],
      budgets: budgets.filter(Boolean) as Budget[],
      receipts: receipts.filter(Boolean) as Receipt[],
    };
  }

  // Add category to user
  static async addCategoryToUser(
    userId: string,
    category: Omit<Category, "_id" | "createdAt" | "updatedAt">
  ): Promise<Category | null> {
    const newCategory = await NoSQLDB.addDocument<Category>(
      COLLECTIONS.CATEGORIES,
      category
    );

    const user = await NoSQLDB.getDocumentById<User>(COLLECTIONS.USERS, userId);
    if (!user) return null;

    await NoSQLDB.updateDocument<User>(COLLECTIONS.USERS, userId, {
      categoryIds: [...user.categoryIds, newCategory._id],
    });

    return newCategory;
  }

  // Add budget to user
  static async addBudgetToUser(
    userId: string,
    budget: Omit<Budget, "_id" | "createdAt" | "updatedAt">
  ): Promise<Budget | null> {
    const newBudget = await NoSQLDB.addDocument<Budget>(
      COLLECTIONS.BUDGETS,
      budget
    );

    const user = await NoSQLDB.getDocumentById<User>(COLLECTIONS.USERS, userId);
    if (!user) return null;

    await NoSQLDB.updateDocument<User>(COLLECTIONS.USERS, userId, {
      budgetIds: [...user.budgetIds, newBudget._id],
    });

    return newBudget;
  }

  // Add receipt to user
  static async addReceiptToUser(
    userId: string,
    receipt: Omit<Receipt, "_id" | "createdAt" | "updatedAt">
  ): Promise<Receipt | null> {
    console.log('💾 SAVE DEBUG - Input receipt to save:', JSON.stringify(receipt, null, 2));
    
    const newReceipt = await NoSQLDB.addDocument<Receipt>(
      COLLECTIONS.RECEIPTS,
      receipt
    );
    
    console.log('💾 SAVE DEBUG - Saved receipt with ID:', newReceipt._id);
    console.log('💾 SAVE DEBUG - Saved receipt data:', JSON.stringify(newReceipt, null, 2));

    const user = await NoSQLDB.getDocumentById<User>(COLLECTIONS.USERS, userId);
    if (!user) {
      console.error('💾 SAVE DEBUG - User not found:', userId);
      return null;
    }

    await NoSQLDB.updateDocument<User>(COLLECTIONS.USERS, userId, {
      receiptIds: [...user.receiptIds, newReceipt._id],
    });

    console.log('💾 SAVE DEBUG - Updated user receiptIds:', [...user.receiptIds, newReceipt._id]);
    return newReceipt;
  }

  // Add processed receipt directly to user (convenience method)
  static async addProcessedReceiptToUser(
    userId: string,
    processedReceipt: any,
    imageUrl?: string
  ): Promise<Receipt | null> {
    const localReceipt = convertProcessedReceiptToLocal(processedReceipt, imageUrl);
    return this.addReceiptToUser(userId, localReceipt);
  }

  // Delete receipt from user and database
  static async deleteReceiptFromUser(
    userId: string,
    receiptId: string
  ): Promise<boolean> {
    try {
      console.log('🗑️ DELETE DEBUG - Deleting receipt:', receiptId, 'from user:', userId);
      
      // First, remove receipt from user's receiptIds array
      const user = await NoSQLDB.getDocumentById<User>(COLLECTIONS.USERS, userId);
      if (!user) {
        console.error('🗑️ DELETE DEBUG - User not found:', userId);
        return false;
      }

      // Remove receipt ID from user's array
      const updatedReceiptIds = user.receiptIds.filter(id => id !== receiptId);
      await NoSQLDB.updateDocument<User>(COLLECTIONS.USERS, userId, {
        receiptIds: updatedReceiptIds,
      });

      console.log('🗑️ DELETE DEBUG - Updated user receiptIds:', updatedReceiptIds);

      // Then delete the receipt from the receipts collection
      const deleted = await NoSQLDB.deleteDocument(COLLECTIONS.RECEIPTS, receiptId);
      
      console.log('🗑️ DELETE DEBUG - Receipt deleted from database:', deleted);
      return deleted;
    } catch (error) {
      console.error('🗑️ DELETE DEBUG - Error deleting receipt:', error);
      return false;
    }
  }
}
