# 💰 Finanças Fácil

> Sistema de gestão financeira pessoal — Projeto Acadêmico de Gestão Ágil de Projetos

---

## 📌 Sobre o Projeto

**Finanças Fácil** é um sistema web de gestão financeira pessoal desenvolvido como projeto prático da disciplina de **Gestão Ágil de Projetos**, aplicando a metodologia **Scrum** com 4 sprints incrementais.

O sistema permite controlar receitas, despesas, metas financeiras e visualizar dados em gráficos interativos — tudo de forma **gratuita, local e sem necessidade de cadastro**.

---

## 🚀 Como Abrir

### Opção 1 — Abrir direto no navegador
Basta dar duplo clique no arquivo:
```
index.html
```

### Opção 2 — Servidor local (recomendado ✅)
Ativa todas as funcionalidades, incluindo PWA instalável e modo offline:

```bash
# Na pasta do projeto:
python -m http.server 8080
```

Depois acesse no navegador: **http://localhost:8080**

---

## ✨ Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| 📊 Dashboard | Resumo de receitas, despesas e saldo em tempo real |
| 🍩 Gráfico de pizza | Gastos por categoria (Chart.js) |
| 📈 Evolução do saldo | Gráfico de linha mensal (Chart.js) |
| 🎯 Meta financeira | Barra de progresso com reset |
| 🔍 Busca e filtros | Por descrição, mês e tipo |
| ↕️ Ordenação | Por data, valor ou categoria |
| 📤 Exportar CSV | Exporta lançamentos formatados |
| 💾 Backup JSON | Exporta todos os dados |
| 📥 Importar JSON | Restaura backup |
| 🔁 Recorrentes | Marcação de lançamentos mensais |
| 🗑️ Exclusão segura | Modal de confirmação |
| 📅 Resumo mensal | Comparativo com mês anterior |
| 👋 Tutorial | Guia de boas-vindas (primeira visita) |
| ⌨️ Atalhos | `N` = novo lançamento, `Esc` = cancelar |
| 🌙 Tema escuro | Alternância entre claro e escuro |
| 📱 PWA | Instalável como app no celular/desktop |

---

## 🎨 Animações

- **Scroll reveal** — elementos surgem ao rolar a página (IntersectionObserver)
- **Ripple** — onda circular no clique de botões
- **Tilt 3D** — perspectiva suave ao mover o mouse sobre os cards
- **Hero entrance** — entrada em cascata dos elementos do hero
- **Navbar slide** — barra desce suavemente ao carregar
- **Card pulse** — cards piscam em verde ao atualizar valores
- **Levitação** — cartão decorativo do hero levita continuamente
- **Partículas** — animações de fundo em Canvas 2D em todas as seções

---

## 🛠️ Tecnologias

| Tecnologia | Uso |
|---|---|
| HTML5 | Estrutura semântica e acessível |
| CSS3 | Design system, animações, tema escuro |
| JavaScript ES6+ | Lógica, CRUD, filtros, exportação |
| Chart.js 4.4 | Gráficos de pizza e linha |
| Canvas 2D | Sistema de partículas animadas |
| localStorage | Persistência de dados no dispositivo |
| Service Worker | PWA e cache offline |
| Web Manifest | Instalação como aplicativo |

---

## 📁 Estrutura de Arquivos

```
financas-facil/
├── index.html      → Estrutura HTML (todas as seções e modais)
├── style.css       → Estilos, tema escuro, animações CSS
├── script.js       → Lógica principal (CRUD, gráficos, filtros)
├── animacoes.js    → Sistema de animações (scroll reveal, ripple, tilt)
├── particulas.js   → Animação de partículas em Canvas 2D
├── manifest.json   → Configuração PWA
├── sw.js           → Service Worker (cache offline)
└── README.md       → Esta documentação
```

---

## 📅 Sprints (Metodologia Scrum)

| Sprint | Entregável |
|---|---|
| **Sprint 1** | Estrutura base, navbar, hero section e paleta visual |
| **Sprint 2** | Dashboard, formulário de lançamento e persistência localStorage |
| **Sprint 3** | Animações de partículas, transições entre seções e tema escuro |
| **Sprint 4** | Gráficos Chart.js, exportação CSV/JSON, PWA, busca, filtros e animações |

---

## 👥 Equipe

> Projeto desenvolvido como entrega acadêmica da disciplina de Gestão Ágil de Projetos.

---

*© 2026 Finanças Fácil — Projeto Acadêmico*
