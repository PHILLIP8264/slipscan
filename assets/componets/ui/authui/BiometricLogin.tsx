import React from "react";
import { View, Text, Button, StyleSheet, Alert } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";

interface BiometricLoginProps {
  onSuccess: () => void;
  onFallback: () => void;
}

const BiometricLogin: React.FC<BiometricLoginProps> = ({ onSuccess, onFallback }) => {
  const handleBiometricAuth = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !isEnrolled) {
      onFallback();
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Authenticate with Fingerprint or Face ID",
      fallbackLabel: "Use Password",
      disableDeviceFallback: false,
    });
    if (result.success) {
      onSuccess();
    } else {
      onFallback();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Login with Biometrics</Text>
      <Button title="Authenticate" onPress={handleBiometricAuth} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginVertical: 16,
  },
  text: {
    fontSize: 18,
    marginBottom: 12,
  },
});

export default BiometricLogin;
