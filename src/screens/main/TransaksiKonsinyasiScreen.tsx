// src/screens/main/TransaksiKonsinyasiScreen.tsx
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
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants";
import { formatRupiah } from "../../utils/format";
import {
  getAllKonsinyasi,
  hapusKonsinyasi,
  editKonsinyasi,
} from "../../db/konsinyasiRepo";

export default function TransaksiKonsinyasiScreen({ navigation }: any) {
  const [list, setList] = useState<any[]>([]);
  const [filter, setFilter] = useState<"semua" | "aktif" | "selesai">("semua");
  const [editItem, setEditItem] = useState<any>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [qtyTerjual, setQtyTerjual] = useState("");
  const [qtyKembali, setQtyKembali] = useState("");
  const [statusEdit, setStatusEdit] = useState("aktif");

  const load = () => setList(getAllKonsinyasi());
  useFocusEffect(
    useCallback(() => {
      load();
    }, []),
  );

  const filtered =
    filter === "semua" ? list : list.filter((k) => k.status === filter);

  const totalNilai = list
    .filter((k) => k.status === "aktif")
    .reduce((s, k) => s + k.qty_masuk * k.harga_konsinyasi, 0);
  const totalTerjual = list
    .filter((k) => k.status === "aktif")
    .reduce((s, k) => s + k.qty_terjual * k.harga_konsinyasi, 0);

  const openEdit = (item: any) => {
    setEditItem(item);
    setQtyTerjual(item.qty_terjual.toString());
    setQtyKembali(item.qty_kembali.toString());
    setStatusEdit(item.status);
    setShowEdit(true);
  };

  const handleEdit = () => {
    if (!editItem) return;
    editKonsinyasi(editItem.id, {
      qty_masuk: editItem.qty_masuk,
      qty_terjual: parseInt(qtyTerjual) || 0,
      qty_kembali: parseInt(qtyKembali) || 0,
      harga_jual: editItem.harga_jual,
      harga_konsinyasi: editItem.harga_konsinyasi,
      tgl_masuk: editItem.tgl_masuk,
      catatan: editItem.catatan || "",
      status: statusEdit,
    });
    setShowEdit(false);
    load();
  };

  const handleHapus = (item: any) => {
    Alert.alert("Hapus", `Hapus konsinyasi "${item.nama_produk}"?`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: () => {
          hapusKonsinyasi(item.id);
          load();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Transaksi Konsinyasi</Text>
          <Text style={s.headerSub}>
            {list.filter((k) => k.status === "aktif").length} aktif
          </Text>
        </View>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => navigation.navigate("TambahKonsinyasi")}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.addBtnTxt}>Tambah</Text>
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={s.summaryRow}>
        <View style={s.summaryCard}>
          <Text style={s.summaryLabel}>Nilai Titipan</Text>
          <Text style={s.summaryVal}>{formatRupiah(totalNilai)}</Text>
        </View>
        <View style={s.summaryCard}>
          <Text style={s.summaryLabel}>Sudah Terjual</Text>
          <Text style={[s.summaryVal, { color: "#86EFAC" }]}>
            {formatRupiah(totalTerjual)}
          </Text>
        </View>
        <View style={s.summaryCard}>
          <Text style={s.summaryLabel}>Sisa</Text>
          <Text style={[s.summaryVal, { color: "#FCD34D" }]}>
            {formatRupiah(totalNilai - totalTerjual)}
          </Text>
        </View>
      </View>

      {/* Filter */}
      <View style={s.filterRow}>
        {(["semua", "aktif", "selesai"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.filterChip, filter === f && s.filterChipActive]}
            onPress={() => setFilter(f)}>
            <Text style={[s.filterTxt, filter === f && s.filterTxtActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id.toString()}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="git-network-outline" size={48} color="#D1D5DB" />
            <Text style={s.emptyTxt}>Belum ada transaksi konsinyasi</Text>
            <TouchableOpacity
              style={s.emptyBtn}
              onPress={() => navigation.navigate("TambahKonsinyasi")}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={s.emptyBtnTxt}>Tambah Konsinyasi</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const sisaQty = item.qty_masuk - item.qty_terjual - item.qty_kembali;
          const pct =
            item.qty_masuk > 0
              ? Math.round((item.qty_terjual / item.qty_masuk) * 100)
              : 0;
          const untung =
            item.qty_terjual * ((item.harga_jual || 0) - item.harga_konsinyasi);
          return (
            <View
              style={[s.card, item.status === "selesai" && { opacity: 0.65 }]}>
              {/* Header */}
              <View style={s.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.produkNama}>{item.nama_produk}</Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      marginTop: 3,
                    }}>
                    <Ionicons
                      name="business-outline"
                      size={12}
                      color={Colors.textMuted}
                    />
                    <Text style={s.supplierTxt}>
                      {item.nama_konsinyor || "—"}
                    </Text>
                    <Text style={s.tglTxt}>· {item.tgl_masuk}</Text>
                  </View>
                </View>
                <View
                  style={[
                    s.statusPill,
                    {
                      backgroundColor:
                        item.status === "aktif" ? "#F0FDF4" : "#F3F4F6",
                    },
                  ]}>
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "700",
                      color: item.status === "aktif" ? "#16A34A" : "#9CA3AF",
                    }}>
                    {item.status === "aktif" ? "● Aktif" : "✓ Selesai"}
                  </Text>
                </View>
              </View>

              {/* Progress */}
              <View style={s.progressWrap}>
                <View style={s.progressBar}>
                  <View
                    style={[
                      s.progressFill,
                      { width: `${Math.min(pct, 100)}%` as any },
                    ]}
                  />
                </View>
                <Text style={s.progressTxt}>{pct}% terjual</Text>
              </View>

              {/* Stats */}
              <View style={s.statsRow}>
                {[
                  {
                    label: "Masuk",
                    val: item.qty_masuk.toString(),
                    color: Colors.text,
                  },
                  {
                    label: "Terjual",
                    val: item.qty_terjual.toString(),
                    color: Colors.success,
                  },
                  {
                    label: "Kembali",
                    val: item.qty_kembali.toString(),
                    color: Colors.danger,
                  },
                  {
                    label: "Sisa",
                    val: sisaQty.toString(),
                    color: Colors.warning,
                  },
                ].map((st, i) => (
                  <View
                    key={i}
                    style={[s.stat, i === 3 && { borderRightWidth: 0 }]}>
                    <Text style={s.statLabel}>{st.label}</Text>
                    <Text style={[s.statVal, { color: st.color }]}>
                      {st.val}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Harga & untung */}
              <View style={s.priceRow}>
                <Text style={s.priceLabel}>
                  Titipan: {formatRupiah(item.harga_konsinyasi)}
                  {item.harga_jual > 0
                    ? ` · Jual: ${formatRupiah(item.harga_jual)}`
                    : ""}
                </Text>
                <Text
                  style={[
                    s.priceUntung,
                    { color: untung >= 0 ? Colors.success : Colors.danger },
                  ]}>
                  +{formatRupiah(untung)}
                </Text>
              </View>

              {/* Actions */}
              <View style={s.cardActions}>
                <TouchableOpacity
                  style={s.editBtn}
                  onPress={() => openEdit(item)}>
                  <Ionicons
                    name="pencil-outline"
                    size={14}
                    color={Colors.primary}
                  />
                  <Text style={s.editBtnTxt}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.hapusCardBtn}
                  onPress={() => handleHapus(item)}>
                  <Ionicons
                    name="trash-outline"
                    size={14}
                    color={Colors.danger}
                  />
                  <Text style={s.hapusCardBtnTxt}>Hapus</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Modal Edit */}
      <Modal visible={showEdit} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <TouchableOpacity
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: "rgba(0,0,0,0.5)" },
            ]}
            onPress={() => setShowEdit(false)}
            activeOpacity={1}
          />
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Edit Konsinyasi</Text>
            <Text
              style={{
                fontSize: 13,
                color: Colors.textMuted,
                marginBottom: 14,
              }}>
              {editItem?.nama_produk} · {editItem?.nama_konsinyor}
            </Text>

            <Text style={s.fieldLabel}>QTY TERJUAL</Text>
            <View style={s.inputWrap}>
              <TextInput
                style={s.input}
                keyboardType="numeric"
                value={qtyTerjual}
                onChangeText={(v) => setQtyTerjual(v.replace(/\D/g, ""))}
                placeholder="0"
                placeholderTextColor={Colors.textDisabled}
              />
            </View>

            <Text style={s.fieldLabel}>QTY KEMBALI</Text>
            <View style={s.inputWrap}>
              <TextInput
                style={s.input}
                keyboardType="numeric"
                value={qtyKembali}
                onChangeText={(v) => setQtyKembali(v.replace(/\D/g, ""))}
                placeholder="0"
                placeholderTextColor={Colors.textDisabled}
              />
            </View>

            <Text style={s.fieldLabel}>STATUS</Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 4 }}>
              {["aktif", "selesai"].map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[
                    s.statusBtn,
                    statusEdit === st && {
                      backgroundColor: Colors.primary,
                      borderColor: Colors.primary,
                    },
                  ]}
                  onPress={() => setStatusEdit(st)}>
                  <Text
                    style={[
                      s.statusBtnTxt,
                      statusEdit === st && { color: "#fff" },
                    ]}>
                    {st.charAt(0).toUpperCase() + st.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.sheetBtns}>
              <TouchableOpacity
                style={s.btnBatal}
                onPress={() => setShowEdit(false)}>
                <Text style={s.btnBatalTxt}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnSimpan} onPress={handleEdit}>
                <Text style={s.btnSimpanTxt}>Simpan</Text>
              </TouchableOpacity>
            </View>
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
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,.15)",
    alignItems: "center",
    justifyContent: "center",
  },
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
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,.55)", fontSize: 12 },

  summaryRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,.12)",
    borderRadius: 12,
    padding: 10,
  },
  summaryLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,.6)",
    marginBottom: 3,
  },
  summaryVal: { fontSize: 13, fontWeight: "800", color: "#fff" },

  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,.12)",
  },
  filterChipActive: { backgroundColor: "#fff" },
  filterTxt: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,.7)" },
  filterTxtActive: { color: Colors.primary },

  listContent: {
    padding: 14,
    gap: 10,
    backgroundColor: Colors.background,
    flexGrow: 1,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
    gap: 10,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start" },
  produkNama: { fontSize: 15, fontWeight: "800", color: Colors.text },
  supplierTxt: { fontSize: 11, color: Colors.textMuted },
  tglTxt: { fontSize: 11, color: Colors.textMuted },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },

  progressWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.borderLight,
    borderRadius: 2,
  },
  progressFill: { height: 4, backgroundColor: "#059669", borderRadius: 2 },
  progressTxt: {
    fontSize: 10,
    color: "#059669",
    fontWeight: "600",
    minWidth: 55,
  },

  statsRow: {
    flexDirection: "row",
    backgroundColor: Colors.background,
    borderRadius: 10,
    overflow: "hidden",
  },
  stat: {
    flex: 1,
    alignItems: "center",
    padding: 10,
    borderRightWidth: 0.5,
    borderRightColor: Colors.border,
  },
  statLabel: { fontSize: 10, color: Colors.textMuted, marginBottom: 3 },
  statVal: { fontSize: 14, fontWeight: "800", color: Colors.text },

  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceLabel: { fontSize: 11, color: Colors.textMuted },
  priceUntung: { fontSize: 12, fontWeight: "700" },

  cardActions: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 4,
    borderTopWidth: 0.5,
    borderTopColor: Colors.borderLight,
  },
  editBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    paddingVertical: 8,
  },
  editBtnTxt: { fontSize: 12, fontWeight: "700", color: Colors.primary },
  hapusCardBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.dangerLight,
    borderRadius: 10,
    paddingVertical: 8,
  },
  hapusCardBtnTxt: { fontSize: 12, fontWeight: "700", color: Colors.danger },

  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTxt: { fontSize: 15, fontWeight: "700", color: Colors.textMuted },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#059669",
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
    marginBottom: 4,
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
  statusBtn: {
    flex: 1,
    padding: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  statusBtnTxt: { fontSize: 13, fontWeight: "700", color: Colors.textMuted },
  sheetBtns: { flexDirection: "row", gap: 10, marginTop: 16 },
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
    backgroundColor: "#059669",
    alignItems: "center",
  },
  btnSimpanTxt: { fontWeight: "800", color: "#fff" },
});
