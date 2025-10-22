import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
    onLogin?: () => void;
    onSignUp?: () => void;
};

const LandingPage: React.FC<Props> = ({ onLogin, onSignUp }) => {
    const handleLogin = () => {
        if (onLogin) onLogin();
        else console.log("Login pressed");
    };

    const handleSignUp = () => {
        if (onSignUp) onSignUp();
        else console.log("Sign Up pressed");
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome to me</Text>

            <TouchableOpacity
                style={[styles.button, styles.loginButton]}
                activeOpacity={0.7}
                onPress={handleLogin}
            >
                <Text style={styles.buttonText}>Login</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.button, styles.signUpButton]}
                activeOpacity={0.7}
                onPress={handleSignUp}
            >
                <Text style={styles.buttonText}>Get Started</Text>
            </TouchableOpacity>
        </View>
    );
};

export default LandingPage;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
    },
    title: {
        fontSize: 28,
        marginBottom: 32,
        fontWeight: "600",
    },
    button: {
        width: "100%",
        maxWidth: 360,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: "center",
        marginVertical: 8,
    },
    loginButton: {
        backgroundColor: "#2b6ef6",
    },
    signUpButton: {
        backgroundColor: "#34c759",
    },
    buttonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
});