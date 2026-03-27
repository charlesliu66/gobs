#!/usr/bin/env python3
"""
Production Quality Validator — Game Director Video Skill
Validates the Stage 2 production package before human confirmation.
Checks: duration, hook, CTA, platform specs, asset coverage.

Usage:
    python generate_production.py --validate --input <production_json>
    python generate_production.py --check-duration --shots <shots_json> --target-min 15 --target-max 30
"""

import json
import sys
import argparse
from typing import List, Dict, Any


# Platform specifications
PLATFORM_SPECS = {
    "tiktok": {
        "aspect_ratio": "9:16",
        "resolution": "1080x1920",
        "min_duration": 5,
        "max_duration": 60,
        "optimal_duration": (15, 30),
        "hook_window": 3,       # First 3 seconds must have a hook
        "cta_window": 3,        # Last 3 seconds should have CTA
    },
    "youtube": {
        "aspect_ratio": "16:9",
        "resolution": "1920x1080",
        "min_duration": 5,
        "max_duration": 60,
        "optimal_duration": (15, 30),
        "hook_window": 5,
        "cta_window": 5,
    },
    "both": {
        "aspect_ratio": "9:16 + 16:9",
        "note": "Generate vertical-first, crop to 16:9 for YouTube",
        "optimal_duration": (15, 30),
        "hook_window": 3,
        "cta_window": 3,
    }
}


def validate_production_package(shots: List[Dict], platform: str = "tiktok") -> Dict[str, Any]:
    """
    Validate the full production package.
    
    shots: List of shot dicts with keys:
        - shot_id: str
        - duration: float (seconds)
        - script: str
        - storyboard: str
        - video_prompt: str
        - asset_source: str ("library:filename" | "ai_generate" | "needs_confirmation")
    
    Returns validation report dict.
    """
    report = {
        "passed": True,
        "checks": [],
        "warnings": [],
        "errors": [],
        "summary": {}
    }

    if not shots:
        report["passed"] = False
        report["errors"].append("No shots provided")
        return report

    spec = PLATFORM_SPECS.get(platform, PLATFORM_SPECS["tiktok"])

    # --- Check 1: Total Duration ---
    total_duration = sum(s.get("duration", 0) for s in shots)
    opt_min, opt_max = spec["optimal_duration"]
    duration_ok = opt_min <= total_duration <= opt_max

    report["checks"].append({
        "name": "Total Duration",
        "status": "✅" if duration_ok else "⚠️",
        "detail": f"{total_duration:.1f}s (target: {opt_min}–{opt_max}s)",
        "passed": duration_ok
    })
    if not duration_ok:
        report["warnings"].append(f"Duration {total_duration:.1f}s is outside optimal range {opt_min}–{opt_max}s")

    # --- Check 2: Hook in First N Seconds ---
    hook_window = spec.get("hook_window", 3)
    cumulative = 0
    hook_shots = []
    for shot in shots:
        if cumulative < hook_window:
            hook_shots.append(shot)
        cumulative += shot.get("duration", 0)

    hook_keywords = ["reveal", "explosion", "action", "shock", "surprise", "fast", "dramatic",
                     "intense", "epic", "battle", "clash", "opening", "hook", "highlight"]
    has_hook = any(
        any(kw in s.get("storyboard", "").lower() or kw in s.get("script", "").lower()
            for kw in hook_keywords)
        for s in hook_shots
    )

    report["checks"].append({
        "name": f"Hook in First {hook_window}s",
        "status": "✅" if has_hook else "⚠️",
        "detail": f"Shots covering first {hook_window}s: {[s.get('shot_id','?') for s in hook_shots]}",
        "passed": has_hook
    })
    if not has_hook:
        report["warnings"].append(
            f"No strong hook detected in first {hook_window}s — "
            "consider starting with action, reveal, or dramatic moment"
        )

    # --- Check 3: CTA in Final Shot ---
    last_shot = shots[-1]
    cta_keywords = ["download", "play", "available", "now", "get", "join", "sign up",
                    "pre-order", "wishlist", "follow", "subscribe", "link", "store",
                    "out now", "coming soon", "free", "launch"]
    has_cta = any(
        kw in last_shot.get("script", "").lower() or kw in last_shot.get("storyboard", "").lower()
        for kw in cta_keywords
    )

    report["checks"].append({
        "name": "CTA in Final Shot",
        "status": "✅" if has_cta else "⚠️",
        "detail": f"Final shot ({last_shot.get('shot_id','?')}): {last_shot.get('script','')[:80]}...",
        "passed": has_cta
    })
    if not has_cta:
        report["warnings"].append(
            "No clear CTA detected in final shot — "
            "add download/play/available now message"
        )

    # --- Check 4: Asset Confirmations Needed ---
    needs_confirmation = [
        s for s in shots if "needs_confirmation" in s.get("asset_source", "").lower()
    ]
    assets_ok = len(needs_confirmation) == 0

    report["checks"].append({
        "name": "Asset Confirmations",
        "status": "✅" if assets_ok else "⚠️",
        "detail": f"{len(needs_confirmation)} shot(s) need asset confirmation" if not assets_ok else "All assets resolved",
        "passed": assets_ok,
        "pending_shots": [s.get("shot_id") for s in needs_confirmation]
    })

    # --- Check 5: Prompt Quality (basic length check) ---
    short_prompts = [
        s for s in shots
        if len(s.get("video_prompt", "")) < 20
    ]
    prompts_ok = len(short_prompts) == 0

    report["checks"].append({
        "name": "Video Prompt Quality",
        "status": "✅" if prompts_ok else "⚠️",
        "detail": f"{len(short_prompts)} shot(s) have very short prompts (<20 chars)" if not prompts_ok else "All prompts look sufficient",
        "passed": prompts_ok
    })

    # --- Check 6: Storyboard Detail ---
    vague_storyboards = [
        s for s in shots
        if len(s.get("storyboard", "")) < 40
    ]
    storyboards_ok = len(vague_storyboards) == 0

    report["checks"].append({
        "name": "Storyboard Detail",
        "status": "✅" if storyboards_ok else "⚠️",
        "detail": f"{len(vague_storyboards)} shot(s) have vague storyboard descriptions" if not storyboards_ok else "All storyboards are detailed",
        "passed": storyboards_ok
    })

    # --- Summary ---
    all_passed = all(c["passed"] for c in report["checks"])
    report["passed"] = all_passed
    report["summary"] = {
        "total_shots": len(shots),
        "total_duration": f"{total_duration:.1f}s",
        "platform": platform,
        "checks_passed": sum(1 for c in report["checks"] if c["passed"]),
        "checks_total": len(report["checks"]),
        "ready_for_generation": all_passed or len(report["errors"]) == 0
    }

    return report


