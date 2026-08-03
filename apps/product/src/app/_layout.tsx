import { AzeretMono_500Medium, useFonts as useMonoFont } from "@expo-google-fonts/azeret-mono";
import {
  Newsreader_400Regular,
  Newsreader_500Medium,
  Newsreader_600SemiBold,
  useFonts as useNewsreaderFonts,
} from "@expo-google-fonts/newsreader";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [newsreaderLoaded] = useNewsreaderFonts({
    Newsreader_400Regular,
    Newsreader_500Medium,
    Newsreader_600SemiBold,
  });
  const [monoLoaded] = useMonoFont({ AzeretMono_500Medium });

  useEffect(() => {
    if (newsreaderLoaded && monoLoaded) void SplashScreen.hideAsync();
  }, [monoLoaded, newsreaderLoaded]);

  if (!newsreaderLoaded || !monoLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false, animation: "fade" }} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
