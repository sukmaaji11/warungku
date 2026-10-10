import type {
  PerformaAnalisis,
  ProdukAnalisis,
  ProdukStokMenipis,
  ProdukKecepatanPenjualan,
  PerbandinganPenjualanProduk,
} from '../db/analisisRepo';

export type InsightType = 'success' | 'info' | 'warning' | 'danger';

export interface InsightProduct {
  nama: string;
  stok?: number;
  satuan?: string;
}

export interface AnalysisInsight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  action: string;
  products?: InsightProduct[];
}

export interface AnalysisEngineInput {
  performa: PerformaAnalisis;
  performaSebelumnya?: PerformaAnalisis;
  topProduk: ProdukAnalisis[];
  produkKontribusi: ProdukAnalisis[];
  stokMenipis: ProdukStokMenipis[];
  produkTidakTerjual: ProdukTidakTerjual[];
  produkKecepatanPenjualan: ProdukKecepatanPenjualan[];
  periodeDari?: string;
  periodeSampai?: string;
  produkKontribusiSebelumnya: ProdukAnalisis[];
  perbandinganPenjualanProduk: PerbandinganPenjualanProduk[];
}

export interface ProdukTidakTerjual {
  id: number;
  nama: string;
  stok: number;
  stok_minimum: number;
  satuan: string;
}

export interface AnalysisEngineResult {
  insights: AnalysisInsight[];
}

function normalizeName(name: string): string {
  return name.trim().toLocaleLowerCase('id-ID');
}

function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

function hitungHariPeriode(dari: string, sampai: string): number {
  const awal = new Date(`${dari}T00:00:00`);
  const akhir = new Date(`${sampai}T00:00:00`);

  const selisih = akhir.getTime() - awal.getTime();

  if (!Number.isFinite(selisih) || selisih < 0) {
    return 0;
  }

  return Math.floor(selisih / (24 * 60 * 60 * 1000)) + 1;
}

