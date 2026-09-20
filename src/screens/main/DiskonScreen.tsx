// src/screens/main/DiskonScreen.tsx
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
  TextInput,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { formatRupiah } from "../../utils/format";
import { getDB } from "../../db/database";
import { getAllProduk } from "../../db/produkRepo";
import { Colors } from "../../constants";

interface Diskon {
  id: number;
  nama: string;
  tipe: "persen" | "nominal";
  nilai: number;
  min_pembelian: number;
  aktif: number;
  produk_ids?: string | null;
}

function initDiskonTable() {
  getDB().execSync(`
    CREATE TABLE IF NOT EXISTS diskon (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      tipe TEXT DEFAULT 'persen',
      nilai INTEGER DEFAULT 0,
      min_pembelian INTEGER DEFAULT 0,
      aktif INTEGER DEFAULT 1,
      berlaku_dari TEXT,
      berlaku_sampai TEXT,
      produk_ids TEXT DEFAULT NULL
    )
  `);
  try {
    getDB().execSync(
      `ALTER TABLE diskon ADD COLUMN produk_ids TEXT DEFAULT NULL`,
    );
  } catch {}
}

function getAllDiskon(): Diskon[] {
  try {
    initDiskonTable();
    return getDB().getAllSync(
      "SELECT * FROM diskon ORDER BY aktif DESC, id DESC",
    ) as Diskon[];
  } catch {
    return [];
  }
}

function toggleDiskon(id: number, aktif: number) {
  getDB().runSync("UPDATE diskon SET aktif=? WHERE id=?", [aktif ? 0 : 1, id]);
}

function hapusDiskon(id: number) {
  getDB().runSync("DELETE FROM diskon WHERE id=?", [id]);
}

function updateProdukIds(id: number, produk_ids: string | null) {
  getDB().runSync("UPDATE diskon SET produk_ids=? WHERE id=?", [
    produk_ids,
    id,
  ]);
}

