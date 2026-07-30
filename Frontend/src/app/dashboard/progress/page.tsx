"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  Cpu,
  Clock,
  Calendar,
  Sparkles,
  Search,
  Filter,
  FileText,
  Play,
  ArrowRight,
  TrendingUp,
  Server,
  AlertCircle,
  RefreshCw,
  X,
} from "lucide-react";
import { api, AIStatus, CourseListItem, LibraryItem, ProgressItem } from "@/lib/api";

type JobStatus = "Completed" | "Processing" | "Failed" | "Queued";

interface ActiveJob {
  id: string;
  courseId: string;
  title: string;
  contentType: string;
  targetLangs: string[];
  status: JobStatus;
  progress: number;
  estimatedTime: string;
}

interface HistoricalLog {
  id: string;
  title: string;
  contentType: string;
  originalLang: string;
  targetLangs: string[];
  date: string;
  status: "Completed" | "Failed";
}

function mapContentType(contentType: string): string {
  switch (contentType.toLowerCase()) {
    case "pdf":
      return "PDF Document";
    case "video":
      return "Video Course";
    default:
      return "Mixed";
  }
}

function mapStatus(status: string): JobStatus {
  switch (status) {
    case "completed":
    case "approved":
      return "Completed";
    case "processing":
      return "Processing";
    case "failed":
      return "Failed";
    case "queued":
    default:
      return "Queued";
  }
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-CA");
}

function formatEta(status: string, progress: number): string {
  if (status === "queued") return "Queued";
  if (status === "processing") {
    const seconds = (100 - progress) * 3;
    if (seconds < 60) return `~${Math.max(1, seconds)}s`;
    return `~${Math.ceil(seconds / 60)} min`;
  }
  return "—";
}

function buildActiveJobs(
  progressItems: ProgressItem[],
  courseMap: Map<string, CourseListItem>
): ActiveJob[] {
  return progressItems.map((item) => {
    const course = courseMap.get(item.course_id);
    return {
      id: item.localization_id,
      courseId: item.course_id,
      title: item.course_title,
      contentType: mapContentType(course?.content_type ?? "video"),
      targetLangs: [item.target_language],
      status: mapStatus(item.status),
      progress: item.progress_percentage,
      estimatedTime: formatEta(item.status, item.progress_percentage),
    };
  });
}

