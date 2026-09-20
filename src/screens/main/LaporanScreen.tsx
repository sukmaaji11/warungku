// src/screens/main/LaporanScreen.tsx
import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Share,
  Modal,
  FlatList,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import {
  formatRupiah,
  formatTanggal,
  todayString,
  toLocalDateString,
} from "../../utils/format";
import {
  getRingkasan,
  getTerlaris,
  getTrxHarian,
  getOmset7Hari,
  getRingkasanByRange,
  getTrxByDateRange,
  getTrxDetail,
  hapusTransaksi,
  migrateHargaModalTransaksiItem,
  getProfitByMetode, // ← BARU
} from "../../db/transaksiRepo";
import {
  getProdukMenipis,
  getPengaturan,
  updateStokProduk,
} from "../../db/produkRepo";
import { getDB } from "../../db/database";
import { useAuthStore } from "../../store/authStore";
import { getTotalPengeluaranByRange } from "./PengeluaranScreen";
import DateTimePicker from "@react-native-community/datetimepicker";

const NAVY = Colors.primary;

function getMetodeColor(metode: string) {
  switch (metode) {
    case "tunai":
      return { color: Colors.success, bg: "#F0FDF4" };
    case "qris":
      return { color: Colors.info, bg: "#EFF6FF" };
    case "hutang":
      return { color: Colors.danger, bg: "#FEF2F2" };
    case "transfer":
      return { color: "#7C3AED", bg: "#F5F3FF" };
    default:
      return { color: Colors.textMuted, bg: Colors.background };
  }
}

// ── Detail item transaksi ─────────────────────────────────────────────────────
function DetailTrxItems({ trxId }: { trxId: number }) {
  const [items, setItems] = useState<any[]>([]);
  React.useEffect(() => {
    setItems(getTrxDetail(trxId));
  }, [trxId]);
  const profit = items.reduce(
    (s, i) => s + i.qty * (i.harga - (i.harga_modal || 0)),
    0,
  );
  if (items.length === 0)
    return (
      <View style={{ alignItems: "center", padding: 20 }}>
        <Text style={{ color: Colors.textLight, fontSize: 12 }}>
          Memuat detail...
        </Text>
      </View>
    );
  return (
    <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
      {items.map((item: any, i: number) => {
        const itemProfit = item.qty * (item.harga - (item.harga_modal || 0));
        return (
          <View key={i} style={dt.row}>
            <View style={{ flex: 1 }}>
              <Text style={dt.nama}>{item.nama_produk}</Text>
              <Text style={dt.sub}>
                {item.qty}× {formatRupiah(item.harga)}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={dt.subtotal}>{formatRupiah(item.subtotal)}</Text>
              {item.harga_modal > 0 && (
                <Text style={dt.profit}>+{formatRupiah(itemProfit)}</Text>
              )}
            </View>
          </View>
        );
      })}
      <View style={dt.profitTotal}>
        <Ionicons name="trending-up-outline" size={13} color={Colors.success} />
        <Text style={dt.profitTotalLbl}>Estimasi Profit</Text>
        <Text style={dt.profitTotalVal}>{formatRupiah(profit)}</Text>
      </View>
    </ScrollView>
  );
}

const dt = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingVertical: 9,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  nama: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 2,
  },
  sub: { fontSize: 11, color: Colors.textLight },
  subtotal: { fontSize: 13, fontWeight: "700", color: Colors.text },
  profit: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.success,
    marginTop: 2,
  },
  profitTotal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.successLight,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  profitTotalLbl: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.success,
    flex: 1,
  },
  profitTotalVal: { fontSize: 13, fontWeight: "800", color: Colors.success },
});

