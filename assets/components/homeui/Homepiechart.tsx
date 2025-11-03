import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import PieChart from "react-native-pie-chart";
import { useAuth } from "../../../app/contexts/AuthContext";
import { getUserBudgetByMonth } from "../../../utils/CRUD/budgetcrud";
import { getUserByEmail } from "../../../utils/CRUD/usercrud";
import { CategoryBudget } from "../../../utils/localdb";

interface PieChartData {
  value: number;
  color: string;
  label: string;
}

// Color palette for categories
const CATEGORY_COLORS = [
  "#FF6B6B", // Red
  "#4ECDC4", // Teal
  "#45B7D1", // Blue
  "#96CEB4", // Green
  "#FECA57", // Yellow
  "#FF9FF3", // Pink
  "#54A0FF", // Light Blue
  "#5F27CD", // Purple
  "#00D2D3", // Cyan
  "#FF6348", // Orange
];

interface BudgetPieChartProps {
  userId?: string | null;
}

export default function BudgetPieChart({ userId }: BudgetPieChartProps) {
  const { authState } = useAuth();
  const [chartData, setChartData] = useState<PieChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(userId || null);

  useEffect(() => {
    if (userId) {
      setCurrentUserId(userId);
    } else {
      loadCurrentUser();
    }
  }, [userId, authState.lastUserEmail]);

  useEffect(() => {
    if (currentUserId) {
      loadBudgetData();
    }
  }, [currentUserId]);

  const loadCurrentUser = async () => {
    try {
      if (authState.lastUserEmail) {
        const user = await getUserByEmail(authState.lastUserEmail);
        if (user) {
          setCurrentUserId(user._id);
        }
      }
    } catch (error) {
      console.error("Error loading current user:", error);
      setCurrentUserId(null);
    }
  };

  const loadBudgetData = async () => {
    try {
      if (!currentUserId) {
        setChartData([
          { value: 100, color: "#E0E0E0", label: "No Budget Set" }
        ]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      // Get current month in "Month Year" format
      const currentDate = new Date();
      const monthName = currentDate.toLocaleString('en-US', { month: 'long' });
      const year = currentDate.getFullYear();
      const monthYear = `${monthName} ${year}`;
      
      // Fetch budget data for current month
      const budget = await getUserBudgetByMonth(currentUserId, monthYear);
      
      if (budget && budget.categoryBudgets && budget.categoryBudgets.length > 0) {
        // Convert category budgets to chart data
        const data = budget.categoryBudgets.map((catBudget: CategoryBudget, index: number) => ({
          value: catBudget.spent > 0 ? catBudget.spent : catBudget.budgetAmount * 0.1, // Show small slice if nothing spent
          color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
          label: catBudget.categoryName,
        }));

        setChartData(data);
      } else {
        // No budget data found, show placeholder message
        setChartData([
          { value: 100, color: "#E0E0E0", label: "No Budget Set" }
        ]);
      }
    } catch (err) {
      console.error("Error loading budget data:", err);
      setError("Failed to load budget data");
      // Show sample data on error
      setChartData([
        { value: 520, color: "#FF6B6B", label: "Food & Dining" },
        { value: 320, color: "#4ECDC4", label: "Transportation" },
        { value: 280, color: "#45B7D1", label: "Shopping" },
        { value: 130, color: "#96CEB4", label: "Utilities" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={styles.loadingText}>Loading budget data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const widthAndHeight = 250;
  const series = chartData.map(item => ({ value: item.value, color: item.color }));

  return (
    <View style={styles.container}>
      <PieChart
        widthAndHeight={widthAndHeight}
        series={series}
        cover={0.45}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#666",
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    color: "#FF6B6B",
    textAlign: "center",
  },
});
