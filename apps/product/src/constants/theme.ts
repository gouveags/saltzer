export interface Theme {
  background: string;
  surface: string;
  surfaceStrong: string;
  ink: string;
  inkMuted: string;
  hairline: string;
  accent: string;
  accentSoft: string;
  moss: string;
  success: string;
  shadow: string;
}

export const lightTheme: Theme = {
  background: "#F1EBDD",
  surface: "#F8F4EA",
  surfaceStrong: "#E8E0D0",
  ink: "#1D211C",
  inkMuted: "#69695F",
  hairline: "#CFC5B2",
  accent: "#D64A2D",
  accentSoft: "#F1C6B7",
  moss: "#65705A",
  success: "#2E6A4F",
  shadow: "rgba(29, 33, 28, 0.12)",
};

export const darkTheme: Theme = {
  background: "#181B17",
  surface: "#20241F",
  surfaceStrong: "#2A3029",
  ink: "#F0E9DA",
  inkMuted: "#AAA99D",
  hairline: "#3E463C",
  accent: "#F06A48",
  accentSoft: "#5A3128",
  moss: "#A4B095",
  success: "#75B994",
  shadow: "rgba(0, 0, 0, 0.28)",
};

export const fonts = {
  body: "FamiljenGrotesk_400Regular",
  bodyItalic: "FamiljenGrotesk_400Regular_Italic",
  bodyMedium: "FamiljenGrotesk_600SemiBold",
  display: "FamiljenGrotesk_700Bold",
  mono: "AzeretMono_500Medium",
} as const;
