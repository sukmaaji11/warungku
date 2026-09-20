// src/screens/main/KonsiniyorListScreen.tsx
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
  getAllKonsinyor,
  tambahKonsinyor,
  editKonsinyor,
  hapusKonsinyor,
  getAllKonsinyasi,
  hapusKonsinyasi,
  editKonsinyasi,
  getLaporanKonsinyasi,
  getLaporanPerKonsinyor,
  initKonsinyasiTables,
  getAllProduk,
} from "../../db/konsinyasiRepo";
import { getAllProduk as getProdukList } from "../../db/produkRepo";

// ── LaporanKonsinyasiScreen ────────────────────────────────────────────────────
export function LaporanKonsinyasiScreen({ navigation }: any) {
  const [ringkasan, setRingkasan] = useState<any>({});
  const [perKonsinyor, setPerKonsinyor] = useState<any[]>([]);

  const load = () => {
    setRingkasan(getLaporanKonsinyasi());
    setPerKonsinyor(getLaporanPerKonsinyor());
  };
  useFocusEffect(
    useCallback(() => {
      load();
    }, []),
  );

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Laporan Konsinyasi</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 14, gap: 14 }}
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: Colors.background }}>
        {/* Ringkasan total */}
        <View style={l.ringkasanCard}>
          <Text style={l.ringkasanTitle}>Ringkasan Keseluruhan</Text>
          <View style={l.ringkasanGrid}>
            {[
              {
                label: "Total Item",
                val: (ringkasan.total_item || 0).toString(),
                color: Colors.text,
              },
              {
                label: "Qty Terjual",
                val: (ringkasan.total_qty_terjual || 0).toString(),
                color: Colors.success,
              },
              {
                label: "Nilai Titipan",
                val: formatRupiah(ringkasan.total_nilai_titipan || 0),
                color: Colors.text,
              },
              {
                label: "Bagi Hasil",
                val: formatRupiah(ringkasan.total_bagi_hasil || 0),
                color: Colors.danger,
              },
              {
                label: "Keuntungan",
                val: formatRupiah(ringkasan.total_keuntungan || 0),
                color: Colors.primary,
              },
            ].map((st, i) => (
              <View key={i} style={l.ringkasanStat}>
                <Text style={l.ringkasanLabel}>{st.label}</Text>
                <Text style={[l.ringkasanVal, { color: st.color }]}>
                  {st.val}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Per konsinyor */}
        <Text style={s.sectionTitle}>Per Konsinyor</Text>
        {perKonsinyor.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="bar-chart-outline" size={44} color="#D1D5DB" />
            <Text style={s.emptyTxt}>Belum ada data</Text>
          </View>
        ) : (
          perKonsinyor.map((k, i) => (
            <View key={i} style={l.konsiniyorCard}>
              <View style={l.konsiniyorHeader}>
                <View style={s.avatar}>
                  <Text style={s.avatarTxt}>
                    {k.nama?.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={l.konsiniyorNama}>{k.nama}</Text>
                  <Text style={l.konsiniyorSub}>
                    {k.jumlah_produk} produk · {k.total_terjual} terjual
                  </Text>
                </View>
              </View>
              <View style={l.konsiniyorStats}>
                <View style={l.konsiniyorStat}>
                  <Text style={l.konsiniyorStatLabel}>Bagi Hasil</Text>
                  <Text style={[l.konsiniyorStatVal, { color: Colors.danger }]}>
                    {formatRupiah(k.bagi_hasil || 0)}
                  </Text>
                </View>
                <View style={l.konsiniyorStat}>
                  <Text style={l.konsiniyorStatLabel}>Keuntungan</Text>
                  <Text
                    style={[l.konsiniyorStatVal, { color: Colors.success }]}>
                    {formatRupiah(k.keuntungan || 0)}
                  </Text>
                </View>
                <View style={l.konsiniyorStat}>
                  <Text style={l.konsiniyorStatLabel}>Nilai Sisa</Text>
                  <Text
                    style={[l.konsiniyorStatVal, { color: Colors.warning }]}>
                    {formatRupiah(k.nilai_sisa || 0)}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── TambahKonsinyasiScreen ─────────────────────────────────────────────────────
export function TambahKonsinyasiScreen({ navigation }: any) {
  const [konsiniyorList, setKonsiniyorList] = useState<any[]>([]);
  const [produkList, setProdukList] = useState<any[]>([]);
  const [selectedKonsinyor, setSelectedKonsinyor] = useState<any>(null);
  const [selectedProduk, setSelectedProduk] = useState<any>(null);
  const [showPilihKonsinyor, setShowPilihKonsinyor] = useState(false);
  const [showPilihProduk, setShowPilihProduk] = useState(false);
  const [namaProdukManual, setNamaProdukManual] = useState("");
  const [qtyMasuk, setQtyMasuk] = useState("");
  const [hargaJual, setHargaJual] = useState("");
  const [hargaKon, setHargaKon] = useState("");
  const [tglMasuk, setTglMasuk] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [catatan, setCatatan] = useState("");

  const { tambahKonsinyasi } = require("../../db/konsinyasiRepo");
  const { formatRupiah } = require("../../utils/format");

  useFocusEffect(
    useCallback(() => {
      initKonsinyasiTables();
      setKonsiniyorList(getAllKonsinyor());
      setProdukList(getProdukList("", 0));
    }, []),
  );

  const qtyNum = parseInt(qtyMasuk) || 0;
  const hargaJualNum = parseInt(hargaJual.replace(/\D/g, "")) || 0;
  const hargaKonNum = parseInt(hargaKon.replace(/\D/g, "")) || 0;
  const totalNilai = qtyNum * hargaKonNum;
  const untungPerPcs = hargaJualNum - hargaKonNum;

  const namaProdukFinal = selectedProduk
    ? selectedProduk.nama
    : namaProdukManual.trim();

  const handleSimpan = () => {
    if (!selectedKonsinyor) {
      Alert.alert("Error", "Pilih konsinyor dulu");
      return;
    }
    if (!namaProdukFinal) {
      Alert.alert("Error", "Nama produk wajib diisi");
      return;
    }
    if (qtyNum <= 0) {
      Alert.alert("Error", "Qty masuk harus lebih dari 0");
      return;
    }
    if (hargaKonNum <= 0) {
      Alert.alert("Error", "Harga konsinyasi wajib diisi");
      return;
    }

    tambahKonsinyasi({
      konsinyor_id: selectedKonsinyor.id,
      produk_id: selectedProduk?.id ?? undefined,
      nama_produk: namaProdukFinal,
      qty_masuk: qtyNum,
      harga_jual: hargaJualNum,
      harga_konsinyasi: hargaKonNum,
      tgl_masuk: tglMasuk,
      catatan,
    });

    Alert.alert("Berhasil", "Konsinyasi berhasil ditambahkan", [
      { text: "OK", onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Tambah Konsinyasi</Text>
        <TouchableOpacity onPress={handleSimpan}>
          <Text
            style={{ color: Colors.accent, fontSize: 15, fontWeight: "800" }}>
            Simpan
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: Colors.background }}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Preview */}
        {totalNilai > 0 && (
          <View
            style={{
              backgroundColor: "#059669",
              borderRadius: 16,
              padding: 18,
              alignItems: "center",
              marginBottom: 4,
            }}>
            <Text
              style={{
                color: "rgba(255,255,255,.6)",
                fontSize: 12,
                marginBottom: 6,
              }}>
              Total Nilai Titipan
            </Text>
            <Text
              style={{
                color: "#fff",
                fontSize: 28,
                fontWeight: "900",
                letterSpacing: -1,
              }}>
              {formatRupiah(totalNilai)}
            </Text>
            <Text
              style={{
                color: "rgba(255,255,255,.65)",
                fontSize: 12,
                marginTop: 4,
              }}>
              Untung/pcs: {formatRupiah(untungPerPcs)}
            </Text>
          </View>
        )}

        {/* Pilih Konsinyor */}
        <Text style={s.fieldLabel}>KONSINYOR *</Text>
        <TouchableOpacity
          style={s.pilihBtn}
          onPress={() => setShowPilihKonsinyor(true)}>
          <Ionicons
            name="business-outline"
            size={18}
            color={Colors.textMuted}
          />
          <Text
            style={[
              s.pilihBtnTxt,
              !selectedKonsinyor && { color: Colors.textDisabled },
            ]}>
            {selectedKonsinyor ? selectedKonsinyor.nama : "Pilih konsinyor..."}
          </Text>
          <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* Pilih Produk (opsional) */}
        <Text style={s.fieldLabel}>PRODUK (DARI DAFTAR PRODUK)</Text>
        <TouchableOpacity
          style={s.pilihBtn}
          onPress={() => setShowPilihProduk(true)}>
          <Ionicons name="cube-outline" size={18} color={Colors.textMuted} />
          <Text
            style={[
              s.pilihBtnTxt,
              !selectedProduk && { color: Colors.textDisabled },
            ]}>
            {selectedProduk
              ? selectedProduk.nama
              : "Pilih produk yang sudah ada (opsional)"}
          </Text>
          {selectedProduk ? (
            <TouchableOpacity onPress={() => setSelectedProduk(null)}>
              <Ionicons
                name="close-circle"
                size={16}
                color={Colors.textMuted}
              />
            </TouchableOpacity>
          ) : (
            <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
          )}
        </TouchableOpacity>

        {/* Nama manual jika tidak pilih dari produk */}
        {!selectedProduk && (
          <>
            <Text style={s.fieldLabel}>NAMA PRODUK *</Text>
            <View style={s.inputWrap}>
              <TextInput
                style={s.input}
                placeholder="Nama produk titipan"
                placeholderTextColor={Colors.textDisabled}
                value={namaProdukManual}
                onChangeText={setNamaProdukManual}
                maxLength={80}
              />
            </View>
          </>
        )}

        {/* Qty */}
        <Text style={s.fieldLabel}>QTY MASUK *</Text>
        <View style={s.inputWrap}>
          <Ionicons name="layers-outline" size={16} color={Colors.textMuted} />
          <TextInput
            style={s.input}
            placeholder="0"
            placeholderTextColor={Colors.textDisabled}
            keyboardType="numeric"
            value={qtyMasuk}
            onChangeText={(v) => setQtyMasuk(v.replace(/\D/g, ""))}
            maxLength={6}
          />
          <Text style={{ fontSize: 13, color: Colors.textMuted }}>pcs</Text>
        </View>

        {/* Harga Jual */}
        <Text style={s.fieldLabel}>HARGA JUAL</Text>
        <View style={s.inputWrap}>
          <Text
            style={{
              fontSize: 14,
              color: Colors.textMuted,
              fontWeight: "600",
              marginRight: 4,
            }}>
            Rp
          </Text>
          <TextInput
            style={s.input}
            placeholder="Harga jual ke pelanggan"
            placeholderTextColor={Colors.textDisabled}
            keyboardType="numeric"
            value={hargaJual}
            onChangeText={(v) => setHargaJual(v.replace(/\D/g, ""))}
          />
        </View>

        {/* Harga Konsinyasi */}
        <Text style={s.fieldLabel}>HARGA KONSINYASI * (bayar ke supplier)</Text>
        <View style={s.inputWrap}>
          <Text
            style={{
              fontSize: 14,
              color: Colors.textMuted,
              fontWeight: "600",
              marginRight: 4,
            }}>
            Rp
          </Text>
          <TextInput
            style={s.input}
            placeholder="Harga yang dibayar ke supplier"
            placeholderTextColor={Colors.textDisabled}
            keyboardType="numeric"
            value={hargaKon}
            onChangeText={(v) => setHargaKon(v.replace(/\D/g, ""))}
          />
        </View>

        {/* Tanggal */}
        <Text style={s.fieldLabel}>TANGGAL MASUK</Text>
        <View style={s.inputWrap}>
          <Ionicons
            name="calendar-outline"
            size={16}
            color={Colors.textMuted}
          />
          <TextInput
            style={s.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.textDisabled}
            value={tglMasuk}
            onChangeText={setTglMasuk}
            maxLength={10}
          />
        </View>

        {/* Catatan */}
        <Text style={s.fieldLabel}>CATATAN</Text>
        <View style={s.inputWrap}>
          <TextInput
            style={s.input}
            placeholder="Catatan (opsional)"
            placeholderTextColor={Colors.textDisabled}
            value={catatan}
            onChangeText={setCatatan}
            maxLength={100}
          />
        </View>

        <TouchableOpacity
          style={[
            s.btnSimpanFull,
            (!selectedKonsinyor ||
              !namaProdukFinal ||
              !qtyMasuk ||
              !hargaKon) && { opacity: 0.5 },
          ]}
          disabled={
            !selectedKonsinyor || !namaProdukFinal || !qtyMasuk || !hargaKon
          }
          onPress={handleSimpan}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          <Text style={s.btnSimpanTxt}>Simpan Konsinyasi</Text>
        </TouchableOpacity>

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Modal Pilih Konsinyor */}
      <Modal visible={showPilihKonsinyor} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <TouchableOpacity
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: "rgba(0,0,0,0.5)" },
            ]}
            onPress={() => setShowPilihKonsinyor(false)}
            activeOpacity={1}
          />
          <View style={[s.sheet, { maxHeight: "70%" }]}>
            <View style={s.sheetHandle} />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}>
              <Text style={s.sheetTitle}>Pilih Konsinyor</Text>
              <TouchableOpacity
                style={[
                  s.addBtn,
                  { paddingHorizontal: 10, paddingVertical: 7 },
                ]}
                onPress={() => {
                  setShowPilihKonsinyor(false);
                  navigation.navigate("KonsiniyorList");
                }}>
                <Ionicons name="add" size={14} color="#fff" />
                <Text style={[s.addBtnTxt, { fontSize: 11 }]}>Baru</Text>
              </TouchableOpacity>
            </View>
            {konsiniyorList.length === 0 ? (
              <View style={[s.empty, { paddingTop: 20 }]}>
                <Text style={s.emptyTxt}>Belum ada konsinyor</Text>
                <TouchableOpacity
                  style={[s.btnSimpanFull, { marginTop: 12 }]}
                  onPress={() => {
                    setShowPilihKonsinyor(false);
                    navigation.navigate("KonsiniyorList");
                  }}>
                  <Text style={s.btnSimpanTxt}>Tambah Konsinyor Dulu</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={konsiniyorList}
                keyExtractor={(k) => k.id.toString()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingBottom: 24 }}
                renderItem={({ item: k }) => (
                  <TouchableOpacity
                    style={[
                      s.pilihItem,
                      selectedKonsinyor?.id === k.id && s.pilihItemActive,
                    ]}
                    onPress={() => {
                      setSelectedKonsinyor(k);
                      setShowPilihKonsinyor(false);
                    }}>
                    <View style={s.avatar}>
                      <Text style={s.avatarTxt}>
                        {k.nama.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "700",
                          color: Colors.text,
                        }}>
                        {k.nama}
                      </Text>
                      {k.no_hp ? (
                        <Text style={{ fontSize: 12, color: Colors.textMuted }}>
                          {k.no_hp}
                        </Text>
                      ) : null}
                    </View>
                    {selectedKonsinyor?.id === k.id && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={Colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Modal Pilih Produk */}
      <Modal visible={showPilihProduk} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <TouchableOpacity
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: "rgba(0,0,0,0.5)" },
            ]}
            onPress={() => setShowPilihProduk(false)}
            activeOpacity={1}
          />
          <View style={[s.sheet, { maxHeight: "70%" }]}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Pilih Produk</Text>
            <FlatList
              data={produkList}
              keyExtractor={(p) => p.id.toString()}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 24 }}
              renderItem={({ item: p }) => (
                <TouchableOpacity
                  style={[
                    s.pilihItem,
                    selectedProduk?.id === p.id && s.pilihItemActive,
                  ]}
                  onPress={() => {
                    setSelectedProduk(p);
                    if (!hargaJual) setHargaJual(p.harga.toString());
                    if (!hargaKon && p.harga_modal)
                      setHargaKon(p.harga_modal.toString());
                    setShowPilihProduk(false);
                  }}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color: Colors.text,
                      }}>
                      {p.nama}
                    </Text>
                    <Text style={{ fontSize: 12, color: Colors.textMuted }}>
                      {formatRupiah(p.harga)} · Stok: {p.stok}
                    </Text>
                  </View>
                  {selectedProduk?.id === p.id && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={Colors.primary}
                    />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── SHARED STYLES ──────────────────────────────────────────────────────────────
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
  cardNama: { fontSize: 15, fontWeight: "700", color: Colors.text },
  cardSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  statPill: {
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statPillTxt: { fontSize: 11, fontWeight: "600", color: Colors.textMuted },
  cardActions: { flexDirection: "row", gap: 8 },
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
    backgroundColor: "#059669",
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 13,
    marginTop: 8,
  },
  emptyBtnTxt: { color: "#fff", fontSize: 14, fontWeight: "700" },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: Colors.textMuted },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "90%",
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
    marginTop: 8,
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
  btnSimpanFull: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#059669",
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
  },
  pilihBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  pilihBtnTxt: { flex: 1, fontSize: 14, color: Colors.text },
  pilihItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  pilihItemActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
});

