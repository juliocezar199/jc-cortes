"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase/client";

type Cliente = {
  id: string;
  nome: string;
};

type Pedido = {
  id: string;
  cliente_id: string;
  numero_mapa: string;
  status: "aguardando" | "em_corte" | "finalizado" | "entregue";
  data_entrada?: string | null;
  data_prevista?: string | null;
  observacoes?: string | null;
  total_pares?: number;
  total_valor?: number;
  total_pares_cortados?: number;
  total_pares_restantes?: number;
  created_at?: string;
  cliente_nome?: string;
  itens?: PedidoItem[];
};

type PedidoItem = {
  id?: string;
  pedido_id?: string;
  modelo: string;
  quantidade_pares: number;
  valor_por_par: number;
  valor_total_item?: number;
  pares_cortados?: number;
  pares_restantes?: number;
  status_item?: "aguardando" | "em_corte" | "finalizado";
  created_at?: string;
};

type PedidoComRelacoes = Pedido & {
  itens: PedidoItem[];
};

const itemVazio = (): PedidoItem => ({
  modelo: "",
  quantidade_pares: 0,
  valor_por_par: 0,
});

export default function PedidosPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pedidos, setPedidos] = useState<PedidoComRelacoes[]>([]);

  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [clienteId, setClienteId] = useState("");
  const [numeroMapa, setNumeroMapa] = useState("");
  const [status, setStatus] =
    useState<Pedido["status"]>("aguardando");
  const [observacoes, setObservacoes] = useState("");
  const [itens, setItens] = useState<PedidoItem[]>([itemVazio()]);

  const [editandoId, setEditandoId] = useState<string | null>(null);

  async function carregarTudo() {
    setLoading(true);

    try {
      const { data: clientesData, error: clientesError } = await supabase
        .from("clientes")
        .select("id, nome")
        .order("nome", { ascending: true });

      if (clientesError) {
        console.error("Erro ao carregar clientes:", clientesError);
        alert("Erro ao carregar clientes.");
        return;
      }

      const clientesLista = (clientesData as Cliente[]) || [];
      setClientes(clientesLista);

      const { data: pedidosData, error: pedidosError } = await supabase
        .from("pedidos")
        .select(`
          id,
          cliente_id,
          numero_mapa,
          status,
          data_entrada,
          data_prevista,
          observacoes,
          total_pares,
          total_valor,
          total_pares_cortados,
          total_pares_restantes,
          created_at
        `)
        .order("created_at", { ascending: false });

      if (pedidosError) {
        console.error("Erro ao carregar pedidos:", pedidosError);
        alert("Erro ao carregar pedidos.");
        return;
      }

      const pedidosBase = (pedidosData as Pedido[]) || [];

      if (pedidosBase.length === 0) {
        setPedidos([]);
        return;
      }

      const pedidoIds = pedidosBase.map((p) => p.id);

      const { data: itensData, error: itensError } = await supabase
        .from("pedido_itens")
        .select(`
          id,
          pedido_id,
          modelo,
          quantidade_pares,
          valor_por_par,
          valor_total_item,
          pares_cortados,
          pares_restantes,
          status_item,
          created_at
        `)
        .in("pedido_id", pedidoIds)
        .order("created_at", { ascending: true });

      if (itensError) {
        console.error("Erro ao carregar itens dos pedidos:", itensError);
        alert("Erro ao carregar itens dos pedidos.");
        return;
      }

      const clientesMap = new Map(clientesLista.map((c) => [c.id, c.nome]));
      const itensAgrupados = new Map<string, PedidoItem[]>();

      ((itensData as PedidoItem[]) || []).forEach((item) => {
        const pedidoId = item.pedido_id;
        if (!pedidoId) return;

        const lista = itensAgrupados.get(pedidoId) || [];
        lista.push(item);
        itensAgrupados.set(pedidoId, lista);
      });

      const pedidosMontados: PedidoComRelacoes[] = pedidosBase.map((pedido) => ({
        ...pedido,
        cliente_nome: clientesMap.get(pedido.cliente_id) || "Cliente não encontrado",
        itens: itensAgrupados.get(pedido.id) || [],
      }));

      setPedidos(pedidosMontados);
    } catch (error) {
      console.error("Erro inesperado ao carregar pedidos:", error);
      alert("Erro inesperado ao carregar pedidos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarTudo();
  }, []);

  function limparFormulario() {
    setClienteId("");
    setNumeroMapa("");
    setStatus("aguardando");
    setObservacoes("");
    setItens([itemVazio()]);
    setEditandoId(null);
  }

  function adicionarItem() {
    setItens((prev) => [...prev, itemVazio()]);
  }

  function removerItem(index: number) {
    setItens((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }

  function atualizarItem(
    index: number,
    campo: keyof PedidoItem,
    valor: string | number
  ) {
    setItens((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [campo]:
                campo === "quantidade_pares" || campo === "valor_por_par"
                  ? Number(valor)
                  : valor,
            }
          : item
      )
    );
  }

  function iniciarEdicao(pedido: PedidoComRelacoes) {
    setEditandoId(pedido.id);
    setClienteId(pedido.cliente_id || "");
    setNumeroMapa(pedido.numero_mapa || "");
    setStatus(pedido.status || "aguardando");
    setObservacoes(pedido.observacoes || "");
    setItens(
      pedido.itens.length > 0
        ? pedido.itens.map((item) => ({
            id: item.id,
            pedido_id: item.pedido_id,
            modelo: item.modelo || "",
            quantidade_pares: Number(item.quantidade_pares) || 0,
            valor_por_par: Number(item.valor_por_par) || 0,
            valor_total_item: Number(item.valor_total_item) || 0,
            pares_cortados: Number(item.pares_cortados) || 0,
            pares_restantes: Number(item.pares_restantes) || 0,
            status_item: item.status_item || "aguardando",
          }))
        : [itemVazio()]
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  const totalPedido = useMemo(() => {
    return itens.reduce((acc, item) => {
      const qtd = Number(item.quantidade_pares) || 0;
      const valor = Number(item.valor_por_par) || 0;
      return acc + qtd * valor;
    }, 0);
  }, [itens]);

  function validarFormulario() {
    if (!clienteId) {
      alert("Selecione um cliente.");
      return false;
    }

    if (!numeroMapa.trim()) {
      alert("Preencha o número do mapa.");
      return false;
    }

    const itensValidos = itens.filter(
      (item) =>
        item.modelo.trim() &&
        Number(item.quantidade_pares) > 0 &&
        Number(item.valor_por_par) >= 0
    );

    if (itensValidos.length === 0) {
      alert("Adicione pelo menos um modelo válido.");
      return false;
    }

    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validarFormulario()) return;

    setSalvando(true);

    try {
      const itensValidos = itens
        .filter(
          (item) =>
            item.modelo.trim() &&
            Number(item.quantidade_pares) > 0 &&
            Number(item.valor_por_par) >= 0
        )
        .map((item) => ({
          modelo: item.modelo.trim(),
          quantidade_pares: Number(item.quantidade_pares),
          valor_por_par: Number(item.valor_por_par),
        }));

      if (editandoId) {
        const { error: pedidoError } = await supabase
          .from("pedidos")
          .update({
            cliente_id: clienteId,
            numero_mapa: numeroMapa.trim(),
            status,
            observacoes: observacoes.trim() || null,
          })
          .eq("id", editandoId);

        if (pedidoError) {
          console.error("Erro ao atualizar pedido:", pedidoError);
          alert("Erro ao atualizar pedido.");
          return;
        }

        const { error: deleteError } = await supabase
          .from("pedido_itens")
          .delete()
          .eq("pedido_id", editandoId);

        if (deleteError) {
          console.error("Erro ao limpar itens antigos:", deleteError);
          alert("Erro ao atualizar itens do pedido.");
          return;
        }

        const itensParaInserir = itensValidos.map((item) => ({
          pedido_id: editandoId,
          modelo: item.modelo,
          quantidade_pares: item.quantidade_pares,
          valor_por_par: item.valor_por_par,
        }));

        const { error: itensError } = await supabase
          .from("pedido_itens")
          .insert(itensParaInserir);

        if (itensError) {
          console.error("Erro ao inserir itens atualizados:", itensError);
          alert("Erro ao salvar os itens do pedido.");
          return;
        }

        const { error: rpcError } = await supabase.rpc("fn_recalcular_pedido", {
          p_pedido_id: editandoId,
        });

        if (rpcError) {
          console.warn("Aviso ao recalcular pedido:", rpcError);
        }

        alert("Pedido atualizado com sucesso.");
      } else {
        const { data: pedidoCriado, error: pedidoError } = await supabase
          .from("pedidos")
          .insert([
            {
              cliente_id: clienteId,
              numero_mapa: numeroMapa.trim(),
              status,
              observacoes: observacoes.trim() || null,
            },
          ])
          .select("id")
          .single();

        if (pedidoError || !pedidoCriado) {
          console.error("Erro ao criar pedido:", pedidoError);
          alert("Erro ao criar pedido.");
          return;
        }

        const pedidoId = pedidoCriado.id;

        const itensParaInserir = itensValidos.map((item) => ({
          pedido_id: pedidoId,
          modelo: item.modelo,
          quantidade_pares: item.quantidade_pares,
          valor_por_par: item.valor_por_par,
        }));

        const { error: itensError } = await supabase
          .from("pedido_itens")
          .insert(itensParaInserir);

        if (itensError) {
          console.error("Erro ao inserir itens do pedido:", itensError);
          alert("Erro ao salvar os itens do pedido.");
          return;
        }

        const { error: rpcError } = await supabase.rpc("fn_recalcular_pedido", {
          p_pedido_id: pedidoId,
        });

        if (rpcError) {
          console.warn("Aviso ao recalcular pedido:", rpcError);
        }

        alert("Pedido criado com sucesso.");
      }

      limparFormulario();
      await carregarTudo();
    } catch (error) {
      console.error("Erro inesperado ao salvar pedido:", error);
      alert("Erro inesperado ao salvar pedido.");
    } finally {
      setSalvando(false);
    }
  }

  function formatarMoeda(valor: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor || 0);
  }

  function formatarStatus(statusValue: Pedido["status"]) {
    const mapa: Record<Pedido["status"], string> = {
      aguardando: "Aguardando",
      em_corte: "Em corte",
      finalizado: "Finalizado",
      entregue: "Entregue",
    };

    return mapa[statusValue] || statusValue;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-orange-500">
            Pedidos / Mapas
          </h1>
          <p className="text-slate-300 mt-1">
            Cadastre, visualize e edite pedidos com múltiplos modelos.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[460px_1fr]">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5">
            <h2 className="text-lg font-semibold mb-4">
              {editandoId ? "Editar pedido" : "Novo pedido"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">
                  Cliente
                </label>
                <select
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 outline-none focus:border-orange-500"
                >
                  <option value="">Selecione um cliente</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">
                    Número do mapa
                  </label>
                  <input
                    type="text"
                    value={numeroMapa}
                    onChange={(e) => setNumeroMapa(e.target.value)}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 outline-none focus:border-orange-500"
                    placeholder="Ex: Mapa 120"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Pedido["status"])}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 outline-none focus:border-orange-500"
                  >
                    <option value="aguardando">Aguardando</option>
                    <option value="em_corte">Em corte</option>
                    <option value="finalizado">Finalizado</option>
                    <option value="entregue">Entregue</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">
                  Observações
                </label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 outline-none focus:border-orange-500 min-h-[90px]"
                  placeholder="Observações do pedido"
                />
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-white">Modelos do pedido</h3>

                  <button
                    type="button"
                    onClick={adicionarItem}
                    className="rounded-xl border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white transition px-3 py-2 text-sm font-medium"
                  >
                    + Adicionar modelo
                  </button>
                </div>

                <div className="space-y-4">
                  {itens.map((item, index) => {
                    const subtotal =
                      (Number(item.quantidade_pares) || 0) *
                      (Number(item.valor_por_par) || 0);

                    return (
                      <div
                        key={index}
                        className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                      >
                        <div className="grid gap-3">
                          <div>
                            <label className="block text-sm text-slate-300 mb-1">
                              Modelo
                            </label>
                            <input
                              type="text"
                              value={item.modelo}
                              onChange={(e) =>
                                atualizarItem(index, "modelo", e.target.value)
                              }
                              className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 outline-none focus:border-orange-500"
                              placeholder="Ex: Sandália 3 tiras"
                            />
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="block text-sm text-slate-300 mb-1">
                                Quantidade de pares
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={item.quantidade_pares}
                                onChange={(e) =>
                                  atualizarItem(
                                    index,
                                    "quantidade_pares",
                                    e.target.value
                                  )
                                }
                                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 outline-none focus:border-orange-500"
                              />
                            </div>

                            <div>
                              <label className="block text-sm text-slate-300 mb-1">
                                Valor por par
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.valor_por_par}
                                onChange={(e) =>
                                  atualizarItem(index, "valor_por_par", e.target.value)
                                }
                                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 outline-none focus:border-orange-500"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-3 pt-1">
                            <p className="text-sm text-slate-300">
                              Subtotal:{" "}
                              <span className="font-semibold text-white">
                                {formatarMoeda(subtotal)}
                              </span>
                            </p>

                            <button
                              type="button"
                              onClick={() => removerItem(index)}
                              disabled={itens.length === 1}
                              className="rounded-xl border border-red-500 text-red-400 hover:bg-red-500 hover:text-white transition px-3 py-2 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-sm text-slate-300">Total estimado do pedido</p>
                  <p className="text-2xl font-bold text-orange-500 mt-1">
                    {formatarMoeda(totalPedido)}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={salvando}
                  className="flex-1 rounded-xl bg-orange-500 hover:bg-orange-600 transition px-4 py-2 font-semibold text-white disabled:opacity-60"
                >
                  {salvando
                    ? "Salvando..."
                    : editandoId
                    ? "Atualizar pedido"
                    : "Salvar pedido"}
                </button>

                {editandoId && (
                  <button
                    type="button"
                    onClick={limparFormulario}
                    className="rounded-xl border border-slate-700 px-4 py-2 font-semibold text-slate-200 hover:bg-slate-800 transition"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Lista de pedidos</h2>
              <span className="text-sm text-slate-400">
                {pedidos.length} pedido(s)
              </span>
            </div>

            {loading ? (
              <p className="text-slate-400">Carregando pedidos...</p>
            ) : pedidos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-slate-400">
                Nenhum pedido cadastrado ainda.
              </div>
            ) : (
              <div className="space-y-4">
                {pedidos.map((pedido) => {
                  const total = (pedido.itens || []).reduce((acc, item) => {
                    return (
                      acc +
                      (Number(item.quantidade_pares) || 0) *
                        (Number(item.valor_por_par) || 0)
                    );
                  }, 0);

                  const totalPares = (pedido.itens || []).reduce((acc, item) => {
                    return acc + (Number(item.quantidade_pares) || 0);
                  }, 0);

                  return (
                    <div
                      key={pedido.id}
                      className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <h3 className="font-semibold text-white text-base">
                            {pedido.numero_mapa}
                          </h3>

                          <div className="mt-2 space-y-1 text-sm text-slate-300">
                            <p>
                              <span className="text-slate-400">Cliente:</span>{" "}
                              {pedido.cliente_nome || "-"}
                            </p>
                            <p>
                              <span className="text-slate-400">Status:</span>{" "}
                              {formatarStatus(pedido.status)}
                            </p>
                            <p>
                              <span className="text-slate-400">Total de pares:</span>{" "}
                              {pedido.total_pares ?? totalPares}
                            </p>
                            <p>
                              <span className="text-slate-400">Pares cortados:</span>{" "}
                              {pedido.total_pares_cortados ?? 0}
                            </p>
                            <p>
                              <span className="text-slate-400">Pares restantes:</span>{" "}
                              {pedido.total_pares_restantes ?? 0}
                            </p>
                            <p>
                              <span className="text-slate-400">Total estimado:</span>{" "}
                              {formatarMoeda(Number(pedido.total_valor ?? total))}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => iniciarEdicao(pedido)}
                          className="shrink-0 rounded-xl border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white transition px-3 py-2 text-sm font-medium"
                        >
                          Editar
                        </button>
                      </div>

                      <div className="border-t border-slate-800 pt-3">
                        <p className="text-sm font-medium text-slate-300 mb-2">
                          Modelos
                        </p>

                        <div className="space-y-2">
                          {(pedido.itens || []).map((item, idx) => {
                            const subtotal =
                              (Number(item.quantidade_pares) || 0) *
                              (Number(item.valor_por_par) || 0);

                            return (
                              <div
                                key={item.id ?? idx}
                                className="flex flex-col gap-1 rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-slate-300"
                              >
                                <p className="font-medium text-white">
                                  {item.modelo}
                                </p>
                                <p>
                                  {item.quantidade_pares} pares ×{" "}
                                  {formatarMoeda(Number(item.valor_por_par) || 0)} ={" "}
                                  <span className="font-semibold text-white">
                                    {formatarMoeda(subtotal)}
                                  </span>
                                </p>
                                <p>
                                  <span className="text-slate-400">Cortados:</span>{" "}
                                  {item.pares_cortados ?? 0}{" "}
                                  <span className="text-slate-400 ml-3">Restantes:</span>{" "}
                                  {item.pares_restantes ?? 0}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}