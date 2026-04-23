import tempfile
import unittest
from pathlib import Path

from scripts.deploy_api import (
    DeployRuntimeError,
    ensure_pm2_online,
    ensure_runtime_scripts_exist,
    get_remote_runtime_scripts_dir,
    get_runtime_script_paths,
    remote_parent,
)


class DeployApiTests(unittest.TestCase):
    def test_remote_runtime_scripts_dir_sits_next_to_api_dir(self):
        self.assertEqual(remote_parent('/home/ubuntu/qas-h5/prod/api'), '/home/ubuntu/qas-h5/prod')
        self.assertEqual(
            get_remote_runtime_scripts_dir('/home/ubuntu/qas-h5/prod/api'),
            '/home/ubuntu/qas-h5/prod/scripts',
        )

    def test_runtime_script_paths_include_imagen_generator(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            script_dir = Path(temp_dir)
            expected = script_dir / 'imagen_generate.py'

            self.assertEqual(get_runtime_script_paths(script_dir), [expected])

    def test_ensure_runtime_scripts_exist_rejects_missing_script(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            missing = Path(temp_dir) / 'imagen_generate.py'

            with self.assertRaises(DeployRuntimeError) as ctx:
                ensure_runtime_scripts_exist([missing])

            self.assertIn('imagen_generate.py', str(ctx.exception))

    def test_ensure_runtime_scripts_exist_passes_when_script_exists(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            script_path = Path(temp_dir) / 'imagen_generate.py'
            script_path.write_text('print("ok")\n', encoding='utf-8')

            ensure_runtime_scripts_exist([script_path])

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
