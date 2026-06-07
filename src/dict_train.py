import os
import glob
import random
from pathlib import Path

try:
    import zstandard as zstd
except ImportError:
    zstd = None

def train_dictionary(glob_pattern: str, dict_size: int = 112 * 1024, output_path: str | None = None) -> str:
    """
    Scans files matching glob_pattern, takes random 4KB samples,
    and trains a zstd dictionary. Writes output to a .dict file.
    """
    if zstd is None:
        raise ImportError("zstandard library is not installed in the Python environment.")

    # Find matching files
    files = glob.glob(glob_pattern, recursive=True)
    if not files:
        raise FileNotFoundError(f"No files matched the glob pattern: {glob_pattern}")

    # Accumulate samples
    samples = []
    chunk_size = 4096
    
    # Read samples from files
    for filepath in files:
        if os.path.isdir(filepath):
            continue
        try:
            with open(filepath, "rb") as f:
                content = f.read()
            
            # If the file is small, add the whole file as a sample
            if len(content) <= chunk_size:
                samples.append(content)
            else:
                # Extract a few random chunks from larger files
                num_samples = min(20, len(content) // chunk_size)
                for _ in range(num_samples):
                    start = random.randrange(0, len(content) - chunk_size)
                    samples.append(content[start : start + chunk_size])
        except Exception as e:
            print(f"[Trainer Warning] Skipping file {filepath} due to read error: {e}")

    if not samples:
      raise ValueError("Could not extract any valid samples for dictionary training.")

    # Safeguard: ZStandard training requires a minimum number of distinct samples (typically 8+)
    # If the user has only 1 or a few files, we duplicate the samples in memory to prevent zstd library crashes.
    if len(samples) < 10:
        print(f"[Trainer Info] Only {len(samples)} samples collected. Duplicating in-memory buffers to satisfy ZStd minimum...")
        original_samples = list(samples)
        while len(samples) < 10:
            samples.extend(original_samples)

    print(f"[Trainer] Training dictionary on {len(samples)} samples (target size {dict_size} bytes)...")

    # Train dictionary using zstandard API
    dict_data = zstd.train_dictionary(dict_size, samples)
    
    # Establish dictionary output path
    if not output_path:
        dict_id = f"zstd_dict_{dict_size}_{len(files)}"
        output_path = str(Path(files[0]).parent / f"{dict_id}.dict")

    output_file = Path(output_path)
    output_file.write_bytes(dict_data.as_bytes())

    print(f"[Trainer] Dictionary trained successfully and written to {output_file.resolve()}")
    return str(output_file.resolve())

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        pattern = sys.argv[1]
        size = int(sys.argv[2]) if len(sys.argv) > 2 else 112 * 1024
        out = sys.argv[3] if len(sys.argv) > 3 else None
        try:
            saved_path = train_dictionary(pattern, size, out)
            print(f"OK trained: {saved_path}")
        except Exception as e:
            print(f"Error during dictionary training: {e}")
            sys.exit(1)
    else:
        print("Usage: python dict_train.py <glob_pattern> [dict_size_bytes] [output_path]")
        sys.exit(1)
