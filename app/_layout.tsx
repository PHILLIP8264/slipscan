// IMPORTANT: These polyfills must be imported FIRST
import "react-native-get-random-values";
// Polyfill for buffer
global.Buffer = global.Buffer || require("buffer").Buffer;

// IMPORTANT: These polyfills must be imported FIRST
import "react-native-get-random-values";
// Polyfill for buffer
global.Buffer = global.Buffer || require("buffer").Buffer;

import { Slot, useRouter, useSegments } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { auth } from "../firebaseConfig";

export default function RootLayout() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Start Firebase auth listener
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      handleAuthStateChange(firebaseUser);
    });

    return unsubscribe;
  }, []);

  const handleAuthStateChange = (firebaseUser: User | null) => {
    const current = "/" + segments.join("/");

    if (firebaseUser) {
      // If email user, only allow access to /tabs if verified
      if (
        (firebaseUser.providerData.some((p) => p.providerId === "password") &&
          firebaseUser.emailVerified) ||
        firebaseUser.providerData.some((p) => p.providerId === "phone")
      ) {
        if (!current.startsWith("/tabs")) {
          router.replace("/tabs");
        }
      } else {
        // Not verified yet, stay on or go to /verifycode
        if (current !== "/verifycode") {
          router.replace("/verifycode");
        }
      }
    } else {
      // No user, go to landing (landing will handle welcome back logic)
      if (current !== "/landing") {
        router.replace("/landing");
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
