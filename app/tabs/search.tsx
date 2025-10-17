import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Receipt } from '../../utils/localdb';
import {
  listReceipts,
  getReceiptsByMerchant,
  getReceiptsByCategory,
  getReceiptsByTag,
  searchReceiptsByOCR,
  getReceiptsInDateRange,
  getReceiptsInAmountRange,
} from '../../utils/CRUD/receiptcrud';
import {
  SearchBar,
  FilterButtons,
  AmountRangeFilter,
  ReceiptList,
  type SearchFilter,
} from '../../assets/componets/search';

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [filteredReceipts, setFilteredReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<SearchFilter>('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  useEffect(() => {
    loadAllReceipts();
  }, []);

  useEffect(() => {
    handleSearch();
  }, [searchQuery, selectedFilter, receipts, minAmount, maxAmount]);

  const loadAllReceipts = async () => {
    try {
      setLoading(true);
      const allReceipts = await listReceipts();
      setReceipts(allReceipts);
      setFilteredReceipts(allReceipts);
    } catch (error) {
      console.error('Error loading receipts:', error);
      Alert.alert('Error', 'Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllReceipts();
    setRefreshing(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() && selectedFilter !== 'amount') {
      setFilteredReceipts(receipts);
      return;
    }

    try {
      let searchResults: Receipt[] = [];

      switch (selectedFilter) {
        case 'all':
          // Search across all fields
          searchResults = receipts.filter(receipt =>
            receipt.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
            receipt.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
            receipt.ocrText.toLowerCase().includes(searchQuery.toLowerCase()) ||
            receipt.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
          );
          break;
        case 'merchant':
          searchResults = await getReceiptsByMerchant(searchQuery);
          break;
        case 'category':
          searchResults = await getReceiptsByCategory(searchQuery);
          break;
        case 'tag':
          searchResults = await getReceiptsByTag(searchQuery);
          break;
        case 'content':
          searchResults = await searchReceiptsByOCR(searchQuery);
          break;
        case 'amount':
          const min = parseFloat(minAmount) || 0;
          const max = parseFloat(maxAmount) || Number.MAX_VALUE;
          searchResults = await getReceiptsInAmountRange(min, max);
          break;
        default:
          searchResults = receipts;
      }

      setFilteredReceipts(searchResults);
    } catch (error) {
      console.error('Error searching receipts:', error);
      Alert.alert('Error', 'Failed to search receipts');
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setMinAmount('');
    setMaxAmount('');
  };

  const handleReceiptPress = (receipt: Receipt) => {
    // TODO: Navigate to receipt details page
    console.log('Receipt pressed:', receipt._id);
  };

  return (
    <View style={styles.container}>
      <SearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onClear={handleClearSearch}
        onSubmit={handleSearch}
      />

      <FilterButtons
        selectedFilter={selectedFilter}
        onFilterChange={setSelectedFilter}
      />

      {selectedFilter === 'amount' && (
        <AmountRangeFilter
          minAmount={minAmount}
          maxAmount={maxAmount}
          onMinAmountChange={setMinAmount}
          onMaxAmountChange={setMaxAmount}
        />
      )}

      <ReceiptList
        receipts={filteredReceipts}
        loading={loading}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onReceiptPress={handleReceiptPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});