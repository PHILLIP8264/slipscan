import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
      </View>

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
    marginVertical: 8,
    borderRadius: 16,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  monthHeader: {
    marginBottom: 12,
  },
  monthText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  budgetSection: {
    marginBottom: 16,
  },
  totalBudgetText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  remainingText: {
    fontSize: 14,
    color: '#666',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentageText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  editButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 6,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#ff4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 6,
  },
});