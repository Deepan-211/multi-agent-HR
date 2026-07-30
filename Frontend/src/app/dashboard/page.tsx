"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileText,
  Globe2,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Upload,
  Settings as SettingsIcon,
  Library,
  ChevronRight,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  api,
  DashboardStats,
  RecentCourse,
  AIStatus,
  HealthStatus,
} from "@/lib/api";

type CourseStatus = "Completed" | "Processing" | "Failed" | "Queued";

interface ChartPoint {
  day: string;
  translations: number;
}

interface RecentCourseRow extends RecentCourse {
  targetLangs: string[];
  displayStatus: CourseStatus;
  displayContentType: string;
  displayDate: string;
}

function mapBackendStatus(status: string): CourseStatus {
  switch (status) {
    case "completed":
    case "approved":
      return "Completed";
    case "processing":
      return "Processing";
    case "failed":
      return "Failed";
    case "queued":
    case "not_started":
    default:
      return "Queued";
  }
}

function mapContentType(contentType: string): string {
  switch (contentType.toLowerCase()) {
    case "pdf":
      return "PDF Document";
    case "video":
      return "Video Course";
    default:
      return contentType;
  }
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-CA");
}

function formatChartDay(isoDate: string): string {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
  });
}

function calculateWeekChange(activity: { count: number }[]): number | null {
  if (activity.length < 2) return null;
  const mid = Math.floor(activity.length / 2);
  const firstHalf = activity.slice(0, mid).reduce((sum, d) => sum + d.count, 0);
  const secondHalf = activity.slice(mid).reduce((sum, d) => sum + d.count, 0);
  if (firstHalf === 0) return secondHalf > 0 ? 100 : 0;
  return Math.round(((secondHalf - firstHalf) / firstHalf) * 100);
}

function buildTargetLangMap(
  libraryItems: { course_id: string; target_language: string }[],
  progressItems: { course_id: string; target_language: string }[]
): Map<string, string[]> {
  const map = new Map<string, Set<string>>();

  for (const item of [...libraryItems, ...progressItems]) {
    const existing = map.get(item.course_id) ?? new Set<string>();
    existing.add(item.target_language);
    map.set(item.course_id, existing);
  }

  return new Map(
    Array.from(map.entries()).map(([courseId, langs]) => [courseId, Array.from(langs)])
  );
}

