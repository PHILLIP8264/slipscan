/**
 * Monthly Data Aggregator Utility
 * 
 * Aggregates receipt and budget data for a specific month to be used 
 * for AI feedback analysis
 */

import { MonthlySpendingData } from '../types/receipt';
import { getBudgetByMonth } from './CRUD/budgetcrud';
import { listReceipts } from './CRUD/receiptcrud';
import { Receipt } from './localdb';

class MonthlyDataAggregator {

  /**
   * Get all receipts for a specific month
   */
  private async getReceiptsForMonth(monthKey: string): Promise<Receipt[]> {
    try {
      const allReceipts = await listReceipts();
      const [year, month] = monthKey.split('-');
      
      return allReceipts.filter(receipt => {
        const receiptDate = receipt.date instanceof Date ? receipt.date : new Date(receipt.date);
        const receiptYear = receiptDate.getFullYear().toString();
        const receiptMonth = (receiptDate.getMonth() + 1).toString().padStart(2, '0');
        
        return receiptYear === year && receiptMonth === month;
      });
    } catch (error) {
      console.error('Error getting receipts for month:', error);
      return [];
    }
  }

  /**
   * Calculate category breakdown from receipts
   */
  private calculateCategoryBreakdown(receipts: Receipt[]): { [category: string]: number } {
    const breakdown: { [category: string]: number } = {};
    
    receipts.forEach(receipt => {
      receipt.items.forEach(item => {
        const category = item.category || 'Uncategorized';
        breakdown[category] = (breakdown[category] || 0) + item.lineTotal;
      });
    });
    
    return breakdown;
  }

  /**
   * Calculate merchant breakdown from receipts
   */
  private calculateMerchantBreakdown(receipts: Receipt[]): { [merchant: string]: number } {
    const breakdown: { [merchant: string]: number } = {};
    
    receipts.forEach(receipt => {
      const merchant = receipt.merchant || 'Unknown Merchant';
      breakdown[merchant] = (breakdown[merchant] || 0) + receipt.amount;
    });
    
    return breakdown;
  }

  /**
   * Generate available month options based on existing receipts
   */
  async generateAvailableMonths(): Promise<Array<{ label: string; value: string; year: number; month: number }>> {
    try {
      const allReceipts = await listReceipts();
      const monthSet = new Set<string>();
      
      // Extract unique months from all receipts
      allReceipts.forEach(receipt => {
        const receiptDate = receipt.date instanceof Date ? receipt.date : new Date(receipt.date);
        const year = receiptDate.getFullYear();
        const month = receiptDate.getMonth() + 1;
        const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
        monthSet.add(monthKey);
      });
      
      // Convert to sorted array with labels
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      
      return Array.from(monthSet)
        .sort((a, b) => b.localeCompare(a)) // Sort newest first
        .map(monthKey => {
          const [yearStr, monthStr] = monthKey.split('-');
          const year = parseInt(yearStr);
          const month = parseInt(monthStr);
          
          return {
            label: `${monthNames[month - 1]} ${year}`,
            value: monthKey,
            year,
            month
          };
        });
    } catch (error) {
      console.error('Error generating available months:', error);
      return [];
    }
  }

  /**
   * Aggregate all data for a specific month
   */
  async aggregateMonthData(monthKey: string): Promise<MonthlySpendingData> {
    try {
      console.log(`📊 Aggregating data for month: ${monthKey}`);
      
      // Get receipts and budget data in parallel
      const [receipts, budgetData] = await Promise.all([
        this.getReceiptsForMonth(monthKey),
        getBudgetByMonth(monthKey)
      ]);
      
      // Calculate totals and breakdowns
      const totalSpent = receipts.reduce((sum, receipt) => sum + receipt.amount, 0);
      const categoryBreakdown = this.calculateCategoryBreakdown(receipts);
      const merchantBreakdown = this.calculateMerchantBreakdown(receipts);
      const totalTransactions = receipts.length;
      const averageTransactionAmount = totalTransactions > 0 ? totalSpent / totalTransactions : 0;
      
      const monthlyData: MonthlySpendingData = {
        month: monthKey,
        receipts,
        budgetData: budgetData || undefined,
        totalSpent,
        categoryBreakdown,
        merchantBreakdown,
        averageTransactionAmount,
        totalTransactions
      };
      
      console.log(`✅ Data aggregated - ${receipts.length} receipts, R${totalSpent.toFixed(2)} total`);
      
      return monthlyData;
      
    } catch (error) {
      console.error('Error aggregating month data:', error);
      
      // Return empty data structure on error
      return {
        month: monthKey,
        receipts: [],
        totalSpent: 0,
        categoryBreakdown: {},
        merchantBreakdown: {},
        averageTransactionAmount: 0,
        totalTransactions: 0
      };
    }
  }

  /**
   * Get data for both current and previous month (for trend analysis)
   */
  async aggregateMonthDataWithComparison(monthKey: string): Promise<{
    current: MonthlySpendingData;
    previous?: MonthlySpendingData;
  }> {
    try {
      const currentData = await this.aggregateMonthData(monthKey);
      
      // Calculate previous month
      const [yearStr, monthStr] = monthKey.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);
      
      let previousYear = year;
      let previousMonth = month - 1;
      
      if (previousMonth === 0) {
        previousMonth = 12;
        previousYear = year - 1;
      }
      
      const previousMonthKey = `${previousYear}-${previousMonth.toString().padStart(2, '0')}`;
      
      // Try to get previous month data
      const previousData = await this.aggregateMonthData(previousMonthKey);
      
      return {
        current: currentData,
        previous: previousData.totalTransactions > 0 ? previousData : undefined
      };
      
    } catch (error) {
      console.error('Error aggregating data with comparison:', error);
      const currentData = await this.aggregateMonthData(monthKey);
      return { current: currentData };
    }
  }

  /**
   * Get summary statistics for display
   */
  async getMonthSummary(monthKey: string): Promise<{
    totalReceipts: number;
    totalSpent: number;
    topCategory: string;
    topMerchant: string;
    hasBudget: boolean;
  }> {
    try {
      const data = await this.aggregateMonthData(monthKey);
      
      // Find top category and merchant
      const topCategory = Object.keys(data.categoryBreakdown).reduce((top, category) =>
        data.categoryBreakdown[category] > (data.categoryBreakdown[top] || 0) ? category : top,
        'None'
      );
      
      const topMerchant = Object.keys(data.merchantBreakdown).reduce((top, merchant) =>
        data.merchantBreakdown[merchant] > (data.merchantBreakdown[top] || 0) ? merchant : top,
        'None'
      );
      
      return {
        totalReceipts: data.totalTransactions,
        totalSpent: data.totalSpent,
        topCategory,
        topMerchant,
        hasBudget: !!data.budgetData
      };
      
    } catch (error) {
      console.error('Error getting month summary:', error);
      return {
        totalReceipts: 0,
        totalSpent: 0,
        topCategory: 'None',
        topMerchant: 'None',
        hasBudget: false
      };
    }
  }
}

export default new MonthlyDataAggregator();