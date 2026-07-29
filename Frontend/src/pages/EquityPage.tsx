import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Scale, Send, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { api, getActiveAuditId } from '../lib/api';

const chartData = [
  { name: 'L3 Eng', current: 92, proposed: 98 },
  { name: 'L4 Eng', current: 110, proposed: 118 },
  { name: 'L5 Eng', current: 145, proposed: 152 },
  { name: 'L6 Eng', current: 180, proposed: 185 },
];

export default function EquityPage() {
  const navigate = useNavigate();
  const [budget, setBudget] = useState(2.5);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const auditId = getActiveAuditId() || 'dummy-id';
        const equity = await api.getHackathonEquity(auditId);
        if (isMounted) {
          setData(equity);
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, []);

  const handleSendToHITL = () => {
    navigate('/hitl');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Equity Framework Generation</h2>
        <p className="text-gray-400">Budget-constrained objective pay adjustment recommendations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-white/5 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-white flex items-center">
              <Scale className="w-5 h-5 mr-2 text-teal-500" />
              Impact Simulation & Recommendations
            </h3>
            <span className="text-sm bg-white/5 border border-white/10 px-3 py-1 rounded text-gray-300">
              Target Gap: &lt; 2.0%
            </span>
          </div>

          <div className="h-[250px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="name" stroke="#737373" />
                <YAxis stroke="#737373" />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #262626', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="current" fill="#262626" name="Current Median (k)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="proposed" fill="#14B8A6" name="Proposed Median (k)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-6 pt-6 border-t border-white/10">
             <h4 className="text-md font-medium text-white mb-4">Agent Recommendations</h4>
             <ul className="space-y-3">
               {data?.recommendations?.map((rec: any, idx: number) => (
                 <li key={idx} className="p-3 bg-white/5 rounded border border-white/10">
                   <strong className="text-teal-400 block mb-1">{rec.type}</strong>
                   <span className="text-gray-300 text-sm">{rec.description}</span>
                 </li>
               ))}
             </ul>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="border-white/5 space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-1">Budget Constraint</h3>
              <p className="text-sm text-gray-400">Adjust max budget to see framework impact.</p>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-4">
                <span className="text-white font-mono font-medium">${budget}M</span>
                <span className="text-gray-400">Max: $5.0M</span>
              </div>
              <input 
                type="range" 
                min="0.5" 
                max="5.0" 
                step="0.1"
                value={budget}
                onChange={(e) => setBudget(parseFloat(e.target.value))}
                className="w-full accent-teal-500"
              />
            </div>

            <div className="space-y-3 pt-4 border-t border-white/10">
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Projected Gap</span>
                <span className="text-sm font-medium text-teal-400">1.8%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Employees Affected</span>
                <span className="text-sm font-medium text-white">342</span>
              </div>
            </div>
          </Card>

          <Card className="bg-emerald-900/10 border-emerald-500/20">
            <div className="flex flex-col h-full justify-between">
              <div>
                <h3 className="text-lg font-medium text-emerald-400 mb-2">HITL Review Gate</h3>
                <p className="text-sm text-emerald-100/70 mb-6">
                  Adjustments must be approved by the Executive Compensation Committee before finalization.
                </p>
              </div>
              <Button variant="primary" className="w-full" onClick={handleSendToHITL}>
                <Send className="w-4 h-4 mr-2" />
                Send to Exec Committee
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
