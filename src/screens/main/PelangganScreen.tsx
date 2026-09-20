// src/screens/main/PelangganScreen.tsx
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
import { formatRupiah } from "../../utils/format";
import {
  getAllPelanggan,
  tambahPelanggan,
  Pelanggan,
} from "../../db/pelangganRepo";
import { getDB } from "../../db/database";

function editPelanggan(
  id: number,
  nama: string,
  no_hp: string,
  alamat: string,
) {
  getDB().runSync(`UPDATE pelanggan SET nama=?, no_hp=?, alamat=? WHERE id=?`, [
    nama.trim(),
    no_hp.trim(),
    alamat.trim(),
    id,
  ]);
}

function hapusPelanggan(id: number) {
  getDB().runSync(`DELETE FROM pelanggan WHERE id=?`, [id]);
}

function getPelangganDetail(id: number): any {
  try {
    const p = getDB().getFirstSync(`SELECT * FROM pelanggan WHERE id=?`, [
      id,
    ]) as any;
    const trx = getDB().getAllSync(
      `SELECT t.no_trx, t.total, t.waktu, t.metode_bayar
       FROM transaksi t
       WHERE t.pelanggan_id = ?
       ORDER BY t.waktu DESC LIMIT 10`,
      [id],
    ) as any[];
    return { ...p, riwayat: trx };
  } catch {
    return null;
  }
}

