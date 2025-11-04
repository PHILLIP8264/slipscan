import { getFontFamily } from "@/utils/fonts";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
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
        colors: ['#fff'],
        labels: ['No Budget Set']
      };
    }

    const remaining = Math.max(0, totalBudget - totalSpent);
    const spent = Math.min(totalSpent, totalBudget);
    
    return {
      values: remaining > 0 ? [spent, remaining] : [totalBudget],
      colors: remaining > 0 ? ['#ef0f0fff', '#22D3EE'] : ['#ef0f0fff'],
      labels: remaining > 0 ? ['Spent', 'Remaining'] : ['Overspent']
    };
  };

  const getDisplayValues = () => {
    const remaining = totalBudget - totalSpent;
    const percentageSpent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    
    return {
      totalBudget,
      totalSpent,
      remaining, // Keep actual value for display (can be negative)
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

  // Constants for calculation
const radius = 100;
const strokeWidth = 25;

// Dynamic values
const percentage = displayValues.percentageSpent / 100;
const capRotation = 360 * percentage;

  return (
    <View style={styles.container}>
      {/* Chart */}
      <View style={styles.chartWrapper}>
        <Svg width={250} height={250} style={styles.svgChart}>
  {/* 1. Background circle - Remains the same */}
  <Circle
    cx="125"
    cy="125"
    r={radius}
    stroke="#22D3EE"
    strokeWidth={strokeWidth}
    fill="transparent"
  />

  {/* 2. Progress Arc (Flat end) */}
  <Circle
    cx="125"
    cy="125"
    r={radius}
    stroke="#DC2626"
    strokeWidth={strokeWidth}
    fill="transparent"
    strokeLinecap="butt" 
    strokeDasharray={`${2 * Math.PI * 100 * (displayValues.percentageSpent / 100)} ${2 * Math.PI * 100}`}
    strokeDashoffset={-Math.PI * 100 / 2} 
    transform="rotate(-180 125 125)" 
  />
  
  {/* 3. The Custom Rounded End Cap */}
  {percentage > 0 && ( 
    <Circle
      cx="125" 
      cy="25" 
      r={strokeWidth / 2} 
      fill="#DC2626" 
      strokeDasharray={`${2 * Math.PI * 100 * (displayValues.percentageSpent / 100)} ${2 * Math.PI * 100}`}
      strokeDashoffset={-Math.PI * 100 / 2} 
      origin="125, 125" 
      rotation={capRotation}
    />
  )}
</Svg>
        
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
            <Text style={styles.summaryLabel}>Spent:</Text>
            <Text style={styles.summaryValue}>R{displayValues.totalSpent.toFixed(2)}</Text>
          </View>
          
          
          
          {displayValues.remaining >= 0 && (
            <View style={styles.summaryItem}>
              <View style={[styles.colorDot, { backgroundColor: '#22D3EE' }]} />
              <Text style={styles.summaryLabel}>Remaining:</Text>
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
        color: '#E5398B',
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
    svgChart: {
        transform: [{ rotate: '0deg' }],
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
        fontFamily: getFontFamily('extraBold'),
        color: '#000',
    },
    centerLabel: {
        fontSize: 25,
        color: '#e50000ff',
        fontFamily: getFontFamily('extraBold'),
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
        fontSize: 15,
        color: '#000',
        fontFamily: getFontFamily('extraBold'),
        marginRight: 4,
    },
    summaryValue: {
        fontSize: 15,
        fontFamily: getFontFamily('extraBold'),
        color: '#000',
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
        fontSize: 20,
        fontFamily: getFontFamily('extraBold'),
        color: '#000',
    },
    totalValue: {
        fontSize: 20,
        fontFamily: getFontFamily('extraBold'),
        color: '#22D3EE',
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