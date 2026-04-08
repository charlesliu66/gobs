/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** SJ TikTok 矩阵（Next.js）完整根地址；未设置时自动用当前页 hostname + 端口 */
  readonly VITE_SJ_MATRIX_BASE_URL?: string;
  /** 矩阵端口，默认 3000；与 VITE_SJ_MATRIX_BASE_URL 互斥（优先完整 URL） */
  readonly VITE_SJ_MATRIX_PORT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
