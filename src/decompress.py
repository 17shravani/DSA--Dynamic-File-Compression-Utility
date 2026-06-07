import os
import gzip
import bz2
import lzma
import json
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

from src.huffman import huffman_decompress

def decompress_file(src: str, dst: str | None = None, codec: str | None = None, dict_path: str | None = None) -> str:
    """
    Decompresses a file. If codec is not provided, searches for a matching
    '.dfc.json' manifest file or infers the codec from file extension.
    """
    src_path = Path(src)
    if not src_path.exists():
        raise FileNotFoundError(f"Compressed source file {src} not found.")

    manifest = None
    manifest_path = Path(src + ".dfc.json")
    
    # 1. Try loading manifest to extract compression metadata
    if manifest_path.exists():
        try:
            with open(manifest_path, "r") as f:
                manifest = json.load(f)
            if not codec:
                codec = manifest.get("codec")
            if not dst:
                # Retrieve original source name (or write to a default name)
                orig_source = manifest.get("source")
                if orig_source:
                    orig_path = Path(orig_source)
                    # If placing in a different folder, avoid overwriting the original file directly
                    dst = str(src_path.parent / f"decompressed_{orig_path.name}")
                else:
                    dst = str(src_path.parent / (src_path.stem + ".decompressed"))
        except Exception as e:
            print(f"[Decompressor Warning] Failed to parse manifest {manifest_path}: {e}")

    # 2. Extension fallback if codec or destination is still unresolved
    if not codec:
        ext = src_path.suffix.lower()
        ext_map = {
            ".store": "store",
            ".huf": "huffman",
            ".zst": "zstd",
            ".br": "brotli",
            ".gz": "gzip",
            ".bz2": "bz2",
            ".xz": "lzma",
        }
        codec = ext_map.get(ext)
        if not codec:
            raise ValueError(f"Could not determine codec for file {src} (unknown extension).")

    if not dst:
        # Strip suffix from compressed file name
        dst = str(src_path.parent / src_path.stem)

    dst_path = Path(dst)
    dst_path.parent.mkdir(parents=True, exist_ok=True)

    # 3. Execute Decompression
    if codec == "store":
        import shutil
        shutil.copy2(src, dst)

    elif codec == "huffman":
        huffman_decompress(src, dst)

    elif codec == "zstd":
        if zstd is None:
            raise ImportError("zstandard library is not installed in the Python environment.")
        
        dict_data = None
        if dict_path and os.path.exists(dict_path):
            dict_data = zstd.ZstdDecompressor(dict_data=zstd.ZstdDDict(open(dict_path, "rb").read()))
        
        dctx = dict_data or zstd.ZstdDecompressor()
        with open(src, "rb") as fi, open(dst, "wb") as fo:
            with dctx.stream_reader(fi) as reader:
                for chunk in iter(lambda: reader.read(1024 * 1024), b""):
                    fo.write(chunk)

    elif codec == "brotli":
        if brotli is None:
            raise ImportError("brotli library is not installed in the Python environment.")
        
        with open(src, "rb") as fi:
            compressed_data = fi.read()
        decompressed_data = brotli.decompress(compressed_data)
        with open(dst, "wb") as fo:
            fo.write(decompressed_data)

    elif codec == "gzip":
        with gzip.open(src, "rb") as fi, open(dst, "wb") as fo:
            for chunk in iter(lambda: fi.read(1024 * 1024), b""):
                fo.write(chunk)

    elif codec == "bz2":
        with bz2.open(src, "rb") as fi, open(dst, "wb") as fo:
            for chunk in iter(lambda: fi.read(1024 * 1024), b""):
                fo.write(chunk)

    elif codec == "lzma":
        with lzma.open(src, "rb") as fi, open(dst, "wb") as fo:
            for chunk in iter(lambda: fi.read(1024 * 1024), b""):
                fo.write(chunk)

    else:
        raise ValueError(f"Unknown codec requested for decompression: {codec}")

    return str(dst_path.resolve())

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 2:
        src_file = sys.argv[1]
        dst_file = sys.argv[2]
        codec_str = sys.argv[3] if len(sys.argv) > 3 else None
        dict_f = sys.argv[4] if len(sys.argv) > 4 else None
        
        res = decompress_file(src_file, dst_file, codec_str, dict_f)
        print(f"OK decompressed: {res}")
    else:
        print("Usage: python decompress.py <src> <dst> [codec] [dict_path]")
