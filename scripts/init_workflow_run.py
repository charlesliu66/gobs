from __future__ import annotations

import argparse
import datetime as dt
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

try:
    from scripts.workflow_common import GLOBAL_FORBIDDEN_PATHS, slugify
except ImportError:  # pragma: no cover - direct script execution fallback
    from workflow_common import GLOBAL_FORBIDDEN_PATHS, slugify


REPO_ROOT = Path(__file__).resolve().parent.parent


@dataclass(frozen=True)
class RunSpec:
    run_id: str
    goal: str
    owner: str
    editable_paths: tuple[str, ...]
    read_only_paths: tuple[str, ...]
    additional_forbidden_paths: tuple[str, ...]
    acceptance_criteria: tuple[str, ...]
    out_of_scope: tuple[str, ...]
    force: bool = False


def _today_iso() -> str:
    return dt.date.today().isoformat()


def build_run_id(*, run_id: str | None, slug: str | None, date_prefix: str | None = None) -> str:
    if run_id:
        return run_id.strip()
    if not slug:
        raise ValueError('Either --run-id or --slug is required.')
    return f'{(date_prefix or _today_iso()).strip()}-{slugify(slug)}'


def _git_head_short(repo_root: Path) -> str:
    try:
        result = subprocess.run(
            ['git', 'rev-parse', '--short', 'HEAD'],
            cwd=repo_root,
            capture_output=True,
            check=True,
            text=True,
        )
    except (subprocess.CalledProcessError, FileNotFoundError):
        return 'unknown'
    return result.stdout.strip() or 'unknown'


def _git_branch(repo_root: Path) -> str:
    try:
        result = subprocess.run(
            ['git', 'branch', '--show-current'],
            cwd=repo_root,
            capture_output=True,
            check=True,
            text=True,
        )
    except (subprocess.CalledProcessError, FileNotFoundError):
        return 'unknown'
    return result.stdout.strip() or 'detached'


def _bullet_block(items: tuple[str, ...], fallback: str) -> str:
    if not items:
        return f'- {fallback}'
    return '\n'.join(f'- {item}' for item in items)


def _ac_block(items: tuple[str, ...]) -> str:
    if not items:
        return '- AC-01: [TODO]\n- AC-02: [TODO]'
    return '\n'.join(f'- AC-{index:02d}: {item}' for index, item in enumerate(items, start=1))


def _ac_table(items: tuple[str, ...]) -> str:
    if not items:
        return '| AC-01 | [TODO] | [TODO] | [TODO] |\n| AC-02 | [TODO] | [TODO] | [TODO] |'
    rows = []
    for index, item in enumerate(items, start=1):
        ac_id = f'AC-{index:02d}'
        rows.append(f'| {ac_id} | {item} | [TODO] | [TODO] |')
    return '\n'.join(rows)


def _write_file(path: Path, content: str, *, force: bool) -> None:
    if path.exists() and not force:
        raise FileExistsError(f'{path} already exists. Re-run with --force to overwrite.')
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.rstrip() + '\n', encoding='utf-8')


