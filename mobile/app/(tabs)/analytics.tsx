import React from "react";
import { AppText as Text } from "@/components/AppText";
import { Redirect } from "expo-router";
import { ChartNoAxesCombined, CircleArrowDown, CircleArrowUp, WalletCards } from "lucide-react-native";
import { Screen, PageHeader, Card, LoadingState, ErrorState, EmptyState } from "@/components/ui";
import { BarChart } from "@/components/visuals";
import { useTheme } from "@/context/ThemeContext";
import { useAppSelector } from "@/store";
import { useStudentAnalyticsQuery, useTeacherDashboardQuery } from "@/store/api";
import { getErrorMessage } from "@/lib/apiConfig";
import { isStudentRole, isTeacherRole } from "@/lib/types";

export default function AnalyticsScreen() {
  const { colors } = useTheme();
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
            <BarChart values={[data.earned, data.deducted]} labels={["Earned", "Deducted"]} />
          </Card>
          <Metric icon={<CircleArrowUp size={17} color={colors.accent} />} label="Points earned" value={data.earned} />
          <Metric icon={<CircleArrowDown size={17} color={colors.warning} />} label="Points deducted" value={data.deducted} />
          <Metric icon={<WalletCards size={17} color={colors.primary} />} label="Net points" value={data.netPoints} />
          <Metric icon={<ChartNoAxesCombined size={17} color={colors.primary} />} label="Transactions" value={data.transactionCount} />
        </>
      ) : teacher && summary ? (
        <>
          <Card>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: "800" }}>Today’s points activity</Text>
            <BarChart values={[summary.pointsAwardedToday, summary.pointsDeductedToday]} labels={["Awarded", "Deducted"]} />
          </Card>
          <Metric icon={<ChartNoAxesCombined size={17} color={colors.primary} />} label="Students" value={summary.studentCount} />
          <Metric icon={<WalletCards size={17} color={colors.accent} />} label="Total class points" value={summary.totalPoints} />
          <Metric icon={<CircleArrowUp size={17} color={colors.accent} />} label="Awarded today" value={summary.pointsAwardedToday} />
          <Metric icon={<CircleArrowDown size={17} color={colors.warning} />} label="Deducted today" value={summary.pointsDeductedToday} />
          <Metric icon={<ChartNoAxesCombined size={17} color={colors.primary} />} label="Transactions today" value={summary.transactionsToday} />
        </>
      ) : <EmptyState title="Insights are getting ready" message="Performance data will appear when it is available from your account." />}
    </Screen>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  const { colors } = useTheme();
  return <Card style={{ flexDirection: "row", alignItems: "center", gap: 13 }}>
    <ViewIcon background={colors.primarySoft}>{icon}</ViewIcon>
    <Text style={{ color: colors.muted, fontSize: 12, flex: 1 }}>{label}</Text>
    <Text style={{ color: colors.text, fontFamily: "JetBrainsMono_700Bold", fontSize: 17, fontWeight: "800" }}>{value.toLocaleString()}</Text>
  </Card>;
}

function ViewIcon({ background, children }: React.PropsWithChildren<{ background: string }>) {
  return <Card style={{ width: 39, height: 39, padding: 0, borderWidth: 0, alignItems: "center", justifyContent: "center", backgroundColor: background }}>{children}</Card>;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
