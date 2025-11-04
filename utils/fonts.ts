// utils/fonts.ts
import {
    MerriweatherSans_300Light,
    MerriweatherSans_400Regular,
    MerriweatherSans_500Medium,
    MerriweatherSans_600SemiBold,
    MerriweatherSans_700Bold,
    MerriweatherSans_800ExtraBold,
} from '@expo-google-fonts/merriweather-sans';
import { useFonts } from 'expo-font';

export const useAppFonts = () => {
  const [fontsLoaded] = useFonts({
    MerriweatherSans_300Light,
    MerriweatherSans_400Regular,
    MerriweatherSans_500Medium,
    MerriweatherSans_600SemiBold,
    MerriweatherSans_700Bold,
    MerriweatherSans_800ExtraBold,
  });

  return fontsLoaded;
};

// Font family constants for consistent usage
export const FontFamily = {
  light: 'MerriweatherSans_300Light',
  regular: 'MerriweatherSans_400Regular',
  medium: 'MerriweatherSans_500Medium',
  semiBold: 'MerriweatherSans_600SemiBold',
  bold: 'MerriweatherSans_700Bold',
  extraBold: 'MerriweatherSans_800ExtraBold',
} as const;

// Helper function to get font family based on weight
export const getFontFamily = (weight: 'light' | 'regular' | 'medium' | 'semiBold' | 'bold' | 'extraBold' = 'regular') => {
  return FontFamily[weight];
};