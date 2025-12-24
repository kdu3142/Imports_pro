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
import { readProjects, writeProjects } from "@/lib/storage";

type ImportEntry = {
  id: string;
  description: string;
  recipient: string;
  supplier: string;
  basePrice: number;
  iof: number;
  taxPercent: number;
  shipping: number;
  salePrice: number;
  paid: boolean;
  status: "Pedido" | "Em trânsito" | "Entregue";
  eta: string;
  invoice: string;
};

type DraftEntry = {
  description: string;
  recipient: string;
  supplier: string;
  basePrice: string;
  iof: string;
  taxPercent: string;
  shipping: string;
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
};

type Config = {
  defaultIOFPercent: number;
  defaultTaxPercent: number;
  shippingTiers: [number, number, number];
  conversionRate: number;
  currencyMode: "BRL" | "JPY";
};

type ConfigDraft = {
  defaultIOFPercent: string;
  defaultTaxPercent: string;
  shippingTiers: [string, string, string];
  conversionRate: string;
  currencyMode: "BRL" | "JPY";
};

type Project = {
  id: string;
  name: string;
  entries: ImportEntry[];
  config: Config;
  notes: string;
  filters: Filters;
};

type StoredProject = Partial<Project> & {
  id: string;
  name: string;
  entries?: Array<Partial<ImportEntry>>;
};

const currencyBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const currencyJPY = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 });
const defaultConfig: Config = {
  defaultIOFPercent: 3.5,
  defaultTaxPercent: 8,
  shippingTiers: [0, 150, 300],
  conversionRate: 0.034, // 1 JPY -> BRL
  currencyMode: "BRL",
};
const defaultFilters: Filters = { search: "", status: "todas", paid: "todos" };
const configToDraft = (cfg: Config): ConfigDraft => {
  const rate = cfg.conversionRate || defaultConfig.conversionRate;
  const fromBRL = (value: number) => (cfg.currencyMode === "JPY" ? value / rate : value);
  return {
    defaultIOFPercent: String(cfg.defaultIOFPercent ?? 0),
    defaultTaxPercent: String(cfg.defaultTaxPercent ?? 0),
    shippingTiers: [
      String(fromBRL(cfg.shippingTiers[0] ?? 0)),
      String(fromBRL(cfg.shippingTiers[1] ?? 0)),
      String(fromBRL(cfg.shippingTiers[2] ?? 0)),
    ],
    conversionRate: String(cfg.conversionRate ?? 1),
    currencyMode: cfg.currencyMode ?? "BRL",
  };
};

const initialEntries: ImportEntry[] = [
  {
    id: "IMP-1201",
    description: "MacBook Air M2 13\"",
    recipient: "Equipe TI",
    supplier: "Apple US",
    basePrice: 5200,
    iof: 312,
    taxPercent: 8,
    shipping: 300,
    salePrice: 6228,
    paid: true,
    status: "Em trânsito",
    eta: "12/01",
    invoice: "INV-9821",
  },
  {
    id: "IMP-1202",
    description: "Headphone Sony WH-1000XM5",
    recipient: "João Lima",
    supplier: "BestBuy",
    basePrice: 1800,
    iof: 108,
    taxPercent: 6,
    shipping: 150,
    salePrice: 2166,
    paid: false,
    status: "Pedido",
    eta: "16/01",
    invoice: "INV-7743",
  },
  {
    id: "IMP-1203",
    description: "Tênis New Balance 990v5",
    recipient: "Cliente VIP",
    supplier: "StockX",
    basePrice: 950,
    iof: 57,
    taxPercent: 5,
    shipping: 120,
    salePrice: 1174.5,
    paid: true,
    status: "Entregue",
    eta: "08/01",
    invoice: "INV-6621",
  },
];

const statusOptions: ImportEntry["status"][] = ["Pedido", "Em trânsito", "Entregue"];

