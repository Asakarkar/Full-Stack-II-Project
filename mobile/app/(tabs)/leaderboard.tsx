import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Clock, Crown, Flame, Medal, Search, Sparkles, Trophy } from "lucide-react-native";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { Screen, PageHeader, Card, SectionTitle, LoadingState, ErrorState, EmptyState, Pagination, Button } from "@/components/ui";
import { Avatar } from "@/components/visuals";
import { PointAwardSheet } from "@/components/PointAwardSheet";
import { useTheme } from "@/context/ThemeContext";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  fetchActivityFeed,
  fetchLeaderboard,
  fetchMyRank,
  fetchNextPage,
  refreshLeaderboard,
  setPage,
  setSort,
} from "@/store/leaderboardSlice";
import { calculateMilestone, getRankMedal } from "@/lib/gamification";
import { isStudentRole, isTeacherRole, LeaderboardEntry, PointTransaction } from "@/lib/types";
import { AppText as Text } from "@/components/AppText";

const sortChoices = [
  { key: "points", label: "Points" },
  { key: "displayName", label: "Name" },
] as const;

export default function LeaderboardScreen() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const leaderboardState = useAppSelector((state) => state.leaderboard);
  const user = useAppSelector((state) => state.auth.user);

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"ranks" | "activity">("ranks");
  const [selectedStudentForAward, setSelectedStudentForAward] = useState<LeaderboardEntry | null>(null);

  const {
    students,
    pagination,
    currentUserRank,
    myRankEntry,
    activity,
    activityLoading,
    loading,
    refreshing,
    error,
    sort,
    order,
  } = leaderboardState;

  const isTeacher = isTeacherRole(user?.role);
  const isStudent = isStudentRole(user?.role);
  const currentUserId = user?.id;

  useEffect(() => {
    dispatch(
      fetchLeaderboard({
        page: pagination.page,
        size: pagination.size,
        direction: leaderboardState.activeSort.direction,
      })
    );
    if (isStudent) {
      dispatch(fetchMyRank());
    }
    dispatch(fetchActivityFeed());
  }, [dispatch, pagination.page, pagination.size, leaderboardState.activeSort.direction, isStudent]);

  const onRefresh = () => {
    dispatch(refreshLeaderboard());
  };

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return students.filter((entry) => {
      if (!query) return true;
      const name = entry.displayName.toLowerCase();
      const email = (entry.email ?? "").toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [students, search]);

  // Top 3 Podium
  const topThree = useMemo(() => {
    return [...students].sort((a, b) => b.points - a.points).slice(0, 3);
  }, [students]);

  const gold = topThree[0];
  const silver = topThree[1];
  const bronze = topThree[2];

  // Current student's personal rank details (from myRankEntry or page match)
  const personalRank = myRankEntry?.rank ?? currentUserRank;
  const personalPoints = myRankEntry?.points ?? students.find((s) => s.userId === currentUserId || s.studentId === currentUserId)?.points ?? 0;
  const personalMilestone = calculateMilestone(personalPoints);

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <PageHeader
        title="Leaderboard"
        subtitle={isTeacher ? "Academic evaluation & merit recognition" : "Celebrate your progress, one achievement at a time."}
      />

      {/* View Switcher: Rankings vs Recent Activity Feed */}
      <View style={styles.tabSwitcher}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setActiveTab("ranks")}
          style={[
            styles.tabBtn,
            {
              backgroundColor: activeTab === "ranks" ? colors.primarySoft : colors.surface,
              borderColor: activeTab === "ranks" ? colors.primary : colors.border,
            },
          ]}
        >
          <Trophy size={16} color={activeTab === "ranks" ? colors.primary : colors.muted} />
          <Text style={[styles.tabBtnText, { color: activeTab === "ranks" ? colors.primary : colors.text }]}>
            Rankings
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setActiveTab("activity")}
          style={[
            styles.tabBtn,
            {
              backgroundColor: activeTab === "activity" ? colors.primarySoft : colors.surface,
              borderColor: activeTab === "activity" ? colors.primary : colors.border,
            },
          ]}
        >
          <Clock size={16} color={activeTab === "activity" ? colors.primary : colors.muted} />
          <Text style={[styles.tabBtnText, { color: activeTab === "activity" ? colors.primary : colors.text }]}>
            Recent Activity
          </Text>
        </Pressable>
      </View>

      {/* STUDENT'S PINNED PERSONAL RANK CARD */}
      {isStudent && (
        <Card style={[styles.personalCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
          <View style={styles.personalTopRow}>
            <View style={styles.personalBadgeWrap}>
              <View style={[styles.personalRankPill, { backgroundColor: colors.primarySoft }]}>
                <Flame size={14} color={colors.primary} />
                <Text style={[styles.personalRankText, { color: colors.primary }]}>
                  YOUR RANK: #{personalRank ?? "—"}
                </Text>
              </View>
              <Text style={[styles.personalTitle, { color: colors.text }]}>{user?.fullName || "Your Profile"}</Text>
              <Text style={[styles.personalSub, { color: colors.muted }]}>{personalMilestone.currentTier}</Text>
            </View>
            <View style={styles.personalPointsBox}>
              <Text style={[styles.personalPointsNum, { color: colors.primary }]}>{personalPoints.toLocaleString()}</Text>
              <Text style={[styles.personalPointsLabel, { color: colors.muted }]}>Total Points</Text>
            </View>
          </View>

          {/* Motivational Milestone Progress Bar */}
          {personalMilestone.nextTier && (
            <View style={styles.milestoneWrap}>
              <View style={styles.milestoneLabels}>
                <Text style={[styles.milestoneNextText, { color: colors.muted }]}>Next: {personalMilestone.nextTier}</Text>
                <Text style={[styles.milestonePointsText, { color: colors.primary }]}>
                  {personalMilestone.pointsToNext} pts to level up
                </Text>
              </View>
              <View style={[styles.progressBarBg, { backgroundColor: colors.raised }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      backgroundColor: colors.primary,
                      width: `${personalMilestone.progressPercent}%`,
                    },
                  ]}
                />
              </View>
            </View>
          )}
        </Card>
      )}

      {/* TAB CONTENT: RANKINGS */}
      {activeTab === "ranks" && (
        <>
          {/* ANIMATED TOP-THREE PODIUM */}
          {topThree.length >= 2 && !loading && (
            <Animated.View entering={FadeIn.duration(450)} style={[styles.podiumContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.podiumHeader}>
                <Crown size={18} color="#F59E0B" />
                <Text style={[styles.podiumTitle, { color: colors.text }]}>Top Academic Achievers</Text>
              </View>

              <View style={styles.podiumStage}>
                {/* 2nd Place: Silver (Left) */}
                {silver && (
                  <Animated.View entering={FadeInUp.duration(400).delay(80)} style={styles.podiumColumn}>
                    <Avatar name={silver.displayName} size={46} />
                    <View style={[styles.medalBadge, { backgroundColor: "#F1F5F9", borderColor: "#64748B" }]}>
                      <Medal size={12} color="#64748B" />
                      <Text style={styles.medalTextSilver}>#2</Text>
                    </View>
                    <Text numberOfLines={1} style={[styles.podiumName, { color: colors.text }]}>
                      {silver.displayName}
                    </Text>
                    <Text style={[styles.podiumPoints, { color: colors.primary }]}>{silver.points} pts</Text>
                    <View style={[styles.pedestal, styles.pedestalSilver, { backgroundColor: colors.raised }]}>
                      <Text style={[styles.pedestalRank, { color: "#64748B" }]}>2</Text>
                    </View>
                  </Animated.View>
                )}

                {/* 1st Place: Gold (Center - Tallest) */}
                {gold && (
                  <Animated.View entering={FadeInUp.duration(450)} style={styles.podiumColumn}>
                    <View style={styles.crownWrapper}>
                      <Crown size={20} color="#F59E0B" />
                    </View>
                    <Avatar name={gold.displayName} size={54} />
                    <View style={[styles.medalBadge, { backgroundColor: "#FEF3C7", borderColor: "#F59E0B" }]}>
                      <Trophy size={13} color="#D97706" />
                      <Text style={styles.medalTextGold}>#1</Text>
                    </View>
                    <Text numberOfLines={1} style={[styles.podiumName, styles.goldName, { color: colors.text }]}>
                      {gold.displayName}
                    </Text>
                    <Text style={[styles.podiumPoints, styles.goldPoints]}>{gold.points} pts</Text>
                    <View style={[styles.pedestal, styles.pedestalGold, { backgroundColor: `${colors.primarySoft}` }]}>
                      <Text style={[styles.pedestalRank, { color: "#D97706" }]}>1</Text>
                    </View>
                  </Animated.View>
                )}

                {/* 3rd Place: Bronze (Right) */}
                {bronze && (
                  <Animated.View entering={FadeInUp.duration(400).delay(160)} style={styles.podiumColumn}>
                    <Avatar name={bronze.displayName} size={42} />
                    <View style={[styles.medalBadge, { backgroundColor: "#FFEDD5", borderColor: "#B45309" }]}>
                      <Medal size={12} color="#B45309" />
                      <Text style={styles.medalTextBronze}>#3</Text>
                    </View>
                    <Text numberOfLines={1} style={[styles.podiumName, { color: colors.text }]}>
                      {bronze.displayName}
                    </Text>
                    <Text style={[styles.podiumPoints, { color: colors.primary }]}>{bronze.points} pts</Text>
                    <View style={[styles.pedestal, styles.pedestalBronze, { backgroundColor: colors.raised }]}>
                      <Text style={[styles.pedestalRank, { color: "#B45309" }]}>3</Text>
                    </View>
                  </Animated.View>
                )}
              </View>
            </Animated.View>
          )}

          {/* Search Bar & Sorting Controls */}
          <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Search size={17} color={colors.muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search students by name..."
              placeholderTextColor={colors.muted}
              style={[styles.searchInput, { color: colors.text }]}
            />
          </View>

          <View style={styles.sortRow}>
            {sortChoices.map((choice) => {
              const active = sort === choice.key;
              return (
                <Button
                  key={choice.key}
                  title={`${choice.label}${active ? (order === "asc" ? " ↑" : " ↓") : ""}`}
                  onPress={() => dispatch(setSort(choice.key))}
                  variant={active ? "primary" : "secondary"}
                />
              );
            })}
          </View>

          {/* SKELETON LOADERS / ERROR / LIST */}
          {loading && !students.length ? (
            <LoadingState label="Calculating real-time academic rankings…" />
          ) : error && !students.length ? (
            <ErrorState message={error} onRetry={onRefresh} />
          ) : (
            <>
              <View style={styles.listHeader}>
                <SectionTitle title="All Ranked Learners" />
                <Text style={{ color: colors.muted, fontSize: 11 }}>
                  {pagination.totalElements.toLocaleString()} Total Students
                </Text>
              </View>

              {visibleItems.length > 0 ? (
                <View style={styles.studentCardsList}>
                  {visibleItems.map((entry, index) => {
                    const isSelf = entry.userId === currentUserId || entry.studentId === currentUserId;
                    const medal = getRankMedal(entry.rank);

                    return (
                      <Animated.View
                        key={entry.studentId}
                        entering={FadeInDown.duration(300).delay(Math.min(index * 35, 300))}
                      >
                        <Card
                          style={[
                            styles.studentCard,
                            { backgroundColor: colors.surface, borderColor: isSelf ? colors.primary : colors.border },
                            isSelf && { backgroundColor: `${colors.primarySoft}40` },
                          ]}
                        >
                          <View style={styles.cardMain}>
                            {/* Rank Indicator */}
                            <View
                              style={[
                                styles.rankIndicator,
                                {
                                  backgroundColor: medal.bgColor,
                                  borderColor: medal.badgeColor,
                                },
                              ]}
                            >
                              <Text style={[styles.rankIndicatorText, { color: medal.badgeColor }]}>
                                #{entry.rank}
                              </Text>
                            </View>

                            <Avatar name={entry.displayName} size={42} />

                            <View style={styles.studentDetails}>
                              <View style={styles.nameRow}>
                                <Text numberOfLines={1} style={[styles.cardName, { color: colors.text }]}>
                                  {entry.displayName}
                                </Text>
                                {isSelf && (
                                  <View style={[styles.youBadge, { backgroundColor: colors.primary }]}>
                                    <Text style={styles.youBadgeText}>YOU</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={[styles.cardSub, { color: colors.muted }]}>
                                Tier: {calculateMilestone(entry.points).currentTier}
                              </Text>
                            </View>

                            {/* Score & Teacher Award Button */}
                            <View style={styles.cardActions}>
                              <View style={styles.scoreBox}>
                                <Text style={[styles.pointsValue, { color: colors.primary }]}>
                                  {entry.points.toLocaleString()}
                                </Text>
                                <Text style={[styles.pointsUnit, { color: colors.muted }]}>pts</Text>
                              </View>

                              {isTeacher && (
                                <Pressable
                                  accessibilityRole="button"
                                  accessibilityLabel={`Award points to ${entry.displayName}`}
                                  onPress={() => setSelectedStudentForAward(entry)}
                                  style={[styles.awardPill, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}
                                >
                                  <Sparkles size={12} color={colors.primary} />
                                  <Text style={[styles.awardPillText, { color: colors.primary }]}>Award</Text>
                                </Pressable>
                              )}
                            </View>
                          </View>
                        </Card>
                      </Animated.View>
                    );
                  })}
                </View>
              ) : (
                <EmptyState
                  title={search ? "No students match this query" : "No rankings available"}
                  message={search ? "Try searching another student name." : "Learners will be listed once points are awarded."}
                />
              )}

              {/* Server-Side Pagination Controls */}
              {pagination.totalPages > 1 && (
                <Pagination
                  page={pagination.page + 1}
                  totalPages={pagination.totalPages}
                  onChange={(nextPage) => dispatch(setPage(nextPage))}
                />
              )}

              {!pagination.isLast && (
                <Button
                  title="Load More Students"
                  variant="secondary"
                  loading={loading}
                  onPress={() => dispatch(fetchNextPage())}
                />
              )}
            </>
          )}
        </>
      )}

      {/* TAB CONTENT: RECENT ACTIVITY FEED */}
      {activeTab === "activity" && (
        <View style={styles.activityContainer}>
          <View style={styles.listHeader}>
            <SectionTitle title="Live Activity Feed" />
            <Text style={{ color: colors.muted, fontSize: 11 }}>Synchronized with ledger</Text>
          </View>

          {activityLoading && !activity.length ? (
            <LoadingState label="Loading recent ledger transactions…" />
          ) : activity.length > 0 ? (
            <Card>
              {activity.map((tx: PointTransaction, index: number) => {
                const isPositive = tx.deltaPoints > 0;
                return (
                  <View key={tx.id || index} style={{ gap: 10 }}>
                    {index > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                    <View style={styles.activityRow}>
                      <View
                        style={[
                          styles.activityIconCircle,
                          { backgroundColor: isPositive ? `${colors.accent}18` : `${colors.danger}18` },
                        ]}
                      >
                        {isPositive ? <Sparkles size={16} color={colors.accent} /> : <Medal size={16} color={colors.danger} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.activityStudent, { color: colors.text }]}>{tx.studentName}</Text>
                        <Text style={[styles.activityReason, { color: colors.muted }]}>{tx.reason}</Text>
                        <Text style={[styles.activityTeacher, { color: colors.muted }]}>By {tx.teacherName}</Text>
                      </View>
                      <View style={styles.activityDeltaBox}>
                        <Text style={[styles.activityDelta, { color: isPositive ? colors.accent : colors.danger }]}>
                          {isPositive ? `+${tx.deltaPoints}` : `${tx.deltaPoints}`} pts
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </Card>
          ) : (
            <EmptyState
              title="No recent activity"
              message="When teachers award or adjust points, transactions appear here in real time."
            />
          )}
        </View>
      )}

      {/* TEACHER POINT AWARD BOTTOM SHEET */}
      <PointAwardSheet
        visible={!!selectedStudentForAward}
        student={selectedStudentForAward}
        onClose={() => setSelectedStudentForAward(null)}
        onSuccess={() => {
          dispatch(refreshLeaderboard());
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabSwitcher: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 4,
  },
  tabBtn: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  tabBtnText: {
    fontWeight: "700",
    fontSize: 13,
  },
  personalCard: {
    padding: 16,
    gap: 12,
    borderWidth: 1.5,
  },
  personalTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  personalBadgeWrap: {
    gap: 4,
  },
  personalRankPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  personalRankText: {
    fontWeight: "900",
    fontSize: 12,
  },
  personalTitle: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 18,
    fontWeight: "800",
  },
  personalSub: {
    fontSize: 12,
  },
  personalPointsBox: {
    alignItems: "flex-end",
  },
  personalPointsNum: {
    fontFamily: "JetBrainsMono_700Bold",
    fontSize: 24,
    fontWeight: "800",
  },
  personalPointsLabel: {
    fontSize: 11,
  },
  milestoneWrap: {
    gap: 6,
  },
  milestoneLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  milestoneNextText: {
    fontSize: 11,
  },
  milestonePointsText: {
    fontSize: 11,
    fontWeight: "700",
  },
  progressBarBg: {
    height: 7,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  podiumContainer: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    gap: 16,
  },
  podiumHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  podiumTitle: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 15,
    fontWeight: "800",
  },
  podiumStage: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    gap: 8,
    paddingTop: 8,
  },
  podiumColumn: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  crownWrapper: {
    marginBottom: -4,
  },
  medalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  medalTextGold: {
    color: "#D97706",
    fontWeight: "900",
    fontSize: 11,
  },
  medalTextSilver: {
    color: "#64748B",
    fontWeight: "900",
    fontSize: 10,
  },
  medalTextBronze: {
    color: "#B45309",
    fontWeight: "900",
    fontSize: 10,
  },
  podiumName: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  goldName: {
    fontSize: 13,
    fontWeight: "800",
  },
  podiumPoints: {
    fontFamily: "JetBrainsMono_700Bold",
    fontSize: 11,
    fontWeight: "800",
  },
  goldPoints: {
    fontSize: 13,
    color: "#D97706",
  },
  pedestal: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  pedestalGold: {
    height: 70,
    borderWidth: 1,
    borderColor: "#F59E0B60",
  },
  pedestalSilver: {
    height: 52,
    borderWidth: 1,
    borderColor: "#64748B40",
  },
  pedestalBronze: {
    height: 40,
    borderWidth: 1,
    borderColor: "#B4530940",
  },
  pedestalRank: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 20,
    fontWeight: "800",
  },
  searchWrap: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    minHeight: 46,
  },
  sortRow: {
    flexDirection: "row",
    gap: 8,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  studentCardsList: {
    gap: 10,
  },
  studentCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rankIndicator: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rankIndicatorText: {
    fontFamily: "JetBrainsMono_700Bold",
    fontSize: 12,
    fontWeight: "800",
  },
  studentDetails: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardName: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 14,
    fontWeight: "700",
  },
  youBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  youBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
  },
  cardSub: {
    fontSize: 11,
  },
  cardActions: {
    alignItems: "flex-end",
    gap: 6,
  },
  scoreBox: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
  },
  pointsValue: {
    fontFamily: "JetBrainsMono_700Bold",
    fontSize: 15,
    fontWeight: "800",
  },
  pointsUnit: {
    fontSize: 10,
  },
  awardPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  awardPillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  activityContainer: {
    gap: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  activityIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  activityStudent: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 13,
    fontWeight: "700",
  },
  activityReason: {
    fontSize: 11,
    marginTop: 1,
  },
  activityTeacher: {
    fontSize: 10,
    marginTop: 2,
  },
  activityDeltaBox: {
    alignItems: "flex-end",
  },
  activityDelta: {
    fontFamily: "JetBrainsMono_700Bold",
    fontSize: 13,
    fontWeight: "800",
  },
});
