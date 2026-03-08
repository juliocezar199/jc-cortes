"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase/client";

type PedidoDashboard = {
  id: string;
  numero_mapa: string;
  cliente_id: string;
  data_entrada: string | null;
  data_prevista: string | null;
  status: "aguardando" | "em_corte" | "finalizado" | "entregue";
  total_pares: number;
  total_valor: number;
  total_pares_cortados: number;
  total_pares_restantes: number;
  created_at: string;
  clientes?: {
    nome: string;
  } | null;
};

type Recebimento = {
  id: string;
  pedido_id: string;
  valor_recebido: number;
  data_recebimento: string | null;
  forma_pagamento: string | null;
  created_at: string;
  pedidos?: {
    numero_mapa: string;
    clientes?: {
      nome: string;
    } | null;
  } | null;
};

type Baixa = {
  id: string;
  pedido_id: string;
  pedido_item_id: string;
  quantidade_cortada: number;
  data_baixa: string;
  created_at: string;
  pedidos?: {
    numero_mapa: string;
    clientes?: {
      nome: string;
    } | null;
  } | null;
};

type PedidoFinanceiro = {
  id: string;
  numero_mapa: string;
  cliente_id: string;
  cliente_nome: string;
  data_entrada: string | null;
  data_prevista: string | null;
  status: string;
  total_pares: number;
  total_valor: number;
  total_recebido: number;
  saldo_pendente: number;
};

type FiltroPeriodo = "hoje" | "7dias" | "30dias" | "todos";
type FiltroStatus = "todos" | "aguardando" | "em_corte" | "finalizado" | "entregue";

