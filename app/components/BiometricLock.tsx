import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Alert,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

export default function BiometricLock() {
  const { unlockWithBiometrics, logout } = useAuth();

  const handleUnlock = async () => {
    const result = await unlockWithBiometrics();
    if (!result) {
      // If unlock failed, show additional help
      Alert.alert(
        'Biometric Setup Required',
        'It looks like biometric authentication needs to be set up. Please:\n\n1. Go to your device Settings\n2. Set up Fingerprint or Face unlock\n3. Return to SlipScan\n\nOr you can sign out and sign back in.',
        [
          { text: 'OK' },
          { 
            text: 'Sign Out', 
            style: 'destructive', 
            onPress: handleLogout 
          }
        ]
      );
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* App Logo/Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="lock-closed" size={80} color="#007AFF" />
        </View>

        {/* Title */}
        <Text style={styles.title}>SlipScan Locked</Text>
        <Text style={styles.subtitle}>
          Use your biometric authentication to unlock the app
        </Text>

        {/* Unlock Button */}
        <TouchableOpacity style={styles.unlockButton} onPress={handleUnlock}>
          <Ionicons name="finger-print" size={24} color="#fff" />
          <Text style={styles.unlockButtonText}>Unlock with Biometrics</Text>
        </TouchableOpacity>

        {/* Logout Option */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Sign Out Instead</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
    width: '100%',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 48,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
    minWidth: 250,
    justifyContent: 'center',
  },
  unlockButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  logoutButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
});