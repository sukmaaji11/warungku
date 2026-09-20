import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import { useAuthStore, UserRole } from "../../store/authStore";

export default function ManajemenUserScreen({ navigation }: any) {
  const {
    getAllUsers,
    tambahUser,
    updateUser,
    hapusUser,
    gantiPin,
    currentUser,
  } = useAuthStore();
  const [users, setUsers] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState<any>(null);

  // Form tambah
  const [fNama, setFNama] = useState("");
  const [fUsername, setFUsername] = useState("");
  const [fPin, setFPin] = useState("");
  const [fPinConfirm, setFPinConfirm] = useState("");
  const [fRole, setFRole] = useState<UserRole>("kasir");

  // Form edit / ganti PIN
  const [ePinLama, setEPinLama] = useState("");
  const [ePinBaru, setEPinBaru] = useState("");
  const [eNama, setEName] = useState("");

  const load = useCallback(() => {
    setUsers(getAllUsers());
  }, []);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleTambah = () => {
    if (!fNama.trim() || !fUsername.trim()) {
      Alert.alert("Error", "Nama dan username wajib diisi");
      return;
    }
    if (fPin.length !== 6) {
      Alert.alert("Error", "PIN harus 6 digit");
      return;
    }
    if (fPin !== fPinConfirm) {
      Alert.alert("Error", "Konfirmasi PIN tidak cocok");
      return;
    }
    const ok = tambahUser(fNama, fUsername, fPin, fRole);
    if (ok) {
      Alert.alert("Berhasil", `User ${fNama} berhasil ditambahkan`);
      setFNama("");
      setFUsername("");
      setFPin("");
      setFPinConfirm("");
      setShowAdd(false);
      load();
    } else {
      Alert.alert("Gagal", "Username sudah dipakai atau terjadi error");
    }
  };

  const handleGantiPin = () => {
    if (ePinBaru.length !== 6) {
      Alert.alert("Error", "PIN baru harus 6 digit");
      return;
    }
    const ok = gantiPin(showEdit.id, ePinLama, ePinBaru);
    if (ok) {
      Alert.alert("Berhasil", "PIN berhasil diubah");
      setEPinLama("");
      setEPinBaru("");
      setShowEdit(null);
      load();
    } else {
      Alert.alert("Gagal", "PIN lama tidak cocok");
    }
  };

  const handleToggleAktif = (user: any) => {
    if (user.role === "owner") {
      Alert.alert("Tidak bisa", "Owner tidak bisa dinonaktifkan");
      return;
    }
    updateUser(user.id, { aktif: user.aktif ? 0 : 1 });
    load();
  };

  const handleHapus = (user: any) => {
    if (user.role === "owner") {
      Alert.alert("Tidak bisa", "Owner tidak bisa dihapus");
      return;
    }
    Alert.alert("Hapus User", `Yakin hapus ${user.nama}?`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: () => {
          hapusUser(user.id);
          load();
        },
      },
    ]);
  };

  const ROLE_INFO = {
    owner: {
      label: "Owner",
      color: Colors.primary,
      bg: Colors.primaryLight,
      icon: "shield-checkmark" as const,
    },
    kasir: {
      label: "Kasir",
      color: "#7C3AED",
      bg: "#F5F3FF",
      icon: "receipt-outline" as const,
    },
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Manajemen User</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={users}
        keyExtractor={(u) => u.id.toString()}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="people-outline" size={40} color="#D1D5DB" />
            <Text style={s.emptyTxt}>Belum ada user</Text>
          </View>
        }
        renderItem={({ item: user }) => {
          const ri = ROLE_INFO[user.role as UserRole] || ROLE_INFO.kasir;
          const isMe = user.id === currentUser?.id;
          return (
            <View style={[s.userCard, !user.aktif && s.userCardInactive]}>
              <View style={[s.avatar, { backgroundColor: ri.bg }]}>
                <Text style={[s.avatarTxt, { color: ri.color }]}>
                  {user.nama.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={s.userInfo}>
                <View style={s.userNameRow}>
                  <Text style={s.userName}>{user.nama}</Text>
                  {isMe && (
                    <View style={s.meBadge}>
                      <Text style={s.meBadgeTxt}>Anda</Text>
                    </View>
                  )}
                </View>
                <Text style={s.userUsername}>@{user.username}</Text>
                <View style={s.userBadges}>
                  <View style={[s.roleBadge, { backgroundColor: ri.bg }]}>
                    <Ionicons name={ri.icon} size={10} color={ri.color} />
                    <Text style={[s.roleTxt, { color: ri.color }]}>
                      {ri.label}
                    </Text>
                  </View>
                  {!user.aktif && (
                    <View style={s.inactiveBadge}>
                      <Text style={s.inactiveTxt}>Nonaktif</Text>
                    </View>
                  )}
                </View>
              </View>
              {!isMe && (
                <View style={s.userActions}>
                  <TouchableOpacity
                    style={s.actionBtn}
                    onPress={() => {
                      setShowEdit(user);
                      setEName(user.nama);
                      setEPinLama("");
                      setEPinBaru("");
                    }}>
                    <Ionicons
                      name="pencil-outline"
                      size={16}
                      color={Colors.primary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      s.actionBtn,
                      {
                        backgroundColor: user.aktif
                          ? Colors.warningLight
                          : Colors.successLight,
                      },
                    ]}
                    onPress={() => handleToggleAktif(user)}>
                    <Ionicons
                      name={user.aktif ? "pause-outline" : "play-outline"}
                      size={16}
                      color={user.aktif ? Colors.warning : Colors.success}
                    />
                  </TouchableOpacity>
                  {user.role !== "owner" && (
                    <TouchableOpacity
                      style={[
                        s.actionBtn,
                        { backgroundColor: Colors.dangerLight },
                      ]}
                      onPress={() => handleHapus(user)}>
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color={Colors.danger}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        }}
      />

      {/* Modal Tambah User */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={m.overlay}>
          <TouchableOpacity
            style={m.backdrop}
            onPress={() => setShowAdd(false)}
            activeOpacity={1}
          />
          <View style={m.sheet}>
            <View style={m.handle} />
            <View style={m.mHeader}>
              <Text style={m.mTitle}>Tambah User Baru</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={m.label}>Nama Lengkap</Text>
              <TextInput
                style={m.input}
                value={fNama}
                onChangeText={setFNama}
                placeholder="Contoh: Budi Santoso"
                placeholderTextColor={Colors.textDisabled}
              />

              <Text style={m.label}>Username</Text>
              <TextInput
                style={m.input}
                value={fUsername}
                onChangeText={setFUsername}
                placeholder="contoh: budi"
                placeholderTextColor={Colors.textDisabled}
                autoCapitalize="none"
              />

              <Text style={m.label}>Role</Text>
              <View style={m.roleRow}>
                {(["kasir", "owner"] as UserRole[]).map((r) => {
                  const ri = ROLE_INFO[r];
                  return (
                    <TouchableOpacity
                      key={r}
                      style={[
                        m.roleChip,
                        fRole === r && {
                          backgroundColor: ri.color,
                          borderColor: ri.color,
                        },
                      ]}
                      onPress={() => setFRole(r)}>
                      <Ionicons
                        name={ri.icon}
                        size={16}
                        color={fRole === r ? "#fff" : ri.color}
                      />
                      <Text
                        style={[
                          m.roleChipTxt,
                          fRole === r && { color: "#fff" },
                        ]}>
                        {ri.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={m.roleInfo}>
                <Ionicons
                  name="information-circle-outline"
                  size={14}
                  color={Colors.info}
                />
                <Text style={m.roleInfoTxt}>
                  {fRole === "kasir"
                    ? "Kasir: hanya bisa akses menu Kasir dan melihat struk."
                    : "Owner: akses penuh semua fitur, termasuk produk, laporan, dan pengaturan."}
                </Text>
              </View>

              {/* FIX: label & maxLength sesuai 6 digit */}
              <Text style={m.label}>PIN (min. 6 digit)</Text>
              <TextInput
                style={m.input}
                value={fPin}
                onChangeText={setFPin}
                placeholder="Masukkan 6 digit PIN"
                keyboardType="number-pad"
                maxLength={6} // ← tetap 6
                secureTextEntry
                placeholderTextColor={Colors.textDisabled}
              />
              {/* Preview dots */}
              <View style={m.pinDots}>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <View
                    key={i}
                    style={[m.pinDot, fPin.length > i && m.pinDotFilled]}
                  />
                ))}
              </View>

              <Text style={m.label}>Konfirmasi PIN</Text>
              <TextInput
                style={[
                  m.input,
                  fPinConfirm.length === 6 &&
                    fPin !== fPinConfirm && { borderColor: Colors.danger },
                ]}
                value={fPinConfirm}
                onChangeText={setFPinConfirm}
                placeholder="Ulangi 6 digit PIN"
                keyboardType="number-pad"
                maxLength={6}
                secureTextEntry
                placeholderTextColor={Colors.textDisabled}
              />
              {fPinConfirm.length === 6 && fPin !== fPinConfirm && (
                <Text
                  style={{
                    fontSize: 11,
                    color: Colors.danger,
                    marginTop: -10,
                    marginBottom: 10,
                  }}>
                  PIN tidak cocok
                </Text>
              )}

              <TouchableOpacity
                style={[
                  m.saveBtn,
                  (fPin.length !== 6 || fPin !== fPinConfirm) && { opacity: 0.5 },
  ]}
                onPress={handleTambah}
                disabled={fPin.length !== 6 || fPin !== fPinConfirm}>
                <Ionicons name="person-add-outline" size={18} color="#fff" />
                <Text style={m.saveBtnTxt}>Tambah User</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Edit / Ganti PIN */}
      <Modal visible={!!showEdit} transparent animationType="slide">
        <View style={m.overlay}>
          <TouchableOpacity
            style={m.backdrop}
            onPress={() => setShowEdit(null)}
            activeOpacity={1}
          />
          <View style={m.sheet}>
            <View style={m.handle} />
            <View style={m.mHeader}>
              <Text style={m.mTitle}>Edit {showEdit?.nama}</Text>
              <TouchableOpacity onPress={() => setShowEdit(null)}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={m.sectionLbl}>GANTI PIN</Text>
            <Text style={m.label}>PIN Lama</Text>
            <TextInput
              style={m.input}
              value={ePinLama}
              onChangeText={setEPinLama}
              placeholder="Masukkan PIN lama"
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
              placeholderTextColor={Colors.textDisabled}
            />
            <Text style={m.label}>PIN Baru (min. 6 digit)</Text>
            <TextInput
              style={m.input}
              value={ePinBaru}
              onChangeText={setEPinBaru}
              placeholder="Masukkan PIN baru"
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
              placeholderTextColor={Colors.textDisabled}
            />
            <View style={m.pinDots}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <View
                  key={i}
                  style={[m.pinDot, ePinBaru.length > i && m.pinDotFilled]}
                />
              ))}
            </View>

            <TouchableOpacity
              style={[m.saveBtn, ePinBaru.length !== 6 && { opacity: 0.5 }]}
  onPress={handleGantiPin}
              disabled={ePinBaru.length !== 6}>
              <Ionicons name="key-outline" size={18} color="#fff" />
              <Text style={m.saveBtnTxt}>Simpan PIN Baru</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "800" },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    padding: 16,
    gap: 10,
    backgroundColor: Colors.background,
    flexGrow: 1,
  },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTxt: { fontSize: 14, color: Colors.textMuted },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
    gap: 12,
  },
  userCardInactive: { opacity: 0.6 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: { fontSize: 16, fontWeight: "800" },
  userInfo: { flex: 1, gap: 3 },
  userNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  userName: { fontSize: 14, fontWeight: "700", color: Colors.text },
  meBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  meBadgeTxt: { fontSize: 10, fontWeight: "700", color: Colors.primary },
  userUsername: { fontSize: 11, color: Colors.textLight },
  userBadges: { flexDirection: "row", gap: 6, marginTop: 2 },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  roleTxt: { fontSize: 10, fontWeight: "700" },
  inactiveBadge: {
    backgroundColor: Colors.warningLight,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  inactiveTxt: { fontSize: 10, fontWeight: "700", color: Colors.warning },
  userActions: { flexDirection: "row", gap: 6 },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
});

const m = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: "85%",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  mHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  mTitle: { fontSize: 18, fontWeight: "800", color: Colors.text },
  sectionLbl: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textLight,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textMuted,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: Colors.text,
    marginBottom: 14,
  },
  roleRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  roleChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  roleChipTxt: { fontSize: 13, fontWeight: "700", color: Colors.textMuted },
  roleInfo: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: Colors.infoLight,
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    alignItems: "flex-start",
  },
  roleInfoTxt: { flex: 1, fontSize: 11, color: Colors.info, lineHeight: 16 },
  // ── PIN dots indicator ──
  pinDots: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: -8,
    marginBottom: 16,
  },
  pinDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: "transparent",
  },
  pinDotFilled: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 16,
    marginTop: 4,
    marginBottom: 24,
  },
  saveBtnTxt: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