// ── RekapModal ────────────────────────────────────────────────────────────────
function RekapModal({ visible, onClose }: any) {
  const [list, setList] = useState<any[]>([]);
  useFocusEffect(
    useCallback(() => {
      if (visible) setList(getTrxHarian(todayString()));
    }, [visible]),
  );
  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={m.safe} edges={["top"]}>
        <View style={m.header}>
          <TouchableOpacity onPress={onClose} style={m.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={m.headerTitle}>Rekap Hari Ini</Text>
          <View style={{ width: 36 }} />
        </View>
        <FlatList
          data={list}
          keyExtractor={(i) => i.id?.toString() || Math.random().toString()}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={m.empty}>
              <Ionicons name="receipt-outline" size={40} color="#D1D5DB" />
              <Text style={m.emptyTxt}>Belum ada transaksi hari ini</Text>
            </View>
          }
          renderItem={({ item }) => {
            const { color, bg } = getMetodeColor(item.metode_bayar);
            return (
              <View style={m.trxCard}>
                <View style={m.trxHeader}>
                  <View>
                    <Text style={m.trxNo}>{item.no_trx}</Text>
                    <Text style={m.trxTime}>
                      {item.waktu?.slice(11, 16) || "-"}
                    </Text>
                  </View>
                  <View style={[m.metodePill, { backgroundColor: bg }]}>
                    <Text style={[m.metodeTxt, { color }]}>
                      {item.metode_bayar?.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={m.trxFooter}>
                  <Text style={m.trxItems}>{item.qty || 0} item</Text>
                  {item.diskon > 0 && (
                    <Text style={m.trxDiskon}>
                      Diskon -{formatRupiah(item.diskon)}
                    </Text>
                  )}
                  <Text style={m.trxTotal}>{formatRupiah(item.total)}</Text>
                </View>
              </View>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

// ── TerlarisModal ─────────────────────────────────────────────────────────────
function TerlarisModal({ visible, onClose }: any) {
  const [periode, setPeriode] = useState<"hari" | "bulan" | "tahun">("hari");
  const [list, setList] = useState<any[]>([]);
  useFocusEffect(
    useCallback(() => {
      if (visible) setList(getTerlaris(20, periode));
    }, [visible, periode]),
  );
  const maxQty = list[0]?.qty || 1;
  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={m.safe} edges={["top"]}>
        <View style={m.header}>
          <TouchableOpacity onPress={onClose} style={m.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={m.headerTitle}>Produk Terlaris</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={m.periodeRow}>
          {(["hari", "bulan", "tahun"] as const).map((p) => (
            <TouchableOpacity
              key={p}
              style={[m.periodeChip, periode === p && m.periodeActive]}
              onPress={() => setPeriode(p)}>
              <Text style={[m.periodeTxt, periode === p && m.periodeTxtActive]}>
                {p.charAt(0).toUpperCase() + p.slice(1)} ini
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <FlatList
          data={list}
          keyExtractor={(_, i) => i.toString()}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={m.empty}>
              <Ionicons name="bar-chart-outline" size={40} color="#D1D5DB" />
              <Text style={m.emptyTxt}>Belum ada data penjualan</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const pct = Math.round((item.qty / maxQty) * 100);
            const medals = ["🥇", "🥈", "🥉"];
            return (
              <View style={m.terlarisCard}>
                <View style={m.terlarisLeft}>
                  <Text style={m.terlarisRank}>
                    {medals[index] || `#${index + 1}`}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={m.terlarisNama}>{item.nama_produk}</Text>
                    <View style={m.barWrap}>
                      <View style={[m.barFill, { width: `${pct}%` }]} />
                    </View>
                    <Text style={m.terlarisQty}>{item.qty} terjual</Text>
                  </View>
                </View>
                <Text style={m.terlarisOmset}>{formatRupiah(item.omset)}</Text>
              </View>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

// ── StokModal ─────────────────────────────────────────────────────────────────
function StokModal({ visible, onClose }: any) {
  const [produkList, setProdukList] = useState<any[]>([]);
  const [filterStok, setFilterStok] = useState<"menipis" | "semua">("menipis");
  const [editStok, setEditStok] = useState<any>(null);
  const [tambahVal, setTambahVal] = useState("");
  const [search, setSearch] = useState("");

  const reload = useCallback(() => {
    if (!visible) return;
    if (filterStok === "menipis") {
      setProdukList(getProdukMenipis());
    } else {
      try {
        const all = getDB().getAllSync(
          `SELECT p.*, k.nama as kategori_nama FROM produk p LEFT JOIN kategori k ON k.id = p.kategori_id WHERE p.aktif=1 ORDER BY p.nama ASC`,
        ) as any[];
        setProdukList(all);
      } catch {
        setProdukList([]);
      }
    }
  }, [visible, filterStok]);
  useFocusEffect(reload);

  const filtered = search.trim()
    ? produkList.filter((p) =>
        p.nama.toLowerCase().includes(search.toLowerCase()),
      )
    : produkList;

  const handleTambahStok = () => {
    const jumlah = parseInt(tambahVal) || 0;
    if (jumlah <= 0) {
      Alert.alert("Error", "Jumlah harus lebih dari 0");
      return;
    }
    updateStokProduk(editStok.id, editStok.stok + jumlah);
    setEditStok(null);
    setTambahVal("");
    reload();
  };

  return (
    <>
      <Modal visible={visible} animationType="slide">
        <SafeAreaView style={m.safe} edges={["top"]}>
          <View style={m.header}>
            <TouchableOpacity onPress={onClose} style={m.backBtn}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={m.headerTitle}>
              {filterStok === "menipis" ? "Stok Menipis" : "Semua Produk"}
            </Text>
            <View style={{ width: 36 }} />
          </View>
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              paddingHorizontal: 16,
              paddingBottom: 10,
              backgroundColor: Colors.primary,
            }}>
            {(["menipis", "semua"] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={{
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor:
                    filterStok === f ? "#fff" : "rgba(255,255,255,0.12)",
                }}
                onPress={() => {
                  setFilterStok(f);
                  setSearch("");
                }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color:
                      filterStok === f
                        ? Colors.primary
                        : "rgba(255,255,255,0.65)",
                  }}>
                  {f === "menipis" ? "⚠️ Stok Menipis" : "📦 Semua Produk"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {filterStok === "semua" && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: "#fff",
                marginHorizontal: 14,
                marginBottom: 8,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderWidth: 0.5,
                borderColor: Colors.border,
              }}>
              <Ionicons
                name="search-outline"
                size={16}
                color={Colors.textMuted}
              />
              <TextInput
                style={{ flex: 1, fontSize: 14, color: Colors.text }}
                placeholder="Cari produk..."
                placeholderTextColor={Colors.textMuted}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Ionicons
                    name="close-circle"
                    size={16}
                    color={Colors.textMuted}
                  />
                </TouchableOpacity>
              )}
            </View>
          )}
          <FlatList
            data={filtered}
            keyExtractor={(i) => i.id?.toString()}
            contentContainerStyle={{ padding: 14, gap: 10, flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={m.empty}>
                {filterStok === "menipis" ? (
                  <>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={48}
                      color={Colors.success}
                    />
                    <Text style={[m.emptyTxt, { color: Colors.success }]}>
                      Semua stok aman!
                    </Text>
                    <Text style={m.emptySub}>
                      Tidak ada produk yang perlu diisi
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="cube-outline" size={48} color="#D1D5DB" />
                    <Text style={m.emptyTxt}>Belum ada produk</Text>
                  </>
                )}
              </View>
            }
            renderItem={({ item }) => {
              const habis = item.stok === 0;
              const menipis =
                item.stok > 0 && item.stok <= (item.stok_minimum || 5);
              const aman = !habis && !menipis;
              return (
                <View
                  style={[
                    m.stokCard,
                    habis && m.stokCardHabis,
                    aman && {
                      borderColor: Colors.border,
                      backgroundColor: "#fff",
                    },
                  ]}>
                  <View
                    style={[
                      m.stokIcon,
                      {
                        backgroundColor: habis
                          ? Colors.dangerLight
                          : menipis
                            ? Colors.warningLight
                            : Colors.successLight,
                      },
                    ]}>
                    <Ionicons
                      name={
                        habis
                          ? "close-circle-outline"
                          : menipis
                            ? "alert-circle-outline"
                            : "checkmark-circle-outline"
                      }
                      size={22}
                      color={
                        habis
                          ? Colors.danger
                          : menipis
                            ? Colors.warning
                            : Colors.success
                      }
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={m.stokNama}>{item.nama}</Text>
                    <Text style={m.stokKat}>
                      {item.kategori_nama || "Tanpa kategori"}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 6 }}>
                    <Text
                      style={[
                        m.stokSisa,
                        {
                          color: habis
                            ? Colors.danger
                            : menipis
                              ? Colors.warning
                              : Colors.success,
                        },
                      ]}>
                      {habis ? "HABIS" : `Sisa ${item.stok}`}
                    </Text>
                    <Text style={m.stokMin}>Min. {item.stok_minimum || 5}</Text>
                    <TouchableOpacity
                      style={sk.addBtn}
                      onPress={() => {
                        setEditStok(item);
                        setTambahVal("");
                      }}>
                      <Ionicons name="add" size={12} color={Colors.success} />
                      <Text style={sk.addBtnTxt}>Tambah</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
      <Modal visible={!!editStok} transparent animationType="slide">
        <View style={sk.overlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            onPress={() => setEditStok(null)}
            activeOpacity={1}
          />
          <View style={sk.sheet}>
            <View style={sk.sheetHandle} />
            <Text style={sk.sheetTitle}>Tambah Stok</Text>
            <Text style={sk.sheetSub}>
              {editStok?.nama} · Stok sekarang:{" "}
              <Text style={{ fontWeight: "800", color: Colors.text }}>
                {editStok?.stok}
              </Text>
            </Text>
            {tambahVal !== "" && (
              <View style={sk.previewBox}>
                <Text style={sk.previewLbl}>Stok setelah ditambah</Text>
                <Text style={sk.previewVal}>
                  {editStok?.stok} + {tambahVal} ={" "}
                  <Text style={{ color: Colors.success }}>
                    {editStok?.stok + (parseInt(tambahVal) || 0)}
                  </Text>
                </Text>
              </View>
            )}
            <TextInput
              style={sk.input}
              placeholder="Jumlah yang ditambahkan"
              placeholderTextColor={Colors.textDisabled}
              value={tambahVal}
              onChangeText={setTambahVal}
              keyboardType="numeric"
              autoFocus
            />
            <View style={sk.quickRow}>
              {[5, 10, 20, 50, 100].map((v) => (
                <TouchableOpacity
                  key={v}
                  style={sk.quickChip}
                  onPress={() => setTambahVal(v.toString())}>
                  <Text style={sk.quickTxt}>+{v}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={sk.btnRow}>
              <TouchableOpacity
                style={sk.btnBatal}
                onPress={() => setEditStok(null)}>
                <Text style={sk.btnBatalTxt}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  sk.btnSimpan,
                  (!tambahVal || parseInt(tambahVal) <= 0) && { opacity: 0.5 },
                ]}
                onPress={handleTambahStok}
                disabled={!tambahVal || parseInt(tambahVal) <= 0}>
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={sk.btnSimpanTxt}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const sk = StyleSheet.create({
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.successLight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 0.5,
    borderColor: Colors.successBorder,
  },
  addBtnTxt: { fontSize: 10, fontWeight: "700", color: Colors.success },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 4,
  },
  sheetSub: { fontSize: 13, color: Colors.textMuted, marginBottom: 16 },
  previewBox: {
    backgroundColor: Colors.successLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  previewLbl: {
    fontSize: 10,
    color: Colors.success,
    fontWeight: "600",
    marginBottom: 2,
  },
  previewVal: { fontSize: 16, fontWeight: "700", color: Colors.text },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 16,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    color: Colors.text,
    marginBottom: 12,
  },
  quickRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickTxt: { fontSize: 12, fontWeight: "700", color: Colors.primary },
  btnRow: { flexDirection: "row", gap: 10, marginBottom: 40 },
  btnBatal: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: "center",
  },
  btnBatalTxt: { fontWeight: "700", color: Colors.textMuted, fontSize: 14 },
  btnSimpan: {
    flex: 2,
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.success,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  btnSimpanTxt: { fontWeight: "800", color: "#fff", fontSize: 14 },
});

// ── PenjualanModal ────────────────────────────────────────────────────────────
function PenjualanModal({
  visible,
  onClose,
  onShowStruk,
}: {
  visible: boolean;
  onClose: () => void;
  onShowStruk: (data: any) => void;
}) {
  type TabType = "statistik" | "rekap";
  type MetodeType = "semua" | "tunai" | "transfer" | "qris" | "hutang";
  type RangeType = "hari_ini" | "kemarin" | "7_hari" | "30_hari" | "custom";

  const [tab, setTab] = useState<TabType>("statistik");
  const [metodeFilter, setMetode] = useState<MetodeType>("semua");
  const [omset7, setOmset7] = useState<any[]>([]);
  const [trxList, setTrxList] = useState<any[]>([]);
  const [range, setRange] = useState<RangeType>("hari_ini");
  const [customDari, setCustomDari] = useState("");
  const [customSampai, setCustomSampai] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [ringkasan, setRingkasan] = useState({
    trx: 0,
    omset: 0,
    diskon: 0,
    profit: 0,
  });
  // ── BARU: profit per metode ──
  const [profitPerMetode, setProfitPerMetode] = useState<
    Record<string, number>
  >({});
  const [selectedTrx, setSelectedTrx] = useState<any>(null);
  const [showPicker, setShowPicker] = useState<"dari" | "sampai" | null>(null);
  const { currentUser } = useAuthStore();
  const kasirFilter =
    currentUser?.role === "kasir" ? currentUser.nama : undefined;

  const METODE_OPTS = [
    {
      key: "semua",
      label: "Semua",
      color: Colors.primary,
      bg: Colors.primaryLight,
    },
    {
      key: "tunai",
      label: "Tunai",
      color: Colors.success,
      bg: Colors.successLight,
    },
    { key: "transfer", label: "TF", color: "#7C3AED", bg: "#F5F3FF" },
    { key: "qris", label: "QRIS", color: Colors.info, bg: Colors.infoLight },
    {
      key: "hutang",
      label: "Hutang",
      color: Colors.danger,
      bg: Colors.dangerLight,
    },
  ];

  const RANGES = [
    { key: "hari_ini", label: "Hari ini" },
    { key: "kemarin", label: "Kemarin" },
    { key: "7_hari", label: "7 Hari" },
    { key: "30_hari", label: "30 Hari" },
    { key: "custom", label: "Custom" },
  ];

  function getRangeDate(r: RangeType) {
    const today = todayString();
    const d = new Date();
    if (r === "hari_ini") return { dari: today, sampai: today };
    if (r === "kemarin") {
      d.setDate(d.getDate() - 1);
      const k = toLocalDateString(d); // ✅ fix
      return { dari: k, sampai: k };
    }
    if (r === "7_hari") {
      d.setDate(d.getDate() - 6);
      return { dari: toLocalDateString(d), sampai: today }; // ✅ fix
    }
    if (r === "30_hari") {
      d.setDate(d.getDate() - 29);
      return { dari: toLocalDateString(d), sampai: today }; // ✅ fix
    }
    return { dari: customDari || today, sampai: customSampai || today };
  }

  const [pengeluaranRange, setPengeluaranRange] = useState(0);

  const loadData = useCallback(() => {
    if (!visible) return;
    const { dari, sampai } = getRangeDate(range);
    setOmset7(getOmset7Hari(kasirFilter));
    console.log("RANGE =", dari, sampai);

    const r = getRingkasanByRange(dari, sampai, kasirFilter);

    console.log("RINGKASAN RANGE =", r);

    setRingkasan(r);
    setPengeluaranRange(getTotalPengeluaranByRange(dari, sampai));
    // ── BARU: load profit per metode ──
    setProfitPerMetode(getProfitByMetode(dari, sampai, kasirFilter));
    const all = getTrxByDateRange(dari, sampai, undefined, kasirFilter);
    setTrxList(
      metodeFilter === "semua"
        ? all
        : all.filter((t: any) => t.metode_bayar === metodeFilter),
    );
  }, [visible, range, metodeFilter, customDari, customSampai, kasirFilter]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleHapusTrx = (item: any) => {
    Alert.alert("Hapus Transaksi", `Hapus transaksi ${item.no_trx}?`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: () => {
          hapusTransaksi(item.id);
          setSelectedTrx(null);
          loadData();
        },
      },
    ]);
  };

  const maxOmset = Math.max(...omset7.map((o) => o.omset), 1);
  const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  // ── BARU: summaryMetode sekarang include profit per metode ────────────────
  const summaryMetode = METODE_OPTS.slice(1)
    .map((mt) => {
      const filtered = trxList.filter((t: any) => t.metode_bayar === mt.key);
      const omsetMetode = filtered.reduce(
        (s: number, t: any) => s + (t.total || 0),
        0,
      );
      // Ambil profit dari getProfitByMetode — dihitung dari semua trx range, bukan hanya filtered
      // Jika filter metode aktif, hitung ulang dari filtered saja
      const profitMetode =
        metodeFilter === "semua"
          ? profitPerMetode[mt.key] || 0
          : filtered.length > 0
            ? profitPerMetode[mt.key] || 0
            : 0;
      return {
        ...mt,
        count: filtered.length,
        total: omsetMetode,
        profit: profitMetode,
      };
    })
    .filter((mt) => mt.count > 0);

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={m.safe} edges={["top"]}>
        <View style={m.header}>
          <TouchableOpacity onPress={onClose} style={m.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={m.headerTitle}>Laporan Penjualan</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Filter range */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, backgroundColor: Colors.primaryDark }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingVertical: 10,
            gap: 6,
            alignItems: "center",
          }}>
          {RANGES.map((r) => (
            <TouchableOpacity
              key={r.key}
              style={[
                {
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: "rgba(255,255,255,0.1)",
                },
                range === r.key && { backgroundColor: "#fff" },
              ]}
              onPress={() => {
                setRange(r.key as RangeType);
                if (r.key === "custom") setShowCustom(true);
              }}>
              <Text
                style={[
                  {
                    fontSize: 11,
                    fontWeight: "700",
                    color: "rgba(255,255,255,0.7)",
                  },
                  range === r.key && { color: Colors.primary },
                ]}>
                {r.key === "custom" && customDari
                  ? `${customDari.slice(5)} → ${customSampai.slice(5)}`
                  : r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Tab */}
        <View style={pj.tabRow}>
          {(["statistik", "rekap"] as TabType[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[pj.tab, tab === t && pj.tabActive]}
              onPress={() => setTab(t)}>
              <Ionicons
                name={
                  t === "statistik" ? "bar-chart-outline" : "receipt-outline"
                }
                size={14}
                color={tab === t ? Colors.primary : "rgba(255,255,255,0.5)"}
              />
              <Text style={[pj.tabTxt, tab === t && pj.tabTxtActive]}>
                {t === "statistik" ? "Statistik" : "Rekap Transaksi"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* TAB STATISTIK */}
        {tab === "statistik" && (
          <ScrollView
            contentContainerStyle={{ padding: 16, gap: 14 }}
            showsVerticalScrollIndicator={false}>
            {/* Ringkasan total */}
            <View style={m.statGrid}>
              {[
                {
                  label: "Omset",
                  val: formatRupiah(ringkasan.omset),
                  color: NAVY,
                },
                {
                  label: "Profit",
                  val: formatRupiah(ringkasan.profit),
                  color: Colors.success,
                },
                {
                  label: "Transaksi",
                  val: ringkasan.trx.toString(),
                  color: Colors.info,
                },
                {
                  label: "Diskon",
                  val: formatRupiah(ringkasan.diskon),
                  color: Colors.danger,
                },
                {
                  label: "Pengeluaran",
                  val: formatRupiah(pengeluaranRange),
                  color: Colors.danger,
                },
                {
                  label: "Laba Bersih",
                  val: formatRupiah(
                    (Number(ringkasan.profit) || 0) - pengeluaranRange,
                  ),
                  color:
                    (Number(ringkasan.profit) || 0) - pengeluaranRange >= 0
                      ? Colors.success
                      : Colors.danger,
                },
              ].map((st) => (
                <View key={st.label} style={m.statCard}>
                  <Text style={m.statLbl}>{st.label}</Text>
                  <Text style={[m.statVal, { color: st.color }]}>{st.val}</Text>
                </View>
              ))}
            </View>

            {/* ── BARU: Per Metode dengan profit terpisah ── */}
            {summaryMetode.length > 0 && (
              <>
                <Text style={m.sectionLabel}>PER METODE BAYAR</Text>
                <View style={pj.metodeGrid}>
                  {summaryMetode.map((mt) => (
                    <View
                      key={mt.key}
                      style={[pj.metodeCard, { borderLeftColor: mt.color }]}>
                      {/* Icon metode */}
                      <View style={[pj.metodeDot, { backgroundColor: mt.bg }]}>
                        <Text style={{ fontSize: 18 }}>
                          {mt.key === "tunai"
                            ? "💵"
                            : mt.key === "transfer"
                              ? "📱"
                              : mt.key === "qris"
                                ? "📲"
                                : "🕐"}
                        </Text>
                      </View>
                      {/* Info metode */}
                      <View style={{ flex: 1 }}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            marginBottom: 4,
                          }}>
                          <Text style={pj.metodeLabel}>{mt.label}</Text>
                          <View
                            style={[
                              pj.metodeBadge,
                              { backgroundColor: mt.bg },
                            ]}>
                            <Text
                              style={[pj.metodeBadgeTxt, { color: mt.color }]}>
                              {mt.count}×
                            </Text>
                          </View>
                        </View>
                        {/* Omset */}
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}>
                          <Text
                            style={{ fontSize: 10, color: Colors.textMuted }}>
                            Omset
                          </Text>
                          <Text style={[pj.metodeTotal, { color: mt.color }]}>
                            {formatRupiah(mt.total)}
                          </Text>
                        </View>
                        {/* Profit — dipisah */}
                        {mt.profit > 0 && (
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginTop: 3,
                              paddingTop: 3,
                              borderTopWidth: 0.5,
                              borderTopColor: Colors.borderLight,
                            }}>
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 3,
                              }}>
                              <Ionicons
                                name="trending-up-outline"
                                size={10}
                                color={Colors.success}
                              />
                              <Text
                                style={{ fontSize: 10, color: Colors.success }}>
                                Profit
                              </Text>
                            </View>
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: "800",
                                color: Colors.success,
                              }}>
                              {formatRupiah(mt.profit)}
                            </Text>
                          </View>
                        )}
                        {/* Margin % */}
                        {mt.total > 0 && mt.profit > 0 && (
                          <View style={{ alignSelf: "flex-end", marginTop: 2 }}>
                            <Text
                              style={{ fontSize: 9, color: Colors.textMuted }}>
                              Margin {Math.round((mt.profit / mt.total) * 100)}%
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Chart 7 hari */}
            <Text style={m.sectionLabel}>OMSET 7 HARI TERAKHIR</Text>
            <View style={m.chartCard}>
              <View style={m.barChart}>
                {omset7.length === 0 ? (
                  <View
                    style={{
                      flex: 1,
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                    <Text style={{ color: Colors.textLight, fontSize: 12 }}>
                      Belum ada data
                    </Text>
                  </View>
                ) : (
                  omset7.map((o, i) => {
                    const h = Math.max(
                      4,
                      Math.round((o.omset / maxOmset) * 120),
                    );
                    const d = new Date(o.tgl);
                    const isToday = o.tgl === todayString();
                    return (
                      <View key={i} style={m.barCol}>
                        <Text style={m.barLbl}>
                          {o.omset >= 1000000
                            ? (o.omset / 1000000).toFixed(1) + "jt"
                            : o.omset >= 1000
                              ? Math.round(o.omset / 1000) + "rb"
                              : o.omset || ""}
                        </Text>
                        <View
                          style={[
                            m.bar,
                            {
                              height: h,
                              backgroundColor: isToday
                                ? NAVY
                                : Colors.primaryLight,
                            },
                          ]}
                        />
                        <Text
                          style={[
                            m.barDay,
                            isToday && { color: NAVY, fontWeight: "700" },
                          ]}>
                          {DAYS[d.getDay()]}
                        </Text>
                      </View>
                    );
                  })
                )}
              </View>
            </View>
          </ScrollView>
        )}

        {/* TAB REKAP */}
        {tab === "rekap" && (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={pj.filterScroll}
              contentContainerStyle={pj.filterContent}>
              {METODE_OPTS.map((mt) => (
                <TouchableOpacity
                  key={mt.key}
                  style={[
                    pj.filterChip,
                    metodeFilter === mt.key && {
                      backgroundColor: mt.color,
                      borderColor: mt.color,
                    },
                  ]}
                  onPress={() => setMetode(mt.key as MetodeType)}>
                  <Text
                    style={[
                      pj.filterTxt,
                      metodeFilter === mt.key && { color: "#fff" },
                    ]}>
                    {mt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {trxList.length > 0 &&
              (() => {
                // Hitung omset & profit sesuai filter aktif
                const omsetFilter = trxList.reduce(
                  (s: number, t: any) => s + (t.total || 0),
                  0,
                );
                const profitFilter =
                  metodeFilter === "semua"
                    ? ringkasan.profit // total semua metode
                    : profitPerMetode[metodeFilter] || 0; // profit metode terpilih saja
                return (
                  <View style={pj.summaryStrip}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}>
                      <Text style={pj.summaryTxt}>
                        {trxList.length} transaksi · {formatRupiah(omsetFilter)}
                      </Text>
                      {profitFilter > 0 && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                          }}>
                          <Ionicons
                            name="trending-up-outline"
                            size={11}
                            color={Colors.success}
                          />
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: "700",
                              color: Colors.success,
                            }}>
                            {formatRupiah(profitFilter)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })()}
            <FlatList
              data={trxList}
              keyExtractor={(i) => i.id?.toString() || Math.random().toString()}
              contentContainerStyle={{ padding: 14, gap: 10 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={m.empty}>
                  <Ionicons name="receipt-outline" size={40} color="#D1D5DB" />
                  <Text style={m.emptyTxt}>
                    {metodeFilter === "semua"
                      ? "Belum ada transaksi"
                      : `Tidak ada transaksi ${metodeFilter}`}
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const { color: mc, bg: mb } = getMetodeColor(item.metode_bayar);
                return (
                  <TouchableOpacity
                    style={[
                      m.trxCard,
                      { borderLeftWidth: 3, borderLeftColor: mc },
                    ]}
                    onPress={() => setSelectedTrx(item)}
                    activeOpacity={0.8}>
                    <View style={m.trxHeader}>
                      <View>
                        <Text style={m.trxNo}>{item.no_trx}</Text>
                        <Text style={m.trxTime}>
                          {item.waktu?.slice(0, 16).replace("T", " ")} ·{" "}
                          {item.kasir || "Admin"}
                        </Text>
                      </View>
                      <View style={[m.metodePill, { backgroundColor: mb }]}>
                        <Text style={[m.metodeTxt, { color: mc }]}>
                          {item.metode_bayar?.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <View style={m.trxFooter}>
                      <Text style={m.trxItems}>{item.qty || 0} item</Text>
                      {item.diskon > 0 && (
                        <Text style={m.trxDiskon}>
                          Diskon -{formatRupiah(item.diskon)}
                        </Text>
                      )}
                      <Text style={m.trxTotal}>{formatRupiah(item.total)}</Text>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        marginTop: 6,
                      }}>
                      <Ionicons
                        name="eye-outline"
                        size={11}
                        color={Colors.textDisabled}
                      />
                      <Text
                        style={{ fontSize: 10, color: Colors.textDisabled }}>
                        Tap untuk detail & struk
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </>
        )}

        {/* Modal Custom Tanggal */}
        <Modal visible={showCustom} transparent animationType="fade">
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.5)",
              justifyContent: "center",
              padding: 24,
            }}>
            <View
              style={{
                backgroundColor: "#fff",
                borderRadius: 20,
                padding: 20,
              }}>
              <Text
                style={{ fontSize: 16, fontWeight: "800", marginBottom: 16 }}>
                Pilih Rentang Tanggal
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: Colors.textMuted,
                  marginBottom: 6,
                }}>
                Dari
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: Colors.background,
                  borderRadius: 10,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: Colors.border,
                  marginBottom: 12,
                }}
                onPress={() => setShowPicker("dari")}>
                <Text>{customDari || "Pilih tanggal"}</Text>
              </TouchableOpacity>
              <Text
                style={{
                  fontSize: 12,
                  color: Colors.textMuted,
                  marginBottom: 6,
                }}>
                Sampai
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: Colors.background,
                  borderRadius: 10,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: Colors.border,
                  marginBottom: 16,
                }}
                onPress={() => setShowPicker("sampai")}>
                <Text>{customSampai || "Pilih tanggal"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: Colors.primary,
                  borderRadius: 12,
                  padding: 14,
                  alignItems: "center",
                }}
                onPress={() => {
                  setShowCustom(false);
                  loadData();
                }}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>
                  Terapkan
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {showPicker && (
          <DateTimePicker
            value={new Date()}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowPicker(null);
              if (date) {
                const formatted = toLocalDateString(date);
                showPicker === "dari"
                  ? setCustomDari(formatted)
                  : setCustomSampai(formatted);
              }
            }}
          />
        )}

        {/* Modal Detail Transaksi */}
        <Modal visible={!!selectedTrx} transparent animationType="slide">
          <View style={{ flex: 1, justifyContent: "flex-end" }}>
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              onPress={() => setSelectedTrx(null)}
              activeOpacity={1}>
              <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }} />
            </TouchableOpacity>
            {selectedTrx && (
              <View
                style={{
                  backgroundColor: "#fff",
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  padding: 20,
                  maxHeight: "82%",
                }}>
                <View
                  style={{
                    width: 40,
                    height: 4,
                    backgroundColor: Colors.border,
                    borderRadius: 2,
                    alignSelf: "center",
                    marginBottom: 16,
                  }}
                />
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 16,
                  }}>
                  <View>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "800",
                        color: Colors.text,
                      }}>
                      {selectedTrx.no_trx}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: Colors.textLight,
                        marginTop: 2,
                      }}>
                      {selectedTrx.waktu?.slice(0, 16).replace("T", " ")}
                    </Text>
                    <Text style={{ fontSize: 11, color: Colors.textLight }}>
                      Kasir: {selectedTrx.kasir || "Admin"}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 5,
                        backgroundColor: Colors.primaryLight,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                      }}
                      onPress={() => {
                        const trxItems = getTrxDetail(selectedTrx.id);
                        setSelectedTrx(null);
                        onShowStruk({
                          noTrx: selectedTrx.no_trx,
                          items: trxItems.map((i: any) => ({
                            nama_produk: i.nama_produk,
                            harga: i.harga,
                            qty: i.qty,
                            subtotal: i.subtotal,
                          })),
                          subtotal: selectedTrx.subtotal,
                          diskon: selectedTrx.diskon || 0,
                          pajak: selectedTrx.pajak || 0,
                          pajakPersen: selectedTrx.pajak_persen || 0,
                          total: selectedTrx.total,
                          bayar: selectedTrx.bayar || selectedTrx.total,
                          kembalian: selectedTrx.kembalian || 0,
                          metode: selectedTrx.metode_bayar,
                          waktu: selectedTrx.waktu,
                        });
                      }}>
                      <Ionicons
                        name="receipt-outline"
                        size={14}
                        color={Colors.primary}
                      />
                      <Text
                        style={{
                          color: Colors.primary,
                          fontWeight: "700",
                          fontSize: 12,
                        }}>
                        Struk
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 5,
                        backgroundColor: Colors.dangerLight,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                      }}
                      onPress={() => handleHapusTrx(selectedTrx)}>
                      <Ionicons
                        name="trash-outline"
                        size={14}
                        color={Colors.danger}
                      />
                      <Text
                        style={{
                          color: Colors.danger,
                          fontWeight: "700",
                          fontSize: 12,
                        }}>
                        Hapus
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <DetailTrxItems trxId={selectedTrx.id} />
                <View
                  style={{
                    borderTopWidth: 0.5,
                    borderTopColor: Colors.border,
                    marginTop: 14,
                    paddingTop: 14,
                    gap: 6,
                  }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}>
                    <Text style={{ fontSize: 13, color: Colors.textMuted }}>
                      Subtotal
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: Colors.text,
                      }}>
                      {formatRupiah(selectedTrx.subtotal)}
                    </Text>
                  </View>
                  {selectedTrx.diskon > 0 && (
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                      }}>
                      <Text style={{ fontSize: 13, color: Colors.textMuted }}>
                        Diskon
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: Colors.danger,
                        }}>
                        -{formatRupiah(selectedTrx.diskon)}
                      </Text>
                    </View>
                  )}
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      backgroundColor: Colors.primaryLight,
                      borderRadius: 10,
                      padding: 12,
                      marginTop: 4,
                    }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "800",
                        color: Colors.primary,
                      }}>
                      TOTAL
                    </Text>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "900",
                        color: Colors.primary,
                      }}>
                      {formatRupiah(selectedTrx.total)}
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}>
                    <Text style={{ fontSize: 12, color: Colors.textMuted }}>
                      Metode Bayar
                    </Text>
                    <View
                      style={[
                        m.metodePill,
                        {
                          backgroundColor: getMetodeColor(
                            selectedTrx.metode_bayar,
                          ).bg,
                        },
                      ]}>
                      <Text
                        style={[
                          m.metodeTxt,
                          {
                            color: getMetodeColor(selectedTrx.metode_bayar)
                              .color,
                          },
                        ]}>
                        {selectedTrx.metode_bayar?.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

// ── Main LaporanScreen ────────────────────────────────────────────────────────
export default function LaporanScreen({ navigation }: any) {
  const [ring, setRing] = useState({ trx: 0, omset: 0, diskon: 0, qty: 0 });
  const [namaToko, setNamaToko] = useState("");
  const [showRekap, setShowRekap] = useState(false);
  const [showTerlaris, setShowTerlaris] = useState(false);
  const [showStok, setShowStok] = useState(false);
  const [showPenjualan, setShowPenjualan] = useState(false);
  const [strukData, setStrukData] = useState<any>(null);
  const [exporting, setExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPeriode, setExportPeriode] = useState<"harian" | "bulanan">(
    "harian",
  );
  const [exportBulan, setExportBulan] = useState(() =>
    todayString().slice(0, 7),
  ); // "YYYY-MM"
  const today = todayString();
  const totalPengeluaranHariIni = getTotalPengeluaranByRange(today, today);
  const { currentUser } = useAuthStore();
  const kasirFilter =
    currentUser?.role === "kasir" ? currentUser.nama : undefined;

  const labaKotor = Number((ring as any).profit) || 0;
  const labaBersih = labaKotor - totalPengeluaranHariIni;

  useFocusEffect(
    useCallback(() => {
      migrateHargaModalTransaksiItem(); // sync, aman
      // Paksa re-query setelah migrasi selesai
      const ringData = getRingkasan(todayString());
      setRing(ringData);
      setNamaToko(getPengaturan().nama_toko || "Toko");
    }, []),
  );

  const laba = (ring as any).profit ?? Math.round(ring.omset * 0.225);

  const handleShare = () => {
    const labaKotor = Number((ring as any).profit) || 0;
    const labaBersih = labaKotor - totalPengeluaranHariIni;

    const msg = `📊 *Laporan Harian ${namaToko}*
📅 ${formatTanggal(todayString())}

💰 Omset        : ${formatRupiah(ring.omset)}
🧾 Transaksi    : ${ring.trx}
📦 Item         : ${ring.qty} terjual
🏷️ Diskon       : ${formatRupiah(ring.diskon)}

💵 Laba Kotor   : ${formatRupiah(labaKotor)}
💸 Pengeluaran  : ${formatRupiah(totalPengeluaranHariIni)}
✅ Laba Bersih  : ${formatRupiah(labaBersih)}

_Dikirim via Kasir WarungKu_`;

    Share.share({
      message: msg,
      title: `Laporan ${namaToko}`,
    });
  };

  // ── Export Excel dengan pilihan periode ─────────────────────────────────────
  const exportLaporanExcel = async (
    periode: "harian" | "bulanan",
    bulan?: string,
  ) => {
    setShowExportModal(false);
    setExporting(true);
    try {
      const XLSX = require("xlsx");
      const Sharing = require("expo-sharing");
      const FileSystem = require("expo-file-system/legacy");
      const db = getDB();

      // Tentukan range tanggal berdasarkan periode
      let dari: string, sampai: string, labelPeriode: string, fileLabel: string;
      if (periode === "bulanan") {
        const thn = (bulan || today.slice(0, 7)).slice(0, 4);
        const bln = (bulan || today.slice(0, 7)).slice(5, 7);
        dari = `${thn}-${bln}-01`;
        // Akhir bulan
        const lastDay = new Date(parseInt(thn), parseInt(bln), 0).getDate();
        sampai = `${thn}-${bln}-${String(lastDay).padStart(2, "0")}`;
        const BULAN_ID = [
          "",
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "Mei",
          "Jun",
          "Jul",
          "Ags",
          "Sep",
          "Okt",
          "Nov",
          "Des",
        ];
        labelPeriode = `${BULAN_ID[parseInt(bln)]} ${thn}`;
        fileLabel = `${thn}${bln}`;
      } else {
        dari = today;
        sampai = today;
        labelPeriode = formatTanggal(today);
        fileLabel = today.replace(/-/g, "");
      }

      const ring2 = getRingkasanByRange(dari, sampai, kasirFilter);
      const ringkasanData = [
        [
          `Laporan ${periode === "bulanan" ? "Bulanan" : "Harian"} Kasir WarungKu`,
        ],
        ["Periode", labelPeriode],
        ["Dari", dari],
        ["Sampai", sampai],
        ["Toko", namaToko],
        [],
        ["RINGKASAN"],
        ["Total Omset", ring2.omset],
        ["Total Transaksi", ring2.trx],
        ["Total Diskon", ring2.diskon],
        ["Laba Kotor", ring2.profit ?? 0],
      ];

      // Sheet 1: Ringkasan
      const wsRingkasan = XLSX.utils.aoa_to_sheet(ringkasanData);

      // Sheet 2: Rekap Transaksi
      const trxList = getTrxByDateRange(dari, sampai, undefined, kasirFilter) as any[];
      const wsTransaksi = XLSX.utils.json_to_sheet(
        trxList.map((t: any) => ({
          "No Transaksi": t.no_trx,
          Tanggal: t.waktu?.slice(0, 10) || "",
          Waktu: t.waktu?.slice(11, 16) || "",
          "Metode Bayar": t.metode_bayar?.toUpperCase(),
          Subtotal: t.subtotal,
          Diskon: t.diskon || 0,
          Total: t.total,
          Bayar: t.bayar || 0,
          Kembalian: t.kembalian || 0,
          Kasir: t.kasir || "Admin",
        })),
      );

      // Sheet 3: Detail Item
      const detailItems = db.getAllSync(
        `SELECT t.no_trx, t.waktu, t.metode_bayar, ti.nama_produk, ti.qty, ti.harga,
                COALESCE(ti.harga_modal, p.harga_modal, 0) as harga_modal, ti.subtotal,
                ti.qty * (ti.harga - COALESCE(ti.harga_modal, p.harga_modal, 0)) as profit_item
         FROM transaksi_item ti
         JOIN transaksi t ON t.id = ti.transaksi_id
         LEFT JOIN produk p ON p.id = ti.produk_id
         WHERE date(t.waktu) BETWEEN ? AND ?
         ORDER BY t.waktu DESC, ti.id ASC`,
        [dari, sampai],
      ) as any[];
      const wsDetail = XLSX.utils.json_to_sheet(
        detailItems.map((d: any) => ({
          "No Transaksi": d.no_trx,
          Tanggal: d.waktu?.slice(0, 10) || "",
          Waktu: d.waktu?.slice(11, 16) || "",
          Metode: d.metode_bayar?.toUpperCase(),
          Produk: d.nama_produk,
          Qty: d.qty,
          "Harga Jual": d.harga,
          "Harga Modal": d.harga_modal,
          Subtotal: d.subtotal,
          Profit: d.profit_item,
        })),
      );

      // Sheet 4: Per Metode
      const profitMetode = getProfitByMetode(dari, sampai, kasirFilter);
      const perMetode = ["tunai", "transfer", "qris", "hutang"]
        .map((m) => {
          const filtered = trxList.filter((t: any) => t.metode_bayar === m);
          return {
            "Metode Bayar": m.toUpperCase(),
            "Jumlah Transaksi": filtered.length,
            "Total Omset": filtered.reduce(
              (s: number, t: any) => s + (t.total || 0),
              0,
            ),
            Profit: profitMetode[m] || 0,
          };
        })
        .filter((m) => m["Jumlah Transaksi"] > 0);
      const wsMetode = XLSX.utils.json_to_sheet(perMetode);

      // Sheet 5: Produk Terlaris
      const terlaris = db.getAllSync(
        `SELECT ti.nama_produk, SUM(ti.qty) as total_qty, SUM(ti.subtotal) as total_omset
         FROM transaksi_item ti
         JOIN transaksi t ON t.id = ti.transaksi_id
         WHERE date(t.waktu) BETWEEN ? AND ?
         GROUP BY ti.nama_produk ORDER BY total_qty DESC LIMIT 100`,
        [dari, sampai],
      ) as any[];
      const wsTerlaris = XLSX.utils.json_to_sheet(
        terlaris.map((p: any, i: number) => ({
          Rank: i + 1,
          "Nama Produk": p.nama_produk,
          "Qty Terjual": p.total_qty,
          "Total Omset": p.total_omset,
        })),
      );

      // Khusus bulanan: tambah Sheet 6 rekap per hari
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsRingkasan, "Ringkasan");
      if (periode === "bulanan") {
        const perHari = db.getAllSync(
          `SELECT date(t.waktu) as tgl,
                  COUNT(*) as trx,
                  COALESCE(SUM(t.total), 0) as omset,
                  COALESCE(SUM(
                    (SELECT SUM(ti.qty * (ti.harga - COALESCE(ti.harga_modal, p.harga_modal, 0)))
                     FROM transaksi_item ti LEFT JOIN produk p ON p.id=ti.produk_id
                     WHERE ti.transaksi_id=t.id)
                  ), 0) as profit
           FROM transaksi t
           WHERE date(t.waktu) BETWEEN ? AND ?
           GROUP BY date(t.waktu) ORDER BY tgl ASC`,
          [dari, sampai],
        ) as any[];
        const wsPerHari = XLSX.utils.json_to_sheet(
          perHari.map((r: any) => ({
            Tanggal: r.tgl,
            "Jumlah Transaksi": r.trx,
            Omset: r.omset,
            Profit: r.profit,
          })),
        );
        XLSX.utils.book_append_sheet(wb, wsPerHari, "Rekap Per Hari");
      }
      XLSX.utils.book_append_sheet(wb, wsTransaksi, "Transaksi");
      XLSX.utils.book_append_sheet(wb, wsDetail, "Detail Item");
      XLSX.utils.book_append_sheet(wb, wsMetode, "Per Metode");
      XLSX.utils.book_append_sheet(wb, wsTerlaris, "Produk Terlaris");

      const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
      const fileName =
        periode === "bulanan"
          ? `LaporanBulanan_${fileLabel}.xlsx`
          : `LaporanHarian_${fileLabel}.xlsx`;
      const fileUri = FileSystem.cacheDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, wbout, {
        encoding: "base64",
      });
      await Sharing.shareAsync(fileUri, {
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        dialogTitle: `Export Laporan ${periode === "bulanan" ? "Bulanan" : "Harian"}`,
        UTI: "com.microsoft.excel.xlsx",
      });
    } catch (e: any) {
      Alert.alert("Gagal Export", e?.message || "Terjadi kesalahan");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (strukData) {
      navigation.navigate("Struk", strukData);
      setStrukData(null);
    }
  }, [strukData]);

  const MENU = [
    {
      key: "penjualan",
      label: "Laporan Penjualan",
      sub: "Chart, statistik, detail & profit",
      icon: "bar-chart-outline",
      color: "#EC4899",
      bg: "#FDF2F8",
      onPress: () => setShowPenjualan(true),
    },
    {
      key: "terlaris",
      label: "Produk Terlaris",
      sub: "Produk paling banyak terjual",
      icon: "trending-up-outline",
      color: "#EF4444",
      bg: "#FEF2F2",
      onPress: () => setShowTerlaris(true),
    },
    {
      key: "stok",
      label: "Alert Stok",
      sub: "Stok menipis / habis + tambah stok",
      icon: "alert-circle-outline",
      color: "#F59E0B",
      bg: "#FFFBEB",
      onPress: () => setShowStok(true),
    },
    {
      key: "ai",
      label: "Analisis WarungKu",
      sub: "Insight cerdas dari data penjualan",
      icon: "sparkles-outline",
      color: "#4F46E5",
      bg: "#EEF2FF",
      onPress: () => navigation.navigate("AI"),
    },
    {
      key: "share",
      label: "Share Laporan",
      sub: "Bagikan ringkasan harian via WA",
      icon: "share-social-outline",
      color: "#10B981",
      bg: "#F0FDF4",
      onPress: handleShare,
    },
  ];

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Laporan</Text>
          <Text style={s.headerSub}>Analisis & statistik penjualan</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            style={[
              s.shareHeaderBtn,
              { backgroundColor: "rgba(22,163,74,0.8)" },
            ]}
            onPress={() => !exporting && setShowExportModal(true)}
            disabled={exporting}>
            {exporting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="download-outline" size={18} color="#fff" />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={s.shareHeaderBtn} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}>
        <View style={s.omsetCard}>
          <Text style={s.omsetDate}>{formatTanggal(todayString())}</Text>
          <Text style={s.omsetLabel}>Total Omset Hari Ini</Text>
          <Text style={s.omsetVal}>{formatRupiah(ring.omset)}</Text>
          <View style={s.omsetStats}>
            {[
              {
                label: "Transaksi",
                val: ring.trx.toString(),
                icon: "receipt-outline",
                color: "#60A5FA",
              },
              {
                label: "Item Terjual",
                val: ring.qty.toString(),
                icon: "cube-outline",
                color: "#34D399",
              },
              {
                label: "Laba Kotor",
                val: formatRupiah(labaKotor),
                icon: "cash-outline",
                color: "#A78BFA",
              },
              {
                label: "Diskon",
                val: formatRupiah(ring.diskon),
                icon: "pricetag-outline",
                color: "#FCD34D",
              },
            ].map((st, i) => (
              <View key={i} style={s.ostat}>
                <View
                  style={[
                    s.ostatIcon,
                    { backgroundColor: "rgba(255,255,255,0.1)" },
                  ]}>
                  <Ionicons name={st.icon as any} size={14} color={st.color} />
                </View>
                <Text style={s.ostatVal}>{st.val}</Text>
                <Text style={s.ostatLabel}>{st.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.labaCard}>
          <Text style={s.labaTitle}>💹 Laba Rugi Hari Ini</Text>
          <View style={s.labaRow}>
            <View style={s.labaItem}>
              <Text style={s.labaLabel}>Omset</Text>
              <Text style={[s.labaVal, { color: Colors.primary }]}>
                {formatRupiah(ring.omset)}
              </Text>
            </View>
            <View style={s.labaSep} />
            <View style={s.labaItem}>
              <Text style={s.labaLabel}>Pengeluaran</Text>
              <Text style={[s.labaVal, { color: Colors.danger }]}>
                -{formatRupiah(totalPengeluaranHariIni)}
              </Text>
            </View>
            <View style={s.labaSep} />
            <View style={s.labaItem}>
              <Text style={s.labaLabel}>Laba Bersih</Text>
              <Text
                style={[
                  s.labaVal,
                  {
                    color: labaBersih >= 0 ? Colors.success : Colors.danger,
                    fontSize: 14,
                  },
                ]}>
                {formatRupiah(labaBersih)}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={s.labaDetailBtn}
            onPress={() => navigation.navigate("Pengeluaran")}>
            <Ionicons name="wallet-outline" size={13} color={Colors.primary} />
            <Text style={s.labaDetailTxt}>Lihat & tambah pengeluaran →</Text>
          </TouchableOpacity>
        </View>

        <View style={s.quickStats}>
          {[
            {
              icon: "trending-up-outline",
              color: Colors.success,
              val:
                ring.trx > 0
                  ? formatRupiah(Math.round(ring.omset / ring.trx))
                  : "Rp 0",
              lbl: "Rata-rata/trx",
            },
            {
              icon: "star-outline",
              color: Colors.warning,
              val:
                ring.trx > 0 ? Math.round(ring.qty / ring.trx).toString() : "0",
              lbl: "Item/transaksi",
            },
            {
              icon: "analytics-outline",
              color: Colors.info,
              val:
                ring.omset > 0
                  ? Math.round((ring.diskon / ring.omset) * 100) + "%"
                  : "0%",
              lbl: "% Diskon",
            },
          ].map((q, i) => (
            <View key={i} style={s.qstatCard}>
              <Ionicons name={q.icon as any} size={18} color={q.color} />
              <Text style={s.qstatVal}>{q.val}</Text>
              <Text style={s.qstatLbl}>{q.lbl}</Text>
            </View>
          ))}
        </View>

        <Text style={s.sectionLbl}>MENU LAPORAN</Text>
        <View style={s.menuCard}>
          {MENU.map((item, i) => (
            <TouchableOpacity
              key={item.key}
              style={[s.menuRow, i < MENU.length - 1 && s.menuBorder]}
              onPress={item.onPress}
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
        <View style={{ height: 16 }} />
      </ScrollView>

      <RekapModal visible={showRekap} onClose={() => setShowRekap(false)} />
      <TerlarisModal
        visible={showTerlaris}
        onClose={() => setShowTerlaris(false)}
      />
      <StokModal visible={showStok} onClose={() => setShowStok(false)} />
      <PenjualanModal
        visible={showPenjualan}
        onClose={() => setShowPenjualan(false)}
        onShowStruk={setStrukData}
      />

      {/* Modal Pilih Periode Export */}
      <Modal visible={showExportModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            padding: 24,
          }}>
          <View
            style={{ backgroundColor: "#fff", borderRadius: 20, padding: 20 }}>
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginBottom: 20,
              }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: "#F0FDF4",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                <Ionicons name="download-outline" size={20} color="#16A34A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "800",
                    color: Colors.text,
                  }}>
                  Export Laporan Excel
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: Colors.textMuted,
                    marginTop: 2,
                  }}>
                  Pilih periode yang ingin di-export
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowExportModal(false)}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Pilihan periode */}
            {(
              [
                {
                  key: "harian",
                  label: "📅 Laporan Harian",
                  sub: `Data hari ini · ${formatTanggal(today)}`,
                  color: Colors.primary,
                },
                {
                  key: "bulanan",
                  label: "📆 Laporan Bulanan",
                  sub: "Data seluruh bulan terpilih",
                  color: "#7C3AED",
                },
              ] as const
            ).map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: 14,
                  borderRadius: 14,
                  marginBottom: 10,
                  borderWidth: 2,
                  borderColor:
                    exportPeriode === opt.key ? opt.color : Colors.border,
                  backgroundColor:
                    exportPeriode === opt.key
                      ? opt.key === "harian"
                        ? Colors.primaryLight
                        : "#F5F3FF"
                      : "#fff",
                }}
                onPress={() => setExportPeriode(opt.key)}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: Colors.text,
                    }}>
                    {opt.label}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: Colors.textMuted,
                      marginTop: 2,
                    }}>
                    {opt.sub}
                  </Text>
                </View>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    borderWidth: 2,
                    borderColor:
                      exportPeriode === opt.key ? opt.color : Colors.border,
                    backgroundColor:
                      exportPeriode === opt.key ? opt.color : "#fff",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                  {exportPeriode === opt.key && (
                    <Ionicons name="checkmark" size={13} color="#fff" />
                  )}
                </View>
              </TouchableOpacity>
            ))}

            {/* Pilih bulan jika bulanan */}
            {exportPeriode === "bulanan" && (
              <View style={{ marginBottom: 10 }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: Colors.textMuted,
                    marginBottom: 8,
                  }}>
                  PILIH BULAN
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {(() => {
                      const opts: { val: string; label: string }[] = [];
                      const now = new Date();
                      for (let i = 11; i >= 0; i--) {
                        const d = new Date(
                          now.getFullYear(),
                          now.getMonth() - i,
                          1,
                        );
                        const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                        const BULAN = [
                          "Jan",
                          "Feb",
                          "Mar",
                          "Apr",
                          "Mei",
                          "Jun",
                          "Jul",
                          "Ags",
                          "Sep",
                          "Okt",
                          "Nov",
                          "Des",
                        ];
                        opts.push({
                          val,
                          label: `${BULAN[d.getMonth()]} ${d.getFullYear()}`,
                        });
                      }
                      return opts.map((opt) => (
                        <TouchableOpacity
                          key={opt.val}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 20,
                            backgroundColor:
                              exportBulan === opt.val
                                ? "#7C3AED"
                                : Colors.background,
                            borderWidth: 1,
                            borderColor:
                              exportBulan === opt.val
                                ? "#7C3AED"
                                : Colors.border,
                          }}
                          onPress={() => setExportBulan(opt.val)}>
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: "700",
                              color:
                                exportBulan === opt.val
                                  ? "#fff"
                                  : Colors.textMuted,
                            }}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      ));
                    })()}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Tombol export */}
            <TouchableOpacity
              style={{
                backgroundColor:
                  exportPeriode === "bulanan" ? "#7C3AED" : Colors.primary,
                borderRadius: 14,
                padding: 15,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginTop: 4,
              }}
              onPress={() =>
                exportLaporanExcel(
                  exportPeriode,
                  exportPeriode === "bulanan" ? exportBulan : undefined,
                )
              }>
              <Ionicons name="download-outline" size={18} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 15, fontWeight: "800" }}>
                Export {exportPeriode === "bulanan" ? "Bulanan" : "Harian"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const pj = StyleSheet.create({
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    backgroundColor: Colors.primary,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  tabActive: { backgroundColor: "#fff" },
  tabTxt: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.6)" },
  tabTxtActive: { color: Colors.primary },
  filterScroll: { flexGrow: 0, backgroundColor: Colors.primary },
  filterContent: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    alignItems: "center",
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  filterTxt: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.85)",
  },
  summaryStrip: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  summaryTxt: { fontSize: 12, fontWeight: "700", color: Colors.primary },
  metodeGrid: { gap: 10 },
  // ── Card metode yang lebih informatif ──
  metodeCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
    borderLeftWidth: 4,
  },
  metodeDot: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  metodeLabel: { fontSize: 13, fontWeight: "700", color: Colors.text },
  metodeTotal: { fontSize: 16, fontWeight: "900" },
  metodeBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10 },
  metodeBadgeTxt: { fontSize: 11, fontWeight: "800" },
});

