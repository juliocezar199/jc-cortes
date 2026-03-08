"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase/client";

type Cliente = {
  id: string;
  nome: string;
  telefone: string | null;
  cidade: string | null;
  observacoes: string | null;
  created_at?: string;
};

const formInicial = {
  nome: "",
  telefone: "",
  cidade: "",
  observacoes: "",
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cidade, setCidade] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const [editandoId, setEditandoId] = useState<string | null>(null);

  async function carregarClientes() {
    setLoading(true);

    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar clientes:", error);
      alert("Erro ao carregar clientes.");
      setLoading(false);
      return;
    }

    setClientes((data as Cliente[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    carregarClientes();
  }, []);

  function limparFormulario() {
    setNome(formInicial.nome);
    setTelefone(formInicial.telefone);
    setCidade(formInicial.cidade);
    setObservacoes(formInicial.observacoes);
    setEditandoId(null);
  }

  function iniciarEdicao(cliente: Cliente) {
    setNome(cliente.nome || "");
    setTelefone(cliente.telefone || "");
    setCidade(cliente.cidade || "");
    setObservacoes(cliente.observacoes || "");
    setEditandoId(cliente.id);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!nome.trim()) {
      alert("Preencha o nome do cliente.");
      return;
    }

    setSalvando(true);

    if (editandoId) {
      const { error } = await supabase
        .from("clientes")
        .update({
          nome: nome.trim(),
          telefone: telefone.trim() || null,
          cidade: cidade.trim() || null,
          observacoes: observacoes.trim() || null,
        })
        .eq("id", editandoId);

      if (error) {
        console.error("Erro ao atualizar cliente:", error);
        alert("Erro ao atualizar cliente.");
        setSalvando(false);
        return;
      }

      alert("Cliente atualizado com sucesso.");
    } else {
      const { error } = await supabase.from("clientes").insert([
        {
          nome: nome.trim(),
          telefone: telefone.trim() || null,
          cidade: cidade.trim() || null,
          observacoes: observacoes.trim() || null,
        },
      ]);

      if (error) {
        console.error("Erro ao criar cliente:", error);
        alert("Erro ao criar cliente.");
        setSalvando(false);
        return;
      }

      alert("Cliente criado com sucesso.");
    }

    limparFormulario();
    await carregarClientes();
    setSalvando(false);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-orange-500">
            Clientes
          </h1>
          <p className="text-slate-300 mt-1">
            Cadastre, visualize e edite seus clientes.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5">
            <h2 className="text-lg font-semibold mb-4">
              {editandoId ? "Editar cliente" : "Novo cliente"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Nome</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 outline-none focus:border-orange-500"
                  placeholder="Nome do cliente"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Telefone</label>
                <input
                  type="text"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 outline-none focus:border-orange-500"
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Cidade</label>
                <input
                  type="text"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 outline-none focus:border-orange-500"
                  placeholder="Cidade"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">
                  Observações
                </label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 outline-none focus:border-orange-500 min-h-[100px]"
                  placeholder="Observações do cliente"
                />
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
                    ? "Atualizar cliente"
                    : "Salvar cliente"}
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
              <h2 className="text-lg font-semibold">Lista de clientes</h2>
              <span className="text-sm text-slate-400">
                {clientes.length} cliente(s)
              </span>
            </div>

            {loading ? (
              <p className="text-slate-400">Carregando clientes...</p>
            ) : clientes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-slate-400">
                Nenhum cliente cadastrado ainda.
              </div>
            ) : (
              <div className="space-y-3">
                {clientes.map((cliente) => (
                  <div
                    key={cliente.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-white text-base">
                          {cliente.nome}
                        </h3>

                        <div className="mt-2 space-y-1 text-sm text-slate-300">
                          <p>
                            <span className="text-slate-400">Telefone:</span>{" "}
                            {cliente.telefone || "-"}
                          </p>
                          <p>
                            <span className="text-slate-400">Cidade:</span>{" "}
                            {cliente.cidade || "-"}
                          </p>
                          <p>
                            <span className="text-slate-400">Observações:</span>{" "}
                            {cliente.observacoes || "-"}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => iniciarEdicao(cliente)}
                        className="shrink-0 rounded-xl border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white transition px-3 py-2 text-sm font-medium"
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}