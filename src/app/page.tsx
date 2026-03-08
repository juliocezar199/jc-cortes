import Link from "next/link";

export default function Home() {
  return (
    <main
      style={{
        background: "#0B1C2C",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        color: "white",
        fontFamily: "Arial",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "#10283D",
          padding: "40px",
          borderRadius: "16px",
          textAlign: "center",
          width: "100%",
          maxWidth: "400px",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <h1
          style={{
            color: "#F97316",
            fontSize: "32px",
            marginBottom: "10px",
          }}
        >
          JC Cortes
        </h1>

        <p style={{ opacity: 0.8 }}>
          Sistema de controle de produção e cortes
        </p>

        <Link
          href="/dashboard"
          style={{
            marginTop: "30px",
            background: "#F97316",
            border: "none",
            padding: "14px 20px",
            borderRadius: "10px",
            color: "white",
            fontWeight: "bold",
            cursor: "pointer",
            width: "100%",
            display: "inline-block",
            textDecoration: "none",
          }}
        >
          Entrar no sistema
        </Link>
      </div>
    </main>
  );
}