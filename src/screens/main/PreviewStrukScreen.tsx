import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { getPengaturan, setPengaturan } from '../../db/produkRepo';

export default function PreviewStrukScreen({ navigation }: any) {
  const [cetakLogo, setCetakLogo] = useState(true);
  const [settings, setSettings] = useState<Record<string, string>>({});

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
            <Text style={s.storeName}>NAMA TOKO</Text>
            <Text style={s.storeInfo}>Jl. Contoh No. 123</Text>
            <Text style={s.storeInfo}>08123456789</Text>

            <View style={s.divider} />

            <View style={s.row}>
              <Text style={s.item}>Gold</Text>
              <Text style={s.item}>2 x 5.400</Text>
            </View>

            <View style={s.row}>
              <Text style={s.item}>Silver</Text>
              <Text style={s.item}>1 x 4.900</Text>
            </View>

            <View style={s.divider} />

            <View style={s.row}>
              <Text style={s.totalLabel}>TOTAL</Text>
              <Text style={s.totalValue}>Rp 15.700</Text>
            </View>

            <View style={s.divider} />

            <Text style={s.footer}>Terima kasih telah berbelanja</Text>
          </View>
        </View>
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
});
