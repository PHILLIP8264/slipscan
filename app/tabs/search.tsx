import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Animated,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    View
} from 'react-native';
import {
    AmountRangeFilter,
    DateRangeFilter,
    FilterButtons,
    ReceiptList,
    SearchBar,
    type SearchFilter,
} from '../../assets/components/search';
import { getUserByEmail, getUserReceipts } from '../../utils/CRUD/usercrud';
import { Receipt } from '../../utils/localdb';
import { useAuth } from '../contexts/AuthContext';

export default function SearchPage() {
  const router = useRouter();
  const { authState } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [filteredReceipts, setFilteredReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<SearchFilter>('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [scrollY] = useState(new Animated.Value(0));

  useEffect(() => {
    loadAllReceipts();
  }, []);

  // Reload receipts when user changes
  useEffect(() => {
    if (authState.lastUserEmail) {
      loadAllReceipts();
    }
  }, [authState.lastUserEmail]);

  // Refresh receipts when screen comes into focus (e.g., after deleting a receipt)
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Search screen focused - refreshing receipts...');
      loadAllReceipts();
    }, [authState.lastUserEmail])
  );

  useEffect(() => {
    handleSearch();
  }, [searchQuery, selectedFilter, receipts, minAmount, maxAmount, startDate, endDate]);

  const loadAllReceipts = async () => {
    try {
      setLoading(true);
      
      // Get current user's receipts only
      const userEmail = authState.lastUserEmail;
      if (!userEmail) {
        console.log('No authenticated user, showing empty receipts list');
        setReceipts([]);
        setFilteredReceipts([]);
        return;
      }

      const user = await getUserByEmail(userEmail);
      if (!user) {
        console.log('User not found in database, showing empty receipts list');
        setReceipts([]);
        setFilteredReceipts([]);
        return;
      }

      const userReceipts = await getUserReceipts(user._id);
      setReceipts(userReceipts);
      setFilteredReceipts(userReceipts);
      
      console.log(`✅ Loaded ${userReceipts.length} receipts for user: ${userEmail}`);
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

  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr.trim()) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; // Month is 0-indexed
    const year = parseInt(parts[2]);
    if (year < 100) {
      // Assume years 00-30 are 20xx, 31-99 are 19xx
      return new Date(year + (year <= 30 ? 2000 : 1900), month, day);
    }
    return new Date(year, month, day);
  };

  const validateAmountInput = (value: string): number | null => {
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() && selectedFilter !== 'amount' && selectedFilter !== 'date') {
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
            receipt.items.some(item => item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
            receipt.ocrText.toLowerCase().includes(searchQuery.toLowerCase()) ||
            receipt.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
          );
          break;
        case 'merchant':
          // Filter within user's receipts instead of querying all
          searchResults = receipts.filter(receipt =>
            receipt.merchant.toLowerCase().includes(searchQuery.toLowerCase())
          );
          break;
        case 'category':
          searchResults = receipts.filter(receipt =>
            receipt.items.some(item => item.category?.toLowerCase().includes(searchQuery.toLowerCase()))
          );
          break;
        case 'tag':
          searchResults = receipts.filter(receipt =>
            receipt.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
          );
          break;
        case 'content':
          searchResults = receipts.filter(receipt =>
            receipt.ocrText.toLowerCase().includes(searchQuery.toLowerCase())
          );
          break;
        case 'amount':
          const min = validateAmountInput(minAmount) ?? 0;
          const max = validateAmountInput(maxAmount) ?? Number.MAX_VALUE;
          searchResults = receipts.filter(receipt =>
            receipt.amount >= min && receipt.amount <= max
          );
          break;
        case 'date':
          const start = parseDate(startDate);
          const end = parseDate(endDate);
          searchResults = receipts.filter(receipt => {
            const receiptDate = new Date(receipt.date);
            if (start && end) {
              return receiptDate >= start && receiptDate <= end;
            } else if (start) {
              return receiptDate >= start;
            } else if (end) {
              return receiptDate <= end;
            }
            return true;
          });
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
    setStartDate('');
    setEndDate('');
  };

  const handleReceiptPress = (receipt: Receipt) => {
    // Navigate to receipt details page (for viewing/editing existing receipts)
    router.push(`../components/ReceiptDetails?id=${receipt._id}`);
  };

  const getSearchStats = () => {
    const totalReceipts = receipts.length;
    const foundReceipts = filteredReceipts.length;
    const totalAmount = receipts.reduce((sum, receipt) => sum + (receipt.amount || 0), 0);
    const filteredAmount = filteredReceipts.reduce((sum, receipt) => sum + (receipt.amount || 0), 0);
    
    return { totalReceipts, foundReceipts, totalAmount, filteredAmount };
  };

  const formatCurrency = (amount: number) => {
    return `R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const stats = getSearchStats();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#28a745" />
      
      
          

      <View style={styles.content}>
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

          {selectedFilter === 'date' && (
            <DateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />
          )}
        </View>

        <ReceiptList
          receipts={filteredReceipts}
          loading={loading}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onReceiptPress={handleReceiptPress}
        />
      </View>
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