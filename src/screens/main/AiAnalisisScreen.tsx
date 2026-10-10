import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { formatRupiah, todayString } from '../../utils/format';
import {
  getRingkasan,
  getTerlaris,
  getOmset7Hari,
} from '../../db/transaksiRepo';
import { getProdukMenipis } from '../../db/produkRepo';
import { Colors } from '../../constants';
import {
  getPerformaAnalisis,
  getTopProdukAnalisis,
  getStokMenipisAnalisis,
  ProdukStokMenipis,
  getProdukKontribusiAnalisis,
  getProdukTidakTerjualAnalisis,
  getKecepatanPenjualanProduk,
  getProdukKontribusiSebelumnyaAnalisis,
  getPerbandinganPenjualanProduk,
} from '../../db/analisisRepo';
import DateTimePicker from '@react-native-community/datetimepicker';
import { runAnalysisEngine } from '../../utils/analysisEngine';

interface Insight {
  type: 'success' | 'warning' | 'info' | 'danger';
  title: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const TYPE_STYLE = {
  success: {
    bg: '#FFFFFF',
    border: '#BBF7D0',
    icon: '#16A34A',
    title: '#166534',
    label: 'POSITIF',
  },
  warning: {
    bg: '#FFFFFF',
    border: '#FDE68A',
    icon: '#D97706',
    title: '#92400E',
    label: 'PERHATIAN',
  },
  info: {
    bg: '#FFFFFF',
    border: '#BFDBFE',
    icon: '#2563EB',
    title: '#1E40AF',
    label: 'INFORMASI',
  },
  danger: {
    bg: '#FFFFFF',
    border: '#FECACA',
    icon: '#DC2626',
    title: '#991B1B',
    label: 'PENTING',
  },
};

type PeriodeAnalisis = 'hari' | '7hari' | 'bulan' | 'pilih';

function formatTanggalAnalisis(tanggal: Date): string {
  const tahun = tanggal.getFullYear();
  const bulan = String(tanggal.getMonth() + 1).padStart(2, '0');
  const hari = String(tanggal.getDate()).padStart(2, '0');

  return `${tahun}-${bulan}-${hari}`;
}

function getRentangAnalisis(
  periode: PeriodeAnalisis,
  tanggalMulai: Date,
  tanggalAkhir: Date,
) {
  const sekarang = new Date();
  const hariIni = formatTanggalAnalisis(sekarang);

  if (periode === 'pilih') {
    return {
      dari: formatTanggalAnalisis(tanggalMulai),
      sampai: formatTanggalAnalisis(tanggalAkhir),
    };
  }

  if (periode === '7hari') {
    const awal = new Date(sekarang);
    awal.setDate(awal.getDate() - 6);

    return {
      dari: formatTanggalAnalisis(awal),
      sampai: hariIni,
    };
  }

  if (periode === 'bulan') {
    const awal = new Date(sekarang.getFullYear(), sekarang.getMonth(), 1);

    return {
      dari: formatTanggalAnalisis(awal),
      sampai: hariIni,
    };
  }

  return {
    dari: hariIni,
    sampai: hariIni,
  };
}

function getRentangSebelumnya(dari: string, sampai: string) {
  const parseTanggal = (tanggal: string) => {
    const [tahun, bulan, hari] = tanggal.split('-').map(Number);
    return new Date(tahun, bulan - 1, hari);
  };

  const tanggalMulai = parseTanggal(dari);
  const tanggalAkhir = parseTanggal(sampai);

  const jumlahHari =
    Math.round(
      (tanggalAkhir.getTime() - tanggalMulai.getTime()) / (24 * 60 * 60 * 1000),
    ) + 1;

  const akhirSebelumnya = new Date(tanggalMulai);
  akhirSebelumnya.setDate(akhirSebelumnya.getDate() - 1);

  const mulaiSebelumnya = new Date(akhirSebelumnya);
  mulaiSebelumnya.setDate(mulaiSebelumnya.getDate() - jumlahHari + 1);

  return {
    dari: formatTanggalAnalisis(mulaiSebelumnya),
    sampai: formatTanggalAnalisis(akhirSebelumnya),
  };
}

function hitungPeriodeSebelumnya(
  dari: string,
  sampai: string,
): { dari: string; sampai: string } {
  const awal = new Date(`${dari}T00:00:00`);
  const akhir = new Date(`${sampai}T00:00:00`);

  const durasiHari =
    Math.round((akhir.getTime() - awal.getTime()) / (24 * 60 * 60 * 1000)) + 1;

  const akhirSebelumnya = new Date(awal);
  akhirSebelumnya.setDate(awal.getDate() - 1);

  const awalSebelumnya = new Date(akhirSebelumnya);
  awalSebelumnya.setDate(akhirSebelumnya.getDate() - durasiHari + 1);

  const formatTanggal = (tanggal: Date) => {
    const tahun = tanggal.getFullYear();
    const bulan = String(tanggal.getMonth() + 1).padStart(2, '0');
    const hari = String(tanggal.getDate()).padStart(2, '0');

    return `${tahun}-${bulan}-${hari}`;
  };

  return {
    dari: formatTanggal(awalSebelumnya),
    sampai: formatTanggal(akhirSebelumnya),
  };
}

export default function AiAnalisisScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [summary, setSummary] = useState('');
  const [rekomendasi, setRekomendasi] = useState<string[]>([]);
  const [prediksi, setPrediksi] = useState('');
  const [generated, setGenerated] = useState(false);

