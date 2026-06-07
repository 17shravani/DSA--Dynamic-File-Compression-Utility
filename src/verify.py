import json
import hashlib
from pathlib import Path
from src.decompress import decompress_file

def verify_file(manifest_path: str) -> bool:
    """
    Verifies that a compressed file can be successfully decompressed
    and matches the original SHA-256 checksum saved in the manifest.
    """
    manifest_file = Path(manifest_path)
    if not manifest_file.exists():
        raise FileNotFoundError(f"Manifest file {manifest_path} not found.")

    try:
        with open(manifest_file, "r") as f:
            manifest = json.load(f)
    except Exception as e:
        print(f"[Verifier Error] Failed to read manifest JSON: {e}")
        return False

    compressed_file = manifest.get("output")
    expected_hash = manifest.get("sha256")
    codec = manifest.get("codec")
    dict_id = manifest.get("dict_id")

    if not compressed_file or not expected_hash:
        print("[Verifier Error] Manifest is missing output path or SHA-256 hash.")
        return False

    if not Path(compressed_file).exists():
        print(f"[Verifier Error] Compressed file not found at {compressed_file}")
        return False

    # Perform round-trip decompression to a temporary file
    temp_decompressed_path = compressed_file + ".verify.tmp"
    
    # Resolve dictionary path if used
    dict_path = None
    if dict_id:
        dict_file = Path(compressed_file).parent / f"{dict_id}.dict"
        if dict_file.exists():
            dict_path = str(dict_file)

    try:
        # Run decompress to temp path
        decompress_file(compressed_file, temp_decompressed_path, codec, dict_path)
        
        # Calculate SHA-256 hash of decompressed output
        h = hashlib.sha256()
        with open(temp_decompressed_path, "rb") as f:
            for chunk in iter(lambda: f.read(1024 * 1024), b""):
                h.update(chunk)
        
        decompressed_hash = h.hexdigest()
        
        # Check integrity
        is_identical = (decompressed_hash == expected_hash)
        
        if not is_identical:
            print(f"[Verifier Fail] Checksum mismatch!\nExpected: {expected_hash}\nActual:   {decompressed_hash}")
        
        return is_identical

    except Exception as e:
        print(f"[Verifier Exception] Roundtrip verification failed: {e}")
        return False
        
    finally:
        # Clean up temporary file
        temp_file = Path(temp_decompressed_path)
        if temp_file.exists():
            try:
                temp_file.unlink()
            except Exception as e:
                print(f"[Verifier Warning] Failed to clean up temp file {temp_decompressed_path}: {e}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        man_path = sys.argv[1]
        ok = verify_file(man_path)
        if ok:
            print("VERIFICATION SUCCESS: Original and decompressed files are identical.")
            sys.exit(0)
        else:
            print("VERIFICATION FAILED: Checksum mismatch or decompression error.")
            sys.exit(1)
    else:
        print("Usage: python verify.py <manifest_path.dfc.json>")
        sys.exit(1)