export default function PelangganScreen({ navigation }: any) {
  const [list, setList] = useState<Pelanggan[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [detailItem, setDetailItem] = useState<any>(null);

  // Form fields
  const [fNama, setFNama] = useState("");
  const [fHp, setFHp] = useState("");
  const [fAlamat, setFAlamat] = useState("");

  const load = (q = search) => setList(getAllPelanggan(q));

  useFocusEffect(
    useCallback(() => {
      load();
    }, []),
  );

  const openTambah = () => {
    setEditItem(null);
    setFNama("");
    setFHp("");
    setFAlamat("");
    setShowForm(true);
  };

  const openEdit = (item: Pelanggan) => {
    setEditItem(item);
    setFNama(item.nama);
    setFHp(item.no_hp || "");
    setFAlamat((item as any).alamat || "");
    setShowForm(true);
  };

  const openDetail = (item: Pelanggan) => {
    const detail = getPelangganDetail(item.id);
    setDetailItem(detail);
    setShowDetail(true);
  };

  const handleSimpan = () => {
    if (!fNama.trim()) {
      Alert.alert("Error", "Nama pelanggan wajib diisi");
      return;
    }
    if (editItem) editPelanggan(editItem.id, fNama, fHp, fAlamat);
    else tambahPelanggan(fNama, fHp, fAlamat);
    setShowForm(false);
    load();
  };

  const handleHapus = (item: Pelanggan) => {
    Alert.alert("Hapus", `Hapus pelanggan "${item.nama}"?`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: () => {
          hapusPelanggan(item.id);
          load();
        },
      },
    ]);
  };

  const totalOmset = list.reduce((s, p) => s + (p.total_beli || 0), 0);

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Pelanggan</Text>
          <Text style={s.headerSub}>{list.length} pelanggan terdaftar</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={openTambah}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.addBtnTxt}>Tambah</Text>
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={s.summaryRow}>
        <View style={s.summaryCard}>
          <Text style={s.summaryLabel}>Total Pelanggan</Text>
          <Text style={s.summaryVal}>{list.length}</Text>
        </View>
        <View style={s.summaryCard}>
          <Text style={s.summaryLabel}>Total Omset</Text>
          <Text style={[s.summaryVal, { color: "#86EFAC", fontSize: 13 }]}>
            {formatRupiah(totalOmset)}
          </Text>
        </View>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={15} color={Colors.textMuted} />
        <TextInput
          style={s.searchInput}
          placeholder="Cari nama atau nomor HP..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={(v) => {
            setSearch(v);
            load(v);
          }}
        />
        {search.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearch("");
              load("");
            }}>
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={list}
        keyExtractor={(i) => i.id.toString()}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="people-outline" size={48} color="#D1D5DB" />
            <Text style={s.emptyTxt}>
              {search ? "Pelanggan tidak ditemukan" : "Belum ada pelanggan"}
            </Text>
            <Text style={s.emptySub}>
              Tambah pelanggan untuk lacak riwayat belanja
            </Text>
            {!search && (
              <TouchableOpacity style={s.emptyBtn} onPress={openTambah}>
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={s.emptyBtnTxt}>Tambah Pelanggan</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.card}
            onPress={() => openDetail(item)}
            activeOpacity={0.8}>
            <View style={s.avatar}>
              <Text style={s.avatarTxt}>
                {item.nama.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardNama}>{item.nama}</Text>
              {item.no_hp ? <Text style={s.cardSub}>{item.no_hp}</Text> : null}
              {item.total_beli > 0 && (
                <Text style={s.cardBeli}>
                  Total beli: {formatRupiah(item.total_beli)}
                </Text>
              )}
            </View>
            <View style={s.cardActions}>
              <TouchableOpacity
                style={s.editBtn}
                onPress={() => openEdit(item)}>
                <Ionicons
                  name="pencil-outline"
                  size={14}
                  color={Colors.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={s.hapusBtn}
                onPress={() => handleHapus(item)}>
                <Ionicons
                  name="trash-outline"
                  size={14}
                  color={Colors.danger}
                />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* ── Modal Form Tambah/Edit ── */}
      <Modal visible={showForm} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <TouchableOpacity
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: "rgba(0,0,0,0.5)" },
            ]}
            onPress={() => setShowForm(false)}
            activeOpacity={1}
          />
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>
              {editItem ? "Edit Pelanggan" : "Tambah Pelanggan"}
            </Text>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              {[
                {
                  label: "Nama *",
                  val: fNama,
                  set: setFNama,
                  kb: "default",
                  ph: "Nama pelanggan",
                  max: 60,
                },
                {
                  label: "No. HP",
                  val: fHp,
                  set: setFHp,
                  kb: "phone-pad",
                  ph: "08xxxxxxxxxx",
                  max: 16,
                },
                {
                  label: "Alamat",
                  val: fAlamat,
                  set: setFAlamat,
                  kb: "default",
                  ph: "Alamat (opsional)",
                  max: 100,
                },
              ].map((f, i) => (
                <View key={i}>
                  <Text style={s.fieldLabel}>{f.label}</Text>
                  <View style={s.inputWrap}>
                    <TextInput
                      style={s.input}
                      placeholder={f.ph}
                      placeholderTextColor={Colors.textDisabled}
                      keyboardType={f.kb as any}
                      value={f.val}
                      onChangeText={f.set}
                      maxLength={f.max}
                    />
                  </View>
                </View>
              ))}
              <View style={s.sheetBtns}>
                <TouchableOpacity
                  style={s.btnBatal}
                  onPress={() => setShowForm(false)}>
                  <Text style={s.btnBatalTxt}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.btnSimpan, !fNama.trim() && { opacity: 0.5 }]}
                  disabled={!fNama.trim()}
                  onPress={handleSimpan}>
                  <Text style={s.btnSimpanTxt}>Simpan</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Modal Detail Pelanggan ── */}
      <Modal visible={showDetail} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <TouchableOpacity
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: "rgba(0,0,0,0.5)" },
            ]}
            onPress={() => setShowDetail(false)}
            activeOpacity={1}
          />
          <View style={[s.sheet, { maxHeight: "80%" }]}>
            <View style={s.sheetHandle} />
            {detailItem && (
              <>
                {/* Header detail */}
                <View style={s.detailHeader}>
                  <View
                    style={[
                      s.avatar,
                      { width: 52, height: 52, borderRadius: 26 },
                    ]}>
                    <Text style={[s.avatarTxt, { fontSize: 22 }]}>
                      {detailItem.nama?.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.detailNama}>{detailItem.nama}</Text>
                    {detailItem.no_hp ? (
                      <Text style={s.detailSub}>{detailItem.no_hp}</Text>
                    ) : null}
                    {(detailItem as any).alamat ? (
                      <Text style={s.detailSub}>
                        {(detailItem as any).alamat}
                      </Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setShowDetail(false);
                      openEdit(detailItem);
                    }}>
                    <Ionicons
                      name="pencil-outline"
                      size={18}
                      color={Colors.primary}
                    />
                  </TouchableOpacity>
                </View>

                {/* Stats */}
                <View style={s.detailStats}>
                  <View style={s.detailStat}>
                    <Text style={s.detailStatLabel}>Total Belanja</Text>
                    <Text style={[s.detailStatVal, { color: Colors.primary }]}>
                      {formatRupiah(detailItem.total_beli || 0)}
                    </Text>
                  </View>
                  <View style={s.detailStatSep} />
                  <View style={s.detailStat}>
                    <Text style={s.detailStatLabel}>Riwayat Transaksi</Text>
                    <Text style={s.detailStatVal}>
                      {detailItem.riwayat?.length || 0} trx
                    </Text>
                  </View>
                </View>

                {/* Riwayat */}
                <Text style={s.fieldLabel}>RIWAYAT PEMBELIAN TERAKHIR</Text>
                {detailItem.riwayat?.length === 0 ? (
                  <View style={{ alignItems: "center", padding: 20 }}>
                    <Text style={{ color: Colors.textMuted, fontSize: 13 }}>
                      Belum ada transaksi
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    style={{ maxHeight: 220 }}
                    showsVerticalScrollIndicator={false}>
                    {detailItem.riwayat?.map((t: any, i: number) => (
                      <View key={i} style={s.riwayatRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.riwayatNo}>{t.no_trx}</Text>
                          <Text style={s.riwayatWaktu}>
                            {t.waktu?.slice(0, 16).replace("T", " ")}
                          </Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={s.riwayatTotal}>
                            {formatRupiah(t.total)}
                          </Text>
                          <Text style={s.riwayatMetode}>
                            {t.metode_bayar?.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </>
            )}
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
    paddingBottom: 12,
  },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,.55)", fontSize: 12, marginTop: 2 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,.2)",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
  },
  addBtnTxt: { color: "#fff", fontSize: 13, fontWeight: "700" },

  summaryRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,.12)",
    borderRadius: 12,
    padding: 12,
  },
  summaryLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,.5)",
    marginBottom: 4,
  },
  summaryVal: { fontSize: 18, fontWeight: "800", color: "#fff" },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    marginHorizontal: 14,
    marginBottom: 4,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },

  listContent: {
    padding: 14,
    gap: 10,
    backgroundColor: Colors.background,
    flexGrow: 1,
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: { color: "#fff", fontSize: 18, fontWeight: "800" },
  cardNama: { fontSize: 14, fontWeight: "700", color: Colors.text },
  cardSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  cardBeli: {
    fontSize: 11,
    color: Colors.success,
    marginTop: 3,
    fontWeight: "600",
  },
  cardActions: { flexDirection: "row", gap: 6 },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  hapusBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: Colors.dangerLight,
    alignItems: "center",
    justifyContent: "center",
  },

  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTxt: { fontSize: 15, fontWeight: "700", color: Colors.textMuted },
  emptySub: { fontSize: 13, color: Colors.textLight, textAlign: "center" },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
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
    marginBottom: 16,
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
    backgroundColor: Colors.primary,
    alignItems: "center",
  },
  btnSimpanTxt: { fontWeight: "800", color: "#fff" },

  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  detailNama: { fontSize: 16, fontWeight: "800", color: Colors.text },
  detailSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  detailStats: {
    flexDirection: "row",
    backgroundColor: Colors.background,
    borderRadius: 12,
    marginBottom: 12,
  },
  detailStat: { flex: 1, alignItems: "center", padding: 14 },
  detailStatSep: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: 10,
  },
  detailStatLabel: { fontSize: 11, color: Colors.textMuted, marginBottom: 4 },
  detailStatVal: { fontSize: 16, fontWeight: "800", color: Colors.text },

  riwayatRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  riwayatNo: { fontSize: 12, fontWeight: "700", color: Colors.text },
  riwayatWaktu: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  riwayatTotal: { fontSize: 13, fontWeight: "800", color: Colors.primary },
  riwayatMetode: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
});
