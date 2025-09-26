import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Button,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function AskBiometrics() {
  const router = useRouter();

  const handleBiometricAuth = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !isEnrolled) {
      Alert.alert(
        "Biometrics not available",
        "Your device does not support biometrics or none are enrolled."
      );
      router.replace("/tabs");
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Authenticate with Fingerprint or Face ID",
      fallbackLabel: "Use Password",
      disableDeviceFallback: false,
    });
    if (result.success) {
      try {
        await AsyncStorage.setItem("biometricsEnabled", "true");
      } catch (e) {
        console.error("Failed to save biometrics preference", e);
      }
      router.replace("/tabs");
    } else {
      Alert.alert(
        "Authentication Failed",
        "You can enable biometrics later in settings."
      );
      router.replace("/tabs");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Enable Fingerprint or Face ID</Text>
      <TouchableOpacity onPress={() => router.replace("/tabs")}>
        <Text style={styles.text}>Skip</Text>
      </TouchableOpacity>
      <Button title="Authenticate" onPress={handleBiometricAuth} />
    </View>
  );
}

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
