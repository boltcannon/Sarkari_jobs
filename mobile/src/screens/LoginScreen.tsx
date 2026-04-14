import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../api/client";

const BLUE = "#185FA5";
const MOCK_OTP = "123456";

interface Props {
  onLogin: () => void;
}

export default function LoginScreen({ onLogin }: Props) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);

  // Fade-in animation on mount
  const fadeAnim = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const sendOTP = () => {
    if (phone.length < 10) {
      Alert.alert("Invalid number", "Please enter a valid 10-digit mobile number.");
      return;
    }
    setStep("otp");
  };

  const verifyOTP = async () => {
    if (otp !== MOCK_OTP) {
      Alert.alert("Wrong OTP", "Use 123456 in demo mode.");
      return;
    }
    setLoading(true);
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, `mock_token_${phone}`);
    setLoading(false);
    onLogin();
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.kav}
      >
        <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
          {/* Logo */}
          <View style={styles.logoArea}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoLetters}>SJ</Text>
            </View>
            <Text style={styles.appName}>Sarkari Jobs</Text>
            <Text style={styles.tagline}>India's government job companion</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {step === "phone" ? (
              <>
                <Text style={styles.cardTitle}>Enter your mobile number</Text>
                <View style={styles.phoneRow}>
                  <View style={styles.prefixBox}>
                    <Text style={styles.prefix}>+91</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="10-digit number"
                    placeholderTextColor="#AAA"
                    keyboardType="phone-pad"
                    maxLength={10}
                    autoFocus
                  />
                </View>
                <TouchableOpacity
                  style={[styles.primaryBtn, phone.length < 10 && styles.primaryBtnDisabled]}
                  onPress={sendOTP}
                  disabled={phone.length < 10}
                >
                  <Text style={styles.primaryBtnText}>Send OTP</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.cardTitle}>Enter OTP</Text>
                <Text style={styles.sentTo}>Sent to +91 {phone}</Text>
                <TouchableOpacity onPress={() => setStep("phone")}>
                  <Text style={styles.changeLink}>Change number</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.otpInput}
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="• • • • • •"
                  placeholderTextColor="#CCC"
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
                <Text style={styles.demoHint}>Demo mode — use 123456</Text>
                <TouchableOpacity
                  style={[styles.primaryBtn, (otp.length < 6 || loading) && styles.primaryBtnDisabled]}
                  onPress={verifyOTP}
                  disabled={otp.length < 6 || loading}
                >
                  {loading
                    ? <ActivityIndicator color="#FFF" />
                    : <Text style={styles.primaryBtnText}>Verify & Continue</Text>}
                </TouchableOpacity>
              </>
            )}
          </View>

          <Text style={styles.disclaimer}>
            By continuing you agree to our Terms of Service
          </Text>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  kav: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 24, justifyContent: "center" },
  logoArea: { alignItems: "center", marginBottom: 36 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: BLUE,
    justifyContent: "center", alignItems: "center",
    marginBottom: 14,
    shadowColor: BLUE, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
  },
  logoLetters: { fontSize: 28, fontWeight: "900", color: "#FFF", letterSpacing: 1 },
  appName: { fontSize: 26, fontWeight: "800", color: "#1A1A1A", letterSpacing: -0.5 },
  tagline: { fontSize: 13, color: "#999", marginTop: 5 },
  card: {
    backgroundColor: "#FAFAFA",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#ECECEC",
    marginBottom: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#1A1A1A", marginBottom: 14 },
  phoneRow: { flexDirection: "row", marginBottom: 16, gap: 8 },
  prefixBox: {
    backgroundColor: "#F0F0F0",
    borderRadius: 10, borderWidth: 1, borderColor: "#E0E0E0",
    paddingHorizontal: 12, justifyContent: "center",
  },
  prefix: { fontSize: 15, fontWeight: "700", color: "#333" },
  phoneInput: {
    flex: 1, backgroundColor: "#FFF",
    borderRadius: 10, borderWidth: 1, borderColor: "#E0E0E0",
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, color: "#1A1A1A",
  },
  sentTo: { fontSize: 13, color: "#666", marginBottom: 4 },
  changeLink: { fontSize: 13, color: BLUE, fontWeight: "600", marginBottom: 16 },
  otpInput: {
    backgroundColor: "#FFF",
    borderRadius: 10, borderWidth: 1, borderColor: "#E0E0E0",
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 24, letterSpacing: 12, textAlign: "center",
    color: "#1A1A1A", marginBottom: 8,
  },
  demoHint: { fontSize: 12, color: "#AAA", textAlign: "center", marginBottom: 16 },
  primaryBtn: {
    backgroundColor: BLUE, borderRadius: 10,
    paddingVertical: 14, alignItems: "center",
  },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  disclaimer: { fontSize: 11, color: "#BBB", textAlign: "center", lineHeight: 17 },
});
