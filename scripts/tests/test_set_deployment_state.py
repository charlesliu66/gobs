import unittest
from datetime import UTC, datetime

from scripts.set_deployment_state import (
    build_deployment_state_payload,
    get_remote_deployment_state_path,
)


class SetDeploymentStateTests(unittest.TestCase):
    def test_remote_path_uses_env_root_shared_data_directory(self):
        self.assertEqual(
            get_remote_deployment_state_path('/home/ubuntu/qas-h5/prod/api'),
            '/home/ubuntu/qas-h5/prod/shared-data/.data/deployment-state.json',
        )
        self.assertEqual(
            get_remote_deployment_state_path('/home/ubuntu/qas-h5/staging/api'),
            '/home/ubuntu/qas-h5/staging/shared-data/.data/deployment-state.json',
        )

    def test_deploying_payload_defaults_to_active_critical_and_read_only(self):
        payload = build_deployment_state_payload(
            'deploying',
            updated_by='wei.liu',
            now=datetime(2026, 4, 23, 6, 7, 8, 9000, tzinfo=UTC),
        )

        self.assertTrue(payload['active'])
        self.assertEqual(payload['phase'], 'deploying')
        self.assertEqual(payload['level'], 'critical')
        self.assertFalse(payload['allowWrites'])
        self.assertEqual(payload['updatedBy'], 'wei.liu')
        self.assertEqual(payload['updatedAt'], '2026-04-23T06:07:08.009Z')

    def test_idle_payload_resets_banner_messages_and_writes(self):
        payload = build_deployment_state_payload(
            'idle',
            updated_by='wei.liu',
            message_zh='',
            message_en='',
            now=datetime(2026, 4, 23, 8, 30, 0, tzinfo=UTC),
        )

        self.assertFalse(payload['active'])
        self.assertEqual(payload['phase'], 'idle')
        self.assertEqual(payload['level'], 'info')
        self.assertTrue(payload['allowWrites'])
        self.assertEqual(payload['messageZh'], '')
        self.assertEqual(payload['messageEn'], '')


if __name__ == '__main__':
    unittest.main()
