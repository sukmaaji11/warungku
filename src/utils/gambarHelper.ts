// src/utils/gambarHelper.ts
// ── Helper resolve path gambar produk ────────────────────────────────────────
// Root cause gambar hilang: saveImagePermanently menyimpan FULL PATH ke DB.
// Di iOS, documentDirectory berubah setiap update app → gambar tidak ditemukan.
//
// Fix (2 langkah):
// 1. saveImagePermanently sekarang simpan NAMA FILE saja (bukan full path)
// 2. resolveGambarUri() resolve nama file → full path saat ditampilkan
//
// Backward compatible: gambar lama (full path) tetap bisa tampil

import * as FileSystem from "expo-file-system/legacy";

const PRODUK_IMG_DIR = FileSystem.documentDirectory + "produk_images/";

export function resolveGambarUri(
  gambar: string | null | undefined,
): string | undefined {
  if (!gambar) return undefined;

  // Gambar lama: sudah full path (file:// atau /)
  if (gambar.startsWith("file://") || gambar.startsWith("/")) {
    return gambar;
  }

  // Gambar baru: hanya nama file → resolve ke documentDirectory
  return PRODUK_IMG_DIR + gambar;
}

// ── Versi baru saveImagePermanently — simpan nama file saja ──────────────────
export async function saveImagePermanently(uri: string): Promise<string> {
  await FileSystem.makeDirectoryAsync(PRODUK_IMG_DIR, { intermediates: true });
  const fileName = `produk_${Date.now()}.jpg`;
  const destUri = PRODUK_IMG_DIR + fileName;
  await FileSystem.copyAsync({ from: uri, to: destUri });
  return fileName; // ← hanya nama file, bukan full path
}
