"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ContentType, AIModelType } from "@/context/AppContext";
import { api } from "@/lib/api";
import {
  Upload, 
  FileVideo, 
  FileText, 
  X, 
  ChevronDown, 
  Check, 
  Sparkles,
  HelpCircle
} from "lucide-react";

const SUPPORTED_LANGUAGES = [
  "Tamil", 
  "Hindi", 
  "Spanish", 
  "French", 
  "German", 
  "Japanese", 
  "Arabic", 
  "Portuguese"
];

function getFileType(file: File): "video" | "pdf" | null {
  const isVideo =
    file.type.startsWith("video/") || /\.(mp4|mov|avi|webm|mkv)$/i.test(file.name);
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (isVideo) return "video";
  if (isPdf) return "pdf";
  return null;
}

function mapContentTypeToApi(uiType: ContentType, fileType: "video" | "pdf"): string {
  if (uiType === "PDF Document") return "pdf";
  if (uiType === "Video Course") return "video";
  return fileType;
}

function mapAiModelToApi(model: AIModelType): string {
  switch (model) {
    case "Fast":
      return "claude-haiku-4-5";
    case "High Accuracy":
      return "claude-opus-4-6";
    case "Balanced":
    default:
      return "claude-sonnet-4-6";
  }
}

export default function CourseUpload() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [courseTitle, setCourseTitle] = useState("");
  const [sourceLang, setSourceLang] = useState("English");
  const [targetLangs, setTargetLangs] = useState<string[]>([]);
  const [contentType, setContentType] = useState<ContentType>("Video Course");
  const [aiModel, setAiModel] = useState<AIModelType>("Balanced");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // UI state
  const [isDragActive, setIsDragActive] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const processSelectedFile = (file: File) => {
    const fileType = getFileType(file);
    if (!fileType) {
      setErrorMsg("Invalid file type. Please upload a Video (MP4/etc) or PDF.");
      return;
    }

    setUploadedFile(file);
    setErrorMsg("");

    if (!courseTitle) {
      const cleanName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
      setCourseTitle(cleanName);
    }
    setContentType(fileType === "video" ? "Video Course" : "PDF Document");
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const toggleTargetLanguage = (lang: string) => {
    if (targetLangs.includes(lang)) {
      setTargetLangs(prev => prev.filter(l => l !== lang));
    } else {
      setTargetLangs(prev => [...prev, lang]);
    }
  };

  const removeTargetLanguage = (lang: string) => {
    setTargetLangs(prev => prev.filter(l => l !== lang));
  };

  const handleStartLocalization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseTitle.trim()) {
      setErrorMsg("Please provide a course title.");
      return;
    }
    if (!uploadedFile) {
      setErrorMsg("Please upload a course asset (video or PDF).");
      return;
    }
    if (targetLangs.length === 0) {
      setErrorMsg("Please select at least one target language.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setErrorMsg("You are not signed in. Please log in to upload courses.");
      return;
    }

    const fileType = getFileType(uploadedFile);
    if (!fileType) {
      setErrorMsg("Invalid file type. Please upload a Video (MP4/etc) or PDF.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const uploadResult = await api.uploadCourse(token, {
        title: courseTitle.trim(),
        source_language: sourceLang,
        content_type: mapContentTypeToApi(contentType, fileType),
        file: uploadedFile,
      });

      await api.startLocalization(token, {
        course_id: uploadResult.course_id,
        target_languages: targetLangs,
        ai_model: mapAiModelToApi(aiModel),
      });

      router.push("/dashboard/progress");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-black text-2xl text-white">Upload & Localize <span className="italic text-accent-violet">Course</span></h2>
        <p className="text-sm text-slate-400">Initialize localization workers for video lectures or PDF course outlines</p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-error/10 border border-error/25 text-error text-sm flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg("")} className="text-error/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Two-Panel Layout */}
      <form onSubmit={handleStartLocalization} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Panel: Drag-and-Drop Area */}
        <div className="space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Upload Asset</div>
          
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`h-[400px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-300 relative overflow-hidden ${
              isDragActive 
                ? "border-accent-violet bg-accent-violet/5 scale-[0.99]" 
                : "border-border-custom hover:border-accent-violet/40 hover:bg-white/2"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />

            {!uploadedFile ? (
              <div className="space-y-4 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-accent-violet/15 flex items-center justify-center text-accent-violet-light border border-accent-violet/20">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Drag and drop your file here</p>
                  <p className="text-xs text-slate-400 mt-1">Accepts MP4, MKV, MOV (videos) or PDF manuals (up to 500MB)</p>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg bg-white/5 border border-border-custom hover:border-slate-500 text-xs font-semibold text-white transition-all"
                >
                  Browse Files
                </button>
              </div>
            ) : (
              <div className="space-y-6 flex flex-col items-center max-w-sm">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                  {getFileType(uploadedFile) === "video" ? (
                    <FileVideo className="w-7 h-7" />
                  ) : (
                    <FileText className="w-7 h-7" />
                  )}
                </div>
                <div className="w-full">
                  <p className="text-sm font-semibold text-white truncate px-4">{uploadedFile.name}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {formatFileSize(uploadedFile.size)} • {getFileType(uploadedFile)?.toUpperCase()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUploadedFile(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-400 text-xs font-semibold flex items-center gap-1 transition-all"
                >
                  <X className="w-3.5 h-3.5" /> Remove Asset
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Configurations */}
        <div className="glass-panel rounded-2xl p-6 border border-border-custom space-y-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Localization Settings</div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Course Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Advanced System Design Masterclass"
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-bg-primary/60 border border-border-custom focus:border-accent-violet focus:ring-1 focus:ring-accent-violet text-sm text-white placeholder-slate-500 outline-none transition-all"
            />
          </div>

          {/* Source Lang & Content Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Source Language
              </label>
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-bg-primary/60 border border-border-custom focus:border-accent-violet focus:ring-1 focus:ring-accent-violet text-sm text-white outline-none transition-all cursor-pointer"
              >
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
                <option value="German">German</option>
                <option value="Japanese">Japanese</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Content Type
              </label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value as ContentType)}
                className="w-full px-4 py-2.5 rounded-xl bg-bg-primary/60 border border-border-custom focus:border-accent-violet focus:ring-1 focus:ring-accent-violet text-sm text-white outline-none transition-all cursor-pointer"
              >
                <option value="Video Course">Video Course</option>
                <option value="PDF Document">PDF Document</option>
                <option value="Mixed">Mixed Content</option>
              </select>
            </div>
          </div>

          {/* Target Languages (Multi-select) */}
          <div className="relative">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Target Languages
            </label>
            
            {/* Dropdown toggle */}
            <div
              onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
              className="w-full px-4 py-2.5 rounded-xl bg-bg-primary/60 border border-border-custom focus:border-accent-violet focus:ring-1 focus:ring-accent-violet text-sm text-white cursor-pointer flex items-center justify-between select-none"
            >
              <span className="text-slate-400 text-sm">
                {targetLangs.length === 0 ? "Select target languages" : `${targetLangs.length} selected`}
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isLangDropdownOpen ? "rotate-180" : ""}`} />
            </div>

            {/* Custom Multi-select Dropdown list */}
            {isLangDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsLangDropdownOpen(false)} />
                <div className="absolute left-0 right-0 mt-2 z-20 rounded-xl bg-bg-secondary border border-border-custom p-2 max-h-56 overflow-y-auto shadow-2xl">
                  {SUPPORTED_LANGUAGES.map((lang) => {
                    const isSelected = targetLangs.includes(lang);
                    return (
                      <div
                        key={lang}
                        onClick={() => toggleTargetLanguage(lang)}
                        className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-slate-300 hover:text-white cursor-pointer select-none"
                      >
                        <span>{lang}</span>
                        {isSelected && <Check className="w-4 h-4 text-accent-cyan" />}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Language chips display */}
            {targetLangs.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {targetLangs.map((lang) => (
                  <span
                    key={lang}
                    className="inline-flex items-center gap-1 text-xs bg-accent-violet/10 border border-accent-violet/20 text-accent-violet-light px-2.5 py-1 rounded-lg font-semibold"
                  >
                    {lang}
                    <button
                      type="button"
                      onClick={() => removeTargetLanguage(lang)}
                      className="text-accent-violet-light hover:text-white p-0.5 rounded-md hover:bg-accent-violet/20"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* AI Model selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                AI Translation Model
              </label>
              <span className="text-[10px] text-accent-cyan font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Auto-Context Aware
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* Option Fast */}
              <button
                type="button"
                onClick={() => setAiModel("Fast")}
                className={`py-3 px-2 rounded-xl border text-center transition-all ${
                  aiModel === "Fast"
                    ? "border-accent-violet bg-accent-violet/5 text-white glow-violet/5"
                    : "border-border-custom hover:border-slate-500 text-slate-400 hover:text-white bg-bg-primary/20"
                }`}
              >
                <span className="text-xs font-bold block">Fast</span>
                <span className="text-[9px] text-slate-500 block mt-0.5">GPT-3.5 Speed</span>
              </button>

              {/* Option Balanced */}
              <button
                type="button"
                onClick={() => setAiModel("Balanced")}
                className={`py-3 px-2 rounded-xl border text-center transition-all ${
                  aiModel === "Balanced"
                    ? "border-accent-violet bg-accent-violet/5 text-white glow-violet/5"
                    : "border-border-custom hover:border-slate-500 text-slate-400 hover:text-white bg-bg-primary/20"
                }`}
              >
                <span className="text-xs font-bold block">Balanced</span>
                <span className="text-[9px] text-slate-500 block mt-0.5">Highly Efficient</span>
              </button>

              {/* Option High Accuracy */}
              <button
                type="button"
                onClick={() => setAiModel("High Accuracy")}
                className={`py-3 px-2 rounded-xl border text-center transition-all ${
                  aiModel === "High Accuracy"
                    ? "border-accent-violet bg-accent-violet/5 text-white glow-violet/5"
                    : "border-border-custom hover:border-slate-500 text-slate-400 hover:text-white bg-bg-primary/20"
                }`}
              >
                <span className="text-xs font-bold block">High Accuracy</span>
                <span className="text-[9px] text-slate-500 block mt-0.5">Deep Contextual</span>
              </button>
            </div>
          </div>

          <div className="h-px bg-border-custom/50" />

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-xl font-bold text-white relative overflow-hidden bg-accent-violet hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 glow-violet disabled:opacity-50"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-accent-violet to-accent-violet-light" />
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isSubmitting ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Initializing Workers...
                </>
              ) : (
                "Start Localization"
              )}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
