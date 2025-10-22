import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
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

  // Show loading spinner while auth state is being determined
  if (authState.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2b6ef6" />
      </View>
    );
  }

  // If user is authenticated and email is verified, they should be in main app
  if (authState.isAuthenticated && authState.user?.emailVerified) {
    // This should redirect to main app - handled by parent component
    return null;
  }

  // If user is authenticated but email not verified, show verification page
  if (authState.isAuthenticated && !authState.user?.emailVerified) {
    return (
      <EmailVerificationPage
        onBack={() => setCurrentScreen(authState.isFirstTime ? 'landing' : 'return')}
        userEmail={authState.user?.email}
      />
    );
  }

  // Determine initial screen based on auth state
  const getInitialScreen = (): AuthScreen => {
    if (authState.isFirstTime) {
      return 'landing';
    } else {
      return 'return';
    }
  };

  // Set initial screen if still on default
  if (currentScreen === 'landing' && !authState.isFirstTime) {
    setCurrentScreen('return');
  }
  if (currentScreen === 'return' && authState.isFirstTime) {
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
        setCurrentScreen(authState.isFirstTime ? 'landing' : 'return');
        break;
      case 'verification':
        setCurrentScreen(authState.isFirstTime ? 'landing' : 'return');
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
      return (
        <ReturnPage
          onLogin={handleNavigateToLogin}
          onSignInDifferent={() => setCurrentScreen('landing')}
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