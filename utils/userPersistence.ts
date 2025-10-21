import AsyncStorage from "@react-native-async-storage/async-storage";

// AsyncStorage keys
const LAST_USER_KEY = "lastLoggedInUser";
const SESSION_KEY = "currentSession";
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

export interface UserSession {
  userId: string;
  email: string;
  startTime: string;
  lastActivity: string;
  isActive: boolean;
}

export interface LastLoggedInUser {
  email: string;
  name: string;
  userId: string;
  loginMethod: "email" | "phone";
  loginDate: string;
}

/**
 * Save the last logged-in user info to AsyncStorage
 */
export const saveLastLoggedInUser = async (
  userInfo: LastLoggedInUser
): Promise<void> => {
  try {
    const userData = {
      ...userInfo,
      loginDate: new Date().toISOString(),
    };
    await AsyncStorage.setItem(LAST_USER_KEY, JSON.stringify(userData));
    console.log("Last logged-in user saved:", userData.email);
  } catch (error) {
    console.error("Error saving last logged-in user:", error);
    throw error;
  }
};

/**
 * Get the last logged-in user info from AsyncStorage
 */
export const getLastLoggedInUser =
  async (): Promise<LastLoggedInUser | null> => {
    try {
      const userData = await AsyncStorage.getItem(LAST_USER_KEY);
      if (userData) {
        const parsedUser = JSON.parse(userData);
        console.log("Last logged-in user found:", parsedUser.email);
        return parsedUser;
      }
      return null;
    } catch (error) {
      console.error("Error getting last logged-in user:", error);
      return null;
    }
  };

/**
 * Clear the last logged-in user info (on explicit logout)
 */
export const clearLastLoggedInUser = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(LAST_USER_KEY);
    console.log("Last logged-in user cleared");
  } catch (error) {
    console.error("Error clearing last logged-in user:", error);
    throw error;
  }
};

/**
 * Check if there's a remembered user who can use biometric login
 */
export const canUseBiometricLogin = async (): Promise<{
  canUse: boolean;
  user: LastLoggedInUser | null;
  biometricsEnabled: boolean;
}> => {
  try {
    const [lastUser, biometricsEnabled] = await Promise.all([
      getLastLoggedInUser(),
      AsyncStorage.getItem("biometricsEnabled"),
    ]);

    const canUse = lastUser !== null && biometricsEnabled === "true";

    return {
      canUse,
      user: lastUser,
      biometricsEnabled: biometricsEnabled === "true",
    };
  } catch (error) {
    console.error("Error checking biometric login capability:", error);
    return {
      canUse: false,
      user: null,
      biometricsEnabled: false,
    };
  }
};

/**
 * Update last user info (useful for profile changes)
 */
export const updateLastLoggedInUser = async (
  updates: Partial<LastLoggedInUser>
): Promise<void> => {
  try {
    const currentUser = await getLastLoggedInUser();
    if (currentUser) {
      const updatedUser = { ...currentUser, ...updates };
      await saveLastLoggedInUser(updatedUser);
    }
  } catch (error) {
    console.error("Error updating last logged-in user:", error);
    throw error;
  }
};

/**
 * Create a new user session
 */
export const createUserSession = async (userId: string, email: string): Promise<void> => {
  try {
    const session: UserSession = {
      userId,
      email,
      startTime: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      isActive: true,
    };
    
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    console.log("User session created for:", email);
  } catch (error) {
    console.error("Error creating user session:", error);
    throw error;
  }
};

/**
 * Get current user session
 */
export const getCurrentSession = async (): Promise<UserSession | null> => {
  try {
    const sessionData = await AsyncStorage.getItem(SESSION_KEY);
    if (sessionData) {
      const session: UserSession = JSON.parse(sessionData);
      
      // Check if session is still valid (within timeout period)
      const now = new Date();
      const lastActivity = new Date(session.lastActivity);
      const timeDiff = now.getTime() - lastActivity.getTime();
      
      if (timeDiff > SESSION_TIMEOUT || !session.isActive) {
        // Session expired or inactive
        await clearUserSession();
        return null;
      }
      
      return session;
    }
    return null;
  } catch (error) {
    console.error("Error getting current session:", error);
    return null;
  }
};

/**
 * Update session activity (call this on user interactions)
 */
export const updateSessionActivity = async (): Promise<void> => {
  try {
    const session = await getCurrentSession();
    if (session) {
      session.lastActivity = new Date().toISOString();
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  } catch (error) {
    console.error("Error updating session activity:", error);
  }
};

/**
 * Clear current user session
 */
export const clearUserSession = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
    console.log("User session cleared");
  } catch (error) {
    console.error("Error clearing user session:", error);
    throw error;
  }
};

/**
 * Check if user has a valid active session
 */
export const hasValidSession = async (): Promise<boolean> => {
  try {
    const session = await getCurrentSession();
    return session !== null;
  } catch (error) {
    console.error("Error checking valid session:", error);
    return false;
  }
};
