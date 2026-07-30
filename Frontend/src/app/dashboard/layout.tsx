"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { 
  Sparkles, 
  LayoutDashboard, 
  UploadCloud, 
  FolderOpen, 
  Activity, 
  Settings, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  Menu
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { userProfile, isSidebarOpen, setSidebarOpen } = useApp();

  const navItems = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Upload Course", href: "/dashboard/upload", icon: UploadCloud },
    { name: "Course Library", href: "/dashboard/library", icon: FolderOpen },
    { name: "Progress Monitor", href: "/dashboard/progress", icon: Activity },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex min-h-screen bg-bg-primary text-text-main overflow-hidden">
      {/* Collapsible Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 bg-bg-secondary border-r border-border-custom flex flex-col transition-all duration-300 ${
          isSidebarOpen ? "w-[240px]" : "w-[68px]"
        } md:static`}
      >
        {/* Brand Header */}
        <div className="h-16 border-b border-border-custom px-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 overflow-hidden select-none">
            <div className="min-w-8 min-h-8 rounded-lg bg-accent-violet flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            {isSidebarOpen && (
              <span className="font-heading font-bold text-base text-text-main truncate">
                LocalizeAI
              </span>
            )}
          </Link>
          
          {isSidebarOpen && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors hidden md:block"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? "bg-accent-violet/15 text-white border-l-2 border-accent-violet glow-violet/5"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <item.icon className={`w-5 h-5 transition-transform group-hover:scale-105 ${
                  isActive ? "text-accent-violet-light" : "text-slate-400 group-hover:text-slate-200"
                }`} />
                {isSidebarOpen && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer / User Collapse Control */}
        <div className="p-3 border-t border-border-custom flex flex-col gap-2">
          {!isSidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors hidden md:flex"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          <Link
            href="/login"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-all"
          >
            <LogOut className="w-5 h-5 text-rose-400/80" />
            {isSidebarOpen && <span>Logout</span>}
          </Link>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Header */}
        <header className="h-16 border-b border-border-custom px-6 flex items-center justify-between sticky top-0 bg-bg-primary/80 backdrop-blur-md z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:block">
              <h1 className="font-heading font-bold text-lg text-white">
                Welcome back, {userProfile.name}
              </h1>
              <p className="text-xs text-slate-500">{currentDate}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <span className="text-xs font-semibold text-white block">{userProfile.name}</span>
              <span className="text-[10px] text-accent-cyan uppercase font-bold">{userProfile.role}</span>
            </div>
            
            <div className="w-10 h-10 rounded-full bg-accent-violet flex items-center justify-center font-heading font-black text-sm text-white select-none border border-border-custom">
              {userProfile.avatar}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
