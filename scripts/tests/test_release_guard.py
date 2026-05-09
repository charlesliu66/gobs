import unittest
from datetime import datetime, timezone

from scripts.release_guard import (
    build_verified_release_payload,
    evaluate_promotion_readiness,
    get_remote_release_ready_path,
    select_release_blocking_paths,
)


class ReleaseGuardTests(unittest.TestCase):
    def test_remote_release_ready_path_uses_shared_data_directory(self):
        self.assertEqual(
            get_remote_release_ready_path('/home/ubuntu/qas-h5/staging/api'),
            '/home/ubuntu/qas-h5/staging/shared-data/.data/release-ready.json',
        )
        self.assertEqual(
            get_remote_release_ready_path('/home/ubuntu/qas-h5/prod/api'),
            '/home/ubuntu/qas-h5/prod/shared-data/.data/release-ready.json',
        )

    def test_verified_release_payload_tracks_commit_and_operator(self):
        payload = build_verified_release_payload(
            target='staging',
            commit_sha='e3fa4e9b6c8d1234567890abcdef1234567890ab',
            commit_short='e3fa4e9',
            verified_by='wei.liu',
            now=datetime(2026, 4, 23, 12, 0, 1, 2000, tzinfo=timezone.utc),
        )

        self.assertEqual(payload['target'], 'staging')
        self.assertEqual(payload['commitSha'], 'e3fa4e9b6c8d1234567890abcdef1234567890ab')
        self.assertEqual(payload['commitShort'], 'e3fa4e9')
        self.assertEqual(payload['verifiedBy'], 'wei.liu')
        self.assertEqual(payload['verifiedAt'], '2026-04-23T12:00:01.002Z')

    def test_promotion_readiness_passes_when_live_and_verified_shas_match_local_head(self):
        allowed, reason = evaluate_promotion_readiness(
            local_sha='e3fa4e9',
            staging_live_sha='e3fa4e9',
            staging_verified_sha='e3fa4e9',
        )

        self.assertTrue(allowed)
        self.assertEqual(reason, '')

    def test_promotion_readiness_fails_when_staging_live_sha_does_not_match(self):
        allowed, reason = evaluate_promotion_readiness(
            local_sha='e3fa4e9',
            staging_live_sha='6f01b42',
            staging_verified_sha='e3fa4e9',
        )

        self.assertFalse(allowed)
        self.assertIn('staging live version', reason)

    def test_promotion_readiness_fails_when_staging_verified_sha_does_not_match(self):
        allowed, reason = evaluate_promotion_readiness(
            local_sha='e3fa4e9',
            staging_live_sha='e3fa4e9',
            staging_verified_sha='6f01b42',
        )

        self.assertFalse(allowed)
        self.assertIn('verified staging release', reason)

    def test_select_release_blocking_paths_ignores_archive_and_temp_paths(self):
        blocked = select_release_blocking_paths(
            [
                'h5-video-tool/src/pages/Home.tsx',
                'scripts/deploy_all.py',
                'scripts/ops/archive/root-python/check/_check_cli.py',
                'tmp_server_ronin_check/log.txt',
                'docs/guides/2026-04-23-single-owner-staging-prod-release-runbook.md',
            ],
        )

        self.assertEqual(
            blocked,
            [
                'h5-video-tool/src/pages/Home.tsx',
                'scripts/deploy_all.py',
            ],
        )


if __name__ == '__main__':
    unittest.main()
