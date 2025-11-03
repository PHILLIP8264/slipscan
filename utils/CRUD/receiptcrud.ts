import { COLLECTIONS, NoSQLDB, Receipt } from "../localdb";

// Create a new receipt
export async function createReceipt(receiptData: {
  merchant: string;
  amount: number;
  category?: string;
  date: Date;
  tags: string[];
  imageUrl?: string;
  ocrText: string;
  items?: any[];
  currency?: string;
  locale?: string;
  confidence?: number;
}): Promise<Receipt> {
  try {
    const fullReceiptData = {
      ...receiptData,
      items: receiptData.items || [],
      currency: receiptData.currency || 'ZAR',
      locale: receiptData.locale || 'en-ZA',
      confidence: receiptData.confidence || 0.8
    };
    
    return await NoSQLDB.addDocument<Receipt>(
      COLLECTIONS.RECEIPTS,
      fullReceiptData
    );
  } catch (error) {
    console.error("Error creating receipt:", error);
    throw error;
  }
}

// Get a receipt by ID
export async function getReceiptById(id: string): Promise<Receipt | null> {
  try {
    console.log('📖 CRUD DEBUG - Getting receipt by ID:', id);
    const receipt = await NoSQLDB.getDocumentById<Receipt>(COLLECTIONS.RECEIPTS, id);
    console.log('📖 CRUD DEBUG - Retrieved receipt:', JSON.stringify(receipt, null, 2));
    return receipt;
  } catch (error) {
    console.error("Error getting receipt by ID:", error);
    throw error;
  }
}

// Update a receipt by ID
export async function updateReceipt(
  id: string,
  updates: Partial<
    Pick<
      Receipt,
      | "merchant"
      | "amount"
      | "category"
      | "date"
      | "tags"
      | "imageUrl"
      | "ocrText"
    >
  >
): Promise<Receipt | null> {
  try {
    return await NoSQLDB.updateDocument<Receipt>(
      COLLECTIONS.RECEIPTS,
      id,
      updates
    );
  } catch (error) {
    console.error("Error updating receipt:", error);
    throw error;
  }
}

// Delete a receipt by ID
export async function deleteReceipt(id: string): Promise<boolean> {
  try {
    return await NoSQLDB.deleteDocument(COLLECTIONS.RECEIPTS, id);
  } catch (error) {
    console.error("Error deleting receipt:", error);
    throw error;
  }
}

// List all receipts
export async function listReceipts(): Promise<Receipt[]> {
  try {
    return await NoSQLDB.getCollection<Receipt>(COLLECTIONS.RECEIPTS);
  } catch (error) {
    console.error("Error listing receipts:", error);
    throw error;
  }
}

// Get receipts by merchant
export async function getReceiptsByMerchant(
  merchant: string
): Promise<Receipt[]> {
  try {
    return await NoSQLDB.queryDocuments<Receipt>(
      COLLECTIONS.RECEIPTS,
      (receipt) =>
        receipt.merchant.toLowerCase().includes(merchant.toLowerCase())
    );
  } catch (error) {
    console.error("Error getting receipts by merchant:", error);
    throw error;
  }
}

// Get receipts by category
export async function getReceiptsByCategory(
  category: string
): Promise<Receipt[]> {
  try {
    return await NoSQLDB.queryDocuments<Receipt>(
      COLLECTIONS.RECEIPTS,
      (receipt) => receipt.category?.toLowerCase().includes(category.toLowerCase()) ?? false
    );
  } catch (error) {
    console.error("Error getting receipts by category:", error);
    throw error;
  }
}

// Get receipts within a date range
export async function getReceiptsInDateRange(
  startDate: Date,
  endDate: Date
): Promise<Receipt[]> {
  try {
    return await NoSQLDB.queryDocuments<Receipt>(
      COLLECTIONS.RECEIPTS,
      (receipt) => {
        const receiptDate = new Date(receipt.date);
        return receiptDate >= startDate && receiptDate <= endDate;
      }
    );
  } catch (error) {
    console.error("Error getting receipts in date range:", error);
    throw error;
  }
}

// Get receipts within an amount range
export async function getReceiptsInAmountRange(
  minAmount: number,
  maxAmount: number
): Promise<Receipt[]> {
  try {
    return await NoSQLDB.queryDocuments<Receipt>(
      COLLECTIONS.RECEIPTS,
      (receipt) => receipt.amount >= minAmount && receipt.amount <= maxAmount
    );
  } catch (error) {
    console.error("Error getting receipts in amount range:", error);
    throw error;
  }
}

// Search receipts by tags
export async function getReceiptsByTag(tag: string): Promise<Receipt[]> {
  try {
    return await NoSQLDB.queryDocuments<Receipt>(
      COLLECTIONS.RECEIPTS,
      (receipt) =>
        receipt.tags.some((t) => t.toLowerCase().includes(tag.toLowerCase()))
    );
  } catch (error) {
    console.error("Error getting receipts by tag:", error);
    throw error;
  }
}

// Search receipts by OCR text content
export async function searchReceiptsByOCR(
  searchText: string
): Promise<Receipt[]> {
  try {
    return await NoSQLDB.queryDocuments<Receipt>(
      COLLECTIONS.RECEIPTS,
      (receipt) =>
        receipt.ocrText.toLowerCase().includes(searchText.toLowerCase())
    );
  } catch (error) {
    console.error("Error searching receipts by OCR:", error);
    throw error;
  }
}

// Get recent receipts (last N receipts)
export async function getRecentReceipts(
  limit: number = 10
): Promise<Receipt[]> {
  try {
    const allReceipts = await NoSQLDB.getCollection<Receipt>(
      COLLECTIONS.RECEIPTS
    );
    return allReceipts
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, limit);
  } catch (error) {
    console.error("Error getting recent receipts:", error);
    throw error;
  }
}

// Get total spending by category
export async function getTotalSpendingByCategory(): Promise<{
  [category: string]: number;
}> {
  try {
    const receipts = await NoSQLDB.getCollection<Receipt>(COLLECTIONS.RECEIPTS);
    const spending: { [category: string]: number } = {};

    receipts.forEach((receipt) => {
      const category = receipt.category || 'Uncategorized';
      if (!spending[category]) {
        spending[category] = 0;
      }
      spending[category] += receipt.amount;
    });

    return spending;
  } catch (error) {
    console.error("Error getting total spending by category:", error);
    throw error;
  }
}
