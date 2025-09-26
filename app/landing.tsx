import Signupform from "@/assets/componets/ui/authui/Signupform";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Landing() {
  const [showSignup, setShowSignup] = useState(false);
  const [page, setPage] = useState<"landing" | "signup" | "login">("landing");

  const router = useRouter();
  useEffect(() => {
    // Check if the device has logged in before
    const checkFirstLogin = async () => {
      const hasLoggedIn = await AsyncStorage.getItem("hasLoggedIn");
      setShowSignup(!hasLoggedIn);
    };
    checkFirstLogin();
  }, []);

  const handleLogin = () => {
    router.push("/login");
  };

  const handleSignup = () => {
    router.push("/signup");
  };

  if (page === "signup") {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setPage("landing")}
        >
          <Text style={styles.backText}>{"< Back"}</Text>
        </TouchableOpacity>
        <Signupform />
      </View>
    );
  }

  if (page === "login") {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setPage("landing")}
        >
          <Text style={styles.backText}>{"< Back"}</Text>
        </TouchableOpacity>
        <Signupform />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Welcome to SlipScan</Text>
      <TouchableOpacity onPress={handleLogin}>
        <Text>Login</Text>
      </TouchableOpacity>
      {!showSignup && (
        <TouchableOpacity style={styles.signupLink} onPress={handleSignup}>
          <Text style={styles.signupText}>Would you rather sign up?</Text>
        </TouchableOpacity>
      )}
      {showSignup && (
        <TouchableOpacity onPress={handleSignup}>
          <Text>Signup</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 16,
    marginLeft: 8,
    padding: 8,
  },
  backText: {
    fontSize: 18,
    color: "#007AFF",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
  },
  heading: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 32,
  },
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
