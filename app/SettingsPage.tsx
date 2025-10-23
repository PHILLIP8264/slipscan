import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  authenticateWithBiometrics,
  isBiometricsAvailable,
  isBiometricsEnabled,
  setBiometricsEnabled
} from '../utils/biometrics';
import { useAuth } from './contexts/AuthContext';

export default function SettingsPage() {
  const { authState, logout } = useAuth();
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsEnabled, setBiometricsEnabledState] = useState(false);
  const [biometricsType, setBiometricsType] = useState('Biometrics');

  useEffect(() => {
    checkBiometricsStatus();
  }, []);

  const checkBiometricsStatus = async () => {
    try {
      const [availability, enabled] = await Promise.all([
        isBiometricsAvailable(),
        isBiometricsEnabled()
      ]);
      
      setBiometricsAvailable(availability.available);
      setBiometricsType(availability.type);
      setBiometricsEnabledState(enabled);
    } catch (error) {
      console.error('Error checking biometrics status:', error);
    }
  };

  const handleBiometricsToggle = async (value: boolean) => {
    try {
      if (value) {
        // ENABLING: Authenticate first to verify biometrics work
        const result = await authenticateWithBiometrics(
          `Authenticate to enable ${biometricsType}`,
          { ignorePreference: true }
        );
        
        if (result.success) {
          // Authentication successful - enable biometrics
          await setBiometricsEnabled(true);
          setBiometricsEnabledState(true);
          Alert.alert(
            'Biometrics Enabled', 
            `${biometricsType} authentication has been enabled for SlipScan.`
          );
        } else {
          // Authentication failed - keep toggle OFF and don't save
          setBiometricsEnabledState(false);
          Alert.alert(
            'Authentication Failed', 
            result.error || 'Could not verify biometric authentication. Biometrics remains disabled.'
          );
        }
      } else {
        // DISABLING: Show confirmation dialog first
        Alert.alert(
          'Disable Biometric Authentication',
          `Are you sure you want to disable ${biometricsType} authentication? You will need to use your password to unlock the app.`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                // User canceled - keep toggle ON
                setBiometricsEnabledState(true);
              },
            },
            {
              text: 'Disable',
              style: 'destructive',
              onPress: async () => {
                // User confirmed - disable biometrics
                await setBiometricsEnabled(false);
                setBiometricsEnabledState(false);
                Alert.alert(
                  'Biometrics Disabled', 
                  'Biometric authentication has been disabled.'
                );
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error toggling biometrics:', error);
      // Reset toggle to previous state on error
      setBiometricsEnabledState(!value);
      Alert.alert('Error', 'Could not change biometric settings.');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          },
        },
      ]
    );
  };

  const handleGoBack = () => {
    router.back();
  };

  const SettingItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    showArrow = true,
    textColor = '#000',
    danger = false,
    rightComponent
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showArrow?: boolean;
    textColor?: string;
    danger?: boolean;
    rightComponent?: React.ReactNode;
  }) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
      activeOpacity={rightComponent ? 1 : 0.7}
      disabled={!!rightComponent}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, danger && styles.dangerIcon]}>
          <Ionicons 
            name={icon} 
            size={20} 
            color={danger ? '#fff' : '#007AFF'} 
          />
        </View>
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, { color: danger ? '#FF3B30' : textColor }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.settingSubtitle}>{subtitle}</Text>
          )}
        </View>
      </View>
      {rightComponent || (showArrow && (
        <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
      ))}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* User Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.userCard}>
            <View style={styles.userAvatar}>
              <Ionicons name="person" size={30} color="#fff" />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {authState.lastUserName || 'User'}
              </Text>
              <Text style={styles.userEmail}>
                {authState.lastUserEmail || 'user@example.com'}
              </Text>
            </View>
          </View>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          <View style={styles.settingsGroup}>
            <SettingItem
              icon="scan"
              title="Scanner Settings"
              subtitle="Document scanning preferences"
              onPress={() => {
                Alert.alert('Coming Soon', 'Scanner settings will be available in a future update');
              }}
            />
            <SettingItem
              icon="wallet"
              title="Budget Preferences"
              subtitle="Manage budget categories and limits"
              onPress={() => {
                Alert.alert('Coming Soon', 'Budget preferences will be available in a future update');
              }}
            />
            <SettingItem
              icon="notifications"
              title="Notifications"
              subtitle="Push notifications and alerts"
              onPress={() => {
                Alert.alert('Coming Soon', 'Notification settings will be available in a future update');
              }}
            />
            <SettingItem
              icon="finger-print"
              title={`${biometricsType} Authentication`}
              subtitle={`Use ${biometricsType.toLowerCase()} to secure your app`}
              showArrow={false}
              rightComponent={
                <Switch
                  value={biometricsEnabled}
                  onValueChange={handleBiometricsToggle}
                  trackColor={{ false: '#E5E5EA', true: '#34C759' }}
                  thumbColor={biometricsEnabled ? '#ffffff' : '#ffffff'}
                  ios_backgroundColor="#E5E5EA"
                />
              }
            />
          </View>
        </View>

        {/* Data & Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Privacy</Text>
          <View style={styles.settingsGroup}>
            <SettingItem
              icon="cloud-upload"
              title="Export Data"
              subtitle="Export your receipts and budgets"
              onPress={() => {
                Alert.alert('Coming Soon', 'Data export will be available in a future update');
              }}
            />
            <SettingItem
              icon="trash"
              title="Clear Data"
              subtitle="Remove all local data"
              onPress={() => {
                Alert.alert(
                  'Clear All Data',
                  'This will permanently delete all your receipts, budgets, and categories. This action cannot be undone.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Clear Data', 
                      style: 'destructive',
                      onPress: () => {
                        Alert.alert('Coming Soon', 'Data clearing will be available in a future update');
                      }
                    },
                  ]
                );
              }}
              danger={true}
            />
          </View>
        </View>

        {/* Support & About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & About</Text>
          <View style={styles.settingsGroup}>
            <SettingItem
              icon="help-circle"
              title="Help & Support"
              subtitle="Get help with SlipScan"
              onPress={() => {
                Alert.alert('Help & Support', 'For support, please contact us at support@slipscan.app');
              }}
            />
            <SettingItem
              icon="information-circle"
              title="About SlipScan"
              subtitle="Version 1.0.0"
              onPress={() => {
                Alert.alert('SlipScan v1.0.0', 'Smart receipt scanning and budget management app.');
              }}
            />
          </View>
        </View>

        {/* Logout Section */}
        <View style={styles.section}>
          <View style={styles.settingsGroup}>
            <SettingItem
              icon="log-out"
              title="Logout"
              onPress={handleLogout}
              showArrow={false}
              danger={true}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#C7C7CC',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6D6D70',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: '#C7C7CC',
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 15,
    color: '#6D6D70',
  },
  settingsGroup: {
    backgroundColor: '#fff',
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: '#C7C7CC',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#C7C7CC',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dangerIcon: {
    backgroundColor: '#FF3B30',
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 17,
    fontWeight: '400',
    color: '#000',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6D6D70',
    marginTop: 2,
  },
});