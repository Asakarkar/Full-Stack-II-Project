import React from "react";
import { StyleProp, StyleSheet, Text as NativeText, TextProps, TextStyle } from "react-native";

function fontForStyle(style: StyleProp<TextStyle>): string {
  const flattened = StyleSheet.flatten(style);
  if (flattened?.fontFamily) return flattened.fontFamily;
  const rawWeight = flattened?.fontWeight ?? 400;
  const weight = rawWeight === "bold" ? 700 : rawWeight === "normal" ? 400 : Number(rawWeight);
  if (weight >= 800) return "PlusJakartaSans_800ExtraBold";
  if (weight >= 700) return "PlusJakartaSans_700Bold";
  if (weight >= 600) return "PlusJakartaSans_600SemiBold";
  if (weight >= 500) return "PlusJakartaSans_500Medium";
  return "PlusJakartaSans_400Regular";
}

export function AppText({ style, ...props }: TextProps) {
  return <NativeText {...props} style={[{ fontFamily: fontForStyle(style) }, style]} />;
}
