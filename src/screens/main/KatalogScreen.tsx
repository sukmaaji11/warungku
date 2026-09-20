import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Share,
  Alert,
  Image,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { formatRupiah } from "../../utils/format";
import { getAllProduk, getPengaturan, Produk } from "../../db/produkRepo";
import { Colors } from "../../constants";
import { resolveGambarUri } from "../../utils/gambarHelper";

export default function KatalogScreen() {
  const [produkList, setProdukList] = useState<Produk[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<"pilih" | "semua">("semua");
  const insets = useSafeAreaInsets();

  const load = () => {
    setProdukList(getAllProduk("", 0));
    setSettings(getPengaturan());
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, []),
  );

  const toggleSelect = (id: number) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const selectAll = () => {
    if (selected.size === produkList.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(produkList.map((p) => p.id)));
    }
  };

  const targetProduk =
    mode === "semua"
      ? produkList
      : produkList.filter((p) => selected.has(p.id));

  const handleShare = async () => {
    if (targetProduk.length === 0) {
      Alert.alert("Pilih Produk", "Pilih minimal 1 produk untuk katalog.");
      return;
    }
    const namaToko = settings.nama_toko || "Toko Saya";
    const noHp = settings.no_hp || "";

    let msg = `🏪 *${namaToko}*\n`;
    if (noHp) msg += `📞 ${noHp}\n`;
    msg += `\n📦 *KATALOG PRODUK*\n`;
    msg += `${"─".repeat(28)}\n`;

    targetProduk.forEach((p, i) => {
      msg += `\n${i + 1}. *${p.nama}*\n`;
      msg += `   💰 ${formatRupiah(p.harga)}\n`;
      msg += `   📦 Stok: ${p.stok} ${p.satuan}\n`;
      if (p.stok === 0) msg += `   ❌ *HABIS*\n`;
    });

    msg += `\n${"─".repeat(28)}\n`;
    msg += `_Order via WA: ${noHp}_`;

    await Share.share({ message: msg, title: `Katalog ${namaToko}` });
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Katalog Digital</Text>
          <Text style={s.headerSub}>{produkList.length} produk</Text>
        </View>
        <TouchableOpacity style={s.shareBtn} onPress={handleShare}>
          <Ionicons name="logo-whatsapp" size={18} color="#fff" />
          <Text style={s.shareBtnTxt}>Share WA</Text>
        </TouchableOpacity>
      </View>

      {/* Mode selector */}
      <View style={s.modeRow}>
        <TouchableOpacity
          style={[s.modeChip, mode === "semua" && s.modeChipActive]}
          onPress={() => setMode("semua")}>
          <Ionicons
            name="apps-outline"
            size={14}
            color={mode === "semua" ? Colors.primary : "rgba(255,255,255,0.7)"}
          />
          <Text style={[s.modeTxt, mode === "semua" && s.modeTxtActive]}>
            Semua Produk
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.modeChip, mode === "pilih" && s.modeChipActive]}
          onPress={() => setMode("pilih")}>
          <Ionicons
            name="checkmark-circle-outline"
            size={14}
            color={mode === "pilih" ? Colors.primary : "rgba(255,255,255,0.7)"}
          />
          <Text style={[s.modeTxt, mode === "pilih" && s.modeTxtActive]}>
            Pilih Produk
          </Text>
        </TouchableOpacity>
        {mode === "pilih" && (
          <TouchableOpacity style={s.selectAllBtn} onPress={selectAll}>
            <Text style={s.selectAllTxt}>
              {selected.size === produkList.length
                ? "Batal Semua"
                : "Pilih Semua"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Preview info */}
      <View style={s.previewBanner}>
        <Ionicons name="information-circle-outline" size={16} color="#2563EB" />
        <Text style={s.previewTxt}>
          {mode === "semua"
            ? `Akan share ${produkList.length} produk via WhatsApp`
            : `${selected.size} produk dipilih untuk katalog`}
        </Text>
      </View>

      <FlatList
        data={produkList}
        keyExtractor={(i) => i.id.toString()}
        contentContainerStyle={s.content}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={{ gap: 10 }}
        renderItem={({ item }) => {
          const isSelected = selected.has(item.id);
          const isTarget = mode === "semua" || isSelected;
          return (
            <TouchableOpacity
              style={[
                s.card,
                isSelected && mode === "pilih" && s.cardSelected,
                !isTarget && s.cardDim,
              ]}
              onPress={() => mode === "pilih" && toggleSelect(item.id)}
              activeOpacity={mode === "pilih" ? 0.7 : 1}>
              {/* Checkmark */}
              {mode === "pilih" && (
                <View style={[s.checkBox, isSelected && s.checkBoxActive]}>
                  {isSelected && (
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  )}
                </View>
              )}
              {/* Gambar */}
              <View style={s.imgBox}>
                {item.gambar ? (
                  <Image
                    source={{ uri: resolveGambarUri(item.gambar) }}
                    style={s.img}
                  />
                ) : (
                  <View style={s.imgEmpty}>
                    <Ionicons name="cube-outline" size={28} color="#D1D5DB" />
                  </View>
                )}
                {item.stok === 0 && (
                  <View style={s.habisOverlay}>
                    <Text style={s.habisLbl}>Habis</Text>
                  </View>
                )}
              </View>
              <View style={s.cardInfo}>
                <Text style={s.cardNama} numberOfLines={2}>
                  {item.nama}
                </Text>
                <Text style={s.cardHarga}>{formatRupiah(item.harga)}</Text>
                <Text style={s.cardStok}>
                  {item.stok} {item.satuan} tersedia
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* FAB Share */}
      <TouchableOpacity
        style={[s.fab, { marginBottom: insets.bottom + 12 }]}
        onPress={handleShare}>
        <Ionicons name="logo-whatsapp" size={22} color="#fff" />
        <Text style={s.fabTxt}>
          Share{" "}
          {mode === "pilih" ? `(${selected.size})` : `(${produkList.length})`}
        </Text>
      </TouchableOpacity>
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
  headerTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  headerSub: { color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 2 },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#25D366",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
  },
  shareBtnTxt: { color: "#fff", fontSize: 13, fontWeight: "700" },
  modeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  modeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  modeChipActive: { backgroundColor: "#fff" },
  modeTxt: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.7)" },
  modeTxtActive: { color: Colors.primary },
  selectAllBtn: { marginLeft: "auto" as any },
  selectAllTxt: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "600",
  },
  previewBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(37,99,235,0.2)",
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    padding: 10,
  },
  previewTxt: { fontSize: 12, color: "#93C5FD", flex: 1 },
  content: { padding: 12, backgroundColor: "#F3F4F6", paddingBottom: 12 },
  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
    position: "relative",
  },
  cardSelected: { borderColor: "#D97706", borderWidth: 2 },
  cardDim: { opacity: 0.5 },
  checkBox: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  checkBoxActive: { backgroundColor: "#D97706", borderColor: "#D97706" },
  imgBox: { width: "100%", aspectRatio: 1, position: "relative" },
  img: { width: "100%", height: "100%" },
  imgEmpty: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  habisOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  habisLbl: { color: "#fff", fontSize: 12, fontWeight: "800" },
  cardInfo: { padding: 10 },
  cardNama: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 16,
    marginBottom: 4,
  },
  cardHarga: { fontSize: 14, fontWeight: "800", color: Colors.primary },
  cardStok: { fontSize: 10, color: "#9CA3AF", marginTop: 2 },
  fab: {
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 0, // ← hapus margin bottom, pakai insets dinamis
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#25D366",
    borderRadius: 16,
    padding: 16,
  },
  fabTxt: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
