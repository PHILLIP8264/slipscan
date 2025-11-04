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
    { name: 'Takeout', color: '#FF6B6B', budgetAmount: 200 },
    { name: 'Transport', color: '#007AFF', budgetAmount: 200 },
    { name: 'Entertainment', color: '#AF52DE', budgetAmount: 150 },
    { name: 'Utilities', color: '#FF3B30', budgetAmount: 250 },
    { name: 'Hardware', color: '#A2845E', budgetAmount: 200 },
    { name: 'Fuel', color: '#FF6B35', budgetAmount: 150 },
    { name: 'Insurance', color: '#5AC8FA', budgetAmount: 200 },
    { name: 'Subscriptions', color: '#8E8E93', budgetAmount: 100 },
    { name: 'Other', color: '#8E8E93', budgetAmount: 100 },
  ];
}

// Initialize default categories if none exist
export async function initializeBudgetCategories(): Promise<void> {
  try {
    const existingCategories = await listCategories();
    const defaultCategories = getHardcodedCategories();
    
    // Clean up any existing duplicates first
    await cleanupDuplicateCategories();
    
    // Check which default categories are missing
    const existingNames = existingCategories.map(c => c.name);
    const missingCategories = defaultCategories.filter(
      defaultCat => !existingNames.includes(defaultCat.name)
    );
    
    if (missingCategories.length > 0) {
      console.log(`Found ${missingCategories.length} missing default categories, creating them...`);
      
      for (const categoryData of missingCategories) {
        try {
          // Double check if category already exists before creating
          const existing = await getCategoryByName(categoryData.name);
          if (!existing) {
            await createCategory(categoryData);
            console.log(`Created default category: ${categoryData.name}`);
          } else {
            console.log(`Category already exists: ${categoryData.name}`);
          }
        } catch (error) {
          console.error(`Error creating category ${categoryData.name}:`, error);
        }
      }
      
      console.log('Default budget categories initialization complete');
    } else {
      console.log('All default categories already exist');
    }
  } catch (error) {
    console.error("Error initializing budget categories:", error);
    throw error;
  }
}

// Get category by name
export async function getCategoryByName(name: string): Promise<Category | null> {
  try {
    const categories = await NoSQLDB.queryDocuments<Category>(
      COLLECTIONS.CATEGORIES,
      (category) => category.name === name
    );
    return categories.length > 0 ? categories[0] : null;
  } catch (error) {
    console.error("Error getting category by name:", error);
    throw error;
  }
}

// Clean up duplicate categories (keep only one of each name)
export async function cleanupDuplicateCategories(): Promise<void> {
  try {
    const allCategories = await listCategories();
    const seenNames = new Set<string>();
    const duplicatesToDelete: string[] = [];
    
    // Identify duplicates
    for (const category of allCategories) {
      if (seenNames.has(category.name)) {
        duplicatesToDelete.push(category._id);
        console.log(`Found duplicate category: ${category.name} (ID: ${category._id})`);
      } else {
        seenNames.add(category.name);
      }
    }
    
    // Delete duplicates
    for (const id of duplicatesToDelete) {
      try {
        await deleteCategory(id);
        console.log(`Deleted duplicate category with ID: ${id}`);
      } catch (error) {
        console.error(`Error deleting duplicate category ${id}:`, error);
      }
    }
    
    if (duplicatesToDelete.length > 0) {
      console.log(`Cleaned up ${duplicatesToDelete.length} duplicate categories`);
    }
  } catch (error) {
    console.error("Error cleaning up duplicate categories:", error);
    throw error;
  }
}
