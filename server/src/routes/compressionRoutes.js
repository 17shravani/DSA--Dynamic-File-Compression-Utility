import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import mongoose from 'mongoose';
import CompressionRecord from '../models/CompressionRecord.js';

const router = express.Router();

// Define root directories
const rootDir = path.resolve(process.cwd(), '..');
const inputDir = path.join(rootDir, 'input_files');
const compressedDir = path.join(rootDir, 'compressed_files');
const decompressedDir = path.join(rootDir, 'decompressed_files');
const sandboxDbPath = path.join(rootDir, 'server/sandbox_db.json');

// Ensure directories exist
[inputDir, compressedDir, decompressedDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Multer storage configuration (saves to inputDir first)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, inputDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// Local JSON file store helpers for MongoDB Fallback
function readSandboxRecords() {
  if (!fs.existsSync(sandboxDbPath)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(sandboxDbPath, 'utf8'));
  } catch (e) {
    return [];
  }
}

function writeSandboxRecords(records) {
  try {
    fs.writeFileSync(sandboxDbPath, JSON.stringify(records, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write sandbox DB:', e);
  }
}

/**
 * Spawns the python executable with arguments and returns a promise.
 */
function runPythonCLI(args) {
  return new Promise((resolve, reject) => {
    const mainPyPath = path.join(rootDir, 'main.py');
    console.log(`[Express API] Spawning python ${mainPyPath} with args:`, args);
    const child = spawn('python', [mainPyPath, ...args]);
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      let parsed = null;
      try {
        const jsonStart = stdout.indexOf('{');
        const jsonEnd = stdout.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          const jsonStr = stdout.substring(jsonStart, jsonEnd + 1);
          parsed = JSON.parse(jsonStr);
        } else {
          parsed = JSON.parse(stdout);
        }
      } catch (e) {
        // Failed parsing as JSON
      }

      if (code !== 0) {
        if (parsed && parsed.success === false && parsed.error) {
          return reject(new Error(parsed.error));
        }
        return reject(new Error(stderr.trim() || `CLI exited with code ${code}`));
      }

      if (parsed) {
        resolve(parsed);
      } else {
        resolve({ raw: stdout });
      }
    });
  });
}

