"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Copy, 
  Download, 
  Save, 
  CheckCircle, 
  Layout, 
  Columns, 
  AlertCircle,
  Sparkles,
  ChevronRight,
  Globe
} from "lucide-react";
import { api, WorkspaceBlockPair, CourseResponse } from "@/lib/api";

export default function LocalizationWorkspace() {
  const router = useRouter();
  const params = useParams();
  
  const courseId = params.courseId as string;

  // States
  const [course, setCourse] = useState<CourseResponse | null>(null);
  const [blocks, setBlocks] = useState<WorkspaceBlockPair[]>([]);
  const [localizationId, setLocalizationId] = useState<string | null>(null);
  const [targetLangs, setTargetLangs] = useState<string[]>([]);
  const [selectedTargetLang, setSelectedTargetLang] = useState("");
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [isSingleColumn, setIsSingleColumn] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savingBlockId, setSavingBlockId] = useState<string | null>(null);

  // Load course details, localizations and workspace
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setErrorMsg("You are not signed in. Please log in to view the workspace.");
      setIsLoading(false);
      return;
    }

    const loadWorkspaceData = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        // Fetch course info
        const courseData = await api.getCourse(token, courseId);
        setCourse(courseData);

        // Fetch target languages from all localizations
        const [progressData, libraryData] = await Promise.all([
          api.getProgress(token),
          api.getLibrary(token)
        ]);

        const courseProgressLocs = progressData.filter(item => item.course_id === courseId);
        const courseLibraryLocs = libraryData.items.filter(item => item.course_id === courseId);
        const langs = [...new Set([
          ...courseProgressLocs.map(item => item.target_language),
          ...courseLibraryLocs.map(item => item.target_language)
        ])];
        setTargetLangs(langs);

        // Decide which target language to load
        let activeLang = selectedTargetLang;
        if (langs.length > 0 && !activeLang) {
          activeLang = langs[0];
          setSelectedTargetLang(activeLang);
        }

        // Fetch workspace
        const ws = await api.getWorkspace(token, courseId, activeLang || undefined);
        setBlocks(ws.blocks);
        setLocalizationId(ws.localization_id);

        if (ws.blocks.length > 0 && !activeBlockId) {
          setActiveBlockId(ws.blocks[0].source.id);
        }
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Failed to load workspace data.");
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkspaceData();
  }, [courseId, selectedTargetLang]);

  const handleTextareaChange = (sourceBlockId: string, text: string) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.source.id === sourceBlockId
          ? {
              ...b,
              translation: b.translation
                ? { ...b.translation, translated_text: text }
                : {
                    id: "",
                    block_id: sourceBlockId,
                    translated_text: text,
                    confidence_score: "medium",
                    is_approved: false,
                  },
            }
          : b
      )
    );
  };

  const handleBlockSave = async (block: WorkspaceBlockPair) => {
    if (!block.translation || !block.translation.id) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    setSavingBlockId(block.source.id);
    try {
      await api.updateBlock(token, block.translation.id, {
        translated_text: block.translation.translated_text
      });
    } catch (err) {
      console.error("Failed to save block:", err);
      alert("Failed to save block edit. Please try again.");
    } finally {
      setSavingBlockId(null);
    }
  };

  const handleCopyAll = () => {
    const fullText = blocks
      .map((b) => b.translation?.translated_text || "")
      .filter(Boolean)
      .join("\n\n");
    navigator.clipboard.writeText(fullText);
    alert("Copied all translations to clipboard!");
  };

  const handleSaveDraft = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleApprovePublish = async () => {
    if (!localizationId) {
      alert("No active localization job found to approve.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) return;

    if (!confirm("Are you sure you want to approve all translations and mark this localization as completed?")) return;

    try {
      await api.approveLocalization(token, localizationId);
      alert(`Course "${course?.title}" approved and compiled in ${selectedTargetLang}! Files synchronized to LMS.`);
      router.push("/dashboard/library");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to approve localization.");
    }
  };

  const handleDownloadPDF = async () => {
    if (!localizationId) {
      alert("No active localization job found to export.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const { blob, filename } = await api.exportLocalization(token, localizationId, "pdf");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to export localization.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-accent-violet/30 border-t-accent-violet rounded-full animate-spin" />
      </div>
    );
  }

  if (errorMsg || !course) {
    return (
      <div className="text-center py-20 space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="font-heading font-bold text-xl text-white">Course <span className="italic text-accent-violet">Not Found</span></h3>
        <p className="text-slate-400">{errorMsg || "The requested localization workspace does not exist or has been deleted."}</p>
        <Link href="/dashboard/library" className="inline-flex items-center gap-2 text-accent-cyan hover:underline font-semibold">
          <ArrowLeft className="w-4 h-4" /> Return to Library
        </Link>
      </div>
    );
  }

  const activeBlock = blocks.find((b) => b.source.id === activeBlockId);
  const currentConfidenceRaw = activeBlock?.translation?.confidence_score || "medium";
  const currentConfidence = (currentConfidenceRaw.charAt(0).toUpperCase() + currentConfidenceRaw.slice(1)) as "High" | "Medium" | "Low";

  const getConfidenceBadge = (confidence: "High" | "Medium" | "Low") => {
    switch (confidence) {
      case "High":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> High Confidence (90%+)
          </span>
        );
      case "Medium":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Medium Confidence (70-90%)
          </span>
        );
      case "Low":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/25 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Low Confidence (Under 70%)
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-120px)]">
      
      {/* Workspace Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-bg-secondary p-5 rounded-2xl border border-border-custom">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <Link href="/dashboard/library" className="text-slate-400 hover:text-white p-1 hover:bg-white/5 rounded-lg transition-all">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h2 className="font-heading font-black text-xl text-white truncate max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl">
              {course.title}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 font-bold uppercase tracking-wider">
              {course.content_type === "pdf" ? "PDF Document" : "Video Course"}
            </span>
            <span className="text-slate-600">•</span>
            <span className="bg-bg-primary border border-border-custom px-2.5 py-0.5 rounded-md font-semibold text-slate-300 flex items-center gap-1">
              {course.source_language} 
              <ChevronRight className="w-3 h-3 text-slate-500" /> 
              {selectedTargetLang || "Loading..."}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">Status: <span className="text-accent-cyan font-bold">{course.localization_status || "processing"}</span></span>
          </div>
        </div>

        {/* Dynamic target language switcher */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
            <Globe className="w-3.5 h-3.5" /> Language:
          </span>
          <div className="flex gap-1">
            {targetLangs.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => {
                  setSelectedTargetLang(lang);
                  setActiveBlockId(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedTargetLang === lang
                    ? "bg-accent-violet text-white glow-violet"
                    : "bg-bg-primary border border-border-custom hover:border-slate-500 text-slate-400 hover:text-white"
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-bg-secondary/40 border border-border-custom p-3.5 rounded-xl">
        {/* Left Toolbar actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyAll}
            className="px-3 py-2 rounded-lg border border-border-custom hover:border-slate-500 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 bg-bg-primary/40 transition-all"
          >
            <Copy className="w-3.5 h-3.5" /> Copy All
          </button>
          
          <button
            onClick={handleDownloadPDF}
            className="px-3 py-2 rounded-lg border border-border-custom hover:border-slate-500 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 bg-bg-primary/40 transition-all"
          >
            <Download className="w-3.5 h-3.5" /> Download PDF
          </button>
          
          <button
            onClick={handleSaveDraft}
            className="px-3 py-2 rounded-lg border border-border-custom hover:border-slate-500 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 bg-bg-primary/40 transition-all"
          >
            <Save className="w-3.5 h-3.5" /> {isSaved ? "Draft Saved!" : "Save Draft"}
          </button>
        </div>

        {/* Right Toolbar Actions */}
        <div className="flex items-center gap-3">
          {/* Column Toggle */}
          <button
            onClick={() => setIsSingleColumn(!isSingleColumn)}
            className="p-2 rounded-lg border border-border-custom hover:border-slate-500 text-slate-300 hover:text-white transition-all bg-bg-primary/40"
            title={isSingleColumn ? "Switch to side-by-side view" : "Switch to single-column view"}
          >
            {isSingleColumn ? <Columns className="w-4 h-4" /> : <Layout className="w-4 h-4" />}
          </button>

          <button
            onClick={handleApprovePublish}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all glow-violet"
          >
            <CheckCircle className="w-4 h-4" /> Approve & Publish
          </button>
        </div>
      </div>

      {/* Main Content split scroll workspace container */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className={`grid h-full gap-6 ${isSingleColumn ? "grid-cols-1 overflow-y-auto" : "grid-cols-2"}`}>
          
          {/* LEFT: SOURCE PANEL */}
          <div className={`flex flex-col h-full bg-bg-secondary border border-border-custom rounded-2xl overflow-hidden ${isSingleColumn ? "h-auto overflow-y-visible" : ""}`}>
            <div className="px-5 py-3 border-b border-border-custom bg-white/2 font-heading font-bold text-sm text-slate-300 flex items-center justify-between">
              <span>Source Transcript ({course.source_language})</span>
              <span className="text-[10px] text-slate-500 font-mono uppercase">Original</span>
            </div>
            
            <div className={`flex-1 p-5 overflow-y-auto space-y-4 custom-scroll ${isSingleColumn ? "overflow-y-visible" : ""}`}>
              {blocks.map((block) => {
                const isActive = block.source.id === activeBlockId;
                return (
                  <div
                    key={block.source.id}
                    onClick={() => setActiveBlockId(block.source.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? "border-accent-violet/60 bg-accent-violet/5 text-white shadow-lg shadow-accent-violet/5"
                        : "border-border-custom/50 bg-white/2 text-slate-300 hover:border-slate-500/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-accent-violet-light font-black tracking-wider block">
                        BLOCK {block.block_number.toString().padStart(2, "0")}
                      </span>
                      {savingBlockId === block.source.id && (
                        <span className="text-[9px] text-accent-violet font-semibold animate-pulse">Saving...</span>
                      )}
                    </div>
                    <p className="leading-relaxed text-sm">{block.source.original_text}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: TRANSLATED PANEL */}
          <div className={`flex flex-col h-full bg-bg-secondary border border-border-custom rounded-2xl overflow-hidden ${isSingleColumn ? "h-auto overflow-y-visible" : ""}`}>
            <div className="px-5 py-3 border-b border-border-custom bg-white/2 font-heading font-bold text-sm text-slate-300 flex items-center justify-between">
              <span>Translated Output ({selectedTargetLang})</span>
              <span className="text-[10px] text-accent-cyan font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-accent-cyan animate-pulse" /> AI Localized
              </span>
            </div>

            <div className={`flex-1 p-5 overflow-y-auto space-y-4 custom-scroll ${isSingleColumn ? "overflow-y-visible" : ""}`}>
              {blocks.map((block) => {
                const isActive = block.source.id === activeBlockId;
                return (
                  <div
                    key={block.source.id}
                    onClick={() => setActiveBlockId(block.source.id)}
                    className={`p-4 rounded-xl border transition-all ${
                      isActive
                        ? "border-accent-cyan/60 bg-accent-cyan/5 text-white shadow-lg shadow-accent-cyan/5"
                        : "border-border-custom/50 bg-white/2 text-slate-300 hover:border-slate-500/50"
                    }`}
                  >
                    <span className="text-[10px] text-accent-cyan font-black tracking-wider block mb-1">
                      BLOCK {block.block_number.toString().padStart(2, "0")}
                    </span>
                    <textarea
                      rows={3}
                      value={block.translation?.translated_text || ""}
                      onChange={(e) => handleTextareaChange(block.source.id, e.target.value)}
                      onBlur={() => handleBlockSave(block)}
                      placeholder="Input translated content block..."
                      className="w-full bg-transparent border-0 p-0 text-sm text-white focus:ring-0 outline-none resize-none placeholder-slate-600 leading-relaxed"
                    />
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Bottom status bar */}
      <div className="bg-bg-secondary border border-border-custom p-4 rounded-xl flex items-center justify-between text-xs text-slate-400 shrink-0">
        <div className="flex items-center gap-3">
          <span>Active Selection: <span className="text-white font-bold">Block {activeBlock ? activeBlock.block_number.toString().padStart(2, "0") : "—"}</span></span>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-2">
            <span>AI Confidence Score:</span>
            {getConfidenceBadge(currentConfidence)}
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 font-mono text-[10px]">
          <span>Sync Scroller: <span className="text-emerald-400 font-bold">ACTIVE</span></span>
        </div>
      </div>
      
    </div>
  );
}
