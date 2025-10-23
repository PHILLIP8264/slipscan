import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AuthManager from '../utils/AuthManager';
import {
  authenticateWithBiometrics,
  isBiometricsAvailable,
  isBiometricsEnabled,
  setBiometricsEnabled
} from '../utils/biometrics';
import { useAuth } from './contexts/AuthContext';

export default function SettingsPage() {
  const { authState, logout, resetPassword } = useAuth();
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsEnabled, setBiometricsEnabledState] = useState(false);
  const [biometricsType, setBiometricsType] = useState('Biometrics');
  
  // Modal states
  const [showNameModal, setShowNameModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    checkBiometricsStatus();
  }, []);

  useEffect(() => {
    console.log('AuthState updated in Settings:', authState);
  }, [authState]);

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
          
          // Update AuthManager with new biometric preference
          const authManager = AuthManager.getInstance();
          await authManager.updateUserSettings({ biometricsEnabled: true });
          
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
                
                // Update AuthManager with new biometric preference
                const authManager = AuthManager.getInstance();
                await authManager.updateUserSettings({ biometricsEnabled: false });
                
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

  const handleEditName = () => {
    console.log('Edit name tapped'); // Debug log
    setNewName(authState.lastUserName || '');
    setShowNameModal(true);
  };

  const saveNewName = async () => {
    if (newName && newName.trim() !== '') {
      try {
        console.log('Saving new name:', newName.trim());
        const authManager = AuthManager.getInstance();
        const result = await authManager.updateUserSettings({ name: newName.trim() });
        
        console.log('Update result:', result);
        console.log('Current authState after update:', authState);
        
        if (result.success) {
          setShowNameModal(false);
          Alert.alert('Success', 'Your name has been updated.');
        } else {
          Alert.alert('Error', result.error || 'Failed to update name.');
        }
      } catch (error) {
        console.error('Error updating name:', error);
        Alert.alert('Error', 'Failed to update name.');
      }
    } else {
      Alert.alert('Invalid Input', 'Please enter a valid name.');
    }
  };

  const handleEditEmail = () => {
    console.log('Edit email tapped'); // Debug log
    setNewEmail(authState.lastUserEmail || '');
    setShowEmailModal(true);
  };

  const saveNewEmail = async () => {
    if (newEmail && newEmail.trim() !== '') {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail.trim())) {
        Alert.alert('Invalid Email', 'Please enter a valid email address.');
        return;
      }

      try {
        console.log('Saving new email:', newEmail.trim());
        const authManager = AuthManager.getInstance();
        const result = await authManager.updateUserSettings({ email: newEmail.trim() });
        
        console.log('Email update result:', result);
        console.log('Current authState after email update:', authState);
        
        if (result.success) {
          setShowEmailModal(false);
          Alert.alert('Success', 'Your email has been updated.');
        } else {
          Alert.alert('Error', result.error || 'Failed to update email.');
        }
      } catch (error) {
        console.error('Error updating email:', error);
        Alert.alert('Error', 'Failed to update email.');
      }
    } else {
      Alert.alert('Invalid Input', 'Please enter a valid email address.');
    }
  };

  const handleChangePassword = () => {
    console.log('Change password tapped'); // Debug log
    Alert.alert(
      'Change Password',
      `A password reset email will be sent to ${authState.lastUserEmail}. You can then follow the instructions in the email to set a new password.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Send Reset Email',
          onPress: async () => {
            if (authState.lastUserEmail) {
              try {
                const result = await resetPassword(authState.lastUserEmail);
                if (result.success) {
                  Alert.alert(
                    'Email Sent',
                    'A password reset email has been sent to your email address. Please check your inbox and follow the instructions.'
                  );
                } else {
                  Alert.alert('Error', result.error || 'Failed to send password reset email.');
                }
              } catch (error) {
                console.error('Error sending reset email:', error);
                Alert.alert('Error', 'Failed to send password reset email.');
              }
            } else {
              Alert.alert('Error', 'No email address found. Please update your email first.');
            }
          },
        },
      ]
    );
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
          <View style={styles.settingsGroup}>
            <SettingItem
              icon="person"
              title="Display Name"
              subtitle={authState.lastUserName || 'Tap to set your name'}
              onPress={handleEditName}
            />
            <SettingItem
              icon="mail"
              title="Email Address"
              subtitle={authState.lastUserEmail || 'Tap to set your email'}
              onPress={handleEditEmail}
            />
            <SettingItem
              icon="lock-closed"
              title="Change Password"
              subtitle="Update your account password"
              onPress={handleChangePassword}
            />
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
            {biometricsAvailable ? (
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
            ) : (
              <SettingItem
                icon="finger-print"
                title="Biometric Authentication"
                subtitle="Not available on this device"
                showArrow={false}
                textColor="#8E8E93"
              />
            )}
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

      {/* Name Edit Modal */}
      <Modal
        visible={showNameModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowNameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Edit Display Name</Text>
            
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Enter your display name"
              autoFocus={true}
              maxLength={50}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setShowNameModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]} 
                onPress={saveNewName}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Email Edit Modal */}
      <Modal
        visible={showEmailModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEmailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Edit Email Address</Text>
            
            <TextInput
              style={styles.modalInput}
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="Enter your email address"
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus={true}
              maxLength={100}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setShowEmailModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]} 
                onPress={saveNewEmail}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#F2F2F7',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E5E5EA',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
});