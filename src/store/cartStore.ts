import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Produk } from '../db/produkRepo';

export interface CartItem {
  produk: Produk;
  qty: number;
  subtotal: number;
  diskonTipe?: DiskonTipeProduk;
  diskonNilai?: number;
  diskonNominal?: number;
}

export interface HeldOrder {
  id: string;
  nama: string;
  items: CartItem[];
  diskon: number;
  metode: string;
  waktu: string;
}

interface CartStore {
  items: CartItem[];
  diskon: number;
  metode: string;
  heldOrders: HeldOrder[];

  addItem: (p: Produk) => void;
  updateQty: (id: number, qty: number) => void;
  updateItemHarga: (id: number, hargaBaru: number, isGrosir?: boolean) => void;
  setDiskonItem: (id: number, tipe: DiskonTipeProduk, nilai: number) => void;
  removeItem: (id: number) => void;
  setDiskon: (d: number) => void;
  setMetode: (m: string) => void;
  clear: () => void;
  subtotal: () => number;
  total: () => number;
  totalItem: () => number;

  holdOrder: (nama: string) => boolean;
  recallOrder: (id: string) => void;
  deleteHeldOrder: (id: string) => void;
}

export type DiskonTipeProduk = 'persen' | 'nominal';

export function hitungDiskonItem(
  harga: number,
  qty: number,
  tipe: DiskonTipeProduk,
  nilai: number,
): number {
  const hargaAman = Math.max(0, harga);
  const qtyAman = Math.max(0, qty);
  const nilaiAman = Math.max(0, nilai);

  const diskonPerUnit =
    tipe === 'persen'
      ? Math.round((hargaAman * Math.min(nilaiAman, 100)) / 100)
      : Math.min(nilaiAman, hargaAman);

  return Math.min(hargaAman * qtyAman, diskonPerUnit * qtyAman);
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      diskon: 0,
      metode: 'tunai',
      heldOrders: [],

      // ── Hold / Recall ─────────────────────────────────────────────────────
      holdOrder: (nama) => {
        const { items, diskon, metode } = get();
        if (items.length === 0) return false;
        const order: HeldOrder = {
          id: Date.now().toString(),
          nama:
            nama.trim() ||
            `Bill ${new Date().toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
            })}`,
          items: [...items],
          diskon,
          metode,
          waktu: new Date().toISOString(),
        };
        set((s) => ({ heldOrders: [...s.heldOrders, order] }));
        get().clear();
        return true;
      },

      recallOrder: (id) => {
        const { heldOrders } = get();
        const order = heldOrders.find((o) => o.id === id);
        if (!order) return;
        set({
          items: order.items,
          diskon: order.diskon,
          metode: order.metode,
          heldOrders: heldOrders.filter((o) => o.id !== id),
        });
      },

      deleteHeldOrder: (id) => {
        set((s) => ({ heldOrders: s.heldOrders.filter((o) => o.id !== id) }));
      },

      // ── Cart ──────────────────────────────────────────────────────────────
      addItem: (p) => {
        const items = get().items;
        const ex = items.find((i) => i.produk.id === p.id);
        if (ex) {
          if (ex.qty >= p.stok) return;

          set({
            items: items.map((i) => {
              if (i.produk.id !== p.id) return i;

              const qtyBaru = i.qty + 1;
              const diskonTipe = i.diskonTipe;
              const diskonNilai = i.diskonNilai ?? 0;

              return {
                ...i,
                produk: { ...i.produk, ...p },
                qty: qtyBaru,
                subtotal: qtyBaru * p.harga,
                diskonNominal: diskonTipe
                  ? hitungDiskonItem(p.harga, qtyBaru, diskonTipe, diskonNilai)
                  : 0,
              };
            }),
          });
        } else {
          set({
            items: [...items, { produk: p, qty: 1, subtotal: p.harga }],
          });
        }
      },

      updateQty: (id, qty) => {
        if (qty <= 0) {
          get().removeItem(id);
          return;
        }

        set({
          items: get().items.map((i) => {
            if (i.produk.id !== id) return i;

            const diskonTipe = i.diskonTipe;
            const diskonNilai = i.diskonNilai ?? 0;

            return {
              ...i,
              qty,
              subtotal: qty * i.produk.harga,
              diskonNominal: diskonTipe
                ? hitungDiskonItem(i.produk.harga, qty, diskonTipe, diskonNilai)
                : 0,
            };
          }),
        });
      },

      // Update harga item di cart tanpa ubah qty — untuk grosir threshold
      updateItemHarga: (id, hargaBaru, isGrosir = false) => {
        set({
          items: get().items.map((i) => {
            if (i.produk.id !== id) return i;

            const diskonTipe = i.diskonTipe;
            const diskonNilai = i.diskonNilai ?? 0;

            return {
              ...i,
              produk: {
                ...i.produk,
                harga: hargaBaru,
                isGrosir,
              } as any,
              subtotal: i.qty * hargaBaru,
              diskonNominal: diskonTipe
                ? hitungDiskonItem(hargaBaru, i.qty, diskonTipe, diskonNilai)
                : 0,
            };
          }),
        });
      },

      setDiskonItem: (id, tipe, nilai) => {
        const nilaiAman = Math.max(0, nilai);

        set({
          items: get().items.map((item) => {
            if (item.produk.id !== id) return item;

            return {
              ...item,
              diskonTipe: tipe,
              diskonNilai: nilaiAman,
              diskonNominal: hitungDiskonItem(
                item.produk.harga,
                item.qty,
                tipe,
                nilaiAman,
              ),
            };
          }),
        });
      },

      removeItem: (id) =>
        set({ items: get().items.filter((i) => i.produk.id !== id) }),

      setDiskon: (diskon) => set({ diskon }),
      setMetode: (metode) => set({ metode }),
      clear: () => set({ items: [], diskon: 0, metode: 'tunai' }),
      subtotal: () =>
        get().items.reduce(
          (sum, item) =>
            sum + Math.max(0, item.subtotal - (item.diskonNominal ?? 0)),
          0,
        ),

      total: () => Math.max(0, get().subtotal() - get().diskon),
      totalItem: () => get().items.reduce((s, i) => s + i.qty, 0),
    }),
    {
      name: 'kasirku-cart', // key di AsyncStorage
      storage: createJSONStorage(() => AsyncStorage),
      // Hanya persist heldOrders — cart aktif sengaja tidak di-persist
      // agar tidak ada transaksi "nyangkut" dari shift sebelumnya
      partialize: (state) => ({
        heldOrders: state.heldOrders,
      }),
    },
  ),
);
