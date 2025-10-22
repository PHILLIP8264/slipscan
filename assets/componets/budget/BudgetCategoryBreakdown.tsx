import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Category, CategoryBudget } from '../../../utils/localdb';

interface BudgetCategoryBreakdownProps {
  categoryBudgets: CategoryBudget[];
  categories: Category[];
  showProgress?: boolean;
  compact?: boolean;
}

export const BudgetCategoryBreakdown: React.FC<BudgetCategoryBreakdownProps> = ({
  categoryBudgets,
  categories,
  showProgress = true,
  compact = false
}) => {
  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  const getCategoryById = (categoryId: string): Category | undefined => {
    return categories.find(cat => cat._id === categoryId);
  };

  const getUsagePercentage = (categoryBudget: CategoryBudget) => {
    if (categoryBudget.budgetAmount === 0) return 0;
    return (categoryBudget.spent / categoryBudget.budgetAmount) * 100;
  };

  const renderCategoryBreakdownItem = ({ item }: { item: CategoryBudget }) => {
    const category = getCategoryById(item.categoryId);
    if (!category) return null;

    const usagePercentage = getUsagePercentage(item);
    const isOverBudget = item.remainingAmount < 0;

    return (
      <View style={[styles.breakdownItem, compact && styles.compactItem]}>
        <View style={styles.categoryHeader}>
          <View style={styles.categoryInfo}>
            <View style={[styles.colorIndicator, { backgroundColor: category.color }]} />
            <Text style={[styles.categoryName, compact && styles.compactCategoryName]}>
              {category.name}
            </Text>
          </View>
          <View style={styles.amountInfo}>
            <Text style={[styles.budgetAmount, compact && styles.compactAmount]}>
              {formatCurrency(item.budgetAmount)}
            </Text>
          </View>
        </View>

        {!compact && (
          <View style={styles.remainingInfo}>
            <Text style={styles.remainingLabel}>Remaining:</Text>
            <Text style={[
              styles.remainingAmount,
              isOverBudget && styles.overBudgetAmount
            ]}>
              {formatCurrency(item.remainingAmount)}
            </Text>
          </View>
        )}

        {showProgress && (
          <View style={[styles.progressContainer, compact && styles.compactProgress]}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(Math.max(usagePercentage, 0), 100)}%`,
                    backgroundColor: 
                      usagePercentage > 100 ? '#ff3b30' :
                      usagePercentage > 90 ? '#ff9500' : 
                      usagePercentage > 70 ? '#ffcc00' : '#34c759'
                  }
                ]}
              />
            </View>
            {!compact && (
              <Text style={styles.usageText}>
                {usagePercentage.toFixed(0)}% used
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No categories in this budget</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, compact && styles.compactTitle]}>
        Category Breakdown
      </Text>
      
      {categoryBudgets.length > 0 ? (
        <FlatList
          data={categoryBudgets}
          renderItem={renderCategoryBreakdownItem}
          keyExtractor={(item) => item.categoryId}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <EmptyState />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  compactTitle: {
    fontSize: 16,
    marginBottom: 12,
  },
  breakdownItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  compactItem: {
    paddingVertical: 8,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  compactCategoryName: {
    fontSize: 14,
  },
  amountInfo: {
    alignItems: 'flex-end',
  },
  budgetAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  compactAmount: {
    fontSize: 14,
  },
  remainingInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  remainingLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  remainingAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34c759',
  },
  overBudgetAmount: {
    color: '#ff3b30',
  },
  progressContainer: {
    marginTop: 4,
  },
  compactProgress: {
    marginTop: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginBottom: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  usageText: {
    fontSize: 11,
    color: '#666',
    textAlign: 'right',
    fontWeight: '500',
  },
  emptyContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
});