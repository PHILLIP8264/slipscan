import { getFontFamily } from '@/utils/fonts';
import React from 'react';
import { FlatList, RefreshControl, StyleSheet, Text } from 'react-native';
import { Receipt } from '../../../utils/localdb';
import { EmptyState } from './EmptyState';
import { ReceiptCard } from './ReceiptCard';

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
    <FlatList
      data={receipts}
      renderItem={renderReceiptItem}
      keyExtractor={(item) => item._id}
      style={styles.receiptsList}
      contentContainerStyle={receipts.length === 0 ? styles.emptyContentContainer : undefined}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListEmptyComponent={
        <EmptyState loading={loading} />
      }
      ListHeaderComponent={
        <Text style={styles.resultsCount}>
          {receipts.length} receipt{receipts.length !== 1 ? 's' : ''} found
        </Text>
      }
      showsVerticalScrollIndicator={false}
      bounces={true}
      alwaysBounceVertical={false}
      scrollEventThrottle={16}
      decelerationRate="normal"
      overScrollMode="auto"
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={21}
      initialNumToRender={10}
    />
  );
};

const styles = StyleSheet.create({
  resultsCount: {
    paddingHorizontal: 16,
    marginBottom: 8,
    fontSize: 14,
    fontFamily: getFontFamily('extraBold'),
    color: '#fff',
  },
  receiptsList: {
    flex: 1,
  },
  emptyContentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});