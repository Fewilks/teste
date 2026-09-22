# Spirits TCG Portal

Plataforma de gestão competitiva para o time **Spirits** de Pokémon TCG. Gerencie coleções de cartas do time, controle de empréstimos, decks oficiais (compatíveis com Pokémon TCG Live), histórico de partidas e metagame competitivo.

---

## 🚀 Como Rodar o Projeto via GitHub

### Pré-requisitos
- **Node.js**: Versão 18 ou superior (recomendado Node 20 ou 22 LTS).
- **npm** (ou `yarn` / `pnpm`).

### Passo a Passo

1. **Clonar o repositório:**
   ```bash
   git clone https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
   cd SEU-REPOSITORIO
   ```

2. **Instalar as dependências:**
   ```bash
   npm install
   ```

3. **Configuração de Variáveis de Ambiente (Opcional):**
   Copie o arquivo `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```
   > Se desejar utilizar o assistente por inteligência artificial (Gemini), insira sua chave em `GEMINI_API_KEY`. O Firebase e o acervo já contam com configuração pronta para uso.

4. **Executar em Modo de Desenvolvimento:**
   ```bash
   npm run dev
   ```
   O servidor inicializará na porta **3000** com integração do Vite:
   Acesse: [http://localhost:3000](http://localhost:3000)

5. **Compilar e Executar em Produção:**
   ```bash
   npm run build
   npm start
   ```
   - `npm run build`: Compila os assets do frontend com Vite em `dist/` e empacota o backend Node.js com `esbuild` em `dist/server.cjs`.
   - `npm start`: Inicia o servidor de produção servindo a aplicação e todas as rotas `/api/*`.

---

## 🛠️ Scripts Disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor Express com middleware do Vite (recarregamento ágil) |
| `npm run build` | Compila o frontend SPA e empacota o servidor backend em `dist/server.cjs` |
| `npm start` | Executa o servidor compilado para produção |
| `npm run lint` | Valida a tipagem TypeScript em todo o projeto (`tsc --noEmit`) |
| `npm run clean` | Remove pastas de build geradas (`dist/`) |

---

## 📦 Arquitetura do Projeto

- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide React, Motion.
- **Backend**: Node.js & Express (`server.ts`), roteando chamadas de API, consultas e busca de cartas ao TCGdex e pokemontcg.io.
- **PTCGL First**: Padrão canônico de cartas (ex: `SSP 057`, `PRE 161`, `ASC 001`), com busca direta por coleções completas e imagens em alta definição em português (PT-BR) com fallback automático.
- **Persistência**: Firebase Firestore em tempo real (`firebase-applet-config.json` e `src/lib/firebase.ts`) para sincronização da coleção, decks e histórico entre todos os membros do time.
