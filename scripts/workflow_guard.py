from __future__ import annotations

import argparse
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

try:
    from scripts.workflow_common import GLOBAL_FORBIDDEN_PATHS, normalize_path, path_matches_scope
except ImportError:  # pragma: no cover - direct script execution fallback
    from workflow_common import GLOBAL_FORBIDDEN_PATHS, normalize_path, path_matches_scope


REPO_ROOT = Path(__file__).resolve().parent.parent

IGNORED_PATH_PREFIXES = (
    'node_modules/',
    'dist/',
    'out/',
    'output/',
    '.git/',
    'backups/',
)

PRODUCT_REQUIRED_PREFIXES = (
    'h5-video-tool/',
    'h5-video-tool-api/',
    'scripts/',
    '.agents/skills/',
)

REQUIRED_FILES_BY_STAGE = {
    'plan': ('SESSION-ANCHOR.md', 'planner-spec.md'),
    'build': ('SESSION-ANCHOR.md', 'planner-spec.md', 'challenger-review.md'),
    'verify': ('SESSION-ANCHOR.md', 'planner-spec.md', 'challenger-review.md', 'builder-report.md'),
    'release': (
        'SESSION-ANCHOR.md',
        'planner-spec.md',
        'challenger-review.md',
        'builder-report.md',
        'verifier-report.md',
        'release-decision.md',
    ),
}


@dataclass(frozen=True)
class SessionAnchor:
    editable_paths: tuple[str, ...]
    read_only_paths: tuple[str, ...]
    additional_forbidden_paths: tuple[str, ...]
    out_of_scope: tuple[str, ...]


@dataclass(frozen=True)
class Finding:
    severity: str
    code: str
    message: str


@dataclass(frozen=True)
class GuardResult:
    verdict: str
    findings: tuple[Finding, ...]


def parse_list_section(markdown_text: str, heading: str) -> tuple[str, ...]:
    lines = markdown_text.splitlines()
    collected: list[str] = []
    in_section = False

    for raw_line in lines:
        stripped = raw_line.strip()
        if stripped.startswith('## '):
            current_heading = stripped[3:].strip()
            if in_section and current_heading != heading:
                break
            in_section = current_heading == heading
            continue
        if not in_section or not stripped.startswith('- '):
            continue
        value = stripped[2:].strip()
        if not value or value.startswith('[TODO]') or value.startswith('[None'):
            continue
        collected.append(normalize_path(value))

    return tuple(collected)


def load_session_anchor(run_dir: Path) -> SessionAnchor:
    session_anchor_path = run_dir / 'SESSION-ANCHOR.md'
    text = session_anchor_path.read_text(encoding='utf-8')
    return SessionAnchor(
        editable_paths=parse_list_section(text, 'Editable Files (Builder Ownership)'),
        read_only_paths=parse_list_section(text, 'Read-Only References'),
        additional_forbidden_paths=parse_list_section(text, 'Additional Forbidden Paths'),
        out_of_scope=parse_list_section(text, 'Out of Scope'),
    )


def collect_changed_paths(repo_root: Path, *, base_ref: str | None = None) -> tuple[str, ...]:
    if base_ref:
        result = subprocess.run(
            ['git', 'diff', '--name-only', f'{base_ref}...HEAD'],
            cwd=repo_root,
            capture_output=True,
            check=True,
            text=True,
        )
        return tuple(
            normalize_path(line)
            for line in result.stdout.splitlines()
            if normalize_path(line)
        )

    result = subprocess.run(
        ['git', 'status', '--short'],
        cwd=repo_root,
        capture_output=True,
        check=True,
        text=True,
    )
    paths: list[str] = []
    for raw_line in result.stdout.splitlines():
        if not raw_line.strip():
            continue
        payload = raw_line[3:] if len(raw_line) > 3 else raw_line.strip()
        if ' -> ' in payload:
            payload = payload.split(' -> ', 1)[1]
        normalized = normalize_path(payload)
        if normalized:
            paths.append(normalized)
    return tuple(paths)


def _run_doc_path(run_id: str, path: str) -> bool:
    return path_matches_scope(path, f'docs/workflow/runs/{run_id}')


def _is_ignored(path: str) -> bool:
    return any(path_matches_scope(path, prefix) for prefix in IGNORED_PATH_PREFIXES)


def _parse_int_after_label(text: str, label: str) -> int | None:
    pattern = re.compile(rf'{re.escape(label)}\s*:?\s*(\d+)')
    match = pattern.search(text)
    if not match:
        return None
    return int(match.group(1))


