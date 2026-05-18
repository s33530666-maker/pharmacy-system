import { useState, useMemo } from 'react'
import {
  Box,
  Container,
  Stack,
  Paper,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  Divider,
} from '@mui/material'
import {
  CalendarMonthRounded,
  AccessTimeRounded,
  TrendingDownRounded,
  TrendingUpRounded,
  CheckCircleRounded,
  SearchRounded,
  FilterListRounded,
} from '@mui/icons-material'

const shiftsData = [
  { id: 1, date: '2026-05-08', cashierName: 'Ahmed Mohamed', startTime: '08:00 AM', endTime: '04:00 PM', openingCash: 5000, expectedCash: 12450.5, actualCash: 12320.0 },
  { id: 2, date: '2026-05-07', cashierName: 'Sarah Ali', startTime: '08:00 AM', endTime: '04:00 PM', openingCash: 5000, expectedCash: 9820.0, actualCash: 9820.0 },
  { id: 3, date: '2026-05-07', cashierName: 'Mohamed Hassan', startTime: '04:00 PM', endTime: '12:00 AM', openingCash: 3000, expectedCash: 5670.0, actualCash: 5710.0 },
  { id: 4, date: '2026-05-06', cashierName: 'Fatima Ahmed', startTime: '08:00 AM', endTime: '04:00 PM', openingCash: 5000, expectedCash: 15340.75, actualCash: 15190.5 },
  { id: 5, date: '2026-05-06', cashierName: 'Youssef Ibrahim', startTime: '04:00 PM', endTime: '12:00 AM', openingCash: 3500, expectedCash: 7840.0, actualCash: 7840.0 },
  { id: 6, date: '2026-05-05', cashierName: 'Ahmed Mohamed', startTime: '08:00 AM', endTime: '04:00 PM', openingCash: 5000, expectedCash: 11200.0, actualCash: 11250.0 },
  { id: 7, date: '2026-05-05', cashierName: 'Layla Mohamed', startTime: '04:00 PM', endTime: '12:00 AM', openingCash: 4000, expectedCash: 6230.0, actualCash: 6180.0 },
  { id: 8, date: '2026-05-04', cashierName: 'Omar Sameh', startTime: '08:00 AM', endTime: '04:00 PM', openingCash: 5000, expectedCash: 18920.25, actualCash: 18920.25 },
  { id: 9, date: '2026-05-03', cashierName: 'Reham Kamal', startTime: '08:00 AM', endTime: '04:00 PM', openingCash: 5000, expectedCash: 14500.0, actualCash: 14380.0 },
  { id: 10, date: '2026-05-02', cashierName: 'Tarek Adel', startTime: '08:00 AM', endTime: '04:00 PM', openingCash: 5000, expectedCash: 9870.5, actualCash: 10020.0 },
]

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EGP' }).format(amount)

const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

function StatCard({ icon, label, value, color = 'primary' }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        borderRadius: 2,
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Avatar
        variant="rounded"
        sx={{
          bgcolor: (theme) => `${theme.palette[color].main}1A`,
          color: `${color}.main`,
          width: 48,
          height: 48,
        }}
      >
        {icon}
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {label}
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, color: `${color}.main` }} noWrap>
          {value}
        </Typography>
      </Box>
    </Paper>
  )
}

