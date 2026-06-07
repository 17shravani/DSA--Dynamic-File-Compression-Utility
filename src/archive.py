import os
import tarfile
from pathlib import Path

# Optional third-party imports
try:
    import zstandard as zstd
except ImportError:
    zstd = None

def compress_folder(folder_path: str, dst_path: str | None = None, level: int = 6) -> str:
    """
    Tar-archives an entire directory and streams the bytes directly
    into a zstd compressor (or falls back to gzip if zstandard is not present).
    """
    src_dir = Path(folder_path)
    if not src_dir.exists() or not src_dir.is_dir():
        raise ValueError(f"Source folder {folder_path} is not a valid directory.")

    # Determine compressor and file suffix
    if zstd is not None:
        suffix = ".tar.zst"
        codec = "zstd"
    else:
        suffix = ".tar.gz"
        codec = "gzip"

    if not dst_path:
        dst_path = str(src_dir.parent / (src_dir.name + suffix))

    dst_file = Path(dst_path)
    dst_file.parent.mkdir(parents=True, exist_ok=True)

    print(f"[Archiver] Archiving folder {src_dir} -> {dst_file} using {codec} (level {level})...")

    # Perform streaming archive
    if codec == "zstd":
        cctx = zstd.ZstdCompressor(level=level)
        with open(dst_file, "wb") as fo:
            with cctx.stream_writer(fo) as zw:
                # Open tarfile writing directly to the zstd stream writer
                with tarfile.open(mode="w|", fileobj=zw) as tar:
                    tar.add(str(src_dir), arcname=src_dir.name)
    else:
        # Fallback to gzip tar archiving
        with tarfile.open(dst_file, "w:gz") as tar:
            tar.add(str(src_dir), arcname=src_dir.name)

    print(f"[Archiver] Archive created successfully: {dst_file.resolve()}")
    return str(dst_file.resolve())

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        folder = sys.argv[1]
        out = sys.argv[2] if len(sys.argv) > 2 else None
        lvl = int(sys.argv[3]) if len(sys.argv) > 3 else 6
        try:
            saved = compress_folder(folder, out, lvl)
            print(f"OK archived: {saved}")
        except Exception as e:
            print(f"Error archiving folder: {e}")
            sys.exit(1)
    else:
        print("Usage: python archive.py <folder_path> [dst_path] [level]")
        sys.exit(1)
