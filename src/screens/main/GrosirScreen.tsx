import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants';
import { formatRupiah } from '../../utils/format';
import { getDB } from '../../db/database';
import {
  getGrosirTiers,
  tambahGrosirTier,
  hapusGrosirTier,
  updateGrosirTier,
} from '../../db/produkRepo';
{
  /* Interface untuk produk grosir 
interface ProdukGrosir {
  id: number;
  nama: string;
  harga: number;
  harga_grosir: number;
  min_grosir: number;
  aktif_grosir: number;
  satuan: string;
}
*/
}
// Jadicuan Developer - menambahkan interface untuk produk grosir dengan tiers
interface ProdukGrosir {
  id: number;
  nama: string;
  harga: number;
  harga_grosir: number;
  min_grosir: number;
  aktif_grosir: number;
  satuan: string;
  tiers?: GrosirTier[];
}

interface GrosirTier {
  id: number;
  produk_id: number;
  min_qty: number;
  harga: number;
}

function getAllProdukGrosir(search = ''): ProdukGrosir[] {
  const db = getDB();
  let sql = `SELECT id, nama, harga, harga_grosir, min_grosir, aktif_grosir, satuan
             FROM produk WHERE aktif=1`;
  const args: any[] = [];
  if (search) {
    sql += ' AND nama LIKE ?';
    args.push(`%${search}%`);
  }
  sql += ' ORDER BY nama ASC';
  return db.getAllSync(sql, args) as ProdukGrosir[];
}

function updateGrosir(
  id: number,
  harga_grosir: number,
  min_grosir: number,
  aktif_grosir: number,
) {
  getDB().runSync(
    `UPDATE produk SET harga_grosir=?, min_grosir=?, aktif_grosir=? WHERE id=?`,
    [harga_grosir, min_grosir, aktif_grosir, id],
  );
}