// 1. Compress File
router.post('/compress', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  const mode = req.body.mode || 'auto';
  const originalName = req.file.originalname;
  const filePath = req.file.path;
  const targetCompressedName = `${req.file.filename}.dfc`;
  const compressedPath = path.join(compressedDir, targetCompressedName);

  try {
    // Run compression child process
    const result = await runPythonCLI(['compress', filePath, '--mode', mode, '--dst', compressedPath]);
    
    if (!result.success) {
      throw new Error(result.error || 'Compression failed.');
    }

    const manifest = result.manifest;
    const isDbConnected = mongoose.connection.readyState === 1;

    const recordData = {
      originalName,
      filePath: manifest.source,
      compressedPath: manifest.output,
      codec: manifest.codec,
      level: manifest.level,
      mode,
      origBytes: manifest.orig_bytes,
      outBytes: manifest.out_bytes,
      ratio: manifest.ratio,
      timeSeconds: manifest.time_seconds,
      speedMbs: manifest.speed_mbs,
      sha256: manifest.sha256,
      verified: false,
    };

    let record;
    if (isDbConnected) {
      record = await CompressionRecord.create(recordData);
    } else {
      console.log('⚠️ MongoDB not connected. Writing record to sandbox_db.json fallback.');
      const records = readSandboxRecords();
      record = {
        _id: `sandbox_${Date.now()}`,
        ...recordData,
        createdAt: new Date(),
      };
      records.unshift(record);
      writeSandboxRecords(records);
    }

    res.json({
      success: true,
      record,
      manifest,
    });

  } catch (err) {
    console.error('[API Error] Compression route failed:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. Decompress File
router.post('/decompress', async (req, res) => {
  const { recordId } = req.body;
  if (!recordId) {
    return res.status(400).json({ success: false, message: 'recordId is required.' });
  }

  try {
    let record;
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      record = await CompressionRecord.findById(recordId);
    } else {
      const records = readSandboxRecords();
      record = records.find((r) => r._id === recordId);
    }

    if (!record) {
      return res.status(404).json({ success: false, message: 'Compression record not found.' });
    }

    const decompressName = `decompressed-${record.originalName}`;
    const targetDecompressPath = path.join(decompressedDir, decompressName);

    const result = await runPythonCLI([
      'decompress',
      record.compressedPath,
      '--dst',
      targetDecompressPath,
    ]);

    if (!result.success) {
      throw new Error(result.error || 'Decompression failed.');
    }

    res.json({
      success: true,
      decompressedPath: result.output_path,
    });

  } catch (err) {
    console.error('[API Error] Decompression route failed:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Verify File
router.post('/verify', async (req, res) => {
  const { recordId } = req.body;
  if (!recordId) {
    return res.status(400).json({ success: false, message: 'recordId is required.' });
  }

  try {
    let record;
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      record = await CompressionRecord.findById(recordId);
    } else {
      const records = readSandboxRecords();
      record = records.find((r) => r._id === recordId);
    }

    if (!record) {
      return res.status(404).json({ success: false, message: 'Compression record not found.' });
    }

    const manifestPath = `${record.compressedPath}.dfc.json`;
    const result = await runPythonCLI(['verify', manifestPath]);

    if (!result.success) {
      throw new Error(result.error || 'Verification failed.');
    }

    // Update verified status
    if (result.valid) {
      if (isDbConnected) {
        record.verified = true;
        await record.save();
      } else {
        const records = readSandboxRecords();
        const idx = records.findIndex((r) => r._id === recordId);
        if (idx !== -1) {
          records[idx].verified = true;
          writeSandboxRecords(records);
        }
      }
    }

    res.json({
      success: true,
      valid: result.valid,
    });

  } catch (err) {
    console.error('[API Error] Verification route failed:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. Train Dictionary
router.post('/train-dict', async (req, res) => {
  const { globPattern, targetSize } = req.body;
  if (!globPattern) {
    return res.status(400).json({ success: false, message: 'globPattern is required.' });
  }

  try {
    const size = targetSize || 112 * 1024;
    
    // Resolve relative path to absolute workspace path
    let resolvedGlob = globPattern;
    if (!path.isAbsolute(globPattern)) {
      resolvedGlob = path.resolve(rootDir, globPattern);
    }
    
    // Convert backslashes to forward slashes for Python glob matching on Windows
    resolvedGlob = resolvedGlob.replace(/\\/g, '/');

    const result = await runPythonCLI(['train-dict', resolvedGlob, '--size', String(size)]);

    if (!result.success) {
      throw new Error(result.error || 'Dictionary training failed.');
    }

    res.json({
      success: true,
      dictionaryPath: result.dictionary_path,
    });

  } catch (err) {
    console.error('[API Error] Dictionary training route failed:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. Huffman Coding step-by-step trace generator
router.post('/visualize-huffman', async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ success: false, message: 'text field is required.' });
  }

  // Write text payload to a temp file
  const tempTextFile = path.join(inputDir, `temp-visualize-${Date.now()}.txt`);
  const tempTraceFile = path.join(inputDir, `temp-trace-${Date.now()}.json`);

  try {
    fs.writeFileSync(tempTextFile, text, 'utf-8');

    // Run python trace generator
    const result = await runPythonCLI(['visualize-huffman', tempTextFile, tempTraceFile]);

    if (!result.success) {
      throw new Error(result.error || 'Huffman trace generation failed.');
    }

    // Read trace file content
    const traceContent = JSON.parse(fs.readFileSync(tempTraceFile, 'utf-8'));

    res.json({
      success: true,
      data: traceContent,
    });

  } catch (err) {
    console.error('[API Error] Huffman visualization route failed:', err.message);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    // Cleanup temp files
    if (fs.existsSync(tempTextFile)) fs.unlinkSync(tempTextFile);
    if (fs.existsSync(tempTraceFile)) fs.unlinkSync(tempTraceFile);
  }
});

// 6. Get History Records
router.get('/history', async (req, res) => {
  try {
    const isDbConnected = mongoose.connection.readyState === 1;
    if (isDbConnected) {
      const records = await CompressionRecord.find().sort({ createdAt: -1 });
      res.json({ success: true, records });
    } else {
      const records = readSandboxRecords();
      res.json({ success: true, records });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7. Get Performance Statistics Summary
router.get('/stats', async (req, res) => {
  try {
    let records;
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      records = await CompressionRecord.find();
    } else {
      records = readSandboxRecords();
    }
    
    if (records.length === 0) {
      return res.json({
        success: true,
        stats: {
          totalFiles: 0,
          totalOrigBytes: 0,
          totalOutBytes: 0,
          totalSavedBytes: 0,
          avgRatio: 0,
          avgSpeedMbs: 0,
          codecsCounts: {},
        },
      });
    }

    const totalFiles = records.length;
    let totalOrigBytes = 0;
    let totalOutBytes = 0;
    let totalSpeed = 0;
    const codecsCounts = {};

    records.forEach((r) => {
      totalOrigBytes += r.origBytes;
      totalOutBytes += r.outBytes;
      totalSpeed += r.speedMbs;
      codecsCounts[r.codec] = (codecsCounts[r.codec] || 0) + 1;
    });

    const totalSavedBytes = Math.max(0, totalOrigBytes - totalOutBytes);
    const avgRatio = totalOrigBytes > 0 ? totalOutBytes / totalOrigBytes : 0;
    const avgSpeedMbs = totalSpeed / totalFiles;

    res.json({
      success: true,
      stats: {
        totalFiles,
        totalOrigBytes,
        totalOutBytes,
        totalSavedBytes,
        avgRatio: roundDecimal(avgRatio, 4),
        avgSpeedMbs: roundDecimal(avgSpeedMbs, 2),
        codecsCounts,
      },
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

function roundDecimal(num, decimals) {
  return Number(Math.round(num + 'e' + decimals) + 'e-' + decimals);
}

export default router;
