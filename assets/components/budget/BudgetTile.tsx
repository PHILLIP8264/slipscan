import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Budget } from '../../../utils/localdb';

interface BudgetTileProps {
  budget: Budget;
  onEdit: (budget: Budget) => void;
  onDelete: (budgetId: string) => void;
  showDetailedView?: boolean;
}

export const BudgetTile: React.FC<BudgetTileProps> = ({ budget, onEdit, onDelete, showDetailedView = false }) => {
  if (!budget || !budget._id) {
    return null;
  }
  
  const formatCurrency = (amount: number) => {
    return `R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatMonth = (monthString: string) => {
    try {
      // Assuming month is in format "YYYY-MM" or "MM/YYYY" or similar
      const date = new Date(monthString + '-01'); // Add day to make it a valid date
      return date.toLocaleDateString('eu-ZA', { 
        year: 'numeric', 
        month: 'long' 
      });
    } catch {
      return monthString; // Return as-is if parsing fails
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Budget',
      `Are you sure you want to delete the budget for ${formatMonth(budget.month)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => onDelete(budget._id)
        },
      ]
    );
  };

  const getUsagePercentage = () => {
    const totalBudget = budget.totalBudget || 0;
    const remainingBudget = budget.remainingBudget || 0;
    const used = totalBudget - remainingBudget;
    return totalBudget > 0 ? (used / totalBudget) * 100 : 0;
  };

  const usagePercentage = getUsagePercentage();

  if (showDetailedView) {
    // Detailed view with category breakdown
    return (
      <View style={styles.tileContainer}>
        <View style={styles.monthHeader}>
          <Text style={styles.monthText}>{formatMonth(budget.month)}</Text>
        </View>
        
        <View style={styles.budgetSection}>
          <Text style={styles.totalBudgetText}>{formatCurrency(budget.totalBudget || 0)}</Text>
          <Text style={styles.remainingText}>Remaining: {formatCurrency(budget.remainingBudget || 0)}</Text>
          <Text style={styles.categoryCountText}>
            {budget.categoryBudgets?.length || 0} categories
          </Text>
        </View>

        {/* Overall Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Overall Progress</Text>
            <Text style={[styles.percentageText, { 
              color: usagePercentage > 90 ? '#ff3b30' : usagePercentage > 75 ? '#ff9500' : '#34c759' 
            }]}>
              {usagePercentage.toFixed(1)}%
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(usagePercentage, 100)}%`,
                  backgroundColor: usagePercentage > 90 ? '#ff3b30' : usagePercentage > 75 ? '#ff9500' : '#34c759'
                }
              ]} 
            />
          </View>
        </View>

        {/* Category Breakdown */}
        {budget.categoryBudgets && budget.categoryBudgets.length > 0 && (
          <View style={styles.categoryPreview}>
            <Text style={styles.categoryPreviewTitle}>Category Breakdown</Text>
            <View style={styles.categoryList}>
              {budget.categoryBudgets.map((catBudget) => {
                const categoryUsage = catBudget.budgetAmount > 0 
                  ? ((catBudget.budgetAmount - catBudget.remainingAmount) / catBudget.budgetAmount) * 100 
                  : 0;
                
                return (
                  <View key={catBudget.categoryId} style={styles.categoryBreakdownItem}>
                    <View style={styles.categoryHeader}>
                      <View style={styles.categoryInfo}>
                        <Text style={styles.categoryName}>{catBudget.categoryName}</Text>
                        <Text style={styles.categoryBudgetAmount}>
                          {formatCurrency(catBudget.budgetAmount)}
                        </Text>
                      </View>
                      <Text style={[
                        styles.categoryUsageText,
                        { color: categoryUsage > 90 ? '#ff3b30' : categoryUsage > 75 ? '#ff9500' : '#34c759' }
                      ]}>
                        {categoryUsage.toFixed(0)}%
                      </Text>
                    </View>
                    
                    <View style={styles.categoryProgressBar}>
                      <View 
                        style={[
                          styles.categoryProgressFill,
                          {
                            width: `${Math.min(categoryUsage, 100)}%`,
                            backgroundColor: categoryUsage > 90 ? '#ff3b30' : categoryUsage > 75 ? '#ff9500' : '#34c759'
                          }
                        ]} 
                      />
                    </View>
                    
                    <View style={styles.categoryAmounts}>
                      <Text style={styles.categorySpentText}>
                        Spent: {formatCurrency(catBudget.budgetAmount - catBudget.remainingAmount)}
                      </Text>
                      <Text style={styles.categoryRemainingText}>
                        Remaining: {formatCurrency(catBudget.remainingAmount)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
        
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.editButton} 
            onPress={() => onEdit(budget)}
          >
            <Ionicons name="pencil" size={16} color="white" />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.deleteButton} 
            onPress={handleDelete}
          >
            <Ionicons name="trash" size={16} color="white" />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Minimal version with edit and delete buttons (for past and upcoming budgets)
  return (
    <View style={styles.tileContainer}>
      <Text style={styles.monthText}>{formatMonth(budget.month)}</Text>
      <Text style={styles.totalBudgetText}>{formatCurrency(budget.totalBudget || 0)}</Text>
      <Text style={styles.remainingText}>Remaining: {formatCurrency(budget.remainingBudget || 0)}</Text>
      
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.editButton} 
          onPress={() => onEdit(budget)}
        >
          <Ionicons name="pencil" size={16} color="white" />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.deleteButton} 
          onPress={handleDelete}
        >
          <Ionicons name="trash" size={16} color="white" />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tileContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 20,
    padding: 20,
    minHeight: 150,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  monthHeader: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  monthText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: 0.3,
  },
  budgetSection: {
    marginBottom: 20,
    paddingVertical: 8,
  },
  totalBudgetText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#007AFF',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  remainingText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  categoryCountText: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
    marginTop: 4,
  },
  progressContainer: {
    marginBottom: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  percentageText: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 14,
    paddingTop: 8,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  editButtonText: {
    color: 'white',
    fontWeight: '700',
    marginLeft: 8,
    fontSize: 15,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#ff3b30',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#ff3b30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: '700',
    marginLeft: 8,
    fontSize: 15,
  },
  categoryPreview: {
    marginBottom: 16,
  },
  categoryDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  moreCategoriesText: {
    fontSize: 11,
    color: '#999',
    marginLeft: 4,
  },
  budgetLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
    marginTop: 4,
  },
  budgetBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingHorizontal: 8,
  },
  budgetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  budgetIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  budgetItemLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginRight: 8,
  },
  budgetItemAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  categoryPreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  categoryList: {
    gap: 8,
  },
  categoryListItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryName: {
    flex: 1,
    fontSize: 13,
    color: '#495057',
    fontWeight: '500',
    marginLeft: 8,
  },
  categoryAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  categoryBreakdownItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryBudgetAmount: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginTop: 2,
  },
  categoryUsageText: {
    fontSize: 14,
    fontWeight: '700',
  },
  categoryProgressBar: {
    height: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  categoryProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  categoryAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categorySpentText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  categoryRemainingText: {
    fontSize: 12,
    color: '#34c759',
    fontWeight: '600',
  },
});