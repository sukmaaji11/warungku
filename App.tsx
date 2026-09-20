import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";
import { initDB } from "./src/db/database";
import { Colors } from "./src/constants/colors";
import AppNavigator from "./src/navigation/AppNavigator";

export default function App() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initDB()
      .then(() => setDbReady(true))
      .catch((e) => {
        console.error("[App] initDB failed:", e);
        setDbReady(true); // tetap lanjut supaya tidak stuck
      });
  }, []);

  if (!dbReady) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor={Colors.primary} />
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
