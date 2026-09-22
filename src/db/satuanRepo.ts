import { getDB } from "./database";

export interface SatuanProduk {
  id: number;
  nama: string;
  aktif: number;
}

export function getSatuanProduk(): SatuanProduk[] {
  return getDB().getAllSync(
    `SELECT id, nama, aktif
     FROM satuan_produk
     WHERE aktif = 1
     ORDER BY id ASC`
  ) as SatuanProduk[];
}

export function tambahSatuan(nama: string): void {
  const namaBersih = nama.trim();

  if (!namaBersih) {
    throw new Error("Nama satuan tidak boleh kosong");
  }

  getDB().runSync(
    `INSERT INTO satuan_produk (nama, aktif)
     VALUES (?, 1)`,
    [namaBersih]
  );
}

export function updateSatuan(id: number, nama: string): void {
  const namaBersih = nama.trim();

  if (!namaBersih) {
    throw new Error("Nama satuan tidak boleh kosong");
  }

  getDB().runSync(
    `UPDATE satuan_produk
     SET nama = ?
     WHERE id = ?`,
    [namaBersih, id]
  );
}

export function hapusSatuan(id: number): void {
  getDB().runSync(
    `UPDATE satuan_produk
     SET aktif = 0
     WHERE id = ?`,
    [id]
  );
}