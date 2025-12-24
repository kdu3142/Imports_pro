import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { notifyProjectsUpdated } from "@/lib/projectEvents";

const dataDir = path.join(process.cwd(), ".local");
const dataFile = path.join(dataDir, "projects.json");

async function ensureFile() {
  try {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, "[]", "utf-8");
  }
}

export async function GET() {
  try {
    await ensureFile();
    const raw = await fs.readFile(dataFile, "utf-8");
    const parsed = JSON.parse(raw || "[]");
    return NextResponse.json(Array.isArray(parsed) ? parsed : []);
  } catch (error) {
    console.error("Erro ao ler arquivo de projetos", error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
    }
    await ensureFile();
    await fs.writeFile(dataFile, JSON.stringify(body, null, 2), "utf-8");
    notifyProjectsUpdated();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao salvar arquivo de projetos", error);
    return NextResponse.json({ error: "Falha ao salvar" }, { status: 500 });
  }
}
