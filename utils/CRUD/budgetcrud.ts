import { Budget, CategoryBudget, COLLECTIONS, NoSQLDB } from "../localdb";

// Helper function to calculate total budget from category budgets
export function calculateTotalBudget(categoryBudgets: CategoryBudget[]): number {
  return categoryBudgets.reduce((total, catBudget) => total + catBudget.budgetAmount, 0);
}

// Helper function to calculate total spent from category budgets
export function calculateTotalSpent(categoryBudgets: CategoryBudget[]): number {
  return categoryBudgets.reduce((total, catBudget) => total + catBudget.spent, 0);
}

// Helper function to calculate remaining budget from category budgets
export function calculateRemainingBudget(categoryBudgets: CategoryBudget[]): number {
  return categoryBudgets.reduce((total, catBudget) => total + catBudget.remainingAmount, 0);
}

// Create a new budget
export async function createBudget(budgetData: {
  month: string;
  categoryBudgets: CategoryBudget[];
  userId?: string;
}): Promise<Budget> {
  try {
    console.log('createBudget called with:', budgetData);
    
    // Calculate totals from category budgets
    const totalBudget = calculateTotalBudget(budgetData.categoryBudgets);
    const remainingBudget = calculateRemainingBudget(budgetData.categoryBudgets);
    
    console.log('Calculated totals - total:', totalBudget, 'remaining:', remainingBudget);
    
    const fullBudgetData = {
      ...budgetData,
      totalBudget,
      remainingBudget,
    };
    
    console.log('Full budget data to save:', fullBudgetData);
    
    const result = await NoSQLDB.addDocument<Budget>(COLLECTIONS.BUDGETS, fullBudgetData);
    
    console.log('Budget saved to database:', result);
    
    // If userId is provided, link the budget to the user
    if (budgetData.userId) {
      await linkBudgetToUser(budgetData.userId, result._id);
    }
    
    return result;
  } catch (error) {
    console.error("Error creating budget:", error);
    throw error;
  }
}

// Helper function to link budget to user (add to user's budgetIds)
async function linkBudgetToUser(userId: string, budgetId: string): Promise<void> {
  try {
    const { getUserById, updateUser } = await import('./usercrud');
    const user = await getUserById(userId);
    
    if (user) {
      if (!user.budgetIds) {
        user.budgetIds = [];
      }
      
      if (!user.budgetIds.includes(budgetId)) {
        user.budgetIds.push(budgetId);
        await updateUser(userId, { budgetIds: user.budgetIds } as any);
        console.log(`🔗 Linked budget ${budgetId} to user ${userId}`);
      }
    }
  } catch (error) {
    console.error('Error linking budget to user:', error);
    // Don't throw here as budget was created successfully
  }
}

// Get a budget by ID
export async function getBudgetById(id: string): Promise<Budget | null> {
  try {
    return await NoSQLDB.getDocumentById<Budget>(COLLECTIONS.BUDGETS, id);
  } catch (error) {
    console.error("Error getting budget by ID:", error);
    throw error;
  }
}

// Update a budget by ID
export async function updateBudget(
  id: string,
  updates: Partial<Pick<Budget, "month" | "categoryBudgets">>
): Promise<Budget | null> {
  try {
    let finalUpdates: any = { ...updates };
    
    // If categoryBudgets are being updated, recalculate totals
    if (updates.categoryBudgets) {
      finalUpdates.totalBudget = calculateTotalBudget(updates.categoryBudgets);
      finalUpdates.remainingBudget = calculateRemainingBudget(updates.categoryBudgets);
    }
    
    return await NoSQLDB.updateDocument<Budget>(
      COLLECTIONS.BUDGETS,
      id,
      finalUpdates
    );
  } catch (error) {
    console.error("Error updating budget:", error);
    throw error;
  }
}

// Delete a budget by ID
export async function deleteBudget(id: string): Promise<boolean> {
  try {
    return await NoSQLDB.deleteDocument(COLLECTIONS.BUDGETS, id);
  } catch (error) {
    console.error("Error deleting budget:", error);
    throw error;
  }
}

