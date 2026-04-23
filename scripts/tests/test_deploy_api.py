import unittest

from scripts.deploy_api import DeployRuntimeError, ensure_pm2_online


class DeployApiTests(unittest.TestCase):
    def test_ensure_pm2_online_passes_for_online_process(self):
        ensure_pm2_online(
            [
                {
                    'pm2_env': {
                        'name': 'qas-api-prod',
                        'status': 'online',
                        'restart_time': 2,
                    },
                },
            ],
            'qas-api-prod',
        )

    def test_ensure_pm2_online_rejects_non_online_status(self):
        with self.assertRaises(DeployRuntimeError) as ctx:
            ensure_pm2_online(
                [
                    {
                        'pm2_env': {
                            'name': 'qas-api-prod',
                            'status': 'stopped',
                            'restart_time': 4,
                        },
                    },
                ],
                'qas-api-prod',
            )

        self.assertIn('stopped', str(ctx.exception))

    def test_ensure_pm2_online_rejects_missing_process(self):
        with self.assertRaises(DeployRuntimeError) as ctx:
            ensure_pm2_online([], 'qas-api-prod')

        self.assertIn('qas-api-prod', str(ctx.exception))


if __name__ == '__main__':
    unittest.main()