export default function GrosirScreen({ navigation }: any) {
  const [list, setList] = useState<ProdukGrosir[]>([]);
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [editHarga, setEditHarga] = useState('');
  const [editMin, setEditMin] = useState('');
  const [tierProdukId, setTierProdukId] = useState<number | null>(null);
  const [tierMinQty, setTierMinQty] = useState('');
  const [tierHarga, setTierHarga] = useState('');
  const [editTierId, setEditTierId] = useState<number | null>(null);
  const [editTierMinQty, setEditTierMinQty] = useState('');
  const [editTierHarga, setEditTierHarga] = useState('');
  {
    /* Load data saat screen fokus 
  const load = useCallback(() => {
    setList(getAllProdukGrosir(search));
  }, [search]);
*/
  }

  // Load data saat screen fokus, termasuk tiers grosir - Jadicuan Developer
  const load = useCallback(() => {
    const produkList = getAllProdukGrosir(search);

    const listDenganTier = produkList.map((produk) => ({
      ...produk,
      tiers: getGrosirTiers(produk.id),
    }));

    setList(listDenganTier);
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const activeCount = list.filter((p) => p.aktif_grosir === 1).length;

  const handleToggle = (p: ProdukGrosir, val: boolean) => {
    if (val && (!p.harga_grosir || !p.min_grosir)) {
      Alert.alert(
        'Isi dulu',
        'Tentukan harga grosir dan minimum qty sebelum mengaktifkan.',
      );
      setEditId(p.id);
      setEditHarga(p.harga_grosir ? p.harga_grosir.toString() : '');
      setEditMin(p.min_grosir ? p.min_grosir.toString() : '');
      return;
    }
    updateGrosir(p.id, p.harga_grosir, p.min_grosir, val ? 1 : 0);
    load();
  };

  const handleSaveEdit = (p: ProdukGrosir) => {
    const harga = parseInt(editHarga) || 0;
    const min = parseInt(editMin) || 0;
    if (harga <= 0) {
      Alert.alert('Error', 'Harga grosir harus lebih dari 0');
      return;
    }
    if (harga >= p.harga) {
      Alert.alert('Error', 'Harga grosir harus lebih murah dari harga normal');
      return;
    }
    if (min <= 1) {
      Alert.alert('Error', 'Minimum qty minimal 2');
      return;
    }
    updateGrosir(p.id, harga, min, p.aktif_grosir);
    setEditId(null);
    load();
  };

  // Handle Save Tier - Jadicuan Developer
  const handleSaveTier = (p: ProdukGrosir) => {
    const minQty = parseInt(tierMinQty) || 0;
    const harga = parseInt(tierHarga) || 0;

    if (minQty <= 1) {
      Alert.alert('Error', 'Minimum qty minimal 2');
      return;
    }

    if (harga <= 0) {
      Alert.alert('Error', 'Harga grosir harus lebih dari 0');
      return;
    }

    if (harga >= p.harga) {
      Alert.alert('Error', 'Harga grosir harus lebih murah dari harga normal');
      return;
    }

    const sudahAda = (p.tiers ?? []).some((tier) => tier.min_qty === minQty);

    if (sudahAda) {
      Alert.alert('Error', `Tier ${minQty} ${p.satuan} sudah ada.`);
      return;
    }

    tambahGrosirTier(p.id, minQty, harga);

    setTierProdukId(null);
    setTierMinQty('');
    setTierHarga('');

    load();
  };

  const handleSaveEditTier = (p: ProdukGrosir) => {
    const minQty = parseInt(editTierMinQty) || 0;
    const harga = parseInt(editTierHarga) || 0;

    if (editTierId === null) return;

    if (minQty <= 1) {
      Alert.alert('Error', 'Minimum qty minimal 2');
      return;
    }

    if (harga <= 0) {
      Alert.alert('Error', 'Harga grosir harus lebih dari 0');
      return;
    }

    if (harga >= p.harga) {
      Alert.alert('Error', 'Harga grosir harus lebih murah dari harga normal');
      return;
    }

    const sudahAda = (p.tiers ?? []).some(
      (tier) => tier.id !== editTierId && tier.min_qty === minQty,
    );

    if (sudahAda) {
      Alert.alert('Error', `Tier ${minQty} ${p.satuan} sudah ada.`);
      return;
    }

    updateGrosirTier(editTierId, minQty, harga);

    setEditTierId(null);
    setEditTierMinQty('');
    setEditTierHarga('');

    load();
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Harga Grosir</Text>
          <Text style={s.sub}>{activeCount} produk aktif grosir</Text>
        </View>
      </View>

      {/* Info card */}
      <View style={s.infoCard}>
        <Ionicons name="information-circle-outline" size={16} color="#1565C0" />
        <Text style={s.infoTxt}>
          Harga grosir otomatis berlaku di kasir saat qty mencapai batas
          minimum.
        </Text>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
        <TextInput
          style={s.searchInput}
          placeholder="Cari produk..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={list}
        keyExtractor={(p) => p.id.toString()}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: p }) => {
          const isEditing = editId === p.id;
          const hemat = p.harga_grosir > 0 ? p.harga - p.harga_grosir : 0;

          return (
            <View style={[s.card, p.aktif_grosir === 1 && s.cardActive]}>
              {/* Row atas: nama + toggle */}
              <View style={s.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.prodNama} numberOfLines={1}>
                    {p.nama}
                  </Text>
                  <Text style={s.prodHarga}>
                    Normal: {formatRupiah(p.harga)} / {p.satuan}
                  </Text>
                </View>
                <Switch
                  value={p.aktif_grosir === 1}
                  onValueChange={(val) => handleToggle(p, val)}
                  trackColor={{
                    false: Colors.border,
                    true: Colors.primary + '80',
                  }}
                  thumbColor={p.aktif_grosir === 1 ? Colors.primary : '#f4f3f4'}
                />
              </View>

              {/* Grosir bertingkat - Jadicuan Developer */}
              {tierProdukId === p.id && !isEditing && (
                <View style={s.tierForm}>
                  <Text style={s.tierFormTitle}>Tambah Tingkat Grosir</Text>

                  <View style={s.editRow}>
                    <View style={s.editField}>
                      <Text style={s.editLabel}>MIN QTY</Text>

                      <View style={s.editInput}>
                        <TextInput
                          style={[s.editTxt, { flex: 1 }]}
                          value={tierMinQty}
                          onChangeText={setTierMinQty}
                          keyboardType="numeric"
                          placeholder="10"
                          placeholderTextColor={Colors.textDisabled}
                        />
                        <Text style={s.editRp}>{p.satuan}</Text>
                      </View>
                    </View>

                    <View style={s.editField}>
                      <Text style={s.editLabel}>HARGA</Text>

                      <View style={s.editInput}>
                        <Text style={s.editRp}>Rp</Text>

                        <TextInput
                          style={s.editTxt}
                          value={
                            tierHarga
                              ? parseInt(tierHarga).toLocaleString('id-ID')
                              : ''
                          }
                          onChangeText={(v) =>
                            setTierHarga(v.replace(/\D/g, ''))
                          }
                          keyboardType="numeric"
                          placeholder="9.000"
                          placeholderTextColor={Colors.textDisabled}
                        />
                      </View>
                    </View>
                  </View>

                  <View style={s.editBtns}>
                    <TouchableOpacity
                      style={s.btnBatal}
                      onPress={() => setTierProdukId(null)}
                    >
                      <Text style={s.btnBatalTxt}>Batal</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={s.btnSimpan}
                      onPress={() => handleSaveTier(p)}
                    >
                      <Ionicons name="checkmark" size={14} color="#fff" />
                      <Text style={s.btnSimpanTxt}>Simpan</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Grosir bertingkat - Jadicuan Developer */}
              {p.aktif_grosir === 1 && !isEditing && (
                <View style={s.tierSection}>
                  <View style={s.tierHeader}>
                    <View style={s.tierTitleWrap}>
                      <Ionicons
                        name="layers-outline"
                        size={14}
                        color={Colors.primary}
                      />
                      <Text style={s.tierTitle}>Grosir Bertingkat</Text>
                      <Text style={s.tierCount}>
                        {p.tiers?.length || 0} tingkat
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={s.addTierMiniBtn}
                      onPress={() => {
                        setTierProdukId(p.id);
                        setTierMinQty('');
                        setTierHarga('');
                      }}
                    >
                      <Ionicons name="add" size={14} color={Colors.primary} />
                      <Text style={s.addTierMiniTxt}>Tambah</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Status aktif */}
                  {p.aktif_grosir === 1 && p.harga_grosir > 0 && !isEditing && (
                    <View style={s.statusRow}>
                      <View style={s.grosirBadge}>
                        <Ionicons name="pricetag" size={11} color="#1565C0" />
                        <Text style={s.grosirBadgeTxt}>
                          {formatRupiah(p.harga_grosir)} / {p.satuan}
                        </Text>
                      </View>
                      <View style={s.minBadge}>
                        <Ionicons
                          name="layers-outline"
                          size={11}
                          color="#7C3AED"
                        />
                        <Text style={s.minBadgeTxt}>
                          Min. {p.min_grosir} {p.satuan}
                        </Text>
                      </View>
                      {hemat > 0 && (
                        <View style={s.hematBadge}>
                          <Text style={s.hematTxt}>
                            Hemat {formatRupiah(hemat)}
                          </Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={s.editBtn}
                        onPress={() => {
                          setEditId(p.id);
                          setEditHarga(p.harga_grosir.toString());
                          setEditMin(p.min_grosir.toString());
                        }}
                      >
                        <Ionicons
                          name="pencil-outline"
                          size={13}
                          color={Colors.primary}
                        />
                      </TouchableOpacity>
                    </View>
                  )}

                  {p.tiers && p.tiers.length > 0 ? (
                    p.tiers.map((tier) => {
                      const isEditingTier = editTierId === tier.id;
                      const tingkatHemat =
                        tier.harga > 0 ? p.harga - tier.harga : 0;
                      if (isEditingTier) {
                        return (
                          <View key={tier.id} style={s.tierEditRow}>
                            <View style={s.tierEditField}>
                              <Text style={s.tierEditLabel}>MIN QTY</Text>
                              <View style={s.editInput}>
                                <TextInput
                                  style={[s.editTxt, { flex: 1 }]}
                                  value={editTierMinQty}
                                  onChangeText={setEditTierMinQty}
                                  keyboardType="numeric"
                                />
                                <Text style={s.editRp}>{p.satuan}</Text>
                              </View>
                            </View>

                            <View style={s.tierEditField}>
                              <Text style={s.tierEditLabel}>HARGA</Text>
                              <View style={s.editInput}>
                                <Text style={s.editRp}>Rp</Text>
                                <TextInput
                                  style={s.editTxt}
                                  value={
                                    editTierHarga
                                      ? parseInt(editTierHarga).toLocaleString(
                                          'id-ID',
                                        )
                                      : ''
                                  }
                                  onChangeText={(v) =>
                                    setEditTierHarga(v.replace(/\D/g, ''))
                                  }
                                  keyboardType="numeric"
                                />
                              </View>
                            </View>

                            <View style={s.tierEditActions}>
                              <TouchableOpacity
                                style={s.tierCancelBtn}
                                onPress={() => {
                                  setEditTierId(null);
                                  setEditTierMinQty('');
                                  setEditTierHarga('');
                                }}
                              >
                                <Ionicons
                                  name="close"
                                  size={16}
                                  color={Colors.textMuted}
                                />
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={s.tierSaveBtn}
                                onPress={() => handleSaveEditTier(p)}
                              >
                                <Ionicons
                                  name="checkmark"
                                  size={16}
                                  color="#fff"
                                />
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      }

                      return (
                        <View key={tier.id} style={s.tierRow}>
                          <Text style={s.tierHarga}>
                            <Ionicons
                              name="pricetag"
                              size={11}
                              color="#1565C0"
                            />
                            <Text> </Text>
                            {formatRupiah(tier.harga)} / {p.satuan}
                          </Text>
                          <Text style={s.tierMin}>
                            <Ionicons
                              name="layers-outline"
                              size={11}
                              color="#7C3AED"
                            />
                            <Text> </Text>
                            Min. {tier.min_qty} {p.satuan}
                          </Text>
                          {tingkatHemat > 0 && (
                            <View style={s.hematBadge}>
                              <Text style={s.hematTxt}>
                                Hemat {formatRupiah(tingkatHemat)}
                              </Text>
                            </View>
                          )}
                          <View style={s.tierActions}>
                            <TouchableOpacity
                              style={s.tierEditBtn}
                              onPress={() => {
                                setEditTierId(tier.id);
                                setEditTierMinQty(tier.min_qty.toString());
                                setEditTierHarga(tier.harga.toString());
                              }}
                            >
                              <Ionicons
                                name="pencil-outline"
                                size={13}
                                color={Colors.primary}
                              />
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={s.tierDeleteBtn}
                              onPress={() => {
                                Alert.alert(
                                  'Hapus Tingkat Grosir',
                                  `Hapus harga grosir ${tier.min_qty}+ ${p.satuan}?`,
                                  [
                                    {
                                      text: 'Batal',
                                      style: 'cancel',
                                    },
                                    {
                                      text: 'Hapus',
                                      style: 'destructive',
                                      onPress: () => {
                                        hapusGrosirTier(tier.id);
                                        load();
                                      },
                                    },
                                  ],
                                );
                              }}
                            >
                              <Ionicons
                                name="trash-outline"
                                size={13}
                                color="#DC2626"
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={s.noTierTxt}>Tidak ada tingkat grosir</Text>
                  )}
                </View>
              )}
              {/* Form edit */}
              {isEditing && (
                <View style={s.editForm}>
                  <View style={s.editRow}>
                    <View style={s.editField}>
                      <Text style={s.editLabel}>HARGA GROSIR</Text>
                      <View style={s.editInput}>
                        <Text style={s.editRp}>Rp</Text>
                        <TextInput
                          style={s.editTxt}
                          value={
                            editHarga
                              ? parseInt(editHarga).toLocaleString('id-ID')
                              : ''
                          }
                          onChangeText={(v) =>
                            setEditHarga(v.replace(/\D/g, ''))
                          }
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor={Colors.textDisabled}
                          autoFocus
                        />
                      </View>
                    </View>
                    <View style={s.editField}>
                      <Text style={s.editLabel}>MIN QTY</Text>
                      <View style={s.editInput}>
                        <TextInput
                          style={[s.editTxt, { flex: 1 }]}
                          value={editMin}
                          onChangeText={setEditMin}
                          keyboardType="numeric"
                          placeholder="5"
                          placeholderTextColor={Colors.textDisabled}
                        />
                        <Text style={s.editRp}>{p.satuan}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Preview hemat */}
                  {editHarga && editMin && parseInt(editHarga) > 0 && (
                    <View style={s.previewBox}>
                      <Text style={s.previewTxt}>
                        Beli {editMin}+ {p.satuan} →{' '}
                        {formatRupiah(parseInt(editHarga))} / {p.satuan}
                        {parseInt(editHarga) < p.harga
                          ? `  (hemat ${formatRupiah(p.harga - parseInt(editHarga))} / ${p.satuan})`
                          : '  ⚠ harus lebih murah dari harga normal'}
                      </Text>
                    </View>
                  )}

                  <View style={s.editBtns}>
                    <TouchableOpacity
                      style={s.btnBatal}
                      onPress={() => setEditId(null)}
                    >
                      <Text style={s.btnBatalTxt}>Batal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.btnSimpan}
                      onPress={() => handleSaveEdit(p)}
                    >
                      <Ionicons name="checkmark" size={14} color="#fff" />
                      <Text style={s.btnSimpanTxt}>Simpan</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Tap to set jika belum diisi */}
              {!isEditing && p.aktif_grosir === 0 && (
                <TouchableOpacity
                  style={s.tapSet}
                  onPress={() => {
                    setEditId(p.id);
                    setEditHarga(
                      p.harga_grosir > 0 ? p.harga_grosir.toString() : '',
                    );
                    setEditMin(p.min_grosir > 0 ? p.min_grosir.toString() : '');
                  }}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={14}
                    color={Colors.textMuted}
                  />
                  <Text style={s.tapSetTxt}>
                    {p.harga_grosir > 0
                      ? `${formatRupiah(p.harga_grosir)} / min ${p.min_grosir} — nonaktif`
                      : 'Tap untuk atur harga grosir'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <Ionicons name="cube-outline" size={40} color="#D1D5DB" />
            <Text style={s.emptyTxt}>Belum ada produk</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: '#fff', fontSize: 18, fontWeight: '800' },
  sub: { color: 'rgba(255,255,255,.55)', fontSize: 12 },
  infoCard: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: '#E3F2FD',
    marginHorizontal: 14,
    marginBottom: 8,
    borderRadius: 10,
    padding: 12,
  },
  infoTxt: { flex: 1, fontSize: 12, color: '#1565C0', lineHeight: 17 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },
  listContent: {
    padding: 14,
    gap: 10,
    backgroundColor: Colors.background,
    flexGrow: 1,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  cardActive: {
    borderColor: Colors.primary,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  prodNama: { fontSize: 14, fontWeight: '700', color: Colors.text },
  prodHarga: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexWrap: 'wrap',
    marginTop: 2,
    marginBottom: 4,
  },
  grosirBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  grosirBadgeTxt: { fontSize: 11, fontWeight: '700', color: '#1565C0' },
  minBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5F3FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  minBadgeTxt: { fontSize: 11, fontWeight: '700', color: '#7C3AED' },
  hematBadge: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  hematTxt: { fontSize: 11, fontWeight: '700', color: '#16A34A' },
  editBtn: { marginLeft: 'auto' as any, padding: 4 },
  tapSet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  tapSetTxt: { fontSize: 12, color: Colors.textMuted },
  editForm: { marginTop: 8, gap: 10 },
  editRow: { flexDirection: 'row', gap: 10 },
  editField: { flex: 1 },
  editLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 5,
    letterSpacing: 0.3,
  },
  editInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  editRp: { fontSize: 13, color: Colors.textMuted, fontWeight: '600' },
  editTxt: { flex: 1, fontSize: 14, color: Colors.text, paddingHorizontal: 4 },
  previewBox: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    padding: 10,
  },
  previewTxt: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  editBtns: { flexDirection: 'row', gap: 8 },
  btnBatal: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  btnBatalTxt: { fontWeight: '700', color: Colors.textMuted, fontSize: 13 },
  btnSimpan: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  btnSimpanTxt: { fontWeight: '800', color: '#fff', fontSize: 13 },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTxt: { fontSize: 14, color: Colors.textMuted },
  tierSection: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tierTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tierTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
  },
  tierCount: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
  },
  tierMin: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
    backgroundColor: '#F5F3FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    textAlign: 'center',
    gap: 4,
  },

  tierArrow: {
    flex: 1,
    textAlign: 'center',
    color: Colors.textMuted,
  },
  tierHarga: {
    minWidth: 90,
    fontSize: 11,
    fontWeight: '700',
    color: '#1565C0',
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 5,
    textAlign: 'center',
  },
  tierActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 6,
  },
  addTierBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingVertical: 5,
  },
  addTierTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  tierForm: {
    marginTop: 8,
    padding: 10,
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    gap: 10,
  },
  tierFormTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.text,
  },
  addTierMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor: Colors.primaryLight,
  },
  addTierMiniTxt: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },
  tierDeleteBtn: {
    width: 15,
    height: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  tierEditBtn: {
    width: 15,
    height: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  tierEditRow: {
    paddingVertical: 8,
    gap: 8,
  },

  tierEditField: {
    flex: 1,
  },

  tierEditLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 4,
  },

  tierEditActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
  },

  tierCancelBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  tierSaveBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noTierTxt: {
    fontSize: 11,
    color: Colors.textMuted,
    paddingVertical: 8,
    textAlign: 'center',
  },
});
