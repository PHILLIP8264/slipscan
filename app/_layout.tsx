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
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
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
        if (current !== "/landing") {
          router.replace("/landing");
        }
      }
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return <Slot />;
}
