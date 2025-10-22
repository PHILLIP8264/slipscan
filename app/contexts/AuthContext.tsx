import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import AuthManager, { AuthState } from '../../utils/AuthManager';
import { authenticateWithBiometrics, shouldUseBiometrics } from '../../utils/biometrics';

interface AuthContextType {
  authState: AuthState;
  isLocked: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  resendEmailVerification: () => Promise<{ success: boolean; error?: string }>;
  checkEmailVerificationStatus: () => Promise<boolean>;
  unlockWithBiometrics: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authManager] = useState(() => AuthManager.getInstance());
  const [authState, setAuthState] = useState<AuthState>(() => {
    // Initialize with empty state, will be updated after async initialization
    return {
      lastUserEmail: undefined,
      lastUserName: undefined,
      lastUserHadBiometrics: false,
    };
  });
  const [isLocked, setIsLocked] = useState(false);
  const appState = useRef(AppState.currentState);
  const backgroundTime = useRef<number | null>(null);

  // Auto-logout timer (5 minutes in background)
  const AUTO_LOGOUT_DELAY = 5 * 60 * 1000; // 5 minutes

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App is coming to foreground
      if (authState.lastUserEmail && backgroundTime.current) {
        const timeInBackground = Date.now() - backgroundTime.current;
        
        if (timeInBackground > AUTO_LOGOUT_DELAY) {
          // Auto logout after 5 minutes
          Alert.alert(
            'Session Expired',
            'You have been automatically logged out for security.',
            [{ text: 'OK', onPress: () => authManager.logout() }]
          );
        } else if (await shouldUseBiometrics()) {
          // Show biometric lock if enabled
          setIsLocked(true);
        }
      }
      backgroundTime.current = null;
    } else if (nextAppState.match(/inactive|background/)) {
      // App is going to background
      if (authState.lastUserEmail) {
        backgroundTime.current = Date.now();
      }
    }
    appState.current = nextAppState;
  };

  const unlockWithBiometrics = async (): Promise<boolean> => {
    try {
      const result = await authenticateWithBiometrics('Authenticate to unlock SlipScan');
      if (result.success) {
        setIsLocked(false);
        return true;
      } else {
        Alert.alert('Authentication Failed', result.error || 'Could not authenticate');
        return false;
      }
    } catch (error) {
      console.error('Biometric unlock error:', error);
      Alert.alert('Error', 'Biometric authentication failed');
      return false;
    }
  };

  useEffect(() => {
    // Ensure AuthManager is initialized before subscribing
    const initializeAndSubscribe = async () => {
      await authManager.ensureInitialized();
      setAuthState(authManager.getAuthState());
    };
    
    initializeAndSubscribe();

    // Subscribe to auth state changes
    const unsubscribe = authManager.addAuthStateListener(setAuthState);
    
    // Subscribe to app state changes
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      unsubscribe();
      appStateSubscription?.remove();
    };
  }, [authManager]);

  const contextValue: AuthContextType = {
    authState,
    isLocked,
    login: authManager.login.bind(authManager),
    signup: authManager.signup.bind(authManager),
    logout: authManager.logout.bind(authManager),
    resetPassword: authManager.resetPassword.bind(authManager),
    resendEmailVerification: authManager.resendEmailVerification.bind(authManager),
    checkEmailVerificationStatus: authManager.checkEmailVerificationStatus.bind(authManager),
    unlockWithBiometrics,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;
