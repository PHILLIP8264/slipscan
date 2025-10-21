import React, { useRef } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';

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
  const scrollViewRef = useRef<ScrollView>(null);
  const screenWidth = Dimensions.get('window').width;
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
    <ScrollView 
      ref={scrollViewRef}
      horizontal 
      showsHorizontalScrollIndicator={false} 
      style={styles.tabsContainer}
      bounces={false}
      overScrollMode="never"
      contentContainerStyle={styles.scrollContent}
      pagingEnabled={false}
      decelerationRate="fast"
      snapToInterval={screenWidth * 0.4} // Snap to intervals
      snapToAlignment="start"
    >
      {tabOptions.map(({ tab, title }) => (
        <TabButton key={tab} tab={tab} title={title} />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  tabsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingRight: 16,
    alignItems: 'flex-start',
  },
  tabButton: {
    marginTop: 40,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginRight: 12,
    backgroundColor: 'white',
    borderRadius: 15,
    borderWidth: 0,
    minWidth: 130,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  activeTabButton: {
    backgroundColor: '#007AFF',
    elevation: 4,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    transform: [{ scale: 1.02 }],
  },
  tabButtonText: {
    fontSize: 15,
    color: 'black',
    fontWeight: '600',
  },
  activeTabButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});