/**
 * AI Spending Feedback Screen
 * 
 * Main screen that orchestrates the AI feedback flow:
 * 1. Month selection
 * 2. Data aggregation
 * 3. AI analysis generation
 * 4. Results display
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import AIFeedbackService from '../services/AIFeedbackService';
import { AIFeedbackRequest, AIFeedbackResponse } from '../types/receipt';
import MonthlyDataAggregator from '../utils/MonthlyDataAggregator';
import AIFeedbackResults from './components/AIFeedbackResults';
import MonthPickerModal from './components/MonthPickerModal';

const AIFeedbackScreen: React.FC = () => {
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [monthLabel, setMonthLabel] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [feedbackData, setFeedbackData] = useState<AIFeedbackResponse | null>(null);
  const [showResults, setShowResults] = useState(false);

  const handleSelectMonth = async (monthKey: string) => {
    setSelectedMonth(monthKey);
    
    // Generate month label
    const [year, month] = monthKey.split('-');
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const label = `${monthNames[parseInt(month) - 1]} ${year}`;
    setMonthLabel(label);

    // Start AI analysis immediately
    await generateAIFeedback(monthKey);
  };

  const generateAIFeedback = async (monthKey: string) => {
    try {
      setLoading(true);
      setLoadingMessage('Aggregating your spending data...');

      // Step 1: Aggregate monthly data
      const monthlyDataResult = await MonthlyDataAggregator.aggregateMonthDataWithComparison(monthKey);
      
      if (monthlyDataResult.current.totalTransactions === 0) {
        Alert.alert(
          'No Data Found',
          'No receipts found for this month. Try selecting a different month or scan some receipts first.',
          [{ text: 'OK' }]
        );
        return;
      }

      setLoadingMessage('Generating AI insights...');

      // Step 2: Prepare AI request
      const aiRequest: AIFeedbackRequest = {
        monthlyData: monthlyDataResult.current,
        previousMonthData: monthlyDataResult.previous,
        userContext: {
          currency: 'ZAR',
          locale: 'en-ZA',
          preferences: ['budget-focused', 'savings-oriented'] // Could be user customizable
        }
      };

      // Step 3: Generate AI feedback
      const feedback = await AIFeedbackService.generateFeedback(aiRequest);
      
      setFeedbackData(feedback);
      setShowResults(true);

      console.log('✅ AI Feedback generation completed');

    } catch (error) {
      console.error('Error generating AI feedback:', error);
      
      // Show error feedback
      const errorFeedback: AIFeedbackResponse = {
        success: false,
        error: 'Could not generate AI feedback. Please check your internet connection and try again.',
        processingTime: Date.now()
      };
      
      setFeedbackData(errorFeedback);
      setShowResults(true);
      
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleRequestNewAnalysis = async () => {
    setShowResults(false);
    setFeedbackData(null);
    
    if (selectedMonth) {
      await generateAIFeedback(selectedMonth);
    }
  };

  const handleCloseResults = () => {
    setShowResults(false);
    setFeedbackData(null);
    setSelectedMonth('');
    setMonthLabel('');
  };

  const handleStartAnalysis = () => {
    setShowMonthPicker(true);
  };

  // Loading Modal
  if (loading) {
    return (
      <Modal
        visible={true}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingTitle}>Generating AI Analysis</Text>
            <Text style={styles.loadingMessage}>{loadingMessage}</Text>
            <View style={styles.loadingSteps}>
              <Text style={styles.stepText}>🤖 Analyzing your spending patterns</Text>
              <Text style={styles.stepText}>💡 Generating personalized insights</Text>
              <Text style={styles.stepText}>🎯 Creating actionable recommendations</Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Results Modal
  if (showResults && feedbackData) {
    return (
      <Modal
        visible={true}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <AIFeedbackResults
          feedbackData={feedbackData}
          monthLabel={monthLabel}
          onClose={handleCloseResults}
          onRequestNewAnalysis={handleRequestNewAnalysis}
        />
      </Modal>
    );
  }

  // Main Screen
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>AI Spending Feedback</Text>
        <Text style={styles.subtitle}>
          Get personalized insights and recommendations about your spending patterns
        </Text>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <View style={styles.heroSection}>
          <View style={styles.iconContainer}>
            <Ionicons name="analytics" size={64} color="#007AFF" />
          </View>
          
          <Text style={styles.heroTitle}>Smart Spending Analysis</Text>
          <Text style={styles.heroDescription}>
            Our AI analyzes your receipt data to provide personalized financial insights, 
            budget recommendations, and actionable advice to help you optimize your spending habits.
          </Text>

          <TouchableOpacity 
            style={styles.startButton}
            onPress={handleStartAnalysis}
          >
            <Ionicons name="sparkles" size={20} color="#FFFFFF" />
            <Text style={styles.startButtonText}>Get AI Feedback</Text>
          </TouchableOpacity>
        </View>

        {/* Features List */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>What you'll get:</Text>
          
          <View style={styles.featureItem}>
            <Ionicons name="bulb-outline" size={24} color="#FF9500" />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Spending Insights</Text>
              <Text style={styles.featureDescription}>
                Discover patterns and trends in your spending behavior
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle-outline" size={24} color="#34C759" />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Budget Analysis</Text>
              <Text style={styles.featureDescription}>
                See how well you're sticking to your budget goals
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Ionicons name="star-outline" size={24} color="#5856D6" />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Personal Recommendations</Text>
              <Text style={styles.featureDescription}>
                Get tailored advice to improve your financial habits
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Ionicons name="list-outline" size={24} color="#FF3B30" />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Action Items</Text>
              <Text style={styles.featureDescription}>
                Specific steps you can take to optimize your spending
              </Text>
            </View>
          </View>
        </View>

        {/* Privacy Note */}
        <View style={styles.privacyNote}>
          <Ionicons name="shield-checkmark-outline" size={16} color="#34C759" />
          <Text style={styles.privacyText}>
            Your data is processed securely and never shared with third parties
          </Text>
        </View>
      </View>

      {/* Month Picker Modal */}
      <MonthPickerModal
        visible={showMonthPicker}
        onClose={() => setShowMonthPicker(false)}
        onSelectMonth={handleSelectMonth}
        selectedMonth={selectedMonth}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6D6D70',
    lineHeight: 22,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  heroSection: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
    textAlign: 'center',
  },
  heroDescription: {
    fontSize: 16,
    color: '#6D6D70',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  featuresSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  featureText: {
    flex: 1,
    marginLeft: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#6D6D70',
    lineHeight: 20,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F2FFF2',
    borderRadius: 8,
  },
  privacyText: {
    fontSize: 14,
    color: '#34C759',
    marginLeft: 8,
    textAlign: 'center',
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 40,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  loadingMessage: {
    fontSize: 16,
    color: '#6D6D70',
    marginBottom: 24,
    textAlign: 'center',
  },
  loadingSteps: {
    alignItems: 'flex-start',
  },
  stepText: {
    fontSize: 14,
    color: '#6D6D70',
    marginBottom: 8,
    textAlign: 'left',
  },
});

export default AIFeedbackScreen;