"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, Mail, Lock, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.login(email, password);
      
      // 1. Saves your login token
      localStorage.setItem("token", data.access_token); 
      
      // 👉 2. THE NEW LINE: Saves your name so the header can see it
      localStorage.setItem("userName", (data as any).name); // NOTE: Change data.name if your backend uses data.full_name
      
      // 3. Sends you to the dashboard
      router.push("/dashboard"); 
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary bg-grid-pattern flex flex-col justify-center items-center px-4 relative">
      {/* Background decoration */}
      <div className="absolute w-[300px] h-[300px] rounded-full bg-accent-violet/10 blur-[100px] top-1/4 left-1/4 pointer-events-none" />
      <div className="absolute w-[300px] h-[300px] rounded-full bg-accent-cyan/10 blur-[100px] bottom-1/4 right-1/4 pointer-events-none" />

      {/* Back button */}
      <Link 
        href="/" 
        className="absolute top-8 left-8 text-slate-400 hover:text-white flex items-center gap-2 text-sm font-medium transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Brand logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-accent-violet to-accent-cyan flex items-center justify-center glow-violet mb-4">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h2 className="font-heading font-black text-2xl text-white">Welcome <span className="italic text-accent-violet">Back</span></h2>
          <p className="text-slate-400 text-sm mt-1">Sign in to your localization workspace</p>
        </div>

        {/* Auth Card */}
        <div className="glass-panel rounded-2xl p-8 border border-border-custom shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-accent-violet to-accent-cyan" />
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-bg-primary/60 border border-border-custom focus:border-accent-violet focus:ring-1 focus:ring-accent-violet text-sm text-white placeholder-slate-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Password
                </label>
                <a href="#" className="text-xs text-accent-cyan hover:underline">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-bg-primary/60 border border-border-custom focus:border-accent-violet focus:ring-1 focus:ring-accent-violet text-sm text-white placeholder-slate-500 outline-none transition-all"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-400 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white relative overflow-hidden bg-accent-violet hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 glow-violet disabled:opacity-50"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-accent-violet to-accent-violet-light" />
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Sign In"
                )}
              </span>
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="absolute inset-x-0 h-px bg-border-custom" />
            <span className="relative z-10 bg-bg-secondary px-4 text-xs font-medium text-slate-400">
              Or continue with
            </span>
          </div>

          {/* Social login */}
          <button
            onClick={() => {
              setIsLoading(true);
              setTimeout(() => {
                setIsLoading(false);
                router.push("/dashboard");
              }, 1000);
            }}
            className="w-full py-3 rounded-xl border border-border-custom hover:border-slate-500 hover:bg-white/5 transition-all text-slate-300 hover:text-white text-sm font-semibold flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg> Google
          </button>

          {/* Switch page link */}
          <div className="mt-8 text-center text-sm text-slate-400">
            Don't have an account?{" "}
            <Link href="/register" className="text-accent-cyan hover:underline font-semibold">
              Register here
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
