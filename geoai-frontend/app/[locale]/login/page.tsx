"use client";

import { useState } from "react";
import { login } from "@/services/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await login(email, password);
      console.log("Login result:", data);
      window.location.href = "/dashboard";
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>HydroSight</h1>
        <p style={styles.subtitle}>Connectez-vous à votre espace</p>

        <div style={styles.form}>
          <label style={styles.label}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@example.com"
            style={styles.input}
          />

          <label style={styles.label}>Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={styles.input}
          />

          {error && <p style={styles.error}>{error}</p>}

          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            style={styles.btn}
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </div>

        <p style={styles.footer}>
          Pas encore de compte ?{" "}
          <a href="/register" style={styles.link}>
            Créer un compte
          </a>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--background, #0b1120)",
    fontFamily: "sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    padding: "40px 36px",
    borderRadius: "16px",
    background: "var(--panel-bg, #111827)",
    border: "1px solid var(--border-color, #1f2937)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
  },
  title: {
    margin: "0 0 6px 0",
    fontSize: "28px",
    fontWeight: "800",
    color: "var(--accent-primary, #00C9B1)",
    textAlign: "center",
  },
  subtitle: {
    margin: "0 0 32px 0",
    fontSize: "14px",
    color: "var(--text-muted, #9ca3af)",
    textAlign: "center",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  label: {
    fontSize: "12px",
    fontWeight: "600",
    color: "var(--text-muted, #9ca3af)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    marginBottom: "-8px",
  },
  input: {
    padding: "12px 14px",
    borderRadius: "8px",
    border: "1px solid var(--border-color, #1f2937)",
    background: "var(--background, #0b1120)",
    color: "var(--foreground, #f9fafb)",
    fontSize: "14px",
    outline: "none",
    fontFamily: "inherit",
  },
  error: {
    margin: 0,
    padding: "10px 14px",
    borderRadius: "6px",
    background: "rgba(239,68,68,0.12)",
    border: "1px solid #ef4444",
    color: "#ef4444",
    fontSize: "13px",
  },
  btn: {
    marginTop: "8px",
    padding: "14px",
    borderRadius: "10px",
    border: "none",
    background: "var(--btn-gradient, linear-gradient(135deg,#00C9B1,#0284c7))",
    color: "var(--btn-text, #0b1120)",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "opacity 0.2s",
  },
  footer: {
    marginTop: "24px",
    textAlign: "center",
    fontSize: "13px",
    color: "var(--text-muted, #9ca3af)",
  },
  link: {
    color: "var(--accent-primary, #00C9B1)",
    textDecoration: "none",
    fontWeight: "600",
  },
};