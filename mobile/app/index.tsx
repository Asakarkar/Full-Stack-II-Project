import { Redirect } from "expo-router";
import { useAppSelector } from "@/store";

export default function Index() {
  const user = useAppSelector((state) => state.auth.user);
  return <Redirect href={user ? "/(tabs)" : "/(auth)/login"} />;
}
