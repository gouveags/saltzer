import { AzeretMono_500Medium, useFonts as useMonoFont } from "@expo-google-fonts/azeret-mono";
import {
  FamiljenGrotesk_400Regular,
  FamiljenGrotesk_400Regular_Italic,
  FamiljenGrotesk_600SemiBold,
  FamiljenGrotesk_700Bold,
  useFonts as useFamiljenFonts,
} from "@expo-google-fonts/familjen-grotesk";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [familjenLoaded] = useFamiljenFonts({
    FamiljenGrotesk_400Regular,
    FamiljenGrotesk_400Regular_Italic,
    FamiljenGrotesk_600SemiBold,
    FamiljenGrotesk_700Bold,
  });
  const [monoLoaded] = useMonoFont({ AzeretMono_500Medium });

  useEffect(() => {
    if (familjenLoaded && monoLoaded) void SplashScreen.hideAsync();
  }, [familjenLoaded, monoLoaded]);

  if (!familjenLoaded || !monoLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false, animation: "fade" }} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
