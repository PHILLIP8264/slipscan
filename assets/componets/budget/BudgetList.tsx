import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Budget } from '../../../utils/localdb';
import { BudgetTile } from './BudgetTile';

interface BudgetListProps {
  budgets: Budget[];
  onEditBudget: (budget: Budget) => void;
  onDeleteBudget: (budgetId: string) => void;
  loading?: boolean;
}

export const BudgetList: React.FC<BudgetListProps> = ({
  budgets,
  onEditBudget,
  onDeleteBudget,
  loading = false,
}) => {
  const renderBudgetItem = ({ item }: { item: Budget }) => (
    <BudgetTile
      budget={item}
      onEdit={onEditBudget}
      onDelete={onDeleteBudget}
    />
  );

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="wallet-outline" size={80} color="#007AFF" />
      </View>
      <Text style={styles.emptyTitle}>
        {loading ? 'Loading Budgets...' : 'No Budgets Found'}
      </Text>
      <Text style={styles.emptyText}>
        {loading 
          ? 'Please wait while we fetch your budgets' 
          : 'Start managing your finances by creating your first budget!'
        }
      </Text>
      {!loading && (
        <View style={styles.emptyTips}>
          <Text style={styles.emptyTipsTitle}>💡 Getting Started Tips:</Text>
          <Text style={styles.emptyTip}>• Set monthly spending limits</Text>
          <Text style={styles.emptyTip}>• Track your expenses automatically</Text>
          <Text style={styles.emptyTip}>• Get insights on your spending habits</Text>
        </View>
      )}
    </View>
  );

  return (
    <FlatList
      data={budgets}
      renderItem={renderBudgetItem}
      keyExtractor={(item) => item._id}
      style={styles.listContainer}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={<EmptyState />}
      contentContainerStyle={budgets.length === 0 ? styles.emptyListContainer : undefined}
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    flex: 1,
  },
  emptyListContainer: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyTips: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 320,
  },
  emptyTipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyTip: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
    paddingLeft: 4,
  },
});