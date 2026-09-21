// src/screens/main/PengaturanScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getPengaturan, setPengaturan } from '../../db/produkRepo';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants';
import { usePermission } from '../../hooks/usePermission';
import { getDB } from '../../db/database';
import * as XLSX from 'xlsx';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
//import * as FileSystem from 'expo-file-system/legacy';
import * as FileSystem from 'expo-file-system';

type Section = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  fields: Field[];
};

type Field = {
  key: string;
  label: string;
  placeholder: string;
  keyboard?: 'default' | 'numeric' | 'phone-pad';
  multiline?: boolean;
  maxLength?: number;
};

const SECTIONS: Section[] = [
  {
    title: 'Informasi Toko',
    icon: 'storefront-outline',
    color: '#2563EB',
    bg: '#EFF6FF',
    fields: [
      {
        key: 'nama_toko',
        label: 'Nama Toko',
        placeholder: 'Contoh: Warung Suka Suka',
        maxLength: 50,
      },
      {
        key: 'alamat',
        label: 'Alamat',
        placeholder: 'Jl. Contoh No. 1',
        maxLength: 100,
      },
      {
        key: 'no_hp',
        label: 'No. HP / WA',
        placeholder: '08123456789',
        keyboard: 'phone-pad',
        maxLength: 13,
      },
      {
        key: 'footer_struk',
        label: 'Footer Struk',
        placeholder: 'Terima kasih!',
        multiline: true,
        maxLength: 100,
      },
    ],
  },
  {
    title: 'Pengaturan Transaksi',
    icon: 'receipt-outline',
    color: '#7C3AED',
    bg: '#F5F3FF',
    fields: [
      {
        key: 'pajak_persen',
        label: 'Pajak (%)',
        placeholder: '0',
        keyboard: 'numeric',
        maxLength: 3,
      },
    ],
  },
];

// ── Export Excel ──────────────────────────────────────────────────────────────
async function exportToExcel(): Promise<void> {
  const db = getDB();
  const tglStr = new Date().toLocaleDateString('id-ID').replace(/\//g, '-');

  const produk = db.getAllSync(`
    SELECT p.id, p.nama, p.harga, p.harga_modal, p.stok, p.stok_minimum,
           p.satuan, p.barcode, p.harga_grosir, p.min_grosir, p.aktif_grosir,
           k.nama as kategori
    FROM produk p LEFT JOIN kategori k ON k.id = p.kategori_id
    ORDER BY p.nama ASC
  `) as any[];

  const wsProduk = XLSX.utils.json_to_sheet(
    produk.map((p) => ({
      ID: p.id,
      Nama: p.nama,
      'Harga Jual': p.harga,
      'Harga Modal': p.harga_modal,
      Stok: p.stok,
      'Stok Minimum': p.stok_minimum,
      Satuan: p.satuan,
      Barcode: p.barcode || '',
      // ← Kategori disimpan sebagai nama (bukan id) agar bisa di-restore
      Kategori: p.kategori || '',
      'Harga Grosir': p.harga_grosir || 0,
      'Min Grosir': p.min_grosir || 0,
      'Aktif Grosir': p.aktif_grosir || 0,
    })),
  );

  const transaksi = db.getAllSync(`
    SELECT no_trx, waktu, subtotal, diskon, total, metode_bayar, bayar, kembalian
    FROM transaksi ORDER BY waktu DESC LIMIT 1000
  `) as any[];

  const wsTrx = XLSX.utils.json_to_sheet(
    transaksi.map((t) => ({
      'No Transaksi': t.no_trx,
      Waktu: t.waktu?.replace('T', ' ').slice(0, 16) || '',
      Subtotal: t.subtotal,
      Diskon: t.diskon,
      Total: t.total,
      'Metode Bayar': t.metode_bayar,
      Bayar: t.bayar,
      Kembalian: t.kembalian,
    })),
  );

  let wsDetail: any = null;
  try {
    // FIX: join pakai t.id = ti.transaksi_id (integer), bukan no_trx
    // Sebelumnya join salah → detail item tidak ter-export dengan benar
    const detail = db.getAllSync(`
      SELECT
        t.no_trx,
        t.waktu,
        t.metode_bayar,
        ti.nama_produk,
        ti.qty,
        ti.harga,
        COALESCE(ti.harga_modal, p.harga_modal, 0) as harga_modal,
        ti.subtotal
      FROM transaksi_item ti
      JOIN transaksi t ON t.id = ti.transaksi_id
      LEFT JOIN produk p ON p.id = ti.produk_id
      ORDER BY t.waktu DESC
      LIMIT 5000
    `) as any[];
    wsDetail = XLSX.utils.json_to_sheet(
      detail.map((d: any) => ({
        'No Transaksi': d.no_trx || '',
        Waktu: d.waktu?.replace('T', ' ').slice(0, 16) || '',
        Metode: d.metode_bayar || '',
        Produk: d.nama_produk || '',
        Qty: d.qty,
        Harga: d.harga,
        'Harga Modal': d.harga_modal,
        Subtotal: d.subtotal,
      })),
    );
  } catch {}

  const pelanggan = db.getAllSync(
    `SELECT id, nama, no_hp, alamat, total_beli FROM pelanggan ORDER BY nama ASC`,
  ) as any[];
  const wsPelanggan = XLSX.utils.json_to_sheet(
    pelanggan.map((p) => ({
      ID: p.id,
      Nama: p.nama,
      'No HP': p.no_hp || '',
      Alamat: p.alamat || '',
      'Total Beli': p.total_beli || 0,
    })),
  );

  let wsPengeluaran: any = null;
  try {
    const pengeluaran = db.getAllSync(
      `SELECT id, kategori, deskripsi, jumlah, tanggal FROM pengeluaran ORDER BY tanggal DESC`,
    ) as any[];
    if (pengeluaran.length > 0) {
      wsPengeluaran = XLSX.utils.json_to_sheet(
        pengeluaran.map((p) => ({
          ID: p.id,
          Kategori: p.kategori,
          Deskripsi: p.deskripsi || '',
          Jumlah: p.jumlah,
          Tanggal: p.tanggal,
        })),
      );
    }
  } catch {}

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsProduk, 'Produk');
  XLSX.utils.book_append_sheet(wb, wsTrx, 'Transaksi');
  if (wsDetail) XLSX.utils.book_append_sheet(wb, wsDetail, 'Detail Transaksi');
  XLSX.utils.book_append_sheet(wb, wsPelanggan, 'Pelanggan');
  if (wsPengeluaran)
    XLSX.utils.book_append_sheet(wb, wsPengeluaran, 'Pengeluaran');

  const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' }) as string;
  const fileName = `BackupWarungKu_${tglStr}.xlsx`;
  const FileSystemMod = require('expo-file-system/legacy');
  const fileUri = FileSystemMod.cacheDirectory + fileName;
  await FileSystemMod.writeAsStringAsync(fileUri, wbout, {
    encoding: 'base64',
  });
  await Sharing.shareAsync(fileUri, {
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: 'Simpan / Share Backup Data',
    UTI: 'com.microsoft.excel.xlsx',
  });
}

