import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Image,
  FlatList,
  ScrollView,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { formatRupiah } from '../../utils/format';
import { useCart } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { simpanTransaksi } from '../../db/transaksiRepo';
import {
  getAllProduk,
  getAllKategori,
  Produk,
  Kategori,
  // ── BARU: import fungsi grosir ──
  hitungHargaGrosir,
  isGrosirAktif,
} from '../../db/produkRepo';
import { useFocusEffect } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Colors } from '../../constants';
import { getKategoriEmoji } from '../../utils/kategoriImage';
import { resolveGambarUri } from '../../utils/gambarHelper';
import {
  getAllPelanggan,
  tambahPelanggan,
  updateTotalBeli,
  Pelanggan,
} from '../../db/pelangganRepo';
import { getDB } from '../../db/database';

const NAVY = Colors.primary;

const BP = { phone: 480, phablet: 640, tablet: 768, tabletL: 1024 };

function useLayout() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= BP.tablet;
  const isTabletL = width >= BP.tabletL;
  const isPhablet = width >= BP.phablet;
  const cartWidth = isTabletL ? 320 : isTablet ? 260 : isPhablet ? 200 : 160;
  const isSplit = isPhablet || isLandscape;
  return {
    width,
    height,
    isLandscape,
    isTablet,
    isTabletL,
    isPhablet,
    isSplit,
    cartWidth,
    prodCols: 2,
  };
}

// ── Camera Modal ──────────────────────────────────────────────────────────────
function CameraModal({
  visible,
  onClose,
  onDetected,
}: {
  visible: boolean;
  onClose: () => void;
  onDetected: (b: string) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  React.useEffect(() => {
    if (visible) setScanned(false);
  }, [visible]);
  if (!visible) return null;
  if (!permission?.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <SafeAreaView style={cm.wrap}>
          <View style={cm.icon}>
            <Ionicons
              name="camera-outline"
              size={48}
              color="rgba(255,255,255,0.6)"
            />
          </View>
          <Text style={cm.title}>Izin Kamera Diperlukan</Text>
          <Text style={cm.sub}>Untuk scan barcode produk</Text>
          <TouchableOpacity style={cm.btn} onPress={requestPermission}>
            <Text style={cm.btnTxt}>Izinkan Kamera</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{ padding: 12 }}>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
              Batal
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    );
  }
  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          onBarcodeScanned={
            scanned
              ? undefined
              : ({ data }) => {
                  setScanned(true);
                  onDetected(data);
                  setTimeout(() => onClose(), 800);
                }
          }
          barcodeScannerSettings={{
            barcodeTypes: [
              'ean13',
              'ean8',
              'qr',
              'code128',
              'code39',
              'upc_a',
              'upc_e',
              'itf14',
            ],
          }}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} />
          <View style={{ flexDirection: 'row', height: 260 }}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} />
            <View
              style={{
                width: 260,
                height: 260,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {[
                {
                  top: 0,
                  left: 0,
                  borderTopWidth: 3,
                  borderLeftWidth: 3,
                  borderTopLeftRadius: 6,
                },
                {
                  top: 0,
                  right: 0,
                  borderTopWidth: 3,
                  borderRightWidth: 3,
                  borderTopRightRadius: 6,
                },
                {
                  bottom: 0,
                  left: 0,
                  borderBottomWidth: 3,
                  borderLeftWidth: 3,
                  borderBottomLeftRadius: 6,
                },
                {
                  bottom: 0,
                  right: 0,
                  borderBottomWidth: 3,
                  borderRightWidth: 3,
                  borderBottomRightRadius: 6,
                },
              ].map((c, i) => (
                <View
                  key={i}
                  style={[
                    {
                      position: 'absolute',
                      width: 32,
                      height: 32,
                      borderColor: '#fff',
                    },
                    c,
                  ]}
                />
              ))}
              {!scanned && (
                <View
                  style={{
                    position: 'absolute',
                    width: '85%',
                    height: 2,
                    backgroundColor: 'rgba(59,130,246,0.8)',
                    borderRadius: 1,
                  }}
                />
              )}
              {scanned && (
                <View
                  style={{
                    backgroundColor: 'rgba(34,197,94,0.92)',
                    borderRadius: 14,
                    padding: 16,
                    gap: 6,
                    alignItems: 'center',
                  }}
                >
                  <Ionicons name="checkmark-circle" size={40} color="#fff" />
                  <Text
                    style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}
                  >
                    Terdeteksi!
                  </Text>
                </View>
              )}
            </View>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} />
          </View>
          <View
            style={{
              flex: 1.5,
              backgroundColor: 'rgba(0,0,0,0.6)',
              alignItems: 'center',
              paddingTop: 28,
              gap: 10,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
              {scanned ? 'Memproses...' : 'Arahkan ke barcode produk'}
            </Text>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: 'rgba(255,255,255,0.15)',
                paddingHorizontal: 24,
                paddingVertical: 13,
                borderRadius: 24,
              }}
              onPress={onClose}
            >
              <Ionicons name="close" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                Tutup Kamera
              </Text>
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    </Modal>
  );
}

const cm = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 32,
  },
  icon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: '#fff', fontSize: 18, fontWeight: '800' },
  sub: { color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center' },
  btn: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 13,
    marginTop: 4,
  },
  btnTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

// ── Cart Panel Props ──────────────────────────────────────────────────────────
interface CartPanelProps {
  isSplit: boolean;
  cartWidth: number;
  items: any[];
  diskon: number;
  metode: string;
  fmtDiskon: string;
  sub: number;
  tot: number;
  pajak: number;
  pajakPersen: number;
  totalItem: () => number;
  updateQty: (id: number, qty: number) => void;
  updateItemHarga: (id: number, harga: number, isGrosir?: boolean) => void;
  setDiskon: (d: number) => void;
  setDiskonText: (t: string) => void;
  setMetode: (m: string) => void;
  setShowCart: (v: boolean) => void;
  setShowBayar: (v: boolean) => void;
  handleDiskonChange: (text: string) => void;
  bottomInset: number;
  onPilihDiskon: () => void;
  selectedDiskon: any | null;
  onHapusDiskon: () => void;
  onHold: () => void;
}

