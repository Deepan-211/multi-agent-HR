import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Brain, FileText, Calculator, SplitSquareHorizontal, Scale, CheckCircle2, Loader2 } from 'lucide-react';
import { api, setActiveAuditId } from '../lib/api';

const agents = [
  { id: 'TextAnalysisAgent', name: 'Review Text Parser', icon: FileText, color: 'text-amber-500', bg: 'bg-amber-500' },
  { id: 'CompensationAgent', name: 'Compensation Analytics', icon: Calculator, color: 'text-emerald-500', bg: 'bg-emerald-500' },
  { id: 'CounterfactualAgent', name: 'Counterfactual Audit', icon: SplitSquareHorizontal, color: 'text-lavender-400', bg: 'bg-lavender-400' },
  { id: 'EquityFrameworkAgent', name: 'Equity Framework', icon: Scale, color: 'text-teal-500', bg: 'bg-teal-500' },
];

export default function SwarmPage() {
  const navigate = useNavigate();
  const [activeAgents, setActiveAgents] = useState<string[]>([]);
  const [logs, setLogs] = useState<{agent: string, msg: string}[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [loadingText, setLoadingText] = useState("Initializing Swarm Protocol...");

  useEffect(() => {
    let isMounted = true;

    const runMockSwarm = async () => {
      try {
        // 1. Start the audit
        const { audit_id } = await api.startHackathonAudit();
        if (!isMounted) return;
        setActiveAuditId(audit_id);
        
        // Setup initial UI state
        setActiveAgents(['TextAnalysisAgent']);
        setLogs(p => [...p, { agent: 'System', msg: 'Audit initialized. Delegating tasks...' }]);

        // 2. Poll for status (which has a fake delay)
        setLoadingText("Agents are thinking...");
        const statusRes = await api.getHackathonStatus(audit_id);
        if (!isMounted) return;

        // Process status response
        setLoadingText(statusRes.progress);
        
        const newLogs: {agent: string, msg: string}[] = [];
        const activeIds: string[] = [];
        
        statusRes.agents.forEach((agent: any) => {
           if (agent.status === 'thinking') {
               activeIds.push(agent.name);
           }
           newLogs.push({ agent: agent.name, msg: agent.reasoning });
        });
        
        setLogs(p => [...p, ...newLogs]);
        setActiveAgents(activeIds);

        // Fake completion delay for the presentation
        setTimeout(() => {
          if (!isMounted) return;
          setActiveAgents([]);
          setLogs(p => [...p, { agent: 'System', msg: 'Audit complete. Results compiled.' }]);
          setIsComplete(true);
        }, 2000);

      } catch (err) {
        console.error("Failed to run mock swarm", err);
      }
    };

    runMockSwarm();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-8 flex flex-col h-full">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Active Swarm Execution</h2>
          <p className="text-gray-400">{isComplete ? "Execution complete." : loadingText}</p>
        </div>
        {isComplete && (
          <Button variant="primary" onClick={() => navigate('/audit/results')}>
            View Findings
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-0">
        <Card className="border-white/5 relative flex items-center justify-center p-12">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/5 to-transparent pointer-events-none" />
          
          <div className="relative w-full aspect-square max-w-md">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-charcoal-800 rounded-full border border-white/10 flex items-center justify-center z-10 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
              {isComplete ? <CheckCircle2 className="w-8 h-8 text-emerald-500" /> : <Brain className="w-8 h-8 text-white/50 animate-pulse" />}
            </div>

            {agents.map((agent, index) => {
              const angle = (index * (360 / agents.length)) * (Math.PI / 180);
              const radius = 120;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              const isActive = activeAgents.includes(agent.id);

              return (
                <motion.div
                  key={agent.id}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                  animate={{ x, y }}
                  transition={{ duration: 1, type: 'spring' }}
                >
                  <div className={`relative group flex flex-col items-center justify-center`}>
                    <motion.div
                      animate={isActive ? { scale: [1, 1.2, 1], boxShadow: ["0 0 0 rgba(0,0,0,0)", `0 0 20px var(--tw-colors-${agent.bg.split('-')[1]}-500)`] } : { scale: 1 }}
                      transition={isActive ? { repeat: Infinity, duration: 2 } : {}}
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-colors ${isActive ? 'bg-charcoal-700 border-white/20' : 'bg-charcoal-800 border-white/5'}`}
                    >
                      <agent.icon className={`w-6 h-6 ${isActive ? agent.color : 'text-gray-500'}`} />
                      
                      {isActive && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${agent.bg} opacity-75`}></span>
                          <span className={`relative inline-flex rounded-full h-3 w-3 ${agent.bg}`}></span>
                        </span>
                      )}
                    </motion.div>
                    <div className="absolute top-16 text-center w-32">
                      <p className={`text-xs font-medium ${isActive ? 'text-white' : 'text-gray-500'}`}>{agent.name}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            
            <svg className="absolute inset-0 w-full h-full -z-10 pointer-events-none">
               <g className="origin-center translate-x-1/2 translate-y-1/2">
                {agents.map((agent, index) => {
                  const angle = (index * (360 / agents.length)) * (Math.PI / 180);
                  const isActive = activeAgents.includes(agent.id);
                  return (
                    <line 
                      key={agent.id}
                      x1="0" y1="0" 
                      x2={Math.cos(angle) * 120} y2={Math.sin(angle) * 120} 
                      stroke="currentColor" 
                      strokeWidth={isActive ? 2 : 1}
                      className={`transition-colors duration-500 ${isActive ? agent.color : 'text-white/5'}`}
                    />
                  )
                })}
               </g>
            </svg>
          </div>
        </Card>

        <Card className="border-white/5 flex flex-col h-full max-h-[600px]">
          <h3 className="text-lg font-medium text-white mb-4">Reasoning Trace</h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 font-mono text-sm">
            <AnimatePresence>
              {logs.map((log, i) => {
                const agentObj = agents.find(a => a.id === log.agent || a.name === log.agent);
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-charcoal-800 p-3 rounded border border-white/5"
                  >
                    <span className="text-gray-500 mr-2">[{new Date().toLocaleTimeString()}]</span>
                    <span className={`${agentObj?.color || 'text-white'} font-semibold`}>
                      {agentObj?.name || log.agent}:
                    </span>
                    <span className="text-gray-300 ml-2">{log.msg}</span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {!isComplete && (
               <div className="flex justify-center py-4">
                 <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
               </div>
            )}
            {isComplete && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center space-x-2 text-emerald-500 mt-4 p-3 bg-emerald-500/10 rounded border border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5" />
                <span>All tasks successfully completed.</span>
              </motion.div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
