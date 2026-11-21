import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { Provider } from "react-redux";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { JetBrainsMono_400Regular, JetBrainsMono_700Bold } from "@expo-google-fonts/jetbrains-mono";
import { useFonts } from "expo-font";
import { store, useAppDispatch, useAppSelector } from "@/store";
import { restoreSession } from "@/store/authSlice";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Sparkles } from "lucide-react-native";

function AppNavigation() {
  const dispatch = useAppDispatch();
  const { initialized, user } = useAppSelector((state) => state.auth);
  const { colors, mode } = useTheme();

  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);

  if (!initialized) return <BootSplash />;

  return (
    <>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: "fade" }}>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={!!user}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="profile-edit" />
          <Stack.Screen name="teacher/student/[studentId]" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

function BootSplash() {
  const { colors } = useTheme();
  return <View style={[styles.splash, { backgroundColor: colors.background }]}>
    <Animated.View entering={FadeIn.duration(450)} style={[styles.logoMark, { backgroundColor: colors.primarySoft }]}><Sparkles size={30} color={colors.primary} /></Animated.View>
    <Animated.Text entering={FadeInDown.duration(420).delay(90)} style={[styles.logoText, { color: colors.text }]}>RankForge</Animated.Text>
    <Animated.Text entering={FadeIn.duration(350).delay(200)} style={[styles.logoTagline, { color: colors.muted }]}>Make every learning win count.</Animated.Text>
  </View>;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_700Bold,
  });
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <ThemeProvider>
          {fontsLoaded ? <AppNavigation /> : <BootSplash />}
        </ThemeProvider>
      </SafeAreaProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  logoMark: { width: 66, height: 66, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  logoText: { fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 27, letterSpacing: -0.5 },
  logoTagline: { fontFamily: "PlusJakartaSans_500Medium", fontSize: 12 },
});
