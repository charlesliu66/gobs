# Smoke Matrix

Use this matrix to decide what to run.

## quick

`quick` is for:

- pre-release sanity checks
- post-deploy confidence checks
- fast confirmation that the environment is alive

Expected automated checks:

- frontend root is reachable
- version endpoint is reachable
- environment marker is sensible
- key H5 routes are reachable
- deployed commit matches expectation when provided

## full

`full` includes everything in `quick` plus human follow-up checks.

Use it for:

- staging sign-off
- prod sign-off
- verifier report preparation

Expected manual follow-up areas:

- advanced production path
- quickfilm path
- history/gallery path
- asset library path
- distribute path

