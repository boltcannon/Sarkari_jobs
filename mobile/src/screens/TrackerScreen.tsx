import React, { useCallback, useState } from "react";
import {
  FlatList, SectionList, StyleSheet, Text,
  TouchableOpacity, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { TrackedJob, TrackStatus, trackerStorage } from "../api/client";
import { useTheme } from "../theme/ThemeContext";
import { deadlineMeta } from "../components/JobCard";

export const STATUS_CONFIG: Record<TrackStatus, { label: string; icon: string; color: string }> = {
  applied:  { label: "Applied",        icon: "📝", color: "#185FA5" },
  exam:     { label: "Exam Scheduled", icon: "📅", color: "#E65100" },
  result:   { label: "Result Awaited", icon: "⏳", color: "#9C27B0" },
  selected: { label: "Selected! 🎉",   icon: "✅", color: "#2E7D32" },
  rejected: { label: "Not Selected",   icon: "❌", color: "#757575" },
};

const STATUS_ORDER: TrackStatus[] = ["applied", "exam", "result", "selected", "rejected"];

export default function TrackerScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [tracked, setTracked] = useState<TrackedJob[]>([]);

  useFocusEffect(
    useCallback(() => {
      trackerStorage.getAll().then(setTracked).catch(() => {});
    }, [])
  );

  const remove = async (jobId: number) => {
    await trackerStorage.remove(jobId);
    setTracked((prev) => prev.filter((t) => t.job.id !== jobId));
  };

  // Group by status
  const sections = STATUS_ORDER
    .map((status) => ({
      status,
      data: tracked.filter((t) => t.status === status),
    }))
    .filter((s) => s.data.length > 0);

  const s = makeStyles(theme);

  return (
    <SafeAreaView style={[s.container]} edges={["top"]}>
      <View style={s.header}>
        <Text style={s.title}>My Applications</Text>
        {tracked.length > 0 && (
          <View style={s.badge}>
            <Text style={s.badgeText}>{tracked.length}</Text>
          </View>
        )}
      </View>

      {sections.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>📋</Text>
          <Text style={s.emptyTitle}>No applications tracked</Text>
          <Text style={s.emptyText}>
            Open any job and tap "📋 Track" to start tracking your applications here.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.job.id.toString()}
          contentContainerStyle={{ paddingBottom: 30 }}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => {
            const cfg = STATUS_CONFIG[section.status];
            return (
              <View style={[s.sectionHeader, { borderLeftColor: cfg.color }]}>
                <Text style={s.sectionIcon}>{cfg.icon}</Text>
                <Text style={[s.sectionLabel, { color: cfg.color }]}>
                  {cfg.label}
                </Text>
                <View style={[s.sectionBadge, { backgroundColor: cfg.color + "20" }]}>
                  <Text style={[s.sectionBadgeText, { color: cfg.color }]}>
                    {section.data.length}
                  </Text>
                </View>
              </View>
            );
          }}
          renderItem={({ item }) => {
            const cfg = STATUS_CONFIG[item.status];
            const { label: deadlineLabel, color: deadlineColor } = deadlineMeta(item.job.last_date);
            return (
              <TouchableOpacity
                style={s.card}
                onPress={() => navigation.navigate("JobDetail", { job: item.job })}
                activeOpacity={0.82}
              >
                <View style={[s.cardAccent, { backgroundColor: cfg.color }]} />
                <View style={s.cardBody}>
                  <Text style={s.cardTitle} numberOfLines={2}>{item.job.title}</Text>
                  <Text style={s.cardOrg} numberOfLines={1}>{item.job.organisation}</Text>
                  <View style={s.cardMeta}>
                    {deadlineLabel ? (
                      <Text style={[s.cardDeadline, { color: deadlineColor }]}>
                        {deadlineLabel}
                      </Text>
                    ) : null}
                    <Text style={s.cardDate}>
                      Applied {new Date(item.appliedAt).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short",
                      })}
                    </Text>
                  </View>
                  {item.examDate && (
                    <Text style={s.examDate}>
                      📅 Exam: {new Date(item.examDate).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={s.removeBtn}
                  onPress={() => remove(item.job.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={s.removeIcon}>✕</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.header,
      borderBottomWidth: 1,
      borderBottomColor: theme.tabBorder,
      gap: 10,
    },
    title: { fontSize: 20, fontWeight: "800", color: theme.text },
    badge: {
      backgroundColor: theme.blue,
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    badgeText: { color: "#FFF", fontSize: 12, fontWeight: "700" },

    empty: { flex: 1, alignItems: "center", paddingTop: 80, paddingHorizontal: 40 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 17, fontWeight: "700", color: theme.subtext, marginBottom: 8 },
    emptyText: { fontSize: 14, color: theme.muted, textAlign: "center", lineHeight: 20 },

    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: 12,
      marginTop: 16,
      marginBottom: 6,
      paddingLeft: 10,
      borderLeftWidth: 3,
      gap: 6,
    },
    sectionIcon: { fontSize: 14 },
    sectionLabel: { fontSize: 13, fontWeight: "700", flex: 1 },
    sectionBadge: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
    sectionBadgeText: { fontSize: 11, fontWeight: "700" },

    card: {
      flexDirection: "row",
      backgroundColor: theme.card,
      marginHorizontal: 12,
      marginVertical: 4,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: "hidden",
      elevation: 1,
    },
    cardAccent: { width: 4 },
    cardBody: { flex: 1, padding: 12 },
    cardTitle: { fontSize: 14, fontWeight: "700", color: theme.text, lineHeight: 20, marginBottom: 2 },
    cardOrg: { fontSize: 12, color: theme.subtext, marginBottom: 6 },
    cardMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    cardDeadline: { fontSize: 11, fontWeight: "600" },
    cardDate: { fontSize: 11, color: theme.muted },
    examDate: { fontSize: 11, color: theme.blue, marginTop: 4, fontWeight: "600" },

    removeBtn: { padding: 12, justifyContent: "center" },
    removeIcon: { fontSize: 14, color: theme.muted },
  });
