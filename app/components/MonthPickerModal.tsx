/**
 * Month Picker Modal Component
 * 
 * Allows users to select which month they want AI feedback for,
 * with quick preview of data for each available month
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AIFeedbackService from '../../services/AIFeedbackService';
import { MonthOption } from '../../types/receipt';
import MonthlyDataAggregator from '../../utils/MonthlyDataAggregator';

interface MonthPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectMonth: (monthKey: string) => void;
  selectedMonth?: string;
}

interface MonthWithPreview extends MonthOption {
  preview?: {
    summary: string;
    totalSpent: number;
    transactionCount: number;
    topCategory: string;
  };
  loading?: boolean;
}

const MonthPickerModal: React.FC<MonthPickerModalProps> = ({
  visible,
  onClose,
  onSelectMonth,
  selectedMonth,
}) => {
  const [availableMonths, setAvailableMonths] = useState<MonthWithPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPreviews, setLoadingPreviews] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) {
      loadAvailableMonths();
    }
  }, [visible]);

  const loadAvailableMonths = async () => {
    try {
      setLoading(true);
      const months = await MonthlyDataAggregator.generateAvailableMonths();
      
      if (months.length === 0) {
        Alert.alert(
          'No Data Available',
          'You need to have some receipts before getting AI feedback. Start by scanning some receipts!',
          [{ text: 'OK', onPress: onClose }]
        );
        return;
      }

      // Convert to MonthWithPreview format
      const monthsWithPreview: MonthWithPreview[] = months.map(month => ({
        ...month,
        loading: false,
      }));

      setAvailableMonths(monthsWithPreview);
      
      // Load previews for the first few months
      loadPreviews(monthsWithPreview.slice(0, 3));
      
    } catch (error) {
      console.error('Error loading available months:', error);
      Alert.alert(
        'Error',
        'Could not load available months. Please try again.',
        [{ text: 'OK', onPress: onClose }]
      );
    } finally {
      setLoading(false);
    }
  };

  const loadPreviews = async (months: MonthWithPreview[]) => {
    const newLoadingPreviews = new Set(loadingPreviews);
    
    for (const month of months) {
      if (!month.preview && !newLoadingPreviews.has(month.value)) {
        newLoadingPreviews.add(month.value);
        setLoadingPreviews(new Set(newLoadingPreviews));

        try {
          const preview = await AIFeedbackService.getQuickAnalysis(month.value);
          
          setAvailableMonths(prev => 
            prev.map(m => 
              m.value === month.value 
                ? { ...m, preview, loading: false }
                : m
            )
          );
        } catch (error) {
          console.error(`Error loading preview for ${month.value}:`, error);
        }

        newLoadingPreviews.delete(month.value);
        setLoadingPreviews(new Set(newLoadingPreviews));
      }
    }
  };

  const handleSelectMonth = (monthKey: string) => {
    onSelectMonth(monthKey);
    onClose();
  };

  const renderMonthItem = ({ item }: { item: MonthWithPreview }) => {
    const isSelected = item.value === selectedMonth;
    const hasPreview = !!item.preview;
    const isLoadingPreview = loadingPreviews.has(item.value);

    return (
      <TouchableOpacity
        style={[styles.monthItem, isSelected && styles.selectedMonth]}
        onPress={() => handleSelectMonth(item.value)}
        onPressIn={() => {
          // Load preview on demand when user interacts with item
          if (!hasPreview && !isLoadingPreview) {
            loadPreviews([item]);
          }
        }}
      >
        <View style={styles.monthHeader}>
          <View style={styles.monthInfo}>
            <Text style={[styles.monthLabel, isSelected && styles.selectedText]}>
              {item.label}
            </Text>
            <Text style={[styles.monthSubtext, isSelected && styles.selectedSubtext]}>
              {item.year} • {String(item.month).padStart(2, '0')}
            </Text>
          </View>
          
          {isSelected && (
            <Ionicons 
              name="checkmark-circle" 
              size={24} 
              color="#22D3EE" 
            />
          )}
        </View>

        {/* Preview Data */}
        {isLoadingPreview ? (
          <View style={styles.previewContainer}>
            <ActivityIndicator size="small" color="#999" />
            <Text style={styles.loadingText}>Loading preview...</Text>
          </View>
        ) : hasPreview ? (
          <View style={styles.previewContainer}>
            <Text style={styles.previewSummary}>
              {item.preview!.summary}
            </Text>
            <View style={styles.previewStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>R{item.preview!.totalSpent.toFixed(0)}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{item.preview!.transactionCount}</Text>
                <Text style={styles.statLabel}>Receipts</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue} numberOfLines={1}>
                  {item.preview!.topCategory}
                </Text>
                <Text style={styles.statLabel}>Top Category</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.previewContainer}>
            <Text style={styles.tapToLoad}>Tap to load preview</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Loading Months...</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Finding your receipt data...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Select Month for AI Feedback</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>
          Choose a month to get AI insights and recommendations about your spending patterns
        </Text>

        {availableMonths.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#CCC" />
            <Text style={styles.emptyTitle}>No Receipts Found</Text>
            <Text style={styles.emptySubtext}>
              Start scanning receipts to get AI-powered spending insights
            </Text>
          </View>
        ) : (
          <FlatList
            data={availableMonths}
            keyExtractor={(item) => item.value}
            renderItem={renderMonthItem}
            style={styles.monthList}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#374151',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60, // Account for status bar
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6D6D70',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6D6D70',
  },
  monthList: {
    flex: 1,
  },
  monthItem: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedMonth: {
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthInfo: {
    flex: 1,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  selectedText: {
    color: '#007AFF',
  },
  monthSubtext: {
    fontSize: 14,
    color: '#6D6D70',
    marginTop: 2,
  },
  selectedSubtext: {
    color: '#007AFF',
  },
  previewContainer: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  previewSummary: {
    fontSize: 14,
    color: '#6D6D70',
    marginBottom: 12,
  },
  previewStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  tapToLoad: {
    fontSize: 14,
    color: '#007AFF',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  separator: {
    height: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#6D6D70',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default MonthPickerModal;