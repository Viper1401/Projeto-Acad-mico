/* =====================================================
   Finanças Fácil — Lógica Principal (v2.0)
   Projeto Acadêmico: Gestão Ágil de Projetos
   Descrição: CRUD de lançamentos, dashboard, gráficos
              Chart.js, exportação CSV/JSON, busca,
              filtros, ordenação, meta, tutorial e PWA.
   ===================================================== */

'use strict';

/* ──────────────────────────────────────────────────────
   1. ESTADO GLOBAL DA APLICAÇÃO
────────────────────────────────────────────────────── */
const Estado = {
  lancamentos:   [],         // Lista de objetos de lançamento
  filtroAtivo:   'todos',    // 'todos' | 'receita' | 'despesa'
  editandoId:    null,       // ID em edição (null = novo)
  metaValor:     1000,       // Valor da meta financeira (R$)
  tema:          'claro',    // 'claro' | 'escuro'
  termoBusca:    '',         // Texto de busca por descrição
  filtroMes:     '',         // 'YYYY-MM' ou '' (todos)
  ordenacao:     'data-desc',// Critério de ordenação da lista
};

/* ──────────────────────────────────────────────────────
   2. CONSTANTES E CONFIGURAÇÕES
────────────────────────────────────────────────────── */
const CHAVES_ARMAZENAMENTO = {
  LANCAMENTOS: 'ff_lancamentos',
  META:        'ff_meta',
  TEMA:        'ff_tema',
  TUTORIAL:    'ff_tutorial', // Controla se tutorial já foi exibido
};

const EMOJIS_CATEGORIA = {
  'Salário':          '💼',
  'Freelance':        '💻',
  'Investimentos':    '📈',
  'Outros (receita)': '✨',
  'Moradia':          '🏠',
  'Alimentação':      '🍽️',
  'Transporte':       '🚗',
  'Saúde':            '💊',
  'Educação':         '📚',
  'Lazer':            '🎮',
  'Vestuário':        '👕',
  'Mercado':          '🛒',
  'Outros (despesa)': '📌',
};

/* Paleta de cores para o gráfico de pizza */
const PALETA_GRAFICO = [
  '#16a34a','#22c55e','#d4a017','#f59e0b','#3b82f6',
  '#8b5cf6','#ec4899','#ef4444','#06b6d4','#84cc16',
];

/* ──────────────────────────────────────────────────────
   3. FUNÇÕES UTILITÁRIAS
────────────────────────────────────────────────────── */

/** Formata um número como moeda brasileira: R$ 1.234,56 */
function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Formata uma data ISO (YYYY-MM-DD) para DD/MM/AAAA */
function formatarData(dataISO) {
  if (!dataISO) return '—';
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
}

/** Retorna a data de hoje no formato YYYY-MM-DD */
function hoje() {
  return new Date().toISOString().split('T')[0];
}

/** Gera um identificador único baseado em timestamp + aleatório */
function gerarId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/** Remove tags HTML para prevenir XSS */
function sanitizarTexto(texto) {
  const div = document.createElement('div');
  div.textContent = String(texto);
  return div.innerHTML;
}

/** Define o textContent de um elemento pelo ID */
function definirTexto(id, texto) {
  const el = document.getElementById(id);
  if (el) el.textContent = texto;
}

/** Define o value de um input/select pelo ID */
function definirValor(id, valor) {
  const el = document.getElementById(id);
  if (el) el.value = valor;
}

/* ──────────────────────────────────────────────────────
   4. PERSISTÊNCIA (localStorage)
────────────────────────────────────────────────────── */

/** Carrega todos os dados persistidos do armazenamento local */
function carregarDados() {
  try {
    const lancamentosJSON = localStorage.getItem(CHAVES_ARMAZENAMENTO.LANCAMENTOS);
    if (lancamentosJSON) {
      Estado.lancamentos = JSON.parse(lancamentosJSON);
    }
    const metaSalva = localStorage.getItem(CHAVES_ARMAZENAMENTO.META);
    if (metaSalva) {
      Estado.metaValor = parseFloat(metaSalva);
    }
    const temaSalvo = localStorage.getItem(CHAVES_ARMAZENAMENTO.TEMA);
    if (temaSalvo) {
      Estado.tema = temaSalvo;
    }
  } catch (erro) {
    console.warn('Finanças Fácil: erro ao carregar dados:', erro);
  }
}

/** Persiste o estado atual no armazenamento local */
function salvarDados() {
  try {
    localStorage.setItem(CHAVES_ARMAZENAMENTO.LANCAMENTOS, JSON.stringify(Estado.lancamentos));
    localStorage.setItem(CHAVES_ARMAZENAMENTO.META,        String(Estado.metaValor));
    localStorage.setItem(CHAVES_ARMAZENAMENTO.TEMA,        Estado.tema);
  } catch (erro) {
    console.warn('Finanças Fácil: erro ao salvar dados:', erro);
    mostrarAviso('Não foi possível salvar os dados.', 'erro', '⚠️');
  }
}

/* ──────────────────────────────────────────────────────
   5. CÁLCULOS FINANCEIROS
────────────────────────────────────────────────────── */

function calcularReceitas() {
  return Estado.lancamentos
    .filter(l => l.tipo === 'receita')
    .reduce((acc, l) => acc + l.valor, 0);
}

function calcularDespesas() {
  return Estado.lancamentos
    .filter(l => l.tipo === 'despesa')
    .reduce((acc, l) => acc + l.valor, 0);
}

function calcularSaldo() {
  return calcularReceitas() - calcularDespesas();
}

/** Agrupa despesas por categoria e retorna ordenado por valor */
function calcularGastosPorCategoria() {
  const mapa = {};
  Estado.lancamentos
    .filter(l => l.tipo === 'despesa')
    .forEach(l => {
      mapa[l.categoria] = (mapa[l.categoria] || 0) + l.valor;
    });
  return Object.entries(mapa)
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total);
}

