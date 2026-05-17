import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Container,
  CssBaseline,
  InputAdornment,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  ThemeProvider,
  Typography,
  alpha,
  createTheme,
} from '@mui/material';
import { Eye, EyeOff, Pill, CheckCircle2 } from 'lucide-react';
import api from '../utils/api';

/* ─── Password strength logic ───────────────────────────────── */
function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: 'transparent' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 20, label: 'ضعيفة جداً', color: '#ef4444' };
  if (score === 2) return { score: 40, label: 'ضعيفة', color: '#f97316' };
  if (score === 3) return { score: 60, label: 'متوسطة', color: '#eab308' };
  if (score === 4) return { score: 80, label: 'جيدة', color: '#22c55e' };
  return { score: 100, label: 'قوية جداً', color: '#10b981' };
}

/* ─── Main Component ────────────────────────────────────────── */
export default function SetupPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const [name, setName] = useState('');
  const [pharmacyName, setPharmacyName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const muiTheme = useMemo(() => createTheme({
    direction: 'rtl',
    palette: {
      mode: isDark ? 'dark' : 'light',
      primary: { main: '#4f46e5' },
      background: {
        default: isDark ? '#0f172a' : '#f1f5f9',
        paper:   isDark ? '#1e293b' : '#ffffff',
      },
      text: {
        primary:   isDark ? '#f8fafc' : '#111827',
        secondary: isDark ? '#94a3b8' : '#64748b',
      },
    },
    shape: { borderRadius: 14 },
    typography: {
      fontFamily: ['"Segoe UI"', 'Roboto', 'Arial', 'sans-serif'].join(','),
    },
    components: {
      MuiButton:    { styleOverrides: { root: { textTransform: 'none', fontWeight: 800, borderRadius: 12 } } },
      MuiPaper:     { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiTextField: { styleOverrides: { root: { '& .MuiOutlinedInput-root': { borderRadius: 12 } } } },
    },
  }), [isDark]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (name.trim().length < 3) {
      setError('اسم المدير يجب أن يكون 3 أحرف على الأقل.');
      return;
    }
    if (password.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل.');
      return;
    }

    if (pharmacyName.trim().length < 3) {
      setError('اسم الصيدلية يجب أن يكون 3 أحرف على الأقل.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/setup/initialize', { name: name.trim(), password, pharmacyName: pharmacyName.trim() });
      const { token, user } = res.data;

      // Save to localStorage — same shape as AuthContext login
      const userData = {
        id: user.id,
        name: user.name,
        role: user.role,
        maxDiscountLimit: user.maxDiscountLimit ?? 100,
        permissions: user.permissions || ['all'],
      };
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));

      setSuccess(true);

      // Brief success flash, then redirect to dashboard
      setTimeout(() => {
        window.location.href = '/';
      }, 1200);
    } catch (err) {
      const msg = err.response?.data?.error || 'حدث خطأ غير متوقع. حاول مجدداً.';
      setError(msg);
      setLoading(false);
    }
  }, [name, password]);

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />

      {/* ── Animated background ── */}
      <Box
        dir="rtl"
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          bgcolor: 'background.default',
          px: 2,
          py: 4,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '-30%',
            right: '-20%',
            width: '60%',
            height: '80%',
            borderRadius: '50%',
            background: isDark
              ? 'radial-gradient(circle, rgba(79,70,229,0.18) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(79,70,229,0.10) 0%, transparent 70%)',
            pointerEvents: 'none',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: '-20%',
            left: '-15%',
            width: '50%',
            height: '70%',
            borderRadius: '50%',
            background: isDark
              ? 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          },
        }}
      >
        <Container maxWidth="xs" disableGutters>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, sm: 4 },
              borderRadius: 4,
              border: 1,
              borderColor: 'divider',
              boxShadow: isDark
                ? '0 32px 100px rgba(0,0,0,0.45)'
                : '0 32px 100px rgba(15,23,42,0.12)',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <Stack spacing={3}>

              {/* ── Header ── */}
              <Box sx={{ textAlign: 'center' }}>
                <Avatar
                  sx={{
                    width: 72,
                    height: 72,
                    mx: 'auto',
                    mb: 2,
                    bgcolor: 'primary.main',
                    boxShadow: `0 16px 40px ${alpha('#4f46e5', isDark ? 0.45 : 0.30)}`,
                    transition: 'transform 0.3s ease',
                    '&:hover': { transform: 'scale(1.08) rotate(-3deg)' },
                  }}
                >
                  <Pill size={40} />
                </Avatar>

                <Typography variant="h5" fontWeight={900} gutterBottom>
                  مرحباً — إعداد النظام لأول مرة
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                  أنشئ حساب المدير للبدء في استخدام نظام إدارة الصيدلية
                </Typography>
              </Box>

              {/* ── Step badges ── */}
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                {['إنشاء حساب المدير', 'تسجيل دخول تلقائي', 'بدء الاستخدام'].map((step, i) => (
                  <Box
                    key={step}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 99,
                      bgcolor: isDark ? alpha('#4f46e5', 0.15) : alpha('#4f46e5', 0.08),
                      border: `1px solid ${alpha('#4f46e5', isDark ? 0.3 : 0.2)}`,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'primary.main',
                        fontWeight: 700,
                        fontSize: '0.7rem',
                      }}
                    >
                      {i + 1}. {step}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* ── Error / Success alerts ── */}
              {error && (
                <Alert
                  severity="error"
                  onClose={() => setError('')}
                  sx={{ borderRadius: 2 }}
                >
                  {error}
                </Alert>
              )}

              {success && (
                <Alert
                  severity="success"
                  icon={<CheckCircle2 size={20} />}
                  sx={{ borderRadius: 2 }}
                >
                  تم إعداد النظام بنجاح! جاري تحويلك...
                </Alert>
              )}

              {/* ── Form ── */}
              {!success && (
                <Box
                  component="form"
                  id="setup-form"
                  onSubmit={handleSubmit}
                  autoComplete="off"
                >
                  <Stack spacing={2.5}>
                    <TextField
                      id="setup-pharmacy-name"
                      fullWidth
                      label="اسم الصيدلية"
                      placeholder="مثال: صيدلية الشفاء"
                      value={pharmacyName}
                      onChange={(e) => setPharmacyName(e.target.value)}
                      disabled={loading}
                      required
                      inputProps={{ minLength: 3, maxLength: 100 }}
                    />

                    <TextField
                      id="setup-admin-name"
                      fullWidth
                      label="اسم المدير"
                      placeholder="مثال: Admin"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={loading}
                      required
                      inputProps={{ minLength: 3, maxLength: 50 }}
                      helperText="3 أحرف على الأقل"
                    />

                    <Box>
                      <TextField
                        id="setup-admin-password"
                        fullWidth
                        type={showPassword ? 'text' : 'password'}
                        label="كلمة المرور"
                        placeholder="8 أحرف على الأقل"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        required
                        autoComplete="new-password"
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() => setShowPassword((v) => !v)}
                                edge="end"
                                size="small"
                                aria-label="toggle password visibility"
                              >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />

                      {/* Password strength indicator */}
                      {password.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              قوة كلمة المرور
                            </Typography>
                            <Typography
                              variant="caption"
                              fontWeight={700}
                              sx={{ color: strength.color }}
                            >
                              {strength.label}
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={strength.score}
                            sx={{
                              height: 6,
                              borderRadius: 99,
                              bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: strength.color,
                                borderRadius: 99,
                                transition: 'width 0.4s ease, background-color 0.3s ease',
                              },
                            }}
                          />
                        </Box>
                      )}
                    </Box>

                    <Button
                      id="setup-submit-btn"
                      type="submit"
                      variant="contained"
                      size="large"
                      fullWidth
                      disabled={loading}
                      startIcon={
                        loading
                          ? <CircularProgress size={18} color="inherit" />
                          : <Pill size={18} />
                      }
                      sx={{
                        py: 1.4,
                        fontSize: '1rem',
                        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                        boxShadow: `0 8px 24px ${alpha('#4f46e5', 0.35)}`,
                        '&:hover': {
                          background: 'linear-gradient(135deg, #4338ca 0%, #6d28d9 100%)',
                          boxShadow: `0 12px 32px ${alpha('#4f46e5', 0.45)}`,
                          transform: 'translateY(-1px)',
                        },
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {loading ? 'جاري الإعداد...' : 'إعداد النظام'}
                    </Button>
                  </Stack>
                  
                  <Box sx={{ mt: 3, textAlign: 'center' }}>
                    <Typography variant="body2" color="primary.main" fontWeight="bold">
                      🎁 سيتم تفعيل فترة تجريبية مجانية لمدة 14 يوم
                    </Typography>
                  </Box>
                </Box>
              )}

            </Stack>
          </Paper>

          {/* ── Footer note ── */}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', textAlign: 'center', mt: 2, opacity: 0.7 }}
          >
            هذه الصفحة متاحة مرة واحدة فقط عند أول تشغيل للنظام
          </Typography>
        </Container>
      </Box>
    </ThemeProvider>
  );
}