// List all budgets
export async function listBudgets(): Promise<Budget[]> {
  try {
    const budgets = await NoSQLDB.getCollection<Budget>(COLLECTIONS.BUDGETS);
    console.log('Retrieved budgets from database:', budgets);
    return budgets;
  } catch (error) {
    console.error("Error listing budgets:", error);
    throw error;
  }
}

// Get budget by month
export async function getBudgetByMonth(month: string): Promise<Budget | null> {
  try {
    const budgets = await NoSQLDB.queryDocuments<Budget>(
      COLLECTIONS.BUDGETS,
      (budget) => budget.month === month
    );
    return budgets.length > 0 ? budgets[0] : null;
  } catch (error) {
    console.error("Error getting budget by month:", error);
    throw error;
  }
}

// Get budgets within a total budget range
export async function getBudgetsInRange(
  minTotal: number,
  maxTotal: number
): Promise<Budget[]> {
  try {
    return await NoSQLDB.queryDocuments<Budget>(
      COLLECTIONS.BUDGETS,
      (budget) =>
        budget.totalBudget >= minTotal && budget.totalBudget <= maxTotal
    );
  } catch (error) {
    console.error("Error getting budgets in range:", error);
    throw error;
  }
}

// Get budgets with remaining budget less than a threshold
export async function getBudgetsLowRemaining(
  threshold: number
): Promise<Budget[]> {
  try {
    return await NoSQLDB.queryDocuments<Budget>(
      COLLECTIONS.BUDGETS,
      (budget) => budget.remainingBudget < threshold
    );
  } catch (error) {
    console.error("Error getting budgets with low remaining:", error);
    throw error;
  }
}

// Update a specific category budget within a budget
export async function updateCategoryBudget(
  budgetId: string,
  categoryId: string,
  newBudgetAmount: number
): Promise<Budget | null> {
  try {
    const budget = await getBudgetById(budgetId);
    if (!budget) return null;
    
    const updatedCategoryBudgets = budget.categoryBudgets.map(catBudget => {
      if (catBudget.categoryId === categoryId) {
        return {
          ...catBudget,
          budgetAmount: newBudgetAmount,
          remainingAmount: newBudgetAmount - catBudget.spent
        };
      }
      return catBudget;
    });
    
    return await updateBudget(budgetId, { categoryBudgets: updatedCategoryBudgets });
  } catch (error) {
    console.error("Error updating category budget:", error);
    throw error;
  }
}

// Spend from a category budget (when a receipt is added)
export async function spendFromCategoryBudget(
  budgetId: string,
  categoryId: string,
  amount: number
): Promise<Budget | null> {
  try {
    const budget = await getBudgetById(budgetId);
    if (!budget) return null;
    
    const updatedCategoryBudgets = budget.categoryBudgets.map(catBudget => {
      if (catBudget.categoryId === categoryId) {
        const newSpent = catBudget.spent + amount;
        return {
          ...catBudget,
          spent: newSpent,
          remainingAmount: catBudget.budgetAmount - newSpent
        };
      }
      return catBudget;
    });
    
    return await updateBudget(budgetId, { categoryBudgets: updatedCategoryBudgets });
  } catch (error) {
    console.error("Error spending from category budget:", error);
    throw error;
  }
}

