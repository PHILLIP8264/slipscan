// Receipt Management for SlipScan
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ReceiptData } from "./OCRModule";

export interface StoredReceipt extends ReceiptData {
  id: string;
  imageUri: string;
  pdfUri?: string;
  createdAt: string;
  category: string;
  notes?: string;
}

export interface ReceiptCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
}

const STORAGE_KEYS = {
  RECEIPTS: "@slipscan_receipts",
  CATEGORIES: "@slipscan_categories",
  USER_ID: "@slipscan_user_id",
};

// Default categories
const DEFAULT_CATEGORIES: ReceiptCategory[] = [
  { id: "1", name: "Food & Dining", color: "#FF6B6B", icon: "restaurant" },
  { id: "2", name: "Groceries", color: "#4ECDC4", icon: "basket" },
  { id: "3", name: "Transportation", color: "#45B7D1", icon: "car" },
  { id: "4", name: "Shopping", color: "#96CEB4", icon: "bag" },
  { id: "5", name: "Healthcare", color: "#FFEAA7", icon: "medical" },
  { id: "6", name: "Entertainment", color: "#DDA0DD", icon: "ticket" },
  { id: "7", name: "Utilities", color: "#98D8C8", icon: "flash" },
  { id: "8", name: "Other", color: "#95A5A6", icon: "ellipsis-horizontal" },
];

class ReceiptManager {
  // Initialize categories if they don't exist
  static async initializeCategories(): Promise<void> {
    try {
      const existingCategories = await AsyncStorage.getItem(
        STORAGE_KEYS.CATEGORIES
      );
      if (!existingCategories) {
        await AsyncStorage.setItem(
          STORAGE_KEYS.CATEGORIES,
          JSON.stringify(DEFAULT_CATEGORIES)
        );
      }
    } catch (error) {
      console.error("Error initializing categories:", error);
    }
  }

  // Save a new receipt
  static async saveReceipt(
    receiptData: ReceiptData,
    imageUri: string,
    pdfUri?: string,
    category: string = "8", // Default to "Other"
    notes?: string
  ): Promise<StoredReceipt> {
    try {
      const id =
        Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const receipt: StoredReceipt = {
        id,
        ...receiptData,
        imageUri,
        pdfUri,
        createdAt: new Date().toISOString(),
        category,
        notes,
      };

      const existingReceipts = await this.getAllReceipts();
      const updatedReceipts = [...existingReceipts, receipt];

      await AsyncStorage.setItem(
        STORAGE_KEYS.RECEIPTS,
        JSON.stringify(updatedReceipts)
      );
      return receipt;
    } catch (error) {
      console.error("Error saving receipt:", error);
      throw error;
    }
  }

  // Get all receipts
  static async getAllReceipts(): Promise<StoredReceipt[]> {
    try {
      const receipts = await AsyncStorage.getItem(STORAGE_KEYS.RECEIPTS);
      return receipts ? JSON.parse(receipts) : [];
    } catch (error) {
      console.error("Error getting receipts:", error);
      return [];
    }
  }

  // Get receipts by category
  async getReceiptsByCategory(
    categoryId: string
  ): Promise<StoredReceipt[]> {
    try {
      const allReceipts = await ReceiptManager.getAllReceipts();
      return allReceipts.filter((receipt: any) => 
        receipt.items && receipt.items.some((item: any) => item.category === categoryId)
      );
    } catch (error) {
      console.error("Error getting receipts by category:", error);
      return [];
    }
  }

  // Get receipts by date range
  static async getReceiptsByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<StoredReceipt[]> {
    try {
      const allReceipts = await this.getAllReceipts();
      return allReceipts.filter((receipt) => {
        const receiptDate = new Date(receipt.createdAt);
        return receiptDate >= startDate && receiptDate <= endDate;
      });
    } catch (error) {
      console.error("Error getting receipts by date range:", error);
      return [];
    }
  }

