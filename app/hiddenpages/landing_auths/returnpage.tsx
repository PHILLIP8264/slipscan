import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from "react";
import { ActivityIndicator, Alert, ImageBackground, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { authenticateWithBiometrics } from '../../../utils/biometrics';
import { getFontFamily } from '../../../utils/fonts';

type Props = {
    onLogin?: () => void;
    onSignInDifferent?: () => void;
    lastUserEmail?: string;
    lastUserName?: string;
    hadBiometrics?: boolean;
};

export default function ReturnPage({ onLogin, onSignInDifferent, lastUserName, hadBiometrics }: Props): React.ReactElement {
    const router = useRouter();
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    //console.log('🔄 ReturnPage props:', { lastUserName, hadBiometrics });
    //console.log('🔄 ReturnPage lastUserName type:', typeof lastUserName);
    //console.log('🔄 ReturnPage lastUserName truthy?', !!lastUserName);

    const handleLogin = async () => {
        console.log(hadBiometrics);
        if (hadBiometrics === true) {
            // User has biometrics enabled - trigger biometric authentication
            setIsAuthenticating(true);
            try {
                const result = await authenticateWithBiometrics(
                    "Sign in to The Ledger"
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
        } else if (hadBiometrics === false) {
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
        <ImageBackground 
            source={require('../../../assets/images/landingbackground.png')}
            style={styles.backgroundImage}
            resizeMode="cover"
        >
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <SafeAreaView style={styles.safe}>
                <View style={styles.overlay}>
                    <View style={styles.container}>
                        <Text style={styles.title}>Welcome Back</Text>
                        <View style={styles.titleLine} />
                        <Text style={styles.emailText}>
                            {lastUserName ? lastUserName : '[No name - undefined]'}
                        </Text>

                <TouchableOpacity 
                    style={[styles.button, styles.primary, isAuthenticating && styles.buttonDisabled]} 
                    onPress={handleLogin} 
                    activeOpacity={0.8}
                    disabled={isAuthenticating}
                >
                    {isAuthenticating ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {hadBiometrics && <Ionicons name="finger-print" size={20} color="#000" style={{ marginRight: 8 }} />}
                            <Text style={styles.buttonText}>
                                {hadBiometrics ? 'Sign In with Biometrics' : 'Sign In'}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, styles.secondary]} onPress={handleSignInDifferent} activeOpacity={0.8}>
                    <Text style={styles.buttonText}>Sign in with a different account</Text>
                </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    safe: {
        flex: 1,
        backgroundColor: "transparent",
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    container: {
        flex: 1,
        padding: 24,
        justifyContent: "center",
        alignItems: "center",
    },
    title: {
        fontSize: 45,
        marginBottom: 10,
        fontFamily: getFontFamily('semiBold'),
        color: "#ffffff",
        textAlign: "center",
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: {width: -1, height: 1},
        textShadowRadius: 10,
    },
    titleLine: {
        width: '70%',
        height: 4,
        backgroundColor: '#ffffff',
        borderRadius: 5,
        marginBottom: 20,
        alignSelf: 'center',
        shadowColor: '#A3E635',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 4,
    },
    emailText: {
        fontSize: 25,
        fontFamily: getFontFamily('semiBold'),
        color: "#ffffff",
        marginBottom: 20,
        textAlign: "center",
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: {width: -1, height: 1},
        textShadowRadius: 5,
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
        backgroundColor: "#A3E635",
        
    },
    secondary: {
        backgroundColor: "#22D3EE",
    },
    buttonDisabled: {
        backgroundColor: "#a0a0a0",
        opacity: 0.7,
    },
    buttonText: {
        color: "#000",
        fontSize: 16,
        fontFamily: getFontFamily('extraBold'),
    },
});