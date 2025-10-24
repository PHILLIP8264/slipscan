import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View
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
  setupMockData,
} from '../../utils/CRUD/budgetcrud';
import { initializeBudgetCategories } from '../../utils/CRUD/categorycrud';
import { Budget } from '../../utils/localdb';

export default function BudgetPage() {
  const [selectedTab, setSelectedTab] = useState<BudgetTab>('current');
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
      
      // Initialize categories first
      await initializeBudgetCategories();
      
      let allBudgets = await listBudgets();
      
      //no budgets exist, create mock data for development
      if (allBudgets.length === 0) {
        await setupMockData();
        allBudgets = await listBudgets();
      }
      
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
    
    const filtered = budgets.filter(budget => {
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
    
    // Sort budgets by month for proper display order
    filtered.sort((a, b) => {
      if (selectedTab === 'past') {
        // For past budgets, show most recent first (descending)
        return b.month.localeCompare(a.month);
      } else {
        // For current and upcoming, show chronological order (ascending)
        return a.month.localeCompare(b.month);
      }
    });
    
    return filtered;
  };

  const handleCreateBudget = () => {
    router.push('../hiddenpages/budget_management/CreateBudget' as any);
  };

  const handleEditBudget = (budget: Budget) => {
    router.push({
      pathname: '../hiddenpages/budget_management/EditBudget' as any,
      params: { budgetId: budget._id }
    });
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
    return `R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const onRefresh = () => {
    loadBudgets(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#007AFF" />
      


      <View style={styles.content}>
        <View style={styles.headerSection}>
          <BudgetTabs
            selectedTab={selectedTab}
            onTabChange={setSelectedTab}
          />

          {(selectedTab === 'upcoming' || selectedTab === 'current') && (
            <CreateBudgetButton onPress={handleCreateBudget} />
          )}
        </View>

        <View style={styles.listSection}>
          <BudgetList
            budgets={filteredBudgets}
            onEditBudget={handleEditBudget}
            onDeleteBudget={handleDeleteBudget}
            loading={loading}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        </View>
      </View>
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
    marginTop: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#f8f9fa',
  },
  headerSection: {
    backgroundColor: '#f8f9fa',
  },
  listSection: {
    flex: 1,
  },
});