  // Update receipt
  static async updateReceipt(
    id: string,
    updates: Partial<StoredReceipt>
  ): Promise<StoredReceipt | null> {
    try {
      const receipts = await this.getAllReceipts();
      const receiptIndex = receipts.findIndex((r) => r.id === id);

      if (receiptIndex === -1) {
        throw new Error("Receipt not found");
      }

      receipts[receiptIndex] = { ...receipts[receiptIndex], ...updates };
      await AsyncStorage.setItem(
        STORAGE_KEYS.RECEIPTS,
        JSON.stringify(receipts)
      );

      return receipts[receiptIndex];
    } catch (error) {
      console.error("Error updating receipt:", error);
      throw error;
    }
  }

  // Delete receipt
  static async deleteReceipt(id: string): Promise<boolean> {
    try {
      const receipts = await this.getAllReceipts();
      const updatedReceipts = receipts.filter((r) => r.id !== id);

      await AsyncStorage.setItem(
        STORAGE_KEYS.RECEIPTS,
        JSON.stringify(updatedReceipts)
      );
      return true;
    } catch (error) {
      console.error("Error deleting receipt:", error);
      return false;
    }
  }

  // Get categories
  static async getCategories(): Promise<ReceiptCategory[]> {
    try {
      await this.initializeCategories();
      const categories = await AsyncStorage.getItem(STORAGE_KEYS.CATEGORIES);
      return categories ? JSON.parse(categories) : DEFAULT_CATEGORIES;
    } catch (error) {
      console.error("Error getting categories:", error);
      return DEFAULT_CATEGORIES;
    }
  }

  // Get spending summary by category
  static async getSpendingSummary(monthsBack: number = 1): Promise<{
    totalSpent: number;
    categoryBreakdown: {
      category: ReceiptCategory;
      amount: number;
      count: number;
    }[];
  }> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - monthsBack);

      const receipts = await this.getReceiptsByDateRange(startDate, endDate);
      const categories = await this.getCategories();

      let totalSpent = 0;
      const categoryTotals: {
        [key: string]: { amount: number; count: number };
      } = {};

      // Calculate totals
      receipts.forEach((receipt) => {
        const amount = parseFloat(receipt.total) || 0;
        totalSpent += amount;

        // Aggregate by item categories
        if (receipt.items && Array.isArray(receipt.items)) {
          receipt.items.forEach((item: any) => {
            const category = item.category || 'Uncategorized';
            const itemAmount = item.lineTotal || 0;
            
            if (!categoryTotals[category]) {
              categoryTotals[category] = { amount: 0, count: 0 };
            }
            categoryTotals[category].amount += itemAmount;
            categoryTotals[category].count += 1;
          });
        } else {
          // Fallback for receipts without items
          const category = 'Uncategorized';
          if (!categoryTotals[category]) {
            categoryTotals[category] = { amount: 0, count: 0 };
          }
          categoryTotals[category].amount += amount;
          categoryTotals[category].count += 1;
        }
      });

      // Create breakdown with category info
      const categoryBreakdown = Object.entries(categoryTotals).map(
        ([categoryId, data]) => {
          const category =
            categories.find((c) => c.id === categoryId) ||
            DEFAULT_CATEGORIES[7]; // Default to "Other"
          return {
            category,
            amount: data.amount,
            count: data.count,
          };
        }
      );

      // Sort by amount descending
      categoryBreakdown.sort((a, b) => b.amount - a.amount);

      return { totalSpent, categoryBreakdown };
    } catch (error) {
      console.error("Error getting spending summary:", error);
      return { totalSpent: 0, categoryBreakdown: [] };
    }
  }

  // Search receipts
  static async searchReceipts(query: string): Promise<StoredReceipt[]> {
    try {
      const allReceipts = await this.getAllReceipts();
      const lowercaseQuery = query.toLowerCase();

      return allReceipts.filter(
        (receipt) =>
          receipt.merchant.toLowerCase().includes(lowercaseQuery) ||
          receipt.rawText.toLowerCase().includes(lowercaseQuery) ||
          (receipt.notes &&
            receipt.notes.toLowerCase().includes(lowercaseQuery))
      );
    } catch (error) {
      console.error("Error searching receipts:", error);
      return [];
    }
  }
}

export default ReceiptManager;
