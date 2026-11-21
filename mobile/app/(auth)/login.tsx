import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";
import { Link, router } from "expo-router";
import { Eye, EyeOff, Sparkles } from "lucide-react-native";
import { Screen, Field, Button } from "@/components/ui";
import { useTheme } from "@/context/ThemeContext";
import { useAppDispatch } from "@/store";
import { login } from "@/store/authSlice";
import { getErrorMessage } from "@/lib/apiConfig";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { AppText as Text } from "@/components/AppText";
import { getEmailValidationError } from "@/lib/emailValidation";

export default function LoginScreen() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setError("");
    const validationError = getEmailValidationError(email);
    if (validationError) {
      setEmailError(validationError);
      return;
    }
    setEmailError("");
    setSubmitting(true);
    try {
      await dispatch(login({ email: email.trim(), password })).unwrap();
      router.replace("/(tabs)");
    } catch (reason) {
      setError(getErrorMessage(reason, "Check your details and try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
        <Animated.View entering={Platform.OS === "web" ? undefined : FadeIn.duration(500)} style={[styles.brandMark, { backgroundColor: colors.primarySoft }]}>
          <Sparkles size={26} color={colors.primary} />
        </Animated.View>
        <Animated.View entering={Platform.OS === "web" ? undefined : FadeInDown.duration(420).delay(80)} style={{ gap: 8 }}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>RANKFORGE</Text>
          <Text style={[styles.title, { color: colors.text }]}>Welcome back.</Text>
          <Text style={[styles.copy, { color: colors.muted }]}>Your next breakthrough starts with one sign in.</Text>
        </Animated.View>
        <Animated.View entering={Platform.OS === "web" ? undefined : FadeInDown.duration(420).delay(150)} style={styles.form}>
          <Field
            label="Email address"
            placeholder="you@school.edu"
            autoCapitalize="none"
            keyboardType="email-address"
            maxLength={254}
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setEmailError("");
            }}
            accessibilityHint={emailError || undefined}
          />
          {!!emailError && <Text accessibilityRole="alert" style={[styles.error, { color: colors.danger }]}>{emailError}</Text>}
          <Field
            label="Password"
            placeholder="Enter your password"
            secureTextEntry={!passwordVisible}
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={submit}
            trailing={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={passwordVisible ? "Hide password" : "Show password"}
                accessibilityState={{ expanded: passwordVisible }}
                hitSlop={6}
                onPress={() => setPasswordVisible((visible) => !visible)}
                style={styles.passwordToggle}
              >
                {passwordVisible ? <EyeOff size={18} color={colors.muted} /> : <Eye size={18} color={colors.muted} />}
              </Pressable>
            }
          />
          {!!error && <Text accessibilityRole="alert" style={[styles.error, { color: colors.danger }]}>{error}</Text>}
          <Button title="Sign in" onPress={submit} loading={submitting} disabled={!email.trim() || !password || submitting} />
        </Animated.View>
        <View style={styles.footer}>
          <Text style={{ color: colors.muted }}>New to RankForge? </Text>
          <Link href="/(auth)/register" asChild>
            <Pressable hitSlop={10}>
              <Text style={{ color: colors.primary, fontWeight: "700" }}>Create account</Text>
            </Pressable>
          </Link>
        </View>
        <Text style={[styles.helper, { color: colors.muted }]}>A focused space to learn, grow, and lead.</Text>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", gap: 28, paddingVertical: 26 },
  brandMark: { width: 58, height: 58, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  eyebrow: { fontSize: 11, fontWeight: "900", letterSpacing: 2.4 },
  title: { fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 34, fontWeight: "800", letterSpacing: -1 },
  copy: { fontFamily: "PlusJakartaSans_400Regular", fontSize: 15, lineHeight: 22 },
  form: { gap: 17 },
  passwordToggle: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  error: { fontSize: 13 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 4 },
  helper: { textAlign: "center", fontSize: 12 },
});
