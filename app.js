/* Linus Acessórios Pet — catálogo + sacola */
(function () {
  const ZAP = "5584996827176";
  const CATEGORIAS = ["Todas", "Laços", "Gravatas", "Gargantilhas & Colares", "Bandanas & Lenços", "Penteados", "Conjuntos"];
  const TAGS = [
    { id: "femea", rotulo: "Fêmea" },
    { id: "macho", rotulo: "Macho" },
    { id: "safari", rotulo: "Coleção Safari" },
    { id: "promo", rotulo: "Em promoção" },
  ];

  /* ícones das categorias (traço simples, estilo pesponto) */
  const ICONES = {
    "Todas": '<path d="M12 13.5c2.6 0 5 1.9 5 4.2 0 1.5-1.1 2.3-2.4 2.3-1 0-1.8-.4-2.6-.4s-1.6.4-2.6.4c-1.3 0-2.4-.8-2.4-2.3 0-2.3 2.4-4.2 5-4.2Z"/><circle cx="7.2" cy="9.4" r="1.7"/><circle cx="16.8" cy="9.4" r="1.7"/><circle cx="9.8" cy="6" r="1.7"/><circle cx="14.2" cy="6" r="1.7"/>',
    "Laços": '<path d="M12 12 5.5 8.2c-1.2-.7-2.5.3-2.5 1.8v4c0 1.5 1.3 2.5 2.5 1.8L12 12Zm0 0 6.5-3.8c1.2-.7 2.5.3 2.5 1.8v4c0 1.5-1.3 2.5-2.5 1.8L12 12Z"/><circle cx="12" cy="12" r="1.6"/>',
    "Gravatas": '<path d="M12 10.5 6.8 7.3C5.7 6.6 4.5 7.5 4.5 8.8v6.4c0 1.3 1.2 2.2 2.3 1.5L12 13.5m0-3 5.2-3.2c1.1-.7 2.3.2 2.3 1.5v6.4c0 1.3-1.2 2.2-2.3 1.5L12 13.5m0-3v3"/><rect x="10.6" y="10.4" width="2.8" height="3.2" rx="1"/>',
    "Gargantilhas & Colares": '<path d="M4 7c1.8 3.4 4.6 5.2 8 5.2S18.2 10.4 20 7"/><circle cx="12" cy="12.4" r="1.4"/><circle cx="8" cy="11.5" r="1.1"/><circle cx="16" cy="11.5" r="1.1"/><circle cx="12" cy="16.2" r="2" /><path d="M12 14.2v-1"/>',
    "Bandanas & Lenços": '<path d="M5 7.5h14l-5.6 8.3a1.7 1.7 0 0 1-2.8 0L5 7.5Z"/><path d="M5 7.5c2.3 1.4 11.7 1.4 14 0"/>',
    "Penteados": '<path d="M12 4.5l1.2 3.1 3.1 1.2-3.1 1.2L12 13.1l-1.2-3.1-3.1-1.2 3.1-1.2L12 4.5Z"/><path d="M6.5 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z"/><path d="M17.5 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z"/>',
    "Conjuntos": '<path d="M8.5 5.5a2.8 2.8 0 0 0-2.8 2.8c0 2.6 2.8 4.6 5.3 6.2 2.5-1.6 5.3-3.6 5.3-6.2a2.8 2.8 0 0 0-5.1-1.6l-.2.3-.2-.3a2.8 2.8 0 0 0-2.3-1.2Z"/><path d="M6 17.5h12M8 20h8"/>',
  };

  const grade = document.getElementById("grade");
  const conta = document.getElementById("conta");
  const vazio = document.getElementById("vazio");
  const catBlocos = document.getElementById("cat-blocos");
  const chipsTag = document.getElementById("chips-tag");
  const busca = document.getElementById("busca");
  const ordem = document.getElementById("ordem");

  let PRODUTOS = [];
  const estado = { cat: "Todas", tags: new Set(), busca: "", ordem: "nome" };

  const real = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const normaliza = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  /* ── sacola (localStorage) ─────────────────────────────────────────── */
  const SACOLA_KEY = "linus_sacola";
  const sacolaEl = document.getElementById("sacola");
  const sacolaVeu = document.getElementById("sacola-veu");
  const sacolaItens = document.getElementById("sacola-itens");
  const sacolaRodape = document.getElementById("sacola-rodape");
  const sacolaBadge = document.getElementById("sacola-badge");

  function lerSacola() {
    try {
      const s = JSON.parse(localStorage.getItem(SACOLA_KEY) || "[]");
      return Array.isArray(s) ? s.filter((i) => i && i.slug && i.qty > 0) : [];
    } catch {
      return [];
    }
  }
  function salvarSacola(itens) {
    localStorage.setItem(SACOLA_KEY, JSON.stringify(itens));
    renderSacola();
  }
  function mudarQty(slug, delta) {
    const itens = lerSacola();
    const item = itens.find((i) => i.slug === slug);
    if (!item) return;
    item.qty = Math.max(0, Math.min(99, item.qty + delta));
    salvarSacola(itens.filter((i) => i.qty > 0));
  }
  function adicionar(slug) {
    const itens = lerSacola();
    const item = itens.find((i) => i.slug === slug);
    if (item) item.qty = Math.min(99, item.qty + 1);
    else itens.push({ slug, qty: 1 });
    salvarSacola(itens);
    abrirSacola();
  }
  function abrirSacola() {
    sacolaEl.hidden = false;
    sacolaVeu.hidden = false;
    requestAnimationFrame(() => {
      sacolaEl.classList.add("aberta");
      sacolaVeu.classList.add("aberto");
    });
    document.body.style.overflow = "hidden";
  }
  function fecharSacola() {
    sacolaEl.classList.remove("aberta");
    sacolaVeu.classList.remove("aberto");
    document.body.style.overflow = "";
    setTimeout(() => {
      sacolaEl.hidden = true;
      sacolaVeu.hidden = true;
    }, 250);
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
    sacolaItens.innerHTML = itens
      .map((i) => {
        const p = porSlug[i.slug];
        if (!p) return "";
        subtotal += p.price * i.qty;
        return `<div class="sacola-item">
          <img src="${p.img}" alt="" width="64" height="64" loading="lazy">
          <div class="sacola-info">
            <strong>${p.name}</strong>
            <span>${real(p.price)}</span>
          </div>
          <div class="stepper" aria-label="Quantidade de ${p.name}">
            <button type="button" data-menos="${p.slug}" aria-label="Diminuir">−</button>
            <span>${i.qty}</span>
            <button type="button" data-mais="${p.slug}" aria-label="Aumentar">+</button>
          </div>
        </div>`;
      })
      .join("");

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

  document.getElementById("abrir-sacola").addEventListener("click", abrirSacola);
  document.getElementById("fechar-sacola").addEventListener("click", fecharSacola);
  sacolaVeu.addEventListener("click", fecharSacola);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") fecharSacola(); });
  sacolaItens.addEventListener("click", (e) => {
    const mais = e.target.closest("[data-mais]");
    const menos = e.target.closest("[data-menos]");
    if (mais) mudarQty(mais.dataset.mais, 1);
    if (menos) mudarQty(menos.dataset.menos, -1);
  });

  /* ── catálogo ──────────────────────────────────────────────────────── */
  function linkZap(p) {
    const texto = `Olá! Vim pelo site da Linus e quero pedir: *${p.name}* (${real(p.price)})`;
    return `https://wa.me/${ZAP}?text=${encodeURIComponent(texto)}`;
  }

  function temTag(p, tag) {
    if (tag === "femea") return p.gen === "fêmea";
    if (tag === "macho") return p.gen === "macho";
    if (tag === "safari") return p.tags.includes("safari");
    if (tag === "promo") return !!p.compare;
    return false;
  }

  function filtra() {
    let lista = PRODUTOS.slice();
    if (estado.cat !== "Todas") lista = lista.filter((p) => p.cat === estado.cat);
    for (const t of estado.tags) lista = lista.filter((p) => temTag(p, t));
    if (estado.busca) {
      const q = normaliza(estado.busca);
      lista = lista.filter((p) => normaliza(p.name + " " + p.cat).includes(q));
    }
    if (estado.ordem === "menor") lista.sort((a, b) => a.price - b.price);
    else if (estado.ordem === "maior") lista.sort((a, b) => b.price - a.price);
    else lista.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    return lista;
  }

  function cartaHTML(p, i) {
    const etiquetas = [];
    if (p.tags.includes("safari")) etiquetas.push('<span class="etiqueta etiqueta-safari">Safari</span>');
    if (p.compare) etiquetas.push('<span class="etiqueta etiqueta-promo">Promoção</span>');
    if (p.tags.includes("pronta-entrega")) etiquetas.push('<span class="etiqueta">Pronta entrega</span>');

    const esgotado = p.stock !== null && p.stock !== undefined && p.stock <= 0;
    const meta = [];
    if (p.qty) meta.push(p.qty > 1 ? `Kit com ${p.qty} un` : "Unidade");
    const gen = p.gen
      ? `<span class="gen gen-${p.gen === "fêmea" ? "femea" : "macho"}">${p.gen === "fêmea" ? "Fêmea" : "Macho"}</span>`
      : "";

    const atraso = Math.min(i, 12) * 0.03;
    return `<article class="carta" style="animation-delay:${atraso}s">
      <div class="carta-foto">
        <img src="${p.img}" alt="${p.name} — ${p.cat.toLowerCase()} da Linus Acessórios Pet" loading="lazy" width="640" height="640">
        ${p.img2 ? `<img class="carta-foto-hover" src="${p.img2}" alt="" loading="lazy" width="640" height="640">` : ""}
        ${etiquetas.length ? `<div class="carta-etiquetas">${etiquetas.join("")}</div>` : ""}
      </div>
      <div class="carta-corpo">
        <h3 class="carta-nome">${p.name}</h3>
        <div class="carta-meta">${gen}${gen && meta.length ? "<span>·</span>" : ""}<span>${meta.join(" · ")}</span></div>
        <div class="carta-preco">
          <span class="preco">${real(p.price)}</span>
          ${p.compare ? `<span class="preco-antigo">${real(p.compare)}</span>` : ""}
        </div>
        <div class="carta-acoes">
          ${esgotado
            ? `<button class="btn-sacola" type="button" disabled>Esgotado</button>`
            : `<button class="btn-sacola" type="button" data-add="${p.slug}">
                <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M6 8h12l-1 12H7L6 8Zm3 0V6a3 3 0 0 1 6 0v2"/></svg>
                Adicionar à sacola
              </button>`}
          <a class="carta-zap-mini" href="${linkZap(p)}" target="_blank" rel="noopener" aria-label="Pedir ${p.name} pelo WhatsApp" title="Pedir pelo WhatsApp">
            <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.6-6.1c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4 0-.5.2-.8l.4-.5c.1-.2.1-.4 0-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.9.9-1.2 2.1-.6 3.5a11 11 0 0 0 4.3 4.7c1.6 1 2.6 1.1 3.5.9.6-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2 0-.1-.2-.2-.5-.4Z"/></svg>
          </a>
        </div>
      </div>
    </article>`;
  }

  function render() {
    const lista = filtra();
    grade.innerHTML = lista.map(cartaHTML).join("");
    vazio.hidden = lista.length > 0;
    conta.textContent =
      lista.length === PRODUTOS.length
        ? `${PRODUTOS.length} acessórios no catálogo`
        : `${lista.length} de ${PRODUTOS.length} acessórios`;
  }

  grade.addEventListener("click", (e) => {
    const b = e.target.closest("[data-add]");
    if (b) adicionar(b.dataset.add);
  });

  function montarChips() {
    catBlocos.innerHTML = "";
    CATEGORIAS.forEach((cat) => {
      const total = cat === "Todas" ? PRODUTOS.length : PRODUTOS.filter((p) => p.cat === cat).length;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "cat-bloco";
      b.innerHTML = `
        <span class="cat-icone" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONES[cat] || ICONES["Todas"]}</svg>
        </span>
        <span class="cat-nome">${cat === "Gargantilhas & Colares" ? "Gargantilhas" : cat === "Bandanas & Lenços" ? "Bandanas" : cat}</span>
        <span class="cat-total">${total} ${total === 1 ? "item" : "itens"}</span>`;
      b.setAttribute("aria-pressed", String(cat === estado.cat));
      b.addEventListener("click", () => {
        estado.cat = cat;
        catBlocos.querySelectorAll(".cat-bloco").forEach((c) => c.setAttribute("aria-pressed", "false"));
        b.setAttribute("aria-pressed", "true");
        render();
        document.getElementById("grade").scrollIntoView({ behavior: "smooth", block: "start" });
      });
      catBlocos.appendChild(b);
    });

    chipsTag.innerHTML = "";
    TAGS.forEach((t) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = t.rotulo;
      b.setAttribute("aria-pressed", String(estado.tags.has(t.id)));
      b.addEventListener("click", () => {
        const ativo = estado.tags.has(t.id);
        if (ativo) estado.tags.delete(t.id);
        else estado.tags.add(t.id);
        b.setAttribute("aria-pressed", String(!ativo));
        render();
      });
      chipsTag.appendChild(b);
    });
  }

  busca.addEventListener("input", () => {
    estado.busca = busca.value.trim();
    render();
  });
  ordem.addEventListener("change", () => {
    estado.ordem = ordem.value;
    render();
  });
  document.getElementById("limpar").addEventListener("click", () => {
    estado.cat = "Todas";
    estado.tags.clear();
    estado.busca = "";
    busca.value = "";
    catBlocos.querySelectorAll(".cat-bloco").forEach((c, i) => c.setAttribute("aria-pressed", String(i === 0)));
    chipsTag.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", "false"));
    render();
  });

  /* rodapé: lista de categorias */
  const rodapeCats = document.getElementById("rodape-cats");
  CATEGORIAS.slice(1).forEach((cat) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = "#catalogo";
    a.textContent = cat;
    a.addEventListener("click", () => {
      const alvo = [...catBlocos.querySelectorAll(".cat-bloco")].find((c) =>
        c.querySelector(".cat-nome").textContent.startsWith(cat.split(" ")[0])
      );
      if (alvo) alvo.click();
    });
    li.appendChild(a);
    rodapeCats.appendChild(li);
  });

  document.getElementById("ano").textContent = new Date().getFullYear();

  /* carrega do banco; se a API não responder, usa o products.js local */
  async function iniciar() {
    try {
      const r = await fetch("/api/products");
      if (!r.ok) throw new Error();
      PRODUTOS = await r.json();
      if (!Array.isArray(PRODUTOS) || !PRODUTOS.length) throw new Error();
    } catch {
      PRODUTOS = window.PRODUCTS || [];
    }
    montarChips();
    render();
    renderSacola();
  }
  iniciar();
})();
