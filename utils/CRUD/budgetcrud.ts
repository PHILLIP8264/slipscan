import { Budget, COLLECTIONS, NoSQLDB } from "../localdb";

// Create a new budget
export async function createBudget(budgetData: {
  month: string;
  totalBudget: number;
  remainingBudget: number;
}): Promise<Budget> {
  try {
    return await NoSQLDB.addDocument<Budget>(COLLECTIONS.BUDGETS, budgetData);
  } catch (error) {
    console.error("Error creating budget:", error);
    throw error;
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
  updates: Partial<Pick<Budget, "month" | "totalBudget" | "remainingBudget">>
): Promise<Budget | null> {
  try {
    return await NoSQLDB.updateDocument<Budget>(
      COLLECTIONS.BUDGETS,
      id,
      updates
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
    return await NoSQLDB.getCollection<Budget>(COLLECTIONS.BUDGETS);
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
