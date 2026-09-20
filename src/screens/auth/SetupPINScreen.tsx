import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Vibration,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import { useAuthStore } from "../../store/authStore";

const { width: W } = Dimensions.get("window");
const KEY_SIZE = Math.min(72, (W - 48 - 36) / 3);
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

export default function SetupPINScreen({ route }: any) {
  // ← Guard: namaToko bisa undefined jika params tidak dikirim
  const namaToko = route?.params?.namaToko || "Toko Anda";

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState<"set" | "confirm">("set");
  const [pressed, setPressed] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const shake = React.useRef(new Animated.Value(0)).current;
  const { setupPIN } = useAuthStore();

  const currentPin = step === "set" ? pin : confirmPin;
  const setCurrentPin = step === "set" ? setPin : setConfirmPin;

  const doShake = () => {
    Vibration.vibrate([0, 60, 30, 60]);
    Animated.sequence([
      Animated.timing(shake, {
        toValue: 10,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        toValue: -10,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        toValue: 6,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        toValue: -6,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleKey = (key: string) => {
    if (key === "") return;

    setPressed(key);
    setTimeout(() => setPressed(null), 120);

    if (error) {
      setError(false);
      return;
    }

    if (key === "⌫") {
      setCurrentPin((p) => p.slice(0, -1));
      return;
    }
    if (currentPin.length >= 6) return;

    const next = currentPin + key;
    setCurrentPin(next);

    if (next.length === 6) {
      if (step === "set") {
        setTimeout(() => {
          setStep("confirm");
        }, 300);
      } else {
        setTimeout(() => {
          const ok = setupPIN(pin, next);
          if (!ok) {
            setError(true);
            doShake();
            setTimeout(() => {
              setPin("");
              setConfirmPin("");
              setStep("set");
              setError(false);
            }, 1000);
            Alert.alert(
              "PIN Tidak Cocok",
              "PIN konfirmasi berbeda. Silakan ulangi dari awal.",
            );
          }
        }, 300);
      }
    }
  };

  const initials =
    namaToko
      .split(" ")
      .slice(0, 2)
      .map((w: string) => w[0] || "")
      .join("")
      .toUpperCase() || "??";

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.body}>
        {/* Logo */}
        <View style={s.logoSection}>
          <View style={s.logoOuter}>
            <View style={s.logoInner}>
              <Text style={s.logoInitials}>{initials}</Text>
            </View>
          </View>
          <Text style={s.tokoName}>{namaToko}</Text>
          <Text style={s.title}>
            {step === "set" ? "Buat PIN Owner" : "Konfirmasi PIN"}
          </Text>
          <Text style={s.sub}>
            {step === "set"
              ? "PIN digunakan untuk login ke aplikasi"
              : "Masukkan PIN yang sama sekali lagi"}
          </Text>
        </View>

        {/* Step indicator */}
        <View style={s.stepRow}>
          {(["Buat PIN", "Konfirmasi"] as const).map((label, i) => {
            const active =
              (step === "set" && i === 0) || (step === "confirm" && i === 1);
            const done = step === "confirm" && i === 0;
            return (
              <React.Fragment key={label}>
                <View style={s.stepItem}>
                  <View
                    style={[
                      s.stepCircle,
                      active && s.stepCircleActive,
                      done && s.stepCircleDone,
                    ]}>
                    {done ? (
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    ) : (
                      <Text
                        style={[
                          s.stepNum,
                          (active || done) && { color: "#fff" },
                        ]}>
                        {i + 1}
                      </Text>
                    )}
                  </View>
                  <Text style={[s.stepLabel, active && { color: "#fff" }]}>
                    {label}
                  </Text>
                </View>
                {i === 0 && (
                  <View
                    style={[
                      s.stepLine,
                      done && { backgroundColor: Colors.success },
                    ]}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>

        {/* PIN Dots */}
        <View style={s.pinSection}>
          <Animated.View
            style={[s.dots, { transform: [{ translateX: shake }] }]}>
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const filled = currentPin.length > i;
              return (
                <View
                  key={i}
                  style={[
                    s.dot,
                    filled && (error ? s.dotError : s.dotFilled),
                    !filled && s.dotEmpty,
                  ]}>
                  {filled && !error && <View style={s.dotInner} />}
                  {filled && error && (
                    <Ionicons name="close" size={10} color="#fff" />
                  )}
                </View>
              );
            })}
          </Animated.View>

          <View style={s.feedbackWrap}>
            {error ? (
              <View style={s.errorPill}>
                <Ionicons
                  name="alert-circle-outline"
                  size={14}
                  color="#FCA5A5"
                />
                <Text style={s.errorTxt}>PIN tidak cocok, ulangi</Text>
              </View>
            ) : currentPin.length === 6 ? (
              <View style={s.checkPill}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={14}
                  color="#86EFAC"
                />
                <Text style={s.checkTxt}>
                  {step === "set" ? "Lanjut konfirmasi..." : "Menyimpan..."}
                </Text>
              </View>
            ) : (
              <Text style={s.pinCount}>
                {currentPin.length > 0
                  ? `${currentPin.length} dari 6 digit`
                  : " "}
              </Text>
            )}
          </View>
        </View>

        {/* Keypad */}
        <View style={s.keypadWrap}>
          <View style={s.keypad}>
            {KEYS.map((key, i) => {
              const isBlank = key === "";
              const isBackspace = key === "⌫";
              const isPressed = pressed === key && key !== "";
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    s.key,
                    isBlank && s.keyBlank,
                    isBackspace && s.keyBackspace,
                    isPressed && s.keyPressed,
                  ]}
                  onPress={() => handleKey(key)}
                  disabled={isBlank}
                  activeOpacity={0.7}>
                  {isBackspace ? (
                    <Ionicons
                      name="backspace-outline"
                      size={22}
                      color={
                        isPressed ? Colors.primary : "rgba(255,255,255,0.85)"
                      }
                    />
                  ) : (
                    <Text style={[s.keyTxt, isPressed && s.keyTxtPressed]}>
                      {key}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Footer */}
        <Text style={s.poweredBy}>Kasir WarungKu · Setup Awal</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },

  logoSection: { alignItems: "center", gap: 8 },
  logoOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.15)",
    marginBottom: 4,
  },
  logoInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoInitials: {
    fontSize: 26,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 1,
  },
  tokoName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
  },
  sub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    lineHeight: 18,
  },

  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  stepItem: { alignItems: "center", gap: 4 },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  stepCircleActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  stepCircleDone: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  stepNum: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.5)" },
  stepLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.4)",
    fontWeight: "600",
  },
  stepLine: {
    width: 56,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginHorizontal: 8,
    marginBottom: 16,
  },

  pinSection: { alignItems: "center", gap: 14 },
  dots: { flexDirection: "row", gap: 16 },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  dotEmpty: {
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "transparent",
  },
  dotFilled: { backgroundColor: "#fff", borderWidth: 0 },
  dotError: { backgroundColor: "#EF4444", borderWidth: 0 },
  dotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  feedbackWrap: { height: 28, alignItems: "center", justifyContent: "center" },
  errorPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(239,68,68,0.15)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(252,165,165,0.3)",
  },
  errorTxt: { color: "#FCA5A5", fontSize: 12, fontWeight: "600" },
  checkPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(34,197,94,0.15)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  checkTxt: { color: "#86EFAC", fontSize: 12, fontWeight: "600" },
  pinCount: { color: "rgba(255,255,255,0.35)", fontSize: 12 },

  keypadWrap: { width: "100%", alignItems: "center" },
  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: KEY_SIZE * 3 + 32,
    gap: 12,
  },
  key: {
    width: KEY_SIZE,
    height: KEY_SIZE,
    borderRadius: KEY_SIZE / 2,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  keyBlank: { backgroundColor: "transparent", borderColor: "transparent" },
  keyBackspace: { backgroundColor: "rgba(255,255,255,0.07)" },
  keyPressed: { backgroundColor: "#fff", borderColor: "#fff" },
  keyTxt: { fontSize: 26, fontWeight: "500", color: "#fff" },
  keyTxtPressed: { color: Colors.primary },

  poweredBy: { fontSize: 10, color: "rgba(255,255,255,0.2)" },
});
