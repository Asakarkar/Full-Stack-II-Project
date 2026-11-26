import React from "react";
import { StyleSheet, View } from "react-native";
import { AppText as Text } from "@/components/AppText";
import { Redirect } from "expo-router";
import { ChartNoAxesCombined, CircleArrowDown, CircleArrowUp, WalletCards } from "lucide-react-native";
import { Screen, PageHeader, Card, LoadingState, ErrorState, EmptyState } from "@/components/ui";
import { BarChart } from "@/components/visuals";
import { useTheme } from "@/context/ThemeContext";
import { useResponsive } from "@/lib/responsive";
import { useAppSelector } from "@/store";
import { useStudentAnalyticsQuery, useTeacherDashboardQuery } from "@/store/api";
import { getErrorMessage } from "@/lib/apiConfig";
import { isStudentRole, isTeacherRole } from "@/lib/types";

export default function AnalyticsScreen() {
  const { colors } = useTheme();
  const { isTabletOrDesktop } = useResponsive();
  const role = useAppSelector((state) => state.auth.user?.role);
  const student = isStudentRole(role);
  const teacher = isTeacherRole(role);
  const studentAnalytics = useStudentAnalyticsQuery(undefined, { skip: !student });
  const teacherDashboard = useTeacherDashboardQuery(undefined, { skip: !teacher });
  if (!student && !teacher) return <Redirect href="/(tabs)" />;

  const query = teacher ? teacherDashboard : studentAnalytics;
  const data = studentAnalytics.data;
  const summary = teacherDashboard.data;

  return (
    <Screen onRefresh={query.refetch} refreshing={query.isFetching && !query.isLoading}>
      <PageHeader title={teacher ? "Class insights" : "Your performance"} subtitle={teacher ? "A real-time snapshot of your learning community." : "A clear view of your points over time."} />
      {query.isLoading ? <LoadingState label="Gathering your insights…" /> : query.isError ? <ErrorState message={getErrorMessage(query.error, "Unable to load analytics.")} onRetry={query.refetch} /> : student && data ? (
        <>
          <Card style={[{ backgroundColor: colors.primarySoft, borderColor: "transparent" }]}>
            <ChartNoAxesCombined size={21} color={colors.primary} />
            <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "700" }}>REPORTING PERIOD</Text>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: "800" }}>{formatDate(data.from)} – {formatDate(data.to)}</Text>
          </Card>
          <Card>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: "800" }}>Points overview</Text>
            <BarChart values={[data?.earned ?? 0, data?.deducted ?? 0]} labels={["Earned", "Deducted"]} />
          </Card>
          <View style={[styles.metricsGrid, isTabletOrDesktop && styles.metricsGridTablet]}>
            <Metric icon={<CircleArrowUp size={17} color={colors.accent} />} label="Points earned" value={data?.earned ?? 0} />
            <Metric icon={<CircleArrowDown size={17} color={colors.warning} />} label="Points deducted" value={data?.deducted ?? 0} />
            <Metric icon={<WalletCards size={17} color={colors.primary} />} label="Net points" value={data?.netPoints ?? 0} />
            <Metric icon={<ChartNoAxesCombined size={17} color={colors.primary} />} label="Transactions" value={data?.transactionCount ?? 0} />
          </View>
        </>
      ) : teacher && summary ? (
        <>
          <Card>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: "800" }}>Today’s points activity</Text>
            <BarChart values={[summary.pointsAwardedToday ?? summary.todayAwardedPoints ?? 0, summary.pointsDeductedToday ?? summary.todayDeductedPoints ?? 0]} labels={["Awarded", "Deducted"]} />
          </Card>
          <View style={[styles.metricsGrid, isTabletOrDesktop && styles.metricsGridTablet]}>
            <Metric icon={<ChartNoAxesCombined size={17} color={colors.primary} />} label="Students" value={summary.studentCount ?? summary.totalStudents ?? 0} />
            <Metric icon={<WalletCards size={17} color={colors.accent} />} label="Total class points" value={summary.totalPoints ?? summary.totalPointsDistributed ?? 0} />
            <Metric icon={<CircleArrowUp size={17} color={colors.accent} />} label="Awarded today" value={summary.pointsAwardedToday ?? summary.todayAwardedPoints ?? 0} />
            <Metric icon={<CircleArrowDown size={17} color={colors.warning} />} label="Deducted today" value={summary.pointsDeductedToday ?? summary.todayDeductedPoints ?? 0} />
            <Metric icon={<ChartNoAxesCombined size={17} color={colors.primary} />} label="Transactions today" value={summary.transactionsToday ?? summary.todayTransactions ?? 0} />
          </View>
        </>
      ) : <EmptyState title="Insights are getting ready" message="Performance data will appear when it is available from your account." />}
    </Screen>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value?: number | null }) {
  const { colors } = useTheme();
  const { isTabletOrDesktop } = useResponsive();
  const displayValue = typeof value === "number" && !isNaN(value) ? value.toLocaleString() : (value != null ? String(value) : "0");
  return (
    <Card style={[styles.metricCard, isTabletOrDesktop && styles.metricCardTablet]}>
      <ViewIcon background={colors.primarySoft}>{icon}</ViewIcon>
      <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12, flex: 1, minWidth: 0 }}>{label}</Text>
      <Text style={{ color: colors.text, fontFamily: "JetBrainsMono_700Bold", fontSize: 17, fontWeight: "800", flexShrink: 0 }}>{displayValue}</Text>
    </Card>
  );
}

function ViewIcon({ background, children }: React.PropsWithChildren<{ background: string }>) {
  return <Card style={{ width: 39, height: 39, padding: 0, borderWidth: 0, alignItems: "center", justifyContent: "center", backgroundColor: background, flexShrink: 0 }}>{children}</Card>;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const styles = StyleSheet.create({
  metricsGrid: { flexDirection: "column", gap: 10, width: "100%" },
  metricsGridTablet: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metricCard: { flexDirection: "row", alignItems: "center", gap: 13, width: "100%" },
  metricCardTablet: { width: "48.5%", flexGrow: 1, minWidth: 260 },
});
