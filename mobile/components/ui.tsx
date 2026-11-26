import React, { PropsWithChildren } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AlertCircle, ChevronLeft, ChevronRight, Inbox, RefreshCw } from "lucide-react-native";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/context/ThemeContext";
import { AppText as Text } from "@/components/AppText";
import { useResponsive } from "@/lib/responsive";

export function Screen({
  children,
  scroll = true,
  style,
  onRefresh,
  refreshing = false,
}: PropsWithChildren<{
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  onRefresh?: () => void;
  refreshing?: boolean;
}>) {
  const { colors } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();

  const containerStyle: ViewStyle = {
    width: "100%",
    maxWidth: contentMaxWidth,
    alignSelf: "center",
    paddingHorizontal: horizontalPadding,
    paddingTop: 14,
    paddingBottom: 34,
    gap: 18,
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { alignItems: "center" }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            ) : undefined
          }
        >
          <View style={[containerStyle, style]}>{children}</View>
        </ScrollView>
      ) : (
        <View style={[styles.fill, { alignItems: "center" }]}>
          <View style={[styles.fill, containerStyle, style]}>{children}</View>
        </View>
      )}
    </SafeAreaView>
  );
}

export function PageHeader({ title, subtitle, back = false, right }: { title: string; subtitle?: string; back?: boolean; right?: React.ReactNode }) {
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <View style={styles.header}>
      <View style={styles.headerTitleRow}>
        {back && <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.surface }]}><ChevronLeft size={20} color={colors.text} /></Pressable>}
        <View style={styles.headerText}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>{title}</Text>
          {!!subtitle && <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text>}
        </View>
        {right}
      </View>
    </View>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const { colors } = useTheme();
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: "#25224A" }, style]}>{children}</View>;
}

export function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  const { colors } = useTheme();
  return <View style={styles.sectionTitle}><Text style={[styles.sectionHeading, { color: colors.text }]}>{title}</Text>{action}</View>;
}

export function BodyText({ children, style }: PropsWithChildren<{ style?: StyleProp<any> }>) {
  const { colors } = useTheme();
  return <Text style={[{ color: colors.text }, style]}>{children}</Text>;
}

export function Label({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  return <Text style={[styles.label, { color: colors.muted }]}>{children}</Text>;
}

export function Field({ label, trailing, style: inputStyle, ...props }: TextInputProps & { label: string; trailing?: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.fieldWrap}>
      <Label>{label}</Label>
      <View style={[styles.inputShell, { backgroundColor: colors.input, borderColor: colors.border }]}>
        <TextInput
          {...props}
          placeholderTextColor={colors.muted}
          accessibilityLabel={label}
          selectionColor={colors.primary}
          style={[styles.input, { color: colors.text }, inputStyle]}
        />
        {trailing}
      </View>
    </View>
  );
}

export function Button({ title, onPress, variant = "primary", disabled = false, loading = false, icon }: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const backgroundColor = variant === "primary" ? colors.primary : variant === "danger" ? colors.danger : variant === "secondary" ? colors.raised : "transparent";
  const textColor = variant === "primary" || variant === "danger" ? "#FFFFFF" : colors.text;
  const handlePress = () => {
    void Haptics.selectionAsync().catch(() => undefined);
    onPress();
  };
  return (
    <Pressable accessibilityRole="button" disabled={disabled || loading} onPress={handlePress} style={({ pressed }) => [styles.button, { backgroundColor, borderColor: colors.border, opacity: disabled ? 0.55 : pressed ? 0.83 : 1 }]}>
      {loading ? <ActivityIndicator color={textColor} /> : <>{icon}{<Text style={[styles.buttonText, { color: textColor }]}>{title}</Text>}</>}
    </Pressable>
  );
}