/** Retorna a categoria com maior gasto, ou null se não houver */
function obterMaiorCategoria() {
  const gastos = calcularGastosPorCategoria();
  return gastos.length > 0 ? gastos[0] : null;
}

/**
 * Agrupa lançamentos por mês (YYYY-MM) calculando
 * receitas e despesas de cada período.
 */
function calcularResumoMensal() {
  const resumo = {};
  Estado.lancamentos.forEach(l => {
    const mes = (l.data || '').slice(0, 7); // 'YYYY-MM'
    if (!mes) return;
    if (!resumo[mes]) resumo[mes] = { receitas: 0, despesas: 0 };
    if (l.tipo === 'receita') resumo[mes].receitas += l.valor;
    else                      resumo[mes].despesas += l.valor;
  });
  return resumo;
}

/**
 * Calcula a tendência de despesas comparando mês atual com o anterior.
 * @returns {{ percentual: string, tendencia: 'melhor'|'pior'|'estavel'|'neutro', despesasMes: number, despesasAnterior: number }}
 */
function calcularTendencia() {
  const agora      = new Date();
  const mesAtual   = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
  const dataAnter  = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
  const mesAnterior = `${dataAnter.getFullYear()}-${String(dataAnter.getMonth() + 1).padStart(2, '0')}`;

  const despAtual  = Estado.lancamentos
    .filter(l => l.tipo === 'despesa' && (l.data || '').startsWith(mesAtual))
    .reduce((acc, l) => acc + l.valor, 0);

  const despAnter  = Estado.lancamentos
    .filter(l => l.tipo === 'despesa' && (l.data || '').startsWith(mesAnterior))
    .reduce((acc, l) => acc + l.valor, 0);

  if (despAnter === 0) return { percentual: '0', tendencia: 'neutro', despesasMes: despAtual, despesasAnterior: despAnter };

  const variacao = ((despAtual - despAnter) / despAnter) * 100;
  return {
    percentual:        Math.abs(variacao).toFixed(1),
    tendencia:         variacao > 5 ? 'pior' : variacao < -5 ? 'melhor' : 'estavel',
    despesasMes:       despAtual,
    despesasAnterior:  despAnter,
  };
}

/* ──────────────────────────────────────────────────────
   6. PAINEL (DASHBOARD)
────────────────────────────────────────────────────── */

/** Atualiza todos os cards de resumo do dashboard */
function atualizarPainel() {
  const receitas  = calcularReceitas();
  const despesas  = calcularDespesas();
  const saldo     = receitas - despesas;
  const maiorCat  = obterMaiorCategoria();
  const qtdReceitas = Estado.lancamentos.filter(l => l.tipo === 'receita').length;
  const qtdDespesas = Estado.lancamentos.filter(l => l.tipo === 'despesa').length;

  definirTexto('cardReceitas',     formatarMoeda(receitas));
  definirTexto('cardDespesas',     formatarMoeda(despesas));
  definirTexto('cardSaldo',        formatarMoeda(saldo));
  definirTexto('cardReceitasQtd',  `${qtdReceitas} lançamento${qtdReceitas !== 1 ? 's' : ''}`);
  definirTexto('cardDespesasQtd',  `${qtdDespesas} lançamento${qtdDespesas !== 1 ? 's' : ''}`);

  const elSaldo = document.getElementById('cardSaldo');
  if (elSaldo) {
    elSaldo.style.color = saldo >= 0 ? 'var(--verde-primario)' : 'var(--vermelho)';
  }

  if (maiorCat) {
    const emoji = EMOJIS_CATEGORIA[maiorCat.categoria] || '📌';
    definirTexto('cardCategoria',    `${emoji} ${maiorCat.categoria}`);
    definirTexto('cardCategoryValor', formatarMoeda(maiorCat.total));
  } else {
    definirTexto('cardCategoria',    '—');
    definirTexto('cardCategoryValor', 'Nenhuma categoria');
  }

  const status = saldo === 0 ? 'Sem movimentações' : saldo > 0 ? '✅ Saldo positivo' : '⚠️ Saldo negativo';
  definirTexto('cardSaldoStatus', status);

  /* Atualiza data e cartões do hero */
  const dataAgora = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  definirTexto('dashboardData', dataAgora.charAt(0).toUpperCase() + dataAgora.slice(1));
  atualizarBarraHero(saldo);
}

/** Atualiza os valores visuais do cartão decorativo do hero */
function atualizarBarraHero(saldo) {
  definirTexto('heroSaldo',    formatarMoeda(saldo));
  definirTexto('heroReceitas', formatarMoeda(calcularReceitas()));
  definirTexto('heroDespesas', formatarMoeda(calcularDespesas()));

  const pct = Estado.metaValor > 0
    ? Math.min(100, (saldo / Estado.metaValor) * 100)
    : 0;
  const barraHero = document.getElementById('heroBarFill');
  if (barraHero) barraHero.style.width = `${Math.max(0, pct)}%`;
}

/* ──────────────────────────────────────────────────────
   7. RESUMO MENSAL E TENDÊNCIA
────────────────────────────────────────────────────── */

/** Atualiza o card de resumo mensal e o indicador de tendência */
function atualizarResumoMensal() {
  const agora    = new Date();
  const mesAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;

  const resumo = calcularResumoMensal();
  const dadosMes = resumo[mesAtual] || { receitas: 0, despesas: 0 };

  definirTexto('resumoReceitasMes', formatarMoeda(dadosMes.receitas));
  definirTexto('resumoDespesasMes', formatarMoeda(dadosMes.despesas));

  const tendencia = calcularTendencia();
  const badge     = document.getElementById('tendenciaBadge');
  const info      = document.getElementById('tendenciaInfo');
  const variacao  = document.getElementById('resumoVariacao');

  if (tendencia.tendencia === 'neutro') {
    if (badge)   { badge.textContent = '—'; badge.className = 'card-badge'; }
    if (variacao) variacao.textContent = '—';
    if (info)     info.textContent = '';
    return;
  }

  const dir = {
    melhor: { icone: '↓', cor: 'verde',    txt: 'Gastos caíram' },
    pior:   { icone: '↑', cor: 'vermelho', txt: 'Gastos subiram' },
    estavel:{ icone: '→', cor: '',         txt: 'Gastos estáveis' },
  }[tendencia.tendencia];

  if (badge) {
    badge.textContent  = `${dir.icone} ${tendencia.percentual}%`;
    badge.className    = `card-badge ${dir.cor}`;
  }
  if (variacao) variacao.textContent = `${dir.icone} ${tendencia.percentual}%`;
  if (info)     info.textContent     = `${dir.txt} vs. mês anterior`;
}

