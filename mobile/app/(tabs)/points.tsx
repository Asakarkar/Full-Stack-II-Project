import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ArrowDownLeft, ArrowUpRight, Sparkles } from "lucide-react-native";
import { Screen, PageHeader, Card, LoadingState, ErrorState, EmptyState, Pagination, SectionTitle } from "@/components/ui";
import { useTheme } from "@/context/ThemeContext";
import { useAppDispatch, useAppSelector } from "@/store";
import { setPointsPage, setPointsSort } from "@/store/pointsSlice";
import { useStudentPointsQuery, useStudentProfileQuery } from "@/store/api";
import { getErrorMessage } from "@/lib/apiConfig";
import { AppText as Text } from "@/components/AppText";
import { Redirect } from "expo-router";
import { isStudentRole } from "@/lib/types";

const sortChoices = [{ label: "Recent", value: "createdAt" }, { label: "Amount", value: "amount" }, { label: "Type", value: "type" }] as const;

export default function PointsScreen() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const pageState = useAppSelector((state) => state.points);
  const role = useAppSelector((state) => state.auth.user?.role);
  const isStudent = isStudentRole(role);
  const profile = useStudentProfileQuery(undefined, { skip: !isStudent });
  const { data, isLoading, isFetching, isError, error, refetch } = useStudentPointsQuery(pageState, { skip: !isStudent });
  const balance = profile.data?.pointsBalance;

  if (!isStudent) return <Redirect href="/(tabs)" />;

  return (
    <Screen onRefresh={() => { void Promise.all([refetch(), profile.refetch()]); }} refreshing={isFetching || profile.isFetching}>
      <PageHeader title="Points & activity" subtitle="Every focused effort adds up." />
      <Card style={[styles.balanceCard, { backgroundColor: colors.primarySoft, borderColor: "transparent" }]}>
        <View style={[styles.balanceIcon, { backgroundColor: colors.surface }]}><Sparkles size={20} color={colors.primary} /></View>
        <Text style={[styles.balanceLabel, { color: colors.muted }]}>CURRENT BALANCE</Text>
        {profile.isLoading && balance === undefined ? <Text style={[styles.balanceNumber, { color: colors.text }]}>—</Text> :         <Text style={[styles.balanceNumber, { color: colors.text }]}>{balance?.toLocaleString() ?? "—"} <Text style={[styles.balanceUnit, { color: colors.primary }]}>pts</Text></Text>}
        <Text style={[styles.balanceCaption, { color: colors.muted }]}>Point balance from your student profile.</Text>
      </Card>
      {profile.isError && <ErrorState message={getErrorMessage(profile.error, "Unable to load your student profile." )} onRetry={profile.refetch} />}
      <View style={styles.sectionHeader}>
        <SectionTitle title="Point history" />
        {data && <Text style={{ color: colors.muted, fontSize: 11 }}>{data.total.toLocaleString()} entries</Text>}
      </View>
      <View style={styles.sortRow}>
        {sortChoices.map((choice) => {
          const active = pageState.sort === choice.value;
          return <Pressable accessibilityRole="button" key={choice.value} onPress={() => dispatch(setPointsSort(choice.value))} style={[styles.sortChip, { backgroundColor: active ? colors.primarySoft : colors.surface, borderColor: active ? colors.primary : colors.border }]}>
            <Text style={{ color: active ? colors.primary : colors.muted, fontSize: 11, fontWeight: "700" }}>{choice.label}{active ? (pageState.order === "asc" ? " ↑" : " ↓") : ""}</Text>
          </Pressable>;
        })}
      </View>
      {isLoading ? <LoadingState label="Loading your point history…" /> : isError ? <ErrorState message={getErrorMessage(error, "Unable to load point history.")} onRetry={refetch} /> : data?.items.length ? (
        <>
          <Card>{data.items.map((entry, index) => {
            const positive = isPositiveEntry(entry.type);
            const Icon = positive ? ArrowDownLeft : ArrowUpRight;
            return <View key={entry.id} style={{ gap: 13 }}>
              {index > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              <View style={styles.entry}>
                <View style={[styles.entryIcon, { backgroundColor: positive ? `${colors.accent}20` : `${colors.warning}20` }]}><Icon size={16} color={positive ? colors.accent : colors.warning} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.entryTitle, { color: colors.text }]}>{entry.reason || entry.type}</Text>
                  <Text style={[styles.entryDate, { color: colors.muted }]}>{formatDate(entry.createdAt)}</Text>
                </View>
                <Text style={{ color: positive ? colors.accent : colors.danger, fontWeight: "800", fontSize: 14 }}>{positive ? "+" : "−"}{Math.abs(entry.amount)}</Text>
              </View>
            </View>;
          })}</Card>
          <Pagination page={data.page} totalPages={data.totalPages} onChange={(page) => dispatch(setPointsPage(page))} />
        </>
      ) : <EmptyState title="Your first points are waiting" message="Complete a learning activity to see your points history." />}
    </Screen>
  );
}

function isPositiveEntry(type: "AWARD" | "DEDUCTION") {
  return type === "AWARD";
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const styles = StyleSheet.create({
  balanceCard: { alignItems: "flex-start", gap: 7, padding: 21 },
  balanceIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  balanceLabel: { fontSize: 10, fontWeight: "900", letterSpacing: 1.6 },
  balanceNumber: { fontFamily: "JetBrainsMono_700Bold", fontSize: 31, fontWeight: "900", letterSpacing: -1 },
  balanceUnit: { fontSize: 15 },
  balanceCaption: { fontSize: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sortRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sortChip: { minHeight: 44, borderWidth: 1, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 12, justifyContent: "center" },
  divider: { height: StyleSheet.hairlineWidth },
  entry: { flexDirection: "row", alignItems: "center", gap: 11 },
  entryIcon: { width: 35, height: 35, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  entryTitle: { fontSize: 13, fontWeight: "700" },
  entryDate: { fontSize: 10, marginTop: 4 },
});
