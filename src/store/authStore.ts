import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDB } from '../db/database';

export type AuthStatus =
  | 'loading'
  | 'no_lisensi'
  | 'need_pin_setup'
  | 'need_login'
  | 'authenticated';

export type UserRole = 'owner' | 'kasir';

export interface UserInfo {
  id: number;
  nama: string;
  username: string;
  role: UserRole;
}

interface AuthStore {
  status: AuthStatus;
  namaToko: string;
  currentUser: UserInfo | null;
  setStatus: (s: AuthStatus) => void;
  checkAuth: () => Promise<void>;
  setupPIN: (pin: string, confirmPin: string) => boolean;
  login: (pin: string) => boolean;
  logout: () => void;
  getAllUsers: () => any[];
  tambahUser: (
    nama: string,
    username: string,
    pin: string,
    role: UserRole,
  ) => boolean;
  updateUser: (
    id: number,
    data: Partial<{ nama: string; pin: string; role: UserRole; aktif: number }>,
  ) => boolean;
  hapusUser: (id: number) => boolean;
  gantiPin: (id: number, pinLama: string, pinBaru: string) => boolean;
}

const SESSION_TIMEOUT_MS = 12 * 60 * 60 * 1000;

// Helper — cast hasil query ke any tanpa generic
function row(result: unknown): any {
  return result as any;
}
function rows(result: unknown[]): any[] {
  return result as any[];
}

