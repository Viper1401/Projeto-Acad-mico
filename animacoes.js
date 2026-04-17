/* =====================================================
   Finanças Fácil — Sistema de Animações (v1.0)
   Descrição: Scroll reveal, ripple, tilt 3D, contador
              animado, hero de entrada e micro-interações.
   ===================================================== */

'use strict';

(function () {

  /* ════════════════════════════════════════════════
     1. MARCAR ELEMENTOS ANIMÁVEIS
     Encontra elementos pelo seletor e adiciona as
     classes .ao automaticamente (sem tocar no HTML).
  ════════════════════════════════════════════════ */
  function marcarAnimaveis() {
    const regras = [
      /* Hero */
      { s: '.hero-badge',                   c: ['ao','ao-up'],    d: 0   },
      { s: '.hero-title',                   c: ['ao','ao-up'],    d: 100 },
      { s: '.hero-subtitle',                c: ['ao','ao-up'],    d: 200 },
      { s: '.hero-actions',                 c: ['ao','ao-up'],    d: 300 },
      { s: '.hero-stats',                   c: ['ao','ao-scale'], d: 440 },
      { s: '.hero-visual',                  c: ['ao','ao-right'], d: 180 },
      /* Cabeçalhos de seção */
      { s: '.section-label',                c: ['ao','ao-up'],    d: 0   },
      { s: '.section-title',                c: ['ao','ao-up'],    d: 70  },
      { s: '.section-subtitle',             c: ['ao','ao-up'],    d: 150 },
      /* Features */
      { s: '.feature-card',                 c: ['ao','ao-scale'], d: 0   },
      /* Sobre */
      { s: '.sobre-card',                   c: ['ao','ao-up'],    d: 0   },
      { s: '.sprints-timeline',             c: ['ao','ao-up'],    d: 200 },
      /* Dashboard */
      { s: '.dashboard-header',             c: ['ao','ao-up'],    d: 0   },
      { s: '.summary-card',                 c: ['ao','ao-scale'], d: 0   },
      /* Sidebar */
      { s: '.dashboard-sidebar > .card',    c: ['ao','ao-right'], d: 0   },
      /* Formulário */
      { s: '#lancamentos',                  c: ['ao','ao-left'],  d: 0   },
      { s: '#lancamentos + .card',          c: ['ao','ao-left'],  d: 120 },
    ];

    regras.forEach(({ s, c, d }) => {
      document.querySelectorAll(s).forEach((el) => {
        c.forEach(cls => el.classList.add(cls));
        if (d > 0) el.style.setProperty('--ao-delay', `${d}ms`);
      });
    });
  }

  /* ════════════════════════════════════════════════
     2. STAGGER — Atraso em cascata para grupos de filhos
  ════════════════════════════════════════════════ */
  function aplicarStagger() {
    const grupos = [
      { s: '.features-grid .feature-card',       base: 70  },
      { s: '.sobre-grid .sobre-card',             base: 90  },
      { s: '.dashboard-cards .summary-card',      base: 80  },
      { s: '.sprint-item',                        base: 120 },
      { s: '.dashboard-sidebar > .card',          base: 110 },
    ];
    grupos.forEach(({ s, base }) => {
      document.querySelectorAll(s).forEach((el, i) => {
        el.style.setProperty('--ao-delay', `${i * base}ms`);
      });
    });
  }

  /* ════════════════════════════════════════════════
     3. INTERSECTION OBSERVER — Scroll Reveal
     Adiciona .ao-visible quando o elemento entra
     na viewport; para de observar depois.
  ════════════════════════════════════════════════ */
  const observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((e) => {
        if (e.isIntersecting) {
          /* Aplica o delay definido via CSS var */
          const delay = e.target.style.getPropertyValue('--ao-delay') || '0ms';
          e.target.style.transitionDelay = delay;
          e.target.classList.add('ao-visible');
          observador.unobserve(e.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -20px 0px' }
  );

  function iniciarScrollReveal() {
    document.querySelectorAll('.ao').forEach((el) => observador.observe(el));
  }

  /* ════════════════════════════════════════════════
     4. ANIMAÇÃO DE ENTRADA DO HERO
     O hero é visível sem scroll, então dispara
     automaticamente em cascata após carregar.
  ════════════════════════════════════════════════ */
  function animarHeroEntrada() {
    document.querySelectorAll('.hero .ao').forEach((el) => {
      const d = parseInt(el.style.getPropertyValue('--ao-delay')) || 0;
      setTimeout(() => {
        el.style.transitionDelay = '0ms';
        el.classList.add('ao-visible');
      }, 80 + d);
    });
  }

  /* ════════════════════════════════════════════════
     5. NAVBAR — Slide down na entrada da página
  ════════════════════════════════════════════════ */
  function animarNavbar() {
    const nav = document.querySelector('.navbar');
    if (!nav) return;
    nav.style.transform = 'translateY(-110%)';
    nav.style.opacity   = '0';
    nav.style.transition = 'transform 0.65s cubic-bezier(0.22,1,0.36,1), opacity 0.5s ease';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      nav.style.transform = 'translateY(0)';
      nav.style.opacity   = '1';
    }));
  }

  /* ════════════════════════════════════════════════
     6. RIPPLE NOS BOTÕES
     Efeito de onda circular no ponto do clique.
  ════════════════════════════════════════════════ */
  function adicionarRipple() {
    document.addEventListener('click', (e) => {
      const alvo = e.target.closest(
        '.btn-primary, .btn-outline, .btn-submit, .btn-acao, .filtro-btn, .tipo-btn, .btn-danger'
      );
      if (!alvo) return;

      const ripple = document.createElement('span');
      ripple.className = 'anim-ripple';
      const rect   = alvo.getBoundingClientRect();
      const diâm   = Math.max(rect.width, rect.height) * 2.2;

      Object.assign(ripple.style, {
        width:  `${diâm}px`,
        height: `${diâm}px`,
        left:   `${e.clientX - rect.left  - diâm / 2}px`,
        top:    `${e.clientY - rect.top   - diâm / 2}px`,
      });

      /* Garante overflow:hidden sem sobreescrever outros estilos */
      const prev = alvo.style.overflow;
      alvo.style.overflow = 'hidden';
      alvo.appendChild(ripple);
      setTimeout(() => {
        ripple.remove();
        if (!prev) alvo.style.overflow = '';
      }, 700);
    });
  }

  /* ════════════════════════════════════════════════
     7. TILT 3D NAS CARDS
     Leve efeito de perspectiva ao mover o mouse.
  ════════════════════════════════════════════════ */
  function adicionarTilt() {
    const cards = document.querySelectorAll('.feature-card, .sobre-card, .summary-card');
    cards.forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const r  = card.getBoundingClientRect();
        const x  = (e.clientX - r.left - r.width  / 2) / r.width;
        const y  = (e.clientY - r.top  - r.height / 2) / r.height;
        const rx = -y * 8;
        const ry =  x * 8;
        card.style.transform  = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px) scale(1.02)`;
        card.style.transition = 'transform 0.08s linear';
        card.style.zIndex     = '2';
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform  = '';
        card.style.transition = 'transform 0.5s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s ease';
        card.style.zIndex     = '';
      });
    });
  }

  /* ════════════════════════════════════════════════
     8. PULSE NOS SUMMARY-CARDS ao atualizar valor
  ════════════════════════════════════════════════ */
  function observarMudancasCards() {
    ['cardReceitas','cardDespesas','cardSaldo','cardCategoria'].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new MutationObserver(() => {
        const card = el.closest('.summary-card');
        if (!card) return;
        card.classList.remove('ao-pulse');
        void card.offsetWidth; // reflow
        card.classList.add('ao-pulse');
      });
      obs.observe(el, { childList: true, subtree: true, characterData: true });
    });
  }

  /* ════════════════════════════════════════════════
     9. CONTADOR ANIMADO DE MOEDA
     Exposto globalmente para uso em script.js.
     animarMoeda(elemento, valorFinal, [duracao])
  ════════════════════════════════════════════════ */
  window.animarMoeda = function (elemento, valorFinal, duracao) {
    if (!elemento || isNaN(valorFinal)) return;
    duracao = duracao || 800;

    const inicio = performance.now();
    const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

    function tick(agora) {
      const pct    = Math.min((agora - inicio) / duracao, 1);
      const atual  = valorFinal * easeOutExpo(pct);
      elemento.textContent = atual.toLocaleString('pt-BR', {
        style: 'currency', currency: 'BRL'
      });
      if (pct < 1) requestAnimationFrame(tick);
      else elemento.textContent = valorFinal.toLocaleString('pt-BR', {
        style: 'currency', currency: 'BRL'
      });
    }
    requestAnimationFrame(tick);
  };

  /* ════════════════════════════════════════════════
     10. ANIMAÇÃO DA BARRA DE META
  ════════════════════════════════════════════════ */
  window.animarBarraMeta = function (pct) {
    const barra = document.getElementById('metaBarFill');
    if (!barra) return;
    barra.style.width = '0%';
    barra.style.transition = 'none';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      barra.style.transition = 'width 1s cubic-bezier(0.22,1,0.36,1)';
      barra.style.width      = `${Math.min(100, Math.max(0, pct))}%`;
    }));
  };

  /* ════════════════════════════════════════════════
     11. ITEM DA LISTA — Animação ao cadastrar
  ════════════════════════════════════════════════ */
  window.animarNovoItem = function (idItem) {
    requestAnimationFrame(() => {
      const el = document.getElementById(idItem);
      if (!el) return;
      el.classList.add('item-novo');
      setTimeout(() => el.classList.remove('item-novo'), 700);
    });
  };

  /* ════════════════════════════════════════════════
     12. TOAST — Animação de entrada/saída
     (complementa o CSS já existente)
  ════════════════════════════════════════════════ */
  window.animarToast = function (el) {
    if (!el) return;
    el.style.transform = 'translateY(20px) scale(0.92)';
    el.style.opacity   = '0';
    el.style.transition = 'transform 0.4s cubic-bezier(0.22,1,0.36,1), opacity 0.3s ease';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.transform = 'translateY(0) scale(1)';
      el.style.opacity   = '1';
    }));
  };

  /* ════════════════════════════════════════════════
     INICIALIZAR (aguarda DOM pronto)
  ════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', () => {
    marcarAnimaveis();
    aplicarStagger();
    iniciarScrollReveal();
    adicionarRipple();
    observarMudancasCards();
    animarNavbar();

    /* Hero anima imediatamente (já está visível) */
    animarHeroEntrada();

    /* Tilt aplicado depois que DOM estabiliza */
    setTimeout(adicionarTilt, 300);
  });

})();
