/* Linus Acessórios Pet — catálogo */
(function () {
  const ZAP = "5584996827176";
  const CATEGORIAS = ["Todas", "Laços", "Gravatas", "Gargantilhas & Colares", "Bandanas & Lenços", "Penteados", "Conjuntos"];
  const TAGS = [
    { id: "femea", rotulo: "Fêmea" },
    { id: "macho", rotulo: "Macho" },
    { id: "safari", rotulo: "Coleção Safari" },
    { id: "promo", rotulo: "Em promoção" },
  ];

  const grade = document.getElementById("grade");
  const conta = document.getElementById("conta");
  const vazio = document.getElementById("vazio");
  const chipsCat = document.getElementById("chips-cat");
  const chipsTag = document.getElementById("chips-tag");
  const busca = document.getElementById("busca");
  const ordem = document.getElementById("ordem");

  const estado = { cat: "Todas", tags: new Set(), busca: "", ordem: "nome" };

  const real = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const normaliza = (s) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

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
    let lista = PRODUCTS.slice();
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

    const meta = [];
    if (p.qty) meta.push(`Cartela com ${p.qty} un`);
    const gen = p.gen
      ? `<span class="gen gen-${p.gen === "fêmea" ? "femea" : "macho"}">${p.gen === "fêmea" ? "Fêmea" : "Macho"}</span>`
      : "";

    const atraso = Math.min(i, 12) * 0.03;
    return `<article class="carta" style="animation-delay:${atraso}s">
      <div class="carta-foto">
        <img src="${p.img}" alt="${p.name} — ${p.cat.toLowerCase()} da Linus Acessórios Pet" loading="lazy" width="640" height="640">
        ${etiquetas.length ? `<div class="carta-etiquetas">${etiquetas.join("")}</div>` : ""}
      </div>
      <div class="carta-corpo">
        <h3 class="carta-nome">${p.name}</h3>
        <div class="carta-meta">${gen}${gen && meta.length ? "<span>·</span>" : ""}<span>${meta.join(" · ")}</span></div>
        <div class="carta-preco">
          <span class="preco">${real(p.price)}</span>
          ${p.compare ? `<span class="preco-antigo">${real(p.compare)}</span>` : ""}
        </div>
        <a class="carta-zap" href="${linkZap(p)}" target="_blank" rel="noopener" aria-label="Pedir ${p.name} pelo WhatsApp">
          <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.6-6.1c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4 0-.5.2-.8l.4-.5c.1-.2.1-.4 0-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.9.9-1.2 2.1-.6 3.5a11 11 0 0 0 4.3 4.7c1.6 1 2.6 1.1 3.5.9.6-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2 0-.1-.2-.2-.5-.4Z"/></svg>
          Pedir no WhatsApp
        </a>
      </div>
    </article>`;
  }

  function render() {
    const lista = filtra();
    grade.innerHTML = lista.map(cartaHTML).join("");
    vazio.hidden = lista.length > 0;
    conta.textContent =
      lista.length === PRODUCTS.length
        ? `${PRODUCTS.length} cartelas no catálogo`
        : `${lista.length} de ${PRODUCTS.length} cartelas`;
  }

  /* chips de categoria */
  CATEGORIAS.forEach((cat) => {
    const total = cat === "Todas" ? PRODUCTS.length : PRODUCTS.filter((p) => p.cat === cat).length;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = `${cat} (${total})`;
    b.setAttribute("aria-pressed", String(cat === estado.cat));
    b.addEventListener("click", () => {
      estado.cat = cat;
      chipsCat.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true");
      render();
    });
    chipsCat.appendChild(b);
  });

  /* chips de refino */
  TAGS.forEach((t) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = t.rotulo;
    b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => {
      const ativo = estado.tags.has(t.id);
      if (ativo) estado.tags.delete(t.id);
      else estado.tags.add(t.id);
      b.setAttribute("aria-pressed", String(!ativo));
      render();
    });
    chipsTag.appendChild(b);
  });

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
    chipsCat.querySelectorAll(".chip").forEach((c, i) => c.setAttribute("aria-pressed", String(i === 0)));
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
      const alvo = [...chipsCat.querySelectorAll(".chip")].find((c) => c.textContent.startsWith(cat));
      if (alvo) alvo.click();
    });
    li.appendChild(a);
    rodapeCats.appendChild(li);
  });

  document.getElementById("ano").textContent = new Date().getFullYear();

  render();
})();
