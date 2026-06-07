import json
import struct
from pathlib import Path

class HuffmanNode:
    """Represents a node in the Huffman Tree."""
    def __init__(self, char: int | None, freq: int, left=None, right=None):
        self.char = char  # Byte value (0-255) or None for internal nodes
        self.freq = freq  # Occurrence count
        self.left = left
        self.right = right

    def is_leaf(self) -> bool:
        return self.left is None and self.right is None

    # Comparison operators for Heap sequencing (based on frequency)
    def __lt__(self, other):
        if not isinstance(other, HuffmanNode):
            return NotImplemented
        return self.freq < other.freq

    def __eq__(self, other):
        if not isinstance(other, HuffmanNode):
            return NotImplemented
        return self.freq == other.freq

class MinHeap:
    """Custom Min Heap Priority Queue implemented from scratch for DSA training."""
    def __init__(self):
        self.heap = []

    def parent(self, i: int) -> int:
        return (i - 1) // 2

    def left_child(self, i: int) -> int:
        return 2 * i + 1

    def right_child(self, i: int) -> int:
        return 2 * i + 2

    def insert(self, node: HuffmanNode):
        self.heap.append(node)
        self._heapify_up(len(self.heap) - 1)

    def extract_min(self) -> HuffmanNode | None:
        if not self.heap:
            return None
        if len(self.heap) == 1:
            return self.heap.pop()
        
        root = self.heap[0]
        self.heap[0] = self.heap.pop()
        self._heapify_down(0)
        return root

    def size(self) -> int:
        return len(self.heap)

    def _swap(self, i: int, j: int):
        self.heap[i], self.heap[j] = self.heap[j], self.heap[i]

    def _heapify_up(self, i: int):
        while i > 0 and self.heap[i] < self.heap[self.parent(i)]:
            p = self.parent(i)
            self._swap(i, p)
            i = p

    def _heapify_down(self, i: int):
        min_idx = i
        left = self.left_child(i)
        right = self.right_child(i)
        n = len(self.heap)

        if left < n and self.heap[left] < self.heap[min_idx]:
            min_idx = left
        if right < n and self.heap[right] < self.heap[min_idx]:
            min_idx = right

        if min_idx != i:
            self._swap(i, min_idx)
            self._heapify_down(min_idx)

    def get_serialized_state(self) -> list:
        """Returns heap state for trace logging."""
        return [
            {"char": n.char, "freq": n.freq, "is_leaf": n.is_leaf()}
            for n in self.heap
        ]

def build_huffman_tree(frequencies: dict, log_trace: bool = False) -> tuple[HuffmanNode | None, list]:
    """
    Constructs the Huffman Tree using the custom MinHeap.
    If log_trace is True, records step-by-step heaps and node merges.
    """
    trace = []
    
    # 1. Initialize heap with leaf nodes
    heap = MinHeap()
    initial_nodes = []
    for char, freq in frequencies.items():
        node = HuffmanNode(char=char, freq=freq)
        heap.insert(node)
        initial_nodes.append({"char": char, "freq": freq})

    if log_trace:
        trace.append({
            "step": "initialize",
            "heap": heap.get_serialized_state()
        })

    # Edge case: Empty file
    if heap.size() == 0:
        return None, trace

    # Edge case: Single unique byte
    if heap.size() == 1:
        root = heap.extract_min()
        # Create a parent dummy node so tree traversal works cleanly
        parent = HuffmanNode(char=None, freq=root.freq, left=root)
        heap.insert(parent)
        if log_trace:
            trace.append({
                "step": "single_node_parent",
                "heap": heap.get_serialized_state()
            })

    step_counter = 1
    # 2. Iterate and merge nodes
    while heap.size() > 1:
        # Pop the two nodes with the lowest frequencies
        left = heap.extract_min()
        right = heap.extract_min()

        # Create a merged internal node
        merged = HuffmanNode(
            char=None,
            freq=left.freq + right.freq,
            left=left,
            right=right
        )

        heap.insert(merged)

        if log_trace:
            trace.append({
                "step": f"merge_{step_counter}",
                "merged": {
                    "left": {"char": left.char, "freq": left.freq},
                    "right": {"char": right.char, "freq": right.freq},
                    "parent_freq": merged.freq
                },
                "heap": heap.get_serialized_state()
            })
            step_counter += 1

    return heap.extract_min(), trace

def generate_huffman_codes(root: HuffmanNode | None) -> dict[int, str]:
    """Traverses the Huffman tree recursively to assign prefix-free binary codes."""
    codes = {}
    if root is None:
        return codes

    def traverse(node: HuffmanNode, current_code: str):
        if node.is_leaf():
            codes[node.char] = current_code
            return
        if node.left:
            traverse(node.left, current_code + "0")
        if node.right:
            traverse(node.right, current_code + "1")

    # If the root has only one child (from single unique byte edge case)
    if root.left and root.left.is_leaf() and root.right is None:
        codes[root.left.char] = "0"
    else:
        traverse(root, "")
    
    return codes

