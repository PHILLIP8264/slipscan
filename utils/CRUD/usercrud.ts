import { COLLECTIONS, NoSQLDB, RelationshipHelpers, User } from "../localdb";

// Create a new user
export async function createUser(userData: {
  name: string;
  email: string;
  settings?: string;
}): Promise<User> {
  try {
    const newUser = await NoSQLDB.addDocument<User>(COLLECTIONS.USERS, {
      name: userData.name,
      email: userData.email,
      settings: userData.settings || "",
      categoryIds: [],
      budgetIds: [],
      receiptIds: [],
    });

    return newUser;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}

// Get a user by ID
export async function getUserById(id: string): Promise<User | null> {
  try {
    return await NoSQLDB.getDocumentById<User>(COLLECTIONS.USERS, id);
  } catch (error) {
    console.error("Error getting user by ID:", error);
    throw error;
  }
}

// Get user with all related data (categories, budgets, receipts)
export async function getUserWithRelations(id: string) {
  try {
    return await RelationshipHelpers.getUserWithRelations(id);
  } catch (error) {
    console.error("Error getting user with relations:", error);
    throw error;
  }
}

// Update a user by ID
export async function updateUser(
  id: string,
  updates: Partial<Pick<User, "name" | "email" | "settings">>
): Promise<User | null> {
  try {
    return await NoSQLDB.updateDocument<User>(COLLECTIONS.USERS, id, updates);
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
}

// Delete a user by ID
export async function deleteUser(id: string): Promise<boolean> {
  try {
    // First, get the user to access their related data
    const user = await getUserById(id);
    if (!user) return false;

    // Delete all related documents
    await Promise.all([
      ...user.categoryIds.map((categoryId) =>
        NoSQLDB.deleteDocument(COLLECTIONS.CATEGORIES, categoryId)
      ),
      ...user.budgetIds.map((budgetId) =>
        NoSQLDB.deleteDocument(COLLECTIONS.BUDGETS, budgetId)
      ),
      ...user.receiptIds.map((receiptId) =>
        NoSQLDB.deleteDocument(COLLECTIONS.RECEIPTS, receiptId)
      ),
    ]);

    // Finally, delete the user
    return await NoSQLDB.deleteDocument(COLLECTIONS.USERS, id);
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
}

// List all users
export async function listUsers(): Promise<User[]> {
  try {
    return await NoSQLDB.getCollection<User>(COLLECTIONS.USERS);
  } catch (error) {
    console.error("Error listing users:", error);
    throw error;
  }
}

// Find user by email
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const users = await NoSQLDB.queryDocuments<User>(
      COLLECTIONS.USERS,
      (user) => user.email === email
    );
    return users.length > 0 ? users[0] : null;
  } catch (error) {
    console.error("Error getting user by email:", error);
    throw error;
  }
}

// Add category to user
export async function addCategoryToUser(
  userId: string,
  categoryData: { name: string; color: string; budgetAmount: number }
) {
  try {
    return await RelationshipHelpers.addCategoryToUser(userId, categoryData);
  } catch (error) {
    console.error("Error adding category to user:", error);
    throw error;
  }
}

// Add budget to user
export async function addBudgetToUser(
  userId: string,
  budgetData: { month: string; totalBudget: number; remainingBudget: number }
) {
  try {
    // Add empty categoryBudgets array to match Budget interface
    const fullBudgetData = {
      ...budgetData,
      categoryBudgets: []
    };
    return await RelationshipHelpers.addBudgetToUser(userId, fullBudgetData);
  } catch (error) {
    console.error("Error adding budget to user:", error);
    throw error;
  }
}

// Add receipt to user
export async function addReceiptToUser(
  userId: string,
  receiptData: {
    merchant: string;
    amount: number;
    category: string;
    date: Date;
    tags: string[];
    imageUrl?: string;
    ocrText: string;
  }
) {
  try {
    return await RelationshipHelpers.addReceiptToUser(userId, receiptData);
  } catch (error) {
    console.error("Error adding receipt to user:", error);
    throw error;
  }
}
