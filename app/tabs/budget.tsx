import { getFontFamily } from '@/utils/fonts';
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
      
      console.log('💰 BUDGETS LOADED:', {
        userId: currentUserId,
        budgetCount: userBudgets.length,
        budgets: userBudgets.map(b => ({ month: b.month, id: b._id, totalBudget: b.totalBudget }))
      });
      
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
    
    console.log('🗓️ BUDGET FILTERING DEBUG:', {
      now: now.toISOString(),
      nowDay: now.getDate(),
      nowMonth: now.getMonth() + 1, // getMonth() is 0-based
      nowYear: now.getFullYear(),
      currentMonth,
      selectedTab,
      totalBudgets: budgets.length
    });
    
    const parseMonthYear = (monthStr: string): Date => {
      try {
        // Handle "Month Year" format (e.g., "October 2025", "November 2025")
        const [monthName, yearStr] = monthStr.split(' ');
        if (!monthName || !yearStr) {
          console.warn('Invalid month string format:', monthStr);
          return new Date();
        }
        
        const year = parseInt(yearStr);
        
        // Map month names to numbers (0-based for JavaScript Date)
        const monthMap: {[key: string]: number} = {
          'January': 0, 'February': 1, 'March': 2, 'April': 3,
          'May': 4, 'June': 5, 'July': 6, 'August': 7,
          'September': 8, 'October': 9, 'November': 10, 'December': 11
        };
        
        const monthIndex = monthMap[monthName];
        if (monthIndex === undefined) {
          console.warn('Unknown month name:', monthName);
          return new Date();
        }
        
        const result = new Date(year, monthIndex, 1);
        console.log('📅 Parsed month:', {
          original: monthStr,
          monthName,
          monthIndex,
          year,
          result: result.toISOString()
        });
        
        return result;
      } catch (error) {
        console.warn('Error parsing month year:', monthStr, error);
        return new Date();
      }
    };

    // For comparison, we need to use the first day of the current month
    // Any month BEFORE the current month is "past"
    // The current month is "current" 
    // Any month AFTER the current month is "upcoming"
    const currentDate = new Date(now.getFullYear(), now.getMonth(), 1);
    
    console.log('📅 Current date comparison logic:', {
      actualNow: now.toISOString(),
      currentMonth,
      currentDateForComparison: currentDate.toISOString(),
      currentMonthNum: now.getMonth() + 1,
      currentYear: now.getFullYear()
    });
    
    // Log all budgets first
    console.log('📋 All budgets:', budgets.map(b => b.month));
    
    const filtered = budgets.filter(budget => {
      const budgetDate = parseMonthYear(budget.month);
      
      // Skip invalid dates
      if (isNaN(budgetDate.getTime()) || isNaN(currentDate.getTime())) {
        console.warn('Skipping budget due to invalid date:', budget.month);
        return false;
      }
      
      const isPast = budgetDate < currentDate;
      const isCurrent = budget.month === currentMonth;
      const isUpcoming = budgetDate > currentDate;
      
      console.log(`🔍 DETAILED BUDGET CHECK "${budget.month}":`, {
        budgetMonth: budget.month,
        budgetDate: budgetDate.toISOString(),
        budgetMonthNum: budgetDate.getMonth() + 1,
        budgetYear: budgetDate.getFullYear(),
        budgetTime: budgetDate.getTime(),
        
        currentMonth: currentMonth,
        currentDate: currentDate.toISOString(),
        currentMonthNum: currentDate.getMonth() + 1,
        currentYear: currentDate.getFullYear(),
        currentTime: currentDate.getTime(),
        
        comparison: {
          'budgetDate < currentDate': budgetDate < currentDate,
          'budgetDate === currentDate': budgetDate.getTime() === currentDate.getTime(),
          'budgetDate > currentDate': budgetDate > currentDate,
          'budget.month === currentMonth': budget.month === currentMonth
        },
        
        results: {
          isPast,
          isCurrent,
          isUpcoming
        },
        
        selectedTab,
        willInclude: selectedTab === 'past' ? isPast : 
                    selectedTab === 'current' ? isCurrent :
                    selectedTab === 'upcoming' ? isUpcoming : true
      });
      
      switch (selectedTab) {
        case 'past':
          return isPast;
        case 'current':
          return isCurrent;
        case 'upcoming':
          return isUpcoming;
        default:
          return true;
      }
    });
    
    console.log(`✅ Filtered budgets for "${selectedTab}" tab:`, filtered.map(b => b.month));
    
    // Sort budgets by month for proper display order
    filtered.sort((a, b) => {
      const dateA = parseMonthYear(a.month);
      const dateB = parseMonthYear(b.month);
      
      // Handle invalid dates - put them at the end
      if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
      if (isNaN(dateA.getTime())) return 1;
      if (isNaN(dateB.getTime())) return -1;
      
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
      <StatusBar barStyle="dark-content" backgroundColor="#007AFF" />
      


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
    backgroundColor: '#374151',
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
    fontFamily: getFontFamily('extraBold'),
    color: 'white',
  },
  content: {
    flex: 1,
    marginTop: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#374151',
  },
  headerSection: {
    backgroundColor: '#374151',
  },
  listSection: {
    flex: 1,
  },
});
