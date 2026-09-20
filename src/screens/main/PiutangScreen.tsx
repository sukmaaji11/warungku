// src/screens/main/PiutangScreen.tsx
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants";
import { formatRupiah, todayString } from "../../utils/format";
import { getDB } from "../../db/database";

function initPembayaranHutang() {
  try {
    getDB().execSync(`
      CREATE TABLE IF NOT EXISTS pembayaran_hutang (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        transaksi_id INTEGER NOT NULL,
        jumlah       INTEGER NOT NULL DEFAULT 0,
        status       TEXT NOT NULL DEFAULT 'sebagian',
        sisa         INTEGER NOT NULL DEFAULT 0,
        tanggal      TEXT DEFAULT (date('now','localtime')),
        catatan      TEXT
      )
    `);
    // Tambah kolom pelanggan_id ke transaksi jika belum ada
    try {
      getDB().execSync(`ALTER TABLE transaksi ADD COLUMN pelanggan_id INTEGER`);
    } catch {}
  } catch {}
}

function getPiutang(): any[] {
  try {
    return getDB().getAllSync(
      // ── FIX: JOIN ke pelanggan dengan multiple fallback ──────────────────
      // Problem lama: pelanggan_id di transaksi tidak selalu diisi,
      // padahal nama pelanggan bisa juga diambil dari field kasir atau catatan
      // Sekarang: prioritas nama dari tabel pelanggan, fallback ke 'Pelanggan Umum'
      `SELECT
        t.id, t.no_trx, t.total, t.waktu, t.kasir, t.pelanggan_id,
        CASE
          WHEN pel.nama IS NOT NULL AND pel.nama != '' THEN pel.nama
          ELSE 'Pelanggan Umum'
        END as nama_pelanggan,
        pel.no_hp,
        COALESCE(ph.lunas, 0) as lunas,
        COALESCE(ph.bayar_sebagian, 0) as bayar_sebagian,
        COALESCE(ph.sisa, t.total) as sisa
       FROM transaksi t
       LEFT JOIN pelanggan pel ON pel.id = t.pelanggan_id
       LEFT JOIN (
         SELECT transaksi_id,
                MAX(CASE WHEN status='lunas' THEN 1 ELSE 0 END) as lunas,
                SUM(CASE WHEN status='sebagian' THEN jumlah ELSE 0 END) as bayar_sebagian,
                MIN(sisa) as sisa
         FROM pembayaran_hutang GROUP BY transaksi_id
       ) ph ON ph.transaksi_id = t.id
       WHERE t.metode_bayar = 'hutang'
         AND COALESCE(ph.lunas, 0) = 0
       ORDER BY t.waktu DESC`,
    ) as any[];
  } catch (e) {
    console.warn("[getPiutang] error:", e);
    try {
      return getDB().getAllSync(
        `SELECT id, no_trx, total, waktu, kasir, pelanggan_id,
                'Pelanggan Umum' as nama_pelanggan, NULL as no_hp,
                0 as lunas, 0 as bayar_sebagian, total as sisa
         FROM transaksi WHERE metode_bayar = 'hutang'
         ORDER BY waktu DESC`,
      ) as any[];
    } catch {
      return [];
    }
  }
}

function bayarHutang(transaksi_id: number, jumlah: number, sisa: number) {
  const status = sisa <= 0 ? "lunas" : "sebagian";
  getDB().runSync(
    `INSERT INTO pembayaran_hutang (transaksi_id, jumlah, status, sisa) VALUES (?,?,?,?)`,
    [transaksi_id, jumlah, status, Math.max(0, sisa)],
  );
}

