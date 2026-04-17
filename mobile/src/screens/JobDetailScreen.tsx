import React, { useEffect, useState } from "react";
import {
  Alert, Linking, Modal, ScrollView, Share,
  StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Job, TrackStatus, savedJobsStorage, trackerStorage, profileStorage } from "../api/client";
import { deadlineMeta } from "../components/JobCard";
import { checkAgeEligibility, eligibilityBadge } from "../utils/eligibility";
import { useTheme } from "../theme/ThemeContext";
import { STATUS_CONFIG } from "./TrackerScreen";

const TRACK_STATUSES: TrackStatus[] = ["applied", "exam", "result", "selected", "rejected"];

function InfoRow({ label, value, theme }: { label: string; value?: string | null; theme: any }) {
  if (!value) return null;
  return (
    <View style={[styles.infoRow, { borderBottomColor: theme.divider }]}>
      <Text style={[styles.infoLabel, { color: theme.muted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

function formatDate(d: string | null): string {
  if (!d) return "N/A";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export default function JobDetailScreen({ route }: any) {
  const { theme } = useTheme();
  const job: Job = route.params.job;
  const [saved, setSaved] = useState(false);
  const [trackStatus, setTrackStatus] = useState<TrackStatus | null>(null);
  const [trackModalVisible, setTrackModalVisible] = useState(false);
  const [userDob, setUserDob] = useState<string | undefined>();

  useEffect(() => {
    savedJobsStorage.isSaved(job.id).then(setSaved).catch(() => {});
    trackerStorage.getStatus(job.id).then(setTrackStatus).catch(() => {});
    profileStorage.get().then((p) => setUserDob(p.dob)).catch(() => {});
  }, [job.id]);

  const handleApply = () => {
    if (!job.apply_link) { Alert.alert("No link", "Application link not available."); return; }
    Linking.openURL(job.apply_link).catch(() => Alert.alert("Error", "Could not open the link."));
  };

  const handlePDF = () => {
    if (!job.notification_pdf) { Alert.alert("No PDF", "Notification PDF not available."); return; }
    Linking.openURL(job.notification_pdf).catch(() => Alert.alert("Error", "Could not open the PDF."));
  };

  const toggleSave = async () => {
    if (saved) { await savedJobsStorage.remove(job.id); setSaved(false); }
    else { await savedJobsStorage.save(job); setSaved(true); }
  };

  const handleShare = async () => {
    const lastDate = job.last_date
      ? new Date(job.last_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
      : null;
    const lines = [
      `🏛️ *${job.title}*`, `📍 ${job.organisation}`,
      job.total_posts ? `💼 ${job.total_posts.toLocaleString()} Posts` : null,
      lastDate ? `📅 Last Date: ${lastDate}` : null,
      job.apply_link ? `\n🔗 Apply: ${job.apply_link}` : null,
      `\nFound on Where is my Job App 🔍`,
    ].filter(Boolean).join("\n");
    try { await Share.share({ message: lines, title: job.title }); } catch (_) {}
  };

  const handleTrack = async (status: TrackStatus) => {
    await trackerStorage.upsert(job, status);
    setTrackStatus(status);
    setTrackModalVisible(false);
  };

  const handleUntrack = async () => {
    await trackerStorage.remove(job.id);
    setTrackStatus(null);
    setTrackModalVisible(false);
  };

  const { label, color: deadlineColor, borderColor, urgent } = deadlineMeta(job.last_date);
  const eligibility = checkAgeEligibility(job.age_limit, userDob);
  const eligBadge = eligibilityBadge(eligibility);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Category badge */}
        <View style={[styles.badge, { backgroundColor: theme.lightBlue }]}>
          <Text style={[styles.badgeText, { color: theme.blue }]}>{job.category}</Text>
        </View>

        <Text style={[styles.title, { color: theme.text }]}>{job.title}</Text>
        <Text style={[styles.org, { color: theme.subtext }]}>{job.organisation}</Text>

        {/* Deadline banner */}
        {label ? (
          <View style={[styles.deadlineBanner,
            { backgroundColor: urgent ? deadlineColor + "15" : theme.chip,
              borderColor: borderColor ?? theme.border }]}>
            <Text style={[styles.deadlineBannerText, { color: urgent ? deadlineColor : theme.muted }]}>
              📅 Last date: {label.replace(/^[🔴🟠]\s*/, "")}
            </Text>
          </View>
        ) : null}

        {/* Eligibility banner */}
        {eligBadge ? (
          <View style={[styles.eligBanner, { backgroundColor: eligBadge.bg, borderColor: eligBadge.color + "40" }]}>
            <Text style={[styles.eligText, { color: eligBadge.color }]}>
              {eligBadge.icon} {eligBadge.text}
            </Text>
            {!userDob && (
              <Text style={[styles.eligHint, { color: eligBadge.color }]}>
                Set your DOB in Profile for eligibility check
              </Text>
            )}
          </View>
        ) : userDob ? null : (
          <View style={[styles.eligBanner, { backgroundColor: theme.chip, borderColor: theme.border }]}>
            <Text style={[styles.eligText, { color: theme.muted }]}>
              👤 Set your DOB in Profile to check eligibility
            </Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actionRow}>
          {job.is_official_link ? (
            <TouchableOpacity style={[styles.applyBtn, { backgroundColor: theme.blue }]} onPress={handleApply}>
              <Text style={styles.applyBtnText}>🏛️ Apply Online</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.viewDetailsBtn} onPress={handleApply}>
              <Text style={styles.viewDetailsBtnText}>View Details</Text>
            </TouchableOpacity>
          )}
          {job.notification_pdf ? (
            <TouchableOpacity style={[styles.outlineBtn, { borderColor: theme.blue }]} onPress={handlePDF}>
              <Text style={[styles.outlineBtnText, { color: theme.blue }]}>📄 Notification</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={[styles.ghostBtn, { backgroundColor: theme.chip, borderColor: theme.border }]}
            onPress={toggleSave}>
            <Text style={[styles.ghostBtnText, { color: theme.text }]}>{saved ? "★ Saved" : "☆ Save"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.ghostBtn,
              { backgroundColor: trackStatus ? theme.blue + "20" : theme.chip,
                borderColor: trackStatus ? theme.blue : theme.border }]}
            onPress={() => setTrackModalVisible(true)}>
            <Text style={[styles.ghostBtnText, { color: trackStatus ? theme.blue : theme.text }]}>
              {trackStatus ? `${STATUS_CONFIG[trackStatus].icon} Tracking` : "📋 Track"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.ghostBtn, { backgroundColor: theme.lightBlue, borderColor: "#C5D8F5" }]}
            onPress={handleShare}>
            <Text style={[styles.ghostBtnText, { color: theme.blue }]}>↗ Share</Text>
          </TouchableOpacity>
        </View>

        {/* Details card */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Job Details</Text>
          <InfoRow label="Total Posts"     value={job.total_posts?.toLocaleString()} theme={theme} />
          <InfoRow label="Qualification"   value={job.qualification} theme={theme} />
          <InfoRow label="Age Limit"       value={job.age_limit} theme={theme} />
          <InfoRow label="Salary / Pay"    value={job.salary} theme={theme} />
          <InfoRow label="Location"        value={job.location} theme={theme} />
          <InfoRow label="States"          value={job.states?.join(", ")} theme={theme} />
          <InfoRow label="Last Date"       value={formatDate(job.last_date)} theme={theme} />
          <InfoRow label="Source"          value={job.source} theme={theme} />
        </View>

        {job.description && (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>About</Text>
            <Text style={[styles.description, { color: theme.subtext }]}>{job.description}</Text>
          </View>
        )}

        <Text style={[styles.postedOn, { color: theme.muted }]}>
          Posted on {formatDate(job.created_at)}
        </Text>
      </ScrollView>

      {/* Track status picker modal */}
      <Modal visible={trackModalVisible} transparent animationType="slide" onRequestClose={() => setTrackModalVisible(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setTrackModalVisible(false)} />
        <View style={[styles.trackSheet, { backgroundColor: theme.card }]}>
          <View style={styles.trackHandle} />
          <Text style={[styles.trackTitle, { color: theme.text }]}>Track Application</Text>
          {TRACK_STATUSES.map((s) => {
            const cfg = STATUS_CONFIG[s];
            const active = trackStatus === s;
            return (
              <TouchableOpacity
                key={s}
                style={[styles.trackOption,
                  { borderColor: active ? cfg.color : theme.border,
                    backgroundColor: active ? cfg.color + "15" : theme.bg }]}
                onPress={() => handleTrack(s)}
              >
                <Text style={styles.trackOptionIcon}>{cfg.icon}</Text>
                <Text style={[styles.trackOptionLabel, { color: active ? cfg.color : theme.text }]}>
                  {cfg.label}
                </Text>
                {active && <Text style={{ color: cfg.color, fontWeight: "700" }}>✓</Text>}
              </TouchableOpacity>
            );
          })}
          {trackStatus && (
            <TouchableOpacity style={[styles.untrackBtn, { borderColor: theme.border }]} onPress={handleUntrack}>
              <Text style={[styles.untrackText, { color: theme.muted }]}>Remove from tracker</Text>
            </TouchableOpacity>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1 },
  scroll:           { padding: 16, paddingBottom: 40 },
  badge:            { alignSelf: "flex-start", borderRadius: 5, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10 },
  badgeText:        { fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  title:            { fontSize: 20, fontWeight: "800", lineHeight: 28, marginBottom: 6 },
  org:              { fontSize: 14, marginBottom: 14 },
  deadlineBanner:   { borderWidth: 1, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 14, marginBottom: 10 },
  deadlineBannerText:{ fontSize: 13, fontWeight: "600" },
  eligBanner:       { borderWidth: 1, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 14, marginBottom: 14 },
  eligText:         { fontSize: 13, fontWeight: "600" },
  eligHint:         { fontSize: 11, marginTop: 2, opacity: 0.7 },
  actionRow:        { flexDirection: "row", gap: 8, marginBottom: 20, flexWrap: "wrap" },
  applyBtn:         { flex: 1, borderRadius: 8, paddingVertical: 12, alignItems: "center" },
  applyBtnText:     { color: "#FFF", fontWeight: "700", fontSize: 14 },
  viewDetailsBtn:   { flex: 1, backgroundColor: "#6B7280", borderRadius: 8, paddingVertical: 12, alignItems: "center" },
  viewDetailsBtnText:{ color: "#FFF", fontWeight: "700", fontSize: 14 },
  outlineBtn:       { flex: 1, borderRadius: 8, paddingVertical: 12, alignItems: "center", borderWidth: 1 },
  outlineBtnText:   { fontWeight: "700", fontSize: 13 },
  ghostBtn:         { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, alignItems: "center", borderWidth: 1 },
  ghostBtnText:     { fontWeight: "600", fontSize: 13 },
  card:             { borderRadius: 10, padding: 16, marginBottom: 14, borderWidth: 1 },
  cardTitle:        { fontSize: 15, fontWeight: "700", marginBottom: 12 },
  infoRow:          { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1 },
  infoLabel:        { fontSize: 13, flex: 1 },
  infoValue:        { fontSize: 13, fontWeight: "500", flex: 2, textAlign: "right" },
  description:      { fontSize: 14, lineHeight: 22 },
  postedOn:         { fontSize: 12, textAlign: "center", marginTop: 8 },
  modalBackdrop:    { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  trackSheet:       { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  trackHandle:      { width: 40, height: 4, backgroundColor: "#DDD", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  trackTitle:       { fontSize: 17, fontWeight: "700", marginBottom: 14 },
  trackOption:      { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 10, borderWidth: 1.5, marginBottom: 8 },
  trackOptionIcon:  { fontSize: 18 },
  trackOptionLabel: { flex: 1, fontSize: 14, fontWeight: "600" },
  untrackBtn:       { borderRadius: 10, borderWidth: 1, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  untrackText:      { fontSize: 14 },
});
