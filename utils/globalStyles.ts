// utils/globalStyles.ts
import { StyleSheet, TextStyle } from 'react-native';
import { getFontFamily } from './fonts';

// Global text styles with Merriweather Sans font family
export const globalTextStyles = StyleSheet.create({
  // Headers
  h1: {
    fontSize: 32,
    fontFamily: getFontFamily('bold'),
    lineHeight: 40,
  } as TextStyle,
  
  h2: {
    fontSize: 28,
    fontFamily: getFontFamily('bold'),
    lineHeight: 36,
  } as TextStyle,
  
  h3: {
    fontSize: 24,
    fontFamily: getFontFamily('semiBold'),
    lineHeight: 32,
  } as TextStyle,
  
  h4: {
    fontSize: 20,
    fontFamily: getFontFamily('semiBold'),
    lineHeight: 28,
  } as TextStyle,
  
  h5: {
    fontSize: 18,
    fontFamily: getFontFamily('medium'),
    lineHeight: 24,
  } as TextStyle,
  
  h6: {
    fontSize: 16,
    fontFamily: getFontFamily('medium'),
    lineHeight: 22,
  } as TextStyle,
  
  // Body text
  bodyLarge: {
    fontSize: 16,
    fontFamily: getFontFamily('regular'),
    lineHeight: 24,
  } as TextStyle,
  
  body: {
    fontSize: 14,
    fontFamily: getFontFamily('regular'),
    lineHeight: 20,
  } as TextStyle,
  
  bodySmall: {
    fontSize: 12,
    fontFamily: getFontFamily('regular'),
    lineHeight: 18,
  } as TextStyle,
  
  // Special text styles
  caption: {
    fontSize: 12,
    fontFamily: getFontFamily('medium'),
    lineHeight: 16,
  } as TextStyle,
  
  button: {
    fontSize: 16,
    fontFamily: getFontFamily('semiBold'),
    lineHeight: 22,
  } as TextStyle,
  
  label: {
    fontSize: 14,
    fontFamily: getFontFamily('medium'),
    lineHeight: 20,
  } as TextStyle,
  
  // Weight variations
  light: {
    fontFamily: getFontFamily('light'),
  } as TextStyle,
  
  regular: {
    fontFamily: getFontFamily('regular'),
  } as TextStyle,
  
  medium: {
    fontFamily: getFontFamily('medium'),
  } as TextStyle,
  
  semiBold: {
    fontFamily: getFontFamily('semiBold'),
  } as TextStyle,
  
  bold: {
    fontFamily: getFontFamily('bold'),
  } as TextStyle,
  
  extraBold: {
    fontFamily: getFontFamily('extraBold'),
  } as TextStyle,
});

// Helper function to combine global text styles with custom styles
export const combineTextStyles = (...styles: (TextStyle | undefined)[]) => {
  return StyleSheet.flatten(styles.filter(Boolean));
};