import React, { useState, useEffect } from 'react';
import { Play, Square, ChevronRight, ChevronLeft, Sparkles, Binary } from 'lucide-react';

export default function HuffmanVisualizer() {
  const [inputText, setInputText] = useState('BABBAGE');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const fetchTrace = async () => {
    if (!inputText || !inputText.trim()) return;
    setLoading(true);
    try {
      const response = await fetch('/api/compression/visualize-huffman', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });
      const result = await response.json();
      if (result.success) {
        setData(result.data);
        setStepIndex(0);
        setIsPlaying(false);
      } else {
        alert('Trace generation failed: ' + result.error);
      }
    } catch (err) {
      console.error(err);
      alert('Error fetching Huffman trace.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrace();
  }, []);

  // Autoplay interval loop
  useEffect(() => {
    let timer;
    if (isPlaying && data && data.trace) {
      timer = setInterval(() => {
        setStepIndex((prev) => {
          if (prev >= (data.trace?.length || 0) - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1500);
    }
    return () => clearInterval(timer);
  }, [isPlaying, data]);

  const handleNext = () => {
    if (data && data.trace && stepIndex < (data.trace?.length || 0) - 1) {
      setStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (stepIndex > 0) {
      setStepIndex((prev) => prev - 1);
    }
  };

  // Build the tree nodes representation from the final trace step for SVG plotting
  // To draw the tree, we reconstruct the tree hierarchy from frequencies/codes
  const buildSvgTree = () => {
    if (!data || !Array.isArray(data.frequencies) || !data.codes) return null;
    
    // We can parse the huffman codes to build a visual tree map
    const codes = data.codes;
    const root = { id: 'root', label: 'Root', freq: 0, children: [] };
    
    // Total character count
    const totalFreq = data.frequencies.reduce((acc, f) => acc + f.freq, 0);
    root.freq = totalFreq;

    // Build the tree structure by tracing paths of 0s and 1s
    Object.entries(codes).forEach(([charCode, path]) => {
      let curr = root;
      const char = String.fromCharCode(parseInt(charCode));
      const freq = data.frequencies.find(f => f.char === parseInt(charCode))?.freq || 0;

      for (let i = 0; i < path.length; i++) {
        const bit = path[i];
        let nextNode = curr.children.find(child => child.branch === bit);
        
        if (!nextNode) {
          nextNode = {
            id: `${curr.id}-${bit}`,
            branch: bit,
            freq: i === path.length - 1 ? freq : 0, // Leaves get character frequencies
            children: [],
          };
          curr.children.push(nextNode);
        }
        curr = nextNode;
      }
      curr.char = char;
    });

    // Populate internal node frequencies (sum of child frequencies)
    const computeFrequencies = (node) => {
      if (node.children.length === 0) return node.freq;
      let sum = 0;
      node.children.forEach(child => {
        sum += computeFrequencies(child);
      });
      node.freq = sum;
      return sum;
    };
    computeFrequencies(root);

    // Layout the tree recursively (assign x and y positions)
    // x range: 0 to 800, y spacing: 70 pixels per depth
    const nodes = [];
    const links = [];

    const layout = (node, xmin, xmax, y, depth) => {
      const x = (xmin + xmax) / 2;
      const nodeInfo = {
        id: node.id,
        x,
        y,
        label: node.char ? `'${node.char}'` : `${node.freq}`,
        freq: node.freq,
        isLeaf: !!node.char,
        char: node.char,
        depth
      };
      
      nodes.push(nodeInfo);

      node.children.sort((a, b) => a.branch.localeCompare(b.branch)).forEach((child) => {
        const isLeft = child.branch === '0';
        const nextXMin = isLeft ? xmin : x;
        const nextXMax = isLeft ? x : xmax;
        const childY = y + 75;

        links.push({
          x1: x,
          y1: y,
          x2: (nextXMin + nextXMax) / 2,
          y2: childY,
          label: child.branch,
        });

        layout(child, nextXMin, nextXMax, childY, depth + 1);
      });
    };

    layout(root, 40, 760, 40, 0);
    return { nodes, links };
  };

  const treeLayout = buildSvgTree();

  return (
    <div className="space-y-6">
      {/* Header and Input Panel */}
      <div className="glow-card p-6 rounded-2xl border border-white/5 bg-[#111827] shadow-xl">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
          <Binary className="text-cyan-400 w-5 h-5 animate-pulse" />
          DSA Huffman Coding Sandbox
        </h2>
        <div className="flex gap-4">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value.substring(0, 150))}
            placeholder="Type your text sample to visualize Huffman tree building..."
            className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm h-16 resize-none"
          />
          <button
            onClick={fetchTrace}
            disabled={loading}
            className="glow-btn-primary px-6 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {loading ? 'Analyzing...' : 'Visualize'}
          </button>
        </div>
      </div>

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel: Frequencies & Heap Steps */}
          <div className="lg:col-span-1 space-y-6">
            {/* Frequency Table */}
            <div className="glow-card p-6 rounded-2xl border border-white/5 bg-[#111827] shadow-md">
              <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider mb-3">Character Frequencies</h3>
              <div className="max-h-48 overflow-y-auto pr-1 space-y-2">
                {data.frequencies && Array.isArray(data.frequencies) && data.frequencies.map((item, idx) => {
                  const char = String.fromCharCode(item.char);
                  const isSpace = item.char === 32;
                  const label = isSpace ? '[space]' : `'${char}'`;
                  const total = Array.isArray(data.frequencies) ? data.frequencies.reduce((acc, f) => acc + f.freq, 0) : 1;
                  const percent = ((item.freq / total) * 100).toFixed(0);

                  return (
                    <div key={idx} className="flex items-center text-xs justify-between bg-slate-950 p-2 rounded-lg border border-slate-900">
                      <span className="font-mono text-cyan-400">{label}</span>
                      <div className="flex items-center gap-3 w-2/3">
                        <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${percent}%` }}
                            className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full"
                          ></div>
                        </div>
                        <span className="font-mono text-slate-300 w-12 text-right">{item.freq} ({percent}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Heap Execution Steps */}
            <div className="glow-card p-6 rounded-2xl border border-white/5 bg-[#111827] shadow-md flex flex-col justify-between min-h-[300px]">
              <div>
                <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider mb-2">Heap Merging Steps</h3>
                <p className="text-xs text-slate-400 mb-4">
                  Step {stepIndex + 1} of {data.trace?.length || 0}:
                </p>

                {/* Animation Log */}
                {data.trace && data.trace[stepIndex] && (
                  <div className="space-y-3">
                    {data.trace[stepIndex]?.step === 'initialize' ? (
                      <div className="text-xs bg-[#083344] text-cyan-300 border border-cyan-800/40 p-3 rounded-xl">
                        🍃 Heap initialized. Leaf nodes created for each unique character.
                      </div>
                    ) : data.trace[stepIndex]?.step === 'single_node_parent' ? (
                      <div className="text-xs bg-[#3b0764] text-purple-300 border border-purple-800/40 p-3 rounded-xl">
                        🧩 Single node padded with root container.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-xs bg-[#3b0764] text-purple-300 border border-purple-800/40 p-3 rounded-xl flex flex-col gap-1">
                          <span className="font-semibold text-purple-400">Merged lowest frequencies:</span>
                          <span className="font-mono text-slate-300">
                            Left: {data.trace[stepIndex]?.merged?.left?.char ? `'${String.fromCharCode(data.trace[stepIndex].merged.left.char)}'` : 'Node'} ({data.trace[stepIndex]?.merged?.left?.freq || 0}) + <br />
                            Right: {data.trace[stepIndex]?.merged?.right?.char ? `'${String.fromCharCode(data.trace[stepIndex].merged.right.char)}'` : 'Node'} ({data.trace[stepIndex]?.merged?.right?.freq || 0})
                          </span>
                          <span className="text-slate-400 border-t border-slate-800/60 mt-1 pt-1">
                            New Parent Node: Freq = {data.trace[stepIndex]?.merged?.parent_freq || 0}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Heap array view */}
                    <div className="mt-4">
                      <span className="text-xs text-slate-400 font-semibold block mb-2">Priority Queue Min-Heap Array State:</span>
                      <div className="flex flex-wrap gap-2">
                        {data.trace[stepIndex]?.heap?.map((hnode, idx) => (
                          <div
                            key={idx}
                            className={`p-1.5 px-2.5 rounded-lg border text-xs font-mono flex flex-col items-center justify-center ${
                              hnode?.is_leaf
                                ? 'bg-slate-950 border-cyan-800/40 text-cyan-300'
                                : 'bg-purple-950 border-purple-800/40 text-purple-300'
                            }`}
                          >
                            <span>{hnode?.char ? `'${String.fromCharCode(hnode.char)}'` : 'Node'}</span>
                            <span className="text-[10px] font-bold text-slate-400">{hnode?.freq || 0}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between border-t border-slate-800 pt-4 mt-4">
                <div className="flex gap-2">
                  <button
                    onClick={handlePrev}
                    disabled={stepIndex === 0}
                    className="p-2 bg-slate-950 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 rounded-lg text-slate-400 hover:text-white"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={stepIndex === (data.trace?.length || 1) - 1}
                    className="p-2 bg-slate-950 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 rounded-lg text-slate-400 hover:text-white"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setStepIndex(0);
                      setIsPlaying(false);
                    }}
                    className="p-2 bg-slate-950 hover:bg-red-950 border border-slate-800 rounded-lg text-slate-400 hover:text-red-400 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Square className="w-3.5 h-3.5" /> Reset
                  </button>
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-2 bg-purple-950 hover:bg-purple-900 border border-purple-800/60 rounded-lg text-purple-300 hover:text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> {isPlaying ? 'Pause' : 'Play'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: SVG Huffman Tree Drawing */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glow-card p-6 rounded-2xl border border-white/5 bg-[#111827] shadow-md flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider mb-4">Huffman Tree Structure</h3>
                
                {/* SVG canvas container */}
                {treeLayout && (
                  <div className="bg-slate-950 border border-slate-800/80 rounded-2xl overflow-hidden p-4 flex justify-center">
                    <svg width="800" height="420" viewBox="0 0 800 420" className="max-w-full">
                      {/* Draw Links */}
                      {treeLayout.links.map((link, idx) => (
                        <g key={idx}>
                          <line
                            x1={link.x1}
                            y1={link.y1}
                            x2={link.x2}
                            y2={link.y2}
                            stroke="#475569"
                            strokeWidth="2"
                            strokeDasharray={link.label === '0' ? '' : '3 3'}
                          />
                          <rect
                            x={(link.x1 + link.x2) / 2 - 8}
                            y={(link.y1 + link.y2) / 2 - 8}
                            width="16"
                            height="16"
                            rx="4"
                            fill="#0f172a"
                            stroke="#334155"
                            strokeWidth="1"
                          />
                          <text
                            x={(link.x1 + link.x2) / 2}
                            y={(link.y1 + link.y2) / 2 + 4}
                            textAnchor="middle"
                            fill="#38bdf8"
                            fontSize="10"
                            fontWeight="bold"
                            className="font-mono"
                          >
                            {link.label}
                          </text>
                        </g>
                      ))}

                      {/* Draw Nodes */}
                      {treeLayout.nodes.map((node) => {
                        const isHighlighted = false; // Add highlighting logic if needed
                        return (
                          <g key={node.id}>
                            <circle
                              cx={node.x}
                              cy={node.y}
                              r={node.isLeaf ? '18' : '16'}
                              fill={node.isLeaf ? '#8b5cf6' : '#1e293b'}
                              stroke={node.isLeaf ? '#c084fc' : '#475569'}
                              strokeWidth="2"
                            />
                            <text
                              x={node.x}
                              y={node.y + 4}
                              textAnchor="middle"
                              fill="#f8fafc"
                              fontSize="11"
                              fontWeight="bold"
                              className="font-mono"
                            >
                              {node.label}
                            </text>
                            {/* Char frequency tag underneath */}
                            {node.isLeaf && (
                              <rect
                                x={node.x - 15}
                                y={node.y + 20}
                                width="30"
                                height="12"
                                rx="3"
                                fill="#020617"
                                stroke="#1e293b"
                                strokeWidth="1"
                              />
                            )}
                            {node.isLeaf && (
                              <text
                                x={node.x}
                                y={node.y + 29}
                                textAnchor="middle"
                                fill="#94a3b8"
                                fontSize="8"
                                fontWeight="bold"
                              >
                                f={node.freq}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                )}
              </div>

              {/* Bitstream details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-4 border-t border-slate-800/80 text-xs">
                <div>
                  <h4 className="font-semibold text-slate-300 mb-2">Final Character Encodings</h4>
                  <div className="grid grid-cols-3 gap-2 max-h-24 overflow-y-auto pr-1">
                    {data.codes && Object.entries(data.codes).map(([charCode, path], idx) => (
                      <div key={idx} className="bg-slate-950 p-1.5 px-2 rounded-lg border border-slate-900 flex justify-between font-mono">
                        <span className="text-cyan-400">'{String.fromCharCode(parseInt(charCode))}'</span>
                        <span className="text-purple-400 font-bold">{path}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-300 mb-2">Compression Stats</h4>
                  <div className="space-y-1 bg-slate-950 p-2.5 rounded-lg border border-slate-900 font-mono text-slate-400 flex flex-col justify-center h-20">
                    <div className="flex justify-between">
                      <span>Original Text Size:</span>
                      <span className="text-slate-300">{inputText.length * 8} bits</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Compressed Bitstream:</span>
                      <span className="text-purple-400 font-bold">
                        {data.codes && Array.isArray(data.frequencies) ? Object.entries(data.codes).reduce((acc, [char, path]) => {
                          const freq = data.frequencies.find(f => f.char === parseInt(char))?.freq || 0;
                          return acc + (freq * path.length);
                        }, 0) : 0} bits
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