// TransaksiKonsinyasi styles
const t = StyleSheet.create({
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
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
    gap: 8,
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
  hapusBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.dangerLight,
    borderRadius: 10,
    paddingVertical: 8,
  },
  hapusBtnTxt: { fontSize: 12, fontWeight: "700", color: Colors.danger },
});

// Laporan styles
const l = StyleSheet.create({
  ringkasanCard: {
    backgroundColor: Colors.primaryDark,
    borderRadius: 16,
    padding: 18,
  },
  ringkasanTitle: {
    color: "rgba(255,255,255,.6)",
    fontSize: 12,
    marginBottom: 14,
  },
  ringkasanGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  ringkasanStat: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "rgba(255,255,255,.08)",
    borderRadius: 10,
    padding: 12,
  },
  ringkasanLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,.5)",
    marginBottom: 4,
  },
  ringkasanVal: { fontSize: 15, fontWeight: "800" },
  konsiniyorCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
    gap: 12,
  },
  konsiniyorHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  konsiniyorNama: { fontSize: 15, fontWeight: "700", color: Colors.text },
  konsiniyorSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  konsiniyorStats: {
    flexDirection: "row",
    backgroundColor: Colors.background,
    borderRadius: 10,
    overflow: "hidden",
  },
  konsiniyorStat: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    borderRightWidth: 0.5,
    borderRightColor: Colors.border,
  },
  konsiniyorStatLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  konsiniyorStatVal: { fontSize: 14, fontWeight: "800" },
});