const m = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "800" },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTxt: { fontSize: 15, fontWeight: "700", color: Colors.textMuted },
  emptySub: { fontSize: 13, color: Colors.textLight, textAlign: "center" },
  trxCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  trxHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  trxNo: { fontSize: 12, fontWeight: "700", color: Colors.text },
  trxTime: { fontSize: 11, color: Colors.textLight, marginTop: 2 },
  metodePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  metodeTxt: { fontSize: 10, fontWeight: "800" },
  trxFooter: { flexDirection: "row", alignItems: "center", gap: 8 },
  trxItems: { fontSize: 12, color: Colors.textLight },
  trxDiskon: { fontSize: 12, color: Colors.danger },
  trxTotal: {
    marginLeft: "auto" as any,
    fontSize: 15,
    fontWeight: "800",
    color: Colors.primary,
  },
  periodeRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.primary,
  },
  periodeChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  periodeActive: { backgroundColor: "#fff" },
  periodeTxt: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
  },
  periodeTxtActive: { color: Colors.primary },
  terlarisCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  terlarisLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  terlarisRank: { fontSize: 22, width: 32 },
  terlarisNama: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 5,
  },
  barWrap: {
    height: 4,
    backgroundColor: Colors.borderLight,
    borderRadius: 2,
    marginBottom: 3,
  },
  barFill: { height: 4, backgroundColor: Colors.primary, borderRadius: 2 },
  terlarisQty: { fontSize: 10, color: Colors.textLight },
  terlarisOmset: { fontSize: 13, fontWeight: "800", color: Colors.primary },
  stokCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
    gap: 12,
  },
  stokCardHabis: {
    borderColor: Colors.dangerBorder,
    backgroundColor: Colors.dangerLight,
  },
  stokIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stokNama: { fontSize: 13, fontWeight: "700", color: Colors.text },
  stokKat: { fontSize: 11, color: Colors.textLight, marginTop: 2 },
  stokSisa: { fontSize: 13, fontWeight: "800" },
  stokMin: { fontSize: 10, color: Colors.textLight, marginTop: 2 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textLight,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  statLbl: { fontSize: 11, color: Colors.textLight, marginBottom: 4 },
  statVal: { fontSize: 18, fontWeight: "800" },
  chartCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  barChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 160,
    gap: 4,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    height: "100%",
    justifyContent: "flex-end",
  },
  bar: { width: "100%", borderRadius: 4 },
  barLbl: { fontSize: 8, color: Colors.textLight },
  barDay: { fontSize: 9, color: Colors.textLight },
});

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  scroll: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 32 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 2 },
  shareHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  omsetCard: {
    backgroundColor: Colors.primaryDark,
    margin: 16,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  omsetDate: { color: "rgba(255,255,255,0.5)", fontSize: 11, marginBottom: 4 },
  omsetLabel: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    marginBottom: 6,
  },
  omsetVal: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -1,
    marginBottom: 16,
  },
  omsetStats: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  ostat: {
    flex: 1,
    minWidth: "45%",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  ostatIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  ostatVal: { color: "#fff", fontSize: 14, fontWeight: "800" },
  ostatLabel: { color: "rgba(255,255,255,0.55)", fontSize: 10 },
  labaCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  labaTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textMuted,
    marginBottom: 14,
  },
  labaRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  labaItem: { flex: 1, alignItems: "center", gap: 5 },
  labaSep: { width: 1, height: 44, backgroundColor: Colors.borderLight },
  labaLabel: { fontSize: 10, color: Colors.textMuted },
  labaVal: { fontSize: 13, fontWeight: "800", color: Colors.text },
  labaDetailBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderTopWidth: 0.5,
    borderTopColor: Colors.borderLight,
    paddingTop: 10,
  },
  labaDetailTxt: { fontSize: 12, color: Colors.primary, fontWeight: "600" },
  quickStats: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  qstatCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    gap: 4,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  qstatVal: { fontSize: 14, fontWeight: "800", color: Colors.text },
  qstatLbl: { fontSize: 9, color: Colors.textLight, textAlign: "center" },
  sectionLbl: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textLight,
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  menuCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  menuBorder: { borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight },
  menuIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuInfo: { flex: 1 },
  menuLabel: { fontSize: 14, fontWeight: "700", color: Colors.text },
  menuSub: { fontSize: 12, color: Colors.textLight, marginTop: 1 },
});
