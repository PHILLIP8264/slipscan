import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Budget } from '../../utils/localdb';
import {
  listBudgets,
  deleteBudget,
} from '../../utils/CRUD/budgetcrud';
import {
  BudgetTabs,
  CreateBudgetButton,
  BudgetList,
  type BudgetTab,
} from '../../assets/componets/budget';

export default function BudgetPage() {
  const [selectedTab, setSelectedTab] = useState<BudgetTab>('upcoming');
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBudgets();
  }, []);

  const loadBudgets = async () => {
    try {
      setLoading(true);
      const allBudgets = await listBudgets();
      setBudgets(allBudgets);
    } catch (error) {
      console.error('Error loading budgets:', error);
      Alert.alert('Error', 'Failed to load budgets');
    } finally {
      setLoading(false);
    }
  };

  const filterBudgetsByTab = (budgets: Budget[]): Budget[] => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    return budgets.filter(budget => {
      const budgetMonth = budget.month;
      
      switch (selectedTab) {
        case 'past':
          return budgetMonth < currentMonth;
        case 'current':
          return budgetMonth === currentMonth;
        case 'upcoming':
          return budgetMonth > currentMonth;
        default:
          return true;
      }
    });
  };

  const handleCreateBudget = () => {
    // TODO: Navigate to create budget page
    console.log('Navigate to create budget page');
    Alert.alert('Coming Soon', 'Create budget functionality will be implemented next!');
  };

  const handleEditBudget = (budget: Budget) => {
    // TODO: Navigate to edit budget page
    console.log('Edit budget:', budget._id);
    Alert.alert('Coming Soon', `Edit budget for ${budget.month} will be implemented next!`);
  };

  const handleDeleteBudget = async (budgetId: string) => {
    try {
      const success = await deleteBudget(budgetId);
      if (success) {
        setBudgets(prev => prev.filter(b => b._id !== budgetId));
        Alert.alert('Success', 'Budget deleted successfully');
      } else {
        Alert.alert('Error', 'Failed to delete budget');
      }
    } catch (error) {
      console.error('Error deleting budget:', error);
      Alert.alert('Error', 'Failed to delete budget');
    }
  };

  const filteredBudgets = filterBudgetsByTab(budgets);

  return (
    <View style={styles.container}>
      <BudgetTabs
        selectedTab={selectedTab}
        onTabChange={setSelectedTab}
      />

      {selectedTab === 'upcoming' && (
        <CreateBudgetButton onPress={handleCreateBudget} />
      )}

      <BudgetList
        budgets={filteredBudgets}
        onEditBudget={handleEditBudget}
        onDeleteBudget={handleDeleteBudget}
        loading={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});