export const useAuthStore = create<AuthStore>((set) => ({
  status: 'loading',
  namaToko: '',
  currentUser: null,

  setStatus: (s) => set({ status: s }),

  checkAuth: async () => {
    const timeout = setTimeout(() => {
      console.warn('[checkAuth] timeout');
      set({ status: 'no_lisensi' });
    }, 8000);

    try {
      // ── 1. AsyncStorage ──────────────────────────────────────────────
      let lisensiAktif = false;
      let namaTokoAS = '';
      try {
        const vals = await AsyncStorage.multiGet([
          'kasirku_status',
          'kasirku_nama_toko',
        ]);
        lisensiAktif = vals[0][1] === 'aktif';
        namaTokoAS = vals[1][1] || '';
      } catch (e) {
        console.warn('[checkAuth] AsyncStorage:', e);
      }

      // ── 2. Init DB ───────────────────────────────────────────────────
      let db: ReturnType<typeof getDB>;
      try {
        db = getDB();
      } catch (e) {
        console.warn('[checkAuth] getDB:', e);
        clearTimeout(timeout);
        set({ status: lisensiAktif ? 'need_pin_setup' : 'no_lisensi' });
        return;
      }

      // ── 3. Fallback cek lisensi SQLite ───────────────────────────────
      if (!lisensiAktif) {
        try {
          const lisensi = row(
            db.getFirstSync(`SELECT aktif,nama_toko FROM lisensi WHERE id=1`),
          );
          if (lisensi?.aktif) {
            lisensiAktif = true;
            namaTokoAS = lisensi.nama_toko || namaTokoAS;
          }
        } catch {}
      }

      if (!lisensiAktif) {
        clearTimeout(timeout);
        set({ status: 'no_lisensi' });
        return;
      }

      // ── 4. Nama toko dari pengaturan ─────────────────────────────────
      let namaToko = namaTokoAS;
      try {
        const r = row(
          db.getFirstSync(`SELECT value FROM pengaturan WHERE key='nama_toko'`),
        );
        if (r?.value) namaToko = r.value;
      } catch {}

      // ── 5. Pastikan tabel users ada & cek owner ──────────────────────
      let ownerAda = false;
      try {
        db.execSync(`
          CREATE TABLE IF NOT EXISTS users (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            nama       TEXT NOT NULL,
            username   TEXT NOT NULL UNIQUE,
            pin        TEXT NOT NULL,
            role       TEXT NOT NULL DEFAULT 'kasir',
            aktif      INTEGER NOT NULL DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now','localtime'))
          )
        `);
        const owner = row(
          db.getFirstSync(
            `SELECT id FROM users WHERE role='owner' AND aktif=1 LIMIT 1`,
          ),
        );
        ownerAda = !!owner;
      } catch (e) {
        console.warn('[checkAuth] users table:', e);
      }

      if (!ownerAda) {
        clearTimeout(timeout);
        set({ status: 'need_pin_setup', namaToko });
        return;
      }

      // ── 6. Cek session aktif ─────────────────────────────────────────
      try {
        const vals = await AsyncStorage.multiGet([
          'kasirku_last_login',
          'kasirku_last_user_id',
        ]);
        const lastLogin = vals[0][1];
        const lastUserId = vals[1][1];

        if (lastLogin && lastUserId) {
          const elapsed = Date.now() - parseInt(lastLogin);
          if (elapsed < SESSION_TIMEOUT_MS) {
            const r = row(
              db.getFirstSync(
                `SELECT id,nama,username,role FROM users WHERE id=? AND aktif=1`,
                [parseInt(lastUserId)],
              ),
            );
            if (r) {
              clearTimeout(timeout);
              set({
                status: 'authenticated',
                namaToko,
                currentUser: {
                  id: r.id,
                  nama: r.nama,
                  username: r.username,
                  role: r.role,
                },
              });
              return;
            }
          }
        }
      } catch (e) {
        console.warn('[checkAuth] session:', e);
      }

      // ── 7. Minta login ───────────────────────────────────────────────
      clearTimeout(timeout);
      set({ status: 'need_login', namaToko });
    } catch (e) {
      console.error('[checkAuth] fatal:', e);
      clearTimeout(timeout);
      set({ status: 'no_lisensi' });
    }
  },

  setupPIN: (pin, confirmPin) => {
    if (pin !== confirmPin || pin.length !== 6) return false;
    try {
      const db = getDB();
      db.execSync(`
        CREATE TABLE IF NOT EXISTS users (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          nama       TEXT NOT NULL,
          username   TEXT NOT NULL UNIQUE,
          pin        TEXT NOT NULL,
          role       TEXT NOT NULL DEFAULT 'kasir',
          aktif      INTEGER NOT NULL DEFAULT 1,
          created_at TEXT DEFAULT (datetime('now','localtime'))
        )
      `);
      db.runSync(
        `INSERT OR REPLACE INTO pengaturan (key,value) VALUES ('pin',?)`,
        [pin],
      );
      db.runSync(
        `INSERT OR REPLACE INTO users (nama,username,pin,role,aktif) VALUES ('Owner','owner',?,?,1)`,
        [pin, 'owner'],
      );

      AsyncStorage.getItem('kasirku_nama_toko').then((nama) => {
        if (nama) {
          try {
            getDB().runSync(
              `INSERT OR REPLACE INTO pengaturan (key,value) VALUES ('nama_toko',?)`,
              [nama],
            );
          } catch {}
        }
      });

      AsyncStorage.setItem('kasirku_last_login', Date.now().toString());
      AsyncStorage.setItem('kasirku_last_user_id', '1');

      set({
        status: 'authenticated',
        currentUser: { id: 1, nama: 'Owner', username: 'owner', role: 'owner' },
      });
      return true;
    } catch (e) {
      console.error('[setupPIN]:', e);
      return false;
    }
  },

  login: (pin) => {
    try {
      const db = getDB();
      const r = row(
        db.getFirstSync(
          `SELECT id,nama,username,role FROM users
         WHERE pin=? AND aktif=1
         ORDER BY CASE role WHEN 'owner' THEN 0 ELSE 1 END ASC
         LIMIT 1`,
          [pin],
        ),
      );
      if (!r) return false;

      AsyncStorage.setItem('kasirku_last_login', Date.now().toString());
      AsyncStorage.setItem('kasirku_last_user_id', r.id.toString());

      set({
        status: 'authenticated',
        currentUser: {
          id: r.id,
          nama: r.nama,
          username: r.username,
          role: r.role,
        },
      });
      return true;
    } catch (e) {
      console.error('[login]:', e);
      return false;
    }
  },

  logout: () => {
    AsyncStorage.removeItem('kasirku_last_login');
    AsyncStorage.removeItem('kasirku_last_user_id');
    set({ status: 'need_login', currentUser: null });
  },

  getAllUsers: () => {
    try {
      const db = getDB();
      return rows(
        db.getAllSync(
          `SELECT id,nama,username,role,aktif FROM users
         ORDER BY CASE role WHEN 'owner' THEN 0 ELSE 1 END ASC, nama ASC`,
        ),
      );
    } catch {
      return [];
    }
  },

  tambahUser: (nama, username, pin, role) => {
    try {
      const db = getDB();

      // Cek apakah PIN sudah digunakan user lain
      const pinTerpakai = row(
        db.getFirstSync(`SELECT id FROM users WHERE pin = ? LIMIT 1`, [pin]),
      );

      if (pinTerpakai) {
        return false;
      }

      db.runSync(
        `INSERT INTO users (nama,username,pin,role,aktif) VALUES (?,?,?,?,1)`,
        [nama.trim(), username.trim().toLowerCase(), pin, role],
      );

      return true;
    } catch {
      return false;
    }
  },
  updateUser: (id, data) => {
    try {
      const db = getDB();
      const fields = Object.keys(data)
        .map((k) => `${k}=?`)
        .join(',');
      db.runSync(`UPDATE users SET ${fields} WHERE id=?`, [
        ...Object.values(data),
        id,
      ]);
      return true;
    } catch {
      return false;
    }
  },

  hapusUser: (id) => {
    try {
      const db = getDB();

      if (id === 1) return false;

      db.runSync(`DELETE FROM users WHERE id=?`, [id]);

      return true;
    } catch {
      return false;
    }
  },

  gantiPin: (id, pinLama, pinBaru) => {
    try {
      const db = getDB();

      const r = row(
        db.getFirstSync(`SELECT pin,role FROM users WHERE id=?`, [id]),
      );

      // Cek PIN lama
      if (r?.pin !== pinLama) return false;

      // Cek apakah PIN baru sudah digunakan user lain
      const pinTerpakai = row(
        db.getFirstSync(
          `SELECT id FROM users WHERE pin = ? AND id != ? LIMIT 1`,
          [pinBaru, id],
        ),
      );

      if (pinTerpakai) return false;

      // Update PIN
      db.runSync(`UPDATE users SET pin=? WHERE id=?`, [pinBaru, id]);

      // Sinkronisasi PIN Master Owner
      if (r?.role === 'owner') {
        db.runSync(
          `INSERT OR REPLACE INTO pengaturan (key,value) VALUES ('pin',?)`,
          [pinBaru],
        );
      }

      AsyncStorage.setItem('kasirku_last_login', Date.now().toString());

      return true;
    } catch {
      return false;
    }
  },
}));
