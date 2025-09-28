import { useRouter } from "expo-router";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithPhoneNumber,
} from "firebase/auth";
import React, { useState } from "react";
import { Alert, Button, StyleSheet, Text, TextInput, View } from "react-native";
import { auth } from "../../../../firebaseConfig";
import { createUser } from "../../../../utils/CRUD/usercrud";
import { saveLastLoggedInUser } from "../../../../utils/userPersistence";

export default function Signupform() {
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [confirmation, setConfirmation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async () => {
    if (mode === "email" && password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }
    if (!username.trim()) {
      Alert.alert("Error", "Username is required.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "email") {
        const cred = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        await sendEmailVerification(auth.currentUser!);

        // Store user in localdb with correct NoSQL format
        const newUser = await createUser({
          name: username,
          email: email,
          settings: JSON.stringify({
            theme: "light",
            notifications: true,
            firebaseUid: cred.user.uid,
          }),
        });

        console.log("Created user in localdb:", newUser);
        console.log("Signup - Firebase UID:", cred.user.uid);
        console.log("Signup - Email:", email);
        console.log("Signup - Username:", username);

        // Save user info for welcome back feature
        await saveLastLoggedInUser({
          userId: cred.user.uid,
          name: username,
          email: email,
          loginMethod: "email",
          loginDate: new Date().toISOString(),
        });

        console.log("Signup - User persistence saved successfully");

        router.replace({
          pathname: "/verifycode",
          params: { emailOrPhone: email },
        });
      } else {
        // Phone signup
        const confirmationResult = await signInWithPhoneNumber(auth, phone);
        setConfirmation(confirmationResult);

        // Store user in localdb with phone as email placeholder
        // We'll update this after phone verification is complete
        const newUser = await createUser({
          name: username,
          email: phone, // Using phone as email placeholder until verified
          settings: JSON.stringify({
            theme: "light",
            notifications: true,
            phone: phone,
            loginMethod: "phone",
          }),
        });

        console.log("Created user in localdb for phone signup:", newUser);

        router.replace({
          pathname: "/verifycode",
          params: { emailOrPhone: phone },
        });
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      Alert.alert("Signup Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySms = async () => {
    setLoading(true);
    try {
      const result = await confirmation.confirm(smsCode);

      // After successful phone verification, save user info for welcome back
      await saveLastLoggedInUser({
        userId: result.user.uid,
        name: username,
        email: phone, // Using phone as email for phone signup
        loginMethod: "phone",
        loginDate: new Date().toISOString(),
      });

      Alert.alert("Success", "Phone number verified successfully!");
      router.replace("/tabs"); // Navigate to main app
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
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
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
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
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
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
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
