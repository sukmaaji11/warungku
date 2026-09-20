// src/screens/main/KategoriScreen.tsx
import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  TextInput, Modal, Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants";
import { getDB } from "../../db/database";

// ── DB ─────────────────────────────────────────────────────────────────────────
function initKategoriDefault() {
  const db = getDB();

  // 1. Hapus SEMUA kategori lama berdasarkan nama persis (tanpa emoji)
  try {
    db.execSync(`
      UPDATE produk SET kategori_id = 1
      WHERE kategori_id IN (
        SELECT id FROM kategori WHERE id > 1 AND (
          nama IN ('Makanan','Minuman','Snack','Mie','Roti','Dapur','Lainnya',
                   'Sembako','Bumbu','Rokok','Snack & Cemilan','Makanan Instan',
                   'Bumbu & Dapur','Kebutuhan Rumah Tangga','Perlengkapan Harian',
                   'Plastik & Kemasan','Layanan & Digital')
          OR (LENGTH(nama) < 4)
        )
      )
    `);
    db.execSync(`
      DELETE FROM kategori WHERE id > 1 AND (
        nama IN ('Makanan','Minuman','Snack','Mie','Roti','Dapur','Lainnya',
                 'Sembako','Bumbu','Rokok','Snack & Cemilan','Makanan Instan',
                 'Bumbu & Dapur','Kebutuhan Rumah Tangga','Perlengkapan Harian',
                 'Plastik & Kemasan','Layanan & Digital')
        OR (LENGTH(nama) < 4)
      )
    `);
  } catch {}

  // 2. Insert kategori default dengan emoji
  db.execSync(`
    INSERT OR IGNORE INTO kategori (id, nama) VALUES
    (1,  'Semua'),
    (2,  'Rokok'),
    (3,  'Minuman'),
    (4,  'Snack & Cemilan'),
    (5,  'Makanan Instan'),
    (6,  'Sembako'),
    (7,  'Bumbu & Dapur'),
    (8,  'Kebutuhan Rumah Tangga'),
    (9,  'Perlengkapan Harian'),
    (10, 'Plastik & Kemasan'),
    (11, 'Layanan & Digital'),
    (12, 'Lainnya')
  `);

  // 3. Force update nama dengan emoji — pakai REPLACE supaya pasti ter-update
  const EMOJI_MAP: [number, string][] = [
    [2,  '🔴 Rokok'],
    [3,  '🥤 Minuman'],
    [4,  '🍿 Snack & Cemilan'],
    [5,  '🍜 Makanan Instan'],
    [6,  '🌾 Sembako'],
    [7,  '🧂 Bumbu & Dapur'],
    [8,  '🧹 Kebutuhan Rumah Tangga'],
    [9,  '🪥 Perlengkapan Harian'],
    [10, '🛍️ Plastik & Kemasan'],
    [11, '📱 Layanan & Digital'],
    [12, '📦 Lainnya'],
  ];
  for (const [id, nama] of EMOJI_MAP) {
    try {
      db.runSync(`UPDATE kategori SET nama=? WHERE id=?`, [nama, id]);
    } catch {}
  }
}

function getAllKategori(): any[] {
  try {
    // FIX 1: hapus initKategoriDefault() dari sini — tidak boleh dipanggil setiap render
    // FIX 2: "Semua" (id=1) harus COUNT semua produk, bukan hanya yang kategori_id=1
    return getDB().getAllSync(
      `SELECT k.*,
         CASE
           WHEN k.id = 1 THEN (SELECT COUNT(*) FROM produk WHERE aktif = 1)
           ELSE COUNT(p.id)
         END as jumlah_produk
       FROM kategori k
       LEFT JOIN produk p ON p.kategori_id = k.id AND p.aktif = 1
       GROUP BY k.id ORDER BY k.id ASC`,
    ) as any[];
  } catch {
    return [];
  }
}

function tambahKategori(nama: string) {
  getDB().runSync(`INSERT INTO kategori (nama) VALUES (?)`, [nama.trim()]);
}

function editKategori(id: number, nama: string) {
  getDB().runSync(`UPDATE kategori SET nama = ? WHERE id = ?`, [nama.trim(), id]);
}

