import unittest

from scripts.deploy_all import (
    DeployGuardError,
    build_auto_phase_sequence,
    ensure_head_on_origin_main,
    ensure_prod_promotion_is_ready,
    ensure_release_paths_clean,
    parse_git_status_paths,
)


class DeployAllHelperTests(unittest.TestCase):
    def test_parse_git_status_paths_extracts_modified_untracked_and_renamed_files(self):
        paths = parse_git_status_paths(
            ' M h5-video-tool/src/App.tsx\n'
            '?? tmp_server_ronin_check/log.txt\n'
            'R  scripts/old_name.py -> scripts/deploy_all.py\n',
        )

        self.assertEqual(
            paths,
            [
                'h5-video-tool/src/App.tsx',
                'tmp_server_ronin_check/log.txt',
                'scripts/deploy_all.py',
            ],
        )

    def test_ensure_release_paths_clean_raises_for_release_blocking_changes(self):
        with self.assertRaises(DeployGuardError) as ctx:
            ensure_release_paths_clean(
                ' M h5-video-tool/src/App.tsx\n'
                ' M scripts/ops/archive/root-python/check/_check_cli.py\n',
            )

        self.assertIn('h5-video-tool/src/App.tsx', str(ctx.exception))
        self.assertNotIn('scripts/ops/archive/root-python/check/_check_cli.py', str(ctx.exception))

    def test_ensure_release_paths_clean_ignores_non_release_temp_and_archive_changes(self):
        ensure_release_paths_clean(
            ' M scripts/ops/archive/root-python/check/_check_cli.py\n'
            '?? tmp_server_ronin_check/log.txt\n'
            ' M docs/guides/2026-04-23-single-owner-staging-prod-release-runbook.md\n',
        )

    def test_ensure_head_on_origin_main_passes_when_origin_main_contains_head(self):
        ensure_head_on_origin_main('  origin/main\n  origin/release-backup\n')

    def test_ensure_head_on_origin_main_raises_when_origin_main_does_not_contain_head(self):
        with self.assertRaises(DeployGuardError) as ctx:
            ensure_head_on_origin_main('  origin/feature-x\n')

        self.assertIn('origin/main', str(ctx.exception))

    def test_ensure_prod_promotion_is_ready_passes_when_staging_live_and_verified_match(self):
        ensure_prod_promotion_is_ready(
            local_sha='e3fa4e9',
            staging_live_sha='e3fa4e9',
            staging_verified_sha='e3fa4e9',
        )

    def test_ensure_prod_promotion_is_ready_rejects_unverified_sha(self):
        with self.assertRaises(DeployGuardError) as ctx:
            ensure_prod_promotion_is_ready(
                local_sha='e3fa4e9',
                staging_live_sha='e3fa4e9',
                staging_verified_sha='6f01b42',
            )

        self.assertIn('verified staging release', str(ctx.exception))

    def test_ensure_prod_promotion_is_ready_allows_explicit_emergency_bypass(self):
        ensure_prod_promotion_is_ready(
            local_sha='e3fa4e9',
            staging_live_sha='6f01b42',
            staging_verified_sha='6f01b42',
            emergency_bypass=True,
        )

    def test_build_auto_phase_sequence_returns_prod_sequence_only_for_prod(self):
        self.assertEqual(build_auto_phase_sequence('prod'), ['preparing', 'deploying', 'verifying'])
        self.assertEqual(build_auto_phase_sequence('staging'), [])


if __name__ == '__main__':
    unittest.main()
