import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { validateEmail, validatePassword } from '../../../utils/AuthManager';
import { getFontFamily } from '../../../utils/fonts';
import { useAuth } from '../../contexts/AuthContext';

interface SignupPageProps {
  onBack?: () => void;
  onLoginPress?: () => void;
}

const SignupPage: React.FC<SignupPageProps> = ({ onBack, onLoginPress }) => {
  const router = useRouter();
  const { signup } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    terms: '',
  });

  const updateFormData = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear specific error when user starts typing
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors = { email: '', password: '', confirmPassword: '', terms: '' };
    let isValid = true;

    // Validate email
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.error || 'Invalid email';
      isValid = false;
    }

    // Validate password
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.error || 'Invalid password';
      isValid = false;
    }

    // Validate password confirmation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    // Validate terms and conditions
    if (!agreeToTerms) {
      newErrors.terms = 'You must agree to the Terms and Conditions';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const result = await signup(
        formData.email.trim(),
        formData.password,
        formData.displayName.trim() || 'User'
      );

      if (!result.success) {
        Alert.alert('Signup Failed', result.error || 'An error occurred during signup');
      } else {
        Alert.alert(
          'Account Created!',
          'Your account has been created successfully. Please verify your email to continue.',
          [{ 
            text: 'Continue', 
            onPress: () => router.replace('/hiddenpages/landing_auths/EmailVerificationPage')
          }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginPress = () => {
    if (onLoginPress) {
      onLoginPress();
    } else {
      Alert.alert('Login', 'Login pressed');
    }
  };

  // Password strength indicator
  const passwordValidation = validatePassword(formData.password);
  const getPasswordStrengthColor = () => {
    if (!formData.password) return '#e1e5e9';
    if (passwordValidation.isValid) {
      return formData.password.length >= 8 ? '#34c759' : '#ff9500';
    }
    return '#ff3b30';
  };

  const getPasswordStrengthText = () => {
    if (!formData.password) return '';
    if (passwordValidation.isValid) {
      return formData.password.length >= 8 ? 'Strong password' : 'Medium strength';
    }
    return 'Weak password';
  };

  return (
    <ImageBackground 
      source={require('../../../assets/images/landingbackground.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Sign up to get started</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Display Name Input (Optional) */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Display Name (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your name"
                  placeholderTextColor="#000000"
                  value={formData.displayName}
                  onChangeText={(text) => updateFormData('displayName', text)}
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.email ? styles.inputError : null,
                  ]}
                  placeholder="Enter your email"
                  placeholderTextColor="#000000"
                  value={formData.email}
                  onChangeText={(text) => updateFormData('email', text)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password *</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.password ? styles.inputError : null,
                  ]}
                  placeholder="Create a password"
                  placeholderTextColor="#000000"
                  value={formData.password}
                  onChangeText={(text) => updateFormData('password', text)}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                
                {/* Password Strength Indicator */}
                {formData.password ? (
                  <View style={styles.passwordStrength}>
                    <View style={styles.strengthBarContainer}>
                      <View 
                        style={[
                          styles.strengthBar,
                          { 
                            width: `${formData.password ? (passwordValidation.isValid ? (formData.password.length >= 8 ? 100 : 60) : 30) : 0}%`,
                            backgroundColor: getPasswordStrengthColor()
                          }
                        ]} 
                      />
                    </View>
                    <Text style={[styles.strengthText, { color: getPasswordStrengthColor() }]}>
                      {getPasswordStrengthText()}
                    </Text>
                  </View>
                ) : null}

                {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Confirm Password *</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.confirmPassword ? styles.inputError : null,
                  ]}
                  placeholder="Confirm your password"
                  placeholderTextColor="#000000"
                  value={formData.confirmPassword}
                  onChangeText={(text) => updateFormData('confirmPassword', text)}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                {errors.confirmPassword ? (
                  <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                ) : null}
              </View>

              {/* Password Requirements */}
              <View style={styles.requirementsContainer}>
                <Text style={styles.requirementsTitle}>Password must contain:</Text>
                <Text style={styles.requirement}>• At least 8 characters</Text>
                <Text style={styles.requirement}>• One uppercase letter (A-Z)</Text>
                <Text style={styles.requirement}>• One lowercase letter (a-z)</Text>
                <Text style={styles.requirement}>• One number (0-9)</Text>
                <Text style={styles.requirement}>• One special character (!@#$%^&*)</Text>
              </View>

              {/* Terms and Conditions */}
              <View style={styles.termsContainer}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => {
                    setAgreeToTerms(!agreeToTerms);
                    if (errors.terms) {
                      setErrors(prev => ({ ...prev, terms: '' }));
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, agreeToTerms && styles.checkboxChecked]}>
                    {agreeToTerms && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.termsText}>
                    I agree to the{' '}
                    <Text 
                      style={styles.termsLink}
                      onPress={() => setShowTermsModal(true)}
                    >
                      Terms and Conditions
                    </Text>
                    {' '}and{' '}
                    <Text 
                      style={styles.termsLink}
                      onPress={() => setShowTermsModal(true)}
                    >
                      Privacy Policy
                    </Text>
                  </Text>
                </TouchableOpacity>
                {errors.terms ? <Text style={styles.errorText}>{errors.terms}</Text> : null}
              </View>

              {/* Signup Button */}
              <TouchableOpacity
                style={[
                  styles.signupButton,
                  (isLoading || !formData.email || !formData.password || !formData.confirmPassword || !agreeToTerms) 
                    ? styles.buttonDisabled : null,
                ]}
                onPress={handleSignup}
                disabled={isLoading || !formData.email || !formData.password || !formData.confirmPassword || !agreeToTerms}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.signupButtonText}>Create Account</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={handleLoginPress} activeOpacity={0.7}>
                <Text style={styles.loginText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Terms and Conditions Modal */}
      <Modal
        visible={showTermsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTermsModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Terms and Conditions</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowTermsModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCloseText}>Done</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
            <Text style={styles.sectionText}>
              By downloading, installing, or using the SlipScan mobile application ("App"), you agree to be bound by these Terms and Conditions ("Terms").
            </Text>

            <Text style={styles.sectionTitle}>2. Description of Service</Text>
            <Text style={styles.sectionText}>
              SlipScan is a mobile application that allows users to scan, digitize, and manage receipts for expense tracking and budgeting purposes.
            </Text>

            <Text style={styles.sectionTitle}>3. User Responsibilities</Text>
            <Text style={styles.sectionText}>
              • You are responsible for maintaining the confidentiality of your account information{'\n'}
              • You agree to provide accurate and complete information{'\n'}
              • You will not use the App for any unlawful or prohibited activities{'\n'}
              • You are responsible for all activities under your account
            </Text>

            <Text style={styles.sectionTitle}>4. Privacy and Data Protection</Text>
            <Text style={styles.sectionText}>
              We respect your privacy and handle your personal data in accordance with our Privacy Policy. By using the App, you consent to the collection, use, and storage of your information as described in our Privacy Policy.
            </Text>

            <Text style={styles.sectionTitle}>5. Receipt Data</Text>
            <Text style={styles.sectionText}>
              • Receipt images and extracted data are stored securely{'\n'}
              • You retain ownership of your receipt data{'\n'}
              • We may process receipt data to improve our services{'\n'}
              • You can delete your data at any time through the App settings
            </Text>

            <Text style={styles.sectionTitle}>6. Limitation of Liability</Text>
            <Text style={styles.sectionText}>
              The App is provided "as is" without warranties. We are not liable for any damages arising from the use of the App, including data loss or inaccurate receipt processing.
            </Text>

            <Text style={styles.sectionTitle}>7. Updates and Changes</Text>
            <Text style={styles.sectionText}>
              We may update these Terms at any time. Continued use of the App after changes constitutes acceptance of the updated Terms.
            </Text>

            <Text style={styles.sectionTitle}>8. Data Processing</Text>
            <Text style={styles.sectionText}>
              All automated extraction, parsing, and categorization of receipt data, including the reading of line items, amounts, dates, and merchants, are performed exclusively using Google AI Services.
            </Text>
            <Text style={styles.sectionText}>
              Google's Role: Google acts as a third-party data processor for these specific AI-driven functions (e.g., optical character recognition and natural language processing).
            </Text>
            <Text style={styles.sectionText}>
              Data Flow: When you upload a receipt image, the image and/or its extracted text is securely transmitted to Google AI Services for processing. The resulting structured data (e.g., item lists, totals, categories) is then returned to The Ledger's system for storage and budget calculation.
            </Text>
            <Text style={styles.sectionText}>
              No Sharing of Personally Identifiable Information (PII): We do not transmit personally identifiable information (PII) such as your name, email address, or user ID to Google AI Services alongside the receipt data. Only the necessary visual or textual data from the receipt itself is sent for processing.
            </Text>
            <Text style={styles.sectionText}>
              Confidentiality: The Ledger ensures that all data transmitted to and received from Google AI Services is treated confidentially and in accordance with our Privacy Policy.
            </Text>
            <Text style={styles.sectionText}>
              Control: You retain all ownership and control over the data you upload to The Ledger.
            </Text>
            <Text style={styles.sectionText}>
              Verification: You are responsible for reviewing and verifying the accuracy of all extracted data (including line items, categories, and amounts) displayed in the app and making any necessary edits before saving the receipt.
            </Text>
            <Text style={styles.sectionText}>
              Liability: The Ledger is not liable for any financial errors or loss resulting from inaccuracies, omissions, or miscategorizations generated by the automated AI processing, provided those inaccuracies are not the result of negligence by The Ledger itself.
            </Text>
            

            <Text style={styles.sectionTitle}>9. Contact Information</Text>
            <Text style={styles.sectionText}>
              For questions about these Terms, contact us at: support@slipscan.app
            </Text>

            <Text style={styles.lastUpdated}>
              Last updated: November 4, 2025
            </Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
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
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 5,
  },
  form: {
    marginBottom: 20,
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
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: getFontFamily('regular'),
    backgroundColor: '#ffffff',
  },
  inputError: {
    borderColor: '#dc3545',
    backgroundColor: '#ffffff',
  },
  errorText: {
    fontSize: 12,
    fontFamily: getFontFamily('regular'),
    color: '#dc3545',
    marginTop: 6,
    marginLeft: 4,
  },
  passwordStrength: {
    marginTop: 8,
  },
  strengthBarContainer: {
    height: 4,
    backgroundColor: '#e1e5e9',
    borderRadius: 2,
    marginBottom: 4,
  },
  strengthBar: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '500',
  },
  requirementsContainer: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  requirementsTitle: {
    fontSize: 15,
    fontFamily: getFontFamily('bold'),
    color: '#fff',
    marginBottom: 6,
  },
  requirement: {
    fontSize: 11,
    fontFamily: getFontFamily('bold'),
    color: '#fff',
    lineHeight: 20,
  },
  signupButton: {
    backgroundColor: '#A3E635',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
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
  signupButtonText: {
    color: '#000',
    fontSize: 20,
    fontFamily: getFontFamily('semiBold'),
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
  },
  footerText: {
    fontSize: 16,
    fontFamily: getFontFamily('regular'),
    color: '#fff',
  },
  loginText: {
    fontSize: 14,
    color: '#E5398B',
    fontFamily: getFontFamily('semiBold'),
  },
  termsContainer: {
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#22D3EE',
    borderRadius: 4,
    marginRight: 12,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#A3E635',
    borderColor: '#A3E635',
  },
  checkmark: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  termsText: {
    fontSize: 14,
    color: '#fff',
    flex: 1,
    lineHeight: 20,
    fontFamily: getFontFamily('semiBold'),
  },
  termsLink: {
    color: '#E5398B',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
    marginTop: 15,
  },
  modalTitle: {
    fontSize: 18,
    color: '#1a1a1a',
    fontFamily: getFontFamily('extraBold'),
  },
  modalCloseButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#E5398B',
    borderRadius: 8,
  },
  modalCloseText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: getFontFamily('semiBold'),
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#1a1a1a',
    marginTop: 20,
    marginBottom: 8,
    fontFamily: getFontFamily('bold'),
  },
  sectionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
    fontFamily: getFontFamily('medium'),
  },
  lastUpdated: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 30,
    marginBottom: 40,
    textAlign: 'center',
  },
});

export default SignupPage;