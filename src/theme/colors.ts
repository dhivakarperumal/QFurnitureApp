
export const colors = {
  primary: '#F97316',
  primaryDark: '#C2410C',
  primaryLight: '#FDBA74',

  background: '#FFF7ED',
  surface: '#FFFFFF',

  textPrimary: '#1F2937',
  textSecondary: '#6B7280',

  border: '#E5E7EB',

  success: '#16A34A',
  error: '#DC2626',
  warning: '#F59E0B',

  white: '#FFFFFF',
  black: '#000000',
} as const;

export type AppColor = keyof typeof colors;
