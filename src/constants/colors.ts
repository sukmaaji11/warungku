export const Colors = {
  // ── Primary (Deep Red) ───────────────────────
  // Merah kasir — dalam, hangat, saturated
  primary: "#B71C1C", // Material Red 900 — paling dalam
  primaryDark: "#7F0000", // gelap untuk pressed/header shadow
  primaryLight: "#FFEBEE", // background merah sangat muda (Material Red 50)
  primaryMuted: "rgba(183,28,28,0.10)",

  // ── Accent (Amber Gold) ──────────────────────
  // Amber natural partner untuk merah kasir (kasir bon, struk, dll)
  accent: "#FF8F00", // Amber 800
  accentLight: "#FFF8E1", // Amber 50

  // ── Semantic ─────────────────────────────────
  success: "#2E7D32", // Green 800
  successLight: "#E8F5E9",
  successBorder: "#A5D6A7",

  danger: "#D32F2F", // Red 700 — tetap dibedakan dari primary
  dangerLight: "#FFEBEE",
  dangerBorder: "#EF9A9A",

  warning: "#E65100", // Deep Orange 900
  warningLight: "#FBE9E7",
  warningBorder: "#FFAB91",

  info: "#1565C0", // Blue 800
  infoLight: "#E3F2FD",
  infoBorder: "#90CAF9",

  // ── Neutral ──────────────────────────────────
  white: "#FFFFFF",
  background: "#F9F5F5", // putih warm, bukan abu dingin
  card: "#FFFFFF",
  cardAlt: "#FDF6F6", // card dengan hint merah sangat halus

  // ── Text ─────────────────────────────────────
  text: "#212121", // hampir hitam
  textSecondary: "#424242",
  textMuted: "#757575",
  textLight: "#9E9E9E",
  textDisabled: "#BDBDBD",

  // ── Border ───────────────────────────────────
  border: "#EEEEEE",
  borderLight: "#F5F5F5",
  borderStrong: "#E0E0E0",

  // ── Special ──────────────────────────────────
  whatsapp: "#25D366",
  overlay: "rgba(0,0,0,0.5)",
  overlayLight: "rgba(0,0,0,0.3)",
};

export type ColorKey = keyof typeof Colors;
