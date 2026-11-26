import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { ArrowUpRight, Award, ChartNoAxesCombined, Medal, Sparkles, Users } from "lucide-react-native";
import { Screen, PageHeader, Card, SectionTitle, LoadingState, ErrorState, EmptyState } from "@/components/ui";
import { Avatar, StudentRow } from "@/components/visuals";
import { useTheme } from "@/context/ThemeContext";
import { useAppSelector } from "@/store";
import { useLeaderboardQuery, useStudentDashboardQuery, useStudentPointsQuery, useTeacherDashboardQuery, useTeacherPointsQuery } from "@/store/api";
import { getErrorMessage, isNotFoundError } from "@/lib/apiConfig";
import { isTeacherRole } from "@/lib/types";
import { useResponsive } from "@/lib/responsive";
import { AppText as Text } from "@/components/AppText";

const EMPTY_PAGE = { page: 1, limit: 5, sort: "createdAt" as const, order: "desc" as const };

export default function DashboardScreen() {
  const { colors } = useTheme();
  const { isTabletOrDesktop } = useResponsive();
  const user = useAppSelector((state) => state.auth.user);
  const teacher = isTeacherRole(user?.role);
  const studentDashboard = useStudentDashboardQuery(undefined, { skip: teacher });
  const teacherDashboard = useTeacherDashboardQuery(undefined, { skip: !teacher });
  const studentActivity = useStudentPointsQuery(EMPTY_PAGE, { skip: teacher });
  const teacherActivity = useTeacherPointsQuery(EMPTY_PAGE, { skip: !teacher });
  const leaderboard = useLeaderboardQuery({ page: 1, limit: 3, sort: "points", order: "desc" });

  const summaryQuery = teacher ? teacherDashboard : studentDashboard;
  const activityQuery = teacher ? teacherActivity : studentActivity;
  if (summaryQuery.isLoading) return <Screen><LoadingState label="Preparing your dashboard…" /></Screen>;

  const student = !teacher ? studentDashboard.data : undefined;
  const classroom = teacher ? teacherDashboard.data : undefined;
  const fullName = user?.displayName || student?.profile.displayName || "there";

  return (
    <Screen
      onRefresh={() => { void Promise.all([summaryQuery.refetch(), activityQuery.refetch(), leaderboard.refetch()]); }}
      refreshing={summaryQuery.isFetching || activityQuery.isFetching || leaderboard.isFetching}
    >
      <PageHeader
        title={teacher ? "Classroom overview" : `Hi, ${fullName.split(" ")[0]}`}
        subtitle={teacher ? "Here’s how your learners are progressing." : "Your effort is adding up. Let’s see where you stand."}
        right={<Avatar name={fullName} size={42} />}
      />
      {summaryQuery.isError ? <ErrorState message={getErrorMessage(summaryQuery.error, "Unable to load your dashboard.")} onRetry={summaryQuery.refetch} /> : (
        <>
          <Card style={[styles.hero, { backgroundColor: colors.primarySoft, borderColor: "transparent" }]}>
            <View style={styles.heroRow}>
              <View style={{ flex: 1, gap: 7 }}>
                <Text style={[styles.eyebrow, { color: colors.primary }]}>{teacher ? "TEACHER SPACE" : "YOUR LEARNING JOURNEY"}</Text>
                <Text style={[styles.heroTitle, { color: colors.text }]}>{teacher ? "Make every win count." : "Progress, not perfection."}</Text>
                <Text style={[styles.heroCopy, { color: colors.muted }]}>{teacher ? "Encourage growth with meaningful feedback and recognition." : "Every point reflects a moment you chose to keep learning."}</Text>
              </View>
              <View style={[styles.heroIcon, { backgroundColor: colors.surface }]}><Sparkles size={23} color={colors.primary} /></View>
            </View>
            <Pressable onPress={() => router.push(teacher ? "/(tabs)/students" : "/(tabs)/leaderboard")} style={styles.heroLink}>
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "800" }}>{teacher ? "Explore your students" : "Explore the leaderboard"}</Text>
              <ArrowUpRight size={16} color={colors.primary} />
            </Pressable>
          </Card>

          {teacher && classroom ? (
            <View style={[styles.stats, isTabletOrDesktop && styles.statsTablet]}>
              <Metric icon={<Users size={16} color={colors.primary} />} label="Students" value={classroom.studentCount} />
              <Metric icon={<Award size={16} color={colors.accent} />} label="Points awarded today" value={classroom.pointsAwardedToday} />
              <Metric icon={<ChartNoAxesCombined size={16} color={colors.primary} />} label="Transactions today" value={classroom.transactionsToday} />
              <Metric icon={<ArrowUpRight size={16} color={colors.warning} />} label="Points deducted today" value={classroom.pointsDeductedToday} />
              <Metric icon={<Medal size={16} color={colors.warning} />} label="Total class points" value={classroom.totalPoints} />
            </View>
          ) : student ? (
            <>
              <Card style={styles.pointsCard}>
                <View style={styles.pointsTop}><View style={[styles.pointsIcon, { backgroundColor: colors.primarySoft }]}><Sparkles size={18} color={colors.primary} /></View><Text style={[styles.pointsCaption, { color: colors.muted }]}>TOTAL POINTS</Text></View>
                <Text style={[styles.pointsValue, { color: colors.text }]}>{student.profile.pointsBalance.toLocaleString()} <Text style={[styles.pointsUnit, { color: colors.primary }]}>pts</Text></Text>
                <Text style={[styles.pointsSupporting, { color: colors.muted }]}>{student.totalPointsEarned.toLocaleString()} earned · {student.transactionsCount.toLocaleString()} learning transactions</Text>
              </Card>
              <View style={[styles.stats, isTabletOrDesktop && styles.statsTablet]}>
                <Metric icon={<Medal size={16} color={colors.primary} />} label="Class rank" value={`#${student.rank}`} />
                <Metric icon={<Users size={16} color={colors.accent} />} label="Learners" value={student.studentCount} />
                <Metric icon={<ChartNoAxesCombined size={16} color={colors.primary} />} label="Percentile" value={`${student.percentile.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`} />
                <Metric icon={<ArrowUpRight size={16} color={colors.accent} />} label="Rank movement · 7 days" value={student.rankMovementLast7Days === null ? "—" : formatMovement(student.rankMovementLast7Days)} available={student.rankMovementLast7Days !== null} />
              </View>
            </>
          ) : null}

          <View style={styles.section}>
            <SectionTitle
              title={teacher ? "Leaderboard preview" : "Top learners"}
              action={
                <Pressable onPress={() => router.push("/(tabs)/leaderboard")}>
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "700" }}>View all</Text>
                </Pressable>
              }
            />
            {leaderboard.isError ? (
              <ErrorState message={getErrorMessage(leaderboard.error, "Leaderboard preview is unavailable.")} onRetry={leaderboard.refetch} />
            ) : leaderboard.isLoading ? (
              <LoadingState label="Loading leaderboard…" />
            ) : leaderboard.data?.items.length ? (
              <Card>
                {leaderboard.data.items.map((entry, index) => (
                  <View key={entry.studentId} style={{ gap: 12 }}>
                    {index > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                    <StudentRow student={entry} />
                  </View>
                ))}
              </Card>
            ) : (
              <EmptyState title="Rankings are getting started" message="Learners will appear here as they earn points." />
            )}
          </View>

          <View style={styles.section}>
            <SectionTitle
              title={teacher ? "Recent point activity" : "Recent activity"}
              action={
                !teacher ? (
                  <Pressable onPress={() => router.push("/(tabs)/points")}>
                    <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "700" }}>History</Text>
                  </Pressable>
                ) : undefined
              }
            />
            {activityQuery.isLoading ? (
              <LoadingState label="Loading recent activity…" />
            ) : activityQuery.isError ? (
              <ErrorState
                message={
                  teacher && isNotFoundError(activityQuery.error)
                    ? "Recent class activity is not available yet. Student management and points actions remain available."
                    : getErrorMessage(activityQuery.error, teacher ? "Recent class activity is not available yet." : "Your point history is not available right now.")
                }
                onRetry={activityQuery.refetch}
              />
            ) : activityQuery.data?.items.length ? (
              <Card>
                {activityQuery.data.items.map((entry, index) => (
                  <View key={entry.id} style={{ gap: 12 }}>
                    {index > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                    <View style={styles.activity}>
                      <View style={[styles.activityIcon, { backgroundColor: entry.type === "AWARD" ? `${colors.accent}20` : `${colors.warning}20` }]}>
                        <Sparkles size={15} color={entry.type === "AWARD" ? colors.accent : colors.warning} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.activityTitle, { color: colors.text }]}>{entry.reason}</Text>
                        <Text style={[styles.activityDate, { color: colors.muted }]}>
                          {teacher ? `${entry.studentName} · ${entry.actorName} · ` : ""}
                          {formatDate(entry.createdAt)}
                        </Text>
                      </View>
                      <Text style={[styles.activityPoints, { color: isPositiveEntry(entry.type) ? colors.accent : colors.danger }]}>
                        {isPositiveEntry(entry.type) ? "+" : "−"}{Math.abs(entry.amount)}
                      </Text>
                    </View>
                  </View>
                ))}
              </Card>
            ) : (
              <EmptyState title="No activity yet" message="New point activity will appear here once recorded." />
            )}
          </View>
        </>
      )}
    </Screen>
  );
}

