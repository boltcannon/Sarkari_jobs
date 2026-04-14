import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { profileStorage, UserProfile } from "../api/client";

const BLUE = "#185FA5";

const CATEGORIES = [
  "SSC", "UPSC", "Railway", "Banking",
  "State PSC", "Defence", "Police", "Teaching", "Other",
];

const QUALIFICATIONS = [
  "10th Pass", "12th Pass", "Diploma", "Graduate",
  "Post Graduate", "B.Tech / BE", "MBA", "LLB",
];

const STATES = [
  "All India", "Andhra Pradesh", "Bihar", "Delhi", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Odisha",
  "Punjab", "Rajasthan", "Tamil Nadu", "Telangana",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

function ChipSelect({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (val: string) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => onToggle(opt)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function RadioSelect({
  options,
  selected,
  onSelect,
}: {
  options: string[];
  selected: string;
  onSelect: (val: string) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => {
        const active = selected === opt;
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => onSelect(opt)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function ProfileScreen() {
  const [name, setName] = useState("");
  const [qualification, setQualification] = useState("");
  const [state, setState] = useState("All India");
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    profileStorage.get().then((p) => {
      if (p.name) setName(p.name);
      if (p.qualification) setQualification(p.qualification);
      if (p.state) setState(p.state);
      if (p.preferred_categories?.length) setCategories(p.preferred_categories);
    }).catch(() => {});
  }, []);

  const toggleCategory = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const save = async () => {
    const profile: UserProfile = {
      name,
      qualification,
      state,
      preferred_categories: categories as UserProfile["preferred_categories"],
    };
    await profileStorage.save(profile);
    Alert.alert("Saved!", "Your preferences have been saved.");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>My Profile</Text>
        <Text style={styles.subheading}>
          Set your preferences to see the most relevant jobs.
        </Text>

        <View style={styles.section}>
          <Text style={styles.label}>Your Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor="#AAA"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Qualification</Text>
          <RadioSelect options={QUALIFICATIONS} selected={qualification} onSelect={setQualification} />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>State</Text>
          <RadioSelect options={STATES} selected={state} onSelect={setState} />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Preferred Categories</Text>
          <Text style={styles.hint}>Select all that apply</Text>
          <ChipSelect options={CATEGORIES} selected={categories} onToggle={toggleCategory} />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={save}>
          <Text style={styles.saveBtnText}>Save Preferences</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F9F9" },
  scroll: { padding: 16, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: "800", color: "#1A1A1A", marginBottom: 6 },
  subheading: { fontSize: 13, color: "#666", marginBottom: 24, lineHeight: 19 },
  section: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: "700", color: "#1A1A1A", marginBottom: 10 },
  hint: { fontSize: 12, color: "#999", marginBottom: 8 },
  input: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: "#1A1A1A",
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  chipActive: { backgroundColor: BLUE, borderColor: BLUE },
  chipText: { fontSize: 13, color: "#555" },
  chipTextActive: { color: "#FFF", fontWeight: "600" },
  saveBtn: {
    backgroundColor: BLUE,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnText: { color: "#FFF", fontWeight: "700", fontSize: 16 },
});
