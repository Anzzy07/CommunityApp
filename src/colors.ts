export const COLORS = {
  primary: "#9CAF88",
  primaryDark: "#758467",
  secondary: "#819171",
  background: "#DFE6DA",
  surface: "#CBD5C0",
  textPrimary: "#5e6b51ff",
  textSecondary: "#819171",
  border: "#9CAF88",
  success: "#819171",
  error: "#B22222",
  headerMain: "#b5c8a3ff",
} as const;

export type AppColors = typeof COLORS;