function CartItemQty({
  item,
  updateQty,
}: {
  item: any;
  updateQty: (id: number, qty: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const handleTapQty = () => {
    setInputVal(item.qty.toString());
    setEditing(true);
  };
  const handleConfirm = () => {
    const n = parseInt(inputVal) || 0;
    if (n > 0) updateQty(item.produk.id, n);
    else updateQty(item.produk.id, 0);
    setEditing(false);
  };
  return (
    <View style={cart.itemControls}>
      <TouchableOpacity
        style={cart.minus}
        onPress={() => updateQty(item.produk.id, item.qty - 1)}
      >
        <Ionicons name="remove" size={12} color={Colors.danger} />
      </TouchableOpacity>
      <TouchableOpacity onPress={handleTapQty} style={cart.qtyTouchable}>
        {editing ? (
          <TextInput
            style={cart.qtyInput}
            value={inputVal}
            onChangeText={setInputVal}
            keyboardType="numeric"
            autoFocus
            selectTextOnFocus
            onBlur={handleConfirm}
            onSubmitEditing={handleConfirm}
            maxLength={4}
          />
        ) : (
          <Text
            style={[
              cart.qty,
              {
                textDecorationLine: 'underline',
                textDecorationStyle: 'dotted',
              },
            ]}
          >
            {item.qty}
          </Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={cart.plus}
        onPress={() => updateQty(item.produk.id, item.qty + 1)}
      >
        <Ionicons name="add" size={12} color={NAVY} />
      </TouchableOpacity>
      <Text style={cart.subtotal}>{formatRupiah(item.subtotal)}</Text>
    </View>
  );
}

function CartPanel({
  isSplit,
  cartWidth,
  items,
  diskon,
  metode,
  fmtDiskon,
  sub,
  tot,
  pajak,
  pajakPersen,
  totalItem,
  updateQty,
  setDiskon,
  setDiskonText,
  setMetode,
  setShowCart,
  setShowBayar,
  handleDiskonChange,
  bottomInset,
  onPilihDiskon,
  selectedDiskon,
  onHapusDiskon,
  onHold,
}: CartPanelProps) {
  const safeInsets = useSafeAreaInsets();
  const extraBottom = isSplit ? safeInsets.bottom : 0;
  return (
    //<View style={[cart.panel, isSplit ? { width: cartWidth } : { flex: 1 }]}>
    <KeyboardAvoidingView
      style={[cart.panel, isSplit ? { width: cartWidth } : { flex: 1 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* ── BARU: badge GROSIR di cart jika harga yang dipakai adalah harga grosir ── */}
      <View style={cart.header}>
        <Ionicons name="receipt-outline" size={14} color={NAVY} />
        <Text style={cart.title}>Keranjang</Text>
        {items.length > 0 && (
          <View style={cart.badge}>
            <Text style={cart.badgeTxt}>{totalItem()}</Text>
          </View>
        )}
        {!isSplit && (
          <TouchableOpacity
            style={{ marginLeft: 'auto' }}
            onPress={() => setShowCart(false)}
          >
            <Ionicons name="close" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {items.length === 0 ? (
        <View style={[cart.empty, { flex: 1 }]}>
          <Ionicons name="cart-outline" size={32} color="#D1D5DB" />
          <Text style={cart.emptyTxt}>
            Pilih produk untuk{'\n'}mulai transaksi
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.produk.id.toString()}
          style={{ flex: 1 }}
          contentContainerStyle={[
            cart.listContent,
            { paddingBottom: extraBottom + 8 },
          ]}
          showsVerticalScrollIndicator={true}
          renderItem={({ item }) => (
            <View style={cart.item}>
              <View style={cart.itemImg}>
                {item.produk.gambar ? (
                  <Image
                    source={{ uri: resolveGambarUri(item.produk.gambar)! }}
                    style={{ width: '100%', height: '100%' }}
                  />
                ) : (
                  <Text style={{ fontSize: 16 }}>
                    {getKategoriEmoji(item.produk.kategori_nama)}
                  </Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    marginBottom: 2,
                  }}
                >
                  <Text style={cart.itemNama} numberOfLines={1}>
                    {item.produk.nama}
                  </Text>
                  {/* ── BARU: badge GROSIR di cart jika harga yang dipakai adalah harga grosir ── */}
                  {item.isGrosir && (
                    <View style={cart.grosirBadge}>
                      <Text style={cart.grosirBadgeTxt}>GROSIR</Text>
                    </View>
                  )}
                </View>
                <Text style={cart.itemHarga}>
                  {formatRupiah(item.produk.harga)}
                </Text>
                <CartItemQty item={item} updateQty={updateQty} />
              </View>
            </View>
          )}
        />
      )}
      <View style={[cart.footer, { paddingBottom: extraBottom + 10 }]}>
        <View style={cart.diskonRow}>
          <Text style={cart.diskonLbl}>Diskon</Text>
          <TouchableOpacity style={cart.diskonPilihBtn} onPress={onPilihDiskon}>
            <Ionicons
              name={selectedDiskon ? 'pricetag' : 'pricetag-outline'}
              size={12}
              color={selectedDiskon ? Colors.danger : Colors.textMuted}
            />
            <Text
              style={[
                cart.diskonPilihTxt,
                selectedDiskon && { color: Colors.danger },
              ]}
            >
              {selectedDiskon ? selectedDiskon.nama : 'Pilih diskon'}
            </Text>
          </TouchableOpacity>
          <TextInput
            style={cart.diskonInput}
            keyboardType="number-pad"
            placeholder="0"
            value={fmtDiskon}
            onChangeText={handleDiskonChange}
            placeholderTextColor="#D1D5DB"
            blurOnSubmit={true}
            returnKeyType="done"
          />
          {diskon > 0 && (
            <TouchableOpacity onPress={onHapusDiskon}>
              <Ionicons name="close-circle" size={13} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
        <View style={cart.divider} />
        <View style={cart.sumRow}>
          <Text style={cart.sumLbl}>Subtotal</Text>
          <Text style={cart.sumVal}>{formatRupiah(sub)}</Text>
        </View>
        {diskon > 0 && (
          <View style={cart.sumRow}>
            <Text style={cart.sumLbl}>Diskon</Text>
            <Text style={[cart.sumVal, { color: Colors.danger }]}>
              -{formatRupiah(diskon)}
            </Text>
          </View>
        )}
        {pajak > 0 && (
          <View style={cart.sumRow}>
            <Text style={cart.sumLbl}>Pajak ({pajakPersen}%)</Text>
            <Text style={cart.sumVal}>{formatRupiah(pajak)}</Text>
          </View>
        )}
        <View style={cart.totalRow}>
          <Text style={cart.totalLbl}>TOTAL</Text>
          <Text style={cart.totalVal}>{formatRupiah(tot)}</Text>
        </View>
        <View style={cart.metodeRow}>
          {[
            { key: 'tunai', label: 'Tunai' },
            { key: 'transfer', label: 'TF' },
            { key: 'qris', label: 'QRIS' },
            { key: 'hutang', label: 'Hutang' },
          ].map((m) => (
            <TouchableOpacity
              key={m.key}
              style={[cart.mc, metode === m.key && cart.mcActive]}
              onPress={() => setMetode(m.key)}
            >
              <Text style={[cart.mcTxt, metode === m.key && cart.mcTxtActive]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={cart.footerBtnRow}>
          {isSplit && (
            <TouchableOpacity
              style={[cart.holdBtn, items.length === 0 && { opacity: 0.45 }]}
              onPress={onHold}
              disabled={items.length === 0}
            >
              <Ionicons name="bookmark-outline" size={16} color={NAVY} />
              <Text style={cart.holdTxt}>Hold</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              cart.bayarBtn,
              { flex: 1 },
              items.length === 0 && { opacity: 0.45 },
            ]}
            onPress={() => {
              if (items.length === 0) {
                Alert.alert('Keranjang kosong', 'Pilih produk dulu');
                return;
              }
              setShowBayar(true);
            }}
          >
            <Ionicons name="card-outline" size={18} color="#fff" />
            <View>
              <Text style={cart.bayarTxt}>BAYAR</Text>
              <Text style={cart.bayarSub}>{formatRupiah(tot)}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── TambahPelangganModal — state lokal supaya tidak trigger re-render KasirScreen ──
// Root cause "getar": formPelanggan di parent → setiap ketik huruf re-render
// seluruh KasirScreen → modal re-mount → keyboard naik-turun
function TambahPelangganModal({
  visible,
  onClose,
  onSimpan,
}: {
  visible: boolean;
  onClose: () => void;
  onSimpan: (nama: string, no_hp: string, alamat: string) => void;
}) {
  const [nama, setNama] = useState('');
  const [no_hp, setNoHp] = useState('');
  const [alamat, setAlamat] = useState('');

  // Reset form tiap kali modal dibuka
  React.useEffect(() => {
    if (visible) {
      setNama('');
      setNoHp('');
      setAlamat('');
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <View
            style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20 }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: '800',
                color: Colors.text,
                marginBottom: 16,
              }}
            >
              Pelanggan Baru
            </Text>
            {[
              {
                key: 'nama',
                label: 'Nama *',
                kb: 'default',
                ph: 'Nama pelanggan',
                val: nama,
                set: setNama,
                max: undefined,
              },
              {
                key: 'no_hp',
                label: 'No. HP',
                kb: 'phone-pad',
                ph: '08xxxxxxxxxx',
                val: no_hp,
                set: setNoHp,
                max: 16,
              },
              {
                key: 'alamat',
                label: 'Alamat',
                kb: 'default',
                ph: 'Alamat (opsional)',
                val: alamat,
                set: setAlamat,
                max: undefined,
              },
            ].map((f) => (
              <View key={f.key} style={{ marginBottom: 12 }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: Colors.textMuted,
                    marginBottom: 5,
                  }}
                >
                  {f.label}
                </Text>
                <TextInput
                  style={{
                    backgroundColor: Colors.background,
                    borderRadius: 10,
                    padding: 12,
                    fontSize: 14,
                    color: Colors.text,
                    borderWidth: 1,
                    borderColor: Colors.border,
                  }}
                  placeholder={f.ph}
                  placeholderTextColor={Colors.textDisabled}
                  value={f.val}
                  onChangeText={f.set}
                  keyboardType={f.kb as any}
                  maxLength={f.max}
                />
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 13,
                  borderRadius: 12,
                  backgroundColor: Colors.background,
                  alignItems: 'center',
                }}
                onPress={onClose}
              >
                <Text style={{ fontWeight: '700', color: Colors.textMuted }}>
                  Batal
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  {
                    flex: 2,
                    padding: 13,
                    borderRadius: 12,
                    backgroundColor: Colors.primary,
                    alignItems: 'center',
                  },
                  !nama.trim() && { opacity: 0.5 },
                ]}
                disabled={!nama.trim()}
                onPress={() =>
                  onSimpan(nama.trim(), no_hp.trim(), alamat.trim())
                }
              >
                <Text style={{ color: '#fff', fontWeight: '800' }}>
                  Simpan & Pilih
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── KasirScreen ───────────────────────────────────────────────────────────────
export default function KasirScreen({ navigation }: any) {
  const layout = useLayout();
  const insets = useSafeAreaInsets();
  const { width, isSplit, cartWidth } = layout;

  const {
    items,
    diskon,
    metode,
    addItem,
    updateQty,
    updateItemHarga,
    setDiskon,
    setMetode,
    clear,
    subtotal,
    total,
    totalItem,
    heldOrders,
    holdOrder,
    recallOrder,
    deleteHeldOrder,
  } = useCart();

  const [produkList, setProdukList] = useState<Produk[]>([]);
  const [kats, setKats] = useState<Kategori[]>([]);
  const [activeKat, setActiveKat] = useState(0);
  const [searchTxt, setSearchTxt] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [showBayar, setShowBayar] = useState(false);
  const { currentUser } = useAuthStore();
  const [showCart, setShowCart] = useState(false);
  const [scanFocus, setScanFocus] = useState(false);
  const [diskonText, setDiskonText] = useState('');
  const [bayarText, setBayarText] = useState('');
  const [showHeld, setShowHeld] = useState(false);
  const [holdNama, setHoldNama] = useState('');
  const [showHoldInput, setShowHoldInput] = useState(false);
  const scanRef = useRef<TextInput>(null);

  const [pelangganList, setPelangganList] = useState<Pelanggan[]>([]);
  const [selectedPelanggan, setSelectedPelanggan] = useState<Pelanggan | null>(
    null,
  );
  const [showPilihPelanggan, setShowPilihPelanggan] = useState(false);
  const [searchPelanggan, setSearchPelanggan] = useState('');
  const [showTambahPelanggan, setShowTambahPelanggan] = useState(false);

  const [diskonList, setDiskonList] = useState<any[]>([]);
  const [showPilihDiskon, setShowPilihDiskon] = useState(false);
  const [selectedDiskon, setSelectedDiskon] = useState<any>(null);

  const [pajakPersen, setPajakPersen] = useState(0);
  const sub = subtotal();
  // Pajak dihitung dari (subtotal - diskon), lalu ditambahkan ke total
  const pajak = Math.round((total() * pajakPersen) / 100);
  const tot = total() + pajak;
  const bayarNum = parseInt(bayarText) || 0;
  const kembalian = Math.max(0, bayarNum - tot);

  function getDiskonAktif(): any[] {
    try {
      return getDB().getAllSync(
        'SELECT * FROM diskon WHERE aktif = 1 ORDER BY nilai DESC',
      ) as any[];
    } catch {
      return [];
    }
  }

  const loadProduk = useCallback(() => {
    setProdukList(getAllProduk(searchTxt, activeKat));
    setKats(getAllKategori());
    setDiskonList(getDiskonAktif());
    try {
      const row = getDB().getFirstSync<any>(
        "SELECT value FROM pengaturan WHERE key='pajak_persen'",
      );
      const p = parseFloat(String(row?.value ?? '0').replace(',', '.'));
      setPajakPersen(isFinite(p) && p > 0 ? p : 0);
    } catch {
      setPajakPersen(0);
    }
  }, [searchTxt, activeKat]);

  useFocusEffect(
    useCallback(() => {
      loadProduk();
    }, [loadProduk]),
  );

  // ── FIX: addItemWithGrosir — cek harga grosir sebelum masuk cart ─────────────
  // Root cause sebelumnya: addItem hanya menambah qty, tidak update harga item
  // yang sudah ada di cart. Akibatnya subtotal dihitung pakai harga lama.
  //
  // Fix: setelah addItem, gunakan updateItemHarga untuk paksa recalculate
  // semua item yang harga grosirnya berubah (masuk atau keluar threshold).
  const addItemWithGrosir = useCallback(
    (produk: Produk) => {
      const qtySekarang =
        items.find((i) => i.produk.id === produk.id)?.qty || 0;
      const qtyBaru = qtySekarang + 1;
      const hargaGrosir = hitungHargaGrosir(produk, qtyBaru);
      const pakaiGrosir = hargaGrosir !== produk.harga;

      // Step 1: addItem dengan harga yang sudah dioverride
      // cartStore.addItem sekarang juga update i.produk sehingga harga tersimpan
      addItem({ ...produk, harga: hargaGrosir, isGrosir: pakaiGrosir } as any);

      // Step 2: kalau harga berubah (masuk/keluar threshold grosir),
      // paksa update harga item di cart agar subtotal recalculate dengan benar
      if (pakaiGrosir) {
        // Masuk threshold grosir → update ke harga grosir
        updateItemHarga(produk.id, hargaGrosir, true);
      } else if (qtySekarang > 0) {
        // Sudah ada di cart tapi belum threshold → pastikan pakai harga normal
        updateItemHarga(produk.id, produk.harga, false);
      }
    },
    [items, addItem, updateItemHarga],
  );

  const prosesBarcode = useCallback(
    (barcode: string) => {
      const found = getAllProduk('', 0).find((p) => p.barcode === barcode);
      if (found) {
        if (found.stok === 0)
          Alert.alert('Stok Habis', `${found.nama} sudah habis`);
        else addItemWithGrosir(found);
      } else {
        Alert.alert(
          'Tidak Ditemukan',
          `Barcode "${barcode}" tidak ada di database.`,
        );
      }
    },
    [addItemWithGrosir],
  );

  const terapkanDiskon = (d: any) => {
    const nominal =
      d.tipe === 'persen' ? Math.round((sub * d.nilai) / 100) : d.nilai;
    setDiskon(nominal);
    setDiskonText(nominal.toString());
    setSelectedDiskon(d);
    setShowPilihDiskon(false);
  };

  const hapusDiskon = () => {
    setDiskon(0);
    setDiskonText('');
    setSelectedDiskon(null);
  };

  const handleScanSubmit = useCallback(() => {
    const b = searchTxt.trim();
    if (!b) return;
    setSearchTxt('');
    prosesBarcode(b);
    setTimeout(() => scanRef.current?.focus(), 150);
  }, [searchTxt, prosesBarcode]);

  const handleDiskonChange = useCallback(
    (text: string) => {
      const clean = text.replace(/\D/g, '');
      setDiskonText(clean);
      setDiskon(parseInt(clean) || 0);
    },
    [setDiskon],
  );

  const handleBayarChange = useCallback((text: string) => {
    setBayarText(text.replace(/\D/g, ''));
  }, []);

  const fmtDiskon = useMemo(() => {
    const n = parseInt(diskonText);
    return !diskonText || isNaN(n) ? '' : n.toLocaleString('id-ID');
  }, [diskonText]);
  const fmtBayar = useMemo(() => {
    const n = parseInt(bayarText);
    return !bayarText || isNaN(n) ? '' : n.toLocaleString('id-ID');
  }, [bayarText]);

  const quickAmts = useMemo(
    () =>
      [
        tot,
        Math.ceil(tot / 5000) * 5000,
        Math.ceil(tot / 10000) * 10000,
        50000,
        100000,
        200000,
      ]
        .filter((v, i, a) => a.indexOf(v) === i && v >= tot)
        .slice(0, 5),
    [tot],
  );

  const getQty = (id: number) =>
    items.find((i) => i.produk.id === id)?.qty || 0;

  const handleBayar = () => {
    if (metode === 'tunai' && bayarNum < tot) {
      Alert.alert('Kurang', `Masih kurang ${formatRupiah(tot - bayarNum)}`);
      return;
    }
    try {
      const no = simpanTransaksi(
        items.map((i) => ({
          produk_id: i.produk.id,
          nama_produk: i.produk.nama,
          harga: i.produk.harga,
          harga_modal: i.produk.harga_modal ?? 0,
          qty: i.qty,
          subtotal: i.subtotal,
        })),
        sub,
        diskon,
        tot,
        bayarNum,
        metode,
        selectedPelanggan?.id ?? null,
        currentUser?.nama ?? 'Admin',
        pajak,
        pajakPersen,
      );
      if (selectedPelanggan) updateTotalBeli(selectedPelanggan.id, tot);
      navigation.navigate('Struk', {
        noTrx: no,
        items: items.map((i) => ({
          nama_produk: i.produk.nama,
          harga: i.produk.harga,
          qty: i.qty,
          subtotal: i.subtotal,
        })),
        subtotal: sub,
        diskon,
        pajak,
        pajakPersen,
        total: tot,
        bayar: bayarNum,
        kembalian,
        metode,
        waktu: new Date().toISOString(),
      });
      setShowBayar(false);
      setShowCart(false);
      clear();
      setSelectedPelanggan(null);
      setSearchPelanggan('');
      setBayarText('');
      setDiskonText('');
      setSelectedDiskon(null);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Gagal simpan');
    }
  };

  // ── FIX: updateQty wrapper yang juga recalculate harga grosir ────────────────
  // Saat qty dikurangi manual (misal dari 6 → 4), cek apakah masih di threshold.
  // Kalau tidak → balik ke harga normal. Kalau masih → tetap harga grosir.
  const updateQtyWithGrosir = useCallback(
    (id: number, qty: number) => {
      if (qty <= 0) {
        updateQty(id, 0);
        return;
      }
      // Cari produk asli dari produkList untuk dapatkan harga grosir & threshold
      const produk = produkList.find((p) => p.id === id);
      if (produk && isGrosirAktif(produk)) {
        const hargaSeharusnya = hitungHargaGrosir(produk, qty);
        const pakaiGrosir = hargaSeharusnya !== produk.harga;
        // Update qty dulu
        updateQty(id, qty);
        // Lalu update harga kalau perlu
        updateItemHarga(id, hargaSeharusnya, pakaiGrosir);
      } else {
        updateQty(id, qty);
      }
    },
    [produkList, updateQty, updateItemHarga],
  );

  const cartProps: CartPanelProps = {
    isSplit,
    cartWidth,
    items,
    diskon,
    metode,
    fmtDiskon,
    sub,
    tot,
    pajak,
    pajakPersen,
    totalItem,
    updateQty: updateQtyWithGrosir, // ← pakai wrapper
    updateItemHarga,
    setDiskon,
    setDiskonText,
    setMetode,
    setShowCart,
    setShowBayar,
    handleDiskonChange,
    bottomInset: insets.bottom,
    onPilihDiskon: () => {
      setDiskonList(getDiskonAktif());
      setShowPilihDiskon(true);
    },
    selectedDiskon,
    onHapusDiskon: hapusDiskon,
    onHold: () => setShowHoldInput(true),
  };

  const renderProduk = useCallback(
    ({ item }: { item: Produk }) => {
      const qty = getQty(item.id);
      const habis = item.stok === 0;
      const low = item.stok > 0 && item.stok <= item.stok_minimum;
      // ── BARU: cek apakah produk punya grosir aktif dan qty sudah memenuhi ──
      const adaGrosir = isGrosirAktif(item);
      const sudahGrosir = adaGrosir && qty >= (item.min_grosir ?? 0);
      const hargaTampil = sudahGrosir ? item.harga_grosir! : item.harga;

      return (
        <TouchableOpacity
          style={[
            pc.card,
            qty > 0 && pc.cardActive,
            habis && pc.cardHabis,
            sudahGrosir && pc.cardGrosir,
          ]}
          onPress={() => !habis && addItemWithGrosir(item)}
          activeOpacity={0.75}
        >
          {qty > 0 && (
            <View style={pc.badge}>
              <Text style={pc.badgeTxt}>{qty}</Text>
            </View>
          )}
          <View style={pc.imgBox}>
            {item.gambar ? (
              <Image
                source={{ uri: resolveGambarUri(item.gambar)! }}
                style={pc.img}
              />
            ) : (
              <View style={pc.imgEmpty}>
                <Text style={pc.imgEmoji}>
                  {getKategoriEmoji(item.kategori_nama)}
                </Text>
              </View>
            )}
            {habis && (
              <View style={pc.habisOverlay}>
                <Text style={pc.habisLbl}>Habis</Text>
              </View>
            )}
            {(item as any).is_konsinyasi === 1 && (
              <View
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  zIndex: 2,
                  backgroundColor: '#059669',
                  borderRadius: 6,
                  paddingHorizontal: 5,
                  paddingVertical: 2,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 8, fontWeight: '800' }}>
                  KON
                </Text>
              </View>
            )}
            {/* ── BARU: badge GROSIR di gambar produk ── */}
            {adaGrosir && !habis && (
              <View style={[pc.grosirTag, sudahGrosir && pc.grosirTagAktif]}>
                <Text
                  style={[pc.grosirTagTxt, sudahGrosir && { color: '#fff' }]}
                >
                  {sudahGrosir
                    ? `GROSIR ${formatRupiah(item.harga_grosir!)}`
                    : `GROSIR ≥${item.min_grosir}`}
                </Text>
              </View>
            )}
          </View>
          <View style={pc.info}>
            <Text style={pc.nama} numberOfLines={2}>
              {item.nama}
            </Text>
            {/* ── BARU: tampil harga grosir kalau sudah berlaku ── */}
            <Text style={[pc.harga, sudahGrosir && { color: Colors.success }]}>
              {formatRupiah(hargaTampil)}
            </Text>
            {sudahGrosir && (
              <Text style={pc.hargaCoret}>{formatRupiah(item.harga)}</Text>
            )}
            <View style={pc.stokRow}>
              <View
                style={[
                  pc.dot,
                  habis && { backgroundColor: Colors.danger },
                  low && { backgroundColor: Colors.warning },
                ]}
              />
              <Text
                style={[
                  pc.stokTxt,
                  habis && { color: Colors.danger },
                  low && { color: Colors.warning },
                ]}
              >
                {habis ? 'Habis' : `${item.stok} ${item.satuan}`}
              </Text>
            </View>
          </View>
          {!habis && (
            <TouchableOpacity
              style={[pc.addBtn, qty > 0 && pc.addBtnActive]}
              onPress={() => addItemWithGrosir(item)}
            >
              <Ionicons name="add" size={15} color={qty > 0 ? '#fff' : NAVY} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      );
    },
    [items, addItemWithGrosir],
  );

  const safeEdges = useMemo(() => ['top', 'left', 'right'] as const, []);

  return (
    <SafeAreaView style={s.safe} edges={safeEdges}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerL}>
          <View style={s.headerIcon}>
            <Ionicons name="receipt-outline" size={18} color="#fff" />
          </View>
          <View>
            <Text style={s.headerTitle}>Kasir</Text>
            <Text style={s.headerSub}>
              {totalItem()} item · {formatRupiah(tot)}
            </Text>
          </View>
        </View>
        <View style={s.headerR}>
          {items.length > 0 && (
            <TouchableOpacity
              style={s.hBtn}
              onPress={() =>
                Alert.alert('Reset', 'Kosongkan keranjang?', [
                  { text: 'Batal', style: 'cancel' },
                  {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: () => {
                      clear();
                      setBayarText('');
                      setDiskonText('');
                    },
                  },
                ])
              }
            >
              <Ionicons
                name="trash-outline"
                size={16}
                color="rgba(255,255,255,0.8)"
              />
            </TouchableOpacity>
          )}
          {heldOrders.length > 0 && (
            <TouchableOpacity
              style={[s.hBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
              onPress={() => setShowHeld(true)}
            >
              <Ionicons name="layers-outline" size={16} color="#fff" />
              <View
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  backgroundColor: Colors.accent,
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 8, fontWeight: '900' }}>
                  {heldOrders.length}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search Bar */}
      <View style={s.scanWrap}>
        <View style={[s.scanBar, scanFocus && s.scanBarFocus]}>
          <TouchableOpacity
            style={[
              s.camBtn,
              scanFocus && { backgroundColor: Colors.accentLight },
            ]}
            onPress={() => setShowCamera(true)}
          >
            <Ionicons
              name="camera-outline"
              size={18}
              color={scanFocus ? NAVY : '#9CA3AF'}
            />
          </TouchableOpacity>
          <TextInput
            ref={scanRef}
            style={[s.scanInput, scanFocus && { color: Colors.text }]}
            value={searchTxt}
            onChangeText={setSearchTxt}
            onSubmitEditing={handleScanSubmit}
            placeholder="Cari produk atau scan barcode..."
            placeholderTextColor="#9CA3AF"
            returnKeyType="search"
            blurOnSubmit={false}
            onFocus={() => setScanFocus(true)}
            onBlur={() => setScanFocus(false)}
          />
          {searchTxt.length > 0 ? (
            <TouchableOpacity
              onPress={() => {
                setSearchTxt('');
                scanRef.current?.focus();
              }}
            >
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          ) : (
            <View style={[s.scanPill, scanFocus && s.scanPillActive]}>
              <View
                style={[
                  s.scanDot,
                  { backgroundColor: scanFocus ? '#22C55E' : '#D1D5DB' },
                ]}
              />
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '700',
                  color: scanFocus ? '#16A34A' : '#9CA3AF',
                }}
              >
                {scanFocus ? 'Siap Scan' : 'Tap Scan'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Body */}
      <View style={[s.body, isSplit && s.bodySplit]}>
        <View style={s.prodPanel}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.katScroll}
            contentContainerStyle={s.katContent}
          >
            {kats.map((k) => {
              const active =
                (activeKat === 0 && k.id === 1) || activeKat === k.id;
              return (
                <TouchableOpacity
                  key={k.id}
                  style={[s.katChip, active && s.katChipActive]}
                  onPress={() => setActiveKat(k.id === 1 ? 0 : k.id)}
                >
                  <Text style={[s.katTxt, active && s.katTxtActive]}>
                    {k.nama}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <FlatList
            key={`2-${width}`}
            data={produkList}
            keyExtractor={(i) => i.id.toString()}
            renderItem={renderProduk}
            numColumns={2}
            contentContainerStyle={[
              s.prodGrid,
              { paddingBottom: isSplit ? 16 : 100 },
            ]}
            showsVerticalScrollIndicator={false}
            columnWrapperStyle={{ gap: 8, paddingHorizontal: 8 }}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingTop: 40, gap: 8 }}>
                <Ionicons name="cube-outline" size={32} color="#D1D5DB" />
                <Text style={{ fontSize: 12, color: Colors.textLight }}>
                  Tidak ada produk
                </Text>
              </View>
            }
          />
        </View>
        {isSplit && <CartPanel {...cartProps} />}
      </View>

      {/* Mobile sticky bar */}
      {!isSplit && (
        <View style={[s.mobileBar, { paddingBottom: insets.bottom + 8 }]}>
          <View style={s.mbInfo}>
            <Text style={s.mbItemCount}>{totalItem()} item di keranjang</Text>
            <Text style={s.mbTotal}>{formatRupiah(tot)}</Text>
          </View>
          <View style={s.mbBtnRow}>
            <TouchableOpacity
              style={[s.mbCartBtn, items.length === 0 && { opacity: 0.5 }]}
              onPress={() => setShowHoldInput(true)}
              disabled={items.length === 0}
            >
              <Ionicons name="bookmark-outline" size={16} color={NAVY} />
              <Text style={s.mbCartTxt}>Hold</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.mbKeranjangBtn}
              onPress={() => setShowCart(true)}
            >
              <Ionicons name="cart-outline" size={18} color={NAVY} />
              <Text style={s.mbCartTxt}>Keranjang</Text>
              {items.length > 0 && (
                <View style={s.mbCartBadge}>
                  <Text style={s.mbCartBadgeTxt}>{items.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.mbBayarBtn, items.length === 0 && { opacity: 0.5 }]}
              onPress={() => {
                if (items.length === 0) {
                  Alert.alert('Keranjang kosong', 'Pilih produk dulu');
                  return;
                }
                setShowBayar(true);
              }}
            >
              <Ionicons name="card-outline" size={16} color="#fff" />
              <Text style={s.mbBayarTxt}>Bayar {formatRupiah(tot)}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Mobile Cart Modal */}
      {!isSplit && (
        <Modal visible={showCart} transparent animationType="slide">
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <TouchableOpacity
              style={[
                StyleSheet.absoluteFillObject,
                { backgroundColor: 'rgba(0,0,0,0.5)' },
              ]}
              onPress={() => setShowCart(false)}
              activeOpacity={1}
            />
            <View
              style={{
                backgroundColor: '#fff',
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                height: '85%',
                paddingBottom: insets.bottom,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 4,
                  backgroundColor: Colors.border,
                  borderRadius: 2,
                  alignSelf: 'center',
                  marginTop: 12,
                  marginBottom: 4,
                  flexShrink: 0,
                }}
              />
              <CartPanel {...cartProps} />
            </View>
          </View>
        </Modal>
      )}

      {/* Hold Input */}
      <Modal visible={showHoldInput} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <View
            style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20 }}
          >
            <Text style={{ fontSize: 16, fontWeight: '800', marginBottom: 12 }}>
              Simpan Bill
            </Text>
            <TextInput
              style={{
                backgroundColor: Colors.background,
                borderRadius: 12,
                padding: 14,
                fontSize: 14,
                borderWidth: 1,
                borderColor: Colors.border,
                marginBottom: 16,
              }}
              placeholder="Nama bill (opsional, contoh: Meja 3)"
              placeholderTextColor={Colors.textDisabled}
              value={holdNama}
              onChangeText={setHoldNama}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: Colors.background,
                  alignItems: 'center',
                }}
                onPress={() => {
                  setShowHoldInput(false);
                  setHoldNama('');
                }}
              >
                <Text style={{ fontWeight: '700', color: Colors.textMuted }}>
                  Batal
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: Colors.primary,
                  alignItems: 'center',
                }}
                onPress={() => {
                  holdOrder(holdNama);
                  setHoldNama('');
                  setShowHoldInput(false);
                }}
              >
                <Text style={{ fontWeight: '700', color: '#fff' }}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Held Orders */}
      <Modal visible={showHeld} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            onPress={() => setShowHeld(false)}
            activeOpacity={1}
          >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} />
          </TouchableOpacity>
          <View
            style={{
              backgroundColor: '#fff',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              maxHeight: '70%',
            }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: Colors.border,
                borderRadius: 2,
                alignSelf: 'center',
                marginBottom: 16,
              }}
            />
            <Text style={{ fontSize: 17, fontWeight: '800', marginBottom: 14 }}>
              Bill Tersimpan ({heldOrders.length})
            </Text>
            <FlatList
              data={heldOrders}
              keyExtractor={(o) => o.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item: order }) => (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: Colors.background,
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 8,
                    gap: 10,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: Colors.text,
                      }}
                    >
                      {order.nama}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: Colors.textLight,
                        marginTop: 2,
                      }}
                    >
                      {order.items.length} item ·{' '}
                      {formatRupiah(
                        order.items.reduce(
                          (s: number, i: any) => s + i.subtotal,
                          0,
                        ) - order.diskon,
                      )}
                    </Text>
                    <Text
                      style={{
                        fontSize: 10,
                        color: Colors.textDisabled,
                        marginTop: 1,
                      }}
                    >
                      {new Date(order.waktu).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={{
                      backgroundColor: Colors.primaryLight,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}
                    onPress={() => {
                      recallOrder(order.id);
                      setShowHeld(false);
                    }}
                  >
                    <Text
                      style={{
                        color: Colors.primary,
                        fontWeight: '700',
                        fontSize: 12,
                      }}
                    >
                      Buka
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      backgroundColor: Colors.dangerLight,
                      borderRadius: 10,
                      padding: 8,
                    }}
                    onPress={() => deleteHeldOrder(order.id)}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={14}
                      color={Colors.danger}
                    />
                  </TouchableOpacity>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Modal Bayar */}
      <Modal visible={showBayar} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            onPress={() => setShowBayar(false)}
            activeOpacity={1}
          >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} />
          </TouchableOpacity>
          <ScrollView
            style={[mb.sheet, { maxHeight: '92%' }]}
            contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={mb.handle} />
            <View style={mb.header}>
              <Text style={mb.title}>Konfirmasi Pembayaran</Text>
              <TouchableOpacity onPress={() => setShowBayar(false)}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View style={mb.totalBox}>
              <Text style={mb.totalLbl}>Total Pembayaran</Text>
              <Text style={mb.totalVal}>{formatRupiah(tot)}</Text>
              <Text style={mb.totalSub}>
                {totalItem()} item
                {diskon > 0 ? ` · Diskon ${formatRupiah(diskon)}` : ''}
                {pajak > 0
                  ? ` · Pajak ${pajakPersen}% ${formatRupiah(pajak)}`
                  : ''}
              </Text>
            </View>
            <Text style={mb.secLbl}>PELANGGAN (OPSIONAL)</Text>
            <TouchableOpacity
              style={mb.pelangganBtn}
              onPress={() => {
                setPelangganList(getAllPelanggan());
                setShowPilihPelanggan(true);
              }}
            >
              {selectedPelanggan ? (
                <View style={{ flex: 1 }}>
                  <Text style={mb.pelangganNama}>{selectedPelanggan.nama}</Text>
                  {selectedPelanggan.no_hp ? (
                    <Text style={mb.pelangganSub}>
                      {selectedPelanggan.no_hp}
                    </Text>
                  ) : null}
                </View>
              ) : (
                <Text style={mb.pelangganPlaceholder}>Pilih pelanggan...</Text>
              )}
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                {selectedPelanggan && (
                  <TouchableOpacity
                    onPress={() => setSelectedPelanggan(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color={Colors.textMuted}
                    />
                  </TouchableOpacity>
                )}
                <Ionicons
                  name="chevron-down"
                  size={18}
                  color={Colors.textMuted}
                />
              </View>
            </TouchableOpacity>
            <Text style={mb.secLbl}>METODE PEMBAYARAN</Text>
            <View style={mb.metodeGrid}>
              {[
                { key: 'tunai', label: 'Tunai', icon: 'cash-outline' },
                {
                  key: 'transfer',
                  label: 'Transfer',
                  icon: 'phone-portrait-outline',
                },
                { key: 'qris', label: 'QRIS', icon: 'qr-code-outline' },
                { key: 'hutang', label: 'Hutang', icon: 'time-outline' },
              ].map((m) => (
                <TouchableOpacity
                  key={m.key}
                  style={[mb.mi, metode === m.key && mb.miActive]}
                  onPress={() => setMetode(m.key)}
                >
                  <Ionicons
                    name={m.icon as any}
                    size={18}
                    color={metode === m.key ? '#fff' : '#6B7280'}
                  />
                  <Text style={[mb.miTxt, metode === m.key && mb.miTxtActive]}>
                    {m.label}
                  </Text>
                  {metode === m.key && (
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color="rgba(255,255,255,0.7)"
                      style={{ marginLeft: 'auto' }}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            {metode === 'tunai' && (
              <View style={mb.tunaiSection}>
                <Text style={mb.secLbl}>JUMLAH UANG</Text>
                <View style={mb.tunaiWrap}>
                  <Text style={mb.tunaiRp}>Rp</Text>
                  <TextInput
                    style={mb.tunaiInput}
                    keyboardType="number-pad"
                    placeholder={tot.toLocaleString('id-ID')}
                    value={fmtBayar}
                    onChangeText={handleBayarChange}
                    placeholderTextColor="#D1D5DB"
                    blurOnSubmit={false}
                    autoFocus
                  />
                </View>
                {bayarNum > 0 && (
                  <View
                    style={[
                      mb.kembalianBox,
                      {
                        backgroundColor:
                          kembalian < 0
                            ? Colors.dangerLight
                            : Colors.successLight,
                      },
                    ]}
                  >
                    <View>
                      <Text style={{ fontSize: 11, color: Colors.textMuted }}>
                        Kembalian
                      </Text>
                      <Text
                        style={{
                          fontSize: 22,
                          fontWeight: '800',
                          color: kembalian < 0 ? Colors.danger : Colors.success,
                        }}
                      >
                        {kembalian < 0
                          ? `Kurang ${formatRupiah(-kembalian)}`
                          : formatRupiah(kembalian)}
                      </Text>
                    </View>
                    {kembalian >= 0 && (
                      <Ionicons
                        name="checkmark-circle"
                        size={32}
                        color={Colors.success}
                      />
                    )}
                  </View>
                )}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginTop: 8 }}
                >
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {quickAmts.map((v) => (
                      <TouchableOpacity
                        key={v}
                        style={mb.quickAmt}
                        onPress={() => setBayarText(v.toString())}
                      >
                        <Text style={mb.quickAmtTxt}>{formatRupiah(v)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
            <TouchableOpacity
              style={[
                mb.konfBtn,
                metode === 'tunai' && bayarNum < tot && { opacity: 0.45 },
              ]}
              onPress={handleBayar}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color="#fff"
              />
              <Text style={mb.konfBtnTxt}>
                {metode === 'tunai'
                  ? `Bayar ${formatRupiah(tot)}`
                  : `Konfirmasi ${metode.charAt(0).toUpperCase() + metode.slice(1)}`}
              </Text>
            </TouchableOpacity>
            <View style={{ height: 8 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* Modal Pilih Diskon */}
      <Modal visible={showPilihDiskon} transparent animationType="slide">
        <SafeAreaView style={{ flex: 1, justifyContent: 'flex-end' }}>
          <TouchableOpacity
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: 'rgba(0,0,0,0.5)' },
            ]}
            onPress={() => setShowPilihDiskon(false)}
            activeOpacity={1}
          />
          <View
            style={{
              backgroundColor: '#fff',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              maxHeight: '60%',
            }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: Colors.border,
                borderRadius: 2,
                alignSelf: 'center',
                marginBottom: 16,
              }}
            />
            <Text
              style={{
                fontSize: 17,
                fontWeight: '800',
                color: Colors.text,
                marginBottom: 14,
              }}
            >
              Pilih Diskon
            </Text>
            {selectedDiskon && (
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: Colors.dangerLight,
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 10,
                }}
                onPress={hapusDiskon}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={20}
                  color={Colors.danger}
                />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: Colors.danger,
                  }}
                >
                  Hapus Diskon
                </Text>
              </TouchableOpacity>
            )}
            {diskonList.length === 0 ? (
              <View
                style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}
              >
                <Ionicons name="pricetag-outline" size={36} color="#D1D5DB" />
                <Text style={{ color: Colors.textMuted, fontSize: 14 }}>
                  Belum ada diskon aktif
                </Text>
              </View>
            ) : (
              <FlatList
                data={diskonList}
                keyExtractor={(d) => d.id.toString()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingBottom: 24 }}
                renderItem={({ item: d }) => {
                  const nilaiDisplay =
                    d.tipe === 'persen' ? `${d.nilai}%` : formatRupiah(d.nilai);
                  const nominalDisplay =
                    d.tipe === 'persen'
                      ? `= ${formatRupiah(Math.round((sub * d.nilai) / 100))}`
                      : '';
                  const isSelected = selectedDiskon?.id === d.id;
                  const belumCukup =
                    d.min_pembelian > 0 && sub < d.min_pembelian;
                  return (
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        backgroundColor: isSelected
                          ? Colors.primaryLight
                          : Colors.background,
                        borderRadius: 14,
                        padding: 14,
                        borderWidth: isSelected ? 1.5 : 0.5,
                        borderColor: isSelected
                          ? Colors.primary
                          : Colors.border,
                        opacity: belumCukup ? 0.5 : 1,
                      }}
                      onPress={() => !belumCukup && terapkanDiskon(d)}
                      disabled={belumCukup}
                    >
                      <View
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 14,
                          backgroundColor:
                            d.tipe === 'persen' ? '#F5F3FF' : '#FDF2F8',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: '900',
                            color: d.tipe === 'persen' ? '#7C3AED' : '#DB2777',
                          }}
                        >
                          {nilaiDisplay}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: '700',
                            color: Colors.text,
                          }}
                        >
                          {d.nama}
                        </Text>
                        {nominalDisplay ? (
                          <Text
                            style={{
                              fontSize: 12,
                              color: Colors.success,
                              marginTop: 2,
                            }}
                          >
                            {nominalDisplay}
                          </Text>
                        ) : null}
                        {d.min_pembelian > 0 && (
                          <Text
                            style={{
                              fontSize: 11,
                              color: belumCukup
                                ? Colors.danger
                                : Colors.textMuted,
                              marginTop: 2,
                            }}
                          >
                            {belumCukup
                              ? `Kurang ${formatRupiah(d.min_pembelian - sub)} lagi`
                              : `Min. ${formatRupiah(d.min_pembelian)}`}
                          </Text>
                        )}
                      </View>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color={Colors.primary}
                        />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Modal Pilih Pelanggan */}
      <Modal visible={showPilihPelanggan} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <TouchableOpacity
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: 'rgba(0,0,0,0.5)' },
            ]}
            onPress={() => setShowPilihPelanggan(false)}
            activeOpacity={1}
          />
          <View
            style={{
              backgroundColor: '#fff',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              height: '75%',
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: Colors.border,
                borderRadius: 2,
                alignSelf: 'center',
                marginTop: 12,
                marginBottom: 8,
              }}
            />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                marginBottom: 12,
              }}
            >
              <Text
                style={{ fontSize: 17, fontWeight: '800', color: Colors.text }}
              >
                Pilih Pelanggan
              </Text>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  backgroundColor: Colors.primary,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                }}
                onPress={() => {
                  setShowPilihPelanggan(false); // ← tutup dulu
                  setTimeout(() => {
                    setShowTambahPelanggan(true); // ← baru buka, kasih jeda animasi
                  }, 300);
                }}
              >
                <Ionicons name="add" size={15} color="#fff" />
                <Text
                  style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}
                >
                  Baru
                </Text>
              </TouchableOpacity>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: Colors.background,
                borderRadius: 12,
                marginHorizontal: 16,
                marginBottom: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              <Ionicons
                name="search-outline"
                size={16}
                color={Colors.textMuted}
              />
              <TextInput
                style={{ flex: 1, fontSize: 14, color: Colors.text }}
                placeholder="Cari nama atau nomor HP..."
                placeholderTextColor={Colors.textMuted}
                value={searchPelanggan}
                onChangeText={(t) => {
                  setSearchPelanggan(t);
                  setPelangganList(getAllPelanggan(t));
                }}
              />
            </View>
            <FlatList
              data={pelangganList}
              keyExtractor={(p) => p.id.toString()}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingBottom: 24,
                gap: 8,
              }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingTop: 40, gap: 10 }}>
                  <Ionicons name="people-outline" size={40} color="#D1D5DB" />
                  <Text style={{ color: Colors.textMuted, fontSize: 14 }}>
                    {searchPelanggan
                      ? 'Pelanggan tidak ditemukan'
                      : 'Belum ada pelanggan'}
                  </Text>
                </View>
              }
              renderItem={({ item: p }) => (
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    backgroundColor:
                      selectedPelanggan?.id === p.id
                        ? Colors.primaryLight
                        : Colors.background,
                    borderRadius: 14,
                    padding: 14,
                    borderWidth: selectedPelanggan?.id === p.id ? 1.5 : 0.5,
                    borderColor:
                      selectedPelanggan?.id === p.id
                        ? Colors.primary
                        : Colors.border,
                  }}
                  onPress={() => {
                    setSelectedPelanggan(p);
                    setShowPilihPelanggan(false);
                  }}
                >
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 21,
                      backgroundColor: Colors.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: '#fff',
                        fontSize: 16,
                        fontWeight: '800',
                      }}
                    >
                      {p.nama.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '700',
                        color: Colors.text,
                      }}
                    >
                      {p.nama}
                    </Text>
                    {p.no_hp ? (
                      <Text
                        style={{
                          fontSize: 12,
                          color: Colors.textMuted,
                          marginTop: 1,
                        }}
                      >
                        {p.no_hp}
                      </Text>
                    ) : null}
                    {p.total_beli > 0 && (
                      <Text
                        style={{
                          fontSize: 11,
                          color: Colors.success,
                          marginTop: 1,
                        }}
                      >
                        Total beli: {formatRupiah(p.total_beli)}
                      </Text>
                    )}
                  </View>
                  {selectedPelanggan?.id === p.id && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={Colors.primary}
                    />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Modal Tambah Pelanggan Baru — komponen terpisah agar tidak getar */}
      <TambahPelangganModal
        visible={showTambahPelanggan}
        onClose={() => setShowTambahPelanggan(false)}
        onSimpan={(nama, no_hp, alamat) => {
          const newId = tambahPelanggan(nama, no_hp, alamat);
          const newP: Pelanggan = {
            id: newId,
            nama,
            no_hp,
            alamat,
            total_beli: 0,
          };
          setSelectedPelanggan(newP);
          setShowTambahPelanggan(false);
          setShowPilihPelanggan(false);
        }}
      />

      <CameraModal
        visible={showCamera}
        onClose={() => setShowCamera(false)}
        onDetected={prosesBarcode}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const pc = StyleSheet.create({
  card: {
    flex: 1,
    maxWidth: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: Colors.border,
    position: 'relative',
  },
  cardActive: { borderColor: Colors.accent, borderWidth: 1.5 },
  cardHabis: { opacity: 0.55 },
  // ── BARU: border hijau saat grosir berlaku ──
  cardGrosir: { borderColor: Colors.success, borderWidth: 1.5 },
  badge: {
    position: 'absolute',
    top: 5,
    left: 5,
    zIndex: 2,
    backgroundColor: Colors.accent,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeTxt: { color: '#fff', fontSize: 8, fontWeight: '900' },
  imgBox: { width: '100%', aspectRatio: 1.2, position: 'relative' },
  img: { width: '100%', height: '100%' },
  imgEmoji: { fontSize: 28 },
  imgEmpty: {
    flex: 1,
    backgroundColor: Colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habisOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  habisLbl: { color: '#fff', fontSize: 10, fontWeight: '800' },
  // ── BARU: tag grosir di pojok bawah gambar ──
  grosirTag: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(22,163,74,0.15)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  grosirTagAktif: { backgroundColor: Colors.success },
  grosirTagTxt: { fontSize: 8, fontWeight: '800', color: Colors.success },
  info: { padding: 8 },
  nama: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 14,
    marginBottom: 3,
  },
  harga: { fontSize: 12, fontWeight: '800', color: NAVY, marginBottom: 1 },
  // ── BARU: harga normal yang dicoret saat grosir berlaku ──
  hargaCoret: {
    fontSize: 9,
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  stokRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#22C55E' },
  stokTxt: { fontSize: 9, color: Colors.success, fontWeight: '600' },
  addBtn: {
    marginHorizontal: 8,
    marginBottom: 8,
    marginTop: 2,
    backgroundColor: Colors.accentLight,
    borderRadius: 8,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: NAVY,
  },
  addBtnActive: { backgroundColor: NAVY, borderColor: NAVY },
});

const cart = StyleSheet.create({
  qtyTouchable: {
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyInput: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
    minWidth: 36,
    textAlign: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.primary,
    paddingVertical: 0,
  },
  diskonPilihBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.background,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  diskonPilihTxt: { fontSize: 9, fontWeight: '600', color: Colors.textMuted },
  // ── BARU: badge GROSIR di item cart ──
  grosirBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  grosirBadgeTxt: { fontSize: 7, fontWeight: '900', color: '#fff' },
  panel: {
    backgroundColor: '#fff',
    borderLeftWidth: 0.5,
    borderLeftColor: Colors.border,
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  title: { fontSize: 13, fontWeight: '800', color: Colors.text, flex: 1 },
  badge: {
    backgroundColor: NAVY,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeTxt: { color: '#fff', fontSize: 9, fontWeight: '900' },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 20,
  },
  emptyTxt: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 18,
  },
  listContent: { padding: 8, gap: 6 },
  item: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.cardAlt,
    borderRadius: 10,
    padding: 8,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  itemImg: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.border,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemNama: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
    flex: 1,
  },
  itemHarga: { fontSize: 10, color: Colors.textLight, marginBottom: 4 },
  itemControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  minus: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: Colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qty: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.text,
    minWidth: 20,
    textAlign: 'center',
  },
  plus: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: Colors.infoLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtotal: {
    marginLeft: 'auto' as any,
    fontSize: 11,
    fontWeight: '800',
    color: NAVY,
  },
  footer: {
    padding: 10,
    borderTopWidth: 0.5,
    borderTopColor: Colors.borderLight,
  },
  diskonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  diskonLbl: { fontSize: 10, color: Colors.textLight, fontWeight: '600' },
  diskonInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'right',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 2,
  },
  divider: { height: 0.5, backgroundColor: Colors.border, marginVertical: 6 },
  sumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  sumLbl: { fontSize: 10, color: Colors.textLight },
  sumVal: { fontSize: 10, fontWeight: '600', color: Colors.text },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    marginTop: 4,
  },
  totalLbl: { fontSize: 11, fontWeight: '800', color: NAVY },
  totalVal: {
    fontSize: 16,
    fontWeight: '900',
    color: NAVY,
    letterSpacing: -0.3,
  },
  metodeRow: { flexDirection: 'row', gap: 3, marginBottom: 8 },
  mc: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  mcActive: { backgroundColor: NAVY, borderColor: NAVY },
  mcTxt: { fontSize: 9, fontWeight: '700', color: Colors.textMuted },
  mcTxtActive: { color: '#fff' },
  footerBtnRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  holdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: NAVY,
  },
  holdTxt: { fontSize: 13, fontWeight: '800', color: NAVY },
  bayarBtn: {
    backgroundColor: NAVY,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  bayarTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },
  bayarSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    textAlign: 'center',
  },
});

