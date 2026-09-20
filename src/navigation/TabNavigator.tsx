import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";
import { useCart } from "../store/cartStore";
import { usePermission } from "../hooks/usePermission";

import DashboardScreen from "../screens/main/DashboardScreen";
import ProdukScreen from "../screens/main/ProdukScreen";
import KasirScreen from "../screens/main/KasirScreen";
import LaporanScreen from "../screens/main/LaporanScreen";
import PengaturanScreen from "../screens/main/PengaturanScreen";

const Tab = createBottomTabNavigator();

type TabItem = {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  label: string;
};

const TABS: TabItem[] = [
  {
    name: "Dashboard",
    icon: "home-outline",
    iconActive: "home",
    label: "Dashboard",
  },
  { name: "Produk", icon: "cube-outline", iconActive: "cube", label: "Produk" },
  {
    name: "Kasir",
    icon: "receipt-outline",
    iconActive: "receipt",
    label: "Kasir",
  },
  {
    name: "Laporan",
    icon: "bar-chart-outline",
    iconActive: "bar-chart",
    label: "Laporan",
  },
  {
    name: "Pengaturan",
    icon: "settings-outline",
    iconActive: "settings",
    label: "Setting",
  },
];

// Tab yang boleh dilihat kasir
const KASIR_ONLY = ["Laporan", "Produk", "Pengaturan"];

function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const totalItem = useCart((s) => s.totalItem());
  const { isOwner } = usePermission();

  const visibleRoutes = state.routes.filter((r: any) =>
    isOwner ? true : !KASIR_ONLY.includes(r.name),
  );

  return (
    <View style={[s.tabBar, { paddingBottom: insets.bottom || 8 }]}>
      {visibleRoutes.map((route: any) => {
        const tab = TABS.find((t) => t.name === route.name)!;
        const focused = state.routes[state.index].name === route.name;
        const isKasir = route.name === "Kasir";

        return (
          <TouchableOpacity
            key={route.key}
            style={[s.tabItem, isKasir && s.tabItemKasir]}
            onPress={() => navigation.navigate(route.name)}
            activeOpacity={0.7}>
            {isKasir ? (
              <View style={[s.kasirBtn, focused && s.kasirBtnActive]}>
                <Ionicons
                  name={focused ? tab.iconActive : tab.icon}
                  size={26}
                  color="#fff"
                />
                {totalItem > 0 && (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>
                      {totalItem > 99 ? "99+" : totalItem}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={s.tabInner}>
                <Ionicons
                  name={focused ? tab.iconActive : tab.icon}
                  size={24}
                  color={focused ? Colors.primary : Colors.textMuted}
                />
                <Text style={[s.tabLabel, focused && s.tabLabelActive]}>
                  {tab.label}
                </Text>
                {focused && <View style={s.activeLine} />}
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabNavigator() {
  const { isOwner } = usePermission();

  const allowedTabs = TABS.filter((tab) =>
    isOwner ? true : !KASIR_ONLY.includes(tab.name),
  );

  const SCREEN_MAP: Record<string, React.ComponentType<any>> = {
    Dashboard: DashboardScreen,
    Produk: ProdukScreen,
    Kasir: KasirScreen,
    Laporan: LaporanScreen,
    Pengaturan: PengaturanScreen,
  };

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}>
      {allowedTabs.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={SCREEN_MAP[tab.name]}
        />
      ))}
    </Tab.Navigator>
  );
}

const s = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 8,
    elevation: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  tabItem: { flex: 1, alignItems: "center" },
  tabItemKasir: { flex: 1, alignItems: "center", marginTop: -24 },
  tabInner: {
    alignItems: "center",
    gap: 3,
    position: "relative",
    paddingHorizontal: 8,
  },
  tabLabel: { fontSize: 10, fontWeight: "600", color: Colors.textMuted },
  tabLabelActive: { color: Colors.primary },
  activeLine: {
    position: "absolute",
    bottom: -10,
    width: "80%",
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  kasirBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: Colors.white,
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  kasirBtnActive: { backgroundColor: Colors.primaryDark },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: Colors.accent,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
});