  const [ring, setRing] = useState<any>({});
  const [terlaris, setTerlaris] = useState<any[]>([]);
  const [menipis, setMenipis] = useState<any[]>([]);
  const [omset7, setOmset7] = useState<any[]>([]);

  const [periode, setPeriode] = useState<PeriodeAnalisis>('hari');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tanggalBulan, setTanggalBulan] = useState(() => {
    const sekarang = new Date();
    return new Date(sekarang.getFullYear(), sekarang.getMonth(), 1);
  });

  const [bulanDipilih, setBulanDipilih] = useState(() => {
    const sekarang = new Date();
    return `${sekarang.getFullYear()}-${String(
      sekarang.getMonth() + 1,
    ).padStart(2, '0')}`;
  });

  const [tanggalMulai, setTanggalMulai] = useState(new Date());
  const [tanggalAkhir, setTanggalAkhir] = useState(new Date());

  const [pickerAktif, setPickerAktif] = useState<'mulai' | 'akhir' | null>(
    null,
  );

  const [performaSnapshot, setPerformaSnapshot] = useState({
    transaksi: 0,
    omzet: 0,
    produkTerjual: 0,
    rataTransaksi: 0,
  });
  const [topProdukSnapshot, setTopProdukSnapshot] = useState<any[]>([]);
  const [jumlahStokMenipis, setJumlahStokMenipis] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setRing(getRingkasan(todayString()));
      setTerlaris(getTerlaris(5, 'bulan'));
      setMenipis(getProdukMenipis());
      setOmset7(getOmset7Hari());
    }, []),
  );

  {
    /* Handle analisis AI 
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
        .join(', ') || 'belum ada data'
    }
- Stok menipis: ${menipis.length} produk (${
      menipis
        .slice(0, 3)
        .map((p: any) => p.nama)
        .join(', ') || 'tidak ada'
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
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const data = await res.json();
      const text = data.content?.[0]?.text || '';
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);

      setSummary(parsed.ringkasan || '');
      setInsights(parsed.insights || []);
      setRekomendasi(parsed.rekomendasi || []);
      setPrediksi(parsed.prediksi || '');
      setGenerated(true);
    } catch (e) {
      // Fallback: generate insight lokal kalau AI tidak tersedia
      const localInsights: Insight[] = [];

      if (menipis.length > 0) {
        localInsights.push({
          type: 'warning',
          title: `${menipis.length} Produk Stok Menipis`,
          desc: `Segera isi stok: ${menipis
            .slice(0, 2)
            .map((p: any) => p.nama)
            .join(', ')}`,
          icon: 'alert-circle-outline',
        });
      }
      if (ring.trx > 0) {
        localInsights.push({
          type: 'success',
          title: 'Transaksi Berjalan',
          desc: `${ring.trx} transaksi dengan omset ${formatRupiah(ring.omset)} hari ini`,
          icon: 'trending-up-outline',
        });
      }
      if (terlaris.length > 0) {
        localInsights.push({
          type: 'info',
          title: 'Produk Terlaris',
          desc: `${terlaris[0]?.nama_produk} adalah produk terlaris bulan ini dengan ${terlaris[0]?.qty} terjual`,
          icon: 'star-outline',
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
        'Segera isi stok produk yang menipis',
        'Tawarkan promo untuk meningkatkan transaksi',
        'Catat semua transaksi untuk laporan akurat',
      ]);
      setPrediksi('Aktifkan internet untuk prediksi berbasis AI.');
      setGenerated(true);
    } finally {
      setLoading(false);
    }
  };
*/
  }

  const handleAnalisis = () => {
    setLoading(true);
    setGenerated(false);

    try {
      const { dari, sampai } = getRentangAnalisis(
        periode,
        tanggalMulai,
        tanggalAkhir,
      );

      const rentangSebelumnya = getRentangSebelumnya(dari, sampai);

      const performaSebelumnya = getPerformaAnalisis(
        rentangSebelumnya.dari,
        rentangSebelumnya.sampai,
      );

      const performa = getPerformaAnalisis(dari, sampai);
      const topProduk = getTopProdukAnalisis(dari, sampai, 5);
      const produkKontribusi = getProdukKontribusiAnalisis(dari, sampai, 5);
      const stokMenipis = getStokMenipisAnalisis();
      const produkTidakTerjual = getProdukTidakTerjualAnalisis(dari, sampai);
      const produkKecepatanPenjualan = getKecepatanPenjualanProduk(
        dari,
        sampai,
      );

      const periodeSebelumnya = hitungPeriodeSebelumnya(dari, sampai);

      const produkKontribusiSebelumnya = getProdukKontribusiSebelumnyaAnalisis(
        periodeSebelumnya.dari,
        periodeSebelumnya.sampai,
        100,
      );

      const perbandinganPenjualanProduk = getPerbandinganPenjualanProduk(
        dari,
        sampai,
        periodeSebelumnya.dari,
        periodeSebelumnya.sampai,
      );

      setPerformaSnapshot({
        transaksi: performa.transaksi,
        omzet: performa.omzet,
        produkTerjual: performa.produkTerjual,
        rataTransaksi: performa.rataTransaksi,
      });

      setTopProdukSnapshot(topProduk);
      setJumlahStokMenipis(stokMenipis.length);

      const hasil = runAnalysisEngine({
        performa,
        performaSebelumnya,
        topProduk,
        produkKontribusi,
        stokMenipis,
        produkTidakTerjual,
        produkKecepatanPenjualan,
        produkKontribusiSebelumnya,
        perbandinganPenjualanProduk,
        periodeDari: dari,
        periodeSampai: sampai,
      });

      const labelPeriode =
        periode === 'hari'
          ? 'Hari ini'
          : periode === '7hari'
            ? '7 hari terakhir'
            : periode === 'bulan'
              ? 'Bulan ini'
              : `${formatTanggalAnalisis(tanggalMulai)} – ${formatTanggalAnalisis(tanggalAkhir)}`;

      setSummary(
        `Periode ${labelPeriode}: tercatat ${performa.transaksi} transaksi dengan omzet ${formatRupiah(performa.omzet)}. Total ${performa.produkTerjual} produk terjual, dengan rata-rata transaksi ${formatRupiah(performa.rataTransaksi)}.`,
      );

      setInsights(
        hasil.insights.map((item) => ({
          type: item.type,
          title: item.title,
          desc: item.description,
          products: item.products,
          icon:
            item.type === 'danger'
              ? 'warning-outline'
              : item.type === 'warning'
                ? 'alert-circle-outline'
                : item.type === 'success'
                  ? 'trending-up-outline'
                  : 'bulb-outline',
        })),
      );

      const prioritas = {
        danger: 0,
        warning: 1,
        success: 2,
        info: 3,
      };

      const insightIds = new Set(hasil.insights.map((item) => item.id));
      const rekomendasiTerpadu: string[] = [];

      // 1. Stok kritis dan kebutuhan restock
      if (
        ['INV-001', 'INV-002', 'PROD-004', 'PROD-006'].some((id) =>
          insightIds.has(id),
        )
      ) {
        rekomendasiTerpadu.push(
          'Prioritaskan pemeriksaan stok dan kebutuhan restock berdasarkan stok minimum serta kecepatan penjualan produk.',
        );
      }

      // 2. Stok berlebih dan produk yang belum terjual
      if (
        ['PROD-002', 'PROD-003', 'PROD-005', 'PROD-008'].some((id) =>
          insightIds.has(id),
        )
      ) {
        rekomendasiTerpadu.push(
          'Evaluasi produk yang belum terjual atau memiliki stok berlebih. Pertimbangkan promosi, bundling, dan penyesuaian pembelian berdasarkan kondisi produk.',
        );
      }

      // 3. Validasi keuntungan dan modal
      if (insightIds.has('PROFIT-001') || insightIds.has('PROFIT-002')) {
        rekomendasiTerpadu.push(
          'Validasi HPP, harga jual, dan diskon sebelum mengambil keputusan terkait harga serta keuntungan.',
        );
      }

      // 4. Evaluasi tren penjualan
      if (
        [
          'SALES-002',
          'SALES-003',
          'SALES-004',
          'SALES-005',
          'SALES-006',
          'SALES-007',
          'SALES-008',
          'SALES-009',
          'PROD-007',
        ].some((id) => insightIds.has(id))
      ) {
        rekomendasiTerpadu.push(
          'Evaluasi tren omzet, jumlah transaksi, dan perubahan penjualan produk untuk menentukan strategi penjualan periode berikutnya.',
        );
      }

      // 5. Pertahankan performa produk utama
      if (insightIds.has('PROD-001')) {
        rekomendasiTerpadu.push(
          'Pantau kontribusi omzet dan margin produk utama agar performanya tetap terjaga tanpa mengabaikan produk lainnya.',
        );
      }

      setRekomendasi(rekomendasiTerpadu);

      setPrediksi('');
      setGenerated(true);
    } catch (error) {
      console.error('Gagal menjalankan analisis lokal:', error);
      Alert.alert(
        'Analisis gagal',
        'Data warung belum berhasil dianalisis. Silakan coba kembali.',
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.heroHeader}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={23} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={s.heroText}>
          <Text style={s.heroTitle}>Analisis Warung</Text>
          <Text style={s.heroSubtitle}>Bisnis kamu, dalam satu ringkasan.</Text>
        </View>

        <View style={s.heroIcon}>
          <Ionicons name="stats-chart-outline" size={28} color="#FFFFFF" />
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.periodeCard}>
          <View style={s.periodeHeading}>
            <View>
              <Text style={s.periodeTitle}>Pilih periode</Text>
              <Text style={s.periodeSubtitle}>
                Kamu ingin melihat performa kapan?
              </Text>
            </View>

            <Ionicons name="calendar-outline" size={23} color="#B91C1C" />
          </View>

          <View style={s.periodeOptions}>
            {[
              {
                label: 'Hari Ini',
                value: 'hari',
                desc: 'Ringkasan harian',
                icon: 'sunny-outline',
              },
              {
                label: '7 Hari',
                value: '7hari',
                desc: 'Tren mingguan',
                icon: 'calendar-outline',
              },
              {
                label: 'Bulan Ini',
                value: 'bulan',
                desc: 'Performa bulanan',
                icon: 'calendar-number-outline',
              },
              {
                label: 'Rentang Waktu',
                value: 'pilih',
                desc: 'Periode khusus',
                icon: 'calendar-clear-outline',
              },
            ].map((item) => {
              const aktif = periode === item.value;

              return (
                <TouchableOpacity
                  key={item.value}
                  style={[
                    s.periodeOptionCard,
                    aktif && s.periodeOptionCardAktif,
                  ]}
                  onPress={() => {
                    setPeriode(item.value as PeriodeAnalisis);
                    setGenerated(false);
                    setSummary('');
                    setInsights([]);
                    setRekomendasi([]);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={item.icon as keyof typeof Ionicons.glyphMap}
                    size={22}
                    color={aktif ? '#B91C1C' : '#64748B'}
                  />

                  <Text
                    style={[
                      s.periodeOptionTitle,
                      aktif && s.periodeOptionTitleAktif,
                    ]}
                  >
                    {item.label}
                  </Text>

                  <Text style={s.periodeOptionDesc}>{item.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {periode === 'pilih' && (
            <View style={s.bulanInputWrap}>
              <Text style={s.bulanLabel}>Tanggal mulai</Text>

              <TouchableOpacity
                style={s.bulanPickerButton}
                onPress={() => setPickerAktif('mulai')}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={20} color="#B91C1C" />
                <Text style={s.bulanPickerText}>
                  {tanggalMulai.toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#64748B" />
              </TouchableOpacity>

              <Text style={[s.bulanLabel, { marginTop: 12 }]}>
                Tanggal akhir
              </Text>

              <TouchableOpacity
                style={s.bulanPickerButton}
                onPress={() => setPickerAktif('akhir')}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={20} color="#B91C1C" />
                <Text style={s.bulanPickerText}>
                  {tanggalAkhir.toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
          )}

          {pickerAktif !== null && (
            <DateTimePicker
              value={pickerAktif === 'mulai' ? tanggalMulai : tanggalAkhir}
              mode="date"
              display="default"
              maximumDate={pickerAktif === 'mulai' ? tanggalAkhir : new Date()}
              minimumDate={pickerAktif === 'akhir' ? tanggalMulai : undefined}
              onChange={(event, date) => {
                const targetPicker = pickerAktif;
                setPickerAktif(null);

                if (event.type !== 'set' || !date) return;

                if (targetPicker === 'mulai') {
                  setTanggalMulai(date);
                } else {
                  setTanggalAkhir(date);
                }

                setGenerated(false);
                setSummary('');
                setInsights([]);
                setRekomendasi([]);
              }}
            />
          )}

          <TouchableOpacity
            style={[s.analisisButton, loading && { opacity: 0.7 }]}
            onPress={handleAnalisis}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Ionicons
                name={generated ? 'refresh-outline' : 'stats-chart-outline'}
                size={20}
                color="#FFFFFF"
              />
            )}

            <Text style={s.analisisButtonText}>
              {loading
                ? 'Menganalisis data...'
                : generated
                  ? 'Analisis Ulang'
                  : 'Mulai Analisis'}
            </Text>

            {!loading && (
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>

          <View style={s.privacyNote}>
            <Ionicons
              name="shield-checkmark-outline"
              size={14}
              color="#64748B"
            />
            <Text style={s.privacyText}>
              Analisis lokal · Data tetap di perangkat
            </Text>
          </View>
        </View>

        {/* Data snapshot sesuai periode analisis */}
        {generated && (
          <View style={s.snapshotCard}>
            <View style={s.snapshotHeader}>
              <Ionicons
                name="stats-chart-outline"
                size={18}
                color={Colors.primary}
              />
              <Text style={s.snapshotTitle}>Data Hasil Analisis</Text>
            </View>

            <Text style={s.snapshotPeriod}>
              {(() => {
                const { dari, sampai } = getRentangAnalisis(
                  periode,
                  tanggalMulai,
                  tanggalAkhir,
                );

                return `${dari} – ${sampai}`;
              })()}
            </Text>

            <View style={s.snapshotGrid}>
              {[
                {
                  label: 'Total Omzet',
                  val: formatRupiah(performaSnapshot.omzet),
                  icon: 'cash-outline',
                  color: '#16A34A',
                },
                {
                  label: 'Transaksi',
                  val: performaSnapshot.transaksi.toLocaleString('id-ID'),
                  icon: 'receipt-outline',
                  color: '#2563EB',
                },
                {
                  label: 'Produk Terjual',
                  val: `${performaSnapshot.produkTerjual.toLocaleString('id-ID')} item`,
                  icon: 'basket-outline',
                  color: '#7C3AED',
                },
                {
                  label: 'Stok Menipis',
                  val: `${jumlahStokMenipis.toLocaleString('id-ID')} produk`,
                  icon: 'alert-circle-outline',
                  color: jumlahStokMenipis > 0 ? '#DC2626' : '#16A34A',
                },
              ].map((item) => (
                <View key={item.label} style={s.snapshotItem}>
                  <Ionicons
                    name={item.icon as keyof typeof Ionicons.glyphMap}
                    size={20}
                    color={item.color}
                  />

                  <Text style={s.snapshotVal}>{item.val}</Text>

                  <Text style={s.snapshotLabel}>{item.label}</Text>
                </View>
              ))}
            </View>

            {topProdukSnapshot.length > 0 && (
              <View style={s.snapshotTopProduk}>
                <Text style={s.snapshotTopProdukTitle}>Produk terlaris</Text>

                {topProdukSnapshot.slice(0, 3).map((produk, index) => (
                  <View
                    key={`${produk.nama_produk}-${index}`}
                    style={s.snapshotProdukRow}
                  >
                    <Text style={s.snapshotProdukRank}>{index + 1}</Text>

                    <Text style={s.snapshotProdukNama} numberOfLines={2}>
                      {produk.nama_produk}
                    </Text>

                    <Text style={s.snapshotProdukQty}>
                      {produk.qty} terjual
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
        {/* Generate button 
        {!generated && (
          <TouchableOpacity
            style={[s.generateBtn, loading && { opacity: 0.7 }]}
            onPress={handleAnalisis}
            disabled={loading}
          >
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
        */}
        {generated && (
          <>
            {/* Ringkasan */}
            <View style={s.summaryCard}>
              <View style={s.summaryCardHeader}>
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color={Colors.primary}
                />
                <Text style={s.summaryCardTitle}>Ringkasan Performa</Text>
              </View>
              <View style={s.summaryContent}>
                <Text style={s.summaryPeriod}>Ringkasan periode terpilih</Text>

                <Text style={s.summaryTxt}>{summary}</Text>

                <View style={s.summaryDivider} />

                <View style={s.summaryMetricRow}>
                  <View style={s.summaryMetric}>
                    <Text style={s.summaryMetricLabel}>Omzet</Text>
                    <Text style={s.summaryMetricValue}>
                      {formatRupiah(performaSnapshot.omzet)}
                    </Text>
                  </View>

                  <View style={s.summaryMetric}>
                    <Text style={s.summaryMetricLabel}>
                      Rata-rata transaksi
                    </Text>
                    <Text style={s.summaryMetricValue}>
                      {formatRupiah(performaSnapshot.rataTransaksi)}
                    </Text>
                  </View>
                </View>

                <View style={s.summaryMetricRow}>
                  <View style={s.summaryMetric}>
                    <Text style={s.summaryMetricLabel}>Total transaksi</Text>
                    <Text style={s.summaryMetricValue}>
                      {performaSnapshot.transaksi.toLocaleString('id-ID')}
                    </Text>
                  </View>

                  <View style={s.summaryMetric}>
                    <Text style={s.summaryMetricLabel}>Produk terjual</Text>
                    <Text style={s.summaryMetricValue}>
                      {performaSnapshot.produkTerjual.toLocaleString('id-ID')}{' '}
                      item
                    </Text>
                  </View>
                </View>
              </View>
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
                  ]}
                >
                  <View
                    style={[s.insightIcon, { backgroundColor: ts.icon + '20' }]}
                  >
                    <Ionicons name={insight.icon} size={18} color={ts.icon} />
                  </View>
                  <View style={s.insightInfo}>
                    <Text
                      style={{
                        color: ts.icon,
                        fontSize: 9,
                        fontWeight: '800',
                        letterSpacing: 0.8,
                        marginBottom: 5,
                      }}
                    >
                      {ts.label}
                    </Text>

                    <Text style={[s.insightTitle, { color: ts.title }]}>
                      {insight.title}
                    </Text>
                    <Text style={[s.insightDesc, { color: ts.title + 'CC' }]}>
                      {insight.desc}
                    </Text>

                    {insight.products && insight.products.length > 0 && (
                      <View style={s.insightProductList}>
                        {insight.products.map((produk, index) => (
                          <View
                            key={`${produk.nama}-${index}`}
                            style={s.insightProductRow}
                          >
                            <View style={s.insightProductBullet} />

                            <Text style={s.insightProductName}>
                              {produk.nama}
                            </Text>

                            {produk.stok !== undefined && (
                              <Text style={s.insightProductStock}>
                                {produk.stok} {produk.satuan ?? 'pcs'}
                              </Text>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              );
            })}

            {/* Rekomendasi */}
            <Text style={s.sectionLabel}>REKOMENDASI AKSI</Text>
            <View style={s.rekomendasiCard}>
              {rekomendasi.map((item, index) => (
                <View key={`${index}-${item}`} style={s.rekomendasiRow}>
                  <View style={s.rekomendasiNumber}>
                    <Text style={s.rekomendasiNumberText}>
                      {String(index + 1).padStart(2, '0')}
                    </Text>
                  </View>

                  <View style={s.rekomendasiContent}>
                    <Text style={s.rekomendasiHeading}>
                      Langkah {index + 1}
                    </Text>

                    <Text style={s.rekomendasiTxt}>{item}</Text>
                  </View>
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
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.primary} size="small" />
              ) : (
                <>
                  <Ionicons
                    name="refresh-outline"
                    size={16}
                    color={Colors.primary}
                  />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSub: { color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 2 },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(129,140,248,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.3)',
  },
  aiBadgeTxt: { color: '#818CF8', fontSize: 11, fontWeight: '700' },

  scroll: { flex: 1, backgroundColor: '#F3F4F6' },
  content: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 32,
  },

  snapshotCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
  },
  snapshotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  snapshotTitle: { fontSize: 13, fontWeight: '700', color: Colors.text },
  snapshotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  snapshotItem: {
    width: '45%',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
  },
  snapshotVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  snapshotLabel: { fontSize: 10, color: '#9CA3AF', textAlign: 'center' },

  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  generateBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },

  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  summaryCardTitle: { fontSize: 13, fontWeight: '700', color: Colors.text },
  summaryTxt: { fontSize: 14, color: '#374151', lineHeight: 22 },

  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },

  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },

  insightIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  insightInfo: { flex: 1 },
  insightTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 5,
  },
  insightDesc: {
    fontSize: 12,
    lineHeight: 19,
  },
  rekomendasiCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: 16,
  },
  rekomendasiRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
  },
  rekomendasiBorder: { borderBottomWidth: 0.5, borderBottomColor: '#F3F4F6' },
  rekomendasiNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  rekomendasiNumTxt: { color: '#fff', fontSize: 11, fontWeight: '800' },
  rekomendasiTxt: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 20 },

  prediksiCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    marginBottom: 16,
  },
  prediksiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  prediksiTitle: { fontSize: 13, fontWeight: '700', color: '#7C3AED' },
  prediksiTxt: { fontSize: 13, color: '#5B21B6', lineHeight: 20 },

  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
  },

  periodeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  periodeTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  periodeSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  periodeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  periodeButton: {
    width: '48%',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodeButtonAktif: {
    backgroundColor: '#B91C1C',
  },
  periodeButtonTxt: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  periodeButtonTxtAktif: {
    color: '#FFFFFF',
  },
  terapkanBtn: {
    marginTop: 12,
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    padding: 11,
    alignItems: 'center',
  },
  terapkanBtnTxt: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },

  heroHeader: {
    backgroundColor: '#B91C1C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 26,
    gap: 12,
  },
  heroText: {
    flex: 1,
    gap: 4,
  },
  heroEyebrow: {
    color: '#FECACA',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    color: '#FEE2E2',
    fontSize: 12,
    lineHeight: 18,
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: '#FFFFFF20',
    alignItems: 'center',
    justifyContent: 'center',
  },

  periodeHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  periodeOptionCard: {
    width: '48%',
    minHeight: 108,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    justifyContent: 'center',
    gap: 6,
  },
  periodeOptionCardAktif: {
    backgroundColor: '#FEF2F2',
    borderColor: '#B91C1C',
  },
  periodeOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  periodeOptionTitleAktif: {
    color: '#991B1B',
  },
  periodeOptionDesc: {
    fontSize: 10,
    color: '#64748B',
  },
  bulanInputWrap: {
    marginTop: 16,
    gap: 7,
  },
  bulanLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  bulanInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  periodeHint: {
    fontSize: 11,
    color: '#64748B',
  },
  analisisButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#B91C1C',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginTop: 18,
  },
  analisisButtonText: {
    flex: 1,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  privacyNote: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  privacyText: {
    color: '#64748B',
    fontSize: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulanPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  bulanPickerText: {
    flex: 1,
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },
  snapshotPeriod: {
    fontSize: 12,
    color: '#64748B',
    marginTop: -6,
    marginBottom: 14,
  },

  snapshotTopProduk: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },

  snapshotTopProdukTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 10,
  },

  snapshotProdukRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  snapshotProdukRank: {
    width: 24,
    height: 24,
    textAlign: 'center',
    textAlignVertical: 'center',
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    color: '#B91C1C',
    fontSize: 11,
    fontWeight: '800',
  },

  snapshotProdukNama: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#374151',
  },

  snapshotProdukQty: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },

  summaryContent: {
    gap: 12,
  },

  summaryPeriod: {
    fontSize: 12,
    color: '#64748B',
  },

  summaryDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },

  summaryMetricRow: {
    flexDirection: 'row',
    gap: 12,
  },

  summaryMetric: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
  },

  summaryMetricLabel: {
    fontSize: 11,
    lineHeight: 16,
    color: '#64748B',
    marginBottom: 6,
  },

  summaryMetricValue: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
    color: '#111827',
  },
  rekomendasiContent: {
    flex: 1,
    gap: 4,
  },

  rekomendasiHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  insightProductList: {
    marginTop: 10,
    gap: 8,
  },

  insightProductRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 4,
  },

  insightProductBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9CA3AF',
    marginTop: 6,
  },

  insightProductName: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#374151',
  },

  insightProductStock: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  rekomendasiNumber: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  rekomendasiNumberText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B91C1C',
  },

  refreshTxt: { fontSize: 13, fontWeight: '700', color: Colors.textLight },
});
