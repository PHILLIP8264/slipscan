import { useRouter } from "expo-router";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithPhoneNumber,
} from "firebase/auth";
import React, { useRef, useState } from "react";
import { Alert, Button, StyleSheet, Text, TextInput, View } from "react-native";
import { auth } from "../../../../firebaseConfig";

export default function Signupform() {
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [confirmation, setConfirmation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const recaptchaVerifier = useRef<any>(null);
  const router = useRouter();

  const handleSignup = async () => {
    setLoading(true);
    try {
      if (mode === "email") {
        await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(auth.currentUser!);

        router.replace({
          pathname: "/verifycode",
          params: { emailOrPhone: email },
        });
      } else {
        // Phone signup
        const confirmationResult = await signInWithPhoneNumber(auth, phone);
        setConfirmation(confirmationResult);
        router.replace({
          pathname: "/verifycode",
          params: { emailOrPhone: phone },
        });
      }
    } catch (error: any) {
      Alert.alert("Signup Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySms = async () => {
    setLoading(true);
    try {
      await confirmation.confirm(smsCode);
    } catch (error: any) {
      Alert.alert("Verification Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Signup</Text>
      <View style={styles.toggleRow}>
        <Button
          title="Email"
          onPress={() => setMode("email")}
          color={mode === "email" ? "#007AFF" : "#ccc"}
        />
        <Button
          title="Phone"
          onPress={() => setMode("phone")}
          color={mode === "phone" ? "#007AFF" : "#ccc"}
        />
      </View>
      {mode === "email" ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Button
            title={loading ? "Signing up..." : "Signup"}
            onPress={handleSignup}
            disabled={loading}
          />
        </>
      ) : confirmation ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="SMS Code"
            value={smsCode}
            onChangeText={setSmsCode}
            keyboardType="number-pad"
          />
          <Button
            title={loading ? "Verifying..." : "Verify Code"}
            onPress={handleVerifySms}
            disabled={loading}
          />
        </>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="Phone Number (+1234567890)"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <Button
            title={loading ? "Sending code..." : "Send Code"}
            onPress={handleSignup}
            disabled={loading}
          />
        </>
      )}
    </View>
  );
}

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
    marginBottom: 24,
  },
  toggleRow: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 8,
  },
  input: {
    width: "100%",
    maxWidth: 400,
    height: 48,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    fontSize: 16,
  },
});
