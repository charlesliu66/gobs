from __future__ import annotations

import re


GLOBAL_FORBIDDEN_PATHS = (
    'h5-video-tool-api/src/services/dreaminaVideo.ts',
    'h5-video-tool-api/src/services/klingVideo.ts',
    'h5-video-tool-api/src/services/veoPython.ts',
    'h5-video-tool-api/src/services/studioPipeline.ts',
    'h5-video-tool-api/src/types/productionTypes.ts',
    'h5-video-tool-api/src/config/productionAssets.ts',
    '.env',
)


def normalize_path(path: str) -> str:
    return path.replace('\\', '/').strip()


def path_matches_scope(target_path: str, scope_path: str) -> bool:
    normalized_target = normalize_path(target_path)
    normalized_scope = normalize_path(scope_path).rstrip('/')
    if not normalized_scope:
        return False
    return normalized_target == normalized_scope or normalized_target.startswith(f'{normalized_scope}/')


def slugify(value: str) -> str:
    normalized = re.sub(r'[^a-z0-9]+', '-', value.strip().lower())
    return normalized.strip('-') or 'workflow-run'
