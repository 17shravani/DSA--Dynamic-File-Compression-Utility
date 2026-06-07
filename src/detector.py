import mimetypes
import math
from collections import Counter
from pathlib import Path

# Common binary and compressed file headers
MAGIC_HEADERS = {
    b"\x1F\x8B": "gzip",
    b"\x42\x5A\x68": "bz2",
    b"\xFD\x37\x7A\x58\x5A\x00": "xz",      # lzma
    b"\x28\xB5\x2F\xFD": "zstd",
    b"\x89PNG\r\n\x1a\n": "png",
    b"\xFF\xD8\xFF": "jpeg",
    b"%PDF": "pdf",
    b"PK\x03\x04": "zip",
}

def detect_magic_type(filepath: str) -> str | None:
    """Reads the first 16 bytes of a file to check for known magic headers."""
    try:
        with open(filepath, "rb") as f:
            head = f.read(16)
        for signature, codec in MAGIC_HEADERS.items():
            if head.startswith(signature):
                return codec
    except Exception as e:
        print(f"[Detector Warning] Failed to read magic bytes for {filepath}: {e}")
    return None

def calculate_sample_stats(filepath: str, sample_size: int = 256 * 1024) -> dict:
    """
    Reads a sample (default 256KB) of the file and calculates:
      - Shannon entropy: measures data randomness (0 to 8 bits).
      - Text ratio: percentage of readable ASCII, whitespaces, and tabs.
      - Newline count: number of LF characters in the sample.
    """
    try:
        with open(filepath, "rb") as f:
            buf = f.read(sample_size)
    except Exception as e:
        print(f"[Detector Warning] Failed to read stats sample for {filepath}: {e}")
        return {"entropy": 0.0, "text_ratio": 0.0, "newlines": 0, "size_bytes": 0}

    total_bytes = len(buf)
    if total_bytes == 0:
        return {"entropy": 0.0, "text_ratio": 0.0, "newlines": 0, "size_bytes": 0}

    # 1. Shannon Entropy
    freqs = Counter(buf)
    entropy = -sum((count / total_bytes) * math.log2(count / total_bytes) for count in freqs.values())

    # 2. Text Ratio (Printable ASCII: space through tilde, plus tab, CR, LF)
    printable_count = sum(
        1 for b in buf if (32 <= b <= 126) or (b in (9, 10, 13))
    )
    text_ratio = printable_count / total_bytes

    # 3. Newline characters (for line structure estimation)
    newlines = buf.count(b"\n")

    # Real file size
    size_bytes = Path(filepath).stat().st_size

    return {
        "entropy": round(entropy, 4),
        "text_ratio": round(text_ratio, 4),
        "newlines": newlines,
        "size_bytes": size_bytes
    }

def guess_mime_type(filepath: str) -> str:
    """Guesses the MIME type based on file extension, fallback to octet-stream."""
    mime, _ = mimetypes.guess_type(filepath)
    return mime or "application/octet-stream"

def analyze_file(filepath: str) -> dict:
    """Runs a complete detection profile on a file."""
    magic = detect_magic_type(filepath)
    stats = calculate_sample_stats(filepath)
    mime = guess_mime_type(filepath)
    
    return {
        "path": filepath,
        "magic_type": magic,
        "mime_type": mime,
        "entropy": stats["entropy"],
        "text_ratio": stats["text_ratio"],
        "newlines": stats["newlines"],
        "size_bytes": stats["size_bytes"]
    }

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        profile = analyze_file(sys.argv[1])
        import json
        print(json.dumps(profile, indent=2))
    else:
        print("Usage: python detector.py <filepath>")
