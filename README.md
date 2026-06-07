# 🪐 DynaCompress AI: Intelligent Lossless Compression & Cloud Telemetry Ecosystem

DynaCompress AI is an enterprise-grade, content-aware lossless compression utility and SaaS analytics dashboard. It merges core **Data Structures & Algorithms (Huffman Coding)** with **modern production codecs (ZStandard, Brotli, Gzip, Bzip2, LZMA)** into a unified, self-optimizing engine. Guided by an **AI Multi-Agent Simulation**, the platform auto-tunes compression strategies in real time based on Shannon entropy and file-type heuristics to minimize storage footprints and cloud egress costs.

---

## 1. Project Explanation

### A. Simple Explanation
Think of DynaCompress AI as a **smart data packer**. Different file types compress differently—packing text is different from packing database records or images. Rather than forcing you to manually choose compression settings (like choosing between Gzip, ZIP, or 7-Zip), DynaCompress AI profiles the file, automatically selects the best codec, and compresses it. It also includes an interactive **Huffman Sandbox** where you can type any text and watch the computer build the binary encoding tree step-by-step!

### B. Technical Explanation
DynaCompress AI operates as a dual-engine architecture:
1. **Strategic Multi-Codec Core**: Uses `mimetypes` and magic bytes to detect file formats, calculates Shannon entropy (measuring data randomness from `0.0` to `8.0` bits), and evaluates the printable ASCII ratio. A heuristic rule engine maps these parameters to an optimal plan (determining codec, compression level, block size, and worker threads) using streaming, memory-safe I/O loops.
2. **DSA Pedagogical Engine**: A custom implementation of Huffman Coding from scratch. It builds a frequency table, populates a custom binary **Min-Heap (Priority Queue)**, merges nodes to construct a binary **Huffman Tree**, generates prefix-free binary codes, and packs the variable-length bits into bytearrays. It serializes the frequency table into a binary file header to ensure lossless decompression.

### C. DSA Concept Mapping
* **Priority Queue / Min Heap**: Tracks leaf nodes and merges the two lowest-frequency subtrees at each step ($O(N \log N)$ construction).
* **Binary Trees**: Traverses the root-to-leaf paths to assign binary code strings ('0' for left, '1' for right).
* **Hash Maps / Dictionaries**: Counts character frequencies in $O(N)$ time and maps characters to prefix codes in $O(1)$ lookups.
* **Greedy Algorithm**: Merges the two smallest weights at each iteration to produce mathematically optimal prefix codes.
* **Bit Manipulation**: Packs character bits into 8-bit bytes and handles bitwise padding offsets.

---

## 2. Tech Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend Dashboard** | React (Vite), Tailwind CSS, Lucide Icons | Glassmorphic dark-theme, responsive layouts, Canvas/SVG tree drawings. |
| **Backend API Gateway** | Node.js, Express.js, Multer | Manages file uploads, spawns Python child processes, exposes REST paths. |
| **Real-time Telemetry** | Socket.io WebSockets | Streams progress percentages and AI multi-agent simulation logs. |
| **Database** | MongoDB & Mongoose ODM | Persists telemetry records, original/compressed sizes, and checksums. |
| **Core Compression** | Python 3.10+, zstandard, brotli | Implements custom Huffman structures, zstd dictionaries, and system APIs. |
| **Automated Testing** | Pytest | Evaluates heap states, codec roundtrips, and hash integrity. |

---

## 3. Product Architecture & Data Flow

