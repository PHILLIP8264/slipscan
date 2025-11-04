import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

interface EmailVerificationPageProps {
  onBack?: () => void;
  userEmail?: string;
}

const EmailVerificationPage: React.FC<EmailVerificationPageProps> = ({ 
  onBack, 
  userEmail 
}) => {
  const { resendEmailVerification, checkEmailVerificationStatus, authState } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (cooldownTime > 0) {
      timer = setTimeout(() => {
        setCooldownTime(cooldownTime - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [cooldownTime]);

  // Auto-check verification status every 3 seconds
  useEffect(() => {
    const checkInterval = setInterval(async () => {
      if (!isCheckingVerification) {
        setIsCheckingVerification(true);
        try {
          const isVerified = await checkEmailVerificationStatus();
          if (isVerified) {
            console.log('✅ Email verified! Redirecting to main app...');
            // Clear the interval to stop checking
            clearInterval(checkInterval);
            // Navigate directly to main app (skip biometrics setup)
            router.replace('/tabs');
            return; // Exit the interval
          }
        } catch (error) {
          console.log('Error checking verification status:', error);
        } finally {
          setIsCheckingVerification(false);
        }
      }
    }, 3000);

    return () => clearInterval(checkInterval);
  }, [checkEmailVerificationStatus, isCheckingVerification]);

  const handleResendEmail = async () => {
    if (cooldownTime > 0) return;

    setIsResending(true);
    try {
      const result = await resendEmailVerification();
      
      if (result.success) {
        Alert.alert(
          'Email Sent',
          'We\'ve sent another verification email to your address. Please check your email and spam folder.',
          [{ text: 'OK' }]
        );
        setCooldownTime(60); // 60 second cooldown
      } else {
        Alert.alert('Error', result.error || 'Failed to send verification email');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsResending(false);
    }
  };

  const handleOpenEmailApp = async () => {
    try {
      let emailUrl = '';
      
      if (Platform.OS === 'ios') {
        // iOS - Open email apps to inbox/main view (not compose)
        const mailSchemes = [
          'message://', // iOS Mail app
          'googlegmail://co', // Gmail app inbox
          'ms-outlook://emails', // Outlook app
        ];
        
        for (const scheme of mailSchemes) {
          try {
            const supported = await Linking.canOpenURL(scheme);
            if (supported) {
              emailUrl = scheme;
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        // iOS fallback - open Settings to Mail
        if (!emailUrl) {
          emailUrl = 'App-Prefs:MAIL';
        }
      } else {
        // Android - Open email apps to main view (not compose)
        const emailApps = [
          'com.google.android.gm', // Gmail
          'com.microsoft.office.outlook', // Outlook
          'com.samsung.android.email.provider', // Samsung Email
          'com.android.email' // Default Android Email
        ];
        
        // Try to open Gmail first
        try {
          const gmailIntent = 'intent://gmail/#Intent;scheme=googlegmail;package=com.google.android.gm;end';
          const canOpenGmail = await Linking.canOpenURL(gmailIntent);
          if (canOpenGmail) {
            emailUrl = gmailIntent;
          }
        } catch (e) {
          console.log('Gmail not available');
        }
        
        // Fallback for Android - open email chooser
        if (!emailUrl) {
          emailUrl = 'intent://send#Intent;action=android.intent.action.MAIN;category=android.intent.category.APP_EMAIL;end';
        }
      }
      
      if (emailUrl) {
        await Linking.openURL(emailUrl);
      } else {
        // If no email app is found, show helpful message
        Alert.alert(
          'No Email App Found',
          'Please open your email app manually to check for the verification email.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error opening email app:', error);
      // Fallback - try to open device settings
      try {
        if (Platform.OS === 'ios') {
          await Linking.openURL('App-Prefs:');
        } else {
          await Linking.openURL('package:com.google.android.gm');
        }
      } catch (settingsError) {
        Alert.alert(
          'Cannot Open Email App',
          'Please open your email app manually to check for the verification email.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      Alert.alert('Back', 'Going back to previous screen');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          {onBack && (
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={handleBack}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          )}
          
          {/* Email Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.emailIcon}>📧</Text>
          </View>
          
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            We've sent a verification email to{'\n'}
            <Text style={styles.email}>
              {userEmail || (authState as any)?.user?.email || (authState as any)?.email || 'your email address'}
            </Text>
          </Text>
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            Please check your email and click the verification link to complete your registration.
          </Text>
          
          <View style={styles.stepsContainer}>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>1</Text>
              <Text style={styles.stepText}>Check your inbox and spam folder</Text>
            </View>
            
            <View style={styles.step}>
              <Text style={styles.stepNumber}>2</Text>
              <Text style={styles.stepText}>Click the verification link in the email</Text>
            </View>
            
            <View style={styles.step}>
              <Text style={styles.stepNumber}>3</Text>
              <Text style={styles.stepText}>Return to the app to continue</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleOpenEmailApp}
            activeOpacity={0.8}
          >
            <Ionicons name="mail-open" size={20} color="#FFFFFF" style={styles.buttonIcon} />
            <Text style={styles.primaryButtonText}>Check Email</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryButton,
              (isResending || cooldownTime > 0) ? styles.buttonDisabled : null,
            ]}
            onPress={handleResendEmail}
            disabled={isResending || cooldownTime > 0}
            activeOpacity={0.8}
          >
            {isResending ? (
              <ActivityIndicator size="small" color="#2b6ef6" />
            ) : (
              <Text style={styles.secondaryButtonText}>
                {cooldownTime > 0 
                  ? `Resend Email (${cooldownTime}s)` 
                  : 'Resend Verification Email'
                }
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Help Section */}
        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>Didn't receive the email?</Text>
          <Text style={styles.helpText}>
            • Check your spam or junk folder{'\n'}
            • Make sure you entered the correct email address{'\n'}
            • Wait a few minutes and try resending{'\n'}
            • Contact support if you continue to have issues
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2b6ef6',
    fontWeight: '500',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emailIcon: {
    fontSize: 40,
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
    lineHeight: 22,
  },
  email: {
    fontWeight: '600',
    color: '#2b6ef6',
  },
  instructions: {
    marginBottom: 40,
  },
  instructionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  stepsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2b6ef6',
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  actions: {
    marginBottom: 30,
  },
  primaryButton: {
    backgroundColor: '#2b6ef6',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#2b6ef6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonIcon: {
    marginRight: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#2b6ef6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    borderColor: '#a0a0a0',
  },
  secondaryButtonText: {
    color: '#2b6ef6',
    fontSize: 16,
    fontWeight: '500',
  },
  helpSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
});

export default EmailVerificationPage;