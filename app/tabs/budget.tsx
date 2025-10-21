import React, { useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet
} from 'react-native';
import {
  BudgetList,
  BudgetTabs,
  CreateBudgetButton,
  type BudgetTab,
} from '../../assets/componets/budget';
import {
  deleteBudget,
  listBudgets,
} from '../../utils/CRUD/budgetcrud';
import { Budget } from '../../utils/localdb';

export default function BudgetPage() {
  const [selectedTab, setSelectedTab] = useState<BudgetTab>('upcoming');
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBudgets();
  }, []);

  const loadBudgets = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const allBudgets = await listBudgets();
      setBudgets(allBudgets);
    } catch (error) {
      console.error('Error loading budgets:', error);
      Alert.alert('Error', 'Failed to load budgets');
    } finally {
      setLoading(false);
      setRefreshing(false);
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
  
  const getTotalBudgetAmount = () => {
    return filteredBudgets.reduce((total, budget) => total + budget.totalBudget, 0);
  };
  
  const getTotalRemainingAmount = () => {
    return filteredBudgets.reduce((total, budget) => total + budget.remainingBudget, 0);
  };
  
  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const onRefresh = () => {
    loadBudgets(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#007AFF" />
      
      

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  summaryCards: {
    flexDirection: 'row',
    gap: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#f8f9fa',
    overflow: 'hidden',
  },
});
