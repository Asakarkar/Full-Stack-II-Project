import React, { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { StyleSheet } from "react-native";
import { Screen, PageHeader, Card, Field, Button, LoadingState, ErrorState } from "@/components/ui";
import { useTheme } from "@/context/ThemeContext";
import { useAppDispatch, useAppSelector } from "@/store";
import { setUser } from "@/store/authSlice";
import { useStudentProfileQuery, useUpdateStudentProfileMutation } from "@/store/api";
import { getErrorMessage } from "@/lib/apiConfig";
import { isStudentRole } from "@/lib/types";
import { AppText as Text } from "@/components/AppText";

export default function ProfileEditScreen() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const isStudent = isStudentRole(user?.role);
  const profile = useStudentProfileQuery(undefined, { skip: !isStudent });
  const [updateProfile, { isLoading }] = useUpdateStudentProfileMutation();
  const [displayName, setDisplayName] = useState("");
  const [grade, setGrade] = useState("");
  const [bio, setBio] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDisplayName(profile.data?.displayName ?? "");
    setGrade(profile.data?.grade ?? "");
    setBio(profile.data?.bio ?? "");
  }, [profile.data]);

  if (!isStudent) return <Redirect href="/(tabs)/profile" />;
  if (profile.isLoading) return <Screen><LoadingState label="Loading your profile…" /></Screen>;
  if (profile.isError) return <Screen><PageHeader title="Edit profile" subtitle="Update your student profile." back /><ErrorState message={getErrorMessage(profile.error, "Unable to load your profile.")} onRetry={profile.refetch} /></Screen>;

  const save = async () => {
    setError("");
    setSaved(false);
    try {
      const updated = await updateProfile({ displayName: displayName.trim(), grade: grade.trim() || null, bio: bio.trim() || null }).unwrap();
      if (user) dispatch(setUser({ ...user, displayName: updated.displayName }));
      setSaved(true);
    } catch (reason) {
      setError(getErrorMessage(reason, "Unable to save profile changes."));
    }
  };
  const changed = displayName.trim() !== profile.data?.displayName || grade.trim() !== (profile.data?.grade ?? "") || bio.trim() !== (profile.data?.bio ?? "");

  return (
    <Screen>
      <PageHeader title="Edit profile" subtitle="Update your student profile." back />
      <Card style={{ gap: 16 }}>
        <Field label="Display name" placeholder="Your name" value={displayName} onChangeText={setDisplayName} autoCapitalize="words" maxLength={100} />
        <Field label="Grade" placeholder="e.g. Year 10" value={grade} onChangeText={setGrade} maxLength={50} />
        <Field label="About you" placeholder="A little about your learning goals" value={bio} onChangeText={setBio} multiline numberOfLines={4} textAlignVertical="top" maxLength={500} style={styles.bio} />
      </Card>
      {!!error && <Text accessibilityRole="alert" style={[styles.message, { color: colors.danger }]}>{error}</Text>}
      {saved && <Text style={[styles.message, { color: colors.accent }]}>Your profile has been updated.</Text>}
      <Button title="Save changes" onPress={save} loading={isLoading} disabled={!displayName.trim() || !changed} />
    </Screen>
  );
}

const styles = StyleSheet.create({ message: { fontSize: 13 }, bio: { minHeight: 105, paddingTop: 13 } });