// Mock data setup functions
export async function setupMockData(): Promise<void> {
  try {
    // Clear existing data
    const existingBudgets = await listBudgets();
    for (const budget of existingBudgets) {
      await deleteBudget(budget._id);
    }

    // Create mock categories first (if they don't exist)
    const { createCategory } = await import('./categorycrud');
    
    const mockCategories = [
      { name: 'Groceries', color: '#34C759', budgetAmount: 600 },
      { name: 'Restaurants', color: '#FF9500', budgetAmount: 300 },
      { name: 'Transportation', color: '#007AFF', budgetAmount: 200 },
      { name: 'Entertainment', color: '#AF52DE', budgetAmount: 150 },
      { name: 'Utilities', color: '#FF3B30', budgetAmount: 250 },
      { name: 'Shopping', color: '#FF2D92', budgetAmount: 200 },
      { name: 'Healthcare', color: '#5AC8FA', budgetAmount: 100 },
      { name: 'Savings', color: '#FFCC00', budgetAmount: 500 },
    ];

    const createdCategories = [];
    for (const cat of mockCategories) {
      try {
        const created = await createCategory(cat);
        createdCategories.push(created);
      } catch (error) {
        console.log('Category might already exist:', cat.name);
      }
    }

    // If we couldn't create new ones, get existing categories
    const { listCategories } = await import('./categorycrud');
    const allCategories = await listCategories();
    const categoriesToUse = createdCategories.length > 0 ? createdCategories : allCategories.slice(0, 6);

    if (categoriesToUse.length === 0) {
      console.error('No categories available for mock budgets');
      return;
    }

    // Helper function to get month string
    const getMonthString = (monthsOffset: number) => {
      const date = new Date();
      date.setMonth(date.getMonth() + monthsOffset);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    };

    // Create mock budgets for different months
    const mockBudgets = [
      // Past budget (1 month ago)
      {
        month: getMonthString(-1),
        categoryBudgets: [
          { categoryId: categoriesToUse[0]._id, categoryName: categoriesToUse[0].name, budgetAmount: 600, spent: 550, remainingAmount: 50 },
          { categoryId: categoriesToUse[1]._id, categoryName: categoriesToUse[1].name, budgetAmount: 300, spent: 300, remainingAmount: 0 },
          { categoryId: categoriesToUse[2]._id, categoryName: categoriesToUse[2].name, budgetAmount: 200, spent: 175, remainingAmount: 25 },
          { categoryId: categoriesToUse[3]._id, categoryName: categoriesToUse[3].name, budgetAmount: 150, spent: 150, remainingAmount: 0 },
        ]
      },
      // Current budget
      {
        month: getMonthString(0),
        categoryBudgets: [
          { categoryId: categoriesToUse[0]._id, categoryName: categoriesToUse[0].name, budgetAmount: 650, spent: 230, remainingAmount: 420 },
          { categoryId: categoriesToUse[1]._id, categoryName: categoriesToUse[1].name, budgetAmount: 350, spent: 170, remainingAmount: 180 },
          { categoryId: categoriesToUse[2]._id, categoryName: categoriesToUse[2].name, budgetAmount: 200, spent: 50, remainingAmount: 150 },
          { categoryId: categoriesToUse[3]._id, categoryName: categoriesToUse[3].name, budgetAmount: 200, spent: 20, remainingAmount: 180 },
          { categoryId: categoriesToUse[4] ? categoriesToUse[4]._id : categoriesToUse[0]._id, categoryName: categoriesToUse[4] ? categoriesToUse[4].name : categoriesToUse[0].name, budgetAmount: 250, spent: 150, remainingAmount: 100 },
        ]
      },
      // Upcoming budget (next month)
      {
        month: getMonthString(1),
        categoryBudgets: [
          { categoryId: categoriesToUse[0]._id, categoryName: categoriesToUse[0].name, budgetAmount: 700, spent: 0, remainingAmount: 700 },
          { categoryId: categoriesToUse[1]._id, categoryName: categoriesToUse[1].name, budgetAmount: 400, spent: 0, remainingAmount: 400 },
          { categoryId: categoriesToUse[2]._id, categoryName: categoriesToUse[2].name, budgetAmount: 250, spent: 0, remainingAmount: 250 },
          { categoryId: categoriesToUse[3]._id, categoryName: categoriesToUse[3].name, budgetAmount: 200, spent: 0, remainingAmount: 200 },
          { categoryId: categoriesToUse[4] ? categoriesToUse[4]._id : categoriesToUse[0]._id, categoryName: categoriesToUse[4] ? categoriesToUse[4].name : categoriesToUse[0].name, budgetAmount: 300, spent: 0, remainingAmount: 300 },
          { categoryId: categoriesToUse[5] ? categoriesToUse[5]._id : categoriesToUse[1]._id, categoryName: categoriesToUse[5] ? categoriesToUse[5].name : categoriesToUse[1].name, budgetAmount: 150, spent: 0, remainingAmount: 150 },
        ]
      },
      // Another upcoming budget (2 months ahead)
      {
        month: getMonthString(2),
        categoryBudgets: [
          { categoryId: categoriesToUse[0]._id, categoryName: categoriesToUse[0].name, budgetAmount: 650, spent: 0, remainingAmount: 650 },
          { categoryId: categoriesToUse[1]._id, categoryName: categoriesToUse[1].name, budgetAmount: 300, spent: 0, remainingAmount: 300 },
          { categoryId: categoriesToUse[2]._id, categoryName: categoriesToUse[2].name, budgetAmount: 200, spent: 0, remainingAmount: 200 },
        ]
      },
    ];

    // Create the mock budgets
    for (const budgetData of mockBudgets) {
      await createBudget(budgetData);
    }

    console.log('Mock budget data created successfully!');
  } catch (error) {
    console.error('Error setting up mock data:', error);
    throw error;
  }
}

