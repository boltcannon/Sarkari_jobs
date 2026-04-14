import React, { useCallback, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Job, savedJobsStorage } from "../api/client";
import JobCard from "../components/JobCard";

const BLUE = "#185FA5";

export default function SavedScreen({ navigation }: any) {
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);

  useFocusEffect(
    useCallback(() => {
      savedJobsStorage.getAll().then(setSavedJobs).catch(() => setSavedJobs([]));
    }, [])
  );

  const unsave = async (job: Job) => {
    await savedJobsStorage.remove(job.id);
    setSavedJobs((prev) => prev.filter((j) => j.id !== job.id));
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Saved Jobs</Text>
        {savedJobs.length > 0 && (
          <Text style={styles.count}>{savedJobs.length}</Text>
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
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>☆</Text>
            <Text style={styles.emptyTitle}>No saved jobs</Text>
            <Text style={styles.emptyText}>
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
  container: { flex: 1, backgroundColor: "#F9F9F9" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EBEBEB",
    gap: 10,
  },
  title: { fontSize: 20, fontWeight: "800", color: "#1A1A1A" },
  count: {
    backgroundColor: BLUE,
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  empty: { flex: 1, alignItems: "center", paddingTop: 80, paddingHorizontal: 40 },
  emptyIcon: { fontSize: 48, color: "#CCC", marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#555", marginBottom: 8 },
  emptyText: { fontSize: 14, color: "#999", textAlign: "center", lineHeight: 20 },
});