def build_run_files(spec: RunSpec, *, repo_root: Path = REPO_ROOT) -> dict[str, str]:
    run_dir = repo_root / 'docs' / 'workflow' / 'runs' / spec.run_id
    branch = _git_branch(repo_root)
    head_short = _git_head_short(repo_root)
    now_iso = dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')

    session_anchor = f"""# SESSION-ANCHOR - {spec.run_id}

## Run Summary
- Run ID: {spec.run_id}
- Goal: {spec.goal}
- Owner: {spec.owner}
- Branch or commit context: {branch}@{head_short}
- Last updated: {now_iso}

## Acceptance Criteria Snapshot
{_ac_block(spec.acceptance_criteria)}

## Editable Files (Builder Ownership)
{_bullet_block(spec.editable_paths, '[TODO] Add builder-owned files or directories')}

## Read-Only References
{_bullet_block(spec.read_only_paths, 'docs/TASK-INDEX.md')}

## Additional Forbidden Paths
{_bullet_block(spec.additional_forbidden_paths, '[None beyond AGENTS.md global forbidden files]')}

## Out of Scope
{_bullet_block(spec.out_of_scope, '[TODO] Add explicit non-goals')}

## Progress Checklist
- [ ] Planner approved
- [ ] Challenger approved
- [ ] Builder self-test recorded
- [ ] Verifier P0/P1 count is zero
- [ ] Release decision written

## Escalation Rules
- Escalate if a change requires touching any AGENTS.md forbidden file.
- Escalate if a new env var is required and `.env.example` is not yet updated.
- Escalate if acceptance criteria need to expand beyond this run scope.
- Escalate before any prod release decision.
"""

    planner_spec = f"""# PlannerSpec - {spec.run_id}

## 1) Project Goal
- Business goal: {spec.goal}
- User value: Reduce operator involvement while improving delivery stability.
- Success metrics: Fewer scope collisions, faster run setup, and repeatable pre-release checks.

## 2) Scope
### In Scope
- Repo-local workflow automation for this run.
- Run artifacts, guardrails, and documentation needed for multi-agent delivery.

### Out of Scope
{_bullet_block(spec.out_of_scope, '[TODO] Add explicit non-goals')}

## 3) Module Breakdown
- Workflow bootstrap:
  - Responsibilities: Create a fresh run folder with required artifacts.
  - Dependencies: `docs/workflow/*`, `scripts/`.
- Workflow guard:
  - Responsibilities: Enforce scope boundaries and stage readiness checks.
  - Dependencies: `git status`, `SESSION-ANCHOR.md`, run artifacts.

## 4) Technical Approach
- Architecture decisions: Keep the workflow repo-local and text-first so Codex, Cursor, and Claude can all use it.
- Data flow: Session anchor defines editable scope, guard validates changed paths, eval/build evidence feeds verifier.
- API or interface changes: CLI commands only.
- Migration or compatibility notes: No production runtime behavior should change.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Dirty worktree | Unrelated local edits exist outside run scope | False positives or accidental staging | Guard warns or fails by stage and path severity | Integrator |
| Workflow drift | Agents skip run artifacts | Build starts without clear scope | Guard requires run docs by stage | Orchestrator |
| Tooling-only release gaps | Docs/scripts change without PRODUCT update | Lost internal change history | Guard enforces PRODUCT.md on verify/release | Builder |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
{_ac_table(spec.acceptance_criteria)}

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | Run bootstrap creates all required files. |
| Edge cases | Existing run folder without `--force` is rejected. |
| Error path | Guard fails on forbidden files or missing artifacts. |
| Regression | Existing workflow docs remain consistent with new scripts. |
| Stress/Stability | Guard handles unrelated dirty docs without misclassifying them as in-scope code edits. |

## 8) Delivery Artifacts
- Code changes: workflow docs, scripts, optional skill docs, tests.
- Test evidence: Python unit tests, workflow guard dry-runs, `bash scripts/eval.sh {spec.run_id}`.
- Documents to update: run artifacts, `PRODUCT.md`, `CHANGELOG.md`.
"""

    challenger_review = f"""# ChallengerReview - {spec.run_id}

## 1) Inputs
- PlannerSpec file: `docs/workflow/runs/{spec.run_id}/planner-spec.md`
- Planner version/date: {now_iso}

## 2) Challenge Findings
| ID | Area | Severity | Finding | Why it matters | Required action |
|---|---|---|---|---|---|
| C-001 | Operability | should-fix-in-plan | Dirty worktree handling must distinguish scoped code from unrelated docs noise. | Over-blocking would reduce adoption. | Make guard severity depend on path type and stage. |

## 3) Plan Improvement Requests
- Request 1:
  - Planner section to update: `## 4) Technical Approach`
  - Expected revision: Clarify how run scope is parsed from `SESSION-ANCHOR.md`.

## 4) Gate 1.5 Verdict
- Verdict: Pass
- Blocking item count: 0
- Notes: Build may start after the run anchor lists editable files explicitly.

## 5) Residual Risks Accepted for Build
- Risk:
  - Why accepted now: Existing user-local dirty docs are common in this repo.
  - Boundary: Treat unrelated docs as warnings until release.
  - Follow-up gate: Verifier
"""

    builder_report = f"""# BuilderReport - {spec.run_id}

## 1) Inputs
- Spec file: `docs/workflow/runs/{spec.run_id}/planner-spec.md`
- Spec version/date: {now_iso}
- Acceptance criteria covered: [TODO]

## 2) Implemented
| AC ID | What was implemented | Files changed | Notes |
|---|---|---|---|
| AC-01 | [TODO] | [TODO] | [TODO] |

## 3) Not Implemented
| AC ID | Reason | Impact | Proposed next step |
|---|---|---|---|
| [None] | [TODO] | [TODO] | [TODO] |

## 4) Self-Test Results
| Test type | Command/Method | Result | Evidence |
|---|---|---|---|
| Unit | [TODO] | [TODO] | [TODO] |

## 5) Known Risks and Uncertainties
- Risk:
  - Why it remains: [TODO]
  - Possible impact: [TODO]
  - Suggested follow-up: [TODO]

## 6) Scope Compliance Statement
- I did not expand scope beyond the approved PlannerSpec: [TODO]
- If No, list deviations and reasons: [TODO]

## 7) Change Summary
- What changed: [TODO]
- Why changed: [TODO]
- What did not change: [TODO]
"""

    verifier_report = f"""# VerifierReport - {spec.run_id}

## 1) Validation Scope
- Spec file: `docs/workflow/runs/{spec.run_id}/planner-spec.md`
- Build report file: `docs/workflow/runs/{spec.run_id}/builder-report.md`
- Version or commit under test: {branch}@{head_short}

## 2) Coverage Checklist
- Happy path: [TODO]
- Edge cases: [TODO]
- Loading state: [TODO]
- Empty state: [TODO]
- Error/failure path: [TODO]
- Regression: [TODO]
- Stress/Stability: [TODO]
- Race/Concurrency: [TODO]

## 3) Pass Items
| Area | Case | Result | Evidence |
|---|---|---|---|
| [TODO] | [TODO] | [TODO] | [TODO] |

## 4) Failed Items (Defect List)
| Defect ID | Severity (P0-P3) | Title | Repro Steps | Expected | Actual | Suggested Fix Order |
|---|---|---|---|---|---|---|
| [None] | [TODO] | [TODO] | [TODO] | [TODO] | [TODO] | [TODO] |

## 5) Stress and Stability Results
| Scenario | Load/Duration | Metric | Result | Risk |
|---|---|---|---|---|
| [TODO] | [TODO] | [TODO] | [TODO] | [TODO] |

## 6) Regression Result
- Full/targeted regression summary: [TODO]
- New regressions found: [TODO]

## 7) Final Verification Verdict
- Gate 3 status: [TODO]
- Gate 4 blocking defects (P0/P1): [TODO]
- Release recommendation: [TODO]
"""

    release_decision = f"""# ReleaseDecision - {spec.run_id}

## 1) Inputs Reviewed
- PlannerSpec: `docs/workflow/runs/{spec.run_id}/planner-spec.md`
- BuilderReport: `docs/workflow/runs/{spec.run_id}/builder-report.md`
- VerifierReport: `docs/workflow/runs/{spec.run_id}/verifier-report.md`
- Additional evidence: [TODO]

## 2) Delivery Decision
- Decision: [TODO]
- Decision time: [TODO]
- Decision owner: {spec.owner}

## 3) Blocking Issues
| ID | Severity | Description | Owner | Required before release |
|---|---|---|---|---|
| [None] | [TODO] | [TODO] | [TODO] | [TODO] |

## 4) Accepted Risks
| Risk | Severity | Why accepted | Boundary/Workaround | Follow-up date |
|---|---|---|---|---|
| [None] | [TODO] | [TODO] | [TODO] | [TODO] |

## 5) Scope Compliance
- Delivered in scope: [TODO]
- Out-of-scope changes found: [TODO]
- Notes: [TODO]

## 6) Release Boundary
- What is guaranteed: [TODO]
- What is not guaranteed: [TODO]
- Environments validated: [TODO]

## 7) Next Actions
1. [TODO]
2. [TODO]
3. [TODO]
"""

    return {
        str(run_dir / 'SESSION-ANCHOR.md'): session_anchor,
        str(run_dir / 'planner-spec.md'): planner_spec,
        str(run_dir / 'challenger-review.md'): challenger_review,
        str(run_dir / 'builder-report.md'): builder_report,
        str(run_dir / 'verifier-report.md'): verifier_report,
        str(run_dir / 'release-decision.md'): release_decision,
    }