// ── Reset Data ────────────────────────────────────────────────────────────────
function resetSemuaData() {
  const db = getDB();
  db.execSync(
    `DELETE FROM transaksi_item; DELETE FROM transaksi; DELETE FROM produk; DELETE FROM pelanggan;`,
  );
  try {
    db.execSync(
      `DELETE FROM pengeluaran; DELETE FROM diskon; DELETE FROM konsinyasi; DELETE FROM konsinyor;`,
    );
  } catch {}
}

// ── FIX: Helper cari atau buat kategori berdasarkan nama ─────────────────────
function getOrCreateKategoriId(db: any, namaKategori: string): number {
  if (!namaKategori || namaKategori.trim() === '' || namaKategori === 'Semua') {
    return 1;
  }
  const nama = namaKategori.trim();

  // 1. Exact match (nama persis sama termasuk emoji)
  const exact = db.getFirstSync(
    `SELECT id FROM kategori WHERE LOWER(nama) = LOWER(?) LIMIT 1`,
    [nama],
  ) as any;
  if (exact) return exact.id;

  // 2. Strip emoji lalu compare satu per satu
  // Contoh: Excel simpan "🥤 Minuman", DB punya "🥤 Minuman" → match
  // Contoh: Excel simpan "Minuman", DB punya "🥤 Minuman" → strip emoji → "Minuman" = "Minuman" ✅
  // FIX bug lama: LIKE '%Minuman%' bisa match kategori lain yang mengandung kata "Minuman"
  const stripEmoji = (s: string) =>
    s.replace(/[\u{1F300}-\u{1FFFF}\u{2600}-\u{27BF}]/gu, '').trim();

  const namaClean = stripEmoji(nama).toLowerCase();
  const allKat = db.getAllSync(
    `SELECT id, nama FROM kategori ORDER BY id ASC`,
  ) as any[];

  for (const kat of allKat) {
    const katClean = stripEmoji(kat.nama).toLowerCase();
    if (katClean === namaClean) return kat.id;
  }

  // 3. Partial match hanya jika tidak ada exact → kata kunci harus match penuh
  for (const kat of allKat) {
    const katClean = stripEmoji(kat.nama).toLowerCase();
    // Match hanya kalau nama persis ada di dalam nama kategori (bukan substring sembarangan)
    if (
      katClean.split(' ').some((word) => word === namaClean) ||
      namaClean.split(' ').some((word) => word === katClean)
    ) {
      return kat.id;
    }
  }

  // 4. Tidak ketemu → buat kategori baru
  try {
    const res = db.runSync(`INSERT OR IGNORE INTO kategori (nama) VALUES (?)`, [
      nama,
    ]);
    if (res.lastInsertRowId) return res.lastInsertRowId;
    const afterInsert = db.getFirstSync(
      `SELECT id FROM kategori WHERE nama=? LIMIT 1`,
      [nama],
    ) as any;
    if (afterInsert) return afterInsert.id;
  } catch {}

  return 1;
}

