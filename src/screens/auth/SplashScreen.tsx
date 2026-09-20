import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";

const { width: W, height: H } = Dimensions.get("window");

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  // Animated values
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoY = useRef(new Animated.Value(30)).current;

  const textOpacity = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(20)).current;

  const tagOpacity = useRef(new Animated.Value(0)).current;

  const barWidth = useRef(new Animated.Value(0)).current;
  const barOpacity = useRef(new Animated.Value(0)).current;

  const exitOpacity = useRef(new Animated.Value(1)).current;

  // Decorative circles
  const circle1Scale = useRef(new Animated.Value(0)).current;
  const circle2Scale = useRef(new Animated.Value(0)).current;
  const circle3Scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Step 1: circles muncul
    Animated.stagger(120, [
      Animated.spring(circle1Scale, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(circle2Scale, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(circle3Scale, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Step 2: logo muncul
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 80,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(logoY, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, 200);

    // Step 3: teks nama app
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(textY, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, 500);

    // Step 4: tagline
    setTimeout(() => {
      Animated.timing(tagOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, 750);

    // Step 5: loading bar
    setTimeout(() => {
      Animated.timing(barOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
      Animated.timing(barWidth, {
        toValue: 100,
        duration: 1400,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: false,
      }).start();
    }, 900);

    // Step 6: fade out dan finish
    setTimeout(() => {
      Animated.timing(exitOpacity, {
        toValue: 0,
        duration: 400,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => onFinish());
    }, 2600);
  }, []);

  const barWidthInterp = barWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={s.safeOuter}>
      <Animated.View style={[s.safe, { opacity: exitOpacity }]}>
        {/* ── Decorative circles ── */}
        <Animated.View
          style={[s.circle1, { transform: [{ scale: circle1Scale }] }]}
        />
        <Animated.View
          style={[s.circle2, { transform: [{ scale: circle2Scale }] }]}
        />
        <Animated.View
          style={[s.circle3, { transform: [{ scale: circle3Scale }] }]}
        />

        {/* ── Center content ── */}
        <View style={s.center}>
          {/* Logo */}
          <Animated.View
            style={[
              s.logoWrap,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }, { translateY: logoY }],
              },
            ]}>
            <View style={s.logoOuter}>
              <View style={s.logoInner}>
                {/* <Ionicons name="receipt" size={38} color="#fff" /> */}
                <Image 
                source={require('../../../assets/logo.png')}
                resizeMode='contain'
                style={{width: 100, height: 100}}
                />
              </View>
            </View>
            {/* Dot aksen */}
            <View style={[s.accentDot, s.accentDotTR]} />
            <View style={[s.accentDot, s.accentDotBL]} />
          </Animated.View>

          {/* App name */}
          <Animated.View
            style={{
              opacity: textOpacity,
              transform: [{ translateY: textY }],
              alignItems: "center",
            }}>
            <Text style={s.appName}>Kasir WarungKu</Text>
            <View style={s.proBadge}>
              <Text style={s.proBadgeTxt}>Pro Edition</Text>
            </View>
          </Animated.View>

          {/* Tagline */}
          <Animated.Text style={[s.tagline, { opacity: tagOpacity }]}>
            Kasir Pintar untuk UMKM Indonesia
          </Animated.Text>

          {/* Loading bar */}
          <Animated.View style={[s.barWrap, { opacity: barOpacity }]}>
            <Animated.View style={[s.barFill, { width: barWidthInterp }]} />
          </Animated.View>

          {/* Loading text */}
          <Animated.Text style={[s.loadingTxt, { opacity: tagOpacity }]}>
            Memuat aplikasi...
          </Animated.Text>
        </View>

        {/* ── Bottom branding ── */}
        <Animated.View style={[s.bottomBrand, { opacity: tagOpacity }]}>
          <View style={s.bottomRow}>
            <View style={s.dividerLine} />
            <Text style={s.bottomTxt}>Powered by</Text>
            <View style={s.dividerLine} />
          </View>
          <Text style={s.bottomBrandName}>Kasir WarungKu</Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  // Decorative circles
  circle1: {
    position: "absolute",
    width: W * 0.9,
    height: W * 0.9,
    borderRadius: W * 0.45,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    top: -W * 0.25,
    right: -W * 0.25,
  },
  circle2: {
    position: "absolute",
    width: W * 0.7,
    height: W * 0.7,
    borderRadius: W * 0.35,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    bottom: H * 0.1,
    left: -W * 0.3,
  },
  circle3: {
    position: "absolute",
    width: W * 0.4,
    height: W * 0.4,
    borderRadius: W * 0.2,
    backgroundColor: "rgba(59,130,246,0.08)",
    bottom: H * 0.25,
    right: -W * 0.1,
  },

  // Center
  center: { alignItems: "center", gap: 16 },

  // Logo
  logoWrap: { position: "relative", marginBottom: 8 },
  logoOuter: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.15)",
  },
  logoInner: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  accentDot: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.accent || "#3B82F6",
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  accentDotTR: { top: 8, right: 6 },
  accentDotBL: {
    bottom: 12,
    left: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22C55E",
  },

  // App name
  appName: {
    fontSize: 42,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -1,
    lineHeight: 46,
  },
  proBadge: {
    backgroundColor: Colors.accent || "#3B82F6",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 4,
    alignSelf: "center",
  },
  proBadgeTxt: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
  },

  // Tagline
  tagline: {
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    letterSpacing: 0.2,
    marginTop: -4,
  },

  // Loading bar
  barWrap: {
    width: 180,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 8,
  },
  barFill: {
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 2,
  },

  loadingTxt: {
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
    marginTop: -4,
  },
  safeOuter: {
    flex: 1,
    backgroundColor: Colors.primary, // ← solid, tidak animated
  },

  // Bottom
  bottomBrand: {
    position: "absolute",
    bottom: 40,
    alignItems: "center",
    gap: 4,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dividerLine: {
    width: 30,
    height: 0.5,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  bottomTxt: {
    fontSize: 10,
    color: "rgba(255,255,255,0.3)",
    letterSpacing: 0.5,
  },
  bottomBrandName: {
    fontSize: 11,
    color: "rgba(255,255,255,0.2)",
    fontWeight: "700",
    letterSpacing: 1,
  },
});