```
                      ┌────────────────────────────────────────┐
                      │          UI FRONTEND (React)           │
                      │   Uploads file, starts visualizer,     │
                      │   renders interactive Huffman tree     │
                      └──────┬──────────────────────────▲──────┘
                             │                          │
                 File upload │                          │ Socket.io: Agent Logs,
                 REST API    │                          │ Progress % Telemetry
                             ▼                          │
                      ┌─────────────────────────────────┴──────┐
                      │          API BACKEND (Node)            │
                      │   Saves upload, spawns Python CLI,     │
                      │   updates MongoDB Compression Records  │
                      └──────┬─────────────────────────────────┘
                             │
                             │ child_process.spawn()
                             ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                         PYTHON COMPRESSION ENGINE                           │
 │                                                                             │
 │  1. DETECTOR: Magic Bytes → MIME → sample stats → Shannon Entropy           │
 │  2. STRATEGY SELECTOR: Heuristic mapping → Codec (zstd/br/gz) + Chunk size  │
 │  3. COMPRESSOR/DECOMPRESSOR: Memory-safe chunked streams                    │
 │  4. VERIFIER: Decompresses to temp buffer & checks SHA-256 integrity        │
 │  5. HUFFMAN Sandbox: Emits Priority Queue and Node Merge Trace (JSON)       │
 └─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Folder Structure

```
DynaCompress-AI/
│
├── client/                     # Vite React SPA Dashboard
│   ├── src/
│   │   ├── components/         # Reusable dashboard panels
│   │   │   ├── HuffmanVisualizer.jsx   # Step-by-step SVG tree renderer
│   │   │   ├── AgentControlCenter.jsx  # Multi-agent simulation console
│   │   │   └── MetricsDashboard.jsx    # Savings calculator & history table
│   │   ├── pages/
│   │   │   └── CompressionDashboard.jsx # Central workspace view
│   │   └── App.jsx             # Main SPA routing
│   └── package.json            # Frontend dependency configs
│
├── server/                     # Express API & WebSockets Gateway
│   ├── src/
│   │   ├── models/             # Mongoose schemas (CompressionRecord.js)
│   │   ├── routes/             # REST mappings (compressionRoutes.js)
│   │   ├── sockets/            # Socket.io listeners (compressionSocket.js)
│   │   └── index.js            # Main server entry file
│   └── package.json            # Backend dependency configs
│
├── src/                        # Python Compression Core Modules
│   ├── detector.py             # File entropy & mime-type diagnostics
│   ├── strategy.py             # Codec selection heuristic rules
│   ├── huffman.py              # Custom Heap & Binary Tree Huffman codec
│   ├── compress.py             # Streaming compression pipeline
│   ├── decompress.py           # Stream decoding manager
│   ├── verify.py               # Checksum integrity loops
│   ├── dict_train.py           # ZStandard dictionary training
│   ├── archive.py              # Directory tar-pipe streaming archiver
│   └── test_dfc.py             # Pytest automated testing suite
│
├── input_files/                # Temp original uploads folder (Gitignored)
├── compressed_files/           # Compressed outputs directory (Gitignored)
├── decompressed_files/         # Restored files directory (Gitignored)
├── main.py                     # Root CLI Entry Point
├── requirements.txt            # Python requirements
└── README.md                   # Product master documentation
```

---

## 5. Installation & Run Guide

### A. Prerequisites
Ensure you have the following installed on your system:
* **Node.js** (v18+)
* **Python** (v3.10+)
* **MongoDB** (running locally on port `27017` or configured via `.env`)

### B. Python Environment Setup
Open your terminal in the project root directory and run:
```bash
# Install required compression and testing packages
pip install -r requirements.txt
```

### C. Launch Backend Server
1. Navigate to the `/server` directory:
   ```bash
   cd server
   npm install
   ```
2. Create a `.env` file inside `/server` (if not present) and configure:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://127.0.0.1:27017/dynacompress
   CLIENT_URL=http://localhost:5173
   ```
3. Launch the server in development mode:
   ```bash
   npm run dev
   ```

### D. Launch Frontend Dashboard
1. Open a new terminal window, navigate to the `/client` directory:
   ```bash
   cd client
   npm install
   ```
2. Start the Vite React development server:
   ```bash
   npm run dev
   ```
3. Open your browser and navigate to `http://localhost:5173`.

---

## 6. How to Run via CLI (Terminal)

You can also run all compression engine operations directly from the CLI via `main.py` at the root directory:

### 1. Compress File
Select strategy `mode` from: `auto`, `fast`, `balanced`, `max`, `dsa` (custom Huffman).
```bash
python main.py compress input_files/sample.txt --mode balanced
```
*Outputs:* A compressed file `input_files/sample.txt.zst` and manifest `input_files/sample.txt.zst.dfc.json`.

