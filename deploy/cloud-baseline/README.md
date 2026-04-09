# Cloud Baseline Snapshot

This folder stores a frontend snapshot pulled from the cloud server.

- Source host: `49.235.61.68`
- Source path: `/home/ubuntu/gobs/frontend`
- Purpose: use cloud deployment as baseline when cloud is not a git repo

Use `scripts/sync-cloud-git-local.ps1 -CloudFirstSnapshotFallback` to refresh this snapshot.
