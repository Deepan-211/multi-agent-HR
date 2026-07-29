import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Shield, BrainCircuit, Scale, ArrowRight, ShieldCheck, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-charcoal-900 text-offwhite overflow-hidden selection:bg-emerald-500/30">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto relative z-10">
        <div className="flex items-center space-x-2">
          <Shield className="w-8 h-8 text-emerald-500" />
          <span className="text-xl font-bold tracking-tight">Project PayParity</span>
        </div>
        <div className="flex items-center space-x-4">
          <Link to="/auth" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
            Login
          </Link>
          <Link to="/auth">
            <Button variant="primary" className="rounded-full px-6">
              Request Demo
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative max-w-7xl mx-auto px-8 pt-20 pb-32">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-900/20 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-8"
          >
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-sm font-medium text-emerald-400">Autonomous Enterprise Swarm Online</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-6xl md:text-7xl font-bold tracking-tight mb-8 leading-tight"
          >
            Equal pay for equal work is not a slogan.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-amber-400">
              It’s a fundamental human right.
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            The autonomous multi-agent HR audit platform. We process anonymized performance reviews and salary matrices to detect bias, using specialist agents and differential privacy to propose equitable compensation frameworks.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6"
          >
            <Link to="/auth">
              <Button size="lg" className="w-full sm:w-auto rounded-full group">
                Start Bias Audit
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <div className="flex items-center"><ShieldCheck className="w-4 h-4 mr-1 text-teal-500"/> Differential Privacy</div>
              <div className="flex items-center"><CheckCircle className="w-4 h-4 mr-1 text-emerald-500"/> HITL Guardrails</div>
            </div>
          </motion.div>
        </div>

        {/* Badges / Tech Mentions */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="mt-32 pt-12 border-t border-white/5 flex justify-center space-x-12 opacity-60 grayscale hover:grayscale-0 transition-all duration-500"
        >
          <div className="flex items-center space-x-2">
            <Scale className="w-6 h-6 text-amber-500" />
            <span className="font-semibold tracking-wide">SDG 5: Gender Equality</span>
          </div>
          <div className="flex items-center space-x-2">
            <BrainCircuit className="w-6 h-6 text-lavender-400" />
            <span className="font-semibold tracking-wide">SDG 8: Decent Work</span>
          </div>
          <div className="text-sm font-medium flex flex-col justify-center border-l border-white/20 pl-12">
            <span className="text-gray-400 uppercase tracking-widest text-xs">Powered By</span>
            <span className="text-gray-200">Counterfactual Engines & AutoGen</span>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