export default function PengaturanScreen({ navigation }: any) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [changed, setChanged] = useState(false);
  const [saving, setSaving] = useState(false);
  const { logout } = useAuthStore();
  const { isOwner } = usePermission();

  const [showGantiPin, setShowGantiPin] = useState(false);
  const [pinLama, setPinLama] = useState('');
  const [pinBaru, setPinBaru] = useState('');
  const [pinKonfirm, setPinKonfirm] = useState('');
  const [showPinLama, setShowPinLama] = useState(false);
  const [showPinBaru, setShowPinBaru] = useState(false);
  const [showPinKonfirm, setShowPinKonfirm] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [pinReset, setPinReset] = useState('');
  const [showPinReset, setShowPinReset] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setSettings(getPengaturan());
      setChanged(false);
    }, []),
  );

  const update = (key: string, val: string) => {
    setSettings((p) => ({ ...p, [key]: val }));
    setChanged(true);
  };

  //====================================================================
  //V1.5.0 - Jadicuan Developer
  // Fungsi untuk memilih logo toko dari galeri
  // Fitur logo toko: pilih dari galeri, tampil di header, disimpan di pengaturan
  const pickLogo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) {
        return;
      }

      const sourceUri = result.assets[0]?.uri;

      if (!sourceUri) {
        return;
      }

      const fileName = `logo-toko-${Date.now()}.jpg`;
      const destination = new FileSystem.File(
        FileSystem.Paths.document,
        fileName,
      );

      const source = new FileSystem.File(sourceUri);
      source.copy(destination);
      update('logo_toko', destination.uri);
    } catch (error) {
      console.error('Gagal menyimpan logo:', error);
      Alert.alert('Gagal', 'Logo tidak dapat disimpan.');
    }
  };
  //====================================================================

  const handleSave = () => {
    setSaving(true);
    Object.entries(settings).forEach(([k, v]) => setPengaturan(k, v));
    setTimeout(() => {
      setSaving(false);
      setChanged(false);
      Alert.alert('Tersimpan', 'Pengaturan berhasil disimpan.');
    }, 400);
  };

  const handleLogout = () => {
    Alert.alert('Keluar', 'Yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: logout },
    ]);
  };

  const resetGantiPin = () => {
    setPinLama('');
    setPinBaru('');
    setPinKonfirm('');
    setShowPinLama(false);
    setShowPinBaru(false);
    setShowPinKonfirm(false);
    setShowGantiPin(false);
  };

  const handleGantiPin = () => {
    if (!pinLama || !pinBaru || !pinKonfirm) {
      Alert.alert('Error', 'Semua field wajib diisi');
      return;
    }
    if (pinBaru.length !== 6) {
      Alert.alert('Error', 'PIN baru harus 6 digit');
      return;
    }
    if (pinBaru !== pinKonfirm) {
      Alert.alert('Error', 'Konfirmasi PIN tidak cocok');
      return;
    }
    try {
      const db = getDB();
      const owner = db.getFirstSync(
        `SELECT * FROM users WHERE role = 'owner' LIMIT 1`,
      ) as any;
      if (!owner) {
        Alert.alert('Error', 'Akun owner tidak ditemukan');
        return;
      }
      if (owner.pin !== pinLama) {
        Alert.alert('Error', 'PIN lama salah');
        return;
      }
      db.runSync(`UPDATE users SET pin = ? WHERE id = ?`, [pinBaru, owner.id]);
      Alert.alert('✅ Berhasil', 'PIN owner berhasil diubah!');
      resetGantiPin();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Gagal mengubah PIN');
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportToExcel();
    } catch (e: any) {
      Alert.alert('Gagal Export', e?.message || 'Terjadi kesalahan');
    } finally {
      setExporting(false);
    }
  };

  const handleRestore = async () => {
    Alert.alert(
      'Restore dari Excel',
      'Pilih file Excel backup (.xlsx) yang ingin di-restore.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Pilih File',
          onPress: async () => {
            setRestoring(true);
            try {
              const DocumentPicker = require('expo-document-picker');
              const XLSXLib = require('xlsx');
              const res = await DocumentPicker.getDocumentAsync({
                type: [
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                ],
                copyToCacheDirectory: true,
              });
              if (res.canceled || !res.assets?.[0]) {
                setRestoring(false);
                return;
              }

              const uri = res.assets[0].uri;
              const FileSystemMod = require('expo-file-system/legacy');
              const base64 = await FileSystemMod.readAsStringAsync(uri, {
                encoding: 'base64',
              });

              const wb = XLSXLib.read(base64, { type: 'base64' });
              const db = getDB();
              let produkCount = 0,
                pelangganCount = 0,
                trxCount = 0,
                trxItemCount = 0;

              // ── Restore Transaksi ─────────────────────────────────────────
              // Simpan header dan item secara terpisah — header dulu baru item
              const trxHeaderMap: Record<string, number> = {}; // no_trx → id

              const restoreTransaksi = (sheetName: string) => {
                const rows = XLSXLib.utils.sheet_to_json(
                  wb.Sheets[sheetName],
                ) as any[];
                for (const row of rows) {
                  try {
                    const no_trx = get(
                      row,
                      'No Transaksi',
                      'no_trx',
                      'noTrx',
                    ).trim();
                    if (!no_trx) continue;
                    // Skip jika sudah ada
                    const ex = db.getFirstSync(
                      `SELECT id FROM transaksi WHERE no_trx=? LIMIT 1`,
                      [no_trx],
                    ) as any;
                    if (ex) {
                      trxHeaderMap[no_trx] = ex.id;
                      trxCount++;
                      continue;
                    }

                    const subtotal =
                      parseInt(get(row, 'Subtotal', 'subtotal') || '0') || 0;
                    const diskon =
                      parseInt(get(row, 'Diskon', 'diskon') || '0') || 0;
                    const total =
                      parseInt(get(row, 'Total', 'total') || '0') || 0;
                    const bayar =
                      parseInt(get(row, 'Bayar', 'bayar') || '0') || 0;
                    const kembalian =
                      parseInt(get(row, 'Kembalian', 'kembalian') || '0') || 0;
                    const metode =
                      get(row, 'Metode Bayar', 'metode_bayar', 'metode') ||
                      'tunai';
                    const waktu =
                      get(row, 'Waktu', 'waktu') ||
                      new Date().toISOString().slice(0, 16).replace('T', ' ');
                    const kasir = get(row, 'Kasir', 'kasir') || 'Admin';

                    const res = db.runSync(
                      `INSERT INTO transaksi (no_trx,subtotal,diskon,total,bayar,kembalian,metode_bayar,kasir,waktu)
                       VALUES (?,?,?,?,?,?,?,?,?)`,
                      [
                        no_trx,
                        subtotal,
                        diskon,
                        total,
                        bayar,
                        kembalian,
                        metode.toLowerCase(),
                        kasir,
                        waktu,
                      ],
                    );
                    trxHeaderMap[no_trx] = res.lastInsertRowId;
                    trxCount++;
                  } catch (err: any) {
                    errorLog.push('T:' + err?.message?.slice(0, 40));
                  }
                }
              };

              const restoreDetailTransaksi = (sheetName: string) => {
                const rows = XLSXLib.utils.sheet_to_json(
                  wb.Sheets[sheetName],
                ) as any[];
                for (const row of rows) {
                  try {
                    const no_trx = get(
                      row,
                      'No Transaksi',
                      'no_trx',
                      'noTrx',
                    ).trim();
                    if (!no_trx) continue;
                    // Dapatkan transaksi_id — cari dari map atau dari DB
                    let trxId = trxHeaderMap[no_trx];
                    if (!trxId) {
                      const t = db.getFirstSync(
                        `SELECT id FROM transaksi WHERE no_trx=? LIMIT 1`,
                        [no_trx],
                      ) as any;
                      if (!t) continue; // transaksi induk tidak ditemukan
                      trxId = t.id;
                      trxHeaderMap[no_trx] = trxId;
                    }
                    const nama_produk = get(
                      row,
                      'Produk',
                      'nama_produk',
                      'Nama Produk',
                    ).trim();
                    if (!nama_produk) continue;
                    const qty = parseInt(get(row, 'Qty', 'qty') || '1') || 1;
                    const harga =
                      parseInt(
                        get(row, 'Harga', 'harga', 'Harga Jual') || '0',
                      ) || 0;
                    const subtotal =
                      parseInt(get(row, 'Subtotal', 'subtotal') || '0') ||
                      qty * harga;
                    const harga_modal =
                      parseInt(get(row, 'Harga Modal', 'harga_modal') || '0') ||
                      0;
                    // Cari produk_id dari nama
                    const produk = db.getFirstSync(
                      `SELECT id FROM produk WHERE nama=? LIMIT 1`,
                      [nama_produk],
                    ) as any;
                    db.runSync(
                      `INSERT INTO transaksi_item (transaksi_id,produk_id,nama_produk,harga,qty,subtotal,harga_modal) VALUES (?,?,?,?,?,?,?)`,
                      [
                        trxId,
                        produk?.id || null,
                        nama_produk,
                        harga,
                        qty,
                        subtotal,
                        harga_modal,
                      ],
                    );
                    trxItemCount++;
                  } catch (err: any) {
                    errorLog.push('TI:' + err?.message?.slice(0, 40));
                  }
                }
              };
              const errorLog: string[] = [];

              const get = (row: any, ...keys: string[]): string => {
                for (const k of keys) {
                  if (row[k] !== undefined && row[k] !== null && row[k] !== '')
                    return row[k].toString();
                }
                return '';
              };

              const restoreProduk = (sheetName: string) => {
                const rows = XLSXLib.utils.sheet_to_json(
                  wb.Sheets[sheetName],
                ) as any[];
                for (const row of rows) {
                  try {
                    const nama = get(
                      row,
                      'Nama',
                      'nama',
                      'NAMA',
                      'Name',
                      'product_name',
                    ).trim();
                    if (!nama) continue;

                    const harga =
                      parseInt(
                        get(
                          row,
                          'Harga Jual',
                          'Harga',
                          'harga',
                          'HARGA',
                          'price',
                        ) || '0',
                      ) || 0;
                    const harga_modal =
                      parseInt(
                        get(row, 'Harga Modal', 'harga_modal', 'Modal') || '0',
                      ) || 0;
                    const stok =
                      parseInt(
                        get(row, 'Stok', 'stok', 'Stock', 'qty') || '0',
                      ) || 0;
                    const stok_min =
                      parseInt(
                        get(row, 'Stok Minimum', 'stok_minimum') || '5',
                      ) || 5;
                    const satuan =
                      get(row, 'Satuan', 'satuan', 'Unit') || 'pcs';
                    const barcode = get(row, 'Barcode', 'barcode') || null;

                    // Grosir — opsional, default 0 jika tidak ada di file lama
                    const harga_grosir =
                      parseInt(
                        get(row, 'Harga Grosir', 'harga_grosir') || '0',
                      ) || 0;
                    const min_grosir =
                      parseInt(get(row, 'Min Grosir', 'min_grosir') || '0') ||
                      0;
                    const aktif_grosir =
                      parseInt(
                        get(row, 'Aktif Grosir', 'aktif_grosir') || '0',
                      ) || 0;

                    // ── FIX UTAMA: baca nama kategori dari Excel, cari/buat id-nya ──
                    // Sebelumnya: kategori_id di-hardcode ke 1 → semua produk jadi "Semua"
                    // Sekarang: resolve nama kategori ke id yang benar
                    const namaKategori = get(
                      row,
                      'Kategori',
                      'kategori',
                      'Category',
                    );
                    const kategori_id = getOrCreateKategoriId(db, namaKategori);

                    const ex = db.getFirstSync(
                      `SELECT id, aktif FROM produk WHERE nama=? LIMIT 1`,
                      [nama],
                    ) as any;
                    if (ex) {
                      // ── FIX: jangan restore produk yang sudah dihapus user (aktif=0) ──
                      // Kalau user sudah hapus produk ini, hormati keputusan user — skip
                      if (ex.aktif === 0) {
                        produkCount++; // hitung tapi tidak di-update
                        continue;
                      }
                      db.runSync(
                        `UPDATE produk SET harga=?,harga_modal=?,stok=?,stok_minimum=?,satuan=?,
                         kategori_id=?,harga_grosir=?,min_grosir=?,aktif_grosir=?
                         WHERE id=?`,
                        [
                          harga,
                          harga_modal,
                          stok,
                          stok_min,
                          satuan,
                          kategori_id,
                          harga_grosir,
                          min_grosir,
                          aktif_grosir,
                          ex.id,
                        ],
                      );
                    } else {
                      db.runSync(
                        `INSERT INTO produk
                           (nama,harga,harga_modal,stok,stok_minimum,satuan,barcode,
                            kategori_id,harga_grosir,min_grosir,aktif_grosir,aktif)
                         VALUES (?,?,?,?,?,?,?,?,?,?,?,1)`,
                        [
                          nama,
                          harga,
                          harga_modal,
                          stok,
                          stok_min,
                          satuan,
                          barcode,
                          kategori_id,
                          harga_grosir,
                          min_grosir,
                          aktif_grosir,
                        ],
                      );
                    }
                    produkCount++;
                  } catch (err: any) {
                    errorLog.push('P:' + err?.message?.slice(0, 40));
                  }
                }
              };

              const restorePelanggan = (sheetName: string) => {
                const rows = XLSXLib.utils.sheet_to_json(
                  wb.Sheets[sheetName],
                ) as any[];
                for (const row of rows) {
                  try {
                    const nama = get(
                      row,
                      'Nama',
                      'nama',
                      'NAMA',
                      'Name',
                    ).trim();
                    if (!nama) continue;
                    const no_hp = get(
                      row,
                      'No HP',
                      'no_hp',
                      'NoHP',
                      'Phone',
                      'Telepon',
                    );
                    const alamat = get(row, 'Alamat', 'alamat', 'Address');
                    const total_beli =
                      parseInt(get(row, 'Total Beli', 'total_beli') || '0') ||
                      0;
                    const ex = db.getFirstSync(
                      `SELECT id FROM pelanggan WHERE nama=? LIMIT 1`,
                      [nama],
                    ) as any;
                    if (!ex) {
                      db.runSync(
                        `INSERT INTO pelanggan (nama,no_hp,alamat,total_beli) VALUES (?,?,?,?)`,
                        [nama, no_hp, alamat, total_beli],
                      );
                    }
                    pelangganCount++;
                  } catch (err: any) {
                    errorLog.push('L:' + err?.message?.slice(0, 40));
                  }
                }
              };

              const allSheets = wb.SheetNames as string[];
              // Pass 1: produk, pelanggan, dan header transaksi dulu
              for (const name of allSheets) {
                const lower = name.toLowerCase();
                if (lower.includes('pelanggan') || lower.includes('customer')) {
                  restorePelanggan(name);
                } else if (
                  lower.includes('detail') &&
                  (lower.includes('transaksi') || lower.includes('item'))
                ) {
                  // Skip dulu — detail diproses setelah header transaksi selesai
                } else if (
                  lower.includes('transaksi') ||
                  lower.includes('transaction')
                ) {
                  restoreTransaksi(name);
                } else if (
                  lower.includes('produk') ||
                  lower.includes('product') ||
                  lower.includes('sheet')
                ) {
                  restoreProduk(name);
                }
              }
              // Pass 2: detail item transaksi (butuh transaksi_id dari pass 1)
              for (const name of allSheets) {
                const lower = name.toLowerCase();
                if (
                  lower.includes('detail') &&
                  (lower.includes('transaksi') || lower.includes('item'))
                ) {
                  restoreDetailTransaksi(name);
                }
              }
              if (
                produkCount === 0 &&
                pelangganCount === 0 &&
                allSheets.length > 0
              ) {
                restoreProduk(allSheets[0]);
              }

              let msg = `${produkCount} produk, ${pelangganCount} pelanggan, ${trxCount} transaksi, ${trxItemCount} item berhasil di-restore.`;
              if (errorLog.length > 0) msg += `\n(${errorLog.length} error)`;
              Alert.alert('✅ Restore Selesai', msg);
            } catch (e: any) {
              Alert.alert(
                'Gagal Restore',
                e?.message || 'Terjadi kesalahan saat membaca file.',
              );
            } finally {
              setRestoring(false);
            }
          },
        },
      ],
    );
  };

  const handleResetKonfirm = () => {
    try {
      const db = getDB();
      const owner = db.getFirstSync(
        `SELECT * FROM users WHERE role = 'owner' LIMIT 1`,
      ) as any;
      if (!owner) {
        Alert.alert('Error', 'Akun owner tidak ditemukan');
        return;
      }
      if (owner.pin !== pinReset) {
        Alert.alert('Error', 'PIN owner salah');
        return;
      }
      resetSemuaData();
      setPinReset('');
      setShowResetModal(false);
      Alert.alert('✅ Reset Selesai', 'Semua data telah dihapus.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Gagal reset data');
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Pengaturan</Text>
          <Text style={s.headerSub}>Konfigurasi toko Anda</Text>
        </View>
        {changed && (
          <TouchableOpacity
            style={[s.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Ionicons name="checkmark" size={16} color="#fff" />
            <Text style={s.saveBtnTxt}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile */}
        <View style={s.profileCard}>
          {/* Logo toko - v1.5.0 By Jadicuan Developer 
          <View style={s.profileAvatar}>
            <Ionicons name="storefront" size={28} color="#fff" />
          </View>
          */}
          <TouchableOpacity
            style={s.profileAvatar}
            onPress={pickLogo}
            activeOpacity={0.8}
          >
            {settings.logo_toko ? (
              <Image
                source={{ uri: settings.logo_toko }}
                style={s.profileLogo}
              />
            ) : (
              <Ionicons name="storefront" size={28} color="#fff" />
            )}
          </TouchableOpacity>
          <View style={s.profileInfo}>
            <Text style={s.profileNama}>
              {settings.nama_toko || 'Nama Toko'}
            </Text>
            <Text style={s.profileAlamat}>
              {settings.alamat || 'Belum diatur'}
            </Text>
            <View style={s.licenseBadge}>
              <Ionicons name="shield-checkmark" size={11} color="#16A34A" />
              <Text style={s.licenseTxt}>Lisensi Aktif</Text>
            </View>
          </View>
        </View>

        {/* Section fields */}
        {SECTIONS.map((section) => (
          <View key={section.title} style={s.sectionWrap}>
            <View style={s.sectionHeader}>
              <View style={[s.sectionIcon, { backgroundColor: section.bg }]}>
                <Ionicons name={section.icon} size={16} color={section.color} />
              </View>
              <Text style={s.sectionTitle}>{section.title}</Text>
            </View>
            <View style={s.sectionCard}>
              {section.fields.map((field, i) => (
                <View key={field.key}>
                  <View style={s.fieldRow}>
                    <Text style={s.fieldLabel}>{field.label}</Text>
                    <TextInput
                      style={[
                        s.fieldInput,
                        field.multiline && {
                          minHeight: 60,
                          textAlignVertical: 'top',
                        },
                      ]}
                      value={settings[field.key] || ''}
                      onChangeText={(v) => update(field.key, v)}
                      placeholder={field.placeholder}
                      placeholderTextColor="#D1D5DB"
                      keyboardType={field.keyboard || 'default'}
                      multiline={field.multiline}
                      maxLength={field.maxLength}
                    />
                  </View>
                  {i < section.fields.length - 1 && (
                    <View style={s.fieldDivider} />
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Akun & Pengguna */}
        {isOwner && (
          <View style={s.sectionWrap}>
            <View style={s.sectionHeader}>
              <View
                style={[
                  s.sectionIcon,
                  { backgroundColor: Colors.primaryLight },
                ]}
              >
                <Ionicons
                  name="people-outline"
                  size={16}
                  color={Colors.primary}
                />
              </View>
              <Text style={s.sectionTitle}>Akun & Pengguna</Text>
            </View>
            <View style={s.sectionCard}>
              <TouchableOpacity
                style={s.menuRow}
                onPress={() => navigation.navigate('ManajemenUser')}
              >
                <View
                  style={[
                    s.menuRowIcon,
                    { backgroundColor: Colors.primaryLight },
                  ]}
                >
                  <Ionicons
                    name="people-outline"
                    size={18}
                    color={Colors.primary}
                  />
                </View>
                <View style={s.menuRowInfo}>
                  <Text style={s.menuRowLabel}>Manajemen User</Text>
                  <Text style={s.menuRowSub}>Kelola akun kasir & owner</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
              </TouchableOpacity>
              <View style={s.fieldDivider} />
              <TouchableOpacity
                style={s.menuRow}
                onPress={() => setShowGantiPin(true)}
              >
                <View style={[s.menuRowIcon, { backgroundColor: '#FFF7ED' }]}>
                  <Ionicons name="key-outline" size={18} color="#EA580C" />
                </View>
                <View style={s.menuRowInfo}>
                  <Text style={s.menuRowLabel}>Ganti PIN Saya</Text>
                  <Text style={s.menuRowSub}>Ubah PIN login owner</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Printer */}
        <View style={s.sectionWrap}>
          <View style={s.sectionHeader}>
            <View style={[s.sectionIcon, { backgroundColor: '#FFF7ED' }]}>
              <Ionicons name="print-outline" size={16} color="#EA580C" />
            </View>
            <Text style={s.sectionTitle}>Printer & Struk</Text>
          </View>
          <View style={s.sectionCard}>
            {[
              {
                label: 'Printer Bluetooth',
                sub: 'Hubungkan printer thermal 58mm',
                icon: 'bluetooth-outline',
                color: '#2563EB',
              },
              {
                label: 'Printer WiFi',
                sub: 'Hubungkan via jaringan WiFi',
                icon: 'wifi-outline',
                color: '#16A34A',
              },
              {
                label: 'Ukuran Kertas',
                sub: '58mm / 80mm',
                icon: 'resize-outline',
                color: '#7C3AED',
              },
            ].map((item, i, arr) => (
              <View key={item.label}>
                <TouchableOpacity
                  style={s.menuRow}
                  onPress={() => navigation.navigate('Printer')}
                >
                  <View
                    style={[
                      s.menuRowIcon,
                      { backgroundColor: item.color + '20' },
                    ]}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={18}
                      color={item.color}
                    />
                  </View>
                  <View style={s.menuRowInfo}>
                    <Text style={s.menuRowLabel}>{item.label}</Text>
                    <Text style={s.menuRowSub}>{item.sub}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                </TouchableOpacity>
                {i < arr.length - 1 && <View style={s.fieldDivider} />}
              </View>
            ))}
          </View>
        </View>

        {/* Backup & Data */}
        <View style={s.sectionWrap}>
          <View style={s.sectionHeader}>
            <View style={[s.sectionIcon, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="cloud-outline" size={16} color="#16A34A" />
            </View>
            <Text style={s.sectionTitle}>Backup & Data</Text>
          </View>
          <View style={s.sectionCard}>
            <TouchableOpacity
              style={s.menuRow}
              onPress={handleExport}
              disabled={exporting}
            >
              <View style={[s.menuRowIcon, { backgroundColor: '#F0FDF4' }]}>
                {exporting ? (
                  <ActivityIndicator size="small" color="#16A34A" />
                ) : (
                  <Ionicons name="download-outline" size={18} color="#16A34A" />
                )}
              </View>
              <View style={s.menuRowInfo}>
                <Text style={s.menuRowLabel}>
                  {exporting ? 'Menyiapkan file...' : 'Backup ke Excel (.xlsx)'}
                </Text>
                <Text style={s.menuRowSub}>
                  Produk · Transaksi · Pelanggan · Pengeluaran
                </Text>
              </View>
              {!exporting && (
                <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
              )}
            </TouchableOpacity>

            <View style={s.fieldDivider} />

            <TouchableOpacity
              style={s.menuRow}
              onPress={handleRestore}
              disabled={restoring}
            >
              <View style={[s.menuRowIcon, { backgroundColor: '#EFF6FF' }]}>
                {restoring ? (
                  <ActivityIndicator size="small" color="#2563EB" />
                ) : (
                  <Ionicons
                    name="cloud-upload-outline"
                    size={18}
                    color="#2563EB"
                  />
                )}
              </View>
              <View style={s.menuRowInfo}>
                <Text style={s.menuRowLabel}>
                  {restoring ? 'Mengimpor data...' : 'Restore dari Excel'}
                </Text>
                <Text style={s.menuRowSub}>
                  Import produk & pelanggan dari file backup
                </Text>
              </View>
              {!restoring && (
                <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
              )}
            </TouchableOpacity>

            <View style={s.fieldDivider} />

            <TouchableOpacity
              style={s.menuRow}
              onPress={() =>
                Alert.alert(
                  '⚠️ Reset Data',
                  'Semua transaksi, produk, dan pelanggan akan dihapus permanen.\n\nSebaiknya export Excel dulu sebelum reset.',
                  [
                    { text: 'Batal', style: 'cancel' },
                    {
                      text: 'Lanjut Reset',
                      style: 'destructive',
                      onPress: () => {
                        setPinReset('');
                        setShowResetModal(true);
                      },
                    },
                  ],
                )
              }
            >
              <View style={[s.menuRowIcon, { backgroundColor: '#FEF2F2' }]}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </View>
              <View style={s.menuRowInfo}>
                <Text style={[s.menuRowLabel, { color: '#EF4444' }]}>
                  Reset Data
                </Text>
                <Text style={s.menuRowSub}>Hapus semua data toko</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tentang */}
        <View style={s.sectionWrap}>
          <View style={s.sectionCard}>
            {[
              { label: 'Versi Aplikasi', val: 'Kasir WarungKu v1.0.0' },
              { label: 'Status Lisensi', val: '✅ Aktif' },
            ].map((item, i, arr) => (
              <View key={item.label}>
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>{item.label}</Text>
                  <Text style={s.infoVal}>{item.val}</Text>
                </View>
                {i < arr.length - 1 && <View style={s.fieldDivider} />}
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={s.logoutTxt}>Keluar dari Akun</Text>
        </TouchableOpacity>
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Modal Ganti PIN */}
      <Modal visible={showGantiPin} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <TouchableOpacity
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: 'rgba(0,0,0,0.5)' },
            ]}
            onPress={resetGantiPin}
            activeOpacity={1}
          />
          <View style={pin.sheet}>
            <View style={pin.handle} />
            <View style={pin.header}>
              <View style={pin.headerIcon}>
                <Ionicons name="key-outline" size={20} color="#EA580C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={pin.title}>Ganti PIN Owner</Text>
                <Text style={pin.sub}>Masukkan PIN lama lalu PIN baru</Text>
              </View>
              <TouchableOpacity onPress={resetGantiPin}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            {[
              {
                label: 'PIN LAMA',
                val: pinLama,
                set: setPinLama,
                show: showPinLama,
                setShow: setShowPinLama,
                ph: 'Masukkan PIN lama',
              },
              {
                label: 'PIN BARU (min. 6 digit)',
                val: pinBaru,
                set: setPinBaru,
                show: showPinBaru,
                setShow: setShowPinBaru,
                ph: 'Masukkan PIN baru (6 digit)',
              },
              {
                label: 'KONFIRMASI PIN BARU',
                val: pinKonfirm,
                set: setPinKonfirm,
                show: showPinKonfirm,
                setShow: setShowPinKonfirm,
                ph: 'Ulangi PIN baru',
              },
            ].map((f, i) => (
              <View key={i}>
                <Text style={pin.label}>{f.label}</Text>
                <View
                  style={[
                    pin.inputWrap,
                    i === 2 &&
                      pinBaru &&
                      pinKonfirm &&
                      pinBaru !== pinKonfirm && { borderColor: Colors.danger },
                  ]}
                >
                  <TextInput
                    style={pin.input}
                    value={f.val}
                    onChangeText={f.set}
                    keyboardType="numeric"
                    secureTextEntry={!f.show}
                    maxLength={6}
                    placeholder={f.ph}
                    placeholderTextColor={Colors.textDisabled}
                  />
                  <TouchableOpacity
                    onPress={() => f.setShow((v: boolean) => !v)}
                  >
                    <Ionicons
                      name={f.show ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={Colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
                {i === 2 && pinBaru && pinKonfirm && pinBaru !== pinKonfirm && (
                  <Text
                    style={{
                      fontSize: 11,
                      color: Colors.danger,
                      marginTop: 4,
                    }}
                  >
                    PIN tidak cocok
                  </Text>
                )}
              </View>
            ))}
            <View style={pin.btns}>
              <TouchableOpacity style={pin.btnBatal} onPress={resetGantiPin}>
                <Text style={pin.btnBatalTxt}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  pin.btnSimpan,
                  (!pinLama ||
                    !pinBaru ||
                    !pinKonfirm ||
                    pinBaru !== pinKonfirm) && { opacity: 0.5 },
                ]}
                disabled={
                  !pinLama || !pinBaru || !pinKonfirm || pinBaru !== pinKonfirm
                }
                onPress={handleGantiPin}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color="#fff"
                />
                <Text style={pin.btnSimpanTxt}>Simpan PIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Reset Data */}
      <Modal visible={showResetModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <View
            style={{ backgroundColor: '#fff', borderRadius: 20, padding: 24 }}
          >
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: '#FEF2F2',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <Ionicons name="warning-outline" size={32} color="#EF4444" />
              </View>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '800',
                  color: '#111',
                  textAlign: 'center',
                }}
              >
                Konfirmasi Reset
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: '#6B7280',
                  textAlign: 'center',
                  marginTop: 6,
                  lineHeight: 18,
                }}
              >
                Masukkan PIN owner untuk{'\n'}mengkonfirmasi reset data.
              </Text>
            </View>
            <Text style={pin.label}>PIN OWNER</Text>
            <View style={pin.inputWrap}>
              <TextInput
                style={pin.input}
                value={pinReset}
                onChangeText={setPinReset}
                keyboardType="numeric"
                secureTextEntry={!showPinReset}
                maxLength={8}
                placeholder="Masukkan PIN owner"
                placeholderTextColor={Colors.textDisabled}
                autoFocus
              />
              <TouchableOpacity onPress={() => setShowPinReset((v) => !v)}>
                <Ionicons
                  name={showPinReset ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: '#F3F4F6',
                  alignItems: 'center',
                }}
                onPress={() => {
                  setShowResetModal(false);
                  setPinReset('');
                }}
              >
                <Text style={{ fontWeight: '700', color: '#6B7280' }}>
                  Batal
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  {
                    flex: 2,
                    padding: 14,
                    borderRadius: 12,
                    backgroundColor: '#EF4444',
                    alignItems: 'center',
                  },
                  !pinReset && { opacity: 0.5 },
                ]}
                disabled={!pinReset}
                onPress={handleResetKonfirm}
              >
                <Text style={{ fontWeight: '800', color: '#fff' }}>
                  Reset Sekarang
                </Text>
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
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSub: { color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 2 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#22C55E',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
  },
  saveBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  scroll: { flex: 1, backgroundColor: '#F3F4F6' },
  content: { padding: 16, paddingBottom: 32 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileLogo: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  profileInfo: { flex: 1 },
  profileNama: { fontSize: 16, fontWeight: '800', color: '#111827' },
  profileAlamat: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  licenseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  licenseTxt: { fontSize: 10, fontWeight: '700', color: '#16A34A' },
  sectionWrap: { marginBottom: 16 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#374151' },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  fieldRow: { paddingHorizontal: 16, paddingVertical: 12 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  fieldInput: { fontSize: 14, color: '#111827', fontWeight: '500' },
  fieldDivider: {
    height: 0.5,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  menuRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuRowInfo: { flex: 1 },
  menuRowLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  menuRowSub: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoLabel: { fontSize: 13, color: '#9CA3AF' },
  infoVal: { fontSize: 13, fontWeight: '600', color: '#374151' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: 15,
    borderWidth: 0.5,
    borderColor: '#FECACA',
  },
  logoutTxt: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
});

const pin = StyleSheet.create({
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '800', color: Colors.text },
  sub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 8,
    marginTop: 14,
    letterSpacing: 0.5,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
    letterSpacing: 2,
  },
  btns: { flexDirection: 'row', gap: 10, marginTop: 24 },
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
