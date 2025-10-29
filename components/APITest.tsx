import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getConfig } from '../config/environment';
import googleVisionService from '../services/GoogleVisionService';

export default function APITest() {
  const [isTestingAPI, setIsTestingAPI] = useState(false);
  const [testResults, setTestResults] = useState<string>('');

  const testGoogleVisionAPI = async () => {
    setIsTestingAPI(true);
    setTestResults('Starting Google Vision API test...\n');
    
    try {
      // Get config
      const config = getConfig();
      setTestResults(prev => prev + `✅ Config loaded: Has API key: ${!!config.googleCloud.apiKey}\n`);
      
      // Create a simple test image (1x1 white pixel in base64)
      const testBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAHQAuXBpAAAAABJRU5ErkJggg==';
      
      setTestResults(prev => prev + '🔍 Testing Google Vision API with test image...\n');
      
      const result = await googleVisionService.extractText(`data:image/png;base64,${testBase64}`);
      
      if (result.success) {
        setTestResults(prev => prev + `✅ API Test successful!\n`);
        setTestResults(prev => prev + `📝 Text found: "${result.data?.rawText || 'No text detected (expected for blank image)'}"\n`);
        setTestResults(prev => prev + `🎯 Confidence: ${result.data?.confidence || 0}\n`);
      } else {
        setTestResults(prev => prev + `❌ API Test failed: ${result.error}\n`);
      }
      
      Alert.alert(
        'API Test Complete', 
        result.success ? 'Google Vision API is working!' : `API test failed: ${result.error}`
      );
      
    } catch (error: any) {
      const errorMsg = `❌ Test error: ${error.message || error}\n`;
      setTestResults(prev => prev + errorMsg);
      Alert.alert('Test Error', error.message || 'Unknown error occurred');
    } finally {
      setIsTestingAPI(false);
    }
  };

  const testFileSystemAPI = async () => {
    setIsTestingAPI(true);
    setTestResults('Testing FileSystem API...\n');
    
    try {
      // Test the new FileSystem API approach
      const { readAsStringAsync } = require('expo-file-system/legacy');
      setTestResults(prev => prev + '✅ Legacy FileSystem API imported successfully\n');
      
      // Try to read a non-existent file to test the error handling
      try {
        await readAsStringAsync('file://non-existent-file.jpg', { encoding: 'base64' });
        setTestResults(prev => prev + '❌ Unexpected: File read succeeded for non-existent file\n');
      } catch (error: any) {
        setTestResults(prev => prev + `✅ Expected error for non-existent file: ${error.message}\n`);
      }
      
      Alert.alert('FileSystem Test', 'FileSystem API test completed - check results above');
      
    } catch (error: any) {
      const errorMsg = `❌ FileSystem test error: ${error.message || error}\n`;
      setTestResults(prev => prev + errorMsg);
      Alert.alert('FileSystem Test Error', error.message || 'Unknown error occurred');
    } finally {
      setIsTestingAPI(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>API Testing Tools</Text>
      
      <TouchableOpacity 
        style={[styles.button, isTestingAPI && styles.buttonDisabled]} 
        onPress={testGoogleVisionAPI}
        disabled={isTestingAPI}
      >
        <Text style={styles.buttonText}>
          {isTestingAPI ? 'Testing...' : 'Test Google Vision API'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.button, isTestingAPI && styles.buttonDisabled]} 
        onPress={testFileSystemAPI}
        disabled={isTestingAPI}
      >
        <Text style={styles.buttonText}>
          {isTestingAPI ? 'Testing...' : 'Test FileSystem API'}
        </Text>
      </TouchableOpacity>
      
      <ScrollView style={styles.resultsContainer}>
        <Text style={styles.resultsText}>{testResults}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultsContainer: {
    flex: 1,
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
  },
  resultsText: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
});