// Get all budgets for a specific user
export async function getUserBudgets(userId: string): Promise<Budget[]> {
  try {
    const user = await NoSQLDB.getDocumentById<any>(COLLECTIONS.USERS, userId);
    if (!user || !user.budgetIds) {
      return [];
    }

    const budgets = await Promise.all(
      user.budgetIds.map((budgetId: string) => 
        NoSQLDB.getDocumentById<Budget>(COLLECTIONS.BUDGETS, budgetId)
      )
    );

    return budgets.filter(Boolean) as Budget[];
  } catch (error) {
    console.error("Error getting user budgets:", error);
    throw error;
  }
}

// Get user's budget for a specific month
export async function getUserBudgetByMonth(userId: string, month: string): Promise<Budget | null> {
  try {
    const userBudgets = await getUserBudgets(userId);
    return userBudgets.find(budget => budget.month === month) || null;
  } catch (error) {
    console.error("Error getting user budget by month:", error);
    throw error;
  }
}

// Update budget amounts for all categories in a budget
export async function updateBudgetAmounts(
  budgetId: string,
  categoryBudgetAmounts: { categoryId: string; budgetAmount: number }[]
): Promise<Budget | null> {
  try {
    const budget = await getBudgetById(budgetId);
    if (!budget) return null;
    
    const updatedCategoryBudgets = budget.categoryBudgets.map(catBudget => {
      const update = categoryBudgetAmounts.find(u => u.categoryId === catBudget.categoryId);
      if (update) {
        return {
          ...catBudget,
          budgetAmount: update.budgetAmount,
          remainingAmount: update.budgetAmount - catBudget.spent
        };
      }
      return catBudget;
    });
    
    return await updateBudget(budgetId, { categoryBudgets: updatedCategoryBudgets });
  } catch (error) {
    console.error("Error updating budget amounts:", error);
    throw error;
  }
}

// Get budget summary for user (across all months)
export async function getUserBudgetSummary(userId: string): Promise<{
  totalBudgets: number;
  totalSpent: number;
  totalRemaining: number;
  monthlyBudgets: Budget[];
}> {
  try {
    const userBudgets = await getUserBudgets(userId);
    
    const totalBudgets = userBudgets.reduce((sum, budget) => sum + budget.totalBudget, 0);
    const totalSpent = userBudgets.reduce((sum, budget) => 
      sum + budget.categoryBudgets.reduce((catSum, cat) => catSum + cat.spent, 0), 0
    );
    const totalRemaining = userBudgets.reduce((sum, budget) => sum + budget.remainingBudget, 0);
    
    return {
      totalBudgets,
      totalSpent,
      totalRemaining,
      monthlyBudgets: userBudgets.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    };
  } catch (error) {
    console.error("Error getting user budget summary:", error);
    throw error;
  }
}

/**
 * Clear all budgets from database (for fixing budget issues)
 */
export async function clearAllBudgets(): Promise<void> {
  try {
    console.log('🗑️ Clearing all budgets from database...');
    
    // Use the NoSQLDB clearAllBudgets method
    await NoSQLDB.clearAllBudgets();
    
    console.log('✅ All budgets cleared successfully');
  } catch (error) {
    console.error("❌ Error clearing all budgets:", error);
    throw error;
  }
}
