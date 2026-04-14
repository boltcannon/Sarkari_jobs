import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Job } from "../api/client";

interface Props {
  job: Job;
  onPress: () => void;
  onSave?: () => void;
  isSaved?: boolean;
}

const COLORS = {
  blue: "#185FA5",
  lightBlue: "#E8F0FB",
  text: "#1A1A1A",
  subtext: "#555",
  border: "#E0E0E0",
  white: "#FFF",
  red: "#D32F2F",
  green: "#2E7D32",
  orange: "#E65100",
};

const CATEGORY_COLORS: Record<string, string> = {
  SSC: "#185FA5",
  UPSC: "#6A1B9A",
  Railway: "#1565C0",
  Banking: "#2E7D32",
  "State PSC": "#E65100",
  Defence: "#4E342E",
  Police: "#37474F",
  Teaching: "#00695C",
  Other: "#616161",
};

export function deadlineMeta(lastDate: string | null): {
  label: string;
  color: string;
  borderColor: string | null;
  urgent: boolean;
} {
  if (!lastDate) return { label: "", color: COLORS.subtext, borderColor: null, urgent: false };

  const date = new Date(lastDate);
  const diff = Math.ceil((date.getTime() - Date.now()) / 86_400_000);
  const dateStr = date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  if (diff < 0)  return { label: `Closed · ${dateStr}`,            color: "#999",         borderColor: null,          urgent: false };
  if (diff === 0) return { label: `🔴 Last day! · ${dateStr}`,      color: COLORS.red,     borderColor: COLORS.red,    urgent: true  };
  if (diff <= 3)  return { label: `🔴 ${diff}d left · ${dateStr}`,  color: COLORS.red,     borderColor: COLORS.red,    urgent: true  };
  if (diff <= 7)  return { label: `🟠 ${diff} days · ${dateStr}`,   color: COLORS.orange,  borderColor: COLORS.orange, urgent: true  };
  if (diff <= 14) return { label: `${diff} days · ${dateStr}`,      color: "#888",         borderColor: null,          urgent: false };
  return           { label: dateStr,                                 color: "#AAA",         borderColor: null,          urgent: false };
}

export default function JobCard({ job, onPress, onSave, isSaved }: Props) {
  const categoryColor = CATEGORY_COLORS[job.category] ?? COLORS.blue;
  const { label, color: deadlineColor, borderColor, urgent } = deadlineMeta(job.last_date);

  return (
    <TouchableOpacity
      style={[styles.card, borderColor ? { borderLeftColor: borderColor, borderLeftWidth: 3 } : null]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Top row: category badge + urgency pill */}
      <View style={styles.topRow}>
        <View style={[styles.badge, { backgroundColor: categoryColor + "18" }]}>
          <Text style={[styles.badgeText, { color: categoryColor }]}>{job.category}</Text>
        </View>
        {urgent && label ? (
          <View style={[styles.urgencyPill, { backgroundColor: deadlineColor + "18" }]}>
            <Text style={[styles.urgencyText, { color: deadlineColor }]}>{label}</Text>
          </View>
        ) : null}
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>{job.title}</Text>

      {/* Org */}
      <Text style={styles.org} numberOfLines={1}>{job.organisation}</Text>

      {/* Meta row */}
      <View style={styles.metaRow}>
        {job.total_posts != null && (
          <MetaChip label={`${job.total_posts.toLocaleString()} posts`} />
        )}
        {job.salary && <MetaChip label={job.salary} />}
        {job.qualification && <MetaChip label={job.qualification} />}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        {!urgent && label ? (
          <Text style={[styles.deadline, { color: deadlineColor }]}>{label}</Text>
        ) : (
          <View />
        )}
        {onSave && (
          <TouchableOpacity onPress={onSave} style={styles.saveBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.saveIcon, isSaved && { color: COLORS.blue }]}>
              {isSaved ? "★" : "☆"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

function MetaChip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    marginHorizontal: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  badge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  urgencyPill: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: "700",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    lineHeight: 21,
    marginBottom: 4,
  },
  org: {
    fontSize: 13,
    color: COLORS.subtext,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  chip: {
    backgroundColor: "#F5F5F5",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: 11,
    color: COLORS.subtext,
    maxWidth: 140,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  deadline: {
    fontSize: 12,
    color: COLORS.subtext,
  },
  saveBtn: {
    padding: 4,
  },
  saveIcon: {
    fontSize: 20,
    color: "#BBB",
  },
});
