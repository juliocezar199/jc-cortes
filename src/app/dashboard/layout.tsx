"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const menuItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/clientes", label: "Clientes" },
  { href: "/dashboard/pedidos", label: "Pedidos" },
  { href: "/dashboard/baixas", label: "Baixas" },
  { href: "/dashboard/financeiro", label: "Financeiro" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function verificarTela() {
      setIsMobile(window.innerWidth <= 768);
    }

    verificarTela();
    window.addEventListener("resize", verificarTela);

    return () => {
      window.removeEventListener("resize", verificarTela);
    };
  }, []);

  useEffect(() => {
    setMenuAberto(false);
  }, [pathname]);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0B1C2C",
        color: "#FFFFFF",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "#10283D",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          padding: "14px 16px",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            {isMobile ? (
              <button
                type="button"
                onClick={() => setMenuAberto(true)}
                style={botaoMenuStyle}
                aria-label="Abrir menu"
              >
                ☰
              </button>
            ) : null}

            <Link
              href="/dashboard"
              style={{
                textDecoration: "none",
                color: "#F97316",
                fontWeight: "bold",
                fontSize: "22px",
              }}
            >
              JC Cortes
            </Link>
          </div>

          {!isMobile ? (
            <nav
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                justifyContent: "flex-end",
              }}
            >
              {menuItems.map((item) => {
                const ativo = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      textDecoration: "none",
                      color: ativo ? "#FFFFFF" : "#D1D5DB",
                      fontSize: "14px",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      background: ativo ? "#F97316" : "rgba(255,255,255,0.04)",
                      border: ativo
                        ? "1px solid #F97316"
                        : "1px solid rgba(255,255,255,0.06)",
                      fontWeight: ativo ? 700 : 500,
                      transition: "all 0.2s ease",
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          ) : (
            <div style={{ width: "40px" }} />
          )}
        </div>
      </header>

      {isMobile && menuAberto ? (
        <>
          <div
            onClick={() => setMenuAberto(false)}
            style={overlayStyle}
          />

          <aside style={mobileMenuStyle}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "18px",
              }}
            >
              <strong
                style={{
                  color: "#F97316",
                  fontSize: "22px",
                }}
              >
                JC Cortes
              </strong>

              <button
                type="button"
                onClick={() => setMenuAberto(false)}
                style={botaoFecharStyle}
                aria-label="Fechar menu"
              >
                ✕
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gap: "10px",
              }}
            >
              {menuItems.map((item) => {
                const ativo = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      textDecoration: "none",
                      color: ativo ? "#FFFFFF" : "#D1D5DB",
                      fontSize: "15px",
                      padding: "14px 14px",
                      borderRadius: "12px",
                      background: ativo ? "#F97316" : "rgba(255,255,255,0.04)",
                      border: ativo
                        ? "1px solid #F97316"
                        : "1px solid rgba(255,255,255,0.06)",
                      fontWeight: ativo ? 700 : 500,
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </aside>
        </>
      ) : null}

      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 0 24px 0",
        }}
      >
        {children}
      </div>
    </div>
  );
}

const botaoMenuStyle: React.CSSProperties = {
  width: "40px",
  height: "40px",
  borderRadius: "10px",
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.04)",
  color: "#FFFFFF",
  fontSize: "20px",
  cursor: "pointer",
};

const botaoFecharStyle: React.CSSProperties = {
  width: "40px",
  height: "40px",
  borderRadius: "10px",
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.04)",
  color: "#FFFFFF",
  fontSize: "18px",
  cursor: "pointer",
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  zIndex: 48,
};

const mobileMenuStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "280px",
  maxWidth: "85vw",
  height: "100vh",
  background: "#10283D",
  borderRight: "1px solid rgba(255,255,255,0.08)",
  padding: "18px",
  zIndex: 50,
  boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
  overflowY: "auto",
};