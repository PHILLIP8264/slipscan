import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EmptyStateProps {
  loading?: boolean;
  message?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  loading = false, 
  message 
}) => {
  const displayMessage = message || (loading ? 'Loading receipts...' : 'No receipts found');

  return (
    <View style={styles.emptyContainer}>
      <Ionicons 
        name={loading ? "time-outline" : "receipt-outline"} 
        size={64} 
        color="#ccc" 
      />
      <Text style={styles.emptyText}>
        {displayMessage}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
});