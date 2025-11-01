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
  
  // Line Items
  items: ReceiptItem[];
  
  // Legacy fields
  category?: string; // Keep for backward compatibility
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
}

// Conversion helper to transform ProcessedReceipt to local Receipt format
export function convertProcessedReceiptToLocal(processedReceipt: any, imageUrl?: string): Omit<Receipt, "_id" | "createdAt" | "updatedAt"> {
  return {
    // Merchant info
    merchant: processedReceipt.merchant?.name || processedReceipt.merchantInfo?.name || 'Unknown Merchant',
    merchantPhone: processedReceipt.merchant?.phone_number || processedReceipt.merchantInfo?.phone_number,
    merchantAddress: typeof processedReceipt.merchant?.address === 'string' 
      ? processedReceipt.merchant.address 
      : processedReceipt.merchantInfo?.address,
    
    // Transaction totals
    amount: processedReceipt.totals?.total || 0,
    tax: processedReceipt.totals?.tax || 0,
    subtotal: processedReceipt.totals?.subtotal,
    
    // Date
    date: new Date(processedReceipt.transaction?.date || processedReceipt.transactionInfo?.date || new Date()),
    
    // Line items conversion
    items: (processedReceipt.items || processedReceipt.lineItems || []).map((item: any) => ({
      name: item.name || 'Unknown Item',
      quantity: item.quantity || 1,
      itemPrice: item.itemprice || item.unitPrice || item.totalPrice || 0,
      lineTotal: item.linetotal || item.totalPrice || 0,
      confidence: item.confidence || 0.5,
    })),
    
    // Legacy and metadata
    category: processedReceipt.overallCategory || undefined,
    tags: processedReceipt.tags || [],
    imageUrl: imageUrl || processedReceipt.originalImageUri,
    ocrText: processedReceipt.rawText || '',
    currency: processedReceipt.metadata?.currency || 'ZAR',
    locale: processedReceipt.metadata?.locale || 'en-ZA',
    confidence: processedReceipt.confidence?.overall || 0.5,
  };
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
    const newReceipt = await NoSQLDB.addDocument<Receipt>(
      COLLECTIONS.RECEIPTS,
      receipt
    );

    const user = await NoSQLDB.getDocumentById<User>(COLLECTIONS.USERS, userId);
    if (!user) return null;

    await NoSQLDB.updateDocument<User>(COLLECTIONS.USERS, userId, {
      receiptIds: [...user.receiptIds, newReceipt._id],
    });

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
}
