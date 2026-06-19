import { Navigate, Outlet } from 'react-router-dom';
import { SecurityNav } from '../../components/settings/SecurityNav';

export function SecurityLayout() {
  return (
    <div>
      <SecurityNav />
      <Outlet />
    </div>
  );
}

export function SecurityIndexRedirect() {
  return <Navigate to="/settings/security/users" replace />;
}