/* ──────────────────────────────────────────────────────
   8. LISTA DE LANÇAMENTOS
────────────────────────────────────────────────────── */

/** Preenche o seletor de meses com os períodos existentes */
function preencherFiltroMeses() {
  const select = document.getElementById('filtroMes');
  if (!select) return;

  /* Coleta todos os meses únicos dos lançamentos */
  const meses = [...new Set(
    Estado.lancamentos
      .map(l => (l.data || '').slice(0, 7))
      .filter(Boolean)
  )].sort().reverse();

  /* Preserva a opção "todos os meses" e recria as demais */
  while (select.options.length > 1) select.remove(1);

  meses.forEach(mes => {
    const [ano, m] = mes.split('-');
    const nomeMes  = new Date(Number(ano), Number(m) - 1, 1)
      .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const option   = document.createElement('option');
    option.value   = mes;
    option.textContent = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
    select.appendChild(option);
  });
}

/** Aplica filtros, busca e ordenação e renderiza a lista */
function renderizarLista() {
  const container = document.getElementById('listaLancamentos');
  if (!container) return;

  /* Filtra por tipo (todos / receita / despesa) */
  let lista = Estado.filtroAtivo === 'todos'
    ? [...Estado.lancamentos]
    : Estado.lancamentos.filter(l => l.tipo === Estado.filtroAtivo);

  /* Filtra por período (mês selecionado) */
  if (Estado.filtroMes) {
    lista = lista.filter(l => (l.data || '').startsWith(Estado.filtroMes));
  }

  /* Filtra por busca de texto (descrição) */
  if (Estado.termoBusca.trim()) {
    const termo = Estado.termoBusca.trim().toLowerCase();
    lista = lista.filter(l =>
      (l.descricao || '').toLowerCase().includes(termo) ||
      (l.categoria || '').toLowerCase().includes(termo)
    );
  }

  /* Ordena conforme o critério selecionado */
  lista.sort((a, b) => {
    switch (Estado.ordenacao) {
      case 'data-asc':    return (a.data || '').localeCompare(b.data || '');
      case 'data-desc':   return (b.data || '').localeCompare(a.data || '');
      case 'valor-desc':  return b.valor - a.valor;
      case 'valor-asc':   return a.valor - b.valor;
      case 'categoria':   return (a.categoria || '').localeCompare(b.categoria || '');
      default:            return (b.data || '').localeCompare(a.data || '');
    }
  });

  /* Atualiza badge de total */
  definirTexto('totalLancamentosBadge', String(Estado.lancamentos.length));

  /* Renderiza vazio */
  if (lista.length === 0) {
    const semResultados = Estado.termoBusca || Estado.filtroMes
      ? '<div class="empty-state"><div class="es-icon">🔍</div><p>Nenhum resultado para os filtros aplicados.</p></div>'
      : '<div class="empty-state"><div class="es-icon">📭</div><p>Nenhum lançamento ainda.<br>Cadastre seu primeiro acima!</p></div>';
    container.innerHTML = semResultados;
    return;
  }

  /* Constrói os itens da lista */
  container.innerHTML = lista.map(lancamento => {
    const emoji      = EMOJIS_CATEGORIA[lancamento.categoria] || '📌';
    const isReceita  = lancamento.tipo === 'receita';
    const classeSignal = isReceita ? 'item-receita' : 'item-despesa';
    const prefixo      = isReceita ? '+' : '-';
    const badgeRec     = lancamento.recorrente
      ? '<span class="badge-recorrente" title="Lançamento recorrente">🔁</span>'
      : '';

    return `
      <div class="lancamento-item ${classeSignal}" role="listitem" id="item-${lancamento.id}">
        <div class="item-icon" aria-hidden="true">${emoji}</div>
        <div class="item-info">
          <div class="item-desc">${sanitizarTexto(lancamento.descricao)} ${badgeRec}</div>
          <div class="item-meta">
            <span class="item-cat">${sanitizarTexto(lancamento.categoria)}</span>
            <span class="item-data">${formatarData(lancamento.data)}</span>
          </div>
        </div>
        <div class="item-valor ${isReceita ? 'txt-verde' : 'txt-vermelho'}">
          ${prefixo}${formatarMoeda(lancamento.valor)}
        </div>
        <div class="item-acoes">
          <button
            class="btn-icon btn-editar"
            onclick="editarLancamento('${lancamento.id}')"
            aria-label="Editar lançamento ${sanitizarTexto(lancamento.descricao)}"
            title="Editar">✏️</button>
          <button
            class="btn-icon btn-excluir"
            onclick="confirmarExclusao('${lancamento.id}')"
            aria-label="Excluir lançamento ${sanitizarTexto(lancamento.descricao)}"
            title="Excluir">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

/* ──────────────────────────────────────────────────────
   9. GRÁFICOS (Chart.js)
────────────────────────────────────────────────────── */

let graficoPizza = null; // Instância do gráfico de rosca
let graficoLinha = null; // Instância do gráfico de linha

/** Inicializa os gráficos Chart.js após o carregamento da página */
function inicializarGraficos() {
  if (typeof Chart === 'undefined') {
    /* Chart.js não carregou — mostra fallback de barras */
    const grafico = document.getElementById('grafico');
    if (grafico) grafico.style.display = 'block';
    return;
  }

  /* Estilo global adaptado ao tema */
  Chart.defaults.font.family    = "'Inter', sans-serif";
  Chart.defaults.color           = '#6b7280';
  Chart.defaults.borderColor     = 'rgba(255,255,255,0.06)';

  inicializarGraficoPizza();
  inicializarGraficoLinha();
}

function inicializarGraficoPizza() {
  const canvas = document.getElementById('canvasGraficoPizza');
  if (!canvas) return;

  graficoPizza = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels:   [],
      datasets: [{
        data:            [],
        backgroundColor: PALETA_GRAFICO,
        borderColor:     'transparent',
        borderWidth:     0,
        hoverOffset:     6,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: true,
      cutout:              '62%',
      plugins: {
        legend: {
          position:  'bottom',
          labels: {
            padding:   12,
            boxWidth:  12,
            boxHeight: 12,
            font:      { size: 12, weight: '600' },
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${formatarMoeda(ctx.parsed)}`,
          },
        },
      },
    },
  });
}