function normalizeProject(project: StoredProject): Project {
  const normalizedConfig: Config = {
    ...defaultConfig,
    ...(project.config || {}),
    conversionRate:
      project.config && "conversionRate" in project.config
        ? Number((project.config as Config).conversionRate || defaultConfig.conversionRate)
        : defaultConfig.conversionRate,
    currencyMode:
      project.config && "currencyMode" in project.config && (project.config as Config).currencyMode === "JPY"
        ? "JPY"
        : "BRL",
    shippingTiers:
      project.config && "shippingTiers" in project.config && Array.isArray(project.config.shippingTiers)
        ? (project.config.shippingTiers as number[]).slice(0, 3).length === 3
          ? (project.config.shippingTiers as [number, number, number])
          : defaultConfig.shippingTiers
        : defaultConfig.shippingTiers,
  };

  return {
    id: project.id || `PRJ-${Date.now()}`,
    name: project.name || "Projeto sem nome",
    entries: (project.entries || []).map((entry, index) => {
      const basePrice = Number(entry?.basePrice ?? 0);
      const iof = Number(entry?.iof ?? 0);
      const taxPercent = Number(
        entry && "taxPercent" in entry ? entry?.taxPercent ?? defaultConfig.defaultTaxPercent : defaultConfig.defaultTaxPercent,
      );
      const shipping = Number(entry?.shipping ?? 0);
      const computedSale = basePrice + iof + (taxPercent / 100) * basePrice + shipping;

      return {
        id: entry?.id || `IMP-${((Date.now() + index) % 100000).toString().padStart(5, "0")}`,
        description: entry?.description || "Item sem nome",
        recipient: entry?.recipient || "",
        supplier: entry?.supplier || "",
        basePrice,
        iof,
        taxPercent,
        shipping,
        salePrice: computedSale,
        paid: Boolean(entry?.paid),
        status: entry?.status || "Pedido",
        eta: entry?.eta || "—",
        invoice: entry?.invoice || "",
      };
    }),
    config: normalizedConfig,
    notes: project.notes || "",
    filters: { ...defaultFilters, ...(project.filters || {}) },
  };
}

function totalCost(entry: ImportEntry) {
  const taxValue = (entry.taxPercent / 100) * entry.basePrice;
  return entry.basePrice + entry.iof + taxValue + entry.shipping;
}

