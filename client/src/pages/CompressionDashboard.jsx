import React, { useState, useEffect, useContext, useRef } from 'react';
import io from 'socket.io-client';
import { 
  FileArchive, Binary, BookOpen, BarChart3, Upload, Shield, 
  Settings, Download, Play, CheckCircle, Trash2, HelpCircle, RefreshCw
} from 'lucide-react';

import AgentControlCenter from '../components/AgentControlCenter.jsx';
import HuffmanVisualizer from '../components/HuffmanVisualizer.jsx';
import MetricsDashboard from '../components/MetricsDashboard.jsx';

export default function CompressionDashboard() {
  const [activeTab, setActiveTab] = useState('compress');
  const fileInputRef = useRef(null);
  
  // File upload states
  const [selectedFile, setSelectedFile] = useState(null);
  const [mode, setMode] = useState('auto');
  const [compressing, setCompressing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeRecord, setActiveRecord] = useState(null);
  
  // Agent simulation socket states
  const [socket, setSocket] = useState(null);
  const [agentLogs, setAgentLogs] = useState([]);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);

  // Dictionary trainer states
  const [globPattern, setGlobPattern] = useState('input_files/*.txt');
  const [dictSize, setDictSize] = useState(112 * 1024);
  const [trainingLogs, setTrainingLogs] = useState([]);
  const [training, setTraining] = useState(false);

  // History and Stats states
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // Connect to Sockets
  useEffect(() => {
    const socketUrl = window.location.origin === 'http://localhost:5173' 
      ? 'http://localhost:5000' 
      : window.location.origin;
    
    const newSocket = io(socketUrl);
    setSocket(newSocket);

    // Socket Event: Agent Logs
    newSocket.on('agent_log', (log) => {
      setAgentLogs((prev) => [...prev, log]);
    });

    // Socket Event: Progress Percentage
    newSocket.on('compression_progress', (data) => {
      if (data && typeof data.percent === 'number') {
        setCompressionProgress(data.percent);
        if (data.percent === 100) {
          setTimeout(() => setIsSimulating(false), 2000);
        }
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Prevent browser from navigating to dropped files globally
  useEffect(() => {
    const preventDefault = (e) => e.preventDefault();
    window.addEventListener('dragover', preventDefault);
    window.addEventListener('drop', preventDefault);
    return () => {
      window.removeEventListener('dragover', preventDefault);
      window.removeEventListener('drop', preventDefault);
    };
  }, []);

  // Fetch History and Stats
  const fetchData = async () => {
    setLoadingRecords(true);
    try {
      const histRes = await fetch('/api/compression/history');
      const histData = await histRes.json();
      if (histData.success) {
        setHistory(histData.records);
      }

      const statsRes = await fetch('/api/compression/stats');
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.stats);
      }
    } catch (err) {
      console.error('Failed to load history/stats:', err);
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // Handle Drag & Drop / File select
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Run Compression Pipeline
  const handleCompress = async () => {
    if (!selectedFile) return;
    
    setCompressing(true);
    setAgentLogs([]);
    setCompressionProgress(0);
    setIsSimulating(true);
    setActiveRecord(null);

    // 1. Trigger AI Multi-Agent Simulation logs via Socket.io
    if (socket) {
      socket.emit('run_agent_simulation', {
        filename: selectedFile.name,
        size: selectedFile.size,
        mime: selectedFile.type || 'text/plain',
        entropy: selectedFile.type?.includes('text') ? 4.2 : 7.8, // estimated
        textRatio: selectedFile.type?.includes('text') ? 0.95 : 0.1,
        mode: mode,
      });
    }

    // 2. Perform File Upload and process via API
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('mode', mode);

    try {
      const response = await fetch('/api/compression/compress', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (result.success) {
        setActiveRecord(result.record);
        // Refresh history
        fetchData();
      } else {
        alert('Compression pipeline failed: ' + result.message);
      }
    } catch (err) {
      console.error(err);
      alert('Error during compression upload.');
    } finally {
      setCompressing(false);
    }
  };

  // Handle Decompress
  const handleDecompress = async (recordId) => {
    try {
      const response = await fetch('/api/compression/decompress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId }),
      });
      const result = await response.json();
      if (result.success) {
        alert(`File restored successfully! Saved to:\n${result.decompressedPath}`);
      } else {
        alert('Decompression failed: ' + result.message);
      }
    } catch (err) {
      console.error(err);
      alert('Decompression server error.');
    }
  };

  // Handle Verify Checksum
  const handleVerify = async (recordId) => {
    try {
      const response = await fetch('/api/compression/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId }),
      });
      const result = await response.json();
      if (result.success) {
        if (result.valid) {
          alert('Integrity Check PASSED! Checksum matches original SHA-256 hash.');
        } else {
          alert('Integrity Check FAILED! File hash mismatch.');
        }
        fetchData();
      }
    } catch (err) {
      console.error(err);
      alert('Verification server error.');
    }
  };

  // Handle Dictionary Training
  const handleTrainDict = async () => {
    setTraining(true);
    setTrainingLogs([`Starting training trainer for glob: "${globPattern}"`]);
    try {
      const response = await fetch('/api/compression/train-dict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ globPattern, targetSize: dictSize }),
      });
      const result = await response.json();
      if (result.success) {
        setTrainingLogs((prev) => [
          ...prev,
          `SUCCESS: Custom zstd dictionary created!`,
          `Saved file path: ${result.dictionaryPath}`,
        ]);
      } else {
        setTrainingLogs((prev) => [...prev, `ERROR: ${result.message}`]);
      }
    } catch (err) {
      setTrainingLogs((prev) => [...prev, `EXCEPTION: Failed to communicate with training API.`]);
    } finally {
      setTraining(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 min-h-[calc(100vh-8rem)]">
      
      {/* Sidebar Navigation */}
      <div className="w-full lg:w-64 shrink-0 space-y-4">
        <div className="glow-card p-4 rounded-2xl border border-white/5 bg-[#111827] flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-purple-500 to-cyan-500 rounded-xl">
            <FileArchive className="w-6 h-6 text-white animate-spin-slow" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-tight text-slate-200">DynaCompress AI</h1>
            <span className="text-[10px] text-cyan-400 font-mono font-semibold uppercase">Smart Engine v1.0</span>
          </div>
        </div>

        <div className="glow-card p-3 rounded-2xl border border-white/5 bg-[#111827] flex flex-col gap-1.5 shadow-lg">
          <button
            onClick={() => setActiveTab('compress')}
            className={`w-full p-3 text-xs font-semibold rounded-xl flex items-center gap-3 transition-all ${
              activeTab === 'compress' 
                ? 'bg-gradient-to-r from-purple-500/20 to-cyan-500/10 text-cyan-400 border-l-2 border-cyan-400 font-bold pl-4' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Upload className="w-4 h-4" />
            File Compression
          </button>
          
          <button
            onClick={() => setActiveTab('huffman')}
            className={`w-full p-3 text-xs font-semibold rounded-xl flex items-center gap-3 transition-all ${
              activeTab === 'huffman' 
                ? 'bg-gradient-to-r from-purple-500/20 to-cyan-500/10 text-cyan-400 border-l-2 border-cyan-400 font-bold pl-4' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Binary className="w-4 h-4" />
            Huffman Sandbox
          </button>
          
          <button
            onClick={() => setActiveTab('dict')}
            className={`w-full p-3 text-xs font-semibold rounded-xl flex items-center gap-3 transition-all ${
              activeTab === 'dict' 
                ? 'bg-gradient-to-r from-purple-500/20 to-cyan-500/10 text-cyan-400 border-l-2 border-cyan-400 font-bold pl-4' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Dictionary Trainer
          </button>
          
          <button
            onClick={() => setActiveTab('analytics')}
            className={`w-full p-3 text-xs font-semibold rounded-xl flex items-center gap-3 transition-all ${
              activeTab === 'analytics' 
                ? 'bg-gradient-to-r from-purple-500/20 to-cyan-500/10 text-cyan-400 border-l-2 border-cyan-400 font-bold pl-4' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Analytics & Savings
          </button>
        </div>
      </div>

      {/* Main Content Pane */}
      <div className="flex-1 min-w-0">
        {activeTab === 'compress' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            
            {/* Compression Panel */}
            <div className="glow-card p-6 rounded-2xl border border-white/5 bg-[#111827] shadow-xl space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-200">Lossless Multi-Codec Pipeline</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Upload file binaries and let the engine dynamically profile, index, and select the optimal lossless encoder.
                </p>
              </div>

              {/* Drag Drop Box */}
              <div 
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    setSelectedFile(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current.click()}
                className="border border-dashed border-slate-800 hover:border-purple-500/50 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-950 relative overflow-hidden group"
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange} 
                  className="hidden" 
                />
                <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 mb-3 group-hover:scale-105 transition-transform duration-300">
                  <Upload className="w-6 h-6 text-purple-400" />
                </div>
                {selectedFile ? (
                  <div className="text-center">
                    <p className="text-xs font-semibold text-slate-300 font-mono max-w-[280px] truncate">{selectedFile.name}</p>
                    <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                ) : (
                  <div className="text-center space-y-1">
                    <p className="text-xs font-semibold text-slate-300">Drag & Drop file payload</p>
                    <p className="text-[10px] text-slate-500">supports logs, JSON, binaries up to 100MB</p>
                  </div>
                )}
              </div>

              {/* Strategy Selector Settings */}
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2">
                    Optimization Priority (Mode)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      { id: 'auto', label: 'Balanced', desc: 'Ratio & Speed' },
                      { id: 'fast', label: 'Fast', desc: 'Low CPU usage' },
                      { id: 'max', label: 'Max', desc: 'Highest ratio' },
                      { id: 'dsa', label: 'DSA Mode', desc: 'Huffman only' }
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setMode(item.id)}
                        className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                          mode === item.id 
                            ? 'bg-[#3b0764] border-purple-500/50 text-purple-300 ring-1 ring-purple-500/30' 
                            : 'bg-slate-950 border-slate-850 hover:bg-slate-900 text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        <span className="text-xs font-bold">{item.label}</span>
                        <span className="text-[9px] font-medium opacity-80 mt-1">{item.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Trigger */}
              <button
                onClick={handleCompress}
                disabled={!selectedFile || compressing}
                className="w-full glow-btn-primary p-3.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <FileArchive className="w-4 h-4" />
                {compressing ? 'Executing Pipeline Operations...' : 'Dispatch Compression Pipeline'}
              </button>

              {/* Outputs Download Area */}
              {activeRecord && (
                <div className="bg-slate-950 border border-slate-900 p-4 rounded-xl space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">Pipeline Finished Output:</span>
                    <span className="text-emerald-400 font-bold font-mono">{((activeRecord?.ratio || 0) * 100).toFixed(0)}% Original Size</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => activeRecord?._id && handleVerify(activeRecord._id)}
                      className="flex-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg p-2.5 text-xs font-semibold text-slate-300 flex items-center justify-center gap-1.5 transition-all"
                    >
                      <CheckCircle className="w-4 h-4 text-cyan-400" /> Verify Integrity
                    </button>
                    
                    {/* Just decompress to verify manually */}
                    <button
                      onClick={() => activeRecord?._id && handleDecompress(activeRecord._id)}
                      className="flex-1 bg-[#3b0764] hover:bg-[#581c87] border border-[#7e22ce] rounded-lg p-2.5 text-xs font-semibold text-purple-300 flex items-center justify-center gap-1.5 transition-all"
                    >
                      <RefreshCw className="w-4 h-4" /> Restore File
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Agent Telemetry Output console */}
            <AgentControlCenter 
              logs={agentLogs} 
              progress={compressionProgress} 
              isSimulating={isSimulating} 
            />
          </div>
        )}

        {activeTab === 'huffman' && (
          <HuffmanVisualizer />
        )}

        {activeTab === 'dict' && (
          <div className="glow-card p-6 rounded-2xl border border-white/5 bg-[#111827] shadow-xl space-y-6 max-w-3xl">
            <div>
              <h2 className="text-lg font-bold text-slate-200">zstd Static Dictionary Trainer</h2>
              <p className="text-xs text-slate-400 mt-1">
                Train structural dictionaries against repetitive formats (e.g. JSON records, web APIs, system logs) to compress small files with high efficiency.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">
                  Training Glob Pattern
                </label>
                <input
                  type="text"
                  value={globPattern}
                  onChange={(e) => setGlobPattern(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs font-mono text-slate-300"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">
                  Target Dictionary Size
                </label>
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-2">
                  <input
                    type="number"
                    value={dictSize}
                    onChange={(e) => setDictSize(parseInt(e.target.value) || 0)}
                    className="bg-transparent border-none focus:outline-none flex-1 text-xs font-mono text-slate-300 text-right"
                  />
                  <span className="text-[10px] font-semibold text-slate-500 ml-2 font-mono">Bytes</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleTrainDict}
              disabled={training}
              className="glow-btn-primary p-3 rounded-xl text-xs font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <BookOpen className="w-4 h-4" />
              {training ? 'Training zstd Dictionary...' : 'Train Dictionary'}
            </button>

            {/* Dictionary Training Logs */}
            {(trainingLogs || []).length > 0 && (
              <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 font-mono text-xs text-slate-300 space-y-1 max-h-48 overflow-y-auto">
                {(trainingLogs || []).filter(Boolean).map((log, idx) => {
                  const logStr = String(log);
                  const isSuccess = logStr.startsWith('SUCCESS');
                  const isError = logStr.startsWith('ERROR') || logStr.startsWith('EXCEPTION');
                  return (
                    <div 
                      key={idx} 
                      className={isSuccess ? 'text-emerald-400 font-bold' : isError ? 'text-red-400' : 'text-slate-400'}
                    >
                      {logStr}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <MetricsDashboard 
            stats={stats} 
            history={history} 
            onDecompress={handleDecompress}
            onVerify={handleVerify}
            loadingRecords={loadingRecords}
          />
        )}
      </div>
    </div>
  );
}
