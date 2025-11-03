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
    console.log('🗓️ Looking for budget for month:', monthYear);
    
    // Try to find existing budget for this user and month
    const existingBudget = await this.getUserBudgetByMonth(userId, monthYear);
    
    if (existingBudget) {
      console.log('✅ Found existing budget:', existingBudget._id);
      return existingBudget;
    }

    console.log('➕ No budget found, creating new budget for:', monthYear);
    
    // Initialize categories if needed
    await initializeBudgetCategories();
    const categories = await listCategories();
    
    console.log('📋 AVAILABLE CATEGORIES FOR BUDGET:', categories.map(cat => ({ id: cat._id, name: cat.name, budgetAmount: cat.budgetAmount })));
    
    // Create category budgets with proper initial budget amounts from categories
    const categoryBudgets: CategoryBudget[] = categories.map(category => ({
      categoryId: category._id,
      categoryName: category.name,
      budgetAmount: category.budgetAmount || 0, // Use category's default budget amount
      spent: 0,
      remainingAmount: category.budgetAmount || 0 // Initially equals budgetAmount
    }));
    
    console.log('💰 CREATING BUDGET WITH CATEGORIES:', categoryBudgets.map(cb => ({ id: cb.categoryId, name: cb.categoryName, amount: cb.budgetAmount })));

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
      console.log(`💰 ${isReversal ? 'REVERSING' : 'APPLYING'} budget update for receipt`);
      
      // Extract date and get month-year
      const receiptDate = 'date' in receipt ? receipt.date : new Date(receipt.transaction?.date || receipt.createdAt);
      const monthYear = this.getMonthYearFromDate(receiptDate);
      
      console.log('📅 Receipt date:', receiptDate, '→ Month-Year:', monthYear);

      // Find or create budget for this month
      const budget = await this.findOrCreateMonthlyBudget(monthYear, userId);

      // Extract items from receipt
      const items = this.extractItemsFromReceipt(receipt);
      console.log('📦 Processing', items.length, 'items');
      console.log('📋 ITEMS BREAKDOWN:', items.map(item => ({
        name: item.name,
        category: item.category,
        lineTotal: item.lineTotal,
        quantity: item.quantity
      })));

      // CRITICAL CHECK: Do items have categories?
      const itemsWithCategories = items.filter(item => item.category);
      console.log('🔍 CRITICAL CHECK - Items with categories:', itemsWithCategories.length, 'out of', items.length);
      
      if (itemsWithCategories.length === 0) {
        console.log('🚨 CRITICAL ISSUE: NO ITEMS HAVE CATEGORIES! Budget update will not work.');
        console.log('🚨 All items:', items.map(item => ({ name: item.name, category: item.category })));
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

        // Find matching category in budget (try both by name and by ID for better consistency)
        console.log('🔍 LOOKING FOR CATEGORY:', item.category);
        console.log('🔍 AVAILABLE BUDGET CATEGORIES:', budget.categoryBudgets.map(cb => cb.categoryName));
        
        let categoryBudget = budget.categoryBudgets.find(cb => cb.categoryName === item.category);
        
        // If not found by name, try to find by category ID (more reliable)
        if (!categoryBudget && item.category) {
          console.log('🔍 Category not found by name, trying by ID...');
          // First try to get the actual category to get its ID
          const categories = await listCategories();
          console.log('🔍 AVAILABLE CATEGORIES:', categories.map((cat: any) => ({ id: cat._id, name: cat.name })));
          const category = categories.find((cat: any) => cat.name === item.category); // Fixed: use cat.name instead of cat.categoryName
          if (category) {
            console.log('🔍 Found category by name, now looking for budget category by ID:', category._id);
            categoryBudget = budget.categoryBudgets.find(cb => cb.categoryId === category._id);
          }
        }
        
        if (!categoryBudget) {
          console.log('⚠️ Category not found in budget:', item.category);
          console.log('⚠️ Available categories in budget:', budget.categoryBudgets.map(cb => ({ id: cb.categoryId, name: cb.categoryName })));
          continue;
        }
        
        console.log('✅ Found category budget:', categoryBudget.categoryName);

        // Calculate spending change (negative for reversal)
        const spendingChange = isReversal ? -item.lineTotal : item.lineTotal;
        
        console.log(`💸 ${item.category}: ${isReversal ? 'reversing' : 'applying'} R${Math.abs(spendingChange)}`);
        console.log(`📊 BEFORE UPDATE - ${item.category}: budgetAmount=R${categoryBudget.budgetAmount}, spent=R${categoryBudget.spent}, remaining=R${categoryBudget.remainingAmount}`);

        // Update category spending
        categoryBudget.spent += spendingChange;
        categoryBudget.remainingAmount = categoryBudget.budgetAmount - categoryBudget.spent;
        
        console.log(`📊 AFTER UPDATE - ${item.category}: budgetAmount=R${categoryBudget.budgetAmount}, spent=R${categoryBudget.spent}, remaining=R${categoryBudget.remainingAmount}`);

        // Check for overspending
        if (categoryBudget.remainingAmount < 0) {
          console.log(`🚨 OVERSPENDING DETECTED - ${categoryBudget.categoryName}: overspent by R${Math.abs(categoryBudget.remainingAmount)}`);
          overspentCategories.push({
            categoryName: categoryBudget.categoryName,
            overspentAmount: Math.abs(categoryBudget.remainingAmount)
          });
        }
      }

      // Save updated budget
      console.log('💾 SAVING BUDGET UPDATE...');
      console.log('💾 Budget ID:', budget._id);
      console.log('💾 Updated category budgets:', budget.categoryBudgets);
      
      const savedBudget = await updateBudget(budget._id, {
        categoryBudgets: budget.categoryBudgets
      });

      console.log('✅ Budget saved successfully:', !!savedBudget);
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
    console.log('🔍 EXTRACTING ITEMS - Receipt type check:', {
      hasItems: 'items' in receipt,
      isArray: 'items' in receipt && Array.isArray(receipt.items),
      itemsLength: 'items' in receipt ? receipt.items?.length : 0
    });

    if ('items' in receipt && Array.isArray(receipt.items)) {
      // Handle Receipt format
      if (receipt.items.length > 0 && 'lineTotal' in receipt.items[0]) {
        console.log('📝 Using Receipt format items');
        console.log('📝 RECEIPT FORMAT ITEMS:', JSON.stringify(receipt.items, null, 2));
        
        // Check each item for categories
        receipt.items.forEach((item, index) => {
          console.log(`📝 RECEIPT ITEM ${index + 1}:`, {
            name: (item as any).name,
            category: (item as any).category,
            lineTotal: (item as any).lineTotal,
            hasCategory: !!(item as any).category
          });
        });
        
        const hasCategories = receipt.items.some(item => (item as any).category);
        console.log('📝 Receipt items have categories:', hasCategories);
        
        if (hasCategories) {
          return receipt.items as ReceiptItem[];
        } else {
          console.log('⚠️ Receipt format items missing categories, falling back to conversion...');
        }
      }
      
      // Handle ProcessedReceipt format - convert to ReceiptItem format
      console.log('📝 Converting ProcessedReceipt format to ReceiptItem format');
      console.log('🔍 RAW ITEMS from ProcessedReceipt:', JSON.stringify(receipt.items, null, 2));
      
      const convertedItems = (receipt as ProcessedReceipt).items.map((item, index) => {
        // Try multiple field names for line total
        const lineTotal = (item as any).linetotal || 
                         (item as any).lineTotal || 
                         item.totalPrice || 
                         ((item as any).itemprice * (item.quantity || 1)) || 
                         0;
                         
        console.log(`🔍 ITEM ${index + 1} CONVERSION:`, {
          name: item.name,
          category: (item as any).category,
          linetotal: (item as any).linetotal,
          lineTotal_field: (item as any).lineTotal,
          totalPrice: item.totalPrice,
          itemprice: (item as any).itemprice,
          quantity: item.quantity,
          calculated_lineTotal: lineTotal
        });
        
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
      
      console.log('📝 CONVERTED ITEMS:', JSON.stringify(convertedItems, null, 2));
      return convertedItems;
    }

    console.log('⚠️ No items found in receipt');
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