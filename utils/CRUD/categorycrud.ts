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
