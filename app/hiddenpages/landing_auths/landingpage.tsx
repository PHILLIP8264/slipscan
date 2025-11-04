import React from "react";
import { ImageBackground, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getFontFamily } from "../../../utils/fonts";

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
        <ImageBackground 
            source={require('../../../assets/images/landingbackground.png')}
            style={styles.backgroundImage}
            resizeMode="cover"
        >
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <Text style={styles.title}>Welcome to{'\n'}The Ledger</Text>

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
            </View>
        </ImageBackground>
    );
};

export default LandingPage;

const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)', // Semi-transparent overlay for text readability
    },
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
    },
    title: {
        fontSize: 45,
        marginBottom: 25,
        fontFamily: getFontFamily('semiBold'),
        color: "#ffffff",
        textAlign: "center",
        lineHeight: 80,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: {width: -1, height: 1},
        textShadowRadius: 10,
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
        backgroundColor: "#A3E635",
    },
    signUpButton: {
        backgroundColor: "#22D3EE",
    },
    buttonText: {
        color: "#000000",
        fontSize: 19,
        fontFamily: getFontFamily('extraBold'),
    },
});