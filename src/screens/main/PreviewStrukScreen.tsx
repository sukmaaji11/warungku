import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { getPengaturan, setPengaturan } from '../../db/produkRepo';
import { printStruk } from '../../utils/printer';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PreviewStrukScreen({ navigation }: any) {
  const [cetakLogo, setCetakLogo] = useState(true);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const data = getPengaturan();

    setSettings(data);
    setCetakLogo(data.cetak_logo_struk !== '0');
  }, []);

  const toggleCetakLogo = () => {
    const value = !cetakLogo;

    setCetakLogo(value);
    setPengaturan('cetak_logo_struk', value ? '1' : '0');
  };

  const handleTestPrint = async () => {
    setTesting(true);

    try {
      const printerAddress = await AsyncStorage.getItem(
        'kasirku_printer_address',
      );

      if (!printerAddress) {
        Alert.alert(
          'Printer Belum Terhubung',
          'Silakan hubungkan printer terlebih dahulu di menu Printer Bluetooth.',
        );
        return;
      }

      const s = getPengaturan();

      await printStruk(
        {
          namaToko: s.nama_toko || 'Kasir WarungKu',
          alamat: s.alamat,
          noHp: s.no_hp,
          logo: s.logo_toko,
          cetakLogo: s.cetak_logo_struk !== '0',
          footer: s.footer_struk || 'Terima kasih!',
          noTrx: 'TEST-001',
          waktu: new Date().toISOString(),
          kasir: 'Test Print',
          metode: 'tunai',
          items: [
            {
              nama_produk: 'Roti',
              qty: 2,
              harga: 5400,
              subtotal: 10800,
            },
            {
              nama_produk: 'Kopi ABC Susu',
              qty: 1,
              harga: 4900,
              subtotal: 4900,
            },
          ],
          subtotal: 15700,
          diskon: 0,
          total: 15700,
          bayar: 20000,
          kembalian: 4300,
        },
        printerAddress,
      );

      Alert.alert('✅ Berhasil!', 'Struk test berhasil dicetak.');
    } catch (e: any) {
      Alert.alert(
        'Gagal Print',
        e?.message || 'Pastikan printer sudah terhubung.',
      );
    } finally {
      setTesting(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.headerTitle}>Preview Struk</Text>
          <Text style={s.headerSub}>Lihat tampilan struk sebelum dicetak</Text>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.infoCard}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={Colors.info}
          />
          <Text style={s.infoText}>
            Pengaturan logo struk akan tersedia di halaman ini.
          </Text>
        </View>
        {/* Nanti toggle logo kita taruh di sini */}
        <View style={s.settingCard}>
          <View style={s.settingInfo}>
            <Text style={s.settingTitle}>Cetak Logo di Struk</Text>
            <Text style={s.settingSubtitle}>
              Tampilkan logo toko saat mencetak struk
            </Text>
          </View>
          <Switch value={cetakLogo} onValueChange={toggleCetakLogo} />
        </View>

        {/* Preview */}
        <View style={s.previewWrapper}>
          <View style={s.receipt}>
            {cetakLogo && settings.logo_toko ? (
              <Image
                source={{ uri: settings.logo_toko }}
                style={s.previewLogo}
                resizeMode="contain"
              />
            ) : null}
            <Text style={s.storeName}>{settings.nama_toko || 'Nama Toko'}</Text>

            {!!settings.alamat && (
              <Text style={s.storeInfo}>{settings.alamat}</Text>
            )}

            {!!settings.no_hp && (
              <Text style={s.storeInfo}>{settings.no_hp}</Text>
            )}

            <View style={s.divider} />

            <View style={s.row}>
              <Text style={s.item}>Roti</Text>
              <Text style={s.item}>2 x 5.400</Text>
            </View>

            <View style={s.row}>
              <Text style={s.item}>Kopi ABC Susu</Text>
              <Text style={s.item}>1 x 4.900</Text>
            </View>

            <View style={s.divider} />

            <View style={s.row}>
              <Text style={s.totalLabel}>TOTAL</Text>
              <Text style={s.totalValue}>Rp 15.700</Text>
            </View>

            <View style={s.divider} />
            <Text style={s.footer}>
              {settings.footer_struk || 'Terima kasih telah berbelanja!'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[s.testPrintBtn, testing && { opacity: 0.6 }]}
          onPress={handleTestPrint}
          disabled={testing}
        >
          {testing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="print-outline" size={18} color="#fff" />
          )}

          <Text style={s.testPrintText}>
            {testing ? 'Mencetak...' : 'Test Print'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.primary,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },

  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },

  headerSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    marginTop: 2,
  },

  scroll: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },

  content: {
    padding: 16,
    paddingBottom: 32,
  },

  previewWrapper: {
    alignItems: 'center',
  },

  receipt: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 20,

    // Efek kertas struk
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },

  storeName: {
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },

  storeInfo: {
    textAlign: 'center',
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },

  divider: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    marginVertical: 12,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },

  item: {
    fontSize: 11,
    color: '#374151',
  },

  totalLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
  },

  totalValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
  },

  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: '#6B7280',
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
    marginBottom: 16,
  },

  infoText: {
    flex: 1,
    fontSize: 11,
    color: Colors.info,
    lineHeight: 16,
  },
  settingCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  settingInfo: {
    flex: 1,
    paddingRight: 12,
  },

  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  previewLogo: {
    width: 100,
    height: 60,
    alignSelf: 'center',
    marginBottom: 8,
  },
  testPrintBtn: {
    marginTop: 16,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  testPrintText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
