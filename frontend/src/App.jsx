import React, { useState } from 'react';
import { Play, Plus, Trash2, Cpu, Clock, Activity, Server, ArrowRight } from 'lucide-react';
import './index.css';

const MOCK_API = async (payload) => {
  console.log("Mocking backend with payload:", payload);
  await new Promise(r => setTimeout(r, 800));
  
  let processes = [...payload.processes].map(p => ({...p, remainingBurst: p.burst}));
  processes.sort((a,b) => a.arrival - b.arrival);
  
  let gantt = [];
  let currentTime = 0;
  
  for (let p of processes) {
    if (currentTime < p.arrival) {
      gantt.push({ process: "Idle", start: currentTime, end: p.arrival });
      currentTime = p.arrival;
    }
    gantt.push({ process: p.id, start: currentTime, end: currentTime + p.burst });
    currentTime += p.burst;
    p.completion = currentTime;
    p.turnaround = p.completion - p.arrival;
    p.waiting = p.turnaround - p.burst;
  }
  
  let totalTurnaround = processes.reduce((acc, p) => acc + p.turnaround, 0);
  let totalWaiting = processes.reduce((acc, p) => acc + p.waiting, 0);
  let idleTime = gantt.filter(g => g.process === "Idle").reduce((acc, g) => acc + (g.end - g.start), 0);
  
  return {
    results: processes,
    gantt: gantt,
    averages: {
      turnaround: totalTurnaround / processes.length || 0,
      waiting: totalWaiting / processes.length || 0,
      cpuUtilization: currentTime > 0 ? ((currentTime - idleTime) / currentTime) * 100 : 0
    }
  };
};

