import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';

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
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      style={styles.filtersContainer}
      bounces={false}
      alwaysBounceHorizontal={false}
      decelerationRate="fast"
      scrollEventThrottle={30}
      
      contentContainerStyle={styles.scrollContent}
      pagingEnabled={false}
      snapToInterval={120}
      snapToAlignment="start"
      directionalLockEnabled={true}
      contentOffset={{ x: 0, y: 0 }}
      contentInset={{ left: 0, right: 50, top: 0, bottom: 0 }}
      automaticallyAdjustContentInsets={false}
    >
      {filterOptions.map(({ filter, title }) => (
        <FilterButton key={filter} filter={filter} title={title} />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  filtersContainer: {
    paddingLeft: 20,
    paddingRight: 200,
    marginBottom: 16,
    paddingVertical: 8,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginRight: 10,
    backgroundColor: '#f0f2f5',
    borderRadius: 25,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  activeFilterButton: {
    backgroundColor: '#4285F4',
    elevation: 3,
    shadowOpacity: 0.2,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  activeFilterButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingLeft: 0,
    paddingRight: 20,
    alignItems: 'center',
    minWidth: '100%',
  },
});