import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "../../constants/colors";
import { useAuthStore } from "../../store/authStore";

// ── Konstanta penjual ──────────────────────────────────────────────────────
const PENJUAL_WA = "6285113223419";
const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const ACT_POS = [2, 6, 10, 14, 18]; // posisi digit kode aktivasi

// ── Fungsi lisensi (inline, tidak perlu file terpisah) ────────────────────
function generateSerial(): string {
  let s = "";
  for (let i = 0; i < 20; i++)
    s += CHARS[Math.floor(Math.random() * CHARS.length)];
  return s;
}

function formatSerial(s: string): string {
  return (
    s
      .replace(/-/g, "")
      .match(/.{1,4}/g)
      ?.join("-") || s
  );
}

export function getActivationCode(serial: string): string {
  const s = serial.replace(/-/g, "");
  if (s.length !== 20) return "";
  // Posisi di-derive dari serial itu sendiri — berbeda untuk setiap serial
  const seeds = [0, 4, 9, 13, 17];
  return seeds
    .map((seed, i) => {
      const a = CHARS.indexOf(s[seed]);
      const b = CHARS.indexOf(s[(seed + 3) % 20]);
      const pos = (a * 3 + b + i * 7) % 20;
      return s[pos];
    })
    .join("");
}

async function saveSerial(serial: string, id: string, toko: string) {
  await AsyncStorage.multiSet([
    ["kasirku_serial", serial],
    ["kasirku_identifier", id],
    ["kasirku_nama_toko", toko],
    ["kasirku_status", "pending"],
  ]);
}

async function validateActivation(input: string): Promise<boolean> {
  const serial = await AsyncStorage.getItem("kasirku_serial");
  if (!serial) return false;
  return input.toUpperCase().trim() === getActivationCode(serial);
}

// ── Screen ────────────────────────────────────────────────────────────────
type Step = "input" | "aktivasi";