### 2. Decompress File
```bash
python main.py decompress compressed_files/sample.dfc --dst decompressed_files/restored.txt
```

### 3. Verify Checksum Integrity
```bash
python main.py verify compressed_files/sample.dfc.dfc.json
```

### 4. Train a Custom Zstd Dictionary
```bash
python main.py train-dict "input_files/*.txt" --size 114688 --out my_dictionary.dict
```

### 5. Archive and Compress Folder
```bash
python main.py archive input_files/my_folder --dst compressed_files/folder_archive.tar.zst
```

---

## 7. Automated Verification Tests

Run the comprehensive unit test suite using `pytest` from the root directory:
```bash
python -m pytest src/test_dfc.py -v
```
All 8 test cases verify heap operations, tree creation, binary encoding, and roundtrip compression of text/binary data without loss.

---

## 8. Virtual Simulation Flow

To validate and showcase the platform's features:
1. **Interactive Huffman Sandbox**:
   * Navigate to the **Huffman Sandbox** tab.
   * Input text like `BABBAGE` or `SUCCESS` and click **Visualize**.
   * Click **Play** or step through with the arrow buttons to watch:
     1. Characters counting and ranking.
     2. Leaf nodes loading into the Priority Queue Heap.
     3. Minimum items popping out and merging into binary parent nodes.
     4. The complete binary tree drawing with codes.
     5. The resulting compressed bitstream compared to standard ASCII bit widths.
2. **Dynamic Pipeline upload**:
   * Navigate to the **File Compression** tab.
   * Drag in a text log file, choose **Balanced**, and click **Dispatch Compression Pipeline**.
   * Watch the **Multi-Agent Command Console** output the logs from the *Strategy*, *Optimization*, *Compression*, *Security*, and *Telemetry* agents in real-time.
   * Once finished, click **Verify Integrity** to confirm the SHA-256 signature matches.
   * Check the **Analytics & Savings** tab to review the average compression ratios and estimate cloud storage bill savings.

---

## 9. Day-Wise Proof Building Strategy

Space out your commits to present a logical, industry-standard development lifecycle on GitHub:
* **Day 1: Setup and CLI Blueprints**
  * `feat: initialize folder structures and build property detector engine`
* **Day 2: Custom Heap and Binary Tree Node**
  * `feat: implement custom MinHeap and binary node classes for Huffman codec`
* **Day 3: Huffman Bitstream Packing & Serialization**
  * `feat: complete custom Huffman compression, bit packing, and header serialization`
* **Day 4: Multi-Codec Compression and Dictionary Training**
  * `feat: complete streaming compressor wrapper for zstd, brotli, gzip, bz2, and lzma`
* **Day 5: Checksum Verification and Directory Archiving**
  * `feat: complete SHA-256 roundtrip verifier and directory tar packer`
* **Day 6: Automated Testing Suites**
  * `test: construct pytest cases for heap, detector, strategy, and codecs`
* **Day 7: API Wrapper Node endpoints**
  * `feat: integrate Express router endpoints and multer upload managers`
* **Day 8: WebSockets Multi-Agent Socket Gateways**
  * `feat: build socket.io agent simulator logs and progress streams`
* **Day 9: Animated Huffman Visualizer UI**
  * `feat: implement interactive SVG tree layout builder and heap step tracer`
* **Day 10: Financial Analytics & Cloud Savings Dashboard**
  * `feat: build cost savings calculator, history logs, and final documentation`

---

## 10. Core Learning Outcomes
* **Data Structure Implementation**: Building a binary heap and tree from scratch, mastering recursive traversals, pointers, and node structures.
* **Greedy Algorithm Mastery**: Understanding how greedy selections yield mathematically optimal prefix encodings (lossless compression limits).
* **System Design & API Orchestration**: Spawning child processes from a Node backend, streaming WebSocket events, and managing file system directory hooks.
* **Telemetry & Analytics**: Logging compression ratios, speeds (MB/s), calculating Shannon entropy, and translating bytes into cloud storage cost savings.
