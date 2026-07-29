import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { UploadCloud, ShieldCheck, Info } from 'lucide-react';

export default function NewAuditPage() {
  const navigate = useNavigate();
  const [epsilon, setEpsilon] = useState(0.1);

  const handleStart = () => {
    navigate('/audit/swarm');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">New Bias Audit</h2>
        <p className="text-gray-400">Configure data sources and privacy parameters for the swarm.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-white/5 space-y-6">
          <div>
            <h3 className="text-lg font-medium text-white mb-1">Data Sources</h3>
            <p className="text-sm text-gray-400 mb-4">Connect or upload anonymized HR datasets.</p>
          </div>

          <div className="space-y-3">
            {[
              { name: 'Performance Reviews (Q1-Q2 2026)', size: '2.4 GB', status: 'Connected' },
              { name: 'Promotion History (Trailing 3Y)', size: '1.1 GB', status: 'Connected' },
              { name: 'Current Salary Matrix', size: '450 MB', status: 'Connected' }
            ].map(file => (
              <div key={file.name} className="p-3 bg-white/5 border border-white/10 rounded-lg flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-200">{file.name}</p>
                  <p className="text-xs text-gray-500">{file.size}</p>
                </div>
                <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">{file.status}</span>
              </div>
            ))}
          </div>

          <button className="w-full py-4 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-colors">
            <UploadCloud className="w-6 h-6 mb-2" />
            <span className="text-sm font-medium">Upload Additional Dataset</span>
          </button>
        </Card>

        <div className="space-y-6">
          <Card className="border-white/5">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-1">Differential Privacy (ε)</h3>
                <p className="text-sm text-gray-400">Set the privacy budget for query noise.</p>
              </div>
              <ShieldCheck className="w-6 h-6 text-teal-500" />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Strict Privacy</span>
                <span className="text-white font-mono">ε = {epsilon}</span>
                <span className="text-gray-400">High Utility</span>
              </div>
              <input 
                type="range" 
                min="0.01" 
                max="1.0" 
                step="0.01"
                value={epsilon}
                onChange={(e) => setEpsilon(parseFloat(e.target.value))}
                className="w-full accent-teal-500"
              />
              <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-lg flex items-start space-x-2">
                <Info className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-teal-100/70 leading-relaxed">
                  An epsilon of {epsilon} ensures that individual employee records cannot be reverse-engineered from the audit results, protecting against membership inference attacks.
                </p>
              </div>
            </div>
          </Card>

          <Card className="border-emerald-500/20 bg-emerald-900/10">
            <h3 className="text-lg font-medium text-white mb-2">Ready for Swarm Analysis</h3>
            <p className="text-sm text-gray-400 mb-6">4 specialist agents will be deployed to analyze 14,200 records using Counterfactual Inference.</p>
            <Button variant="primary" className="w-full" onClick={handleStart}>
              Initialize Agent Swarm
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
