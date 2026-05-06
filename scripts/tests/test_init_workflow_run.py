import tempfile
import unittest
from pathlib import Path

from scripts.init_workflow_run import RunSpec, build_run_id, init_run


class InitWorkflowRunTests(unittest.TestCase):
    def test_build_run_id_uses_slug_and_date_prefix(self):
        self.assertEqual(
            build_run_id(run_id=None, slug='Multi Agent Dev Loop', date_prefix='2026-05-02'),
            '2026-05-02-multi-agent-dev-loop',
        )

    def test_init_run_creates_required_files(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = Path(temp_dir)
            spec = RunSpec(
                run_id='2026-05-02-multi-agent-dev-loop',
                goal='Land repo-local workflow guardrails.',
                owner='codex',
                editable_paths=('scripts/workflow_guard.py', 'docs/workflow'),
                read_only_paths=('docs/TASK-INDEX.md',),
                additional_forbidden_paths=('docs/private-secrets.md',),
                acceptance_criteria=(
                    'Bootstrap script creates run artifacts.',
                    'Workflow guard blocks forbidden edits.',
                ),
                out_of_scope=('Production runtime changes.',),
                force=False,
            )

            written_paths = init_run(spec, repo_root=repo_root)

            self.assertEqual(len(written_paths), 6)
            run_dir = repo_root / 'docs' / 'workflow' / 'runs' / spec.run_id
            self.assertTrue((run_dir / 'SESSION-ANCHOR.md').exists())
            self.assertTrue((run_dir / 'planner-spec.md').exists())

            anchor_text = (run_dir / 'SESSION-ANCHOR.md').read_text(encoding='utf-8')
            self.assertIn('- scripts/workflow_guard.py', anchor_text)
            self.assertIn('- AC-01: Bootstrap script creates run artifacts.', anchor_text)

            planner_text = (run_dir / 'planner-spec.md').read_text(encoding='utf-8')
            self.assertIn('| AC-01 | Bootstrap script creates run artifacts. |', planner_text)

    def test_init_run_refuses_to_overwrite_without_force(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = Path(temp_dir)
            spec = RunSpec(
                run_id='2026-05-02-multi-agent-dev-loop',
                goal='Land repo-local workflow guardrails.',
                owner='codex',
                editable_paths=(),
                read_only_paths=(),
                additional_forbidden_paths=(),
                acceptance_criteria=(),
                out_of_scope=(),
                force=False,
            )

            init_run(spec, repo_root=repo_root)

            with self.assertRaises(FileExistsError):
                init_run(spec, repo_root=repo_root)


if __name__ == '__main__':
    unittest.main()
