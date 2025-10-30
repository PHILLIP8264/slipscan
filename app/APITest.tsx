import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getConfig } from '../config/environment';
import llmService from '../services/LLMService';

const APITestComponent = () => {
  const [testResults, setTestResults] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const logResult = (title: string, result: any) => {
    const timestamp = new Date().toLocaleTimeString();
    const resultText = `[${timestamp}] ${title}\n${JSON.stringify(result, null, 2)}\n\n`;
    setTestResults(prev => prev + resultText);
    console.log(title, result);
  };

  const testLLMService = async () => {
    setIsLoading(true);
    try {
      logResult('🤖 Testing LLM Service with sample text...', 'Starting test');
      
      const sampleText = `SHOPRITE CHECKERS
123 Main Street
Johannesburg, 2001
Tel: 011-123-4567

Date: 2024-10-30
Time: 14:30

Milk 2L              R25.99
Bread White          R12.50
Eggs 12pk           R18.90
                    -------
Subtotal:           R57.39
VAT (15%):           R8.61
Total:              R66.00

Payment: Card
Thank you!`;

      logResult('📋 Sample receipt text', { 
        note: 'Testing with date: 2024-10-30 (should convert to 30/10/24)', 
        textLength: sampleText.length 
      });

      const result = await llmService.parseReceipt(sampleText, {
        imageUri: 'test://sample-receipt'
      });
      
      logResult('✅ LLM Service Result', result);
      
    } catch (error) {
      logResult('❌ LLM Service Error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testDateFormats = async () => {
    setIsLoading(true);
    try {
      logResult('📅 Testing different date formats...', 'Starting test');
      
      const testCases = [
        { format: 'ISO 8601', date: '2024-10-30T14:30:00Z', expected: '30/10/24' },
        { format: 'DD/MM/YYYY', date: '30/10/2024', expected: '30/10/24' },
        { format: 'MM/DD/YYYY', date: '10/30/2024', expected: '30/10/24' },
        { format: 'YYYY-MM-DD', date: '2024-10-30', expected: '30/10/24' },
        { format: 'DD-MM-YYYY', date: '30-10-2024', expected: '30/10/24' }
      ];
      
      for (const testCase of testCases) {
        const sampleText = `PICK N PAY
        Date: ${testCase.date}
        Total: R50.00`;
        
        const result = await llmService.parseReceipt(sampleText);
        
        logResult(`📅 ${testCase.format} Test`, {
          input: testCase.date,
          expected: testCase.expected,
          actual: result.success ? result.data?.transactionInfo?.date : 'ERROR',
          success: result.success
        });
      }
      
    } catch (error) {
      logResult('❌ Date Format Test Error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults('');
  };

  const testVisionAPI = async () => {
    setIsLoading(true);
    logResult('🔍 Testing Google Vision API...', 'Starting test');

    try {
      const config = getConfig();
      
      console.log('🧪 Testing Vision API configuration:');
      console.log('- Project ID:', config.googleCloud.projectId);
      console.log('- Has API Key:', !!config.googleCloud.apiKey);
      console.log('- API Key Length:', config.googleCloud.apiKey?.length || 0);
      console.log('- Vision API URL:', config.googleCloud.visionApiUrl);

      // Test with a simple base64 encoded image (small test image)
      const testImageBase64 = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/2gAMAwEAAhADEAAAAX8H/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEABj8Cf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAT8hf//aAAwDAQACAAMAAAAQn//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Qf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Qf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAT8Qf//Z';

      const requestBody = {
        requests: [
          {
            image: {
              content: testImageBase64,
            },
            features: [
              {
                type: 'TEXT_DETECTION',
                maxResults: 1,
              },
            ],
          },
        ],
      };

      const url = `${config.googleCloud.visionApiUrl}/images:annotate?key=${config.googleCloud.apiKey}`;
      
      console.log('🚀 Making test API call to:', url.replace(config.googleCloud.apiKey!, 'HIDDEN_KEY'));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      const responseData = await response.text();
      console.log('📄 Response body:', responseData);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} - ${responseData}`);
      }

      const jsonData = JSON.parse(responseData);
      
      if (jsonData.responses && jsonData.responses[0] && jsonData.responses[0].error) {
        throw new Error(`Vision API Error: ${jsonData.responses[0].error.message}`);
      }

      logResult('✅ Vision API Success', jsonData);

    } catch (error) {
      logResult('❌ Vision API Error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>API Debug Console</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.llmButton]} 
          onPress={testLLMService}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Test LLM Service</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.visionButton]} 
          onPress={testVisionAPI}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Test Vision API</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.dateButton]} 
          onPress={testDateFormats}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Test Date Formats</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.clearButton]} 
          onPress={clearResults}
        >
          <Text style={styles.buttonText}>Clear Results</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.resultsContainer}>
        <Text style={styles.resultsText}>
          {testResults || 'No tests run yet. Tap a button above to start testing.'}
        </Text>
      </ScrollView>
      
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Running Test...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  button: {
    flex: 1,
    minWidth: '30%',
    padding: 15,
    margin: 5,
    borderRadius: 8,
    alignItems: 'center',
  },
  llmButton: {
    backgroundColor: '#4CAF50',
  },
  visionButton: {
    backgroundColor: '#2196F3',
  },
  dateButton: {
    backgroundColor: '#9C27B0',
  },
  clearButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 10,
  },
  resultsText: {
    color: '#00ff00',
    fontFamily: 'monospace',
    fontSize: 11,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    maxHeight: 400,
  },
  resultText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
});

export default APITestComponent;