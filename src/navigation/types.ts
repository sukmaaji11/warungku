export type AuthStackParamList = {
  Splash: undefined;
  AktivasiLisensi: undefined;
  Login: undefined;
  SetupPIN: { namaToko: string; kode: string };
};

export type MainStackParamList = {
  MainTabs: undefined;
  TambahProduk: undefined;
  EditProduk: { id: number };
};

export type TabParamList = {
  Dashboard: undefined;
  Produk: undefined;
  Kasir: undefined;
  Laporan: undefined;
  Pengaturan: undefined;
};
