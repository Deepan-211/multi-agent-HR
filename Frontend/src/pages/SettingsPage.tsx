import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ShieldAlert, Database, BookOpen, Lock } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Settings & Governance</h2>
        <p className="text-gray-400">Configure global privacy, compliance limits, and agent behavior.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="border-white/5 space-y-4">
          <div className="flex items-center space-x-3 pb-4 border-b border-white/10">
            <Lock className="w-6 h-6 text-teal-500" />
            <h3 className="text-lg font-medium text-white">Global Privacy Constraints</h3>
          </div>
          <div className="space-y-4 pt-2">
            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
              <div>
                <p className="text-sm font-medium text-white">Default Epsilon (ε) Budget</p>
                <p className="text-xs text-gray-400">Maximum privacy budget per audit cycle.</p>
              </div>
              <span className="text-teal-400 font-mono bg-teal-500/10 px-2 py-1 rounded">0.10</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
              <div>
                <p className="text-sm font-medium text-white">Data Retention</p>
                <p className="text-xs text-gray-400">Time to keep anonymized traces.</p>
              </div>
              <span className="text-white bg-charcoal-900 border border-white/10 px-3 py-1 rounded">30 Days</span>
            </div>
          </div>
        </Card>

        <Card className="border-white/5 space-y-4">
          <div className="flex items-center space-x-3 pb-4 border-b border-white/10">
            <Database className="w-6 h-6 text-lavender-400" />
            <h3 className="text-lg font-medium text-white">Job Architecture Vector Store</h3>
          </div>
          <p className="text-sm text-gray-400">
            The agents use this vector database to understand your internal leveling guides, role expectations, and performance rubrics.
          </p>
          <div className="p-4 bg-charcoal-900 border border-white/10 rounded-lg flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-white">Acme_Global_Architecture_2026.pdf</p>
              <p className="text-xs text-gray-500 mt-1">Synced 2 days ago • 12,402 embeddings</p>
            </div>
            <Button variant="secondary" size="sm">Update Store</Button>
          </div>
        </Card>

        <Card className="border-white/5 space-y-4">
          <div className="flex items-center space-x-3 pb-4 border-b border-white/10">
            <BookOpen className="w-6 h-6 text-emerald-500" />
            <h3 className="text-lg font-medium text-white">Compliance & Labor Law Overrides</h3>
          </div>
          <p className="text-sm text-gray-400">
            Reference database used by the Equity Framework Agent to ensure all recommendations comply with local labor laws.
          </p>
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm text-gray-300">
              <ShieldAlert className="w-4 h-4 text-emerald-500" />
              <span>EU Pay Transparency Directive (Active)</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-300">
              <ShieldAlert className="w-4 h-4 text-emerald-500" />
              <span>US Equal Pay Act (Active)</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
