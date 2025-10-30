import Homepie from "@/assets/componets/ui/homeui/Homepiechart";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import insightsService from '../../services/InsightsService';
import DocumentScanner from '../../utils/DocumentScanner';

export default function Index() {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

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
          router.push(`/EditReceiptModern?receiptData=${receiptDataParam}&imageUri=${imageUriParam}`);
        } catch (err) {
          console.error('Failed to navigate to EditReceiptModern:', err);
          router.push('/EditReceiptModern');
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

  const handleGenerateInsights = async () => {
    try {
      setIsGeneratingInsights(true);
      
      Alert.alert(
        "🔍 Generating Insights",
        "Analyzing your spending patterns and generating insights...",
        [{ text: "OK" }]
      );

      // Get current month for insights generation
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      
      // Generate monthly insights - using a default userId for now
      // In a real app, this would come from the authentication context
      const userId = 'default-user';
      
      await insightsService.generateMonthlyInsights(currentMonth);
      
      Alert.alert(
        "✅ Insights Generated!",
        "Your spending insights have been generated successfully. You can view them in the Budget section.",
        [
          {
            text: "View Budget",
            onPress: () => router.push('/tabs/budget')
          },
          { text: "OK", style: "default" }
        ]
      );

    } catch (error) {
      console.error("Insights generation error:", error);
      Alert.alert(
        "❌ Insights Error",
        "Failed to generate insights. Please make sure you have some receipts to analyze.",
        [{ text: "OK" }]
      );
    } finally {
      setIsGeneratingInsights(false);
    }
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
      >

        {/* Monthly Budget Overview with Donut Chart */}
        <View style={styles.budgetOverviewSection}>
          <View style={styles.budgetHeader}>
            <Text style={styles.budgetTitle}>October 2025 Budget</Text>
            <View style={styles.budgetSummary}>
              <View style={styles.budgetSummaryItem}>
                <Text style={styles.budgetAmount}>R2,500</Text>
                <Text style={styles.budgetLabel}>Total Budget</Text>
              </View>
              <View style={styles.budgetSummaryItem}>
                <Text style={styles.spentAmount}>R1,250</Text>
                <Text style={styles.budgetLabel}>Spent</Text>
              </View>
              <View style={styles.budgetSummaryItem}>
                <Text style={styles.remainingAmount}>R1,250</Text>
                <Text style={styles.budgetLabel}>Remaining</Text>
              </View>
            </View>
          </View>
          
          {/* Donut Chart */}
          <View style={styles.chartContainer}>
            <Homepie />
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
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => router.push('/ScanReceipt')}
            >
              <View style={styles.quickActionIconContainer}>
                <Ionicons name="camera" size={24} color="#4285F4" />
              </View>
              <Text style={styles.quickActionText}>Scan Receipt</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => router.push('/tabs/budget')}
            >
              <View style={styles.quickActionIconContainer}>
                <Ionicons name="wallet" size={24} color="#34A853" />
              </View>
              <Text style={styles.quickActionText}>Manage Budget</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.quickActionButton, isGeneratingInsights && styles.quickActionButtonDisabled]}
              onPress={handleGenerateInsights}
              disabled={isGeneratingInsights}
            >
              <View style={styles.quickActionIconContainer}>
                <Ionicons 
                  name={isGeneratingInsights ? "hourglass" : "analytics"} 
                  size={24} 
                  color="#9C27B0" 
                />
              </View>
              <Text style={styles.quickActionText}>
                {isGeneratingInsights ? "Generating..." : "Generate Insights"}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => router.push('/tabs/search')}
            >
              <View style={styles.quickActionIconContainer}>
                <Ionicons name="search" size={24} color="#FBBC04" />
              </View>
              <Text style={styles.quickActionText}>Search Receipts</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.quickActionButton, { backgroundColor: '#FF5722' }]}
              onPress={() => router.push('/APITest')}
            >
              <View style={styles.quickActionIconContainer}>
                <Ionicons name="bug" size={24} color="#FFF" />
              </View>
              <Text style={[styles.quickActionText, { color: '#FFF' }]}>Debug APIs</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => router.push('/SettingsPage')}
            >
              <View style={styles.quickActionIconContainer}>
                <Ionicons name="settings" size={24} color="#EA4335" />
              </View>
              <Text style={styles.quickActionText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Budget Breakdown */}
        <View style={styles.budgetBreakdownSection}>
          <Text style={styles.budgetBreakdownTitle}>Budget Breakdown</Text>
          <View style={styles.categoryList}>
            <View style={styles.categoryItem}>
              <View style={styles.categoryInfo}>
                <View style={styles.categoryIconContainer}>
                  <Ionicons name="restaurant" size={20} color="#FF6B6B" />
                </View>
                <Text style={styles.categoryName}>Food & Dining</Text>
              </View>
              <View style={styles.categoryAmounts}>
                <Text style={styles.categorySpent}>R520</Text>
                <Text style={styles.categoryBudget}>/ R800</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '65%', backgroundColor: '#FF6B6B' }]} />
              </View>
            </View>

            <View style={styles.categoryItem}>
              <View style={styles.categoryInfo}>
                <View style={styles.categoryIconContainer}>
                  <Ionicons name="car" size={20} color="#4ECDC4" />
                </View>
                <Text style={styles.categoryName}>Transportation</Text>
              </View>
              <View style={styles.categoryAmounts}>
                <Text style={styles.categorySpent}>R320</Text>
                <Text style={styles.categoryBudget}>/ R500</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '64%', backgroundColor: '#4ECDC4' }]} />
              </View>
            </View>

            <View style={styles.categoryItem}>
              <View style={styles.categoryInfo}>
                <View style={styles.categoryIconContainer}>
                  <Ionicons name="storefront" size={20} color="#45B7D1" />
                </View>
                <Text style={styles.categoryName}>Shopping</Text>
              </View>
              <View style={styles.categoryAmounts}>
                <Text style={styles.categorySpent}>$280</Text>
                <Text style={styles.categoryBudget}>/ $600</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '47%', backgroundColor: '#45B7D1' }]} />
              </View>
            </View>

            <View style={styles.categoryItem}>
              <View style={styles.categoryInfo}>
                <View style={styles.categoryIconContainer}>
                  <Ionicons name="home" size={20} color="#96CEB4" />
                </View>
                <Text style={styles.categoryName}>Utilities</Text>
              </View>
              <View style={styles.categoryAmounts}>
                <Text style={styles.categorySpent}>$130</Text>
                <Text style={styles.categoryBudget}>/ $200</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '65%', backgroundColor: '#96CEB4' }]} />
              </View>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.viewAllBudgetsButton}
            onPress={() => router.push("/tabs/budget")}
          >
            <Text style={styles.viewAllBudgetsText}>View All Budgets</Text>
            <Ionicons name="chevron-forward" size={16} color="#4285F4" />
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
  // Budget Breakdown Section
  budgetBreakdownSection: {
    backgroundColor: "#fff",
    margin: 20,
    marginTop: 0,
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  budgetBreakdownTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 20,
  },
  categoryList: {
    gap: 16,
  },
  categoryItem: {
    marginBottom: 4,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  categoryAmounts: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  categorySpent: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  categoryBudget: {
    fontSize: 14,
    color: '#6c757d',
    marginLeft: 2,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#f0f2f5',
    borderRadius: 3,
    marginTop: 4,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  viewAllBudgetsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
  },
  viewAllBudgetsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4285F4',
    marginRight: 4,
  },
  // Quick Actions Section
  quickActionsContainer: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 20,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  quickActionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  quickActionButtonDisabled: {
    opacity: 0.6,
  },
});
