// src/utils/printer.ts
import {
  BluetoothManager,
  BluetoothEscposPrinter,
} from "@vardrz/react-native-bluetooth-escpos-printer";

const BM = BluetoothManager as any;
const BEP = BluetoothEscposPrinter as any;

// Simpan address terakhir untuk auto-reconnect
let _lastAddr: string | null = null;

// ── Scan paired + nearby devices ──────────────────────────────────────────────
export async function getPairedPrinters(): Promise<any[]> {
  try {
    // Cek bluetooth aktif dulu
    let enabled = false;
    try {
      enabled = await BM.isBluetoothEnabled();
    } catch {
      enabled = false;
    }

    if (!enabled) {
      try {
        await BM.enableBluetooth();
        // Tunggu sebentar setelah enable
        await new Promise((r) => setTimeout(r, 1500));
      } catch {
        throw new Error(
          "Bluetooth tidak aktif. Aktifkan Bluetooth di HP kamu dulu.",
        );
      }
    }

    // scanDevices kadang return string, object, atau throw
    let result: any = { paired: [], found: [] };
    try {
      const s = await BM.scanDevices();
      result = typeof s === "string" ? JSON.parse(s) : s;
    } catch (scanErr: any) {
      // scanDevices gagal — coba ambil paired saja lewat cara lain
      console.warn("scanDevices gagal, coba fallback:", scanErr);
      try {
        // Beberapa versi library punya getDevicesDiscovered
        const s2 = await BM.getDevicesDiscovered?.();
        if (s2) result = typeof s2 === "string" ? JSON.parse(s2) : s2;
      } catch {
        // Fallback terakhir: return array kosong dengan pesan jelas
        throw new Error(
          "Gagal scan perangkat Bluetooth.\n\nPastikan:\n• Bluetooth sudah aktif\n• Izin Bluetooth & Lokasi sudah diberikan\n• Printer sudah di-pair di Settings HP",
        );
      }
    }

    const parse = (d: any) => {
      try {
        return typeof d === "string" ? JSON.parse(d) : d;
      } catch {
        return d;
      }
    };

    const paired = Array.isArray(result.paired) ? result.paired.map(parse) : [];
    const found = Array.isArray(result.found) ? result.found.map(parse) : [];
    const all = [...paired, ...found];

    // Deduplicate by address
    const seen = new Set();
    return all.filter((d) => {
      const addr = d?.inner_mac_address || d?.address || d?.id;
      if (!addr || seen.has(addr)) return false;
      seen.add(addr);
      return true;
    });
  } catch (e: any) {
    console.warn("getPairedPrinters error:", e);
    throw e; // lempar ke UI supaya Alert tampil pesan yang jelas
  }
}

// ── Connect ───────────────────────────────────────────────────────────────────
export async function connectPrinter(address: string): Promise<void> {
  const MAX_RETRY = 3;
  let lastError: any = null;

  for (let i = 0; i < MAX_RETRY; i++) {
    try {
      await BM.connect(address);
      _lastAddr = address;
      return; // sukses, keluar
    } catch (e: any) {
      const msg = (e?.message || "").toLowerCase();

      // Kalau "already connected" → anggap sukses
      if (
        msg.includes("already") ||
        msg.includes("connected") ||
        msg.includes("duplicate")
      ) {
        _lastAddr = address;
        return;
      }

      lastError = e;
      console.warn(`connectPrinter attempt ${i + 1} gagal:`, msg);

      // Tunggu sebelum retry (makin lama tiap percobaan)
      if (i < MAX_RETRY - 1) {
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
      }
    }
  }

  // Semua retry gagal
  const errMsg = lastError?.message || "Unknown error";
  throw new Error(
    `Gagal terhubung ke printer setelah ${MAX_RETRY}x percobaan.\n\n` +
      `Error: ${errMsg}\n\n` +
      `Pastikan:\n` +
      `• Printer menyala & tidak sleep\n` +
      `• Bluetooth HP aktif\n` +
      `• Printer sudah di-pair di Settings\n` +
      `• Tidak ada HP lain yang sedang konek ke printer ini`,
  );
}

// ── Disconnect — safe, tidak throw ───────────────────────────────────────────
export async function disconnectPrinter(): Promise<void> {
  _lastAddr = null;
  // Skip BM.disconnect — signature berbeda per versi dan sering crash
  // State lokal sudah di-reset, printer akan putus sendiri
}

// ── Auto-reconnect sebelum print ──────────────────────────────────────────────
async function ensureConnected(address: string): Promise<void> {
  try {
    await BM.connect(address);
  } catch (e: any) {
    const msg = (e?.message || "").toLowerCase();
    // "already connected" = OK
    if (
      msg.includes("already") ||
      msg.includes("connected") ||
      msg.includes("duplicate")
    ) {
      return;
    }

    // Tunggu 1 detik lalu retry sekali lagi
    await new Promise((r) => setTimeout(r, 1000));
    try {
      await BM.connect(address);
    } catch (e2: any) {
      const msg2 = (e2?.message || "").toLowerCase();
      if (msg2.includes("already") || msg2.includes("connected")) return;
      throw new Error("Printer tidak bisa dihubungkan: " + e2?.message);
    }
  }
}