export function PiutangScreen({ navigation }: any) {
  const [list, setList] = useState<any[]>([]);
  const [showBayar, setShowBayar] = useState<any>(null);
  const [inputBayar, setInputBayar] = useState("");

  const load = () => {
    initPembayaranHutang();
    setList(getPiutang());
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, []),
  );

  const totalPiutang = list.reduce((s, p) => s + (p.sisa || p.total || 0), 0);

  const handleBayar = () => {
    if (!showBayar) return;
    const jumlah = parseInt(inputBayar.replace(/\D/g, "")) || 0;
    if (jumlah <= 0) {
      Alert.alert("Error", "Masukkan jumlah pembayaran");
      return;
    }
    const sisa = (showBayar.sisa || showBayar.total) - jumlah;
    bayarHutang(showBayar.id, jumlah, sisa);
    Alert.alert(
      "Berhasil",
      sisa <= 0
        ? "Hutang lunas! ✅"
        : `Sisa hutang: ${formatRupiah(Math.max(0, sisa))}`,
    );
    setShowBayar(null);
    setInputBayar("");
    load();
  };

  return (
    <SafeAreaView style={pi.safe} edges={["top"]}>
      <View style={pi.header}>
        <TouchableOpacity
          style={pi.backBtn}
          onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={pi.headerTitle}>Piutang Pelanggan</Text>
          <Text style={pi.headerSub}>{list.length} transaksi belum lunas</Text>
        </View>
      </View>

      <View style={pi.totalCard}>
        <Text style={pi.totalLabel}>Total Piutang Belum Lunas</Text>
        <Text style={pi.totalVal}>{formatRupiah(totalPiutang)}</Text>
      </View>

      <FlatList
        data={list}
        keyExtractor={(i) => i.id.toString()}
        contentContainerStyle={pi.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={pi.empty}>
            <Ionicons
              name="checkmark-circle-outline"
              size={48}
              color={Colors.success}
            />
            <Text style={[pi.emptyTxt, { color: Colors.success }]}>
              Tidak ada piutang!
            </Text>
            <Text style={pi.emptySub}>Semua transaksi hutang sudah lunas</Text>
          </View>
        }
        renderItem={({ item }) => {
          const sisa = item.sisa || item.total;
          const hariIni = todayString();
          const tglTrx = item.waktu?.slice(0, 10) || "";
          const selisihHari = Math.floor(
            (new Date(hariIni).getTime() - new Date(tglTrx).getTime()) /
              86400000,
          );
          // ── FIX: initial avatar dari nama yang benar ──
          const namaDisplay = item.nama_pelanggan || "Pelanggan Umum";
          const initialChar = namaDisplay.charAt(0).toUpperCase();

          return (
            <View style={pi.card}>
              <View style={pi.cardHeader}>
                <View style={pi.avatarWrap}>
                  <Text style={pi.avatarTxt}>{initialChar}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={pi.namaPel}>{namaDisplay}</Text>
                  {item.no_hp ? (
                    <Text style={pi.hpPel}>{item.no_hp}</Text>
                  ) : null}
                  {/* Tampilkan badge "Tanpa Pelanggan" jika belum terhubung */}
                  {!item.pelanggan_id && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        marginTop: 2,
                      }}>
                      <Ionicons
                        name="person-outline"
                        size={10}
                        color={Colors.textMuted}
                      />
                      <Text style={{ fontSize: 10, color: Colors.textMuted }}>
                        Tanpa akun pelanggan
                      </Text>
                    </View>
                  )}
                </View>
                <View
                  style={[
                    pi.umurBadge,
                    selisihHari > 7 && { backgroundColor: Colors.dangerLight },
                  ]}>
                  <Text
                    style={[
                      pi.umurTxt,
                      selisihHari > 7 && { color: Colors.danger },
                    ]}>
                    {selisihHari === 0 ? "Hari ini" : `${selisihHari}h lalu`}
                  </Text>
                </View>
              </View>
              <View style={pi.cardBody}>
                <View style={pi.infoRow}>
                  <Text style={pi.infoKey}>No. Transaksi</Text>
                  <Text style={pi.infoVal}>{item.no_trx}</Text>
                </View>
                <View style={pi.infoRow}>
                  <Text style={pi.infoKey}>Total Transaksi</Text>
                  <Text style={pi.infoVal}>{formatRupiah(item.total)}</Text>
                </View>
                {item.bayar_sebagian > 0 && (
                  <View style={pi.infoRow}>
                    <Text style={pi.infoKey}>Sudah Dibayar</Text>
                    <Text style={[pi.infoVal, { color: Colors.success }]}>
                      {formatRupiah(item.bayar_sebagian)}
                    </Text>
                  </View>
                )}
                <View style={pi.infoRow}>
                  <Text style={pi.infoKey}>Sisa Hutang</Text>
                  <Text
                    style={[
                      pi.infoVal,
                      { color: Colors.danger, fontWeight: "800" },
                    ]}>
                    {formatRupiah(sisa)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={pi.bayarBtn}
                onPress={() => {
                  setShowBayar(item);
                  setInputBayar(sisa.toString());
                }}>
                <Ionicons name="cash-outline" size={16} color="#fff" />
                <Text style={pi.bayarBtnTxt}>Bayar Hutang</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />

      {/* Modal bayar */}
      <Modal visible={!!showBayar} transparent animationType="slide">
        <SafeAreaView style={{ flex: 1, justifyContent: "flex-end" }}>
          <TouchableOpacity
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: "rgba(0,0,0,0.5)" },
            ]}
            onPress={() => setShowBayar(null)}
            activeOpacity={1}
          />
          <View style={pi.sheet}>
            <View style={pi.sheetHandle} />
            <Text style={pi.sheetTitle}>Catat Pembayaran</Text>
            <Text style={pi.sheetSub}>
              {showBayar?.nama_pelanggan} · {showBayar?.no_trx}
            </Text>
            <View style={pi.sisaBox}>
              <Text style={pi.sisaLabel}>Sisa Hutang</Text>
              <Text style={pi.sisaVal}>
                {formatRupiah(showBayar?.sisa || showBayar?.total || 0)}
              </Text>
            </View>
            <Text style={pi.fieldLabel}>JUMLAH YANG DIBAYAR</Text>
            <View style={pi.inputWrap}>
              <Text style={pi.prefix}>Rp</Text>
              <TextInput
                style={pi.input}
                placeholder="0"
                placeholderTextColor={Colors.textDisabled}
                keyboardType="numeric"
                value={inputBayar}
                onChangeText={(v) => setInputBayar(v.replace(/\D/g, ""))}
                autoFocus
              />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 8, marginBottom: 16 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {[showBayar?.sisa || 0, 10000, 20000, 50000, 100000]
                  .filter((v, i, a) => v > 0 && a.indexOf(v) === i)
                  .map((v) => (
                    <TouchableOpacity
                      key={v}
                      style={pi.quickChip}
                      onPress={() => setInputBayar(v.toString())}>
                      <Text style={pi.quickChipTxt}>{formatRupiah(v)}</Text>
                    </TouchableOpacity>
                  ))}
              </View>
            </ScrollView>
            <View style={pi.sheetBtns}>
              <TouchableOpacity
                style={pi.btnBatal}
                onPress={() => setShowBayar(null)}>
                <Text style={pi.btnBatalTxt}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={pi.btnSimpan} onPress={handleBayar}>
                <Text style={pi.btnSimpanTxt}>Simpan Pembayaran</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const pi = StyleSheet.create({
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
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,.55)", fontSize: 12 },
  totalCard: {
    backgroundColor: Colors.dangerLight,
    marginHorizontal: 14,
    borderRadius: 16,
    padding: 16,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: Colors.dangerBorder,
  },
  totalLabel: {
    fontSize: 12,
    color: Colors.danger,
    fontWeight: "600",
    marginBottom: 4,
  },
  totalVal: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.danger,
    letterSpacing: -1,
  },
  listContent: {
    padding: 14,
    gap: 12,
    backgroundColor: Colors.background,
    flexGrow: 1,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: { color: "#fff", fontSize: 16, fontWeight: "800" },
  namaPel: { fontSize: 14, fontWeight: "700", color: Colors.text },
  hpPel: { fontSize: 12, color: Colors.textMuted },
  umurBadge: {
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  umurTxt: { fontSize: 11, fontWeight: "600", color: Colors.textMuted },
  cardBody: {
    gap: 6,
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  infoRow: { flexDirection: "row", justifyContent: "space-between" },
  infoKey: { fontSize: 12, color: Colors.textMuted },
  infoVal: { fontSize: 12, fontWeight: "600", color: Colors.text },
  bayarBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.success,
    borderRadius: 12,
    padding: 12,
  },
  bayarBtnTxt: { color: "#fff", fontSize: 14, fontWeight: "700" },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTxt: { fontSize: 16, fontWeight: "700" },
  emptySub: { fontSize: 13, color: Colors.textMuted },
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
  sheetSub: { fontSize: 12, color: Colors.textMuted, marginBottom: 14 },
  sisaBox: {
    backgroundColor: Colors.dangerLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    alignItems: "center",
  },
  sisaLabel: {
    fontSize: 11,
    color: Colors.danger,
    fontWeight: "600",
    marginBottom: 4,
  },
  sisaVal: { fontSize: 22, fontWeight: "800", color: Colors.danger },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textMuted,
    marginBottom: 6,
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
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 20,
    fontWeight: "800",
    color: Colors.text,
  },
  prefix: {
    fontSize: 16,
    color: Colors.textMuted,
    fontWeight: "600",
    marginRight: 4,
  },
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickChipTxt: { fontSize: 12, fontWeight: "700", color: Colors.primary },
  sheetBtns: { flexDirection: "row", gap: 10, marginTop: 4 },
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
    backgroundColor: Colors.success,
    alignItems: "center",
  },
  btnSimpanTxt: { fontWeight: "800", color: "#fff" },
});

export default PiutangScreen;
