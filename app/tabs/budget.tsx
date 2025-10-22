import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
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
      
      let allBudgets = await listBudgets();
      
      // If no budgets exist, create mock data for development
      if (allBudgets.length === 0) {
        console.log('No budgets found, creating mock data...');
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
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const onRefresh = () => {
    loadBudgets(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#007AFF" />
      
      {/* Header with Summary */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            // Development helper: tap to create mock data
            console.log('Creating mock budget data...');
            setupMockData().then(() => {
              loadBudgets();
              Alert.alert('Success', 'Mock budget data created!');
            }).catch(error => {
              console.error('Error creating mock data:', error);
              Alert.alert('Error', 'Failed to create mock data');
            });
          }}
        >
          <Text style={styles.headerTitle}>Budget Overview</Text>
        </TouchableOpacity>
        <View style={styles.summaryCards}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Budget</Text>
            <Text style={styles.summaryAmount}>
              {formatCurrency(getTotalBudgetAmount())}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Remaining</Text>
            <Text style={styles.summaryAmount}>
              {formatCurrency(getTotalRemainingAmount())}
            </Text>
          </View>
        </View>
      </View>

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
  header: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginBottom: 20,
    textAlign: 'center',
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
