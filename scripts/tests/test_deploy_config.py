import tempfile
import unittest
from pathlib import Path

from scripts.deploy_config import DeployConfigError, build_target_config, load_local_env


class DeployConfigTests(unittest.TestCase):
    def test_staging_target_uses_staging_paths(self):
        config = build_target_config(
            'staging',
            env={
                'SERVER_HOST': '43.134.186.196',
                'SERVER_USER': 'ubuntu',
                'SERVER_PASSWORD': 'secret',
                'DEPLOY_STAGING_API_DIR': '/home/ubuntu/qas-h5/staging/api',
                'DEPLOY_STAGING_FRONTEND_DIR': '/home/ubuntu/qas-h5/staging/frontend',
                'DEPLOY_STAGING_PM2_NAME': 'qas-api-staging',
                'DEPLOY_STAGING_VERSION_URL': 'https://staging.example.com/api/system/version',
            },
            env_paths=[],
        )

        self.assertEqual(config.target, 'staging')
        self.assertEqual(config.api_dir, '/home/ubuntu/qas-h5/staging/api')
        self.assertEqual(config.frontend_dir, '/home/ubuntu/qas-h5/staging/frontend')
        self.assertEqual(config.pm2_name, 'qas-api-staging')
        self.assertEqual(config.version_url, 'https://staging.example.com/api/system/version')

    def test_prod_target_uses_prod_paths(self):
        config = build_target_config(
            'prod',
            env={
                'SERVER_HOST': '43.134.186.196',
                'SERVER_USER': 'ubuntu',
                'SERVER_PASSWORD': 'secret',
                'DEPLOY_PROD_API_DIR': '/home/ubuntu/qas-h5/prod/api',
                'DEPLOY_PROD_FRONTEND_DIR': '/home/ubuntu/qas-h5/prod/frontend',
                'DEPLOY_PROD_PM2_NAME': 'qas-api-prod',
                'DEPLOY_PROD_VERSION_URL': 'https://qas.example.com/api/system/version',
            },
            env_paths=[],
        )

        self.assertEqual(config.target, 'prod')
        self.assertEqual(config.pm2_name, 'qas-api-prod')
        self.assertEqual(config.version_url, 'https://qas.example.com/api/system/version')

    def test_missing_required_target_config_raises_clear_error(self):
        with self.assertRaises(DeployConfigError) as ctx:
            build_target_config(
                'prod',
                env={
                    'SERVER_HOST': '43.134.186.196',
                    'SERVER_USER': 'ubuntu',
                    'SERVER_PASSWORD': 'secret',
                },
                env_paths=[],
            )

        self.assertIn('DEPLOY_PROD_API_DIR', str(ctx.exception))

    def test_local_env_loader_reads_untracked_env_files(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            env_file = Path(temp_dir) / '.env'
            env_file.write_text(
                'SERVER_HOST=43.134.186.196\n'
                'SERVER_USER=ubuntu\n'
                'SERVER_PASSWORD=secret\n',
                encoding='utf-8',
            )

            loaded = load_local_env(base_env={}, env_paths=[env_file])

            self.assertEqual(loaded['SERVER_HOST'], '43.134.186.196')
            self.assertEqual(loaded['SERVER_USER'], 'ubuntu')
            self.assertEqual(loaded['SERVER_PASSWORD'], 'secret')


if __name__ == '__main__':
    unittest.main()