def format_report(report: Dict) -> str:
    """Format validation report for display to user."""
    lines = ["### 🔍 Auto Quality Check"]
    for check in report["checks"]:
        lines.append(f"- {check['status']} **{check['name']}**: {check['detail']}")

    if report["warnings"]:
        lines.append("")
        lines.append("**Warnings:**")
        for w in report["warnings"]:
            lines.append(f"  ⚠️ {w}")

    if report["errors"]:
        lines.append("")
        lines.append("**Errors:**")
        for e in report["errors"]:
            lines.append(f"  ❌ {e}")

    s = report["summary"]
    lines.append("")
    lines.append(f"**Result**: {s['checks_passed']}/{s['checks_total']} checks passed | "
                 f"Duration: {s['total_duration']} | Shots: {s['total_shots']}")

    if s["ready_for_generation"]:
        lines.append("**→ Ready for Confirmation Gate 2**")
    else:
        lines.append("**→ Fix errors before proceeding**")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Production Package Validator")
    parser.add_argument("--validate", action="store_true", help="Validate a production package")
    parser.add_argument("--input", help="Path to production JSON file or JSON string")
    parser.add_argument("--platform", choices=["tiktok", "youtube", "both"], default="tiktok")
    parser.add_argument("--json-output", action="store_true", help="Output raw JSON")

    args = parser.parse_args()

    if args.validate:
        if not args.input:
            print("Error: --input required for --validate")
            sys.exit(1)

        # Try as file path first, then as JSON string
        try:
            with open(args.input) as f:
                data = json.load(f)
        except (FileNotFoundError, IsADirectoryError):
            try:
                data = json.loads(args.input)
            except json.JSONDecodeError:
                print(f"Error: Could not parse input as file path or JSON")
                sys.exit(1)

        shots = data if isinstance(data, list) else data.get("shots", [])
        report = validate_production_package(shots, args.platform)

        if args.json_output:
            print(json.dumps(report, indent=2, ensure_ascii=False))
        else:
            print(format_report(report))
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
