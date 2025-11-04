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
  promptMessage?: string,
  options?: { ignorePreference?: boolean }
): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    const biometricsInfo = await isBiometricsAvailable();

    console.log('Biometrics Info:', biometricsInfo); // Debug log

    if (!biometricsInfo.hasHardware) {
      return {
        success: false,
        error: "This device doesn't support biometric authentication",
      };
    }

    if (!biometricsInfo.isEnrolled) {
      return {
        success: false,
        error: "No biometric credentials are enrolled. Please set up biometric authentication in your device settings first.",
      };
    }

    // If caller explicitly requests to ignore the stored app preference
    // (for example when the user is enabling biometrics from settings),
    // allow proceeding to the device prompt even if stored preference is false.
    const userPreference = await isBiometricsEnabled();
    if (!options?.ignorePreference && !userPreference) {
      return {
        success: false,
        error: "Biometric authentication is disabled in app settings",
      };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage:
        promptMessage || `Authenticate with ${biometricsInfo.type}`,
      fallbackLabel: "Use passcode",
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
    });

    console.log('Auth result:', result); // Debug log

    if (result.success) {
      return {
        success: true,
      };
    } else {
      let errorMessage = "Authentication failed";
      
      // Handle different error types based on the result.error string
      const errorString = result.error;
      console.log('Biometric error:', errorString); // Debug log
      
      if (errorString && typeof errorString === 'string') {
        if (errorString.includes('UserCancel') || errorString.includes('cancelled')) {
          errorMessage = "Authentication was cancelled";
        } else if (errorString.includes('NotEnrolled') || errorString.includes('enrolled')) {
          errorMessage = "No biometric credentials are enrolled. Please set up biometric authentication in your device settings.";
        } else if (errorString.includes('PasscodeNotSet') || errorString.includes('passcode')) {
          errorMessage = "Device passcode is not set. Please set up a passcode first.";
        } else if (errorString.includes('BiometricUnavailable') || errorString.includes('unavailable')) {
          errorMessage = "Biometric authentication is temporarily unavailable";
        }
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  } catch (error) {
    console.error("Biometric authentication error:", error);
    return {
      success: false,
      error: "Authentication error occurred",
    };
  }
};

/**
 * Enable biometrics for the user (setup flow)
 */
export const enableBiometrics = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    // Check if biometrics hardware is available
    const biometricsInfo = await isBiometricsAvailable();
    
    if (!biometricsInfo.available) {
      return {
        success: false,
        error: "This device doesn't support biometric authentication"
      };
    }

    if (!biometricsInfo.isEnrolled) {
      return {
        success: false,
        error: "No biometric credentials are enrolled. Please set up biometric authentication in your device settings first."
      };
    }

    // Test biometric authentication
    const authResult = await LocalAuthentication.authenticateAsync({
      promptMessage: `Set up ${biometricsInfo.type} for SlipScan`,
      fallbackLabel: "Use passcode",
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
    });

    if (authResult.success) {
      // Save preference that biometrics is enabled
      await setBiometricsEnabled(true);
      return { success: true };
    } else {
      let errorMessage = "Biometric setup was cancelled";
      
      const errorString = authResult.error;
      if (errorString && typeof errorString === 'string') {
        if (errorString.includes('UserCancel') || errorString.includes('cancelled')) {
          errorMessage = "Setup was cancelled";
        } else {
          errorMessage = "Biometric authentication failed";
        }
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  } catch (error) {
    console.error("Enable biometrics error:", error);
    return {
      success: false,
      error: "Failed to enable biometrics"
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
