import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';
import { AlertCircle, Scale, FileText, Loader2 } from 'lucide-react';
import { api, getActiveAuditId } from '../lib/api';

export default function ResultsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const auditId = getActiveAuditId() || 'dummy-id';
        const results = await api.getHackathonResults(auditId);
        if (isMounted) {
          setData(results);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Bias Detection Findings</h2>
          <p className="text-gray-400">Synthesis of structural pay gaps and narrative biases.</p>
        </div>
        <Link to="/equity">
          <Button variant="primary">Proceed to Equity Adjustments</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Statistical Analysis */}
        <Card className="lg:col-span-2 border-white/5 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h3 className="text-lg font-medium text-white flex items-center">
              <Scale className="w-5 h-5 mr-2 text-amber-500" />
              Counterfactual Gap Analysis
            </h3>
            <span className="text-sm px-2 py-1 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20">
              Severity: High
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-charcoal-900 rounded-lg border border-white/5">
              <p className="text-sm text-gray-400 mb-1">Unadjusted Gap (Raw)</p>
              <p className="text-2xl font-bold text-white">{data?.unadjusted_gap || "N/A"}</p>
            </div>
            <div className="p-4 bg-charcoal-900 rounded-lg border border-amber-500/30">
              <p className="text-sm text-amber-400 mb-1">Adjusted Gap (Causal Model)</p>
              <p className="text-2xl font-bold text-amber-500">{data?.adjusted_gap || "N/A"}</p>
              <p className="text-xs text-amber-500/70 mt-1">Unexplained by tenure, level, or location</p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-white mb-3">Counterfactual Sensitivity Result</h4>
            <p className="text-sm text-gray-400 leading-relaxed bg-white/5 p-4 rounded-lg">
              When holding all performance metrics, tenure, and role constraints equal, swapping the demographic variable from "Female" to "Male" in the simulation resulted in a <strong className="text-white">{data?.counterfactual || "higher promotion likelihood"}</strong> within a 24-month window.
            </p>
          </div>
        </Card>

        {/* Narrative Bias Highlighting */}
        <Card className="border-white/5 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h3 className="text-lg font-medium text-white flex items-center">
              <FileText className="w-5 h-5 mr-2 text-lavender-400" />
              Narrative Bias
            </h3>
          </div>

          <div className="space-y-4">
            <div className="p-3 bg-charcoal-900 rounded border border-white/5 text-sm leading-relaxed">
              <p className="text-gray-300">
                "Sarah is <span className="bg-coral-500/20 text-coral-400 px-1 rounded cursor-help" title="Agent Flag: 'Abrasive' is disproportionately used in female reviews. Male counterpart term often used: 'Assertive'.">abrasive</span> when defending her technical decisions. While she delivers, she needs to be more <span className="bg-amber-500/20 text-amber-400 px-1 rounded cursor-help" title="Agent Flag: 'Accommodating' sets a different behavioral standard based on gender.">accommodating</span> to team dynamics."
              </p>
              <p className="text-xs text-gray-500 mt-2">— Excerpt from Q2 Eng Review</p>
            </div>

            <div className="p-3 bg-charcoal-900 rounded border border-white/5 text-sm leading-relaxed">
              <p className="text-gray-300">
                "Marcus is <span className="bg-emerald-500/20 text-emerald-400 px-1 rounded cursor-help" title="Agent Flag: Positive framing of identical behavioral trait found in Sarah's review.">highly assertive</span> and fiercely defends his architecture. A strong leader."
              </p>
              <p className="text-xs text-gray-500 mt-2">— Excerpt from Q2 Eng Review</p>
            </div>
          </div>

          <div className="flex items-start space-x-2 p-3 bg-amber-500/10 rounded-lg text-sm text-amber-400/90 border border-amber-500/20">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>{data?.biased_phrases_count || 0} instances of differential semantic framing detected across the Eng cohort.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
