import os
import time
import json
import hashlib
import gzip
import bz2
import lzma
from pathlib import Path

# Optional third-party imports
try:
    import zstandard as zstd
except ImportError:
    zstd = None

try:
    import brotli
except ImportError:
    brotli = None

from src.strategy import choose_strategy, Plan
from src.huffman import huffman_compress

def calculate_sha256(filepath: str) -> str:
    """Computes the SHA-256 hash of a file in streaming chunks (memory-safe)."""
    h = hashlib.sha256()
    try:
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(1024 * 1024), b""):
                h.update(chunk)
    except Exception as e:
        print(f"[Compressor Error] Failed to calculate SHA-256: {e}")
    return h.hexdigest()

def compress_file(src: str, dst: str | None = None, mode: str = "auto", dict_path: str | None = None) -> dict:
    """
    Compresses a file according to the selected strategy mode.
    Outputs a compressed file and a corresponding '.dfc.json' manifest.
    """
    src_path = Path(src)
    if not src_path.exists():
        raise FileNotFoundError(f"Source file {src} not found.")

    plan = choose_strategy(src, mode)
    orig_bytes = src_path.stat().st_size
    sha256 = calculate_sha256(src)

    # Establish output file path and extension
    if not dst:
        ext_map = {
            "store": ".store",
            "huffman": ".huf",
            "zstd": ".zst",
            "brotli": ".br",
            "gzip": ".gz",
            "bz2": ".bz2",
            "lzma": ".xz",
        }
        dst = str(src_path) + ext_map.get(plan.codec, ".compressed")
    
    dst_path = Path(dst)
    
    # Ensure parent directory for output exists
    dst_path.parent.mkdir(parents=True, exist_ok=True)
    
    t0 = time.time()
    
    # Run the designated codec compressor
    if plan.store:
        # Just copy the file (or hardlink it to save disk)
        if hasattr(os, "link"):
            try:
                if dst_path.exists():
                    dst_path.unlink()
                os.link(src, dst)
            except OSError:
                import shutil
                shutil.copy2(src, dst)
        else:
            import shutil
            shutil.copy2(src, dst)

    elif plan.codec == "huffman":
        # Create trace file in same directory as output
        trace_path = str(dst_path) + ".trace.json"
        huffman_compress(src, dst, trace_path)

    elif plan.codec == "zstd":
        if zstd is None:
            raise ImportError("zstandard library is not installed in the Python environment.")
        
        # Determine dictionary configurations
        dict_data = None
        if dict_path and os.path.exists(dict_path):
            dict_data = zstd.ZstdCompressionDict(open(dict_path, "rb").read())
            plan.dict_id = Path(dict_path).stem

        # Stream compression
        if dict_data:
            cctx = zstd.ZstdCompressor(level=plan.level, dict_data=dict_data)
        else:
            # Note: threads=0 selects CPU core count defaults
            cctx = zstd.ZstdCompressor(level=plan.level, threads=plan.threads)

        with open(src, "rb") as fi, open(dst, "wb") as fo:
            with cctx.stream_writer(fo) as zw:
                for chunk in iter(lambda: fi.read(plan.chunk), b""):
                    zw.write(chunk)

    elif plan.codec == "brotli":
        if brotli is None:
            raise ImportError("brotli library is not installed in the Python environment.")
        
        # Brotli streaming compressor quality levels: 0-11
        quality = min(11, max(0, plan.level))
        enc = brotli.Compressor(quality=quality)
        with open(src, "rb") as fi, open(dst, "wb") as fo:
            for chunk in iter(lambda: fi.read(plan.chunk), b""):
                fo.write(enc.process(chunk))
            fo.write(enc.finish())

    elif plan.codec == "gzip":
        # Gzip compress levels: 1-9
        level = min(9, max(1, plan.level))
        with open(src, "rb") as fi, gzip.open(dst, "wb", compresslevel=level) as fo:
            for chunk in iter(lambda: fi.read(plan.chunk), b""):
                fo.write(chunk)

    elif plan.codec == "bz2":
        # Bzip2 compress levels: 1-9
        level = min(9, max(1, plan.level))
        with open(src, "rb") as fi, bz2.open(dst, "wb", compresslevel=level) as fo:
            for chunk in iter(lambda: fi.read(plan.chunk), b""):
                fo.write(chunk)

    elif plan.codec == "lzma":
        # LZMA (XZ) preset levels: 0-9
        level = min(9, max(0, plan.level))
        with open(src, "rb") as fi, lzma.open(dst, "wb", preset=level) as fo:
            for chunk in iter(lambda: fi.read(plan.chunk), b""):
                fo.write(chunk)

    else:
        raise ValueError(f"Unknown codec strategy: {plan.codec}")

    duration = time.time() - t0
    out_bytes = dst_path.stat().st_size
    ratio = out_bytes / orig_bytes if orig_bytes > 0 else 0

    # Build manifest
    manifest = {
        "source": str(src_path.resolve()),
        "output": str(dst_path.resolve()),
        "codec": plan.codec,
        "level": plan.level,
        "chunk_size": plan.chunk,
        "dict_id": plan.dict_id,
        "sha256": sha256,
        "orig_bytes": orig_bytes,
        "out_bytes": out_bytes,
        "ratio": round(ratio, 4),
        "time_seconds": round(duration, 4),
        "speed_mbs": round((orig_bytes / (1024 * 1024)) / duration, 2) if duration > 0 else 0.0
    }

    # Write manifest file to disk (ends in .dfc.json)
    manifest_path = dst + ".dfc.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)

    return manifest

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 2:
        src_file = sys.argv[1]
        mode_str = sys.argv[2]
        dest_file = sys.argv[3] if len(sys.argv) > 3 else None
        dict_f = sys.argv[4] if len(sys.argv) > 4 else None
        
        manifest_res = compress_file(src_file, dest_file, mode_str, dict_f)
        print(json.dumps(manifest_res, indent=2))
    else:
        print("Usage: python compress.py <src> <mode> [dst] [dict_path]")