export default function AktivasiLisensiScreen({ navigation }: any) {
  const [step, setStep] = useState<Step>("input");
  const [identifier, setIdentifier] = useState("");
  const [namaToko, setNamaToko] = useState("");
  const [serial, setSerial] = useState("");
  const [kodeInput, setKodeInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sudahKirim, setSudahKirim] = useState(false);
  const [showDevHelper, setShowDevHelper] = useState(false);

  const fadeAnim = React.useRef(new Animated.Value(1)).current;
  const { setStatus } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      const [savedSerial, savedStatus, savedId, savedToko] =
        await AsyncStorage.multiGet([
          "kasirku_serial",
          "kasirku_status",
          "kasirku_identifier",
          "kasirku_nama_toko",
        ]);

      const serialVal = savedSerial[1];
      const statusVal = savedStatus[1];
      const idVal = savedId[1];
      const tokoVal = savedToko[1];

      if (serialVal) {
        setSerial(serialVal);
        setIdentifier(idVal || "");
        setNamaToko(tokoVal || "");

        if (statusVal === "aktif") {
          setStatus("need_pin_setup"); // skip aktivasi
          return;
        }

        if (statusVal === "pending") {
          setStep("aktivasi");
        }
      }
    };

    init();
  }, []);

  const fadeToStep = (nextStep: Step) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setStep(nextStep);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleGenerate = async () => {
    if (!identifier.trim()) {
      Alert.alert("Wajib diisi", "Masukkan email atau nomor HP.");
      return;
    }

    const existingSerial = await AsyncStorage.getItem("kasirku_serial");

    if (existingSerial) {
      setSerial(existingSerial);
      fadeToStep("aktivasi");
      return;
    }

    setLoading(true);
    try {
      const s = generateSerial();

      await saveSerial(s, identifier.trim(), namaToko.trim());

      setSerial(s);
      fadeToStep("aktivasi");
    } finally {
      setLoading(false);
    }
  };

  const handleKirimWA = () => {
    if (!serial) {
      Alert.alert("Error", "Serial belum tersedia.");
      return;
    }
    const pesan =
      `Halo, saya ingin mengaktifkan *Kasir WarungKu* 🙏\n\n` +
      `*Identitas:* ${identifier}\n` +
      (namaToko ? `*Nama Toko:* ${namaToko}\n` : "") +
      `*Serial Number:*\n\`${formatSerial(serial)}\`\n\n` +
      `Mohon kirimkan kode aktivasi. Terima kasih!`;
    Linking.openURL(
      `https://wa.me/${PENJUAL_WA}?text=${encodeURIComponent(pesan)}`,
    );
    setSudahKirim(true);
  };

  const handleAktivasi = async () => {
    if (kodeInput.length < 5) {
      Alert.alert("Kode tidak valid", "Kode aktivasi terdiri dari 5 karakter.");
      return;
    }

    setLoading(true);
    try {
      const ok = await validateActivation(kodeInput);

      if (ok) {
        await AsyncStorage.setItem("kasirku_status", "aktif");

        Alert.alert("Aktivasi Berhasil! 🎉", "Kasir siap digunakan.", [
          {
            text: "Lanjut",
            onPress: () => setStatus("need_pin_setup"),
          },
        ]);
      } else {
        Alert.alert("Kode Salah", "Pastikan kode dari admin benar.");
      }
    } finally {
      setLoading(false);
    }
  };

  const resetLisensi = async () => {
    await AsyncStorage.multiRemove([
      "kasirku_serial",
      "kasirku_identifier",
      "kasirku_nama_toko",
      "kasirku_status",
    ]);
  };

  // Kode aktivasi untuk dev helper (tampil jika serial sudah di-generate)
  const devKode = serial ? getActivationCode(serial) : "";

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Logo */}
          <View style={s.logoWrap}>
            <View style={s.logoOuter}>
              <View style={s.logoInner}>
                {/* <Ionicons name="receipt" size={32} color="#fff" /> */}
                <Image
                  source={require("../../../assets/logo.png")}
                  resizeMode="contain"
                  style={{ width: 100, height: 100 }}
                />
              </View>
            </View>
            <Text style={s.appName}>Kasir WarungKu</Text>
            <Text style={s.appSub}>Aktivasi Lisensi</Text>
          </View>

          {/* Step indicator */}
          <View style={s.stepRow}>
            {(["Daftar", "Aktivasi"] as const).map((label, i) => {
              const idx = i + 1;
              const active =
                (step === "input" && idx === 1) ||
                (step === "aktivasi" && idx === 2);
              const done = step === "aktivasi" && idx === 1;
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
                        <Ionicons name="checkmark" size={13} color="#fff" />
                      ) : (
                        <Text
                          style={[
                            s.stepNum,
                            (active || done) && { color: "#fff" },
                          ]}>
                          {idx}
                        </Text>
                      )}
                    </View>
                    <Text style={[s.stepLabel, active && s.stepLabelActive]}>
                      {label}
                    </Text>
                  </View>
                  {i < 1 && (
                    <View style={[s.stepLine, done && s.stepLineDone]} />
                  )}
                </React.Fragment>
              );
            })}
          </View>

          <Animated.View style={[s.card, { opacity: fadeAnim }]}>
            {/* ── STEP 1 ── */}
            {step === "input" && (
              <>
                <Text style={s.cardTitle}>Daftarkan Perangkat</Text>
                <Text style={s.cardDesc}>
                  Masukkan email atau nomor HP, lalu generate serial number
                  untuk dikirim ke penjual.
                </Text>

                <Text style={s.label}>Email atau Nomor HP</Text>
                <View style={s.inputWrap}>
                  <Ionicons
                    name="person-outline"
                    size={17}
                    color={Colors.textMuted}
                    style={{ marginRight: 8 }}
                  />
                  <TextInput
                    style={s.input}
                    placeholder="contoh@email.com atau 08xxxxxxxxxx"
                    placeholderTextColor={Colors.textDisabled}
                    value={identifier}
                    onChangeText={setIdentifier}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <Text style={s.label}>
                  Nama Toko <Text style={s.optional}>(opsional)</Text>
                </Text>
                <View style={s.inputWrap}>
                  <Ionicons
                    name="storefront-outline"
                    size={17}
                    color={Colors.textMuted}
                    style={{ marginRight: 8 }}
                  />
                  <TextInput
                    style={s.input}
                    placeholder="Warung Suka Suka"
                    placeholderTextColor={Colors.textDisabled}
                    value={namaToko}
                    onChangeText={setNamaToko}
                  />
                </View>

                <TouchableOpacity
                  style={[
                    s.primaryBtn,
                    (!identifier.trim() || loading) && { opacity: 0.5 },
                  ]}
                  onPress={handleGenerate}
                  disabled={!identifier.trim() || loading}>
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="key-outline" size={18} color="#fff" />
                      <Text style={s.primaryBtnTxt}>
                        Generate Serial Number
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <View style={s.infoBox}>
                  <Ionicons
                    name="information-circle-outline"
                    size={15}
                    color={Colors.info}
                  />
                  <Text style={s.infoTxt}>
                    Serial akan dikirim otomatis ke WhatsApp penjual. Penjual
                    akan membalas dengan kode aktivasi 5 karakter.
                  </Text>
                </View>
              </>
            )}

            {/* ── STEP 2 ── */}
            {step === "aktivasi" && (
              <>
                <Text style={s.cardTitle}>Aktivasi Lisensi</Text>
                <Text style={s.cardDesc}>
                  Kirim serial number ke penjual via WhatsApp, lalu masukkan
                  kode aktivasi yang diberikan.
                </Text>

                {/* Serial display */}
                <View style={s.serialBox}>
                  <Text style={s.serialLabel}>Serial Number Anda</Text>
                  <Text style={s.serialNum}>{formatSerial(serial)}</Text>
                  <Text style={s.serialHint}>
                    Unik untuk perangkat ini · jangan bagikan ke orang lain
                  </Text>
                </View>

                {/* Kirim WA */}
                <TouchableOpacity
                  style={[s.waBtn, sudahKirim && s.waBtnDone]}
                  onPress={handleKirimWA}>
                  <Ionicons
                    name={sudahKirim ? "checkmark-circle" : "logo-whatsapp"}
                    size={20}
                    color="#fff"
                  />
                  <Text style={s.waBtnTxt}>
                    {sudahKirim
                      ? "Sudah Dikirim ✓"
                      : "Kirim ke WhatsApp Penjual"}
                  </Text>
                </TouchableOpacity>

                {sudahKirim && (
                  <>
                    <View style={s.divider} />
                    <Text style={s.label}>Kode Aktivasi (5 karakter)</Text>
                    <View style={s.kodeWrap}>
                      <TextInput
                        style={s.kodeInput}
                        placeholder="Contoh: A7B3X"
                        placeholderTextColor={Colors.textDisabled}
                        value={kodeInput}
                        onChangeText={(t) =>
                          setKodeInput(
                            t.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                          )
                        }
                        autoCapitalize="characters"
                        maxLength={5}
                        autoCorrect={false}
                        autoFocus
                      />
                    </View>

                    <TouchableOpacity
                      style={[
                        s.primaryBtn,
                        (kodeInput.length < 5 || loading) && { opacity: 0.5 },
                      ]}
                      onPress={handleAktivasi}
                      disabled={kodeInput.length < 5 || loading}>
                      {loading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <Ionicons
                            name="shield-checkmark-outline"
                            size={18}
                            color="#fff"
                          />
                          <Text style={s.primaryBtnTxt}>Aktivasi Sekarang</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity
                  style={s.backBtn}
                  onPress={() => fadeToStep("input")}>
                  <Ionicons
                    name="arrow-back"
                    size={15}
                    color={Colors.textMuted}
                  />
                  <Text style={s.backBtnTxt}>Kembali & generate ulang</Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>

          {/* ── Dev Helper (tersembunyi) ── */}
          {/* <TouchableOpacity
            style={s.devToggle}
            onPress={() => setShowDevHelper(!showDevHelper)}>
            <Text style={s.devToggleTxt}>🛠 Developer tools</Text>
          </TouchableOpacity>

          {showDevHelper && (
            <View style={s.devCard}>
              <Text style={s.devTitle}>Kode Aktivasi Generator</Text>
              <Text style={s.devDesc}>
                Kode aktivasi di-generate otomatis dari serial.{"\n"}
                Masukkan serial pembeli → dapatkan kode 5 karakter.
              </Text>
              {serial ? (
                <View style={s.devKodeBox}>
                  <Text style={s.devSerial}>{formatSerial(serial)}</Text>
                  <View style={s.devArrow}>
                    <Ionicons
                      name="arrow-down"
                      size={16}
                      color="rgba(255,255,255,0.5)"
                    />
                  </View>
                  <Text style={s.devKode}>{devKode}</Text>
                  <Text style={s.devKodeSub}>Kirim kode ini ke pembeli</Text>
                </View>
              ) : (
                <Text style={s.devEmpty}>
                  Generate serial dulu di step 1...
                </Text>
              )}
            </View>
          )} */}

          <Text style={s.powered}>Kasir WarungKu · Offline License System</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  scroll: { flexGrow: 1, padding: 20, paddingBottom: 48 },

  logoWrap: { alignItems: "center", marginTop: 16, marginBottom: 28, gap: 8 },
  logoOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
  },
  logoInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  appName: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  appSub: { color: "rgba(255,255,255,0.5)", fontSize: 13 },

  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  stepItem: { alignItems: "center", gap: 5 },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
  stepNum: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.5)" },
  stepLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.4)",
    fontWeight: "600",
  },
  stepLabelActive: { color: "#fff" },
  stepLine: {
    width: 64,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginHorizontal: 10,
    marginBottom: 16,
  },
  stepLineDone: { backgroundColor: Colors.success },

  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 5,
  },
  cardDesc: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
    marginBottom: 18,
  },

  label: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textMuted,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  optional: { fontWeight: "400", color: Colors.textDisabled },

  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
    paddingHorizontal: 14,
  },
  input: { flex: 1, paddingVertical: 13, fontSize: 14, color: Colors.text },

  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 15,
    marginBottom: 12,
  },
  primaryBtnTxt: { color: "#fff", fontSize: 14, fontWeight: "800" },

  waBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#25D366",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  waBtnDone: { backgroundColor: Colors.success },
  waBtnTxt: { color: "#fff", fontSize: 14, fontWeight: "700" },

  serialBox: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(30,58,95,0.12)",
  },
  serialLabel: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  serialNum: {
    fontSize: 17,
    fontWeight: "900",
    color: Colors.primary,
    letterSpacing: 2.5,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  serialHint: {
    fontSize: 10,
    color: Colors.textLight,
    marginTop: 6,
    textAlign: "center",
  },

  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 14 },

  kodeWrap: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    marginBottom: 14,
    alignItems: "center",
    paddingVertical: 4,
  },
  kodeInput: {
    fontSize: 26,
    fontWeight: "900",
    color: Colors.text,
    letterSpacing: 6,
    textAlign: "center",
    paddingVertical: 10,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    width: "100%",
    textAlignVertical: "center",
  },

  infoBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: Colors.infoLight,
    borderRadius: 10,
    padding: 12,
    alignItems: "flex-start",
  },
  infoTxt: { flex: 1, fontSize: 11, color: Colors.info, lineHeight: 16 },

  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 12,
    marginTop: 4,
  },
  backBtnTxt: { fontSize: 12, color: Colors.textMuted },

  devToggle: { alignItems: "center", paddingVertical: 10 },
  devToggleTxt: { color: "rgba(255,255,255,0.3)", fontSize: 11 },

  devCard: {
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  devTitle: { color: "#fff", fontSize: 13, fontWeight: "700", marginBottom: 4 },
  devDesc: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    marginBottom: 12,
    lineHeight: 16,
  },
  devKodeBox: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 6,
  },
  devSerial: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    letterSpacing: 2,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  devArrow: { opacity: 0.5 },
  devKode: {
    color: "#FFD700",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 6,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  devKodeSub: { color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 2 },
  devEmpty: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 12,
    textAlign: "center",
    padding: 8,
  },

  powered: {
    textAlign: "center",
    fontSize: 10,
    color: "rgba(255,255,255,0.2)",
    marginTop: 8,
  },
});
