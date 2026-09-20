// src/screens/main/TambahKonsinyasiScreen.tsx
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Modal,
  FlatList,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants";
import { formatRupiah } from "../../utils/format";
import { getAllProduk } from "../../db/produkRepo";
import {
  initKonsinyasiTables,
  getAllKonsinyor,
  tambahKonsinyasi,
} from "../../db/konsinyasiRepo";

export default function TambahKonsinyasiScreen({ navigation }: any) {
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

  useFocusEffect(
    useCallback(() => {
      initKonsinyasiTables();
      setKonsiniyorList(getAllKonsinyor());
      setProdukList(getAllProduk("", 0));
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
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Tambah Konsinyasi</Text>
        <TouchableOpacity onPress={handleSimpan}>
          <Text style={s.headerSave}>Simpan</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Preview card */}
        {totalNilai > 0 && (
          <View style={s.previewCard}>
            <Text style={s.previewLabel}>Total Nilai Titipan</Text>
            <Text style={s.previewVal}>{formatRupiah(totalNilai)}</Text>
            <Text style={s.previewSub}>
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
        <Text style={s.fieldLabel}>PRODUK DARI DAFTAR (OPSIONAL)</Text>
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
              : "Pilih produk yang sudah ada..."}
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

        {/* Nama manual */}
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
          <Text style={s.suffix}>pcs</Text>
        </View>

        {/* Harga Jual */}
        <Text style={s.fieldLabel}>HARGA JUAL</Text>
        <View style={s.inputWrap}>
          <Text style={s.prefix}>Rp</Text>
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
          <Text style={s.prefix}>Rp</Text>
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

        {/* Ringkasan */}
        {totalNilai > 0 && (
          <View style={s.ringkasanCard}>
            <Text style={s.ringkasanTitle}>Ringkasan</Text>
            {[
              { label: "Konsinyor", val: selectedKonsinyor?.nama || "—" },
              { label: "Produk", val: namaProdukFinal || "—" },
              { label: "Qty Masuk", val: `${qtyNum} pcs` },
              { label: "Harga Jual", val: formatRupiah(hargaJualNum) },
              { label: "Harga/Titipan", val: formatRupiah(hargaKonNum) },
              {
                label: "Untung/pcs",
                val: formatRupiah(untungPerPcs),
                bold: true,
              },
              {
                label: "Total Titipan",
                val: formatRupiah(totalNilai),
                bold: true,
              },
            ].map((row, i) => (
              <View key={i} style={s.ringkasanRow}>
                <Text style={s.ringkasanKey}>{row.label}</Text>
                <Text
                  style={[
                    s.ringkasanVal,
                    row.bold && { color: Colors.primary, fontWeight: "800" },
                  ]}>
                  {row.val}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Tombol simpan */}
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

      {/* ── Modal Pilih Konsinyor ── */}
      <Modal visible={showPilihKonsinyor} transparent animationType="slide">
        <SafeAreaView style={{ flex: 1, justifyContent: "flex-end" }}>
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
                style={s.addBtn}
                onPress={() => {
                  setShowPilihKonsinyor(false);
                  navigation.navigate("KonsiniyorList");
                }}>
                <Ionicons name="add" size={14} color="#fff" />
                <Text style={[s.addBtnTxt, { fontSize: 11 }]}>Baru</Text>
              </TouchableOpacity>
            </View>

            {konsiniyorList.length === 0 ? (
              <View
                style={{ alignItems: "center", paddingVertical: 32, gap: 10 }}>
                <Ionicons name="people-outline" size={44} color="#D1D5DB" />
                <Text style={s.emptyTxt}>Belum ada konsinyor</Text>
                <TouchableOpacity
                  style={s.btnSimpanFull}
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
        </SafeAreaView>
      </Modal>

      {/* ── Modal Pilih Produk ── */}
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

            {produkList.length === 0 ? (
              <View
                style={{ alignItems: "center", paddingVertical: 32, gap: 8 }}>
                <Ionicons name="cube-outline" size={44} color="#D1D5DB" />
                <Text style={s.emptyTxt}>Belum ada produk</Text>
              </View>
            ) : (
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
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  scroll: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40, gap: 8 },
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

  previewCard: {
    backgroundColor: "#059669",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    marginBottom: 4,
  },
  previewLabel: {
    color: "rgba(255,255,255,.6)",
    fontSize: 12,
    marginBottom: 6,
  },
  previewVal: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -1,
  },
  previewSub: { color: "rgba(255,255,255,.65)", fontSize: 12, marginTop: 4 },

  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textMuted,
    marginBottom: 6,
    marginTop: 8,
    letterSpacing: 0.5,
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
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
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
  suffix: { fontSize: 13, color: Colors.textMuted },

  ringkasanCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  ringkasanTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 4,
  },
  ringkasanRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ringkasanKey: { fontSize: 13, color: Colors.textMuted },
  ringkasanVal: { fontSize: 13, fontWeight: "600", color: Colors.text },

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
  btnSimpanTxt: { fontWeight: "800", color: "#fff", fontSize: 15 },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#059669",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 18,
  },
  addBtnTxt: { color: "#fff", fontSize: 13, fontWeight: "700" },

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

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: { color: "#fff", fontSize: 16, fontWeight: "800" },

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

  emptyTxt: { fontSize: 15, fontWeight: "700", color: Colors.textMuted },
});
