"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase/client";

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

type Recebimento = {
  id: string;
  pedido_id: string;
  valor_recebido: number;
  data_recebimento: string | null;
  forma_pagamento: string | null;
  observacoes: string | null;
  created_at: string;
  pedidos?: {
    numero_mapa: string;
    clientes?: {
      nome: string;
    } | null;
  } | null;
};

type FormData = {
  pedido_id: string;
  valor_recebido: string;
  data_recebimento: string;
  forma_pagamento: string;
  observacoes: string;
};

const initialForm: FormData = {
  pedido_id: "",
  valor_recebido: "",
  data_recebimento: new Date().toISOString().slice(0, 10),
  forma_pagamento: "",
  observacoes: "",
};

export default function FinanceiroPage() {
  const [pedidos, setPedidos] = useState<PedidoFinanceiro[]>([]);
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([]);
  const [form, setForm] = useState<FormData>(initialForm);
  const [loadingPedidos, setLoadingPedidos] = useState(true);
  const [loadingRecebimentos, setLoadingRecebimentos] = useState(true);
  const [saving, setSaving] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [copiandoId, setCopiandoId] = useState<string | null>(null);

  async function carregarPedidosFinanceiro() {
    setLoadingPedidos(true);

    const { data, error } = await supabase
      .from("vw_pedidos_financeiro")
      .select("*")
      .order("data_entrada", { ascending: false });

    if (error) {
      setErro("Erro ao carregar os pedidos do financeiro.");
      setLoadingPedidos(false);
      return;
    }

    setPedidos(((data ?? []) as unknown) as PedidoFinanceiro[]);
    setLoadingPedidos(false);
  }

  async function carregarRecebimentos() {
    setLoadingRecebimentos(true);

    const { data, error } = await supabase
      .from("recebimentos")
      .select(
        `
          id,
          pedido_id,
          valor_recebido,
          data_recebimento,
          forma_pagamento,
          observacoes,
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
      .limit(20);

    if (error) {
      setErro("Erro ao carregar recebimentos.");
      setLoadingRecebimentos(false);
      return;
    }

    setRecebimentos(((data ?? []) as unknown) as Recebimento[]);
    setLoadingRecebimentos(false);
  }

  useEffect(() => {
    async function iniciar() {
      setErro("");
      await carregarPedidosFinanceiro();
      await carregarRecebimentos();
    }

    iniciar();
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

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

  function validarFormulario() {
    if (!form.pedido_id) return "Selecione um pedido.";
    if (!form.valor_recebido || Number(form.valor_recebido) <= 0) {
      return "Informe um valor válido.";
    }
    return "";
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMensagem("");
    setErro("");

    const erroValidacao = validarFormulario();
    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }

    setSaving(true);

    const payload = {
      pedido_id: form.pedido_id,
      valor_recebido: Number(form.valor_recebido),
      data_recebimento: form.data_recebimento || null,
      forma_pagamento: form.forma_pagamento || null,
      observacoes: form.observacoes.trim() || null,
    };

    const { error } = await supabase.from("recebimentos").insert(payload);

    if (error) {
      setErro("Não foi possível registrar o recebimento.");
      setSaving(false);
      return;
    }

    setMensagem("Recebimento registrado com sucesso.");
    setForm(initialForm);

    await carregarPedidosFinanceiro();
    await carregarRecebimentos();

    setSaving(false);
  }

  async function excluirRecebimento(recebimento: Recebimento) {
    setMensagem("");
    setErro("");

    const confirmar = window.confirm(
      `Tem certeza que deseja excluir este recebimento de ${formatarMoeda(
        Number(recebimento.valor_recebido)
      )}?`
    );

    if (!confirmar) return;

    setExcluindoId(recebimento.id);

    const { error } = await supabase
      .from("recebimentos")
      .delete()
      .eq("id", recebimento.id);

    if (error) {
      setErro("Não foi possível excluir o recebimento.");
      setExcluindoId(null);
      return;
    }

    setMensagem("Recebimento excluído com sucesso.");
    await carregarPedidosFinanceiro();
    await carregarRecebimentos();
    setExcluindoId(null);
  }

  async function copiarResumoCobranca(pedidoId: string) {
    setMensagem("");
    setErro("");
    setCopiandoId(pedidoId);

    const { data, error } = await supabase.rpc("fn_resumo_cobranca", {
      p_pedido_id: pedidoId,
    });

    if (error || !data) {
      setErro("Não foi possível gerar o resumo de cobrança.");
      setCopiandoId(null);
      return;
    }

    try {
      await navigator.clipboard.writeText(data as string);
      setMensagem("Resumo de cobrança copiado.");
    } catch {
      setErro("Não foi possível copiar o resumo.");
    } finally {
      setCopiandoId(null);
    }
  }

  function gerarLinkWhatsApp(texto: string) {
    return `https://wa.me/?text=${encodeURIComponent(texto)}`;
  }

  async function abrirWhatsAppComResumo(pedidoId: string) {
    setMensagem("");
    setErro("");

    const { data, error } = await supabase.rpc("fn_resumo_cobranca", {
      p_pedido_id: pedidoId,
    });

    if (error || !data) {
      setErro("Não foi possível gerar o resumo para WhatsApp.");
      return;
    }

    window.open(gerarLinkWhatsApp(data as string), "_blank");
  }

  const totalGeral = pedidos.reduce((acc, pedido) => acc + Number(pedido.total_valor || 0), 0);
  const totalRecebido = pedidos.reduce(
    (acc, pedido) => acc + Number(pedido.total_recebido || 0),
    0
  );
  const totalPendente = pedidos.reduce(
    (acc, pedido) => acc + Number(pedido.saldo_pendente || 0),
    0
  );

  return (
    <main style={{ padding: "20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "20px",
        }}
      >
        <div>
          <h1 style={{ color: "#F97316", fontSize: "32px", margin: 0 }}>
            Financeiro
          </h1>
          <p style={{ color: "#D1D5DB", marginTop: "8px" }}>
            Recebimentos, saldo pendente e resumo de cobrança
          </p>
        </div>
      </div>

      {mensagem ? <div style={sucessoStyle}>{mensagem}</div> : null}
      {erro ? <div style={erroStyle}>{erro}</div> : null}

      <div style={resumoGridStyle}>
        <div style={resumoCardStyle}>
          <p style={resumoLabelStyle}>Total em pedidos</p>
          <strong style={resumoValorStyle}>{formatarMoeda(totalGeral)}</strong>
        </div>

        <div style={resumoCardStyle}>
          <p style={resumoLabelStyle}>Total recebido</p>
          <strong style={resumoValorStyle}>{formatarMoeda(totalRecebido)}</strong>
        </div>

        <div style={resumoCardStyle}>
          <p style={resumoLabelStyle}>Saldo pendente</p>
          <strong style={resumoValorStyle}>{formatarMoeda(totalPendente)}</strong>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={formStyle}>
        <h2 style={{ color: "#F97316", marginTop: 0 }}>Registrar recebimento</h2>

        <div style={fieldStyle}>
          <label style={labelStyle}>Pedido / Mapa *</label>
          <select
            name="pedido_id"
            value={form.pedido_id}
            onChange={handleChange}
            style={inputStyle}
            disabled={loadingPedidos}
          >
            <option value="">Selecione um pedido</option>
            {pedidos.map((pedido) => (
              <option key={pedido.id} value={pedido.id}>
                {`Mapa ${pedido.numero_mapa} - ${pedido.cliente_nome} - Pendente: ${formatarMoeda(
                  Number(pedido.saldo_pendente || 0)
                )}`}
              </option>
            ))}
          </select>
        </div>

        <div style={gridTwo}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Valor recebido *</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              name="valor_recebido"
              value={form.valor_recebido}
              onChange={handleChange}
              placeholder="0,00"
              style={inputStyle}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Data do recebimento</label>
            <input
              type="date"
              name="data_recebimento"
              value={form.data_recebimento}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Forma de pagamento</label>
          <select
            name="forma_pagamento"
            value={form.forma_pagamento}
            onChange={handleChange}
            style={inputStyle}
          >
            <option value="">Selecione</option>
            <option value="Pix">Pix</option>
            <option value="Dinheiro">Dinheiro</option>
            <option value="Transferência">Transferência</option>
            <option value="Boleto">Boleto</option>
            <option value="Outro">Outro</option>
          </select>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Observações</label>
          <textarea
            name="observacoes"
            value={form.observacoes}
            onChange={handleChange}
            placeholder="Ex: pagamento parcial do mapa"
            style={{ ...inputStyle, minHeight: "90px", resize: "vertical" }}
          />
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              ...botaoPrincipal,
              opacity: saving ? 0.7 : 1,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Salvando..." : "Registrar recebimento"}
          </button>
        </div>
      </form>

      <div style={{ marginTop: "22px", display: "grid", gap: "16px" }}>
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0, color: "#F97316" }}>Pedidos no financeiro</h2>

          {loadingPedidos ? (
            <p style={{ color: "#D1D5DB", margin: 0 }}>Carregando pedidos...</p>
          ) : pedidos.length === 0 ? (
            <p style={{ color: "#D1D5DB", margin: 0 }}>Nenhum pedido encontrado.</p>
          ) : (
            <div style={{ display: "grid", gap: "14px" }}>
              {pedidos.map((pedido) => (
                <div key={pedido.id} style={pedidoCardStyle}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <h3 style={{ margin: 0, color: "#FFFFFF", fontSize: "22px" }}>
                        Mapa {pedido.numero_mapa}
                      </h3>
                      <p style={{ color: "#D1D5DB", marginTop: "8px", marginBottom: 0 }}>
                        Cliente: <strong>{pedido.cliente_nome}</strong>
                      </p>
                    </div>

                    <div
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        borderRadius: "999px",
                        padding: "8px 12px",
                        color: corStatus(pedido.status),
                        border: `1px solid ${corStatus(pedido.status)}33`,
                        fontWeight: 700,
                        fontSize: "13px",
                      }}
                    >
                      {traduzirStatus(pedido.status)}
                    </div>
                  </div>

                  <div style={infoGridStyle}>
                    <p style={infoTextStyle}>
                      <strong style={infoStrongStyle}>Data entrada:</strong>{" "}
                      {pedido.data_entrada || "-"}
                    </p>
                    <p style={infoTextStyle}>
                      <strong style={infoStrongStyle}>Data prevista:</strong>{" "}
                      {pedido.data_prevista || "-"}
                    </p>
                    <p style={infoTextStyle}>
                      <strong style={infoStrongStyle}>Total pares:</strong>{" "}
                      {pedido.total_pares || 0}
                    </p>
                    <p style={infoTextStyle}>
                      <strong style={infoStrongStyle}>Valor total:</strong>{" "}
                      {formatarMoeda(Number(pedido.total_valor || 0))}
                    </p>
                    <p style={infoTextStyle}>
                      <strong style={infoStrongStyle}>Recebido:</strong>{" "}
                      {formatarMoeda(Number(pedido.total_recebido || 0))}
                    </p>
                    <p style={infoTextStyle}>
                      <strong style={infoStrongStyle}>Pendente:</strong>{" "}
                      {formatarMoeda(Number(pedido.saldo_pendente || 0))}
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "16px" }}>
                    <button
                      type="button"
                      onClick={() => copiarResumoCobranca(pedido.id)}
                      style={botaoSecundario}
                    >
                      {copiandoId === pedido.id ? "Copiando..." : "Copiar cobrança"}
                    </button>

                    <button
                      type="button"
                      onClick={() => abrirWhatsAppComResumo(pedido.id)}
                      style={botaoWhatsApp}
                    >
                      Enviar no WhatsApp
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={cardStyle}>
          <h2 style={{ marginTop: 0, color: "#F97316" }}>Últimos recebimentos</h2>

          {loadingRecebimentos ? (
            <p style={{ color: "#D1D5DB", margin: 0 }}>Carregando recebimentos...</p>
          ) : recebimentos.length === 0 ? (
            <p style={{ color: "#D1D5DB", margin: 0 }}>
              Nenhum recebimento registrado ainda.
            </p>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              {recebimentos.map((recebimento) => (
                <div key={recebimento.id} style={recebimentoCardStyle}>
                  <strong style={{ color: "#FFFFFF" }}>
                    {formatarMoeda(Number(recebimento.valor_recebido))}
                  </strong>
                  <p style={recebimentoTextStyle}>
                    Cliente: {recebimento.pedidos?.clientes?.nome ?? "-"}
                  </p>
                  <p style={recebimentoTextStyle}>
                    Mapa: {recebimento.pedidos?.numero_mapa ?? "-"}
                  </p>
                  <p style={recebimentoTextStyle}>
                    Data: {recebimento.data_recebimento || "-"}
                  </p>
                  <p style={recebimentoTextStyle}>
                    Forma: {recebimento.forma_pagamento || "-"}
                  </p>
                  <p style={recebimentoTextStyle}>
                    Observações: {recebimento.observacoes || "-"}
                  </p>

                  <div style={{ marginTop: "12px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => excluirRecebimento(recebimento)}
                      disabled={excluindoId === recebimento.id}
                      style={{
                        ...botaoExcluir,
                        opacity: excluindoId === recebimento.id ? 0.7 : 1,
                        cursor: excluindoId === recebimento.id ? "not-allowed" : "pointer",
                      }}
                    >
                      {excluindoId === recebimento.id ? "Excluindo..." : "Excluir recebimento"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

const botaoPrincipal: React.CSSProperties = {
  background: "#F97316",
  color: "#FFFFFF",
  border: "none",
  borderRadius: "12px",
  padding: "12px 16px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botaoSecundario: React.CSSProperties = {
  background: "transparent",
  color: "#F97316",
  border: "1px solid #F97316",
  borderRadius: "12px",
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: 700,
};

const botaoWhatsApp: React.CSSProperties = {
  background: "transparent",
  color: "#22C55E",
  border: "1px solid rgba(34,197,94,0.45)",
  borderRadius: "12px",
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: 700,
};

const botaoExcluir: React.CSSProperties = {
  background: "transparent",
  color: "#EF4444",
  border: "1px solid rgba(239,68,68,0.45)",
  borderRadius: "12px",
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: 700,
};

const sucessoStyle: React.CSSProperties = {
  marginBottom: "16px",
  padding: "12px 14px",
  borderRadius: "12px",
  background: "rgba(34,197,94,0.12)",
  border: "1px solid rgba(34,197,94,0.35)",
  color: "#bbf7d0",
};

const erroStyle: React.CSSProperties = {
  marginBottom: "16px",
  padding: "12px 14px",
  borderRadius: "12px",
  background: "rgba(239,68,68,0.12)",
  border: "1px solid rgba(239,68,68,0.35)",
  color: "#fecaca",
};

const resumoGridStyle: React.CSSProperties = {
  display: "grid",
  gap: "16px",
  marginBottom: "20px",
};

const resumoCardStyle: React.CSSProperties = {
  background: "#10283D",
  borderRadius: "16px",
  padding: "18px",
  border: "1px solid rgba(255,255,255,0.08)",
};

const resumoLabelStyle: React.CSSProperties = {
  margin: 0,
  color: "#D1D5DB",
  fontSize: "14px",
};

const resumoValorStyle: React.CSSProperties = {
  color: "#FFFFFF",
  fontSize: "28px",
};

const formStyle: React.CSSProperties = {
  background: "#10283D",
  borderRadius: "16px",
  padding: "18px",
  border: "1px solid rgba(255,255,255,0.08)",
  display: "grid",
  gap: "16px",
};

const fieldStyle: React.CSSProperties = {
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

const gridTwo: React.CSSProperties = {
  display: "grid",
  gap: "14px",
};

const cardStyle: React.CSSProperties = {
  background: "#10283D",
  borderRadius: "16px",
  padding: "18px",
  border: "1px solid rgba(255,255,255,0.08)",
};

const pedidoCardStyle: React.CSSProperties = {
  background: "#0B1C2C",
  borderRadius: "14px",
  padding: "16px",
  border: "1px solid rgba(255,255,255,0.06)",
};

const infoGridStyle: React.CSSProperties = {
  display: "grid",
  gap: "8px",
  marginTop: "16px",
};

const infoTextStyle: React.CSSProperties = {
  margin: 0,
  color: "#D1D5DB",
};

const infoStrongStyle: React.CSSProperties = {
  color: "#FFFFFF",
};

const recebimentoCardStyle: React.CSSProperties = {
  background: "#0B1C2C",
  borderRadius: "12px",
  padding: "14px",
  border: "1px solid rgba(255,255,255,0.06)",
};

const recebimentoTextStyle: React.CSSProperties = {
  color: "#D1D5DB",
  margin: "6px 0 0 0",
};