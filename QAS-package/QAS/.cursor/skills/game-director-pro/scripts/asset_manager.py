#!/usr/bin/env python3
"""
Asset Manager — Game Director Video Skill
Searches the game asset library for matching files by keyword and type.
Returns file paths for use in Kling image-to-video generation.

Usage:
    python asset_manager.py --library <path> --query <keyword> [--type <image|video|audio>]
    python asset_manager.py --library <path> --list-all
"""

import os
import sys
import json
import argparse
from pathlib import Path

# Supported file extensions by type
ASSET_TYPES = {
    "image": [".png", ".jpg", ".jpeg", ".webp", ".psd", ".tga", ".bmp"],
    "video": [".mp4", ".mov", ".avi", ".mkv", ".webm", ".gif"],
    "audio": [".mp3", ".wav", ".ogg", ".aac", ".flac"],
    "all":   [".png", ".jpg", ".jpeg", ".webp", ".psd", ".tga", ".bmp",
              ".mp4", ".mov", ".avi", ".mkv", ".webm", ".gif",
              ".mp3", ".wav", ".ogg", ".aac", ".flac"]
}

# Keywords that flag an asset as "critical" (requires human confirmation before AI generation)
CRITICAL_KEYWORDS = [
    "character", "hero", "villain", "boss", "protagonist",
    "map", "world", "logo", "brand", "icon", "key art", "poster",
    "mascot", "ui", "interface"
]


def is_critical_asset(query: str) -> bool:
    """Check if the requested asset is a critical brand/key asset."""
    query_lower = query.lower()
    return any(kw in query_lower for kw in CRITICAL_KEYWORDS)


def search_assets(library_path: str, query: str, asset_type: str = "all") -> dict:
    """
    Search the asset library for files matching the query.
    
    Returns:
        {
            "found": bool,
            "matches": [{"path": str, "filename": str, "type": str, "relevance": str}],
            "is_critical": bool,
            "query": str
        }
    """
    library = Path(library_path)
    if not library.exists():
        return {
            "found": False,
            "matches": [],
            "is_critical": is_critical_asset(query),
            "query": query,
            "error": f"Asset library not found at: {library_path}"
        }

    extensions = ASSET_TYPES.get(asset_type, ASSET_TYPES["all"])
    query_terms = query.lower().replace("-", " ").replace("_", " ").split()
    matches = []

    for root, dirs, files in os.walk(library):
        # Skip hidden directories
        dirs[:] = [d for d in dirs if not d.startswith(".")]
        for filename in files:
            ext = Path(filename).suffix.lower()
            if ext not in extensions:
                continue

            filename_lower = filename.lower().replace("-", " ").replace("_", " ")
            parent_dir = Path(root).name.lower().replace("-", " ").replace("_", " ")
            searchable = f"{parent_dir} {filename_lower}"

            # Score based on how many query terms match
            matched_terms = [t for t in query_terms if t in searchable]
            if not matched_terms:
                continue

            relevance = "exact" if len(matched_terms) == len(query_terms) else "partial"
            file_path = os.path.join(root, filename)

            # Determine asset type from extension
            detected_type = next(
                (t for t, exts in ASSET_TYPES.items() if t != "all" and ext in exts),
                "unknown"
            )

            matches.append({
                "path": file_path,
                "filename": filename,
                "type": detected_type,
                "relevance": relevance,
                "matched_terms": matched_terms,
                "score": len(matched_terms)
            })

    # Sort by relevance score descending
    matches.sort(key=lambda x: x["score"], reverse=True)

    return {
        "found": len(matches) > 0,
        "matches": matches[:10],  # Return top 10
        "is_critical": is_critical_asset(query),
        "query": query,
        "total_found": len(matches)
    }


def list_all_assets(library_path: str) -> dict:
    """List all assets in the library, grouped by type."""
    library = Path(library_path)
    if not library.exists():
        return {"error": f"Asset library not found at: {library_path}"}

    catalog = {"image": [], "video": [], "audio": [], "total": 0}

    for root, dirs, files in os.walk(library):
        dirs[:] = [d for d in dirs if not d.startswith(".")]
        for filename in files:
            ext = Path(filename).suffix.lower()
            for asset_type, extensions in ASSET_TYPES.items():
                if asset_type == "all":
                    continue
                if ext in extensions:
                    rel_path = os.path.relpath(os.path.join(root, filename), library_path)
                    catalog[asset_type].append(rel_path)
                    catalog["total"] += 1
                    break

    return catalog


def format_result_for_agent(result: dict) -> str:
    """Format search result as readable output for the AI agent."""
    lines = []
    query = result.get("query", "")
    
    if result.get("error"):
        return f"❌ Asset Library Error: {result['error']}"

    if result["found"]:
        lines.append(f"📦 Asset Search: '{query}' → {result['total_found']} match(es) found")
        lines.append("")
        for i, match in enumerate(result["matches"][:5], 1):
            relevance_icon = "✅" if match["relevance"] == "exact" else "🔶"
            lines.append(f"  {relevance_icon} [{i}] {match['filename']}")
            lines.append(f"      Type: {match['type']} | Relevance: {match['relevance']}")
            lines.append(f"      Path: {match['path']}")
        lines.append("")
        lines.append("→ USE LIBRARY ASSET (image-to-video mode for Kling)")
    else:
        lines.append(f"📦 Asset Search: '{query}' → No matches found in library")
        if result["is_critical"]:
            lines.append("")
            lines.append("⚠️  CRITICAL ASSET — This appears to be a key brand/character asset.")
            lines.append("    Do NOT auto-generate. Ask the user for confirmation first.")
        else:
            lines.append("→ PROCEED WITH AI GENERATION (text-to-video mode for Kling)")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Game Director Video Skill — Asset Manager")
    parser.add_argument("--library", required=True, help="Path to the game asset library folder")
    parser.add_argument("--query", help="Search query (e.g. 'hero character', 'battle map')")
    parser.add_argument("--type", choices=["image", "video", "audio", "all"], default="all",
                        help="Filter by asset type (default: all)")
    parser.add_argument("--list-all", action="store_true", help="List all assets in the library")
    parser.add_argument("--json", action="store_true", help="Output raw JSON instead of formatted text")

    args = parser.parse_args()

    if args.list_all:
        result = list_all_assets(args.library)
        if args.json:
            print(json.dumps(result, indent=2, ensure_ascii=False))
        else:
            print(f"📁 Asset Library Catalog: {args.library}")
            print(f"   Images: {len(result.get('image', []))}")
            print(f"   Videos: {len(result.get('video', []))}")
            print(f"   Audio:  {len(result.get('audio', []))}")
            print(f"   Total:  {result.get('total', 0)}")
        return

    if not args.query:
        print("Error: --query is required unless --list-all is specified")
        sys.exit(1)

    result = search_assets(args.library, args.query, args.type)

    if args.json:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print(format_result_for_agent(result))


if __name__ == "__main__":
    main()
