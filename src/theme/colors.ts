
export const colors = {
  primary: '#FF7900',
  primaryLight: '#FF9D00',
  primaryDark: '#E85D04',
  background: '#F8F9FA',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  textPrimary: '#17191C',
  textSecondary: '#6B7280',
  success: '#16A34A',
  error: '#DC2626',
  white: '#FFFFFF',
  black: '#000000',
  text: '#17191C',
  textOnPrimary: '#FFFFFF',
  navBackground: '#17191C',
  navBorder: '#E5E7EB',
  navAccent: '#FF7900',
  navAccentDark: '#E85D04',
  navAccentLight: '#FF9D00',
  navTextDark: '#17191C',
} as const;

export type AppColor = keyof typeof colors;