def evaluate_guard(
    *,
    repo_root: Path,
    run_id: str,
    stage: str,
    changed_paths: tuple[str, ...],
) -> GuardResult:
    findings: list[Finding] = []
    run_dir = repo_root / 'docs' / 'workflow' / 'runs' / run_id

    missing_files = [
        filename for filename in REQUIRED_FILES_BY_STAGE[stage] if not (run_dir / filename).exists()
    ]
    if missing_files:
        findings.append(
            Finding(
                severity='error',
                code='MISSING_ARTIFACT',
                message=f'Missing required run artifact(s) for stage `{stage}`: {", ".join(missing_files)}.',
            ),
        )
        return GuardResult(verdict='FAIL', findings=tuple(findings))

    anchor = load_session_anchor(run_dir)

    combined_forbidden = tuple(dict.fromkeys((*GLOBAL_FORBIDDEN_PATHS, *anchor.additional_forbidden_paths)))
    forbidden_touches = sorted(
        path for path in changed_paths if any(path_matches_scope(path, forbidden) for forbidden in combined_forbidden)
    )
    if forbidden_touches:
        findings.append(
            Finding(
                severity='error',
                code='FORBIDDEN_PATH',
                message=f'Changed path(s) touch forbidden scope: {", ".join(forbidden_touches)}.',
            ),
        )

    if not anchor.editable_paths:
        findings.append(
            Finding(
                severity='warn',
                code='EMPTY_SCOPE',
                message='SESSION-ANCHOR.md does not list any builder-owned editable paths.',
            ),
        )

    scoped_paths = tuple(
        path for path in changed_paths if path and not _is_ignored(path)
    )
    out_of_scope: list[str] = []
    for path in scoped_paths:
        if _run_doc_path(run_id, path):
            continue
        if any(path_matches_scope(path, editable) for editable in anchor.editable_paths):
            continue
        out_of_scope.append(path)

    code_scope_violations = sorted(
        path for path in out_of_scope if any(path_matches_scope(path, prefix) for prefix in PRODUCT_REQUIRED_PREFIXES)
    )
    doc_scope_warnings = sorted(path for path in out_of_scope if path not in code_scope_violations)

    if code_scope_violations:
        findings.append(
            Finding(
                severity='error',
                code='OUT_OF_SCOPE_CODE',
                message=(
                    'Changed code or tooling path(s) are outside the SESSION-ANCHOR editable scope: '
                    + ', '.join(code_scope_violations)
                    + '.'
                ),
            ),
        )
    if doc_scope_warnings:
        findings.append(
            Finding(
                severity='warn',
                code='OUT_OF_SCOPE_DOC',
                message=(
                    'Unrelated non-code path(s) are dirty outside this run scope: '
                    + ', '.join(doc_scope_warnings)
                    + '.'
                ),
            ),
        )

    code_like_changes_present = any(
        any(path_matches_scope(path, prefix) for prefix in PRODUCT_REQUIRED_PREFIXES)
        for path in scoped_paths
    )
    if stage in {'verify', 'release'} and code_like_changes_present and 'PRODUCT.md' not in changed_paths:
        findings.append(
            Finding(
                severity='error',
                code='PRODUCT_NOT_UPDATED',
                message='PRODUCT.md must be updated before verify/release when scripts, app code, or repo skills change.',
            ),
        )

    challenger_text = (run_dir / 'challenger-review.md').read_text(encoding='utf-8')
    blocking_count = _parse_int_after_label(challenger_text, 'Blocking item count')
    if 'Verdict: Fail' in challenger_text or 'Verdict: Blocked' in challenger_text or (blocking_count or 0) > 0:
        findings.append(
            Finding(
                severity='error',
                code='CHALLENGER_BLOCKED',
                message='Challenger review still contains a blocking verdict or non-zero blocking item count.',
            ),
        )

    if stage == 'release':
        verifier_text = (run_dir / 'verifier-report.md').read_text(encoding='utf-8')
        release_text = (run_dir / 'release-decision.md').read_text(encoding='utf-8')
        p0p1_blockers = _parse_int_after_label(verifier_text, 'Gate 4 blocking defects (P0/P1)')
        if 'Release recommendation: GO' not in verifier_text or (p0p1_blockers is None or p0p1_blockers > 0):
            findings.append(
                Finding(
                    severity='error',
                    code='VERIFIER_NOT_GO',
                    message='Verifier report does not show GO with zero P0/P1 blocking defects.',
                ),
            )
        if 'Decision: GO' not in release_text:
            findings.append(
                Finding(
                    severity='error',
                    code='RELEASE_NOT_GO',
                    message='Release decision is not marked GO.',
                ),
            )

    verdict = 'PASS'
    if any(finding.severity == 'error' for finding in findings):
        verdict = 'FAIL'
    elif findings:
        verdict = 'WARN'
    return GuardResult(verdict=verdict, findings=tuple(findings))


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Validate workflow run scope and gate readiness.')
    parser.add_argument('--run-id', required=True, help='Run id under docs/workflow/runs/')
    parser.add_argument(
        '--stage',
        choices=('plan', 'build', 'verify', 'release'),
        default='build',
        help='Workflow stage to validate',
    )
    parser.add_argument('--base-ref', help='Diff against git <base-ref>...HEAD instead of the working tree')
    parser.add_argument(
        '--path',
        action='append',
        default=[],
        help='Explicit changed path. When provided, git status is not used.',
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    changed_paths = tuple(normalize_path(path) for path in args.path if normalize_path(path))
    if not changed_paths:
        changed_paths = collect_changed_paths(REPO_ROOT, base_ref=args.base_ref)

    result = evaluate_guard(
        repo_root=REPO_ROOT,
        run_id=args.run_id,
        stage=args.stage,
        changed_paths=changed_paths,
    )

    print(f'workflow_guard verdict: {result.verdict}')
    if changed_paths:
        print(f'checked paths ({len(changed_paths)}):')
        for path in changed_paths:
            print(f'- {path}')
    else:
        print('checked paths: none')

    if result.findings:
        print('findings:')
        for finding in result.findings:
            print(f'- [{finding.severity.upper()}] {finding.code}: {finding.message}')
    else:
        print('findings: none')

    if result.verdict == 'FAIL':
        return 1
    if result.verdict == 'WARN':
        return 2
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
