import tempfile
import unittest
from pathlib import Path

from scripts.init_workflow_run import RunSpec, init_run
from scripts.workflow_guard import evaluate_guard, parse_list_section


class WorkflowGuardTests(unittest.TestCase):
    def test_parse_list_section_reads_heading_items(self):
        markdown = """
## Editable Files (Builder Ownership)
- scripts/workflow_guard.py
- docs/workflow

## Read-Only References
- docs/TASK-INDEX.md
"""
        self.assertEqual(
            parse_list_section(markdown, 'Editable Files (Builder Ownership)'),
            ('scripts/workflow_guard.py', 'docs/workflow'),
        )

    def test_guard_fails_on_forbidden_path(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = self._create_run_repo(Path(temp_dir))
            result = evaluate_guard(
                repo_root=repo_root,
                run_id='2026-05-02-multi-agent-dev-loop',
                stage='build',
                changed_paths=(
                    'scripts/workflow_guard.py',
                    'h5-video-tool-api/src/services/studioPipeline.ts',
                ),
            )
            self.assertEqual(result.verdict, 'FAIL')
            self.assertTrue(any(finding.code == 'FORBIDDEN_PATH' for finding in result.findings))

    def test_guard_warns_on_unrelated_docs_noise(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = self._create_run_repo(Path(temp_dir))
            result = evaluate_guard(
                repo_root=repo_root,
                run_id='2026-05-02-multi-agent-dev-loop',
                stage='build',
                changed_paths=('scripts/workflow_guard.py', 'docs/plans/README.md'),
            )
            self.assertEqual(result.verdict, 'WARN')
            self.assertTrue(any(finding.code == 'OUT_OF_SCOPE_DOC' for finding in result.findings))

    def test_guard_requires_product_update_before_verify(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = self._create_run_repo(Path(temp_dir))
            result = evaluate_guard(
                repo_root=repo_root,
                run_id='2026-05-02-multi-agent-dev-loop',
                stage='verify',
                changed_paths=('scripts/workflow_guard.py',),
            )
            self.assertEqual(result.verdict, 'FAIL')
            self.assertTrue(any(finding.code == 'PRODUCT_NOT_UPDATED' for finding in result.findings))

    def test_guard_passes_release_when_scope_and_docs_are_ready(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = self._create_run_repo(Path(temp_dir), include_product=True)
            result = evaluate_guard(
                repo_root=repo_root,
                run_id='2026-05-02-multi-agent-dev-loop',
                stage='release',
                changed_paths=(
                    'scripts/workflow_guard.py',
                    'PRODUCT.md',
                    'docs/workflow/runs/2026-05-02-multi-agent-dev-loop/verifier-report.md',
                    'docs/workflow/runs/2026-05-02-multi-agent-dev-loop/release-decision.md',
                ),
            )
            self.assertEqual(result.verdict, 'PASS')

    def _create_run_repo(self, repo_root: Path, *, include_product: bool = False) -> Path:
        spec = RunSpec(
            run_id='2026-05-02-multi-agent-dev-loop',
            goal='Land repo-local workflow guardrails.',
            owner='codex',
            editable_paths=('scripts/workflow_guard.py', 'PRODUCT.md'),
            read_only_paths=('docs/TASK-INDEX.md',),
            additional_forbidden_paths=(),
            acceptance_criteria=(
                'Bootstrap script creates run artifacts.',
                'Workflow guard blocks forbidden edits.',
            ),
            out_of_scope=('Production runtime changes.',),
            force=False,
        )
        init_run(spec, repo_root=repo_root)

        run_dir = repo_root / 'docs' / 'workflow' / 'runs' / spec.run_id
        (run_dir / 'verifier-report.md').write_text(
            """# VerifierReport - 2026-05-02-multi-agent-dev-loop

## 7) Final Verification Verdict
- Gate 3 status: Pass
- Gate 4 blocking defects (P0/P1): 0
- Release recommendation: GO
""",
            encoding='utf-8',
        )
        (run_dir / 'release-decision.md').write_text(
            """# ReleaseDecision - 2026-05-02-multi-agent-dev-loop

## 2) Delivery Decision
- Decision: GO
- Decision time: 2026-05-02T02:00:00Z
- Decision owner: codex
""",
            encoding='utf-8',
        )
        if include_product:
            (repo_root / 'PRODUCT.md').write_text('# Product\n', encoding='utf-8')
        return repo_root


if __name__ == '__main__':
    unittest.main()
