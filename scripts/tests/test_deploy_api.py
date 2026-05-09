import tempfile
import tarfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from scripts.deploy_api import (
    DeployRuntimeError,
    connect_ssh_client,
    create_directory_archive,
    close_quietly,
    configure_ssh_keepalive,
    ensure_pm2_online,
    ensure_runtime_scripts_exist,
    get_remote_runtime_scripts_dir,
    get_runtime_script_paths,
    remote_parent,
    run_remote_command,
    stream_file_to_remote_command,
    upload_and_extract_archive,
    upload_archive_to_remote_path,
    upload_file_to_remote_path,
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


class FakeStreamChannel(FakeChannel):
    def __init__(self, *, stdout=None, stderr=None, exit_status=0):
        super().__init__(stdout=stdout, stderr=stderr, exit_status=exit_status, ready=False)
        self.sent = bytearray()
        self.shutdown = False

    def shutdown_write(self):
        self.shutdown = True
        self.ready = True


class FakeChannelFile:
    def __init__(self, channel, *, writable=False):
        self.channel = channel
        self.writable = writable
        self.closed = False

    def write(self, data):
        if not self.writable:
            raise AssertionError('not writable')
        self.channel.sent.extend(data)

    def flush(self):
        pass

    def close(self):
        self.closed = True
        if self.writable and hasattr(self.channel, 'shutdown_write'):
            self.channel.shutdown_write()


class FakeClient:
    def __init__(self, channel, transport=None):
        self.channel = channel
        self.transport = transport
        self.command = ''
        self.commands = []
        self.timeout = None
        self.closed = False

    def exec_command(self, command, timeout=None):
        self.command = command
        self.commands.append(command)
        self.timeout = timeout
        return (
            FakeChannelFile(self.channel, writable=True),
            FakeChannelFile(self.channel),
            FakeChannelFile(self.channel),
        )

    def get_transport(self):
        return self.transport

    def close(self):
        self.closed = True


class FakeSock:
    def __init__(self):
        self.timeout = None

    def settimeout(self, timeout):
        self.timeout = timeout


class FakeTransport:
    def __init__(self, channel=None):
        self.keepalive = None
        self.sock = FakeSock()
        self.channel = channel
        self.open_session_timeout = None

    def set_keepalive(self, interval):
        self.keepalive = interval

    def open_session(self, timeout=None):
        self.open_session_timeout = timeout
        return self.channel


class FakeTransportClient:
    def __init__(self, transport):
        self.transport = transport

    def get_transport(self):
        return self.transport


class BrokenCloser:
    def close(self):
        raise RuntimeError('close failed')


class FakeSSHClientForConnect:
    def __init__(self):
        self.policy = None
        self.connect_kwargs = None
        self.transport = FakeTransport()

    def set_missing_host_key_policy(self, policy):
        self.policy = policy

    def connect(self, hostname, **kwargs):
        kwargs['hostname'] = hostname
        self.connect_kwargs = kwargs

    def get_transport(self):
        return self.transport


class DeployApiTests(unittest.TestCase):
    def test_connect_ssh_client_uses_password_only_auth(self):
        fake_client = FakeSSHClientForConnect()
        config = SimpleNamespace(host='example.com', user='ubuntu', password='secret')

        with patch('scripts.deploy_api.paramiko.SSHClient', return_value=fake_client):
            client = connect_ssh_client(config, timeout_seconds=7)

        self.assertIs(client, fake_client)
        self.assertEqual(fake_client.connect_kwargs['hostname'], 'example.com')
        self.assertEqual(fake_client.connect_kwargs['username'], 'ubuntu')
        self.assertEqual(fake_client.connect_kwargs['password'], 'secret')
        self.assertFalse(fake_client.connect_kwargs['look_for_keys'])
        self.assertFalse(fake_client.connect_kwargs['allow_agent'])
        self.assertEqual(fake_client.connect_kwargs['timeout'], 7)

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

    def test_stream_file_to_remote_command_sends_file_bytes_and_closes_stdin(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = Path(temp_dir) / 'payload.bin'
            file_path.write_bytes(b'fake payload')
            channel = FakeStreamChannel(stdout=[b'ok\n'])
            client = FakeClient(channel)

            output = stream_file_to_remote_command(client, 'cat > /tmp/payload', file_path)

            self.assertEqual(output, 'ok')
            self.assertEqual(client.command, 'cat > /tmp/payload')
            self.assertEqual(channel.sent, b'fake payload')
            self.assertTrue(channel.shutdown)
            self.assertEqual(channel.timeout, 600)
            self.assertEqual(client.timeout, 600)

    def test_upload_and_extract_archive_streams_archive_and_extracts_remote(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            archive_path = Path(temp_dir) / 'dist.tar.gz'
            archive_path.write_bytes(b'fake archive')
            channel = FakeStreamChannel()
            client = FakeClient(channel)

            upload_and_extract_archive(
                client=client,
                archive_path=archive_path,
                remote_dir='/remote/api',
                remote_archive_name='api.tar.gz',
            )

            self.assertEqual(channel.sent, b'fake archive')
            self.assertIn('cat > /tmp/api.tar.gz', client.commands[0])
            self.assertIn('tar -xzf /tmp/api.tar.gz -C /remote/api', client.commands[1])
            self.assertIn('rm -f /tmp/api.tar.gz', client.commands[1])

    def test_upload_archive_to_remote_path_chunks_large_archive_with_upload_factory(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            archive_path = Path(temp_dir) / 'dist.tar.gz'
            archive_path.write_bytes(b'abcdefghijkl')
            client = FakeClient(FakeChannel())
            upload_clients = []

            def connect_factory():
                upload_client = FakeClient(FakeChannel())
                upload_clients.append(upload_client)
                return upload_client

            with (
                patch('scripts.deploy_api.CHUNKED_UPLOAD_THRESHOLD_BYTES', 4),
                patch('scripts.deploy_api.REMOTE_UPLOAD_PART_SIZE_BYTES', 4),
            ):
                upload_archive_to_remote_path(
                    client,
                    archive_path,
                    '/tmp/dist.tar.gz',
                    connect_factory=connect_factory,
                )

            self.assertEqual(len(upload_clients), 3)
            self.assertEqual(client.commands, [
                'cat /tmp/dist.tar.gz.part-0000 /tmp/dist.tar.gz.part-0001 /tmp/dist.tar.gz.part-0002 > /tmp/dist.tar.gz && rm -f /tmp/dist.tar.gz.part-0000 /tmp/dist.tar.gz.part-0001 /tmp/dist.tar.gz.part-0002'
            ])
            for upload_client in upload_clients:
                self.assertTrue(upload_client.closed)
                self.assertIn('base64 -d > /tmp/dist.tar.gz.part-', upload_client.command)

    def test_upload_file_to_remote_path_streams_file_to_cat_command(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            local_path = Path(temp_dir) / 'imagen_generate.py'
            local_path.write_text('print("ok")\n', encoding='utf-8')
            channel = FakeStreamChannel()
            client = FakeClient(channel)

            upload_file_to_remote_path(client, local_path, '/remote/scripts/imagen_generate.py')

            self.assertEqual(channel.sent, b'print("ok")\n')
            self.assertIn('mkdir -p /remote/scripts', client.command)
            self.assertIn('cat > /remote/scripts/imagen_generate.py', client.command)

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