export default function ShiftReports() {
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('all')

  const filteredShifts = useMemo(() => {
    return shiftsData.filter((shift) => {
      const matchesSearch =
        shift.cashierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shift.date.includes(searchQuery)

      if (dateFilter === 'all') return matchesSearch
      if (dateFilter === 'today') return shift.date === '2026-05-08' && matchesSearch
      if (dateFilter === 'week') {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        return new Date(shift.date) >= weekAgo && matchesSearch
      }
      return matchesSearch
    })
  }, [searchQuery, dateFilter])

  const calculateDiscrepancy = (expected, actual) => actual - expected

  const { totalShortage, totalOverage, perfectShifts } = useMemo(() => {
    let shortage = 0
    let overage = 0
    let perfect = 0
    filteredShifts.forEach((s) => {
      const d = calculateDiscrepancy(s.expectedCash, s.actualCash)
      if (d < 0) shortage += Math.abs(d)
      else if (d > 0) overage += d
      else perfect += 1
    })
    return { totalShortage: shortage, totalOverage: overage, perfectShifts: perfect }
  }, [filteredShifts])

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 2, md: 4 } }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Stack spacing={0.5} sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            تقارير المناوبات
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Shift Reports — Owner View
          </Typography>
        </Stack>

        {/* Stats */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 2,
            mb: 4,
          }}
        >
          <StatCard
            icon={<CalendarMonthRounded />}
            label="Total Shifts"
            value={filteredShifts.length}
            color="primary"
          />
          <StatCard
            icon={<CheckCircleRounded />}
            label="Perfect Balance"
            value={perfectShifts}
            color="success"
          />
          <StatCard
            icon={<TrendingDownRounded />}
            label="Total Shortage"
            value={formatCurrency(totalShortage)}
            color="error"
          />
          <StatCard
            icon={<TrendingUpRounded />}
            label="Total Overage"
            value={formatCurrency(totalOverage)}
            color="success"
          />
        </Box>

        {/* History Card */}
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{ p: 2.5, alignItems: { md: 'center' }, justifyContent: 'space-between' }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Shift History
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', md: 'auto' } }}>
              <TextField
                placeholder="Search cashier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="small"
                fullWidth={false}
                sx={{ minWidth: { sm: 240 } }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRounded fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />

              <FormControl size="small" sx={{ minWidth: { sm: 180 } }}>
                <InputLabel>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <FilterListRounded fontSize="small" />
                    <span>Date</span>
                  </Stack>
                </InputLabel>
                <Select
                  value={dateFilter}
                  label="Date"
                  onChange={(e) => setDateFilter(e.target.value)}
                >
                  <MenuItem value="all">All Dates</MenuItem>
                  <MenuItem value="today">Today</MenuItem>
                  <MenuItem value="week">This Week</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Stack>

          <Divider />

          <TableContainer>
            <Table size="medium">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Cashier</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Start Time</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>End Time</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Opening Cash</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Expected</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Actual</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Discrepancy</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredShifts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ py: 6, textAlign: 'center' }}>
                      <Typography color="text.secondary">No shifts found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredShifts.map((shift) => {
                    const discrepancy = calculateDiscrepancy(shift.expectedCash, shift.actualCash)
                    const isShortage = discrepancy < 0
                    const isBalanced = discrepancy === 0

                    return (
                      <TableRow key={shift.id} hover>
                        <TableCell>{formatDate(shift.date)}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {shift.cashierName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.75} alignItems="center">
                            <AccessTimeRounded sx={{ fontSize: 16, color: 'text.disabled' }} />
                            <span>{shift.startTime}</span>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.75} alignItems="center">
                            <AccessTimeRounded sx={{ fontSize: 16, color: 'text.disabled' }} />
                            <span>{shift.endTime}</span>
                          </Stack>
                        </TableCell>
                        <TableCell>{formatCurrency(shift.openingCash)}</TableCell>
                        <TableCell>{formatCurrency(shift.expectedCash)}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {formatCurrency(shift.actualCash)}
                        </TableCell>
                        <TableCell>
                          {isBalanced ? (
                            <Chip
                              size="small"
                              icon={<CheckCircleRounded sx={{ fontSize: 14 }} />}
                              label="Perfect"
                              variant="outlined"
                            />
                          ) : isShortage ? (
                            <Chip
                              size="small"
                              color="error"
                              icon={<TrendingDownRounded sx={{ fontSize: 14 }} />}
                              label={`${formatCurrency(Math.abs(discrepancy))} deficit`}
                              variant="outlined"
                            />
                          ) : (
                            <Chip
                              size="small"
                              color="success"
                              icon={<TrendingUpRounded sx={{ fontSize: 14 }} />}
                              label={`+${formatCurrency(discrepancy)} extra`}
                              variant="outlined"
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Container>
    </Box>
  )
}
