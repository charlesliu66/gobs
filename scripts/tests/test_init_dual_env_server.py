import unittest

from scripts.init_dual_env_server import _remote_name, _remote_parent


class InitDualEnvServerTests(unittest.TestCase):
    def test_remote_parent_uses_posix_semantics_for_linux_paths(self):
        self.assertEqual(_remote_parent('/home/ubuntu/qas-h5/prod/api'), '/home/ubuntu/qas-h5/prod')
        self.assertEqual(_remote_parent('/etc/nginx/sites-enabled/qas-h5'), '/etc/nginx/sites-enabled')

    def test_remote_name_uses_posix_semantics_for_linux_paths(self):
        self.assertEqual(_remote_name('/home/ubuntu/qas-h5/staging/api/.env'), '.env')
        self.assertEqual(_remote_name('/etc/nginx/sites-enabled/qas-h5'), 'qas-h5')


if __name__ == '__main__':
    unittest.main()
