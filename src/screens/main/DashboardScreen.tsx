import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { formatRupiah, todayString } from '../../utils/format';
import {
  getRingkasan,
  getTerlaris,
  getOmset7Hari,
} from '../../db/transaksiRepo';
import { getProdukMenipis, getPengaturan } from '../../db/produkRepo';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants';

const W = Dimensions.get('window').width;

// ── PERUBAHAN 1: tambah entry Grosir + field badge opsional ──────────────────
const MENU = [
  {
    key: 'Produk',
    label: 'Produk',
    icon: 'cube-outline',
    color: '#2563EB',
    bg: '#EFF6FF',
  },
  {
    key: 'Kasir',
    label: 'Kasir',
    icon: 'receipt-outline',
    color: '#16A34A',
    bg: '#F0FDF4',
  },
  {
    key: 'Laporan',
    label: 'Laporan',
    icon: 'bar-chart-outline',
    color: '#7C3AED',
    bg: '#F5F3FF',
  },
  {
    key: 'Pelanggan',
    label: 'Pelanggan',
    icon: 'people-outline',
    color: '#EA580C',
    bg: '#FFF7ED',
  },
  {
    key: 'Diskon',
    label: 'Diskon',
    icon: 'pricetag-outline',
    color: '#DB2777',
    bg: '#FDF2F8',
  },
  // ── BARU ──
  {
    key: 'Grosir',
    label: 'Harga Grosir',
    icon: 'pricetags-outline',
    color: '#0891B2',
    bg: '#ECFEFF',
    badge: 'Baru',
  },
  {
    key: 'Konsinyasi',
    label: 'Konsinyasi',
    icon: 'git-network-outline',
    color: '#059669',
    bg: '#ECFDF5',
  },
  {
    key: 'Katalog',
    label: 'Katalog',
    icon: 'book-outline',
    color: '#D97706',
    bg: '#FFFBEB',
  },
  {
    key: 'Kategori',
    label: 'Kategori',
    icon: 'folder-outline',
    color: '#7C3AED',
    bg: '#F5F3FF',
  },
  {
    key: 'AI',
    label: 'Analisis Warungku',
    icon: 'sparkles-outline',
    color: '#4F46E5',
    bg: '#EEF2FF',
    badge: 'AI',
  },
  {
    key: 'Pengeluaran',
    label: 'Pengeluaran',
    icon: 'wallet-outline',
    color: '#DC2626',
    bg: '#FEF2F2',
  },
  {
    key: 'Piutang',
    label: 'Piutang',
    icon: 'time-outline',
    color: '#D97706',
    bg: '#FFFBEB',
  },
  {
    key: 'LabelHarga',
    label: 'Label Harga',
    icon: 'pricetags-outline',
    color: '#0891B2',
    bg: '#ECFEFF',
  },
  {
    key: 'LaporanKasir',
    label: 'Lap. Kasir',
    icon: 'people-outline',
    color: '#7C3AED',
    bg: '#F5F3FF',
  },
];