function App() {
  const [processes, setProcesses] = useState([
    { id: 'P1', arrival: 0, burst: 5 },
    { id: 'P2', arrival: 1, burst: 3 },
    { id: 'P3', arrival: 2, burst: 1 },
    { id: 'P4', arrival: 3, burst: 2 },
  ]);
  const [algorithm, setAlgorithm] = useState('FCFS');
  const [timeQuantum, setTimeQuantum] = useState(2);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const addProcess = () => {
    const newId = `P${processes.length + 1}`;
    setProcesses([...processes, { id: newId, arrival: 0, burst: 1 }]);
  };

  const removeProcess = (index) => {
    const newProcs = [...processes];
    newProcs.splice(index, 1);
    const cleaned = newProcs.map((p, i) => ({ ...p, id: `P${i + 1}` }));
    setProcesses(cleaned);
  };

  const updateProcess = (index, field, value) => {
    const newProcs = [...processes];
    newProcs[index][field] = Math.max(0, parseInt(value) || 0);
    setProcesses(newProcs);
  };

  const runSimulation = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    const payload = {
      algorithm,
      timeQuantum: algorithm === 'Round Robin' ? timeQuantum : undefined,
      processes
    };

    try {
      const response = await fetch('http://localhost:8080/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error("Backend server error");
      }
      
      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.warn("Backend not reachable. Falling back to Mock API.", err);
      try {
        const mockData = await MOCK_API(payload);
        setResult(mockData);
        setError("Note: C++ backend is offline. Showing FCFS mock data. Please start the C++ server.");
      } catch (mockErr) {
        setError("Simulation failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const colors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 
    'bg-pink-500', 'bg-cyan-500', 'bg-rose-500', 'bg-indigo-500'
  ];
  
  const getProcessColor = (pid) => {
    if (pid === 'Idle') return 'bg-slate-200 repeating-linear-gradient-45';
    const num = parseInt(pid.replace('P', ''));
    return colors[(num - 1) % colors.length];
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8 font-sans selection:bg-blue-100">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex items-center justify-between pb-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Cpu className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                CPU Scheduler Pro
              </h1>
              <p className="text-sm text-slate-500">Interactive OS Practical Dashboard</p>
            </div>
          </div>
          <div className="flex gap-2">
            {algorithm === 'Round Robin' && (
              <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                <span className="px-3 py-2 text-sm text-slate-500 border-r border-slate-200 bg-slate-50">Quantum</span>
                <input 
                  type="number" 
                  min="1"
                  value={timeQuantum}
                  onChange={(e) => setTimeQuantum(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 bg-transparent p-2 text-center text-sm outline-none"
                />
              </div>
            )}
            <select 
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none shadow-sm font-medium"
            >
              <option value="FCFS">First Come First Serve (FCFS)</option>
              <option value="SJF">Shortest Job First (SJF)</option>
              <option value="SRTN">Shortest Remaining Time Next (SRTN)</option>
              <option value="Round Robin">Round Robin (RR)</option>
            </select>
            <button 
              onClick={runSimulation}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 shadow-[0_4px_14px_0_rgba(37,99,235,0.39)]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Play className="w-5 h-5" />
              )}
              Simulate
            </button>
          </div>
        </header>

        {error && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-xl text-sm flex items-start gap-3 shadow-sm">
            <Activity className="w-5 h-5 shrink-0 text-amber-500" />
            <p>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Inputs */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-800">
                <Server className="w-5 h-5 text-slate-400" /> Processes
              </h2>
              <button 
                onClick={addProcess}
                className="text-xs flex items-center gap-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-md transition-colors shadow-sm font-medium"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            
            <div className="space-y-3">
              {processes.map((p, i) => (
                <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-4 transition-all hover:border-slate-300 shadow-sm group relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${colors[i % colors.length]}`}></div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-slate-800 ml-2">{p.id}</span>
                    <button 
                      onClick={() => removeProcess(i)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 ml-2">
                    <div>
                      <label className="text-xs text-slate-500 font-medium block mb-1">Arrival Time</label>
                      <input 
                        type="number" 
                        min="0"
                        value={p.arrival}
                        onChange={(e) => updateProcess(i, 'arrival', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-md p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 font-medium block mb-1">Burst Time</label>
                      <input 
                        type="number" 
                        min="1"
                        value={p.burst}
                        onChange={(e) => updateProcess(i, 'burst', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-md p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Results Area */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Visual Gantt Chart */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 text-slate-800">
                <Clock className="w-5 h-5 text-slate-400" /> Gantt Chart
              </h2>
              
              {!result ? (
                <div className="h-32 border border-dashed border-slate-300 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500 text-sm font-medium">
                  Run simulation to see visualization
                </div>
              ) : (
                <div className="pt-2 pb-8">
                  {/* The bar container with overflow hidden */}
                  <div className="flex h-16 rounded-xl overflow-hidden shadow-inner border border-slate-200 mb-2 relative z-10">
                    {result.gantt.map((block, i) => {
                      const totalTime = result.gantt[result.gantt.length - 1].end;
                      const widthPct = ((block.end - block.start) / totalTime) * 100;
                      return (
                        <div 
                          key={i} 
                          className={`h-full flex items-center justify-center gantt-item border-r border-black/10 ${getProcessColor(block.process)}`}
                          style={{ width: `${widthPct}%`, animationDelay: `${i * 0.05}s` }}
                          title={`${block.process}: ${block.start} to ${block.end}`}
                        >
                          {widthPct > 5 && (
                            <span className="font-bold text-white text-sm drop-shadow-md">
                              {block.process}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* The time labels container without overflow hidden */}
                  <div className="relative h-6 w-full text-xs text-slate-500 font-mono font-medium">
                    {result.gantt.map((block, i) => {
                      const totalTime = result.gantt[result.gantt.length - 1].end;
                      const rightPct = 100 - ((block.end / totalTime) * 100);
                      const leftPct = (block.start / totalTime) * 100;
                      return (
                        <React.Fragment key={i}>
                          {i === 0 && (
                            <div className="absolute top-0 -translate-x-1/2" style={{ left: `${leftPct}%` }}>
                              {block.start}
                            </div>
                          )}
                          <div className="absolute top-0 translate-x-1/2" style={{ right: `${rightPct}%` }}>
                            {block.end}
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard title="Avg Turnaround" value={result ? `${result.averages.turnaround.toFixed(2)} ms` : '-'} icon={<ArrowRight className="w-4 h-4 text-emerald-500"/>} />
              <MetricCard title="Avg Waiting" value={result ? `${result.averages.waiting.toFixed(2)} ms` : '-'} icon={<Clock className="w-4 h-4 text-amber-500"/>} />
              <MetricCard title="CPU Utilization" value={result ? `${result.averages.cpuUtilization.toFixed(1)}%` : '-'} icon={<Cpu className="w-4 h-4 text-blue-500"/>} />
            </div>

            {/* Results Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Process</th>
                      <th className="px-6 py-4 font-semibold">AT</th>
                      <th className="px-6 py-4 font-semibold">BT</th>
                      <th className="px-6 py-4 font-semibold">CT</th>
                      <th className="px-6 py-4 font-semibold">TAT</th>
                      <th className="px-6 py-4 font-semibold">WT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result ? result.results.map((p, i) => (
                      <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800 flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${colors[parseInt(p.id.replace('P', '')) - 1 % colors.length]}`}></span>
                          {p.id}
                        </td>
                        <td className="px-6 py-4 text-slate-500">{p.arrival}</td>
                        <td className="px-6 py-4 text-slate-500">{p.burst}</td>
                        <td className="px-6 py-4 font-mono font-medium text-slate-700">{p.completion}</td>
                        <td className="px-6 py-4 font-mono font-medium text-emerald-600">{p.turnaround}</td>
                        <td className="px-6 py-4 font-mono font-medium text-amber-600">{p.waiting}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-medium">
                          Waiting for simulation results...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .repeating-linear-gradient-45 {
          background-image: repeating-linear-gradient(45deg, rgba(0,0,0,0.05) 0, rgba(0,0,0,0.05) 10px, transparent 10px, transparent 20px);
        }
      `}} />
    </div>
  );
}

function MetricCard({ title, value, icon }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between h-24 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center gap-2 text-slate-500 text-xs uppercase font-bold tracking-wider">
        {icon}
        {title}
      </div>
      <div className="text-2xl font-black text-slate-800 font-mono">
        {value}
      </div>
    </div>
  );
}

export default App;