export default function DashboardPage() {
  const router = useRouter();

  const [pedidos, setPedidos] = useState<PedidoDashboard[]>([]);
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([]);
  const [baixas, setBaixas] = useState<Baixa[]>([]);
  const [financeiro, setFinanceiro] = useState<PedidoFinanceiro[]>([]);

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const [filtroPeriodo, setFiltroPeriodo] = useState<FiltroPeriodo>("30dias");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");
  const [isMobile, setIsMobile] = useState(false);

  async function carregarDashboard() {
    setLoading(true);
    setErro("");

    try {
      const [pedidosRes, recebimentosRes, baixasRes, financeiroRes] = await Promise.all([
        supabase
          .from("pedidos")
          .select(
            `
              id,
              numero_mapa,
              cliente_id,
              data_entrada,
              data_prevista,
              status,
              total_pares,
              total_valor,
              total_pares_cortados,
              total_pares_restantes,
              created_at,
              clientes (
                nome
              )
            `
          )
          .order("created_at", { ascending: false }),

        supabase
          .from("recebimentos")
          .select(
            `
              id,
              pedido_id,
              valor_recebido,
              data_recebimento,
              forma_pagamento,
              created_at,
              pedidos (
                numero_mapa,
                clientes (
                  nome
                )
              )
            `
          )
          .order("created_at", { ascending: false })
          .limit(20),

        supabase
          .from("baixas_corte")
          .select(
            `
              id,
              pedido_id,
              pedido_item_id,
              quantidade_cortada,
              data_baixa,
              created_at,
              pedidos (
                numero_mapa,
                clientes (
                  nome
                )
              )
            `
          )
          .order("created_at", { ascending: false })
          .limit(50),

        supabase
          .from("vw_pedidos_financeiro")
          .select("*")
          .order("data_entrada", { ascending: false }),
      ]);

      if (pedidosRes.error) throw pedidosRes.error;
      if (recebimentosRes.error) throw recebimentosRes.error;
      if (baixasRes.error) throw baixasRes.error;
      if (financeiroRes.error) throw financeiroRes.error;

      setPedidos((pedidosRes.data as PedidoDashboard[]) ?? []);
      setRecebimentos((recebimentosRes.data as Recebimento[]) ?? []);
      setBaixas((baixasRes.data as Baixa[]) ?? []);
      setFinanceiro((financeiroRes.data as PedidoFinanceiro[]) ?? []);
    } catch (e) {
      console.error(e);
      setErro("Não foi possível carregar o dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarDashboard();
  }, []);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 768);
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  function inicioPeriodo(periodo: FiltroPeriodo) {
    const hoje = new Date();
    const base = new Date(hoje);

    if (periodo === "hoje") {
      base.setHours(0, 0, 0, 0);
      return base;
    }

    if (periodo === "7dias") {
      base.setDate(base.getDate() - 7);
      return base;
    }

    if (periodo === "30dias") {
      base.setDate(base.getDate() - 30);
      return base;
    }

    return null;
  }

  const pedidosFiltrados = useMemo(() => {
    const inicio = inicioPeriodo(filtroPeriodo);

    return pedidos.filter((pedido) => {
      const dataBase = pedido.created_at ? new Date(pedido.created_at) : null;

      const passouPeriodo = inicio ? (dataBase ? dataBase >= inicio : false) : true;
      const passouStatus = filtroStatus === "todos" ? true : pedido.status === filtroStatus;

      return passouPeriodo && passouStatus;
    });
  }, [pedidos, filtroPeriodo, filtroStatus]);

  const financeiroFiltrado = useMemo(() => {
    const ids = new Set(pedidosFiltrados.map((p) => p.id));
    return financeiro.filter((item) => ids.has(item.id));
  }, [financeiro, pedidosFiltrados]);

  const recebimentosFiltrados = useMemo(() => {
    const ids = new Set(pedidosFiltrados.map((p) => p.id));
    return recebimentos.filter((item) => ids.has(item.pedido_id));
  }, [recebimentos, pedidosFiltrados]);

  const pedidosAtrasados = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return pedidosFiltrados.filter((pedido) => {
      if (!pedido.data_prevista) return false;
      if (pedido.status === "finalizado" || pedido.status === "entregue") return false;

      const prevista = new Date(`${pedido.data_prevista}T00:00:00`);
      return prevista < hoje;
    });
  }, [pedidosFiltrados]);

  const paresCortadosHoje = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    return baixas
      .filter((item) => item.data_baixa === hoje)
      .reduce((acc, item) => acc + Number(item.quantidade_cortada || 0), 0);
  }, [baixas]);

  const faturamentoPeriodo = useMemo(() => {
    return financeiroFiltrado.reduce((acc, item) => acc + Number(item.total_valor || 0), 0);
  }, [financeiroFiltrado]);

  const recebidoPeriodo = useMemo(() => {
    return financeiroFiltrado.reduce((acc, item) => acc + Number(item.total_recebido || 0), 0);
  }, [financeiroFiltrado]);

  const pendentePeriodo = useMemo(() => {
    return financeiroFiltrado.reduce((acc, item) => acc + Number(item.saldo_pendente || 0), 0);
  }, [financeiroFiltrado]);

  const pedidosEmAndamento = useMemo(() => {
    return pedidosFiltrados.filter(
      (pedido) => pedido.status === "aguardando" || pedido.status === "em_corte"
    ).length;
  }, [pedidosFiltrados]);

  const pedidosFinalizados = useMemo(() => {
    return pedidosFiltrados.filter(
      (pedido) => pedido.status === "finalizado" || pedido.status === "entregue"
    ).length;
  }, [pedidosFiltrados]);

  const graficoStatus = useMemo(() => {
    return [
      {
        label: "Aguardando",
        valor: pedidosFiltrados.filter((p) => p.status === "aguardando").length,
      },
      {
        label: "Em corte",
        valor: pedidosFiltrados.filter((p) => p.status === "em_corte").length,
      },
      {
        label: "Finalizado",
        valor: pedidosFiltrados.filter((p) => p.status === "finalizado").length,
      },
      {
        label: "Entregue",
        valor: pedidosFiltrados.filter((p) => p.status === "entregue").length,
      },
    ];
  }, [pedidosFiltrados]);

  const maiorBarra = Math.max(...graficoStatus.map((item) => item.valor), 1);

  function formatarMoeda(valor: number) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function traduzirStatus(status: string) {
    if (status === "aguardando") return "Aguardando";
    if (status === "em_corte") return "Em corte";
    if (status === "finalizado") return "Finalizado";
    if (status === "entregue") return "Entregue";
    return status;
  }

  function corStatus(status: string) {
    if (status === "aguardando") return "#9CA3AF";
    if (status === "em_corte") return "#F97316";
    if (status === "finalizado") return "#22C55E";
    if (status === "entregue") return "#38BDF8";
    return "#FFFFFF";
  }

  function irPara(href: string) {
    router.push(href);
  }

  return (
    <main style={{ padding: "20px" }}>
      <div style={topoStyle}>
        <div>
          <h1 style={{ color: "#F97316", fontSize: "32px", margin: 0 }}>Dashboard</h1>
          <p style={{ color: "#D1D5DB", marginTop: "8px" }}>
            Visão geral da produção e do financeiro
          </p>
        </div>

        <button type="button" onClick={carregarDashboard} style={botaoAtualizarStyle}>
          Atualizar
        </button>
      </div>

      {erro ? <div style={erroStyle}>{erro}</div> : null}

      <div style={filtrosCardStyle}>
        <div style={filtroGrupoStyle}>
          <label style={labelStyle}>Período</label>
          <select
            value={filtroPeriodo}
            onChange={(e) => setFiltroPeriodo(e.target.value as FiltroPeriodo)}
            style={inputStyle}
          >
            <option value="hoje">Hoje</option>
            <option value="7dias">Últimos 7 dias</option>
            <option value="30dias">Últimos 30 dias</option>
            <option value="todos">Todos</option>
          </select>
        </div>

        <div style={filtroGrupoStyle}>
          <label style={labelStyle}>Status</label>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value as FiltroStatus)}
            style={inputStyle}
          >
            <option value="todos">Todos</option>
            <option value="aguardando">Aguardando</option>
            <option value="em_corte">Em corte</option>
            <option value="finalizado">Finalizado</option>
            <option value="entregue">Entregue</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={cardStyle}>
          <p style={{ color: "#D1D5DB", margin: 0 }}>Carregando dashboard...</p>
        </div>
      ) : (
        <>
          <div
            style={{
              ...cardsGridStyle,
              gridTemplateColumns: isMobile
                ? "repeat(2, minmax(0, 1fr))"
                : "repeat(3, minmax(0, 1fr))",
            }}
          >
            <button type="button" onClick={() => irPara("/dashboard/baixas")} style={cardBotaoStyle}>
              <p style={cardLabelStyle}>Pares cortados hoje</p>
              <strong style={cardValorStyle}>{paresCortadosHoje}</strong>
              <span style={cardLinkStyle}>Abrir baixas →</span>
            </button>

            <button
              type="button"
              onClick={() => irPara("/dashboard/pedidos")}
              style={cardBotaoStyle}
            >
              <p style={cardLabelStyle}>Pedidos em andamento</p>
              <strong style={cardValorStyle}>{pedidosEmAndamento}</strong>
              <span style={cardLinkStyle}>Abrir pedidos →</span>
            </button>

            <button
              type="button"
              onClick={() => irPara("/dashboard/pedidos")}
              style={cardBotaoStyle}
            >
              <p style={cardLabelStyle}>Pedidos finalizados</p>
              <strong style={cardValorStyle}>{pedidosFinalizados}</strong>
              <span style={cardLinkStyle}>Ver pedidos →</span>
            </button>

            <button
              type="button"
              onClick={() => irPara("/dashboard/financeiro")}
              style={cardBotaoStyle}
            >
              <p style={cardLabelStyle}>Faturamento do período</p>
              <strong style={cardValorStyle}>{formatarMoeda(faturamentoPeriodo)}</strong>
              <span style={cardLinkStyle}>Abrir financeiro →</span>
            </button>

            <button
              type="button"
              onClick={() => irPara("/dashboard/financeiro")}
              style={cardBotaoStyle}
            >
              <p style={cardLabelStyle}>Recebido no período</p>
              <strong style={cardValorStyle}>{formatarMoeda(recebidoPeriodo)}</strong>
              <span style={cardLinkStyle}>Ver recebimentos →</span>
            </button>

            <button
              type="button"
              onClick={() => irPara("/dashboard/financeiro")}
              style={cardBotaoStyle}
            >
              <p style={cardLabelStyle}>Saldo pendente</p>
              <strong style={cardValorStyle}>{formatarMoeda(pendentePeriodo)}</strong>
              <span style={cardLinkStyle}>Cobranças →</span>
            </button>
          </div>

          <div
            style={{
              ...duasColunasStyle,
              gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
            }}
          >
            <div style={cardStyle}>
              <div style={cardHeaderStyle}>
                <h2 style={cardTituloStyle}>Produção por status</h2>
                <Link href="/dashboard/pedidos" style={linkHeaderStyle}>
                  Ver pedidos
                </Link>
              </div>

              <div style={{ display: "grid", gap: "14px" }}>
                {graficoStatus.map((item) => (
                  <div key={item.label}>
                    <div style={graficoTopoStyle}>
                      <span style={{ color: "#D1D5DB" }}>{item.label}</span>
                      <strong style={{ color: "#FFFFFF" }}>{item.valor}</strong>
                    </div>

                    <div style={barraFundoStyle}>
                      <div
                        style={{
                          ...barraValorStyle,
                          width: `${(item.valor / maiorBarra) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={cardStyle}>
              <div style={cardHeaderStyle}>
                <h2 style={cardTituloStyle}>Pedidos atrasados</h2>
                <Link href="/dashboard/pedidos" style={linkHeaderStyle}>
                  Abrir pedidos
                </Link>
              </div>

              {pedidosAtrasados.length === 0 ? (
                <p style={{ color: "#D1D5DB", margin: 0 }}>Nenhum pedido atrasado.</p>
              ) : (
                <div style={{ display: "grid", gap: "12px" }}>
                  {pedidosAtrasados.slice(0, 6).map((pedido) => (
                    <button
                      key={pedido.id}
                      type="button"
                      onClick={() => irPara("/dashboard/pedidos")}
                      style={listaBotaoStyle}
                    >
                      <div>
                        <strong style={{ color: "#FFFFFF" }}>
                          Mapa {pedido.numero_mapa}
                        </strong>
                        <p style={listaTextoStyle}>
                          Cliente: {pedido.clientes?.nome ?? "-"}
                        </p>
                        <p style={listaTextoStyle}>
                          Prevista: {pedido.data_prevista || "-"}
                        </p>
                      </div>

                      <span
                        style={{
                          ...statusBadgeStyle,
                          color: corStatus(pedido.status),
                          borderColor: `${corStatus(pedido.status)}55`,
                        }}
                      >
                        {traduzirStatus(pedido.status)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              ...duasColunasStyle,
              gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
            }}
          >
            <div style={cardStyle}>
              <div style={cardHeaderStyle}>
                <h2 style={cardTituloStyle}>Últimos pedidos</h2>
                <Link href="/dashboard/pedidos" style={linkHeaderStyle}>
                  Ver todos
                </Link>
              </div>

              {pedidosFiltrados.length === 0 ? (
                <p style={{ color: "#D1D5DB", margin: 0 }}>Nenhum pedido encontrado.</p>
              ) : (
                <div style={{ display: "grid", gap: "12px" }}>
                  {pedidosFiltrados.slice(0, 6).map((pedido) => (
                    <button
                      key={pedido.id}
                      type="button"
                      onClick={() => irPara("/dashboard/pedidos")}
                      style={listaBotaoStyle}
                    >
                      <div>
                        <strong style={{ color: "#FFFFFF" }}>
                          Mapa {pedido.numero_mapa}
                        </strong>
                        <p style={listaTextoStyle}>
                          Cliente: {pedido.clientes?.nome ?? "-"}
                        </p>
                        <p style={listaTextoStyle}>
                          Pares: {pedido.total_pares || 0} | Restantes:{" "}
                          {pedido.total_pares_restantes || 0}
                        </p>
                        <p style={listaTextoStyle}>
                          Total: {formatarMoeda(Number(pedido.total_valor || 0))}
                        </p>
                      </div>

                      <span
                        style={{
                          ...statusBadgeStyle,
                          color: corStatus(pedido.status),
                          borderColor: `${corStatus(pedido.status)}55`,
                        }}
                      >
                        {traduzirStatus(pedido.status)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={cardStyle}>
              <div style={cardHeaderStyle}>
                <h2 style={cardTituloStyle}>Últimos recebimentos</h2>
                <Link href="/dashboard/financeiro" style={linkHeaderStyle}>
                  Ver financeiro
                </Link>
              </div>

              {recebimentosFiltrados.length === 0 ? (
                <p style={{ color: "#D1D5DB", margin: 0 }}>
                  Nenhum recebimento encontrado.
                </p>
              ) : (
                <div style={{ display: "grid", gap: "12px" }}>
                  {recebimentosFiltrados.slice(0, 6).map((recebimento) => (
                    <button
                      key={recebimento.id}
                      type="button"
                      onClick={() => irPara("/dashboard/financeiro")}
                      style={listaBotaoStyle}
                    >
                      <div>
                        <strong style={{ color: "#FFFFFF" }}>
                          {formatarMoeda(Number(recebimento.valor_recebido || 0))}
                        </strong>
                        <p style={listaTextoStyle}>
                          Cliente: {recebimento.pedidos?.clientes?.nome ?? "-"}
                        </p>
                        <p style={listaTextoStyle}>
                          Mapa: {recebimento.pedidos?.numero_mapa ?? "-"}
                        </p>
                        <p style={listaTextoStyle}>
                          Forma: {recebimento.forma_pagamento || "-"}
                        </p>
                      </div>

                      <span style={miniDataStyle}>
                        {recebimento.data_recebimento || "-"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}

const topoStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
  marginBottom: "20px",
};

const botaoAtualizarStyle: React.CSSProperties = {
  background: "#F97316",
  color: "#FFFFFF",
  border: "none",
  borderRadius: "12px",
  padding: "12px 16px",
  fontWeight: 700,
  cursor: "pointer",
};

const erroStyle: React.CSSProperties = {
  marginBottom: "16px",
  padding: "12px 14px",
  borderRadius: "12px",
  background: "rgba(239,68,68,0.12)",
  border: "1px solid rgba(239,68,68,0.35)",
  color: "#fecaca",
};

const filtrosCardStyle: React.CSSProperties = {
  background: "#10283D",
  borderRadius: "16px",
  padding: "18px",
  border: "1px solid rgba(255,255,255,0.08)",
  display: "grid",
  gap: "14px",
  marginBottom: "20px",
};

const filtroGrupoStyle: React.CSSProperties = {
  display: "grid",
  gap: "8px",
};

const labelStyle: React.CSSProperties = {
  color: "#FFFFFF",
  fontSize: "14px",
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#0B1C2C",
  color: "#FFFFFF",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "12px",
  padding: "12px 14px",
  outline: "none",
  fontSize: "14px",
};

const cardsGridStyle: React.CSSProperties = {
  display: "grid",
  gap: "12px",
  marginBottom: "20px",
};

const cardBotaoStyle: React.CSSProperties = {
  background: "#10283D",
  borderRadius: "16px",
  padding: "16px",
  border: "1px solid rgba(255,255,255,0.08)",
  cursor: "pointer",
  textAlign: "left",
  display: "grid",
  gap: "6px",
  minHeight: "130px",
};

const cardLabelStyle: React.CSSProperties = {
  margin: 0,
  color: "#D1D5DB",
  fontSize: "13px",
};

const cardValorStyle: React.CSSProperties = {
  color: "#FFFFFF",
  fontSize: "20px",
  lineHeight: 1.2,
};

const cardLinkStyle: React.CSSProperties = {
  color: "#F97316",
  fontWeight: 700,
  fontSize: "13px",
};

const duasColunasStyle: React.CSSProperties = {
  display: "grid",
  gap: "16px",
  marginBottom: "20px",
};

const cardStyle: React.CSSProperties = {
  background: "#10283D",
  borderRadius: "16px",
  padding: "18px",
  border: "1px solid rgba(255,255,255,0.08)",
};

const cardHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
  marginBottom: "14px",
};

const cardTituloStyle: React.CSSProperties = {
  margin: 0,
  color: "#F97316",
};

const linkHeaderStyle: React.CSSProperties = {
  color: "#F97316",
  textDecoration: "none",
  fontWeight: 700,
};

const graficoTopoStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  marginBottom: "6px",
};

const barraFundoStyle: React.CSSProperties = {
  width: "100%",
  height: "12px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.08)",
  overflow: "hidden",
};

const barraValorStyle: React.CSSProperties = {
  height: "100%",
  borderRadius: "999px",
  background: "#F97316",
};

const listaBotaoStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  flexWrap: "wrap",
  background: "#0B1C2C",
  borderRadius: "12px",
  padding: "14px",
  border: "1px solid rgba(255,255,255,0.06)",
  cursor: "pointer",
  textAlign: "left",
};

const listaTextoStyle: React.CSSProperties = {
  color: "#D1D5DB",
  margin: "6px 0 0 0",
};

const statusBadgeStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "999px",
  padding: "8px 12px",
  fontWeight: 700,
  fontSize: "13px",
};

const miniDataStyle: React.CSSProperties = {
  color: "#D1D5DB",
  fontSize: "13px",
  fontWeight: 700,
};