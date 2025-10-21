import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import React, { useEffect, useState } from "react";
import { Alert } from "react-native";
import { auth } from "../firebaseConfig";
import { getUserByEmail } from "../utils/CRUD/usercrud";
import {
    authenticateWithBiometrics,
    isBiometricsAvailable,
} from "../utils/biometrics";
import {
  clearLastLoggedInUser,
  clearUserSession,
  createUserSession,
  getLastLoggedInUser,
  LastLoggedInUser,
  saveLastLoggedInUser,
} from "../utils/userPersistence";import LandingView from "../assets/componets/ui/authui/LandingView";
import LoadingScreen from "../assets/componets/ui/authui/LoadingScreen";
import LoginFormView from "../assets/componets/ui/authui/LoginFormView";
import WelcomeBackView from "../assets/componets/ui/authui/WelcomeBackView";

type LandingState =
  | "loading"
  | "welcome-back"
  | "first-time"
  | "returning"
  | "login-form";

export default function Landing() {
  const [state, setState] = useState<LandingState>("loading");
  const [lastUser, setLastUser] = useState<LastLoggedInUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [biometricsInfo, setBiometricsInfo] = useState({
    available: false,
    type: "Biometrics" as string,
  });

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const router = useRouter();

  useEffect(() => {
    initializeLanding();
  }, []);

  useEffect(() => {
    if (state === "welcome-back" || state === "returning") {
      checkBiometrics();
    }
  }, [state]);

  const initializeLanding = async () => {
    try {
      // Clear any existing session when app starts (but keep last user info)
      await clearUserSession();
      
      const [rememberedUser, hasLoggedInBefore] = await Promise.all([
        getLastLoggedInUser(),
        AsyncStorage.getItem("hasLoggedIn"),
      ]);

      if (rememberedUser && hasLoggedInBefore) {
        setLastUser(rememberedUser);
        setState("returning");
      } else if (hasLoggedInBefore) {
        setState("returning");
      } else {
        setState("first-time");
      }
    } catch (error) {
      console.error("Failed to initialize landing:", error);
      setState("first-time");
    }
  };

  const checkBiometrics = async () => {
    const info = await isBiometricsAvailable();
    setBiometricsInfo(info);
  };

  const handleBiometricLoginForReturning = async () => {
    if (!lastUser) {
      Alert.alert("Error", "No user information found");
      return;
    }

    setLoading(true);
    try {
      console.log('Starting biometric login for returning user...');
      
      // Authenticate with biometrics
      const biometricResult = await authenticateWithBiometrics(
        `Login as ${lastUser.name}`
      );

      if (biometricResult.success) {
        console.log('Biometric authentication successful, showing simplified login');
        
        // Pre-fill email and show login form for password
        setEmail(lastUser.email);
        setState("login-form");
      } else {
        throw new Error(biometricResult.error || 'Biometric authentication failed');
      }
    } catch (error: any) {
      console.error("Biometric login error:", error);
      Alert.alert(
        "Biometric Login Failed", 
        "Please try again or use password login",
        [
          { text: "Use Password", onPress: () => showLoginForm() },
          { text: "Try Again", onPress: () => handleBiometricLoginForReturning() }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchUser = async () => {
    Alert.alert(
      "Switch User",
      "Sign out and allow a different user to sign in?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Switch User",
          style: "destructive",
          onPress: async () => {
            try {
              await clearLastLoggedInUser();
              const hasLoggedIn = await AsyncStorage.getItem("hasLoggedIn");
              setState(hasLoggedIn ? "returning" : "first-time");
              setLastUser(null);
            } catch (error) {
              console.error("Failed to switch user:", error);
              Alert.alert("Error", "Could not switch users");
            }
          },
        },
      ]
    );
  };

  const handleBiometricLogin = async () => {
    if (!lastUser) return;

    setLoading(true);
    try {
      const authResult = await authenticateWithBiometrics(
        `Sign in as ${lastUser.name}`
      );

      if (authResult.success) {
        router.replace("/tabs");
      } else {
        Alert.alert(
          "Authentication Failed",
          authResult.error || "Could not verify your identity"
        );
      }
    } catch (error) {
      console.error("Biometric login error:", error);
      Alert.alert("Error", "An error occurred during authentication");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    console.log('Starting email login process...');
    setLoginLoading(true);
    try {
      console.log('Signing in with Firebase...');
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      console.log('Firebase login successful, getting user data...');
      
      const userData = await getUserByEmail(userCredential.user.email || email);

      if (userData) {
        console.log('Creating user session...');
        // Create session instead of persistent login
        await createUserSession(
          userCredential.user.uid,
          userData.email
        );
        
        // Mark that user has logged in before (for showing returning user UI)
        await AsyncStorage.setItem("hasLoggedIn", "true");
        console.log('Session created successfully, navigating to /tabs');
      }

      router.replace("/tabs");
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert("Login Error", error.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const showLoginForm = () => {
    setState("login-form");
  };

  const goBackToLanding = async () => {
    if (lastUser) {
      setState("welcome-back");
    } else {
      const hasLoggedIn = await AsyncStorage.getItem("hasLoggedIn");
      setState(hasLoggedIn ? "returning" : "first-time");
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const formatLastLogin = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Loading State
  if (state === "loading") {
    return <LoadingScreen />;
  }

  // Login Form State
  if (state === "login-form") {
    return (
      <LoginFormView
        email={email}
        password={password}
        loading={loginLoading}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onLogin={handleEmailLogin}
        onBack={goBackToLanding}
        onSignup={() => router.push("/signup")}
      />
    );
  }

  // Welcome Back State (with saved user)
  if (state === "welcome-back" && lastUser) {
    return (
      <WelcomeBackView
        user={lastUser}
        loading={loading}
        biometricsInfo={biometricsInfo}
        onBiometricLogin={handleBiometricLogin}
        onPasswordLogin={showLoginForm}
        onSwitchUser={handleSwitchUser}
        getGreeting={getGreeting}
        formatLastLogin={formatLastLogin}
      />
    );
  }

  // First Time or Returning User State
  return (
    <LandingView
      state={state as "first-time" | "returning"}
      onLogin={showLoginForm}
      onBiometricLogin={handleBiometricLoginForReturning}
      onSignup={() => router.push("/signup")}
      lastUser={lastUser}
      canUseBiometrics={biometricsInfo.available && state === "returning" && lastUser !== null}
      biometricsType={biometricsInfo.type}
    />
  );
}
