import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    sendEmailVerification,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
    User
} from 'firebase/auth';
import { auth } from '../firebaseConfig';
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
  isAuthenticated?: boolean;
  currentUser?: User | null;
  isEmailVerified?: boolean;
}

export class AuthManager {
  private static instance: AuthManager | null = null;
  private listeners: Array<(authState: AuthState) => void> = [];
  private currentAuthState: AuthState = {
    lastUserEmail: undefined,
    lastUserName: undefined,
    lastUserHadBiometrics: false,
    isAuthenticated: false,
    currentUser: null,
    isEmailVerified: false,
  };

  private initializationPromise: Promise<void> | null = null;
  private firebaseUnsubscribe: (() => void) | null = null;

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
    console.log('🔐 Initializing AuthManager with Firebase');
    
    // Set up Firebase auth state listener
    this.firebaseUnsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('🔥 Firebase auth state changed:', user ? user.email : 'No user');
      this.handleFirebaseAuthStateChange(user);
    });
    
    // Check for existing session data
    await this.checkExistingSession();
  }

  private async handleFirebaseAuthStateChange(user: User | null): Promise<void> {
    console.log('🔥 Handling Firebase auth state change');
    
    if (user) {
      // User is signed in
      console.log('✅ Firebase user authenticated:', user.email);
      
      // Update auth state with Firebase user data
      this.currentAuthState = {
        ...this.currentAuthState,
        isAuthenticated: true,
        currentUser: user,
        lastUserEmail: user.email || undefined,
        lastUserName: user.displayName || this.currentAuthState.lastUserName,
        isEmailVerified: user.emailVerified,
      };
      
      // Store user data locally for offline access
      if (user.email) {
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_USER_EMAIL, user.email);
      }
      if (user.displayName) {
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_USER_NAME, user.displayName);
      }
      
    } else {
      // User is signed out
      console.log('❌ Firebase user signed out');
      
      // Keep local user data for return page, but mark as not authenticated
      this.currentAuthState = {
        ...this.currentAuthState,
        isAuthenticated: false,
        currentUser: null,
        isEmailVerified: false,
      };
    }
    
    this.notifyListeners();
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
        console.log('🔄 Loaded authState:', this.currentAuthState);
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
      console.log('🔐 Attempting Firebase login for:', email);
      
      // Validate inputs
      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        return { success: false, error: emailValidation.error };
      }
      
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        return { success: false, error: passwordValidation.error };
      }
      
      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      
      console.log('✅ Firebase login successful for:', user.email);
      
      // Get current biometric preference
      const userHasBiometrics = await isBiometricsEnabled();
      
      // Store biometrics preference
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_USER_BIOMETRICS, userHasBiometrics.toString());
      
      // Firebase auth state listener will handle the rest
      return { success: true };
      
    } catch (error: any) {
      console.error('🔥 Firebase login error:', error);
      
      // Handle specific Firebase Auth errors
      let errorMessage = 'Login failed';
      
      if (error.code) {
        switch (error.code) {
          case 'auth/user-not-found':
            errorMessage = 'No account found with this email address';
            break;
          case 'auth/wrong-password':
            errorMessage = 'Invalid password';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Invalid email address';
            break;
          case 'auth/user-disabled':
            errorMessage = 'This account has been disabled';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many failed attempts. Please try again later';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your connection';
            break;
          default:
            errorMessage = error.message || 'Login failed';
        }
      }
      
      return { success: false, error: errorMessage };
    }
  }

  public async signup(email: string, password: string, displayName: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔐 Attempting Firebase signup for:', email);
      
      // Validate inputs
      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        return { success: false, error: emailValidation.error };
      }

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        return { success: false, error: passwordValidation.error };
      }

      if (!displayName || displayName.trim().length < 2) {
        return { success: false, error: 'Display name must be at least 2 characters' };
      }

      // Create new user with Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      
      console.log('✅ Firebase signup successful for:', user.email);
      
      // Update user profile with display name
      await updateProfile(user, {
        displayName: displayName.trim()
      });
      
      // Send email verification
      await sendEmailVerification(user);
      console.log('📧 Email verification sent to:', user.email);
      
      // For new signups, biometrics is initially false
      const userHasBiometrics = false;
      
      // Store biometrics preference
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_USER_BIOMETRICS, userHasBiometrics.toString());
      
      // Firebase auth state listener will handle the rest
      return { success: true };
      
    } catch (error: any) {
      console.error('🔥 Firebase signup error:', error);
      
      // Handle specific Firebase Auth errors
      let errorMessage = 'Account creation failed';
      
      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'An account with this email already exists';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Invalid email address';
            break;
          case 'auth/operation-not-allowed':
            errorMessage = 'Email/password accounts are not enabled';
            break;
          case 'auth/weak-password':
            errorMessage = 'Password is too weak. Use at least 6 characters';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your connection';
            break;
          default:
            errorMessage = error.message || 'Account creation failed';
        }
      }
      
      return { success: false, error: errorMessage };
    }
  }

  public async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔐 Attempting Firebase password reset for:', email);
      
      // Validate email
      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        return { success: false, error: emailValidation.error };
      }
      
      // Send password reset email with Firebase
      await sendPasswordResetEmail(auth, email.trim());
      console.log('✅ Password reset email sent to:', email);
      
      return { success: true };
      
    } catch (error: any) {
      console.error('🔥 Firebase password reset error:', error);
      
      // Handle specific Firebase Auth errors
      let errorMessage = 'Password reset failed';
      
      if (error.code) {
        switch (error.code) {
          case 'auth/user-not-found':
            errorMessage = 'No account found with this email address';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Invalid email address';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many requests. Please wait before trying again';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your connection';
            break;
          default:
            errorMessage = error.message || 'Password reset failed';
        }
      }
      
      return { success: false, error: errorMessage };
    }
  }

  public async resendEmailVerification(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔐 Attempting to resend email verification');
      
      // Get current Firebase user
      const user = auth.currentUser;
      if (!user) {
        return { success: false, error: 'No user is currently signed in' };
      }
      
      if (user.emailVerified) {
        return { success: false, error: 'Email is already verified' };
      }
      
      // Resend verification email
      await sendEmailVerification(user);
      console.log('✅ Email verification sent to:', user.email);
      
      return { success: true };
      
    } catch (error: any) {
      console.error('🔥 Firebase resend verification error:', error);
      
      // Handle specific Firebase Auth errors
      let errorMessage = 'Failed to resend verification email';
      
      if (error.code) {
        switch (error.code) {
          case 'auth/too-many-requests':
            errorMessage = 'Too many requests. Please wait before trying again';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your connection';
            break;
          default:
            errorMessage = error.message || 'Failed to resend verification email';
        }
      }
      
      return { success: false, error: errorMessage };
    }
  }

  public async checkEmailVerificationStatus(): Promise<boolean> {
    try {
      console.log('� Checking Firebase email verification status');
      
      // Get current Firebase user
      const user = auth.currentUser;
      if (!user) {
        console.log('❌ No user is currently signed in');
        return false;
      }
      
      // Reload user to get fresh verification status
      await user.reload();
      
      const isVerified = user.emailVerified;
      console.log('📧 Email verification status for', user.email, ':', isVerified);
      
      return isVerified;
      
    } catch (error) {
      console.error('🔥 Check verification error:', error);
      return false;
    }
  }

  public async logout(): Promise<void> {
    try {
      console.log('🔐 Attempting Firebase logout');
      
      // Get the stored user info to maintain it after logout
      const [lastUserEmail, lastUserName, lastUserBiometrics] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.LAST_USER_EMAIL),
        AsyncStorage.getItem(STORAGE_KEYS.LAST_USER_NAME),
        AsyncStorage.getItem(STORAGE_KEYS.LAST_USER_BIOMETRICS)
      ]);
      
      // Sign out from Firebase
      await signOut(auth);
      
      // Update local state but preserve user history
      this.currentAuthState = {
        isAuthenticated: false,
        currentUser: null,
        lastUserEmail: lastUserEmail || undefined,
        lastUserName: lastUserName || undefined,
        lastUserHadBiometrics: lastUserBiometrics === 'true'
      };
      
      this.notifyListeners();
      console.log('✅ Firebase logout completed');
    } catch (error) {
      console.error('🔥 Logout error:', error);
      // Even if Firebase logout fails, update local state
      this.currentAuthState = {
        isAuthenticated: false,
        currentUser: null,
        lastUserEmail: this.currentAuthState.lastUserEmail,
        lastUserName: this.currentAuthState.lastUserName,
        lastUserHadBiometrics: this.currentAuthState.lastUserHadBiometrics
      };
      this.notifyListeners();
    }
  }

  public getAuthState(): AuthState {
    return this.currentAuthState;
  }

  public getCurrentUser(): User | null {
    return auth.currentUser;
  }

  public isUserSignedIn(): boolean {
    return !!auth.currentUser;
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
      console.log('📝 Starting updateUserSettings with:', updates);

      // Update email if provided
      if (updates.email !== undefined) {
        console.log('🔄 Updating email from', this.currentAuthState.lastUserEmail, 'to', updates.email);
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_USER_EMAIL, updates.email);
        this.currentAuthState.lastUserEmail = updates.email;
        console.log('✅ Email saved to AsyncStorage and updated in currentAuthState');
      }

      // Update name if provided
      if (updates.name !== undefined) {
        console.log('🔄 Updating name from', this.currentAuthState.lastUserName, 'to', updates.name);
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_USER_NAME, updates.name);
        this.currentAuthState.lastUserName = updates.name;
        console.log('✅ Name saved to AsyncStorage and updated in currentAuthState');
        
        // Verify the save worked
        const savedName = await AsyncStorage.getItem(STORAGE_KEYS.LAST_USER_NAME);
        console.log('🔍 Verification - Name retrieved from storage:', savedName);
      }

      // Update biometrics if provided
      if (updates.biometricsEnabled !== undefined) {
        console.log('🔄 Updating biometrics to', updates.biometricsEnabled);
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_USER_BIOMETRICS, updates.biometricsEnabled.toString());
        this.currentAuthState.lastUserHadBiometrics = updates.biometricsEnabled;
        console.log('✅ Biometrics saved to AsyncStorage and updated in currentAuthState');
      }

      // Notify all listeners about the change
      this.notifyListeners();
      
      console.log('✅ User settings updated successfully');
      console.log('📄 Final authState:', this.currentAuthState);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating user settings:', error);
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
    console.log('📢 Notifying listeners with authState:', this.currentAuthState);
    console.log('📢 Number of listeners:', this.listeners.length);
    this.listeners.forEach(listener => listener(this.currentAuthState));
  }
}

export default AuthManager;
