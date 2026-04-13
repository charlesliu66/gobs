import type { GobsFeatureCode } from '../types/gobsAuth';

/** 侧栏 `to`（可带 query）→ 所需 GOBS 功能权限 */
export function navTargetToFeature(to: string): GobsFeatureCode | null {
  if (to === '/') return 'home';
  if (to.startsWith('/platform')) return 'home';
  if (to.startsWith('/studio?')) {
    const q = to.includes('?') ? new URLSearchParams(to.split('?')[1]) : null;
    if (q?.get('tab') === 'templates') return 'templates';
    return 'studio';
  }
  const path = to.split('?')[0];
  if (['/projects', '/quickfilm', '/asset-library'].includes(path)) return null;
  const map: Record<string, GobsFeatureCode> = {
    '/studio/production': 'production',
    '/editor': 'editor',
    '/materials': 'materials',
    '/distribute': 'distribute',
    '/tiktok-matrix': 'tiktok_matrix',
    '/history': 'history',
    '/settings/accounts': 'admin_accounts',
    '/settings/usage': 'admin_accounts',
  };
  return map[path] ?? null;
}

/** 当前路由 → 所需功能（不含管理员页特例） */
export function pathToRequiredFeature(pathname: string, search: string): GobsFeatureCode | null {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/platform')) return 'home';
  if (pathname === '/studio') {
    return new URLSearchParams(search).get('tab') === 'templates' ? 'templates' : 'studio';
  }
  if (['/projects', '/quickfilm', '/asset-library'].includes(pathname)) return null;
  const map: Record<string, GobsFeatureCode> = {
    '/studio/production': 'production',
    '/editor': 'editor',
    '/materials': 'materials',
    '/distribute': 'distribute',
    '/tiktok-matrix': 'tiktok_matrix',
    '/history': 'history',
    '/settings/accounts': 'admin_accounts',
    '/settings/usage': 'admin_accounts',
  };
  return map[pathname] ?? null;
}
