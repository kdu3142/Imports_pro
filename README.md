# Controle de Importações

Planilha interativa em Next.js + Tailwind para controlar importações, custos, IOF, transporte e margens. Suporta múltiplos projetos salvos no próprio navegador, configuração de IOF padrão e edição de linhas mesmo depois de salvas.

## Como rodar

1) Garanta que o Node local esteja no PATH (usamos o binário baixado em `.local`):
```bash
PATH="$PWD/.local/node-v20.11.1-darwin-arm64/bin:$PATH"
```
2) Instale dependências (já feito ao subir este branch, mas execute se precisar):
```bash
npm install
```
3) Suba o servidor:
```bash
PATH="$PWD/.local/node-v20.11.1-darwin-arm64/bin:$PATH" npm run dev
```
4) Abra http://localhost:3000.

## Fluxo rápido
- **Projetos**: selecione um existente ou crie um novo (nome livre). Tudo (linhas, filtros, notas, config) fica salvo por projeto.
- **Salvar**: clique em “Salvar projeto” quando aparecer “Alterações não salvas”. Persistência via `localStorage` do navegador.
- **Config padrão**: ajuste o IOF padrão (%) em “Configurações do projeto”. Ao digitar um preço base, o IOF é calculado automaticamente com esse percentual; você pode sobrescrever por linha.
- **Adicionar/editar**: use o formulário. Campos obrigatórios: Item, Preço base, Preço de venda. Os demais são opcionais. Clique em “Editar” na tabela para reabrir uma linha e alterar qualquer campo.
- **Pagos**: troque o switch na tabela; os totais são recalculados.
- **Filtros**: busque por item/fornecedor/invoice, filtre por status, pagamento e categoria.
- **Exportar**: botão “Exportar CSV” gera o arquivo `planilha-importacoes.csv` com todos os campos principais.
- **Notas**: bloco de notas por projeto (não aparece no CSV, apenas referência interna).

## O que é salvo
- Itens/linhas com todos os campos, status e flag de pagamento.
- Configuração de IOF padrão, filtros atuais e notas.
- Cada projeto fica no `localStorage` da máquina e do navegador em que foi salvo. Limpar cache ou usar outro dispositivo resetará os dados.

## Stack
- Next.js (App Router) + React + TypeScript
- Tailwind CSS v4 + UI inspirada no shadcn/ui (componentes locais em `src/components/ui/`)

