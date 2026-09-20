import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { formatRupiah } from "../../utils/format";
import {
  getAllProduk,
  getAllKategori,
  hapusProduk,
  Produk,
  Kategori,
} from "../../db/produkRepo";
import { Colors } from "../../constants";
import { getKategoriEmoji } from "../../utils/kategoriImage";
import { resolveGambarUri } from "../../utils/gambarHelper";

// ── FIX: getKatIcon berdasarkan substring — support nama baru dengan emoji ────
function getKatIcon(nama: string): keyof typeof Ionicons.glyphMap {
  const n = nama.toLowerCase();
  if (n.includes("semua")) return "apps-outline";
  if (n.includes("rokok")) return "flame-outline";
  if (n.includes("minuman")) return "cafe-outline";
  if (n.includes("snack") || n.includes("cemilan")) return "pizza-outline";
  if (n.includes("makanan") || n.includes("instan"))
    return "restaurant-outline";
  if (n.includes("mie")) return "restaurant-outline";
  if (n.includes("sembako")) return "basket-outline";
  if (n.includes("bumbu") || n.includes("dapur")) return "color-fill-outline";
  if (n.includes("rumah") || n.includes("tangga")) return "home-outline";
  if (n.includes("harian") || n.includes("perlengkapan"))
    return "bag-handle-outline";
  if (n.includes("plastik") || n.includes("kemasan")) return "bag-outline";
  if (n.includes("layanan") || n.includes("digital"))
    return "phone-portrait-outline";
  return "apps-outline";
}

// ── FIX: label chip kategori — potong kalau terlalu panjang ──────────────────
function getKatLabel(nama: string): string {
  if (nama.length <= 16) return nama;
  return nama.slice(0, 14) + "…";
}

