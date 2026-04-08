import { Navigate, Outlet } from 'react-router-dom';
import { authApi } from '../api/auth';

/**
 * 路由守卫：未登录时跳转到 /login
 * 用法：将需要保护的路由包裹在 <Route element={<AuthGuard />}> 下
 */
export function AuthGuard() {
  if (!authApi.isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
