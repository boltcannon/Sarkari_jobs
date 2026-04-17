import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

const BLUE = "#185FA5";
const LIGHT_BLUE = "#E8F0FB";

export type SortOption = "newest" | "deadline" | "posts";

const SORT_OPTIONS: { value: SortOption; label: string; icon: string }[] = [
  { value: "newest",   label: "Newest First",    icon: "🆕" },
  { value: "deadline", label: "Deadline Soon",   icon: "⏰" },
  { value: "posts",    label: "Most Vacancies",  icon: "👥" },
];

const STATES = [
  "All India", "Delhi", "Maharashtra", "Uttar Pradesh", "Bihar",
  "Rajasthan", "Madhya Pradesh", "Gujarat", "Karnataka", "Tamil Nadu",
  "Telangana", "Andhra Pradesh", "West Bengal", "Odisha", "Jharkhand",
  "Punjab", "Haryana", "Assam", "Kerala", "Himachal Pradesh",
  "Uttarakhand", "Chhattisgarh", "Jammu & Kashmir", "Goa",
  "Manipur", "Meghalaya", "Tripura", "Nagaland",
];

interface Props {
  visible: boolean;
  sort: SortOption;
  filterState: string;
  onApply: (sort: SortOption, state: string) => void;
  onClose: () => void;
}

export default function FilterModal({ visible, sort, filterState, onApply, onClose }: Props) {
  const slideAnim = useRef(new Animated.Value(600)).current;
  const [localSort, setLocalSort] = React.useState<SortOption>(sort);
  const [localState, setLocalState] = React.useState(filterState);

  // Sync local state when modal opens
  useEffect(() => {
    if (visible) {
      setLocalSort(sort);
      setLocalState(filterState);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 600,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleApply = () => {
    onApply(localSort, localState);
    onClose();
  };

  const handleReset = () => {
    setLocalSort("newest");
    setLocalState("");
  };

  const activeCount =
    (localSort !== "newest" ? 1 : 0) + (localState && localState !== "All India" ? 1 : 0);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      {/* Dim backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Filter & Sort</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
          {/* ── Sort Section ─────────────────────────────────────── */}
          <Text style={styles.sectionLabel}>SORT BY</Text>
          <View style={styles.sortRow}>
            {SORT_OPTIONS.map((opt) => {
              const active = localSort === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.sortChip, active && styles.sortChipActive]}
                  onPress={() => setLocalSort(opt.value)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.sortChipIcon}>{opt.icon}</Text>
                  <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>
                    {opt.label}
                  </Text>
                  {active && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── State Section ─────────────────────────────────────── */}
          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>STATE / LOCATION</Text>
          <View style={styles.stateGrid}>
            {STATES.map((st) => {
              const active = localState === st || (st === "All India" && !localState);
              return (
                <TouchableOpacity
                  key={st}
                  style={[styles.stateChip, active && styles.stateChipActive]}
                  onPress={() => setLocalState(st === "All India" ? "" : st)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.stateChipText, active && styles.stateChipTextActive]}>
                    {st}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Footer buttons */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
            <Text style={styles.resetBtnText}>Reset{activeCount > 0 ? ` (${activeCount})` : ""}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
            <Text style={styles.applyBtnText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    paddingBottom: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#DDD",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  title: { fontSize: 17, fontWeight: "700", color: "#1A1A1A" },
  closeBtn: { fontSize: 16, color: "#888" },

  body: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#999",
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  // Sort chips
  sortRow: { gap: 8 },
  sortChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#EBEBEB",
    gap: 10,
  },
  sortChipActive: {
    backgroundColor: LIGHT_BLUE,
    borderColor: BLUE,
  },
  sortChipIcon: { fontSize: 16 },
  sortChipText: { flex: 1, fontSize: 14, color: "#444", fontWeight: "500" },
  sortChipTextActive: { color: BLUE, fontWeight: "700" },
  checkmark: { fontSize: 14, color: BLUE, fontWeight: "700" },

  // State grid
  stateGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  stateChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#F5F5F5",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  stateChipActive: {
    backgroundColor: LIGHT_BLUE,
    borderColor: BLUE,
  },
  stateChipText: { fontSize: 12, color: "#555", fontWeight: "500" },
  stateChipTextActive: { color: BLUE, fontWeight: "700" },

  // Footer
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
  },
  resetBtnText: { fontSize: 14, fontWeight: "600", color: "#555" },
  applyBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: BLUE,
    alignItems: "center",
  },
  applyBtnText: { fontSize: 14, fontWeight: "700", color: "#FFF" },
});