def huffman_compress(src_path: str, dst_path: str, log_trace_path: str | None = None) -> dict:
    """
    Compresses a file using Huffman Coding.
    Writes:
      - Header length (4 bytes, big-endian integer)
      - Serialized frequency map (JSON string utf-8 encoded)
      - Unused bits buffer offset (1 byte, padding size)
      - Packed bitstream bytes
    """
    # Read source file bytes
    with open(src_path, "rb") as f:
        data = f.read()

    orig_size = len(data)
    if orig_size == 0:
        # Empty file case
        with open(dst_path, "wb") as f:
            f.write(struct.pack(">I", 0))  # Empty header length
            f.write(b"\x00")  # 0 padding
        return {"orig_bytes": 0, "out_bytes": 5}

    # Count frequencies
    frequencies = {}
    for byte in data:
        frequencies[byte] = frequencies.get(byte, 0) + 1

    # Build Tree and Generate Codes
    root, trace = build_huffman_tree(frequencies, log_trace=bool(log_trace_path))
    codes = generate_huffman_codes(root)

    # Export trace for React visualizer if path provided
    if log_trace_path:
        with open(log_trace_path, "w") as f:
            json.dump({
                "frequencies": sorted([{"char": k, "freq": v} for k, v in frequencies.items()], key=lambda x: -x["freq"]),
                "trace": trace,
                "codes": {str(k): v for k, v in codes.items()}
            }, f, indent=2)

    # Encode data into bitstream string
    bit_chunks = [codes[byte] for byte in data]
    bitstream = "".join(bit_chunks)

    # Calculate padding needed to align bits to 8-bit bytes
    padding_len = (8 - (len(bitstream) % 8)) % 8
    bitstream += "0" * padding_len

    # Pack bits into bytearray
    packed_bytes = bytearray()
    for i in range(0, len(bitstream), 8):
        byte = bitstream[i:i+8]
        packed_bytes.append(int(byte, 2))

    # Serialize frequency map header
    # Note: JSON keys must be string in standard JSON, so we cast byte integers to strings
    header_dict = {str(k): v for k, v in frequencies.items()}
    header_json = json.dumps(header_dict).encode("utf-8")
    header_len = len(header_json)

    # Write compressed file
    with open(dst_path, "wb") as f:
        # Write header size
        f.write(struct.pack(">I", header_len))
        # Write header content
        f.write(header_json)
        # Write padding size
        f.write(struct.pack("B", padding_len))
        # Write bitstream payload
        f.write(packed_bytes)

    out_size = Path(dst_path).stat().st_size
    return {
        "orig_bytes": orig_size,
        "out_bytes": out_size,
        "frequencies": frequencies,
        "codes": codes
    }

def huffman_decompress(src_path: str, dst_path: str):
    """Decompresses a custom huffman binary file."""
    with open(src_path, "rb") as f:
        # Read header size
        header_len_bytes = f.read(4)
        if len(header_len_bytes) < 4:
            # Corrupted
            return
        header_len = struct.unpack(">I", header_len_bytes)[0]

        if header_len == 0:
            # Empty file
            with open(dst_path, "wb") as out_f:
                out_f.write(b"")
            return

        # Read header content
        header_json = f.read(header_len)
        header_dict = json.loads(header_json.decode("utf-8"))
        
        # Convert JSON string keys back to integer byte codes
        frequencies = {int(k): v for k, v in header_dict.items()}

        # Read padding size
        padding_len = struct.unpack("B", f.read(1))[0]

        # Read remaining bitstream bytes
        bit_bytes = f.read()

    # Reconstruct tree
    root, _ = build_huffman_tree(frequencies, log_trace=False)
    if root is None:
        with open(dst_path, "wb") as out_f:
            out_f.write(b"")
        return

    # Expand bytes to string of '0's and '1's
    bitstream_list = []
    for b in bit_bytes:
        bitstream_list.append(f"{b:08b}")
    
    bitstream = "".join(bitstream_list)
    if padding_len > 0:
        bitstream = bitstream[:-padding_len]  # Trim padding bits

    # Decode bitstream by walking down the tree
    decoded_bytes = bytearray()
    curr_node = root
    for bit in bitstream:
        if bit == "0":
            curr_node = curr_node.left
        else:
            curr_node = curr_node.right

        if curr_node.is_leaf():
            decoded_bytes.append(curr_node.char)
            curr_node = root

    # Write decompressed data
    with open(dst_path, "wb") as f:
        f.write(decoded_bytes)

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 3:
        cmd = sys.argv[1]
        src = sys.argv[2]
        dst = sys.argv[3]
        trace = sys.argv[4] if len(sys.argv) > 4 else None
        if cmd == "compress":
            stats = huffman_compress(src, dst, trace)
            print(f"Compressed Huffman: {stats['orig_bytes']} -> {stats['out_bytes']}")
        elif cmd == "decompress":
            huffman_decompress(src, dst)
            print("Decompressed Huffman successfully.")
    else:
        print("Usage: python huffman.py <compress|decompress> <src> <dst> [trace_log_path]")
