import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Produk } from "../db/produkRepo";

export interface CartItem {
  produk: Produk;
  qty: number;
  subtotal: number;
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

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      diskon: 0,
      metode: "tunai",
      heldOrders: [],

      // ── Hold / Recall ─────────────────────────────────────────────────────
      holdOrder: (nama) => {
        const { items, diskon, metode } = get();
        if (items.length === 0) return false;
        const order: HeldOrder = {
          id: Date.now().toString(),
          nama:
            nama.trim() ||
            `Bill ${new Date().toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
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
            items: items.map((i) =>
              i.produk.id === p.id
                ? {
                    // FIX: update produk sekaligus agar harga override tersimpan
                    produk: { ...i.produk, ...p },
                    qty: i.qty + 1,
                    subtotal: (i.qty + 1) * p.harga,
                  }
                : i,
            ),
          });
        } else {
          set({ items: [...items, { produk: p, qty: 1, subtotal: p.harga }] });
        }
      },

      updateQty: (id, qty) => {
        if (qty <= 0) {
          get().removeItem(id);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.produk.id === id
              ? { ...i, qty, subtotal: qty * i.produk.harga }
              : i,
          ),
        });
      },

      // Update harga item di cart tanpa ubah qty — untuk grosir threshold
      updateItemHarga: (id, hargaBaru, isGrosir = false) => {
        set({
          items: get().items.map((i) =>
            i.produk.id === id
              ? {
                  ...i,
                  produk: { ...i.produk, harga: hargaBaru, isGrosir } as any,
                  subtotal: i.qty * hargaBaru,
                }
              : i,
          ),
        });
      },

      removeItem: (id) =>
        set({ items: get().items.filter((i) => i.produk.id !== id) }),

      setDiskon: (diskon) => set({ diskon }),
      setMetode: (metode) => set({ metode }),
      clear: () => set({ items: [], diskon: 0, metode: "tunai" }),
      subtotal: () => get().items.reduce((s, i) => s + i.subtotal, 0),
      total: () => Math.max(0, get().subtotal() - get().diskon),
      totalItem: () => get().items.reduce((s, i) => s + i.qty, 0),
    }),
    {
      name: "kasirku-cart", // key di AsyncStorage
      storage: createJSONStorage(() => AsyncStorage),
      // Hanya persist heldOrders — cart aktif sengaja tidak di-persist
      // agar tidak ada transaksi "nyangkut" dari shift sebelumnya
      partialize: (state) => ({
        heldOrders: state.heldOrders,
      }),
    },
  ),
);
