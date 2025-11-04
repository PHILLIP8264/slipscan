import CategoryBreakdown from "@/assets/components/homeui/CategoryBreakdown";
import TotalBudgetChart from "@/assets/components/homeui/TotalBudgetChart";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { clearAllBudgets, getUserBudgetByMonth } from '../../utils/CRUD/budgetcrud';
import { getUserByEmail } from '../../utils/CRUD/usercrud';
import DocumentScanner from '../../utils/DocumentScanner';
import { Budget } from '../../utils/localdb';
import { useAuth } from '../contexts/AuthContext';

export default function Index() {
  const router = useRouter();
  const { authState } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [budgetData, setBudgetData] = useState<Budget | null>(null);
  const [loadingBudget, setLoadingBudget] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMockData, setLoadingMockData] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadCurrentUser();
  }, [authState.lastUserEmail]);

  useEffect(() => {
    if (currentUserId) {
      loadBudgetData();
    }
  }, [currentUserId]);

  // Refresh data when screen comes into focus (e.g., after deleting a receipt)
  useFocusEffect(
    useCallback(() => {
      if (currentUserId) {
        console.log('🔄 Home screen focused - refreshing data...');
        loadBudgetData();
      }
    }, [currentUserId])
  );

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

  const loadBudgetData = async (isRefresh = false) => {
    try {
      if (!currentUserId) {
        setBudgetData(null);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoadingBudget(true);
      }
      
      const currentDate = new Date();
      const monthName = currentDate.toLocaleString('en-US', { month: 'long' });
      const year = currentDate.getFullYear();
      const monthYear = `${monthName} ${year}`;
      
      const budget = await getUserBudgetByMonth(currentUserId, monthYear);
      setBudgetData(budget);
      
      // Force re-render of chart components
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error("Error loading budget data:", error);
      setBudgetData(null);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoadingBudget(false);
      }
    }
  };

  const onRefresh = () => {
    loadCurrentUser();
    loadBudgetData(true);
  };

  // Helper function to format currency
  const formatCurrency = (amount: number): string => {
    return `R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Calculate budget totals
  const getTotalBudget = (): number => {
    return budgetData?.totalBudget || 0;
  };

  const getTotalSpent = (): number => {
    return budgetData?.categoryBudgets?.reduce((total, cat) => total + cat.spent, 0) || 0;
  };

  const getRemainingBudget = (): number => {
    return budgetData?.remainingBudget || (getTotalBudget() - getTotalSpent());
  };

  // Get current month name
  const getCurrentMonthName = (): string => {
    const currentDate = new Date();
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  };

  const handleScanReceipt = async () => {
    try {
      setIsScanning(true);
      
      // Show scanning started alert
      Alert.alert(
        "📱 Starting Scanner",
        Platform.OS === "android" 
          ? "Launching ML Kit document scanner..." 
          : "Opening camera scanner...",
        [{ text: "OK" }]
      );

      // Start the document scanner
      const result = await DocumentScanner.startScanner({
        pageLimit: 3,
        allowGalleryImport: true,
        scannerMode: "full",
        pdf: true,
        useGoogleVision: true,
        useModernProcessing: true, // Enable new processing workflow
      });

      // Check if user cancelled the scan
      if (result.canceled) {
        // User cancelled - no need to show error, just return silently
        console.log("User cancelled scanning");
        return;
      }

      // Handle successful scan - navigate immediately to EditReceiptModern
      if (result.pages && result.pages.length > 0) {
        try {
          const receiptDataParam = result.receiptData
            ? encodeURIComponent(JSON.stringify(result.receiptData))
            : encodeURIComponent(JSON.stringify({}));
          const imageUriParam = result.pages[0]?.imageUri
            ? encodeURIComponent(result.pages[0].imageUri)
            : '';

          // Navigate immediately - processing will happen on EditReceiptModern page
          router.push(`../EditReceiptModern?receiptData=${receiptDataParam}&imageUri=${imageUriParam}`);
        } catch (err) {
          console.error('Failed to navigate to EditReceiptModern:', err);
          router.push('../EditReceiptModern');
        }
      } else {
        Alert.alert("ℹ️ No Pages Scanned", "Please try scanning again.");
      }
    } catch (error) {
      console.error("Scanning error:", error);
      Alert.alert(
        "❌ Scanning Error",
        "Failed to scan document. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handleClearAllBudgets = async () => {
    Alert.alert(
      "🗑️ Clear All Budgets",
      "This will permanently delete ALL budgets from the database. This action cannot be undone.\n\nUse this to fix budget overspending issues caused by test/mock data.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "DELETE ALL",
          style: "destructive",
          onPress: async () => {
            try {
              await clearAllBudgets();
              setBudgetData(null);
              Alert.alert(
                "✅ Success",
                "All budgets have been cleared from the database. You can now create fresh budgets.",
                [{ text: "OK" }]
              );
            } catch (error) {
              console.error("Error clearing budgets:", error);
              Alert.alert(
                "❌ Error",
                "Failed to clear budgets. Please try again.",
                [{ text: "OK" }]
              );
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4285F4" />
      
      <LinearGradient
        colors={['#4285F4', '#34A853']}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTitleSection}>
            <Ionicons name="receipt" size={24} color="white" />
            <Text style={styles.headerTitle}>SlipScan</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={true}
        alwaysBounceVertical={false}
        scrollEventThrottle={16}
        decelerationRate="normal"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4285F4']}
            tintColor="#4285F4"
          />
        }
      >

        {/* Monthly Budget Overview with Donut Chart */}
        <View style={styles.budgetOverviewSection}>
          <View style={styles.budgetHeader}>
            <Text style={styles.budgetTitle}>{getCurrentMonthName()} Budget</Text>
            {!loadingBudget && !budgetData ? (
              <View style={styles.noBudgetContainer}>
                <Text style={styles.noBudgetText}>No budget set for this month</Text>
                <TouchableOpacity 
                  style={styles.createBudgetButton}
                  onPress={() => router.push('/tabs/budget')}
                >
                  <Text style={styles.createBudgetText}>Create Budget</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.budgetSummary}>
              </View>
            )}
          </View>
          
          {/* Total Budget Chart */}
          <View style={styles.chartContainer}>
            <TotalBudgetChart key={`chart-${refreshKey}`} userId={currentUserId} />
          </View>
        </View>

        {/* Main Scan Action */}
        <View style={styles.scanActionContainer}>
          <TouchableOpacity
            style={[
              styles.mainScanButton,
              isScanning && styles.scanningButton
            ]}
            onPress={handleScanReceipt}
            disabled={isScanning}
          >
            <Ionicons 
              name={isScanning ? "hourglass" : "scan"} 
              size={40} 
              color="white" 
            />
            <Text style={styles.mainScanButtonText}>
              {isScanning ? "Scanning..." : "Scan Receipt"}
            </Text>
            <Text style={styles.mainScanSubtext}>
              {isScanning 
                ? "Please wait while scanning..."
                : Platform.OS === "android" 
                  ? "Advanced document scanner" 
                  : "Advanced camera scanner"
              }
            </Text>
          </TouchableOpacity>

          {/* Category Breakdown */}
          <View style={styles.categoryBreakdownContainer}>
            <CategoryBreakdown key={`categories-${refreshKey}`} userId={currentUserId} />
          </View>

          {/* Clear Budgets Button (Development/Debug) */}
          <TouchableOpacity
            style={styles.clearBudgetsButton}
            onPress={handleClearAllBudgets}
          >
            <Ionicons name="trash" size={20} color="#dc2626" />
            <Text style={styles.clearBudgetsButtonText}>Clear All Budgets</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  headerGradient: {
    paddingTop: 0,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 24,
  },
  headerTitleSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 12,
  },
  content: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#f8f9fa',
    overflow: 'hidden',
  },
  // Budget Overview Section
  budgetOverviewSection: {
    backgroundColor: "#fff",
    margin: 20,
    marginTop: 30,
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  budgetHeader: {
    marginBottom: 24,
  },
  budgetTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 16,
    textAlign: 'center',
  },
  budgetSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  budgetSummaryItem: {
    alignItems: 'center',
  },
  budgetAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4285F4',
    marginBottom: 4,
  },
  spentAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 4,
  },
  remainingAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34A853',
    marginBottom: 4,
  },
  budgetLabel: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Scan Action Section
  scanActionContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  mainScanButton: {
    backgroundColor: "#4285F4",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  scanningButton: {
    backgroundColor: "#6c757d",
    opacity: 0.7,
  },
  mainScanButtonText: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 12,
  },
  mainScanSubtext: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  // No Budget Styles
  noBudgetContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  noBudgetText: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 12,
    textAlign: 'center',
  },
  createBudgetButton: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createBudgetText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  // Mock Data Button Styles
  mockDataButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  mockDataButtonText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  // Clear Budgets Button Styles
  clearBudgetsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  clearBudgetsButtonText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Category Breakdown Container
  categoryBreakdownContainer: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

});
