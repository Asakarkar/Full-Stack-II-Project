import React, { useMemo, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Search, Trophy } from "lucide-react-native";
import { Screen, PageHeader, Card, SectionTitle, LoadingState, ErrorState, EmptyState, Pagination, Button } from "@/components/ui";
import { Avatar, StudentRow } from "@/components/visuals";
import { useTheme } from "@/context/ThemeContext";
import { useAppDispatch, useAppSelector } from "@/store";
import { setPage, setSort } from "@/store/leaderboardSlice";
import { useLeaderboardQuery, useStudentProfileQuery } from "@/store/api";
import { getErrorMessage } from "@/lib/apiConfig";
import { isStudentRole } from "@/lib/types";
import { AppText as Text } from "@/components/AppText";

const sortChoices = [{ key: "points", label: "Points" }, { key: "displayName", label: "Name" }, { key: "grade", label: "Grade" }] as const;

export default function LeaderboardScreen() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const filters = useAppSelector((state) => state.leaderboard);
  const user = useAppSelector((state) => state.auth.user);
  const student = useStudentProfileQuery(undefined, { skip: !isStudentRole(user?.role) });
  const [search, setSearch] = useState("");
  const { data, isLoading, isFetching, isError, error, refetch } = useLeaderboardQuery(filters);
  const top = useLeaderboardQuery({ page: 1, limit: 3, sort: "points", order: "desc" });
  const visibleItems = useMemo(() => (data?.items ?? []).filter((entry) => {
    const query = search.trim().toLocaleLowerCase();
    return !query || entry.displayName.toLocaleLowerCase().includes(query) || (entry.grade ?? "").toLocaleLowerCase().includes(query);
  }), [data?.items, search]);
  const ownProfileId = student.data?.id;

  return (
    <Screen onRefresh={() => { void Promise.all([refetch(), top.refetch()]); if (isStudentRole(user?.role)) void student.refetch(); }} refreshing={isFetching || top.isFetching || student.isFetching}>
      <PageHeader title="Leaderboard" subtitle="Celebrate progress, one point at a time." />
      <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search size={17} color={colors.muted} />
        <TextInput value={search} onChangeText={setSearch} placeholder="Search this page by name or grade" placeholderTextColor={colors.muted} style={[styles.searchInput, { color: colors.text }]} />
      </View>
      <View style={styles.sortRow}>
        {sortChoices.map((choice) => {
          const active = filters.sort === choice.key;
          return <Button key={choice.key} title={`${choice.label}${active ? (filters.order === "asc" ? " ↑" : " ↓") : ""}`} onPress={() => dispatch(setSort(choice.key))} variant={active ? "primary" : "secondary"} />;
        })}
      </View>
      {isLoading ? <LoadingState label="Fetching rankings…" /> : isError ? <ErrorState message={getErrorMessage(error, "Unable to load rankings.")} onRetry={refetch} /> : (
        <>
          {data?.items.length ? (
            <>
              {top.data?.items.length ? (
                <Card style={[styles.topCard, { backgroundColor: colors.primarySoft, borderColor: "transparent" }]}>
                  <View style={styles.topTitle}><Trophy size={17} color={colors.warning} /><Text style={{ color: colors.text, fontSize: 14, fontWeight: "800" }}>Top of the class</Text></View>
                  <View style={styles.podium}>
                    {top.data.items.map((entry) => <View key={entry.studentId} style={styles.podiumPerson}>
                      <Avatar name={entry.displayName} size={45} />
                      <View style={[styles.rankBadge, { backgroundColor: entry.rank === 1 ? colors.warning : colors.surface }]}><Text style={{ color: entry.rank === 1 ? "#FFFFFF" : colors.muted, fontSize: 10, fontWeight: "900" }}>#{entry.rank}</Text></View>
                      <Text numberOfLines={1} style={[styles.podiumName, { color: colors.text }]}>{entry.displayName}</Text>
                      <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "800" }}>{entry.points.toLocaleString()} pts</Text>
                      {entry.studentId === ownProfileId && <Text style={{ color: colors.primary, fontSize: 9, fontWeight: "900" }}>YOU</Text>}
                    </View>)}
                  </View>
                </Card>
              ) : null}
              {top.isError && <ErrorState message={getErrorMessage(top.error, "Top rankings are unavailable.")} onRetry={top.refetch} />}
              <View style={styles.listHeader}><SectionTitle title="All learners" /><Text style={{ color: colors.muted, fontSize: 11 }}>{data.total.toLocaleString()} total</Text></View>
              {visibleItems.length ? <Card>{visibleItems.map((entry, index) => {
                const isCurrentUser = !!ownProfileId && entry.studentId === ownProfileId;
                return <View key={entry.studentId} style={{ gap: 12 }}>
                  {index > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                  <View style={[styles.rowHighlight, isCurrentUser && { backgroundColor: colors.primarySoft, borderRadius: 13, padding: 8, marginHorizontal: -8 }]}>
                    <StudentRow student={entry} />
                    {isCurrentUser && <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "900", marginLeft: 52 }}>YOU</Text>}
                  </View>
                </View>;
              })}</Card> : <EmptyState title="No matches on this page" message="Try another search, or move to a different leaderboard page." />}
              <Pagination page={data.page} totalPages={data.totalPages} onChange={(page) => dispatch(setPage(page))} />
              {isFetching && <Text style={[styles.refresh, { color: colors.muted }]}>Updating rankings…</Text>}
            </>
          ) : <EmptyState title="No rankings yet" message="Learners will appear when points are recorded." />}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchWrap: { minHeight: 47, borderWidth: 1, borderRadius: 14, flexDirection: "row", alignItems: "center", paddingHorizontal: 13, gap: 10 },
  searchInput: { flex: 1, fontSize: 12, minHeight: 44 },
  sortRow: { flexDirection: "row", gap: 8 },
  topCard: { gap: 15 },
  topTitle: { flexDirection: "row", alignItems: "center", gap: 8 },
  podium: { flexDirection: "row", justifyContent: "space-around", gap: 9 },
  podiumPerson: { flex: 1, alignItems: "center", gap: 6 },
  podiumName: { fontSize: 11, fontWeight: "700" },
  rankBadge: { height: 23, minWidth: 35, paddingHorizontal: 7, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  listHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowHighlight: { gap: 4 },
  divider: { height: StyleSheet.hairlineWidth },
  refresh: { textAlign: "center", fontSize: 11 },
});
