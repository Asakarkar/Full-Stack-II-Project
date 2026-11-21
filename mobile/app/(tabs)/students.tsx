import React, { useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, TextInput, View } from "react-native";
import { router, Redirect } from "expo-router";
import { Search, SlidersHorizontal, Users } from "lucide-react-native";
import { Screen, PageHeader, Card, Field, Button, LoadingState, ErrorState, EmptyState, Pagination } from "@/components/ui";
import { StudentRow } from "@/components/visuals";
import { useTheme } from "@/context/ThemeContext";
import { useAppDispatch, useAppSelector } from "@/store";
import { setStudentFilters, setStudentPage, setStudentSearch, setStudentSort } from "@/store/studentSlice";
import { useStudentsQuery } from "@/store/api";
import { getErrorMessage } from "@/lib/apiConfig";
import { isTeacherRole } from "@/lib/types";
import { AppText as Text } from "@/components/AppText";

const sortChoices = [
  { label: "Name", value: "displayName" },
  { label: "Email", value: "email" },
  { label: "Grade", value: "grade" },
  { label: "Points", value: "points" },
  { label: "Updated", value: "updatedAt" },
] as const;

export default function StudentsScreen() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const role = useAppSelector((state) => state.auth.user?.role);
  const criteria = useAppSelector((state) => state.students);
  const [search, setSearch] = useState(criteria.search);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [grade, setGrade] = useState(criteria.grade);
  const [minimum, setMinimum] = useState(criteria.minPoints?.toString() ?? "");
  const [maximum, setMaximum] = useState(criteria.maxPoints?.toString() ?? "");
  const [filterError, setFilterError] = useState("");
  const { data, isLoading, isFetching, isError, error, refetch } = useStudentsQuery(criteria, { skip: !isTeacherRole(role) });

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== criteria.search) dispatch(setStudentSearch(search));
    }, 350);
    return () => clearTimeout(timer);
  }, [search, criteria.search, dispatch]);

  const applyFilters = () => {
    const minPoints = minimum.trim() ? Number(minimum) : null;
    const maxPoints = maximum.trim() ? Number(maximum) : null;
    if ((minPoints !== null && !Number.isSafeInteger(minPoints)) || (maxPoints !== null && !Number.isSafeInteger(maxPoints))) {
      setFilterError("Enter whole-number point values.");
      return;
    }
    if (minPoints !== null && maxPoints !== null && minPoints > maxPoints) {
      setFilterError("Minimum points cannot exceed maximum points.");
      return;
    }
    setFilterError("");
    dispatch(setStudentFilters({ grade: grade.trim(), minPoints, maxPoints }));
  };

  const clearFilters = () => {
    setGrade("");
    setMinimum("");
    setMaximum("");
    setFilterError("");
    dispatch(setStudentFilters({ grade: "", minPoints: null, maxPoints: null }));
  };

  if (!isTeacherRole(role)) return <Redirect href="/(tabs)" />;

  const header = (
    <View style={styles.listHeader}>
      <PageHeader title="Students" subtitle="Find your learners and follow their progress." />
      <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search size={18} color={colors.muted} />
        <TextInput value={search} onChangeText={setSearch} placeholder="Search name or email" placeholderTextColor={colors.muted} style={[styles.search, { color: colors.text }]} returnKeyType="search" accessibilityLabel="Search students" />
      </View>
      <Pressable accessibilityRole="button" onPress={() => setFiltersOpen((open) => !open)} style={[styles.filterToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <SlidersHorizontal size={16} color={colors.primary} />
        <Text style={{ color: colors.text, fontSize: 12, fontWeight: "700" }}>Filters</Text>
        {(criteria.grade || criteria.minPoints !== null || criteria.maxPoints !== null) && <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "800" }}>APPLIED</Text>}
      </Pressable>
      {filtersOpen && (
        <Card style={styles.filterCard}>
          <Field label="Grade (exact)" placeholder="Any grade" value={grade} onChangeText={setGrade} maxLength={50} />
          <View style={styles.rangeRow}>
            <Field label="Min points" placeholder="No minimum" value={minimum} onChangeText={(value) => setMinimum(value.replace(/[^\d]/g, ""))} keyboardType="number-pad" />
            <Field label="Max points" placeholder="No maximum" value={maximum} onChangeText={(value) => setMaximum(value.replace(/[^\d]/g, ""))} keyboardType="number-pad" />
          </View>
          {!!filterError && <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: 11 }}>{filterError}</Text>}
          <View style={styles.filterActions}>
            <Button title="Apply" onPress={applyFilters} />
            <Button title="Clear" variant="ghost" onPress={clearFilters} />
          </View>
        </Card>
      )}
      <Text style={[styles.sortHeading, { color: colors.muted }]}>SORT STUDENTS</Text>
      <View style={styles.sortRow}>
        {sortChoices.map((choice) => {
          const active = criteria.sort === choice.value;
          return <Pressable key={choice.value} accessibilityRole="button" onPress={() => dispatch(setStudentSort(choice.value))} style={[styles.sortChip, { backgroundColor: active ? colors.primarySoft : colors.surface, borderColor: active ? colors.primary : colors.border }]}>
            <Text style={{ color: active ? colors.primary : colors.muted, fontSize: 10, fontWeight: "700" }}>{choice.label}{active ? (criteria.order === "asc" ? " ↑" : " ↓") : ""}</Text>
          </Pressable>;
        })}
      </View>
      <View style={styles.resultHeader}><View style={styles.resultTitle}><Users size={16} color={colors.primary} /><Text style={{ color: colors.text, fontSize: 13, fontWeight: "700" }}>Learner directory</Text></View><Text style={{ color: colors.muted, fontSize: 11 }}>{data ? `${data.total} results` : ""}</Text></View>
    </View>
  );

  if (isLoading) return <Screen><PageHeader title="Students" subtitle="Find your learners and follow their progress." /><LoadingState label="Finding your students…" /></Screen>;
  if (isError) return <Screen><PageHeader title="Students" subtitle="Find your learners and follow their progress." /><ErrorState message={getErrorMessage(error, "Unable to load students.")} onRetry={refetch} /></Screen>;
  return (
    <Screen scroll={false} style={styles.screen}>
      <FlatList
        data={data?.items ?? []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        ListEmptyComponent={<EmptyState title={criteria.search || criteria.grade || criteria.minPoints !== null || criteria.maxPoints !== null ? "No students match these filters" : "Your directory is empty"} message={criteria.search || criteria.grade || criteria.minPoints !== null || criteria.maxPoints !== null ? "Try changing the search or filters." : "Students connected to your class will appear here."} />}
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
        renderItem={({ item }) => (
          <Pressable accessibilityRole="button" accessibilityLabel={`View ${item.displayName}`} onPress={() => router.push({
            pathname: "/teacher/student/[studentId]",
            params: { studentId: item.id, name: item.displayName, grade: item.grade ?? "" },
          })} style={({ pressed }) => [styles.studentItem, { backgroundColor: colors.surface, opacity: pressed ? 0.75 : 1 }]}>
            <StudentRow student={item} />
            {!!item.grade && <Text style={[styles.grade, { color: colors.muted }]}>{item.grade}</Text>}
          </Pressable>
        )}
        ListFooterComponent={data?.items.length ? <Pagination page={data.page} totalPages={data.totalPages} onChange={(page) => dispatch(setStudentPage(page))} /> : null}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} colors={[colors.primary]} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 8, gap: 0 },
  listContent: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 28, gap: 14 },
  listHeader: { gap: 15 },
  searchWrap: { minHeight: 48, borderWidth: 1, borderRadius: 15, flexDirection: "row", alignItems: "center", paddingHorizontal: 13, gap: 10 },
  search: { flex: 1, fontSize: 14, minHeight: 46 },
  filterToggle: { minHeight: 44, borderWidth: 1, borderRadius: 13, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 8 },
  filterCard: { gap: 13, padding: 14 },
  rangeRow: { flexDirection: "row", gap: 10 },
  filterActions: { flexDirection: "row", gap: 9 },
  sortHeading: { fontSize: 9, fontWeight: "900", letterSpacing: 1.5 },
  sortRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  sortChip: { minHeight: 44, borderWidth: 1, borderRadius: 13, paddingVertical: 10, paddingHorizontal: 10, justifyContent: "center" },
  resultHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 },
  resultTitle: { flexDirection: "row", alignItems: "center", gap: 7 },
  studentItem: { borderRadius: 16, paddingHorizontal: 13, paddingVertical: 12, gap: 9 },
  grade: { fontSize: 10, marginLeft: 52 },
  separator: { height: 7, backgroundColor: "transparent" },
});
