import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

import scripts.deploy_frontend as deploy_frontend


class FakeChannel:
    def __init__(self):
        self.timeout = None

    def settimeout(self, timeout):
        self.timeout = timeout


class FakeSftp:
    def __init__(self):
        self.channel = FakeChannel()
        self.closed = False

    def get_channel(self):
        return self.channel

    def close(self):
        self.closed = True


class FakeClient:
    def __init__(self, sftp):
        self.sftp = sftp
        self.closed = False

    def open_sftp(self):
        return self.sftp

    def close(self):
        self.closed = True


class DeployFrontendTests(unittest.TestCase):
    def test_main_uploads_nested_dist_files_and_closes_resources(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            dist = Path(temp_dir)
            (dist / 'assets').mkdir()
            (dist / 'index.html').write_text('<html></html>\n', encoding='utf-8')
            (dist / 'assets' / 'main.js').write_text('console.log("ok")\n', encoding='utf-8')
            sftp = FakeSftp()
            client = FakeClient(sftp)
            config = SimpleNamespace(
                target='staging',
                host='example.invalid',
                user='ubuntu',
                password='secret',
                frontend_dir='/remote/frontend',
            )
            upload = Mock()
            open_sftp = Mock(side_effect=lambda _client: (sftp.channel.settimeout(120), sftp)[1])

            with patch.object(deploy_frontend, 'LOCAL_DIST', dist), \
                patch.object(deploy_frontend, 'build_target_config', return_value=config), \
                patch.object(deploy_frontend, 'connect_ssh_client', return_value=client), \
                patch.object(deploy_frontend, 'open_sftp_client', open_sftp), \
                patch.object(
                    deploy_frontend,
                    'create_directory_archive',
                    side_effect=lambda _source, archive: archive.write_bytes(b'archive'),
                ), \
                patch.object(deploy_frontend, 'upload_and_extract_archive', upload), \
                patch('sys.argv', ['deploy_frontend.py']):
                self.assertTrue(deploy_frontend.main())

            self.assertTrue(sftp.closed)
            self.assertTrue(client.closed)
            self.assertEqual(sftp.channel.timeout, 120)
            upload.assert_called_once()
            self.assertEqual(upload.call_args.kwargs['client'], client)
            self.assertEqual(upload.call_args.kwargs['sftp'], sftp)
            self.assertEqual(upload.call_args.kwargs['remote_dir'], '/remote/frontend')
            self.assertTrue(str(upload.call_args.kwargs['archive_path']).endswith('frontend-dist.tar.gz'))

    def test_main_rejects_missing_dist_without_connecting(self):
        missing_dist = Path('/tmp/gobs-missing-frontend-dist-for-test')
        connect = Mock()
        config = SimpleNamespace(target='staging')

        with patch.object(deploy_frontend, 'LOCAL_DIST', missing_dist), \
            patch.object(deploy_frontend, 'build_target_config', return_value=config), \
            patch.object(deploy_frontend, 'connect_ssh_client', connect), \
            patch('sys.argv', ['deploy_frontend.py']):
            self.assertFalse(deploy_frontend.main())

        connect.assert_not_called()


if __name__ == '__main__':
    unittest.main()
