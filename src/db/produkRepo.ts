import { getDB } from './database';

export interface Produk {
  id: number;
  nama: string;
  harga: number;
  harga_modal: number;
  stok: number;
  stok_minimum: number;
  kategori_id: number;
  kategori_nama?: string;
  barcode?: string;
  satuan: string;
  aktif: number;
  gambar?: string;
  is_konsinyasi?: number;
  konsinyor_id?: number;
  // ── BARU: Grosir ──────────────────────────────────────────────────────────
  // Semua optional — produk lama di DB tidak punya kolom ini (default 0)
  harga_grosir?: number;
  min_grosir?: number;
  aktif_grosir?: number;
}

export interface Kategori {
  id: number;
  nama: string;
}

export function getAllProduk(search = '', katId?: number): Produk[] {
  const db = getDB();
  let sql = `SELECT p.*, k.nama as kategori_nama FROM produk p LEFT JOIN kategori k ON p.kategori_id=k.id WHERE p.aktif=1`;
  const args: any[] = [];
  if (search) {
    // FIX: search by nama ATAU barcode
    sql += ' AND (p.nama LIKE ? OR p.barcode LIKE ?)';
    args.push(`%${search}%`, `%${search}%`);
  }
  if (katId && katId > 1) {
    sql += ' AND p.kategori_id=?';
    args.push(katId);
  }
  sql += ' ORDER BY p.nama ASC';
  return db.getAllSync(sql, args);
}

export function getProdukById(id: number): Produk | null {
  return (
    getDB().getFirstSync(
      'SELECT p.*, k.nama as kategori_nama FROM produk p LEFT JOIN kategori k ON p.kategori_id=k.id WHERE p.id=?',
      [id],
    ) ?? null
  );
}

