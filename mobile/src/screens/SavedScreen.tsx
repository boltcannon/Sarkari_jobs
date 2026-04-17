import React, { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Job, savedJobsStorage, profileStorage } from "../api/client";
import JobCard from "../components/JobCard";
import { useTheme } from "../theme/ThemeContext";

export default function SavedScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  const [userDob, setUserDob] = useState<string | undefined>();

  useFocusEffect(
    useCallback(() => {
      savedJobsStorage.getAll().then(setSavedJobs).catch(() => setSavedJobs([]));
      profileStorage.get().then((p) => setUserDob(p.dob)).catch(() => {});
    }, [])
  );

  const unsave = async (job: Job) => {
    await savedJobsStorage.remove(job.id);
    setSavedJobs((prev) => prev.filter((j) => j.id !== job.id));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: theme.header, borderBottomColor: theme.tabBorder }]}>
        <Text style={[styles.title, { color: theme.text }]}>Saved Jobs</Text>
        {savedJobs.length > 0 && (
          <View style={[styles.count, { backgroundColor: theme.blue }]}>
            <Text style={styles.countText}>{savedJobs.length}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={savedJobs}
        keyExtractor={(j) => j.id.toString()}
        renderItem={({ item }) => (
          <JobCard
            job={item}
            onPress={() => navigation.navigate("JobDetail", { job: item })}
            onSave={() => unsave(item)}
            isSaved
            userDob={userDob}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>☆</Text>
            <Text style={[styles.emptyTitle, { color: theme.subtext }]}>No saved jobs</Text>
            <Text style={[styles.emptyText, { color: theme.muted }]}>
              Tap the star icon on any job to save it here.
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  title:     { fontSize: 20, fontWeight: "800" },
  count:     { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  countText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  empty:     { flex: 1, alignItems: "center", paddingTop: 80, paddingHorizontal: 40 },
  emptyIcon: { fontSize: 48, color: "#CCC", marginBottom: 12 },
  emptyTitle:{ fontSize: 17, fontWeight: "700", marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
