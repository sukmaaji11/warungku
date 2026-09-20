// src/db/konsinyasiRepo.ts
import { getDB } from "./database";

// ── Init Tables ───────────────────────────────────────────────────────────────
export function initKonsinyasiTables() {
  const db = getDB();
  db.execSync(`
    CREATE TABLE IF NOT EXISTS konsinyor (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      nama       TEXT NOT NULL,
      no_hp      TEXT DEFAULT '',
      alamat     TEXT DEFAULT '',
      catatan    TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS konsinyasi (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      konsinyor_id     INTEGER NOT NULL,
      produk_id        INTEGER,
      nama_produk      TEXT NOT NULL,
      qty_masuk        INTEGER NOT NULL DEFAULT 0,
      qty_terjual      INTEGER NOT NULL DEFAULT 0,
      qty_kembali      INTEGER NOT NULL DEFAULT 0,
      harga_jual       INTEGER NOT NULL DEFAULT 0,
      harga_konsinyasi INTEGER NOT NULL DEFAULT 0,
      tgl_masuk        TEXT DEFAULT (date('now','localtime')),
      status           TEXT NOT NULL DEFAULT 'aktif',
      catatan          TEXT DEFAULT '',
      created_at       TEXT DEFAULT (datetime('now','localtime'))
    );
  `);

  // Tambah kolom konsinyor_id ke produk jika belum ada
  try {
    db.execSync(
      `ALTER TABLE produk ADD COLUMN konsinyor_id INTEGER DEFAULT NULL`,
    );
  } catch {}
  try {
    db.execSync(
      `ALTER TABLE produk ADD COLUMN is_konsinyasi INTEGER DEFAULT 0`,
    );
  } catch {}
}

// ── KONSINYOR ──────────────────────────────────────────────────────────────────
export function getAllKonsinyor(): any[] {
  try {
    initKonsinyasiTables();
    return getDB().getAllSync(
      `SELECT k.*, COUNT(ks.id) as jumlah_produk,
              SUM(ks.qty_masuk * ks.harga_konsinyasi) as total_titipan,
              SUM(ks.qty_terjual * ks.harga_konsinyasi) as total_terjual
       FROM konsinyor k
       LEFT JOIN konsinyasi ks ON ks.konsinyor_id = k.id AND ks.status = 'aktif'
       GROUP BY k.id ORDER BY k.nama ASC`,
    ) as any[];
  } catch {
    return [];
  }
}

export function tambahKonsinyor(
  nama: string,
  no_hp: string,
  alamat: string,
  catatan: string,
): number {
  initKonsinyasiTables();
  const r = getDB().runSync(
    `INSERT INTO konsinyor (nama, no_hp, alamat, catatan) VALUES (?,?,?,?)`,
    [nama.trim(), no_hp.trim(), alamat.trim(), catatan.trim()],
  );
  return r.lastInsertRowId as number;
}

export function editKonsinyor(
  id: number,
  nama: string,
  no_hp: string,
  alamat: string,
  catatan: string,
) {
  getDB().runSync(
    `UPDATE konsinyor SET nama=?, no_hp=?, alamat=?, catatan=? WHERE id=?`,
    [nama.trim(), no_hp.trim(), alamat.trim(), catatan.trim(), id],
  );
}

export function hapusKonsinyor(id: number) {
  // Set konsinyasi terkait jadi tanpa konsinyor (jangan hapus data)
  getDB().runSync(
    `UPDATE konsinyasi SET status='selesai' WHERE konsinyor_id=?`,
    [id],
  );
  getDB().runSync(
    `UPDATE produk SET konsinyor_id=NULL, is_konsinyasi=0 WHERE konsinyor_id=?`,
    [id],
  );
  getDB().runSync(`DELETE FROM konsinyor WHERE id=?`, [id]);
}

// ── KONSINYASI ─────────────────────────────────────────────────────────────────
export function getAllKonsinyasi(konsinyor_id?: number): any[] {
  try {
    initKonsinyasiTables();
    const where = konsinyor_id ? `WHERE ks.konsinyor_id = ${konsinyor_id}` : "";
    return getDB().getAllSync(
      `SELECT ks.*, k.nama as nama_konsinyor, k.no_hp as hp_konsinyor,
              p.nama as nama_produk_db, p.stok as stok_produk
       FROM konsinyasi ks
       LEFT JOIN konsinyor k ON k.id = ks.konsinyor_id
       LEFT JOIN produk p ON p.id = ks.produk_id
       ${where}
       ORDER BY ks.status ASC, ks.created_at DESC`,
    ) as any[];
  } catch {
    return [];
  }
}

