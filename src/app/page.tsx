"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type ImportEntry = {
  id: string;
  description: string;
  supplier: string;
  category: string;
  basePrice: number;
  iof: number;
  duties: number;
  shipping: number;
  otherFees: number;
  salePrice: number;
  paid: boolean;
  status: "Pedido" | "Em trânsito" | "Entregue";
  eta: string;
  invoice: string;
};

type DraftEntry = {
  description: string;
  supplier: string;
  category: string;
  basePrice: string;
  iof: string;
  duties: string;
  shipping: string;
  otherFees: string;
  salePrice: string;
  status: ImportEntry["status"];
  paid: boolean;
  eta: string;
  invoice: string;
  iofTouched: boolean;
};

type Filters = {
  search: string;
  status: "todas" | ImportEntry["status"];
  paid: "todos" | "pagos" | "pendentes";
  category: "todas" | string;
};

type Config = {
  defaultIOFPercent: number;
};

type Project = {
  id: string;
  name: string;
  entries: ImportEntry[];
  config: Config;
  notes: string;
  filters: Filters;
};

const STORAGE_KEY = "import-tracker-projects-v1";
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const defaultConfig: Config = { defaultIOFPercent: 3.5 };
const defaultFilters: Filters = { search: "", status: "todas", paid: "todos", category: "todas" };

const initialEntries: ImportEntry[] = [
  {
    id: "IMP-1201",
    description: "MacBook Air M2 13\"",
    supplier: "Apple US",
    category: "Eletrônico",
    basePrice: 5200,
    iof: 312,
    duties: 780,
    shipping: 430,
    otherFees: 180,
    salePrice: 7600,
    paid: true,
    status: "Em trânsito",
    eta: "12/01",
    invoice: "INV-9821",
  },
  {
    id: "IMP-1202",
    description: "Headphone Sony WH-1000XM5",
    supplier: "BestBuy",
    category: "Acessório",
    basePrice: 1800,
    iof: 108,
    duties: 340,
    shipping: 220,
    otherFees: 90,
    salePrice: 2690,
    paid: false,
    status: "Pedido",
    eta: "16/01",
    invoice: "INV-7743",
  },
  {
    id: "IMP-1203",
    description: "Tênis New Balance 990v5",
    supplier: "StockX",
    category: "Moda",
    basePrice: 950,
    iof: 57,
    duties: 190,
    shipping: 160,
    otherFees: 60,
    salePrice: 1550,
    paid: true,
    status: "Entregue",
    eta: "08/01",
    invoice: "INV-6621",
  },
];

const statusOptions: ImportEntry["status"][] = ["Pedido", "Em trânsito", "Entregue"];

function totalCost(entry: ImportEntry) {
  return entry.basePrice + entry.iof + entry.duties + entry.shipping + entry.otherFees;
}

function profit(entry: ImportEntry) {
  return entry.salePrice - totalCost(entry);
}