// ── Helper col layout ─────────────────────────────────────────────────────────
function col(left: string, right: string, width = 32): string {
  const pad = width - right.length;
  return left.substring(0, Math.max(0, pad)).padEnd(Math.max(0, pad)) + right;
}

// ── Print Struk ───────────────────────────────────────────────────────────────
export interface StrukParams {
  namaToko: string;
  alamat?: string;
  noHp?: string;
  footer?: string;
  noTrx: string;
  waktu: string;
  kasir?: string;
  metode: string;
  items: {
    nama_produk: string;
    qty: number;
    harga: number;
    subtotal: number;
  }[];
  subtotal: number;
  diskon: number;
  pajak?: number;
  pajakPersen?: number;
  total: number;
  bayar: number;
  kembalian: number;
}

export async function printStruk(
  p: StrukParams,
  address?: string,
): Promise<void> {
  // Gunakan address yang diberikan atau address terakhir
  const addr = address || _lastAddr;

  // Auto-reconnect sebelum print
  if (addr) {
    await ensureConnected(addr);
    _lastAddr = addr;
  }

  const d = new Date(p.waktu);
  const tgl = d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const jam = d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  try {
    // Header toko — center
    await BEP.printerAlign(BEP.ALIGN.CENTER);
    await BEP.printText(p.namaToko + "\n\r", { widthtimes: 1, heigthtimes: 1 });
    if (p.alamat) await BEP.printText(p.alamat + "\n\r", {});
    if (p.noHp) await BEP.printText(p.noHp + "\n\r", {});
    await BEP.printText("--------------------------------\n\r", {});

    // Info transaksi — left
    await BEP.printerAlign(BEP.ALIGN.LEFT);
    await BEP.printText(`No    : ${p.noTrx}\n\r`, {});
    await BEP.printText(`Tgl   : ${tgl}\n\r`, {});
    await BEP.printText(`Jam   : ${jam}\n\r`, {});
    await BEP.printText(`Kasir : ${p.kasir || "Admin"}\n\r`, {});
    await BEP.printText(`Metode: ${p.metode.toUpperCase()}\n\r`, {});
    await BEP.printText("--------------------------------\n\r", {});

    // Items — pakai printText biasa (printColumn sering bermasalah)
    for (const item of p.items) {
      // Nama produk
      await BEP.printerAlign(BEP.ALIGN.LEFT);

      await BEP.printText(`${item.nama_produk}\n\r`, {});

      // Detail qty x harga = subtotal
      const left = `${item.qty} x Rp${item.harga.toLocaleString("id-ID")}`;
      const right = `Rp${item.subtotal.toLocaleString("id-ID")}`;

      const detail = left.padEnd(30 - right.length, " ") + right;

      await BEP.printText(detail + "\n\r", {});

      // Spasi kecil biar lega
      await BEP.printText("\n\r", {});
    }

    await BEP.printText("--------------------------------\n\r", {});

    // Summary
    await BEP.printerAlign(BEP.ALIGN.LEFT);
    await BEP.printText(
      col("Subtotal", `Rp${p.subtotal.toLocaleString("id-ID")}`) + "\n\r",
      {},
    );

    if (p.diskon > 0) {
      await BEP.printText(
        col("Diskon", `-Rp${p.diskon.toLocaleString("id-ID")}`) + "\n\r",
        {},
      );
    }

    if ((p.pajak ?? 0) > 0) {
      await BEP.printText(
        col(
          `Pajak (${p.pajakPersen ?? 0}%)`,
          `Rp${(p.pajak ?? 0).toLocaleString("id-ID")}`,
        ) + "\n\r",
        {},
      );
    }

    await BEP.printText(
      col("TOTAL", `Rp${p.total.toLocaleString("id-ID")}`) + "\n\r",
      { widthtimes: 1, heigthtimes: 1 },
    );

    if (p.metode === "tunai") {
      await BEP.printText(
        col("Bayar", `Rp${p.bayar.toLocaleString("id-ID")}`) + "\n\r",
        {},
      );
      await BEP.printText(
        col("Kembali", `Rp${p.kembalian.toLocaleString("id-ID")}`) + "\n\r",
        {},
      );
    }

    // Footer
    await BEP.printText("--------------------------------\n\r", {});
    await BEP.printerAlign(BEP.ALIGN.CENTER);
    await BEP.printText((p.footer || "Terima kasih!") + "\n\r", {});

    // Feed paper
    await BEP.printText("\n\r\n\r\n\r", {});
  } catch (e: any) {
    const msg = e?.message || "Gagal cetak";

    // Kalau COMMAND_NOT_FOUND → printer putus, coba reconnect 1x
    if (
      msg.includes("COMMAND_NOT_FOUND") ||
      msg.includes("not connected") ||
      msg.includes("not open")
    ) {
      if (addr) {
        try {
          await BM.connect(addr);
          // Retry print sekali lagi (rekursif tapi max 1x karena tidak pass addr)
          await printStruk(p);
          return;
        } catch {
          throw new Error(
            "Printer terputus. Sudah dicoba reconnect tapi gagal.\n\nPastikan printer menyala dan coba lagi.",
          );
        }
      }
    }

    throw new Error(msg);
  }
}
