// src/hooks/usePermission.ts
import { useAuthStore } from "../store/authStore";

export function usePermission() {
  const { currentUser } = useAuthStore();
  const isOwner = currentUser?.role === "owner";
  const isKasir = currentUser?.role === "kasir" || isOwner;

  return {
    isOwner,
    isKasir,
    canManageProduk: isOwner,
    canLihatLaporan: isOwner,
    canManageUser: isOwner,
    canAksesPengaturan: isOwner,
    canAksesKasir: true, // semua role bisa
    canImportExcel: isOwner,
    canHapusProduk: isOwner,
    currentUser,
  };
}
