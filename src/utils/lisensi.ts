import AsyncStorage from "@react-native-async-storage/async-storage";

// Posisi digit yang diambil jadi kode aktivasi (0-indexed)
// Dari 20 digit, ambil posisi ke-2, 6, 10, 14, 18 → 5 digit kode
const ACTIVATION_POSITIONS = [2, 6, 10, 14, 18];

// Karakter yang dipakai untuk serial (mudah dibaca, tanpa 0/O/I/l)
const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

// Generate serial number 20 digit random
export function generateSerial(): string {
  let serial = "";
  for (let i = 0; i < 20; i++) {
    serial += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return serial;
}

// Format serial jadi XXXX-XXXX-XXXX-XXXX-XXXX (lebih mudah dibaca)
export function formatSerial(serial: string): string {
  return serial.match(/.{1,4}/g)?.join("-") || serial;
}

// Ambil kode aktivasi dari serial (5 digit dari posisi tetap)
export function getActivationCode(serial: string): string {
  return ACTIVATION_POSITIONS.map((pos) => serial[pos]).join("");
}

// Simpan serial ke storage
export async function saveSerial(serial: string, identifier: string) {
  await AsyncStorage.setItem("kasirku_serial", serial);
  await AsyncStorage.setItem("kasirku_identifier", identifier);
  await AsyncStorage.setItem("kasirku_status", "pending");
}

// Aktivasi: cocokkan kode yang diinput dengan kode dari serial tersimpan
export async function aktivasiLisensi(inputCode: string): Promise<boolean> {
  const serial = await AsyncStorage.getItem("kasirku_serial");
  if (!serial) return false;

  const kodeBenar = getActivationCode(serial);
  const inputUpper = inputCode.toUpperCase().trim();

  if (inputUpper === kodeBenar) {
    await AsyncStorage.setItem("kasirku_status", "aktif");
    return true;
  }
  return false;
}

// Cek apakah sudah aktif
export async function cekLisensi(): Promise<"aktif" | "pending" | "baru"> {
  const status = await AsyncStorage.getItem("kasirku_status");
  if (status === "aktif") return "aktif";
  if (status === "pending") return "pending";
  return "baru";
}

// Format pesan WA untuk dikirim ke penjual
export function formatPesanWA(
  serial: string,
  identifier: string,
  namaToko?: string,
): string {
  const formatted = formatSerial(serial);
  return (
    `Halo, saya ingin mengaktifkan *Kasir WarungKu*\n\n` +
    `*Identitas:* ${identifier}\n` +
    (namaToko ? `*Nama Toko:* ${namaToko}\n` : "") +
    `*Serial Number:*\n\`${formatted}\`\n\n` +
    `Mohon bantu berikan kode aktivasi. Terima kasih 🙏`
  );
}
