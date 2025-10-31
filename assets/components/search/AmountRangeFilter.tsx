import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

interface AmountRangeFilterProps {
  minAmount: string;
  maxAmount: string;
  onMinAmountChange: (amount: string) => void;
  onMaxAmountChange: (amount: string) => void;
}

export const AmountRangeFilter: React.FC<AmountRangeFilterProps> = ({
  minAmount,
  maxAmount,
  onMinAmountChange,
  onMaxAmountChange,
}) => {
  return (
    <View style={styles.amountRangeContainer}>
      <TextInput
        style={styles.amountInput}
        placeholder="Min amount"
        value={minAmount}
        onChangeText={onMinAmountChange}
        keyboardType="numeric"
      />
      <Text style={styles.toText}>to</Text>
      <TextInput
        style={styles.amountInput}
        placeholder="Max amount"
        value={maxAmount}
        onChangeText={onMaxAmountChange}
        keyboardType="numeric"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  amountRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  amountInput: {
    flex: 1,
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 14,
  },
  toText: {
    marginHorizontal: 8,
    color: '#666',
    fontWeight: '600',
  },
});