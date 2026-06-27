import { Navigate } from 'react-router-dom';
import { useRole } from '../../hooks/useAuth';

export function DashboardRedirect() {
  const { role } = useRole();

  switch (role) {
    case 'owner':
      return <Navigate to="/dashboard/owner" replace />;
    case 'admin':
      return <Navigate to="/dashboard/admin" replace />;
    case 'sales':
      return <Navigate to="/dashboard/sales" replace />;
    case 'produksi':
      return <Navigate to="/production" replace />; // Production primary view is monitor
    case 'staff':
      return <Navigate to="/attendance" replace />; // Staff only access attendance
    case 'desainer':
      return <Navigate to="/dashboard/desainer" replace />;
    default:
      return <div className="p-8 text-center">Menyiapkan dashboard Anda...</div>;
  }
}
