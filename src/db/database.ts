import * as SQLite from "expo-sqlite";

let _db: SQLite.SQLiteDatabase | null = null;

export function getDB(): SQLite.SQLiteDatabase {
  if (!_db) {
    console.log("[DB] opening database...");
    _db = SQLite.openDatabaseSync("kasirku.db");
    console.log("[DB] database opened");
  }
  return _db;
}

export async function initDB(): Promise<void> {
  console.log("[DB] initDB START");
  const db = getDB();

  // ── Tabel utama ───────────────────────────────────────────────────────────
  db.execSync(`
    CREATE TABLE IF NOT EXISTS pelanggan (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      nama       TEXT NOT NULL,
      no_hp      TEXT,
      alamat     TEXT,
      total_beli INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS pengaturan (
      key   TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS kategori (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS produk (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      nama          TEXT    NOT NULL,
      harga         INTEGER NOT NULL DEFAULT 0,
      harga_modal   INTEGER DEFAULT 0,
      stok          INTEGER DEFAULT 0,
      stok_minimum  INTEGER DEFAULT 5,
      kategori_id   INTEGER DEFAULT 1,
      barcode       TEXT,
      satuan        TEXT DEFAULT 'pcs',
      aktif         INTEGER DEFAULT 1,
      gambar        TEXT
    );

    CREATE TABLE IF NOT EXISTS transaksi (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      no_trx         TEXT UNIQUE NOT NULL,
      subtotal       INTEGER NOT NULL,
      diskon         INTEGER DEFAULT 0,
      diskon_nominal INTEGER DEFAULT 0,
      total          INTEGER NOT NULL,
      bayar          INTEGER DEFAULT 0,
      kembalian      INTEGER DEFAULT 0,
      metode_bayar   TEXT DEFAULT 'tunai',
      pelanggan_id   INTEGER,
      kasir          TEXT,
      catatan        TEXT,
      waktu          TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS transaksi_item (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      transaksi_id INTEGER NOT NULL,
      produk_id    INTEGER,
      nama_produk  TEXT NOT NULL,
      harga        INTEGER NOT NULL,
      qty          INTEGER NOT NULL,
      subtotal     INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lisensi (
      id        INTEGER PRIMARY KEY,
      kode      TEXT,
      nama_toko TEXT,
      aktif     INTEGER DEFAULT 0,
      tgl       TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      nama       TEXT NOT NULL,
      username   TEXT NOT NULL UNIQUE,
      pin        TEXT NOT NULL,
      role       TEXT NOT NULL DEFAULT 'kasir',
      aktif      INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS diskon (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      nama           TEXT NOT NULL,
      tipe           TEXT NOT NULL DEFAULT 'nominal',
      nilai          INTEGER NOT NULL DEFAULT 0,
      min_pembelian  INTEGER DEFAULT 0,
      aktif          INTEGER DEFAULT 1
    );
  `);

  // ── FIX: Kategori default HANYA diisi saat pertama kali (tabel kosong) ────
  // Sebelumnya pakai INSERT OR IGNORE dengan ID spesifik di setiap initDB →
  // kategori yang sudah dihapus user akan muncul lagi setiap app dibuka.
  //
  // Sekarang: cek apakah kategori "Semua" (id=1) sudah ada.
  // Kalau belum ada → ini first run → insert semua default.
  // Kalau sudah ada → skip, jangan sentuh kategori sama sekali.
  try {
    const semua = db.getFirstSync(
      `SELECT id FROM kategori WHERE id = 1 LIMIT 1`,
    ) as any;

    if (!semua) {
      // First run — insert semua kategori default
      db.execSync(`
        INSERT OR IGNORE INTO kategori (id, nama) VALUES
          (1,  'Semua'),
          (2,  '🚬 Rokok'),
          (3,  '🥤 Minuman'),
          (4,  '🍿 Snack & Cemilan'),
          (5,  '🍜 Makanan Instan'),
          (6,  '🌾 Sembako'),
          (7,  '🧂 Bumbu & Dapur'),
          (8,  '🧹 Kebutuhan Rumah Tangga'),
          (9,  '🪥 Perlengkapan Harian'),
          (10, '🛍️ Plastik & Kemasan'),
          (11, '📱 Layanan & Digital'),
          (12, '📦 Lainnya')
      `);
      console.log("[DB] kategori default inserted (first run)");
    } else {
      // Sudah ada → jangan insert apapun, hormati perubahan user
      console.log("[DB] kategori sudah ada, skip insert default");
    }
  } catch (e) {
    console.warn("[DB] kategori init error:", e);
  }

  // ── Migrasi kolom — aman untuk semua device (skip jika sudah ada) ─────────
  const migrations = [
    "ALTER TABLE produk ADD COLUMN gambar TEXT",
    "ALTER TABLE transaksi ADD COLUMN kasir TEXT",
    "ALTER TABLE transaksi ADD COLUMN diskon_nominal INTEGER DEFAULT 0",

    // PAJAK — transaksi lama otomatis 0
    "ALTER TABLE transaksi ADD COLUMN pajak INTEGER DEFAULT 0",
    "ALTER TABLE transaksi ADD COLUMN pajak_persen REAL DEFAULT 0",

    // PELANGGAN
    "ALTER TABLE transaksi ADD COLUMN pelanggan_id INTEGER DEFAULT NULL",

    // GROSIR
    "ALTER TABLE produk ADD COLUMN harga_grosir  INTEGER DEFAULT 0",
    "ALTER TABLE produk ADD COLUMN min_grosir    INTEGER DEFAULT 0",
    "ALTER TABLE produk ADD COLUMN aktif_grosir  INTEGER DEFAULT 0",

    "ALTER TABLE transaksi_item ADD COLUMN harga_modal INTEGER DEFAULT 0",

    // KONSINYASI
    "ALTER TABLE produk ADD COLUMN konsinyor_id INTEGER DEFAULT NULL",
    "ALTER TABLE produk ADD COLUMN is_konsinyasi INTEGER DEFAULT 0",
  ];

  migrations.forEach((sql) => {
    try {
      db.execSync(sql);
    } catch {
      /* kolom sudah ada */
    }
  });

  try {
    db.execSync(`
    UPDATE transaksi
    SET diskon_nominal = diskon
    WHERE diskon > 0 AND diskon_nominal = 0
  `);
  } catch (e) {
    console.warn("[DB] migrasi diskon_nominal error:", e);
  }

  // ── Migrasi owner dari PIN lama ───────────────────────────────────────────
  try {
    const ownerExists = db.getFirstSync(
      `SELECT id FROM users WHERE role='owner' LIMIT 1`,
    ) as any;
    if (!ownerExists) {
      const pinLama = db.getFirstSync(
        `SELECT value FROM pengaturan WHERE key='pin'`,
      ) as any;
      if (pinLama?.value) {
        db.runSync(
          `INSERT OR IGNORE INTO users (nama,username,pin,role) VALUES (?,?,?,?)`,
          ["Owner", "owner", pinLama.value, "owner"],
        );
      }
    }
  } catch (e) {
    console.warn("[DB] owner migration error:", e);
  }

  // ── Seed pengaturan default ───────────────────────────────────────────────
  [
    ["nama_toko", "Warung Saya"],
    ["alamat", ""],
    ["no_hp", ""],
    ["footer_struk", "Terima kasih atas kunjungan Anda!"],
    ["pajak_persen", "0"],
  ].forEach(([k, v]) => {
    try {
      db.runSync(`INSERT OR IGNORE INTO pengaturan (key,value) VALUES (?,?)`, [
        k,
        v,
      ]);
    } catch {}
  });

  console.log("[DB] initDB DONE");
}
