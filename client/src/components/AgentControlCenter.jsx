import React, { useEffect, useRef } from 'react';
import { Terminal, Shield, Cpu, Activity, Database, AlertCircle } from 'lucide-react';

export default function AgentControlCenter({ logs = [], progress, isSimulating }) {
  const terminalRef = useRef(null);

  // Auto-scroll terminal logs directly using scrollTop to avoid GPU compositing crashes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const getAgentColor = (agent) => {
    switch (agent) {
      case 'Strategy Agent':
        return { text: 'text-cyan-400', border: 'border-cyan-500/20', bg: 'bg-[#082f49]', icon: Database };
      case 'Optimization Agent':
        return { text: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-[#451a03]', icon: Cpu };
      case 'Compression Agent':
        return { text: 'text-purple-400', border: 'border-purple-500/20', bg: 'bg-[#3b0764]', icon: Activity };
      case 'Security Agent':
        return { text: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-[#022c22]', icon: Shield };
      case 'Telemetry Agent':
        return { text: 'text-pink-400', border: 'border-pink-500/20', bg: 'bg-[#500724]', icon: Terminal };
      default:
        return { text: 'text-slate-400', border: 'border-slate-500/20', bg: 'bg-[#1e293b]', icon: AlertCircle };
    }
  };

  return (
    <div className="glow-card p-6 rounded-2xl border border-white/5 bg-[#111827] shadow-xl flex flex-col h-[480px]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Terminal className="text-purple-400 w-5 h-5 animate-pulse" />
          <h3 className="font-bold text-sm uppercase tracking-wider text-slate-300">
            Autonomous Multi-Agent Command Console
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isSimulating ? 'bg-emerald-500 animate-ping' : 'bg-slate-600'}`}></span>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
            {isSimulating ? 'Active Simulation' : 'Idle'}
          </span>
        </div>
      </div>

      {/* Terminal Output */}
      <div ref={terminalRef} className="flex-1 bg-slate-950 border border-slate-900 rounded-xl p-4 font-mono text-xs overflow-y-auto space-y-2.5 shadow-inner select-text">
        {(logs || []).length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
            <Terminal className="w-8 h-8 opacity-20" />
            <p className="text-center">Await task dispatch.<br />Agent collaboration telemetry will pipe here.</p>
          </div>
        ) : (
          (logs || []).filter(Boolean).map((log, idx) => {
            const colors = getAgentColor(log?.agent);
            const Icon = colors?.icon || AlertCircle;
            
            let time = '';
            try {
              time = log?.timestamp 
                ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
                : '--:--:--';
            } catch (e) {
              time = '--:--:--';
            }
            
            return (
              <div key={idx} className="flex gap-2 items-start animate-fade-in border-b border-slate-900/30 pb-2">
                <span className="text-slate-600 font-semibold">{time}</span>
                <span className={`p-0.5 px-2 rounded border text-[10px] uppercase font-bold flex items-center gap-1 shrink-0 ${colors?.text || 'text-slate-450'} ${colors?.bg || 'bg-slate-950'} ${colors?.border || 'border-slate-800'}`}>
                  <Icon className="w-3 h-3" />
                  {(log?.agent || 'Agent').split(' ')[0]}
                </span>
                <span className="text-slate-300 text-left flex-1 break-all leading-relaxed">
                  {log?.message || ''}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Progress Bar */}
      {isSimulating && (
        <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
          <div className="flex justify-between text-xs font-semibold text-slate-400 font-mono">
            <span>Stream Compression Piping</span>
            <span className="text-purple-400">{progress}%</span>
          </div>
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
            <div
              style={{ width: `${progress}%` }}
              className="bg-gradient-to-r from-purple-500 via-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-300"
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}