function inicializarGraficoLinha() {
  const canvas = document.getElementById('canvasGraficoLinha');
  if (!canvas) return;

  graficoLinha = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels:   [],
      datasets: [{
        label:           'Saldo acumulado',
        data:            [],
        borderColor:     '#16a34a',
        backgroundColor: 'rgba(22,163,74,0.12)',
        borderWidth:     2.5,
        pointRadius:     4,
        pointBackgroundColor: '#16a34a',
        tension:         0.4,
        fill:            true,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` Saldo: ${formatarMoeda(ctx.parsed.y)}`,
          },
        },
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          beginAtZero: false,
          ticks: {
            callback: (val) => formatarMoeda(val),
          },
        },
      },
    },
  });
}

/** Atualiza todos os gráficos Chart.js com os dados atuais */
function atualizarGraficos() {
  atualizarGraficoPizza();
  atualizarGraficoLinha();
}

function atualizarGraficoPizza() {
  if (!graficoPizza) {
    /* Fallback: barras customizadas */
    renderizarGraficoBarras();
    return;
  }

  const gastos = calcularGastosPorCategoria();
  if (gastos.length === 0) {
    graficoPizza.data.labels   = ['Sem despesas'];
    graficoPizza.data.datasets[0].data            = [1];
    graficoPizza.data.datasets[0].backgroundColor = ['rgba(107,114,128,0.3)'];
  } else {
    graficoPizza.data.labels   = gastos.map(g => `${EMOJIS_CATEGORIA[g.categoria] || '📌'} ${g.categoria}`);
    graficoPizza.data.datasets[0].data            = gastos.map(g => g.total);
    graficoPizza.data.datasets[0].backgroundColor = PALETA_GRAFICO;
  }
  graficoPizza.update('active');
}

function atualizarGraficoLinha() {
  if (!graficoLinha) return;

  const resumo  = calcularResumoMensal();
  const meses   = Object.keys(resumo).sort();

  if (meses.length === 0) {
    graficoLinha.data.labels                  = [];
    graficoLinha.data.datasets[0].data        = [];
    graficoLinha.update();
    return;
  }

  let saldoAcum = 0;
  const saldos  = meses.map(m => {
    saldoAcum += resumo[m].receitas - resumo[m].despesas;
    return parseFloat(saldoAcum.toFixed(2));
  });

  const labels = meses.map(m => {
    const [ano, mes] = m.split('-');
    return new Date(Number(ano), Number(mes) - 1, 1)
      .toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
  });

  /* Cor da linha varia conforme saldo final */
  const corLinha = saldoAcum >= 0 ? '#16a34a' : '#ef4444';
  graficoLinha.data.datasets[0].borderColor      = corLinha;
  graficoLinha.data.datasets[0].pointBackgroundColor = corLinha;
  graficoLinha.data.datasets[0].backgroundColor  = `${corLinha}22`;

  graficoLinha.data.labels           = labels;
  graficoLinha.data.datasets[0].data = saldos;
  graficoLinha.update('active');
}

/* Fallback: gráfico de barras customizadas (sem Chart.js) */
function renderizarGraficoBarras() {
  const container = document.getElementById('grafico');
  if (!container) return;
  container.style.display = 'block';

  const gastos = calcularGastosPorCategoria();
  if (gastos.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:24px 0">
        <div class="es-icon">📉</div>
        <p>Sem despesas para exibir.</p>
      </div>`;
    return;
  }

  const total = gastos[0].total || 1;
  container.innerHTML = gastos.slice(0, 6).map(({ categoria, total: val }) => {
    const pct   = Math.round((val / total) * 100);
    const emoji = EMOJIS_CATEGORIA[categoria] || '📌';
    return `
      <div class="chart-bar-row">
        <span class="chart-label">${emoji} ${sanitizarTexto(categoria)}</span>
        <div class="chart-bar-bg">
          <div class="chart-bar-fill" style="width:${pct}%"></div>
        </div>
        <span class="chart-val">${formatarMoeda(val)}</span>
      </div>`;
  }).join('');
}

/* ──────────────────────────────────────────────────────
   10. META FINANCEIRA
────────────────────────────────────────────────────── */

/** Atualiza o card de meta financeira com a barra de progresso */
function atualizarMeta() {
  const saldo = calcularSaldo();
  const pct   = Estado.metaValor > 0
    ? Math.min(100, Math.max(0, (saldo / Estado.metaValor) * 100))
    : 0;

  definirTexto('metaEconomizado',  formatarMoeda(saldo));
  definirTexto('metaValorDisplay', formatarMoeda(Estado.metaValor));
  definirTexto('metaPct', `${pct.toFixed(1)}% da meta atingida`);
  definirTexto('metaBadge', `${Math.round(pct)}%`);

  const barra = document.getElementById('metaBarFill');
  if (barra) barra.style.width = `${pct}%`;

  const track = document.querySelector('.meta-bar-track');
  if (track) {
    track.setAttribute('aria-valuenow', String(Math.round(pct)));
  }
}

/* ──────────────────────────────────────────────────────
   11. EXPORTAÇÃO E IMPORTAÇÃO
────────────────────────────────────────────────────── */

/** Exporta todos os lançamentos como arquivo CSV */
function exportarCSV() {
  if (Estado.lancamentos.length === 0) {
    mostrarAviso('Nenhum lançamento para exportar.', 'info', '📋');
    return;
  }

  const cabecalho = ['Data','Tipo','Descrição','Categoria','Valor (R$)','Recorrente'];
  const linhas    = Estado.lancamentos.map(l => [
    formatarData(l.data),
    l.tipo === 'receita' ? 'Receita' : 'Despesa',
    `"${(l.descricao || '').replace(/"/g, '""')}"`,
    l.categoria || '',
    l.valor.toFixed(2).replace('.', ','),
    l.recorrente ? 'Sim' : 'Não',
  ]);

  const csv  = [cabecalho, ...linhas].map(r => r.join(';')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  baixarArquivo(blob, `financas-facil-${hoje()}.csv`);
  mostrarAviso(`${Estado.lancamentos.length} lançamentos exportados com sucesso!`, 'sucesso', '📊');
}