def init_run(spec: RunSpec, *, repo_root: Path = REPO_ROOT) -> list[Path]:
    files = build_run_files(spec, repo_root=repo_root)
    written_paths: list[Path] = []
    for raw_path, content in files.items():
        path = Path(raw_path)
        _write_file(path, content, force=spec.force)
        written_paths.append(path)
    return written_paths


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Create a new workflow run folder with required artifacts.')
    parser.add_argument('--run-id', help='Explicit run id, e.g. 2026-05-02-multi-agent-dev-loop')
    parser.add_argument('--slug', help='Slug used with today date when --run-id is omitted')
    parser.add_argument('--goal', required=True, help='One-sentence run goal')
    parser.add_argument('--owner', default='codex', help='Owner name for the run artifacts')
    parser.add_argument('--date-prefix', help='Override date prefix for generated run ids')
    parser.add_argument('--ac', action='append', default=[], help='Acceptance criterion summary')
    parser.add_argument('--editable', action='append', default=[], help='Editable file or directory for builder ownership')
    parser.add_argument('--reference', action='append', default=[], help='Read-only reference file')
    parser.add_argument('--forbidden', action='append', default=[], help='Additional forbidden path for this run')
    parser.add_argument('--out-of-scope', action='append', default=[], help='Explicit out-of-scope note')
    parser.add_argument('--force', action='store_true', help='Overwrite existing files in the run folder')
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    try:
        run_id = build_run_id(run_id=args.run_id, slug=args.slug, date_prefix=args.date_prefix)
    except ValueError as exc:
        print(f'ERROR: {exc}', file=sys.stderr)
        return 1

    spec = RunSpec(
        run_id=run_id,
        goal=args.goal.strip(),
        owner=args.owner.strip() or 'codex',
        editable_paths=tuple(dict.fromkeys(path.strip() for path in args.editable if path.strip())),
        read_only_paths=tuple(dict.fromkeys(path.strip() for path in args.reference if path.strip())),
        additional_forbidden_paths=tuple(dict.fromkeys(path.strip() for path in args.forbidden if path.strip())),
        acceptance_criteria=tuple(item.strip() for item in args.ac if item.strip()),
        out_of_scope=tuple(item.strip() for item in args.out_of_scope if item.strip()),
        force=args.force,
    )

    try:
        written = init_run(spec, repo_root=REPO_ROOT)
    except FileExistsError as exc:
        print(f'ERROR: {exc}', file=sys.stderr)
        return 1

    print(f'Initialized workflow run: {spec.run_id}')
    print(f'Global forbidden paths tracked: {len(GLOBAL_FORBIDDEN_PATHS)}')
    for path in written:
        print(path.relative_to(REPO_ROOT))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
