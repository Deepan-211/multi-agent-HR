import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ShieldAlert, Building2, Loader2 } from 'lucide-react';
import { api, setToken } from '../lib/api';

export default function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.login('analyst@acme-corp.demo', 'Analyst@123!');
      setToken(res.access_token);
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to login. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-charcoal-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-900/10 blur-[100px] rounded-full pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-10 h-10 text-emerald-500" />
            <span className="text-2xl font-bold tracking-tight text-white">PayParity</span>
          </div>
        </div>

        <Card className="p-8 border-white/10 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-2">Secure Enterprise Access</h2>
          <p className="text-sm text-gray-400 mb-8">Sign in with your organizational SSO to access the audit platform.</p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="p-4 border border-white/10 rounded-xl bg-white/5 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded bg-emerald-500/20 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Acme Corp Global</p>
                    <p className="text-xs text-gray-400">acme-global.payparity.ai</p>
                  </div>
                </div>
                <div className="w-4 h-4 rounded-full border-2 border-emerald-500 flex items-center justify-center">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                </div>
              </div>

              <div className="p-4 border border-white/10 rounded-xl bg-white/5 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-colors opacity-50">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded bg-gray-500/20 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Acme Corp EMEA</p>
                    <p className="text-xs text-gray-400">acme-emea.payparity.ai</p>
                  </div>
                </div>
                <div className="w-4 h-4 rounded-full border-2 border-gray-500" />
              </div>
            </div>

            <Button type="submit" variant="primary" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Continue with SSO'}
            </Button>
            {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
          </form>

          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <p className="text-xs text-gray-500 flex items-center justify-center">
              <ShieldAlert className="w-3 h-3 mr-1" />
              End-to-end encrypted • Zero-knowledge proofs active
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
