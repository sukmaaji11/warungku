// src/screens/main/PengeluaranScreen.tsx
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Alert,
  ScrollView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants";
import { formatRupiah, todayString } from "../../utils/format";
import { getDB } from "../../db/database";

// ── DB ─────────────────────────────────────────────────────────────────────────
function initTable() {
  getDB().execSync(`
    CREATE TABLE IF NOT EXISTS pengeluaran (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      kategori   TEXT NOT NULL DEFAULT 'Lainnya',
      deskripsi  TEXT NOT NULL,
      jumlah     INTEGER NOT NULL DEFAULT 0,
      tanggal    TEXT NOT NULL DEFAULT (date('now','localtime')),
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);
}

function getAll(dari?: string, sampai?: string): any[] {
  try {
    initTable();
    let where = "";
    if (dari && sampai)
      where = `WHERE tanggal BETWEEN '${dari}' AND '${sampai}'`;
    else if (dari) where = `WHERE tanggal = '${dari}'`;
    return getDB().getAllSync(
      `SELECT * FROM pengeluaran ${where} ORDER BY tanggal DESC, created_at DESC`,
    ) as any[];
  } catch {
    return [];
  }
}

function tambah(
  kategori: string,
  deskripsi: string,
  jumlah: number,
  tanggal: string,
) {
  initTable();
  getDB().runSync(
    `INSERT INTO pengeluaran (kategori, deskripsi, jumlah, tanggal) VALUES (?,?,?,?)`,
    [kategori, deskripsi.trim(), jumlah, tanggal],
  );
}

function edit(
  id: number,
  kategori: string,
  deskripsi: string,
  jumlah: number,
  tanggal: string,
) {
  getDB().runSync(
    `UPDATE pengeluaran SET kategori=?, deskripsi=?, jumlah=?, tanggal=? WHERE id=?`,
    [kategori, deskripsi.trim(), jumlah, tanggal, id],
  );
}

function hapus(id: number) {
  getDB().runSync(`DELETE FROM pengeluaran WHERE id=?`, [id]);
}

// Untuk integrasi laba rugi
export function getTotalPengeluaranByRange(
  dari: string,
  sampai: string,
): number {
  try {
    initTable();
    const r = getDB().getFirstSync(
      `SELECT COALESCE(SUM(jumlah),0) as total FROM pengeluaran WHERE tanggal BETWEEN ? AND ?`,
      [dari, sampai],
    ) as any;
    return r?.total || 0;
  } catch {
    return 0;
  }
}

export function getPengeluaranByKategori(dari: string, sampai: string): any[] {
  try {
    initTable();
    return getDB().getAllSync(
      `SELECT kategori, SUM(jumlah) as total, COUNT(*) as jumlah_item
       FROM pengeluaran WHERE tanggal BETWEEN ? AND ?
       GROUP BY kategori ORDER BY total DESC`,
      [dari, sampai],
    ) as any[];
  } catch {
    return [];
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────
type FilterType = "hari" | "minggu" | "bulan" | "custom";

function getRange(
  filter: FilterType,
  customDari: string,
  customSampai: string,
) {
  const today = todayString();
  const d = new Date();
  if (filter === "hari") return { dari: today, sampai: today };
  if (filter === "minggu") {
    d.setDate(d.getDate() - 6);
    const dari = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { dari, sampai: today };
  }
  if (filter === "bulan") {
    return {
      dari: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`,
      sampai: today,
    };
  }
  return { dari: customDari || today, sampai: customSampai || today };
}

const KATEGORI_LIST = [
  { label: "Belanja", icon: "cart-outline", color: "#2563EB", bg: "#EFF6FF" },
  { label: "Gaji", icon: "people-outline", color: "#16A34A", bg: "#F0FDF4" },
  { label: "Sewa", icon: "home-outline", color: "#7C3AED", bg: "#F5F3FF" },
  {
    label: "Listrik/Air",
    icon: "flash-outline",
    color: "#D97706",
    bg: "#FFFBEB",
  },
  { label: "Transport", icon: "car-outline", color: "#059669", bg: "#ECFDF5" },
  {
    label: "Lainnya",
    icon: "ellipsis-horizontal-outline",
    color: "#6B7280",
    bg: "#F3F4F6",
  },
];

