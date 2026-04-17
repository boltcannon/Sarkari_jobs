import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Job } from "../api/client";
import { useTheme } from "../theme/ThemeContext";
import { checkAgeEligibility } from "../utils/eligibility";

interface Props {
  job: Job;
  onPress: () => void;
  onSave?: () => void;
  isSaved?: boolean;
  userDob?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  SSC:        "#185FA5",
  UPSC:       "#6A1B9A",
  Railway:    "#1565C0",
  Banking:    "#2E7D32",
  "State PSC":"#E65100",
  Defence:    "#4E342E",
  Police:     "#37474F",
  Teaching:   "#00695C",
  Other:      "#616161",
};

export function deadlineMeta(lastDate: string | null): {
  label: string; color: string; borderColor: string | null; urgent: boolean;
} {
  if (!lastDate) return { label: "", color: "#555", borderColor: null, urgent: false };
  const date = new Date(lastDate);
  const diff = Math.ceil((date.getTime() - Date.now()) / 86_400_000);
  const dateStr = date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  if (diff < 0)   return { label: `Closed · ${dateStr}`,             color: "#999",     borderColor: null,      urgent: false };
  if (diff === 0) return { label: `🔴 Last day! · ${dateStr}`,       color: "#D32F2F",  borderColor: "#D32F2F", urgent: true  };
  if (diff <= 3)  return { label: `🔴 ${diff}d left · ${dateStr}`,   color: "#D32F2F",  borderColor: "#D32F2F", urgent: true  };
  if (diff <= 7)  return { label: `🟠 ${diff} days · ${dateStr}`,    color: "#E65100",  borderColor: "#E65100", urgent: true  };
  if (diff <= 14) return { label: `${diff} days · ${dateStr}`,       color: "#888",     borderColor: null,      urgent: false };
  return                 { label: dateStr,                            color: "#AAA",     borderColor: null,      urgent: false };
}

export default function JobCard({ job, onPress, onSave, isSaved, userDob }: Props) {
  const { theme } = useTheme();
  const categoryColor = CATEGORY_COLORS[job.category] ?? theme.blue;
  const { label, color: deadlineColor, borderColor, urgent } = deadlineMeta(job.last_date);

  const eligibility = userDob
    ? checkAgeEligibility(job.age_limit, userDob)
    : "unknown";

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: borderColor ?? theme.border,
          borderLeftWidth: borderColor ? 3 : 1,
          borderLeftColor: borderColor ?? theme.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Top row */}
      <View style={styles.topRow}>
        <View style={[styles.badge, { backgroundColor: categoryColor + "22" }]}>
          <Text style={[styles.badgeText, { color: categoryColor }]}>{job.category}</Text>
        </View>
        <View style={styles.topRight}>
          {eligibility === "eligible" && (
            <View style={styles.eligibleDot} />
          )}
          {eligibility === "over_age" && (
            <Text style={styles.overAgeTag}>Over age</Text>
          )}
          {urgent && label ? (
            <View style={[styles.urgencyPill, { backgroundColor: deadlineColor + "18" }]}>
              <Text style={[styles.urgencyText, { color: deadlineColor }]}>{label}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Title */}
      <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>{job.title}</Text>
      <Text style={[styles.org, { color: theme.subtext }]} numberOfLines={1}>{job.organisation}</Text>

      {/* Meta */}
      <View style={styles.metaRow}>
        {job.total_posts != null && <MetaChip label={`${job.total_posts.toLocaleString()} posts`} theme={theme} />}
        {job.salary && <MetaChip label={job.salary} theme={theme} />}
        {job.qualification && <MetaChip label={job.qualification} theme={theme} />}
      </View>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: theme.divider }]}>
        {!urgent && label ? (
          <Text style={[styles.deadline, { color: deadlineColor }]}>{label}</Text>
        ) : <View />}
        {onSave && (
          <TouchableOpacity onPress={onSave} style={styles.saveBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.saveIcon, { color: isSaved ? theme.blue : "#BBB" }]}>
              {isSaved ? "★" : "☆"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

function MetaChip({ label, theme }: { label: string; theme: any }) {
  return (
    <View style={[styles.chip, { backgroundColor: theme.chip, borderColor: theme.chipBorder }]}>
      <Text style={[styles.chipText, { color: theme.subtext }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    padding: 14,
    marginHorizontal: 12,
    marginVertical: 6,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  topRow:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  topRight:    { flexDirection: "row", alignItems: "center", gap: 6 },
  badge:       { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText:   { fontSize: 11, fontWeight: "700", letterSpacing: 0.4, textTransform: "uppercase" },
  urgencyPill: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  urgencyText: { fontSize: 11, fontWeight: "700" },
  eligibleDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#2E7D32" },
  overAgeTag:  { fontSize: 10, color: "#D32F2F", fontWeight: "700", backgroundColor: "#FFEBEE",
                 paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  title:       { fontSize: 15, fontWeight: "700", lineHeight: 21, marginBottom: 4 },
  org:         { fontSize: 13, marginBottom: 10 },
  metaRow:     { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  chip:        { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  chipText:    { fontSize: 11, maxWidth: 140 },
  footer:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center",
                 borderTopWidth: 1, paddingTop: 8 },
  deadline:    { fontSize: 12 },
  saveBtn:     { padding: 4 },
  saveIcon:    { fontSize: 20 },
});
