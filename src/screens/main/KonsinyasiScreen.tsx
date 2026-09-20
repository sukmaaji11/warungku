// src/screens/main/KonsinyasiScreen.tsx
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ScrollView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants";
import { formatRupiah } from "../../utils/format";
import {
  getAllKonsinyor,
  hapusKonsinyor,
  getAllKonsinyasi,
  hapusKonsinyasi,
  getLaporanKonsinyasi,
  getLaporanPerKonsinyor,
  initKonsinyasiTables,
} from "../../db/konsinyasiRepo";

export default function KonsinyasiScreen({ navigation }: any) {
  const [ringkasan, setRingkasan] = useState<any>({});
  const [konsinyor, setKonsinyor] = useState<any[]>([]);

  const load = () => {
    initKonsinyasiTables();
    setRingkasan(getLaporanKonsinyasi());
    setKonsinyor(getAllKonsinyor());
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, []),
  );

  const MENU = [
    {
      key: "KonsiniyorList",
      label: "Konsinyor",
      sub: "Kelola data konsinyor/supplier",
      icon: "people-outline",
      color: "#2563EB",
      bg: "#EFF6FF",
    },
    {
      key: "LaporanKonsinyasi",
      label: "Laporan Konsinyasi",
      sub: "Analisis performa konsinyasi",
      icon: "bar-chart-outline",
      color: "#7C3AED",
      bg: "#F5F3FF",
    },
    {
      key: "TransaksiKonsinyasi",
      label: "Transaksi Konsinyasi",
      sub: "Riwayat transaksi konsinyasi",
      icon: "receipt-outline",
      color: "#059669",
      bg: "#ECFDF5",
    },
  ];

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Konsinyasi</Text>
          <Text style={s.headerSub}>Manajemen barang konsinyasi</Text>
        </View>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => navigation.navigate("TambahKonsinyasi")}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.addBtnTxt}>Tambah</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}>
        {/* Summary cards */}
        <View style={s.summaryGrid}>
          {[
            {
              label: "Nilai Titipan",
              val: formatRupiah(ringkasan.total_nilai_titipan || 0),
              color: "#fff",
            },
            {
              label: "Sudah Terjual",
              val: formatRupiah(ringkasan.total_bagi_hasil || 0),
              color: "#86EFAC",
            },
            {
              label: "Keuntungan",
              val: formatRupiah(ringkasan.total_keuntungan || 0),
              color: "#60A5FA",
            },
            {
              label: "Aktif",
              val: `${ringkasan.total_item || 0} item`,
              color: "#FCD34D",
            },
          ].map((st, i) => (
            <View key={i} style={s.summaryCard}>
              <Text style={s.summaryLabel}>{st.label}</Text>
              <Text style={[s.summaryVal, { color: st.color }]}>{st.val}</Text>
            </View>
          ))}
        </View>

        {/* Menu navigasi - seperti referensi */}
        <View style={s.menuCard}>
          {MENU.map((item, i) => (
            <TouchableOpacity
              key={item.key}
              style={[s.menuRow, i < MENU.length - 1 && s.menuBorder]}
              onPress={() => navigation.navigate(item.key)}
              activeOpacity={0.7}>
              <View style={[s.menuIcon, { backgroundColor: item.bg }]}>
                <Ionicons
                  name={item.icon as any}
                  size={20}
                  color={item.color}
                />
              </View>
              <View style={s.menuInfo}>
                <Text style={s.menuLabel}>{item.label}</Text>
                <Text style={s.menuSub}>{item.sub}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={Colors.textDisabled}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Top konsinyor */}
        {konsinyor.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Konsinyor Aktif</Text>
            {konsinyor.slice(0, 3).map((k) => (
              <View key={k.id} style={s.konsiniyorCard}>
                <View style={s.konsiniyorAvatar}>
                  <Text style={s.konsiniyorInitial}>
                    {k.nama.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.konsiniyorNama}>{k.nama}</Text>
                  <Text style={s.konsiniyorSub}>
                    {k.jumlah_produk || 0} produk ·{" "}
                    {formatRupiah(k.total_titipan || 0)}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={s.konsiniyorTerjual}>
                    {formatRupiah(k.total_terjual || 0)}
                  </Text>
                  <Text style={{ fontSize: 10, color: Colors.textMuted }}>
                    terjual
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,.55)", fontSize: 12 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#059669",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
  },
  addBtnTxt: { color: "#fff", fontSize: 13, fontWeight: "700" },
  scroll: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 14, gap: 12 },

  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  summaryCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: Colors.primaryDark,
    borderRadius: 14,
    padding: 14,
  },
  summaryLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,.5)",
    marginBottom: 6,
  },
  summaryVal: { fontSize: 15, fontWeight: "800" },

  menuCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuBorder: { borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuInfo: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: "700", color: Colors.text },
  menuSub: { fontSize: 12, color: Colors.textLight, marginTop: 2 },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textMuted,
    marginTop: 4,
  },

  konsiniyorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  konsiniyorAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  konsiniyorInitial: { color: "#fff", fontSize: 16, fontWeight: "800" },
  konsiniyorNama: { fontSize: 14, fontWeight: "700", color: Colors.text },
  konsiniyorSub: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  konsiniyorTerjual: { fontSize: 13, fontWeight: "800", color: Colors.success },
});
