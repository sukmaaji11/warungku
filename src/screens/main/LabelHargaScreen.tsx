// src/screens/main/LabelHargaScreen.tsx
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
  Share,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants";
import { formatRupiah } from "../../utils/format";
import { getAllProduk, Produk } from "../../db/produkRepo";
import { getKategoriEmoji } from "../../utils/kategoriImage";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { connectPrinter, printStruk } from "../../utils/printer";
import { getPengaturan } from "../../db/produkRepo";

// ── Code 128B Barcode Renderer ─────────────────────────────────────────────
// Pola binary per karakter Code 128 (index = nilai karakter)
const C128: string[] = [
  "11011001100",
  "11001101100",
  "11001100110",
  "10010011000",
  "10010001100",
  "10001001100",
  "10011001000",
  "10011000100",
  "10001100100",
  "11001001000",
  "11001000100",
  "11000100100",
  "10110011100",
  "10011011100",
  "10011001110",
  "10111001100",
  "10011101100",
  "10011100110",
  "11001110010",
  "11001011100",
  "11001001110",
  "11011100100",
  "11001110100",
  "11101101110",
  "11101001100",
  "11100101100",
  "11100100110",
  "11101100100",
  "11100110100",
  "11100110010",
  "11011011000",
  "11011000110",
  "11000110110",
  "10100011000",
  "10001011000",
  "10001000110",
  "10110001000",
  "10001101000",
  "10001100010",
  "11010001000",
  "11000101000",
  "11000100010",
  "10110111000",
  "10110001110",
  "10001101110",
  "10111011000",
  "10111000110",
  "10001110110",
  "11101110110",
  "11010001110",
  "11000101110",
  "11011101000",
  "11011100010",
  "11011101110",
  "11101011000",
  "11101000110",
  "11100010110",
  "11101101000",
  "11101100010",
  "11100011010",
  "11101111010",
  "11001000010",
  "11110001010",
  "10100110000",
  "10100001100",
  "10010110000",
  "10010000110",
  "10000101100",
  "10000100110",
  "10110010000",
  "10110000100",
  "10011010000",
  "10011000010",
  "10000110100",
  "10000110010",
  "11000010010",
  "11001010000",
  "11110111010",
  "11000010100",
  "10001111010",
  "10100111100",
  "10010111100",
  "10010011110",
  "10111100100",
  "10011110100",
  "10011110010",
  "11110100100",
  "11110010100",
  "11110010010",
  "11011011110",
  "11011110110",
  "11110110110",
  "10101111000",
  "10100011110",
  "10001011110",
  "10111101000",
  "10111100010",
  "11110101000",
  "11110100010",
  "10111011110",
  "10111101110",
  "11101011110",
  "11110101110",
  "11010000100",
  "11010010000",
  "11010011100",
  // START B = 104, STOP = 106
  "11010010000", // 103 (START A — tidak dipakai)
  "11010010000", // 104 START B
  "11000111010", // 105 START C
  "1100011101011", // 106 STOP
];

function encodeCode128B(data: string): string {
  if (!data) return "";
  const START_B = 104;
  const STOP = 106;
  const vals: number[] = [START_B];
  for (const c of data) {
    const v = c.charCodeAt(0) - 32;
    if (v >= 0 && v <= 95) vals.push(v);
  }
  let check = START_B;
  for (let i = 1; i < vals.length; i++) check += i * vals[i];
  vals.push(check % 103);
  vals.push(STOP);
  return vals.map((v) => C128[v] ?? "").join("");
}

function SimpleBarcodeView({
  value,
  width = 240,
  height = 64,
}: {
  value: string;
  width?: number;
  height?: number;
}) {
  if (!value) return null;
  const pattern = encodeCode128B(value);
  if (!pattern) return null;
  const barW = width / pattern.length;

  return (
    <View
      style={{ width, height, flexDirection: "row", backgroundColor: "#fff" }}>
      {pattern.split("").map((bit, i) => (
        <View
          key={i}
          style={{
            width: Math.max(barW, 0.7),
            height: "100%",
            backgroundColor: bit === "1" ? "#000" : "#fff",
          }}
        />
      ))}
    </View>
  );
}

