from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Mapping

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_ENV_PATHS = [
    ROOT / 'h5-video-tool-api' / '.env',
    ROOT / 'scripts' / '.env',
]


class DeployConfigError(RuntimeError):
    pass


@dataclass(frozen=True)
class DeployTargetConfig:
    target: str
    host: str
    user: str
    password: str
    api_dir: str
    frontend_dir: str
    pm2_name: str
    version_url: str


def _parse_env_file(path: Path) -> dict[str, str]:
    parsed: dict[str, str] = {}
    if not path.exists():
        return parsed

    for raw_line in path.read_text(encoding='utf-8').splitlines():
        line = raw_line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, value = line.split('=', 1)
        parsed[key.strip()] = value.strip().strip('"').strip("'")
    return parsed


def load_local_env(
    base_env: Mapping[str, str] | None = None,
    env_paths: list[Path] | None = None,
) -> dict[str, str]:
    merged = dict(base_env or os.environ)
    for env_path in env_paths if env_paths is not None else DEFAULT_ENV_PATHS:
        merged.update(_parse_env_file(Path(env_path)))
    return merged


def _require(env: Mapping[str, str], key: str) -> str:
    value = str(env.get(key, '')).strip()
    if value:
        return value
    raise DeployConfigError(f'Missing required deploy config: {key}')


def _first_non_empty(env: Mapping[str, str], *keys: str) -> str:
    for key in keys:
        value = str(env.get(key, '')).strip()
        if value:
            return value
    return ''


def build_target_config(
    target: str,
    env: Mapping[str, str] | None = None,
    env_paths: list[Path] | None = None,
) -> DeployTargetConfig:
    normalized_target = target.strip().lower()
    if normalized_target not in {'staging', 'prod'}:
        raise DeployConfigError(f'Unsupported deploy target: {target}')

    merged_env = load_local_env(base_env=env, env_paths=env_paths)
    prefix = f'DEPLOY_{normalized_target.upper()}'

    host = _first_non_empty(merged_env, f'{prefix}_HOST', 'SERVER_HOST') or _require(merged_env, 'SERVER_HOST')
    user = _first_non_empty(merged_env, f'{prefix}_USER', 'SERVER_USER') or _require(merged_env, 'SERVER_USER')
    password = _first_non_empty(merged_env, f'{prefix}_PASSWORD', 'SERVER_PASSWORD') or _require(merged_env, 'SERVER_PASSWORD')

    return DeployTargetConfig(
        target=normalized_target,
        host=host,
        user=user,
        password=password,
        api_dir=_require(merged_env, f'{prefix}_API_DIR'),
        frontend_dir=_require(merged_env, f'{prefix}_FRONTEND_DIR'),
        pm2_name=_require(merged_env, f'{prefix}_PM2_NAME'),
        version_url=_require(merged_env, f'{prefix}_VERSION_URL'),
    )
