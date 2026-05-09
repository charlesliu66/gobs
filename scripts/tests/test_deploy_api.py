import tempfile
import tarfile
import unittest
from pathlib import Path

from scripts.deploy_api import (
    DeployRuntimeError,
    create_directory_archive,
    close_quietly,
    configure_ssh_keepalive,
    configure_sftp_timeout,
    ensure_pm2_online,
    ensure_runtime_scripts_exist,
    get_remote_runtime_scripts_dir,
    get_runtime_script_paths,
    remote_parent,
    run_remote_command,
    upload_and_extract_archive,
)


class FakeChannel:
    def __init__(self, *, stdout=None, stderr=None, exit_status=0, ready=True):
        self.stdout = list(stdout or [])
        self.stderr = list(stderr or [])
        self.exit_status = exit_status
        self.ready = ready
        self.closed = False
        self.timeout = None

    def settimeout(self, timeout):
        self.timeout = timeout

    def recv_ready(self):
        return bool(self.stdout)

    def recv(self, _size):
        return self.stdout.pop(0)

    def recv_stderr_ready(self):
        return bool(self.stderr)

    def recv_stderr(self, _size):
        return self.stderr.pop(0)

    def exit_status_ready(self):
        return self.ready

    def recv_exit_status(self):
        return self.exit_status

    def close(self):
        self.closed = True


class FakeChannelFile:
    def __init__(self, channel):
        self.channel = channel
        self.closed = False

    def close(self):
        self.closed = True


class FakeClient:
    def __init__(self, channel):
        self.channel = channel
        self.command = ''
        self.timeout = None

    def exec_command(self, command, timeout=None):
        self.command = command
        self.timeout = timeout
        return FakeChannelFile(self.channel), FakeChannelFile(self.channel), FakeChannelFile(self.channel)


class FakeSftp:
    def __init__(self, channel):
        self.channel = channel
        self.uploads = []

    def get_channel(self):
        return self.channel

    def put(self, local_path, remote_path, **kwargs):
        self.uploads.append((Path(local_path).name, remote_path, kwargs))


class FakeSock:
    def __init__(self):
        self.timeout = None

    def settimeout(self, timeout):
        self.timeout = timeout


class FakeTransport:
    def __init__(self):
        self.keepalive = None
        self.sock = FakeSock()

    def set_keepalive(self, interval):
        self.keepalive = interval


class FakeTransportClient:
    def __init__(self, transport):
        self.transport = transport

    def get_transport(self):
        return self.transport


class BrokenCloser:
    def close(self):
        raise RuntimeError('close failed')


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

    def test_configure_sftp_timeout_sets_underlying_channel_timeout(self):
        channel = FakeChannel()
        configure_sftp_timeout(FakeSftp(channel), timeout_seconds=45)

        self.assertEqual(channel.timeout, 45)

    def test_configure_ssh_keepalive_sets_transport_keepalive_and_socket_timeout(self):
        transport = FakeTransport()

        configure_ssh_keepalive(
            FakeTransportClient(transport),
            interval_seconds=15,
            socket_timeout_seconds=90,
        )

        self.assertEqual(transport.keepalive, 15)
        self.assertEqual(transport.sock.timeout, 90)

    def test_close_quietly_swallows_close_errors(self):
        close_quietly(BrokenCloser())

    def test_create_directory_archive_preserves_relative_paths(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir) / 'dist'
            root.mkdir()
            (root / 'index.js').write_text('console.log("ok")\n', encoding='utf-8')
            (root / 'config').mkdir()
            (root / 'config' / 'env.js').write_text('export default {}\n', encoding='utf-8')
            archive_path = Path(temp_dir) / 'dist.tar.gz'

            create_directory_archive(root, archive_path)

            with tarfile.open(archive_path, 'r:gz') as archive:
                self.assertEqual(
                    sorted(archive.getnames()),
                    ['config', 'config/env.js', 'index.js'],
                )

    def test_upload_and_extract_archive_uploads_single_archive_and_extracts_remote(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            archive_path = Path(temp_dir) / 'dist.tar.gz'
            archive_path.write_bytes(b'fake archive')
            channel = FakeChannel()
            client = FakeClient(channel)
            sftp = FakeSftp(channel)

            upload_and_extract_archive(
                client=client,
                sftp=sftp,
                archive_path=archive_path,
                remote_dir='/remote/api',
                remote_archive_name='api.tar.gz',
            )

            self.assertEqual(sftp.uploads[0][0], 'dist.tar.gz')
            self.assertEqual(sftp.uploads[0][1], '/tmp/api.tar.gz')
            self.assertFalse(sftp.uploads[0][2]['confirm'])
            self.assertTrue(callable(sftp.uploads[0][2]['callback']))
            self.assertIn('tar -xzf /tmp/api.tar.gz -C /remote/api', client.command)
            self.assertIn('rm -f /tmp/api.tar.gz', client.command)

    def test_run_remote_command_returns_stdout_when_command_succeeds(self):
        channel = FakeChannel(stdout=[b'hello\n'])
        client = FakeClient(channel)

        output = run_remote_command(client, 'echo hello', timeout_seconds=3, poll_interval_seconds=0)

        self.assertEqual(output, 'hello')
        self.assertEqual(client.command, 'echo hello')
        self.assertEqual(client.timeout, 3)

    def test_run_remote_command_raises_with_stderr_when_command_fails(self):
        channel = FakeChannel(stderr=[b'pm2 failed'], exit_status=1)
        client = FakeClient(channel)

        with self.assertRaises(DeployRuntimeError) as ctx:
            run_remote_command(client, 'pm2 restart qas-api-prod', timeout_seconds=3, poll_interval_seconds=0)

        self.assertIn('pm2 failed', str(ctx.exception))
        self.assertIn('pm2 restart qas-api-prod', str(ctx.exception))

    def test_run_remote_command_closes_channel_and_raises_when_command_times_out(self):
        channel = FakeChannel(ready=False)
        client = FakeClient(channel)

        with self.assertRaises(DeployRuntimeError) as ctx:
            run_remote_command(client, 'pm2 jlist', timeout_seconds=0.001, poll_interval_seconds=0)

        self.assertTrue(channel.closed)
        self.assertIn('远端命令超时', str(ctx.exception))


if __name__ == '__main__':
    unittest.main()
