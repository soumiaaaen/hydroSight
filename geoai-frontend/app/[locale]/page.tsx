"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import HydroSightLogo from "@/components/HydroSightLogo";
import LogoutButton from "@/components/LogoutButton";
import AdminNavLink from "@/components/AdminNavLink";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTranslations } from "next-intl";
import { logoutAndRedirect } from "@/services/auth";

// ── Animated counter hook ──────────────────────────────────────────────────
function useCounter(end: number, duration = 2000, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setValue(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [end, duration, start]);
  return value;
}

// ── Intersection observer hook ─────────────────────────────────────────────
function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ── Demo Video Component ───────────────────────────────────────────────────
function DemoVideo({ tLiveWatch, tLiveClick }: { tLiveWatch?: string, tLiveClick?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("playing", handlePlay);

    // Try to detect if already playing (autoplays)
    if (!video.paused) {
      setIsPlaying(true);
    }

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("playing", handlePlay);
    };
  }, []);

  const handleTogglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch((err) => {
        console.log("Play failed:", err);
      });
    } else {
      video.pause();
    }
  };

  return (
    <div
      onClick={handleTogglePlay}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        borderRadius: 20,
        overflow: "hidden",
        border: "1px solid rgba(56,189,248,0.15)",
        boxShadow: "0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(56,189,248,0.08)",
        background: "#0a1628",
        position: "relative",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        aspectRatio: "16/9",
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          borderRadius: 20,
        }}
      >
        <source src="/mp_.mp4" type="video/mp4" />
      </video>

      {/* Overlay play button & info */}
      {(!isPlaying || isHovered) && (
        <div style={{
          position: "absolute",
          inset: 0,
          background: isPlaying ? "rgba(4, 8, 15, 0.35)" : "rgba(4, 8, 15, 0.75)",
          backdropFilter: isPlaying ? "none" : "blur(8px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          transition: "all 0.3s ease",
          zIndex: 2,
        }}>
          {/* Pulsing Play/Pause button */}
          <div style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: isPlaying
              ? "0 4px 12px rgba(14,165,233,0.3)"
              : "0 12px 36px rgba(14,165,233,0.5)",
            transform: isHovered ? "scale(1.1)" : "scale(1)",
            transition: "all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          }}>
            {isPlaying ? (
              <div style={{ display: "flex", gap: 6 }}>
                <div style={{ width: 6, height: 24, background: "#fff", borderRadius: 2 }} />
                <div style={{ width: 6, height: 24, background: "#fff", borderRadius: 2 }} />
              </div>
            ) : (
              <div style={{
                width: 0,
                height: 0,
                borderStyle: "solid",
                borderWidth: "12px 0 12px 20px",
                borderColor: "transparent transparent transparent #ffffff",
                marginLeft: 6,
              }} />
            )}
          </div>

          {!isPlaying && (
            <div style={{ textAlign: "center" }}>
              <h4 style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.05em", color: "#fff", marginBottom: 4 }}>
                {tLiveWatch || 'Watch the Platform Walkthrough'}
              </h4>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
                {tLiveClick || 'Click anywhere to play demo video'}
              </p>
            </div>
          )}
        </div>
      )}

      <div style={{
        position: "absolute",
        inset: 0,
        borderRadius: 20,
        pointerEvents: "none",
        boxShadow: "inset 0 0 40px rgba(56,189,248,0.04)",
      }} />
    </div>
  );
}

// ── FAQ Data ───────────────────────────────────────────────────────────────
// FAQs will be fetched from translations using t.raw('faqs')

