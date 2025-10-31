import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}) => {
  return (
    <View style={styles.dateRangeContainer}>
      <TextInput
        style={styles.dateInput}
        placeholder="Start date (DD/MM/YYYY)"
        value={startDate}
        onChangeText={onStartDateChange}
        keyboardType="numeric"
      />
      <Text style={styles.toText}>to</Text>
      <TextInput
        style={styles.dateInput}
        placeholder="End date (DD/MM/YYYY)"
        value={endDate}
        onChangeText={onEndDateChange}
        keyboardType="numeric"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  dateRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  dateInput: {
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