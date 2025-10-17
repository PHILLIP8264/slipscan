import React from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
      <Ionicons name="calendar-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Budgets Found</Text>
      <Text style={styles.emptyText}>
        {loading 
          ? 'Loading budgets...' 
          : 'Tap "Create New Budget" to get started with your budget planning!'
        }
      </Text>
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
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});