export default function ProdukScreen({ navigation }: any) {
  const [list, setList] = useState<Produk[]>([]);
  const [kats, setKats] = useState<Kategori[]>([]);
  const [search, setSearch] = useState("");
  const [activeKat, setActiveKat] = useState(0);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [sortBy, setSortBy] = useState<"nama" | "harga" | "stok">("nama");
  const [scanMode, setScanMode] = useState(false);
  const [scanVal, setScanVal] = useState("");
  const [showImages, setShowImages] = useState(true);
  const scanRef = useRef<TextInput>(null);

  const load = useCallback(() => {
    let data = getAllProduk(search, activeKat);
    if (sortBy === "harga") data = [...data].sort((a, b) => a.harga - b.harga);
    if (sortBy === "stok") data = [...data].sort((a, b) => a.stok - b.stok);
    setList(data);
    setKats(getAllKategori());
  }, [search, activeKat, sortBy]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleScanSubmit = () => {
    const barcode = scanVal.trim();
    if (!barcode) return;
    setScanVal("");
    const found = getAllProduk("", 0).find((p) => p.barcode === barcode);
    if (found) {
      Alert.alert(
        found.nama,
        `Harga: ${formatRupiah(found.harga)}\nStok: ${found.stok} ${found.satuan}\nBarcode: ${found.barcode || "-"}`,
        [
          { text: "Tutup", style: "cancel" },
          {
            text: "Edit",
            onPress: () => navigation.navigate("EditProduk", { id: found.id }),
          },
        ],
      );
    } else {
      Alert.alert(
        "Tidak ditemukan",
        `Barcode "${barcode}" tidak ada di database.`,
      );
    }
    setTimeout(() => scanRef.current?.focus(), 200);
  };

  const totalStok = list.reduce((s, p) => s + p.stok, 0);
  const stokMenipis = list.filter(
    (p) => p.stok <= p.stok_minimum && p.stok > 0,
  ).length;
  const stokHabis = list.filter((p) => p.stok === 0).length;

  const ProdukImage = ({
    item,
    style,
    emojiSize = 32,
  }: {
    item: Produk;
    style: any;
    emojiSize?: number;
  }) => {
    if (!showImages) return null;
    const habis = item.stok === 0;
    return (
      <View style={[style, { position: "relative" }]}>
        {item.gambar ? (
          <Image
            source={{ uri: resolveGambarUri(item.gambar) }}
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <View
            style={{
              flex: 1,
              backgroundColor: "#F9FAFB",
              alignItems: "center",
              justifyContent: "center",
            }}>
            <Text style={{ fontSize: emojiSize }}>
              {getKategoriEmoji(item.kategori_nama)}
            </Text>
          </View>
        )}
        {habis && (
          <View
            style={{
              ...(StyleSheet.absoluteFillObject as any),
              backgroundColor: "rgba(0,0,0,0.4)",
              alignItems: "center",
              justifyContent: "center",
            }}>
            <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>
              Habis
            </Text>
          </View>
        )}
        {(item as any).is_konsinyasi === 1 && (
          <View
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              zIndex: 2,
              backgroundColor: "#059669",
              borderRadius: 6,
              paddingHorizontal: 5,
              paddingVertical: 2,
            }}>
            <Text style={{ color: "#fff", fontSize: 8, fontWeight: "800" }}>
              KON
            </Text>
          </View>
        )}
      </View>
    );
  };

  const GridCard = ({ item }: { item: Produk }) => {
    const low = item.stok > 0 && item.stok <= item.stok_minimum;
    const habis = item.stok === 0;
    return (
      <TouchableOpacity
        style={[gc.card, habis && gc.cardHabis]}
        onPress={() => navigation.navigate("EditProduk", { id: item.id })}
        activeOpacity={0.8}>
        <ProdukImage item={item} style={gc.imgWrap} emojiSize={36} />
        <View style={gc.info}>
          <Text style={gc.nama} numberOfLines={2}>
            {item.nama}
          </Text>
          <Text style={gc.harga}>{formatRupiah(item.harga)}</Text>
          <View style={gc.footer}>
            <View
              style={[
                gc.stokDot,
                habis && { backgroundColor: "#EF4444" },
                low && { backgroundColor: "#F59E0B" },
              ]}
            />
            <Text
              style={[
                gc.stokTxt,
                habis && { color: "#DC2626" },
                low && { color: "#D97706" },
              ]}>
              {habis ? "Habis" : `${item.stok}`}
            </Text>
          </View>
          <View style={gc.actionRow}>
            <TouchableOpacity
              style={gc.editBtn}
              onPress={() =>
                navigation.navigate("EditProduk", { id: item.id })
              }>
              <Ionicons
                name="pencil-outline"
                size={13}
                color={Colors.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={gc.hapusBtn}
              onPress={() =>
                Alert.alert("Hapus Produk", `Hapus "${item.nama}"?`, [
                  { text: "Batal", style: "cancel" },
                  {
                    text: "Hapus",
                    style: "destructive",
                    onPress: () => {
                      hapusProduk(item.id);
                      load();
                    },
                  },
                ])
              }>
              <Ionicons name="trash-outline" size={13} color={Colors.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const ListCard = ({ item }: { item: Produk }) => {
    const low = item.stok > 0 && item.stok <= item.stok_minimum;
    const habis = item.stok === 0;
    const marginPct =
      item.harga_modal > 0
        ? Math.round(((item.harga - item.harga_modal) / item.harga) * 100)
        : null;
    // FIX: tampilkan nama kategori apa adanya (sudah include emoji dari DB)
    const katLabel = item.kategori_nama ?? "";
    return (
      <TouchableOpacity
        style={lc.card}
        onPress={() => navigation.navigate("EditProduk", { id: item.id })}
        activeOpacity={0.8}>
        <ProdukImage item={item} style={lc.imgBox} emojiSize={32} />
        <View style={lc.info}>
          <View style={lc.nameRow}>
            <Text style={lc.nama} numberOfLines={1}>
              {item.nama}
            </Text>
            {item.barcode && (
              <View style={lc.barcodePill}>
                <Ionicons name="barcode-outline" size={10} color="#6B7280" />
                <Text style={lc.barcodeTxt}>{item.barcode.slice(-4)}</Text>
              </View>
            )}
          </View>
          <Text style={lc.harga}>{formatRupiah(item.harga)}</Text>
          {marginPct !== null && (
            <Text style={lc.margin}>Margin {marginPct}%</Text>
          )}
          <View style={lc.footer}>
            <View
              style={[
                lc.stokPill,
                habis && { backgroundColor: "#FEF2F2" },
                low && { backgroundColor: "#FFFBEB" },
              ]}>
              <View
                style={[
                  lc.dot,
                  habis && { backgroundColor: "#EF4444" },
                  low && { backgroundColor: "#F59E0B" },
                ]}
              />
              <Text
                style={[
                  lc.stokTxt,
                  habis && { color: "#DC2626" },
                  low && { color: "#D97706" },
                ]}>
                {habis ? "Habis" : `${item.stok} ${item.satuan}`}
              </Text>
            </View>
            {/* FIX: tampilkan katLabel dengan numberOfLines={1} supaya tidak meluber */}
            {katLabel && katLabel !== "Semua" && (
              <View style={lc.katPill}>
                <Text style={lc.katTxt} numberOfLines={1}>
                  {katLabel}
                </Text>
              </View>
            )}
          </View>
        </View>
        <View style={lc.actions}>
          <TouchableOpacity
            style={lc.editBtn2}
            onPress={() => navigation.navigate("EditProduk", { id: item.id })}>
            <Ionicons name="pencil-outline" size={15} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={lc.hapusBtn}
            onPress={() =>
              Alert.alert("Hapus Produk", `Hapus "${item.nama}"?`, [
                { text: "Batal", style: "cancel" },
                {
                  text: "Hapus",
                  style: "destructive",
                  onPress: () => {
                    hapusProduk(item.id);
                    load();
                  },
                },
              ])
            }>
            <Ionicons name="trash-outline" size={15} color={Colors.danger} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Produk</Text>
          <Text style={s.headerSub}>
            {list.length} item · stok {totalStok}
          </Text>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity
            style={[
              s.iconBtn,
              !showImages && { backgroundColor: "rgba(255,255,255,0.35)" },
            ]}
            onPress={() => setShowImages((v) => !v)}>
            <Ionicons
              name={showImages ? "eye-outline" : "eye-off-outline"}
              size={18}
              color="#fff"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.iconBtn, { backgroundColor: "#16A34A" }]}
            onPress={() => navigation.navigate("ImportExcel")}>
            <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.iconBtn, scanMode && { backgroundColor: "#3B82F6" }]}
            onPress={() => {
              setScanMode(!scanMode);
              if (!scanMode) setTimeout(() => scanRef.current?.focus(), 200);
            }}>
            <Ionicons name="scan-outline" size={19} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.addProdukBtn}
            onPress={() => navigation.navigate("TambahProduk")}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={s.addProdukTxt}>Tambah</Text>
          </TouchableOpacity>
        </View>
      </View>

      {scanMode && (
        <View style={s.scanBar}>
          <Ionicons name="barcode-outline" size={18} color="#9CA3AF" />
          <TextInput
            ref={scanRef}
            style={s.scanInput}
            value={scanVal}
            onChangeText={setScanVal}
            onSubmitEditing={handleScanSubmit}
            placeholder="Scan barcode untuk cek stok..."
            placeholderTextColor="#9CA3AF"
            returnKeyType="search"
            blurOnSubmit={false}
            autoFocus
          />
          <View style={s.scanReady}>
            <View style={[s.scanDot, { backgroundColor: "#22C55E" }]} />
            <Text style={s.scanReadyTxt}>Siap scan</Text>
          </View>
        </View>
      )}

      {!scanMode && (
        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={17} color="#9CA3AF" />
          <TextInput
            style={s.searchInput2}
            placeholder="Cari nama atau barcode..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#9CA3AF"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={17} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={s.statRow}>
        {stokMenipis > 0 && (
          <View style={s.statChipWarn}>
            <Ionicons name="warning-outline" size={11} color="#D97706" />
            <Text style={s.statChipWarnTxt}>{stokMenipis} menipis</Text>
          </View>
        )}
        {stokHabis > 0 && (
          <View style={s.statChipDanger}>
            <Ionicons name="close-circle-outline" size={11} color="#DC2626" />
            <Text style={s.statChipDangerTxt}>{stokHabis} habis</Text>
          </View>
        )}
        {!showImages && (
          <View style={s.hideImgChip}>
            <Ionicons name="eye-off-outline" size={11} color="#6B7280" />
            <Text style={s.hideImgTxt}>Gambar disembunyikan</Text>
          </View>
        )}
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={s.sortBtn}
          onPress={() => {
            const opts: ("nama" | "harga" | "stok")[] = [
              "nama",
              "harga",
              "stok",
            ];
            setSortBy(opts[(opts.indexOf(sortBy) + 1) % opts.length]);
          }}>
          <Ionicons name="swap-vertical-outline" size={13} color="#6B7280" />
          <Text style={s.sortTxt}>
            {sortBy === "nama" ? "A–Z" : sortBy === "harga" ? "Harga" : "Stok"}
          </Text>
        </TouchableOpacity>
        <View style={s.viewToggle}>
          <TouchableOpacity
            style={[s.viewBtn, viewMode === "list" && s.viewBtnActive]}
            onPress={() => setViewMode("list")}>
            <Ionicons
              name="list-outline"
              size={16}
              color={viewMode === "list" ? Colors.primary : "#9CA3AF"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.viewBtn, viewMode === "grid" && s.viewBtnActive]}
            onPress={() => setViewMode("grid")}>
            <Ionicons
              name="grid-outline"
              size={16}
              color={viewMode === "grid" ? Colors.primary : "#9CA3AF"}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* FIX: chip kategori pakai getKatIcon + getKatLabel — support nama baru */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.katScroll}
        contentContainerStyle={s.katContent}>
        {kats.map((k) => {
          const active = (activeKat === 0 && k.id === 1) || activeKat === k.id;
          return (
            <TouchableOpacity
              key={k.id}
              style={[s.katChip, active && s.katChipActive]}
              onPress={() => setActiveKat(k.id === 1 ? 0 : k.id)}>
              <Ionicons
                name={getKatIcon(k.nama)}
                size={13}
                color={active ? Colors.primary : "rgba(255,255,255,0.6)"}
              />
              <Text style={[s.katTxt, active && s.katTxtActive]}>
                {getKatLabel(k.nama)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        key={viewMode}
        data={list}
        keyExtractor={(i) => i.id.toString()}
        numColumns={viewMode === "grid" ? 2 : 1}
        renderItem={({ item }) =>
          viewMode === "grid" ? (
            <GridCard item={item} />
          ) : (
            <ListCard item={item} />
          )
        }
        contentContainerStyle={[
          s.listContent,
          list.length === 0 && { flexGrow: 1 },
        ]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() =>
          viewMode === "list" ? <View style={{ height: 8 }} /> : null
        }
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <View style={s.emptyIcon}>
              <Ionicons name="cube-outline" size={44} color="#D1D5DB" />
            </View>
            <Text style={s.emptyTitle}>
              {search ? `"${search}" tidak ditemukan` : "Belum ada produk"}
            </Text>
            <Text style={s.emptySub}>
              {search
                ? "Coba kata kunci lain"
                : "Tap tombol Tambah untuk menambah produk"}
            </Text>
            {!search && (
              <TouchableOpacity
                style={s.emptyBtn}
                onPress={() => navigation.navigate("TambahProduk")}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={s.emptyBtnTxt}>Tambah Produk Pertama</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
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
  headerActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  addProdukBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#3B82F6",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
  },
  addProdukTxt: { color: "#fff", fontSize: 13, fontWeight: "700" },
  scanBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  scanInput: { flex: 1, fontSize: 14, color: "#111827" },
  scanReady: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  scanDot: { width: 6, height: 6, borderRadius: 3 },
  scanReadyTxt: { fontSize: 10, fontWeight: "600", color: "#16A34A" },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput2: { flex: 1, fontSize: 14, color: "#fff" },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  statChipWarn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statChipWarnTxt: { fontSize: 10, fontWeight: "700", color: "#D97706" },
  statChipDanger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statChipDangerTxt: { fontSize: 10, fontWeight: "700", color: "#DC2626" },
  hideImgChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  hideImgTxt: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
  },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
  },
  sortTxt: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.8)" },
  viewToggle: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 10,
    padding: 2,
  },
  viewBtn: {
    width: 30,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  viewBtnActive: { backgroundColor: "#fff" },
  katScroll: { flexGrow: 0, backgroundColor: Colors.primary, minHeight: 46 },
  katContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 7,
    paddingVertical: 4,
    alignItems: "center",
  },
  katChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  katChipActive: { backgroundColor: "#fff" },
  katTxt: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.65)" },
  katTxtActive: { color: Colors.primary },
  listContent: { padding: 12, backgroundColor: "#F3F4F6", paddingBottom: 100 },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 10,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#374151" },
  emptySub: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    paddingHorizontal: 32,
  },
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
});

