import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';

export type BudgetTab = 'past' | 'upcoming' | 'current';

interface BudgetTabsProps {
  selectedTab: BudgetTab;
  onTabChange: (tab: BudgetTab) => void;
}

const tabOptions = [
  { tab: 'past' as BudgetTab, title: 'Past Budgets' },
  { tab: 'upcoming' as BudgetTab, title: 'Upcoming Budgets' },
  { tab: 'current' as BudgetTab, title: 'Current Budgets' },
];

export const BudgetTabs: React.FC<BudgetTabsProps> = ({
  selectedTab,
  onTabChange,
}) => {
  const TabButton = ({ tab, title }: { tab: BudgetTab; title: string }) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        selectedTab === tab && styles.activeTabButton,
      ]}
      onPress={() => onTabChange(tab)}
    >
      <Text
        style={[
          styles.tabButtonText,
          selectedTab === tab && styles.activeTabButtonText,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
      {tabOptions.map(({ tab, title }) => (
        <TabButton key={tab} tab={tab} title={title} />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  tabsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tabButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginRight: 12,
    backgroundColor: 'white',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 120,
    alignItems: 'center',
  },
  activeTabButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  tabButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});