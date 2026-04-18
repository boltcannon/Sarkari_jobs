import React, { useEffect, useState } from "react";
import {
  Alert, ScrollView, StyleSheet, Switch,
  Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { profileStorage, UserProfile } from "../api/client";
import { useTheme } from "../theme/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { registerPushToken } from "../utils/notifications";

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

function ChipSelect({ options, selected, onToggle, theme }: any) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt: string) => {
        const active = selected.includes(opt);
        return (
          <TouchableOpacity
            key={opt} onPress={() => onToggle(opt)}
            style={[styles.chip,
              { backgroundColor: active ? theme.blue : theme.chip,
                borderColor: active ? theme.blue : theme.chipBorder }]}
          >
            <Text style={[styles.chipText, { color: active ? "#FFF" : theme.subtext }]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function RadioSelect({ options, selected, onSelect, theme }: any) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt: string) => {
        const active = selected === opt;
        return (
          <TouchableOpacity
            key={opt} onPress={() => onSelect(opt)}
            style={[styles.chip,
              { backgroundColor: active ? theme.blue : theme.chip,
                borderColor: active ? theme.blue : theme.chipBorder }]}
          >
            <Text style={[styles.chipText, { color: active ? "#FFF" : theme.subtext }]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function ProfileScreen() {
  const { theme, mode, setMode } = useTheme();
  const { logout } = useAuth();
  const [name, setName] = useState("");
  const [qualification, setQualification] = useState("");
  const [state, setState] = useState("All India");
  const [categories, setCategories] = useState<string[]>([]);
  const [dob, setDob] = useState("");

  useEffect(() => {
    profileStorage.get().then((p) => {
      if (p.name) setName(p.name);
      if (p.qualification) setQualification(p.qualification);
      if (p.state) setState(p.state);
      if (p.preferred_categories?.length) setCategories(p.preferred_categories);
      if (p.dob) setDob(p.dob);
    }).catch(() => {});
  }, []);

  const toggleCategory = (cat: string) =>
    setCategories((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: logout },
      ]
    );
  };

  const save = async () => {
    // Validate DOB if provided
    if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      Alert.alert("Invalid DOB", "Please enter date of birth as YYYY-MM-DD (e.g. 2000-05-15)");
      return;
    }
    const profile: UserProfile = {
      name, qualification, state,
      preferred_categories: categories as UserProfile["preferred_categories"],
      dob: dob || undefined,
    };
    await profileStorage.save(profile);
    registerPushToken(); // refresh push subscription with updated categories
    Alert.alert("Saved! ✅", "Your preferences have been saved.");
  };

  const s = (bg: string, text: string) => ({ backgroundColor: bg, color: text });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.heading, { color: theme.text }]}>My Profile</Text>
        <Text style={[styles.subheading, { color: theme.muted }]}>
          Set your preferences to see the most relevant jobs.
        </Text>

        {/* Dark Mode toggle */}
        <View style={[styles.darkModeRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={{ fontSize: 22 }}>{theme.isDark ? "🌙" : "☀️"}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.darkModeLabel, { color: theme.text }]}>Dark Mode</Text>
            <Text style={{ fontSize: 12, color: theme.muted }}>
              {theme.isDark ? "Dark theme is on" : "Light theme is on"}
            </Text>
          </View>
          <Switch
            value={theme.isDark}
            onValueChange={(val) => setMode(val ? "dark" : "light")}
            trackColor={{ false: "#DDD", true: theme.blue }}
            thumbColor="#FFF"
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.text }]}>Your Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.input, borderColor: theme.inputBorder, color: theme.text }]}
            value={name} onChangeText={setName}
            placeholder="Enter your name" placeholderTextColor={theme.muted}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.text }]}>Date of Birth</Text>
          <Text style={[styles.hint, { color: theme.muted }]}>
            Used to check age eligibility on jobs (format: YYYY-MM-DD)
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.input, borderColor: theme.inputBorder, color: theme.text }]}
            value={dob} onChangeText={setDob}
            placeholder="e.g. 2000-05-15" placeholderTextColor={theme.muted}
            keyboardType="numeric" maxLength={10}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.text }]}>Qualification</Text>
          <RadioSelect options={QUALIFICATIONS} selected={qualification}
            onSelect={setQualification} theme={theme} />
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.text }]}>State</Text>
          <RadioSelect options={STATES} selected={state} onSelect={setState} theme={theme} />
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.text }]}>Preferred Categories</Text>
          <Text style={[styles.hint, { color: theme.muted }]}>Select all that apply</Text>
          <ChipSelect options={CATEGORIES} selected={categories}
            onToggle={toggleCategory} theme={theme} />
        </View>

        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.blue }]} onPress={save}>
          <Text style={styles.saveBtnText}>Save Preferences</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>🚪 Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  scroll:       { padding: 16, paddingBottom: 40 },
  heading:      { fontSize: 22, fontWeight: "800", marginBottom: 6 },
  subheading:   { fontSize: 13, marginBottom: 16, lineHeight: 19 },
  darkModeRow:  {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 20,
  },
  darkModeLabel:{ fontSize: 15, fontWeight: "600" },
  section:      { marginBottom: 24 },
  label:        { fontSize: 14, fontWeight: "700", marginBottom: 10 },
  hint:         { fontSize: 12, marginBottom: 8 },
  input:        {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14,
  },
  chipRow:      { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip:         { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipText:     { fontSize: 13 },
  saveBtn:      { borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  saveBtnText:  { color: "#FFF", fontWeight: "700", fontSize: 16 },
  logoutBtn:    {
    borderRadius: 10, paddingVertical: 14, alignItems: "center",
    marginTop: 12, borderWidth: 1.5, borderColor: "#D32F2F",
  },
  logoutBtnText: { color: "#D32F2F", fontWeight: "700", fontSize: 16 },
});
