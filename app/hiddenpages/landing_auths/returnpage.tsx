import React from "react";
import { Alert, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
    onLogin?: () => void;
    onSignInDifferent?: () => void;
    lastUserEmail?: string;
    hadBiometrics?: boolean;
};

export default function ReturnPage({ onLogin, onSignInDifferent, lastUserEmail, hadBiometrics }: Props): React.ReactElement {
    const handleLogin = () => {
        if (onLogin) return onLogin();
        Alert.alert("Login", "Loggin button pressed");
        console.log("Loggin pressed");
    };

    const handleSignInDifferent = () => {
        if (onSignInDifferent) return onSignInDifferent();
        Alert.alert("Sign In", "Sign in with a different account pressed");
        console.log("Sign in with a different account pressed");
    };

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.container}>
                <Text style={styles.title}>Welcome Back</Text>
                {lastUserEmail && (
                    <Text style={styles.emailText}>{lastUserEmail}</Text>
                )}
                {hadBiometrics && (
                    <Text style={styles.biometricText}>🔒 Biometric login enabled</Text>
                )}

                <TouchableOpacity style={[styles.button, styles.primary]} onPress={handleLogin} activeOpacity={0.8}>
                    <Text style={styles.buttonText}>Sign In</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, styles.secondary]} onPress={handleSignInDifferent} activeOpacity={0.8}>
                    <Text style={styles.buttonText}>Sign in with a different account</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: "#fff",
    },
    container: {
        flex: 1,
        padding: 24,
        justifyContent: "center",
        alignItems: "center",
    },
    title: {
        fontSize: 28,
        marginBottom: 16,
        fontWeight: "600",
    },
    emailText: {
        fontSize: 16,
        color: "#666",
        marginBottom: 8,
        textAlign: "center",
    },
    biometricText: {
        fontSize: 14,
        color: "#007AFF",
        marginBottom: 24,
        textAlign: "center",
    },
    button: {
        width: "100%",
        paddingVertical: 14,
        paddingHorizontal: 18,
        borderRadius: 8,
        marginVertical: 8,
        alignItems: "center",
    },
    primary: {
        backgroundColor: "#1e90ff",
    },
    secondary: {
        backgroundColor: "#6c757d",
    },
    buttonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "500",
    },
});