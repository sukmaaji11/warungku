import { getDB } from './database';

export interface PerformaAnalisis {
  omzet: number;
  transaksi: number;
  produkTerjual: number;
  rataTransaksi: number;
  keuntungan: number;
  margin: number;
}

export interface ProdukAnalisis {
  nama_produk: string;
  qty: number;
  omset: number;
}

export interface ProdukStokMenipis {
  id: number;
  nama: string;
  stok: number;
  stok_minimum: number;
  harga: number;
  harga_modal: number;
  satuan: string;
}

/**
 * Mengambil ringkasan performa berdasarkan rentang tanggal.
 * Format tanggal: YYYY-MM-DD
 */
export function getPerformaAnalisis(
  dari: string,
  sampai: string,
): PerformaAnalisis {
  const db = getDB();

  const row = db.getFirstSync<any>(
    `SELECT
       COUNT(*) AS transaksi,
       COALESCE(SUM(total), 0) AS omzet,
       COALESCE(SUM(
         (
           SELECT SUM(
             ti.qty * (
               ti.harga -
               COALESCE(NULLIF(ti.harga_modal, 0), p.harga_modal, 0)
             )
           )
           FROM transaksi_item ti
           LEFT JOIN produk p ON p.id = ti.produk_id
           WHERE ti.transaksi_id = t.id
         )
       ), 0) AS keuntungan,
       COALESCE((
         SELECT SUM(ti.qty)
         FROM transaksi_item ti
         JOIN transaksi tx ON tx.id = ti.transaksi_id
         WHERE date(tx.waktu) BETWEEN ? AND ?
       ), 0) AS produkTerjual
     FROM transaksi t
     WHERE date(t.waktu) BETWEEN ? AND ?`,
    [dari, sampai, dari, sampai],
  );

  const omzet = Number(row?.omzet ?? 0);
  const transaksi = Number(row?.transaksi ?? 0);
  const keuntungan = Number(row?.keuntungan ?? 0);

  return {
    omzet,
    transaksi,
    produkTerjual: Number(row?.produkTerjual ?? 0),
    rataTransaksi: transaksi > 0 ? omzet / transaksi : 0,
    keuntungan,
    margin: omzet > 0 ? (keuntungan / omzet) * 100 : 0,
  };
}

/**
 * Mengambil 5 produk terlaris dalam rentang tanggal.
 */
export function getTopProdukAnalisis(
  dari: string,
  sampai: string,
  limit = 5,
): ProdukAnalisis[] {
  return getDB().getAllSync(
    `SELECT
       ti.nama_produk,
       SUM(ti.qty) AS qty,
       SUM(ti.subtotal) AS omset
     FROM transaksi_item ti
     JOIN transaksi t ON t.id = ti.transaksi_id
     WHERE date(t.waktu) BETWEEN ? AND ?
     GROUP BY ti.nama_produk
     ORDER BY qty DESC, omset DESC
     LIMIT ?`,
    [dari, sampai, limit],
  ) as ProdukAnalisis[];
}

/**
 * Mengambil produk aktif yang stoknya sudah mencapai
 * atau berada di bawah batas stok minimum.
 *
 * Stok merupakan kondisi saat ini, bukan histori
 * stok pada periode analisis.
 */
export function getStokMenipisAnalisis(): ProdukStokMenipis[] {
  return getDB().getAllSync(
    `SELECT
       id,
       nama,
       stok,
       stok_minimum,
       harga,
       COALESCE(harga_modal, 0) AS harga_modal,
       satuan
     FROM produk
     WHERE aktif = 1
       AND stok <= stok_minimum
     ORDER BY stok ASC, nama ASC`,
  ) as ProdukStokMenipis[];
}

/**
 * Mengambil produk dengan kontribusi omzet terbesar.
 * Diurutkan berdasarkan omzet, bukan jumlah terjual.
 */
export function getProdukKontribusiAnalisis(
  dari: string,
  sampai: string,
  limit = 5,
): ProdukAnalisis[] {
  return getDB().getAllSync(
    `SELECT
       ti.nama_produk,
       SUM(ti.qty) AS qty,
       SUM(ti.subtotal) AS omset
     FROM transaksi_item ti
     JOIN transaksi t ON t.id = ti.transaksi_id
     WHERE date(t.waktu) BETWEEN ? AND ?
     GROUP BY ti.nama_produk
     ORDER BY omset DESC, qty DESC
     LIMIT ?`,
    [dari, sampai, limit],
  ) as ProdukAnalisis[];
}

export function getProdukKontribusiSebelumnyaAnalisis(
  dari: string,
  sampai: string,
  limit = 5,
): ProdukAnalisis[] {
  return getDB().getAllSync(
    `SELECT
       ti.nama_produk,
       SUM(ti.qty) AS qty,
       SUM(ti.subtotal) AS omset
     FROM transaksi_item ti
     JOIN transaksi t ON t.id = ti.transaksi_id
     WHERE date(t.waktu) BETWEEN ? AND ?
     GROUP BY ti.nama_produk
     ORDER BY omset DESC, qty DESC
     LIMIT ?`,
    [dari, sampai, limit],
  ) as ProdukAnalisis[];
}

