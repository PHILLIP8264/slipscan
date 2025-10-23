import React, { useEffect, useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { useAuth } from './contexts/AuthContext';
import LandingPage from './hiddenpages/landing_auths/landingpage';
import LoginPage from './hiddenpages/landing_auths/LoginPage';
import ReturnPage from './hiddenpages/landing_auths/returnpage';
import SignupPage from './hiddenpages/landing_auths/SignupPage';

type AuthScreen = 'landing' | 'returning' | 'login' | 'signup';

export default function Index() {
  const { authState, isLocked } = useAuth();
  
  // Determine initial screen based on auth state
  const getInitialScreen = (): AuthScreen => {
    // If user has an email stored, they're a returning user, otherwise first-time
    return authState.lastUserEmail ? 'returning' : 'landing';
  };
  
  const [currentScreen, setCurrentScreen] = useState<AuthScreen>(getInitialScreen());

  // Update screen when auth state changes
  useEffect(() => {
    console.log('🔄 Auth state changed:', {
      lastUserEmail: authState.lastUserEmail,
      lastUserName: authState.lastUserName,
      lastUserHadBiometrics: authState.lastUserHadBiometrics
    });
    
    const newScreen = authState.lastUserEmail ? 'returning' : 'landing';
    console.log(`📱 Setting screen to: ${newScreen}`);
    setCurrentScreen(newScreen);
  }, [authState.lastUserEmail, authState.lastUserName, authState.lastUserHadBiometrics]);

 

  // Navigation handlers
  const handleNavigateToLogin = () => setCurrentScreen('login');
  const handleNavigateToSignup = () => setCurrentScreen('signup');
  const handleNavigateToLanding = () => setCurrentScreen('landing');
  const handleNavigateToReturning = () => setCurrentScreen('returning');
  
  const handleBack = () => {
    setCurrentScreen('landing');
  };

  const handleSignInDifferent = () => {
    setCurrentScreen('landing');
  };



  // Show appropriate auth screen
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {currentScreen === 'landing' && (
        <LandingPage 
          onLogin={handleNavigateToLogin}
          onSignUp={handleNavigateToSignup}
        />
      )}
      
      {currentScreen === 'returning' && (
        <ReturnPage 
          onLogin={handleNavigateToLogin}
          onSignInDifferent={handleNavigateToLanding}
          lastUserEmail={authState.lastUserEmail}
          lastUserName={authState.lastUserName}
          hadBiometrics={authState.lastUserHadBiometrics}
        />
      )}
      
      {currentScreen === 'login' && (
        <LoginPage 
          onBack={handleBack}
          onSignUpPress={handleNavigateToSignup}
        />
      )}
      
      {currentScreen === 'signup' && (
        <SignupPage 
          onBack={handleBack}
          onLoginPress={handleNavigateToLogin}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 100,
  },
});