export default function DashboardOverview() {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [weekChange, setWeekChange] = useState<number | null>(null);
  const [recentCourses, setRecentCourses] = useState<RecentCourseRow[]>([]);
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);

  const fetchDashboard = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("You are not signed in. Please log in to view your dashboard.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [statsData, activityData, recentData, aiData, healthData, libraryData, progressData] =
        await Promise.all([
          api.getStats(token),
          api.getActivity(token),
          api.getRecentCourses(token),
          api.getAiStatus(token),
          api.getHealth(),
          api.getLibrary(token),
          api.getProgress(token),
        ]);

      setStats(statsData);
      setAiStatus(aiData);
      setHealth(healthData);

      const activity = activityData.activity ?? [];
      setChartData(
        activity.map((day) => ({
          day: formatChartDay(day.date),
          translations: day.count,
        }))
      );
      setWeekChange(calculateWeekChange(activity));

      const targetLangMap = buildTargetLangMap(libraryData.items, progressData);
      setRecentCourses(
        recentData.slice(0, 4).map((course) => ({
          ...course,
          targetLangs:
            targetLangMap.get(course.id) ??
            (course.source_language ? [course.source_language] : []),
          displayStatus: mapBackendStatus(course.status),
          displayContentType: mapContentType(course.content_type),
          displayDate: formatDate(course.created_at),
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);
    fetchDashboard();
  }, [fetchDashboard]);

  const getStatusBadge = (status: CourseStatus) => {
    switch (status) {
      case "Completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Completed
          </span>
        );
      case "Processing":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 animate-status-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> Processing
          </span>
        );
      case "Failed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Failed
          </span>
        );
      case "Queued":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Queued
          </span>
        );
      default:
        return null;
    }
  };

  const statValue = (value: number | undefined) => {
    if (isLoading) {
      return <span className="inline-block h-9 w-16 bg-white/10 rounded-lg animate-pulse" />;
    }
    return <span className="text-3xl font-black text-white">{value ?? 0}</span>;
  };

  const gpuLoad = aiStatus ? Math.min(aiStatus.current_load * 10, 100).toFixed(1) : null;
  const idleWorkers = aiStatus ? Math.max(0, 10 - aiStatus.current_load) : null;
  const translationApiLabel =
    health?.status === "healthy" && aiStatus?.status === "operational"
      ? "Online"
      : aiStatus?.status === "busy"
        ? "Busy"
        : "Degraded";

  return (
    <div className="space-y-8">
      {error && (
        <div className="glass-panel rounded-2xl p-4 border border-rose-500/30 bg-rose-500/5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-rose-300 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
          {!error.includes("not signed in") && (
            <button
              onClick={fetchDashboard}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-white/10 hover:bg-white/15 transition-colors shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          )}
          {error.includes("not signed in") && (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-accent-violet hover:bg-accent-violet-light transition-colors shrink-0"
            >
              Log in
            </Link>
          )}
        </div>
      )}

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Stat 1 */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-accent-violet/30 to-transparent group-hover:from-accent-violet transition-all duration-300" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Courses Uploaded</span>
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-border-custom flex items-center justify-center text-accent-violet-light">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">{statValue(stats?.total_courses)}</div>
        </div>

        {/* Stat 2 */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-accent-cyan/30 to-transparent group-hover:from-accent-cyan transition-all duration-300" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Languages Processed</span>
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-border-custom flex items-center justify-center text-accent-cyan">
              <Globe2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">{statValue(stats?.languages_processed)}</div>
        </div>

        {/* Stat 3 */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-500/30 to-transparent group-hover:from-emerald-500 transition-all duration-300" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Localizations Completed</span>
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-border-custom flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">{statValue(stats?.localizations_completed)}</div>
        </div>

        {/* Stat 4 */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-amber-500/30 to-transparent group-hover:from-amber-500 transition-all duration-300" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Processing In Queue</span>
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-border-custom flex items-center justify-center text-amber-400 animate-status-pulse">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">{statValue(stats?.processing_in_queue)}</div>
        </div>
      </div>

      {/* Main Grid: Chart & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Localization Trend Chart & Recent Activity */}
        <div className="lg:col-span-2 space-y-8">
          {/* Chart Container */}
          <div className="glass-panel rounded-2xl p-6 border border-border-custom">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-heading font-bold text-lg text-white">Localization <span className="italic text-accent-violet">Activity</span></h3>
                <p className="text-xs text-slate-400">Total translations processed over the last 7 days</p>
              </div>
              {weekChange !== null && !isLoading && (
                <span
                  className={`text-xs font-semibold flex items-center gap-1 ${
                    weekChange >= 0 ? "text-accent-cyan" : "text-rose-400"
                  }`}
                >
                  {weekChange >= 0 ? "+" : ""}
                  {weekChange}% this week <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              )}
              {isLoading && (
                <span className="inline-block h-4 w-24 bg-white/10 rounded animate-pulse" />
              )}
            </div>

            <div className="h-64 w-full">
              {isMounted && !isLoading ? (
                chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorTranslations" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#c98a1c" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#c98a1c" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2b2b28" vertical={false} />
                      <XAxis dataKey="day" stroke="#5a564d" fontSize={11} tickLine={false} />
                      <YAxis stroke="#5a564d" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ece3d2",
                          borderColor: "#2b2b28",
                          borderRadius: "0px",
                          color: "#2b2b28",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="translations"
                        stroke="#c98a1c"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorTranslations)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full bg-white/5 rounded-xl flex items-center justify-center text-slate-500 text-sm">
                    No activity in the last 7 days
                  </div>
                )
              ) : (
                <div className="w-full h-full bg-white/5 rounded-xl animate-pulse flex items-center justify-center text-slate-500">
                  Loading charts...
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity Table */}
          <div className="glass-panel rounded-2xl border border-border-custom overflow-hidden">
            <div className="px-6 py-5 border-b border-border-custom flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-lg text-white">Recent <span className="italic text-accent-violet">Activity</span></h3>
                <p className="text-xs text-slate-400">Manage recently uploaded and translated assets</p>
              </div>
              <Link href="/dashboard/library" className="text-xs text-accent-cyan hover:underline flex items-center gap-1 font-semibold">
                View Library <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border-custom bg-white/2">
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Course Name</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Languages</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Date</th>
                    <th className="px-6 py-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-custom/50">
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-4" colSpan={5}>
                          <div className="h-10 bg-white/5 rounded-lg animate-pulse" />
                        </td>
                      </tr>
                    ))
                  ) : recentCourses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-slate-500 text-sm">
                        No courses yet. Upload your first course to get started.
                      </td>
                    </tr>
                  ) : (
                    recentCourses.map((course) => (
                      <tr key={course.id} className="hover:bg-white/2 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-white max-w-[200px] sm:max-w-[300px] truncate">{course.title}</div>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mt-0.5">
                            {course.displayContentType}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          <div className="flex flex-wrap gap-1 max-w-[150px]">
                            {course.targetLangs.map((lang, lIdx) => (
                              <span
                                key={lIdx}
                                className="text-xs bg-bg-primary/80 border border-border-custom px-2 py-0.5 rounded-md font-medium"
                              >
                                {lang}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(course.displayStatus)}</td>
                        <td className="px-6 py-4 text-slate-400 font-mono text-xs">{course.displayDate}</td>
                        <td className="px-6 py-4 text-right">
                          {course.displayStatus === "Completed" ? (
                            <Link
                              href={`/dashboard/workspace/${course.id}`}
                              className="inline-flex items-center gap-1 text-xs font-bold text-accent-violet-light hover:text-white transition-colors"
                            >
                              Open <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          ) : course.displayStatus === "Processing" ? (
                            <Link
                              href="/dashboard/progress"
                              className="inline-flex items-center gap-1 text-xs font-bold text-accent-cyan hover:text-white transition-colors"
                            >
                              Monitor <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          ) : (
                            <span className="text-xs text-slate-500 cursor-not-allowed">Locked</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Quick Actions & System Info */}
        <div className="space-y-8">
          {/* Quick Actions Panel */}
          <div className="glass-panel rounded-2xl p-6 border border-border-custom">
            <h3 className="font-heading font-bold text-lg text-white mb-4">Quick <span className="italic text-accent-violet">Actions</span></h3>
            <div className="space-y-4">
              <Link
                href="/dashboard/upload"
                className="w-full flex items-center justify-between p-4 rounded-xl border border-border-custom bg-white/2 hover:bg-accent-violet/5 hover:border-accent-violet/40 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent-violet/10 border border-accent-violet/25 flex items-center justify-center text-accent-violet-light group-hover:scale-105 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-semibold text-white block">Upload New Course</span>
                    <span className="text-[10px] text-slate-500 block">Videos, transcripts, PDFs</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
              </Link>

              <Link
                href="/dashboard/library"
                className="w-full flex items-center justify-between p-4 rounded-xl border border-border-custom bg-white/2 hover:bg-accent-cyan/5 hover:border-accent-cyan/40 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent-cyan/10 border border-accent-cyan/25 flex items-center justify-center text-accent-cyan group-hover:scale-105 transition-transform">
                    <Library className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-semibold text-white block">View Course Library</span>
                    <span className="text-[10px] text-slate-500 block">Manage localization catalog</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
              </Link>

              <Link
                href="/dashboard/settings"
                className="w-full flex items-center justify-between p-4 rounded-xl border border-border-custom bg-white/2 hover:bg-white/5 hover:border-slate-500 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/5 border border-border-custom flex items-center justify-center text-slate-400 group-hover:scale-105 transition-transform">
                    <SettingsIcon className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-semibold text-white block">Configure Settings</span>
                    <span className="text-[10px] text-slate-500 block">Configure models, engines</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
              </Link>
            </div>
          </div>

          {/* Mini System Info Panel */}
          <div className="glass-panel rounded-2xl p-6 border border-border-custom text-slate-400 text-xs">
            <h4 className="font-heading font-bold text-sm text-white mb-3 flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full animate-pulse ${
                  health?.status === "healthy" ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />{" "}
              System Health
            </h4>
            <div className="space-y-3 font-mono">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="h-4 bg-white/5 rounded animate-pulse" />
                ))
              ) : (
                <>
                  <div className="flex justify-between">
                    <span>GPU Cluster Load:</span>
                    <span className="text-emerald-400 font-semibold">{gpuLoad ?? "—"}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Translation API:</span>
                    <span
                      className={`font-semibold ${
                        translationApiLabel === "Online" ? "text-emerald-400" : "text-amber-400"
                      }`}
                    >
                      {translationApiLabel}
                      {aiStatus ? ` (${aiStatus.avg_response_time_ms}ms)` : ""}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Worker Threads:</span>
                    <span className="text-white">
                      {idleWorkers !== null ? `${idleWorkers}/10 Idle` : "—"}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
