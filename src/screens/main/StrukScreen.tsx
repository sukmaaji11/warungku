import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { formatRupiah } from "../../utils/format";
import { getPengaturan } from "../../db/produkRepo";
import { Colors } from "../../constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { printStruk, connectPrinter } from "../../utils/printer";
import { useAuthStore } from "../../store/authStore";

export default function StrukScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [printingBT, setPrintingBT] = useState(false);
  const { currentUser } = useAuthStore();

  const {
    noTrx,
    items,
    subtotal,
    diskon,
    pajak = 0,
    pajakPersen = 0,
    total,
    bayar,
    kembalian,
    metode,
    waktu,
  } = route.params;

  const settings = getPengaturan();
  const namaToko = settings.nama_toko || "Toko Saya";
  const alamat = settings.alamat || "";
  const noHp = settings.no_hp || "";
  const footer = settings.footer_struk || "Terima kasih atas kunjungan Anda!";

  const dtObj = new Date(waktu);
  const tanggal = dtObj.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const jam = dtObj.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const metodeLogo: Record<string, string> = {
    tunai: "💵",
    transfer: "📱",
    qris: "📲",
    hutang: "🕐",
  };

  // ── Generate HTML untuk PDF ──────────────────────────────────────────────
  const generateHTML = () => {
    const itemsHTML = items
      .map(
        (item: any) => `
      <tr>
        <td class="item-name">${item.nama_produk}</td>
        <td class="item-qty">${item.qty}x</td>
        <td class="item-price">${formatRupiah(item.harga)}</td>
        <td class="item-total">${formatRupiah(item.subtotal)}</td>
      </tr>
    `,
      )
      .join("");

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Courier New', Courier, monospace;
      background: #f0f0f0;
      display: flex;
      justify-content: center;
      padding: 20px;
    }

    .receipt {
      background: #fff;
      width: 320px;
      margin: 0 auto;
      padding: 0;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      position: relative;
    }

    /* Zig-zag atas */
    .receipt::before {
      content: '';
      display: block;
      height: 20px;
      background:
        radial-gradient(circle at 10px -5px, transparent 12px, #fff 13px) top left,
        radial-gradient(circle at 10px -5px, transparent 12px, #f0f0f0 13px) top left;
      background-size: 20px 20px;
      background-color: #f0f0f0;
    }

    /* Zig-zag bawah */
    .receipt::after {
      content: '';
      display: block;
      height: 20px;
      background:
        radial-gradient(circle at 10px 25px, transparent 12px, #fff 13px) bottom left,
        radial-gradient(circle at 10px 25px, transparent 12px, #f0f0f0 13px) bottom left;
      background-size: 20px 20px;
      background-color: #f0f0f0;
    }

    .receipt-inner {
      padding: 24px 24px 20px;
    }

    /* Header Toko */
    .store-header {
      text-align: center;
      padding-bottom: 16px;
      border-bottom: 2px dashed #ddd;
      margin-bottom: 16px;
    }

    .store-logo {
      font-size: 32px;
      margin-bottom: 8px;
    }

    .store-name {
      font-size: 20px;
      font-weight: 900;
      color: #1E3A5F;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }

    .store-info {
      font-size: 11px;
      color: #888;
      line-height: 1.6;
    }

    /* Invoice info */
    .invoice-section {
      margin-bottom: 14px;
      font-size: 11px;
    }

    .invoice-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    .invoice-label { color: #999; }
    .invoice-val { color: #333; font-weight: 700; }

    .divider-dash {
      border: none;
      border-top: 1px dashed #ccc;
      margin: 12px 0;
    }

    .divider-solid {
      border: none;
      border-top: 2px solid #1E3A5F;
      margin: 12px 0;
    }

    /* Items */
    .section-title {
      font-size: 10px;
      font-weight: 700;
      color: #999;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    .item-name {
      color: #222;
      font-weight: 700;
      padding: 4px 0;
      width: 45%;
    }

    .item-qty {
      color: #666;
      text-align: center;
      width: 10%;
      padding: 4px 2px;
    }

    .item-price {
      color: #666;
      text-align: right;
      width: 25%;
      padding: 4px 2px;
    }

    .item-total {
      color: #222;
      font-weight: 700;
      text-align: right;
      width: 20%;
      padding: 4px 0;
    }

    /* Summary */
    .sum-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      margin-bottom: 5px;
      color: #555;
    }

    .sum-val { font-weight: 600; color: #333; }
    .sum-diskon { color: #e74c3c; font-weight: 600; }

    /* Total box */
    .total-box {
      background: #EFF6FF;
      border-radius: 10px;
      padding: 12px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 10px 0;
    }

    .total-label {
      font-size: 12px;
      font-weight: 700;
      color: #1E3A5F;
    }

    .total-val {
      font-size: 22px;
      font-weight: 900;
      color: #1E3A5F;
    }

    /* Kembalian */
    .kembalian-box {
      background: #F0FDF4;
      border-radius: 8px;
      padding: 8px 12px;
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      font-size: 12px;
    }

    .kembalian-label { color: #16A34A; font-weight: 700; }
    .kembalian-val { color: #16A34A; font-weight: 900; font-size: 14px; }

    .bayar-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #555;
      padding: 4px 0;
    }

    /* Footer */
    .receipt-footer {
      text-align: center;
      margin-top: 4px;
    }

    .footer-text {
      font-size: 12px;
      font-weight: 700;
      color: #1E3A5F;
      margin-bottom: 4px;
    }

    .footer-sub {
      font-size: 10px;
      color: #aaa;
      margin-bottom: 16px;
    }

    /* Barcode section */
    .barcode-section {
      text-align: center;
      margin-top: 8px;
    }

    .barcode-lines {
      display: inline-flex;
      gap: 1px;
      margin-bottom: 6px;
    }

    .bar {
      height: 50px;
      background: #1E3A5F;
    }

    .barcode-text {
      font-size: 9px;
      color: #666;
      letter-spacing: 2px;
      font-family: 'Courier New', monospace;
    }

    .powered {
      font-size: 9px;
      color: #ccc;
      margin-top: 12px;
    }

    /* Metode badge */
    .metode-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #EFF6FF;
      color: #1E3A5F;
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 20px;
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="receipt-inner">

      <!-- Header Toko -->
      <div class="store-header">
        <div class="store-logo">🏪</div>
        <div class="store-name">${namaToko}</div>
        <div class="store-info">
          ${alamat ? alamat + "<br>" : ""}
          ${noHp ? "📞 " + noHp : ""}
        </div>
      </div>

      <!-- Invoice Info -->
      <div class="invoice-section">
        <div class="invoice-row">
          <span class="invoice-label">No. Invoice</span>
          <span class="invoice-val">${noTrx}</span>
        </div>
        <div class="invoice-row">
          <span class="invoice-label">Tanggal</span>
          <span class="invoice-val">${tanggal}</span>
        </div>
        <div class="invoice-row">
          <span class="invoice-label">Waktu</span>
          <span class="invoice-val">${jam}</span>
        </div>
        <div class="invoice-row">
          <span class="invoice-label">Metode</span>
          <span class="metode-badge">${metodeLogo[metode] || "💵"} ${metode.charAt(0).toUpperCase() + metode.slice(1)}</span>
        </div>
        <div class="invoice-row">
          <span class="invoice-label">Kasir</span>
          <span class="invoice-val">${currentUser?.nama || "Admin"}</span>
        </div>
      </div>

      <hr class="divider-dash">

      <!-- Detail Items -->
      <div class="section-title">Detail Pesanan</div>
      <table>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>

      <hr class="divider-dash">

      <!-- Summary -->
      <div class="sum-row">
        <span>Subtotal (${items.length} item)</span>
        <span class="sum-val">${formatRupiah(subtotal)}</span>
      </div>
      ${
        diskon > 0
          ? `
      <div class="sum-row">
        <span>Diskon</span>
        <span class="sum-diskon">-${formatRupiah(diskon)}</span>
      </div>`
          : ""
      }
      ${
        pajak > 0
          ? `
      <div class="sum-row">
        <span>Pajak (${pajakPersen}%)</span>
        <span class="sum-val">${formatRupiah(pajak)}</span>
      </div>`
          : ""
      }

      <!-- Total -->
      <div class="total-box">
        <span class="total-label">TOTAL</span>
        <span class="total-val">${formatRupiah(total)}</span>
      </div>

      <!-- Tunai -->
      ${
        metode === "tunai"
          ? `
      <div class="bayar-row">
        <span>Uang Bayar</span>
        <span style="font-weight:700">${formatRupiah(bayar)}</span>
      </div>
      <div class="kembalian-box">
        <span class="kembalian-label">💚 Kembalian</span>
        <span class="kembalian-val">${formatRupiah(kembalian)}</span>
      </div>`
          : ""
      }

      <hr class="divider-dash">

      <!-- Footer -->
      <div class="receipt-footer">
        <div class="footer-text">${footer}</div>
        ${noHp ? `<div class="footer-sub">📞 ${noHp}</div>` : ""}

        <!-- Barcode visual (simulasi) -->
        <div class="barcode-section">
          <div class="barcode-lines">
            ${generateBarcodeLines()}
          </div>
          <div class="barcode-text">${noTrx}</div>
        </div>

        <div class="powered">Powered by Kasir WarungKu</div>
      </div>

    </div>
  </div>
</body>
</html>`;
  };

  const handlePrintBluetooth = async () => {
    const addr = await AsyncStorage.getItem("kasirku_printer_address");
    if (!addr) {
      Alert.alert(
        "Printer Belum Dipilih",
        "Pilih printer Bluetooth dulu di Pengaturan → Printer Bluetooth.",
        [
          { text: "Batal", style: "cancel" },
          {
            text: "Ke Pengaturan",
            onPress: () =>
              navigation.navigate("MainTabs", { screen: "Pengaturan" }),
          },
        ],
      );
      return;
    }
    setPrintingBT(true);
    try {
      await connectPrinter(addr); // reconnect jika perlu
      await printStruk({
        namaToko,
        alamat,
        noHp,
        footer,
        noTrx,
        waktu,
        kasir: currentUser?.nama || "Admin",
        metode,
        items,
        subtotal,
        diskon,
        pajak,
        pajakPersen,
        total,
        bayar,
        kembalian,
      });
      Alert.alert("✅ Berhasil!", "Struk berhasil dicetak.");
    } catch (e: any) {
      Alert.alert("Gagal Print", e.message || "Cek koneksi printer BT.");
    } finally {
      setPrintingBT(false);
    }
  };

  // Generate bar lines simulasi barcode
  const generateBarcodeLines = () => {
    const pattern = [
      3, 1, 2, 1, 3, 2, 1, 2, 3, 1, 2, 3, 1, 2, 1, 3, 2, 1, 3, 1, 2, 1, 3, 2, 1,
      2, 3, 1, 2, 1, 3, 1, 2, 3,
    ];
    return pattern
      .map(
        (w, i) =>
          `<div class="bar" style="width:${w}px;opacity:${i % 2 === 0 ? 1 : 0}"></div>`,
      )
      .join("");
  };

  const handlePrint = async () => {
    setLoading(true);
    try {
      const { uri } = await Print.printToFileAsync({
        html: generateHTML(),
        width: 320,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `Struk ${noTrx}`,
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("PDF Tersimpan", `File tersimpan di: ${uri}`);
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "Gagal generate PDF");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintDirect = async () => {
    setLoading(true);
    try {
      await Print.printAsync({ html: generateHTML(), width: 320 });
    } catch (e: any) {
      if (!e.message?.includes("cancel")) {
        Alert.alert("Error", e.message || "Gagal print");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity
          style={s.headerBtn}
          onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Struk Pembayaran</Text>
        <TouchableOpacity
          style={s.headerBtn}
          onPress={handlePrint}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="share-outline" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[
          s.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Preview struk di app */}
        <View style={s.receiptCard}>
          {/* Notch atas */}
          <View style={s.notchRow}>
            <View style={s.notchCircleL} />
            {Array.from({ length: 22 }).map((_, i) => (
              <View key={i} style={s.notchDash} />
            ))}
            <View style={s.notchCircleR} />
          </View>

          <View style={s.receiptInner}>
            {/* Header toko */}
            <View style={s.tokoHeader}>
              <Text style={s.tokoEmoji}>🏪</Text>
              <Text style={s.tokoNama}>{namaToko}</Text>
              {alamat ? <Text style={s.tokoInfo}>{alamat}</Text> : null}
              {noHp ? <Text style={s.tokoInfo}>📞 {noHp}</Text> : null}
            </View>

            <View style={s.dividerDash} />

            {/* Invoice info grid */}
            <View style={s.infoGrid}>
              {[
                { label: "No. Invoice", val: noTrx, mono: true },
                { label: "Tanggal", val: tanggal },
                { label: "Waktu", val: jam },
                { label: "Kasir", val: currentUser?.nama || "Admin" },
              ].map((row, i) => (
                <View key={i} style={s.infoRow}>
                  <Text style={s.infoLabel}>{row.label}</Text>
                  <Text
                    style={[
                      s.infoVal,
                      row.mono && { fontFamily: "monospace", fontSize: 11 },
                    ]}>
                    {row.val}
                  </Text>
                </View>
              ))}
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Metode</Text>
                <View style={s.metodePill}>
                  <Text style={s.metodePillTxt}>
                    {metodeLogo[metode]}{" "}
                    {metode.charAt(0).toUpperCase() + metode.slice(1)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={s.dividerDash} />

            {/* Items */}
            <Text style={s.sectionTitle}>DETAIL PESANAN</Text>
            {items.map((item: any, i: number) => (
              <View key={i} style={s.itemRow}>
                <View style={s.itemMeta}>
                  <Text style={s.itemNama}>{item.nama_produk}</Text>

                  <Text style={s.itemQtyPrice}>
                    {item.qty} x {formatRupiah(item.harga)}
                  </Text>
                </View>

                <Text style={s.itemTotal}>{formatRupiah(item.subtotal)}</Text>
              </View>
            ))}

            <View style={s.dividerDash} />

            {/* Summary */}
            <View style={s.sumRow}>
              <Text style={s.sumLabel}>Subtotal ({items.length} item)</Text>
              <Text style={s.sumVal}>{formatRupiah(subtotal)}</Text>
            </View>
            {diskon > 0 && (
              <View style={s.sumRow}>
                <Text style={s.sumLabel}>Diskon</Text>
                <Text style={[s.sumVal, { color: Colors.danger }]}>
                  -{formatRupiah(diskon)}
                </Text>
              </View>
            )}
            {pajak > 0 && (
              <View style={s.sumRow}>
                <Text style={s.sumLabel}>Pajak ({pajakPersen}%)</Text>
                <Text style={s.sumVal}>{formatRupiah(pajak)}</Text>
              </View>
            )}

            <View style={s.dividerSolid} />

            {/* Total */}
            <View style={s.totalBox}>
              <Text style={s.totalLabel}>TOTAL</Text>
              <Text style={s.totalVal}>{formatRupiah(total)}</Text>
            </View>

            {/* Tunai */}
            {metode === "tunai" && (
              <View style={s.tunaiBox}>
                <View style={s.sumRow}>
                  <Text style={s.sumLabel}>Uang Bayar</Text>
                  <Text style={s.sumVal}>{formatRupiah(bayar)}</Text>
                </View>
                <View style={[s.sumRow, s.kembalianRow]}>
                  <Text style={s.kembalianLabel}>💚 Kembalian</Text>
                  <Text style={s.kembalianVal}>{formatRupiah(kembalian)}</Text>
                </View>
              </View>
            )}

            <View style={s.dividerDash} />

            {/* Footer */}
            <Text style={s.footerTxt}>{footer}</Text>
            {noHp ? <Text style={s.footerSub}>📞 {noHp}</Text> : null}

            {/* Barcode visual */}
            <View style={s.barcodeWrap}>
              <View style={s.barcodeLines}>
                {[
                  3, 1, 2, 1, 3, 2, 1, 2, 3, 1, 2, 3, 1, 2, 1, 3, 2, 1, 3, 1, 2,
                  1, 3, 2, 1, 2, 3, 1, 2, 1, 3, 1, 2, 3,
                ].map((w, i) => (
                  <View
                    key={i}
                    style={[
                      s.barcodeLine,
                      { width: w, opacity: i % 2 === 0 ? 1 : 0 },
                    ]}
                  />
                ))}
              </View>
              <Text style={s.barcodeText}>{noTrx}</Text>
            </View>

            <Text style={s.poweredBy}>Powered by Kasir WarungKu</Text>
          </View>

          {/* Notch bawah */}
          <View style={s.notchRow}>
            <View style={s.notchCircleL} />
            {Array.from({ length: 22 }).map((_, i) => (
              <View key={i} style={s.notchDash} />
            ))}
            <View style={s.notchCircleR} />
          </View>
        </View>

        {/* Action buttons */}
        <View style={s.actions}>
          <TouchableOpacity
            style={s.actionBtn}
            onPress={handlePrint}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Ionicons
                name="share-social-outline"
                size={18}
                color={Colors.primary}
              />
            )}
            <Text style={s.actionBtnTxt}>Share PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.actionBtn}
            onPress={handlePrintDirect}
            disabled={loading}>
            <Ionicons
              name="document-outline"
              size={18}
              color={Colors.primary}
            />
            <Text style={s.actionBtnTxt}>PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              s.actionBtn,
              {
                backgroundColor: Colors.primaryLight,
                borderColor: Colors.primary,
              },
            ]}
            onPress={handlePrintBluetooth}
            disabled={printingBT}>
            {printingBT ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Ionicons
                name="bluetooth-outline"
                size={18}
                color={Colors.primary}
              />
            )}
            <Text style={s.actionBtnTxt}>Print BT</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={s.newTrxBtn}
          onPress={() =>
            navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] })
          }>
          <Ionicons name="add-circle-outline" size={20} color="#fff" />
          <Text style={s.newTrxBtnTxt}>Transaksi Baru</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  scroll: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16 },

  receiptCard: {
    backgroundColor: "#fff",
    borderRadius: 0,
    marginBottom: 16,
    overflow: "hidden",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },

  notchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    height: 20,
  },
  notchCircleL: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
    marginLeft: -10,
  },
  notchCircleR: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
    marginRight: -10,
  },
  notchDash: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 0.5,
  },

  receiptInner: { paddingHorizontal: 22, paddingVertical: 20 },

  tokoHeader: { alignItems: "center", marginBottom: 4 },
  tokoEmoji: { fontSize: 36, marginBottom: 8 },
  tokoNama: {
    fontSize: 20,
    fontWeight: "900",
    color: Colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
    textAlign: "center",
  },
  tokoInfo: {
    fontSize: 11,
    color: Colors.textLight,
    textAlign: "center",
    marginTop: 3,
  },

  dividerDash: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    borderStyle: "dashed",
    marginVertical: 14,
  },
  dividerSolid: {
    borderTopWidth: 2,
    borderTopColor: Colors.primary,
    marginVertical: 10,
  },

  infoGrid: { gap: 6 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: { fontSize: 11, color: Colors.textLight },
  infoVal: { fontSize: 12, fontWeight: "700", color: Colors.text },
  metodePill: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  metodePillTxt: { fontSize: 11, fontWeight: "700", color: Colors.primary },

  sectionTitle: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.textLight,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  itemMeta: { flex: 1, paddingRight: 8 },
  itemNama: { fontSize: 13, fontWeight: "700", color: Colors.text },
  itemQtyPrice: { fontSize: 10, color: Colors.textLight, marginTop: 2 },
  itemTotal: { fontSize: 13, fontWeight: "800", color: Colors.text },

  sumRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  sumLabel: { fontSize: 12, color: Colors.textMuted },
  sumVal: { fontSize: 12, fontWeight: "600", color: Colors.text },

  totalBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginVertical: 6,
  },
  totalLabel: { fontSize: 13, fontWeight: "800", color: Colors.primary },
  totalVal: {
    fontSize: 24,
    fontWeight: "900",
    color: Colors.primary,
    letterSpacing: -0.5,
  },

  tunaiBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 12,
    marginBottom: 4,
  },
  kembalianRow: {
    backgroundColor: Colors.successLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 4,
    marginBottom: 0,
  },
  kembalianLabel: { fontSize: 13, fontWeight: "700", color: Colors.success },
  kembalianVal: { fontSize: 15, fontWeight: "900", color: Colors.success },

  footerTxt: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
    marginBottom: 4,
  },
  footerSub: {
    textAlign: "center",
    fontSize: 11,
    color: Colors.textLight,
    marginBottom: 16,
  },

  barcodeWrap: { alignItems: "center", marginTop: 8, marginBottom: 4 },
  barcodeLines: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    gap: 0,
  },
  barcodeLine: { height: 52, backgroundColor: Colors.primary },
  barcodeText: {
    fontSize: 9,
    color: Colors.textLight,
    letterSpacing: 2,
    marginTop: 4,
    fontFamily: "monospace",
  },

  poweredBy: {
    textAlign: "center",
    fontSize: 9,
    color: Colors.textDisabled,
    marginTop: 12,
    marginBottom: 4,
  },

  actions: { flexDirection: "row", gap: 10, marginBottom: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  actionBtnTxt: { fontSize: 13, fontWeight: "700", color: Colors.primary },
  newTrxBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 16,
  },
  newTrxBtnTxt: { fontSize: 14, fontWeight: "800", color: "#fff" },
});