const lc = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  imgBox: { width: 80, height: 80, flexShrink: 0 },
  img: { width: "100%", height: "100%" },
  imgEmpty: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  imgEmoji: { fontSize: 32 },
  habisOverlay: {
    ...(StyleSheet.absoluteFillObject as any),
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  habisLbl: { color: "#fff", fontSize: 10, fontWeight: "800" },
  info: { flex: 1, paddingHorizontal: 11, paddingVertical: 10 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  nama: { flex: 1, fontSize: 13, fontWeight: "700", color: "#111827" },
  barcodePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  barcodeTxt: { fontSize: 9, color: "#6B7280", fontFamily: "monospace" },
  harga: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.primary,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  margin: {
    fontSize: 10,
    color: "#16A34A",
    fontWeight: "600",
    marginBottom: 4,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  stokPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#22C55E" },
  stokTxt: { fontSize: 11, fontWeight: "600", color: "#16A34A" },
  katPill: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    maxWidth: 120,
  },
  katTxt: { fontSize: 10, fontWeight: "600", color: "#2563EB" },
  actions: { paddingRight: 10, gap: 6, alignItems: "center" },
  editBtn2: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  hapusBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.dangerLight,
    alignItems: "center",
    justifyContent: "center",
  },
  editBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  addBtnFilled: { backgroundColor: "#3B82F6", borderColor: "#3B82F6" },
  qtyBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    backgroundColor: "#3B82F6",
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  qtyTxt: { color: "#fff", fontSize: 9, fontWeight: "900" },
  cardActive: { borderColor: "#3B82F6", borderWidth: 1.5 },
});

