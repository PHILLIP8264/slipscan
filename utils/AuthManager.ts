import AsyncStorage from '@react-native-async-storage/async-storage';
import { isBiometricsEnabled } from './biometrics';

const STORAGE_KEYS = {
  LAST_USER_EMAIL: 'lastUserEmail',
  LAST_USER_NAME: 'lastUserName',
  LAST_USER_BIOMETRICS: 'lastUserBiometrics',
} as const;

// Email validation function
export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }
  
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  return { isValid: true };
};

// Password validation function
export const validatePassword = (password: string): { isValid: boolean; error?: string } => {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }
  
  if (password.length < 6) {
    return { isValid: false, error: 'Password must be at least 6 characters long' };
  }
  
  return { isValid: true };
};

export interface AuthState {
  lastUserEmail?: string;
  lastUserName?: string;
  lastUserHadBiometrics?: boolean;
}

export class AuthManager {
  private static instance: AuthManager | null = null;
  private listeners: Array<(authState: AuthState) => void> = [];
  private currentAuthState: AuthState = {
    lastUserEmail: undefined,
    lastUserName: undefined,
    lastUserHadBiometrics: false,
  };

  private initializationPromise: Promise<void> | null = null;

  private constructor() {
    // Don't await here, but store the promise
    this.initializationPromise = this.initialize();
  }

  public static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  // Method to ensure initialization is complete before accessing state
  public async ensureInitialized(): Promise<void> {
    if (this.initializationPromise) {
      await this.initializationPromise;
      this.initializationPromise = null;
    }
  }

  private async initialize(): Promise<void> {
    console.log('🔐 Initializing AuthManager');
    
    // Check for existing session
    await this.checkExistingSession();
  }

