import React, { useEffect, useState } from "react";
import {
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Job, savedJobsStorage } from "../api/client";
import { deadlineMeta } from "../components/JobCard";

const BLUE = "#185FA5";

interface InfoRowProps {
  label: string;
  value: string | null | undefined;
}

function InfoRow({ label, value }: InfoRowProps) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function formatDate(d: string | null): string {
  if (!d) return "N/A";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function JobDetailScreen({ route }: any) {
  const job: Job = route.params.job;
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    savedJobsStorage.isSaved(job.id).then(setSaved).catch(() => {});
  }, [job.id]);

  const handleApply = () => {
    if (!job.apply_link) {
      Alert.alert("No link", "Application link not available.");
      return;
    }
    Linking.openURL(job.apply_link).catch(() =>
      Alert.alert("Error", "Could not open the link.")
    );
  };


  const handlePDF = () => {
    if (!job.notification_pdf) {
      Alert.alert("No PDF", "Notification PDF not available.");
      return;
    }
    Linking.openURL(job.notification_pdf).catch(() =>
      Alert.alert("Error", "Could not open the PDF.")
    );
  };

  const toggleSave = async () => {
    if (saved) {
      await savedJobsStorage.remove(job.id);
      setSaved(false);
    } else {
      await savedJobsStorage.save(job);
      setSaved(true);
    }
  };

  const handleShare = async () => {
    const lastDate = job.last_date
      ? new Date(job.last_date).toLocaleDateString("en-IN", {
          day: "numeric", month: "long", year: "numeric",
        })
      : null;

    const lines = [
      `🏛️ *${job.title}*`,
      `📍 ${job.organisation}`,
      job.total_posts ? `💼 ${job.total_posts.toLocaleString()} Posts` : null,
      lastDate ? `📅 Last Date: ${lastDate}` : null,
      job.apply_link ? `\n🔗 Apply: ${job.apply_link}` : null,
      `\nFound on Where is my Job App 🔍`,
    ].filter(Boolean).join("\n");

    try {
      await Share.share({ message: lines, title: job.title });
    } catch (_) {}
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Category badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{job.category}</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{job.title}</Text>
        <Text style={styles.org}>{job.organisation}</Text>

        {/* Deadline urgency banner */}
        {(() => {
          const { label, color, borderColor, urgent } = deadlineMeta(job.last_date);
          if (!label) return null;
          return (
            <View style={[
              styles.deadlineBanner,
              { backgroundColor: urgent ? color + "15" : "#F5F5F5",
                borderColor: borderColor ?? "#E0E0E0" }
            ]}>
              <Text style={[styles.deadlineBannerText, { color: urgent ? color : "#777" }]}>
                📅 Last date: {label.replace(/^[🔴🟠]\s*/, "")}
              </Text>
            </View>
          );
        })()}

        {/* Action buttons */}
        <View style={styles.actionRow}>
          {job.is_official_link ? (
            <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
              <Text style={styles.applyBtnText}>🏛️ Apply Online</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.viewDetailsBtn} onPress={handleApply}>
              <Text style={styles.viewDetailsBtnText}>View Details</Text>
            </TouchableOpacity>
          )}
          {job.notification_pdf ? (
            <TouchableOpacity style={styles.pdfBtn} onPress={handlePDF}>
              <Text style={styles.pdfBtnText}>📄 Notification</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.saveBtn} onPress={toggleSave}>
            <Text style={styles.saveBtnText}>{saved ? "★ Saved" : "☆ Save"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareBtnText}>↗ Share</Text>
          </TouchableOpacity>
        </View>

        {/* Details card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Job Details</Text>
          <InfoRow label="Total Posts" value={job.total_posts?.toLocaleString()} />
          <InfoRow label="Qualification" value={job.qualification} />
          <InfoRow label="Age Limit" value={job.age_limit} />
          <InfoRow label="Salary / Pay Scale" value={job.salary} />
          <InfoRow label="Location" value={job.location} />
          <InfoRow
            label="States"
            value={job.states?.join(", ")}
          />
          <InfoRow label="Last Date" value={formatDate(job.last_date)} />
          <InfoRow label="Source" value={job.source} />
        </View>

        {/* Description */}
        {job.description && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>About</Text>
            <Text style={styles.description}>{job.description}</Text>
          </View>
        )}

        {/* Posted on */}
        <Text style={styles.postedOn}>
          Posted on {formatDate(job.created_at)}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F9F9" },
  scroll: { padding: 16, paddingBottom: 40 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#E8F0FB",
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  badgeText: { color: BLUE, fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  title: { fontSize: 20, fontWeight: "800", color: "#1A1A1A", lineHeight: 28, marginBottom: 6 },
  org: { fontSize: 14, color: "#555", marginBottom: 18 },
  actionRow: { flexDirection: "row", gap: 8, marginBottom: 20, flexWrap: "wrap" },
  applyBtn: {
    flex: 1,
    backgroundColor: BLUE,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  applyBtnText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
  viewDetailsBtn: {
    flex: 1,
    backgroundColor: "#6B7280",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  viewDetailsBtnText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
  pdfBtn: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BLUE,
  },
  pdfBtnText: { color: BLUE, fontWeight: "700", fontSize: 13 },
  saveBtn: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DDD",
  },
  saveBtnText: { color: "#333", fontWeight: "600", fontSize: 13 },
  shareBtn: {
    backgroundColor: "#F0F4FF",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#C5D8F5",
  },
  shareBtnText: { color: "#185FA5", fontWeight: "600", fontSize: 13 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#1A1A1A", marginBottom: 12 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F2",
  },
  infoLabel: { fontSize: 13, color: "#777", flex: 1 },
  infoValue: { fontSize: 13, color: "#1A1A1A", fontWeight: "500", flex: 2, textAlign: "right" },
  description: { fontSize: 14, color: "#333", lineHeight: 22 },
  postedOn: { fontSize: 12, color: "#AAA", textAlign: "center", marginTop: 8 },
  deadlineBanner: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  deadlineBannerText: { fontSize: 13, fontWeight: "600" },
});
