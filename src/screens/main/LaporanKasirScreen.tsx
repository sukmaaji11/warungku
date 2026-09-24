// ═══════════════════════════════════════════════════════════════════════════
// FILE 1: src/screens/main/LaporanKasirScreen.tsx
// ═══════════════════════════════════════════════════════════════════════════
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants';
import {
  formatRupiah,
  todayString,
  toLocalDateString,
} from '../../utils/format';
import { getDB } from '../../db/database';
import { useAuthStore } from '../../store/authStore';
import DateTimePicker from '@react-native-community/datetimepicker';

function getLaporanKasir(
  dari: string,
  sampai: string,
  filterKasir?: string,
): any[] {
  try {
    let query = `SELECT
         kasir,
         COUNT(*) as jumlah_trx,
         SUM(total) as total_omset,
         SUM(diskon) as total_diskon,
         SUM(CASE WHEN metode_bayar='tunai' THEN total ELSE 0 END) as tunai,
         SUM(CASE WHEN metode_bayar='transfer' THEN total ELSE 0 END) as transfer,
         SUM(CASE WHEN metode_bayar='qris' THEN total ELSE 0 END) as qris,
         SUM(CASE WHEN metode_bayar='hutang' THEN total ELSE 0 END) as hutang
       FROM transaksi
       WHERE DATE(waktu) BETWEEN ? AND ?`;
    const params: any[] = [dari, sampai];
    if (filterKasir) {
      query += ` AND kasir = ?`;
      params.push(filterKasir);
    }
    query += ` GROUP BY kasir ORDER BY total_omset DESC`;
    return getDB().getAllSync(query, params) as any[];
  } catch {
    return [];
  }
}

