from __future__ import annotations


def render_dual_env_nginx_config(
    *,
    server_name: str,
    prod_root: str,
    prod_api_port: int,
    staging_root: str,
    staging_listen_port: int,
    staging_api_port: int,
) -> str:
    def _server_block(listen: int, root: str, api_port: int) -> str:
        return f"""server {{
    listen {listen};
    server_name {server_name};

    root {root};
    index index.html;

    location / {{
        try_files $uri $uri/ /index.html;
    }}

    location /api {{
        proxy_pass http://127.0.0.1:{api_port};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        client_max_body_size 100M;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        proxy_buffering off;
        proxy_cache off;
    }}
}}"""

    return (
        f"{_server_block(80, prod_root, prod_api_port)}\n\n"
        f"{_server_block(staging_listen_port, staging_root, staging_api_port)}\n"
    )


def apply_env_overrides(original_text: str, overrides: dict[str, str]) -> str:
    lines = original_text.splitlines()
    seen_keys: set[str] = set()
    updated_lines: list[str] = []

    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith('#') or '=' not in line:
            updated_lines.append(line)
            continue

        key, _value = line.split('=', 1)
        normalized_key = key.strip()
        if normalized_key in overrides:
            updated_lines.append(f'{normalized_key}={overrides[normalized_key]}')
            seen_keys.add(normalized_key)
        else:
            updated_lines.append(line)

    for key, value in overrides.items():
        if key not in seen_keys:
            updated_lines.append(f'{key}={value}')

    return '\n'.join(updated_lines).rstrip() + '\n'
