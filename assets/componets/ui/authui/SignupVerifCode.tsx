import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { reload } from "firebase/auth";
import React, { useState } from "react";
import { Alert, Button, StyleSheet, Text, View } from "react-native";
import { auth } from "../../../../firebaseConfig";
import AskBiometrics from "./AskBiometrics";

interface SignupVerifCodeProps {
  email: string;
}

const SignupVerifCode: React.FC<SignupVerifCodeProps> = ({ email }) => {
  const [checking, setChecking] = useState(false);
  const [biometricsPrompt, setBiometricsPrompt] = useState(false);
  const router = useRouter();

  const handleCheckVerification = async () => {
    setChecking(true);
    try {
      await reload(auth.currentUser!);
      if (auth.currentUser?.emailVerified) {
        await AsyncStorage.setItem("hasLoggedIn", "true");
        Alert.alert("Email Verified!", "Your account is now active.");
        setBiometricsPrompt(true);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setChecking(false);
    }
  };

  if (biometricsPrompt) {
    return (
      <View style={styles.container}>
        <AskBiometrics />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Verify Your Email</Text>
      <Text style={styles.info}>A verification email was sent to:</Text>
      <Text style={styles.info}>Please check Spam</Text>
      <Text style={styles.email}>{email}</Text>
      <Button
        title={checking ? "Checking..." : "I have verified my email"}
        onPress={handleCheckVerification}
        disabled={checking}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
  },
  heading: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  info: {
    fontSize: 16,
    marginBottom: 8,
  },
  email: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 24,
  },
});

export default SignupVerifCode;
