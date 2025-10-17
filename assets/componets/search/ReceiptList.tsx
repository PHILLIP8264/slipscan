import React from 'react';
import { FlatList, RefreshControl, Text, StyleSheet } from 'react-native';
import { Receipt } from '../../utils/localdb';
import { ReceiptCard } from './ReceiptCard';
import { EmptyState } from './EmptyState';

interface ReceiptListProps {
  receipts: Receipt[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onReceiptPress?: (receipt: Receipt) => void;
}

export const ReceiptList: React.FC<ReceiptListProps> = ({
  receipts,
  loading,
  refreshing,
  onRefresh,
  onReceiptPress,
}) => {
  const renderReceiptItem = ({ item }: { item: Receipt }) => (
    <ReceiptCard receipt={item} onPress={onReceiptPress} />
  );

  return (
    <>
      {/* Results Count */}
      <Text style={styles.resultsCount}>
        {receipts.length} receipt{receipts.length !== 1 ? 's' : ''} found
      </Text>

      {/* Receipt List */}
      <FlatList
        data={receipts}
        renderItem={renderReceiptItem}
        keyExtractor={(item) => item._id}
        style={styles.receiptsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState loading={loading} />
        }
        showsVerticalScrollIndicator={false}
      />
    </>
  );
};

const styles = StyleSheet.create({
  resultsCount: {
    paddingHorizontal: 16,
    marginBottom: 8,
    fontSize: 14,
    color: '#666',
  },
  receiptsList: {
    flex: 1,
  },
});