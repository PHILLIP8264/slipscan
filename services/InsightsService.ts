/**
 * Insights Service for SlipScan (No Categorization)
 * 
 * Generates basic spending insights and analytics from receipt data
 */

import getConfig from '../config/environment';
import { ProcessedReceipt, ProcessingResult } from '../types/receipt';
import databaseService from './DatabaseService';

interface BasicInsights {
  month: string; // YYYY-MM format
  totalSpent: number;
  transactionCount: number;
  averageTransaction: number;
  merchantBreakdown: Array<{
    merchantName: string;
    amount: number;
    transactionCount: number;
    averageSpent: number;
  }>;
  topMerchants: string[];
  insights: string[];
  generatedAt: string;
}

/**
 * Insights Service for Basic Analytics (No Categorization)
 */
class InsightsService {
  private config = getConfig();

  constructor() {
    if (this.config.app.enableLogging) {
      console.log('📊 InsightsService initialized (no categorization)');
    }
  }

  /**
   * Generate monthly insights from receipt data
   */
  async generateMonthlyInsights(month: string): Promise<ProcessingResult<BasicInsights>> {
    const startTime = Date.now();
    
    try {
      // Get receipts for the specified month
      const startDate = `${month}-01`;
      const endDate = this.getEndOfMonth(month);
      
      const receiptsResult = await databaseService.getReceipts({
        dateFrom: startDate,
        dateTo: endDate,
      });

      if (!receiptsResult.success || !receiptsResult.data) {
        throw new Error(receiptsResult.error || 'Failed to retrieve receipts');
      }

      const receipts = receiptsResult.data;

      if (receipts.length === 0) {
        return {
          success: true,
          data: this.generateEmptyInsights(month),
          processingTime: Date.now() - startTime,
        };
      }

      // Calculate basic metrics
      const totalSpent = receipts.reduce((sum, r) => sum + r.totals.total, 0);
      const transactionCount = receipts.length;
      const averageTransaction = totalSpent / transactionCount;

      // Merchant breakdown
      const merchantMap = new Map<string, { amount: number; count: number }>();
      receipts.forEach(receipt => {
        const merchantName = receipt.merchant.name;
        const existing = merchantMap.get(merchantName) || { amount: 0, count: 0 };
        merchantMap.set(merchantName, {
          amount: existing.amount + receipt.totals.total,
          count: existing.count + 1,
        });
      });

      const merchantBreakdown = Array.from(merchantMap.entries())
        .map(([merchantName, data]) => ({
          merchantName,
          amount: data.amount,
          transactionCount: data.count,
          averageSpent: data.amount / data.count,
        }))
        .sort((a, b) => b.amount - a.amount);

      const topMerchants = merchantBreakdown.slice(0, 5).map(m => m.merchantName);

      // Generate basic insights
      const insights = this.generateBasicInsights(receipts, merchantBreakdown, totalSpent, averageTransaction);

      const result: BasicInsights = {
        month,
        totalSpent,
        transactionCount,
        averageTransaction,
        merchantBreakdown,
        topMerchants,
        insights,
        generatedAt: new Date().toISOString(),
      };

      if (this.config.app.enableLogging) {
        console.log(`✅ Monthly insights generated for ${month}`);
        console.log(`💰 Total spent: $${totalSpent.toFixed(2)}`);
        console.log(`📊 ${transactionCount} transactions`);
        console.log(`🏪 Top merchant: ${topMerchants[0] || 'N/A'}`);
      }

      return {
        success: true,
        data: result,
        processingTime: Date.now() - startTime,
      };

    } catch (error) {
      console.error('❌ Failed to generate insights:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Get insights for all available months
   */
  async getAllInsights(): Promise<ProcessingResult<BasicInsights[]>> {
    try {
      const receiptsResult = await databaseService.getReceipts();
      
      if (!receiptsResult.success || !receiptsResult.data) {
        return {
          success: false,
          error: receiptsResult.error || 'Failed to retrieve receipts',
        };
      }

      const receipts = receiptsResult.data;
      
      // Get unique months from receipts
      const months = [...new Set(
        receipts.map(r => r.transaction.date.substring(0, 7)) // YYYY-MM
      )].sort().reverse();

      // Generate insights for each month
      const allInsights: BasicInsights[] = [];
      
      for (const month of months) {
        const insightsResult = await this.generateMonthlyInsights(month);
        if (insightsResult.success && insightsResult.data) {
          allInsights.push(insightsResult.data);
        }
      }

      return {
        success: true,
        data: allInsights,
      };

    } catch (error) {
      console.error('❌ Failed to get all insights:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate basic spending insights
   */
  private generateBasicInsights(
    receipts: ProcessedReceipt[],
    merchantBreakdown: Array<{ merchantName: string; amount: number; transactionCount: number }>,
    totalSpent: number,
    averageTransaction: number
  ): string[] {
    const insights: string[] = [];

    // Total spending insight
    insights.push(`You spent $${totalSpent.toFixed(2)} this month across ${receipts.length} transactions.`);

    // Average transaction insight
    insights.push(`Your average transaction was $${averageTransaction.toFixed(2)}.`);

    // Top merchant insight
    if (merchantBreakdown.length > 0) {
      const topMerchant = merchantBreakdown[0];
      const percentage = (topMerchant.amount / totalSpent) * 100;
      insights.push(`Your top spending was at ${topMerchant.merchantName} ($${topMerchant.amount.toFixed(2)}, ${percentage.toFixed(1)}% of total).`);
    }

    // Frequency insight
    if (merchantBreakdown.length > 0) {
      const mostFrequent = merchantBreakdown
        .sort((a, b) => b.transactionCount - a.transactionCount)[0];
      insights.push(`You shopped most frequently at ${mostFrequent.merchantName} (${mostFrequent.transactionCount} times).`);
    }

    // Highest single transaction
    const highestTransaction = Math.max(...receipts.map(r => r.totals.total));
    const highestReceipt = receipts.find(r => r.totals.total === highestTransaction);
    if (highestReceipt) {
      insights.push(`Your highest single transaction was $${highestTransaction.toFixed(2)} at ${highestReceipt.merchant.name}.`);
    }

    return insights;
  }

  /**
   * Generate empty insights for months with no data
   */
  private generateEmptyInsights(month: string): BasicInsights {
    return {
      month,
      totalSpent: 0,
      transactionCount: 0,
      averageTransaction: 0,
      merchantBreakdown: [],
      topMerchants: [],
      insights: [`No spending data available for ${month}.`],
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get the last day of a month in YYYY-MM-DD format
   */
  private getEndOfMonth(month: string): string {
    const [year, monthNum] = month.split('-').map(Number);
    const lastDay = new Date(year, monthNum, 0).getDate();
    return `${month}-${lastDay.toString().padStart(2, '0')}`;
  }

  /**
   * Compare spending between two months
   */
  async compareMonths(currentMonth: string, previousMonth: string): Promise<ProcessingResult<{
    currentTotal: number;
    previousTotal: number;
    difference: number;
    percentageChange: number;
    trend: 'up' | 'down' | 'stable';
    insights: string[];
  }>> {
    try {
      const [currentResult, previousResult] = await Promise.all([
        this.generateMonthlyInsights(currentMonth),
        this.generateMonthlyInsights(previousMonth),
      ]);

      if (!currentResult.success || !previousResult.success) {
        throw new Error('Failed to get insights for comparison');
      }

      const currentTotal = currentResult.data?.totalSpent || 0;
      const previousTotal = previousResult.data?.totalSpent || 0;
      const difference = currentTotal - previousTotal;
      const percentageChange = previousTotal > 0 ? (difference / previousTotal) * 100 : 0;
      
      let trend: 'up' | 'down' | 'stable';
      if (Math.abs(percentageChange) < 5) {
        trend = 'stable';
      } else if (difference > 0) {
        trend = 'up';
      } else {
        trend = 'down';
      }

      const insights: string[] = [];
      
      if (trend === 'up') {
        insights.push(`Your spending increased by $${Math.abs(difference).toFixed(2)} (${percentageChange.toFixed(1)}%) compared to last month.`);
      } else if (trend === 'down') {
        insights.push(`Your spending decreased by $${Math.abs(difference).toFixed(2)} (${Math.abs(percentageChange).toFixed(1)}%) compared to last month.`);
      } else {
        insights.push(`Your spending remained relatively stable compared to last month.`);
      }

      return {
        success: true,
        data: {
          currentTotal,
          previousTotal,
          difference,
          percentageChange,
          trend,
          insights,
        },
      };

    } catch (error) {
      console.error('❌ Failed to compare months:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
const insightsService = new InsightsService();
export default insightsService;

// Export types
export type { BasicInsights };