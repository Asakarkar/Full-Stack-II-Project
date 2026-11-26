import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Award, CheckCircle2, Minus, Plus, X } from "lucide-react-native";
import { Card, Field, Button } from "@/components/ui";
import { Avatar } from "@/components/visuals";
import { useTheme } from "@/context/ThemeContext";
import { useAppDispatch, useAppSelector } from "@/store";
import { awardPoints } from "@/store/pointsSlice";
import { getErrorMessage } from "@/lib/apiConfig";
import { useResponsive } from "@/lib/responsive";
import type { LeaderboardEntry } from "@/lib/types";
import { AppText as Text } from "@/components/AppText";

const PRESET_AMOUNTS = [5, 10, 25, 50];

interface PointAwardSheetProps {
  visible: boolean;
  student: LeaderboardEntry | null;
  onClose: () => void;
  onSuccess?: (delta: number, newTotal: number) => void;
}

export function PointAwardSheet({
  visible,
  student,
  onClose,
  onSuccess,
}: PointAwardSheetProps) {
  const { colors } = useTheme();
  const { isTabletOrDesktop } = useResponsive();
  const dispatch = useAppDispatch();
  const submitting = useAppSelector((state) => state.points.submitting);

  const [mode, setMode] = useState<"award" | "deduct">("award");
  const [selectedPreset, setSelectedPreset] = useState<number>(10);
  const [customAmount, setCustomAmount] = useState<string>("10");
  const [reason, setReason] = useState<string>("");
  const [reviewing, setReviewing] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [successToast, setSuccessToast] = useState<string>("");

  if (!student) return null;

  const currentPoints = student.points;
  const parsedAmount = parseInt(customAmount, 10);
  const isValidAmount = Number.isSafeInteger(parsedAmount) && parsedAmount > 0;
  const isReasonProvided = reason.trim().length > 0;
  const canProceed = isValidAmount && isReasonProvided && !submitting;

  const effectiveDelta = mode === "award" ? parsedAmount : -parsedAmount;
  const projectedBalance = Math.max(0, currentPoints + (isValidAmount ? effectiveDelta : 0));

  const handlePresetSelect = (preset: number) => {
    setSelectedPreset(preset);
    setCustomAmount(String(preset));
    setError("");
  };

  const handleCustomChange = (text: string) => {
    const cleaned = text.replace(/[^\d]/g, "");
    setCustomAmount(cleaned);
    setSelectedPreset(parseInt(cleaned, 10));
    setError("");
  };

  const handleConfirm = async () => {
    if (!canProceed) return;

    setError("");
    try {
      const result = await dispatch(
        awardPoints({
          studentId: student.studentId,
          points: effectiveDelta,
          reason: reason.trim(),
        })
      ).unwrap();

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccessToast(`${Math.abs(effectiveDelta)} pts ${mode === "award" ? "awarded to" : "deducted from"} ${student.displayName}!`);
      setReviewing(false);

      if (onSuccess) {
        onSuccess(effectiveDelta, result.balanceAfter ?? projectedBalance);
      }

      setTimeout(() => {
        setSuccessToast("");
        setReason("");
        setCustomAmount("10");
        onClose();
      }, 1400);
    } catch (err: unknown) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(getErrorMessage(err, "Failed to record point adjustment"));
      setReviewing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.backdrop, isTabletOrDesktop && styles.backdropTablet]}>
        <Card style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }, isTabletOrDesktop && styles.sheetTablet]}>
          <View style={styles.sheetHeader}>
            <View style={styles.studentInfo}>
              <Avatar name={student.displayName} size={40} />
              <View>
                <Text style={[styles.studentName, { color: colors.text }]}>{student.displayName}</Text>
                <Text style={[styles.currentBalance, { color: colors.muted }]}>
                  Current Balance: <Text style={{ color: colors.primary, fontWeight: "800" }}>{currentPoints} pts</Text>
                </Text>
              </View>
            </View>
            <Pressable hitSlop={10} onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.raised }]}>
              <X size={18} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.modeRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setMode("award")}
              style={[
                styles.modeBtn,
                {
                  backgroundColor: mode === "award" ? `${colors.accent}15` : colors.raised,
                  borderColor: mode === "award" ? colors.accent : colors.border,
                },
              ]}
            >
              <Plus size={16} color={mode === "award" ? colors.accent : colors.muted} />
              <Text style={{ color: mode === "award" ? colors.accent : colors.muted, fontWeight: "700" }}>Award Points</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setMode("deduct")}
              style={[
                styles.modeBtn,
                {
                  backgroundColor: mode === "deduct" ? `${colors.danger}15` : colors.raised,
                  borderColor: mode === "deduct" ? colors.danger : colors.border,
                },
              ]}
            >
              <Minus size={16} color={mode === "deduct" ? colors.danger : colors.muted} />
              <Text style={{ color: mode === "deduct" ? colors.danger : colors.muted, fontWeight: "700" }}>Deduct Points</Text>
            </Pressable>
          </View>

          <Text style={[styles.fieldLabel, { color: colors.muted }]}>Select Amount</Text>
          <View style={styles.presetRow}>
            {PRESET_AMOUNTS.map((amt) => {
              const active = selectedPreset === amt;
              return (
                <Pressable
                  key={amt}
                  onPress={() => handlePresetSelect(amt)}
                  style={[
                    styles.presetBtn,
                    {
                      backgroundColor: active ? colors.primarySoft : colors.raised,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={{ color: active ? colors.primary : colors.text, fontWeight: "800", fontSize: 13 }}>
                    {mode === "award" ? `+${amt}` : `-${amt}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Field
            label="Custom Value"
            placeholder="Enter points (e.g. 15)"
            value={customAmount}
            onChangeText={handleCustomChange}
            keyboardType="number-pad"
            maxLength={5}
          />

          <Field
            label="Reason for Adjustment *"
            placeholder="e.g. Excellent presentation, teamwork..."
            value={reason}
            onChangeText={(t) => {
              setReason(t);
              setError("");
            }}
            maxLength={250}
          />
          <Text style={[styles.reasonHint, { color: colors.muted }]}>
            {reason.trim().length === 0 ? "Reason is required to update student ledger" : `${250 - reason.length} characters remaining`}
          </Text>

          {!!error && (
            <Text accessibilityRole="alert" style={[styles.errorText, { color: colors.danger }]}>
              {error}
            </Text>
          )}

          {!!successToast && (
            <View style={[styles.successBanner, { backgroundColor: `${colors.accent}15`, borderColor: colors.accent }]}>
              <CheckCircle2 size={18} color={colors.accent} />
              <Text style={[styles.successText, { color: colors.accent }]}>{successToast}</Text>
            </View>
          )}

          <Button
            title={reviewing ? "Confirming…" : `Review ${mode === "award" ? `+${parsedAmount || 0}` : `-${parsedAmount || 0}`} Points`}
            onPress={() => setReviewing(true)}
            disabled={!canProceed || !!successToast}
            loading={submitting}
          />

          <Modal visible={reviewing} transparent animationType="fade" onRequestClose={() => setReviewing(false)}>
            <View style={styles.reviewBackdrop}>
              <Card style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.reviewIcon, { backgroundColor: mode === "award" ? `${colors.accent}20` : `${colors.danger}20` }]}>
                  <Award size={24} color={mode === "award" ? colors.accent : colors.danger} />
                </View>
                <Text style={[styles.reviewTitle, { color: colors.text }]}>
                  {mode === "award" ? "Confirm Points Award" : "Confirm Points Deduction"}
                </Text>
                <Text style={[styles.reviewDesc, { color: colors.muted }]}>
                  Are you sure you want to {mode === "award" ? "award" : "deduct"}{" "}
                  <Text style={{ color: mode === "award" ? colors.accent : colors.danger, fontWeight: "800" }}>
                    {Math.abs(effectiveDelta)} points
                  </Text>{" "}
                  {mode === "award" ? "to" : "from"} <Text style={{ color: colors.text, fontWeight: "700" }}>{student.displayName}</Text>?
                </Text>

                <View style={[styles.balancePreview, { backgroundColor: colors.raised, borderColor: colors.border }]}>
                  <Text style={[styles.previewLabel, { color: colors.muted }]}>Projected Balance:</Text>
                  <Text style={[styles.previewPoints, { color: colors.primary }]}>{projectedBalance} pts</Text>
                </View>

                <Button
                  title={mode === "award" ? "Confirm Award" : "Confirm Deduction"}
                  onPress={handleConfirm}
                  loading={submitting}
                />
                <Button
                  title="Cancel"
                  variant="ghost"
                  onPress={() => setReviewing(false)}
                  disabled={submitting}
                />
              </Card>
            </View>
          </Modal>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "#060710B0",
    justifyContent: "flex-end",
  },
  backdropTablet: {
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 22,
    gap: 13,
    width: "100%",
  },
  sheetTablet: {
    maxWidth: 520,
    borderRadius: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  studentInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  studentName: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 16,
    fontWeight: "700",
  },
  currentBalance: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  modeRow: {
    flexDirection: "row",
    gap: 10,
  },
  modeBtn: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: -6,
  },
  presetRow: {
    flexDirection: "row",
    gap: 8,
  },
  presetBtn: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  reasonHint: {
    fontSize: 10,
    marginTop: -8,
  },
  errorText: {
    fontSize: 12,
    fontWeight: "600",
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderWidth: 1,
    borderRadius: 12,
  },
  successText: {
    fontSize: 12,
    fontWeight: "700",
  },
  reviewBackdrop: {
    flex: 1,
    backgroundColor: "#060710B0",
    justifyContent: "center",
    padding: 20,
  },
  reviewCard: {
    alignItems: "center",
    padding: 22,
    gap: 14,
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
  },
  reviewIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewTitle: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  reviewDesc: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  balancePreview: {
    width: "100%",
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  previewPoints: {
    fontFamily: "JetBrainsMono_700Bold",
    fontSize: 14,
    fontWeight: "800",
  },
});