function Metric({ icon, label, value, available = true }: { icon: React.ReactNode; label: string; value: string | number; available?: boolean }) {
  const { colors } = useTheme();
  const { isTabletOrDesktop, isSmallPhone } = useResponsive();
  return (
    <Card style={[
      styles.metric,
      isSmallPhone && styles.metricSmallPhone,
      isTabletOrDesktop && styles.metricTablet,
    ]}>
      <View style={[styles.metricIcon, { backgroundColor: colors.primarySoft }]}>{icon}</View>
      <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.muted }]}>{label}</Text>
      {!available && <Text style={[styles.unavailable, { color: colors.muted }]}>Not available</Text>}
    </Card>
  );
}

function formatMovement(value: number) {
  return value > 0 ? `↑ ${value}` : value < 0 ? `↓ ${Math.abs(value)}` : "No change";
}

function isPositiveEntry(type: "AWARD" | "DEDUCTION") {
  return type === "AWARD";
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const styles = StyleSheet.create({
  hero: { padding: 20, gap: 17 },
  heroRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.5 },
  heroTitle: { fontSize: 22, lineHeight: 28, fontWeight: "800", letterSpacing: -0.5 },
  heroCopy: { fontSize: 12, lineHeight: 19 },
  heroIcon: { width: 43, height: 43, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  heroLink: { flexDirection: "row", alignItems: "center", gap: 7, minHeight: 40 },
  pointsCard: { padding: 19, gap: 8 },
  pointsTop: { flexDirection: "row", alignItems: "center", gap: 9 },
  pointsIcon: { height: 34, width: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  pointsCaption: { fontSize: 10, fontWeight: "900", letterSpacing: 1.5 },
  pointsValue: { fontSize: 36, fontWeight: "900", letterSpacing: -1 },
  pointsUnit: { fontSize: 15 },
  pointsSupporting: { fontSize: 11 },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 10, width: "100%" },
  statsTablet: { gap: 12 },
  metric: { width: "48%", flexGrow: 1, minWidth: 140, padding: 13, gap: 6 },
  metricSmallPhone: { width: "100%", minWidth: "100%" },
  metricTablet: { minWidth: 160, maxWidth: "23.5%" },
  metricIcon: { width: 31, height: 31, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  metricValue: { fontFamily: "JetBrainsMono_700Bold", fontSize: 18, fontWeight: "800" },
  metricLabel: { fontSize: 10, lineHeight: 15 },
  unavailable: { fontSize: 9 },
  section: { gap: 11 },
  divider: { height: StyleSheet.hairlineWidth },
  activity: { flexDirection: "row", alignItems: "center", gap: 11 },
  activityIcon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  activityTitle: { fontSize: 12, fontWeight: "700" },
  activityDate: { fontSize: 10, marginTop: 3 },
  activityPoints: { fontFamily: "JetBrainsMono_700Bold", fontSize: 12, fontWeight: "800" },
});
