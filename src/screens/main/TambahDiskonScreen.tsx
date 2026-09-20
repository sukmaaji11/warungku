// src/screens/main/TambahDiskonScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants";
import { formatRupiah } from "../../utils/format";
import { getDB } from "../../db/database";

function tambahDiskon(data: {
  nama: string;
  tipe: string;
  nilai: number;
  min_pembelian: number;
}) {
  getDB().runSync(
    "INSERT INTO diskon (nama,tipe,nilai,min_pembelian,aktif) VALUES (?,?,?,?,1)",
    [data.nama, data.tipe, data.nilai, data.min_pembelian],
  );
}

export default function TambahDiskonScreen({ navigation }: any) {
  const [nama, setNama] = useState("");
  const [tipe, setTipe] = useState<"persen" | "nominal">("persen");
  const [nilai, setNilai] = useState("");
  const [minBeli, setMinBeli] = useState("");
  const [aktif, setAktif] = useState(true);

  const nilaiNum = parseInt(nilai.replace(/\D/g, "")) || 0;
  const minNum = parseInt(minBeli.replace(/\D/g, "")) || 0;

  const handleSimpan = () => {
    if (!nama.trim()) {
      Alert.alert("Error", "Nama diskon wajib diisi");
      return;
    }
    if (!nilai || nilaiNum <= 0) {
      Alert.alert("Error", "Nilai diskon wajib diisi");
      return;
    }
    if (tipe === "persen" && nilaiNum > 100) {
      Alert.alert("Error", "Persen maksimal 100%");
      return;
    }

    tambahDiskon({
      nama: nama.trim(),
      tipe,
      nilai: nilaiNum,
      min_pembelian: minNum,
    });
    Alert.alert("Berhasil", "Diskon berhasil ditambahkan", [
      { text: "OK", onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Tambah Diskon</Text>
        <TouchableOpacity onPress={handleSimpan}>
          <Text style={s.headerSave}>Simpan</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Preview */}
        <View style={s.previewCard}>
          <Text style={s.previewLabel}>Preview Diskon</Text>
          <Text style={s.previewVal}>
            {nilaiNum > 0
              ? tipe === "persen"
                ? `${nilaiNum}% OFF`
                : `Hemat ${formatRupiah(nilaiNum)}`
              : "—"}
          </Text>
          {minNum > 0 && (
            <Text style={s.previewSub}>
              Min. belanja {formatRupiah(minNum)}
            </Text>
          )}
        </View>

        {/* Nama */}
        <Text style={s.sectionLabel}>INFORMASI DISKON</Text>
        <View style={s.card}>
          <View style={s.fieldRow}>
            <Ionicons
              name="pricetag-outline"
              size={18}
              color={Colors.textMuted}
            />
            <TextInput
              style={s.input}
              placeholder="Nama diskon (contoh: Diskon Lebaran)"
              placeholderTextColor={Colors.textDisabled}
              value={nama}
              onChangeText={setNama}
              maxLength={50}
            />
          </View>
        </View>

        {/* Tipe */}
        <Text style={s.sectionLabel}>TIPE DISKON</Text>
        <View style={s.tipeRow}>
          {(["persen", "nominal"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[s.tipeBtn, tipe === t && s.tipeBtnActive]}
              onPress={() => {
                setTipe(t);
                setNilai("");
              }}>
              <Ionicons
                name={t === "persen" ? "pricetag-outline" : "cash-outline"}
                size={20}
                color={tipe === t ? "#fff" : Colors.textMuted}
              />
              <Text style={[s.tipeTxt, tipe === t && s.tipeTxtActive]}>
                {t === "persen" ? "Persentase (%)" : "Nominal (Rp)"}
              </Text>
              <Text
                style={[
                  s.tipeDesc,
                  tipe === t && { color: "rgba(255,255,255,.7)" },
                ]}>
                {t === "persen" ? "Contoh: 10% off" : "Contoh: Rp 5.000 off"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Nilai */}
        <Text style={s.sectionLabel}>NILAI DISKON</Text>
        <View style={s.card}>
          <View style={s.fieldRow}>
            <Text style={s.prefix}>{tipe === "persen" ? "%" : "Rp"}</Text>
            <TextInput
              style={s.input}
              placeholder={tipe === "persen" ? "10" : "5000"}
              placeholderTextColor={Colors.textDisabled}
              keyboardType="numeric"
              value={nilai}
              onChangeText={(v) => setNilai(v.replace(/\D/g, ""))}
              maxLength={tipe === "persen" ? 3 : 10}
            />
            {tipe === "persen" && nilaiNum > 0 && nilaiNum <= 100 && (
              <View style={s.validBadge}>
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={Colors.success}
                />
              </View>
            )}
          </View>
        </View>

        {/* Min pembelian */}
        <Text style={s.sectionLabel}>MINIMUM PEMBELIAN (OPSIONAL)</Text>
        <View style={s.card}>
          <View style={s.fieldRow}>
            <Text style={s.prefix}>Rp</Text>
            <TextInput
              style={s.input}
              placeholder="0 (tidak ada minimum)"
              placeholderTextColor={Colors.textDisabled}
              keyboardType="numeric"
              value={minBeli}
              onChangeText={(v) => setMinBeli(v.replace(/\D/g, ""))}
            />
          </View>
        </View>

        {/* Status aktif */}
        <Text style={s.sectionLabel}>STATUS</Text>
        <View style={s.card}>
          <View style={[s.fieldRow, { justifyContent: "space-between" }]}>
            <View style={{ gap: 2 }}>
              <Text
                style={{ fontSize: 14, fontWeight: "600", color: Colors.text }}>
                Aktif
              </Text>
              <Text style={{ fontSize: 12, color: Colors.textMuted }}>
                {aktif ? "Diskon langsung berlaku" : "Diskon tidak aktif"}
              </Text>
            </View>
            <Switch
              value={aktif}
              onValueChange={setAktif}
              trackColor={{ false: "#E5E7EB", true: "#BBF7D0" }}
              thumbColor={aktif ? "#16A34A" : "#fff"}
            />
          </View>
        </View>

        {/* Info */}
        <View style={s.infoBox}>
          <Ionicons
            name="information-circle-outline"
            size={15}
            color={Colors.info}
          />
          <Text style={s.infoTxt}>
            Diskon ini bisa diterapkan secara manual saat transaksi di menu
            Kasir.
          </Text>
        </View>

        {/* Tombol simpan */}
        <TouchableOpacity
          style={[s.simpanBtn, (!nama.trim() || !nilai) && { opacity: 0.5 }]}
          onPress={handleSimpan}
          disabled={!nama.trim() || !nilai}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          <Text style={s.simpanTxt}>Simpan Diskon</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  headerSave: { color: Colors.accent, fontSize: 15, fontWeight: "800" },
  scroll: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 120, gap: 8 },

  previewCard: {
    backgroundColor: "#DB2777",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  previewLabel: {
    color: "rgba(255,255,255,.6)",
    fontSize: 12,
    marginBottom: 8,
  },
  previewVal: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: -1,
  },
  previewSub: { color: "rgba(255,255,255,.6)", fontSize: 12, marginTop: 6 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 6,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 10,
  },
  input: { flex: 1, fontSize: 14, color: Colors.text },
  prefix: { fontSize: 14, color: Colors.textMuted, fontWeight: "600" },
  validBadge: { marginLeft: 4 },

  tipeRow: { flexDirection: "row", gap: 10 },
  tipeBtn: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    gap: 6,
  },
  tipeBtnActive: { backgroundColor: "#DB2777", borderColor: "#DB2777" },
  tipeTxt: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textMuted,
    textAlign: "center",
  },
  tipeTxtActive: { color: "#fff" },
  tipeDesc: { fontSize: 11, color: Colors.textLight, textAlign: "center" },

  infoBox: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: Colors.infoLight,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  infoTxt: { flex: 1, fontSize: 12, color: Colors.info, lineHeight: 17 },

  simpanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#DB2777",
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
  },
  simpanTxt: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