export function LaporanKasirScreen({ navigation }: any) {
  const [list, setList] = useState<any[]>([]);
  //const [range, setRange] = useState<'hari' | 'minggu' | 'bulan'>('hari');

  // Custom Filter Report - Jadicuan Development
  type RangeType = 'hari_ini' | 'kemarin' | '7_hari' | '30_hari' | 'custom';

  const [range, setRange] = useState<RangeType>('hari_ini');

  const [customDari, setCustomDari] = useState('');
  const [customSampai, setCustomSampai] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [showPicker, setShowPicker] = useState<'dari' | 'sampai' | null>(null);
  const { currentUser } = useAuthStore();
  // Custom Filter Report - Jadicuan Development
  function getRangeDate(r: RangeType) {
    const today = todayString();
    const d = new Date();

    if (r === 'hari_ini') {
      return {
        dari: today,
        sampai: today,
      };
    }

    if (r === 'kemarin') {
      d.setDate(d.getDate() - 1);
      const kemarin = toLocalDateString(d);

      return {
        dari: kemarin,
        sampai: kemarin,
      };
    }

    if (r === '7_hari') {
      d.setDate(d.getDate() - 6);

      return {
        dari: toLocalDateString(d),
        sampai: today,
      };
    }

    if (r === '30_hari') {
      d.setDate(d.getDate() - 29);

      return {
        dari: toLocalDateString(d),
        sampai: today,
      };
    }

    return {
      dari: customDari || today,
      sampai: customSampai || today,
    };
  }
  {
    /* Filter range 
  const getRange = () => {
    const today = todayString();
    const d = new Date();
    if (range === 'hari') return { dari: today, sampai: today };
    if (range === 'minggu') {
      d.setDate(d.getDate() - 6);
      return {
        dari: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        sampai: today,
      };
    }
    return {
      dari: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`,
      sampai: today,
    };
  };
*/
  }
  // Custom Filter Report - Jadicuan Development
  const load = () => {
    const { dari, sampai } = getRangeDate(range);
    const filterKasir =
      currentUser?.role === 'kasir' ? currentUser.nama : undefined;
    setList(getLaporanKasir(dari, sampai, filterKasir));
  };
  // Custom Filter Report - Jadicuan Development
  useFocusEffect(
    useCallback(() => {
      load();
    }, [range, customDari, customSampai, currentUser]),
  );

  const totalOmset = list.reduce((s, k) => s + (k.total_omset || 0), 0);
  const totalTrx = list.reduce((s, k) => s + (k.jumlah_trx || 0), 0);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Laporan Kasir</Text>
          <Text style={s.headerSub}>Rekap per kasir/operator</Text>
        </View>
      </View>

      {/* Filter range 
      <View style={s.rangeRow}>
        {(['hari', 'minggu', 'bulan'] as const).map((r) => (
          <TouchableOpacity
            key={r}
            style={[s.rangeChip, range === r && s.rangeChipActive]}
            onPress={() => setRange(r)}
          >
            <Text style={[s.rangeTxt, range === r && s.rangeTxtActive]}>
              {r === 'hari'
                ? 'Hari Ini'
                : r === 'minggu'
                  ? '7 Hari'
                  : 'Bulan Ini'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>*/}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={s.rangeContent}
      >
        {[
          { key: 'hari_ini', label: 'Hari Ini' },
          { key: 'kemarin', label: 'Kemarin' },
          { key: '7_hari', label: '7 Hari' },
          { key: '30_hari', label: '30 Hari' },
          { key: 'custom', label: 'Custom' },
        ].map((r) => (
          <TouchableOpacity
            key={r.key}
            style={[s.rangeChip, range === r.key && s.rangeChipActive]}
            onPress={() => {
              setRange(r.key as RangeType);

              if (r.key === 'custom') {
                setShowCustom(true);
              }
            }}
          >
            <Text style={[s.rangeTxt, range === r.key && s.rangeTxtActive]}>
              {r.key === 'custom' && customDari
                ? `${customDari.slice(5)} → ${customSampai.slice(5)}`
                : r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Total summary */}
      <View style={s.summaryRow}>
        <View style={s.summaryCard}>
          <Text style={s.summaryLabel}>Total Omset</Text>
          <Text style={s.summaryVal}>{formatRupiah(totalOmset)}</Text>
        </View>
        <View style={s.summaryCard}>
          <Text style={s.summaryLabel}>Total Transaksi</Text>
          <Text style={[s.summaryVal, { color: '#60A5FA' }]}>{totalTrx}</Text>
        </View>
      </View>

      <FlatList
        data={list}
        keyExtractor={(i) => i.kasir || 'unknown'}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="people-outline" size={44} color="#D1D5DB" />
            <Text style={s.emptyTxt}>Belum ada data transaksi</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={s.card}>
            <View
              style={[
                s.rankBadge,
                index === 0 && { backgroundColor: '#FEF3C7' },
              ]}
            >
              <Text style={[s.rankTxt, index === 0 && { color: '#92400E' }]}>
                {index === 0 ? '🥇' : `#${index + 1}`}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.kasirNama}>{item.kasir || 'Admin'}</Text>
              <Text style={s.kasirSub}>{item.jumlah_trx} transaksi</Text>
              {/* Bar metode */}
              <View
                style={{
                  flexDirection: 'row',
                  gap: 6,
                  marginTop: 8,
                  flexWrap: 'wrap',
                }}
              >
                {[
                  { label: 'Tunai', val: item.tunai, color: Colors.success },
                  { label: 'TF', val: item.transfer, color: '#7C3AED' },
                  { label: 'QRIS', val: item.qris, color: Colors.info },
                  { label: 'Hutang', val: item.hutang, color: Colors.danger },
                ]
                  .filter((m) => m.val > 0)
                  .map((m) => (
                    <View
                      key={m.label}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: m.color,
                        }}
                      />
                      <Text style={{ fontSize: 10, color: Colors.textMuted }}>
                        {m.label}: {formatRupiah(m.val)}
                      </Text>
                    </View>
                  ))}
              </View>
            </View>
            <Text style={s.kasirOmset}>{formatRupiah(item.total_omset)}</Text>
          </View>
        )}
      />
      {/* Modal Custom Tanggal */}
      <Modal visible={showCustom} transparent animationType="fade">
        <View style={s.customOverlay}>
          <View style={s.customModal}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: '#111827',
                }}
              >
                Pilih Periode
              </Text>

              <TouchableOpacity
                onPress={() => setShowCustom(false)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: '#F3F4F6',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text style={s.customLabel}>Dari</Text>

            <TouchableOpacity
              style={s.customDateBtn}
              onPress={() => setShowPicker('dari')}
            >
              <Ionicons
                name="calendar-outline"
                size={16}
                color={Colors.primary}
              />

              <Text style={s.customDateText}>
                {customDari || 'Pilih tanggal'}
              </Text>
            </TouchableOpacity>

            <Text style={s.customLabel}>Sampai</Text>

            <TouchableOpacity
              style={s.customDateBtn}
              onPress={() => setShowPicker('sampai')}
            >
              <Ionicons
                name="calendar-outline"
                size={16}
                color={Colors.primary}
              />

              <Text style={s.customDateText}>
                {customSampai || 'Pilih tanggal'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.customApplyBtn}
              onPress={() => {
                if (!customDari || !customSampai) {
                  return;
                }

                setShowCustom(false);
                setRange('custom');
              }}
            >
              <Text style={s.customApplyText}>Terapkan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {showPicker && (
        <DateTimePicker
          value={
            showPicker === 'dari' && customDari
              ? new Date(customDari)
              : showPicker === 'sampai' && customSampai
                ? new Date(customSampai)
                : new Date()
          }
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowPicker(null);

            if (!date) return;

            const formatted = toLocalDateString(date);

            if (showPicker === 'dari') {
              setCustomDari(formatted);
            } else {
              setCustomSampai(formatted);
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}
// ── Styles LaporanKasir ────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,.55)', fontSize: 12 },
  rangeRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  rangeChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,.12)',
  },
  rangeChipActive: { backgroundColor: '#fff' },
  rangeTxt: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,.65)' },
  rangeTxtActive: { color: Colors.primary },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,.1)',
    borderRadius: 12,
    padding: 12,
  },
  summaryLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,.5)',
    marginBottom: 4,
  },
  summaryVal: { fontSize: 16, fontWeight: '800', color: '#fff' },
  listContent: {
    padding: 14,
    gap: 10,
    backgroundColor: Colors.background,
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankTxt: { fontSize: 16 },
  kasirNama: { fontSize: 15, fontWeight: '700', color: Colors.text },
  kasirSub: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  kasirOmset: { fontSize: 14, fontWeight: '800', color: Colors.primary },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTxt: { fontSize: 15, fontWeight: '700', color: Colors.textMuted },
  rangeContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },

  customOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },

  customModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },

  customTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 16,
  },

  customLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 6,
  },

  customDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },

  customDateText: {
    fontSize: 13,
    color: Colors.text,
  },

  customApplyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },

  customApplyText: {
    color: '#fff',
    fontWeight: '700',
  },
});
