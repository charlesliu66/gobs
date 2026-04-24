import unittest

from scripts.init_dual_env_server import _legacy_data_migration_commands, _remote_name, _remote_parent


class InitDualEnvServerTests(unittest.TestCase):
    def test_remote_parent_uses_posix_semantics_for_linux_paths(self):
        self.assertEqual(_remote_parent('/home/ubuntu/qas-h5/prod/api'), '/home/ubuntu/qas-h5/prod')
        self.assertEqual(_remote_parent('/etc/nginx/sites-enabled/qas-h5'), '/etc/nginx/sites-enabled')

    def test_remote_name_uses_posix_semantics_for_linux_paths(self):
        self.assertEqual(_remote_name('/home/ubuntu/qas-h5/staging/api/.env'), '.env')
        self.assertEqual(_remote_name('/etc/nginx/sites-enabled/qas-h5'), 'qas-h5')

    def test_legacy_data_migration_commands_cover_output_and_editor_projects(self):
        commands = _legacy_data_migration_commands(
            '/home/ubuntu/qas-h5/api',
            '/home/ubuntu/qas-h5/prod/shared-data',
        )

        self.assertTrue(
            any("/home/ubuntu/qas-h5/api/output" in command and "/home/ubuntu/qas-h5/prod/shared-data/output" in command for command in commands)
        )
        self.assertTrue(
            any("/home/ubuntu/qas-h5/api/editor-projects" in command and "/home/ubuntu/qas-h5/prod/shared-data/editor-projects" in command for command in commands)
        )


if __name__ == '__main__':
    unittest.main()
