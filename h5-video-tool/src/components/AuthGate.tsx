import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useGobsAuth } from '../context/GobsAuthContext';
import { pathToRequiredFeature } from '../lib/gobsNav';

/**
 * 已登录才可进入主站；并按功能权限拦截路由（超级管理员放行）。
 */
export function AuthGate() {
  const { user, loading } = useGobsAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)] text-[var(--color-text-muted)] text-sm">
        正在校验登录…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  }

  if (loc.pathname.startsWith('/settings/accounts') && !user.isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  const req = pathToRequiredFeature(loc.pathname, loc.search);
  if (req && !user.isSuperAdmin && !user.features.includes(req)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
