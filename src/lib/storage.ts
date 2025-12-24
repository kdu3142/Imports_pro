export async function readProjects<T>(): Promise<T[]> {
  try {
    const response = await fetch("/api/projects", { cache: "no-store" });
    if (!response.ok) throw new Error("Erro ao carregar projetos");
    const data = await response.json();
    return Array.isArray(data) ? (data as T[]) : [];
  } catch (error) {
    console.error("Falha ao ler projetos do arquivo", error);
    return [];
  }
}

export async function writeProjects<T extends { id: string }>(projects: T[]): Promise<void> {
  await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(projects),
  });
}
