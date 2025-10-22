import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Budget } from '../../../utils/localdb';

interface BudgetTileProps {
  budget: Budget;
  onEdit: (budget: Budget) => void;
  onDelete: (budgetId: string) => void;
}

export const BudgetTile: React.FC<BudgetTileProps> = ({ budget, onEdit, onDelete }) => {
  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatMonth = (monthString: string) => {
    try {
      // Assuming month is in format "YYYY-MM" or "MM/YYYY" or similar
      const date = new Date(monthString + '-01'); // Add day to make it a valid date
      return date.toLocaleDateString('en-US', { 
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
    const used = budget.totalBudget - budget.remainingBudget;
    return budget.totalBudget > 0 ? (used / budget.totalBudget) * 100 : 0;
  };

  const usagePercentage = getUsagePercentage();

  return (
    <View style={styles.tileContainer}>
      {/* Month Header */}
      <View style={styles.monthHeader}>
        <Text style={styles.monthText}>{formatMonth(budget.month)}</Text>
      </View>

      {/* Budget Amount */}
      <View style={styles.budgetSection}>
        <Text style={styles.totalBudgetText}>{formatCurrency(budget.totalBudget)}</Text>
        <Text style={styles.remainingText}>
          {formatCurrency(budget.remainingBudget)} remaining
        </Text>
        {budget.categoryBudgets && budget.categoryBudgets.length > 0 && (
          <Text style={styles.categoryCountText}>
            {budget.categoryBudgets.length} {budget.categoryBudgets.length === 1 ? 'category' : 'categories'}
          </Text>
        )}
      </View>

      {/* Category Preview */}
      {budget.categoryBudgets && budget.categoryBudgets.length > 0 && (
        <View style={styles.categoryPreview}>
          <View style={styles.categoryDots}>
            {budget.categoryBudgets.slice(0, 4).map((catBudget, index) => {
              const usagePercent = catBudget.budgetAmount > 0 
                ? (catBudget.spent / catBudget.budgetAmount) * 100 
                : 0;
              const color = usagePercent > 90 ? '#ff3b30' : usagePercent > 70 ? '#ff9500' : '#34c759';
              
              return (
                <View key={index} style={[styles.categoryDot, { backgroundColor: color }]} />
              );
            })}
            {budget.categoryBudgets.length > 4 && (
              <Text style={styles.moreCategoriesText}>+{budget.categoryBudgets.length - 4}</Text>
            )}
          </View>
        </View>
      )}

      {/* Usage Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${Math.min(usagePercentage, 100)}%`,
                backgroundColor: usagePercentage > 90 ? '#ff4444' : usagePercentage > 70 ? '#ff9500' : '#34c759'
              }
            ]} 
          />
        </View>
        <Text style={styles.percentageText}>{usagePercentage.toFixed(0)}% used</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.editButton} 
          onPress={() => onEdit(budget)}
          activeOpacity={0.7}
        >
          <Ionicons name="pencil" size={16} color="white" />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.deleteButton} 
          onPress={handleDelete}
          activeOpacity={0.7}
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
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 122, 255, 0.1)',
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
    height: 10,
    backgroundColor: '#e9ecef',
    borderRadius: 6,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  percentageText: {
    fontSize: 13,
    color: '#495057',
    textAlign: 'right',
    fontWeight: '600',
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
});