export function tambahProduk(
  d: Omit<Produk, 'id' | 'aktif' | 'kategori_nama'>,
): void {
  getDB().runSync(
    `INSERT INTO produk
 (
   nama,
   harga,
   harga_modal,
   stok,
   stok_minimum,
   kategori_id,
   barcode,
   satuan,
   gambar,
   is_konsinyasi,
   konsinyor_id,
   harga_grosir,
   min_grosir,
   aktif_grosir
 )
 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      d.nama,
      d.harga,
      d.harga_modal,
      d.stok,
      d.stok_minimum,
      d.kategori_id,
      d.barcode ?? null,
      d.satuan,
      d.gambar ?? null,

      // KONSINYASI
      d.is_konsinyasi ?? 0,
      d.konsinyor_id ?? null,

      // GROSIR
      d.harga_grosir ?? 0,
      d.min_grosir ?? 0,
      d.aktif_grosir ?? 0,
    ],
  );
}

export function updateProduk(id: number, d: Partial<Produk>): void {
  getDB().runSync(
    `UPDATE produk SET
  nama=?,
  harga=?,
  harga_modal=?,
  stok=?,
  stok_minimum=?,
  kategori_id=?,
  barcode=?,
  satuan=?,
  gambar=?,
  is_konsinyasi=?,
  konsinyor_id=?,
  harga_grosir=?,
  min_grosir=?,
  aktif_grosir=?
WHERE id=?`,
    [
      d.nama ?? '',
      d.harga ?? 0,
      d.harga_modal ?? 0,
      d.stok ?? 0,
      d.stok_minimum ?? 5,
      d.kategori_id ?? 1,
      d.barcode ?? null,
      d.satuan ?? 'pcs',
      d.gambar ?? null,
      d.is_konsinyasi ?? 0,
      d.konsinyor_id ?? null,
      // Grosir — pertahankan nilai lama jika tidak dikirim
      d.harga_grosir ?? 0,
      d.min_grosir ?? 0,
      d.aktif_grosir ?? 0,
      id,
    ],
  );
}

// ── GROSIR BERTINGKAT ──────────────────────────────────────────────────────
// Jadicuan Developer
export interface GrosirTier {
  id: number;
  produk_id: number;
  min_qty: number;
  harga: number;
}

export function getGrosirTiers(produkId: number): GrosirTier[] {
  return getDB().getAllSync(
    `SELECT id, produk_id, min_qty, harga
     FROM produk_grosir
     WHERE produk_id = ?
     ORDER BY min_qty ASC`,
    [produkId],
  ) as GrosirTier[];
}

export function tambahGrosirTier(
  produkId: number,
  minQty: number,
  harga: number,
): void {
  getDB().runSync(
    `INSERT INTO produk_grosir (produk_id, min_qty, harga)
     VALUES (?, ?, ?)`,
    [produkId, minQty, harga],
  );
}

export function updateGrosirTier(
  id: number,
  minQty: number,
  harga: number,
): void {
  getDB().runSync(
    `UPDATE produk_grosir
     SET min_qty = ?, harga = ?
     WHERE id = ?`,
    [minQty, harga, id],
  );
}

export function hapusGrosirTier(id: number): void {
  getDB().runSync(
    `DELETE FROM produk_grosir
     WHERE id = ?`,
    [id],
  );
}
export function hapusProduk(id: number): void {
  getDB().runSync('UPDATE produk SET aktif=0 WHERE id=?', [id]);
}

export function updateStok(id: number, delta: number): void {
  getDB().runSync('UPDATE produk SET stok=MAX(0,stok+?) WHERE id=?', [
    delta,
    id,
  ]);
}

export function updateStokProduk(id: number, stokBaru: number) {
  getDB().runSync(`UPDATE produk SET stok=? WHERE id=?`, [stokBaru, id]);
}

export function getProdukMenipis(): Produk[] {
  return getDB().getAllSync(
    `SELECT p.*, k.nama as kategori_nama
     FROM produk p
     LEFT JOIN kategori k ON k.id = p.kategori_id
     WHERE p.aktif=1 AND p.stok <= p.stok_minimum
     GROUP BY p.nama
     ORDER BY p.stok ASC`,
  );
}

export function getAllKategori(): Kategori[] {
  const db = getDB();
  // FIX: hapus logika DELETE di sini — tidak boleh hapus kategori setiap getAllKategori dipanggil
  // Pembersihan kategori lama (tanpa emoji) hanya dilakukan sekali di initDB (first run)
  return db.getAllSync('SELECT * FROM kategori ORDER BY id ASC');
}

export function getPengaturan(): Record<string, string> {
  const rows: any[] = getDB().getAllSync('SELECT * FROM pengaturan');
  const map: Record<string, string> = {};
  rows.forEach((r: any) => {
    map[r.key] = r.value;
  });
  return map;
}

export function setPengaturan(key: string, value: string): void {
  getDB().runSync(
    'INSERT OR REPLACE INTO pengaturan (key,value) VALUES (?,?)',
    [key, value],
  );
}

export function tambahKategori(nama: string): number {
  const result = getDB().runSync(`INSERT INTO kategori (nama) VALUES (?)`, [
    nama.trim(),
  ]);
  return result.lastInsertRowId;
}

export function hapusKategori(id: number) {
  const db = getDB();
  db.runSync(`UPDATE produk SET kategori_id=1 WHERE kategori_id=?`, [id]);
  db.runSync(`DELETE FROM kategori WHERE id=? AND id > 1`, [id]);
}

// ── BARU: Helper grosir ────────────────────────────────────────────────────
// Dipanggil dari KasirScreen saat qty berubah.
// Return harga yang seharusnya dipakai berdasarkan qty.

// Function Harga Grosir diperbarui untuk mendukung grosir bertingkat. Jika ada harga grosir bertingkat, maka akan dipakai. Jika tidak, akan fallback ke grosir lama. Jika tidak ada grosir sama sekali, maka harga normal akan dipakai.
// Jadicuan Developer
export function hitungHargaGrosir(produk: Produk, qty: number): number {
  // 1. Cek grosir bertingkat terlebih dahulu
  const hargaBertingkat = getHargaGrosirBertingkat(produk.id, qty);

  if (hargaBertingkat !== null && hargaBertingkat > 0) {
    return hargaBertingkat;
  }

  // 2. Fallback ke grosir lama
  if (
    produk.aktif_grosir === 1 &&
    (produk.harga_grosir ?? 0) > 0 &&
    (produk.min_grosir ?? 0) > 0 &&
    qty >= (produk.min_grosir ?? 0)
  ) {
    return produk.harga_grosir!;
  }

  // 3. Tidak ada grosir
  return produk.harga;
}
{
  /* 
export function hitungHargaGrosir(produk: Produk, qty: number): number {
  if (
    produk.aktif_grosir === 1 &&
    (produk.harga_grosir ?? 0) > 0 &&
    (produk.min_grosir ?? 0) > 0 &&
    qty >= (produk.min_grosir ?? 0)
  ) {
    return produk.harga_grosir!;
  }
  return produk.harga;
}
*/
}
// Cek apakah produk punya grosir aktif (untuk tampilan badge di kasir)
export function isGrosirAktif(produk: Produk): boolean {
  return (
    produk.aktif_grosir === 1 &&
    (produk.harga_grosir ?? 0) > 0 &&
    (produk.min_grosir ?? 0) > 0
  );
}

// ── GROSIR BERTINGKAT ──────────────────────────────────────────────────────
// Mengambil harga grosir berdasarkan qty.
// Tier dengan min_qty terbesar yang masih <= qty akan dipakai.
// Jadicuan Developer,

export function getHargaGrosirBertingkat(
  produkId: number,
  qty: number,
): number | null {
  try {
    const row = getDB().getFirstSync(
      `SELECT harga
       FROM produk_grosir
       WHERE produk_id = ?
         AND min_qty <= ?
       ORDER BY min_qty DESC
       LIMIT 1`,
      [produkId, qty],
    ) as { harga: number } | null;

    return row?.harga ?? null;
  } catch {
    return null;
  }
}

// ── TOTAL NILAI AKTIVA ──────────────────────────────────────────────────────
// Mengambil total nilai aset berdasarkan harga modal dan stok.
// Jadicuan Developer,
export function getTotalAssetValue(katId?: number): number {
  try {
    const db = getDB();

    let sql = `
      SELECT COALESCE(SUM(harga_modal * stok), 0) AS total
      FROM produk
      WHERE aktif = 1
    `;

    const args: any[] = [];

    if (katId && katId > 1) {
      sql += ` AND kategori_id = ?`;
      args.push(katId);
    }

    const row = db.getFirstSync(sql, args) as { total: number } | null;

    return row?.total ?? 0;
  } catch {
    return 0;
  }
}
