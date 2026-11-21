import React from "react";
import { Image, StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Polyline, Rect } from "react-native-svg";
import { useTheme } from "@/context/ThemeContext";
import type { LeaderboardEntry, Student } from "@/lib/types";
import { AppText as Text } from "@/components/AppText";

export function Avatar({ name, uri, size = 42 }: { name: string; uri?: string; size?: number }) {
  const { colors } = useTheme();
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
  return uri ? (
    <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  ) : (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primarySoft }]}>
      <Text style={[styles.initials, { color: colors.primary, fontSize: Math.max(12, size * 0.31) }]}>{initials}</Text>
    </View>
  );
}

export function StudentRow({ student, trailing }: { student: Student | LeaderboardEntry; trailing?: React.ReactNode }) {
  const { colors } = useTheme();
  const isLeaderboardEntry = "studentId" in student;
  const name = student.displayName;
  const points = isLeaderboardEntry ? student.points : student.pointsBalance;
  const email = "email" in student ? student.email : undefined;
  return (
    <View style={styles.studentRow}>
      <View style={styles.rowPerson}>
        {isLeaderboardEntry && <Text style={[styles.rank, { color: colors.muted }]}>{String(student.rank).padStart(2, "0")}</Text>}
        <Avatar name={name} size={40} />
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={[styles.personName, { color: colors.text }]}>{name}</Text>
          {!!email && <Text numberOfLines={1} style={[styles.personSub, { color: colors.muted }]}>{email}</Text>}
        </View>
      </View>
      {trailing ?? <Text style={[styles.points, { color: colors.text }]}>{points.toLocaleString()} <Text style={[styles.pointsUnit, { color: colors.muted }]}>pts</Text></Text>}
    </View>
  );
}

export function MiniChart({ values, labels, height = 150 }: { values: number[]; labels?: string[]; height?: number }) {
  const { colors } = useTheme();
  const safe = values.length ? values : [];
  const width = 300;
  const pad = 16;
  const max = Math.max(1, ...safe);
  const coords = safe.map((value, i) => {
    const x = pad + (safe.length < 2 ? 0 : (i / (safe.length - 1)) * (width - pad * 2));
    const y = height - 23 - ((value / max) * (height - 43));
    return `${x},${y}`;
  }).join(" ");
  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {[0, 1, 2].map((line) => <Line key={line} x1={pad} x2={width - pad} y1={16 + line * ((height - 43) / 2)} y2={16 + line * ((height - 43) / 2)} stroke={colors.border} strokeWidth="1" />)}
        {safe.length > 1 && <Polyline points={coords} fill="none" stroke={colors.primary} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
        {safe.map((value, i) => {
          const x = pad + (safe.length < 2 ? 0 : (i / (safe.length - 1)) * (width - pad * 2));
          const y = height - 23 - ((value / max) * (height - 43));
          return <Circle key={`${i}-${value}`} cx={x} cy={y} r={4} fill={colors.primary} stroke={colors.surface} strokeWidth={2} />;
        })}
      </Svg>
      {!!labels?.length && <View style={styles.chartLabels}>{labels.map((label, i) => <Text numberOfLines={1} key={`${label}-${i}`} style={[styles.chartLabel, { color: colors.muted }]}>{label}</Text>)}</View>}
    </View>
  );
}

export function BarChart({ values, labels, height = 150 }: { values: number[]; labels: string[]; height?: number }) {
  const { colors } = useTheme();
  const width = 300;
  const gap = 10;
  const max = Math.max(1, ...values);
  const barWidth = values.length ? Math.min(34, (width - gap * (values.length + 1)) / values.length) : 0;
  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {[0, 1, 2].map((line) => <Line key={line} x1="8" x2={width - 8} y1={height - 22 - line * ((height - 40) / 2)} y2={height - 22 - line * ((height - 40) / 2)} stroke={colors.border} strokeWidth="1" />)}
        {values.map((value, i) => {
          const barHeight = Math.max(3, (value / max) * (height - 40));
          return <Rect key={`${i}-${value}`} x={gap + i * (barWidth + gap)} y={height - 22 - barHeight} width={barWidth} height={barHeight} rx="6" fill={i === values.length - 1 ? colors.accent : colors.primary} opacity={i === values.length - 1 ? 1 : 0.72} />;
        })}
      </Svg>
      <View style={styles.chartLabels}>{labels.map((label, i) => <Text numberOfLines={1} key={`${label}-${i}`} style={[styles.chartLabel, { color: colors.muted }]}>{label}</Text>)}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: "center", justifyContent: "center" },
  initials: { fontFamily: "PlusJakartaSans_800ExtraBold", fontWeight: "800" },
  studentRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  rowPerson: { flexDirection: "row", alignItems: "center", gap: 11, flex: 1 },
  rank: { width: 22, fontSize: 12, fontWeight: "700" },
  personName: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 14, fontWeight: "700" },
  personSub: { fontFamily: "PlusJakartaSans_400Regular", fontSize: 11, marginTop: 3 },
  points: { fontFamily: "JetBrainsMono_700Bold", fontSize: 13, fontWeight: "800" },
  pointsUnit: { fontFamily: "PlusJakartaSans_500Medium", fontSize: 11, fontWeight: "500" },
  chartLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 7, gap: 6 },
  chartLabel: { fontSize: 10, flex: 1, textAlign: "center" },
});
