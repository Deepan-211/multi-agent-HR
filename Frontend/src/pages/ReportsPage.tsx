import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { FileBarChart, Download, Calendar } from 'lucide-react';

const reports = [
  { id: 'Q2-2026', name: 'Q2 2026 Comprehensive Pay Equity Audit', date: 'Jul 1, 2026', status: 'Finalized' },
  { id: 'Q1-2026', name: 'Q1 2026 Engineering Cohort Review', date: 'Apr 5, 2026', status: 'Finalized' },
  { id: 'Q4-2025', name: 'Annual 2025 Board Report', date: 'Jan 10, 2026', status: 'Finalized' },
];

export default function ReportsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Historical Audits & Reports</h2>
          <p className="text-gray-400">Access past equity adjustments and compliance documentation.</p>
        </div>
        <Button variant="secondary">
          Generate Custom Report
        </Button>
      </div>

      <Card className="border-white/5 p-0 overflow-hidden">
        <div className="divide-y divide-white/10">
          {reports.map(report => (
            <div key={report.id} className="p-6 hover:bg-white/5 transition-colors flex items-center justify-between">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-charcoal-900 rounded-lg border border-white/5">
                  <FileBarChart className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-white">{report.name}</h3>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {report.date}
                    </span>
                    <span className="text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                      {report.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button variant="ghost" size="sm">View Summary</Button>
                <Button variant="glass" size="sm" className="bg-charcoal-700">
                  <Download className="w-4 h-4 mr-2" />
                  PDF Export
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