  private async checkExistingSession(): Promise<void> {
    try {
      console.log('🔍 Checking for stored user data...');
      const [lastUserEmail, lastUserName, lastUserBiometrics] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.LAST_USER_EMAIL),
        AsyncStorage.getItem(STORAGE_KEYS.LAST_USER_NAME),
        AsyncStorage.getItem(STORAGE_KEYS.LAST_USER_BIOMETRICS)
      ]);
      
      console.log('📱 Stored values:', { lastUserEmail, lastUserName, lastUserBiometrics });
      
      if (lastUserEmail) {
        // User has used app before - show return page
        console.log('👤 Returning user found');
        this.currentAuthState = {
          lastUserEmail,
          lastUserName: lastUserName || undefined,
          lastUserHadBiometrics: lastUserBiometrics === 'true',
        };
      } else {
        // First time user - show landing page
        console.log('🆕 First time user');
        this.currentAuthState = {
          lastUserEmail: undefined,
          lastUserName: undefined,
          lastUserHadBiometrics: false,
        };
      }
      this.notifyListeners();
    } catch (error) {
      console.error('Error checking session:', error);
    }
  }

  public async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = { email, name: 'User Name' };
      
      // Get current biometric preference
      const userHasBiometrics = await isBiometricsEnabled();
      
      console.log('💾 Storing login data:', { email, name: user.name, biometrics: userHasBiometrics });
      
      // Store user email, name, and biometrics
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.LAST_USER_EMAIL, email),
        AsyncStorage.setItem(STORAGE_KEYS.LAST_USER_NAME, user.name),
        AsyncStorage.setItem(STORAGE_KEYS.LAST_USER_BIOMETRICS, userHasBiometrics.toString())
      ]);
      
      console.log('✅ Login data stored successfully');
      
      this.currentAuthState = {
        lastUserEmail: email,
        lastUserName: user.name,
        lastUserHadBiometrics: userHasBiometrics
      };
      
      this.notifyListeners();
      console.log('✅ Login successful');
      
      return { success: true };
    } catch (error) {
      this.notifyListeners();
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  }

  public async signup(email: string, password: string, displayName: string): Promise<{ success: boolean; error?: string }> {
    try {
      // For new signups, biometrics is initially false
      const userHasBiometrics = false;
      
      // Store user email, name, and biometrics
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.LAST_USER_EMAIL, email),
        AsyncStorage.setItem(STORAGE_KEYS.LAST_USER_NAME, displayName),
        AsyncStorage.setItem(STORAGE_KEYS.LAST_USER_BIOMETRICS, userHasBiometrics.toString())
      ]);
      
      this.currentAuthState = {
        lastUserEmail: email,
        lastUserName: displayName,
        lastUserHadBiometrics: userHasBiometrics
      };
      
      this.notifyListeners();
      console.log('✅ Signup successful');
      
      return { success: true };
    } catch (error) {
      this.notifyListeners();
      console.error('Signup error:', error);
      return { success: false, error: 'Signup failed' };
    }
  }

  public async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Simulate password reset (replace with actual logic)
      console.log(`📧 Password reset email sent to: ${email}`);
      
      // In real app, this would call Firebase Auth password reset
      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, error: 'Password reset failed' };
    }
  }

  public async resendEmailVerification(): Promise<{ success: boolean; error?: string }> {
    try {
      // Simulate resending verification email
      console.log('📧 Resending email verification');
      
      // In real app, this would call Firebase Auth resend verification
      return { success: true };
    } catch (error) {
      console.error('Resend verification error:', error);
      return { success: false, error: 'Failed to resend verification email' };
    }
  }

  public async checkEmailVerificationStatus(): Promise<boolean> {
    try {
      // Simulate checking verification status
      console.log('📧 Checking email verification status');
      
      // In real app, this would check Firebase Auth verification status
      // For now, return false to simulate unverified email
      return false;
    } catch (error) {
      console.error('Check verification error:', error);
      return false;
    }
  }

  public async logout(): Promise<void> {
    try {
      // Get the stored user info to maintain it after logout
      const [lastUserEmail, lastUserName, lastUserBiometrics] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.LAST_USER_EMAIL),
        AsyncStorage.getItem(STORAGE_KEYS.LAST_USER_NAME),
        AsyncStorage.getItem(STORAGE_KEYS.LAST_USER_BIOMETRICS)
      ]);
      
      this.currentAuthState = {
        lastUserEmail: lastUserEmail || undefined,
        lastUserName: lastUserName || undefined,
        lastUserHadBiometrics: lastUserBiometrics === 'true'
      };
      
      this.notifyListeners();
      console.log('🚪 Logout completed');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  public getAuthState(): AuthState {
    return this.currentAuthState;
  }

  // Method to completely reset app state (for testing or complete reset)
  public async clearAllData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.LAST_USER_EMAIL),
        AsyncStorage.removeItem(STORAGE_KEYS.LAST_USER_NAME),
        AsyncStorage.removeItem(STORAGE_KEYS.LAST_USER_BIOMETRICS)
      ]);
      
      this.currentAuthState = {
        lastUserEmail: undefined,
        lastUserName: undefined,
        lastUserHadBiometrics: false,
      };
      
      this.notifyListeners();
      console.log('🗑️ All data cleared');
    } catch (error) {
      console.error('Clear data error:', error);
    }
  }

  // TEST METHOD - Add fake user data for testing
  public async addTestUser(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.LAST_USER_EMAIL, 'test@example.com'),
        AsyncStorage.setItem(STORAGE_KEYS.LAST_USER_NAME, 'Test User'),
        AsyncStorage.setItem(STORAGE_KEYS.LAST_USER_BIOMETRICS, 'false')
      ]);
      console.log('✅ Test user data added');
      // Re-check session to update state
      await this.checkExistingSession();
    } catch (error) {
      console.error('Error adding test user:', error);
    }
  }

  // Method to update user settings (email, name, or biometrics)
  public async updateUserSettings(updates: {
    email?: string;
    name?: string;
    biometricsEnabled?: boolean;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const updatePromises: Promise<void>[] = [];

      if (updates.email !== undefined) {
        updatePromises.push(AsyncStorage.setItem(STORAGE_KEYS.LAST_USER_EMAIL, updates.email));
        this.currentAuthState.lastUserEmail = updates.email;
      }

      if (updates.name !== undefined) {
        updatePromises.push(AsyncStorage.setItem(STORAGE_KEYS.LAST_USER_NAME, updates.name));
        this.currentAuthState.lastUserName = updates.name;
      }

      if (updates.biometricsEnabled !== undefined) {
        updatePromises.push(AsyncStorage.setItem(STORAGE_KEYS.LAST_USER_BIOMETRICS, updates.biometricsEnabled.toString()));
        this.currentAuthState.lastUserHadBiometrics = updates.biometricsEnabled;
      }

      await Promise.all(updatePromises);
      this.notifyListeners();
      
      console.log('✅ User settings updated');
      return { success: true };
    } catch (error) {
      console.error('Error updating user settings:', error);
      return { success: false, error: 'Failed to update settings' };
    }
  }

  public addAuthStateListener(listener: (authState: AuthState) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentAuthState));
  }
}

export default AuthManager;
