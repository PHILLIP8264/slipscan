import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";

// AsyncStorage key for biometrics preference (matches existing AskBiometrics component)
export const BIOMETRICS_KEY = "biometricsEnabled";

/**
 * Check if biometrics is enabled in user preferences
 */
export const isBiometricsEnabled = async (): Promise<boolean> => {
  try {
    const storedValue = await AsyncStorage.getItem(BIOMETRICS_KEY);
    return storedValue === "true";
  } catch (error) {
    console.error("Error checking biometrics preference:", error);
    return false;
  }
};

/**
 * Enable or disable biometrics in user preferences
 */
export const setBiometricsEnabled = async (enabled: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem(BIOMETRICS_KEY, enabled.toString());
  } catch (error) {
    console.error("Error setting biometrics preference:", error);
    throw error;
  }
};

/**
 * Check if biometric authentication is available on the device
 */
export const isBiometricsAvailable = async (): Promise<{
  available: boolean;
  type: string;
  hasHardware: boolean;
  isEnrolled: boolean;
}> => {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes =
      await LocalAuthentication.supportedAuthenticationTypesAsync();

    let type = "Biometrics";
    if (
      supportedTypes.includes(
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
      )
    ) {
      type = "Face ID";
    } else if (
      supportedTypes.includes(
        LocalAuthentication.AuthenticationType.FINGERPRINT
      )
    ) {
      type = "Fingerprint";
    } else if (
      supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)
    ) {
      type = "Iris";
    }

    return {
      available: hasHardware && isEnrolled,
      type,
      hasHardware,
      isEnrolled,
    };
  } catch (error) {
    console.error("Error checking biometrics availability:", error);
    return {
      available: false,
      type: "Biometrics",
      hasHardware: false,
      isEnrolled: false,
    };
  }
};

/**
 * Authenticate using biometrics
 */
export const authenticateWithBiometrics = async (
  promptMessage?: string
): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    const biometricsInfo = await isBiometricsAvailable();

    if (!biometricsInfo.available) {
      return {
        success: false,
        error: "Biometric authentication is not available",
      };
    }

    const userPreference = await isBiometricsEnabled();
    if (!userPreference) {
      return {
        success: false,
        error: "Biometric authentication is disabled in settings",
      };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage:
        promptMessage || `Authenticate with ${biometricsInfo.type}`,
      fallbackLabel: "Use passcode",
      cancelLabel: "Cancel",
    });

    return {
      success: result.success,
      error: result.success ? undefined : "Authentication failed",
    };
  } catch (error) {
    console.error("Biometric authentication error:", error);
    return {
      success: false,
      error: "Authentication error occurred",
    };
  }
};

/**
 * Check if user should be prompted for biometric authentication
 * (both available and enabled)
 */
export const shouldUseBiometrics = async (): Promise<boolean> => {
  try {
    const [available, enabled] = await Promise.all([
      isBiometricsAvailable(),
      isBiometricsEnabled(),
    ]);

    return available.available && enabled;
  } catch (error) {
    console.error("Error checking biometrics status:", error);
    return false;
  }
};