const gc = StyleSheet.create({
  card: {
    flex: 1,
    margin: 4,
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
  },
  cardHabis: { opacity: 0.65 },
  cardActive: { borderColor: "#3B82F6", borderWidth: 1.5 },
  imgWrap: { width: "100%", aspectRatio: 1 },
  img: { width: "100%", height: "100%" },
  imgEmpty: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  imgEmoji: { fontSize: 36 },
  habisOverlay: {
    ...(StyleSheet.absoluteFillObject as any),
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  habisLbl: { color: "#fff", fontSize: 12, fontWeight: "800" },
  info: { padding: 10 },
  nama: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 16,
    marginBottom: 3,
  },
  harga: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.primary,
    marginBottom: 6,
  },
  footer: { flexDirection: "row", alignItems: "center", gap: 4 },
  stokDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#22C55E" },
  stokTxt: { fontSize: 10, fontWeight: "600", color: "#16A34A", flex: 1 },
  actionRow: { flexDirection: "row", gap: 6, marginTop: 8 },
  editBtn: {
    flex: 1,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  hapusBtn: {
    flex: 1,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.dangerLight,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtn: {
    position: "absolute",
    bottom: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  addBtnFilled: { backgroundColor: "#3B82F6", borderColor: "#3B82F6" },
  qtyBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    zIndex: 2,
    backgroundColor: "#3B82F6",
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: "#fff",
  },
  qtyTxt: { color: "#fff", fontSize: 9, fontWeight: "900" },
});