export function runAnalysisEngine(
  input: AnalysisEngineInput,
): AnalysisEngineResult {
  const {
    performa,
    performaSebelumnya,
    topProduk,
    produkKontribusi,
    stokMenipis,
    produkTidakTerjual,
    periodeDari,
    periodeSampai,
    produkKecepatanPenjualan,
    perbandinganPenjualanProduk,
    produkKontribusiSebelumnya,
  } = input;

  const insights: AnalysisInsight[] = [];

  const BATAS_PERUBAHAN_OMZET = 5;

  // RULE-001:
  // Produk terlaris yang stoknya mencapai batas minimum.
  const stokMenipisNames = new Set(
    stokMenipis.map((produk) => normalizeName(produk.nama)),
  );

  const topProdukStokRendah = topProduk.filter((produk) =>
    stokMenipisNames.has(normalizeName(produk.nama_produk)),
  );

  if (topProdukStokRendah.length > 0) {
    insights.push({
      id: 'INV-001',
      type: 'danger',
      title: `${topProdukStokRendah.length} produk terlaris memiliki stok rendah`,
      description: `Produk berikut masuk Top ${topProduk.length} penjualan pada periode yang dipilih dan stoknya sudah mencapai batas minimum.`,
      products: topProdukStokRendah.map((produk) => {
        const stok = stokMenipis.find(
          (item) =>
            normalizeName(item.nama) === normalizeName(produk.nama_produk),
        );

        return {
          nama: produk.nama_produk,
          stok: stok?.stok,
          satuan: stok?.satuan,
        };
      }),
      action: 'Prioritaskan pemeriksaan dan restock produk-produk berikut.',
    });
  }

  // RULE-002:
  // Ada produk yang stoknya menipis di luar Top 5.
  const stokRendahLainnya = stokMenipis.filter(
    (produk) =>
      !topProdukStokRendah.some(
        (top) => normalizeName(top.nama_produk) === normalizeName(produk.nama),
      ),
  );

  if (stokRendahLainnya.length > 0) {
    insights.push({
      id: 'INV-002',
      type: 'warning',
      title: `${stokRendahLainnya.length} produk lain mencapai batas stok minimum`,
      description:
        'Produk berikut perlu diperiksa meskipun tidak masuk daftar produk terlaris pada periode tersebut.',
      products: stokRendahLainnya.slice(0, 5).map((produk) => ({
        nama: produk.nama,
        stok: produk.stok,
        satuan: produk.satuan,
      })),
      action:
        'Periksa stok fisik dan kebutuhan pembelian sebelum melakukan restock.',
    });
  }

  // RULE-003:
  // Ringkasan faktual performa periode.
  if (performa.transaksi > 0) {
    insights.push({
      id: 'SALES-001',
      type: 'info',
      title: 'Performa penjualan periode terpilih',
      description: `Tercatat ${performa.transaksi} transaksi dengan omzet ${formatRupiah(performa.omzet)} dan ${performa.produkTerjual} produk terjual.`,
      action:
        'Gunakan data Top 5 produk terlaris dan stok menipis untuk menentukan prioritas pengadaan barang.',
    });
  } else {
    insights.push({
      id: 'SALES-002',
      type: 'info',
      title: 'Belum ada transaksi pada periode ini',
      description:
        'Database tidak menemukan transaksi pada rentang tanggal yang dipilih.',
      action:
        'Periksa periode analisis dan pastikan transaksi pada tanggal tersebut sudah tersimpan.',
    });
  }

  // RULE-004:
  // Margin hanya ditampilkan jika omzet positif.
  // Ini indikator deskriptif, bukan penilaian margin baik/buruk.
  if (performa.omzet > 0) {
    insights.push({
      id: 'PROFIT-001',
      type: 'info',
      title: 'Estimasi keuntungan periode terpilih',
      description: `Estimasi keuntungan ${formatRupiah(performa.keuntungan)}, dengan margin ${performa.margin.toFixed(1)}% dari omzet.`,
      action:
        'Periksa kelengkapan HPP pada produk dan transaksi, terutama jika ada nilai HPP yang masih nol, sebelum menggunakan angka ini untuk keputusan harga.',
    });
  }

  // RULE-005:
  // Tidak ada produk aktif yang mencapai batas stok minimum.
  if (stokMenipis.length === 0) {
    insights.push({
      id: 'INV-003',
      type: 'success',
      title: 'Tidak ada stok yang mencapai batas minimum',
      description:
        'Tidak ditemukan produk aktif yang stoknya berada pada atau di bawah batas minimum.',
      action:
        'Pertahankan pemantauan stok secara berkala agar kebutuhan restock dapat diketahui lebih awal.',
    });
  }

  // RULE-006:
  // Estimasi keuntungan periode negatif.
  if (performa.omzet > 0 && performa.keuntungan < 0) {
    insights.push({
      id: 'PROFIT-002',
      type: 'danger',
      title: 'Estimasi keuntungan bernilai negatif',
      description: `Omzet tercatat ${formatRupiah(performa.omzet)}, tetapi estimasi keuntungan ${formatRupiah(performa.keuntungan)}.`,
      action:
        'Periksa harga jual, HPP pada transaksi, diskon, dan kesesuaian data modal produk sebelum mengambil keputusan bisnis.',
    });
  }

  // RULE-SALES-003, SALES-004, SALES-005:
  // Perbandingan omzet dengan periode sebelumnya.
  if (performaSebelumnya && performaSebelumnya.omzet > 0) {
    const perubahanOmzet =
      ((performa.omzet - performaSebelumnya.omzet) / performaSebelumnya.omzet) *
      100;

    const persentase = Math.abs(perubahanOmzet).toFixed(1);

    if (perubahanOmzet > BATAS_PERUBAHAN_OMZET) {
      insights.push({
        id: 'SALES-003',
        type: 'success',
        title: 'Omzet mengalami peningkatan',
        description: `Omzet periode ini ${formatRupiah(performa.omzet)}, naik ${persentase}% dibandingkan periode sebelumnya.`,
        action:
          'Evaluasi produk dan aktivitas penjualan yang berkontribusi pada kenaikan omzet, lalu pertahankan strategi yang efektif.',
      });
    } else if (perubahanOmzet < -BATAS_PERUBAHAN_OMZET) {
      insights.push({
        id: 'SALES-004',
        type: 'warning',
        title: 'Omzet mengalami penurunan',
        description: `Omzet periode ini ${formatRupiah(performa.omzet)}, turun ${persentase}% dibandingkan periode sebelumnya.`,
        action:
          'Periksa perubahan jumlah transaksi, produk terlaris, ketersediaan stok, dan aktivitas promosi untuk mencari penyebab penurunan.',
      });
    } else {
      insights.push({
        id: 'SALES-005',
        type: 'info',
        title: 'Omzet relatif stabil',
        description: `Perubahan omzet berada dalam rentang ±${BATAS_PERUBAHAN_OMZET}%, dengan omzet periode ini ${formatRupiah(performa.omzet)}.`,
        action:
          'Pantau tren penjualan pada periode berikutnya dan cari peluang meningkatkan nilai transaksi.',
      });
    }
  } else if (
    performaSebelumnya &&
    performaSebelumnya.omzet === 0 &&
    performa.omzet > 0
  ) {
    insights.push({
      id: 'SALES-006',
      type: 'success',
      title: 'Penjualan muncul pada periode ini',
      description: `Omzet periode ini mencapai ${formatRupiah(performa.omzet)}, sedangkan periode sebelumnya tidak memiliki omzet.`,
      action:
        'Pantau apakah aktivitas penjualan ini berlanjut pada periode berikutnya.',
    });
  }

  // RULE-SALES-007 dan SALES-008:
  // Perbandingan jumlah transaksi.
  if (performaSebelumnya && performaSebelumnya.transaksi > 0) {
    const perubahanTransaksi =
      ((performa.transaksi - performaSebelumnya.transaksi) /
        performaSebelumnya.transaksi) *
      100;

    if (perubahanTransaksi > 5) {
      insights.push({
        id: 'SALES-007',
        type: 'success',
        title: 'Jumlah transaksi meningkat',
        description: `Jumlah transaksi naik ${perubahanTransaksi.toFixed(1)}% dibandingkan periode sebelumnya.`,
        action:
          'Evaluasi produk dan aktivitas yang menarik pelanggan agar hasil positif dapat dipertahankan.',
      });
    } else if (perubahanTransaksi < -5) {
      insights.push({
        id: 'SALES-008',
        type: 'warning',
        title: 'Jumlah transaksi menurun',
        description: `Jumlah transaksi turun ${Math.abs(perubahanTransaksi).toFixed(1)}% dibandingkan periode sebelumnya.`,
        action:
          'Periksa jam ramai, ketersediaan produk, dan aktivitas promosi untuk mencari peluang meningkatkan transaksi.',
      });
    }
  }

  // RULE-SALES-009:
  // Rata-rata nilai transaksi menurun.
  if (performaSebelumnya && performaSebelumnya.rataTransaksi > 0) {
    const perubahanRataTransaksi =
      ((performa.rataTransaksi - performaSebelumnya.rataTransaksi) /
        performaSebelumnya.rataTransaksi) *
      100;

    if (perubahanRataTransaksi < -10) {
      insights.push({
        id: 'SALES-009',
        type: 'warning',
        title: 'Rata-rata belanja per transaksi menurun',
        description: `Rata-rata nilai transaksi turun ${Math.abs(perubahanRataTransaksi).toFixed(1)}% dibandingkan periode sebelumnya.`,
        action:
          'Evaluasi kombinasi produk, paket hemat, dan penawaran produk pelengkap tanpa mengorbankan margin keuntungan.',
      });
    }
  }

  // RULE-PROD-001:
  // Produk dengan kontribusi omzet terbesar.
  if (performa.omzet > 0 && produkKontribusi.length > 0) {
    const produkUtama = produkKontribusi[0];
    const kontribusi = (produkUtama.omset / performa.omzet) * 100;

    if (kontribusi > 0) {
      insights.push({
        id: 'PROD-001',
        type: 'info',
        title: 'Produk dengan kontribusi omzet terbesar',
        description: `${produkUtama.nama_produk} menghasilkan omzet ${formatRupiah(produkUtama.omset)}, sekitar ${kontribusi.toFixed(1)}% dari total omzet periode ini.`,
        products: produkKontribusi.slice(0, 3).map((produk) => ({
          nama: produk.nama_produk,
        })),
        action:
          'Pantau ketersediaan stok dan margin produk utama ini. Pertahankan penjualannya tanpa mengabaikan kontribusi produk lainnya.',
      });
    }
  }

  // RULE-PROD-002:
  // Ringkasan produk aktif yang tidak terjual pada periode pilihan.
  if (produkTidakTerjual.length > 0) {
    insights.push({
      id: 'PROD-002',
      type: 'info',
      title: `${produkTidakTerjual.length} produk tidak terjual pada periode ini`,
      description:
        'Daftar ini mencakup produk aktif yang tidak tercatat dalam transaksi selama periode analisis, baik stoknya tersedia maupun habis.',
      products: produkTidakTerjual.slice(0, 5).map((produk) => ({
        nama: produk.nama,
        stok: produk.stok,
        satuan: produk.satuan,
      })),
      action:
        'Gunakan daftar ini sebagai ringkasan, lalu periksa PROD-008 untuk produk yang tidak terjual tetapi masih memiliki stok.',
    });
  }

  // PROD-003: Indikasi stok berlebih
  const BATAS_HARI_STOK_BERLEBIH = 30;
  const MINIMAL_HARI_DATA = 14;

  if (periodeDari && periodeSampai) {
    const hariPeriode = hitungHariPeriode(periodeDari, periodeSampai);

    if (hariPeriode >= MINIMAL_HARI_DATA) {
      const produkBerpotensiBerlebih = produkKecepatanPenjualan
        .filter((produk) => {
          if (produk.qty <= 0 || produk.stok <= 0) {
            return false;
          }

          const rataPenjualanHarian = produk.qty / hariPeriode;
          const estimasiHariStok = produk.stok / rataPenjualanHarian;

          return estimasiHariStok > BATAS_HARI_STOK_BERLEBIH;
        })
        .sort((a, b) => {
          const hariStokA = a.stok / (a.qty / hariPeriode);
          const hariStokB = b.stok / (b.qty / hariPeriode);

          return hariStokB - hariStokA;
        })
        .slice(0, 5);

      if (produkBerpotensiBerlebih.length > 0) {
        insights.push({
          id: 'PROD-003',
          type: 'warning',
          title: 'Indikasi Stok Berlebih',
          description: `${produkBerpotensiBerlebih.length} produk memiliki estimasi persediaan lebih dari ${BATAS_HARI_STOK_BERLEBIH} hari berdasarkan rata-rata penjualan selama ${hariPeriode} hari.`,
          action:
            'Evaluasi pembelian ulang dan pertimbangkan promosi untuk mempercepat perputaran stok.',
          products: produkBerpotensiBerlebih.map((produk) => ({
            nama: produk.nama_produk,
            stok: produk.stok,
            satuan: produk.satuan,
          })),
        });
      }
    }
  }

  // PROD-004: Rekomendasi Restock
  const hariPeriode =
    periodeDari && periodeSampai
      ? hitungHariPeriode(periodeDari, periodeSampai)
      : 0;

  if (hariPeriode > 0) {
    const produkPerluRestock = produkKecepatanPenjualan
      .filter((produk) => {
        const stok = Number(produk.stok) || 0;
        const stokMinimum = Number(produk.stok_minimum) || 0;
        const qtyTerjual = Number(produk.qty) || 0;

        // Produk yang sudah mencapai batas minimum
        // ditangani oleh INV-001 dan INV-002.
        if (stok <= stokMinimum) {
          return false;
        }

        if (qtyTerjual <= 0) {
          return false;
        }

        const penjualanHarian = qtyTerjual / hariPeriode;
        const estimasiHariStok = stok / penjualanHarian;

        // Hanya produk yang stoknya diperkirakan
        // cukup untuk maksimal 7 hari.
        return estimasiHariStok <= 7;
      })
      .sort((a, b) => {
        const stokA = Number(a.stok) || 0;
        const stokB = Number(b.stok) || 0;

        return stokA - stokB;
      })
      .slice(0, 5);

    if (produkPerluRestock.length > 0) {
      insights.push({
        id: 'PROD-004',
        type: 'warning',
        title: 'Rekomendasi Restock',
        description:
          `${produkPerluRestock.length} produk memerlukan pemeriksaan ` +
          'dan prioritas pengadaan stok.',
        action:
          'Periksa stok fisik dan kebutuhan penjualan sebelum melakukan pembelian ulang.',
        products: produkPerluRestock.map((produk) => ({
          nama: produk.nama_produk,
          stok: produk.stok,
          satuan: produk.satuan,
        })),
      });
    }
  }

  // PROD-005: Rekomendasi produk untuk promosi

  if (hariPeriode >= 14) {
    const produkPromosi = produkKecepatanPenjualan
      .filter((produk) => {
        const stok = Number(produk.stok) || 0;
        const qtyTerjual = Number(produk.qty) || 0;

        if (stok <= 0 || qtyTerjual <= 0) {
          return false;
        }

        const penjualanHarian = qtyTerjual / hariPeriode;
        const estimasiHariStok = stok / penjualanHarian;

        // Stok lebih dari 30 hari dan penjualan relatif rendah.
        return estimasiHariStok > 30 && qtyTerjual <= 5;
      })
      .sort((a, b) => {
        const stokA = Number(a.stok) || 0;
        const stokB = Number(b.stok) || 0;

        return stokB - stokA;
      })
      .slice(0, 5);

    if (produkPromosi.length > 0) {
      insights.push({
        id: 'PROD-005',
        type: 'info',
        title: 'Peluang Promosi Produk',
        description:
          `${produkPromosi.length} produk memiliki indikasi stok ` +
          'berlebih dibandingkan kecepatan penjualannya.',
        action:
          'Pertimbangkan bundling, diskon terukur, atau penempatan produk yang lebih strategis.',
        products: produkPromosi.map((produk) => ({
          nama: produk.nama_produk,
          stok: produk.stok,
          satuan: produk.satuan,
        })),
      });
    }
  }

  // PROD-006: Tren Penjualan Produk Meningkat
  const produkTrenMeningkat = perbandinganPenjualanProduk
    .map((produk) => {
      const qtySebelumnya = Number(produk.qty_sebelumnya) || 0;
      const qtySekarang = Number(produk.qty_sekarang) || 0;

      const kenaikanPersen =
        qtySebelumnya > 0
          ? ((qtySekarang - qtySebelumnya) / qtySebelumnya) * 100
          : 0;

      return {
        ...produk,
        qtySebelumnya,
        qtySekarang,
        kenaikanPersen,
      };
    })
    .filter((produk) => produk.qtySebelumnya > 0 && produk.kenaikanPersen >= 20)
    .sort((a, b) => b.kenaikanPersen - a.kenaikanPersen)
    .slice(0, 5);

  if (produkTrenMeningkat.length > 0) {
    insights.push({
      id: 'PROD-006',
      type: 'success',
      title: 'Tren Penjualan Produk Meningkat',
      description:
        `${produkTrenMeningkat.length} produk mengalami kenaikan ` +
        'jumlah penjualan minimal 20% dibandingkan periode sebelumnya.',
      action:
        'Pantau ketersediaan stok dan prioritaskan pengadaan jika diperlukan.',
      products: produkTrenMeningkat.map((produk) => ({
        nama: produk.nama_produk,
      })),
    });
  }

  // PROD-007: Penurunan Penjualan Produk
  const produkTrenMenurun = perbandinganPenjualanProduk
    .map((produk) => {
      const qtySebelumnya = Number(produk.qty_sebelumnya) || 0;
      const qtySekarang = Number(produk.qty_sekarang) || 0;

      const penurunanPersen =
        qtySebelumnya > 0
          ? ((qtySebelumnya - qtySekarang) / qtySebelumnya) * 100
          : 0;

      return {
        ...produk,
        qtySebelumnya,
        qtySekarang,
        penurunanPersen,
      };
    })
    .filter(
      (produk) => produk.qtySebelumnya > 0 && produk.penurunanPersen >= 20,
    )
    .sort((a, b) => b.penurunanPersen - a.penurunanPersen)
    .slice(0, 5);

  if (produkTrenMenurun.length > 0) {
    insights.push({
      id: 'PROD-007',
      type: 'warning',
      title: 'Penjualan Produk Menurun',
      description:
        `${produkTrenMenurun.length} produk mengalami penurunan ` +
        'jumlah penjualan minimal 20% dibandingkan periode sebelumnya.',
      action: 'Evaluasi harga, permintaan pelanggan, dan ketersediaan produk.',
      products: produkTrenMenurun.map((produk) => ({
        nama: produk.nama_produk,
      })),
    });
  }

  // PROD-008: Produk Tidak Bergerak
  const produkTidakBergerak = produkTidakTerjual
    .filter((produk) => Number(produk.stok) > 0)
    .sort((a, b) => Number(b.stok) - Number(a.stok))
    .slice(0, 5);

  if (produkTidakBergerak.length > 0) {
    insights.push({
      id: 'PROD-008',
      type: 'warning',
      title: 'Produk Tidak Bergerak',
      description:
        `${produkTidakBergerak.length} produk masih memiliki stok, ` +
        'tetapi tidak tercatat terjual selama periode analisis.',
      action:
        'Evaluasi kebutuhan stok, cek masa kedaluwarsa jika relevan, dan pertimbangkan bundling atau promosi.',
      products: produkTidakBergerak.map((produk) => ({
        nama: produk.nama,
        stok: produk.stok,
        satuan: produk.satuan,
      })),
    });
  }

  return { insights };
}
