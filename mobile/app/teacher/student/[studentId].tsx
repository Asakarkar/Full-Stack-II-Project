import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { ArrowDownLeft, ArrowUpRight, Award, Minus, Plus } from "lucide-react-native";
import { Screen, PageHeader, Card, Field, Button, LoadingState, ErrorState, EmptyState, Pagination, SectionTitle } from "@/components/ui";
import { useTheme } from "@/context/ThemeContext";
import { useAppDispatch, useAppSelector } from "@/store";
import { awardPoints, setPointsSort, setTeacherPointsPage } from "@/store/pointsSlice";
import { useTeacherStudentPointsQuery } from "@/store/api";
import { getErrorMessage } from "@/lib/apiConfig";
import { isTeacherRole } from "@/lib/types";
import { AppText as Text } from "@/components/AppText";

const PRESETS = [5, 10, 20, 50];
const SORTS = [
  { label: "Recent", value: "createdAt" },
  { label: "Amount", value: "amount" },
  { label: "Type", value: "type" },
] as const;

export default function TeacherStudentScreen() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const role = useAppSelector((state) => state.auth.user?.role);
  const params = useLocalSearchParams<{ studentId?: string; name?: string; username?: string; grade?: string }>();
  const studentId = typeof params.studentId === "string" ? params.studentId : "";
  const name = typeof params.name === "string" ? params.name : "Student";
  const username = typeof params.username === "string" ? params.username : "";
  const grade = typeof params.grade === "string" ? params.grade : "";
  const pageState = useAppSelector((state) => state.points);

  const [mode, setMode] = useState<"award" | "deduct">("award");
  const [amount, setAmount] = useState("10");
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [success, setSuccess] = useState("");
  const [submitError, setSubmitError] = useState("");

  const submitting = pageState.submitting;

  const historyQuery = useTeacherStudentPointsQuery(
    { studentId, page: pageState.page, limit: 10, sort: pageState.sort, order: pageState.order },
    { skip: !isTeacherRole(role) || !studentId }
  );

  if (!isTeacherRole(role)) return <Redirect href="/(tabs)" />;
  if (!studentId) return <Redirect href="/(tabs)/students" />;

  const amountValue = Number.parseInt(amount, 10);
  const canSubmit = Number.isSafeInteger(amountValue) && amountValue > 0 && !!reason.trim();

  const confirmTransaction = async () => {
    setConfirming(false);
    setSubmitError("");
    setSuccess("");

    const delta = mode === "award" ? amountValue : -amountValue;
    try {
      await dispatch(
        awardPoints({
          studentId,
          points: delta,
          reason: reason.trim(),
        })
      ).unwrap();

      setSuccess(`${amountValue} points ${mode === "award" ? "awarded to" : "deducted from"} ${name}.`);
      setReason("");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void historyQuery.refetch();
    } catch (error) {
      setSubmitError(getErrorMessage(error, `Could not ${mode} points. Please try again.`));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <Screen onRefresh={historyQuery.refetch} refreshing={historyQuery.isFetching}>
      <PageHeader title={name} subtitle={[username && `@${username}`, grade && `Student · ${grade}`].filter(Boolean).join(" · ") || "Student point history"} back />

      <Card>
        <SectionTitle title="Recognize progress" />
        <View style={styles.modeRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setMode("award")}
            style={[
              styles.modeButton,
              {
                backgroundColor: mode === "award" ? `${colors.accent}18` : colors.raised,
                borderColor: mode === "award" ? colors.accent : colors.border,
              },
            ]}
          >
            <Plus size={16} color={mode === "award" ? colors.accent : colors.muted} />
            <Text style={{ color: mode === "award" ? colors.accent : colors.muted, fontWeight: "700" }}>Award</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setMode("deduct")}
            style={[
              styles.modeButton,
              {
                backgroundColor: mode === "deduct" ? `${colors.warning}18` : colors.raised,
                borderColor: mode === "deduct" ? colors.warning : colors.border,
              },
            ]}
          >
            <Minus size={16} color={mode === "deduct" ? colors.warning : colors.muted} />
            <Text style={{ color: mode === "deduct" ? colors.warning : colors.muted, fontWeight: "700" }}>Deduct</Text>
          </Pressable>
        </View>

        <Text style={[styles.label, { color: colors.muted }]}>Choose points</Text>
        <View style={styles.presetRow}>
          {PRESETS.map((preset) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${preset} points`}
              key={preset}
              onPress={() => setAmount(String(preset))}
              style={[
                styles.preset,
                {
                  backgroundColor: amount === String(preset) ? colors.primarySoft : colors.surface,
                  borderColor: amount === String(preset) ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={{ color: amount === String(preset) ? colors.primary : colors.text, fontSize: 13, fontWeight: "800" }}>
                {preset}
              </Text>
            </Pressable>
          ))}
        </View>

        <Field
          label="Custom amount"
          placeholder="Enter whole points"
          value={amount}
          onChangeText={(value) => setAmount(value.replace(/[^\d]/g, ""))}
          keyboardType="number-pad"
        />
        <Field label="Reason" placeholder="What did they do well?" value={reason} onChangeText={setReason} maxLength={500} />
        <Text style={[styles.helper, { color: colors.muted }]}>
          A clear reason helps students understand and celebrate their progress.
        </Text>

        {!!submitError && <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: 12 }}>{submitError}</Text>}
        {!!success && <Text accessibilityLiveRegion="polite" style={{ color: colors.accent, fontSize: 12, fontWeight: "700" }}>{success}</Text>}

        <Button
          title={`Review ${mode}`}
          onPress={() => setConfirming(true)}
          disabled={!canSubmit || submitting}
          loading={submitting}
          icon={mode === "award" ? <Plus size={17} color="#FFFFFF" /> : <Minus size={17} color="#FFFFFF" />}
        />
      </Card>

      <View style={styles.historyHeader}>
        <SectionTitle title="Recent point activity" />
        {historyQuery.data && <Text style={{ color: colors.muted, fontSize: 11 }}>{historyQuery.data.total} entries</Text>}
      </View>

      <View style={styles.sortRow}>
        {SORTS.map((sort) => {
          const active = pageState.sort === sort.value;
          return (
            <Pressable
              accessibilityRole="button"
              key={sort.value}
              onPress={() => dispatch(setPointsSort(sort.value))}
              style={[
                styles.sortChip,
                {
                  backgroundColor: active ? colors.primarySoft : colors.surface,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={{ color: active ? colors.primary : colors.muted, fontSize: 11, fontWeight: "700" }}>
                {sort.label}
                {active ? (pageState.order === "asc" ? " ↑" : " ↓") : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {historyQuery.isLoading ? (
        <LoadingState label="Loading student history…" />
      ) : historyQuery.isError ? (
        <ErrorState message={getErrorMessage(historyQuery.error, "Unable to load point history.")} onRetry={historyQuery.refetch} />
      ) : historyQuery.data?.items.length ? (
        <>
          <Card>
            {historyQuery.data.items.map((entry, index) => {
              const positive = isPositiveEntry(entry.type);
              return (
                <View key={entry.id} style={{ gap: 12 }}>
                  {index > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                  <View style={styles.historyRow}>
                    <View style={[styles.historyIcon, { backgroundColor: positive ? `${colors.accent}20` : `${colors.warning}20` }]}>
                      {positive ? <ArrowDownLeft size={16} color={colors.accent} /> : <ArrowUpRight size={16} color={colors.warning} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: 12, fontWeight: "700" }}>{entry.reason || entry.type}</Text>
                      <Text style={{ color: colors.muted, fontSize: 10, marginTop: 4 }}>{formatDate(entry.createdAt)}</Text>
                    </View>
                    <Text style={{ color: positive ? colors.accent : colors.danger, fontSize: 13, fontWeight: "800" }}>
                      {positive ? "+" : "−"}
                      {Math.abs(entry.amount)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </Card>
          <Pagination
            page={historyQuery.data.page}
            totalPages={historyQuery.data.totalPages}
            onChange={(page) => dispatch(setTeacherPointsPage(page))}
          />
        </>
      ) : (
        <EmptyState title="No point history yet" message="This student’s recorded point activity will appear here." />
      )}

      <Modal visible={confirming} transparent animationType="fade" onRequestClose={() => setConfirming(false)}>
        <View style={styles.modalBackdrop}>
          <Card style={styles.modalCard}>
            <View style={[styles.modalIcon, { backgroundColor: mode === "award" ? `${colors.accent}20` : `${colors.warning}20` }]}>
              <Award size={22} color={mode === "award" ? colors.accent : colors.warning} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {mode === "award" ? "Confirm points award" : "Confirm point deduction"}
            </Text>
            <Text style={[styles.modalCopy, { color: colors.muted }]}>
              {mode === "award" ? "Award" : "Deduct"} {amountValue} points {mode === "award" ? "to" : "from"} {name} for “{reason.trim()}”?
            </Text>
            <Button title={mode === "award" ? "Confirm award" : "Confirm deduction"} onPress={confirmTransaction} loading={submitting} />
            <Button title="Cancel" variant="ghost" onPress={() => setConfirming(false)} disabled={submitting} />
          </Card>
        </View>
      </Modal>
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
  modeRow: { flexDirection: "row", gap: 9 },
  modeButton: { flex: 1, minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 13, borderWidth: 1 },
  label: { fontSize: 11, fontWeight: "700", marginBottom: -7 },
  presetRow: { flexDirection: "row", gap: 8 },
  preset: { flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  helper: { fontSize: 10, lineHeight: 16 },
  historyHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sortRow: { flexDirection: "row", gap: 8 },
  sortChip: { minHeight: 44, borderWidth: 1, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 12, justifyContent: "center" },
  divider: { height: StyleSheet.hairlineWidth },
  historyRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  historyIcon: { width: 35, height: 35, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  modalBackdrop: { flex: 1, backgroundColor: "#070812A8", justifyContent: "center", padding: 22 },
  modalCard: { alignItems: "center", padding: 22 },
  modalIcon: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  modalTitle: { fontSize: 18, fontWeight: "800", textAlign: "center" },
  modalCopy: { fontSize: 13, lineHeight: 20, textAlign: "center", marginBottom: 5 },
});
