from __future__ import annotations

import datetime as dt
from pathlib import PurePosixPath


UTC = dt.timezone.utc

RELEASE_BLOCKING_PREFIXES = (
    'h5-video-tool/',
    'h5-video-tool-api/',
)

RELEASE_BLOCKING_SCRIPT_PATHS = (
    'scripts/deploy_all.py',
    'scripts/deploy_api.py',
    'scripts/deploy_frontend.py',
    'scripts/deploy_config.py',
    'scripts/set_deployment_state.py',
    'scripts/mark_release_ready.py',
    'scripts/release_guard.py',
)

IGNORED_RELEASE_PATH_PREFIXES = (
    'scripts/ops/archive/',
    'tmp_server_ronin_check/',
)


def _to_iso8601_z(now: dt.datetime) -> str:
    return now.astimezone(UTC).isoformat(timespec='milliseconds').replace('+00:00', 'Z')


def _sha_matches(left: str, right: str) -> bool:
    normalized_left = left.strip()
    normalized_right = right.strip()
    if not normalized_left or not normalized_right:
        return False
    return normalized_left.startswith(normalized_right) or normalized_right.startswith(normalized_left)


def get_remote_release_ready_path(api_dir: str) -> str:
    env_root = PurePosixPath(api_dir).parent
    return str(env_root / 'shared-data' / '.data' / 'release-ready.json')


def build_verified_release_payload(
    *,
    target: str,
    commit_sha: str,
    commit_short: str,
    verified_by: str,
    now: dt.datetime | None = None,
) -> dict[str, str]:
    resolved_now = now or dt.datetime.now(UTC)
    return {
        'target': target.strip().lower(),
        'commitSha': commit_sha.strip(),
        'commitShort': commit_short.strip(),
        'verifiedBy': verified_by.strip() or 'operator',
        'verifiedAt': _to_iso8601_z(resolved_now),
    }


def evaluate_promotion_readiness(
    *,
    local_sha: str,
    staging_live_sha: str,
    staging_verified_sha: str,
) -> tuple[bool, str]:
    if not _sha_matches(local_sha, staging_live_sha):
        return False, 'Local HEAD does not match the staging live version.'
    if not _sha_matches(local_sha, staging_verified_sha):
        return False, 'Local HEAD does not match the verified staging release.'
    return True, ''


def select_release_blocking_paths(paths: list[str]) -> list[str]:
    blocked: list[str] = []
    for raw_path in paths:
        normalized_path = raw_path.replace('\\', '/').strip()
        if not normalized_path:
            continue
        if any(normalized_path.startswith(prefix) for prefix in IGNORED_RELEASE_PATH_PREFIXES):
            continue
        if normalized_path in RELEASE_BLOCKING_SCRIPT_PATHS:
            blocked.append(normalized_path)
            continue
        if any(normalized_path.startswith(prefix) for prefix in RELEASE_BLOCKING_PREFIXES):
            blocked.append(normalized_path)
    return blocked
