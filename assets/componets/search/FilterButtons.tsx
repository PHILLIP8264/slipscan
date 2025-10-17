import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';

export type SearchFilter = 'all' | 'merchant' | 'category' | 'tag' | 'content' | 'date' | 'amount';

interface FilterButtonsProps {
  selectedFilter: SearchFilter;
  onFilterChange: (filter: SearchFilter) => void;
}

const filterOptions = [
  { filter: 'all' as SearchFilter, title: 'All' },
  { filter: 'merchant' as SearchFilter, title: 'Merchant' },
  { filter: 'category' as SearchFilter, title: 'Category' },
  { filter: 'tag' as SearchFilter, title: 'Tags' },
  { filter: 'content' as SearchFilter, title: 'Content' },
  { filter: 'amount' as SearchFilter, title: 'Amount' },
];

export const FilterButtons: React.FC<FilterButtonsProps> = ({
  selectedFilter,
  onFilterChange,
}) => {
  const FilterButton = ({ filter, title }: { filter: SearchFilter; title: string }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        selectedFilter === filter && styles.activeFilterButton,
      ]}
      onPress={() => onFilterChange(filter)}
    >
      <Text
        style={[
          styles.filterButtonText,
          selectedFilter === filter && styles.activeFilterButtonText,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
      {filterOptions.map(({ filter, title }) => (
        <FilterButton key={filter} filter={filter} title={title} />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  filtersContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: 'white',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  activeFilterButton: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
  },
  activeFilterButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});