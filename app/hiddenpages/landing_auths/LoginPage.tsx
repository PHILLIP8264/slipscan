import { getFontFamily } from '@/utils/fonts';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { validateEmail } from '../../../utils/AuthManager';
import { useAuth } from '../../contexts/AuthContext';

interface LoginPageProps {
  onBack?: () => void;
  onSignUpPress?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onBack, onSignUpPress }) => {
  const router = useRouter();
  const { login, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validateForm = (): boolean => {
    let isValid = true;
    
    // Reset errors
    setEmailError('');
    setPasswordError('');

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error || 'Invalid email');
      isValid = false;
    }

    // Validate password
    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    }

    return isValid;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const result = await login(email.trim(), password);
      
      if (result.success) {
        // Navigate to main app tabs on successful login
        router.replace('/tabs');
      } else {
        Alert.alert('Login Failed', result.error || 'An error occurred during login');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUpPress = () => {
    if (onSignUpPress) {
      onSignUpPress();
    } else {
      Alert.alert('Sign Up', 'Sign up pressed');
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Email Required', 'Please enter your email address first.');
      return;
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      Alert.alert('Invalid Email', emailValidation.error || 'Please enter a valid email address.');
      return;
    }

    setIsResettingPassword(true);
    try {
      const result = await resetPassword(email);
      
      if (result.success) {
        Alert.alert(
          'Reset Email Sent',
          `We've sent a password reset link to ${email}. Please check your email and follow the instructions to reset your password.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to send reset email');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <ImageBackground 
      source={require('../../../assets/images/landingbackground.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={styles.container}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
            {onBack && (
              <TouchableOpacity 
                style={styles.backButton} 
                onPress={onBack}
                activeOpacity={0.7}
              >
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[
                  styles.input,
                  emailError ? styles.inputError : null,
                ]}
                placeholder="Enter your email"
                placeholderTextColor="#000000"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailError) setEmailError('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={[
                  styles.input,
                  passwordError ? styles.inputError : null,
                ]}
                placeholder="Enter your password"
                placeholderTextColor="#000000"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) setPasswordError('');
                }}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                (isLoading || !email || !password) ? styles.buttonDisabled : null,
              ]}
              onPress={handleLogin}
              disabled={isLoading || !email || !password}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Forgot Password */}
            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={handleForgotPassword}
              disabled={isResettingPassword}
              activeOpacity={0.7}
            >
              {isResettingPassword ? (
                <ActivityIndicator size="small" color="#2b6ef6" />
              ) : (
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
        </ScrollView>
        
        {/* Footer positioned outside ScrollView */}
        <View style={styles.fixedFooter}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={handleSignUpPress} activeOpacity={0.7}>
            <Text style={styles.signUpText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Semi-transparent overlay
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  content: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginTop: 20,
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#E5398B',
  },
  backButtonText: {
    textAlign: 'center',
    marginBottom: 2,
    fontSize: 16,
    color: '#fff',
    fontFamily: getFontFamily('medium'),
  },
  title: {
    fontSize: 35,
    fontFamily: getFontFamily('extraBold'),
    color: '#ffffff',
    marginBottom: 15,
    marginTop: 50,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: getFontFamily('regular'),
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: -60,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 5,
  },
  form: {
    flex: 1,
    justifyContent: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontFamily: getFontFamily('semiBold'),
    color: '#ffffff',
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: '#E5398B',
    borderRadius: 12,
    paddingHorizontal: 16,
    color: '#000000',
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: getFontFamily('regular'),
    backgroundColor: '#ffffff',
  },
  inputError: {
    borderColor: '#dc3545',
    backgroundColor: '#fff5f5',
  },
  errorText: {
    fontSize: 12,
    color: '#dc3545',
    marginTop: 6,
    marginLeft: 4,
  },
  loginButton: {
    backgroundColor: '#A3E635',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#A3E635',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#22D3EE',
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    color: '#000',
    fontSize: 20,
    fontWeight: '600',
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#E5398B',
    fontFamily: getFontFamily('extraBold'),
  },
  fixedFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 30,
    paddingTop: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  footerText: {
    fontSize: 16,
    fontFamily: getFontFamily('regular'),
    color: '#fff',
  },
  signUpText: {
    fontSize: 14,
    color: '#E5398B',
    fontFamily: getFontFamily('semiBold'),
  },
});

export default LoginPage;