// ── Main Landing Page ──────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const tNav = useTranslations('Navigation');
  const t = useTranslations('Landing');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { ref: statsRef, inView: statsVisible } = useInView();

  const c1 = useCounter(94, 2200, statsVisible);
  const c2 = useCounter(10, 1800, statsVisible);
  const c3 = useCounter(180, 2000, statsVisible);
  const c4 = useCounter(50, 2400, statsVisible);

  return (
    <main style={{
      minHeight: "100vh", width: "100%",
      background: "#04080f",
      color: "#fff",
      overflowX: "hidden",
      fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif",
    }}>

      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />

      {/* Global styles */}
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; background: #04080f; }
        ::-webkit-scrollbar-thumb { background: rgba(56,189,248,0.3); border-radius: 4px; }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:none} }
        .hero-text { animation: fadeSlideUp 0.9s ease both; }
        .hero-text-2 { animation: fadeSlideUp 0.9s 0.15s ease both; }
        .hero-text-3 { animation: fadeSlideUp 0.9s 0.3s ease both; }
        .hero-cta { animation: fadeSlideUp 0.9s 0.45s ease both; }
        .gradient-text {
          background: linear-gradient(90deg, #38bdf8, #818cf8, #c084fc, #38bdf8);
          background-size: 200% auto;
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 4s linear infinite;
        }
        .card-hover { transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease; }
        .card-hover:hover { transform: translateY(-4px); border-color: rgba(56,189,248,0.3) !important; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
        .btn-primary {
          background: linear-gradient(135deg, #0ea5e9, #6366f1);
          border: none; border-radius: 10px; padding: 14px 32px;
          font-family: inherit; font-size: 14px; font-weight: 600;
          color: #fff; cursor: pointer; letter-spacing: 0.03em;
          box-shadow: 0 8px 24px rgba(14,165,233,0.35);
          transition: all 0.25s ease;
        }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 14px 32px rgba(14,165,233,0.5); }
        .btn-ghost {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.12);
          border-radius: 10px; padding: 14px 32px;
          font-family: inherit; font-size: 14px; font-weight: 500;
          color: rgba(255,255,255,0.75); cursor: pointer;
          transition: all 0.25s ease;
        }
        .btn-ghost:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.25); color: #fff; }
        section { position: relative; }
      `}</style>

      {/* ── NAVBAR ── */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 48px", height: 72,
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(4,8,15,0.85)", backdropFilter: "blur(20px)",
      }}>
        <HydroSightLogo href="/" maxWidth={160} priority />
        <nav style={{ display: "flex", gap: 32, fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
          {["features","how","tech","usecases","pricing","faq"].map(id => (
            <a key={id} href={id === "pricing" ? "/pricing" : `#${id}`} style={{ textDecoration: "none", color: "inherit", transition: "color 0.2s", textTransform: "capitalize" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}
            >{tNav(id)}</a>
          ))}
        </nav>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <LanguageSwitcher />
          <AdminNavLink
            style={{
              textDecoration: "none",
              color: "rgba(255,255,255,0.65)",
              fontSize: 13,
              fontWeight: 500,
            }}
          />
          {isLoggedIn ? (
            <>
              <LogoutButton onClick={() => logoutAndRedirect()} />
              <button onClick={() => router.push("/dashboard")} className="btn-primary" style={{ padding: "8px 20px", fontSize: 13 }}>
                {tNav('dashboard')} →
              </button>
            </>
          ) : (
            <>
              <button onClick={() => router.push("/dashboard")} className="btn-ghost" style={{ padding: "8px 20px", fontSize: 13 }}>
                {tNav('try_free')}
              </button>
              <button onClick={() => router.push("/login")} className="btn-ghost" style={{ padding: "8px 20px", fontSize: 13 }}>{tNav('login')}</button>
              <button onClick={() => router.push("/register")} className="btn-primary" style={{ padding: "8px 20px", fontSize: 13 }}>{tNav('get_started')}</button>
            </>
          )}
        </div>
      </header>

      {/* ── HERO ── */}
      <section style={{ padding: "100px 48px 80px", maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>

        {/* Background blobs */}
        <div style={{ position: "fixed", top: "10%", left: "5%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(14,165,233,0.06) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
        <div style={{ position: "fixed", top: "40%", right: "5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

        {/* Left text */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <div className="hero-text" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.2)", borderRadius: 20, padding: "6px 14px", fontSize: 12, color: "#7dd3fc", letterSpacing: "0.06em", marginBottom: 24 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#38bdf8", animation: "pulse 2s infinite" }} />
            {t('hero_tag')}
          </div>

          <h1 className="hero-text-2" style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: 20 }}>
            {t('hero_title1')}<br />
            <span className="gradient-text">{t('hero_title2')}</span>
          </h1>

          <p className="hero-text-3" style={{ fontSize: 17, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginBottom: 36, maxWidth: 480 }}>
            {t('hero_desc')}
          </p>

          <div className="hero-cta" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 40 }}>
            {isLoggedIn ? (
              <button onClick={() => router.push("/dashboard")} className="btn-primary">{t('cta_dash')}</button>
            ) : (
              <>
                <button onClick={() => router.push("/dashboard")} className="btn-primary">{t('cta_guest')}</button>
                <button onClick={() => router.push("/register")} className="btn-ghost">{t('cta_create')}</button>
                <button onClick={() => router.push("/login")} className="btn-ghost">{t('cta_login')}</button>
              </>
            )}
          </div>

          <div className="hero-cta" style={{ display: "flex", gap: 28 }}>
            {[["94%", t('stat_acc')], ["5 days", t('stat_rev')], ["< 3s", t('stat_spd')]].map(([v, l]) => (
              <div key={l}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#38bdf8" }}>{v}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Video */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <DemoVideo />
          <div style={{ position: "absolute", bottom: -40, left: "10%", right: "10%", height: 80, background: "radial-gradient(ellipse, rgba(56,189,248,0.2) 0%, transparent 70%)", pointerEvents: "none" }} />
        </div>
      </section>

      {/* ── TRUST BAND ── */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)", padding: "20px 48px", display: "flex", alignItems: "center", justifyContent: "center", gap: 48, flexWrap: "wrap" }}>
        {["Google Earth Engine", "Sentinel-2 ESA", "FastAPI", "Next.js", "JWT Security"].map(t => (
          <span key={t} style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", fontWeight: 600, textTransform: "uppercase" }}>{t}</span>
        ))}
      </div>

      {/* ── WHY INVEST ── */}
      <section style={{ padding: "100px 48px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <p style={{ fontSize: 11, color: "#38bdf8", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>{t('inv_tag')}</p>
          <h2 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 16 }}>{t('inv_title1')} <span className="gradient-text">{t('inv_title2')}</span></h2>
          <p style={{ color: "rgba(255,255,255,0.45)", maxWidth: 560, margin: "0 auto", fontSize: 16, lineHeight: 1.7 }}>
            {t('inv_desc')}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 24 }}>
          {([
            { icon: "⚡", accent: "#38bdf8" },
            { icon: "💰", accent: "#22c55e" },
            { icon: "📈", accent: "#a78bfa" },
          ]).map((visual, i) => {
            const card = (t.raw('inv_cards') as any)[i] || { title: "", desc: "" };
            return (
              <div key={i} className="card-hover" style={{ padding: 28, borderRadius: 16, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ fontSize: 28, marginBottom: 16 }}>{visual.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, lineHeight: 1.35 }}>{card.title}</h3>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>{card.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Wide investment highlight */}
        <div style={{
          padding: "40px 48px", borderRadius: 20,
          background: "linear-gradient(135deg, rgba(14,165,233,0.08) 0%, rgba(99,102,241,0.08) 100%)",
          border: "1px solid rgba(99,102,241,0.2)",
          display: "grid", gridTemplateColumns: "1fr auto", gap: 32, alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 11, color: "#818cf8", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>{t('inv_market_tag')}</div>
            <h3 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 12 }}>{t('inv_market_title')}</h3>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, maxWidth: 600 }}>
              {t('inv_market_desc')}
            </p>
          </div>
          <div style={{ textAlign: "center", minWidth: 140 }}>
            <div style={{ fontSize: 48, fontWeight: 800, background: "linear-gradient(135deg, #818cf8, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>26%</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{t('inv_market_cagr')}</div>
          </div>
        </div>
      </section>

      {/* ── IMPACT STATS ── */}
      <section ref={statsRef} style={{ padding: "80px 48px", background: "rgba(255,255,255,0.015)", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0 }}>
          {[
            { value: c1, suffix: "%", label: "Classification Accuracy", color: "#38bdf8" },
            { value: c2, suffix: "m", label: "Spatial Resolution", color: "#22c55e" },
            { value: c3, suffix: "+", label: "Countries Supported", color: "#a78bfa" },
            { value: c4, suffix: "B+", label: "Satellite Pixels / Run", color: "#f59e0b" },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center", padding: "20px 0", borderRight: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
              <div style={{ fontSize: 52, fontWeight: 800, color: s.color, letterSpacing: "-0.04em", lineHeight: 1 }}>
                {s.value}{s.suffix}
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 8 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ padding: "100px 48px", maxWidth: 1200, margin: "0 auto" }}>
        <p style={{ fontSize: 11, color: "#38bdf8", letterSpacing: "0.15em", textTransform: "uppercase", textAlign: "center", marginBottom: 12 }}>{t('cap_tag')}</p>
        <h2 style={{ fontSize: 36, fontWeight: 800, textAlign: "center", letterSpacing: "-0.03em", marginBottom: 12 }}>{t('cap_title')}</h2>
        <p style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", marginBottom: 56, fontSize: 15, lineHeight: 1.7 }}>{t('cap_desc')}</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
          {([
            { icon: "🌿", accent: "#22c55e" },
            { icon: "🏙️", accent: "#f59e0b" },
            { icon: "💧", accent: "#38bdf8" },
            { icon: "🗺️", accent: "#818cf8" },
            { icon: "📊", accent: "#c084fc" },
            { icon: "🔐", accent: "#fb923c" },
          ]).map((visual, i) => {
            const card = (t.raw('feat_cards') as any)[i] || { title: "", desc: "" };
            return (
              <div key={i} className="card-hover" style={{ padding: 24, borderRadius: 16, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${visual.accent}18`, border: `1px solid ${visual.accent}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 16 }}>{visual.icon}</div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{card.title}</h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>{card.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── DEMO SECTION (full) ── */}
      <section style={{ padding: "80px 48px", background: "rgba(255,255,255,0.015)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p style={{ fontSize: 11, color: "#38bdf8", letterSpacing: "0.15em", textTransform: "uppercase", textAlign: "center", marginBottom: 12 }}>{t('live_tag')}</p>
          <h2 style={{ fontSize: 36, fontWeight: 800, textAlign: "center", letterSpacing: "-0.03em", marginBottom: 12 }}>{t('live_title')}</h2>
          <p style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", marginBottom: 48, fontSize: 15 }}>
            {t('live_desc')}
          </p>
          <div style={{ position: "relative" }}>
            <DemoVideo tLiveWatch={t('live_watch')} tLiveClick={t('live_click')} />
            <div style={{ position: "absolute", bottom: -40, left: "10%", right: "10%", height: 80, background: "radial-gradient(ellipse, rgba(56,189,248,0.2) 0%, transparent 70%)", pointerEvents: "none" }} />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" style={{ padding: "100px 48px", maxWidth: 1200, margin: "0 auto" }}>
        <p style={{ fontSize: 11, color: "#38bdf8", letterSpacing: "0.15em", textTransform: "uppercase", textAlign: "center", marginBottom: 12 }}>{t('work_tag')}</p>
        <h2 style={{ fontSize: 36, fontWeight: 800, textAlign: "center", letterSpacing: "-0.03em", marginBottom: 56 }}>{t('work_title')}</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 40, position: "relative" }}>
          <div style={{ position: "absolute", top: 28, left: "17%", right: "17%", height: 1, background: "linear-gradient(90deg, transparent, rgba(56,189,248,0.3), transparent)" }} />
          {([
            { step: "01", color: "#38bdf8" },
            { step: "02", color: "#818cf8" },
            { step: "03", color: "#22c55e" },
          ]).map((visual, i) => {
            const item = (t.raw('work_cards') as any)[i] || { title: "", desc: "" };
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: `${visual.color}15`, border: `1px solid ${visual.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: visual.color, marginBottom: 20, zIndex: 1, fontFamily: "'JetBrains Mono', monospace" }}>{visual.step}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── TECH STACK ── */}
      <section id="tech" style={{ padding: "80px 48px", background: "rgba(255,255,255,0.015)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p style={{ fontSize: 11, color: "#38bdf8", letterSpacing: "0.15em", textTransform: "uppercase", textAlign: "center", marginBottom: 12 }}>{t('tech_tag')}</p>
          <h2 style={{ fontSize: 36, fontWeight: 800, textAlign: "center", letterSpacing: "-0.03em", marginBottom: 48 }}>{t('tech_title')}</h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {([
              { color: "#38bdf8" },
              { color: "#818cf8" },
              { color: "#22c55e" },
            ]).map((visual, i) => {
              const col = (t.raw('tech_cards') as any)[i] || { label: "", items: [] };
              return (
                <div key={i} style={{ padding: 28, borderRadius: 16, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ fontSize: 11, color: visual.color, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, marginBottom: 20 }}>{col.label}</div>
                  <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                    {col.items.map((it: string, j: number) => (
                      <li key={j} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "rgba(255,255,255,0.65)" }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: visual.color, flexShrink: 0 }} />
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── USE CASES ── */}
      <section id="usecases" style={{ padding: "100px 48px", maxWidth: 1200, margin: "0 auto" }}>
        <p style={{ fontSize: 11, color: "#38bdf8", letterSpacing: "0.15em", textTransform: "uppercase", textAlign: "center", marginBottom: 12 }}>{t('use_tag')}</p>
        <h2 style={{ fontSize: 36, fontWeight: 800, textAlign: "center", letterSpacing: "-0.03em", marginBottom: 56 }}>{t('use_title')}</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
          {([
            { icon: "🌱" },
            { icon: "🌊" },
            { icon: "🏛️" },
            { icon: "🔬" },
            { icon: "🌳" },
            { icon: "📈" },
          ]).map((visual, i) => {
            const u = (t.raw('use_cards') as any)[i] || { title: "", desc: "" };
            return (
              <div key={i} className="card-hover" style={{ padding: 24, borderRadius: 16, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ fontSize: 28, marginBottom: 14 }}>{visual.icon}</div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{u.title}</h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>{u.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" style={{ padding: "80px 48px", background: "rgba(255,255,255,0.015)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <p style={{ fontSize: 11, color: "#38bdf8", letterSpacing: "0.15em", textTransform: "uppercase", textAlign: "center", marginBottom: 12 }}>{t('faq_tag')}</p>
          <h2 style={{ fontSize: 36, fontWeight: 800, textAlign: "center", letterSpacing: "-0.03em", marginBottom: 48 }}>{t('faq_title')}</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {((t.raw('faqs') as any[]) || []).map((faq, i) => (
              <div key={i} style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)", overflow: "hidden" }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "18px 22px", textAlign: "left", background: "none", border: "none",
                  color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
                }}>
                  <span>{faq.q}</span>
                  <span style={{ color: "#38bdf8", fontSize: 18, transition: "transform 0.2s", transform: openFaq === i ? "rotate(45deg)" : "none" }}>+</span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: "0 22px 18px", fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.75, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ paddingTop: 14 }}>{faq.a}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section style={{ padding: "100px 48px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center", padding: "72px 48px", borderRadius: 28, background: "linear-gradient(135deg, rgba(14,165,233,0.1) 0%, rgba(99,102,241,0.1) 100%)", border: "1px solid rgba(99,102,241,0.2)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)", width: 400, height: 400, background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 60%)", pointerEvents: "none" }} />
          <p style={{ fontSize: 11, color: "#818cf8", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 16 }}>{t('final_tag')}</p>
          <h2 style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 16, lineHeight: 1.1 }}>
            {t('final_title1')}<br /><span className="gradient-text">{t('final_title2')}</span>
          </h2>
          <p style={{ color: "rgba(255,255,255,0.45)", marginBottom: 40, fontSize: 16, lineHeight: 1.7 }}>
            {t('final_desc')}
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
            {isLoggedIn ? (
              <button onClick={() => router.push("/dashboard")} className="btn-primary" style={{ padding: "16px 40px", fontSize: 15 }}>{t('cta_dash')}</button>
            ) : (
              <>
                <button onClick={() => router.push("/register")} className="btn-primary" style={{ padding: "16px 40px", fontSize: 15 }}>{t('cta_create')} →</button>
                <button onClick={() => router.push("/login")} className="btn-ghost" style={{ padding: "16px 40px", fontSize: 15 }}>{t('cta_login')}</button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "32px 48px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>
            <span>🌍</span> GeoAI Platform
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            {["Features", "Tech", "FAQ"].map(l => (
              <a key={l} href={`#${l.toLowerCase()}`} style={{ textDecoration: "none", color: "inherit", transition: "color 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
              >{l}</a>
            ))}
          </div>
          <div>© {new Date().getFullYear()} — FastAPI · Next.js · Google Earth Engine</div>
        </div>
      </footer>

    </main>
  );
}