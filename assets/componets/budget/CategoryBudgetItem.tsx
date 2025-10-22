import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Category, CategoryBudget } from '../../../utils/localdb';

interface CategoryBudgetItemProps {
  category: Category;
  categoryBudget?: CategoryBudget;
  onAmountChange: (categoryId: string, amount: number) => void;
  onRemove: (categoryId: string) => void;
  editable?: boolean;
}

export const CategoryBudgetItem: React.FC<CategoryBudgetItemProps> = ({
  category,
  categoryBudget,
  onAmountChange,
  onRemove,
  editable = true
}) => {
  const [amount, setAmount] = useState(
    categoryBudget?.budgetAmount?.toString() || category.budgetAmount?.toString() || '0'
  );
  const [isEditing, setIsEditing] = useState(false);

  const handleAmountSubmit = () => {
    const numericAmount = Number(amount) || 0;
    onAmountChange(category._id, numericAmount);
    setIsEditing(false);
  };

  const handleAmountChange = (text: string) => {
    // Only allow numeric input with decimals
    const cleanedText = text.replace(/[^0-9.]/g, '');
    setAmount(cleanedText);
  };

  const getRemainingAmount = () => {
    if (categoryBudget) {
      return categoryBudget.remainingAmount;
    }
    return Number(amount) || 0;
  };

  const getUsagePercentage = () => {
    const budgetAmount = Number(amount) || 0;
    const remaining = getRemainingAmount();
    if (budgetAmount === 0) return 0;
    return ((budgetAmount - remaining) / budgetAmount) * 100;
  };

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  const usagePercentage = getUsagePercentage();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.categoryInfo}>
          <View style={[styles.colorIndicator, { backgroundColor: category.color }]} />
          <Text style={styles.categoryName}>{category.name}</Text>
        </View>
        
        {editable && (
          <TouchableOpacity 
            style={styles.removeButton}
            onPress={() => onRemove(category._id)}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={24} color="#ff3b30" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.budgetSection}>
        <View style={styles.amountContainer}>
          <Text style={styles.amountLabel}>Budget Amount:</Text>
          {isEditing && editable ? (
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={handleAmountChange}
                onBlur={handleAmountSubmit}
                onSubmitEditing={handleAmountSubmit}
                keyboardType="numeric"
                placeholder="0.00"
                autoFocus
              />
              <TouchableOpacity 
                style={styles.confirmButton}
                onPress={handleAmountSubmit}
              >
                <Ionicons name="checkmark" size={16} color="#007AFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.amountDisplay}
              onPress={() => editable && setIsEditing(true)}
              disabled={!editable}
            >
              <Text style={styles.amountText}>
                {formatCurrency(Number(amount) || 0)}
              </Text>
              {editable && (
                <Ionicons name="pencil" size={16} color="#007AFF" />
              )}
            </TouchableOpacity>
          )}
        </View>

        {categoryBudget && (
          <View style={styles.remainingContainer}>
            <Text style={styles.remainingLabel}>Remaining:</Text>
            <Text style={[
              styles.remainingAmount,
              getRemainingAmount() < 0 && styles.overbudget
            ]}>
              {formatCurrency(getRemainingAmount())}
            </Text>
          </View>
        )}
      </View>

      {categoryBudget && (
        <View style={styles.progressContainer}>
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
          <Text style={styles.usageText}>
            {usagePercentage.toFixed(0)}% used
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginVertical: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  removeButton: {
    padding: 4,
  },
  budgetSection: {
    marginBottom: 12,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  amountLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 12,
  },
  amountInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    textAlign: 'right',
  },
  confirmButton: {
    marginLeft: 8,
    padding: 4,
  },
  amountDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginLeft: 12,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginRight: 8,
  },
  remainingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  overbudget: {
    color: '#ff3b30',
  },
  progressContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  usageText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    fontWeight: '500',
  },
});