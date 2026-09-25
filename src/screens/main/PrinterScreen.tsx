// src/screens/main/PrinterScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants';
import {
  getPairedPrinters,
  connectPrinter,
  disconnectPrinter,
  printStruk,
} from '../../utils/printer';
import { getPengaturan } from '../../db/produkRepo';
import { useAuthStore } from '../../store/authStore';

const PRINTER_KEY = 'kasirku_printer_address';
const PRINTER_NAME_KEY = 'kasirku_printer_name';

export default function PrinterScreen({ navigation }: any) {
  const [devices, setDevices] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [savedAddr, setSavedAddr] = useState<string | null>(null);
  const [savedName, setSavedName] = useState<string>('');
  const [testing, setTesting] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualAddr, setManualAddr] = useState('');
  const [manualName, setManualName] = useState('RPP02N');
  const { currentUser } = useAuthStore();

  useEffect(() => {
    AsyncStorage.getItem(PRINTER_KEY).then((v) => v && setSavedAddr(v));
    AsyncStorage.getItem(PRINTER_NAME_KEY).then(
      (v) => v && setSavedName(v || ''),
    );
  }, []);

  async function requestBluetoothPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    try {
      if (Platform.Version >= 31) {
        const results = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        return (
          results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] ===
            'granted' &&
          results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] ===
            'granted'
        );
      } else {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        return result === 'granted';
      }
    } catch {
      return false;
    }
  }

  const handleScan = async () => {
    const granted = await requestBluetoothPermissions();
    if (!granted) {
      Alert.alert(
        'Permission Diperlukan',
        'Izinkan akses Bluetooth dan Lokasi untuk scan printer.\n\nBuka Settings → Apps → Kasir WarungKu → Permissions.',
        [{ text: 'OK' }],
      );
      return;
    }

    setScanning(true);
    setDevices([]);
    try {
      const list = await getPairedPrinters();
      setDevices(list);
      if (list.length === 0) {
        // Scan berhasil tapi kosong → tawarkan input manual
        Alert.alert(
          'Tidak Ditemukan',
          'Printer tidak terdeteksi otomatis.\n\nCoba opsi "Input Manual" — masukkan MAC address printer dari Settings Bluetooth HP.',
          [
            { text: 'Input Manual', onPress: () => setShowManual(true) },
            { text: 'Tutup', style: 'cancel' },
          ],
        );
      }
    } catch (e: any) {
      // Scan gagal → langsung tawarkan input manual
      Alert.alert(
        'Scan Gagal',
        (e?.message || 'Gagal scan perangkat') +
          "\n\nGunakan 'Input Manual' untuk memasukkan MAC address printer.",
        [
          { text: 'Input Manual', onPress: () => setShowManual(true) },
          { text: 'Tutup', style: 'cancel' },
        ],
      );
    } finally {
      setScanning(false);
    }
  };

  const doConnect = async (addr: string, name: string) => {
    setConnecting(addr);
    try {
      await connectPrinter(addr);
      await AsyncStorage.setItem(PRINTER_KEY, addr);
      await AsyncStorage.setItem(PRINTER_NAME_KEY, name);
      setSavedAddr(addr);
      setSavedName(name);
      Alert.alert('✅ Terhubung!', `Printer "${name}" siap digunakan.`);
    } catch (e: any) {
      Alert.alert(
        'Gagal Konek',
        (e?.message || 'Gagal terhubung') +
          '\n\nTips:\n• Pastikan printer menyala\n• Tidak ada HP lain yang konek ke printer\n• Coba matikan & nyalakan printer',
      );
    } finally {
      setConnecting(null);
    }
  };

  const handleConnect = async (device: any) => {
    // Coba semua field address yang mungkin ada
    const addr =
      device.inner_mac_address ||
      device.address ||
      device.macAddress ||
      device.mac_address ||
      device.id;
    const name =
      device.device_name || device.name || device.deviceName || 'Printer';
    if (!addr) {
      Alert.alert(
        'Error',
        'Tidak bisa baca alamat printer. Gunakan Input Manual.',
      );
      return;
    }
    await doConnect(addr, name);
  };

  const handleManualConnect = async () => {
    const addr = manualAddr.trim().toUpperCase();
    // Validasi format MAC address: XX:XX:XX:XX:XX:XX
    const macRegex = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/;
    if (!macRegex.test(addr)) {
      Alert.alert(
        'Format Salah',
        'MAC address harus format: XX:XX:XX:XX:XX:XX\n\nContoh: DC:0D:30:A1:B2:C3\n\nLihat di Pengaturan Bluetooth HP → tap nama printer → info detail.',
      );
      return;
    }
    setShowManual(false);
    await doConnect(addr, manualName || 'Printer Manual');
  };

  const handleDisconnect = async () => {
    await disconnectPrinter().catch(() => {});
    await AsyncStorage.removeItem(PRINTER_KEY).catch(() => {});
    await AsyncStorage.removeItem(PRINTER_NAME_KEY).catch(() => {});
    setSavedAddr(null);
    setSavedName('');
  };

  const handleTestPrint = async () => {
    if (!savedAddr) {
      Alert.alert('Belum terhubung', 'Hubungkan printer dulu.');
      return;
    }
    setTesting(true);
    try {
      const s = getPengaturan();
      await printStruk(
        {
          namaToko: s.nama_toko || 'Kasir WarungKu',
          alamat: s.alamat,
          noHp: s.no_hp,
          footer: s.footer_struk || 'Terima kasih!',
          noTrx: 'TEST-001',
          waktu: new Date().toISOString(),
          kasir: currentUser?.nama || 'Admin',
          metode: 'tunai',
          items: [
            {
              nama_produk: 'Aqua Botol 600ml',
              qty: 2,
              harga: 4000,
              subtotal: 8000,
            },
            {
              nama_produk: 'Indomie Goreng',
              qty: 1,
              harga: 3500,
              subtotal: 3500,
            },
          ],
          subtotal: 11500,
          diskon: 0,
          total: 11500,
          bayar: 15000,
          kembalian: 3500,
        },
        savedAddr,
      );
      Alert.alert('✅ Berhasil!', 'Struk test berhasil dicetak.');
    } catch (e: any) {
      Alert.alert('Gagal Print', e.message || 'Cek koneksi printer.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Printer Bluetooth</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={s.body}>
        {/* Status koneksi */}
        <View style={[s.statusCard, savedAddr ? s.statusOk : s.statusEmpty]}>
          <Ionicons
            name={savedAddr ? 'bluetooth' : 'bluetooth-outline'}
            size={26}
            color={savedAddr ? Colors.success : Colors.textMuted}
          />
          <View style={{ flex: 1 }}>
            <Text style={s.statusTitle}>
              {savedAddr ? 'Printer Aktif' : 'Belum Ada Printer'}
            </Text>
            <Text style={s.statusSub} numberOfLines={1}>
              {savedAddr
                ? `${savedName || savedAddr}`
                : 'Scan atau input manual untuk terhubung'}
            </Text>
            {savedAddr && (
              <Text
                style={{ fontSize: 10, color: Colors.textMuted, marginTop: 2 }}
              >
                {savedAddr}
              </Text>
            )}
          </View>
          {savedAddr && (
            <TouchableOpacity
              style={s.disconnectBtn}
              onPress={handleDisconnect}
            >
              <Text style={s.disconnectTxt}>Putus</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Info */}
        <View style={s.infoBox}>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={Colors.info}
          />
          <Text style={s.infoTxt}>
            Pair printer dulu di{' '}
            <Text style={{ fontWeight: '800' }}>Pengaturan → Bluetooth</Text>{' '}
            HP. Setelah paired, tap Scan. Jika tidak ditemukan, gunakan{' '}
            <Text style={{ fontWeight: '800' }}>Input Manual</Text>.
          </Text>
        </View>

        {/* Tombol aksi */}
        <View style={s.actionRow}>
          <TouchableOpacity
            style={[s.actionBtn, scanning && { opacity: 0.6 }]}
            onPress={handleScan}
            disabled={scanning}
          >
            {scanning ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Ionicons
                name="search-outline"
                size={18}
                color={Colors.primary}
              />
            )}
            <Text style={s.actionBtnTxt}>
              {scanning ? 'Scanning...' : 'Scan'}
            </Text>
          </TouchableOpacity>

          {/* ── BARU: Tombol Input Manual ── */}
          <TouchableOpacity
            style={[
              s.actionBtn,
              { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' },
            ]}
            onPress={() => setShowManual(true)}
          >
            <Ionicons name="keypad-outline" size={18} color="#EA580C" />
            <Text style={[s.actionBtnTxt, { color: '#EA580C' }]}>
              Input Manual
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              s.actionBtn,
              {
                backgroundColor: Colors.successLight,
                borderColor: Colors.success + '60',
              },
              (!savedAddr || testing) && { opacity: 0.45 },
            ]}
            onPress={handleTestPrint}
            disabled={!savedAddr || testing}
          >
            {testing ? (
              <ActivityIndicator size="small" color={Colors.success} />
            ) : (
              <Ionicons name="print-outline" size={18} color={Colors.success} />
            )}
            <Text style={[s.actionBtnTxt, { color: Colors.success }]}>
              Test Print
            </Text>
          </TouchableOpacity>
        </View>

        {/* Device list dari scan */}
        <FlatList
          data={devices}
          keyExtractor={(d) =>
            d.inner_mac_address || d.address || d.id || Math.random().toString()
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 24 }}
          ListHeaderComponent={
            devices.length > 0 ? (
              <Text style={s.listHeader}>
                Perangkat Ditemukan ({devices.length})
              </Text>
            ) : null
          }
          ListEmptyComponent={
            !scanning ? (
              <View style={s.empty}>
                <View style={s.emptyIcon}>
                  <Ionicons
                    name="bluetooth-outline"
                    size={40}
                    color="#D1D5DB"
                  />
                </View>
                <Text style={s.emptyTitle}>Belum ada perangkat</Text>
                <Text style={s.emptySub}>
                  Tap "Scan" untuk cari printer yang sudah di-pair.{'\n'}
                  Jika tidak muncul, gunakan "Input Manual".
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item: d }) => {
            const addr =
              d.inner_mac_address || d.address || d.macAddress || d.id;
            const name =
              d.device_name || d.name || d.deviceName || 'Unknown Device';
            const isActive = savedAddr === addr;
            const isConnecting = connecting === addr;
            return (
              <TouchableOpacity
                style={[s.deviceCard, isActive && s.deviceCardActive]}
                onPress={() => !isActive && handleConnect(d)}
                disabled={isConnecting || isActive}
              >
                <View
                  style={[
                    s.deviceIcon,
                    {
                      backgroundColor: isActive
                        ? Colors.successLight
                        : Colors.background,
                    },
                  ]}
                >
                  <Ionicons
                    name="print-outline"
                    size={22}
                    color={isActive ? Colors.success : Colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.deviceName}>{name}</Text>
                  <Text style={s.deviceAddr}>{addr}</Text>
                </View>
                {isConnecting ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : isActive ? (
                  <View style={s.connectedBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color={Colors.success}
                    />
                    <Text style={s.connectedBadgeTxt}>Aktif</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={s.connectBtn}
                    onPress={() => handleConnect(d)}
                  >
                    <Text style={s.connectBtnTxt}>Hubungkan</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* ── Modal Input Manual ── */}
      <Modal visible={showManual} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <TouchableOpacity
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: 'rgba(0,0,0,0.5)' },
            ]}
            onPress={() => setShowManual(false)}
            activeOpacity={1}
          />
          <View style={m.sheet}>
            <View style={m.handle} />
            <View style={m.headerRow}>
              <View style={m.headerIcon}>
                <Ionicons name="keypad-outline" size={20} color="#EA580C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={m.title}>Input MAC Address</Text>
                <Text style={m.sub}>
                  Untuk printer yang tidak terdeteksi otomatis
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowManual(false)}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={m.infoBox}>
              <Ionicons
                name="help-circle-outline"
                size={16}
                color={Colors.info}
              />
              <Text style={m.infoTxt}>
                Cara cari MAC address printer:{'\n'}
                Pengaturan HP → Bluetooth → tap nama printer{'\n'}→ lihat "MAC
                Address" atau "Alamat Perangkat"
              </Text>
            </View>

            <Text style={m.label}>NAMA PRINTER</Text>
            <TextInput
              style={m.input}
              value={manualName}
              onChangeText={setManualName}
              placeholder="contoh: RPP02N"
              placeholderTextColor={Colors.textDisabled}
            />

            <Text style={m.label}>MAC ADDRESS</Text>
            <TextInput
              style={[m.input, { fontFamily: 'monospace', letterSpacing: 1 }]}
              value={manualAddr}
              onChangeText={(t) => {
                // Auto-format: tambah ":" tiap 2 karakter
                const clean = t.replace(/[^0-9A-Fa-f:]/g, '').toUpperCase();
                setManualAddr(clean);
              }}
              placeholder="XX:XX:XX:XX:XX:XX"
              placeholderTextColor={Colors.textDisabled}
              autoCapitalize="characters"
              maxLength={17}
              keyboardType="default"
            />
            <Text
              style={{
                fontSize: 11,
                color: Colors.textMuted,
                marginBottom: 16,
              }}
            >
              Format: 6 pasang angka/huruf dipisah titik dua. Contoh:
              DC:0D:30:A1:B2:C3
            </Text>

            {/* Quick preset untuk printer umum */}
            <Text style={m.label}>PRESET PRINTER UMUM</Text>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: 16,
              }}
            >
              {[
                { name: 'RPP02N', hint: 'Rongta RPP02N' },
                { name: 'Xprinter', hint: 'XP-58/80' },
                { name: 'iDPRT', hint: 'iDPRT SP410' },
                { name: 'D110', hint: 'D110 Thermal' },
              ].map((preset) => (
                <TouchableOpacity
                  key={preset.name}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    backgroundColor: Colors.background,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: Colors.border,
                  }}
                  onPress={() => setManualName(preset.name)}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: Colors.primary,
                    }}
                  >
                    {preset.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={m.btnRow}>
              <TouchableOpacity
                style={m.btnBatal}
                onPress={() => setShowManual(false)}
              >
                <Text style={m.btnBatalTxt}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  m.btnSimpan,
                  manualAddr.length < 17 && { opacity: 0.5 },
                ]}
                onPress={handleManualConnect}
                disabled={manualAddr.length < 17}
              >
                <Ionicons name="bluetooth-outline" size={16} color="#fff" />
                <Text style={m.btnSimpanTxt}>Hubungkan</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  body: { flex: 1, backgroundColor: Colors.background, padding: 16, gap: 12 },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  statusOk: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.success + '50',
  },
  statusEmpty: { backgroundColor: '#fff', borderColor: Colors.border },
  statusTitle: { fontSize: 14, fontWeight: '800', color: Colors.text },
  statusSub: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  disconnectBtn: {
    backgroundColor: Colors.dangerLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  disconnectTxt: { fontSize: 12, fontWeight: '700', color: Colors.danger },
  infoBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: Colors.infoLight,
    borderRadius: 12,
    padding: 12,
  },
  infoTxt: { flex: 1, fontSize: 12, color: Colors.info, lineHeight: 17 },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionBtnTxt: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  listHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 8,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  deviceCardActive: {
    borderColor: Colors.success,
    borderWidth: 1.5,
    backgroundColor: Colors.successLight,
  },
  deviceIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  deviceAddr: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  connectedBadgeTxt: { fontSize: 11, fontWeight: '700', color: Colors.success },
  connectBtn: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  connectBtnTxt: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  empty: { alignItems: 'center', paddingTop: 24, gap: 10 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: Colors.textMuted },
  emptySub: {
    fontSize: 13,
    color: Colors.textLight,
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 20,
  },
});

const m = StyleSheet.create({
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '800', color: Colors.text },
  sub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  infoBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.infoLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  infoTxt: { flex: 1, fontSize: 12, color: Colors.info, lineHeight: 18 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: Colors.text,
    marginBottom: 8,
  },
  btnRow: { flexDirection: 'row', gap: 10 },
  btnBatal: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  btnBatalTxt: { fontWeight: '700', color: Colors.textMuted },
  btnSimpan: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  btnSimpanTxt: { fontWeight: '800', color: '#fff' },
});
