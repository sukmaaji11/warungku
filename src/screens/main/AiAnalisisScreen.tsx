import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { formatRupiah, todayString } from "../../utils/format";
import {
  getRingkasan,
  getTerlaris,
  getOmset7Hari,
} from "../../db/transaksiRepo";
import { getProdukMenipis } from "../../db/produkRepo";
import { Colors } from "../../constants";


interface Insight {
  type: "success" | "warning" | "info" | "danger";
  title: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const TYPE_STYLE = {
  success: {
    bg: "#F0FDF4",
    border: "#BBF7D0",
    icon: "#16A34A",
    title: "#14532D",
  },
  warning: {
    bg: "#FFFBEB",
    border: "#FDE68A",
    icon: "#D97706",
    title: "#78350F",
  },
  info: { bg: "#EFF6FF", border: "#BFDBFE", icon: "#2563EB", title: "#1E3A5F" },
  danger: {
    bg: "#FEF2F2",
    border: "#FECACA",
    icon: "#DC2626",
    title: "#7F1D1D",
  },
};

export default function AiAnalisisScreen() {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [summary, setSummary] = useState("");
  const [rekomendasi, setRekomendasi] = useState<string[]>([]);
  const [prediksi, setPrediksi] = useState("");
  const [generated, setGenerated] = useState(false);

  const [ring, setRing] = useState<any>({});
  const [terlaris, setTerlaris] = useState<any[]>([]);
  const [menipis, setMenipis] = useState<any[]>([]);
  const [omset7, setOmset7] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      setRing(getRingkasan(todayString()));
      setTerlaris(getTerlaris(5, "bulan"));
      setMenipis(getProdukMenipis());
      setOmset7(getOmset7Hari());
    }, []),
  );

  const handleAnalisis = async () => {
    setLoading(true);
    setGenerated(false);

    const omsetTotal = omset7.reduce((s: number, o: any) => s + o.omset, 0);
    const rataHari =
      omset7.length > 0 ? Math.round(omsetTotal / omset7.length) : 0;

    const prompt = `Kamu adalah analis bisnis UMKM Indonesia yang berpengalaman dan ramah.
Analisis data penjualan toko ini dan berikan insight dalam Bahasa Indonesia yang mudah dipahami pemilik warung/UMKM.

DATA PENJUALAN:
- Omset hari ini: ${formatRupiah(ring.omset || 0)}
- Total transaksi hari ini: ${ring.trx || 0}
- Item terjual hari ini: ${ring.qty || 0}
- Omset 7 hari terakhir: ${formatRupiah(omsetTotal)}
- Rata-rata omset per hari: ${formatRupiah(rataHari)}
- Produk terlaris bulan ini: ${
      terlaris
        .slice(0, 3)
        .map((p: any) => `${p.nama_produk} (${p.qty} terjual)`)
        .join(", ") || "belum ada data"
    }
- Stok menipis: ${menipis.length} produk (${
      menipis
        .slice(0, 3)
        .map((p: any) => p.nama)
        .join(", ") || "tidak ada"
    })
- Total diskon diberikan hari ini: ${formatRupiah(ring.diskon || 0)}

Berikan analisis dalam format JSON berikut (HANYA JSON, tidak ada teks lain):
{
  "ringkasan": "2-3 kalimat ringkasan performa toko hari ini dan tren 7 hari",
  "insights": [
    {"type": "success|warning|info|danger", "title": "judul singkat", "desc": "penjelasan 1-2 kalimat", "icon": "trending-up-outline|alert-circle-outline|bulb-outline|warning-outline"},
    ... (3-4 insights)
  ],
  "rekomendasi": ["aksi konkret 1", "aksi konkret 2", "aksi konkret 3"],
  "prediksi": "prediksi omset minggu depan dalam 1 kalimat berdasarkan tren"
}`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await res.json();
      const text = data.content?.[0]?.text || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      setSummary(parsed.ringkasan || "");
      setInsights(parsed.insights || []);
      setRekomendasi(parsed.rekomendasi || []);
      setPrediksi(parsed.prediksi || "");
      setGenerated(true);
    } catch (e) {
      // Fallback: generate insight lokal kalau AI tidak tersedia
      const localInsights: Insight[] = [];

      if (menipis.length > 0) {
        localInsights.push({
          type: "warning",
          title: `${menipis.length} Produk Stok Menipis`,
          desc: `Segera isi stok: ${menipis
            .slice(0, 2)
            .map((p: any) => p.nama)
            .join(", ")}`,
          icon: "alert-circle-outline",
        });
      }
      if (ring.trx > 0) {
        localInsights.push({
          type: "success",
          title: "Transaksi Berjalan",
          desc: `${ring.trx} transaksi dengan omset ${formatRupiah(ring.omset)} hari ini`,
          icon: "trending-up-outline",
        });
      }
      if (terlaris.length > 0) {
        localInsights.push({
          type: "info",
          title: "Produk Terlaris",
          desc: `${terlaris[0]?.nama_produk} adalah produk terlaris bulan ini dengan ${terlaris[0]?.qty} terjual`,
          icon: "star-outline",
        });
      }
      // localInsights.push({
      //   type: "info",
      //   title: "Tips: Aktifkan AI",
      //   desc: "Koneksi internet diperlukan untuk analisis AI yang lebih mendalam dan akurat.",
      //   icon: "bulb-outline",
      // });

      setSummary(
        `Berdasarkan data lokal: Anda memiliki ${ring.trx || 0} transaksi hari ini dengan total omset ${formatRupiah(ring.omset || 0)}.`,
      );
      setInsights(localInsights);
      setRekomendasi([
        "Segera isi stok produk yang menipis",
        "Tawarkan promo untuk meningkatkan transaksi",
        "Catat semua transaksi untuk laporan akurat",
      ]);
      setPrediksi("Aktifkan internet untuk prediksi berbasis AI.");
      setGenerated(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Analisis WarungKu</Text>
          <Text style={s.headerSub}>Insight cerdas untuk bisnis Anda</Text>
        </View>
        <View style={s.aiBadge}>
          <Ionicons name="sparkles" size={12} color="#818CF8" />
          <Text style={s.aiBadgeTxt}>Beta</Text>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}>
        {/* Data snapshot */}
        <View style={s.snapshotCard}>
          <View style={s.snapshotHeader}>
            <Ionicons name="stats-chart-outline" size={16} color={Colors.primary} />
            <Text style={s.snapshotTitle}>Data yang akan dianalisis</Text>
          </View>
          <View style={s.snapshotGrid}>
            {[
              {
                label: "Omset Hari Ini",
                val: formatRupiah(ring.omset || 0),
                icon: "cash-outline",
                color: "#16A34A",
              },
              {
                label: "Transaksi",
                val: `${ring.trx || 0}x`,
                icon: "receipt-outline",
                color: "#2563EB",
              },
              {
                label: "Stok Menipis",
                val: `${menipis.length} produk`,
                icon: "alert-circle-outline",
                color: menipis.length > 0 ? "#DC2626" : "#16A34A",
              },
              {
                label: "Produk Terlaris",
                val: terlaris[0]?.nama_produk?.split(" ")[0] || "-",
                icon: "star-outline",
                color: "#D97706",
              },
            ].map((item) => (
              <View key={item.label} style={s.snapshotItem}>
                <Ionicons
                  name={item.icon as any}
                  size={16}
                  color={item.color}
                />
                <Text style={s.snapshotVal}>{item.val}</Text>
                <Text style={s.snapshotLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Generate button */}
        {!generated && (
          <TouchableOpacity
            style={[s.generateBtn, loading && { opacity: 0.7 }]}
            onPress={handleAnalisis}
            disabled={loading}>
            {loading ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={s.generateBtnTxt}>Menganalisis data...</Text>
              </>
            ) : (
              <>
                <Ionicons name="sparkles-outline" size={20} color="#fff" />
                <Text style={s.generateBtnTxt}>Generate Analisis WarungKu</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {generated && (
          <>
            {/* Ringkasan */}
            <View style={s.summaryCard}>
              <View style={s.summaryCardHeader}>
                <Ionicons name="document-text-outline" size={16} color={Colors.primary} />
                <Text style={s.summaryCardTitle}>Ringkasan Performa</Text>
              </View>
              <Text style={s.summaryTxt}>{summary}</Text>
            </View>

            {/* Insights */}
            <Text style={s.sectionLabel}>INSIGHT PENTING</Text>
            {insights.map((insight, i) => {
              const ts = TYPE_STYLE[insight.type] || TYPE_STYLE.info;
              return (
                <View
                  key={i}
                  style={[
                    s.insightCard,
                    { backgroundColor: ts.bg, borderColor: ts.border },
                  ]}>
                  <View
                    style={[
                      s.insightIcon,
                      { backgroundColor: ts.icon + "20" },
                    ]}>
                    <Ionicons name={insight.icon} size={18} color={ts.icon} />
                  </View>
                  <View style={s.insightInfo}>
                    <Text style={[s.insightTitle, { color: ts.title }]}>
                      {insight.title}
                    </Text>
                    <Text style={[s.insightDesc, { color: ts.title + "CC" }]}>
                      {insight.desc}
                    </Text>
                  </View>
                </View>
              );
            })}

            {/* Rekomendasi */}
            <Text style={s.sectionLabel}>REKOMENDASI AKSI</Text>
            <View style={s.rekomendasiCard}>
              {rekomendasi.map((r, i) => (
                <View
                  key={i}
                  style={[
                    s.rekomendasiRow,
                    i < rekomendasi.length - 1 && s.rekomendasiBorder,
                  ]}>
                  <View style={s.rekomendasiNum}>
                    <Text style={s.rekomendasiNumTxt}>{i + 1}</Text>
                  </View>
                  <Text style={s.rekomendasiTxt}>{r}</Text>
                </View>
              ))}
            </View>

            {/* Prediksi */}
            {/* {prediksi && (
              <View style={s.prediksiCard}>
                <View style={s.prediksiHeader}>
                  <Ionicons
                    name="telescope-outline"
                    size={16}
                    color="#7C3AED"
                  />
                  <Text style={s.prediksiTitle}>Prediksi Minggu Depan</Text>
                </View>
                <Text style={s.prediksiTxt}>{prediksi}</Text>
              </View>
            )} */}

            {/* Refresh */}
            <TouchableOpacity
              style={s.refreshBtn}
              onPress={handleAnalisis}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color={Colors.primary} size="small" />
              ) : (
                <>
                  <Ionicons name="refresh-outline" size={16} color={Colors.primary} />
                  <Text style={s.refreshTxt}>Analisis Ulang</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
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
    paddingBottom: 16,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  headerSub: { color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 2 },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(129,140,248,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(129,140,248,0.3)",
  },
  aiBadgeTxt: { color: "#818CF8", fontSize: 11, fontWeight: "700" },

  scroll: { flex: 1, backgroundColor: "#F3F4F6" },
  content: { padding: 16, paddingBottom: 32 },

  snapshotCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
  },
  snapshotHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  snapshotTitle: { fontSize: 13, fontWeight: "700", color: Colors.text },
  snapshotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  snapshotItem: {
    width: "45%",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
  },
  snapshotVal: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },
  snapshotLabel: { fontSize: 10, color: "#9CA3AF", textAlign: "center" },

  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#4F46E5",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  generateBtnTxt: { color: "#fff", fontSize: 16, fontWeight: "800" },

  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
  },
  summaryCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  summaryCardTitle: { fontSize: 13, fontWeight: "700", color: Colors.text },
  summaryTxt: { fontSize: 14, color: "#374151", lineHeight: 22 },

  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },

  insightCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  insightIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  insightInfo: { flex: 1 },
  insightTitle: { fontSize: 13, fontWeight: "700", marginBottom: 3 },
  insightDesc: { fontSize: 12, lineHeight: 18 },

  rekomendasiCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    marginBottom: 16,
  },
  rekomendasiRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
  },
  rekomendasiBorder: { borderBottomWidth: 0.5, borderBottomColor: "#F3F4F6" },
  rekomendasiNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  rekomendasiNumTxt: { color: "#fff", fontSize: 11, fontWeight: "800" },
  rekomendasiTxt: { flex: 1, fontSize: 13, color: "#374151", lineHeight: 20 },

  prediksiCard: {
    backgroundColor: "#F5F3FF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    marginBottom: 16,
  },
  prediksiHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  prediksiTitle: { fontSize: 13, fontWeight: "700", color: "#7C3AED" },
  prediksiTxt: { fontSize: 13, color: "#5B21B6", lineHeight: 20 },

  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
  },
  refreshTxt: { fontSize: 13, fontWeight: "700", color: Colors.textLight },
});