export function tambahKonsinyasi(data: {
  konsinyor_id: number;
  produk_id?: number;
  nama_produk: string;
  qty_masuk: number;
  harga_jual: number;
  harga_konsinyasi: number;
  tgl_masuk: string;
  catatan: string;
}): number {
  initKonsinyasiTables();

  const db = getDB();

  let produkId = data.produk_id;

  // ===========================================================
  // PRODUK BARU
  // ===========================================================
  if (!produkId) {
    const result = db.runSync(
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
        aktif,
        gambar,
        is_konsinyasi,
        konsinyor_id
      )
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        data.nama_produk,
        data.harga_jual,
        data.harga_konsinyasi,
        data.qty_masuk,
        5,
        1,
        null,
        "pcs",
        1,
        null,
        1,
        data.konsinyor_id,
      ],
    );

    produkId = result.lastInsertRowId as number;
  }

  // ===========================================================
  // PRODUK SUDAH ADA
  // ===========================================================
  else {
    db.runSync(
      `UPDATE produk
       SET
          stok = stok + ?,
          harga = ?,
          harga_modal = ?,
          is_konsinyasi = 1,
          konsinyor_id = ?
       WHERE id = ?`,
      [
        data.qty_masuk,
        data.harga_jual,
        data.harga_konsinyasi,
        data.konsinyor_id,
        produkId,
      ],
    );
  }

  // ===========================================================
  // SIMPAN KONSINYASI
  // ===========================================================
  const r = db.runSync(
    `INSERT INTO konsinyasi
    (
      konsinyor_id,
      produk_id,
      nama_produk,
      qty_masuk,
      harga_jual,
      harga_konsinyasi,
      tgl_masuk,
      catatan
    )
    VALUES (?,?,?,?,?,?,?,?)`,
    [
      data.konsinyor_id,
      produkId,
      data.nama_produk,
      data.qty_masuk,
      data.harga_jual,
      data.harga_konsinyasi,
      data.tgl_masuk,
      data.catatan,
    ],
  );

  return r.lastInsertRowId as number;
}

// ── Tambah stok konsinyasi saja (panggil ini dari UI "Tambah Stok") ───────────
// Lebih simpel dari editKonsinyasi — hanya tambah qty tanpa ubah field lain
export function tambahStokKonsinyasi(id: number, qty_tambah: number): void {
  const db = getDB();
  const ks = db.getFirstSync(
    `SELECT produk_id, qty_masuk FROM konsinyasi WHERE id=?`,
    [id],
  ) as any;
  if (!ks) return;

  // 1. Tambah qty_masuk di konsinyasi
  db.runSync(`UPDATE konsinyasi SET qty_masuk = qty_masuk + ? WHERE id = ?`, [
    qty_tambah,
    id,
  ]);

  // 2. Tambah stok produk — langsung sync
  if (ks.produk_id) {
    db.runSync(`UPDATE produk SET stok = stok + ? WHERE id = ?`, [
      qty_tambah,
      ks.produk_id,
    ]);
  }
}

export function hapusKonsinyasi(id: number) {
  const db = getDB();

  const item = db.getFirstSync(
    `SELECT produk_id, qty_masuk
     FROM konsinyasi
     WHERE id=?`,
    [id],
  ) as any;

  if (item?.produk_id) {
    db.runSync(
      `UPDATE produk
       SET stok = MAX(0, stok - ?)
       WHERE id=?`,
      [item.qty_masuk, item.produk_id],
    );

    const lain = db.getFirstSync(
      `SELECT COUNT(*) as total
       FROM konsinyasi
       WHERE produk_id=? AND id<>? AND status='aktif'`,
      [item.produk_id, id],
    ) as any;

    if (lain.total === 0) {
      db.runSync(
        `UPDATE produk
         SET
            is_konsinyasi=0,
            konsinyor_id=NULL
         WHERE id=?`,
        [item.produk_id],
      );
    }
  }

  db.runSync(`DELETE FROM konsinyasi WHERE id=?`, [id]);
}

export function updateQtyTerjual(konsinyasi_id: number, tambah_qty: number) {
  getDB().runSync(
    `UPDATE konsinyasi SET qty_terjual = qty_terjual + ? WHERE id = ?`,
    [tambah_qty, konsinyasi_id],
  );
}

// ── LAPORAN ────────────────────────────────────────────────────────────────────
export function getLaporanKonsinyasi(): any {
  try {
    const total = getDB().getFirstSync(
      `SELECT
        COUNT(*) as total_item,
        SUM(qty_masuk) as total_qty_masuk,
        SUM(qty_terjual) as total_qty_terjual,
        SUM(qty_masuk * harga_konsinyasi) as total_nilai_titipan,
        SUM(qty_terjual * harga_konsinyasi) as total_bagi_hasil,
        SUM(qty_terjual * (harga_jual - harga_konsinyasi)) as total_keuntungan
       FROM konsinyasi WHERE status = 'aktif'`,
    ) as any;
    return total || {};
  } catch {
    return {};
  }
}

export function getLaporanPerKonsinyor(): any[] {
  try {
    return getDB().getAllSync(
      `SELECT k.nama, k.no_hp,
              COUNT(ks.id) as jumlah_produk,
              SUM(ks.qty_terjual) as total_terjual,
              SUM(ks.qty_terjual * ks.harga_konsinyasi) as bagi_hasil,
              SUM(ks.qty_terjual * (ks.harga_jual - ks.harga_konsinyasi)) as keuntungan,
              SUM((ks.qty_masuk - ks.qty_terjual - ks.qty_kembali) * ks.harga_konsinyasi) as nilai_sisa
       FROM konsinyor k
       LEFT JOIN konsinyasi ks ON ks.konsinyor_id = k.id
       GROUP BY k.id ORDER BY bagi_hasil DESC`,
    ) as any[];
  } catch {
    return [];
  }
}

// Dipanggil dari simpanTransaksi — update otomatis qty terjual konsinyasi
export function updateKonsinyasiDariTransaksi(produk_id: number, qty: number) {
  try {
    const ks = getDB().getFirstSync(
      `SELECT id FROM konsinyasi WHERE produk_id=? AND status='aktif' ORDER BY created_at DESC LIMIT 1`,
      [produk_id],
    ) as any;
    if (ks?.id) {
      getDB().runSync(
        `UPDATE konsinyasi SET qty_terjual = qty_terjual + ? WHERE id = ?`,
        [qty, ks.id],
      );
    }
  } catch {}
}
