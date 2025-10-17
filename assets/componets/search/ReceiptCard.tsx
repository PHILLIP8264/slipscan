import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Receipt } from '../../utils/localdb';

interface ReceiptCardProps {
  receipt: Receipt;
  onPress?: (receipt: Receipt) => void;
}

export const ReceiptCard: React.FC<ReceiptCardProps> = ({ receipt, onPress }) => {
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString();
  };

  const formatAmount = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  return (
    <TouchableOpacity 
      style={styles.receiptCard}
      onPress={() => onPress?.(receipt)}
      activeOpacity={0.7}
    >
      <View style={styles.receiptHeader}>
        <Text style={styles.merchantName}>{receipt.merchant}</Text>
        <Text style={styles.amount}>{formatAmount(receipt.amount)}</Text>
      </View>
      
      <View style={styles.receiptDetails}>
        <Text style={styles.category}>{receipt.category}</Text>
        <Text style={styles.date}>{formatDate(receipt.date)}</Text>
      </View>
      
      {receipt.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {receipt.tags.map((tag, index) => (
            <Text key={index} style={styles.tag}>
              {tag}
            </Text>
          ))}
        </View>
      )}
      
      {receipt.ocrText && (
        <Text style={styles.ocrText} numberOfLines={2}>
          {receipt.ocrText.substring(0, 100)}...
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  receiptCard: {
    backgroundColor: 'white',
    margin: 8,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  merchantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
  },
  receiptDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  category: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  date: {
    fontSize: 14,
    color: '#666',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tag: {
    fontSize: 12,
    color: '#007AFF',
    backgroundColor: '#e6f3ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 4,
  },
  ocrText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
});