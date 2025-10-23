import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { isBiometricsEnabled } from '../../../utils/biometrics';
import { useAuth } from '../../contexts/AuthContext';
import EmailVerificationPage from './EmailVerificationPage';
import LandingPage from './landingpage';
import LoginPage from './LoginPage';
import ReturnPage from './returnpage';
import SignupPage from './SignupPage';

type AuthScreen = 
  | 'landing'      // First-time users
  | 'return'       // Returning users
  | 'login'        // Login form
  | 'signup'       // Signup form
  | 'verification' // Email verification
  | 'authenticated'; // User is logged in

const LandingRouter: React.FC = () => {
  const { authState } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<AuthScreen>('landing');
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [isCheckingBiometrics, setIsCheckingBiometrics] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  console.log('🎯 LandingRouter render - authState:', authState);
  console.log('🎯 LandingRouter render - currentScreen:', currentScreen);
  console.log('🎯 LandingRouter render - isAuthLoading:', isAuthLoading);

  // Check biometrics status when component mounts
  useEffect(() => {
    const checkBiometrics = async () => {
      try {
        const enabled = await isBiometricsEnabled();
        setBiometricsEnabled(enabled);
      } catch (error) {
        console.error('Error checking biometrics:', error);
        setBiometricsEnabled(false);
      } finally {
        setIsCheckingBiometrics(false);
      }
    };

    checkBiometrics();
  }, []);

  // Track authState changes specifically
  useEffect(() => {
    console.log('🎯 LandingRouter - authState CHANGED to:', authState);
  }, [authState]);

  // Monitor authState changes and update loading state
  useEffect(() => {
    console.log('$ LandingRouter - AuthState changed:', authState);
    // Consider auth loaded if we have either an email (returning user) or confirmed no email (first time)
    // The key is that authState should not be the initial empty state
    const hasValidAuthState = authState.lastUserEmail !== undefined || 
                             (authState.lastUserEmail === undefined && !isCheckingBiometrics);
    
    if (hasValidAuthState) {
      setIsAuthLoading(false);
      console.log('$ LandingRouter - Auth loading complete');
    }
  }, [authState, isCheckingBiometrics]);

  // Show loading spinner while checking biometrics or auth state
  if (isCheckingBiometrics || isAuthLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2b6ef6" />
      </View>
    );
  }

  // Determine if this is a first-time user (no previous user stored)
  const isFirstTime = !authState.lastUserEmail;
  console.log('🔄 LandingRouter - isFirstTime:', isFirstTime);
  console.log('🔄 LandingRouter - authState.lastUserEmail:', authState.lastUserEmail);

  // Determine initial screen based on whether there's a previous user
  const getInitialScreen = (): AuthScreen => {
    return isFirstTime ? 'landing' : 'return';
  };

  // Set initial screen if still on default  
  if (currentScreen === 'landing' && !isFirstTime) {
    console.log('🔄 LandingRouter - Switching from landing to return');
    setCurrentScreen('return');
  }
  if (currentScreen === 'return' && isFirstTime) {
    console.log('🔄 LandingRouter - Switching from return to landing');
    setCurrentScreen('landing');
  }

  // Navigation handlers
  const handleNavigateToLogin = () => setCurrentScreen('login');
  const handleNavigateToSignup = () => setCurrentScreen('signup');
  const handleNavigateToLanding = () => setCurrentScreen('landing');
  const handleNavigateToReturn = () => setCurrentScreen('return');
  const handleNavigateBack = () => {
    switch (currentScreen) {
      case 'login':
      case 'signup':
        setCurrentScreen(isFirstTime ? 'landing' : 'return');
        break;
      case 'verification':
        setCurrentScreen(isFirstTime ? 'landing' : 'return');
        break;
      default:
        // For landing/return pages, we could close the app or go to a different screen
        break;
    }
  };

  // Render appropriate screen
  switch (currentScreen) {
    case 'landing':
      return (
        <LandingPage
          onLogin={handleNavigateToLogin}
          onSignUp={handleNavigateToSignup}
        />
      );

    case 'return':
      console.log('🔄 LandingRouter - Rendering ReturnPage');
      console.log('🔄 LandingRouter - Full authState:', authState);
      console.log('🔄 LandingRouter - Passing lastUserName:', authState.lastUserName);
      console.log('🔄 LandingRouter - Passing hadBiometrics:', biometricsEnabled || authState.lastUserHadBiometrics);
      return (
        <ReturnPage
          onLogin={handleNavigateToLogin}
          onSignInDifferent={() => setCurrentScreen('landing')}
          lastUserName={authState.lastUserName}
          hadBiometrics={biometricsEnabled || authState.lastUserHadBiometrics}
        />
      );

    case 'login':
      return (
        <LoginPage
          onBack={handleNavigateBack}
          onSignUpPress={handleNavigateToSignup}
        />
      );

    case 'signup':
      return (
        <SignupPage
          onBack={handleNavigateBack}
          onLoginPress={handleNavigateToLogin}
        />
      );

    case 'verification':
      return (
        <EmailVerificationPage
          onBack={handleNavigateBack}
        />
      );

    default:
      return (
        <LandingPage
          onLogin={handleNavigateToLogin}
          onSignUp={handleNavigateToSignup}
        />
      );
  }
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

export default LandingRouter;