function taxValue(entry: ImportEntry) {
  return (entry.taxPercent / 100) * entry.basePrice;
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

function emptyDraft(config: Config = defaultConfig): DraftEntry {
  const displayShipping =
    config.currencyMode === "JPY"
      ? config.shippingTiers[0] / (config.conversionRate || 1)
      : config.shippingTiers[0];
  return {
    description: "",
    recipient: "",
    supplier: "",
    basePrice: "",
    iof: "",
    taxPercent: String(config.defaultTaxPercent),
    shipping: String(displayShipping),
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
  const [configDraft, setConfigDraft] = useState<ConfigDraft>(configToDraft(defaultConfig));
  const [draft, setDraft] = useState<DraftEntry>(emptyDraft(defaultConfig));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  const saveProjectsToDb = useCallback(
    async (payload: Project[], shouldMarkSaved = true) => {
      if (typeof window === "undefined") return;
      setProjects(payload);
      setIsSaving(true);
      try {
        await writeProjects(payload);
        if (shouldMarkSaved) {
          setDirty(false);
          setLastSavedAt(new Date().toLocaleString("pt-BR"));
        }
      } catch (error) {
        console.error("Erro ao salvar no banco local", error);
        if (shouldMarkSaved) {
          setDirty(true);
        }
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  const applyProject = useCallback((project: Project) => {
    setCurrentProjectId(project.id);
    setEntries(project.entries);
    setNotes(project.notes);
    setConfig(project.config || defaultConfig);
    setConfigDraft(configToDraft(project.config || defaultConfig));
    setFilters(project.filters || defaultFilters);
    setDraft(emptyDraft(project.config || defaultConfig));
    setEditingId(null);
    setDirty(false);
    setIsSaving(false);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    const load = async () => {
      try {
        const stored = await readProjects<StoredProject>();
        if (cancelled) return;
        if (stored.length) {
          const normalized = stored.map((project) => normalizeProject(project));
          setProjects(normalized);
          applyProject(normalized[0]);
          setLastSavedAt(new Date().toLocaleString("pt-BR"));
          setHydrated(true);
          setIsLoadingProjects(false);
          return;
        }
      } catch (error) {
        console.error("Erro ao carregar projetos salvos", error);
      }

      const defaultProject = normalizeProject({
        id: "PRJ-0001",
        name: "Projeto inicial",
        entries: initialEntries,
        config: defaultConfig,
        notes: "",
        filters: defaultFilters,
      });

      if (!cancelled) {
        setProjects([defaultProject]);
        applyProject(defaultProject);
        try {
          await saveProjectsToDb([defaultProject], true);
        } catch (error) {
          console.error("Erro ao salvar projeto padrão", error);
        }
        setHydrated(true);
        setIsLoadingProjects(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [applyProject, saveProjectsToDb]);

  const handleSelectProject = (projectId: string) => {
    const project = projects.find((item) => item.id === projectId);
    if (project) {
      applyProject(project);
    }
  };

  const normalizeConfigDraft = (draftConfig: ConfigDraft): Config => {
    const currencyMode: Config["currencyMode"] = draftConfig.currencyMode === "JPY" ? "JPY" : "BRL";
    const rate = Number(draftConfig.conversionRate || defaultConfig.conversionRate) || 1;
    const toBRLFromDraft = (value: string) => {
      const num = Number(value || 0);
      return currencyMode === "JPY" ? num * rate : num;
    };

    return {
      defaultIOFPercent: Number(draftConfig.defaultIOFPercent || 0),
      defaultTaxPercent: Number(draftConfig.defaultTaxPercent || 0),
      shippingTiers: [
        toBRLFromDraft(draftConfig.shippingTiers[0]),
        toBRLFromDraft(draftConfig.shippingTiers[1]),
        toBRLFromDraft(draftConfig.shippingTiers[2]),
      ],
      conversionRate: rate,
      currencyMode,
    };
  };

  const handleCreateProject = async () => {
    const name = newProjectName.trim() || `Projeto ${projects.length + 1}`;
    const id = `PRJ-${Date.now()}`;
    const normalizedConfig = normalizeConfigDraft(configDraft);
    setConfig(normalizedConfig);
    const project: Project = {
      id,
      name,
      entries: [],
      config: normalizedConfig,
      notes: "",
      filters: defaultFilters,
    };
    const updated = [project, ...projects];
    await saveProjectsToDb(updated);
    applyProject(project);
    setNewProjectName("");
  };

  const handleSaveProject = async () => {
    if (!currentProjectId) return;
    const normalizedConfig = normalizeConfigDraft(configDraft);
    setConfig(normalizedConfig);
    const updated = projects.map((project) =>
      project.id === currentProjectId ? { ...project, entries, config: normalizedConfig, notes, filters } : project,
    );
    await saveProjectsToDb(updated);
  };

  const rescaleForNewRate = useCallback(
    (value: string, prevRate: number, nextRate: number, mode: Config["currencyMode"]) => {
      if (mode === "BRL") return value;
      const num = Number(value || 0);
      const brl = num * (prevRate || 1);
      return String(nextRate ? brl / nextRate : 0);
    },
    [],
  );

  const handleCurrencyModeChange = (mode: Config["currencyMode"]) => {
    const prevMode = config.currencyMode;
    const rate = config.conversionRate || defaultConfig.conversionRate;
    if (mode === prevMode) return;

    const convertValue = (value: string) => {
      const num = Number(value || 0);
      const brl = prevMode === "JPY" ? num * rate : num;
      const display = mode === "JPY" ? brl / rate : brl;
      return String(display || 0);
    };

    setConfig((prev) => ({ ...prev, currencyMode: mode }));
    setConfigDraft((prev) => ({
      ...prev,
      currencyMode: mode,
      shippingTiers: prev.shippingTiers.map((tier) => convertValue(tier)) as [string, string, string],
    }));
    setDraft((prev) => ({
      ...prev,
      basePrice: convertValue(prev.basePrice),
      iof: convertValue(prev.iof),
      shipping: convertValue(prev.shipping),
    }));
    setDirty(true);
  };

  const handleConversionRateChange = (value: string) => {
    const nextRate = Number(value || 0) || 1;
    const prevRate = config.conversionRate || 1;
    setConfig((prev) => ({ ...prev, conversionRate: nextRate }));
    setConfigDraft((prev) => ({ ...prev, conversionRate: value }));

    if (config.currencyMode === "JPY") {
      const rescale = (input: string) => rescaleForNewRate(input, prevRate, nextRate, "JPY");
      setConfigDraft((prev) => ({
        ...prev,
        shippingTiers: prev.shippingTiers.map((tier) => rescale(tier)) as [string, string, string],
      }));
      setDraft((prev) => ({
        ...prev,
        basePrice: rescale(prev.basePrice),
        iof: rescale(prev.iof),
        shipping: rescale(prev.shipping),
      }));
    }
    setDirty(true);
  };

  const handleReloadFromStorage = async () => {
    if (typeof window === "undefined") return;
    try {
      const stored = await readProjects<StoredProject>();
      if (!stored.length) return;
      const normalized = stored.map((project) => normalizeProject(project));
      setProjects(normalized);
      const current = normalized.find((project) => project.id === currentProjectId) || normalized[0];
      if (current) applyProject(current);
      setDirty(false);
      setLastSavedAt(new Date().toLocaleString("pt-BR"));
    } catch (error) {
      console.error("Erro ao recarregar dados salvos", error);
    }
  };

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSearch =
        filters.search.trim().length === 0 ||
        `${entry.description} ${entry.supplier} ${entry.invoice} ${entry.recipient}`
          .toLowerCase()
          .includes(filters.search.toLowerCase());
      const matchesStatus = filters.status === "todas" || entry.status === filters.status;
      const matchesPaid =
        filters.paid === "todos" || (filters.paid === "pagos" ? entry.paid : !entry.paid);
      return matchesSearch && matchesStatus && matchesPaid;
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
          acc.taxes += entry.iof + taxValue(entry);
          acc.paidAmount += entry.paid ? cost : 0;
          return acc;
        },
        { invested: 0, revenue: 0, profit: 0, taxes: 0, paidAmount: 0 },
      ),
    [entries],
  );

  const toBRL = useCallback(
    (value: string | number) => {
      const num = Number(value || 0);
      return config.currencyMode === "JPY" ? num * (config.conversionRate || 1) : num;
    },
    [config.currencyMode, config.conversionRate],
  );

  const fromBRL = useCallback(
    (value: number) => {
      return config.currencyMode === "JPY" ? value / (config.conversionRate || 1) : value;
    },
    [config.currencyMode, config.conversionRate],
  );

  const formatAmount = useCallback(
    (valueBRL: number) => {
      return config.currencyMode === "JPY" ? currencyJPY.format(fromBRL(valueBRL)) : currencyBRL.format(valueBRL);
    },
    [config.currencyMode, fromBRL],
  );

  const draftBaseBRL = toBRL(draft.basePrice);
  const draftIofBRL = toBRL(draft.iof);
  const draftTaxPercent = Number(draft.taxPercent || config.defaultTaxPercent || 0);
  const draftTaxValueBRL = (draftTaxPercent / 100) * draftBaseBRL;
  const draftShippingBRL = toBRL(draft.shipping);
  const previewCostBRL = draftBaseBRL + draftIofBRL + draftTaxValueBRL + draftShippingBRL;
  const previewSalePriceBRL = previewCostBRL;
  const paidCount = entries.filter((entry) => entry.paid).length;
  const recipientCount = useMemo(
    () => new Set(entries.map((entry) => entry.recipient || "Sem destinatário")).size,
    [entries],
  );
  const paidRatio = entries.length ? Math.round((paidCount / entries.length) * 100) : 0;
  const shippingOptions = useMemo(() => config.shippingTiers || defaultConfig.shippingTiers, [config.shippingTiers]);
  const shippingOptionsDisplay = useMemo(() => shippingOptions.map((tier) => fromBRL(tier)), [fromBRL, shippingOptions]);
  const draftShippingInOptions = shippingOptionsDisplay.includes(Number(draft.shipping));
  const handleSaveConfig = async () => {
    if (!currentProjectId) return;
    const normalizedConfig = normalizeConfigDraft(configDraft);
    setConfig(normalizedConfig);
    setConfigDraft(configToDraft(normalizedConfig));
    if (!editingId) {
      setDraft((prev) => ({
        ...prev,
        taxPercent: String(normalizedConfig.defaultTaxPercent),
        shipping: String(normalizedConfig.shippingTiers[0]),
      }));
    }
    const updated = projects.map((project) =>
      project.id === currentProjectId ? { ...project, entries, config: normalizedConfig, notes, filters } : project,
    );
    await saveProjectsToDb(updated);
  };

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
      "Destinatário",
      "Fornecedor",
      "Preço base",
      "IOF",
      "Taxa (%)",
      "Taxa (valor)",
      "Transporte",
      "Total",
      "Preço final (auto)",
      "Lucro",
      "Margem",
      "Status",
      "Pago",
    ];

    const data = entries.map((entry) => [
      entry.id,
      entry.description,
      entry.recipient,
      entry.supplier,
      entry.basePrice,
      entry.iof,
      entry.taxPercent,
      taxValue(entry),
      entry.shipping,
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
    if (!draft.description.trim() || !draft.basePrice) return;

    const numbers = {
      basePrice: toBRL(draft.basePrice),
      iof: toBRL(draft.iof),
      taxPercent: Number(draft.taxPercent || config.defaultTaxPercent || 0),
      shipping: toBRL(draft.shipping),
    };

    const computedSalePrice = numbers.basePrice + numbers.iof + (numbers.taxPercent / 100) * numbers.basePrice + numbers.shipping;

    const parsed: ImportEntry = {
      id: editingId || `IMP-${(Date.now() % 100000).toString().padStart(5, "0")}`,
      description: draft.description.trim(),
      recipient: draft.recipient.trim() || "Sem destinatário",
      supplier: draft.supplier.trim(),
      status: draft.status,
      paid: draft.paid,
      eta: draft.eta.trim() || "—",
      invoice: draft.invoice.trim() || "—",
      ...numbers,
      salePrice: computedSalePrice,
    };

    setEntries((prev) => {
      if (editingId) {
        return prev.map((item) => (item.id === editingId ? parsed : item));
      }
      return [parsed, ...prev];
    });
    setDraft(emptyDraft(config));
    setEditingId(null);
    setDirty(true);
  };

  const handleEditRow = (entry: ImportEntry) => {
    setEditingId(entry.id);
    setDraft({
      description: entry.description,
      recipient: entry.recipient,
      supplier: entry.supplier,
      basePrice: String(fromBRL(entry.basePrice)),
      iof: String(fromBRL(entry.iof)),
      taxPercent: String(entry.taxPercent),
      shipping: String(fromBRL(entry.shipping)),
      status: entry.status,
      paid: entry.paid,
      eta: entry.eta,
      invoice: entry.invoice,
      iofTouched: true,
    });
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  const handleDeleteEntry = (id: string) => {
    const confirmed = window.confirm("Remover este item da planilha?");
    if (!confirmed) return;
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setDraft(emptyDraft(config));
    }
    setDirty(true);
  };

  useEffect(() => {
    if (hydrated && !draft.iofTouched) {
      setDraft((prev) => ({ ...prev, iof: calculateDefaultIof(prev.basePrice) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.defaultIOFPercent]);

  useEffect(() => {
    if (hydrated && !draft.taxPercent) {
      setDraft((prev) => ({ ...prev, taxPercent: String(config.defaultTaxPercent || 0) }));
    }
  }, [hydrated, draft.taxPercent, config.defaultTaxPercent]);

  useEffect(() => {
    if (editingId) return;
    if (!draft.shipping || !draftShippingInOptions) {
      setDraft((prev) => ({ ...prev, shipping: String(shippingOptionsDisplay[0] ?? 0) }));
    }
  }, [draft.shipping, draftShippingInOptions, shippingOptionsDisplay, editingId]);

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
            <span className="rounded-full bg-muted px-3 py-1">
              Moeda: {config.currencyMode === "JPY" ? "JPY (entrada/exibição)" : "BRL"}
            </span>
            <span className="rounded-full bg-muted px-3 py-1">
              1 JPY = {currencyBRL.format(config.conversionRate || defaultConfig.conversionRate)}
            </span>
            <span className="rounded-full bg-muted px-3 py-1">Status: {entries.length} itens</span>
            <span className="rounded-full bg-muted px-3 py-1">
              Margem média:{" "}
              {entries.length && totals.revenue ? `${((totals.profit / totals.revenue) * 100).toFixed(1)}%` : "—"}
            </span>
          </div>
          <div className="mt-2 w-full max-w-xl space-y-2 rounded-xl border border-border/70 bg-card/70 p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progresso de pagamento</span>
              <span>
                {entries.length ? `${paidRatio}% · ${paidCount}/${entries.length} pagos` : "Nenhum item lançado"}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div className="h-2 rounded-full bg-foreground" style={{ width: `${paidRatio}%` }} />
            </div>
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
            <div className="flex items-center gap-2">
              <CardTitle>Projetos</CardTitle>
              <Badge variant="success">Banco local</Badge>
            </div>
            <CardDescription>Salve e carregue conjuntos diferentes de itens, notas e configurações.</CardDescription>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {isLoadingProjects ? (
                <Badge variant="warning">Carregando projetos...</Badge>
              ) : isSaving ? (
                <Badge variant="warning">Salvando no banco...</Badge>
              ) : dirty ? (
                <Badge variant="warning">Alterações locais não salvas</Badge>
              ) : (
                <Badge variant="outline">Dados salvos no IndexedDB</Badge>
              )}
              {lastSavedAt && <span>Último salvamento: {lastSavedAt}</span>}
              <span className="rounded-full bg-muted px-2 py-1">Persistência local no navegador</span>
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
                  disabled={isLoadingProjects}
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
                  <Button variant="outline" type="button" onClick={handleCreateProject} disabled={isSaving}>
                    Criar
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 md:flex-row">
              <Button className="w-full md:w-auto" type="button" onClick={handleSaveProject} disabled={isSaving || !dirty}>
                {isSaving ? "Salvando..." : "Salvar projeto"}
              </Button>
              <Button variant="outline" className="w-full md:w-auto" type="button" onClick={handleReloadFromStorage}>
                Recarregar do banco
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
            <div>
              <CardDescription>Custo total importado</CardDescription>
              <CardTitle className="text-2xl">{formatAmount(totals.invested)}</CardTitle>
            </div>
            <Badge variant="outline">{paidCount} pagos</Badge>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {formatAmount(totals.paidAmount)} já liquidado, resto pendente.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="space-y-2 pb-4">
            <CardDescription>Receita estimada</CardDescription>
            <CardTitle className="text-2xl">{formatAmount(totals.revenue)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Lucro previsto: {formatAmount(totals.profit)} (
            {totals.revenue ? ((totals.profit / totals.revenue) * 100).toFixed(1) : "0"}%).
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="space-y-2 pb-4">
            <CardDescription>Impostos e taxas</CardDescription>
            <CardTitle className="text-2xl">{formatAmount(totals.taxes)}</CardTitle>
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
            <div className="mt-1 text-xs">Destinatários únicos: {recipientCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <CardTitle>Planilha de importações</CardTitle>
            <CardDescription>Filtre por status, pagamento e busque por invoice, fornecedor ou item.</CardDescription>
          </div>
          <div className="grid w-full gap-3 md:w-auto md:grid-cols-3">
            <div className="md:col-span-2">
              <Label htmlFor="search">Busca</Label>
              <Input
                id="search"
                placeholder="AirPods, INV-1001, destinatário, fornecedor..."
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
                <TableHead>Destinatário</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Custos</TableHead>
                <TableHead>Preço final</TableHead>
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
                    <div className="text-sm font-medium">{entry.recipient || "Sem destinatário"}</div>
                    <div className="text-xs text-muted-foreground">Quem recebe o item</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{entry.supplier}</div>
                    <div className="text-xs text-muted-foreground">Frete: {formatAmount(entry.shipping)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{formatAmount(totalCost(entry))}</div>
                    <div className="text-xs text-muted-foreground">
                      Base {formatAmount(entry.basePrice)} · IOF {formatAmount(entry.iof)} · Taxa{" "}
                      {formatAmount(taxValue(entry))} ({entry.taxPercent}%) · Frete {formatAmount(entry.shipping)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{formatAmount(entry.salePrice)}</div>
                    <div className="text-xs text-muted-foreground">Entrega: {entry.eta}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={profit(entry) >= 0 ? "success" : "warning"}>
                        {formatAmount(profit(entry))}
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteEntry(entry.id)}
                      >
                        Remover
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
                Soma dos custos: {formatAmount(filteredEntries.reduce((sum, entry) => sum + totalCost(entry), 0))}
              </span>
              <span>
                Lucro filtrado: {formatAmount(filteredEntries.reduce((sum, entry) => sum + profit(entry), 0))}
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
                <Label>Taxa (%)</Label>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={draft.taxPercent}
                  onChange={(event) => setDraft((prev) => ({ ...prev, taxPercent: event.target.value }))}
                />
              </div>
              <div>
                <Label>Transporte</Label>
                <Select
                  value={draft.shipping}
                  onChange={(event) => setDraft((prev) => ({ ...prev, shipping: event.target.value }))}
                >
                  {shippingOptions.map((tier, index) => (
                    <option key={`${tier}-${index}`} value={shippingOptionsDisplay[index]}>
                      Faixa {index + 1} — {formatAmount(tier)}
                    </option>
                  ))}
                  {!draftShippingInOptions && (
                    <option value={draft.shipping}>Valor salvo — {formatAmount(toBRL(draft.shipping))}</option>
                  )}
                </Select>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-border/70 bg-muted/40 p-4">
                <div className="text-xs text-muted-foreground">Custo final</div>
                <div className="text-xl font-semibold">{formatAmount(previewCostBRL)}</div>
                <div className="text-xs text-muted-foreground">
                  Inclui IOF, taxa percentual aplicada e frete configurado.
                </div>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/40 p-4">
                <div className="text-xs text-muted-foreground">Preço de venda (auto)</div>
                <div className="text-xl font-semibold">{formatAmount(previewSalePriceBRL)}</div>
                <div className="text-xs text-muted-foreground">Gerado a partir do custo total.</div>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/40 p-4">
                <div className="text-xs text-muted-foreground">Ponto de equilíbrio</div>
                <div className="text-xl font-semibold">
                  {formatAmount(previewCostBRL > 0 ? previewCostBRL : 0)}
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
                <div className="grid gap-3 sm:grid-cols-3">
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
                    <Label htmlFor="recipient">Destinatário</Label>
                    <Input
                      id="recipient"
                      placeholder="Quem vai receber"
                      value={draft.recipient}
                      onChange={(event) => setDraft((prev) => ({ ...prev, recipient: event.target.value }))}
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
                  <div>
                    <Label htmlFor="eta">Entrega/ETA (opcional)</Label>
                    <Input
                      id="eta"
                      placeholder="dd/mm"
                      value={draft.eta}
                      onChange={(event) => setDraft((prev) => ({ ...prev, eta: event.target.value }))}
                    />
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
                    <Label htmlFor="taxPercent">Taxa (%)</Label>
                    <Input
                      id="taxPercent"
                      type="number"
                      placeholder="0,00"
                      value={draft.taxPercent}
                      onChange={(event) => setDraft((prev) => ({ ...prev, taxPercent: event.target.value }))}
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Padrão do projeto: {formatPercent(config.defaultTaxPercent)} sobre o preço base.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="shipping">Transporte</Label>
                    <Select
                      id="shipping"
                      value={draft.shipping}
                      onChange={(event) => setDraft((prev) => ({ ...prev, shipping: event.target.value }))}
                    >
                      {shippingOptions.map((tier, index) => (
                        <option key={`${tier}-${index}`} value={shippingOptionsDisplay[index]}>
                          Faixa {index + 1} — {formatAmount(tier)}
                        </option>
                      ))}
                      {!draftShippingInOptions && (
                        <option value={draft.shipping}>
                          Valor salvo — {formatAmount(toBRL(draft.shipping))}
                        </option>
                      )}
                    </Select>
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
                  <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                    Preço de venda é calculado automaticamente: base + IOF + taxa (%) + frete.
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Resumo do lançamento</div>
                  <div className="text-sm text-muted-foreground">
                    Total: <span className="font-semibold text-foreground">{formatAmount(previewCostBRL)}</span> · Preço
                    final salvo:{" "}
                    <span className="font-semibold text-foreground">{formatAmount(previewSalePriceBRL)}</span>
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
                        setDraft(emptyDraft(config));
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
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Moeda de entrada/visualização</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={config.currencyMode === "BRL" ? "primary" : "outline"}
                      onClick={() => handleCurrencyModeChange("BRL")}
                    >
                      BRL
                    </Button>
                    <Button
                      type="button"
                      variant={config.currencyMode === "JPY" ? "primary" : "outline"}
                      onClick={() => handleCurrencyModeChange("JPY")}
                    >
                      JPY
                    </Button>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Troca a moeda de entrada e exibição; cálculos continuam armazenados em BRL.
                  </p>
                </div>
                <div>
                  <Label htmlFor="conversionRate">Conversão JPY → BRL</Label>
                  <Input
                    id="conversionRate"
                    type="number"
                    step="0.0001"
                    value={configDraft.conversionRate}
                    onChange={(event) => handleConversionRateChange(event.target.value)}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">Usado para converter JPY em BRL.</p>
                </div>
              </div>
              <div>
                <Label htmlFor="defaultIof">IOF padrão (%)</Label>
                <Input
                  id="defaultIof"
                  type="number"
                  step="0.1"
                  value={configDraft.defaultIOFPercent}
                  onChange={(event) => {
                    setConfigDraft((prev) => ({ ...prev, defaultIOFPercent: event.target.value }));
                    setDirty(true);
                  }}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Ex: 3,5% (Brasil) aplicado sobre o preço base ao criar um item.
                </p>
              </div>
              <div>
                <Label htmlFor="defaultTax">Taxa padrão (%)</Label>
                <Input
                  id="defaultTax"
                  type="number"
                  step="0.1"
                  value={configDraft.defaultTaxPercent}
                  onChange={(event) => {
                    setConfigDraft((prev) => ({ ...prev, defaultTaxPercent: event.target.value }));
                    setDirty(true);
                  }}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Aplicada sobre o preço base (antes chamada de outras taxas).
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {configDraft.shippingTiers.map((tier, index) => (
                  <div key={`tier-${index}`}>
                    <Label>Faixa de transporte {index + 1}</Label>
                    <Input
                      type="number"
                      value={tier}
                      onChange={(event) => {
                        const value = event.target.value;
                        setConfigDraft((prev) => {
                          const next: [string, string, string] = [...prev.shippingTiers] as [string, string, string];
                          next[index] = value;
                          return { ...prev, shippingTiers: next };
                        });
                        setDirty(true);
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={handleSaveConfig} disabled={isSaving || isLoadingProjects}>
                  {isSaving ? "Salvando..." : "Salvar configurações"}
                </Button>
                <div className="text-xs text-muted-foreground">
                  Aplica os padrões em novos lançamentos e salva o projeto.
                </div>
              </div>
              <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                Preço final é calculado automaticamente: preço base + IOF + taxa (%) + frete da faixa escolhida.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
