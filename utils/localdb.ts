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
  merchant: string;
  amount: number;
  category: string;
  date: Date;
  tags: string[];
  imageUrl?: string;
  ocrText: string;
  createdAt: Date;
  updatedAt: Date;
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
}
