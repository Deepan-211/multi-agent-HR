import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../components/ui/Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, TrendingDown, ShieldCheck, Activity, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { api } from '../lib/api';

const trendData = [
  { month: 'Jan', gap: 14.2 },
  { month: 'Feb', gap: 13.8 },
  { month: 'Mar', gap: 12.5 },
  { month: 'Apr', gap: 11.2 },
  { month: 'May', gap: 9.8 },
  { month: 'Jun', gap: 7.4 },
];

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    api.getDashboardMetrics()
      .then(res => {
        setDashboardData(res);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const stats = [
    { name: 'Active Audits', value: dashboardData?.active_audits?.toString() || '0', change: 'Live', icon: Activity, color: 'text-emerald-500' },
    { name: 'Bias Flags Detected', value: dashboardData?.total_bias_flags?.toString() || '0', change: 'Total', icon: AlertTriangle, color: 'text-amber-500' },
    { name: 'ε Budget Consumed', value: (dashboardData?.avg_epsilon_consumed || 0).toFixed(2), change: `out of ${dashboardData?.org_epsilon_budget || 10}`, icon: ShieldCheck, color: 'text-teal-500' },
    { name: 'HITL Pending', value: dashboardData?.hitl_pending_count?.toString() || '0', change: 'Needs Review', icon: TrendingDown, color: 'text-lavender-400' },
  ];
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Live Observability</h2>
          <p className="text-gray-400">Monitoring enterprise equity metrics in real-time.</p>
        </div>
        <div className="flex space-x-3">
          <Link to="/hitl">
            <Button variant="secondary">View Pending HITL Reviews</Button>
          </Link>
          <Link to="/audit/new">
            <Button variant="primary">Run New Audit</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-4 flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : stats.map((stat, i) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="flex flex-col border-white/5">
              <div className="flex items-center space-x-3 mb-4">
                <div className={`p-2 rounded-lg bg-white/5 ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-medium text-gray-400">{stat.name}</h3>
              </div>
              <div className="flex items-baseline space-x-3">
                <span className="text-3xl font-bold text-white">{stat.value}</span>
                <span className={`text-sm font-medium ${stat.change.startsWith('+') ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {stat.change}
                </span>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-white/5">
          <div className="mb-6 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">Pay Gap Reduction Trend</h3>
            <span className="text-xs text-gray-400 border border-white/10 px-2 py-1 rounded">Adjusted for Level & Tenure</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="month" stroke="#737373" />
                <YAxis stroke="#737373" unit="%" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #262626', borderRadius: '8px' }}
                  itemStyle={{ color: '#059669' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="gap" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  dot={{ fill: '#10B981', r: 4 }}
                  activeDot={{ r: 6, fill: '#059669' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="border-white/5 flex flex-col">
          <h3 className="text-lg font-semibold text-white mb-6">Live Agent Activity</h3>
          <div className="flex-1 space-y-4 overflow-y-auto">
            {/* Mock feed */}
            {[
              { agent: 'Review Parser', action: 'Detected narrative bias in Q2 appraisals', time: 'Just now', color: 'bg-amber-500' },
              { agent: 'Comp Analytics', action: 'Recalculating Eng L4 trajectory', time: '2m ago', color: 'bg-emerald-500' },
              { agent: 'Counterfactual', action: 'Running gender swap sensitivity', time: '5m ago', color: 'bg-lavender-400' },
              { agent: 'Equity Framework', action: 'Generated 3 budget scenarios', time: '12m ago', color: 'bg-teal-500' },
            ].map((feed, i) => (
              <div key={i} className="flex items-start space-x-3">
                <div className="mt-1 flex-shrink-0">
                  <div className={`w-2 h-2 rounded-full ${feed.color} animate-pulse`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-200">{feed.agent}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{feed.action}</p>
                  <p className="text-xs text-gray-600 mt-1">{feed.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
