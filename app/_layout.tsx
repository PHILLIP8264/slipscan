import { Stack } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useAppFonts } from "../utils/fonts";
import ImageManager from "../utils/ImageManager";
import { AuthProvider } from "./contexts/AuthContext";

export default function RootLayout() {
  const fontsLoaded = useAppFonts();
  
  useEffect(() => {
    // Initialize ImageManager when app starts
    const initializeImageManager = async () => {
      try {
        await ImageManager.initialize();
        console.log('✅ ImageManager initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize ImageManager:', error);
      }
    };
    
    initializeImageManager();
  }, []);

  // Show loading screen while fonts are loading
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}