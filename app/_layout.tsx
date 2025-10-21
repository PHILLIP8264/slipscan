// IMPORTANT: These polyfills must be imported FIRST
import "react-native-get-random-values";
// Polyfill for buffer
global.Buffer = global.Buffer || require("buffer").Buffer;

import { Slot, usePathname, useRouter, useSegments } from "expo-router";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, AppState, AppStateStatus, View } from "react-native";
import { auth } from "../firebaseConfig";
import { clearLastLoggedInUser, clearUserSession, hasValidSession } from "../utils/userPersistence";

export default function RootLayout() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();

  useEffect(() => {
    // Start Firebase auth listener
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      handleAuthStateChange(firebaseUser);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    let backgroundTimer: number | null = null;

    // Monitor app state changes
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background') {
        // App went to background - set a timer to logout after a delay
        console.log('App went to background - setting logout timer');
        backgroundTimer = setTimeout(async () => {
          console.log('App was backgrounded too long - logging out user');
          await handleForceLogout();
        }, 10000); // 10 seconds delay
      } else if (nextAppState === 'active') {
        // App became active - cancel logout timer if it exists
        if (backgroundTimer) {
          console.log('App became active - canceling logout timer');
          clearTimeout(backgroundTimer);
          backgroundTimer = null;
        }
      }
      
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
      if (backgroundTimer) {
        clearTimeout(backgroundTimer);
      }
    };
  }, []);

  const handleForceLogout = async () => {
    try {
      // Sign out from Firebase
      await signOut(auth);
      
      // Clear local user data and session
      await clearLastLoggedInUser();
      await clearUserSession();
      
      console.log('User logged out due to app state change');
      
      // Navigate to login screen
      router.replace('/');
    } catch (error) {
      console.error('Error during force logout:', error);
    }
  };

  const handleAuthStateChange = async (firebaseUser: User | null) => {
    const current = "/" + segments.join("/");
    console.log('Auth state change - User:', firebaseUser?.email || 'null', 'Current path:', current);

    if (firebaseUser) {
      // Only validate sessions if user is trying to access protected routes (/tabs)
      if (current.startsWith("/tabs")) {
        console.log('Validating session for protected route...');
        const sessionValid = await hasValidSession();
        
        if (!sessionValid) {
          console.log('Accessing protected route without valid session - logging out');
          await handleForceLogout();
          return;
        }
        console.log('Session is valid for protected route');
      }

      // If email user, only allow access to /tabs if verified
      if (
        (firebaseUser.providerData.some((p) => p.providerId === "password") &&
          firebaseUser.emailVerified) ||
        firebaseUser.providerData.some((p) => p.providerId === "phone")
      ) {
        if (!current.startsWith("/tabs")) {
          console.log('User verified, navigating to /tabs');
          router.replace("/tabs");
        }
      } else {
        // Not verified yet, stay on or go to /verifycode
        if (current !== "/verifycode") {
          console.log('User not verified, navigating to /verifycode');
          router.replace("/verifycode");
        }
      }
    } else {
      // No user, go to index (index will handle welcome back logic)
      if (current !== "/") {
        console.log('No user, navigating to /');
        router.replace("/");
      }
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return <Slot />;
}
