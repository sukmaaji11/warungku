import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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

export default function LoginScreen() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [pressed, setPressed] = useState<string | null>(null);

  const shake = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  const { login, namaToko, logout } = useAuthStore();

  const doShake = useCallback(() => {
    Vibration.vibrate([0, 60, 30, 60]);
    Animated.sequence([
      Animated.timing(shake, {
        toValue: 12,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        toValue: -12,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        toValue: 8,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        toValue: -8,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shake]);

  const pressKey = useCallback(
    (key: string) => {
      setPressed(key);
      setTimeout(() => setPressed(null), 120);

      if (error) {
        setError(false);
        setPin("");
      }
      if (key === "⌫") {
        setPin((p) => p.slice(0, -1));
        return;
      }
      if (key === "") return;
      if (pin.length >= 6) return;

      const next = pin + key;
      setPin(next);

      if (next.length === 6) {
        setTimeout(() => {
          const ok = login(next);
          if (!ok) {
            setError(true);
            doShake();
            setTimeout(() => {
              setPin("");
              setError(false);
            }, 1200);
          }
        }, 180);
      }
    },
    [pin, error, login, doShake],
  );

  const initials = namaToko
    ? namaToko
        .split(" ")
        .slice(0, 2)
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
    : "??";

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.body}>
        {/* ── Brand section ── */}
        <View style={s.brandSection}>
          {/* Logo toko */}
          <View style={s.logoOuter}>
            <View style={s.logoInner}>
              <Text style={s.logoInitials}>{initials}</Text>
            </View>
          </View>

          <Text style={s.tokoName}>{namaToko || "Kasir WarungKu"}</Text>
          <View style={s.badgeRow}>
            <View style={s.badge}>
              <Ionicons name="shield-checkmark" size={11} color="#86EFAC" />
              <Text style={s.badgeTxt}>Terproteksi PIN</Text>
            </View>
          </View>
          <Text style={s.sub}>Masukkan PIN 6 digit untuk masuk</Text>
        </View>

        {/* ── PIN dots ── */}
        <View style={s.pinSection}>
          <Animated.View
            style={[s.dots, { transform: [{ translateX: shake }] }]}>
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const filled = pin.length > i;
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
                <Text style={s.errorTxt}>PIN salah, coba lagi</Text>
              </View>
            ) : pin.length === 6 ? (
              <View style={s.checkPill}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={14}
                  color="#86EFAC"
                />
                <Text style={s.checkTxt}>Memverifikasi...</Text>
              </View>
            ) : (
              <Text style={s.pinCount}>
                {pin.length > 0 ? `${pin.length} dari 6 digit` : " "}
              </Text>
            )}
          </View>
        </View>

        {/* ── Keypad ── */}
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
                  onPress={() => pressKey(key)}
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

        {/* ── Footer ── */}
        <View style={s.footer}>
          <TouchableOpacity style={s.logoutBtn} onPress={() => logout()}>
            <Ionicons
              name="log-out-outline"
              size={15}
              color="rgba(255,255,255,0.4)"
            />
            <Text style={s.logoutTxt}>Ganti Akun / Lisensi</Text>
          </TouchableOpacity>
          <Text style={s.poweredBy}>Powered by Kasir WarungKu</Text>
        </View>
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

  // Brand
  brandSection: { alignItems: "center", gap: 10 },
  logoOuter: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.15)",
  },
  logoInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoInitials: {
    fontSize: 28,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 1,
  },
  tokoName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  badgeRow: { flexDirection: "row", gap: 8 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(34,197,94,0.15)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(134,239,172,0.3)",
  },
  badgeTxt: { fontSize: 11, fontWeight: "600", color: "#86EFAC" },
  sub: { fontSize: 13, color: "rgba(255,255,255,0.55)", textAlign: "center" },

  // PIN
  pinSection: { alignItems: "center", gap: 16 },
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

  // Keypad
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

  // Footer
  footer: { alignItems: "center", gap: 8 },
  logoutBtn: { flexDirection: "row", alignItems: "center", gap: 6, padding: 8 },
  logoutTxt: {
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
    fontWeight: "500",
  },
  poweredBy: { fontSize: 10, color: "rgba(255,255,255,0.2)" },
});
