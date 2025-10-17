import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

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
    fontSize: 16,
  },
  toText: {
    marginHorizontal: 12,
    fontSize: 16,
    color: '#666',
  },
});