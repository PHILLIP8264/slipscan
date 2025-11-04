/**
 * Data Export Service for SlipScan
 * 
 * Handles exporting receipt and budget data to various formats (Excel, CSV)
 * for accounting and tax purposes
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { listBudgets } from '../utils/CRUD/budgetcrud';
import { listReceipts } from '../utils/CRUD/receiptcrud';
import { Budget, CategoryBudget, Receipt } from '../utils/localdb';

// Types for export data
export interface ExportReceiptData {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  currency: string;
  categories: string; // Comma-separated list of item categories
  tags: string;
  ocrText: string;
  confidence: number;
}

export interface ExportBudgetData {
  month: string;
  category: string;
  budgetAmount: number;
  spent: number;
  remainingAmount: number;
  percentageUsed: number;
}

export interface ExportSummaryData {
  totalReceipts: number;
  totalSpent: number;
  dateRange: string;
  categories: string[];
  topMerchant: string;
  averageTransaction: number;
}

class DataExportService {
  
  /**
   * Get all receipt data formatted for export
   */
  private async getReceiptsForExport(): Promise<ExportReceiptData[]> {
    try {
      const receipts = await listReceipts();
      
      return receipts.map((receipt: Receipt) => ({
        id: receipt._id,
        date: receipt.date instanceof Date ? receipt.date.toLocaleDateString('en-ZA') : new Date(receipt.date).toLocaleDateString('en-ZA'),
        merchant: receipt.merchant || 'Unknown Merchant',
        amount: receipt.amount || 0,
        currency: receipt.currency || 'ZAR',
        categories: receipt.items.map(item => item.category || 'Uncategorized').join(', '),
        tags: Array.isArray(receipt.tags) ? receipt.tags.join(', ') : receipt.tags || '',
        ocrText: receipt.ocrText || '',
        confidence: receipt.confidence || 0
      }));
    } catch (error) {
      console.error('Error getting receipts for export:', error);
      throw new Error('Failed to retrieve receipt data');
    }
  }

  /**
   * Get all budget data formatted for export
   */
  private async getBudgetsForExport(): Promise<ExportBudgetData[]> {
    try {
      const budgets = await listBudgets();
      const exportData: ExportBudgetData[] = [];
      
      budgets.forEach((budget: Budget) => {
        if (budget.categoryBudgets && Array.isArray(budget.categoryBudgets)) {
          budget.categoryBudgets.forEach((catBudget: CategoryBudget) => {
            const percentageUsed = catBudget.budgetAmount > 0 
              ? Math.round((catBudget.spent / catBudget.budgetAmount) * 100) 
              : 0;
              
            exportData.push({
              month: budget.month,
              category: catBudget.categoryName,
              budgetAmount: catBudget.budgetAmount,
              spent: catBudget.spent,
              remainingAmount: catBudget.remainingAmount,
              percentageUsed
            });
          });
        }
      });
      
      return exportData;
    } catch (error) {
      console.error('Error getting budgets for export:', error);
      throw new Error('Failed to retrieve budget data');
    }
  }

  /**
   * Generate summary statistics for export
   */
  private async generateSummary(receipts: ExportReceiptData[]): Promise<ExportSummaryData> {
    try {
      const totalReceipts = receipts.length;
      const totalSpent = receipts.reduce((sum, receipt) => sum + receipt.amount, 0);
      
      // Get date range
      const dates = receipts.map(r => new Date(r.date)).sort((a, b) => a.getTime() - b.getTime());
      const dateRange = dates.length > 0 
        ? `${dates[0].toLocaleDateString('en-ZA')} - ${dates[dates.length - 1].toLocaleDateString('en-ZA')}`
        : 'No data';
      
      // Get unique categories from all item categories
      const allCategories = receipts.flatMap(r => r.categories.split(', ')).filter(Boolean);
      const categories = [...new Set(allCategories)];
      
      // Find top merchant by total spending
      const merchantTotals = receipts.reduce((acc, receipt) => {
        acc[receipt.merchant] = (acc[receipt.merchant] || 0) + receipt.amount;
        return acc;
      }, {} as Record<string, number>);
      
      const topMerchant = Object.keys(merchantTotals).reduce((top, merchant) => 
        merchantTotals[merchant] > merchantTotals[top] ? merchant : top, 
        Object.keys(merchantTotals)[0] || 'None'
      );
      
      const averageTransaction = totalReceipts > 0 ? totalSpent / totalReceipts : 0;
      
      return {
        totalReceipts,
        totalSpent,
        dateRange,
        categories,
        topMerchant,
        averageTransaction
      };
    } catch (error) {
      console.error('Error generating summary:', error);
      throw new Error('Failed to generate summary statistics');
    }
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any[], headers: string[]): string {
    try {
      const csvHeader = headers.join(',');
      const csvRows = data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape quotes and wrap in quotes if contains comma
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || '';
        }).join(',')
      );
      
      return [csvHeader, ...csvRows].join('\n');
    } catch (error) {
      console.error('Error converting to CSV:', error);
      throw new Error('Failed to convert data to CSV format');
    }
  }

  /**
   * Export all data as CSV files (temporary solution until Excel library is added)
   */
  async exportAsCSV(): Promise<void> {
    try {
      console.log('🗂️ Starting CSV export...');
      
      // Get data
      const [receipts, budgets] = await Promise.all([
        this.getReceiptsForExport(),
        this.getBudgetsForExport()
      ]);
      
      const summary = await this.generateSummary(receipts);
      
      // Create export directory
      const exportDir = `${FileSystem.documentDirectory}exports/`;
      await FileSystem.makeDirectoryAsync(exportDir, { intermediates: true });
      
      // Generate timestamp for filename
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Export receipts
      const receiptHeaders = ['date', 'merchant', 'amount', 'currency', 'categories', 'tags', 'confidence'];
      const receiptsCSV = this.convertToCSV(receipts, receiptHeaders);
      const receiptsFile = `${exportDir}receipts_${timestamp}.csv`;
      await FileSystem.writeAsStringAsync(receiptsFile, receiptsCSV);
      
      // Export budgets
      const budgetHeaders = ['month', 'category', 'budgetAmount', 'spent', 'remainingAmount', 'percentageUsed'];
      const budgetsCSV = this.convertToCSV(budgets, budgetHeaders);
      const budgetsFile = `${exportDir}budgets_${timestamp}.csv`;
      await FileSystem.writeAsStringAsync(budgetsFile, budgetsCSV);
      
      // Export summary
      const summaryData = [{
        totalReceipts: summary.totalReceipts,
        totalSpent: `R${summary.totalSpent.toFixed(2)}`,
        dateRange: summary.dateRange,
        categories: summary.categories.join('; '),
        topMerchant: summary.topMerchant,
        averageTransaction: `R${summary.averageTransaction.toFixed(2)}`
      }];
      const summaryHeaders = ['totalReceipts', 'totalSpent', 'dateRange', 'categories', 'topMerchant', 'averageTransaction'];
      const summaryCSV = this.convertToCSV(summaryData, summaryHeaders);
      const summaryFile = `${exportDir}summary_${timestamp}.csv`;
      await FileSystem.writeAsStringAsync(summaryFile, summaryCSV);
      
      console.log('✅ CSV files created successfully');
      
      // Create a zip-like approach by sharing the main receipts file
      // User can find other files in the exports folder
      if (await Sharing.isAvailableAsync()) {
        Alert.alert(
          'Export Complete!',
          `Your data has been exported to CSV files:\n\n📁 ${receipts.length} receipts\n📊 ${budgets.length} budget entries\n📈 Summary statistics\n\nShare the receipts file with your accountant?`,
          [
            { text: 'Later', style: 'cancel' },
            { 
              text: 'Share Now', 
              onPress: () => Sharing.shareAsync(receiptsFile, {
                mimeType: 'text/csv',
                dialogTitle: 'Share The Ledger Receipts Data'
              })
            }
          ]
        );
      } else {
        Alert.alert(
          'Export Complete!',
          `Your data has been exported to:\n${exportDir}\n\n📁 ${receipts.length} receipts\n📊 ${budgets.length} budget entries\n📈 Summary statistics`,
          [{ text: 'OK' }]
        );
      }
      
    } catch (error) {
      console.error('❌ Export failed:', error);
      Alert.alert(
        'Export Failed',
        `Unable to export data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [{ text: 'OK' }]
      );
      throw error;
    }
  }

  /**
   * Get export statistics (for display before export)
   */
  async getExportStatistics(): Promise<{
    receiptsCount: number;
    budgetEntriesCount: number;
    dateRange: string;
    totalAmount: number;
  }> {
    try {
      const receipts = await this.getReceiptsForExport();
      const budgets = await this.getBudgetsForExport();
      const summary = await this.generateSummary(receipts);
      
      return {
        receiptsCount: receipts.length,
        budgetEntriesCount: budgets.length,
        dateRange: summary.dateRange,
        totalAmount: summary.totalSpent
      };
    } catch (error) {
      console.error('Error getting export statistics:', error);
      return {
        receiptsCount: 0,
        budgetEntriesCount: 0,
        dateRange: 'No data',
        totalAmount: 0
      };
    }
  }
}

export default new DataExportService();