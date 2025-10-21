import React, { useEffect, useState } from 'react';
import {
  Alert,
  Animated,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View
} from 'react-native';
import {
  AmountRangeFilter,
  FilterButtons,
  ReceiptList,
  SearchBar,
  type SearchFilter,
} from '../../assets/componets/search';
import {
  getReceiptsByCategory,
  getReceiptsByMerchant,
  getReceiptsByTag,
  getReceiptsInAmountRange,
  listReceipts,
  searchReceiptsByOCR
} from '../../utils/CRUD/receiptcrud';
import { Receipt } from '../../utils/localdb';

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [filteredReceipts, setFilteredReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<SearchFilter>('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [scrollY] = useState(new Animated.Value(0));

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

  const getSearchStats = () => {
    const totalReceipts = receipts.length;
    const foundReceipts = filteredReceipts.length;
    const totalAmount = receipts.reduce((sum, receipt) => sum + (receipt.amount || 0), 0);
    const filteredAmount = filteredReceipts.reduce((sum, receipt) => sum + (receipt.amount || 0), 0);
    
    return { totalReceipts, foundReceipts, totalAmount, filteredAmount };
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const stats = getSearchStats();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#28a745" />
      
      
          

      <Animated.ScrollView
        style={styles.content}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        bounces={true}
        bouncesZoom={false}
        alwaysBounceVertical={false}
        scrollEventThrottle={30}
        decelerationRate="normal"
        overScrollMode="auto"
      >
        <View style={styles.searchSection}>
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
        </View>

        <ReceiptList
          receipts={filteredReceipts}
          loading={loading}
          refreshing={false} // Handle refresh at page level
          onRefresh={() => {}}
          onReceiptPress={handleReceiptPress}
        />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },

  statsCards: {
    flexDirection: 'row',
    gap: 12,
  },
  statsCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  statsNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 2,
  },
  statsLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#f8f9fa',
    overflow: 'hidden',
  },
  searchSection: {
    paddingTop: 20,
    backgroundColor: 'transparent',
  },
});