function margin(entry: ImportEntry) {
  const sale = entry.salePrice || 1;
  return profit(entry) / sale;
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function emptyDraft(): DraftEntry {
  return {
    description: "",
    supplier: "",
    category: "Eletrônico",
    basePrice: "",
    iof: "",
    duties: "",
    shipping: "",
    otherFees: "",
    salePrice: "",
    status: "Pedido",
    paid: false,
    eta: "",
    invoice: "",
    iofTouched: false,
  };
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string>("");
  const [newProjectName, setNewProjectName] = useState("");
  const [entries, setEntries] = useState<ImportEntry[]>(initialEntries);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [notes, setNotes] = useState("");
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [draft, setDraft] = useState<DraftEntry>(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const persistProjects = useCallback((payload: Project[]) => {
    if (typeof window === "undefined") return;
    setProjects(payload);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, []);

  const applyProject = useCallback((project: Project) => {
    setCurrentProjectId(project.id);
    setEntries(project.entries);
    setNotes(project.notes);
    setConfig(project.config || defaultConfig);
    setFilters(project.filters || defaultFilters);
    setDraft(emptyDraft());
    setEditingId(null);
    setDirty(false);
  }, []);

  useEffect(() => {
    const load = () => {
      if (typeof window === "undefined") return;
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed: Project[] = JSON.parse(stored);
          setProjects(parsed);
          const first = parsed[0];
          if (first) {
            applyProject(first);
          }
          setHydrated(true);
          return;
        } catch (error) {
          console.error("Erro ao carregar projetos salvos", error);
        }
      }
      const defaultProject: Project = {
        id: "PRJ-0001",
        name: "Projeto inicial",
        entries: initialEntries,
        config: defaultConfig,
        notes: "",
        filters: defaultFilters,
      };
      setProjects([defaultProject]);
      applyProject(defaultProject);
      persistProjects([defaultProject]);
      setHydrated(true);
    };
    load();
  }, [applyProject, persistProjects]);

  const handleSelectProject = (projectId: string) => {
    const project = projects.find((item) => item.id === projectId);
    if (project) {
      applyProject(project);
    }
  };

  const handleCreateProject = () => {
    const name = newProjectName.trim() || `Projeto ${projects.length + 1}`;
    const id = `PRJ-${Date.now()}`;
    const project: Project = {
      id,
      name,
      entries: [],
      config,
      notes: "",
      filters: defaultFilters,
    };
    const updated = [project, ...projects];
    persistProjects(updated);
    applyProject(project);
    setNewProjectName("");
    setLastSavedAt(new Date().toLocaleString("pt-BR"));
  };

  const handleSaveProject = () => {
    if (!currentProjectId) return;
    const updated = projects.map((project) =>
      project.id === currentProjectId ? { ...project, entries, config, notes, filters } : project,
    );
    persistProjects(updated);
    setDirty(false);
    setLastSavedAt(new Date().toLocaleString("pt-BR"));
  };

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSearch =
        filters.search.trim().length === 0 ||
        `${entry.description} ${entry.supplier} ${entry.invoice}`.toLowerCase().includes(filters.search.toLowerCase());
      const matchesStatus = filters.status === "todas" || entry.status === filters.status;
      const matchesPaid =
        filters.paid === "todos" || (filters.paid === "pagos" ? entry.paid : !entry.paid);
      const matchesCategory = filters.category === "todas" || entry.category === filters.category;
      return matchesSearch && matchesStatus && matchesPaid && matchesCategory;
    });
  }, [entries, filters]);

  const totals = useMemo(
    () =>
      entries.reduce(
        (acc, entry) => {
          const cost = totalCost(entry);
          acc.invested += cost;
          acc.revenue += entry.salePrice;
          acc.profit += profit(entry);
          acc.taxes += entry.iof + entry.duties;
          acc.paidAmount += entry.paid ? cost : 0;
          return acc;
        },
        { invested: 0, revenue: 0, profit: 0, taxes: 0, paidAmount: 0 },
      ),
    [entries],
  );

  const previewCost =
    Number(draft.basePrice || 0) +
    Number(draft.iof || 0) +
    Number(draft.duties || 0) +
    Number(draft.shipping || 0) +
    Number(draft.otherFees || 0);
  const previewProfit = Number(draft.salePrice || 0) - previewCost;
  const paidCount = entries.filter((entry) => entry.paid).length;

  const calculateDefaultIof = (base: string) => {
    const baseNumber = Number(base || 0);
    if (!baseNumber) return "";
    return ((baseNumber * config.defaultIOFPercent) / 100).toFixed(2);
  };

  const handleTogglePaid = (id: string) => {
    setEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, paid: !entry.paid } : entry)));
    setDirty(true);
  };

  const handleExport = () => {
    const header = [
      "ID",
      "Item",
      "Fornecedor",
      "Categoria",
      "Preço base",
      "IOF",
      "Taxas",
      "Transporte",
      "Outros",
      "Total",
      "Preço venda",
      "Lucro",
      "Margem",
      "Status",
      "Pago",
    ];

    const data = entries.map((entry) => [
      entry.id,
      entry.description,
      entry.supplier,
      entry.category,
      entry.basePrice,
      entry.iof,
      entry.duties,
      entry.shipping,
      entry.otherFees,
      totalCost(entry),
      entry.salePrice,
      profit(entry),
      `${(margin(entry) * 100).toFixed(1)}%`,
      entry.status,
      entry.paid ? "Sim" : "Não",
    ]);

    const csv = [header, ...data]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "planilha-importacoes.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleAddOrUpdateEntry = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const numbers = {
      basePrice: Number(draft.basePrice || 0),
      iof: Number(draft.iof || 0),
      duties: Number(draft.duties || 0),
      shipping: Number(draft.shipping || 0),
      otherFees: Number(draft.otherFees || 0),
      salePrice: Number(draft.salePrice || 0),
    };

    const parsed: ImportEntry = {
      id: editingId || `IMP-${(Date.now() % 100000).toString().padStart(5, "0")}`,
      description: draft.description || "Item sem nome",
      supplier: draft.supplier || "Fornecedor não informado",
      category: draft.category,
      status: draft.status,
      paid: draft.paid,
      eta: draft.eta || "—",
      invoice: draft.invoice || "—",
      ...numbers,
    };

    setEntries((prev) => {
      if (editingId) {
        return prev.map((item) => (item.id === editingId ? parsed : item));
      }
      return [parsed, ...prev];
    });
    setDraft(emptyDraft());
    setEditingId(null);
    setDirty(true);
  };

  const handleEditRow = (entry: ImportEntry) => {
    setEditingId(entry.id);
    setDraft({
      description: entry.description,
      supplier: entry.supplier,
      category: entry.category,
      basePrice: String(entry.basePrice),
      iof: String(entry.iof),
      duties: String(entry.duties),
      shipping: String(entry.shipping),
      otherFees: String(entry.otherFees),
      salePrice: String(entry.salePrice),
      status: entry.status,
      paid: entry.paid,
      eta: entry.eta,
      invoice: entry.invoice,
      iofTouched: true,
    });
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  useEffect(() => {
    if (hydrated && !draft.iofTouched) {
      setDraft((prev) => ({ ...prev, iof: calculateDefaultIof(prev.basePrice) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.defaultIOFPercent]);

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-12">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="success">Planilha ativa</Badge>
            <span>Custos, IOF, transporte e margens em um só lugar.</span>
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-foreground lg:text-4xl">Controle de importações</h1>
            <p className="mt-3 max-w-2xl text-base text-muted-foreground">
              Organize preços, taxas, transporte e acompanhe o lucro por item. Use os filtros para enxergar o que já foi
              pago e o que ainda falta fechar.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-muted px-3 py-1">Base: BRL</span>
            <span className="rounded-full bg-muted px-3 py-1">Status: {entries.length} itens</span>
            <span className="rounded-full bg-muted px-3 py-1">
              Margem média: {entries.length ? `${((totals.profit / totals.revenue) * 100).toFixed(1)}%` : "—"}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button variant="soft" className="w-full sm:w-auto" onClick={handleExport}>
            Exportar CSV
          </Button>
          <Button className="w-full sm:w-auto" onClick={() => window.scrollTo({ top: document.body.scrollHeight })}>
            Novo lançamento
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <CardTitle>Projetos</CardTitle>
            <CardDescription>Salve e carregue conjuntos diferentes de itens, notas e configurações.</CardDescription>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {dirty ? (
                <Badge variant="warning">Alterações não salvas</Badge>
              ) : (
                <Badge variant="outline">Tudo salvo</Badge>
              )}
              {lastSavedAt && <span>Último salvamento: {lastSavedAt}</span>}
            </div>
          </div>
          <div className="grid w-full gap-3 md:w-auto md:grid-cols-[1fr_auto] md:items-end">
            <div className="grid gap-2 sm:grid-cols-2 sm:items-end">
              <div>
                <Label htmlFor="project">Projeto atual</Label>
                <Select
                  id="project"
                  value={currentProjectId}
                  onChange={(event) => handleSelectProject(event.target.value)}
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="newProject">Novo projeto</Label>
                <div className="flex gap-2">
                  <Input
                    id="newProject"
                    placeholder="Nome do projeto"
                    value={newProjectName}
                    onChange={(event) => setNewProjectName(event.target.value)}
                  />
                  <Button variant="outline" type="button" onClick={handleCreateProject}>
                    Criar
                  </Button>
                </div>
              </div>
            </div>
            <Button className="w-full md:w-auto" type="button" onClick={handleSaveProject} disabled={!dirty}>
              Salvar projeto
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
            <div>
              <CardDescription>Custo total importado</CardDescription>
              <CardTitle className="text-2xl">{currency.format(totals.invested)}</CardTitle>
            </div>
            <Badge variant="outline">{paidCount} pagos</Badge>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {currency.format(totals.paidAmount)} já liquidado, resto pendente.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="space-y-2 pb-4">
            <CardDescription>Receita estimada</CardDescription>
            <CardTitle className="text-2xl">{currency.format(totals.revenue)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Lucro previsto: {currency.format(totals.profit)} (
            {totals.revenue ? ((totals.profit / totals.revenue) * 100).toFixed(1) : "0"}%).
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="space-y-2 pb-4">
            <CardDescription>Impostos e taxas</CardDescription>
            <CardTitle className="text-2xl">{currency.format(totals.taxes)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            IOF + taxas alfandegárias concentradas neste valor.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="space-y-2 pb-4">
            <CardDescription>Itens em aberto</CardDescription>
            <CardTitle className="text-2xl">
              {entries.length - paidCount} <span className="text-base font-normal text-muted-foreground">a pagar</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Use o switch na tabela para marcar o que já foi liquidado.
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <CardTitle>Planilha de importações</CardTitle>
            <CardDescription>Filtre por status, pagamento e busque por invoice, fornecedor ou item.</CardDescription>
          </div>
          <div className="grid w-full gap-3 md:w-auto md:grid-cols-4">
            <div className="md:col-span-2">
              <Label htmlFor="search">Busca</Label>
              <Input
                id="search"
                placeholder="AirPods, INV-1001, fornecedor..."
                value={filters.search}
                onChange={(event) => {
                  setFilters((prev) => ({ ...prev, search: event.target.value }));
                  setDirty(true);
                }}
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                id="status"
                value={filters.status}
                onChange={(event) => {
                  setFilters((prev) => ({ ...prev, status: event.target.value as Filters["status"] }));
                  setDirty(true);
                }}
              >
                <option value="todas">Todas</option>
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="paid">Pagamento</Label>
              <Select
                id="paid"
                value={filters.paid}
                onChange={(event) => {
                  setFilters((prev) => ({ ...prev, paid: event.target.value as Filters["paid"] }));
                  setDirty(true);
                }}
              >
                <option value="todos">Todos</option>
                <option value="pagos">Pagos</option>
                <option value="pendentes">Pendentes</option>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="category">Categoria</Label>
              <Select
                id="category"
                value={filters.category}
                onChange={(event) => {
                  setFilters((prev) => ({ ...prev, category: event.target.value }));
                  setDirty(true);
                }}
              >
                <option value="todas">Todas</option>
                {[...new Set(entries.map((entry) => entry.category))].map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setFilters(defaultFilters);
                  setDirty(true);
                }}
              >
                Limpar filtros
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Custos</TableHead>
                <TableHead>Valor final</TableHead>
                <TableHead>Lucro</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{entry.description}</div>
                    <div className="text-xs text-muted-foreground">{entry.invoice}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{entry.supplier}</div>
                    <div className="text-xs text-muted-foreground">{entry.category}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{currency.format(totalCost(entry))}</div>
                    <div className="text-xs text-muted-foreground">
                      Preço {currency.format(entry.basePrice)} · IOF {currency.format(entry.iof)} · Taxas{" "}
                      {currency.format(entry.duties)} · Frete {currency.format(entry.shipping)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{currency.format(entry.salePrice)}</div>
                    <div className="text-xs text-muted-foreground">Entrega: {entry.eta}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={profit(entry) >= 0 ? "success" : "warning"}>
                        {currency.format(profit(entry))}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{(margin(entry) * 100).toFixed(1)}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{entry.status}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch checked={entry.paid} onCheckedChange={() => handleTogglePaid(entry.id)} />
                      <span className="text-xs text-muted-foreground">{entry.paid ? "Pago" : "Pendente"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEditRow(entry)}>
                        Editar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredEntries.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/70 bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
              Nenhum item encontrado com os filtros atuais.
            </div>
          ) : (
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>Total de linhas: {filteredEntries.length}</span>
              <span>
                Soma dos custos:{" "}
                {currency.format(filteredEntries.reduce((sum, entry) => sum + totalCost(entry), 0))}
              </span>
              <span>
                Lucro filtrado:{" "}
                {currency.format(filteredEntries.reduce((sum, entry) => sum + profit(entry), 0))}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Simulador rápido</CardTitle>
            <CardDescription>Planeje um item antes de lançar. Os valores são apenas para visualização.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label>Preço (produto)</Label>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={draft.basePrice}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      basePrice: event.target.value,
                      iof: prev.iofTouched ? prev.iof : calculateDefaultIof(event.target.value),
                    }))
                  }
                  required
                />
              </div>
              <div>
                <Label>IOF (valor)</Label>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={draft.iof}
                  onChange={(event) => setDraft((prev) => ({ ...prev, iof: event.target.value, iofTouched: true }))}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Padrão: {formatPercent(config.defaultIOFPercent)} do preço base.
                </p>
              </div>
              <div>
                <Label>Taxas/alfândega</Label>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={draft.duties}
                  onChange={(event) => setDraft((prev) => ({ ...prev, duties: event.target.value }))}
                />
              </div>
              <div>
                <Label>Transporte</Label>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={draft.shipping}
                  onChange={(event) => setDraft((prev) => ({ ...prev, shipping: event.target.value }))}
                />
              </div>
              <div>
                <Label>Outras taxas</Label>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={draft.otherFees}
                  onChange={(event) => setDraft((prev) => ({ ...prev, otherFees: event.target.value }))}
                />
              </div>
              <div>
                <Label>Preço de venda</Label>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={draft.salePrice}
                  onChange={(event) => setDraft((prev) => ({ ...prev, salePrice: event.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-border/70 bg-muted/40 p-4">
                <div className="text-xs text-muted-foreground">Custo final</div>
                <div className="text-xl font-semibold">{currency.format(previewCost)}</div>
                <div className="text-xs text-muted-foreground">
                  Inclui IOF, taxas, frete e outros custos lançados acima.
                </div>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/40 p-4">
                <div className="text-xs text-muted-foreground">Lucro estimado</div>
                <div className="text-xl font-semibold">{currency.format(previewProfit)}</div>
                <div className="text-xs text-muted-foreground">
                  Margem:{" "}
                  {draft.salePrice ? `${((previewProfit / Number(draft.salePrice)) * 100).toFixed(1)}%` : "—"}
                </div>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/40 p-4">
                <div className="text-xs text-muted-foreground">Ponto de equilíbrio</div>
                <div className="text-xl font-semibold">
                  {currency.format(previewCost > 0 ? previewCost : 0)}
                </div>
                <div className="text-xs text-muted-foreground">Venda mínima para zerar o custo.</div>
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notas rápidas</Label>
              <Textarea
                id="notes"
                placeholder="Seguro, condições de entrega, contato do despachante..."
                value={notes}
                onChange={(event) => {
                  setNotes(event.target.value);
                  setDirty(true);
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle>{editingId ? "Editar lançamento" : "Novo lançamento"}</CardTitle>
            <CardDescription>
              IOF padrão configurável por projeto e todos os campos continuam editáveis após salvar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleAddOrUpdateEntry}>
              <div className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="description">Item</Label>
                    <Input
                      id="description"
                      placeholder="Notebook, roupa, peça..."
                      value={draft.description}
                      onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="supplier">Fornecedor (opcional)</Label>
                    <Input
                      id="supplier"
                      placeholder="Loja, marketplace..."
                      value={draft.supplier}
                      onChange={(event) => setDraft((prev) => ({ ...prev, supplier: event.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="category">Categoria</Label>
                    <Select
                      id="category"
                      value={draft.category}
                      onChange={(event) => setDraft((prev) => ({ ...prev, category: event.target.value }))}
                    >
                      <option value="Eletrônico">Eletrônico</option>
                      <option value="Acessório">Acessório</option>
                      <option value="Moda">Moda</option>
                      <option value="Outros">Outros</option>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      id="status"
                      value={draft.status}
                      onChange={(event) =>
                        setDraft((prev) => ({ ...prev, status: event.target.value as ImportEntry["status"] }))
                      }
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="invoice">Invoice/nota (opcional)</Label>
                    <Input
                      id="invoice"
                      placeholder="INV-0001"
                      value={draft.invoice}
                      onChange={(event) => setDraft((prev) => ({ ...prev, invoice: event.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="eta">Entrega/ETA (opcional)</Label>
                    <Input
                      id="eta"
                      placeholder="dd/mm"
                      value={draft.eta}
                      onChange={(event) => setDraft((prev) => ({ ...prev, eta: event.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Pago?</Label>
                    <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/40 px-3 py-2">
                      <Switch
                        checked={draft.paid}
                        onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, paid: checked }))}
                      />
                      <span className="text-sm text-muted-foreground">{draft.paid ? "Sim" : "Não"}</span>
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="basePrice">Preço base</Label>
                    <Input
                      id="basePrice"
                      type="number"
                      placeholder="0,00"
                      value={draft.basePrice}
                      onChange={(event) =>
                        setDraft((prev) => ({
                          ...prev,
                          basePrice: event.target.value,
                          iof: prev.iofTouched ? prev.iof : calculateDefaultIof(event.target.value),
                        }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="iof">IOF (valor)</Label>
                    <Input
                      id="iof"
                      type="number"
                      placeholder="0,00"
                      value={draft.iof}
                      onChange={(event) =>
                        setDraft((prev) => ({ ...prev, iof: event.target.value, iofTouched: true }))
                      }
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Padrão do projeto: {formatPercent(config.defaultIOFPercent)}.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="duties">Taxas/alfândega</Label>
                    <Input
                      id="duties"
                      type="number"
                      placeholder="0,00"
                      value={draft.duties}
                      onChange={(event) => setDraft((prev) => ({ ...prev, duties: event.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="shipping">Transporte</Label>
                    <Input
                      id="shipping"
                      type="number"
                      placeholder="0,00"
                      value={draft.shipping}
                      onChange={(event) => setDraft((prev) => ({ ...prev, shipping: event.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="otherFees">Outras taxas</Label>
                    <Input
                      id="otherFees"
                      type="number"
                      placeholder="0,00"
                      value={draft.otherFees}
                      onChange={(event) => setDraft((prev) => ({ ...prev, otherFees: event.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="salePrice">Preço de venda</Label>
                    <Input
                      id="salePrice"
                      type="number"
                      placeholder="0,00"
                      value={draft.salePrice}
                      onChange={(event) => setDraft((prev) => ({ ...prev, salePrice: event.target.value }))}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Resumo do lançamento</div>
                  <div className="text-sm text-muted-foreground">
                    Total: <span className="font-semibold text-foreground">{currency.format(previewCost)}</span> · Lucro:{" "}
                    <span className="font-semibold text-foreground">{currency.format(previewProfit)}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  {editingId && (
                    <Button
                      variant="ghost"
                      type="button"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        setEditingId(null);
                        setDraft(emptyDraft());
                      }}
                    >
                      Cancelar edição
                    </Button>
                  )}
                  <Button type="submit" className="w-full sm:w-auto">
                    {editingId ? "Salvar alterações" : "Adicionar à planilha"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Configurações do projeto</CardTitle>
            <CardDescription>Defaults aplicados em novos itens, mas editáveis linha a linha.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <div>
                <Label htmlFor="defaultIof">IOF padrão (%)</Label>
                <Input
                  id="defaultIof"
                  type="number"
                  step="0.1"
                  value={config.defaultIOFPercent}
                  onChange={(event) => {
                    setConfig((prev) => ({ ...prev, defaultIOFPercent: Number(event.target.value) || 0 }));
                    setDirty(true);
                  }}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Ex: 3,5% (Brasil) aplicado sobre o preço base ao criar um item.
                </p>
              </div>
              <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                Todos os campos são editáveis depois de salvos. Nome, preço base e preço de venda são obrigatórios;
                demais são opcionais.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
