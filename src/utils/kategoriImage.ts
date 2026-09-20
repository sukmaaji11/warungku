// src/utils/kategoriImage.ts

// Map nama kategori → emoji sebagai "gambar default"
const KATEGORI_EMOJI: Record<string, string> = {
  Makanan: "🍚",
  Minuman: "🥤",
  Snack: "🍿",
  Mie: "🍜",
  Roti: "🍞",
  Dapur: "🧂",
  Lainnya: "📦",
  Bumbu: "🌶️",
  Frozen: "🧊",
  Buah: "🍎",
  Sayur: "🥦",
  Susu: "🥛",
  Kopi: "☕",
  Rokok: "🚬",
  ATK: "✏️",
};

export function getKategoriEmoji(kategoriNama?: string): string {
  if (!kategoriNama) return "📦";
  // Cari exact match dulu
  if (KATEGORI_EMOJI[kategoriNama]) return KATEGORI_EMOJI[kategoriNama];
  // Cari partial match
  const key = Object.keys(KATEGORI_EMOJI).find((k) =>
    kategoriNama.toLowerCase().includes(k.toLowerCase()),
  );
  return key ? KATEGORI_EMOJI[key] : "📦";
}
