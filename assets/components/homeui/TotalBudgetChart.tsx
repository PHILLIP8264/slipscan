import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import PieChart from "react-native-pie-chart";
import { getUserBudgetByMonth } from "../../../utils/CRUD/budgetcrud";

interface TotalBudgetChartProps {
  userId?: string | null;
}

export default function TotalBudgetChart({ userId }: TotalBudgetChartProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalBudget, setTotalBudget] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(userId || null);

  useEffect(() => {
    setCurrentUserId(userId || null);
  }, [userId]);

  useEffect(() => {
    if (currentUserId) {
      loadBudgetData();
    }
  }, [currentUserId]);

  const loadBudgetData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!currentUserId) {
        throw new Error('No user ID provided');
      }

      // Get current month budget
      const currentDate = new Date();
      const monthYear = `${currentDate.toLocaleString('en-US', { month: 'long' })} ${currentDate.getFullYear()}`;
      
      console.log('TotalBudgetChart: Loading budget for user:', currentUserId, 'month:', monthYear);
      const budget = await getUserBudgetByMonth(currentUserId, monthYear);
      console.log('TotalBudgetChart: Budget data:', budget);
      
      if (budget && budget.categoryBudgets) {
        // Calculate totals
        const budgetTotal = budget.categoryBudgets.reduce((sum, cat) => sum + (cat.budgetAmount || 0), 0);
        const spentTotal = budget.categoryBudgets.reduce((sum, cat) => sum + (cat.spent || 0), 0);
        
        setTotalBudget(Number(budgetTotal.toFixed(2)));
        setTotalSpent(Number(spentTotal.toFixed(2)));
      } else {
        setTotalBudget(0);
        setTotalSpent(0);
      }

    } catch (err) {
      console.error('Error loading budget data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load budget');
      setTotalBudget(0);
      setTotalSpent(0);
    } finally {
      setLoading(false);
    }
  };

  const getChartData = () => {
    if (totalBudget === 0) {
      return {
        values: [100],
        colors: ['#E5E5E5'],
        labels: ['No Budget Set']
      };
    }

    const remaining = Math.max(0, totalBudget - totalSpent);
    const spent = Math.min(totalSpent, totalBudget);
    
    return {
      values: remaining > 0 ? [spent, remaining] : [totalBudget],
      colors: remaining > 0 ? ['#ef0f0fff', '#0bcd11ff'] : ['#ef0f0fff'],
      labels: remaining > 0 ? ['Spent', 'Remaining'] : ['Overspent']
    };
  };

  const getDisplayValues = () => {
    const remaining = totalBudget - totalSpent;
    const percentageSpent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    
    return {
      totalBudget,
      totalSpent,
      remaining,
      percentageSpent: Number(percentageSpent.toFixed(1))
    };
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading budget...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Unable to load budget</Text>
      </View>
    );
  }

  const chartData = getChartData();
  const displayValues = getDisplayValues();

  return (
    <View style={styles.container}>
      {/* Chart */}
      <View style={styles.chartWrapper}>
        <PieChart
          widthAndHeight={250}
          
          series={chartData.values.map((value, index) => ({
            value,
            color: chartData.colors[index]
          }))}
          cover={0.80}
        />
        
        {/* Center text */}
        <View style={styles.centerContent}>
          <Text style={styles.percentageText}>
            {displayValues.percentageSpent}%
          </Text>
          <Text style={styles.centerLabel}>Spent</Text>
        </View>
      </View>

      {/* Budget Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <View style={[styles.colorDot, { backgroundColor: '#ef0f0fff' }]} />
            <Text style={styles.summaryLabel}>Spent</Text>
            <Text style={styles.summaryValue}>R{displayValues.totalSpent.toFixed(2)}</Text>
          </View>
          
          
          
          {displayValues.remaining >= 0 && (
            <View style={styles.summaryItem}>
              <View style={[styles.colorDot, { backgroundColor: '#0bcd11ff' }]} />
              <Text style={styles.summaryLabel}>Remaining</Text>
              <Text style={styles.summaryValue}>R{displayValues.remaining.toFixed(2)}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Budget:  </Text>
          <Text style={styles.totalValue}>R{displayValues.totalBudget.toFixed(2)}</Text>
        </View>
        
        {displayValues.remaining < 0 && (
          <View style={styles.overspentRow}>
            <Text style={styles.overspentLabel}>Overspent by</Text>
            <Text style={styles.overspentValue}>R{Math.abs(displayValues.remaining).toFixed(2)}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        padding: 5,
        width: '100%',
    },
    loadingText: {
        marginTop: 10,
        color: '#666',
        fontSize: 14,
    },
    errorText: {
        color: '#dc2626',
        fontSize: 14,
        textAlign: 'center',
    },
    chartWrapper: {
        position: 'relative',
        marginBottom: 20,
        width: '100%',
        alignItems: 'center',
    },
    centerContent: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    percentageText: {
        fontSize: 30,
        fontWeight: 'bold',
        color: '#333',
    },
    centerLabel: {
        fontSize: 20,
        color: '#d66262ff',
        marginTop: 2,
    },
    summaryContainer: {
        width: '100%',
        maxWidth: '100%',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 15,
        width: '100%',
    },
    summaryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
        maxWidth: '50%',
    },
    colorDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    summaryLabel: {
        fontSize: 12,
        color: '#666',
        marginRight: 4,
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#E5E5E5',
        width: '100%',
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    totalValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#667eea',
    },
    overspentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#FFE5E5',
        width: '100%',
    },
    overspentLabel: {
        fontSize: 14,
        color: '#dc2626',
        fontWeight: '500',
    },
    overspentValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#dc2626',
    },
});