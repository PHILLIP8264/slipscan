import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const styles = StyleSheet.create({
  signupLink: {
    marginTop: 24,
    padding: 12,
    alignItems: "center",
  },
  signupText: {
    color: "#007AFF",
    fontSize: 16,
    textDecorationLine: "underline",
  },
});

import BiometricLogin from "../assets/componets/ui/authui/BiometricLogin";
import Loginform from "../assets/componets/ui/authui/Loginform";

export default function Login() {
  const [showBiometric, setShowBiometric] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const router = useRouter();

  useEffect(() => {
    AsyncStorage.getItem("biometricsEnabled").then((enabled) => {
      if (enabled === "true") {
        setShowBiometric(true);
      } else {
        setShowLoginForm(true);
      }
    });
  }, []);

  const handleBiometricSuccess = () => {
    router.replace("/tabs");
  };

  const handleBiometricFallback = () => {
    setShowBiometric(false);
    setShowLoginForm(true);
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      {showBiometric && (
        <BiometricLogin
          onSuccess={handleBiometricSuccess}
          onFallback={handleBiometricFallback}
        />
      )}
      {showLoginForm && (
        <>
          <Loginform />
          <TouchableOpacity
            style={styles.signupLink}
            onPress={() => router.replace("/signup")}
          >
            <Text style={styles.signupText}>Would you rather sign up?</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
