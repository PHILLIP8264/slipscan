import { COLLECTIONS, Category, NoSQLDB } from "../localdb";

// Create a new category
export async function createCategory(categoryData: {
  name: string;
  color: string;
  budgetAmount: number;
}): Promise<Category> {
  try {
    return await NoSQLDB.addDocument<Category>(
      COLLECTIONS.CATEGORIES,
      categoryData
    );
  } catch (error) {
    console.error("Error creating category:", error);
    throw error;
  }
}

// Get a category by ID
export async function getCategoryById(id: string): Promise<Category | null> {
  try {
    return await NoSQLDB.getDocumentById<Category>(COLLECTIONS.CATEGORIES, id);
  } catch (error) {
    console.error("Error getting category by ID:", error);
    throw error;
  }
}

// Update a category by ID
export async function updateCategory(
  id: string,
  updates: Partial<Pick<Category, "name" | "color" | "budgetAmount">>
): Promise<Category | null> {
  try {
    return await NoSQLDB.updateDocument<Category>(
      COLLECTIONS.CATEGORIES,
      id,
      updates
    );
  } catch (error) {
    console.error("Error updating category:", error);
    throw error;
  }
}

// Delete a category by ID
export async function deleteCategory(id: string): Promise<boolean> {
  try {
    return await NoSQLDB.deleteDocument(COLLECTIONS.CATEGORIES, id);
  } catch (error) {
    console.error("Error deleting category:", error);
    throw error;
  }
}

// List all categories
export async function listCategories(): Promise<Category[]> {
  try {
    return await NoSQLDB.getCollection<Category>(COLLECTIONS.CATEGORIES);
  } catch (error) {
    console.error("Error listing categories:", error);
    throw error;
  }
}

// Find categories by name (partial match)
export async function getCategoriesByName(name: string): Promise<Category[]> {
  try {
    return await NoSQLDB.queryDocuments<Category>(
      COLLECTIONS.CATEGORIES,
      (category) => category.name.toLowerCase().includes(name.toLowerCase())
    );
  } catch (error) {
    console.error("Error searching categories by name:", error);
    throw error;
  }
}

// Get categories by color
export async function getCategoriesByColor(color: string): Promise<Category[]> {
  try {
    return await NoSQLDB.queryDocuments<Category>(
      COLLECTIONS.CATEGORIES,
      (category) => category.color === color
    );
  } catch (error) {
    console.error("Error getting categories by color:", error);
    throw error;
  }
}

// Get hardcoded default categories
export function getHardcodedCategories() {
  return [
    { name: 'Groceries', color: '#34C759', budgetAmount: 600 },
    { name: 'Restaurant', color: '#FF9500', budgetAmount: 300 },
    { name: 'Transport', color: '#007AFF', budgetAmount: 200 },
    { name: 'Entertainment', color: '#AF52DE', budgetAmount: 150 },
    { name: 'Utilities', color: '#FF3B30', budgetAmount: 250 },
    { name: 'Hardware', color: '#A2845E', budgetAmount: 200 },
    { name: 'Fuel', color: '#FF6B35', budgetAmount: 150 },
    { name: 'Insurance', color: '#5AC8FA', budgetAmount: 200 },
    { name: 'Subscriptions', color: '#8E8E93', budgetAmount: 100 },
  ];
}

// Initialize default categories if none exist
export async function initializeBudgetCategories(): Promise<void> {
  try {
    const existingCategories = await listCategories();
    
    if (existingCategories.length === 0) {
      console.log('No budget categories found, creating default categories...');
      
      const defaultCategories = getHardcodedCategories();

      for (const categoryData of defaultCategories) {
        try {
          await createCategory(categoryData);
          console.log(`Created default category: ${categoryData.name}`);
        } catch (error) {
          console.error(`Error creating category ${categoryData.name}:`, error);
        }
      }
      
      console.log('Default budget categories initialized successfully');
    }
  } catch (error) {
    console.error("Error initializing budget categories:", error);
    throw error;
  }
}
