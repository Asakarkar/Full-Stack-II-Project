import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";
import { Link, router } from "expo-router";
import { Eye, EyeOff } from "lucide-react-native";
import { Screen, Field, Button } from "@/components/ui";
import { useTheme } from "@/context/ThemeContext";
import { useAppDispatch } from "@/store";
import { register } from "@/store/authSlice";
import { getErrorMessage } from "@/lib/apiConfig";
import { useResponsive } from "@/lib/responsive";
import Animated, { FadeInDown } from "react-native-reanimated";
import { AppText as Text } from "@/components/AppText";
import { getEmailValidationError } from "@/lib/emailValidation";

export default function RegisterScreen() {
  const { colors } = useTheme();
  const { isTabletOrDesktop } = useResponsive();
  const dispatch = useAppDispatch();
  const [name, setName] = useState("");
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
      await dispatch(
        register({
          fullName: name.trim(),
          email: email.trim(),
          password,
          role: "STUDENT",
        })
      ).unwrap();
      router.replace("/(tabs)");
    } catch (reason) {
      setError(getErrorMessage(reason, "We couldn’t create your account."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.container, isTabletOrDesktop && styles.containerTablet]}>
        <Animated.View entering={Platform.OS === "web" ? undefined : FadeInDown.duration(420)} style={{ gap: 8 }}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>START YOUR JOURNEY</Text>
          <Text style={[styles.title, { color: colors.text }]}>Build your momentum.</Text>
          <Text style={[styles.copy, { color: colors.muted }]}>Create a profile and make every learning win count.</Text>
        </Animated.View>
        <Animated.View entering={Platform.OS === "web" ? undefined : FadeInDown.duration(420).delay(100)} style={styles.form}>
          <Field label="Full name" placeholder="Your name" value={name} onChangeText={setName} autoCapitalize="words" maxLength={100} />
          <Field
            label="Email address"
            placeholder="you@school.edu"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setEmailError("");
            }}
            maxLength={254}
            accessibilityHint={emailError || undefined}
          />
          {!!emailError && <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: 13 }}>{emailError}</Text>}
          <Field
            label="Password"
            placeholder="At least 8 characters"
            secureTextEntry={!passwordVisible}
            value={password}
            onChangeText={setPassword}
            maxLength={72}
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
          <Text style={[styles.passwordHint, { color: colors.muted }]}>Use at least 8 characters. Passwords are securely hashed via BCrypt.</Text>
          {!!error && <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: 13 }}>{error}</Text>}
          <Button title="Create account" onPress={submit} loading={submitting} disabled={!name.trim() || !email.trim() || password.length < 8 || submitting} />
        </Animated.View>
        <Text style={[styles.teacherInfo, { color: colors.muted }]}>
          Are you an educator? Teacher access is provisioned by your school with an invitation code. Please contact your RankForge administrator.
        </Text>
        <View style={styles.footer}>
          <Text style={{ color: colors.muted }}>Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable hitSlop={10}>
              <Text style={{ color: colors.primary, fontWeight: "700" }}>Sign in</Text>
            </Pressable>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", gap: 23, paddingVertical: 24, width: "100%" },
  containerTablet: { maxWidth: 460, alignSelf: "center" },
  eyebrow: { fontSize: 11, fontWeight: "900", letterSpacing: 2 },
  title: { fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 31, fontWeight: "800", letterSpacing: -0.8 },
  copy: { fontFamily: "PlusJakartaSans_400Regular", fontSize: 14, lineHeight: 21 },
  form: { gap: 14 },
  passwordToggle: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  passwordHint: { fontSize: 10, lineHeight: 15 },
  footer: { flexDirection: "row", justifyContent: "center" },
  teacherInfo: { fontSize: 12, lineHeight: 18, textAlign: "center" },
});