const mb = StyleSheet.create({
  pelangganBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 13,
    marginBottom: 16,
    gap: 10,
  },
  pelangganNama: { fontSize: 14, fontWeight: '700', color: Colors.text },
  pelangganSub: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  pelangganPlaceholder: { flex: 1, fontSize: 14, color: Colors.textDisabled },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 18, fontWeight: '800', color: Colors.text },
  totalBox: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  totalLbl: { fontSize: 12, color: Colors.textLight, marginBottom: 4 },
  totalVal: { fontSize: 32, fontWeight: '800', color: NAVY, letterSpacing: -1 },
  totalSub: { fontSize: 11, color: Colors.textLight, marginTop: 4 },
  secLbl: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textLight,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  metodeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  mi: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.cardAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  miActive: { backgroundColor: NAVY, borderColor: NAVY },
  miTxt: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  miTxtActive: { color: '#fff' },
  tunaiSection: { marginBottom: 16 },
  tunaiWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: NAVY,
    paddingBottom: 8,
    marginBottom: 10,
  },
  tunaiRp: { fontSize: 18, color: Colors.textLight, fontWeight: '600' },
  tunaiInput: { flex: 1, fontSize: 28, fontWeight: '800', color: Colors.text },
  kembalianBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  quickAmt: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickAmtTxt: { fontSize: 12, fontWeight: '700', color: NAVY },
  konfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: NAVY,
    borderRadius: 16,
    padding: 17,
  },
  konfBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NAVY },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  headerL: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 1 },
  headerR: { flexDirection: 'row', gap: 8 },
  hBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanWrap: { paddingHorizontal: 16, paddingBottom: 8 },
  scanBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  scanBarFocus: { backgroundColor: '#fff', borderColor: 'rgba(30,58,95,0.15)' },
  camBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanInput: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.9)' },
  scanPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  scanPillActive: { backgroundColor: '#DCFCE7' },
  scanDot: { width: 6, height: 6, borderRadius: 3 },
  body: { flex: 1, backgroundColor: Colors.background },
  bodySplit: { flexDirection: 'row' },
  prodPanel: { flex: 1, flexDirection: 'column' },
  katScroll: {
    flexGrow: 0,
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  katContent: {
    paddingHorizontal: 8,
    paddingVertical: 7,
    gap: 5,
    alignItems: 'center',
  },
  katChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: Colors.background,
  },
  katChipActive: { backgroundColor: NAVY },
  katTxt: { fontSize: 10, fontWeight: '700', color: Colors.textMuted },
  katTxtActive: { color: '#fff' },
  prodGrid: { paddingTop: 8, paddingHorizontal: 0 },
  mobileBar: {
    backgroundColor: '#fff',
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
  },
  mbInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mbItemCount: { fontSize: 11, color: Colors.textLight },
  mbTotal: { fontSize: 20, fontWeight: '800', color: NAVY },
  mbBtnRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  mbCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mbKeranjangBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    position: 'relative',
  },
  mbCartTxt: { fontSize: 13, fontWeight: '700', color: NAVY },
  mbCartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.accent,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  mbCartBadgeTxt: { color: '#fff', fontSize: 8, fontWeight: '900' },
  mbBayarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: NAVY,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  mbBayarTxt: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