export function LoadingState({ label = "Loading your learning data…" }: { label?: string }) {
  const { colors } = useTheme();
  const pulse = useSharedValue(0.4);
  React.useEffect(() => {
    pulse.value = withRepeat(withTiming(0.8, { duration: 850 }), -1, true);
  }, [pulse]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return <View style={styles.state}>
    <Text style={[styles.stateText, { color: colors.muted }]}>{label}</Text>
    {[0, 1, 2].map((row) => <Animated.View key={row} style={[styles.skeletonRow, { backgroundColor: colors.surface, borderColor: colors.border }, animatedStyle]}>
      <View style={[styles.skeletonCircle, { backgroundColor: colors.raised }]} />
      <View style={styles.skeletonLines}><View style={[styles.skeletonLine, { backgroundColor: colors.raised, width: row === 0 ? "63%" : "52%" }]} /><View style={[styles.skeletonLine, { backgroundColor: colors.raised, width: "37%" }]} /></View>
      <View style={[styles.skeletonValue, { backgroundColor: colors.raised }]} />
    </Animated.View>)}
  </View>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.stateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <AlertCircle size={23} color={colors.danger} />
      <Text style={[styles.stateTitle, { color: colors.text }]}>We couldn’t load this</Text>
      <Text style={[styles.stateText, { color: colors.muted }]}>{message}</Text>
      {onRetry && <Button title="Try again" variant="secondary" onPress={onRetry} icon={<RefreshCw size={16} color={colors.text} />} />}
    </View>
  );
}

export function EmptyState({ title = "Nothing here yet", message = "Check back when new learning activity is available." }: { title?: string; message?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.stateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Inbox size={25} color={colors.muted} />
      <Text style={[styles.stateTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.stateText, { color: colors.muted }]}>{message}</Text>
    </View>
  );
}

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.pagination}>
      <Pressable accessibilityLabel="Previous page" disabled={page <= 1} onPress={() => onChange(page - 1)} style={[styles.pageArrow, { borderColor: colors.border, opacity: page <= 1 ? 0.4 : 1 }]}><ChevronLeft size={19} color={colors.text} /></Pressable>
      <Text style={[styles.pageLabel, { color: colors.muted }]}>Page <Text style={{ color: colors.text, fontWeight: "700" }}>{page}</Text> of {Math.max(1, totalPages)}</Text>
      <Pressable accessibilityLabel="Next page" disabled={page >= totalPages} onPress={() => onChange(page + 1)} style={[styles.pageArrow, { borderColor: colors.border, opacity: page >= totalPages ? 0.4 : 1 }]}><ChevronRight size={19} color={colors.text} /></Pressable>
    </View>
  );
}

export function FadeIn({ children, delay = 0 }: PropsWithChildren<{ delay?: number }>) {
  return <Animated.View entering={FadeInDown.duration(350).delay(delay)}>{children}</Animated.View>;
}

export function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: { flexGrow: 1, width: "100%" },
  screen: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 34, gap: 20 },
  fill: { flex: 1, width: "100%" },
  header: { gap: 8, width: "100%" },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerText: { flex: 1, minWidth: 0 },
  pageTitle: { fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 27, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { fontFamily: "PlusJakartaSans_400Regular", fontSize: 13, marginTop: 4, lineHeight: 19 },
  backButton: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  card: { width: "100%", borderWidth: 1, borderRadius: 21, padding: 17, gap: 12, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.045, shadowRadius: 14, elevation: 1 },
  sectionTitle: { width: "100%", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionHeading: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 17, fontWeight: "700" },
  label: { fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 12, fontWeight: "600", marginBottom: 7 },
  fieldWrap: { width: "100%", gap: 1 },
  inputShell: { width: "100%", minHeight: 49, borderWidth: 1, borderRadius: 14, flexDirection: "row", alignItems: "center" },
  input: { fontFamily: "PlusJakartaSans_400Regular", flex: 1, minHeight: 47, paddingHorizontal: 14, fontSize: 15 },
  button: { minHeight: 48, paddingHorizontal: 17, borderRadius: 14, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  buttonText: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 14, fontWeight: "700" },
  state: { width: "100%", paddingVertical: 24, gap: 12 },
  skeletonRow: { width: "100%", minHeight: 65, borderWidth: 1, borderRadius: 16, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 12 },
  skeletonCircle: { width: 37, height: 37, borderRadius: 19, flexShrink: 0 },
  skeletonLines: { flex: 1, gap: 8, minWidth: 0 },
  skeletonLine: { height: 8, borderRadius: 5 },
  skeletonValue: { width: 42, height: 11, borderRadius: 5, flexShrink: 0 },
  stateCard: { width: "100%", alignItems: "center", padding: 25, borderWidth: 1, borderRadius: 19, gap: 10 },
  stateTitle: { fontSize: 16, fontWeight: "700", textAlign: "center" },
  stateText: { fontSize: 13, textAlign: "center", lineHeight: 20 },
  pagination: { width: "100%", flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 18, marginVertical: 2 },
  pageArrow: { height: 44, width: 44, borderWidth: 1, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  pageLabel: { fontSize: 13 },
});
