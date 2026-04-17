/* =====================================================
   Finanças Fácil — Animação de Partículas (Canvas 2D)
   Descrição: Sistema de partículas fluidas animadas em
              múltiplas seções. Cada seção tem seu próprio
              canvas independente com paleta de cores
              adaptada ao tema ativo (claro/escuro).
   ===================================================== */

'use strict';

(function () {

  /* ──────────────────────────────────────────────────
     CONFIGURAÇÕES GLOBAIS DA ANIMAÇÃO
  ────────────────────────────────────────────────── */
  const CONFIG = {
    velocidadeMaxima:     0.38,  // Velocidade máxima de deslocamento
    raioMinimo:            2,    // Raio mínimo das partículas
    raioMaximo:            6,    // Raio máximo das partículas
    distanciaConexao:    120,    // Distância máxima para linhas de conexão
    velocidadePulsacao:  0.007,  // Velocidade da pulsação de brilho
    quantidadeOndas:       3,    // Número de ondas de fundo
    alturaOnda:           35,    // Altura máxima das ondas em pixels
    velocidadeOnda:      0.003,  // Velocidade de deslocamento das ondas
  };

  /* ──────────────────────────────────────────────────
     PALETAS DE CORES POR SEÇÃO E TEMA
  ────────────────────────────────────────────────── */
  function obterPaleta(idCanvas) {
    const escuro = document.documentElement.getAttribute('data-theme') === 'escuro';

    /* Mapa de configurações por canvas (id → paleta) */
    const paletas = {
      canvasHero: {
        particulas: escuro
          ? ['34,197,94', '16,163,74', '212,160,23', '74,222,128', '20,184,166']
          : ['22,163,74', '16,120,55', '212,160,23', '74,222,128', '15,118,110'],
        ondas: escuro
          ? ['rgba(22,163,74,0.07)', 'rgba(16,120,55,0.05)', 'rgba(212,160,23,0.04)']
          : ['rgba(16,163,74,0.09)', 'rgba(22,101,52,0.06)', 'rgba(212,160,23,0.05)'],
        conexoes: 'rgba(34,197,94,',
        quantidade: 55,
        opacidadeCanvas: 0.55,
      },

      canvasRecursos: {
        particulas: escuro
          ? ['22,163,74', '20,184,166', '79,70,229', '139,92,246', '34,197,94']
          : ['16,185,129', '20,184,166', '99,102,241', '139,92,246', '22,163,74'],
        ondas: escuro
          ? ['rgba(22,163,74,0.05)', 'rgba(139,92,246,0.04)', 'rgba(20,184,166,0.03)']
          : ['rgba(16,185,129,0.06)', 'rgba(99,102,241,0.04)', 'rgba(20,184,166,0.04)'],
        conexoes: escuro ? 'rgba(22,163,74,' : 'rgba(16,185,129,',
        quantidade: 40,
        opacidadeCanvas: 0.30,
      },

      canvasSobre: {
        particulas: escuro
          ? ['212,160,23', '250,204,21', '234,179,8', '253,224,71', '161,98,7']
          : ['212,160,23', '180,135,10', '234,179,8', '161,98,7', '245,158,11'],
        ondas: escuro
          ? ['rgba(212,160,23,0.05)', 'rgba(180,135,10,0.03)', 'rgba(234,179,8,0.03)']
          : ['rgba(212,160,23,0.06)', 'rgba(180,135,10,0.04)', 'rgba(234,179,8,0.04)'],
        conexoes: escuro ? 'rgba(212,160,23,' : 'rgba(180,135,10,',
        quantidade: 28,
        opacidadeCanvas: 0.22,
      },

      canvasDashboard: {
        particulas: escuro
          ? ['16,163,74', '212,160,23', '34,197,94', '250,204,21', '74,222,128']
          : ['22,163,74', '180,135,10', '34,197,94', '234,179,8', '74,222,128'],
        ondas: escuro
          ? ['rgba(16,163,74,0.04)', 'rgba(212,160,23,0.03)', 'rgba(34,197,94,0.03)']
          : ['rgba(22,163,74,0.05)', 'rgba(180,135,10,0.04)', 'rgba(34,197,94,0.04)'],
        conexoes: escuro ? 'rgba(212,160,23,' : 'rgba(180,135,10,',
        quantidade: 30,
        opacidadeCanvas: 0.22,
      },
    };

    /* Retorna a paleta do canvas solicitado ou a do hero como fallback */
    return paletas[idCanvas] || paletas.canvasHero;
  }

  /* ──────────────────────────────────────────────────
     CLASSE: Partícula
     Representa um orbe brilhante animado individualmente
  ────────────────────────────────────────────────── */
  class Particula {
    constructor(largura, altura, indiceCorMax) {
      this.indiceCorMax = indiceCorMax;
      this.reiniciar(largura, altura);
    }

    /**
     * Inicializa ou reinicia a partícula com valores aleatórios.
     * @param {number} largura - Largura do canvas
     * @param {number} altura  - Altura do canvas
     */
    reiniciar(largura, altura) {
      this.x         = Math.random() * largura;
      this.y         = Math.random() * altura;
      this.raio      = CONFIG.raioMinimo + Math.random() * (CONFIG.raioMaximo - CONFIG.raioMinimo);
      this.vx        = (Math.random() - 0.5) * CONFIG.velocidadeMaxima * 2;
      this.vy        = (Math.random() - 0.5) * CONFIG.velocidadeMaxima * 2;
      this.opacidade = 0.15 + Math.random() * 0.7;
      this.fasePulso = Math.random() * Math.PI * 2;
      this.corIndice = Math.floor(Math.random() * this.indiceCorMax);
      this.temBrilho = Math.random() > 0.72; /* ~28% com halo de brilho */
    }

    /**
     * Atualiza posição, velocidade e pulsação de opacidade.
     * @param {number} largura - Largura do canvas
     * @param {number} altura  - Altura do canvas
     */
    atualizar(largura, altura) {
      this.x += this.vx;
      this.y += this.vy;
      this.fasePulso += CONFIG.velocidadePulsacao;
      this.opacidadeAtual = this.opacidade * (0.55 + 0.45 * Math.sin(this.fasePulso));

      /* Reborda: reaparece no lado oposto ao sair pela borda */
      if (this.x < -this.raio * 4)        this.x = largura + this.raio * 4;
      if (this.x > largura + this.raio * 4) this.x = -this.raio * 4;
      if (this.y < -this.raio * 4)        this.y = altura + this.raio * 4;
      if (this.y > altura + this.raio * 4)  this.y = -this.raio * 4;
    }

    /**
     * Renderiza a partícula (e seu halo opcional) no canvas.
     * @param {CanvasRenderingContext2D} ctx   - Contexto 2D do canvas
     * @param {string[]}                cores  - Array de cores RGB da paleta ativa
     */
    desenhar(ctx, cores) {
      const cor = cores[this.corIndice % cores.length];
      ctx.save();

      /* Halo de brilho radial (apenas partículas especiais) */
      if (this.temBrilho) {
        const grad = ctx.createRadialGradient(
          this.x, this.y, 0,
          this.x, this.y, this.raio * 4
        );
        grad.addColorStop(0, `rgba(${cor},${this.opacidadeAtual * 0.7})`);
        grad.addColorStop(1, `rgba(${cor},0)`);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.raio * 4, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      /* Círculo principal da partícula */
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.raio, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${cor},${this.opacidadeAtual})`;
      ctx.fill();

      ctx.restore();
    }
  }

  /* ──────────────────────────────────────────────────
     ONDAS ORGÂNICAS DE FUNDO
  ────────────────────────────────────────────────── */

  /**
   * Desenha múltiplas ondas orgânicas suaves.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number}   largura
   * @param {number}   altura
   * @param {number}   tempo    - Acumulador de tempo para animação
   * @param {string[]} ondas    - Array de cores RGBA das ondas
   */
  function desenharOndas(ctx, largura, altura, tempo, ondas) {
    for (let i = 0; i < CONFIG.quantidadeOndas; i++) {
      const defasagem = (i / CONFIG.quantidadeOndas) * Math.PI * 2;
      const posY      = altura * (0.45 + i * 0.2);

      ctx.beginPath();
      ctx.moveTo(0, posY);

      for (let x = 0; x <= largura; x += 6) {
        const y = posY
          + Math.sin((x * 0.0025) + tempo + defasagem)        * CONFIG.alturaOnda
          + Math.sin((x * 0.005)  + tempo * 1.4 + defasagem)  * (CONFIG.alturaOnda * 0.35);
        ctx.lineTo(x, y);
      }

      ctx.lineTo(largura, altura);
      ctx.lineTo(0, altura);
      ctx.closePath();
      ctx.fillStyle = ondas[i % ondas.length];
      ctx.fill();
    }
  }

  /* ──────────────────────────────────────────────────
     LINHAS DE CONEXÃO ENTRE PARTÍCULAS PRÓXIMAS
  ────────────────────────────────────────────────── */

  /**
   * Desenha linhas entre partículas dentro do raio de conexão.
   * @param {CanvasRenderingContext2D} ctx
   * @param {Particula[]} particulas
   * @param {string}      corBase - Prefixo rgba para a cor da linha
   */
  function desenharConexoes(ctx, particulas, corBase) {
    for (let i = 0; i < particulas.length; i++) {
      for (let j = i + 1; j < particulas.length; j++) {
        const dx  = particulas[i].x - particulas[j].x;
        const dy  = particulas[i].y - particulas[j].y;
        const dst = Math.sqrt(dx * dx + dy * dy);

        if (dst < CONFIG.distanciaConexao) {
          const opa = (1 - dst / CONFIG.distanciaConexao) * 0.22;
          ctx.beginPath();
          ctx.moveTo(particulas[i].x, particulas[i].y);
          ctx.lineTo(particulas[j].x, particulas[j].y);
          ctx.strokeStyle = `${corBase}${opa})`;
          ctx.lineWidth   = 0.8;
          ctx.stroke();
        }
      }
    }
  }

  /* ──────────────────────────────────────────────────
     CONTEXTO DE ANIMAÇÃO POR CANVAS
     Cada seção tem seu próprio estado independente
  ────────────────────────────────────────────────── */
  class SistemaParticulas {
    /**
     * @param {string} idCanvas - ID do elemento canvas no HTML
     * @param {string} idSecao  - ID da seção pai no HTML
     */
    constructor(idCanvas, idSecao) {
      this.idCanvas     = idCanvas;
      this.idSecao      = idSecao;
      this.canvas       = document.getElementById(idCanvas);
      this.secao        = document.getElementById(idSecao);
      this.ctx          = this.canvas?.getContext('2d');
      this.particulas   = [];
      this.tempoOnda    = Math.random() * 100; /* desfasamento para não sincronizar */
      this.idAnimacao   = null;
      this.largura      = 0;
      this.altura       = 0;

      if (!this.canvas || !this.secao || !this.ctx) {
        console.warn(`Finanças Fácil: Canvas "${idCanvas}" ou seção "${idSecao}" não encontrado.`);
        return;
      }

      this.ajustarTamanho();
      this.criarParticulas();
    }

    /** Redimensiona o canvas para cobrir exatamente sua seção pai. */
    ajustarTamanho() {
      if (!this.secao || !this.canvas) return;
      this.largura = this.canvas.width  = this.secao.offsetWidth;
      this.altura  = this.canvas.height = this.secao.offsetHeight;
    }

    /** Recria todas as partículas para o tamanho atual do canvas. */
    criarParticulas() {
      const paleta = obterPaleta(this.idCanvas);
      this.particulas = [];
      for (let i = 0; i < paleta.quantidade; i++) {
        this.particulas.push(new Particula(this.largura, this.altura, paleta.particulas.length));
      }
    }

    /** Executa um frame da animação deste sistema. */
    tick() {
      this.idAnimacao = requestAnimationFrame(() => this.tick());

      const { ctx, largura, altura } = this;
      ctx.clearRect(0, 0, largura, altura);

      const paleta = obterPaleta(this.idCanvas);

      /* 1. Ondas orgânicas de fundo */
      desenharOndas(ctx, largura, altura, this.tempoOnda, paleta.ondas);
      this.tempoOnda += CONFIG.velocidadeOnda;

      /* 2. Linhas de conexão entre partículas */
      desenharConexoes(ctx, this.particulas, paleta.conexoes);

      /* 3. Partículas individualmente */
      this.particulas.forEach(p => {
        p.atualizar(largura, altura);
        p.desenhar(ctx, paleta.particulas);
      });
    }

    /** Inicia o loop de animação deste sistema. */
    iniciar() {
      this.parar();
      this.tick();
    }

    /** Para o loop de animação deste sistema. */
    parar() {
      if (this.idAnimacao !== null) {
        cancelAnimationFrame(this.idAnimacao);
        this.idAnimacao = null;
      }
    }

    /** Reinicia completamente (redimensiona + recria partículas + reinicia loop). */
    reiniciar() {
      this.parar();
      this.ajustarTamanho();
      this.criarParticulas();
      this.iniciar();
    }
  }

  /* ──────────────────────────────────────────────────
     INICIALIZAÇÃO DE TODOS OS SISTEMAS
  ────────────────────────────────────────────────── */

  /**
   * Mapa de todos os sistemas de partículas ativos.
   * Chave: id do canvas, Valor: instância de SistemaParticulas.
   */
  const sistemas = {};

  /** Cria e inicia todos os sistemas de partículas da página. */
  function inicializarTodos() {
    /* Define os pares canvas→seção para inicializar */
    const configuracoes = [
      { canvas: 'canvasHero',      secao: 'hero'      },
      { canvas: 'canvasRecursos',  secao: 'recursos'  },
      { canvas: 'canvasSobre',     secao: 'sobre'     },
      { canvas: 'canvasDashboard', secao: 'dashboard' },
    ];

    configuracoes.forEach(({ canvas, secao }) => {
      /* Destrói sistema anterior se existir (ex: chamada de reinicialização) */
      if (sistemas[canvas]) sistemas[canvas].parar();

      const sistema = new SistemaParticulas(canvas, secao);
      if (sistema.canvas) {
        sistemas[canvas] = sistema;
        sistema.iniciar();
      }
    });
  }

  /* ──────────────────────────────────────────────────
     EVENTOS DE CICLO DE VIDA
  ────────────────────────────────────────────────── */

  /* Aguarda a página carregar completamente antes de iniciar */
  window.addEventListener('load', inicializarTodos);

  /* Redimensionamento com debounce de 180ms para não travar durante o resize */
  let tmrRedimensionar;
  window.addEventListener('resize', () => {
    clearTimeout(tmrRedimensionar);
    tmrRedimensionar = setTimeout(() => {
      Object.values(sistemas).forEach(s => s.reiniciar());
    }, 180);
  });

  /* Pausa todos os sistemas quando a aba não estiver visível */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      Object.values(sistemas).forEach(s => s.parar());
    } else {
      Object.values(sistemas).forEach(s => {
        if (s.idAnimacao === null) s.iniciar();
      });
    }
  });

})(); /* Execução imediata em escopo isolado */
