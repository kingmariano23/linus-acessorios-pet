/* Linus Acessórios Pet — página de produto (detalhe + compra) */
(function () {
  const SACOLA_KEY = "linus_sacola";
  const real = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const $ = (id) => document.getElementById(id);

  /* descrição amigável por categoria (usada quando o produto não tem texto próprio) */
  const DESC_CAT = {
    "Laços": "Laços costurados à mão pra deixar a petzada com aquele charme a mais — leves, firmes e cheios de personalidade.",
    "Gravatas": "Gravatinhas feitas à mão que dão um ar elegante na hora — perfeitas pra fotos, festas e o dia a dia no capricho.",
    "Gargantilhas & Colares": "Gargantilhas e colares delicados que valorizam o pescoço do pet com muito bom gosto.",
    "Bandanas & Lenços": "Bandanas e lenços macios e estilosos — o toque descolado que combina com qualquer passeio.",
    "Penteados": "Itens de penteado pra caprichar no visual: fofura garantida do topete às orelhas.",
    "Conjuntos": "Conjuntinhos combinando pra montar um look completo sem esforço — praticidade e estilo juntos.",
  };

  /* ── sacola (localStorage) ─────────────────────────────────────────── */
  const sacolaEl = $("sacola"), sacolaVeu = $("sacola-veu");
  const sacolaItens = $("sacola-itens"), sacolaRodape = $("sacola-rodape"), sacolaBadge = $("sacola-badge");
  const ZAP = "5584996827176";

  let PRODUTOS = [];

  function lerSacola() {
    try {
      const s = JSON.parse(localStorage.getItem(SACOLA_KEY) || "[]");
      return Array.isArray(s) ? s.filter((i) => i && i.slug && i.qty > 0) : [];
    } catch { return []; }
  }
  function salvarSacola(itens) {
    localStorage.setItem(SACOLA_KEY, JSON.stringify(itens));
    renderSacola();
  }
  function adicionar(slug, qtd = 1) {
    const itens = lerSacola();
    const item = itens.find((i) => i.slug === slug);
    if (item) item.qty = Math.min(99, item.qty + qtd);
    else itens.push({ slug, qty: Math.min(99, qtd) });
    salvarSacola(itens);
  }
  function mudarQty(slug, delta) {
    const itens = lerSacola();
    const item = itens.find((i) => i.slug === slug);
    if (!item) return;
    item.qty = Math.max(0, Math.min(99, item.qty + delta));
    salvarSacola(itens.filter((i) => i.qty > 0));
  }
  function abrirSacola() {
    sacolaEl.hidden = false; sacolaVeu.hidden = false;
    requestAnimationFrame(() => { sacolaEl.classList.add("aberta"); sacolaVeu.classList.add("aberto"); });
    document.body.style.overflow = "hidden";
  }
  function fecharSacola() {
    sacolaEl.classList.remove("aberta"); sacolaVeu.classList.remove("aberto");
    document.body.style.overflow = "";
    setTimeout(() => { sacolaEl.hidden = true; sacolaVeu.hidden = true; }, 250);
  }
  function renderSacola() {
    const itens = lerSacola();
    const total = itens.reduce((n, i) => n + i.qty, 0);
    sacolaBadge.textContent = total;
    sacolaBadge.hidden = total === 0;
    if (!itens.length) {
      sacolaItens.innerHTML = `<p class="sacola-vazia">A sua sacola está vazia.<br>Escolha uns acessórios caprichados aí. 🐶</p>`;
      sacolaRodape.innerHTML = "";
      return;
    }
    const porSlug = Object.fromEntries(PRODUTOS.map((p) => [p.slug, p]));
    let subtotal = 0;
    sacolaItens.innerHTML = itens.map((i) => {
      const p = porSlug[i.slug];
      if (!p) return "";
      subtotal += p.price * i.qty;
      return `<div class="sacola-item">
        <img src="${p.img}" alt="" width="64" height="64" loading="lazy">
        <div class="sacola-info"><strong>${p.name}</strong><span>${real(p.price)}</span></div>
        <div class="stepper" aria-label="Quantidade de ${p.name}">
          <button type="button" data-menos="${p.slug}" aria-label="Diminuir">−</button>
          <span>${i.qty}</span>
          <button type="button" data-mais="${p.slug}" aria-label="Aumentar">+</button>
        </div>
      </div>`;
    }).join("");
    const textoZap = encodeURIComponent(
      "Olá! Vim pelo site da Linus e quero pedir:\n" +
      itens.map((i) => { const p = porSlug[i.slug]; return p ? `• ${i.qty}x ${p.name} (${real(p.price)})` : ""; }).filter(Boolean).join("\n") +
      `\nTotal dos itens: ${real(subtotal)}`
    );
    sacolaRodape.innerHTML = `
      <div class="sacola-subtotal"><span>Subtotal</span><strong>${real(subtotal)}</strong></div>
      <p class="sacola-frete-nota">Frete calculado no fechamento do pedido.</p>
      <a class="btn btn-vinho sacola-fechar-pedido" href="checkout.html">Fechar pedido</a>
      <a class="sacola-zap" href="https://wa.me/${ZAP}?text=${textoZap}" target="_blank" rel="noopener">ou peça pelo WhatsApp</a>`;
  }
  $("abrir-sacola").addEventListener("click", abrirSacola);
  $("fechar-sacola").addEventListener("click", fecharSacola);
  sacolaVeu.addEventListener("click", fecharSacola);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") fecharSacola(); });
  sacolaItens.addEventListener("click", (e) => {
    const mais = e.target.closest("[data-mais]");
    const menos = e.target.closest("[data-menos]");
    if (mais) mudarQty(mais.dataset.mais, 1);
    if (menos) mudarQty(menos.dataset.menos, -1);
  });

  /* ── toast ─────────────────────────────────────────────────────────── */
  let toastTimer;
  function toast(html) {
    const t = $("toast");
    t.innerHTML = html;
    t.hidden = false;
    requestAnimationFrame(() => t.classList.add("mostra"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      t.classList.remove("mostra");
      setTimeout(() => { t.hidden = true; }, 250);
    }, 4200);
  }

  /* ── render do produto ─────────────────────────────────────────────── */
  function specs(p) {
    const linhas = [];
    linhas.push(["Categoria", p.cat]);
    if (p.gen) linhas.push(["Indicado para", p.gen === "fêmea" ? "Fêmea ♀" : "Macho ♂"]);
    if (p.qty) linhas.push(["Quantidade", p.qty > 1 ? `Kit com ${p.qty} unidades` : "1 unidade"]);
    if (p.qty && p.qty > 1) linhas.push(["Preço por unidade", real(p.price / p.qty)]);
    if (p.tags && p.tags.includes("safari")) linhas.push(["Coleção", "Safari 🦒"]);
    linhas.push(["Disponibilidade", p.tags && p.tags.includes("pronta-entrega") ? "Pronta entrega" : "Feito sob encomenda"]);
    linhas.push(["Envio", "Para todo o Brasil, a partir de Natal-RN"]);
    return linhas;
  }

  function etiquetasHTML(p) {
    const e = [];
    if (p.tags && p.tags.includes("safari")) e.push('<span class="etiqueta etiqueta-safari">Safari</span>');
    if (p.compare) e.push('<span class="etiqueta etiqueta-promo">Promoção</span>');
    if (p.tags && p.tags.includes("pronta-entrega")) e.push('<span class="etiqueta">Pronta entrega</span>');
    return e;
  }

  function renderProduto(p) {
    document.title = `${p.name} — Linus Acessórios Pet`;
    $("migalha").innerHTML = `<a href="index.html">Início</a><span>›</span><a href="index.html#catalogo">Catálogo</a><span>›</span>${p.cat}`;

    const etqs = etiquetasHTML(p);
    const aplicada = p.img2 || null;
    const economia = p.compare ? Math.round((1 - p.price / p.compare) * 100) : 0;
    const desc = p.desc || DESC_CAT[p.cat] || "Acessório feito à mão pela Linus, com todo o capricho.";

    $("produto-area").innerHTML = `
      <div class="produto">
        <div class="produto-galeria" id="galeria">
          <img class="produto-frente" src="${p.img}" alt="${p.name} — ${p.cat.toLowerCase()}" width="640" height="640">
          ${aplicada ? `<img class="produto-aplicada" src="${aplicada}" alt="${p.name} aplicado em um pet" width="640" height="640">` : ""}
          ${etqs.length ? `<div class="produto-etiquetas">${etqs.join("")}</div>` : ""}
          ${aplicada ? `<button class="produto-verpet-btn" id="verpet" type="button" aria-pressed="false">🐶 Ver no pet</button>` : ""}
        </div>

        <div class="produto-info">
          <p class="produto-cat">${p.cat}</p>
          <h1>${p.name}</h1>
          <div class="produto-preco">
            <span class="preco">${real(p.price)}</span>
            ${p.compare ? `<span class="preco-antigo">${real(p.compare)}</span>` : ""}
            ${economia > 0 ? `<span class="produto-economia">−${economia}%</span>` : ""}
          </div>
          ${etqs.length ? `<div class="produto-selos">${etqs.join("")}</div>` : ""}
          <p class="produto-desc">${desc}</p>

          <ul class="produto-specs">
            ${specs(p).map(([k, v]) => `<li><span class="k">${k}</span><span class="v">${v}</span></li>`).join("")}
          </ul>

          <div class="produto-compra">
            <div class="produto-qtd">
              <span class="rot">Quantidade</span>
              <div class="stepper" aria-label="Quantidade">
                <button type="button" id="q-menos" aria-label="Diminuir">−</button>
                <span id="q-valor">1</span>
                <button type="button" id="q-mais" aria-label="Aumentar">+</button>
              </div>
            </div>
            <div class="produto-acoes">
              <button class="btn btn-vinho btn-grande" id="comprar-agora" type="button">Comprar agora</button>
              <button class="btn btn-contorno btn-grande" id="add-sacola" type="button">Adicionar à sacola</button>
            </div>
            <p class="produto-continuar"><a href="index.html#catalogo">← Continuar escolhendo outros acessórios</a></p>
            <div class="produto-tranquilo">
              <span>🔒 Pagamento seguro no site</span>
              <span>💳 Pix ou cartão</span>
              <span>📦 Envio pra todo o Brasil</span>
            </div>
          </div>
        </div>
      </div>`;

    /* ver no pet (quando há foto real) */
    const verpet = $("verpet");
    if (verpet) {
      const galeria = $("galeria");
      verpet.addEventListener("click", () => {
        const on = galeria.classList.toggle("ver-pet");
        verpet.setAttribute("aria-pressed", String(on));
        verpet.textContent = on ? "🐶 Ver o produto" : "🐶 Ver no pet";
      });
    }

    /* quantidade */
    let qtd = 1;
    const qValor = $("q-valor");
    $("q-menos").addEventListener("click", () => { qtd = Math.max(1, qtd - 1); qValor.textContent = qtd; });
    $("q-mais").addEventListener("click", () => { qtd = Math.min(99, qtd + 1); qValor.textContent = qtd; });

    /* comprar agora → adiciona e vai direto ao checkout */
    $("comprar-agora").addEventListener("click", () => {
      adicionar(p.slug, qtd);
      window.location.href = "checkout.html";
    });

    /* adicionar → fica na página, mostra confirmação e caminhos */
    $("add-sacola").addEventListener("click", () => {
      adicionar(p.slug, qtd);
      toast(`Adicionado à sacola! <a href="checkout.html">Fechar pedido</a> · <a href="index.html#catalogo">escolher mais</a>`);
    });

    renderRelacionados(p);
  }

  function cartaRelacionada(p) {
    const url = `produto.html?p=${encodeURIComponent(p.slug)}`;
    return `<article class="carta">
      <a class="carta-foto sem-aplicada" href="${url}" aria-label="Ver ${p.name}">
        <img class="carta-foto-frente" src="${p.img}" alt="${p.name}" loading="lazy" width="640" height="640">
      </a>
      <div class="carta-corpo">
        <a class="carta-nome-link" href="${url}"><h3 class="carta-nome">${p.name}</h3></a>
        <div class="carta-preco"><span class="preco">${real(p.price)}</span>${p.compare ? `<span class="preco-antigo">${real(p.compare)}</span>` : ""}</div>
        <div class="carta-acoes">
          <button class="btn-sacola" type="button" data-add="${p.slug}">
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M6 8h12l-1 12H7L6 8Zm3 0V6a3 3 0 0 1 6 0v2"/></svg>
            Adicionar
          </button>
        </div>
      </div>
    </article>`;
  }

  function renderRelacionados(p) {
    let lista = PRODUTOS.filter((x) => x.cat === p.cat && x.slug !== p.slug);
    if (lista.length < 4) lista = lista.concat(PRODUTOS.filter((x) => x.cat !== p.cat && x.slug !== p.slug));
    lista = lista.slice(0, 4);
    if (!lista.length) return;
    const grade = $("grade-relacionados");
    grade.innerHTML = lista.map(cartaRelacionada).join("");
    grade.addEventListener("click", (e) => {
      const b = e.target.closest("[data-add]");
      if (b) { adicionar(b.dataset.add, 1); toast(`Adicionado à sacola! <a href="checkout.html">Fechar pedido</a>`); }
    });
    $("relacionados").hidden = false;
  }

  function naoEncontrado() {
    $("produto-area").innerHTML = `
      <div class="vazio" style="max-width:520px">
        <p><strong>Não encontramos esse acessório.</strong></p>
        <p>Ele pode ter saído do catálogo. Dá uma olhada nos outros — tem coisa linda por lá.</p>
        <a class="btn btn-vinho" href="index.html#catalogo">Ver o catálogo</a>
      </div>`;
  }

  /* ── boot ──────────────────────────────────────────────────────────── */
  (async function iniciar() {
    try {
      const r = await fetch("/api/products");
      if (!r.ok) throw new Error();
      PRODUTOS = await r.json();
      if (!Array.isArray(PRODUTOS) || !PRODUTOS.length) throw new Error();
    } catch {
      PRODUTOS = typeof PRODUCTS !== "undefined" ? PRODUCTS : (window.PRODUCTS || []);
    }
    renderSacola();
    const slug = new URLSearchParams(location.search).get("p");
    const p = PRODUTOS.find((x) => x.slug === slug);
    if (p) renderProduto(p);
    else naoEncontrado();
  })();
})();
