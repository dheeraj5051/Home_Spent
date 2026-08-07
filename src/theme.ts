export type Theme = {
  background: string; card: string; cardBorder: string; text: string; subtext: string;
  primary: string; primaryDark: string; secondary: string; success: string; warning: string;
  error: string; chip: string; chipText: string; input: string; divider: string;
  shadow: string; accent: string;
};

export const lightTheme: Theme = {
  background: '#F0F4FF',
  card: '#FFFFFF',
  cardBorder: '#E5E7EB',
  text: '#111827',
  subtext: '#6B7280',
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  secondary: '#EC4899',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  chip: '#EEF2FF',
  chipText: '#6366F1',
  input: '#F9FAFB',
  divider: '#F3F4F6',
  shadow: '#000',
  accent: '#6366F1',
};

export const darkTheme: Theme = {
  background: '#0F0F1A',
  card: '#1A1B2E',
  cardBorder: '#2D2F4A',
  text: '#F9FAFB',
  subtext: '#9CA3AF',
  primary: '#818CF8',
  primaryDark: '#6366F1',
  secondary: '#F472B6',
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  chip: '#252640',
  chipText: '#A5B4FC',
  input: '#252640',
  divider: '#2D2F4A',
  shadow: '#000',
  accent: '#818CF8',
};