function getKatStyle(kat: string) {
  return (
    KATEGORI_LIST.find((k) => k.label === kat) ||
    KATEGORI_LIST[KATEGORI_LIST.length - 1]
  );
}

export default function PengeluaranScreen({ navigation }: any) {
  const [list, setList] = useState<any[]>([]);
  const [filter, setFilter] = useState<FilterType>("hari");
  const [customDari, setCustomDari] = useState("");
  const [customSampai, setCustomSampai] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  // Form fields
  const [kategori, setKategori] = useState("Lainnya");
  const [deskripsi, setDeskripsi] = useState("");
  const [jumlah, setJumlah] = useState("");
  const [tanggal, setTanggal] = useState(todayString());

  const load = useCallback(() => {
    const { dari, sampai } = getRange(filter, customDari, customSampai);
    setList(getAll(dari, sampai));
  }, [filter, customDari, customSampai]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const { dari, sampai } = getRange(filter, customDari, customSampai);
  const total = list.reduce((s, p) => s + p.jumlah, 0);

  // Per kategori
  const perKategori = KATEGORI_LIST.map((k) => ({
    ...k,
    total: list
      .filter((p) => p.kategori === k.label)
      .reduce((s, p) => s + p.jumlah, 0),
  })).filter((k) => k.total > 0);

  const openTambah = () => {
    setEditItem(null);
    setKategori("Lainnya");
    setDeskripsi("");
    setJumlah("");
    setTanggal(todayString());
    setShowForm(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setKategori(item.kategori);
    setDeskripsi(item.deskripsi);
    setJumlah(item.jumlah.toString());
    setTanggal(item.tanggal);
    setShowForm(true);
  };

  const resetForm = () => {
    setEditItem(null);
    setShowForm(false);
  };

  const handleSimpan = () => {
    if (!deskripsi.trim()) {
      Alert.alert("Error", "Deskripsi wajib diisi");
      return;
    }
    const j = parseInt(jumlah.replace(/\D/g, ""));
    if (!j || j <= 0) {
      Alert.alert("Error", "Jumlah harus lebih dari 0");
      return;
    }
    if (editItem) edit(editItem.id, kategori, deskripsi, j, tanggal);
    else tambah(kategori, deskripsi, j, tanggal);
    load();
    resetForm();
  };

  const FILTER_OPTS: { key: FilterType; label: string }[] = [
    { key: "hari", label: "Hari Ini" },
    { key: "minggu", label: "Minggu Ini" },
    { key: "bulan", label: "Bulan Ini" },
    { key: "custom", label: "Custom" },
  ];

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Pengeluaran</Text>
          <Text style={s.headerSub}>Catat biaya operasional toko</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={openTambah}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.addBtnTxt}>Tambah</Text>
        </TouchableOpacity>
      </View>

      {/* Filter periode */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, backgroundColor: Colors.primary }}
        contentContainerStyle={{
          paddingHorizontal: 14,
          paddingBottom: 10,
          gap: 8,
          alignItems: "center",
        }}>
        {FILTER_OPTS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterChip, filter === f.key && s.filterChipActive]}
            onPress={() => {
              setFilter(f.key);
              if (f.key === "custom") setShowCustom(true);
            }}>
            <Text style={[s.filterTxt, filter === f.key && s.filterTxtActive]}>
              {f.key === "custom" && customDari
                ? `${customDari.slice(5)} → ${customSampai.slice(5)}`
                : f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={list}
        keyExtractor={(i) => i.id.toString()}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Summary card */}
            <View style={s.summaryCard}>
              <Text style={s.summaryLabel}>Total Pengeluaran</Text>
              <Text style={s.summaryVal}>{formatRupiah(total)}</Text>
              <Text style={s.summaryPeriode}>
                {dari} s/d {sampai}
              </Text>

              {/* Per kategori mini */}
              {perKategori.length > 0 && (
                <View style={s.katGrid}>
                  {perKategori.map((k) => (
                    <View key={k.label} style={s.katGridItem}>
                      <Text style={s.katGridLabel}>{k.label}</Text>
                      <Text style={s.katGridVal}>{formatRupiah(k.total)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {list.length > 0 && (
              <Text style={s.sectionLabel}>DAFTAR PENGELUARAN</Text>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="wallet-outline" size={44} color="#D1D5DB" />
            <Text style={s.emptyTxt}>Belum ada pengeluaran</Text>
            <Text style={s.emptySub}>Tap Tambah untuk mencatat biaya</Text>
          </View>
        }
        renderItem={({ item }) => {
          const ks = getKatStyle(item.kategori);
          return (
            <View style={s.card}>
              <View style={[s.katIcon, { backgroundColor: ks.bg }]}>
                <Ionicons name={ks.icon as any} size={20} color={ks.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardDesk}>{item.deskripsi}</Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 3,
                  }}>
                  <View style={[s.katBadge, { backgroundColor: ks.bg }]}>
                    <Text style={[s.katBadgeTxt, { color: ks.color }]}>
                      {item.kategori}
                    </Text>
                  </View>
                  <Text style={s.cardTgl}>{item.tanggal}</Text>
                </View>
              </View>
              <View style={{ alignItems: "flex-end", gap: 6 }}>
                <Text style={s.cardJumlah}>{formatRupiah(item.jumlah)}</Text>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  <TouchableOpacity
                    style={s.editBtn}
                    onPress={() => openEdit(item)}>
                    <Ionicons
                      name="pencil-outline"
                      size={13}
                      color={Colors.primary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.hapusBtn}
                    onPress={() =>
                      Alert.alert("Hapus", `Hapus "${item.deskripsi}"?`, [
                        { text: "Batal", style: "cancel" },
                        {
                          text: "Hapus",
                          style: "destructive",
                          onPress: () => {
                            hapus(item.id);
                            load();
                          },
                        },
                      ])
                    }>
                    <Ionicons
                      name="trash-outline"
                      size={13}
                      color={Colors.danger}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* Modal Form Tambah/Edit */}
      <Modal visible={showForm} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <TouchableOpacity
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: "rgba(0,0,0,0.5)" },
            ]}
            onPress={resetForm}
            activeOpacity={1}
          />
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>
              {editItem ? "Edit Pengeluaran" : "Tambah Pengeluaran"}
            </Text>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              {/* Pilih kategori */}
              <Text style={s.fieldLabel}>KATEGORI</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 4 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {KATEGORI_LIST.map((k) => (
                    <TouchableOpacity
                      key={k.label}
                      style={[
                        s.katChip,
                        kategori === k.label && {
                          borderColor: k.color,
                          backgroundColor: k.bg,
                        },
                      ]}
                      onPress={() => setKategori(k.label)}>
                      <Ionicons
                        name={k.icon as any}
                        size={15}
                        color={
                          kategori === k.label ? k.color : Colors.textMuted
                        }
                      />
                      <Text
                        style={[
                          s.katChipTxt,
                          kategori === k.label && {
                            color: k.color,
                            fontWeight: "700",
                          },
                        ]}>
                        {k.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={s.fieldLabel}>DESKRIPSI</Text>
              <View style={s.inputWrap}>
                <TextInput
                  style={s.input}
                  placeholder="Contoh: Beli plastik kresek"
                  placeholderTextColor={Colors.textDisabled}
                  value={deskripsi}
                  onChangeText={setDeskripsi}
                  maxLength={80}
                />
              </View>

              <Text style={s.fieldLabel}>JUMLAH</Text>
              <View style={s.inputWrap}>
                <Text style={s.prefix}>Rp</Text>
                <TextInput
                  style={s.input}
                  placeholder="0"
                  placeholderTextColor={Colors.textDisabled}
                  keyboardType="numeric"
                  value={jumlah}
                  onChangeText={(v) => setJumlah(v.replace(/\D/g, ""))}
                />
              </View>

              <Text style={s.fieldLabel}>TANGGAL (YYYY-MM-DD)</Text>
              <View style={s.inputWrap}>
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={Colors.textMuted}
                />
                <TextInput
                  style={s.input}
                  placeholder="2026-04-22"
                  placeholderTextColor={Colors.textDisabled}
                  value={tanggal}
                  onChangeText={setTanggal}
                  maxLength={10}
                />
              </View>

              <View style={s.sheetBtns}>
                <TouchableOpacity style={s.btnBatal} onPress={resetForm}>
                  <Text style={s.btnBatalTxt}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    s.btnSimpan,
                    (!deskripsi.trim() || !jumlah) && { opacity: 0.5 },
                  ]}
                  disabled={!deskripsi.trim() || !jumlah}
                  onPress={handleSimpan}>
                  <Text style={s.btnSimpanTxt}>
                    {editItem ? "Update" : "Simpan"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Custom Range */}
      <Modal visible={showCustom} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            padding: 20,
          }}>
          <View
            style={{ backgroundColor: "#fff", borderRadius: 20, padding: 20 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "800",
                color: Colors.text,
                marginBottom: 16,
              }}>
              Pilih Rentang Tanggal
            </Text>
            {[
              {
                label: "Dari (YYYY-MM-DD)",
                val: customDari,
                set: setCustomDari,
                ph: "2026-04-01",
              },
              {
                label: "Sampai (YYYY-MM-DD)",
                val: customSampai,
                set: setCustomSampai,
                ph: "2026-04-30",
              },
            ].map((f, i) => (
              <View key={i} style={{ marginBottom: 12 }}>
                <Text
                  style={{
                    fontSize: 12,
                    color: Colors.textMuted,
                    marginBottom: 6,
                  }}>
                  {f.label}
                </Text>
                <View style={s.inputWrap}>
                  <TextInput
                    style={s.input}
                    placeholder={f.ph}
                    placeholderTextColor={Colors.textDisabled}
                    value={f.val}
                    onChangeText={f.set}
                    maxLength={10}
                  />
                </View>
              </View>
            ))}
            <TouchableOpacity
              style={[s.btnSimpan, { flex: 0, paddingHorizontal: 0 }]}
              onPress={() => {
                setShowCustom(false);
                load();
              }}>
              <Text style={s.btnSimpanTxt}>Terapkan</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    paddingBottom: 10,
  },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,.55)", fontSize: 12, marginTop: 2 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,.15)",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
  },
  addBtnTxt: { color: "#fff", fontSize: 13, fontWeight: "700" },

  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,.12)",
  },
  filterChipActive: { backgroundColor: "#fff" },
  filterTxt: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,.65)",
  },
  filterTxtActive: { color: Colors.primary },

  listContent: {
    padding: 14,
    gap: 10,
    backgroundColor: Colors.background,
    flexGrow: 1,
  },

  summaryCard: {
    backgroundColor: Colors.primaryDark,
    borderRadius: 18,
    padding: 18,
    marginBottom: 4,
  },
  summaryLabel: {
    color: "rgba(255,255,255,.5)",
    fontSize: 12,
    marginBottom: 6,
  },
  summaryVal: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -1,
  },
  summaryPeriode: {
    color: "rgba(255,255,255,.4)",
    fontSize: 11,
    marginTop: 4,
    marginBottom: 12,
  },

  katGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  katGridItem: {
    backgroundColor: "rgba(255,255,255,.08)",
    borderRadius: 10,
    padding: 10,
    minWidth: "45%",
    flex: 1,
  },
  katGridLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,.5)",
    marginBottom: 4,
  },
  katGridVal: { fontSize: 13, fontWeight: "700", color: "#fff" },

  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginTop: 4,
    marginBottom: 4,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  katIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardDesk: { fontSize: 14, fontWeight: "700", color: Colors.text },
  katBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  katBadgeTxt: { fontSize: 10, fontWeight: "700" },
  cardTgl: { fontSize: 11, color: Colors.textMuted },
  cardJumlah: { fontSize: 14, fontWeight: "800", color: Colors.danger },
  editBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  hapusBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.dangerLight,
    alignItems: "center",
    justifyContent: "center",
  },

  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTxt: { fontSize: 15, fontWeight: "700", color: Colors.textMuted },
  emptySub: { fontSize: 13, color: Colors.textLight },

  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textMuted,
    marginBottom: 6,
    marginTop: 12,
    letterSpacing: 0.5,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
  },
  input: { flex: 1, paddingVertical: 13, fontSize: 14, color: Colors.text },
  prefix: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: "600",
    marginRight: 4,
  },
  katChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: "#fff",
  },
  katChipTxt: { fontSize: 12, fontWeight: "500", color: Colors.textMuted },
  sheetBtns: { flexDirection: "row", gap: 10, marginTop: 20, marginBottom: 8 },
  btnBatal: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: "center",
  },
  btnBatalTxt: { fontWeight: "700", color: Colors.textMuted },
  btnSimpan: {
    flex: 2,
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.danger,
    alignItems: "center",
  },
  btnSimpanTxt: { fontWeight: "800", color: "#fff" },
});
