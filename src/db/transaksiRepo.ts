import { getDB } from './database';
import { updateKonsinyasiDariTransaksi } from './konsinyasiRepo';
import { updateStok } from './produkRepo';

export interface TrxItem {
  produk_id: number;
  nama_produk: string;
  harga: number;
  harga_modal?: number;
  qty: number;
  subtotal: number;
}

export interface Transaksi {
  id: number;
  no_trx: string;
  subtotal: number;
  diskon: number;
  total: number;
  bayar: number;
  kembalian: number;
  metode_bayar: string;
  waktu: string;
}

function noTrx(): string {
  const d = new Date();
  const p = (n: number) => n.toString().padStart(2, '0');
  return (
    'TRX' +
    d.getFullYear() +
    p(d.getMonth() + 1) +
    p(d.getDate()) +
    Date.now().toString().slice(-4)
  );
}

export function simpanTransaksi(
  items: TrxItem[],
  subtotal: number,
  diskon: number,
  total: number,
  bayar: number,
  metode: string,
  pelangganId: number | null = null,
  kasir: string = '',
  pajak: number = 0,
  pajakPersen: number = 0,
): string {
  const db = getDB();
  const no = noTrx();
  const kembalian = Math.max(0, bayar - total);

  const res = db.runSync(
    `INSERT INTO transaksi
    (no_trx, subtotal, diskon, diskon_nominal, total, bayar, kembalian, metode_bayar, pelanggan_id, kasir, pajak, pajak_persen)
   VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      no,
      subtotal,
      diskon,
      diskon,
      total,
      bayar,
      kembalian,
      metode,
      pelangganId,
      kasir,
      pajak,
      pajakPersen,
    ],
  );
  const trxId = res.lastInsertRowId;

  items.forEach((item) => {
    db.runSync(
      `INSERT INTO transaksi_item
         (transaksi_id,produk_id,nama_produk,harga,qty,subtotal,harga_modal)
       VALUES (?,?,?,?,?,?,?)`,
      [
        trxId,
        item.produk_id,
        item.nama_produk,
        item.harga,
        item.qty,
        item.subtotal,
        item.harga_modal ?? 0,
      ],
    );
    updateStok(item.produk_id, -item.qty);
    try {
      updateKonsinyasiDariTransaksi(item.produk_id, item.qty);
    } catch {}
  });

  return no;
}

// ── Migration: isi harga_modal di transaksi_item LAMA ────────────────────────
// Root cause profit tidak sinkron:
// Transaksi yang dibuat SEBELUM kolom harga_modal ditambahkan → harga_modal = 0
// → profit = 0 meskipun produk sudah punya harga_modal.
//
// Fungsi ini mengisi ulang harga_modal dari produk.harga_modal untuk semua
// item lama yang masih 0. Aman dipanggil berulang — hanya update yang perlu.
export function migrateHargaModalTransaksiItem(): void {
  try {
    getDB().execSync(`
      UPDATE transaksi_item
      SET harga_modal = (
        SELECT p.harga_modal
        FROM produk p
        WHERE p.id = transaksi_item.produk_id
          AND p.harga_modal > 0
      )
      WHERE harga_modal = 0
        AND produk_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM produk p
          WHERE p.id = transaksi_item.produk_id
            AND p.harga_modal > 0
        )
    `);
  } catch (e) {
    console.warn('[transaksiRepo] migrateHargaModal error:', e);
  }
}

export function getTrxHarian(tgl?: string) {
  const d = new Date();
  const t =
    tgl ||
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return getDB().getAllSync(
    'SELECT * FROM transaksi WHERE date(waktu)=? ORDER BY waktu DESC',
    [t],
  ) as any[];
}

export function getRingkasan(tgl?: string) {
  const d = new Date();
  const t =
    tgl ||
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  // ── FIX: gunakan query SAMA dengan getRingkasanByRange ────────────────────
  // Sebelumnya getRingkasan pakai 3 query terpisah dengan filter berbeda
  // getRingkasanByRange pakai BETWEEN → hasilnya tidak sinkron
  // Sekarang: samakan jadi 1 query dengan BETWEEN agar Dashboard = Laporan
  return getRingkasanByRange(t, t);
}

export function getTerlaris(
  limit = 5,
  periode: 'hari' | 'bulan' | 'tahun' = 'hari',
): any[] {
  let filter = "date(t.waktu)=date('now','localtime')";
  if (periode === 'bulan')
    filter = "strftime('%Y-%m',t.waktu)=strftime('%Y-%m','now','localtime')";
  if (periode === 'tahun')
    filter = "strftime('%Y',t.waktu)=strftime('%Y','now','localtime')";
  return getDB().getAllSync(
    'SELECT ti.nama_produk, SUM(ti.qty) as qty, SUM(ti.subtotal) as omset FROM transaksi_item ti JOIN transaksi t ON ti.transaksi_id=t.id WHERE ' +
      filter +
      ' GROUP BY ti.nama_produk ORDER BY qty DESC LIMIT ?',
    [limit],
  );
}

// Add Function Get Terlaris By Date Range - Jadicuan Developer
// Get Terlaris By Date Range - Jadicuan Developer
export function getTerlarisByRange(dari: string, sampai: string): any[] {
  try {
    return getDB().getAllSync(
      `SELECT
        ti.nama_produk,
        SUM(ti.qty) as qty,
        SUM(ti.subtotal) as omset
       FROM transaksi_item ti
       JOIN transaksi t ON ti.transaksi_id = t.id
       WHERE date(t.waktu) BETWEEN ? AND ?
       GROUP BY ti.nama_produk
       ORDER BY qty DESC`,
      [dari, sampai],
    ) as any[];
  } catch {
    return [];
  }
}

export function getOmset7Hari(
  kasir?: string,
): { tgl: string; omset: number }[] {
  const result: { tgl: string; omset: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    result.push({ tgl: `${y}-${m}-${day}`, omset: 0 });
  }
  try {
    let query = `SELECT date(waktu) as tgl, SUM(total) as omset
       FROM transaksi
       WHERE date(waktu) >= date('now', 'localtime', '-6 days')`;
    const params: any[] = [];
    if (kasir) {
      query += ` AND kasir = ?`;
      params.push(kasir);
    }
    query += ` GROUP BY date(waktu)`;
    const rows = getDB().getAllSync(query, params) as any[];
    rows.forEach((row) => {
      const idx = result.findIndex((r) => r.tgl === row.tgl);
      if (idx !== -1) result[idx].omset = row.omset;
    });
  } catch {}
  return result;
}

export function getTrxByMetode(tgl: string, metode?: string) {
  const db = getDB();
  const where =
    metode && metode !== 'semua'
      ? `WHERE date(t.waktu) = ? AND t.metode_bayar = ?`
      : `WHERE date(t.waktu) = ?`;
  const params = metode && metode !== 'semua' ? [tgl, metode] : [tgl];
  return db.getAllSync(
    `SELECT t.*,
      (SELECT SUM(qty) FROM transaksi_item WHERE transaksi_id=t.id) as qty
     FROM transaksi t ${where} ORDER BY t.waktu DESC`,
    params,
  );
}

export function getTrxByDateRange(
  dari: string,
  sampai: string,
  metode?: string,
  kasir?: string,
) {
  const db = getDB();
  let query = `
    SELECT t.*,
      (SELECT SUM(qty) FROM transaksi_item WHERE transaksi_id=t.id) as qty
    FROM transaksi t
    WHERE date(t.waktu) BETWEEN ? AND ?
  `;
  const params: any[] = [dari, sampai];
  if (metode && metode !== 'semua') {
    query += ` AND t.metode_bayar=?`;
    params.push(metode);
  }
  if (kasir) {
    query += ` AND t.kasir=?`;
    params.push(kasir);
  }
  query += ` ORDER BY t.waktu DESC`;
  try {
    return db.getAllSync(query, params);
  } catch {
    return [];
  }
}

export function getTrxDetail(trxId: number) {
  const db = getDB();
  try {
    return db.getAllSync(
      `SELECT ti.*,
              COALESCE(ti.harga_modal, p.harga_modal, 0) as harga_modal
       FROM transaksi_item ti
       LEFT JOIN produk p ON p.id = ti.produk_id
       WHERE ti.transaksi_id=?`,
      [trxId],
    );
  } catch {
    return [];
  }
}

export function hapusTransaksi(id: number) {
  const db = getDB();
  const items = db.getAllSync(
    `SELECT produk_id, qty FROM transaksi_item WHERE transaksi_id = ?`,
    [id],
  ) as { produk_id: number; qty: number }[];
  for (const item of items) {
    db.runSync(`UPDATE produk SET stok = stok + ? WHERE id = ?`, [
      item.qty,
      item.produk_id,
    ]);
  }
  db.runSync(`DELETE FROM transaksi_item WHERE transaksi_id = ?`, [id]);
  db.runSync(`DELETE FROM transaksi WHERE id = ?`, [id]);
}

// ── Profit per metode bayar ──────────────────────────────────────────────────
export function getProfitByMetode(
  dari: string,
  sampai: string,
  kasir?: string,
): Record<string, number> {
  const db = getDB();
  try {
    let query = `SELECT t.metode_bayar,
        COALESCE(SUM(
          (SELECT SUM(ti.qty * (ti.harga - COALESCE(ti.harga_modal, p.harga_modal, 0)))
           FROM transaksi_item ti
           LEFT JOIN produk p ON p.id = ti.produk_id
           WHERE ti.transaksi_id = t.id)
        ), 0) as profit
       FROM transaksi t
       WHERE date(t.waktu) BETWEEN ? AND ?`;
    const params: any[] = [dari, sampai];
    if (kasir) {
      query += ` AND t.kasir = ?`;
      params.push(kasir);
    }
    query += ` GROUP BY t.metode_bayar`;
    const rows = db.getAllSync<any>(query, params);
    const result: Record<string, number> = {};
    rows.forEach((r) => {
      result[r.metode_bayar] = r.profit || 0;
    });
    return result;
  } catch {
    return {};
  }
}

export function getRingkasanByRange(
  dari: string,
  sampai: string,
  kasir?: string,
) {
  const db = getDB();
  try {
    const params: any[] = [dari, sampai];
    let kasirWhere = '';
    if (kasir) {
      kasirWhere = ` AND t.kasir = ?`;
      params.push(kasir);
    }
    const row = db.getFirstSync<any>(
      `SELECT
    COUNT(*) as trx,
    COALESCE(SUM(total),0) as omset,
    COALESCE(SUM(CASE WHEN diskon_nominal > 0 THEN diskon_nominal ELSE diskon END),0) as diskon,
    COALESCE(SUM(
      (SELECT SUM(ti.qty * (ti.harga - COALESCE(ti.harga_modal, p.harga_modal, 0)))
       FROM transaksi_item ti
       LEFT JOIN produk p ON p.id=ti.produk_id
       WHERE ti.transaksi_id=t.id)
    ),0) as profit
  FROM transaksi t
  WHERE date(t.waktu) BETWEEN ? AND ?${kasirWhere}`,
      params,
    );
    // Hitung qty terpisah karena butuh JOIN ke transaksi_item
    const qtyParams: any[] = [dari, sampai];
    let qtyKasirWhere = '';
    if (kasir) {
      qtyKasirWhere = ` AND t.kasir = ?`;
      qtyParams.push(kasir);
    }
    const qtyRow = db.getFirstSync<any>(
      `SELECT COALESCE(SUM(ti.qty), 0) as qty
       FROM transaksi_item ti
       JOIN transaksi t ON t.id = ti.transaksi_id
       WHERE date(t.waktu) BETWEEN ? AND ?${qtyKasirWhere}`,
      qtyParams,
    );
    return {
      trx: row?.trx || 0,
      omset: row?.omset || 0,
      diskon: row?.diskon || 0,
      profit: row?.profit || 0,
      qty: qtyRow?.qty || 0,
    };
  } catch {
    return { trx: 0, omset: 0, diskon: 0, profit: 0, qty: 0 };
  }
}
