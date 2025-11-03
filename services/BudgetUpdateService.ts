/**
 * Budget Update Service
 * 
 * This service handles automatic budget updates when receipts are saved, edited, or deleted.
 * It manages the logic for:
 * - Finding/creating monthly budgets
 * - Processing receipt items against budget categories  
 * - Handling overspending (negative remainingAmount)
 * - Retroactive updates for receipt edits
 */

import { ProcessedReceipt } from '../types/receipt';
import { createBudget, updateBudget } from '../utils/CRUD/budgetcrud';
import { initializeBudgetCategories, listCategories } from '../utils/CRUD/categorycrud';
import { Budget, CategoryBudget, COLLECTIONS, NoSQLDB, Receipt, ReceiptItem, User } from '../utils/localdb';

interface BudgetUpdateResult {
  success: boolean;
  budgetId?: string;
  overspentCategories?: Array<{
    categoryName: string;
    overspentAmount: number;
  }>;
  error?: string;
}

/**
 * Service for handling automatic budget updates based on receipt transactions
 */
class BudgetUpdateService {

  /**
   * Extract month-year string from a date (e.g., "November 2025")
   */
  private getMonthYearFromDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Get month name and full year
    const monthName = dateObj.toLocaleString('en-US', { month: 'long' });
    const year = dateObj.getFullYear();
    