function hapusKategori(id: number) {
  getDB().runSync(`UPDATE produk SET kategori_id = 1 WHERE kategori_id = ?`, [id]);
  getDB().runSync(`DELETE FROM kategori WHERE id = ?`, [id]);
}

const EMOJI_LIST = [
  "🚬","🥤","🍿","🍜","🌾","🧂","🧹","🪥","🛍️","📱","📦",
  "🛒","🍫","🥩","💊","🎁","🏪","✏️","🔧","🧺","🍞","🧴",
  "🍎","🥚","🧃","☕","🍦","🥗","🧇","🫙",
];

// Kategori yang tidak boleh dihapus (hanya "Semua")
const PROTECTED_ID = 1;

export default function KategoriScreen({ navigation }: any) {
  const [list, setList]         = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [namaInput, setNamaInput] = useState("");
  const [emoji, setEmoji]       = useState("📦");

  const load = () => setList(getAllKategori());
  useFocusEffect(useCallback(() => { load(); }, []));

  const openTambah = () => {
    setEditItem(null); setNamaInput(""); setEmoji("📦");
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    // Coba pisah emoji dari nama
    const trimmed = item.nama.trim();
    // Cek apakah karakter pertama adalah emoji (panjang > 1 di JS karena surrogate pair)
    const match = trimmed.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u);
    if (match) {
      setEmoji(match[0].trim());
      setNamaInput(trimmed.slice(match[0].length).trim());
    } else {
      setEmoji("📦");
      setNamaInput(trimmed);
    }
    setShowModal(true);
  };

  const handleSimpan = () => {
    if (!namaInput.trim()) { Alert.alert("Error", "Nama kategori wajib diisi"); return; }
    const fullName = `${emoji} ${namaInput.trim()}`;
    if (editItem) {
      editKategori(editItem.id, fullName);
    } else {
      tambahKategori(fullName);
    }
    load(); setShowModal(false);
  };

  const handleHapus = (item: any) => {
    if (item.id === PROTECTED_ID) {
      Alert.alert("Info", "Kategori 'Semua' tidak bisa dihapus");
      return;
    }
    Alert.alert(
      "Hapus Kategori",
      `Hapus "${item.nama}"?\n${item.jumlah_produk > 0 ? `${item.jumlah_produk} produk akan dipindah ke "Semua".` : ""}`,
      [
        { text: "Batal", style: "cancel" },
        { text: "Hapus", style: "destructive", onPress: () => { hapusKategori(item.id); load(); } },
      ]
    );
  };

  // Ekstrak emoji dari nama kategori untuk ditampilkan
  const getEmoji = (nama: string): string => {
    const match = nama.trim().match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})/u);
    return match ? match[0] : "📦";
  };

  const getNamaOnly = (nama: string): string => {
    const match = nama.trim().match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u);
    return match ? nama.trim().slice(match[0].length) : nama.trim();
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Kelola Kategori</Text>
          <Text style={s.headerSub}>{list.length} kategori</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={openTambah}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.addBtnTxt}>Tambah</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={list}
        keyExtractor={i => i.id.toString()}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="albums-outline" size={44} color="#D1D5DB" />
            <Text style={s.emptyTxt}>Belum ada kategori</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isProtected = item.id === PROTECTED_ID;
          return (
            <View style={[s.card, isProtected && { opacity: 0.5 }]}>
              <View style={s.katIconWrap}>
                <Text style={{ fontSize: 22 }}>{getEmoji(item.nama)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.katNama}>{getNamaOnly(item.nama)}</Text>
                <Text style={s.katJumlah}>{item.jumlah_produk} produk</Text>
              </View>
              {!isProtected && (
                <View style={s.cardActions}>
                  <TouchableOpacity style={s.editBtn} onPress={() => openEdit(item)}>
                    <Ionicons name="pencil-outline" size={15} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={s.hapusBtn} onPress={() => handleHapus(item)}>
                    <Ionicons name="trash-outline" size={15} color={Colors.danger} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
      />

      {/* Modal Tambah/Edit */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <TouchableOpacity
            style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.5)" }]}
            onPress={() => setShowModal(false)} activeOpacity={1} />
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>
              {editItem ? "Edit Kategori" : "Tambah Kategori"}
            </Text>

            {/* Pilih emoji */}
            <Text style={s.fieldLabel}>IKON</Text>
            <View style={s.emojiGrid}>
              {EMOJI_LIST.map(e => (
                <TouchableOpacity
                  key={e}
                  style={[s.emojiBtn, emoji === e && s.emojiBtnActive]}
                  onPress={() => setEmoji(e)}>
                  <Text style={{ fontSize: 20 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Nama */}
            <Text style={s.fieldLabel}>NAMA KATEGORI</Text>
            <View style={s.inputWrap}>
              <Text style={{ fontSize: 18, marginRight: 8 }}>{emoji}</Text>
              <TextInput
                style={s.input}
                placeholder="Nama kategori..."
                placeholderTextColor={Colors.textDisabled}
                value={namaInput}
                onChangeText={setNamaInput}
                maxLength={30}
                autoFocus
              />
            </View>

            {/* Preview */}
            {namaInput.trim() ? (
              <View style={s.previewWrap}>
                <Text style={s.previewLabel}>Preview:</Text>
                <View style={s.previewChip}>
                  <Text style={{ fontSize: 14 }}>{emoji}</Text>
                  <Text style={s.previewTxt}>{namaInput.trim()}</Text>
                </View>
              </View>
            ) : null}

            <View style={s.sheetBtns}>
              <TouchableOpacity style={s.btnBatal} onPress={() => setShowModal(false)}>
                <Text style={s.btnBatalTxt}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btnSimpan, !namaInput.trim() && { opacity: 0.5 }]}
                disabled={!namaInput.trim()}
                onPress={handleSimpan}>
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
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14, gap: 10,
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,.15)", alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  headerSub:   { color: "rgba(255,255,255,.55)", fontSize: 12 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,.15)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  addBtnTxt: { color: "#fff", fontSize: 13, fontWeight: "700" },

  listContent: { padding: 14, gap: 10, backgroundColor: Colors.background, flexGrow: 1 },
  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderRadius: 14, padding: 14,
    borderWidth: 0.5, borderColor: Colors.border,
  },
  katIconWrap: { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.background, alignItems: "center", justifyContent: "center" },
  katNama:     { fontSize: 15, fontWeight: "700", color: Colors.text },
  katJumlah:   { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  cardActions: { flexDirection: "row", gap: 8 },
  editBtn:  { width: 32, height: 32, borderRadius: 9, backgroundColor: Colors.primaryLight, alignItems: "center", justifyContent: "center" },
  hapusBtn: { width: 32, height: 32, borderRadius: 9, backgroundColor: Colors.dangerLight,  alignItems: "center", justifyContent: "center" },
  empty:    { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTxt: { fontSize: 15, fontWeight: "700", color: Colors.textMuted },

  sheet:       { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  sheetHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  sheetTitle:  { fontSize: 17, fontWeight: "800", color: Colors.text, marginBottom: 14 },
  fieldLabel:  { fontSize: 11, fontWeight: "700", color: Colors.textMuted, marginBottom: 8, marginTop: 12, letterSpacing: 0.5 },

  emojiGrid:     { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  emojiBtn:      { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.background, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "transparent" },
  emojiBtnActive:{ borderColor: Colors.primary, backgroundColor: Colors.primaryLight },

  inputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14 },
  input:     { flex: 1, paddingVertical: 13, fontSize: 15, color: Colors.text },

  previewWrap: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  previewLabel:{ fontSize: 11, color: Colors.textMuted },
  previewChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  previewTxt:  { fontSize: 13, fontWeight: "700", color: Colors.primary },

  sheetBtns:   { flexDirection: "row", gap: 10, marginTop: 20 },
  btnBatal:    { flex: 1, padding: 14, borderRadius: 12, backgroundColor: Colors.background, alignItems: "center" },
  btnBatalTxt: { fontWeight: "700", color: Colors.textMuted },
  btnSimpan:   { flex: 2, padding: 14, borderRadius: 12, backgroundColor: Colors.primary, alignItems: "center" },
  btnSimpanTxt:{ fontWeight: "800", color: "#fff" },
});