/** Exporta todos os dados como arquivo de backup JSON */
function exportarJSON() {
  if (Estado.lancamentos.length === 0) {
    mostrarAviso('Nenhum dado para fazer backup.', 'info', '📋');
    return;
  }

  const backup = {
    versao:      '2.0',
    exportadoEm: new Date().toISOString(),
    metaValor:   Estado.metaValor,
    lancamentos: Estado.lancamentos,
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  baixarArquivo(blob, `financas-facil-backup-${hoje()}.json`);
  mostrarAviso('Backup exportado com sucesso!', 'sucesso', '💾');
}

/**
 * Importa dados de um arquivo JSON de backup.
 * @param {File} arquivo - Arquivo selecionado pelo usuário
 */
function importarJSON(arquivo) {
  if (!arquivo) return;

  const leitor = new FileReader();
  leitor.onload = (evento) => {
    try {
      const dados = JSON.parse(evento.target.result);

      if (!dados.lancamentos || !Array.isArray(dados.lancamentos)) {
        throw new Error('Formato inválido: campo "lancamentos" ausente ou incorreto.');
      }

      Estado.lancamentos = dados.lancamentos;
      if (dados.metaValor && !isNaN(dados.metaValor)) {
        Estado.metaValor = Number(dados.metaValor);
      }

      salvarDados();
      preencherFiltroMeses();
      atualizarTudo();
      mostrarAviso(
        `Backup importado: ${dados.lancamentos.length} lançamento${dados.lancamentos.length !== 1 ? 's' : ''} restaurado${dados.lancamentos.length !== 1 ? 's' : ''}!`,
        'sucesso', '📥'
      );
    } catch (erro) {
      console.error('Finanças Fácil: erro ao importar JSON:', erro);
      mostrarAviso('Arquivo inválido. Use um backup gerado pelo Finanças Fácil.', 'erro', '❌');
    }
  };
  leitor.readAsText(arquivo);
}

/** Cria um link temporário para baixar um arquivo */
function baixarArquivo(blob, nomeArquivo) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = nomeArquivo;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/* ──────────────────────────────────────────────────────
   12. CRUD DE LANÇAMENTOS
────────────────────────────────────────────────────── */

/** Preenche o formulário com os dados de um lançamento para edição */
function editarLancamento(id) {
  const lancamento = Estado.lancamentos.find(l => l.id === id);
  if (!lancamento) return;

  Estado.editandoId = id;

  definirValor('descricao',            lancamento.descricao);
  definirValor('categoria',            lancamento.categoria);
  definirValor('valor',                lancamento.valor);
  definirValor('dataLancamento',       lancamento.data);
  definirValor('tipoLancamento',       lancamento.tipo);
  definirValor('editId',               id);

  const cbRecorrente = document.getElementById('lancamentoRecorrente');
  if (cbRecorrente) cbRecorrente.checked = !!lancamento.recorrente;

  selecionarTipo(lancamento.tipo);
  definirTexto('btnSubmit', '💾 Salvar alterações');

  document.getElementById('lancamentos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => document.getElementById('descricao')?.focus(), 400);
}

/* ── Confirmação de exclusão ── */
let idParaExcluir = null;

/** Abre o modal de confirmação de exclusão */
function confirmarExclusao(id) {
  const lancamento = Estado.lancamentos.find(l => l.id === id);
  if (!lancamento) return;

  idParaExcluir = id;
  definirTexto('confirmExcluirNome', `"${lancamento.descricao}"`);
  document.getElementById('modalConfirmarExclusao')?.classList.add('open');
}

/** Fecha o modal de confirmação de exclusão */
function fecharModalConfirmacao() {
  idParaExcluir = null;
  document.getElementById('modalConfirmarExclusao')?.classList.remove('open');
}

/** Executa a exclusão confirmada */
function executarExclusao() {
  if (idParaExcluir) {
    excluirLancamento(idParaExcluir);
    fecharModalConfirmacao();
  }
}

/** Remove um lançamento pelo ID e atualiza a interface */
function excluirLancamento(id) {
  Estado.lancamentos = Estado.lancamentos.filter(l => l.id !== id);
  salvarDados();
  preencherFiltroMeses();
  atualizarTudo();
  mostrarAviso('Lançamento excluído.', 'info', '🗑️');
}

/** Limpa o formulário e volta ao estado de "novo lançamento" */
function limparFormulario() {
  definirValor('descricao',      '');
  definirValor('categoria',      '');
  definirValor('valor',          '');
  definirValor('dataLancamento', hoje());
  definirValor('editId',         '');
  definirValor('tipoLancamento', 'receita');

  const cbRecorrente = document.getElementById('lancamentoRecorrente');
  if (cbRecorrente) cbRecorrente.checked = false;

  Estado.editandoId = null;
  selecionarTipo('receita');
  definirTexto('btnSubmit', '✅ Cadastrar lançamento');
}

/* ──────────────────────────────────────────────────────
   13. ATUALIZAÇÃO GERAL
────────────────────────────────────────────────────── */

/** Atualiza todos os elementos visuais da aplicação */
function atualizarTudo() {
  atualizarPainel();
  renderizarLista();
  atualizarGraficos();
  atualizarMeta();
  atualizarResumoMensal();
}

/* ──────────────────────────────────────────────────────
   14. TEMA (CLARO / ESCURO)
────────────────────────────────────────────────────── */

/** Aplica o tema atual ao documento e atualiza o botão */
function aplicarTema() {
  document.documentElement.setAttribute('data-theme', Estado.tema);
  const btn = document.getElementById('btnTema');
  if (btn) btn.textContent = Estado.tema === 'escuro' ? '☀️' : '🌙';

  /* Atualiza as cores dos gráficos após mudança de tema */
  if (graficoPizza || graficoLinha) {
    const corTexto = Estado.tema === 'escuro' ? '#9ca3af' : '#6b7280';
    Chart.defaults.color = corTexto;
    atualizarGraficos();
  }
}

/** Alterna entre tema claro e escuro */
function alternarTema() {
  Estado.tema = Estado.tema === 'claro' ? 'escuro' : 'claro';
  aplicarTema();
  salvarDados();
}

/* ──────────────────────────────────────────────────────
   15. NOTIFICAÇÕES (TOAST)
────────────────────────────────────────────────────── */

/**
 * Exibe uma notificação temporária (toast) na tela.
 * @param {string} mensagem - Texto a exibir
 * @param {'sucesso'|'erro'|'info'} tipo - Estilo visual
 * @param {string} icone - Emoji do ícone
 */
function mostrarAviso(mensagem, tipo = 'sucesso', icone = '✅') {
  const recipiente = document.getElementById('toastContainer');
  if (!recipiente) return;

  const aviso = document.createElement('div');
  aviso.className = `toast ${tipo}`;
  aviso.setAttribute('role', 'alert');
  aviso.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${icone}</span>
    <span>${sanitizarTexto(mensagem)}</span>
  `;

  recipiente.appendChild(aviso);

  setTimeout(() => {
    aviso.classList.add('saio');
    setTimeout(() => aviso.remove(), 400);
  }, 3500);
}

/* ──────────────────────────────────────────────────────
   16. MODAL DE ACESSO (LOGIN / CADASTRO)
────────────────────────────────────────────────────── */

function abrirJanelaAcesso() {
  const janela = document.getElementById('modalAuth');
  if (janela) {
    janela.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('loginEmail')?.focus(), 100);
  }
}

function fecharJanelaAcesso() {
  const janela = document.getElementById('modalAuth');
  if (janela) {
    janela.classList.remove('open');
    document.body.style.overflow = '';
  }
}

/* ──────────────────────────────────────────────────────
   17. TUTORIAL (PRIMEIRA VISITA)
────────────────────────────────────────────────────── */

/** Exibe o tutorial de boas-vindas na primeira visita */
function mostrarTutorial() {
  const jaExibiu   = localStorage.getItem(CHAVES_ARMAZENAMENTO.TUTORIAL);
  const temDados   = Estado.lancamentos.length > 0;

  /* Mostra apenas se nunca exibiu E não tem dados ainda */
  if (jaExibiu || temDados) return;

  const overlay = document.getElementById('tutorialOverlay');
  if (overlay) {
    overlay.classList.add('open');
    irParaPassoTutorial(1);
  }
}

function fecharTutorial() {
  const overlay = document.getElementById('tutorialOverlay');
  if (overlay) overlay.classList.remove('open');
  localStorage.setItem(CHAVES_ARMAZENAMENTO.TUTORIAL, '1');
}

/** Navega para o passo indicado do tutorial */
function irParaPassoTutorial(passo) {
  /* Oculta todos os passos */
  for (let i = 1; i <= 3; i++) {
    const step = document.getElementById(`tutStep${i}`);
    if (step) step.classList.add('tut-hidden');
  }

  /* Mostra o passo solicitado */
  const stepAtivo = document.getElementById(`tutStep${passo}`);
  if (stepAtivo) stepAtivo.classList.remove('tut-hidden');

  /* Atualiza pontos de progresso */
  document.querySelectorAll('.tut-dot').forEach((dot, idx) => {
    dot.classList.toggle('tut-ativo', idx + 1 === passo);
  });
}

/* ──────────────────────────────────────────────────────
   18. BOTÕES DE TIPO (RECEITA / DESPESA)
────────────────────────────────────────────────────── */

/** Atualiza visualmente a seleção de tipo no formulário */
function selecionarTipo(tipo) {
  const btnR = document.getElementById('btnReceita');
  const btnD = document.getElementById('btnDespesa');
  const badge = document.getElementById('formTipoBadge');

  if (btnR) {
    btnR.classList.toggle('active-receita', tipo === 'receita');
    btnR.setAttribute('aria-pressed', String(tipo === 'receita'));
  }
  if (btnD) {
    btnD.classList.toggle('active-despesa', tipo === 'despesa');
    btnD.setAttribute('aria-pressed', String(tipo === 'despesa'));
  }
  if (badge) {
    badge.textContent  = tipo === 'receita' ? 'Receita' : 'Despesa';
    badge.className    = `card-badge ${tipo === 'receita' ? 'verde' : 'vermelho'}`;
  }
}

/* ──────────────────────────────────────────────────────
   19. ABA DA JANELA DE ACESSO
────────────────────────────────────────────────────── */

function ativarAbaJanela(aba) {
  const tabs  = { login: 'tabLogin',   cadastro: 'tabCadastro'  };
  const forms = { login: 'formLogin',  cadastro: 'formCadastro' };

  Object.keys(tabs).forEach(k => {
    const tab  = document.getElementById(tabs[k]);
    const form = document.getElementById(forms[k]);
    const ativo = k === aba;
    if (tab)  { tab.classList.toggle('active',  ativo); tab.setAttribute('aria-selected', String(ativo)); }
    if (form) { form.classList.toggle('active', ativo); }
  });
}

/* ──────────────────────────────────────────────────────
   20. INICIALIZAÇÃO E EVENT LISTENERS
────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Inicialização ── */
  carregarDados();
  aplicarTema();
  definirValor('dataLancamento', hoje());
  preencherFiltroMeses();
  inicializarGraficos();
  atualizarTudo();
  mostrarTutorial();

  /* ════════════════════════════════
     EVENTO: Formulário de lançamento
     ════════════════════════════════ */
  document.getElementById('formLancamento')?.addEventListener('submit', (evento) => {
    evento.preventDefault();

    const descricao  = (document.getElementById('descricao')?.value || '').trim();
    const categoria  = document.getElementById('categoria')?.value || '';
    const valorRaw   = document.getElementById('valor')?.value || '';
    const data       = document.getElementById('dataLancamento')?.value || '';
    const tipo       = document.getElementById('tipoLancamento')?.value || 'receita';
    const recorrente = document.getElementById('lancamentoRecorrente')?.checked || false;
    const editId     = document.getElementById('editId')?.value || '';
    const valor      = parseFloat(valorRaw);

    /* Validações */
    if (!descricao)          { mostrarAviso('Preencha a descrição.',       'erro', '⚠️'); return; }
    if (!categoria)          { mostrarAviso('Selecione uma categoria.',     'erro', '⚠️'); return; }
    if (isNaN(valor) || valor <= 0) { mostrarAviso('Informe um valor válido.',  'erro', '⚠️'); return; }
    if (!data)               { mostrarAviso('Selecione a data.',           'erro', '⚠️'); return; }

    if (editId && Estado.editandoId) {
      /* Modo edição: atualiza o lançamento existente */
      const idx = Estado.lancamentos.findIndex(l => l.id === editId);
      if (idx !== -1) {
        Estado.lancamentos[idx] = { ...Estado.lancamentos[idx], descricao, categoria, valor, data, tipo, recorrente };
        mostrarAviso('Lançamento atualizado com sucesso!', 'sucesso', '✏️');
      }
    } else {
      /* Modo criação: adiciona novo lançamento */
      const novoLancamento = { id: gerarId(), descricao, categoria, valor, data, tipo, recorrente };
      Estado.lancamentos.push(novoLancamento);
      mostrarAviso(
        `${tipo === 'receita' ? '💚 Receita' : '🔴 Despesa'} de ${formatarMoeda(valor)} cadastrada!`,
        'sucesso', '✅'
      );
    }

    salvarDados();
    limparFormulario();
    preencherFiltroMeses();
    atualizarTudo();
  });

  /* ════════════════════════════════
     EVENTO: Botões de tipo de lançamento
     ════════════════════════════════ */
  document.getElementById('btnReceita')?.addEventListener('click', () => {
    definirValor('tipoLancamento', 'receita');
    selecionarTipo('receita');
  });
  document.getElementById('btnDespesa')?.addEventListener('click', () => {
    definirValor('tipoLancamento', 'despesa');
    selecionarTipo('despesa');
  });

  /* ════════════════════════════════
     EVENTO: Filtros por tipo (Todos/Receitas/Despesas)
     ════════════════════════════════ */
  document.querySelectorAll('.filtro-btn').forEach(botao => {
    botao.addEventListener('click', () => {
      document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
      botao.classList.add('active');
      Estado.filtroAtivo = botao.dataset.filtro;
      renderizarLista();
    });
  });

  /* ════════════════════════════════
     EVENTO: Busca por texto
     ════════════════════════════════ */
  document.getElementById('buscaTexto')?.addEventListener('input', (e) => {
    Estado.termoBusca = e.target.value;
    renderizarLista();
  });

  /* ════════════════════════════════
     EVENTO: Filtro por mês
     ════════════════════════════════ */
  document.getElementById('filtroMes')?.addEventListener('change', (e) => {
    Estado.filtroMes = e.target.value;
    renderizarLista();
  });

  /* ════════════════════════════════
     EVENTO: Ordenação da lista
     ════════════════════════════════ */
  document.getElementById('ordenacaoLista')?.addEventListener('change', (e) => {
    Estado.ordenacao = e.target.value;
    renderizarLista();
  });

  /* ════════════════════════════════
     EVENTO: Exportar CSV
     ════════════════════════════════ */
  document.getElementById('btnExportarCSV')?.addEventListener('click', exportarCSV);

  /* ════════════════════════════════
     EVENTO: Exportar JSON (backup)
     ════════════════════════════════ */
  document.getElementById('btnExportarJSON')?.addEventListener('click', exportarJSON);

  /* ════════════════════════════════
     EVENTO: Importar JSON (restore)
     ════════════════════════════════ */
  document.getElementById('inputImportarJSON')?.addEventListener('change', (e) => {
    const arquivo = e.target.files?.[0];
    if (arquivo) {
      importarJSON(arquivo);
      e.target.value = ''; /* Limpa o input para permitir re-importar o mesmo arquivo */
    }
  });

  /* ════════════════════════════════
     EVENTO: Formulário de meta financeira
     ════════════════════════════════ */
  document.getElementById('formMeta')?.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const novaMeta = parseFloat(document.getElementById('inputMeta')?.value || '');
    if (isNaN(novaMeta) || novaMeta <= 0) {
      mostrarAviso('Informe um valor válido para a meta.', 'erro', '⚠️');
      return;
    }
    Estado.metaValor = novaMeta;
    salvarDados();
    atualizarMeta();
    atualizarBarraHero(calcularSaldo());
    definirValor('inputMeta', '');
    mostrarAviso(`Meta atualizada para ${formatarMoeda(novaMeta)}!`, 'info', '🎯');
  });

  /* ════════════════════════════════
     EVENTO: Resetar meta
     ════════════════════════════════ */
  document.getElementById('btnResetarMeta')?.addEventListener('click', () => {
    const META_PADRAO = 1000;
    Estado.metaValor  = META_PADRAO;
    salvarDados();
    atualizarMeta();
    atualizarBarraHero(calcularSaldo());
    definirValor('inputMeta', '');
    mostrarAviso(`Meta reiniciada para ${formatarMoeda(META_PADRAO)}.`, 'info', '🔄');
  });

  /* ════════════════════════════════
     EVENTO: Modal de confirmação de exclusão
     ════════════════════════════════ */
  document.getElementById('btnConfirmarExclusao')?.addEventListener('click',  executarExclusao);
  document.getElementById('btnCancelarExclusao')?.addEventListener('click',   fecharModalConfirmacao);
  document.getElementById('modalConfirmarExclusao')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) fecharModalConfirmacao();
  });

  /* ════════════════════════════════
     EVENTO: Tutorial
     ════════════════════════════════ */
  document.getElementById('btnPularTutorial')?.addEventListener('click',   fecharTutorial);
  document.getElementById('btnFinalizarTutorial')?.addEventListener('click', () => {
    fecharTutorial();
    document.getElementById('lancamentos')?.scrollIntoView({ behavior: 'smooth' });
  });

  /* ════════════════════════════════
     EVENTO: Botão de tema
     ════════════════════════════════ */
  document.getElementById('btnTema')?.addEventListener('click', alternarTema);

  /* ════════════════════════════════
     EVENTO: Modal de acesso (login/cadastro)
     ════════════════════════════════ */
  document.getElementById('btnEntrar')?. addEventListener('click', abrirJanelaAcesso);
  document.getElementById('btnComecar')?.addEventListener('click', abrirJanelaAcesso);
  document.getElementById('btnCriarConta')?.addEventListener('click', abrirJanelaAcesso);
  document.getElementById('modalClose')?.addEventListener('click', fecharJanelaAcesso);
  document.getElementById('modalAuth')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) fecharJanelaAcesso();
  });

  document.getElementById('tabLogin')?. addEventListener('click', () => ativarAbaJanela('login'));
  document.getElementById('tabCadastro')?.addEventListener('click', () => ativarAbaJanela('cadastro'));

  document.getElementById('btnLogin')?. addEventListener('click', () => {
    mostrarAviso('Autenticação simulada — sistema de demonstração!', 'info', 'ℹ️');
    fecharJanelaAcesso();
  });
  document.getElementById('btnCadastrar')?.addEventListener('click', () => {
    mostrarAviso('Conta criada com sucesso! (modo demonstração)', 'sucesso', '🎉');
    fecharJanelaAcesso();
  });

  /* ════════════════════════════════
     EVENTO: Botões de ação rápida (hero e dashboard)
     ════════════════════════════════ */
  document.getElementById('btnCadastrarLancamento')?.addEventListener('click', () => {
    document.getElementById('lancamentos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => document.getElementById('descricao')?.focus(), 500);
  });
  document.getElementById('btnNovoDash')?.addEventListener('click', () => {
    document.getElementById('lancamentos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => document.getElementById('descricao')?.focus(), 400);
  });

  /* ════════════════════════════════
     EVENTO: Menu hambúrguer (mobile)
     ════════════════════════════════ */
  const btnMenu  = document.getElementById('btnMenu');
  const navLinks = document.getElementById('navLinks');
  btnMenu?.addEventListener('click', () => {
    const aberto = navLinks?.classList.toggle('open');
    btnMenu.setAttribute('aria-expanded', String(!!aberto));
  });
  navLinks?.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      btnMenu?.setAttribute('aria-expanded', 'false');
    });
  });

  /* ════════════════════════════════
     EVENTO: Destaque de link ativo ao rolar
     ════════════════════════════════ */
  const secoes = ['hero', 'recursos', 'sobre', 'dashboard'];
  window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 50);

    let secaoAtiva = '';
    secoes.forEach(id => {
      const secao = document.getElementById(id);
      if (secao && window.scrollY >= secao.offsetTop - 120) {
        secaoAtiva = id;
      }
    });
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.section === secaoAtiva);
    });
  });

  /* ════════════════════════════════
     ATALHOS DE TECLADO
     ════════════════════════════════ */
  document.addEventListener('keydown', (evento) => {
    /* Ignora atalhos quando o foco está em campos de entrada */
    const tagAtiva = document.activeElement?.tagName || '';
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tagAtiva)) return;

    /* Ignora se algum modal está aberto */
    const modalAberto =
      document.getElementById('modalAuth')?.classList.contains('open') ||
      document.getElementById('modalConfirmarExclusao')?.classList.contains('open') ||
      document.getElementById('tutorialOverlay')?.classList.contains('open');
    if (modalAberto) {
      if (evento.key === 'Escape') {
        fecharJanelaAcesso();
        fecharModalConfirmacao();
        fecharTutorial();
      }
      return;
    }

    switch (evento.key.toLowerCase()) {
      case 'n': /* N: Foca no formulário de novo lançamento */
        evento.preventDefault();
        document.getElementById('lancamentos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => document.getElementById('descricao')?.focus(), 500);
        mostrarAviso('Atalho: N — Novo lançamento', 'info', '⌨️');
        break;

      case 'escape': /* Esc: Cancela edição e limpa o formulário */
        if (Estado.editandoId) {
          limparFormulario();
          mostrarAviso('Edição cancelada.', 'info', '↩️');
        }
        break;

      case 'e': /* E: Exportar CSV */
        if (evento.ctrlKey || evento.metaKey) {
          evento.preventDefault();
          exportarCSV();
        }
        break;
    }
  });

});

/* ──────────────────────────────────────────────────────
   21. REGISTRO DO SERVICE WORKER (PWA)
────────────────────────────────────────────────────── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then(reg => console.log('Finanças Fácil [SW]: registrado com escopo', reg.scope))
      .catch(err => console.warn('Finanças Fácil [SW]: falha ao registrar', err));
  });
}