/**
 * Mengambil produk aktif yang tidak memiliki penjualan
 * pada rentang tanggal yang dipilih.
 */
export function getProdukTidakTerjualAnalisis(dari: string, sampai: string) {
  return getDB().getAllSync(
    `SELECT
       p.id,
       p.nama,
       p.stok,
       p.stok_minimum,
       p.satuan
     FROM produk p
     WHERE p.aktif = 1
       AND NOT EXISTS (
         SELECT 1
         FROM transaksi_item ti
         JOIN transaksi t ON t.id = ti.transaksi_id
         WHERE ti.produk_id = p.id
           AND date(t.waktu) BETWEEN ? AND ?
       )
     ORDER BY p.nama ASC`,
    [dari, sampai],
  ) as {
    id: number;
    nama: string;
    stok: number;
    stok_minimum: number;
    satuan: string;
  }[];
}

export interface ProdukKecepatanPenjualan {
  nama_produk: string;
  qty: number;
  omset: number;
  stok: number;
  stok_minimum: number;
  satuan: string;
}

/**
 * Mengambil data stok dan penjualan seluruh produk aktif
 * selama rentang tanggal yang dipilih.
 */
export function getKecepatanPenjualanProduk(
  dari: string,
  sampai: string,
): ProdukKecepatanPenjualan[] {
  const db = getDB();

  return db.getAllSync<ProdukKecepatanPenjualan>(
    `SELECT
       p.nama AS nama_produk,
       COALESCE(SUM(ti.qty), 0) AS qty,
       COALESCE(SUM(ti.subtotal), 0) AS omset,
       p.stok AS stok,
       p.stok_minimum AS stok_minimum,
       p.satuan AS satuan
     FROM produk p
     LEFT JOIN transaksi_item ti
       ON ti.produk_id = p.id
     LEFT JOIN transaksi t
       ON t.id = ti.transaksi_id
       AND date(t.waktu) BETWEEN ? AND ?
     WHERE p.aktif = 1
       AND (
         ti.transaksi_id IS NULL
         OR t.id IS NOT NULL
       )
     GROUP BY
       p.id,
       p.nama,
       p.stok,
       p.stok_minimum,
       p.satuan
     ORDER BY qty ASC, p.nama ASC`,
    [dari, sampai],
  );
}

export interface PerbandinganPenjualanProduk {
  nama_produk: string;
  qty_sekarang: number;
  qty_sebelumnya: number;
  omset_sekarang: number;
  omset_sebelumnya: number;
}

export function getPerbandinganPenjualanProduk(
  dari: string,
  sampai: string,
  dariSebelumnya: string,
  sampaiSebelumnya: string,
): PerbandinganPenjualanProduk[] {
  return getDB().getAllSync(
    `WITH penjualan_sekarang AS (
      SELECT
        ti.nama_produk,
        SUM(ti.qty) AS qty,
        SUM(ti.subtotal) AS omset
      FROM transaksi_item ti
      JOIN transaksi t ON t.id = ti.transaksi_id
      WHERE date(t.waktu) BETWEEN ? AND ?
      GROUP BY ti.nama_produk
    ),
    penjualan_sebelumnya AS (
      SELECT
        ti.nama_produk,
        SUM(ti.qty) AS qty,
        SUM(ti.subtotal) AS omset
      FROM transaksi_item ti
      JOIN transaksi t ON t.id = ti.transaksi_id
      WHERE date(t.waktu) BETWEEN ? AND ?
      GROUP BY ti.nama_produk
    ),
    semua_produk AS (
      SELECT nama_produk FROM penjualan_sekarang
      UNION
      SELECT nama_produk FROM penjualan_sebelumnya
    )
    SELECT
      COALESCE(sekarang.nama_produk, sebelumnya.nama_produk)
        AS nama_produk,
      COALESCE(sekarang.qty, 0) AS qty_sekarang,
      COALESCE(sebelumnya.qty, 0) AS qty_sebelumnya,
      COALESCE(sekarang.omset, 0) AS omset_sekarang,
      COALESCE(sebelumnya.omset, 0) AS omset_sebelumnya
    FROM semua_produk produk
    LEFT JOIN penjualan_sekarang sekarang
      ON lower(trim(produk.nama_produk)) =
         lower(trim(sekarang.nama_produk))
    LEFT JOIN penjualan_sebelumnya sebelumnya
      ON lower(trim(produk.nama_produk)) =
         lower(trim(sebelumnya.nama_produk))
    ORDER BY qty_sekarang DESC, nama_produk ASC`,
    [dari, sampai, dariSebelumnya, sampaiSebelumnya],
  ) as PerbandinganPenjualanProduk[];
}
