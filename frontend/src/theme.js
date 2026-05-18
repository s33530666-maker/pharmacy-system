import { createTheme } from '@mui/material/styles';

/**
 * Central MUI theme for the Pharmacy System.
 * - RTL direction for Arabic
 * - Trustworthy medical-blue palette + clean accents
 * - Cairo / Tajawal typography
 * - Sensible default props for Buttons, TextFields, etc.
 *
 * Usage:
 *   import { buildTheme } from './theme';
 *   const theme = buildTheme('light'); // or 'dark'
 */

const palette = {
  light: {
    mode: 'light',
    primary: {
      main: '#1565C0',      // Trustworthy medical blue
      light: '#5E92F3',
      dark: '#003C8F',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#00ACC1',      // Clean teal accent
      light: '#5DDEF4',
      dark: '#007C91',
      contrastText: '#FFFFFF',
    },
    success: { main: '#2E7D32' },
    warning: { main: '#ED6C02' },
    error:   { main: '#D32F2F' },
    info:    { main: '#0288D1' },
    background: {
      default: '#F4F6F8',
      paper:   '#FFFFFF',
    },
    text: {
      primary:   '#1A2027',
      secondary: '#4B5563',
    },
    divider: 'rgba(0, 0, 0, 0.08)',
  },
  dark: {
    mode: 'dark',
    primary: {
      main: '#5E92F3',
      light: '#8BB8FF',
      dark: '#1565C0',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#5DDEF4',
      light: '#9CFFFF',
      dark: '#00ACC1',
      contrastText: '#0B1418',
    },
    success: { main: '#66BB6A' },
    warning: { main: '#FFA726' },
    error:   { main: '#EF5350' },
    info:    { main: '#29B6F6' },
    background: {
      default: '#0F172A',
      paper:   '#1E293B',
    },
    text: {
      primary:   '#F1F5F9',
      secondary: '#94A3B8',
    },
    divider: 'rgba(255, 255, 255, 0.12)',
  },
};

const typography = {
  fontFamily: [
    'Cairo',
    'Tajawal',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'Helvetica',
    'Arial',
    'sans-serif',
  ].join(','),
  h1: { fontWeight: 700, fontSize: '2.5rem',  lineHeight: 1.3 },
  h2: { fontWeight: 700, fontSize: '2rem',    lineHeight: 1.3 },
  h3: { fontWeight: 700, fontSize: '1.75rem', lineHeight: 1.35 },
  h4: { fontWeight: 600, fontSize: '1.5rem',  lineHeight: 1.4 },
  h5: { fontWeight: 600, fontSize: '1.25rem', lineHeight: 1.4 },
  h6: { fontWeight: 600, fontSize: '1.1rem',  lineHeight: 1.5 },
  subtitle1: { fontWeight: 500, fontSize: '1rem' },
  subtitle2: { fontWeight: 500, fontSize: '0.875rem' },
  body1:     { fontWeight: 400, fontSize: '1rem',     lineHeight: 1.6 },
  body2:     { fontWeight: 400, fontSize: '0.875rem', lineHeight: 1.6 },
  button:    { fontWeight: 600, textTransform: 'none', letterSpacing: 0 },
  caption:   { fontWeight: 400, fontSize: '0.75rem' },
  overline:  { fontWeight: 500, fontSize: '0.75rem', letterSpacing: '0.08em' },
};

const shape = { borderRadius: 10 };

const buildComponents = (mode) => ({
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        fontFamily: typography.fontFamily,
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      },
    },
  },
  MuiButton: {
    defaultProps: {
      disableElevation: true,
      variant: 'contained',
    },
    styleOverrides: {
      root: {
        borderRadius: 8,
        paddingInline: 18,
        paddingBlock: 8,
        fontWeight: 600,
      },
      sizeLarge: { paddingBlock: 12, paddingInline: 24 },
    },
  },
  MuiTextField: {
    defaultProps: {
      variant: 'outlined',
      fullWidth: true,
      size: 'small',
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: { borderRadius: 8 },
    },
  },
  MuiSelect: {
    defaultProps: { variant: 'outlined' },
  },
  MuiFormControl: {
    defaultProps: { fullWidth: true, size: 'small' },
  },
  MuiPaper: {
    defaultProps: { elevation: 0 },
    styleOverrides: {
      root: {
        backgroundImage: 'none',
        border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
      },
    },
  },
  MuiCard: {
    defaultProps: { elevation: 0 },
    styleOverrides: {
      root: {
        borderRadius: 12,
        border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
      },
    },
  },
  MuiAppBar: {
    defaultProps: { elevation: 0, color: 'default' },
  },
  MuiTableCell: {
    styleOverrides: {
      head: { fontWeight: 700 },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: { fontWeight: 500 },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: { fontSize: '0.8rem' },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: { borderRadius: 12 },
    },
  },
});

export const buildTheme = (mode = 'light') =>
  createTheme({
    direction: 'rtl',
    palette: palette[mode] || palette.light,
    typography,
    shape,
    components: buildComponents(mode),
  });

// Default export is the light theme for convenience
const theme = buildTheme('light');
export default theme;