export default function DiskonScreen({ navigation }: any) {
  const [list, setList] = useState<Diskon[]>([]);
  const [produkList, setProdukList] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [activeDiskon, setActiveDiskon] = useState<Diskon | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");

  const load = () => {
    setList(getAllDiskon());
    setProdukList(getAllProduk("", 0));
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, []),
  );

  const getProdukCount = (d: Diskon): number | null => {
    if (!d.produk_ids) return null;
    try {
      const ids = JSON.parse(d.produk_ids);
      return Array.isArray(ids) ? ids.length : 0;
    } catch {
      return 0;
    }
  };

  const openPilihProduk = (d: Diskon) => {
    setActiveDiskon(d);
    try {
      const ids = d.produk_ids ? JSON.parse(d.produk_ids) : [];
      setSelectedIds(Array.isArray(ids) ? ids : []);
    } catch {
      setSelectedIds([]);
    }
    setSearch("");
    setShowModal(true);
  };

  const toggleProduk = (id: number) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );

  const handleSimpan = () => {
    if (!activeDiskon) return;
    updateProdukIds(
      activeDiskon.id,
      selectedIds.length > 0 ? JSON.stringify(selectedIds) : null,
    );
    setShowModal(false);
    load();
  };

  const handleSemuaProduk = () => {
    if (!activeDiskon) return;
    updateProdukIds(activeDiskon.id, null);
    setShowModal(false);
    load();
  };

  const tipeLabel = (d: Diskon) =>
    d.tipe === "persen" ? `${d.nilai}%` : formatRupiah(d.nilai);
  const tipeColor = (d: Diskon) =>
    d.tipe === "persen"
      ? { bg: "#F5F3FF", color: "#7C3AED" }
      : { bg: "#FDF2F8", color: "#DB2777" };

  const filtered = search.trim()
    ? produkList.filter((p) =>
        p.nama.toLowerCase().includes(search.toLowerCase()),
      )
    : produkList;

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Diskon & Promo</Text>
          <Text style={s.headerSub}>
            {list.filter((d) => d.aktif).length} aktif · {list.length} total
          </Text>
        </View>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => navigation.navigate("TambahDiskon")}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.addBtnTxt}>Tambah</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={list}
        keyExtractor={(i) => i.id.toString()}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <View style={s.emptyCircle}>
              <Ionicons name="pricetag-outline" size={40} color="#D1D5DB" />
            </View>
            <Text style={s.emptyTitle}>Belum ada diskon</Text>
            <Text style={s.emptySub}>
              Buat diskon untuk menarik lebih banyak pelanggan
            </Text>
            <TouchableOpacity
              style={s.emptyBtn}
              onPress={() => navigation.navigate("TambahDiskon")}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={s.emptyBtnTxt}>Buat Diskon Pertama</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const tc = tipeColor(item);
          const count = getProdukCount(item);
          return (
            <View style={[s.card, !item.aktif && s.cardInaktif]}>
              {/* Baris utama */}
              <View style={s.cardRow}>
                <View style={[s.nilaiBox, { backgroundColor: tc.bg }]}>
                  <Text style={[s.nilaiTxt, { color: tc.color }]}>
                    {tipeLabel(item)}
                  </Text>
                  <Text style={[s.nilaiSub, { color: tc.color }]}>
                    {item.tipe === "persen" ? "Persen" : "Nominal"}
                  </Text>
                </View>
                <View style={s.cardInfo}>
                  <Text
                    style={[s.cardNama, !item.aktif && { color: "#9CA3AF" }]}>
                    {item.nama}
                  </Text>
                  {item.min_pembelian > 0 && (
                    <Text style={s.cardMin}>
                      Min. belanja {formatRupiah(item.min_pembelian)}
                    </Text>
                  )}
                  <View
                    style={[
                      s.statusPill,
                      { backgroundColor: item.aktif ? "#F0FDF4" : "#F3F4F6" },
                    ]}>
                    <View
                      style={[
                        s.statusDot,
                        { backgroundColor: item.aktif ? "#22C55E" : "#D1D5DB" },
                      ]}
                    />
                    <Text
                      style={[
                        s.statusTxt,
                        { color: item.aktif ? "#16A34A" : "#9CA3AF" },
                      ]}>
                      {item.aktif ? "Aktif" : "Nonaktif"}
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: "center", gap: 6 }}>
                  <Switch
                    value={!!item.aktif}
                    onValueChange={() => {
                      toggleDiskon(item.id, item.aktif);
                      load();
                    }}
                    trackColor={{ false: "#E5E7EB", true: "#BBF7D0" }}
                    thumbColor={item.aktif ? "#16A34A" : "#fff"}
                  />
                  <TouchableOpacity
                    style={s.hapusBtn}
                    onPress={() =>
                      Alert.alert(item.nama, "Hapus diskon ini?", [
                        { text: "Batal", style: "cancel" },
                        {
                          text: "Hapus",
                          style: "destructive",
                          onPress: () => {
                            hapusDiskon(item.id);
                            load();
                          },
                        },
                      ])
                    }>
                    <Ionicons
                      name="trash-outline"
                      size={14}
                      color={Colors.danger}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Section Produk Promo */}
              <View style={s.produkSection}>
                <Text style={s.produkSectionLabel}>Produk Promo</Text>
                <TouchableOpacity
                  style={s.pilihBtn}
                  onPress={() => openPilihProduk(item)}>
                  <Ionicons name="add" size={14} color="#fff" />
                  <Text style={s.pilihBtnTxt}>
                    {count === null
                      ? "Pilih Produk (0 terpilih)"
                      : `Pilih Produk (${count} terpilih)`}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* ── Modal Pilih Produk ── */}
      <Modal visible={showModal} transparent animationType="slide">
        <SafeAreaView style={{ flex: 1, justifyContent: "flex-end" }}>
          <TouchableOpacity
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: "rgba(0,0,0,0.5)" },
            ]}
            onPress={() => setShowModal(false)}
            activeOpacity={1}
          />
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.sheetTitle}>Pilih Produk</Text>
                <Text style={s.sheetSub}>
                  {activeDiskon?.nama} · {selectedIds.length} dipilih
                </Text>
              </View>
              <TouchableOpacity
                style={s.selectAllBtn}
                onPress={() =>
                  setSelectedIds((prev) =>
                    prev.length === produkList.length
                      ? []
                      : produkList.map((p) => p.id),
                  )
                }>
                <Text style={s.selectAllTxt}>
                  {selectedIds.length === produkList.length
                    ? "Batal Semua"
                    : "Pilih Semua"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={s.searchWrap}>
              <Ionicons
                name="search-outline"
                size={15}
                color={Colors.textMuted}
              />
              <TextInput
                style={s.searchInput}
                placeholder="Cari produk..."
                placeholderTextColor={Colors.textMuted}
                value={search}
                onChangeText={setSearch}
              />
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(p) => p.id.toString()}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
              renderItem={({ item: p }) => {
                const isSelected = selectedIds.includes(p.id);
                return (
                  <TouchableOpacity
                    style={[s.produkItem, isSelected && s.produkItemActive]}
                    onPress={() => toggleProduk(p.id)}
                    activeOpacity={0.75}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.produkNama}>{p.nama}</Text>
                      <Text style={s.produkHarga}>
                        {formatRupiah(p.harga)} · Stok: {p.stok}
                      </Text>
                    </View>
                    <View style={[s.checkbox, isSelected && s.checkboxActive]}>
                      {isSelected && (
                        <Ionicons name="checkmark" size={13} color="#fff" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />

            <View style={s.sheetBtns}>
              <TouchableOpacity style={s.btnSemua} onPress={handleSemuaProduk}>
                <Text style={s.btnSemuaTxt}>Semua Produk</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnSimpan} onPress={handleSimpan}>
                <Text style={s.btnSimpanTxt}>
                  Simpan ({selectedIds.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
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
    paddingBottom: 16,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  headerSub: { color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 2 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#DB2777",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
  },
  addBtnTxt: { color: "#fff", fontSize: 13, fontWeight: "700" },
  content: {
    padding: 12,
    backgroundColor: "#F3F4F6",
    flexGrow: 1,
    paddingBottom: 32,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  cardInaktif: { opacity: 0.65 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  nilaiBox: {
    width: 60,
    height: 60,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  nilaiTxt: { fontSize: 18, fontWeight: "900" },
  nilaiSub: { fontSize: 9, fontWeight: "600" },
  cardInfo: { flex: 1, gap: 4 },
  cardNama: { fontSize: 14, fontWeight: "700", color: "#111827" },
  cardMin: { fontSize: 11, color: "#9CA3AF" },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusTxt: { fontSize: 10, fontWeight: "600" },
  hapusBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.dangerLight,
    alignItems: "center",
    justifyContent: "center",
  },

  produkSection: {
    borderTopWidth: 0.5,
    borderTopColor: "#F3F4F6",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  produkSectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textMuted,
    marginBottom: 8,
  },
  pilihBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#22C55E",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: "stretch",
  },
  pilihBtnTxt: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
    flex: 1,
    textAlign: "center",
  },

  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 10,
  },
  emptyCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#374151" },
  emptySub: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    paddingHorizontal: 32,
    lineHeight: 18,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#DB2777",
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 13,
    marginTop: 8,
  },
  emptyBtnTxt: { color: "#fff", fontSize: 14, fontWeight: "700" },

  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "80%",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 16, fontWeight: "800", color: Colors.text },
  sheetSub: { fontSize: 12, color: Colors.textMuted, marginTop: 3 },
  selectAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
  },
  selectAllTxt: { fontSize: 12, fontWeight: "700", color: Colors.primary },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },

  produkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 13,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  produkItemActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  produkNama: { fontSize: 14, fontWeight: "600", color: Colors.text },
  produkHarga: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },

  sheetBtns: { flexDirection: "row", gap: 10, marginTop: 14 },
  btnSemua: {
    flex: 1,
    padding: 13,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnSemuaTxt: { fontWeight: "700", color: Colors.textMuted, fontSize: 13 },
  btnSimpan: {
    flex: 2,
    padding: 13,
    borderRadius: 12,
    backgroundColor: "#22C55E",
    alignItems: "center",
  },
  btnSimpanTxt: { fontWeight: "800", color: "#fff", fontSize: 13 },
});