export default function LabelHargaScreen({ navigation }: any) {
  const [produkList, setProdukList] = useState<Produk[]>([]);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"semua" | "promo" | "reguler">(
    "semua",
  );
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [previewProduk, setPreviewProduk] = useState<Produk | null>(null);
  const [qtyLabel, setQtyLabel] = useState(1);

  const load = useCallback(() => {
    const all = getAllProduk(search, 0);
    setProdukList(all);
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = produkList.filter((p) => {
    if (filterMode === "promo") return (p as any).is_konsinyasi === 1;
    if (filterMode === "reguler") return (p as any).is_konsinyasi !== 1;
    return true;
  });

  const toggleSelect = (id: number) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );

  const selectAll = () =>
    setSelectedIds((prev) =>
      prev.length === filtered.length ? [] : filtered.map((p) => p.id),
    );

  const openPreview = (p: Produk) => {
    setPreviewProduk(p);
    setQtyLabel(1);
  };

  // Generate HTML label — format mirip StrukScreen (receipt style)
  const generateLabelHTML = (items: Produk[], qty = 1): string => {
    const labelBlocks = items
      .map((p) => {
        // Barcode SVG Code128
        const pat = p.barcode ? encodeCode128B(p.barcode) : "";
        const barW = pat ? 280 / pat.length : 0;
        const barSVG = pat
          ? `<svg width="280" height="56" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto">` +
            pat
              .split("")
              .map((bit, i) =>
                bit === "1"
                  ? `<rect x="${(i * barW).toFixed(2)}" y="0" width="${Math.max(barW, 0.7).toFixed(2)}" height="56" fill="#1E3A5F"/>`
                  : "",
              )
              .join("") +
            `</svg>`
          : "";

        // Layout: landscape, kiri=nama+barcode (bg abu), kanan=harga (bg hitam)
        const single = `
<div style="
  width:500px;height:170px;
  border:2px solid #000;
  display:flex;flex-direction:row;
  font-family:Arial,Helvetica,sans-serif;
  margin:0 auto 14px auto;
  page-break-inside:avoid;
  overflow:hidden;
">
  <!-- KIRI: nama + barcode -->
  <div style="
    flex:3;padding:12px 14px;
    background:#f0f0f0;
    display:flex;flex-direction:column;
    justify-content:space-between;
    border-right:2px solid #000;
    overflow:hidden;
  ">
    <div style="font-size:20px;font-weight:900;color:#000;line-height:1.2;word-break:break-word;">
      ${p.nama}
    </div>
    <div>
      ${
        barSVG
          ? barSVG +
            `<div style="font-size:9px;letter-spacing:1.5px;margin-top:3px;font-family:monospace;color:#333">${p.barcode}</div>`
          : `<div style="font-size:11px;color:#555;font-family:monospace">ID: ${p.id}</div>`
      }
    </div>
  </div>

  <!-- KANAN: harga besar -->
  <div style="
    flex:2;background:#000;
    display:flex;align-items:center;justify-content:center;
    padding:8px;
  ">
    <div style="font-size:34px;font-weight:900;color:#fff;text-align:center;line-height:1.1;word-break:break-all;">
      ${formatRupiah(p.harga)}
    </div>
  </div>
</div>`;
        return Array(qty).fill(single).join("");
      })
      .join("");

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body { background:#f0f0f0; padding:20px; display:flex; flex-direction:column; align-items:center; }
    @media print {
      body { background:#f0f0f0; padding:10px; }
      @page { size:auto; margin:5mm; }
    }
  </style>
</head>
<body>${labelBlocks}</body>
</html>`;
  };

  const handleCetakLabel = async (p: Produk, qty = 1) => {
    Alert.alert(
      "Pilih Cara Cetak",
      "Cetak via printer Bluetooth atau Share PDF?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "📄 Share PDF",
          onPress: async () => {
            try {
              const html = generateLabelHTML([p], qty);
              const { uri } = await Print.printToFileAsync({
                html,
                width: 320,
              });
              await Sharing.shareAsync(uri, {
                mimeType: "application/pdf",
                dialogTitle: `Label ${p.nama}`,
              });
            } catch (e: any) {
              Alert.alert("Gagal", e?.message || "Error");
            }
          },
        },
        {
          text: "🖨️ Print Bluetooth",
          onPress: async () => {
            try {
              const addr = await AsyncStorage.getItem(
                "kasirku_printer_address",
              );
              if (!addr) {
                Alert.alert(
                  "Printer Belum Dipilih",
                  "Pilih printer BT dulu di Pengaturan → Printer Bluetooth.",
                );
                return;
              }
              const s = getPengaturan();
              await connectPrinter(addr);
              // Print label sebanyak qty
              for (let i = 0; i < qty; i++) {
                await printLabel58mm(p, addr);
              }
              Alert.alert(
                "✅ Berhasil",
                `${qty} label "${p.nama}" berhasil dicetak.`,
              );
              setPreviewProduk(null);
            } catch (e: any) {
              Alert.alert("Gagal Print", e?.message || "Cek koneksi printer.");
            }
          },
        },
      ],
    );
  };

  // Print label 58mm ke printer thermal BT
  const printLabel58mm = async (p: Produk, address: string) => {
    const BEP = require("@vardrz/react-native-bluetooth-escpos-printer")
      .BluetoothEscposPrinter as any;

    const LINE = "--------------------------------";

    // 1. NAMA (center biar clean)
    await BEP.printerAlign(BEP.ALIGN.CENTER);
    await BEP.printText(p.nama.toUpperCase() + "\n\r", {
      widthtimes: 1,
      heigthtimes: 1,
    });

    // 2. garis
    await BEP.printText(LINE + "\n\r", {});

    // 3. HARGA SUPER BESAR 🔥
    await BEP.printText(formatRupiah(p.harga) + "\n\r", {
      widthtimes: 2, // 🔥 INI KUNCI
      heigthtimes: 2,
    });

    // 4. garis lagi
    await BEP.printText(LINE + "\n\r", {});

    // 5. BARCODE
    if (p.barcode) {
      await BEP.printerAlign(BEP.ALIGN.CENTER);
      try {
        await BEP.printBarCode(p.barcode, 73, 3, 80, 2, 0);
      } catch {
        await BEP.printText(p.barcode + "\n\r", {});
      }
    }

    // 6. feed
    await BEP.printText("\n\r\n\r\n\r", {});
  };

  const handleCetakSelected = async () => {
    const items = produkList.filter((p) => selectedIds.includes(p.id));
    if (items.length === 0) return;
    try {
      const html = generateLabelHTML(items, 1);
      await Print.printAsync({ html });
    } catch (e: any) {
      Alert.alert("Gagal cetak", e?.message || "Error");
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Cetak Label Harga</Text>
          <Text style={s.headerSub}>{produkList.length} produk</Text>
        </View>
        <TouchableOpacity style={s.selectAllBtn} onPress={selectAll}>
          <Text style={s.selectAllTxt}>
            {selectedIds.length === filtered.length && filtered.length > 0
              ? "Batal Semua"
              : "Pilih Semua"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons
          name="search-outline"
          size={16}
          color="rgba(255,255,255,.5)"
        />
        <TextInput
          style={s.searchInput}
          placeholder="Cari produk..."
          placeholderTextColor="rgba(255,255,255,.4)"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons
              name="close-circle"
              size={16}
              color="rgba(255,255,255,.5)"
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter tabs */}
      <View style={s.filterRow}>
        {(["semua", "promo", "reguler"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.filterChip, filterMode === f && s.filterChipActive]}
            onPress={() => setFilterMode(f)}>
            <Text style={[s.filterTxt, filterMode === f && s.filterTxtActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id.toString()}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: p }) => {
          const isSelected = selectedIds.includes(p.id);
          return (
            <View style={s.card}>
              {/* Checkbox + Info */}
              <TouchableOpacity
                style={s.cardLeft}
                onPress={() => toggleSelect(p.id)}>
                <View style={[s.checkbox, isSelected && s.checkboxActive]}>
                  {isSelected && (
                    <Ionicons name="checkmark" size={13} color="#fff" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.prodNama} numberOfLines={1}>
                    {p.nama}
                  </Text>
                  {p.barcode ? (
                    <View style={s.barcodeRow}>
                      <Ionicons
                        name="barcode-outline"
                        size={12}
                        color={Colors.textMuted}
                      />
                      <Text style={s.barcodeTxt}>{p.barcode}</Text>
                      <Text style={s.idTxt}>ID: {p.id}</Text>
                    </View>
                  ) : (
                    <Text style={s.idTxt}>ID: {p.id}</Text>
                  )}
                  <Text style={s.prodHarga}>{formatRupiah(p.harga)}</Text>
                </View>
              </TouchableOpacity>

              {/* Tombol aksi */}
              <View style={s.cardActions}>
                <TouchableOpacity
                  style={s.lihatBtn}
                  onPress={() => openPreview(p)}>
                  <Ionicons
                    name="eye-outline"
                    size={14}
                    color={Colors.primary}
                  />
                  <Text style={s.lihatBtnTxt}>Lihat</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.cetakBtn}
                  onPress={() => openPreview(p)}>
                  <Ionicons name="print-outline" size={14} color="#fff" />
                  <Text style={s.cetakBtnTxt}>Cetak</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Share bar bawah jika ada yang dipilih */}
      {selectedIds.length > 0 && (
        <View style={s.shareBar}>
          <Text style={s.shareBarTxt}>{selectedIds.length} produk dipilih</Text>
          <TouchableOpacity style={s.shareBtn} onPress={handleCetakSelected}>
            <Ionicons name="share-social-outline" size={18} color="#fff" />
            <Text style={s.shareBtnTxt}>Share Label</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Modal Preview Label ── */}
      <Modal visible={!!previewProduk} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.7)",
            justifyContent: "center",
            padding: 20,
          }}>
          <View style={s.previewSheet}>
            {/* Header modal */}
            <View style={s.previewHeader}>
              <View>
                <Text style={s.previewHeaderTitle}>Preview Label</Text>
                <Text style={s.previewHeaderSub}>LABEL BIASA · CODE128</Text>
              </View>
              <TouchableOpacity onPress={() => setPreviewProduk(null)}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Label preview */}
            <View style={s.labelRow}>
              {/* KIRI */}
              <View style={s.labelLeft}>
                <Text style={s.labelNamaBig}>{previewProduk?.nama}</Text>

                <Text style={s.labelSub}>Produk</Text>

                <View style={{ marginTop: 10 }}>
                  {previewProduk?.barcode ? (
                    <>
                      <SimpleBarcodeView
                        value={previewProduk.barcode}
                        width={180}
                        height={50}
                      />
                      <Text style={s.labelBarcodeNum}>
                        {previewProduk.barcode}
                      </Text>
                    </>
                  ) : (
                    <Text style={s.labelId}>ID: {previewProduk?.id}</Text>
                  )}
                </View>
              </View>

              {/* KANAN */}
              <View style={s.labelRight}>
                <Text style={s.labelHargaSuper}>
                  {formatRupiah(previewProduk?.harga || 0)}
                </Text>
              </View>
            </View>

            {/* Jenis barcode info */}
            <View style={s.barcodeTypeRow}>
              <Text style={s.barcodeTypeLabel}>Jenis Barcode:</Text>
              <View style={s.barcodeTypePill}>
                <Text style={s.barcodeTypeTxt}>CODE128</Text>
              </View>
            </View>

            {/* Jumlah label */}
            <View style={s.qtySection}>
              <Text style={s.qtySectionLabel}>JUMLAH LABEL</Text>
              <View style={s.qtyRow}>
                <TouchableOpacity
                  style={s.qtyBtn}
                  onPress={() => setQtyLabel((q) => Math.max(1, q - 1))}>
                  <Ionicons name="remove" size={18} color={Colors.text} />
                </TouchableOpacity>
                <Text style={s.qtyVal}>{qtyLabel}</Text>
                <TouchableOpacity
                  style={s.qtyBtn}
                  onPress={() => setQtyLabel((q) => Math.min(99, q + 1))}>
                  <Ionicons name="add" size={18} color={Colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Tombol */}
            <View style={s.previewBtns}>
              <TouchableOpacity
                style={s.batalBtn}
                onPress={() => setPreviewProduk(null)}>
                <Text style={s.batalBtnTxt}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.cetakNowBtn}
                onPress={() => {
                  if (previewProduk) handleCetakLabel(previewProduk, qtyLabel);
                }}>
                <Ionicons name="print-outline" size={16} color="#fff" />
                <Text style={s.cetakNowBtnTxt}>Cetak Sekarang</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  labelRow: {
    flexDirection: "row",
    borderWidth: 2,
    borderColor: "#000",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 16,
  },

  labelLeft: {
    flex: 3,
    padding: 12,
    backgroundColor: "#e5e5e5",
    justifyContent: "space-between",
  },

  labelRight: {
    flex: 2,
    backgroundColor: "#FFEB3B",
    alignItems: "center",
    justifyContent: "center",
  },

  labelNamaBig: {
    fontSize: 22,
    fontWeight: "900",
    color: "#000",
  },

  labelSub: {
    fontSize: 14,
    color: "#444",
  },

  labelHargaSuper: {
    fontSize: 42,
    fontWeight: "900",
    color: "#000",
  },

  labelId: {
    fontSize: 10,
    color: "#666",
  },
  safe: { flex: 1, backgroundColor: Colors.primary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,.55)", fontSize: 12 },
  selectAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,.15)",
  },
  selectAllTxt: { color: "#fff", fontSize: 12, fontWeight: "700" },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: "rgba(255,255,255,.12)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#fff" },

  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,.12)",
  },
  filterChipActive: { backgroundColor: "#fff" },
  filterTxt: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,.7)" },
  filterTxtActive: { color: Colors.primary },

  listContent: {
    padding: 12,
    gap: 10,
    backgroundColor: Colors.background,
    flexGrow: 1,
    paddingBottom: 100,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
    gap: 12,
  },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
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
  prodNama: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 3,
  },
  barcodeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 3,
  },
  barcodeTxt: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: "monospace",
  },
  idTxt: { fontSize: 11, color: Colors.textMuted },
  prodHarga: { fontSize: 15, fontWeight: "800", color: Colors.primary },

  cardActions: { flexDirection: "row", gap: 8 },
  lihatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  lihatBtnTxt: { fontSize: 12, fontWeight: "700", color: Colors.primary },
  cetakBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cetakBtnTxt: { fontSize: 12, fontWeight: "700", color: "#fff" },

  shareBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.primary,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  shareBarTxt: { color: "#fff", fontSize: 14, fontWeight: "600" },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,.2)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  shareBtnTxt: { color: "#fff", fontSize: 14, fontWeight: "700" },

  // Preview modal
  previewSheet: { backgroundColor: "#fff", borderRadius: 20, padding: 20 },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  previewHeaderTitle: { fontSize: 16, fontWeight: "800", color: Colors.text },
  previewHeaderSub: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  labelBox: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: "dashed",
    marginBottom: 16,
  },
  labelNama: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 6,
  },
  labelHarga: {
    fontSize: 22,
    fontWeight: "900",
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  labelBarcodeNum: {
    fontSize: 12,
    color: Colors.text,
    marginTop: 6,
    letterSpacing: 1.5,
    fontFamily: "monospace",
  },
  noBarcodeBox: { alignItems: "center", paddingVertical: 16 },

  barcodeTypeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  barcodeTypeLabel: { fontSize: 13, color: Colors.textMuted },
  barcodeTypePill: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  barcodeTypeTxt: { fontSize: 13, fontWeight: "700", color: Colors.text },

  qtySection: { alignItems: "center", marginBottom: 16 },
  qtySectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 10,
  },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 24 },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyVal: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.text,
    minWidth: 40,
    textAlign: "center",
  },

  previewBtns: { flexDirection: "row", gap: 10 },
  batalBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: "center",
  },
  batalBtnTxt: { fontWeight: "700", color: Colors.textMuted },
  cetakNowBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#2563EB",
  },
  cetakNowBtnTxt: { fontWeight: "800", color: "#fff" },
});
