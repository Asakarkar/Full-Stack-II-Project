import React from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { ChartNoAxesCombined, ChevronRight, LogOut, Moon, Pencil, ShieldCheck, Sun } from "lucide-react-native";
import { Screen, PageHeader, Card, SectionTitle, LoadingState, ErrorState, Button, Divider } from "@/components/ui";
import { Avatar } from "@/components/visuals";
import { useTheme } from "@/context/ThemeContext";
import { useAppDispatch, useAppSelector } from "@/store";
import { clearSession } from "@/store/authSlice";
import { rankForgeApi, useStudentProfileQuery } from "@/store/api";
import { getErrorMessage } from "@/lib/apiConfig";
import { isStudentRole } from "@/lib/types";
import { AppText as Text } from "@/components/AppText";

export default function ProfileScreen() {
  const { colors, mode, preference, setPreference } = useTheme();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const studentUser = isStudentRole(user?.role);
  const student = useStudentProfileQuery(undefined, { skip: !studentUser });

  const logout = () => {
    Alert.alert("Sign out?", "You’ll need to sign in again to access RankForge.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: async () => {
        await dispatch(clearSession());
        dispatch(rankForgeApi.util.resetApiState());
        router.replace("/(auth)/login");
      } },
    ]);
  };
  const cycleTheme = () => {
    const next = preference === "light" ? "dark" : preference === "dark" ? "system" : "light";
    void setPreference(next);
  };

  if (student.isLoading) return <Screen><LoadingState label="Loading your profile…" /></Screen>;

  return (
    <Screen onRefresh={() => { if (studentUser) void student.refetch(); }} refreshing={studentUser && student.isFetching}>
      <PageHeader title="Your profile" subtitle="Account details and app preferences." />
      {studentUser && student.isError && <ErrorState message={getErrorMessage(student.error, "Could not load your student profile.")} onRetry={student.refetch} />}
      <Card style={styles.profileCard}>
        <Avatar name={student.data?.displayName ?? user?.displayName ?? "RankForge user"} size={64} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>{student.data?.displayName ?? user?.displayName}</Text>
          <Text numberOfLines={1} style={[styles.email, { color: colors.muted }]}>{student.data?.email ?? user?.email}</Text>
          <Text style={[styles.role, { color: colors.primary }]}>{user?.role}</Text>
        </View>
        {studentUser && <Pressable accessibilityRole="button" accessibilityLabel="Edit profile" onPress={() => router.push("/profile-edit")} style={[styles.editIcon, { backgroundColor: colors.primarySoft }]}><Pencil size={16} color={colors.primary} /></Pressable>}
      </Card>

      {studentUser && student.data && (
        <Card style={styles.summaryCard}>
          <View style={styles.summary}>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{student.data.pointsBalance.toLocaleString()}</Text>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>Points</Text>
          </View>
          <Divider />
          <View style={styles.summary}>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{student.data.grade || "—"}</Text>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>Grade</Text>
          </View>
          <Divider />
          <View style={styles.summary}>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{formatDate(student.data.createdAt)}</Text>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>Member since</Text>
          </View>
        </Card>
      )}

      <View style={styles.group}>
        <SectionTitle title="Learning" />
        <Card style={styles.menuCard}>
          {studentUser && <MenuRow icon={<ShieldCheck size={17} color={colors.accent} />} title="Points & history" caption="Review your recent achievements" onPress={() => router.push("/(tabs)/points")} />}
          {studentUser && <Divider />}
          <MenuRow icon={<ChartNoAxesCombined size={17} color={colors.primary} />} title={studentUser ? "Performance" : "Class insights"} caption={studentUser ? "Review your real points summary" : "Explore classroom totals"} onPress={() => router.push("/(tabs)/analytics")} />
        </Card>
      </View>

      <View style={styles.group}>
        <SectionTitle title="Appearance" />
        <Card style={styles.menuCard}>
          <View style={styles.themeRow}>
            <View style={[styles.menuIcon, { backgroundColor: colors.primarySoft }]}>{mode === "dark" ? <Moon size={17} color={colors.primary} /> : <Sun size={17} color={colors.primary} />}</View>
            <View style={{ flex: 1 }}><Text style={[styles.menuTitle, { color: colors.text }]}>Theme</Text><Text style={[styles.menuCaption, { color: colors.muted }]}>{preference === "system" ? "System default" : `${preference[0].toUpperCase()}${preference.slice(1)} mode`}</Text></View>
            <Button title="Change" variant="secondary" onPress={cycleTheme} />
          </View>
        </Card>
      </View>
      {!studentUser && <Text style={[styles.accessNote, { color: colors.muted }]}>Teacher accounts are managed by your school administrator.</Text>}
      <Button title="Sign out" variant="danger" onPress={logout} icon={<LogOut size={17} color="#FFFFFF" />} />
    </Screen>
  );
}

function MenuRow({ icon, title, caption, onPress }: { icon: React.ReactNode; title: string; caption: string; onPress: () => void }) {
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" onPress={onPress} style={styles.menuRow}>
    <View style={[styles.menuIcon, { backgroundColor: colors.raised }]}>{icon}</View>
    <View style={{ flex: 1 }}><Text style={[styles.menuTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.menuCaption, { color: colors.muted }]}>{caption}</Text></View>
    <ChevronRight size={17} color={colors.muted} />
  </Pressable>;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

const styles = StyleSheet.create({
  profileCard: { flexDirection: "row", alignItems: "center", gap: 13, padding: 17 },
  name: { fontSize: 17, fontWeight: "800" },
  email: { fontSize: 12, marginTop: 4 },
  role: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1, marginTop: 5 },
  editIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  summaryCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingVertical: 15 },
  summary: { flex: 1, alignItems: "center", gap: 4, paddingHorizontal: 3 },
  summaryValue: { fontSize: 14, fontWeight: "800", textAlign: "center" },
  summaryLabel: { fontSize: 10, textAlign: "center" },
  group: { gap: 11 },
  menuCard: { paddingVertical: 4, gap: 0 },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 12, minHeight: 58 },
  menuIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  menuTitle: { fontSize: 13, fontWeight: "700" },
  menuCaption: { fontSize: 10, marginTop: 3 },
  themeRow: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 9 },
  accessNote: { fontSize: 12, lineHeight: 18, textAlign: "center" },
});
