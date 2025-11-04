import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getUserBudgetByMonth } from "../../../utils/CRUD/budgetcrud";
import { CategoryBudget } from "../../../utils/localdb";

interface CategoryBreakdownProps {
  userId?: string | null;
}

export default function CategoryBreakdown({ userId }: CategoryBreakdownProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryBudget[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(userId || null);

  useEffect(() => {
    setCurrentUserId(userId || null);
  }, [userId]);

  useEffect(() => {
    if (currentUserId) {
      loadCategoryData();
    }
  }, [currentUserId]);

  const loadCategoryData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!currentUserId) {
        throw new Error('No user ID provided');
      }

      // Get current month budget
      const currentDate = new Date();
      const monthYear = `${currentDate.toLocaleString('en-US', { month: 'long' })} ${currentDate.getFullYear()}`;
      
      console.log('CategoryBreakdown: Loading budget for user:', currentUserId, 'month:', monthYear);
      const budget = await getUserBudgetByMonth(currentUserId, monthYear);
      console.log('CategoryBreakdown: Budget data:', budget);
      
      if (budget && budget.categoryBudgets) {
        // Sort categories by spending amount (highest first)
        const sortedCategories = budget.categoryBudgets
          .filter(cat => cat.budgetAmount > 0) // Only show categories with budget
          .sort((a, b) => (b.spent || 0) - (a.spent || 0));
        
        setCategories(sortedCategories);
      } else {
        setCategories([]);
      }

    } catch (err) {
      console.error('Error loading category data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load categories');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (categoryName: string) => {
    const category = categoryName.toLowerCase();
    if (category.includes('food') || category.includes('dining') || category.includes('groceries')) {
      return 'restaurant';
    } else if (category.includes('transport') || category.includes('fuel') || category.includes('car')) {
      return 'car';
    } else if (category.includes('shopping') || category.includes('retail')) {
      return 'bag';
    } else if (category.includes('utilities') || category.includes('bills')) {
      return 'flash';
    } else if (category.includes('entertainment') || category.includes('fun')) {
      return 'game-controller';
    } else if (category.includes('health') || category.includes('medical')) {
      return 'medical';
    } else if (category.includes('education') || category.includes('learning')) {
      return 'school';
    } else {
      return 'apps';
    }
  };

  const getCategoryColor = (index: number) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD'];
    return colors[index % colors.length];
  };

  const getProgressPercentage = (spent: number, budget: number) => {
    if (budget === 0) return 0;
    return Math.min((spent / budget) * 100, 100);
  };

  const displayedCategories = expanded ? categories : categories.slice(0, 3);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#667eea" />
        <Text style={styles.loadingText}>Loading categories...</Text>
      </View>
    );
  }

  if (error || categories.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="list" size={20} color="#333" />
          <Text style={styles.title}>Category Breakdown</Text>
        </View>
        <Text style={styles.emptyText}>
          {error ? 'Unable to load categories' : 'No budget categories found'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="list" size={20} color="#333" />
        <Text style={styles.title}>Category Breakdown</Text>
      </View>

      <View style={styles.categoriesContainer}>
        {displayedCategories.map((category, index) => {
          const progressPercentage = getProgressPercentage(category.spent || 0, category.budgetAmount);
          const isOverspent = (category.spent || 0) > category.budgetAmount;
          const categoryColor = getCategoryColor(index);

          return (
            <View key={category.categoryName} style={styles.categoryItem}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryInfo}>
                  <View style={[styles.categoryIcon, { backgroundColor: categoryColor }]}>
                    <Ionicons 
                      name={getCategoryIcon(category.categoryName) as any} 
                      size={16} 
                      color="white" 
                    />
                  </View>
                  <View style={styles.categoryTexts}>
                    <Text style={styles.categoryName}>{category.categoryName}</Text>
                    <Text style={styles.categoryProgress}>
                      R{(category.spent || 0).toFixed(2)} / R{category.budgetAmount.toFixed(2)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.categoryValues}>
                  <Text style={[
                    styles.percentageText, 
                    isOverspent && styles.overspentText
                  ]}>
                    {progressPercentage.toFixed(0)}%
                  </Text>
                  {isOverspent && (
                    <Text style={styles.overspentLabel}>Over</Text>
                  )}
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBar,
                    { 
                      width: `${Math.min(progressPercentage, 100)}%`,
                      backgroundColor: isOverspent ? '#dc2626' : categoryColor
                    }
                  ]} 
                />
                {isOverspent && (
                  <View 
                    style={[
                      styles.overspentBar,
                      { 
                        width: `${Math.min(progressPercentage - 100, 20)}%`,
                        backgroundColor: '#dc2626'
                      }
                    ]} 
                  />
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Expand/Collapse Button */}
      {categories.length > 3 && (
        <TouchableOpacity 
          style={styles.expandButton}
          onPress={() => setExpanded(!expanded)}
        >
          <Text style={styles.expandButtonText}>
            {expanded ? 'Show Less' : `Show All (${categories.length})`}
          </Text>
          <Ionicons 
            name={expanded ? 'chevron-up' : 'chevron-down'} 
            size={16} 
            color="#667eea" 
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 10,
    color: '#666',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    paddingVertical: 20,
  },
  categoriesContainer: {
    gap: 12,
  },
  categoryItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryTexts: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  categoryProgress: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  categoryValues: {
    alignItems: 'flex-end',
  },
  percentageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  overspentText: {
    color: '#dc2626',
  },
  overspentLabel: {
    fontSize: 10,
    color: '#dc2626',
    fontWeight: '500',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#E5E5E5',
    borderRadius: 3,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  overspentBar: {
    height: '100%',
    backgroundColor: '#dc2626',
    opacity: 0.7,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 10,
  },
  expandButtonText: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
});