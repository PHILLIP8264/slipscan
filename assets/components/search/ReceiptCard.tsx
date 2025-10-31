import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Receipt } from '../../../utils/localdb';

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
    return `R${amount.toFixed(2)}`;
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
          {receipt.tags.map((tag: string, index: number) => (
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
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    borderWidth: 0.5,
    borderColor: '#f0f0f0',
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
    color: '#1a1a1a',
    flex: 1,
    marginRight: 12,
  },
  amount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  receiptDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  category: {
    fontSize: 13,
    color: '#495057',
    backgroundColor: '#e9ecef',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    fontWeight: '600',
  },
  date: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tag: {
    fontSize: 12,
    color: '#4285F4',
    backgroundColor: '#e8f0fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 6,
    fontWeight: '600',
  },
  ocrText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
});