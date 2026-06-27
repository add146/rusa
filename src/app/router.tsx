import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ProtectedRoute, RoleGuard, DashboardLayout, GlobalErrorBoundary } from './components/templates';
import { DashboardRedirect } from './pages/dashboard/DashboardRedirect';
import { Spinner } from './components/atoms/Spinner';

// Pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const ClientListPage = lazy(() => import('./pages/clients/ClientListPage'));
const ClientDetailPage = lazy(() => import('./pages/clients/ClientDetailPage'));
const ClientImportPage = lazy(() => import('./pages/clients/ClientImportPage'));
const ProductListPage = lazy(() => import('./pages/products/ProductListPage'));
const ProductDetailPage = lazy(() => import('./pages/products/ProductDetailPage'));
const HPPManagerPage = lazy(() => import('./pages/products/HPPManagerPage'));
const OrderListPage = lazy(() => import('./pages/orders/OrderListPage'));
const OrderFormPage = lazy(() => import('./pages/orders/OrderFormPage'));
const OrderDetailPage = lazy(() => import('./pages/orders/OrderDetailPage'));
const PaymentVerificationPage = lazy(() => import('./pages/finance/PaymentVerificationPage'));
const DocumentListPage = lazy(() => import('./pages/finance/DocumentListPage'));
const ProductionMonitorPage = lazy(() => import('./pages/production/ProductionMonitorPage'));
const WASettingsPage = lazy(() => import('./pages/wa/WASettingsPage'));
const AttendancePage = lazy(() => import('./pages/hr/AttendancePage'));
const LocationsPage = lazy(() => import('./pages/hr/LocationsPage'));
const VisitLogPage = lazy(() => import('./pages/hr/VisitLogPage'));
const KPIDashboardPage = lazy(() => import('./pages/hr/KPIDashboardPage'));
const RewardsPage = lazy(() => import('./pages/hr/RewardsPage'));
const RewardManagementPage = lazy(() => import('./pages/hr/RewardManagementPage'));
const AdminDashboardPage = lazy(() => import('./pages/dashboard/AdminDashboardPage'));
const SalesDashboardPage = lazy(() => import('./pages/dashboard/SalesDashboardPage'));
const OwnerDashboardPage = lazy(() => import('./pages/dashboard/OwnerDashboardPage'));
const DesainerDashboardPage = lazy(() => import('./pages/dashboard/DesainerDashboardPage'));
const PointRulesPage = lazy(() => import('./pages/hr/PointRulesPage'));
const MarginReportPage = lazy(() => import('./pages/reports/MarginReportPage'));
const ReturnListPage = lazy(() => import('./pages/returns/ReturnListPage'));
const UserManagementPage = lazy(() => import('./pages/settings/UserManagementPage'));
const ProfilePage = lazy(() => import('./pages/settings/ProfilePage'));
const ReturnFormPage = lazy(() => import('./pages/returns/ReturnFormPage'));
const TutorialPage = lazy(() => import('./pages/TutorialPage'));
const Placeholder = ({ title }: { title: string }) => (
  <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant">
    <h1 className="text-h2 font-h2 text-primary mb-4">{title}</h1>
    <p className="text-on-surface-variant">Halaman sedang dalam tahap pengembangan.</p>
  </div>
);

export const router = createBrowserRouter([
  // Auth
  { 
    path: '/login', 
    element: (
      <Suspense fallback={<div className="h-screen flex items-center justify-center"><Spinner /></div>}>
        <LoginPage />
      </Suspense>
    ),
    errorElement: <GlobalErrorBoundary />
  },

  // Protected — DashboardLayout
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    errorElement: <GlobalErrorBoundary />,
    children: [
      { index: true, element: <DashboardRedirect /> },

      // Dashboard Views
      { path: 'dashboard/owner', element: <RoleGuard roles={['owner']}><OwnerDashboardPage /></RoleGuard> },
      { path: 'dashboard/admin', element: <RoleGuard roles={['owner', 'admin']}><AdminDashboardPage /></RoleGuard> },
      { path: 'dashboard/sales', element: <RoleGuard roles={['owner', 'admin', 'sales']}><SalesDashboardPage /></RoleGuard> },
      { path: 'dashboard/desainer', element: <RoleGuard roles={['owner', 'admin', 'desainer']}><DesainerDashboardPage /></RoleGuard> },

      // Klien
      { path: 'clients', element: <ClientListPage /> },
      { path: 'clients/import', element: <ClientImportPage /> },
      { path: 'clients/:id', element: <ClientDetailPage /> },

      // Produk
      { path: 'products', element: <ProductListPage /> },
      { path: 'products/:id', element: <ProductDetailPage /> },
      { path: 'products/hpp', element: <RoleGuard roles={['owner']}><HPPManagerPage /></RoleGuard> },

      // Pesanan
      { path: 'orders', element: <OrderListPage /> },
      { path: 'orders/new', element: <OrderFormPage /> },
      { path: 'orders/:id', element: <OrderDetailPage /> },
      { path: 'orders/:id/edit', element: <OrderFormPage /> },

      // Keuangan
      { path: 'finance/verify', element: <RoleGuard roles={['owner', 'admin']}><PaymentVerificationPage /></RoleGuard> },
      { path: 'finance/documents', element: <DocumentListPage /> },

      // Produksi
      { path: 'production', element: <ProductionMonitorPage /> },
      { path: 'production/:id', element: <Placeholder title="Detail Produksi" /> },

      // WhatsApp
      { path: 'wa/settings', element: <RoleGuard roles={['owner', 'admin']}><WASettingsPage /></RoleGuard> },
      { path: 'wa/logs', element: <Placeholder title="Log Pesan WA" /> },

      // SDM
      { path: 'attendance', element: <AttendancePage /> },
      { path: 'locations', element: <RoleGuard roles={['owner', 'admin']}><LocationsPage /></RoleGuard> },
      { path: 'visits', element: <RoleGuard roles={['sales']}><VisitLogPage /></RoleGuard> },
      { path: 'point-rules', element: <RoleGuard roles={['owner']}><PointRulesPage /></RoleGuard> },
      { path: 'kpi', element: <KPIDashboardPage /> },
      { path: 'rewards', element: <RewardsPage /> },
      { path: 'rewards/manage', element: <RoleGuard roles={['owner', 'admin']}><RewardManagementPage /></RoleGuard> },

      // Laporan
      { path: 'reports/margin', element: <RoleGuard roles={['owner']}><MarginReportPage /></RoleGuard> },
      { path: 'reports/sales', element: <Placeholder title="Laporan Performa Sales" /> },
      { path: 'reports/production', element: <Placeholder title="Laporan Arus Produksi" /> },

      // Retur
      { path: 'returns', element: <ReturnListPage /> },
      { path: 'returns/new', element: <ReturnFormPage /> },
      { path: 'returns/:id', element: <Placeholder title="Detail Retur" /> },

      // Settings
      { path: 'settings', element: <Placeholder title="Pengaturan" /> },
      { path: 'settings/users', element: <RoleGuard roles={['owner']}><UserManagementPage /></RoleGuard> },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },

  // 404 & Tutorial
  { 
    path: '*', 
    element: (
      <Suspense fallback={<div className="h-screen flex items-center justify-center"><Spinner /></div>}>
        <NotFoundPage />
      </Suspense>
    ) 
  },
  {
    path: '/tutorial',
    element: (
      <Suspense fallback={<div className="h-screen flex items-center justify-center"><Spinner /></div>}>
        <TutorialPage />
      </Suspense>
    )
  },
]);
