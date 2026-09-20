// src/db/pelangganRepo.ts
import { getDB } from "./database";

export interface Pelanggan {
  id: number;
  nama: string;
  no_hp: string;
  alamat: string;
  total_beli: number;
}

export function getAllPelanggan(search = ""): Pelanggan[] {
  const db = getDB();
  try {
    const rows = db.getAllSync(
      `SELECT * FROM pelanggan
       WHERE nama LIKE ? OR no_hp LIKE ?
       ORDER BY nama ASC`,
      [`%${search}%`, `%${search}%`],
    ) as Pelanggan[];
    return rows;
  } catch {
    return [];
  }
}

export function tambahPelanggan(
  nama: string,
  no_hp: string,
  alamat: string,
): number {
  const db = getDB();
  const res = db.runSync(
    `INSERT INTO pelanggan (nama, no_hp, alamat) VALUES (?, ?, ?)`,
    [nama.trim(), no_hp.trim(), alamat.trim()],
  );
  return res.lastInsertRowId as number;
}

export function updateTotalBeli(id: number, tambah: number) {
  const db = getDB();
  try {
    db.runSync(
      `UPDATE pelanggan SET total_beli = total_beli + ? WHERE id = ?`,
      [tambah, id],
    );
  } catch {}
}
