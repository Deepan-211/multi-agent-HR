"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Grid,
  List,
  Download,
  ExternalLink,
  Languages,
  FileVideo,
  FileText,
  Layers,
  X,
  Filter,
  Eye,
  Trash2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { api, CourseListItem, LibraryItem, ProgressItem } from "@/lib/api";

const FLAG_MAP: Record<string, string> = {
  English: "🇺🇸",
  Spanish: "🇪🇸",
  French: "🇫🇷",
  German: "🇩🇪",
  Japanese: "🇯🇵",
  Arabic: "🇸🇦",
  Portuguese: "🇵🇹",
  Tamil: "🇮🇳",
  Hindi: "🇮🇳",
};

type CourseStatus = "Completed" | "Processing" | "Failed" | "Queued";
type ContentType = "Video Course" | "PDF Document" | "Mixed";

interface LibraryCourse {
  id: string;
  title: string;
  contentType: ContentType;
  originalLang: string;
  targetLangs: string[];
  status: CourseStatus;
  date: string;
  fileSize: string;
  downloadLocalizationId: string | null;
}

interface LocalizationEntry {
  target_language: string;
  status: string;
  localization_id: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-CA");
}

function mapContentType(contentType: string): ContentType {
  switch (contentType.toLowerCase()) {
    case "pdf":
      return "PDF Document";
    case "video":
      return "Video Course";
    default:
      return "Mixed";
  }
}

function deriveCourseStatus(statuses: string[]): CourseStatus {
  if (statuses.some((s) => s === "processing")) return "Processing";
  if (statuses.some((s) => s === "queued")) return "Queued";
  if (statuses.some((s) => s === "failed")) return "Failed";
  if (statuses.some((s) => s === "completed" || s === "approved")) return "Completed";
  return "Queued";
}

function buildLibraryCourses(
  courses: CourseListItem[],
  libraryItems: LibraryItem[],
  progressItems: ProgressItem[],
  failedItems: LibraryItem[]
): LibraryCourse[] {
  const locsByCourse = new Map<string, LocalizationEntry[]>();

  const addEntry = (courseId: string, entry: LocalizationEntry) => {
    const existing = locsByCourse.get(courseId) ?? [];
    const duplicate = existing.some(
      (item) =>
        item.localization_id === entry.localization_id ||
        (item.target_language === entry.target_language && item.status === entry.status)
    );
    if (!duplicate) {
      existing.push(entry);
      locsByCourse.set(courseId, existing);
    }
  };

  for (const item of libraryItems) {
    addEntry(item.course_id, {
      target_language: item.target_language,
      status: item.status,
      localization_id: item.localization_id,
    });
  }

  for (const item of progressItems) {
    addEntry(item.course_id, {
      target_language: item.target_language,
      status: item.status,
      localization_id: item.localization_id,
    });
  }

  for (const item of failedItems) {
    addEntry(item.course_id, {
      target_language: item.target_language,
      status: item.status,
      localization_id: item.localization_id,
    });
  }

  return courses.map((course) => {
    const locs = locsByCourse.get(course.id) ?? [];
    const targetLangs = [...new Set(locs.map((loc) => loc.target_language))];
    const statuses = locs.length > 0 ? locs.map((loc) => loc.status) : [course.localization_status ?? "queued"];
    const completedLoc = locs.find((loc) => loc.status === "completed" || loc.status === "approved");

    return {
      id: course.id,
      title: course.title,
      contentType: mapContentType(course.content_type),
      originalLang: course.source_language,
      targetLangs,
      status: deriveCourseStatus(statuses.filter(Boolean) as string[]),
      date: formatDate(course.created_at),
      fileSize: course.file_size ? formatFileSize(course.file_size) : "—",
      downloadLocalizationId: completedLoc?.localization_id ?? null,
    };
  });
}

