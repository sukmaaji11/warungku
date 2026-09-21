import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { getPengaturan, setPengaturan } from '../db/produkRepo';

export default function PengaturanScreen() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setSettings(getPengaturan());
    }, []),
  );

  const update = (k: string, v: string) =>
    setSettings((p) => ({ ...p, [k]: v }));

  const save = () => {
    Object.entries(settings).forEach(([k, v]) => setPengaturan(k, v));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>⚙️ Pengaturan</Text>
        <TouchableOpacity
          style={[s.saveBtn, saved && { backgroundColor: Colors.success }]}
          onPress={save}
        >
          <Text style={s.saveTxt}>{saved ? '✅ Tersimpan' : 'Simpan'}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <Text style={s.sec}>INFORMASI TOKO</Text>
        <View style={s.card}>
          {[
            ['nama_toko', 'Nama Toko'],
            ['alamat', 'Alamat'],
            ['no_hp', 'No. HP / WA'],
            ['footer_struk', 'Footer Struk'],
          ].map(([k, label], i, arr) => (
            <React.Fragment key={k}>
              <View style={s.field}>
                <Text style={s.fieldLabel}>{label}</Text>
                <TextInput
                  style={s.fieldInput}
                  value={settings[k] || ''}
                  onChangeText={(v) => update(k, v)}
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
              {i < arr.length - 1 && <View style={s.div} />}
            </React.Fragment>
          ))}
        </View>
        <Text style={s.sec}>TENTANG</Text>
        <View style={s.card}>
          {[
            ['Aplikasi', 'Kasir WarungKu'],
            ['Versi', '1.0.0'],
            ['Database', 'SQLite Offline'],
            ['Mode', '🟢 Offline'],
          ].map(([l, v], i, arr) => (
            <React.Fragment key={l}>
              <View style={s.aboutRow}>
                <Text style={s.aboutL}>{l}</Text>
                <Text style={s.aboutV}>{v}</Text>
              </View>
              {i < arr.length - 1 && <View style={s.div} />}
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  logoSection: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  logoPreview: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  logoPlaceholder: {
    fontSize: 32,
  },

  logoInfo: {
    flex: 1,
  },

  logoButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },

  logoButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: { color: '#fff', fontSize: 18, fontWeight: '700' },
  saveBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  saveTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  scroll: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  sec: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
    overflow: 'hidden',
  },
  field: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', width: 110 },
  fieldInput: { flex: 1, fontSize: 13, color: Colors.text },
  div: { height: 1, backgroundColor: Colors.border, marginHorizontal: 16 },
  aboutRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  aboutL: { fontSize: 13, color: Colors.textMuted },
  aboutV: { fontSize: 13, fontWeight: '600' },
});
