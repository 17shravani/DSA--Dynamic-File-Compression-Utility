import argparse
import sys
import json
from pathlib import Path

from src.compress import compress_file
from src.decompress import decompress_file
from src.verify import verify_file
from src.dict_train import train_dictionary
from src.archive import compress_folder
from src.huffman import huffman_compress

def main():
    parser = argparse.ArgumentParser(
        prog="dfc",
        description="DynaCompress AI: Intelligent File Compression Utility",
    )
    subparsers = parser.add_subparsers(dest="cmd", help="Subcommands")

    # 1. Compress
    c_parser = subparsers.add_parser("compress", help="Compress a file")
    c_parser.add_argument("src", help="Source file path")
    c_parser.add_argument(
        "--mode",
        choices=["auto", "fast", "balanced", "max", "dsa", "huffman"],
        default="auto",
        help="Compression mode: auto (balanced), fast (zstd low), balanced (zstd/brotli), max (lzma/brotli high), dsa (custom Huffman)",
    )
    c_parser.add_argument("--dst", help="Optional output path")
    c_parser.add_argument("--dict", help="Optional zstd dictionary path")

    # 2. Decompress
    d_parser = subparsers.add_parser("decompress", help="Decompress a file")
    d_parser.add_argument("src", help="Compressed file path (.zst, .br, .gz, .bz2, .xz, .huf, .store)")
    d_parser.add_argument("--dst", help="Optional output path")
    d_parser.add_argument("--dict", help="Optional zstd dictionary path")

    # 3. Verify
    v_parser = subparsers.add_parser("verify", help="Verify compressed file integrity")
    v_parser.add_argument("manifest", help="Path to manifest file (.dfc.json)")

    # 4. Train Dictionary
    t_parser = subparsers.add_parser("train-dict", help="Train a custom zstd dictionary")
    t_parser.add_argument("glob", help="Glob pattern for sample files (e.g. 'samples/*.log')")
    t_parser.add_argument("--size", type=int, default=112 * 1024, help="Target dictionary size in bytes")
    t_parser.add_argument("--out", help="Optional output dictionary path")

    # 5. Archive Folder
    a_parser = subparsers.add_parser("archive", help="Tar archive and compress an entire folder")
    a_parser.add_argument("folder", help="Path to the directory to archive")
    a_parser.add_argument("--dst", help="Optional output archive path")
    a_parser.add_argument("--level", type=int, default=6, help="Compression level (default 6)")

    # 6. Huffman Trace Visualizer
    vt_parser = subparsers.add_parser("visualize-huffman", help="Generate Huffman trace json for visualization")
    vt_parser.add_argument("src", help="Source text file path")
    vt_parser.add_argument("trace_out", help="Destination path for trace.json output")

    args = parser.parse_args()

    if not args.cmd:
        parser.print_help()
        sys.exit(1)

    try:
        if args.cmd == "compress":
            manifest = compress_file(args.src, args.dst, args.mode, args.dict)
            print(json.dumps({"success": True, "manifest": manifest}))
        
        elif args.cmd == "decompress":
            decompressed_path = decompress_file(args.src, args.dst, dict_path=args.dict)
            print(json.dumps({"success": True, "output_path": decompressed_path}))
        
        elif args.cmd == "verify":
            is_valid = verify_file(args.manifest)
            print(json.dumps({"success": True, "valid": is_valid}))
            if not is_valid:
                sys.exit(1)
        
        elif args.cmd == "train-dict":
            saved_path = train_dictionary(args.glob, args.size, args.out)
            print(json.dumps({"success": True, "dictionary_path": saved_path}))
            
        elif args.cmd == "archive":
            archive_path = compress_folder(args.folder, args.dst, args.level)
            print(json.dumps({"success": True, "archive_path": archive_path}))

        elif args.cmd == "visualize-huffman":
            # Direct call to huffman compress with trace log output
            dst_dummy = args.trace_out + ".huf.tmp"
            stats = huffman_compress(args.src, dst_dummy, args.trace_out)
            # Remove dummy output file
            if Path(dst_dummy).exists():
                Path(dst_dummy).unlink()
            print(json.dumps({"success": True, "stats": stats}))

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