export default function CourseLibrary() {
  const [courses, setCourses] = useState<LibraryCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [langFilter, setLangFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [isGridView, setIsGridView] = useState(true);

  const fetchLibrary = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("You are not signed in. Please log in to view your library.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [coursesData, libraryData, progressData, failedData] = await Promise.all([
        api.listCourses(token),
        api.getLibrary(token),
        api.getProgress(token),
        api.searchLibrary(token, { status: "failed" }),
      ]);

      setCourses(
        buildLibraryCourses(
          coursesData.courses,
          libraryData.items,
          progressData,
          failedData.items
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load library.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  const filteredCourses = courses.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesLang =
      langFilter === "All" ||
      course.originalLang === langFilter ||
      course.targetLangs.includes(langFilter);

    const matchesStatus = statusFilter === "All" || course.status === statusFilter;
    const matchesType = typeFilter === "All" || course.contentType === typeFilter;

    return matchesSearch && matchesLang && matchesStatus && matchesType;
  });

  const handleDownload = async (course: LibraryCourse) => {
    const token = localStorage.getItem("token");
    if (!token || !course.downloadLocalizationId) return;

    try {
      const { blob, filename } = await api.downloadLocalization(token, course.downloadLocalizationId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed.");
    }
  };

  const handleDelete = async (course: LibraryCourse) => {
    if (!confirm(`Are you sure you want to delete "${course.title}"?`)) return;

    const token = localStorage.getItem("token");
    if (!token) {
      setError("You are not signed in. Please log in to delete courses.");
      return;
    }

    try {
      await api.deleteCourse(token, course.id);
      setCourses((prev) => prev.filter((item) => item.id !== course.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete course.");
    }
  };

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
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" /> Processing
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

  const getContentTypeIcon = (type: ContentType) => {
    switch (type) {
      case "Video Course":
        return <FileVideo className="w-4 h-4" />;
      case "PDF Document":
        return <FileText className="w-4 h-4" />;
      case "Mixed":
        return <Layers className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const renderSkeletonGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div key={idx} className="glass-panel rounded-2xl border border-border-custom h-[420px] animate-pulse bg-white/5" />
      ))}
    </div>
  );

  const renderSkeletonList = () => (
    <div className="glass-panel rounded-2xl border border-border-custom overflow-hidden">
      <div className="p-6 space-y-4">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div key={idx} className="h-12 bg-white/5 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading font-black text-3xl text-white">Course <span className="italic text-accent-violet">Library</span></h1>
          <p className="text-sm text-slate-400">Manage, review, and download localized training modules</p>
        </div>

        <Link
          href="/dashboard/upload"
          className="px-4 py-2.5 rounded-xl bg-accent-violet hover:bg-accent-violet-light text-white text-sm font-semibold transition-all glow-violet flex items-center justify-center gap-2 self-start"
        >
          Upload New Course
        </Link>
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
                onClick={fetchLibrary}
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

      {/* Filter Toolbar */}
      <div className="glass-panel rounded-2xl p-4 border border-border-custom flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

          {/* Search bar */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search courses by title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-bg-primary/80 border border-border-custom focus:border-accent-violet focus:ring-1 focus:ring-accent-violet text-sm text-white placeholder-slate-500 outline-none transition-all"
            />
          </div>

          {/* Selector filters row */}
          <div className="flex flex-wrap items-center gap-3">

            {/* Language filter */}
            <select
              value={langFilter}
              onChange={(e) => setLangFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-bg-primary/80 border border-border-custom text-xs text-white outline-none cursor-pointer hover:border-slate-500 transition-all"
            >
              <option value="All">All Languages</option>
              <option value="English">English</option>
              <option value="Tamil">Tamil</option>
              <option value="Hindi">Hindi</option>
              <option value="Spanish">Spanish</option>
              <option value="French">French</option>
              <option value="German">German</option>
              <option value="Japanese">Japanese</option>
              <option value="Arabic">Arabic</option>
              <option value="Portuguese">Portuguese</option>
            </select>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-bg-primary/80 border border-border-custom text-xs text-white outline-none cursor-pointer hover:border-slate-500 transition-all"
            >
              <option value="All">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="Processing">Processing</option>
              <option value="Queued">Queued</option>
              <option value="Failed">Failed</option>
            </select>

            {/* Type filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-bg-primary/80 border border-border-custom text-xs text-white outline-none cursor-pointer hover:border-slate-500 transition-all"
            >
              <option value="All">All Formats</option>
              <option value="Video Course">Video Course</option>
              <option value="PDF Document">PDF Document</option>
              <option value="Mixed">Mixed Content</option>
            </select>

            {/* Grid/List toggle */}
            <div className="flex items-center bg-bg-primary/80 border border-border-custom p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setIsGridView(true)}
                className={`p-1.5 rounded-lg transition-colors ${
                  isGridView
                    ? "bg-accent-violet/15 text-accent-violet-light border border-accent-violet/30"
                    : "text-slate-500 hover:text-white"
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsGridView(false)}
                className={`p-1.5 rounded-lg transition-colors ${
                  !isGridView
                    ? "bg-accent-violet/15 text-accent-violet-light border border-accent-violet/30"
                    : "text-slate-500 hover:text-white"
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Library Content */}
      {isLoading ? (
        isGridView ? renderSkeletonGrid() : renderSkeletonList()
      ) : filteredCourses.length === 0 ? (
        <div className="glass-panel rounded-2xl p-16 border border-border-custom text-center max-w-lg mx-auto flex flex-col items-center gap-4 mt-8">
          <div className="w-12 h-12 rounded-full bg-white/5 border border-border-custom flex items-center justify-center text-slate-500">
            <Languages className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-lg text-white">No courses matched</h3>
            <p className="text-xs text-slate-400 mt-1">Try modifying your active query or filters.</p>
          </div>
          <button
            onClick={() => {
              setSearchTerm("");
              setLangFilter("All");
              setStatusFilter("All");
              setTypeFilter("All");
            }}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-border-custom text-white text-xs font-semibold transition-all"
          >
            Clear All Filters
          </button>
        </div>
      ) : isGridView ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              className="glass-panel rounded-2xl border border-border-custom overflow-hidden flex flex-col justify-between group relative"
            >
              {/* Thumbnail Placeholder with Gradient */}
              <div className="h-40 bg-gradient-to-tr from-accent-violet/20 via-bg-secondary to-accent-cyan/15 border-b border-border-custom flex items-center justify-center relative">
                <div className="absolute top-3 right-3 bg-bg-primary/90 border border-border-custom p-1.5 rounded-lg text-slate-400">
                  {getContentTypeIcon(course.contentType)}
                </div>
                <div className="absolute top-3 left-3">
                  {getStatusBadge(course.status)}
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-border-custom/80 flex items-center justify-center text-slate-300">
                  <Languages className="w-6 h-6" />
                </div>
              </div>

              {/* Info Details */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <h3 className="font-heading font-bold text-base text-white line-clamp-2 hover:text-accent-cyan transition-colors">
                    {course.title}
                  </h3>
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
                    {course.contentType} • {course.fileSize}
                  </div>
                </div>

                {/* Languages breakdown */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-slate-400">Target Localizations:</div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[10px] bg-bg-primary/90 border border-border-custom/50 px-2 py-0.5 rounded flex items-center gap-1 text-slate-400 font-bold">
                      {FLAG_MAP[course.originalLang] || "🇺🇸"} {course.originalLang} (Source)
                    </span>
                    {course.targetLangs.map((lang, lIdx) => (
                      <span
                        key={lIdx}
                        className="text-[10px] bg-accent-violet/10 border border-accent-violet/20 text-accent-violet-light px-2 py-0.5 rounded flex items-center gap-1 font-bold"
                      >
                        {FLAG_MAP[lang] || "🌐"} {lang}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-border-custom/50" />

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {course.status === "Completed" ? (
                    <Link
                      href={`/dashboard/workspace/${course.id}`}
                      className="flex-1 py-2 rounded-xl text-center text-xs font-bold text-white bg-accent-violet hover:bg-accent-violet-light transition-all glow-violet flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" /> Open Workspace
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="flex-1 py-2 rounded-xl text-center text-xs font-bold text-slate-500 bg-white/5 border border-border-custom/50 cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      Unavailable
                    </button>
                  )}

                  <button
                    disabled={course.status !== "Completed" || !course.downloadLocalizationId}
                    onClick={() => handleDownload(course)}
                    className={`p-2 rounded-xl border flex items-center justify-center transition-all ${
                      course.status === "Completed" && course.downloadLocalizationId
                        ? "border-border-custom hover:border-slate-500 hover:bg-white/5 text-slate-300 hover:text-white"
                        : "border-border-custom/30 text-slate-600 cursor-not-allowed"
                    }`}
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(course)}
                    className="p-2 rounded-xl border border-border-custom hover:border-rose-500/50 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="glass-panel rounded-2xl border border-border-custom overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border-custom bg-white/2">
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Course Name</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Content Type</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Languages</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Uploaded At</th>
                  <th className="px-6 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom/50">
                {filteredCourses.map((course) => (
                  <tr key={course.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-border-custom flex items-center justify-center text-slate-400">
                          {getContentTypeIcon(course.contentType)}
                        </div>
                        <div>
                          <div className="font-semibold text-white truncate max-w-xs sm:max-w-md">{course.title}</div>
                          <span className="text-[10px] text-slate-500 font-bold font-mono">{course.fileSize}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300 font-medium">{course.contentType}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[10px] bg-bg-primary border border-border-custom/50 px-2 py-0.5 rounded font-bold text-slate-400">
                          {FLAG_MAP[course.originalLang]} {course.originalLang}
                        </span>
                        {course.targetLangs.map((lang, lIdx) => (
                          <span key={lIdx} className="text-[10px] bg-accent-violet/10 border border-accent-violet/20 text-accent-violet-light px-2 py-0.5 rounded font-bold">
                            {FLAG_MAP[lang]} {lang}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(course.status)}</td>
                    <td className="px-6 py-4 text-slate-400 font-mono text-xs">{course.date}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {course.status === "Completed" ? (
                        <>
                          <Link
                            href={`/dashboard/workspace/${course.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent-violet hover:bg-accent-violet-light text-white text-xs font-bold transition-all glow-violet"
                          >
                            Workspace <ExternalLink className="w-3 h-3" />
                          </Link>

                          <button
                            disabled={!course.downloadLocalizationId}
                            onClick={() => handleDownload(course)}
                            className="inline-flex items-center p-1.5 rounded-lg border border-border-custom hover:border-slate-500 hover:bg-white/5 text-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-500 select-none">Unavailable</span>
                      )}

                      <button
                        onClick={() => handleDelete(course)}
                        className="inline-flex items-center p-1.5 rounded-lg border border-border-custom hover:border-rose-500 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
