import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
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
} from '../../assets/components/budget';
import {
  deleteBudget,
  getUserBudgets
} from '../../utils/CRUD/budgetcrud';
import { initializeBudgetCategories } from '../../utils/CRUD/categorycrud';
import { getUserByEmail } from '../../utils/CRUD/usercrud';
import { Budget } from '../../utils/localdb';
import { useAuth } from '../contexts/AuthContext';

export default function BudgetPage() {
  const { authState } = useAuth();
  const [selectedTab, setSelectedTab] = useState<BudgetTab>('current');
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentUser();
  }, [authState.lastUserEmail]);

  useEffect(() => {
    if (currentUserId) {
      loadBudgets();
    }
  }, [currentUserId]);

  // Reload budgets whenever this screen regains focus (so newly created budgets appear immediately)
  useFocusEffect(
    useCallback(() => {
      if (currentUserId) {
        loadBudgets();
      }
    }, [currentUserId])
  );

  const loadCurrentUser = async () => {
    try {
      if (authState.lastUserEmail) {
        const user = await getUserByEmail(authState.lastUserEmail);
        if (user) {
          setCurrentUserId(user._id);
        }
      }
    } catch (error) {
      console.error("Error loading current user:", error);
      setCurrentUserId(null);
    }
  };

  const loadBudgets = async (isRefresh = false) => {
    try {
      if (!currentUserId) {
        setBudgets([]);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      // Initialize categories first
      await initializeBudgetCategories();
      
      // Get user-specific budgets instead of all budgets
      let userBudgets = await getUserBudgets(currentUserId);
      
      // User has no budgets - this is normal, they can create budgets via the UI
      // No need for mock data since budgets are created through receipt processing
      // or manual budget creation
      
      setBudgets(userBudgets);
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
    const currentMonthName = now.toLocaleString('en-US', { month: 'long' });
    const currentYear = now.getFullYear();
    const currentMonth = `${currentMonthName} ${currentYear}`;
    
    const parseMonthYear = (monthStr: string): Date => {
      try {
        // Handle "Month Year" format (e.g., "November 2025")
        const [month, year] = monthStr.split(' ');
        const monthIndex = new Date(`${month} 1, ${year}`).getMonth();
        return new Date(parseInt(year), monthIndex, 1);
      } catch {
        // Fallback for old format or invalid strings
        return new Date(monthStr);
      }
    };

    const currentDate = parseMonthYear(currentMonth);
    
    const filtered = budgets.filter(budget => {
      const budgetDate = parseMonthYear(budget.month);
      
      switch (selectedTab) {
        case 'past':
          return budgetDate < currentDate;
        case 'current':
          return budget.month === currentMonth;
        case 'upcoming':
          return budgetDate > currentDate;
        default:
          return true;
      }
    });
    
    // Sort budgets by month for proper display order
    filtered.sort((a, b) => {
      const dateA = parseMonthYear(a.month);
      const dateB = parseMonthYear(b.month);
      
      if (selectedTab === 'past') {
        // For past budgets, show most recent first (descending)
        return dateB.getTime() - dateA.getTime();
      } else {
        // For current and upcoming, show chronological order (ascending)
        return dateA.getTime() - dateB.getTime();
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
    loadCurrentUser();
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
            showDetailedView={selectedTab === 'current'}
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
