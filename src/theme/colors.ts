
export const colors = {
  // Primary – Deep Teal
  primary: '#004D4A',
  primaryDark: '#002F2D',
  primaryLight: '#007A73',

  // Accent – Luxury Gold
  accent: '#FFB800',
  accentDark: '#E59A00',
  accentLight: '#FFE477',

  // Background
  background: '#FFF8ED',
  surface: '#FFFFFF',
  border: '#E8DCC8',

  // Text
  text: '#202B2B',
  textSecondary: '#718080',
  textOnPrimary: '#FFFFFF',

  // Status
  success: '#2E7D32',
  warning: '#ED6C02',
  error: '#D32F2F',
  disabled: '#A0A0A0',

  navBackground: '#073E56',
  navBorder: '#E9A91A',
  navAccent: '#F7A40A',
  navAccentDark: '#C87808',
  navAccentLight: '#FFD95A',
  navTextDark: '#071F2B',
} as const;

export type AppColor = keyof typeof colors;
