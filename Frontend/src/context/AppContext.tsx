"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type ContentType = "Video Course" | "PDF Document" | "Mixed";
export type AIModelType = "Fast" | "Balanced" | "High Accuracy";
export type CourseStatus = "Completed" | "Processing" | "Failed" | "Queued";

export interface TextBlock {
  id: number;
  text: string;
}

export interface TranslatedBlock {
  id: number;
  text: string;
  confidence: "High" | "Medium" | "Low";
}

export interface Course {
  id: string;
  title: string;
  contentType: ContentType;
  originalLang: string;
  targetLangs: string[];
  status: CourseStatus;
  date: string;
  aiModel: AIModelType;
  progress: number;
  sourceBlocks: TextBlock[];
  translatedBlocks: Record<string, TranslatedBlock[]>; // language -> blocks
  estimatedTime?: string;
  fileSize?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  role: "Instructor" | "Admin";
  avatar: string;
}

export interface AppSettings {
  defaultSourceLang: string;
  preferredTargetLangs: string[];
  defaultAiModel: AIModelType;
  translationMemory: boolean;
  autoApproveHighConfidence: boolean;
  emailNotifications: {
    uploadSuccess: boolean;
    localizationComplete: boolean;
    systemAlerts: boolean;
  };
}

interface AppContextType {
  courses: Course[];
  userProfile: UserProfile;
  settings: AppSettings;
  addCourse: (course: Omit<Course, "id" | "progress" | "sourceBlocks" | "translatedBlocks">) => string;
  updateCourseTranslation: (courseId: string, lang: string, blockId: number, text: string) => void;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  deleteCourse: (courseId: string) => void;
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const initialCourses: Course[] = [
  {
    id: "course-1",
    title: "Advanced Machine Learning Fundamentals",
    contentType: "Video Course",
    originalLang: "English",
    targetLangs: ["Spanish", "Japanese", "Hindi"],
    status: "Completed",
    date: "2026-06-12",
    aiModel: "High Accuracy",
    progress: 100,
    fileSize: "148.5 MB",
    sourceBlocks: [
      { id: 1, text: "Welcome back! Today we are diving into Deep Neural Networks and backpropagation algorithms." },
      { id: 2, text: "The loss function measures how well our model performs relative to the ground truth targets." },
      { id: 3, text: "We compute gradient descent weights by applying the chain rule recursively through layers." },
    ],
    translatedBlocks: {
      Spanish: [
        { id: 1, text: "¡Bienvenidos de nuevo! Hoy nos sumergiremos en las Redes Neuronales Profundas y los algoritmos de retropropagación.", confidence: "High" },
        { id: 2, text: "La función de pérdida mide qué tan bien se desempeña nuestro modelo en relación con los objetivos de la verdad fundamental.", confidence: "High" },
        { id: 3, text: "Calculamos los pesos del descenso de gradiente aplicando la regla de la cadena de forma recursiva a través de las capas.", confidence: "Medium" },
      ],
      Japanese: [
        { id: 1, text: "おかえりなさい！今日はディープニューラルネットワークと逆伝播アルゴリズムについて掘り下げていきます。", confidence: "High" },
        { id: 2, text: "損失関数は、グラウンドトゥルースのターゲットと比較して、モデルのパフォーマンスがどれほど優れているかを測定します。", confidence: "Medium" },
        { id: 3, text: "レイヤーを介してチェーンルールを再帰的に適用することにより、勾配降下法ウェイトを計算します。", confidence: "High" },
      ],
      Hindi: [
        { id: 1, text: "वापसी पर आपका स्वागत है! आज हम डीप न्यूरल नेटवर्क और बैकप्रोपेगेशन एल्गोरिदम में गोता लगा रहे हैं।", confidence: "High" },
        { id: 2, text: "नुकसान फ़ंक्शन यह मापता है कि हमारा मॉडल ग्राउंड ट्रुथ लक्ष्यों के सापेक्ष कितना अच्छा प्रदर्शन करता है।", confidence: "High" },
        { id: 3, text: "हम परतों के माध्यम से श्रृंखला नियम को पुनरावर्ती रूप से लागू करके ढाल वंश भार की गणना करते हैं।", confidence: "Low" },
      ],
    },
  },
  {
    id: "course-2",
    title: "Introduction to User Experience & Product Strategy",
    contentType: "PDF Document",
    originalLang: "English",
    targetLangs: ["French", "German", "Tamil"],
    status: "Processing",
    date: "2026-06-15",
    aiModel: "Balanced",
    progress: 45,
    estimatedTime: "2 mins left",
    fileSize: "12.4 MB",
    sourceBlocks: [
      { id: 1, text: "UX design is not just about aesthetics; it is fundamentally about solving user problems efficiently." },
      { id: 2, text: "Conducting thorough user research and persona building helps align product teams early on." },
      { id: 3, text: "Wireframes serve as blueprint skeletons for the visual UI and overall functional layout." },
    ],
    translatedBlocks: {
      French: [
        { id: 1, text: "Le design UX ne concerne pas seulement l'esthétique ; il s'agit fondamentalement de résoudre les problèmes des utilisateurs de manière efficace.", confidence: "High" },
        { id: 2, text: "Mener des recherches approfondies sur les utilisateurs et créer des personas aide à aligner les équipes produit dès le départ.", confidence: "High" },
        { id: 3, text: "", confidence: "Low" },
      ],
      German: [
        { id: 1, text: "Bei UX-Design geht es nicht nur um Ästhetik; es geht im Wesentlichen darum, Benutzerprobleme effizient zu lösen.", confidence: "High" },
        { id: 2, text: "", confidence: "Medium" },
        { id: 3, text: "", confidence: "Medium" },
      ],
      Tamil: [
        { id: 1, text: "யுஎக்ஸ் வடிவமைப்பு என்பது அழகியல் பற்றியது மட்டுமல்ல; இது அடிப்படையில் பயனர் பிரச்சினைகளை திறமையாக தீர்ப்பதாகும்.", confidence: "High" },
        { id: 2, text: "", confidence: "Low" },
        { id: 3, text: "", confidence: "Low" },
      ],
    },
  },
  {
    id: "course-3",
    title: "Financial Planning & Analysis Masterclass",
    contentType: "Mixed",
    originalLang: "English",
    targetLangs: ["Portuguese", "Arabic"],
    status: "Queued",
    date: "2026-06-15",
    aiModel: "High Accuracy",
    progress: 0,
    estimatedTime: "Pending queue",
    fileSize: "45.0 MB",
    sourceBlocks: [
      { id: 1, text: "Free cash flow represents the cash a company generates after accounting for cash outflows." },
      { id: 2, text: "Discounted Cash Flow (DCF) helps calculate an asset's valuation based on future cash forecasts." },
    ],
    translatedBlocks: {
      Portuguese: [
        { id: 1, text: "", confidence: "Medium" },
        { id: 2, text: "", confidence: "Medium" },
      ],
      Arabic: [
        { id: 1, text: "", confidence: "High" },
        { id: 2, text: "", confidence: "High" },
      ],
    },
  },
  {
    id: "course-4",
    title: "Full-Stack Web Development: Backend Architecture",
    contentType: "Video Course",
    originalLang: "English",
    targetLangs: ["Japanese", "Spanish"],
    status: "Failed",
    date: "2026-06-14",
    aiModel: "Fast",
    progress: 88,
    fileSize: "512.3 MB",
    sourceBlocks: [
      { id: 1, text: "A microservices architecture separates modular backend functions into independent deployable APIs." },
      { id: 2, text: "Connecting to a distributed Redis cache layer helps minimize database roundtrip times." },
    ],
    translatedBlocks: {
      Japanese: [
        { id: 1, text: "マイクロサービスアーキテクチャは、モジュール式バックエンド関数を独立したデプロイ可能なAPIに分離します。", confidence: "High" },
        { id: 2, text: "", confidence: "Low" },
      ],
      Spanish: [
        { id: 1, text: "", confidence: "Medium" },
        { id: 2, text: "", confidence: "Medium" },
      ],
    },
  },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  
  // 1. Wipe out Alex Mercer. Set this to a blank loading state.
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: "Loading...",
    email: "...",
    role: "Instructor",
    avatar: "",
  });

  // 2. Automatically grab the logged-in user's data when the app loads
  useEffect(() => {
    // 1. The function that forces the header to read Local Storage
    const forceHeaderUpdate = () => {
      const savedName = localStorage.getItem("userName");
      
      if (savedName) {
        setUserProfile({
          name: savedName,
          email: "",
          role: "Instructor",
          avatar: savedName.charAt(0).toUpperCase(),
        });
      } else {
        setUserProfile({
          name: "My Account",
          email: "",
          role: "Instructor",
          avatar: "U",
        });
      }
    };

    // 2. Run it immediately when the app opens
    forceHeaderUpdate();

    // 3. THE NUCLEAR TRIGGER: Listen for the global signal from your Settings page
    window.addEventListener("syncProfile", forceHeaderUpdate);

    // 4. Cleanup listener
    return () => window.removeEventListener("syncProfile", forceHeaderUpdate);
  }, []);
  // ... rest of your provider code (return <AppContext.Provider value={...}>)

  const [settings, setSettings] = useState<AppSettings>({
    defaultSourceLang: "English",
    preferredTargetLangs: ["Spanish", "French", "Japanese", "Hindi"],
    defaultAiModel: "Balanced",
    translationMemory: true,
    autoApproveHighConfidence: false,
    emailNotifications: {
      uploadSuccess: true,
      localizationComplete: true,
      systemAlerts: false,
    },
  });

  // Background worker simulator to make Processing/Queued courses progress live!
  useEffect(() => {
    const interval = setInterval(() => {
      setCourses((prevCourses) => {
        let changed = false;
        const nextCourses = prevCourses.map((course) => {
          if (course.status === "Processing") {
            changed = true;
            const nextProgress = course.progress + Math.floor(Math.random() * 8) + 4;
            if (nextProgress >= 100) {
              // Populate translated blocks with realistic translations
              const updatedTranslated: Record<string, TranslatedBlock[]> = {};
              Object.keys(course.translatedBlocks).forEach((lang) => {
                updatedTranslated[lang] = course.sourceBlocks.map((sb) => {
                  let text = `[Translated to ${lang}]: ` + sb.text;
                  if (lang === "Spanish") {
                    if (sb.id === 1) text = "La experiencia de usuario no es sólo estética; se trata fundamentalmente de resolver problemas.";
                    if (sb.id === 2) text = "Llevar a cabo una investigación profunda y modelar personas alinea a los equipos de producto.";
                    if (sb.id === 3) text = "Los bocetos sirven como esqueletos para el diseño de la interfaz visual.";
                  } else if (lang === "French") {
                    if (sb.id === 1) text = "Le design UX n'est pas qu'une question d'esthétique; il s'agit de résoudre les problèmes de manière efficace.";
                    if (sb.id === 2) text = "Mener des recherches approfondies sur les utilisateurs aide à aligner les équipes produit.";
                    if (sb.id === 3) text = "Les maquettes filaires servent de schémas fonctionnels pour l'interface visuelle.";
                  } else if (lang === "Tamil") {
                    if (sb.id === 1) text = "யுஎக்ஸ் வடிவமைப்பு என்பது அழகியல் பற்றியது மட்டுமல்ல; இது பயனர் பிரச்சினைகளைத் தீர்ப்பதாகும்.";
                    if (sb.id === 2) text = "ஆழமான பயனர் ஆராய்ச்சியை மேற்கொள்வது தயாரிப்பு குழுக்களை ஒருங்கிணைக்க உதவுகிறது.";
                    if (sb.id === 3) text = "வயர்ஃப்ரேம்கள் காட்சி இடைமுகத்திற்கான அத்தியாவசிய வரைபடங்களாக செயல்படுகின்றன.";
                  }
                  return {
                    id: sb.id,
                    text,
                    confidence: Math.random() > 0.3 ? "High" : "Medium",
                  };
                });
              });

              return {
                ...course,
                progress: 100,
                status: "Completed" as CourseStatus,
                estimatedTime: undefined,
                translatedBlocks: updatedTranslated,
              };
            }
            return {
              ...course,
              progress: nextProgress,
              estimatedTime: `${Math.ceil((100 - nextProgress) * 0.15)} mins left`,
            };
          } else if (course.status === "Queued") {
            // Randomly start processing
            if (Math.random() > 0.8) {
              changed = true;
              return {
                ...course,
                status: "Processing" as CourseStatus,
                progress: 1,
                estimatedTime: "Starting...",
              };
            }
          }
          return course;
        });

        return changed ? nextCourses : prevCourses;
      });
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  const addCourse = (courseData: Omit<Course, "id" | "progress" | "sourceBlocks" | "translatedBlocks">) => {
    const newId = `course-${Date.now()}`;
    const sourceBlocks: TextBlock[] = [
      { id: 1, text: "In this foundational chapter, we lay out the core concepts and project goals." },
      { id: 2, text: "Make sure all parameters are thoroughly tested before running model inference in production." },
      { id: 3, text: "Let's summarize key performance indicators to review progress with our stakeholders." },
    ];

    const translatedBlocks: Record<string, TranslatedBlock[]> = {};
    courseData.targetLangs.forEach((lang) => {
      translatedBlocks[lang] = sourceBlocks.map((block) => ({
        id: block.id,
        text: "", // initially empty, filled during translation simulation
        confidence: "Medium",
      }));
    });

    const newCourse: Course = {
      ...courseData,
      id: newId,
      progress: 0,
      status: "Queued",
      sourceBlocks,
      translatedBlocks,
      estimatedTime: "Queued in pipeline",
      fileSize: courseData.fileSize || "18.4 MB",
    };

    setCourses((prev) => [newCourse, ...prev]);
    return newId;
  };

  const updateCourseTranslation = (courseId: string, lang: string, blockId: number, text: string) => {
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id !== courseId) return c;
        const currentLangBlocks = c.translatedBlocks[lang] || [];
        const updatedLangBlocks = currentLangBlocks.map((b) =>
          b.id === blockId ? { ...b, text, confidence: "High" as const } : b
        );
        return {
          ...c,
          translatedBlocks: {
            ...c.translatedBlocks,
            [lang]: updatedLangBlocks,
          },
        };
      })
    );
  };

  const deleteCourse = (courseId: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
  };

  const updateUserProfile = (profile: Partial<UserProfile>) => {
    setUserProfile((prev) => ({ ...prev, ...profile }));
  };

  const updateSettings = (updatedSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...updatedSettings }));
  };

  return (
    <AppContext.Provider
      value={{
        courses,
        userProfile,
        settings,
        addCourse,
        updateCourseTranslation,
        updateUserProfile,
        updateSettings,
        deleteCourse,
        isSidebarOpen,
        setSidebarOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