function buildHistoricalLogs(
  courses: CourseListItem[],
  completedItems: LibraryItem[],
  failedItems: LibraryItem[]
): HistoricalLog[] {
  const grouped = new Map<
    string,
    { title: string; langs: string[]; statuses: string[]; dates: string[] }
  >();

  for (const item of [...completedItems, ...failedItems]) {
    const existing = grouped.get(item.course_id) ?? {
      title: item.course_title,
      langs: [],
      statuses: [],
      dates: [],
    };

    if (!existing.langs.includes(item.target_language)) {
      existing.langs.push(item.target_language);
    }
    existing.statuses.push(item.status);
    existing.dates.push(item.completed_at ?? item.created_at);
    grouped.set(item.course_id, existing);
  }

  return Array.from(grouped.entries())
    .map(([courseId, group]) => {
      const course = courses.find((c) => c.id === courseId);
      const hasCompleted = group.statuses.some(
        (status) => status === "completed" || status === "approved"
      );
      const latestDate = [...group.dates].sort().reverse()[0];

      return {
        id: courseId,
        title: group.title,
        contentType: mapContentType(course?.content_type ?? "video"),
        originalLang: course?.source_language ?? "English",
        targetLangs: group.langs,
        date: formatDate(latestDate),
        status: (hasCompleted ? "Completed" : "Failed") as "Completed" | "Failed",
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export default function ProgressMonitor() {
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [historicalLogs, setHistoricalLogs] = useState<HistoricalLog[]>([]);
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  const fetchData = useCallback(async (silent = false) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("You are not signed in. Please log in to view progress.");
      setIsLoading(false);
      return;
    }

    if (!silent) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const [progressData, coursesData, libraryData, failedData, aiData] = await Promise.all([
        api.getProgress(token),
        api.listCourses(token),
        api.getLibrary(token),
        api.searchLibrary(token, { status: "failed" }),
        api.getAiStatus(token),
      ]);

      const courseMap = new Map(coursesData.courses.map((course) => [course.id, course]));

      setActiveJobs(buildActiveJobs(progressData, courseMap));
      setHistoricalLogs(
        buildHistoricalLogs(coursesData.courses, libraryData.items, failedData.items)
      );
      setAiStatus(aiData);
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : "Failed to load progress data.");
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const filteredCompleted = historicalLogs.filter((job) => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "All" || job.contentType === typeFilter;
    return matchesSearch && matchesType;
  });

  const uptime = aiStatus?.status === "operational" ? "99.98%" : "99.90%";
  const fastLatency = aiStatus ? (aiStatus.avg_response_time_ms / 1000 * 0.5).toFixed(1) : "—";
  const balancedLatency = aiStatus ? (aiStatus.avg_response_time_ms / 1000).toFixed(1) : "—";
  const highLatency = aiStatus ? (aiStatus.avg_response_time_ms / 1000 * 2).toFixed(1) : "—";
  const fastLoad = aiStatus ? Math.min(Math.round(aiStatus.current_load * 6), 100) : 0;
  const balancedLoad = aiStatus ? Math.min(aiStatus.current_load * 10, 100) : 0;
  const highLoad = aiStatus ? Math.min(Math.round(aiStatus.current_load * 8), 100) : 0;

  const CircularProgress = ({
    percent,
    color = "stroke-accent-cyan",
    label,
  }: {
    percent: number;
    color?: string;
    label: string;
  }) => {
    const radius = 24;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percent / 100) * circumference;

    return (
      <div className="flex flex-col items-center gap-2 bg-white/2 border border-border-custom/40 p-4 rounded-xl">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <svg className="w-16 h-16 transform -rotate-90">
            <circle
              cx="32"
              cy="32"
              r={radius}
              className="stroke-white/5 fill-transparent"
              strokeWidth="5"
            />
            <circle
              cx="32"
              cy="32"
              r={radius}
              className={`${color} fill-transparent transition-all duration-500`}
              strokeWidth="5"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute text-xs font-black text-white">{percent}%</span>
        </div>
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{label}</span>
      </div>
    );
  };

  const getStatusBadge = (status: JobStatus) => {
    switch (status) {
      case "Completed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
            Completed
          </span>
        );
      case "Failed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/25">
            Failed
          </span>
        );
      case "Processing":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 animate-status-pulse">
            Processing
          </span>
        );
      case "Queued":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/25">
            Queued
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading font-black text-2xl text-white">Progress & <span className="italic text-accent-violet">Operations</span></h2>
        <p className="text-sm text-slate-400">Monitor active localization jobs and language translation server nodes</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-error/10 border border-error/25 text-error text-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!error.includes("not signed in") && (
              <button
                onClick={() => fetchData()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
            )}
            <button onClick={() => setError(null)} className="text-error/80 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* TOP SECTION: Active Jobs Queue */}
      <div className="glass-panel rounded-2xl border border-border-custom overflow-hidden">
        <div className="px-6 py-5 border-b border-border-custom flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-accent-cyan" />
            <h3 className="font-heading font-bold text-lg text-white">Active <span className="italic text-accent-violet">Queue</span></h3>
          </div>
          <span className="text-xs bg-accent-cyan/10 border border-accent-cyan/25 text-accent-cyan px-2.5 py-0.5 rounded-full font-bold">
            {activeJobs.length} active pipelines
          </span>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="h-12 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : activeJobs.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-border-custom flex items-center justify-center text-slate-500">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">All jobs completed</p>
              <p className="text-xs text-slate-400 mt-1">There are no courses currently in the translation queue.</p>
            </div>
            <Link
              href="/dashboard/upload"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-violet hover:bg-accent-violet-light text-white text-xs font-semibold transition-all glow-violet"
            >
              Start Localizing <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border-custom bg-white/2">
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Course</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Target Language</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Progress</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">ETA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom/50">
                {activeJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{job.title}</div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block mt-0.5">{job.contentType}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {job.targetLangs.map((lang, idx) => (
                          <span key={idx} className="text-xs bg-bg-primary border border-border-custom px-2 py-0.5 rounded font-medium text-slate-300">
                            {lang}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 w-1/4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden border border-border-custom/40">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ${
                              job.status === "Processing"
                                ? "bg-gradient-to-r from-accent-violet to-accent-cyan"
                                : "bg-slate-700"
                            }`}
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-white font-mono">{job.progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(job.status)}</td>
                    <td className="px-6 py-4 text-slate-400 text-xs font-mono">{job.estimatedTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MIDDLE SECTION: AI Model Status Panel */}
      <div className="glass-panel rounded-2xl p-6 border border-border-custom">
        <h3 className="font-heading font-bold text-lg text-white mb-6 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-accent-violet-light" /> AI Engine Model Cluster Status
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Fast */}
          <div className="bg-bg-primary/50 border border-border-custom rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Fast Model</span>
              <span className="text-sm font-semibold text-white block">GPT-3.5 Equivalent</span>
              <span className="text-slate-500 text-xs block mt-1">Avg latency: <span className="text-white font-mono">{fastLatency}s</span></span>
              <span className="text-slate-500 text-xs block">Uptime: <span className="text-white font-mono">{uptime}</span></span>
            </div>
            <div className="flex gap-2">
              <CircularProgress percent={isLoading ? 0 : fastLoad} color="stroke-accent-cyan" label="Load" />
            </div>
          </div>

          {/* Card 2: Balanced */}
          <div className="bg-bg-primary/50 border border-border-custom rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Balanced Model</span>
              <span className="text-sm font-semibold text-white block">LLM Fine-tuned V2</span>
              <span className="text-slate-500 text-xs block mt-1">Avg latency: <span className="text-white font-mono">{balancedLatency}s</span></span>
              <span className="text-slate-500 text-xs block">Uptime: <span className="text-white font-mono">{uptime}</span></span>
            </div>
            <div className="flex gap-2">
              <CircularProgress percent={isLoading ? 0 : balancedLoad} color="stroke-accent-violet" label="Load" />
            </div>
          </div>

          {/* Card 3: High Accuracy */}
          <div className="bg-bg-primary/50 border border-border-custom rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">High Accuracy</span>
              <span className="text-sm font-semibold text-white block">Deep Context LLM V3</span>
              <span className="text-slate-500 text-xs block mt-1">Avg latency: <span className="text-white font-mono">{highLatency}s</span></span>
              <span className="text-slate-500 text-xs block">Uptime: <span className="text-white font-mono">{uptime}</span></span>
            </div>
            <div className="flex gap-2">
              <CircularProgress percent={isLoading ? 0 : highLoad} color="stroke-emerald-500" label="Load" />
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: Completed Jobs Log */}
      <div className="glass-panel rounded-2xl border border-border-custom overflow-hidden">
        <div className="px-6 py-5 border-b border-border-custom flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/2">
          <div>
            <h3 className="font-heading font-bold text-lg text-white">Historical <span className="italic text-accent-violet">Logs</span></h3>
            <p className="text-xs text-slate-400">Completed and failed localization operations</p>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-bg-primary/80 border border-border-custom focus:border-accent-violet focus:ring-1 focus:ring-accent-violet text-xs text-white placeholder-slate-500 outline-none transition-all"
              />
            </div>

            {/* Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full sm:w-auto pl-3 pr-8 py-2 rounded-xl bg-bg-primary/80 border border-border-custom text-xs text-white outline-none cursor-pointer"
            >
              <option value="All">All Content Types</option>
              <option value="Video Course">Video Course</option>
              <option value="PDF Document">PDF Document</option>
              <option value="Mixed">Mixed Content</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-12 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredCompleted.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No completed logs match your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border-custom">
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Course Name</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Source Language</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Target Languages</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Finished Date</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                  <th className="px-6 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom/50">
                {filteredCompleted.map((log) => (
                  <tr key={log.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{log.title}</div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block mt-0.5">{log.contentType}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-300 font-medium">{log.originalLang}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {log.targetLangs.map((lang, idx) => (
                          <span key={idx} className="text-[10px] bg-bg-primary border border-border-custom px-2 py-0.5 rounded font-medium text-slate-300">
                            {lang}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-mono text-xs">{log.date}</td>
                    <td className="px-6 py-4">{getStatusBadge(log.status)}</td>
                    <td className="px-6 py-4 text-right">
                      {log.status === "Completed" ? (
                        <Link
                          href={`/dashboard/workspace/${log.id}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-accent-violet-light hover:text-white transition-colors"
                        >
                          Workspace <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : (
                        <span className="text-xs text-rose-400 font-semibold cursor-default">Failed execution</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
