/** GOBS 主站功能权限（侧栏与路由） */
export const ALL_GOBS_FEATURES = [
    'home',
    'studio',
    'production',
    'editor',
    'materials',
    'templates',
    'distribute',
    'tiktok_matrix',
    'history',
    'admin_accounts',
];
/** 新建子账号默认权限（不含后台管理） */
export const DEFAULT_GOBS_FEATURES = [
    'home',
    'studio',
    'production',
    'editor',
    'materials',
    'templates',
    'distribute',
    'tiktok_matrix',
    'history',
];
/** 矩阵内功能权限（与 SJ/web lib/auth-types 对齐） */
export const ALL_MATRIX_FEATURES = [
    'home',
    'devices',
    'batch_login',
    'tasks',
    'settings',
    'warmup',
];
export const DEFAULT_MATRIX_FEATURES = ['home', 'devices', 'tasks', 'warmup'];
export const MATRIX_FEATURE_LABELS = {
    home: '批量评论',
    devices: '设备台',
    batch_login: '批量登录账号',
    tasks: '任务日志',
    settings: '代理设置',
    warmup: '批量养号 / 定时',
};
export const GOBS_FEATURE_LABELS = {
    home: '首页',
    studio: '生成视频',
    production: '高级制片',
    editor: '视频剪辑',
    materials: '素材管理',
    templates: '模板市场',
    distribute: '视频分发',
    tiktok_matrix: 'TikTok 矩阵',
    history: '历史记录',
    admin_accounts: '账号管理（后台）',
};
export function normalizeGobsFeatures(raw) {
    if (!Array.isArray(raw))
        return [];
    const allowed = new Set(ALL_GOBS_FEATURES);
    const out = [];
    for (const x of raw) {
        if (typeof x === 'string' && allowed.has(x))
            out.push(x);
    }
    return [...new Set(out)];
}
export function normalizeMatrixFeatures(raw) {
    if (!Array.isArray(raw))
        return [];
    const allowed = new Set(ALL_MATRIX_FEATURES);
    const out = [];
    for (const x of raw) {
        if (typeof x === 'string' && allowed.has(x))
            out.push(x);
    }
    return [...new Set(out)];
}
function publishMatrixForSession(r) {
    if (r.isSuperAdmin) {
        return { publishAccountIds: null, matrixAllowedGroups: null };
    }
    const pub = r.publishAccountIds;
    const mg = r.matrixAllowedGroups;
    return {
        publishAccountIds: pub === undefined ? null : [...pub],
        matrixAllowedGroups: mg === undefined ? null : [...mg],
    };
}
export function userToGobsSession(r) {
    const pm = publishMatrixForSession(r);
    return {
        id: r.id,
        email: r.email,
        isSuperAdmin: r.isSuperAdmin,
        features: r.isSuperAdmin ? [...ALL_GOBS_FEATURES] : normalizeGobsFeatures(r.features),
        matrixFeatures: r.isSuperAdmin ? [...ALL_MATRIX_FEATURES] : normalizeMatrixFeatures(r.matrixFeatures),
        publishAccountIds: pm.publishAccountIds,
        matrixAllowedGroups: pm.matrixAllowedGroups,
    };
}
export function normalizeIdArray(raw) {
    if (raw === undefined)
        return undefined;
    if (!Array.isArray(raw))
        return undefined;
    const out = [];
    for (const x of raw) {
        if (typeof x === 'string' && x.trim())
            out.push(x.trim());
    }
    return [...new Set(out)];
}