    return `${monthName} ${year}`;
  }

  /**
   * Find or create a budget for the given month-year
   */
  private async findOrCreateMonthlyBudget(monthYear: string, userId: string): Promise<Budget> {
    // Try to find existing budget for this user and month
    const existingBudget = await this.getUserBudgetByMonth(userId, monthYear);
    
    if (existingBudget) {
      return existingBudget;
    }

    // Initialize categories if needed
    await initializeBudgetCategories();
    const categories = await listCategories();
    
    // Create category budgets with proper initial budget amounts from categories
    const categoryBudgets: CategoryBudget[] = categories.map(category => ({
      categoryId: category._id,
      categoryName: category.name,
      budgetAmount: category.budgetAmount || 0, // Use category's default budget amount
      spent: 0,
      remainingAmount: category.budgetAmount || 0 // Initially equals budgetAmount
    }));

    // Create new budget with user linking
    const newBudget = await createBudget({
      month: monthYear,
      categoryBudgets,
      userId: userId // Pass userId to automatically link budget to user
    });

    console.log('✅ Created new budget:', newBudget._id, 'and automatically linked to user:', userId);
    return newBudget;
  }

  /**
   * Get user's budget for a specific month
   */
  private async getUserBudgetByMonth(userId: string, monthYear: string): Promise<Budget | null> {
    try {
      // Get user to access their budget IDs
      const user = await NoSQLDB.getDocumentById<User>(COLLECTIONS.USERS, userId);
      if (!user || !user.budgetIds || user.budgetIds.length === 0) {
        return null;
      }

      // Check each of the user's budgets for the matching month
      for (const budgetId of user.budgetIds) {
        const budget = await NoSQLDB.getDocumentById<Budget>(COLLECTIONS.BUDGETS, budgetId);
        if (budget && budget.month === monthYear) {
          return budget;
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting user budget by month:', error);
      return null;
    }
  }

  /**
   * Link budget to user
   */
  private async linkBudgetToUser(userId: string, budgetId: string): Promise<void> {
    try {
      const user = await NoSQLDB.getDocumentById<User>(COLLECTIONS.USERS, userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Add budget ID to user's budgetIds array if not already present
      const updatedBudgetIds = user.budgetIds || [];
      if (!updatedBudgetIds.includes(budgetId)) {
        updatedBudgetIds.push(budgetId);
        
        await NoSQLDB.updateDocument<User>(COLLECTIONS.USERS, userId, {
          budgetIds: updatedBudgetIds
        });
        
        console.log('✅ Linked budget', budgetId, 'to user', userId);
      }
    } catch (error) {
      console.error('Error linking budget to user:', error);
      throw error;
    }
  }

  /**
   * Process receipt items and update budget spending
   */
  async updateBudgetForReceipt(
    receipt: Receipt | ProcessedReceipt, 
    userId: string,
    isReversal: boolean = false
  ): Promise<BudgetUpdateResult> {
    try {

      
      // Extract date and get month-year
      const receiptDate = 'date' in receipt ? receipt.date : new Date(receipt.transaction?.date || receipt.createdAt);
      const monthYear = this.getMonthYearFromDate(receiptDate);

      // Find or create budget for this month
      const budget = await this.findOrCreateMonthlyBudget(monthYear, userId);

      // Extract items from receipt
      const items = this.extractItemsFromReceipt(receipt);
      // CRITICAL CHECK: Do items have categories?
      const itemsWithCategories = items.filter(item => item.category);
      
      if (itemsWithCategories.length === 0) {
        return {
          success: false,
          error: 'No items have categories - budget cannot be updated'
        };
      }

      // Track overspent categories
      const overspentCategories: Array<{categoryName: string; overspentAmount: number}> = [];

      // Process each item
      for (const item of items) {
        if (!item.category) {
          console.log('⚠️ Skipping item without category:', item.name);
          continue;
        }

        // Find matching category in budget - case insensitive matching
        let categoryBudget = budget.categoryBudgets.find(cb => 
          cb.categoryName.toLowerCase().trim() === item.category!.toLowerCase().trim()
        );
        
        // If still not found, try to find by category ID
        if (!categoryBudget) {
          const categories = await listCategories();
          const category = categories.find((cat: any) => 
            cat.name.toLowerCase().trim() === item.category!.toLowerCase().trim()
          );
          if (category) {
            categoryBudget = budget.categoryBudgets.find(cb => cb.categoryId === category._id);
          }
        }
        
        if (!categoryBudget) {
          // Category doesn't exist in budget - dynamically add it
          const categories = await listCategories();
          let category = categories.find((cat: any) => 
            cat.name.toLowerCase().trim() === item.category!.toLowerCase().trim()
          );
          
          if (!category) {
            // Category doesn't exist in database either - create it
            const { createCategory } = await import('../utils/CRUD/categorycrud');
            category = await createCategory({
              name: item.category!,
              color: '#8E8E93', // Default gray color
              budgetAmount: 100 // Default budget amount
            });
          }
          
          // Add the category to this budget
          const newCategoryBudget = {
            categoryId: category._id,
            categoryName: category.name,
            budgetAmount: category.budgetAmount || 100,
            spent: 0,
            remainingAmount: category.budgetAmount || 100
          };
          
          budget.categoryBudgets.push(newCategoryBudget);
          categoryBudget = newCategoryBudget;
        }
        // Calculate spending change (negative for reversal)
        // Remove 15% VAT if it's included in the line total
        const preVATAmount = item.lineTotal / 1.15; // Remove South African 15% VAT
        const spendingChange = isReversal ? -preVATAmount : preVATAmount;

        // Update category spending
        categoryBudget.spent += spendingChange;
        categoryBudget.remainingAmount = categoryBudget.budgetAmount - categoryBudget.spent;

        // Check for overspending
        if (categoryBudget.remainingAmount < 0) {
          overspentCategories.push({
            categoryName: categoryBudget.categoryName,
            overspentAmount: Math.abs(categoryBudget.remainingAmount)
          });
        }
      }

      // Save updated budget
      const savedBudget = await updateBudget(budget._id, {
        categoryBudgets: budget.categoryBudgets
      });
      if (!savedBudget) {
        throw new Error('Failed to save budget update');
      }

      return {
        success: true,
        budgetId: budget._id,
        overspentCategories: overspentCategories.length > 0 ? overspentCategories : undefined
      };

    } catch (error) {
      console.error('❌ Budget update failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle receipt editing - reverse old impact and apply new impact
   */
  async updateBudgetForReceiptEdit(
    oldReceipt: Receipt,
    newReceipt: Receipt | ProcessedReceipt,
    userId: string
  ): Promise<BudgetUpdateResult> {
    console.log('🔄 Handling receipt edit - reversing old impact and applying new impact');

    try {
      // First, reverse the old receipt's impact
      const reverseResult = await this.updateBudgetForReceipt(oldReceipt, userId, true);
      
      if (!reverseResult.success) {
        console.error('❌ Failed to reverse old receipt impact');
        return reverseResult;
      }

      // Then, apply the new receipt's impact
      const applyResult = await this.updateBudgetForReceipt(newReceipt, userId, false);
      
      return applyResult;

    } catch (error) {
      console.error('❌ Budget update for receipt edit failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle receipt deletion - reverse the budget impact
   */
  async updateBudgetForReceiptDeletion(
    receipt: Receipt,
    userId: string
  ): Promise<BudgetUpdateResult> {
    console.log('🗑️ Handling receipt deletion - reversing budget impact');
    
    return await this.updateBudgetForReceipt(receipt, userId, true);
  }

  /**
   * Extract standardized items from either Receipt or ProcessedReceipt
   */
  private extractItemsFromReceipt(receipt: Receipt | ProcessedReceipt): ReceiptItem[] {
    if ('items' in receipt && Array.isArray(receipt.items)) {
      // Handle Receipt format
      if (receipt.items.length > 0 && 'lineTotal' in receipt.items[0]) {
        const hasCategories = receipt.items.some(item => (item as any).category);
        if (hasCategories) {
          return receipt.items as ReceiptItem[];
        }
      }
      
      // Handle ProcessedReceipt format - convert to ReceiptItem format
      
      const convertedItems = (receipt as ProcessedReceipt).items.map((item, index) => {
        // Try multiple field names for line total
        const lineTotal = (item as any).linetotal || 
                         (item as any).lineTotal || 
                         item.totalPrice || 
                         ((item as any).itemprice * (item.quantity || 1)) || 
                         0;
                         
        return {
          name: item.name,
          quantity: item.quantity || 1,
          itemPrice: (item as any).itemprice || item.unitPrice || item.totalPrice || 0,
          lineTotal: lineTotal,
          confidence: item.confidence || 0.8,
          category: (item as any).category,
          categoryConfidence: (item as any).categoryConfidence
        };
      });
      
      return convertedItems;
    }

    return [];
  }

  /**
   * Format overspending message for user display
   */
  formatOverspendingMessage(overspentCategories: Array<{categoryName: string; overspentAmount: number}>): string {
    if (overspentCategories.length === 0) return '';
    
    if (overspentCategories.length === 1) {
      const category = overspentCategories[0];
      return `⚠️ You've exceeded your ${category.categoryName} budget by R${category.overspentAmount.toFixed(2)}`;
    }
    
    const categoryList = overspentCategories
      .map(cat => `${cat.categoryName} (R${cat.overspentAmount.toFixed(2)})`)
      .join(', ');
    
    return `⚠️ You've exceeded budgets in: ${categoryList}`;
  }
}

// Export singleton instance
const budgetUpdateService = new BudgetUpdateService();
export default budgetUpdateService;