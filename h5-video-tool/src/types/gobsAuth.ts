export type GobsFeatureCode =
  | 'home'
  | 'studio'
  | 'production'
  | 'editor'
  | 'materials'
  | 'templates'
  | 'distribute'
  | 'tiktok_matrix'
  | 'history'
  | 'admin_accounts';

export type MatrixFeatureCode =
  | 'home'
  | 'devices'
  | 'batch_login'
  | 'tasks'
  | 'settings'
  | 'warmup';

export type GobsSessionUser = {
  id: string;
  email: string;
  isSuperAdmin: boolean;
  features: GobsFeatureCode[];
  matrixFeatures: MatrixFeatureCode[];
  publishAccountIds: string[] | null;
  matrixAllowedGroups: string[] | null;
};