// ── BARU: menu yang disembunyikan untuk role kasir ────────────────────────────
const HIDDEN_FOR_KASIR = ['Laporan', 'Diskon', 'Grosir', 'AI', 'LaporanKasir'];

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export default function DashboardScreen({ navigation }: any) {
  const [ring, setRing] = useState({
    trx: 0,
    omset: 0,
    diskon: 0,
    qty: 0,
    profit: 0,
  });
  const [terlaris, setTerlaris] = useState<any[]>([]);
  const [menipis, setMenipis] = useState<any[]>([]);
  const [omset7, setOmset7] = useState<any[]>([]);
  const [namaToko, setNamaToko] = useState('Toko Saya');
  const [refreshing, setRefreshing] = useState(false);
  const { logout, currentUser } = useAuthStore();

  // ── BARU: cek role user yang sedang login ──
  const isKasir = currentUser?.role === 'kasir';

  const load = () => {
    const data = getRingkasan(todayString());

    console.log('RINGKASAN =', data);

    setRing(data);
    setTerlaris(getTerlaris(3, 'hari'));
    setMenipis(getProdukMenipis());
    setOmset7(getOmset7Hari());

    const s = getPengaturan();
    setNamaToko(s.nama_toko || 'Toko Saya');
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, []),
  );

  const jam = new Date().getHours();
  const salam =
    jam < 11
      ? 'Selamat pagi'
      : jam < 15
        ? 'Selamat siang'
        : jam < 18
          ? 'Selamat sore'
          : 'Selamat malam';

  const maxOmset = Math.max(...omset7.map((o) => o.omset), 1);
  const maxTerlaris = terlaris[0]?.qty || 1;
  const laba = ring.profit;

  // ── BARU: filter menu utama sesuai role ──
  const visibleMenu = isKasir
    ? MENU.filter((m) => !HIDDEN_FOR_KASIR.includes(m.key))
    : MENU;

  // ── BARU: filter stat card (sembunyikan "Laba Kotor" untuk kasir) ──
  const statCards = [
    {
      key: 'trx',
      icon: 'receipt-outline',
      iconColor: '#2563EB',
      bg: '#EFF6FF',
      label: 'Transaksi',
      val: ring.trx.toString(),
      sub: 'hari ini',
    },
    ...(!isKasir
      ? [
          {
            key: 'laba',
            icon: 'cash-outline',
            iconColor: '#16A34A',
            bg: '#F0FDF4',
            label: 'Laba Kotor',
            val: formatRupiah(laba),
            sub: laba > 0 ? 'dari harga modal' : 'isi harga modal',
          },
        ]
      : []),
    {
      key: 'diskon',
      icon: 'pricetag-outline',
      iconColor: '#D97706',
      bg: '#FFFBEB',
      label: 'Total Diskon',
      val: formatRupiah(ring.diskon),
      sub: 'diberikan',
    },
    {
      key: 'stok',
      icon: 'alert-circle-outline',
      iconColor: menipis.length > 0 ? '#DC2626' : '#16A34A',
      bg: menipis.length > 0 ? '#FEF2F2' : '#F0FDF4',
      label: 'Stok Menipis',
      val: menipis.length.toString(),
      sub: 'produk',
    },
  ];

  // ── BARU: filter quick action (sembunyikan "Laporan" untuk kasir) ──
  const quickActions = [
    {
      label: 'Buka Kasir',
      icon: 'scan-outline',
      color: '#16A34A',
      bg: '#F0FDF4',
      nav: 'Kasir',
    },
    {
      label: 'Tambah Produk',
      icon: 'add-circle-outline',
      color: '#2563EB',
      bg: '#EFF6FF',
      nav: 'TambahProduk',
    },
    ...(!isKasir
      ? [
          {
            label: 'Laporan',
            icon: 'bar-chart-outline',
            color: '#7C3AED',
            bg: '#F5F3FF',
            nav: 'Laporan',
          },
        ]
      : []),
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.avatar}>
            <Ionicons name="storefront-outline" size={19} color="#fff" />
          </View>
          <View>
            <Text style={s.headerGreet}>{salam} 👋</Text>
            <Text style={s.headerToko} numberOfLines={1}>
              {namaToko}
            </Text>
          </View>
        </View>
        <View style={s.headerRight}>
          {/* ── Add User Info - Jadicuan Developer ── */}
          <View style={s.userInfo}>
            <View style={s.userText}>
              <Text style={s.userName} numberOfLines={1}>
                {currentUser?.nama || 'User'}
              </Text>
              <Text style={s.userRole}>{currentUser?.role || ''}</Text>
              {/* ── End Of Add User Info - Jadicuan Developer ── */}
            </View>

            <Ionicons name="person-circle-outline" size={28} color="#fff" />
          </View>
          <TouchableOpacity style={s.iconBtn} onPress={logout}>
            <Ionicons name="log-out-outline" size={19} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              load();
              setRefreshing(false);
            }}
            tintColor={Colors.primary}
          />
        }
      >
        {/* ── Omset Card ── */}
        <View style={s.omsetCard}>
          <Text style={s.omsetLabel}>Total omset hari ini</Text>
          <Text style={s.omsetVal}>{formatRupiah(ring.omset)}</Text>
          <View style={s.omsetStats}>
            <View style={s.ostat}>
              <Ionicons
                name="receipt-outline"
                size={12}
                color="rgba(255,255,255,.5)"
              />
              <Text style={s.ostatTxt}>{ring.trx} transaksi</Text>
            </View>
            <View style={s.ostatDiv} />
            <View style={s.ostat}>
              <Ionicons
                name="cube-outline"
                size={12}
                color="rgba(255,255,255,.5)"
              />
              <Text style={s.ostatTxt}>{ring.qty} item</Text>
            </View>
            {/* ── BARU: hide laba untuk kasir ── */}
            {!isKasir && (
              <>
                <View style={s.ostatDiv} />
                <View style={s.ostat}>
                  <Ionicons
                    name="trending-up-outline"
                    size={12}
                    color="rgba(255,255,255,.5)"
                  />
                  <Text style={s.ostatTxt}>~{formatRupiah(laba)} laba</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* ── Stat Cards (dinamis sesuai role) ── */}
        <View style={s.statsGrid}>
          {statCards.map((st) => (
            <View key={st.key} style={s.statCard}>
              <View style={[s.statIcon, { backgroundColor: st.bg }]}>
                <Ionicons
                  name={st.icon as any}
                  size={17}
                  color={st.iconColor}
                />
              </View>
              <Text style={s.statLbl}>{st.label}</Text>
              <Text
                style={[
                  s.statNum,
                  st.key === 'stok' &&
                    menipis.length > 0 && { color: '#DC2626' },
                  st.key === 'laba' && {
                    color: '#16A34A',
                    fontSize: ring.omset > 999999 ? 13 : 18,
                  },
                ]}
              >
                {st.val}
              </Text>
              <Text style={s.statSub}>{st.sub}</Text>
            </View>
          ))}
        </View>

        {/* ── Alert Stok ── */}
        {menipis.length > 0 && (
          <TouchableOpacity
            style={s.alertCard}
            onPress={() => !isKasir && navigation.navigate('Laporan')}
            activeOpacity={isKasir ? 1 : 0.8}
            disabled={isKasir}
          >
            <View style={s.alertIconWrap}>
              <Ionicons name="warning-outline" size={17} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.alertRow}>
                <Text style={s.alertTitle}>Stok hampir habis</Text>
                <View style={s.alertBadge}>
                  <Text style={s.alertBadgeTxt}>{menipis.length} produk</Text>
                </View>
              </View>
              <Text style={s.alertDesc} numberOfLines={1}>
                {menipis
                  .slice(0, 2)
                  .map((p) => `${p.nama} (${p.stok})`)
                  .join(' · ')}
              </Text>
            </View>
            {!isKasir && (
              <Ionicons name="chevron-forward" size={14} color="#D97706" />
            )}
          </TouchableOpacity>
        )}

        {/* ── Aksi Cepat (dinamis sesuai role) ── */}
        <Text style={s.sectionLabel}>aksi cepat</Text>
        <View style={s.quickRow}>
          {quickActions.map((q, i) => (
            <TouchableOpacity
              key={i}
              style={s.quickBtn}
              onPress={() => navigation.navigate(q.nav)}
              activeOpacity={0.75}
            >
              <View style={[s.quickIcon, { backgroundColor: q.bg }]}>
                <Ionicons name={q.icon as any} size={20} color={q.color} />
              </View>
              <Text style={s.quickTxt}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Bar Chart ── */}
        <View style={s.chartCard}>
          <View style={s.chartHeader}>
            <Text style={s.chartTitle}>Omset 7 Hari Terakhir</Text>
            <View style={s.chartBadge}>
              <Text style={s.chartBadgeTxt}>Mingguan</Text>
            </View>
          </View>
          {omset7.length === 0 || omset7.every((o) => o.omset === 0) ? (
            <View style={s.chartEmpty}>
              <Ionicons name="bar-chart-outline" size={28} color="#D1D5DB" />
              <Text style={s.chartEmptyTxt}>Belum ada data</Text>
            </View>
          ) : (
            <View style={s.barChart}>
              {omset7.map((o, i) => {
                const h = Math.max(4, Math.round((o.omset / maxOmset) * 80));
                const d = new Date(o.tgl);
                const isToday = o.tgl === todayString();
                return (
                  <View key={i} style={s.barCol}>
                    {o.omset > 0 && (
                      <Text style={s.barVal}>
                        {o.omset >= 1000000
                          ? (o.omset / 1000000).toFixed(1) + 'jt'
                          : Math.round(o.omset / 1000) + 'rb'}
                      </Text>
                    )}
                    <View
                      style={[
                        s.bar,
                        {
                          height: h,
                          backgroundColor: isToday ? Colors.primary : '#DBEAFE',
                        },
                      ]}
                    />
                    <Text
                      style={[
                        s.barDay,
                        isToday && { color: Colors.primary, fontWeight: '700' },
                      ]}
                    >
                      {DAYS[d.getDay()]}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Menu Utama (dinamis sesuai role) ── */}
        <Text style={s.sectionLabel}>menu utama</Text>
        <View style={s.menuGrid}>
          {visibleMenu.map((m) => (
            <TouchableOpacity
              key={m.key}
              style={s.menuItem}
              onPress={() => {
                try {
                  navigation.navigate(m.key);
                } catch {}
              }}
              activeOpacity={0.72}
            >
              <View style={[s.menuIcon, { backgroundColor: m.bg }]}>
                <Ionicons name={m.icon as any} size={21} color={m.color} />
              </View>
              <Text style={s.menuLbl} numberOfLines={1}>
                {m.label}
              </Text>
              {/* ── PERUBAHAN 2: badge dinamis dari field m.badge ── */}
              {(m as any).badge && (
                <View
                  style={[
                    s.menuBadge,
                    (m as any).badge === 'AI'
                      ? { backgroundColor: '#4F46E5' }
                      : { backgroundColor: '#0891B2' },
                  ]}
                >
                  <Text style={s.menuBadgeTxt}>{(m as any).badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Produk Terlaris ── */}
        <Text style={s.sectionLabel}>produk terlaris hari ini</Text>
        <View style={s.terlarisCard}>
          {terlaris.length === 0 ? (
            <View style={s.terlarisEmpty}>
              <Ionicons name="cube-outline" size={28} color="#D1D5DB" />
              <Text style={s.terlarisEmptyTxt}>
                Belum ada transaksi hari ini
              </Text>
            </View>
          ) : (
            terlaris.map((p, i) => {
              const pct = Math.round((p.qty / maxTerlaris) * 100);
              const rankColors = [
                { bg: '#FEF3C7', color: '#92400E' },
                { bg: '#F1F5F9', color: '#475569' },
                { bg: '#FEF2F2', color: '#991B1B' },
              ];
              const rc = rankColors[i] || rankColors[2];
              return (
                <View
                  key={i}
                  style={[
                    s.terlarisRow,
                    i < terlaris.length - 1 && s.terlarisRowBorder,
                  ]}
                >
                  <View style={[s.terlarisRank, { backgroundColor: rc.bg }]}>
                    <Text style={[s.terlarisRankTxt, { color: rc.color }]}>
                      {i + 1}
                    </Text>
                  </View>
                  <View style={s.terlarisInfo}>
                    <Text style={s.terlarisNama} numberOfLines={1}>
                      {p.nama_produk}
                    </Text>
                    <View style={s.terlarisBarWrap}>
                      <View
                        style={[s.terlarisBar, { width: `${pct}%` as any }]}
                      />
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.terlarisOmset}>{formatRupiah(p.omset)}</Text>
                    <Text style={s.terlarisQty}>{p.qty} terjual</Text>
                  </View>
                </View>
              );
            })
          )}
          {!isKasir && (
            <TouchableOpacity
              style={s.terlarisMore}
              onPress={() => navigation.navigate('Laporan')}
            >
              <Text style={s.terlarisMoreTxt}>Lihat laporan lengkap</Text>
              <Ionicons name="arrow-forward" size={13} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  scroll: { flex: 1, backgroundColor: '#F3F4F6' },
  content: { paddingBottom: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 14,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  headerRight: { flexDirection: 'row', gap: 8 },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userText: {
    alignItems: 'flex-end',
    marginRight: 6,
  },
  userName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    maxWidth: 80,
  },
  userRole: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    textTransform: 'capitalize',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerGreet: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  headerToko: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    maxWidth: W * 0.45,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  omsetCard: {
    backgroundColor: Colors.primaryDark,
    margin: 14,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  omsetLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 6 },
  omsetVal: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 14,
  },
  omsetStats: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ostat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ostatTxt: { color: 'rgba(255,255,255,0.55)', fontSize: 11 },
  ostatDiv: { width: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.15)' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    width: (W - 48) / 2,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 13,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statLbl: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 2,
  },
  statNum: { fontSize: 19, fontWeight: '800', color: '#111827' },
  statSub: { fontSize: 10, color: '#6EE7B7', fontWeight: '600', marginTop: 2 },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFBEB',
    marginHorizontal: 14,
    marginBottom: 12,
    borderRadius: 13,
    padding: 12,
    borderWidth: 0.5,
    borderColor: '#FDE68A',
  },
  alertIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  alertTitle: { fontSize: 12, fontWeight: '700', color: '#92400E' },
  alertBadge: {
    backgroundColor: '#FCD34D',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9,
  },
  alertBadgeTxt: { fontSize: 9, fontWeight: '700', color: '#78350F' },
  alertDesc: { fontSize: 11, color: '#B45309' },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 9,
    marginTop: 2,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  quickBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
  },
  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTxt: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  chartCard: {
    backgroundColor: '#fff',
    marginHorizontal: 14,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  chartTitle: { fontSize: 13, fontWeight: '700', color: '#111827' },
  chartBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  chartBadgeTxt: { color: '#1D4ED8', fontSize: 10, fontWeight: '600' },
  chartEmpty: {
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  chartEmptyTxt: { color: '#D1D5DB', fontSize: 12 },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 100,
    gap: 4,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    height: '100%',
    justifyContent: 'flex-end',
  },
  bar: { width: '100%', borderRadius: 4 },
  barVal: { fontSize: 8, color: '#9CA3AF' },
  barDay: { fontSize: 9, color: '#9CA3AF' },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    gap: 7,
    marginBottom: 14,
  },
  menuItem: {
    width: (W - 56) / 4,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    gap: 7,
    position: 'relative',
  },
  menuIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLbl: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  menuBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
  },
  menuBadgeTxt: { color: '#fff', fontSize: 8, fontWeight: '700' },
  terlarisCard: {
    backgroundColor: '#fff',
    marginHorizontal: 14,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: 14,
  },
  terlarisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 13,
  },
  terlarisRowBorder: { borderBottomWidth: 0.5, borderBottomColor: '#F3F4F6' },
  terlarisRank: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  terlarisRankTxt: { fontSize: 12, fontWeight: '800' },
  terlarisInfo: { flex: 1 },
  terlarisNama: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 5,
  },
  terlarisBarWrap: { height: 3, backgroundColor: '#F3F4F6', borderRadius: 2 },
  terlarisBar: { height: 3, backgroundColor: Colors.primary, borderRadius: 2 },
  terlarisOmset: { fontSize: 12, fontWeight: '800', color: Colors.primary },
  terlarisQty: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  terlarisEmpty: { padding: 28, alignItems: 'center', gap: 8 },
  terlarisEmptyTxt: { fontSize: 13, color: '#D1D5DB' },
  terlarisMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    padding: 11,
    borderTopWidth: 0.5,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
  },
  terlarisMoreTxt: { fontSize: 12, fontWeight: '600', color: Colors.primary },
});
