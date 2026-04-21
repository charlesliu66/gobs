# Distribution Caption Auth And TikTok Copy Design

## Goal

Fix the distribution page caption-generation failure caused by missing JWT auth, and tighten generated caption/hashtag output so it reads like short-form TikTok-native copy instead of generic prompt text.

## Approved Approach

Use the existing JWT model rather than relaxing backend auth. The frontend prompt-generation requests on the distribution page should send the same `Authorization: Bearer <gobs_token>` header as other protected APIs.

At the same time, refine caption generation to better fit TikTok distribution:

- shorter hook-first captions
- stronger viewer-facing language instead of technical prompt fragments
- fewer, cleaner hashtags
- language-aware fallback output when LLM parsing fails

## Scope

Frontend:

- `h5-video-tool/src/api/promptPolish.ts`
- `h5-video-tool/src/pages/TabDistribute.tsx`
- new regression tests under `h5-video-tool/tests/`

Backend:

- `h5-video-tool-api/src/services/promptPolish.ts`
- new regression tests under `h5-video-tool-api/tests/`

Docs:

- `PRODUCT.md`
- this design doc
- implementation plan doc

## Data Flow

1. User clicks caption generate or language switch in distribution page.
2. Frontend prompt API helper builds authenticated JSON headers from `gobs_token`.
3. Backend `jwtAuthMiddleware` accepts the request without any auth exceptions.
4. `generateCaptionForPost()` applies stricter TikTok rules and fallback shaping.
5. UI shows cleaner caption/hashtags and clearer helper copy for distribution usage.

## Behavior Changes

### Auth

- `generate-caption`
- `translate-caption`
- other prompt POST helpers in the same frontend module

All of them should send JWT automatically, avoiding the current `未提供认证 token` failure.

### TikTok copy rules

- caption should open with a hook, reaction, suspense, or POV framing
- avoid copying long production prompts or technical scene descriptions
- hashtags should be normalized to a smaller set, roughly 4-6 relevant tags
- fallback content should keep traffic tags but prefer topic tags over generic stuffing

## Risks

- If frontend auth headers are only fixed for one method, the same bug may remain in other prompt endpoints in the same module.
- Tightening hashtags too much could reduce flexibility for multilingual output, so normalization should preserve valid user/LLM tags while trimming excess.
- `promptPolish.ts` is used in other flows, so the new fallback must stay generic enough not to break non-distribution callers.

## Verification Plan

- frontend regression test for authenticated prompt request headers
- backend regression test for hashtag normalization and TikTok-style fallback output
- `node --import tsx --test` for both new test files
- `npx tsc --noEmit` in frontend and backend
- production builds for frontend and backend
