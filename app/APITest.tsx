import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getConfig } from '../config/environment';

const APITestComponent = () => {
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const testVisionAPI = async () => {
    setIsLoading(true);
    setTestResult('Testing...');

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

      setTestResult(`✅ Success! API is working. Response: ${JSON.stringify(jsonData, null, 2)}`);
      Alert.alert('✅ API Test Success', 'Google Vision API is working correctly!');

    } catch (error) {
      console.error('❌ Vision API Test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setTestResult(`❌ Failed: ${errorMessage}`);
      Alert.alert('❌ API Test Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Google Vision API Test</Text>
      
      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={testVisionAPI}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Testing...' : 'Test Vision API'}
        </Text>
      </TouchableOpacity>

      {testResult ? (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>{testResult}</Text>
        </View>
      ) : null}
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
  },
  button: {
    backgroundColor: '#4285F4',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
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