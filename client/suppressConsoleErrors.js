/**
 * LogBox Configuration for Known Cosmetic Warnings
 * 
 * This module uses React Native's LogBox to suppress known cosmetic warnings
 * from third-party libraries during development. These warnings do not affect
 * app functionality.
 * 
 * Known suppressed warnings:
 * - "Unexpected text node: . A text node cannot be a child of a <View>"
 *   Source: react-native-web View validation
 *   Cause: Unknown third-party library (possibly expo-glass-effect or expo-blur)
 *   Impact: None - purely cosmetic warning
 */

import { LogBox } from 'react-native';

if (__DEV__) {
  LogBox.ignoreLogs([
    'Unexpected text node: . A text node cannot be a child of a <View>',
  ]);
}
