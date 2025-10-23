import { useRouter } from 'expo-router';
import React, { useState } from "react";
import { ActivityIndicator, Alert, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { authenticateWithBiometrics } from '../../../utils/biometrics';

type Props = {
    onLogin?: () => void;
    onSignInDifferent?: () => void;
    lastUserEmail?: string;
    lastUserName?: string;
    hadBiometrics?: boolean;
};

export default function ReturnPage({ onLogin, onSignInDifferent, lastUserEmail, lastUserName, hadBiometrics }: Props): React.ReactElement {
    const router = useRouter();
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    const handleLogin = async () => {
        console.log(hadBiometrics);
        if (hadBiometrics) {
            // User has biometrics enabled - trigger biometric authentication
            setIsAuthenticating(true);
            try {
                const result = await authenticateWithBiometrics(
                    "Sign in to SlipScan"
                );
                
                if (result.success) {
                    // Biometric authentication successful - go to main app
                    router.replace('/tabs');
                } else {
                    // Biometric authentication failed - show error and offer fallback
                    Alert.alert(
                        'Authentication Failed',
                        result.error || 'Biometric authentication failed. Would you like to sign in with your password instead?',
                        [
                            {
                                text: 'Try Again',
                                onPress: () => handleLogin(), // Retry biometric
                            },
                            {
                                text: 'Use Password',
                                onPress: () => {
                                    if (onLogin) onLogin();
                                },
                            },
                        ]
                    );
                }
            } catch (error) {
                console.error('Biometric authentication error:', error);
                Alert.alert('Error', 'An unexpected error occurred. Please try signing in with your password.');
                if (onLogin) onLogin();
            } finally {
                setIsAuthenticating(false);
            }
        } else {
            // No biometrics - use regular login flow
            if (onLogin) return onLogin();
            Alert.alert("Login", "Login button pressed");
            console.log("Login pressed");
        }
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
                {lastUserName && lastUserName !== lastUserEmail && (
                    <Text style={styles.nameText}>{lastUserName}</Text>
                )}
                {hadBiometrics && (
                    <Text style={styles.biometricText}>🔒 Biometric login enabled</Text>
                )}

                <TouchableOpacity 
                    style={[styles.button, styles.primary, isAuthenticating && styles.buttonDisabled]} 
                    onPress={handleLogin} 
                    activeOpacity={0.8}
                    disabled={isAuthenticating}
                >
                    {isAuthenticating ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>
                            {hadBiometrics ? '🔓 Sign In with Biometrics' : 'Sign In'}
                        </Text>
                    )}
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
    nameText: {
        fontSize: 18,
        color: "#333",
        marginBottom: 8,
        textAlign: "center",
        fontWeight: "500",
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
    buttonDisabled: {
        backgroundColor: "#a0a0a0",
        opacity: 0.7,
    },
    buttonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "500",
    },
});