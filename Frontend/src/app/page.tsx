"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock } from "lucide-react";
import { api } from "@/lib/api";

export default function RootPage() {
  const router = useRouter();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const introLayerRef = useRef<HTMLDivElement | null>(null);
  const statusLineRef = useRef<HTMLDivElement | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const hasRevealedRef = useRef(false);

  const [introActive, setIntroActive] = useState(true);
  const [loginActive, setLoginActive] = useState(false);

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
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("userName", (data as any).name);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const revealLogin = () => {
      if (hasRevealedRef.current) return;
      hasRevealedRef.current = true;
      if (introLayerRef.current) {
        introLayerRef.current.style.opacity = "0";
        introLayerRef.current.style.filter = "blur(12px)";
      }
      setLoginActive(true);
      setTimeout(() => {
        setIntroActive(false);
      }, 1150);
    };

    if (prefersReduced) {
      setLoginActive(true);
      setIntroActive(false);
      return;
    }

    let THREE: typeof import("three");
    let renderer: import("three").WebGLRenderer;
    let scene: import("three").Scene;
    let camera: import("three").PerspectiveCamera;
    let flashLight: import("three").PointLight;
    let helixGroup: import("three").Group;
    let portalMat: import("three").MeshBasicMaterial;
    let clock: import("three").Clock;
    let phase: "flying" | "done" = "flying";
    const FLY_DURATION = 4.3;
    let resizeHandler: (() => void) | null = null;
    let statusInterval: ReturnType<typeof setInterval> | null = null;

    let cancelled = false;

    import("three").then((mod) => {
      if (cancelled || !canvasRef.current) return;
      THREE = mod;

      renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearColor(0xf4efe4, 1);

      scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0xf4efe4, 0.09);

      camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 100);

      const ambient = new THREE.AmbientLight(0x2b2b28, 0.35);
      scene.add(ambient);

      flashLight = new THREE.PointLight(0xc98a1c, 2.2, 9, 2);
      scene.add(flashLight);

      helixGroup = new THREE.Group();
      scene.add(helixGroup);

      const RADIUS = 1.7;
      const LENGTH = 44;
      const TURNS = 5.5;
      const NODES = 70;

      const nodePos = (i: number, phaseOffset: number) => {
        const t = i / (NODES - 1);
        const angle = t * TURNS * Math.PI * 2 + phaseOffset;
        const y = t * LENGTH;
        return new THREE.Vector3(Math.cos(angle) * RADIUS, y, Math.sin(angle) * RADIUS);
      };

      const makeNodeSprite = (color: string) => {
        const size = 48;
        const cnv = document.createElement("canvas");
        cnv.width = size;
        cnv.height = size;
        const ctx = cnv.getContext("2d")!;
        const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        grad.addColorStop(0, color);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
        const tex = new THREE.CanvasTexture(cnv);
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(0.5, 0.5, 0.5);
        return sprite;
      };

      const strandA: import("three").Vector3[] = [];
      const strandB: import("three").Vector3[] = [];
      for (let i = 0; i < NODES; i++) {
        const pA = nodePos(i, 0);
        const pB = nodePos(i, Math.PI);
        const sA = makeNodeSprite("rgba(201,138,28,0.95)");
        const sB = makeNodeSprite("rgba(43,43,40,0.95)");
        sA.position.copy(pA);
        sB.position.copy(pB);
        helixGroup.add(sA, sB);
        strandA.push(pA);
        strandB.push(pB);

        if (i % 3 === 0) {
          const geo = new THREE.BufferGeometry().setFromPoints([pA, pB]);
          const mat = new THREE.LineBasicMaterial({ color: 0x2b2b28, transparent: true, opacity: 0.12 });
          helixGroup.add(new THREE.Line(geo, mat));
        }
      }

      [strandA, strandB].forEach((strand, idx) => {
        const geo = new THREE.BufferGeometry().setFromPoints(strand);
        const mat = new THREE.LineBasicMaterial({
          color: idx === 0 ? 0xc98a1c : 0x2b2b28,
          transparent: true,
          opacity: 0.35,
        });
        helixGroup.add(new THREE.Line(geo, mat));
      });

      const langLabels = ["EN", "தமிழ்", "हिंदी", "日本語", "العربية", "ES", "FR", "DE"];
      const makeLabelSprite = (text: string) => {
        const cnv = document.createElement("canvas");
        cnv.width = 256;
        cnv.height = 128;
        const ctx = cnv.getContext("2d")!;
        ctx.clearRect(0, 0, 256, 128);
        ctx.font = "600 46px Sora, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(43,43,40,0.95)";
        ctx.shadowColor = "rgba(201,138,28,0.3)";
        ctx.shadowBlur = 20;
        ctx.fillText(text, 128, 64);
        const tex = new THREE.CanvasTexture(cnv);
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(2.4, 1.2, 1);
        return sprite;
      };
      langLabels.forEach((label, i) => {
        const t = (i + 0.5) / langLabels.length;
        const sprite = makeLabelSprite(label);
        sprite.position.set(0, t * LENGTH, 0);
        helixGroup.add(sprite);
      });

      const portalGeo = new THREE.CircleGeometry(RADIUS * 1.3, 48);
      portalMat = new THREE.MeshBasicMaterial({
        color: 0xc98a1c,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      });
      const portal = new THREE.Mesh(portalGeo, portalMat);
      portal.position.set(0, LENGTH + 1.5, 0);
      portal.rotation.x = Math.PI / 2;
      helixGroup.add(portal);

      camera.position.set(0, -3, 0.001);

      clock = new THREE.Clock();

      const animate = () => {
        rafIdRef.current = requestAnimationFrame(animate);
        const t = clock.getElapsedTime();

        if (phase === "flying") {
          const p = Math.min(t / FLY_DURATION, 1);
          const eased = p < 0.85 ? (p / 0.85) * 0.92 : 0.92 + ((p - 0.85) / 0.15) * 0.08;
          const y = -3 + eased * (LENGTH + 5.5);
          camera.position.y = y;
          camera.lookAt(0, y + 6, 0);
          flashLight.position.set(0, y + 1.5, 0);
          helixGroup.rotation.y = t * 0.18;
          portalMat.opacity = 0.5 + Math.sin(t * 4) * 0.15;

          if (p >= 1) {
            phase = "done";
            revealLogin();
          }
        }

        renderer.render(scene, camera);
      };
      animate();

      resizeHandler = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener("resize", resizeHandler);

      const statusMessages = [
        "entering the language stream…",
        "passing through Tamil, Hindi, Japanese…",
        "weaving scripts together…",
        "approaching your course hub…",
      ];
      let si = 0;
      statusInterval = setInterval(() => {
        si = (si + 1) % statusMessages.length;
        if (statusLineRef.current) statusLineRef.current.textContent = statusMessages[si];
      }, 1050);
      setTimeout(() => {
        if (statusInterval) clearInterval(statusInterval);
      }, FLY_DURATION * 1000 - 200);
    });

    return () => {
      cancelled = true;
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (resizeHandler) window.removeEventListener("resize", resizeHandler);
      if (statusInterval) clearInterval(statusInterval);
      if (renderer) renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSkip = () => {
    hasRevealedRef.current = true;
    if (introLayerRef.current) {
      introLayerRef.current.style.opacity = "0";
      introLayerRef.current.style.filter = "blur(12px)";
    }
    setLoginActive(true);
    setTimeout(() => setIntroActive(false), 1150);
  };

  return (
    <>
      <link
        rel="preconnect"
        href="https://fonts.googleapis.com"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Sora:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />

      <div className="lc-root">
        {introActive && (
          <div id="introLayer" ref={introLayerRef}>
            <canvas id="scene" ref={canvasRef}></canvas>
            <div className="stage-label">
              <div className="stage-wordmark">LocalizeAI</div>
              <div className="stage-sub" ref={statusLineRef}>
                entering the language stream…
              </div>
            </div>
            <button className="skip-btn" onClick={handleSkip}>
              Skip intro →
            </button>
          </div>
        )}

        <div id="loginLayer" className={loginActive ? "active" : ""}>
          <div className="ambient-particles"></div>
          <div className="login-card">
            <div className="lang-strip">
              <span className="on">EN</span>
              <span>தமிழ்</span>
              <span>हिं</span>
              <span>日本</span>
              <span>عربي</span>
              <span>ES</span>
            </div>
            <div className="brand-row">
              <div className="brand-name">Welcome <span className="italic" style={{ color: "var(--accent-gold)" }}>back</span></div>
              <div className="brand-tag">Sign in to continue your courses, in any language.</div>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="row-between">
                <label className="remember">
                  <input type="checkbox" style={{ accentColor: "#F2B84B" }} /> Remember me
                </label>
                <a href="#">Forgot password?</a>
              </div>

              {error && (
                <p style={{ color: "#ff8080", fontSize: "0.85rem", textAlign: "center", marginBottom: "16px" }}>
                  {error}
                </p>
              )}

              <button className="signin-btn" type="submit" disabled={isLoading}>
                {isLoading ? "Signing in…" : "Sign in"}
              </button>
            </form>
            <div className="divider">or continue with</div>
            <div className="footer-text">
              Don&apos;t have an account? <Link href="/register">Create one</Link>
            </div>
            <div className="footer-text" style={{ marginTop: "10px" }}>
              <Link href="/about">Learn more about LocalizeAI →</Link>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        :root {
          --bg-deep: #f4efe4;
          --bg-secondary: #ece3d2;
          --accent-gold: #c98a1c;
          --accent-teal: #c98a1c;
          --text-cream: #2b2b28;
          --text-dim: #5a564d;
          --card-glass: #f4efe4;
          --border-glass: #2b2b28;
        }

        .lc-root,
        .lc-root * {
          box-sizing: border-box;
        }

        .lc-root {
          height: 100vh;
          background: var(--bg-deep);
          color: var(--text-cream);
          font-family: "Sora", sans-serif;
          overflow: hidden;
          position: relative;
        }

        #introLayer {
          position: fixed;
          inset: 0;
          z-index: 5;
          transition: opacity 0.9s ease, filter 0.9s ease;
        }
        #scene {
          position: absolute;
          inset: 0;
          display: block;
          width: 100%;
          height: 100%;
        }

        .stage-label {
          position: absolute;
          top: 9%;
          left: 50%;
          transform: translateX(-50%);
          text-align: center;
          z-index: 6;
          pointer-events: none;
        }
        .stage-wordmark {
          font-family: "Fraunces", serif;
          font-weight: 600;
          font-size: clamp(1.8rem, 5vw, 3rem);
          text-shadow: 0 0 40px rgba(242, 184, 75, 0.25);
        }
        .stage-sub {
          margin-top: 10px;
          font-family: "JetBrains Mono", monospace;
          font-size: 0.78rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--accent-teal);
          min-height: 1.3em;
        }

        .skip-btn {
          position: absolute;
          bottom: 34px;
          right: 34px;
          z-index: 25;
          background: transparent;
          border: 1px solid var(--border-glass);
          color: var(--text-dim);
          font-family: "Sora", sans-serif;
          font-size: 0.78rem;
          padding: 9px 16px;
          border-radius: 999px;
          cursor: pointer;
          transition: all 0.25s ease;
          backdrop-filter: blur(6px);
        }
        .skip-btn:hover {
          color: var(--text-cream);
          border-color: var(--accent-teal);
        }

        #loginLayer {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          opacity: 0;
          transform: scale(0.94);
          pointer-events: none;
          transition: opacity 1s ease, transform 1.2s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        #loginLayer.active {
          opacity: 1;
          transform: scale(1);
          pointer-events: auto;
        }
        #loginLayer::before {
          content: "";
          position: absolute;
          inset: 0;
          background: var(--bg-deep);
          z-index: -1;
        }

        .ambient-particles {
          display: none;
        }
        @keyframes lc-drift {
          0% {
            background-position: 0 0, 0 0, 0 0, 0 0, 0 0;
          }
          100% {
            background-position: 40px -60px, -30px 50px, 20px -40px, -50px 30px, 30px 40px;
          }
        }

        .login-card {
          position: relative;
          width: min(400px, 90vw);
          padding: 42px 38px 36px;
          border-radius: 0px;
          background: var(--card-glass);
          border-top: 2px solid var(--border-glass);
          border-left: none;
          border-right: none;
          border-bottom: none;
          backdrop-filter: none;
          box-shadow: none;
        }
        .lang-strip {
          display: flex;
          gap: 6px;
          justify-content: center;
          margin-bottom: 22px;
          font-family: "JetBrains Mono", monospace;
          font-size: 0.68rem;
          color: var(--text-dim);
        }
        .lang-strip span {
          padding: 3px 8px;
          border: 1px solid var(--border-glass);
          border-radius: 999px;
        }
        .lang-strip span.on {
          color: var(--accent-gold);
          border-color: rgba(242, 184, 75, 0.4);
        }
        .brand-row {
          text-align: center;
          margin-bottom: 28px;
        }
        .brand-name {
          font-family: "Fraunces", serif;
          font-weight: 600;
          font-size: 1.7rem;
        }
        .brand-tag {
          margin-top: 6px;
          font-size: 0.85rem;
          color: var(--text-dim);
        }
        .field {
          margin-bottom: 16px;
        }
        .field label {
          display: block;
          font-size: 0.75rem;
          letter-spacing: 0.04em;
          color: var(--text-dim);
          margin-bottom: 6px;
          text-transform: uppercase;
          font-family: "JetBrains Mono", monospace;
        }
        .field input {
          width: 100%;
          padding: 12px 14px;
          background: var(--card-glass);
          border: 1px solid var(--border-glass);
          border-radius: 0px;
          color: var(--text-cream);
          font-family: "Sora", sans-serif;
          font-size: 0.95rem;
          transition: border-color 0.2s ease, background 0.2s ease;
        }
        .field input::placeholder {
          color: rgba(245, 241, 232, 0.3);
        }
        .field input:focus {
          outline: none;
          border-color: var(--accent-teal);
          background: rgba(255, 255, 255, 0.06);
        }
        .row-between {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 4px 0 22px;
          font-size: 0.8rem;
        }
        .row-between a {
          color: var(--accent-teal);
          text-decoration: none;
        }
        .row-between a:hover {
          text-decoration: underline;
        }
        .remember {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-dim);
        }
        .signin-btn {
          width: 100%;
          padding: 13px;
          border: none;
          border-radius: 0px;
          background: #2b2b28;
          color: #f4efe4;
          font-family: "Sora", sans-serif;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.2s ease, background-color 0.15s ease;
        }
        .signin-btn:hover {
          transform: translateY(-1px);
          background: #5a564d;
        }
        .signin-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 22px 0 16px;
          color: var(--text-dim);
          font-size: 0.75rem;
        }
        .divider::before,
        .divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: var(--border-glass);
        }
        .footer-text {
          text-align: center;
          font-size: 0.82rem;
          color: var(--text-dim);
        }
        .footer-text a {
          color: var(--accent-teal);
          text-decoration: none;
          font-weight: 500;
        }
        .footer-text a:hover {
          text-decoration: underline;
        }

        @media (prefers-reduced-motion: reduce) {
          #introLayer {
            display: none;
          }
          #loginLayer {
            opacity: 1;
            transform: none;
            pointer-events: auto;
            transition: none;
          }
        }
      `}</style>
    </>
  );
}