import { Stack } from "expo-router";
import React, { useEffect } from "react";
import ImageManager from "../utils/ImageManager";
import { AuthProvider } from "./contexts/AuthContext";

export default function RootLayout() {
  
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

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}