import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuthStore } from '../store/authStore';
import TabNavigator from './TabNavigator';

// Auth screens
import AktivasiLisensiScreen from '../screens/auth/AktivasiLisensiScreen';
import SetupPINScreen from '../screens/auth/SetupPINScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import SplashScreen from '../screens/auth/SplashScreen';

// Produk screens
import {
  TambahProdukScreen,
  EditProdukScreen,
  ImportExcelScreen,
} from '../screens/produk/ProdukFormScreens';

// Main screens — default exports
import StrukScreen from '../screens/main/StrukScreen';
import DiskonScreen from '../screens/main/DiskonScreen';
import TambahDiskonScreen from '../screens/main/TambahDiskonScreen';
import KonsinyasiScreen from '../screens/main/KonsinyasiScreen';
import KonsiniyorListScreen from '../screens/main/KonsiniyorListScreen';
import TransaksiKonsinyasiScreen from '../screens/main/TransaksiKonsinyasiScreen';
import TambahKonsinyasiScreen from '../screens/main/TambahKonsinyasiScreen';
import PengeluaranScreen from '../screens/main/PengeluaranScreen';
import KategoriScreen from '../screens/main/KategoriScreen';
import LabelHargaScreen from '../screens/main/LabelHargaScreen';
import ManajemenUserScreen from '../screens/main/ManajemenUserScreen';
import PrinterScreen from '../screens/main/PrinterScreen';
import AiAnalisisScreen from '../screens/main/AiAnalisisScreen';
import KatalogScreen from '../screens/main/KatalogScreen';
import PreviewStrukScreen from '../screens/main/PreviewStrukScreen';

// Named exports
import { LaporanKasirScreen } from '../screens/main/LaporanKasirScreen';
import { PiutangScreen } from '../screens/main/PiutangScreen';
import { LaporanKonsinyasiScreen } from '../screens/main/LaporanKonsinyasiScreen';
import PelangganScreen from '../screens/main/PelangganScreen';
import GrosirScreen from '../screens/main/GrosirScreen';

const AuthStack = createStackNavigator();
const MainStack = createStackNavigator();

// ── Status auth yang mungkin: ─────────────────────────────────────────────────
// "no_lisensi"     → belum aktivasi lisensi
// "need_pin_setup" → lisensi aktif, belum setup PIN owner
// "need_login"     → sudah ada owner, perlu login PIN
// "authenticated"  → sudah login, masuk main app

function AuthNavigator() {
  const { status, namaToko } = useAuthStore();

  const renderScreen = () => {
    switch (status) {
      case 'no_lisensi':
        return (
          <AuthStack.Screen
            name="AktivasiLisensi"
            component={AktivasiLisensiScreen}
          />
        );
      case 'need_pin_setup':
        return (
          <AuthStack.Screen
            name="SetupPIN"
            component={SetupPINScreen}
            initialParams={{ namaToko: namaToko ?? '' }}
          />
        );
      case 'need_login':
      default:
        // Semua status tidak dikenal → fallback ke Login
        return <AuthStack.Screen name="Login" component={LoginScreen} />;
    }
  };

  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      {renderScreen()}
    </AuthStack.Navigator>
  );
}

function MainNavigator() {
  return (
    <MainStack.Navigator screenOptions={{ headerShown: false }}>
      {/* Tab utama */}
      <MainStack.Screen name="MainTabs" component={TabNavigator} />

      {/* Produk */}
      <MainStack.Screen name="TambahProduk" component={TambahProdukScreen} />
      <MainStack.Screen name="EditProduk" component={EditProdukScreen} />
      <MainStack.Screen name="ImportExcel" component={ImportExcelScreen} />

      {/* Transaksi & Struk */}
      <MainStack.Screen name="Struk" component={StrukScreen} />

      {/* Diskon */}
      <MainStack.Screen name="Diskon" component={DiskonScreen} />
      <MainStack.Screen name="TambahDiskon" component={TambahDiskonScreen} />

      {/* Konsinyasi */}
      <MainStack.Screen name="Konsinyasi" component={KonsinyasiScreen} />
      <MainStack.Screen
        name="KonsiniyorList"
        component={KonsiniyorListScreen}
      />
      <MainStack.Screen
        name="TransaksiKonsinyasi"
        component={TransaksiKonsinyasiScreen}
      />
      <MainStack.Screen
        name="LaporanKonsinyasi"
        component={LaporanKonsinyasiScreen}
      />
      <MainStack.Screen
        name="TambahKonsinyasi"
        component={TambahKonsinyasiScreen}
      />

      {/* Pengeluaran & Label */}
      <MainStack.Screen name="Pengeluaran" component={PengeluaranScreen} />
      <MainStack.Screen name="LabelHarga" component={LabelHargaScreen} />

      {/* Kategori */}
      <MainStack.Screen name="Kategori" component={KategoriScreen} />

      {/* Grosir */}
      <MainStack.Screen name="Grosir" component={GrosirScreen} />

      {/* Laporan & Piutang */}
      <MainStack.Screen name="LaporanKasir" component={LaporanKasirScreen} />
      <MainStack.Screen name="Piutang" component={PiutangScreen} />

      {/* Pelanggan */}
      <MainStack.Screen name="Pelanggan" component={PelangganScreen} />

      {/* Pengaturan */}
      <MainStack.Screen name="ManajemenUser" component={ManajemenUserScreen} />
      <MainStack.Screen name="Printer" component={PrinterScreen} />
      <MainStack.Screen name="PreviewStruk" component={PreviewStrukScreen} />

      {/* Extras */}
      <MainStack.Screen name="Katalog" component={KatalogScreen} />
      <MainStack.Screen name="AI" component={AiAnalisisScreen} />
    </MainStack.Navigator>
  );
}

export default function AppNavigator() {
  const { status, checkAuth } = useAuthStore();
  const [splashDone, setSplashDone] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    checkAuth().finally(() => setAuthChecked(true));
  }, []);

  // Tampil splash sampai keduanya selesai
  const showSplash = !splashDone || !authChecked;
  if (showSplash) {
    return <SplashScreen onFinish={() => setSplashDone(true)} />;
  }

  if (status === 'authenticated') return <MainNavigator />;
  return <AuthNavigator />;
}
