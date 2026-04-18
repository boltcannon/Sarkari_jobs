import React, { useRef, useState } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { profileStorage, UserProfile, JobCategory, STORAGE_KEYS } from "../api/client";

const BLUE = "#185FA5";

const QUALIFICATIONS = [
  "10th Pass", "12th Pass", "Diploma", "Graduate", "B.Tech / BE", "Post Graduate",
];
const STATES = [
  "All India", "Andhra Pradesh", "Bihar", "Delhi", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Odisha", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
];
const CATEGORIES: JobCategory[] = [
  "SSC", "UPSC", "Railway", "Banking", "Defence", "Police", "Teaching", "Other",
];

const STEPS = [
  { label: "Your name", emoji: "👋" },
  { label: "Date of birth", emoji: "🎂" },
  { label: "Qualification", emoji: "🎓" },
  { label: "Your state", emoji: "📍" },
  { label: "Job interests", emoji: "🏆" },
];

interface Props {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [dobError, setDobError] = useState("");
  const [qualification, setQualification] = useState("");
  const [state, setState] = useState("All India");
  const [categories, setCategories] = useState<JobCategory[]>([]);

  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateNext = (direction: 1 | -1) => {
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: -30 * direction,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const goNext = () => {
    // Validate DOB if user typed something on step 1
    if (step === 1 && dob.length > 0 && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      setDobError("Use format YYYY-MM-DD  e.g. 2000-05-15");
      return;
    }
    setDobError("");
    animateNext(1);
    setStep((s) => s + 1);
  };
  const goBack = () => {
    animateNext(-1);
    setStep((s) => s - 1);
  };

  const toggleCat = (c: JobCategory) =>
    setCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );

  const finish = async () => {
    const profile: UserProfile = {
      name: name.trim() || "User",
      qualification,
      state,
      preferred_categories: categories,
      dob: dob || undefined,
    };
    await profileStorage.save(profile);
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_DONE, "true");
    onComplete();
  };

  const canProceed = [
    name.trim().length > 0,
    true,                      // DOB is optional — always can proceed
    qualification.length > 0,
    true,
    true,
  ][step];

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Progress bar */}
      <View style={styles.progressRow}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressSegment,
              i <= step && styles.progressSegmentActive,
            ]}
          />
        ))}
      </View>

      <View style={styles.stepHeader}>
        <Text style={styles.stepEmoji}>{STEPS[step].emoji}</Text>
        <Text style={styles.stepLabel}>{STEPS[step].label}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Let's personalise your feed</Text>

        <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
          {step === 0 && (
            <View>
              <Text style={styles.question}>What should we call you?</Text>
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor="#BBB"
                autoFocus
                returnKeyType="next"
                onSubmitEditing={() => canProceed && goNext()}
              />
            </View>
          )}

          {step === 1 && (
            <View>
              <Text style={styles.question}>When were you born?</Text>
              <Text style={styles.hint}>
                Used to check age eligibility on jobs. You can skip this.
              </Text>
              <TextInput
                style={[styles.textInput, dobError ? styles.textInputError : null]}
                value={dob}
                onChangeText={(t) => { setDob(t); setDobError(""); }}
                placeholder="YYYY-MM-DD  e.g. 2000-05-15"
                placeholderTextColor="#BBB"
                keyboardType="numeric"
                maxLength={10}
                returnKeyType="next"
                onSubmitEditing={goNext}
              />
              {dobError ? (
                <Text style={styles.errorText}>{dobError}</Text>
              ) : null}
            </View>
          )}

          {step === 2 && (
            <View>
              <Text style={styles.question}>Your highest qualification</Text>
              <View style={styles.chipGrid}>
                {QUALIFICATIONS.map((q) => (
                  <TouchableOpacity
                    key={q}
                    style={[styles.chip, qualification === q && styles.chipActive]}
                    onPress={() => setQualification(q)}
                  >
                    <Text style={[styles.chipText, qualification === q && styles.chipTextActive]}>
                      {q}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {step === 3 && (
            <View>
              <Text style={styles.question}>Which state are you from?</Text>
              <View style={styles.chipGrid}>
                {STATES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, state === s && styles.chipActive]}
                    onPress={() => setState(s)}
                  >
                    <Text style={[styles.chipText, state === s && styles.chipTextActive]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {step === 4 && (
            <View>
              <Text style={styles.question}>Which job categories interest you?</Text>
              <Text style={styles.hint}>Select all that apply — you can change this later</Text>
              <View style={styles.chipGrid}>
                {CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.chip, categories.includes(c) && styles.chipActive]}
                    onPress={() => toggleCat(c)}
                  >
                    <Text style={[styles.chipText, categories.includes(c) && styles.chipTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Footer buttons */}
      <View style={styles.footer}>
        {step > 0 ? (
          <TouchableOpacity style={styles.backBtn} onPress={goBack}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <TouchableOpacity
          style={[styles.nextBtn, !canProceed && styles.nextBtnDisabled]}
          onPress={step === 4 ? finish : goNext}
          disabled={!canProceed}
        >
          <Text style={styles.nextText}>
            {step === 4 ? "Find My Jobs →" : "Next →"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  progressRow: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 6,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#EEE",
  },
  progressSegmentActive: { backgroundColor: BLUE },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 18,
    gap: 8,
  },
  stepEmoji: { fontSize: 22 },
  stepLabel: { fontSize: 13, color: "#888", fontWeight: "600" },
  scroll: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 20 },
  heading: { fontSize: 22, fontWeight: "800", color: "#1A1A1A", marginBottom: 20, letterSpacing: -0.3 },
  question: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 16 },
  hint: { fontSize: 12, color: "#999", marginBottom: 14 },
  textInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    color: "#1A1A1A",
    backgroundColor: "#FAFAFA",
  },
  textInputError: { borderColor: "#D32F2F" },
  errorText: { color: "#D32F2F", fontSize: 12, marginTop: 6 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  chipActive: { backgroundColor: BLUE, borderColor: BLUE },
  chipText: { fontSize: 14, color: "#555" },
  chipTextActive: { color: "#FFF", fontWeight: "600" },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  backBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  backText: { fontSize: 15, color: "#555", fontWeight: "600" },
  nextBtn: {
    flex: 2,
    backgroundColor: BLUE,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  nextBtnDisabled: { opacity: 0.35 },
  nextText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
});
