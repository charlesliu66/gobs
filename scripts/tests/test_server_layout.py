import unittest

from scripts.server_layout import (
    apply_env_overrides,
    render_dual_env_nginx_config,
)


class ServerLayoutTests(unittest.TestCase):
    def test_render_dual_env_nginx_config_includes_prod_and_staging_blocks(self):
        config = render_dual_env_nginx_config(
            server_name='43.134.186.196',
            prod_root='/home/ubuntu/qas-h5/prod/frontend',
            prod_api_port=3001,
            staging_root='/home/ubuntu/qas-h5/staging/frontend',
            staging_listen_port=8080,
            staging_api_port=3002,
        )

        self.assertIn('listen 80;', config)
        self.assertIn('listen 8080;', config)
        self.assertIn('root /home/ubuntu/qas-h5/prod/frontend;', config)
        self.assertIn('root /home/ubuntu/qas-h5/staging/frontend;', config)
        self.assertIn('proxy_pass http://127.0.0.1:3001;', config)
        self.assertIn('proxy_pass http://127.0.0.1:3002;', config)

    def test_apply_env_overrides_replaces_existing_values_and_appends_missing_ones(self):
        original = (
            'PORT=3001\n'
            'API_DATA_DIR=/home/ubuntu/qas-h5/api/data\n'
            'JWT_SECRET=abc\n'
        )

        updated = apply_env_overrides(
            original,
            {
                'PORT': '3002',
                'API_DATA_DIR': '/home/ubuntu/qas-h5/staging/shared-data',
                'APP_ENVIRONMENT': 'staging',
            },
        )

        self.assertIn('PORT=3002', updated)
        self.assertIn('API_DATA_DIR=/home/ubuntu/qas-h5/staging/shared-data', updated)
        self.assertIn('APP_ENVIRONMENT=staging', updated)
        self.assertIn('JWT_SECRET=abc', updated)


if __name__ == '__main__':
    unittest.main()
