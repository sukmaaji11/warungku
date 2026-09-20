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
  initKonsinyasiTables,
} from "../../db/konsinyasiRepo";

export default function KonsiniyorListScreen({ navigation }: any) {
  const [list, setList] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [nama, setNama] = useState("");
  const [noHp, setNoHp] = useState("");
  const [alamat, setAlamat] = useState("");
  const [catatan, setCatatan] = useState("");

  const load = () => setList(getAllKonsinyor());

  useFocusEffect(
    useCallback(() => {
      initKonsinyasiTables();
      load();
    }, []),
  );

  const openTambah = () => {
    setEditItem(null);
    setNama("");
    setNoHp("");
    setAlamat("");
    setCatatan("");
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setNama(item.nama);
    setNoHp(item.no_hp || "");
    setAlamat(item.alamat || "");
    setCatatan(item.catatan || "");
    setShowModal(true);
  };

  const handleSimpan = () => {
    if (!nama.trim()) {
      Alert.alert("Error", "Nama konsinyor wajib diisi");
      return;
    }
    if (editItem) editKonsinyor(editItem.id, nama, noHp, alamat, catatan);
    else tambahKonsinyor(nama, noHp, alamat, catatan);
    load();
    setShowModal(false);
  };

  const handleHapus = (item: any) => {
    Alert.alert(
      "Hapus Konsinyor",
      `Hapus "${item.nama}"? Semua data konsinyasi terkait akan diarsipkan.`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: () => {
            hapusKonsinyor(item.id);
            load();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Konsinyor</Text>
          <Text style={s.headerSub}>{list.length} konsinyor/supplier</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={openTambah}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.addBtnTxt}>Tambah</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={list}
        keyExtractor={(i) => i.id.toString()}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="people-outline" size={48} color="#D1D5DB" />
            <Text style={s.emptyTxt}>Belum ada konsinyor</Text>
            <Text style={s.emptySub}>Tambah supplier/penitip barang</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={openTambah}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={s.emptyBtnTxt}>Tambah Konsinyor</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.avatar}>
              <Text style={s.avatarTxt}>
                {item.nama.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardNama}>{item.nama}</Text>
              {item.no_hp ? <Text style={s.cardSub}>{item.no_hp}</Text> : null}
              {item.alamat ? (
                <Text style={s.cardSub} numberOfLines={1}>
                  {item.alamat}
                </Text>
              ) : null}
              <View
                style={{
                  flexDirection: "row",
                  gap: 8,
                  marginTop: 6,
                  flexWrap: "wrap",
                }}>
                <View style={s.statPill}>
                  <Text style={s.statPillTxt}>
                    {item.jumlah_produk || 0} produk
                  </Text>
                </View>
                <View
                  style={[
                    s.statPill,
                    { backgroundColor: Colors.successLight },
                  ]}>
                  <Text style={[s.statPillTxt, { color: Colors.success }]}>
                    {formatRupiah(item.total_terjual || 0)} terjual
                  </Text>
                </View>
              </View>
            </View>
            <View style={s.cardActions}>
              <TouchableOpacity
                style={s.editBtn}
                onPress={() => openEdit(item)}>
                <Ionicons
                  name="pencil-outline"
                  size={15}
                  color={Colors.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={s.hapusBtn}
                onPress={() => handleHapus(item)}>
                <Ionicons
                  name="trash-outline"
                  size={15}
                  color={Colors.danger}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Modal Tambah/Edit */}
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
            <Text style={s.sheetTitle}>
              {editItem ? "Edit Konsinyor" : "Tambah Konsinyor"}
            </Text>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              {[
                {
                  label: "Nama *",
                  val: nama,
                  set: setNama,
                  kb: "default",
                  max: 60,
                  ph: "Nama supplier/penitip",
                },
                {
                  label: "No. HP",
                  val: noHp,
                  set: setNoHp,
                  kb: "phone-pad",
                  max: 13,
                  ph: "08xxxxxxxxxx",
                },
                {
                  label: "Alamat",
                  val: alamat,
                  set: setAlamat,
                  kb: "default",
                  max: 100,
                  ph: "Alamat (opsional)",
                },
                {
                  label: "Catatan",
                  val: catatan,
                  set: setCatatan,
                  kb: "default",
                  max: 100,
                  ph: "Catatan (opsional)",
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
                  onPress={() => setShowModal(false)}>
                  <Text style={s.btnBatalTxt}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.btnSimpan, !nama.trim() && { opacity: 0.5 }]}
                  disabled={!nama.trim()}
                  onPress={handleSimpan}>
                  <Text style={s.btnSimpanTxt}>Simpan</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
  sheetBtns: { flexDirection: "row", gap: 10, marginTop: 16, marginBottom: 8 },
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
