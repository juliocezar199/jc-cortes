"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senha }),
    });

    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setErro("Senha incorreta.");
      setCarregando(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0B1C2C",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          background: "#10283D",
          borderRadius: "20px",
          padding: "36px 28px",
          border: "1px solid rgba(255,255,255,0.08)",
          width: "100%",
          maxWidth: "360px",
        }}
      >
        <h1
          style={{
            color: "#F97316",
            fontSize: "28px",
            fontWeight: "bold",
            margin: "0 0 4px 0",
          }}
        >
          JC Cortes
        </h1>
        <p style={{ color: "#D1D5DB", marginTop: "6px", marginBottom: "28px" }}>
          Digite a senha para entrar
        </p>

        {erro ? (
          <div
            style={{
              marginBottom: "16px",
              padding: "12px 14px",
              borderRadius: "12px",
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.35)",
              color: "#fecaca",
              fontSize: "14px",
            }}
          >
            {erro}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
          <div style={{ display: "grid", gap: "8px" }}>
            <label
              style={{ color: "#FFFFFF", fontSize: "14px", fontWeight: 600 }}
            >
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              autoFocus
              style={{
                width: "100%",
                background: "#0B1C2C",
                color: "#FFFFFF",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "12px",
                padding: "12px 14px",
                outline: "none",
                fontSize: "16px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={carregando || !senha}
            style={{
              background: "#F97316",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "12px",
              padding: "13px 16px",
              fontWeight: "bold",
              fontSize: "15px",
              cursor: carregando || !senha ? "not-allowed" : "pointer",
              opacity: carregando || !senha ? 0.7 : 1,
            }}
          >
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}