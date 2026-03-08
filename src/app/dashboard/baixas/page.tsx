"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase/client";

type Pedido = {
  id: string;
  numero_mapa: string;
  cliente_id: string;
  status: string;
  clientes?: {
    nome: string;
  } | null;
};

type PedidoItem = {
  id: string;
  pedido_id: string;
  modelo: string;
  quantidade_pares: number;
  valor_por_par: number;
  valor_total_item: number;
  pares_cortados: number;
  pares_restantes: number;
  status_item: string;
};

type Baixa = {
  id: string;
  pedido_id: string;
  pedido_item_id: string;
  quantidade_cortada: number;
  data_baixa: string;
  observacoes: string | null;
  created_at: string;
  pedidos?: {
    numero_mapa: string;
    clientes?: {
      nome: string;
    } | null;
  } | null;
  pedido_itens?: {
    modelo: string;
  } | null;
};

type FormData = {
  pedido_id: string;
  pedido_item_id: string;
  quantidade_cortada: string;
  data_baixa: string;
  observacoes: string;
};

const initialForm: FormData = {
  pedido_id: "",
  pedido_item_id: "",
  quantidade_cortada: "",
  data_baixa: new Date().toISOString().slice(0, 10),
  observacoes: "",
};

export default function BaixasPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pedidoItens, setPedidoItens] = useState<PedidoItem[]>([]);
  const [baixas, setBaixas] = useState<Baixa[]>([]);
  const [form, setForm] = useState<FormData>(initialForm);
  const [loadingPedidos, setLoadingPedidos] = useState(true);
  const [loadingBaixas, setLoadingBaixas] = useState(true);
  const [saving, setSaving] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  async function carregarPedidos() {
    setLoadingPedidos(true);

    const { data, error } = await supabase
      .from("pedidos")
      .select(
        `
          id,
          numero_mapa,
          cliente_id,
          status,
          clientes (
            nome
          )
        `
      )
      .order("created_at", { ascending: false });

    if (error) {
      setErro("Erro ao carregar pedidos.");
      setLoadingPedidos(false);
      return;
    }

    setPedidos(((data ?? []) as unknown) as Pedido[]);
    setLoadingPedidos(false);
  }

  async function carregarItensDoPedido(pedidoId: string) {
    if (!pedidoId) {
      setPedidoItens([]);
      return;
    }

    const { data, error } = await supabase
      .from("pedido_itens")
      .select("*")
      .eq("pedido_id", pedidoId)
      .order("created_at", { ascending: true });

    if (error) {
      setErro("Erro ao carregar os modelos do pedido.");
      setPedidoItens([]);
      return;
    }

    setPedidoItens((data as PedidoItem[]) ?? []);
  }

  async function carregarBaixas() {
    setLoadingBaixas(true);

    const { data, error } = await supabase
      .from("baixas_corte")
      .select(
        `
          id,
          pedido_id,
          pedido_item_id,
          quantidade_cortada,
          data_baixa,
          observacoes,
          created_at,
          pedidos (
            numero_mapa,
            clientes (
              nome
            )
          ),
          pedido_itens (
            modelo
          )
        `
      )
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      setErro("Erro ao carregar baixas.");
      setLoadingBaixas(false);
      return;
    }

    setBaixas(((data ?? []) as unknown) as Baixa[]);
    setLoadingBaixas(false);
  }

  useEffect(() => {
    async function iniciar() {
      setErro("");
      await carregarPedidos();
      await carregarBaixas();
    }

    iniciar();
  }, []);

  useEffect(() => {
    carregarItensDoPedido(form.pedido_id);
    setForm((prev) => ({
      ...prev,
      pedido_item_id: "",
    }));
  }, [form.pedido_id]);

  const itemSelecionado = useMemo(() => {
    return pedidoItens.find((item) => item.id === form.pedido_item_id) ?? null;
  }, [pedidoItens, form.pedido_item_id]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function validarFormulario() {
    if (!form.pedido_id) return "Selecione um pedido.";
    if (!form.pedido_item_id) return "Selecione um modelo.";
    if (!form.quantidade_cortada || Number(form.quantidade_cortada) <= 0) {
      return "Informe uma quantidade válida para a baixa.";
    }
    if (!itemSelecionado) return "Modelo não encontrado.";

    if (Number(form.quantidade_cortada) > Number(itemSelecionado.pares_restantes)) {
      return "A quantidade da baixa não pode ser maior que o restante do modelo.";
    }

    return "";
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
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
      pedido_item_id: form.pedido_item_id,
      quantidade_cortada: Number(form.quantidade_cortada),
      data_baixa: form.data_baixa || null,
      observacoes: form.observacoes.trim() || null,
    };

    const { error } = await supabase.from("baixas_corte").insert(payload);

    if (error) {
      setErro("Não foi possível registrar a baixa.");
      setSaving(false);
      return;
    }

    setMensagem("Baixa registrada com sucesso.");
    setForm({
      ...initialForm,
      pedido_id: form.pedido_id,
    });

    await carregarItensDoPedido(form.pedido_id);
    await carregarPedidos();
    await carregarBaixas();

    setSaving(false);
  }

  async function excluirBaixa(baixa: Baixa) {
    setMensagem("");
    setErro("");

    const confirmar = window.confirm(
      `Tem certeza que deseja excluir esta baixa de ${baixa.quantidade_cortada} pares do modelo ${
        baixa.pedido_itens?.modelo ?? "-"
      }?`
    );

    if (!confirmar) return;

    setExcluindoId(baixa.id);

    const { error } = await supabase
      .from("baixas_corte")
      .delete()
      .eq("id", baixa.id);

    if (error) {
      setErro("Não foi possível excluir a baixa.");
      setExcluindoId(null);
      return;
    }

    setMensagem("Baixa excluída com sucesso.");

    await carregarBaixas();
    await carregarPedidos();

    if (form.pedido_id) {
      await carregarItensDoPedido(form.pedido_id);
    }

    setExcluindoId(null);
  }

  function formatarMoeda(valor: number) {
    return valor.toLocaleString("pt-BR", {
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

  function traduzirStatusItem(status: string) {
    if (status === "aguardando") return "Aguardando";
    if (status === "em_corte") return "Em corte";
    if (status === "finalizado") return "Finalizado";
    return status;
  }

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
            Baixa de Corte
          </h1>
          <p style={{ color: "#D1D5DB", marginTop: "8px" }}>
            Registre o que já foi cortado por modelo
          </p>
        </div>
      </div>

      {mensagem ? <div style={sucessoStyle}>{mensagem}</div> : null}
      {erro ? <div style={erroStyle}>{erro}</div> : null}

      <form onSubmit={handleSubmit} style={formStyle}>
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
                {`Mapa ${pedido.numero_mapa} - ${pedido.clientes?.nome ?? "Sem cliente"} - ${traduzirStatus(
                  pedido.status
                )}`}
              </option>
            ))}
          </select>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Modelo *</label>
          <select
            name="pedido_item_id"
            value={form.pedido_item_id}
            onChange={handleChange}
            style={inputStyle}
            disabled={!form.pedido_id}
          >
            <option value="">Selecione um modelo</option>
            {pedidoItens.map((item) => (
              <option key={item.id} value={item.id}>
                {`${item.modelo} - Restante: ${item.pares_restantes} pares`}
              </option>
            ))}
          </select>
        </div>

        {itemSelecionado ? (
          <div style={resumoItemStyle}>
            <div>
              <p style={resumoLabelStyle}>Modelo</p>
              <strong style={resumoValorStyle}>{itemSelecionado.modelo}</strong>
            </div>

            <div>
              <p style={resumoLabelStyle}>Quantidade total</p>
              <strong style={resumoValorStyle}>{itemSelecionado.quantidade_pares}</strong>
            </div>

            <div>
              <p style={resumoLabelStyle}>Já cortado</p>
              <strong style={resumoValorStyle}>{itemSelecionado.pares_cortados}</strong>
            </div>

            <div>
              <p style={resumoLabelStyle}>Restante</p>
              <strong style={resumoValorStyle}>{itemSelecionado.pares_restantes}</strong>
            </div>

            <div>
              <p style={resumoLabelStyle}>Valor do modelo</p>
              <strong style={resumoValorStyle}>
                {formatarMoeda(Number(itemSelecionado.valor_total_item))}
              </strong>
            </div>

            <div>
              <p style={resumoLabelStyle}>Status</p>
              <strong style={resumoValorStyle}>
                {traduzirStatusItem(itemSelecionado.status_item)}
              </strong>
            </div>
          </div>
        ) : null}

        <div style={gridTwo}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Quantidade cortada *</label>
            <input
              type="number"
              min="1"
              name="quantidade_cortada"
              value={form.quantidade_cortada}
              onChange={handleChange}
              placeholder="Ex: 200"
              style={inputStyle}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Data da baixa</label>
            <input
              type="date"
              name="data_baixa"
              value={form.data_baixa}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Observações</label>
          <textarea
            name="observacoes"
            value={form.observacoes}
            onChange={handleChange}
            placeholder="Ex: primeira baixa do modelo"
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
            {saving ? "Salvando..." : "Registrar baixa"}
          </button>
        </div>
      </form>

      <div style={{ marginTop: "22px", display: "grid", gap: "16px" }}>
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0, color: "#F97316" }}>Últimas baixas</h2>

          {loadingBaixas ? (
            <p style={{ color: "#D1D5DB", margin: 0 }}>Carregando baixas...</p>
          ) : baixas.length === 0 ? (
            <p style={{ color: "#D1D5DB", margin: 0 }}>
              Nenhuma baixa registrada ainda.
            </p>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              {baixas.map((baixa) => (
                <div key={baixa.id} style={itemCardStyle}>
                  <strong style={{ color: "#FFFFFF" }}>
                    Baixa de {baixa.quantidade_cortada} pares
                  </strong>
                  <p style={itemTextStyle}>
                    Cliente: {baixa.pedidos?.clientes?.nome ?? "-"}
                  </p>
                  <p style={itemTextStyle}>
                    Mapa: {baixa.pedidos?.numero_mapa ?? "-"}
                  </p>
                  <p style={itemTextStyle}>
                    Modelo: {baixa.pedido_itens?.modelo ?? "-"}
                  </p>
                  <p style={itemTextStyle}>Data: {baixa.data_baixa}</p>
                  <p style={itemTextStyle}>
                    Observações: {baixa.observacoes || "-"}
                  </p>

                  <div style={{ marginTop: "12px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => excluirBaixa(baixa)}
                      disabled={excluindoId === baixa.id}
                      style={{
                        ...botaoExcluir,
                        opacity: excluindoId === baixa.id ? 0.7 : 1,
                        cursor: excluindoId === baixa.id ? "not-allowed" : "pointer",
                      }}
                    >
                      {excluindoId === baixa.id ? "Excluindo..." : "Excluir baixa"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {form.pedido_id ? (
          <div style={cardStyle}>
            <h2 style={{ marginTop: 0, color: "#F97316" }}>Modelos do pedido</h2>

            {pedidoItens.length === 0 ? (
              <p style={{ color: "#D1D5DB", margin: 0 }}>
                Nenhum modelo encontrado para este pedido.
              </p>
            ) : (
              <div style={{ display: "grid", gap: "12px" }}>
                {pedidoItens.map((item) => (
                  <div key={item.id} style={itemResumoStyle}>
                    <div>
                      <strong style={{ color: "#FFFFFF" }}>{item.modelo}</strong>
                      <p style={{ color: "#D1D5DB", margin: "6px 0 0 0" }}>
                        {item.quantidade_pares} pares ×{" "}
                        {formatarMoeda(Number(item.valor_por_par))}
                      </p>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <strong style={{ color: "#FFFFFF" }}>
                        Restante: {item.pares_restantes}
                      </strong>
                      <p style={{ color: "#D1D5DB", margin: "6px 0 0 0" }}>
                        Status: {traduzirStatusItem(item.status_item)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
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

const resumoItemStyle: React.CSSProperties = {
  background: "#0B1C2C",
  borderRadius: "16px",
  padding: "16px",
  border: "1px solid rgba(255,255,255,0.08)",
  display: "grid",
  gap: "12px",
};

const resumoLabelStyle: React.CSSProperties = {
  margin: 0,
  color: "#D1D5DB",
  fontSize: "14px",
};

const resumoValorStyle: React.CSSProperties = {
  color: "#FFFFFF",
  fontSize: "20px",
};

const cardStyle: React.CSSProperties = {
  background: "#10283D",
  borderRadius: "16px",
  padding: "18px",
  border: "1px solid rgba(255,255,255,0.08)",
};

const itemCardStyle: React.CSSProperties = {
  background: "#0B1C2C",
  borderRadius: "12px",
  padding: "14px",
  border: "1px solid rgba(255,255,255,0.06)",
};

const itemTextStyle: React.CSSProperties = {
  color: "#D1D5DB",
  margin: "6px 0 0 0",
};

const itemResumoStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
  background: "#0B1C2C",
  borderRadius: "12px",
  padding: "14px",
  border: "1px solid rgba(255,255,255,0.06)",
};