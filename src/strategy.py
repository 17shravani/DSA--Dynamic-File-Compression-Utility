from dataclasses import dataclass, asdict
from src.detector import analyze_file

@dataclass
class Plan:
    codec: str
    level: int
    chunk: int
    threads: int
    store: bool = False
    dict_id: str | None = None

def choose_strategy(filepath: str, mode: str = "auto") -> Plan:
    """
    Evaluates file characteristics and user preferences to select a compression plan.
    Supported modes: 'auto' (same as balanced), 'fast', 'balanced', 'max', 'dsa' (Huffman only)
    """
    profile = analyze_file(filepath)
    magic = profile["magic_type"]
    mime = profile["mime_type"]
    entropy = profile["entropy"]
    text_ratio = profile["text_ratio"]
    size = profile["size_bytes"]

    # 1. Skip compression for already compressed files (JPEG, PNG, Gzip, ZIP, etc.)
    already_compressed_mime = (
        mime.startswith("image/jpeg") or 
        mime.startswith("image/png") or 
        mime.startswith("video/") or 
        mime.startswith("audio/") or
        mime in {"application/zip", "application/x-tar", "application/x-gzip", "application/x-bzip2"}
    )
    if magic in {"gzip", "bz2", "xz", "zstd", "zip", "png", "jpeg", "pdf"} or already_compressed_mime:
        # Avoid size expansion and CPU cycles, just store the file
        return Plan(codec="store", level=0, chunk=1024 * 1024, threads=1, store=True)

    # 2. Strict DSA Mode: Force Huffman Coding from scratch
    if mode in {"dsa", "huffman"}:
        return Plan(codec="huffman", level=1, chunk=1024 * 1024, threads=1)

    # 3. User explicit speed options
    if mode == "fast":
        # zstd at lower level is blazingly fast with good ratios
        return Plan(codec="zstd", level=3, chunk=1024 * 1024, threads=0)

    if mode == "max":
        # lzma yields superior ratio for binaries/archives, brotli for dense text
        if text_ratio > 0.8:
            return Plan(codec="brotli", level=11, chunk=4 * 1024 * 1024, threads=0)
        else:
            return Plan(codec="lzma", level=9, chunk=4 * 1024 * 1024, threads=0)

    # 4. Balanced / Auto Mode heuristic rules
    # Highly compressible dense text (logs, CSV, JSON, code files)
    is_texty = text_ratio > 0.75 or mime.startswith("text/") or mime in {"application/json", "application/javascript", "text/csv"}
    
    if is_texty:
        # Brotli performs exceptionally well on text (HTML/JS/JSON)
        # Zstandard is excellent for log streams
        if entropy < 5.0:
            # Low entropy text -> Brotli (excellent dictionary compression)
            return Plan(codec="brotli", level=6, chunk=2 * 1024 * 1024, threads=0)
        else:
            # High entropy/standard text -> Zstd (fast decompression, solid ratio)
            return Plan(codec="zstd", level=7, chunk=2 * 1024 * 1024, threads=0)

    # Database dumps, raw binaries, or low-compressible payloads
    if entropy > 7.6:
        # High entropy binary data is hard to compress; bz2 or moderate zstd is balanced
        return Plan(codec="zstd", level=5, chunk=2 * 1024 * 1024, threads=0)

    # General fallback: balanced ZStandard
    return Plan(codec="zstd", level=6, chunk=2 * 1024 * 1024, threads=0)

if __name__ == "__main__":
    import sys
    import json
    if len(sys.argv) > 1:
        mode = sys.argv[2] if len(sys.argv) > 2 else "auto"
        plan = choose_strategy(sys.argv[1], mode)
        print(json.dumps(asdict(plan), indent=2))
    else:
        print("Usage: python strategy.py <filepath> [mode]")
