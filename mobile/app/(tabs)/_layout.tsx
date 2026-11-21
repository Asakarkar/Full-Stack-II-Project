import { Tabs } from "expo-router";
import { ChartNoAxesCombined, House, Medal, UserRound, Users, WalletCards } from "lucide-react-native";
import { useTheme } from "@/context/ThemeContext";
import { useAppSelector } from "@/store";
import { isTeacherRole } from "@/lib/types";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const role = useAppSelector((state) => state.auth.user?.role);
  const teacher = isTeacherRole(role);
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: colors.tab, borderTopColor: colors.border, height: 60 + insets.bottom, paddingTop: 7, paddingBottom: Math.max(insets.bottom, 8) },
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.muted,
      tabBarLabelStyle: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 10, fontWeight: "700" },
    }}>
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color, size }) => <House color={color} size={size} /> }} />
      <Tabs.Screen name="leaderboard" options={{ title: "Ranks", tabBarIcon: ({ color, size }) => <Medal color={color} size={size} /> }} />
      <Tabs.Screen name="students" options={{ title: "Students", href: teacher ? undefined : null, tabBarIcon: ({ color, size }) => <Users color={color} size={size} /> }} />
      <Tabs.Screen name="points" options={{ title: "Points", href: teacher ? null : undefined, tabBarIcon: ({ color, size }) => <WalletCards color={color} size={size} /> }} />
      <Tabs.Screen name="analytics" options={{ title: teacher ? "Insights" : "Progress", tabBarIcon: ({ color, size }) => <ChartNoAxesCombined color={color} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} /> }} />
    </Tabs>
  );
}
