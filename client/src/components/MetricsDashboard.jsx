import React, { useState } from 'react';
import { Download, CheckCircle, HelpCircle, HardDrive, DollarSign, Zap, RefreshCw } from 'lucide-react';

export default function MetricsDashboard({ stats, history = [], onDecompress, onVerify, loadingRecords }) {
  const [egressVol, setEgressVol] = useState(1000); // Default 1000 GB / 1TB monthly

  // Formatting helper for bytes
  const formatBytes = (bytes) => {
    if (bytes === undefined || bytes === null || isNaN(bytes) || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Cost Savings Calculation
  // Standard cloud cost constants:
  // AWS S3 Standard storage: $0.023 per GB/month
  // AWS Egress to Internet: $0.09 per GB
  const avgRatio = stats?.avgRatio || 1.0;
  const storageSavedGb = (stats?.totalSavedBytes || 0) / (1024 * 1024 * 1024);

  const rawMonthlyCost = egressVol * 0.09 + (egressVol * 0.023); // Egress + Storage
  const compressedMonthlyCost = rawMonthlyCost * avgRatio;
  const monthlySavings = rawMonthlyCost - compressedMonthlyCost;
  const annualSavings = monthlySavings * 12;

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glow-card p-5 rounded-2xl border border-white/5 bg-[#111827] flex items-center gap-4 shadow-md">
          <div className="p-3 bg-[#082f49] text-cyan-400 rounded-xl border border-cyan-500/20">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Reclaimed Space</span>
            <h4 className="text-xl font-bold text-slate-200 mt-0.5">{formatBytes(stats?.totalSavedBytes || 0)}</h4>
          </div>
        </div>

        <div className="glow-card p-5 rounded-2xl border border-white/5 bg-[#111827] flex items-center gap-4 shadow-md">
          <div className="p-3 bg-[#3b0764] text-purple-400 rounded-xl border border-purple-500/20">
            <RefreshCw className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Average Compression Ratio</span>
            <h4 className="text-xl font-bold text-slate-200 mt-0.5">{(avgRatio * 100).toFixed(1)}%</h4>
          </div>
        </div>

        <div className="glow-card p-5 rounded-2xl border border-white/5 bg-[#111827] flex items-center gap-4 shadow-md">
          <div className="p-3 bg-[#451a03] text-amber-400 rounded-xl border border-amber-500/20">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Mean Compression Speed</span>
            <h4 className="text-xl font-bold text-slate-200 mt-0.5">{(stats?.avgSpeedMbs || 0).toFixed(1)} MB/s</h4>
          </div>
        </div>

        <div className="glow-card p-5 rounded-2xl border border-white/5 bg-[#111827] flex items-center gap-4 shadow-md">
          <div className="p-3 bg-[#022c22] text-emerald-400 rounded-xl border border-emerald-500/20">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Estimated Annual Savings</span>
            <h4 className="text-xl font-bold text-slate-200 mt-0.5">${annualSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h4>
          </div>
        </div>
      </div>

      {/* Main section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: History list */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glow-card p-6 rounded-2xl border border-white/5 bg-[#111827] shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm uppercase tracking-wider text-slate-300">File Compression History</h3>
              <span className="text-[10px] bg-slate-950 px-2.5 py-1 rounded-full border border-slate-800 text-slate-400 font-mono">
                {(history || []).length} operations logged
              </span>
            </div>

            {loadingRecords ? (
              <div className="py-12 flex justify-center items-center">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (history || []).length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs font-mono">
                No files compressed yet. Go to Dashboard to start!
              </div>
            ) : (
              <div className="overflow-x-auto pr-1">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold">
                      <th className="py-2.5">Original File</th>
                      <th className="py-2.5">Codec</th>
                      <th className="py-2.5">Sizes</th>
                      <th className="py-2.5">Ratio</th>
                      <th className="py-2.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history && history.filter(Boolean).map((record, idx) => {
                      return (
                        <tr key={record?._id || idx} className="border-b border-slate-900/60 hover:bg-[#0a0d16] transition-colors">
                          <td className="py-3 font-medium text-slate-300 max-w-[150px] truncate" title={record?.originalName || 'Unknown file'}>
                            {record?.originalName || 'Unknown file'}
                          </td>
                          <td className="py-3 font-mono">
                            <span className={`px-1.5 py-0.5 rounded border text-[10px] uppercase font-semibold ${
                              record?.codec === 'zstd' ? 'bg-[#083344] border-cyan-800/40 text-cyan-300' :
                              record?.codec === 'brotli' ? 'bg-[#451a03] border-amber-800/40 text-amber-300' :
                              record?.codec === 'huffman' ? 'bg-[#3b0764] border-purple-800/40 text-purple-300' :
                              record?.codec === 'store' ? 'bg-slate-850 border-slate-700 text-slate-400' :
                              'bg-[#991b1b] border-rose-800/40 text-rose-300'
                            }`}>
                              {record?.codec || 'unknown'}
                            </span>
                          </td>
                          <td className="py-3 font-mono text-slate-400">
                            <span>{formatBytes(record?.origBytes)}</span>
                            <span className="block text-[10px] text-slate-500">→ {formatBytes(record?.outBytes)}</span>
                          </td>
                          <td className="py-3 font-mono text-slate-300">
                            {((record?.ratio || 0) * 100).toFixed(0)}%
                          </td>
                          <td className="py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => record?._id && onVerify(record._id)}
                                className={`p-1 px-2 border rounded font-semibold text-[10px] flex items-center gap-1 transition-all ${
                                  record?.verified
                                    ? 'bg-[#022c22] border-emerald-800/40 text-emerald-400'
                                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
                                  }`}
                              >
                                <CheckCircle className="w-3 h-3" />
                                {record?.verified ? 'Verified' : 'Verify'}
                              </button>
                              
                              <button
                                onClick={() => record?._id && onDecompress(record._id)}
                                className="p-1 px-2 bg-[#3b0764] hover:bg-[#581c87] border border-[#7e22ce] rounded text-[10px] font-semibold text-purple-300 hover:text-white transition-all"
                              >
                                Restore
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Cloud Savings Simulator */}
        <div className="lg:col-span-1">
          <div className="glow-card p-6 rounded-2xl border border-white/5 bg-[#111827] shadow-md h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="text-emerald-400 w-5 h-5" />
                <h3 className="font-bold text-sm uppercase tracking-wider text-slate-300">SaaS Cloud Cost Estimator</h3>
              </div>
              <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                Calculate infrastructure savings by deploying DynaCompress AI strategies globally across your AWS / GCP environments.
              </p>

              {/* Form Input */}
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">
                    Estimated Monthly Egress Transfer
                  </label>
                  <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-2.5">
                    <input
                      type="number"
                      value={egressVol}
                      onChange={(e) => setEgressVol(Math.max(1, parseInt(e.target.value) || 0))}
                      className="bg-transparent border-none focus:outline-none flex-1 text-sm font-mono text-slate-300 text-right"
                    />
                    <span className="text-xs font-semibold text-slate-500 ml-2 font-mono">GB</span>
                  </div>
                </div>

                <div className="border-t border-slate-800/80 pt-4 space-y-2.5 font-mono text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>AWS Egress Cost ($0.09/GB):</span>
                    <span>${(egressVol * 0.09).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>S3 Storage Cost ($0.023/GB):</span>
                    <span>${(egressVol * 0.023).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-300 border-b border-slate-850 pb-2">
                    <span>Total Monthly Bill:</span>
                    <span>${rawMonthlyCost.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-emerald-400 font-semibold pt-1">
                    <span>With DynaCompress AI:</span>
                    <span>${compressedMonthlyCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400 font-bold">
                    <span>Monthly Storage Savings:</span>
                    <span>${monthlySavings.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Savings Badge */}
            <div className="mt-6 bg-[#0d221c] border border-emerald-800/30 p-4 rounded-xl flex flex-col items-center justify-center">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Estimated Annual Net Savings</span>
              <h3 className="text-3xl font-extrabold text-emerald-300 mt-1">${annualSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
              <span className="text-[9px] text-slate-500 font-mono mt-1">*Based on AWS tier standards</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
