# Graph Report - .  (2026-05-16)

## Corpus Check
- Large corpus: 117 files ╖ ~721,119 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 507 nodes · 848 edges · 34 communities (29 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Alternatives Module|Alternatives Module]]
- [[_COMMUNITY_Authentication Module|Authentication Module]]
- [[_COMMUNITY_Backend Dependencies|Backend Dependencies]]
- [[_COMMUNITY_Frontend Dependencies|Frontend Dependencies]]
- [[_COMMUNITY_License Middleware|License Middleware]]
- [[_COMMUNITY_Reports Module|Reports Module]]
- [[_COMMUNITY_POS Module|POS Module]]
- [[_COMMUNITY_Frontend Pages|Frontend Pages]]
- [[_COMMUNITY_Sidebar Navigation|Sidebar Navigation]]
- [[_COMMUNITY_License Banner|License Banner]]
- [[_COMMUNITY_Damaged Drugs Components|Damaged Drugs Components]]
- [[_COMMUNITY_Drug Import Scripts|Drug Import Scripts]]
- [[_COMMUNITY_Customers Module|Customers Module]]
- [[_COMMUNITY_Theme Context|Theme Context]]
- [[_COMMUNITY_Damaged Drugs Backend|Damaged Drugs Backend]]
- [[_COMMUNITY_Shifts Module|Shifts Module]]
- [[_COMMUNITY_Database Seed Scripts|Database Seed Scripts]]
- [[_COMMUNITY_Supplier Debts Module|Supplier Debts Module]]
- [[_COMMUNITY_Alerts Module|Alerts Module]]
- [[_COMMUNITY_Import Controller|Import Controller]]
- [[_COMMUNITY_POS Page Modal|POS Page Modal]]
- [[_COMMUNITY_Suppliers Module|Suppliers Module]]
- [[_COMMUNITY_Purchases Page|Purchases Page]]
- [[_COMMUNITY_Invoice Entry|Invoice Entry]]
- [[_COMMUNITY_Generate License Script|Generate License Script]]
- [[_COMMUNITY_Database Check Script|Database Check Script]]
- [[_COMMUNITY_Clear Database Script|Clear Database Script]]
- [[_COMMUNITY_Reset Admin Script|Reset Admin Script]]
- [[_COMMUNITY_Test API Flow|Test API Flow]]
- [[_COMMUNITY_Test Flow Script|Test Flow Script]]

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 21 edges
2. `verifyToken()` - 20 edges
3. `dependencies` - 19 edges
4. `useAutoRefresh()` - 17 edges
5. `requireRole()` - 16 edges
6. `dependencies` - 14 edges
7. `useLicense()` - 11 edges
8. `useTheme()` - 8 edges
9. `formatCurrency()` - 8 edges
10. `mapRowToDrug()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `DamagedDrugsPage()` --calls--> `formatCurrency()`  [INFERRED]
  frontend/src/pages/damaged/DamagedDrugsPage.jsx → frontend/src/pages/ShiftReports.jsx
- `LoginPage()` --calls--> `useAuth()`  [EXTRACTED]
  frontend/src/pages/LoginPage.jsx → frontend/src/context/AuthContext.jsx
- `DrugsManagement()` --calls--> `useAutoRefresh()`  [EXTRACTED]
  frontend/src/pages/DrugsManagement.jsx → frontend/src/hooks/useAutoRefresh.js
- `PurchasesPage()` --calls--> `useAutoRefresh()`  [EXTRACTED]
  frontend/src/pages/purchases/PurchasesPage.jsx → frontend/src/hooks/useAutoRefresh.js
- `ShiftManager()` --calls--> `formatDate()`  [INFERRED]
  frontend/src/pages/shifts/ShiftManager.jsx → frontend/src/pages/ShiftReports.jsx

## Communities (34 total, 5 thin omitted)

### Community 0 - "Alternatives Module"
Cohesion: 0.06
Nodes (40): getAlternativesHandler(), router, getAlternatives(), backupDatabase(), exportAsJson(), router, prisma, router (+32 more)

### Community 1 - "Authentication Module"
Cohesion: 0.07
Nodes (41): deleteUser(), emergencyAccess(), getActiveUsers(), getAllUsers(), getCurrentUser(), hasUsers(), login(), register() (+33 more)

### Community 2 - "Backend Dependencies"
Cohesion: 0.06
Nodes (32): author, dependencies, bcrypt, cors, dotenv, express, express-rate-limit, express-validator (+24 more)

### Community 3 - "Frontend Dependencies"
Cohesion: 0.06
Nodes (32): author, dependencies, axios, dexie, dexie-react-hooks, @emotion/react, @emotion/styled, lucide-react (+24 more)

### Community 4 - "License Middleware"
Cohesion: 0.08
Nodes (18): licenseController, router, licenseService, prisma, SENSITIVE_ENDPOINTS, SENSITIVE_OPERATIONS, licenseCheck(), getSetupStatus() (+10 more)

### Community 5 - "Reports Module"
Cohesion: 0.16
Nodes (27): applyAuditStockController(), customerDebtsController(), dailyExpensesController(), dashboardController(), expiredDrugsController(), expiringSoonController(), lowStockController(), monthlyProfitController() (+19 more)

### Community 6 - "POS Module"
Cohesion: 0.17
Nodes (21): getOrCreateWalkInCustomer(), handleAddExpense(), handleCreateSale(), handleDeleteSuspendedSale(), handleGetInvoiceById(), handleGetSalesHistory(), handleGetSuspendedSales(), handleProcessReturn() (+13 more)

### Community 7 - "Frontend Pages"
Cohesion: 0.18
Nodes (12): useAutoRefresh(), CustomerDebts(), InventoryPage(), Returns(), SalesHistory(), formatCurrency(), formatDate(), ShiftReports() (+4 more)

### Community 8 - "Sidebar Navigation"
Cohesion: 0.16
Nodes (12): MainLayout(), NAV_ITEMS, Sidebar(), AuthContext, AuthProvider(), useAuth(), Dashboard(), db (+4 more)

### Community 9 - "License Banner"
Cohesion: 0.19
Nodes (9): LicenseBanner(), LicenseContext, LicenseProvider(), useLicense(), ActivationPage(), LicenseExpiredPage(), TYPE_LABELS, SettingsPage() (+1 more)

### Community 10 - "Damaged Drugs Components"
Cohesion: 0.12
Nodes (5): DamagedDrugsPage(), REASONS, api, isLoginRequest, token

### Community 11 - "Drug Import Scripts"
Cohesion: 0.19
Nodes (16): bulkInsertDrugs(), checkExistingDrug(), cleanString(), __dirname, __filename, FORM_MAPPING, generateImportReport(), generateRandomBarcode() (+8 more)

### Community 12 - "Customers Module"
Cohesion: 0.12
Nodes (15): allDrugIds, currentBalance, customerName, debtPayments, drugMap, formattedCustomers, formattedSales, newBalance (+7 more)

### Community 13 - "Theme Context"
Cohesion: 0.21
Nodes (7): ThemeContext, ThemeProvider(), useTheme(), DrugsManagement(), formatPrice(), LabelPrintModal(), LoginPage()

### Community 14 - "Damaged Drugs Backend"
Cohesion: 0.31
Nodes (9): handleGetDamagedHistory(), handleGetExpiredBatches(), handleMoveToDamaged(), handleRestoreDamaged(), router, getDamagedDrugsHistory(), getExpiredBatches(), moveToDamaged() (+1 more)

### Community 15 - "Shifts Module"
Cohesion: 0.21
Nodes (5): getCurrentShift(), getShiftReport(), getShiftSales(), closeShift(), getShiftWithDetails()

### Community 16 - "Database Seed Scripts"
Cohesion: 0.24
Nodes (11): bulkInsertToDatabase(), DOSAGE_FORM_MAPPINGS, fs, insertBatch(), main(), normalizeForm(), parseExcelFile(), path (+3 more)

### Community 17 - "Supplier Debts Module"
Cohesion: 0.36
Nodes (8): createSupplierDebt(), deletePayment(), deleteSupplierDebt(), getAllSupplierDebts(), getSupplierDebtById(), recordPayment(), updateSupplierDebt(), router

### Community 18 - "Alerts Module"
Cohesion: 0.44
Nodes (6): handleGetActiveAlerts(), handleGetAlertCount(), router, getActiveAlerts(), getAlertCount(), getAlertsByType()

### Community 20 - "Import Controller"
Cohesion: 0.36
Nodes (6): generateRandomBarcode(), importDrugs(), mapRowToDrug(), prisma, safeGetCellValue(), safeGetNumericValue()

### Community 21 - "POS Page Modal"
Cohesion: 0.22
Nodes (5): DUMMY_ALTERNATIVES, PHARMACEUTICAL_FORMS, SearchDropdown, ReceiptPrint, receiptStyles

### Community 22 - "Suppliers Module"
Cohesion: 0.43
Nodes (6): addSupplierPayment(), createSupplier(), getAllSuppliers(), getSupplierById(), getSupplierLedger(), router

### Community 23 - "Purchases Page"
Cohesion: 0.29
Nodes (5): PurchasesPage(), StickerPanel, style, ARABIC_TO_ENGLISH_MAP, mapArabicToEnglishKeyboard()

### Community 24 - "Invoice Entry"
Cohesion: 0.33
Nodes (4): InvoiceItem, mockProducts, mockSuppliers, Supplier

### Community 25 - "Generate License Script"
Cohesion: 0.5
Nodes (4): args, generateKey(), main(), prisma

## Knowledge Gaps
- **165 isolated node(s):** `InvoiceItem`, `Supplier`, `mockSuppliers`, `mockProducts`, `fs` (+160 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `verifyToken()` connect `Alternatives Module` to `Authentication Module`, `License Middleware`, `Reports Module`, `POS Module`, `Customers Module`, `Damaged Drugs Backend`, `Supplier Debts Module`, `Alerts Module`, `Suppliers Module`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `requireRole()` connect `Alternatives Module` to `Authentication Module`, `License Middleware`, `Reports Module`, `POS Module`, `Customers Module`, `Damaged Drugs Backend`, `Supplier Debts Module`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `Sidebar Navigation` to `License Banner`, `POS Page Modal`, `Theme Context`, `Frontend Pages`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `InvoiceItem`, `Supplier`, `mockSuppliers` to the rest of the system?**
  _165 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Alternatives Module` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Authentication Module` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Backend Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._