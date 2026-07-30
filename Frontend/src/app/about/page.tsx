"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Sparkles, 
  FileVideo, 
  Globe, 
  Activity, 
  Columns, 
  CheckCircle, 
  ArrowRight,
  UploadCloud,
  Check
} from "lucide-react";

export default function AboutPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" as const } },
  };

  const features = [
    {
      title: "AI-Powered Translation",
      description: "Harness LLMs tailored for technical vocabularies to retain code syntax, formulas, and context accurately.",
      icon: Sparkles,
      color: "text-accent-violet",
    },
    {
      title: "Multi-Format Support",
      description: "Directly parse MP4 lecture videos, generate synchronized SRT transcripts, and ingest dense PDF manuals.",
      icon: FileVideo,
      color: "text-accent-cyan",
    },
    {
      title: "30+ Languages Supported",
      description: "Expand your reach from Spanish, French, and Japanese to regional dialects including Tamil, Hindi, and Arabic.",
      icon: Globe,
      color: "text-emerald-400",
    },
    {
      title: "Real-Time Progress Tracking",
      description: "Monitor processing nodes, GPU loads, and dynamic estimated times with absolute transparency.",
      icon: Activity,
      color: "text-amber-400",
    },
    {
      title: "Side-by-Side Workspace",
      description: "Directly edit translations alongside original video transcripts with full sentence-by-sentence highlights.",
      icon: Columns,
      color: "text-accent-violet-light",
    },
    {
      title: "One-Click Publishing",
      description: "Instantly compile completed course documents and videos, export PDF scripts, and update your LMS.",
      icon: CheckCircle,
      color: "text-rose-400",
    },
  ];

  return (
    <div className="min-h-screen bg-bg-primary bg-grid-pattern relative flex flex-col justify-between overflow-x-hidden">
      {/* Background patterns are handled via globals.css now */}

      {/* Sticky Header */}
      <header className="sticky top-0 z-50 w-full glass-panel border-b border-border-custom px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-accent-violet to-accent-cyan flex items-center justify-center glow-violet">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-heading font-bold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-accent-cyan bg-clip-text text-transparent">
            LocalizeAI
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a href="#features" className="hover:text-accent-cyan transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-accent-cyan transition-colors">How It Works</a>
          <Link href="/dashboard" className="hover:text-accent-cyan transition-colors">Dashboard</Link>
          <a href="#pricing" className="hover:text-accent-cyan transition-colors">Pricing</a>
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white px-4 py-2 transition-colors">
            Login
          </Link>
          <Link href="/register" className="relative group px-5 py-2 rounded-xl text-sm font-semibold text-white overflow-hidden bg-accent-violet transition-all duration-300 hover:scale-105 active:scale-95 glow-violet">
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-accent-violet to-accent-violet-light group-hover:opacity-90" />
            <span className="relative z-10">Register</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center">
        <section className="relative px-6 py-20 md:py-32 w-full max-w-7xl mx-auto flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent-violet/30 bg-accent-violet/5 text-accent-violet-light text-xs font-semibold uppercase tracking-wider mb-8"
          >
            <Sparkles className="w-3.5 h-3.5" /> Next-Generation AI Engine
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="font-heading font-black text-4xl sm:text-5xl md:text-7xl tracking-tight text-white max-w-5xl leading-[1.1] mb-6"
          >
            Localize Your Courses.{" "}
            <span className="italic text-accent-violet">
              Reach
            </span> Every Learner.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-slate-400 text-lg md:text-xl max-w-3xl leading-relaxed mb-10"
          >
            Translate, transcribe, and adapt your skill courses' videos, documents, and interactive transcripts into 30+ languages automatically. Powered by custom models optimized for technical education.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full"
          >
            <Link href="/dashboard" className="w-full sm:w-auto relative group px-8 py-4 rounded-xl text-base font-semibold text-white overflow-hidden bg-accent-violet transition-all duration-300 hover:scale-105 active:scale-95 glow-violet">
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-accent-violet via-accent-violet-light to-accent-cyan" />
              <span className="relative z-10 flex items-center justify-center gap-2">
                Get Started Free <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
            <Link href="/dashboard" className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-semibold text-slate-300 border border-border-custom hover:border-slate-500 hover:text-white transition-all bg-white/5 backdrop-blur-sm hover:scale-105 active:scale-95">
              View Demo
            </Link>
          </motion.div>

          {/* Premium Preview Glass Container */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="mt-16 w-full max-w-5xl rounded-2xl glass-panel p-2 shadow-2xl relative overflow-hidden border border-border-custom"
          >
            <div className="rounded-xl overflow-hidden bg-bg-primary/80 border border-border-custom/50 aspect-[16/9] flex flex-col">
              {/* Fake Window Controls */}
              <div className="bg-bg-secondary px-4 py-3 border-b border-border-custom flex items-center justify-between">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="text-xs text-slate-400 bg-bg-primary/95 px-4 py-1.5 rounded-lg border border-border-custom w-1/3 text-center truncate select-none">
                  app.localizeai.com/dashboard/workspace/course-1
                </div>
                <div className="w-10" />
              </div>
              {/* Preview Body */}
              <div className="flex-1 p-6 flex flex-col md:flex-row gap-6 text-left text-sm font-sans select-none pointer-events-none">
                {/* Left Panel */}
                <div className="flex-1 flex flex-col gap-4 border-r border-border-custom/40 pr-6">
                  <div className="text-xs uppercase font-bold text-accent-cyan flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse" /> Source (English)
                  </div>
                  <div className="p-3.5 rounded-lg bg-white/5 border border-border-custom/40">
                    <span className="text-xs text-accent-violet-light font-bold block mb-1">BLOCK 01</span>
                    Welcome back! Today we are diving into Deep Neural Networks and backpropagation algorithms.
                  </div>
                  <div className="p-3.5 rounded-lg bg-white/5 border border-border-custom/40">
                    <span className="text-xs text-accent-violet-light font-bold block mb-1">BLOCK 02</span>
                    The loss function measures how well our model performs relative to the ground truth targets.
                  </div>
                </div>
                {/* Right Panel */}
                <div className="flex-1 flex flex-col gap-4">
                  <div className="text-xs uppercase font-bold text-accent-violet flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-accent-violet" /> Localization (Spanish)
                  </div>
                  <div className="p-3.5 rounded-lg bg-accent-violet/5 border border-accent-violet/30">
                    <span className="text-xs text-accent-violet-light font-bold block mb-1">BLOCK 01</span>
                    ¡Bienvenidos de nuevo! Hoy nos sumergiremos en las Redes Neuronales Profundas y los algoritmos de retropropagación.
                  </div>
                  <div className="p-3.5 rounded-lg bg-white/5 border border-border-custom/40">
                    <span className="text-xs text-accent-violet-light font-bold block mb-1">BLOCK 02</span>
                    La función de pérdida mide qué tan bien se desempeña nuestro modelo en relación con los objetivos.
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Feature Grid */}
        <section id="features" className="w-full py-24 bg-bg-secondary/40 border-t border-border-custom">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="font-heading font-black text-3xl md:text-5xl text-white mb-4">
                Localization Infrastructure <span className="italic text-accent-violet">Crafted</span> for Success
              </h2>
              <p className="text-slate-400 text-base md:text-lg">
                Supercharge course completion rates worldwide by offering accurate native-language learning materials.
              </p>
            </div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {features.map((feat, idx) => (
                <motion.div
                  key={idx}
                  variants={itemVariants}
                  className="rounded-2xl glass-panel p-8 glass-panel-hover flex flex-col gap-5 relative group"
                >
                  <div className={`w-12 h-12 rounded-xl bg-white/5 border border-border-custom flex items-center justify-center ${feat.color} group-hover:glow-violet transition-all duration-300`}>
                    <feat.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-heading font-bold text-xl text-white group-hover:text-accent-cyan transition-colors">
                    {feat.title}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {feat.description}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* How it Works */}
        <section id="how-it-works" className="w-full py-24 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="font-heading font-black text-3xl md:text-5xl text-white mb-4">
                How LocalizeAI <span className="italic text-accent-violet">Works</span>
              </h2>
              <p className="text-slate-400 text-base md:text-lg">
                Translate, verify, and publish complex skill course assets seamlessly.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
              {/* Connection Lines (Desktop only) */}
              <div className="hidden md:block absolute top-1/4 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-accent-violet via-accent-cyan to-accent-violet-light z-0 opacity-20" />

              {/* Step 1 */}
              <div className="flex flex-col items-center text-center relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-violet to-purple-600 flex items-center justify-center font-heading font-black text-2xl text-white glow-violet mb-6">
                  1
                </div>
                <h3 className="font-heading font-bold text-xl text-white mb-3 flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-accent-violet-light" /> Upload Content
                </h3>
                <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
                  Drag and drop lecture video files (MP4) or PDF documentation. Specify source language.
                </p>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-cyan to-teal-500 flex items-center justify-center font-heading font-black text-2xl text-white glow-cyan mb-6">
                  2
                </div>
                <h3 className="font-heading font-bold text-xl text-white mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent-cyan" /> Localize Using AI
                </h3>
                <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
                  Our customized translator creates target transcripts and documents in minutes. Review confidence scores block-by-block.
                </p>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-accent-violet flex items-center justify-center font-heading font-black text-2xl text-white glow-violet mb-6">
                  3
                </div>
                <h3 className="font-heading font-bold text-xl text-white mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" /> Verify & Publish
                </h3>
                <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
                  Manually tweak blocks in our split-view editor. Export transcripts or video tracks with a single click.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing CTA Section */}
        <section id="pricing" className="w-full py-20 bg-bg-secondary/20 border-t border-border-custom">
          <div className="max-w-4xl mx-auto text-center px-6">
            <h2 className="font-heading font-black text-3xl md:text-5xl text-white mb-6">
              Transparent, Performance-Driven <span className="italic text-accent-violet">Pricing</span>
            </h2>
            <p className="text-slate-400 text-lg mb-10 max-w-2xl mx-auto">
              Join leading educators and training academies delivering skills training globally, without barriers.
            </p>
            <div className="inline-flex flex-col sm:flex-row gap-4 items-center justify-center glass-panel p-6 rounded-2xl border border-border-custom max-w-lg mx-auto">
              <div className="text-left">
                <span className="text-xs text-accent-cyan font-bold uppercase tracking-wider block">PROMO LAUNCH</span>
                <span className="text-2xl font-black text-white">$0 <span className="text-sm text-slate-400 font-normal">/ 3 courses free</span></span>
              </div>
              <div className="h-px sm:h-8 w-full sm:w-px bg-border-custom" />
              <Link href="/dashboard" className="w-full sm:w-auto px-6 py-3 rounded-xl bg-accent-violet hover:bg-accent-violet-light text-white font-semibold text-sm transition-all glow-violet hover:scale-105">
                Claim Free Account
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border-custom py-8 px-6 bg-bg-primary text-slate-500 text-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-accent-violet to-accent-cyan flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-heading font-bold text-white text-sm">LocalizeAI</span>
          </div>
          <div>
            &copy; {new Date().getFullYear()} LocalizeAI, Inc. All rights reserved.
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-slate-300 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}