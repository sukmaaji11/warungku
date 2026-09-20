import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  Modal,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Colors } from "../../constants/colors";
import {
  tambahProduk,
  updateProduk,
  hapusProduk,
  getProdukById,
  getAllKategori,
  Kategori,
  hapusKategori,
  tambahKategori,
} from "../../db/produkRepo";

import * as DocumentPicker from "expo-document-picker";
// import * as FileSystem from 'expo-file-system';
import * as XLSX from "xlsx";
import * as Sharing from "expo-sharing";

import * as FSLegacy from "expo-file-system/legacy";
import { File, Directory } from "expo-file-system/next";
import { formatRupiah } from "../../utils/format";

const SATUAN = ["pcs", "kg", "liter", "bungkus", "botol", "kotak", "sachet"];
const DEFAULT = {
  nama: "",
  harga: "",
  harga_modal: "",
  stok: "",
  stok_minimum: "5",
  kategori_id: null,
  barcode: "",
  satuan: "pcs",
  gambar: null as string | null,
  harga_grosir: "0",
  min_grosir: "0",
  aktif_grosir: 0,
};

// ────────────────────────────────────────────────
// BARCODE SCANNER MODAL
// ────────────────────────────────────────────────
function BarcodeScannerModal({
  visible,
  onScanned,
  onClose,
}: {
  visible: boolean;
  onScanned: (barcode: string, nama?: string) => void;
  onClose: () => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setScanned(false);
      setLoading(false);
    }
  }, [visible]);

  const handleScan = async ({ data }: { data: string }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);

    let namaOtomatis = "";
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${data}.json`,
        { signal: AbortSignal.timeout(5000) },
      );
      const json = await res.json();
      if (json.status === 1 && json.product) {
        namaOtomatis =
          json.product.product_name_id || json.product.product_name || "";
      }
    } catch {
      // offline atau timeout — lanjut tanpa nama
    }

    setLoading(false);
    onScanned(data, namaOtomatis);
  };

  if (!visible) return null;

  if (!permission?.granted) {
    return (
      <Modal visible animationType="slide">
        <SafeAreaView style={sc.permSafe}>
          <View style={sc.permBox}>
            <Ionicons
              name="camera-outline"
              size={64}
              color={Colors.textMuted}
            />
            <Text style={sc.permTitle}>Izin Kamera Diperlukan</Text>
            <Text style={sc.permDesc}>
              KasirKu butuh akses kamera untuk scan barcode produk
            </Text>
            <TouchableOpacity style={sc.permBtn} onPress={requestPermission}>
              <Text style={sc.permBtnTxt}>Izinkan Kamera</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={{ padding: 12 }}>
              <Text style={{ color: Colors.textMuted }}>Batal</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible animationType="slide">
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleScan}
          barcodeScannerSettings={{
            barcodeTypes: [
              "ean13",
              "ean8",
              "qr",
              "code128",
              "code39",
              "upc_a",
              "upc_e",
            ],
          }}>
          {/* Overlay gelap di atas */}
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)" }} />

          {/* Baris tengah: gelap | kotak scan | gelap */}
          <View style={{ flexDirection: "row", height: 240 }}>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)" }} />
            {/* Kotak scan */}
            <View style={sc.scanBox}>
              <View style={[sc.corner, sc.tl]} />
              <View style={[sc.corner, sc.tr]} />
              <View style={[sc.corner, sc.bl]} />
              <View style={[sc.corner, sc.br]} />
              {loading && <ActivityIndicator color="#fff" size="large" />}
            </View>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)" }} />
          </View>

          {/* Overlay gelap di bawah + hint + tombol close */}
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.55)",
              alignItems: "center",
              paddingTop: 24,
              gap: 16,
            }}>
            {loading ? (
              <Text style={sc.hint}>Mencari nama produk...</Text>
            ) : (
              <Text style={sc.hint}>Arahkan kamera ke barcode produk</Text>
            )}
            <TouchableOpacity onPress={onClose} style={sc.closeBtn}>
              <Ionicons name="close-circle" size={52} color="#fff" />
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    </Modal>
  );
}

function generateBarcode(): string {
  const ts = Date.now().toString().slice(-7);
  const rand = Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, "0");
  const base = `899${ts}${rand}`; // 12 digit
  // Check digit EAN-13
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(base[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return base + check;
}

async function saveImagePermanently(uri: string): Promise<string> {
  const FSLegacy = require("expo-file-system/legacy");
  const folder = FSLegacy.documentDirectory + "produk_images/";
  await FSLegacy.makeDirectoryAsync(folder, { intermediates: true });
  const fileName = `produk_${Date.now()}.jpg`;
  const destUri = folder + fileName;
  await FSLegacy.copyAsync({ from: uri, to: destUri });
  // Return nama file saja, bukan full path
  return fileName; // ← PERUBAHAN: hanya nama file
}

export function resolveGambarUri(
  gambar: string | null | undefined,
): string | undefined {
  if (!gambar) return undefined;
  const FSLegacy = require("expo-file-system/legacy");
  // Kalau sudah full path (data lama) → pakai langsung
  if (gambar.startsWith("file://") || gambar.startsWith("/")) return gambar;
  // Nama file saja (data baru) → resolve ke documentDirectory
  return FSLegacy.documentDirectory + "produk_images/" + gambar;
}

// ────────────────────────────────────────────────
// FORM PRODUK
// ────────────────────────────────────────────────
function FormProduk({ initial, onSave, onDelete, navigation }: any) {
  const [form, setForm] = useState(initial);
  const [kats, setKats] = useState<Kategori[]>([]);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [showTambahKat, setShowTambahKat] = useState(false);
  const [namaKatBaru, setNamaKatBaru] = useState("");

  const upd = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  useEffect(() => {
    setKats(getAllKategori().filter((k: Kategori) => k.id > 1));
  }, []);

  const margin =
    form.harga && form.harga_modal
      ? parseInt(form.harga) - parseInt(form.harga_modal || "0")
      : 0;

  // ── Pilih / Ambil Foto ──────────────────────
  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Izin Diperlukan", "KasirKu butuh akses galeri.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!res.canceled) {
      const permanentUri = await saveImagePermanently(res.assets[0].uri); // ← copy dulu
      upd("gambar", permanentUri); // ← baru simpan
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Izin Diperlukan", "KasirKu butuh akses kamera.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!res.canceled) {
      const permanentUri = await saveImagePermanently(res.assets[0].uri); // ← copy dulu
      upd("gambar", permanentUri); // ← baru simpan
    }
  };

  const handlePhotoPress = () => {
    Alert.alert(
      "Foto Produk",
      "Pilih sumber:",
      [
        { text: "📷  Ambil Foto", onPress: takePhoto },
        { text: "🖼  Dari Galeri", onPress: pickFromGallery },
        form.gambar
          ? {
              text: "🗑  Hapus Foto",
              style: "destructive",
              onPress: () => upd("gambar", null),
            }
          : { text: "Batal", style: "cancel" },
        form.gambar ? { text: "Batal", style: "cancel" } : undefined,
      ].filter(Boolean) as any,
    );
  };

  // ── Setelah barcode di-scan ──────────────────
  const handleBarcodeScanned = (barcode: string, nama?: string) => {
    setScannerVisible(false);
    upd("barcode", barcode);

    if (nama) {
      if (!form.nama) {
        upd("nama", nama);
        Alert.alert(
          "✅ Produk Ditemukan!",
          `Barcode: ${barcode}\nNama: "${nama}"\n\nNama sudah diisi otomatis.`,
        );
      } else {
        Alert.alert(
          "✅ Barcode Terdeteksi",
          `Barcode: ${barcode}\nNama di database: "${nama}"\n\nGunakan nama ini?`,
          [
            { text: "Ya, Gunakan", onPress: () => upd("nama", nama) },
            { text: "Tidak", style: "cancel" },
          ],
        );
      }
    } else {
      Alert.alert(
        "✅ Barcode Terdeteksi",
        `Barcode: ${barcode}\n\nNama tidak ditemukan di database online.\nSilakan isi nama manual.`,
      );
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {onDelete ? "Edit Produk" : "Tambah Produk"}
        </Text>
        <TouchableOpacity onPress={() => onSave(form)}>
          <Text style={s.headerSave}>Simpan</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled">
        {/* ── Foto Produk ── */}
        <Text style={s.sec}>FOTO PRODUK</Text>
        <View style={s.photoRow}>
          <TouchableOpacity style={s.photoBox} onPress={handlePhotoPress}>
            {form.gambar ? (
              <Image
                source={{ uri: resolveGambarUri(form.gambar) }}
                style={s.photoImg}
              />
            ) : (
              <View style={s.photoEmpty}>
                <Ionicons
                  name="image-outline"
                  size={40}
                  color={Colors.textMuted}
                />
                <Text style={s.photoEmptyTxt}>Tap untuk tambah foto</Text>
              </View>
            )}
            <View style={s.photoEditDot}>
              <Ionicons name="pencil" size={11} color="#fff" />
            </View>
          </TouchableOpacity>

          <View style={s.photoButtons}>
            <TouchableOpacity style={s.photoBtnItem} onPress={takePhoto}>
              <Ionicons name="camera" size={20} color={Colors.primary} />
              <Text style={s.photoBtnTxt}>Kamera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.photoBtnItem} onPress={pickFromGallery}>
              <Ionicons name="images" size={20} color={Colors.primary} />
              <Text style={s.photoBtnTxt}>Galeri</Text>
            </TouchableOpacity>
            {form.gambar && (
              <TouchableOpacity
                style={[s.photoBtnItem, { borderColor: Colors.danger }]}
                onPress={() => upd("gambar", null)}>
                <Ionicons name="trash" size={20} color={Colors.danger} />
                <Text style={[s.photoBtnTxt, { color: Colors.danger }]}>
                  Hapus
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Barcode ── */}
        <Text style={s.sec}>BARCODE</Text>
        <View style={s.card}>
          <View style={s.fieldRow}>
            <Ionicons
              name="barcode-outline"
              size={20}
              color={Colors.textMuted}
            />
            <TextInput
              style={s.input}
              value={form.barcode || ""}
              onChangeText={(v) => upd("barcode", v)}
              keyboardType="numeric"
              placeholder="Kosong jika tidak ada barcode"
              placeholderTextColor={Colors.textMuted}
            />
            {/* ← TOMBOL GENERATE BARU */}
            <TouchableOpacity
              style={s.genBtn}
              onPress={() => {
                const bc = generateBarcode();
                upd("barcode", bc);
                Alert.alert(
                  "✅ Barcode Dibuat",
                  `Barcode: ${bc}\n\nBarcode EAN-13 berhasil di-generate.`,
                );
              }}>
              <Ionicons name="barcode-outline" size={14} color="#fff" />
              <Text style={s.genBtnTxt}>Generate</Text>
            </TouchableOpacity>
            {/* ← TOMBOL SCAN EXISTING */}
            <TouchableOpacity
              style={s.scanBtn}
              onPress={() => setScannerVisible(true)}>
              <Ionicons name="scan" size={16} color="#fff" />
              <Text style={s.scanBtnTxt}>Scan</Text>
            </TouchableOpacity>
          </View>
          {/* Preview barcode yang sudah diisi */}
          {form.barcode ? (
            <View
              style={{
                paddingHorizontal: 16,
                paddingBottom: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}>
              <Ionicons
                name="checkmark-circle"
                size={14}
                color={Colors.success}
              />
              <Text
                style={{
                  fontSize: 12,
                  color: Colors.success,
                  fontWeight: "600",
                }}>
                {form.barcode}
              </Text>
              <TouchableOpacity onPress={() => upd("barcode", "")}>
                <Ionicons
                  name="close-circle"
                  size={16}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* ── Info Produk ── */}
        <Text style={s.sec}>INFORMASI PRODUK</Text>
        <View style={s.card}>
          <View style={s.fieldRow}>
            <Ionicons
              name="pricetag-outline"
              size={20}
              color={Colors.textMuted}
            />
            <TextInput
              style={s.input}
              value={form.nama}
              onChangeText={(v) => upd("nama", v)}
              placeholder="Nama produk *"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
          <View style={s.divider} />
          <View style={s.fieldRow}>
            <Ionicons name="scale-outline" size={20} color={Colors.textMuted} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flex: 1 }}>
              <View
                style={{ flexDirection: "row", gap: 6, paddingVertical: 6 }}>
                {SATUAN.map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[s.chip, form.satuan === st && s.chipActive]}
                    onPress={() => upd("satuan", st)}>
                    <Text
                      style={[
                        s.chipTxt,
                        form.satuan === st && s.chipTxtActive,
                      ]}>
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>

        {/* ── Harga ── */}
        <Text style={s.sec}>HARGA</Text>
        <View style={s.card}>
          <View style={s.fieldRow}>
            <Text style={s.prefix}>Rp</Text>
            <TextInput
              style={s.input}
              value={
                form.harga ? parseInt(form.harga).toLocaleString("id-ID") : ""
              }
              onChangeText={(v) => upd("harga", v.replace(/\D/g, ""))}
              keyboardType="numeric"
              placeholder="Harga jual *"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
          <View style={s.divider} />
          <View style={s.fieldRow}>
            <Text style={s.prefix}>Rp</Text>
            <TextInput
              style={s.input}
              value={
                form.harga_modal
                  ? parseInt(form.harga_modal).toLocaleString("id-ID")
                  : ""
              }
              onChangeText={(v) => upd("harga_modal", v.replace(/\D/g, ""))}
              keyboardType="numeric"
              placeholder="Harga modal (opsional)"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
          {margin > 0 && (
            <View style={s.marginBox}>
              <Ionicons name="trending-up" size={14} color={Colors.primary} />
              <Text style={s.marginTxt}>
                Margin: Rp {margin.toLocaleString("id-ID")} (
                {Math.round((margin / parseInt(form.harga)) * 100)}%)
              </Text>
            </View>
          )}
        </View>

        {/* ── Stok ── */}
        <Text style={s.sec}>STOK</Text>
        <View style={s.card}>
          <View style={s.fieldRow}>
            <Ionicons name="cube-outline" size={20} color={Colors.textMuted} />
            <TextInput
              style={s.input}
              value={form.stok}
              onChangeText={(v) => upd("stok", v.replace(/\D/g, ""))}
              keyboardType="numeric"
              placeholder="Jumlah stok awal"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
          <View style={s.divider} />
          <View style={s.fieldRow}>
            <Ionicons
              name="alert-circle-outline"
              size={20}
              color={Colors.textMuted}
            />
            <TextInput
              style={s.input}
              value={form.stok_minimum}
              onChangeText={(v) => upd("stok_minimum", v.replace(/\D/g, ""))}
              keyboardType="numeric"
              placeholder="Batas minimum stok (alert)"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </View>

        {/* ── Kategori ── */}
        <Text style={s.sec}>
          KATEGORI <Text style={{ color: Colors.danger }}>*</Text>
        </Text>
        {!form.kategori_id && (
          <Text
            style={{
              fontSize: 11,
              color: Colors.danger,
              marginBottom: 6,
              marginTop: -4,
            }}>
            Pilih salah satu kategori
          </Text>
        )}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 8,
          }}>
          {kats.map((k: Kategori) => (
            <TouchableOpacity
              key={k.id}
              style={[s.chip, form.kategori_id === k.id && s.chipActive]}
              onLongPress={() => {
                if (k.id <= 1) return; // tidak bisa hapus default
                Alert.alert("Hapus Kategori", `Hapus "${k.nama}"?`, [
                  { text: "Batal", style: "cancel" },
                  {
                    text: "Hapus",
                    style: "destructive",
                    onPress: () => {
                      hapusKategori(k.id);
                      setKats(
                        getAllKategori().filter((k: Kategori) => k.id > 1),
                      );
                    },
                  },
                ]);
              }}
              onPress={() => upd("kategori_id", k.id)}>
              <Text
                numberOfLines={1}
                style={[
                  s.chipTxt,
                  form.kategori_id === k.id && s.chipTxtActive,
                  form.kategori_id === k.id && { color: "#ffffff" },
                ]}>
                {k.nama}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Tombol tambah kategori */}
          <TouchableOpacity
            style={[
              s.chip,
              { borderStyle: "dashed", borderColor: Colors.primary },
            ]}
            onPress={() => setShowTambahKat(true)}>
            <Ionicons name="add" size={14} color={Colors.primary} />
            <Text style={[s.chipTxt, { color: Colors.primary }]}>Tambah</Text>
          </TouchableOpacity>
        </View>
        <Text
          style={{ fontSize: 10, color: Colors.textLight, marginBottom: 16 }}>
          💡 Long press untuk hapus kategori
        </Text>

        {/* Modal tambah kategori */}
        <Modal visible={showTambahKat} transparent animationType="fade">
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
                Tambah Kategori
              </Text>
              <TextInput
                style={[
                  s.card,
                  {
                    padding: 14,
                    fontSize: 14,
                    color: Colors.text,
                    borderRadius: 12,
                  },
                ]}
                placeholder="Nama kategori..."
                placeholderTextColor={Colors.textDisabled}
                value={namaKatBaru}
                onChangeText={setNamaKatBaru}
                autoFocus
              />
              <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
                <TouchableOpacity
                  style={[
                    s.chip,
                    { flex: 1, justifyContent: "center", paddingVertical: 12 },
                  ]}
                  onPress={() => {
                    setShowTambahKat(false);
                    setNamaKatBaru("");
                  }}>
                  <Text style={[s.chipTxt, { textAlign: "center" }]}>
                    Batal
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    s.chipActive,
                    {
                      flex: 1,
                      borderRadius: 20,
                      justifyContent: "center",
                      alignItems: "center",
                      paddingVertical: 12,
                    },
                  ]}
                  onPress={() => {
                    if (!namaKatBaru.trim()) return;
                    const newId = tambahKategori(namaKatBaru);
                    setKats(getAllKategori().filter((k: Kategori) => k.id > 1));
                    upd("kategori_id", newId);
                    setNamaKatBaru("");
                    setShowTambahKat(false);
                  }}>
                  <Text style={{ color: "#fff", fontWeight: "700" }}>
                    Simpan
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── Hapus (edit mode) ── */}
        {onDelete && (
          <TouchableOpacity style={s.deleteBtn} onPress={onDelete}>
            <Ionicons name="trash-outline" size={18} color={Colors.danger} />
            <Text style={s.deleteBtnTxt}>Hapus Produk Ini</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <BarcodeScannerModal
        visible={scannerVisible}
        onScanned={handleBarcodeScanned}
        onClose={() => setScannerVisible(false)}
      />
    </SafeAreaView>
  );
}

// ────────────────────────────────────────────────
// EXPORT SCREENS
// ────────────────────────────────────────────────
export function TambahProdukScreen({ navigation }: any) {
  const save = (form: any) => {
    if (!form.nama.trim()) {
      Alert.alert("Error", "Nama produk wajib diisi");
      return;
    }
    if (!form.harga || parseInt(form.harga) <= 0) {
      Alert.alert("Error", "Harga jual wajib diisi");
      return;
    }
    if (!form.kategori_id) {
      Alert.alert("Error", "Kategori wajib dipilih");
      return;
    }
    tambahProduk({
      nama: form.nama.trim(),
      harga: parseInt(form.harga) || 0,
      harga_modal:
        form.harga_modal !== "" ? parseInt(form.harga_modal) || 0 : 0,
      stok: parseInt(form.stok) || 0,
      stok_minimum: parseInt(form.stok_minimum) || 5,
      kategori_id: form.kategori_id,
      barcode: form.barcode || undefined,
      satuan: form.satuan,
      gambar: form.gambar || undefined,
      harga_grosir: parseInt(form.harga_grosir) || 0,
      min_grosir: parseInt(form.min_grosir) || 0,
      aktif_grosir: form.aktif_grosir,
    });
    navigation.goBack();
  };
  return (
    <FormProduk
      initial={{ ...DEFAULT }}
      onSave={save}
      navigation={navigation}
    />
  );
}

export function EditProdukScreen({ route, navigation }: any) {
  const [initial, setInitial] = useState<any>(null);
  const id = route.params?.id;

  useEffect(() => {
    const p = getProdukById(id);
    if (p)
      setInitial({
        ...p,
        harga: p.harga.toString(),
        harga_modal: p.harga_modal.toString(),
        stok: p.stok.toString(),
        stok_minimum: p.stok_minimum.toString(),
        harga_grosir: p.harga_grosir?.toString() ?? "0",
        min_grosir: p.min_grosir?.toString() ?? "0",
        aktif_grosir: p.aktif_grosir ?? 0,
      });
  }, [id]);

  const save = (form: any) => {
    if (!form.nama.trim()) {
      Alert.alert("Error", "Nama wajib diisi");
      return;
    }
    updateProduk(id, {
      nama: form.nama,
      harga: parseInt(form.harga) || 0,
      harga_modal: parseInt(form.harga_modal) || 0,
      stok: parseInt(form.stok) || 0,
      stok_minimum: parseInt(form.stok_minimum) || 5,
      kategori_id: form.kategori_id,
      barcode: form.barcode,
      satuan: form.satuan,
      gambar: form.gambar,
      harga_grosir: parseInt(form.harga_grosir) || 0,
      min_grosir: parseInt(form.min_grosir) || 0,
      aktif_grosir: form.aktif_grosir,
    });
    navigation.goBack();
  };

  const del = () =>
    Alert.alert("Hapus Produk", "Yakin ingin menghapus?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: () => {
          hapusProduk(id);
          navigation.goBack();
        },
      },
    ]);

  if (!initial)
    return <View style={{ flex: 1, backgroundColor: Colors.primary }} />;
  return (
    <FormProduk
      initial={initial}
      onSave={save}
      onDelete={del}
      navigation={navigation}
    />
  );
}

export function ImportExcelScreen({ navigation }: any) {
  const [preview, setPreview] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const KOLOM_WAJIB = ["nama", "harga"];
  const KOLOM_INFO = [
    "nama",
    "harga",
    "harga_modal",
    "stok",
    "stok_minimum",
    "kategori",
    "barcode",
    "satuan",
  ];

  const downloadTemplate = async () => {
    const ws = XLSX.utils.aoa_to_sheet([
      KOLOM_INFO,
      [
        "Aqua Botol 600ml",
        4000,
        2500,
        100,
        10,
        "Minuman",
        "8998866600102",
        "botol",
      ],
      [
        "Indomie Goreng",
        3500,
        2000,
        50,
        5,
        "Makanan",
        "8999999123456",
        "bungkus",
      ],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produk");

    // Convert ke base64 lalu tulis ke file cache
    const wbout = XLSX.write(wb, {
      type: "base64",
      bookType: "xlsx",
    }) as string;
    const EFS = require("expo-file-system/legacy");
    const uri = EFS.cacheDirectory + "TemplateImportProduk.xlsx";
    await EFS.writeAsStringAsync(uri, wbout, { encoding: "base64" });
    await Sharing.shareAsync(uri, {
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dialogTitle: "Template Import Produk",
      UTI: "com.microsoft.excel.xlsx",
    });
  };

  const handlePickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;

      setLoading(true);
      setErrors([]);
      const asset = res.assets[0];
      setFileName(asset.name);

      // Gunakan fetch + blob → base64 (tidak butuh expo-file-system)
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const wb = XLSX.read(base64, { type: "base64" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

      if (rows.length < 2) {
        Alert.alert("File kosong", "File Excel tidak berisi data.");
        setLoading(false);
        return;
      }

      const rawHeader = (rows[0] as string[]).map(
        (h) => h?.toString().trim() || "",
      );
      const KOLOM_MAP: Record<string, string> = {
        "Harga Jual": "harga",
        "Harga Modal": "harga_modal",
        "Stok Minimum": "stok_minimum",
        "No HP": "no_hp",
        "Total Beli": "total_beli",
      };
      const header = rawHeader.map((h) =>
        (KOLOM_MAP[h] || h).toLowerCase().trim(),
      );
      const errs: string[] = [];

      KOLOM_WAJIB.forEach((k) => {
        if (!header.includes(k)) errs.push(`Kolom "${k}" tidak ditemukan`);
      });
      if (errs.length) {
        setErrors(errs);
        setLoading(false);
        return;
      }

      const data = rows
        .slice(1)
        .filter((row) => row.some((c) => c !== undefined && c !== ""))
        .map((row, i) => {
          const obj: any = {};
          header.forEach((h, ci) => {
            obj[h] = row[ci];
          });
          return {
            _row: i + 2,
            nama: obj.nama?.toString().trim() || "",
            harga: parseInt(obj.harga) || 0,
            harga_modal: parseInt(obj.harga_modal) || 0,
            stok: parseInt(obj.stok) || 0,
            stok_minimum: parseInt(obj.stok_minimum) || 5,
            kategori: obj.kategori?.toString().trim() || "Lainnya",
            barcode: obj.barcode?.toString().trim() || "",
            satuan: obj.satuan?.toString().trim() || "pcs",
            _valid:
              !!obj.nama?.toString().trim() && (parseInt(obj.harga) || 0) > 0,
          };
        });

      setPreview(data);
    } catch (e: any) {
      Alert.alert("Error", "Gagal membaca file: " + (e.message || ""));
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    const valid = preview.filter((p) => p._valid);
    if (valid.length === 0) {
      Alert.alert("Tidak ada data valid");
      return;
    }

    Alert.alert(
      "Konfirmasi Import",
      `Import ${valid.length} produk${preview.length - valid.length > 0 ? ` (${preview.length - valid.length} baris diabaikan)` : ""}?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Import",
          onPress: async () => {
            setImporting(true);
            try {
              const kats = getAllKategori();
              let sukses = 0,
                gagal = 0;

              for (const p of valid) {
                try {
                  const stripEmoji = (s: string) =>
                    s
                      .replace(/[\u{1F300}-\u{1FFFF}\u{2600}-\u{27BF}]/gu, "")
                      .trim();
                  const kat = kats.find(
                    (k) =>
                      stripEmoji(k.nama).toLowerCase() ===
                      stripEmoji(p.kategori).toLowerCase(),
                  );
                  tambahProduk({
                    nama: p.nama,
                    harga: p.harga,
                    harga_modal: p.harga_modal,
                    stok: p.stok,
                    stok_minimum: p.stok_minimum,
                    kategori_id: kat?.id || 2,
                    barcode: p.barcode || undefined,
                    satuan: p.satuan,
                  });
                  sukses++;
                } catch {
                  gagal++;
                }
              }

              Alert.alert(
                "Import Selesai ✅",
                `${sukses} produk berhasil diimport${gagal > 0 ? `\n${gagal} produk gagal` : ""}`,
                [{ text: "OK", onPress: () => navigation.goBack() }],
              );
            } finally {
              setImporting(false);
            }
          },
        },
      ],
    );
  };

  const validCount = preview.filter((p) => p._valid).length;
  const invalidCount = preview.filter((p) => !p._valid).length;

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Import via Excel</Text>
        {preview.length > 0 && (
          <TouchableOpacity onPress={handleImport} disabled={importing}>
            {importing ? (
              <ActivityIndicator color="#f5a623" size="small" />
            ) : (
              <Text style={s.headerSave}>Import</Text>
            )}
          </TouchableOpacity>
        )}
        {preview.length === 0 && <View style={{ width: 40 }} />}
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: 48 }]}
        showsVerticalScrollIndicator={false}>
        {/* Info format */}
        <View style={ix.infoCard}>
          <Ionicons
            name="document-text-outline"
            size={20}
            color={Colors.info}
          />
          <View style={{ flex: 1 }}>
            <Text style={ix.infoTitle}>Format Excel yang dibutuhkan</Text>
            <Text style={ix.infoDesc}>
              Baris pertama adalah header. Kolom wajib:{" "}
              <Text style={{ fontWeight: "700" }}>nama, harga</Text>.{"\n"}
              Kolom opsional: harga_modal, stok, stok_minimum, kategori,
              barcode, satuan
            </Text>
          </View>
        </View>

        {/* Download template */}
        <TouchableOpacity style={ix.templateBtn} onPress={downloadTemplate}>
          <Ionicons name="download-outline" size={18} color={Colors.primary} />
          <Text style={ix.templateBtnTxt}>Download Template Excel</Text>
        </TouchableOpacity>

        {/* Pilih file */}
        <TouchableOpacity
          style={ix.pickBtn}
          onPress={handlePickFile}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="folder-open-outline" size={20} color="#fff" />
              <Text style={ix.pickBtnTxt}>
                {fileName ? `Ganti File` : "Pilih File Excel (.xlsx)"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {fileName ? (
          <View style={ix.fileInfo}>
            <Ionicons
              name="document-outline"
              size={15}
              color={Colors.primary}
            />
            <Text style={ix.fileInfoTxt} numberOfLines={1}>
              {fileName}
            </Text>
          </View>
        ) : null}

        {/* Error */}
        {errors.length > 0 && (
          <View style={ix.errorBox}>
            <Ionicons
              name="alert-circle-outline"
              size={16}
              color={Colors.danger}
            />
            <View style={{ flex: 1 }}>
              {errors.map((e, i) => (
                <Text key={i} style={ix.errorTxt}>
                  {e}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* Preview */}
        {preview.length > 0 && (
          <>
            <View style={ix.previewHeader}>
              <Text style={ix.previewTitle}>
                Preview Data ({preview.length} baris)
              </Text>
              <View style={ix.previewBadges}>
                {validCount > 0 && (
                  <View style={ix.badgeGreen}>
                    <Text style={ix.badgeGreenTxt}>{validCount} valid</Text>
                  </View>
                )}
                {invalidCount > 0 && (
                  <View style={ix.badgeRed}>
                    <Text style={ix.badgeRedTxt}>{invalidCount} error</Text>
                  </View>
                )}
              </View>
            </View>

            {preview.map((p, i) => (
              <View
                key={i}
                style={[ix.previewRow, !p._valid && ix.previewRowError]}>
                <View
                  style={[
                    ix.rowStatus,
                    {
                      backgroundColor: p._valid
                        ? Colors.successLight
                        : Colors.dangerLight,
                    },
                  ]}>
                  <Ionicons
                    name={p._valid ? "checkmark" : "close"}
                    size={12}
                    color={p._valid ? Colors.success : Colors.danger}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={ix.rowNama} numberOfLines={1}>
                    {p.nama || (
                      <Text style={{ color: Colors.danger }}>Nama kosong</Text>
                    )}
                  </Text>
                  <Text style={ix.rowDetail}>
                    {p.harga > 0 ? formatRupiah(p.harga) : "⚠ Harga 0"} · Stok{" "}
                    {p.stok} · {p.kategori}
                  </Text>
                </View>
                <Text style={ix.rowNum}>#{p._row}</Text>
              </View>
            ))}

            {/* Tombol import */}
            <TouchableOpacity
              style={[
                ix.importBtn,
                (validCount === 0 || importing) && { opacity: 0.5 },
              ]}
              onPress={handleImport}
              disabled={validCount === 0 || importing}>
              {importing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons
                    name="cloud-upload-outline"
                    size={20}
                    color="#fff"
                  />
                  <Text style={ix.importBtnTxt}>
                    Import {validCount} Produk
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Styles untuk ImportExcelScreen
const ix = StyleSheet.create({
  infoCard: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: Colors.infoLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    alignItems: "flex-start",
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.info,
    marginBottom: 3,
  },
  infoDesc: { fontSize: 12, color: Colors.info, lineHeight: 17 },

  templateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  templateBtnTxt: { fontSize: 13, fontWeight: "700", color: Colors.primary },

  pickBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 15,
    marginBottom: 8,
  },
  pickBtnTxt: { color: "#fff", fontSize: 14, fontWeight: "700" },

  fileInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  fileInfoTxt: {
    flex: 1,
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "600",
  },

  errorBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: Colors.dangerLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  errorTxt: { fontSize: 12, color: Colors.danger, lineHeight: 18 },

  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  previewTitle: { fontSize: 13, fontWeight: "700", color: Colors.text },
  previewBadges: { flexDirection: "row", gap: 6 },
  badgeGreen: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeGreenTxt: { fontSize: 10, fontWeight: "700", color: Colors.success },
  badgeRed: {
    backgroundColor: Colors.dangerLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeRedTxt: { fontSize: 10, fontWeight: "700", color: Colors.danger },

  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  previewRowError: {
    borderColor: Colors.dangerBorder,
    backgroundColor: Colors.dangerLight,
  },
  rowStatus: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  rowNama: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 2,
  },
  rowDetail: { fontSize: 11, color: Colors.textMuted },
  rowNum: { fontSize: 10, color: Colors.textDisabled },

  importBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.success,
    borderRadius: 14,
    padding: 16,
    marginTop: 10,
  },
  importBtnTxt: { color: "#fff", fontSize: 15, fontWeight: "800" },
});

// ────────────────────────────────────────────────
// STYLES
// ────────────────────────────────────────────────
const s = StyleSheet.create({
  genBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#059669", // hijau, beda dari scan yang merah
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  genBtnTxt: { color: "#fff", fontSize: 11, fontWeight: "700" },
  safe: { flex: 1, backgroundColor: Colors.primary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  headerSave: { color: "#f5a623", fontSize: 15, fontWeight: "800" },
  scroll: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  sec: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 8,
  },

  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
    overflow: "hidden",
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  input: { flex: 1, fontSize: 14, color: Colors.text },
  prefix: { fontSize: 14, color: Colors.textMuted, fontWeight: "600" },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 16 },

  marginBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primaryLight,
    padding: 12,
    margin: 8,
    borderRadius: 8,
  },
  marginTxt: { fontSize: 12, color: Colors.primary, fontWeight: "600" },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    maxWidth: 160, // ← tambah ini
    flexShrink: 1, // ← tambah ini
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipTxt: { fontSize: 12, fontWeight: "600", color: Colors.textMuted },
  chipTxtActive: { color: "#fff", fontWeight: "800" },

  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.dangerLight,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.danger + "30",
    marginBottom: 50,
  },
  deleteBtnTxt: { fontSize: 14, fontWeight: "700", color: Colors.danger },

  // Foto
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 8,
  },
  photoBox: {
    width: 104,
    height: 104,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: Colors.border,
    position: "relative",
  },
  photoImg: { width: "100%", height: "100%" },
  photoEmpty: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  photoEmptyTxt: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: "center",
    paddingHorizontal: 6,
  },
  photoEditDot: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  photoButtons: { flex: 1, gap: 8 },
  photoBtnItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  photoBtnTxt: { fontSize: 13, fontWeight: "600", color: Colors.primary },

  // Scan button
  scanBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  scanBtnTxt: { color: "#fff", fontSize: 12, fontWeight: "700" },
});

const sc = StyleSheet.create({
  permSafe: { flex: 1, backgroundColor: Colors.background },
  permBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  permTitle: { fontSize: 20, fontWeight: "800" },
  permDesc: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  permBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 14,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  permBtnTxt: { color: "#fff", fontSize: 15, fontWeight: "700" },
  scanBox: {
    width: 240,
    height: 240,
    alignItems: "center",
    justifyContent: "center",
  },
  corner: {
    position: "absolute",
    width: 26,
    height: 26,
    borderColor: "#fff",
    borderWidth: 3,
  },
  tl: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 4,
  },
  tr: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: 4,
  },
  bl: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 4,
  },
  br: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 4,
  },
  hint: { color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: "500" },
  closeBtn: { marginTop: 8 },
});
