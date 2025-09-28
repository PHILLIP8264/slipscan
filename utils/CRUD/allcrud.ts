import {
  Budget,
  Category,
  COLLECTIONS,
  NoSQLDB,
  Receipt,
  User,
} from "../localdb";

// Get all documents from all collections
export async function getAllDocs() {
  try {
    const [users, categories, budgets, receipts] = await Promise.all([
      NoSQLDB.getCollection<User>(COLLECTIONS.USERS),
      NoSQLDB.getCollection<Category>(COLLECTIONS.CATEGORIES),
      NoSQLDB.getCollection<Budget>(COLLECTIONS.BUDGETS),
      NoSQLDB.getCollection<Receipt>(COLLECTIONS.RECEIPTS),
    ]);

    return { users, categories, budgets, receipts };
  } catch (error) {
    console.error("Error getting all documents:", error);
    throw error;
  }
}

// Get statistics about the database
export async function getDBStats() {
  const { users, categories, budgets, receipts } = await getAllDocs();

  return {
    totalUsers: users.length,
    totalCategories: categories.length,
    totalBudgets: budgets.length,
    totalReceipts: receipts.length,
    totalDocuments:
      users.length + categories.length + budgets.length + receipts.length,
  };
}
