# Challenger Review - Advanced Studio Prompt Reference UX

## Review Result

Decision: PASS.

## Must-Fix Checks

- Forbidden backend service files were not modified.
- Local uploads remain one-off and do not auto-import into Asset Library.
- Prompt optimizer only receives selected reference summaries and must not invent material tokens.
- Visible legacy controls were removed from Advanced Studio without deleting legacy Drive compatibility.
- Seedance duration and source constraints stay aligned with the previous v0.204 contract.

## Risk Notes

- Native file chooser automation could not be fully exercised in headless Chrome. Human staging smoke should upload one local image/video in the three Advanced Studio modes before prod promotion.
- Existing legacy mojibake outside touched UI surfaces is not part of this release.
