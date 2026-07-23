/* Linus Acessórios Pet — checkout transparente (PIX + cartão via Asaas) */
(function () {
  const SACOLA_KEY = "linus_sacola";
  const real = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const $ = (id) => document.getElementById(id);

  const REGIAO_POR_UF = {
    AC: "norte", AP: "norte", AM: "norte", PA: "norte", RO: "norte", RR: "norte", TO: "norte",
    AL: "nordeste", BA: "nordeste", CE: "nordeste", MA: "nordeste", PB: "nordeste",
    PE: "nordeste", PI: "nordeste", RN: "nordeste", SE: "nordeste",
    DF: "centro-oeste", GO: "centro-oeste", MT: "centro-oeste", MS: "centro-oeste",
    ES: "sudeste", MG: "sudeste", RJ: "sudeste", SP: "sudeste",
    PR: "sul", RS: "sul", SC: "sul",
  };

  let PRODUTOS = [];
  let ZONAS = [];
  let metodo = "PIX";

  const itens = (() => {
    try {
      const s = JSON.parse(localStorage.getItem(SACOLA_KEY) || "[]");
      return Array.isArray(s) ? s.filter((i) => i && i.slug && i.qty > 0) : [];
    } catch {
      return [];
    }
  })();

  /* ── máscaras simples ── */
  const soDigitos = (s) => s.replace(/\D/g, "");
  function mascara(el, fn) {
    el.addEventListener("input", () => { el.value = fn(el.value); });
  }
  mascara($("cpf"), (v) => soDigitos(v).slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2"));
  mascara($("cep"), (v) => soDigitos(v).slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2"));
  mascara($("telefone"), (v) => {
    const d = soDigitos(v).slice(0, 11);
    if (d.length <= 10) return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
    return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
  });
  mascara($("card-numero"), (v) => soDigitos(v).slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 "));
  mascara($("card-validade"), (v) => soDigitos(v).slice(0, 4).replace(/(\d{2})(\d)/, "$1/$2"));
  mascara($("card-cvv"), (v) => soDigitos(v).slice(0, 4));

  /* ── CEP → ViaCEP ── */
  $("cep").addEventListener("blur", async () => {
    const cep = soDigitos($("cep").value);
    if (cep.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const d = await r.json();
      if (d.erro) return;
      if (d.logradouro) $("logradouro").value = d.logradouro;
      if (d.bairro) $("bairro").value = d.bairro;
      if (d.localidade) $("cidade").value = d.localidade;
      if (d.uf) { $("uf").value = d.uf; atualizaResumo(); }
    } catch {}
  });
  $("uf").addEventListener("change", atualizaResumo);

  /* ── abas de pagamento ── */
  $("aba-pix").addEventListener("click", () => trocaMetodo("PIX"));
  $("aba-cartao").addEventListener("click", () => trocaMetodo("CARD"));
  function trocaMetodo(m) {
    metodo = m;
    $("aba-pix").setAttribute("aria-pressed", String(m === "PIX"));
    $("aba-cartao").setAttribute("aria-pressed", String(m === "CARD"));
    $("cartao-campos").hidden = m !== "CARD";
    $("pix-nota").hidden = m !== "PIX";
    $("btn-pagar").textContent = m === "PIX" ? "Gerar Pix" : "Pagar com cartão";
  }

  /* ── resumo ── */
  function calcula() {
    const porSlug = Object.fromEntries(PRODUTOS.map((p) => [p.slug, p]));
    let subtotal = 0;
    const linhas = [];
    for (const i of itens) {
      const p = porSlug[i.slug];
      if (!p) continue;
      subtotal += p.price * i.qty;
      linhas.push({ nome: p.name, qty: i.qty, valor: p.price * i.qty });
    }
    const uf = $("uf").value;
    const regiao = REGIAO_POR_UF[uf];
    const zona = ZONAS.find((z) => z.region === regiao);
    let frete = null;
    if (zona) frete = zona.free_above !== null && subtotal >= zona.free_above ? 0 : zona.cost;
    return { linhas, subtotal, frete, zona, total: frete === null ? null : subtotal + frete };
  }

  function atualizaResumo() {
    const { linhas, subtotal, frete, zona, total } = calcula();
    $("resumo-itens").innerHTML = linhas
      .map((l) => `<div class="resumo-item"><span>${l.qty}x ${l.nome}</span><span>${real(l.valor)}</span></div>`)
      .join("");
    $("resumo-subtotal").textContent = real(subtotal);
    $("resumo-regiao").textContent = zona ? zona.label : "informe o UF";
    $("resumo-frete").textContent = frete === null ? "—" : frete === 0 ? "Grátis 🎉" : real(frete);
    $("resumo-total").textContent = total === null ? "—" : real(total);
  }

  /* ── envio ── */
  function erro(msg) {
    const el = $("erro");
    el.textContent = msg;
    el.hidden = !msg;
    if (msg) window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.getElementById("form-checkout").addEventListener("submit", async (e) => {
    e.preventDefault();
    erro("");

    if (!itens.length) return erro("A sua sacola está vazia. Volte ao catálogo e escolha os acessórios.");

    const obrigatorios = ["nome", "email", "cpf", "cep", "uf", "logradouro", "numero", "bairro", "cidade"];
    for (const id of obrigatorios) {
      const el = $(id);
      el.classList.toggle("campo-erro", !el.value.trim());
    }
    const faltando = obrigatorios.filter((id) => !$(id).value.trim());
    if (faltando.length) return erro("Preencha todos os campos destacados.");
    if (soDigitos($("cpf").value).length !== 11) return erro("Confira o CPF — precisa ter 11 dígitos.");

    const payload = {
      items: itens,
      customer: {
        name: $("nome").value.trim(),
        email: $("email").value.trim(),
        cpf: soDigitos($("cpf").value),
        phone: soDigitos($("telefone").value),
      },
      address: {
        cep: soDigitos($("cep").value),
        uf: $("uf").value,
        logradouro: $("logradouro").value.trim(),
        numero: $("numero").value.trim(),
        complemento: $("complemento").value.trim(),
        bairro: $("bairro").value.trim(),
        cidade: $("cidade").value.trim(),
      },
      payment: { method: metodo },
    };

    if (metodo === "CARD") {
      const numero = soDigitos($("card-numero").value);
      const [mes, ano] = $("card-validade").value.split("/");
      if (numero.length < 13) return erro("Confira o número do cartão.");
      if (!mes || !ano) return erro("Confira a validade do cartão (MM/AA).");
      if (soDigitos($("card-cvv").value).length < 3) return erro("Confira o CVV do cartão.");
      payload.payment.card = {
        holderName: $("card-nome").value.trim(),
        number: numero,
        expiryMonth: mes,
        expiryYear: `20${ano}`,
        ccv: soDigitos($("card-cvv").value),
      };
      if (!payload.payment.card.holderName) return erro("Informe o nome impresso no cartão.");
    }

    const btn = $("btn-pagar");
    btn.disabled = true;
    btn.textContent = metodo === "PIX" ? "Gerando Pix…" : "Processando pagamento…";

    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Não foi possível concluir o pedido.");
      localStorage.removeItem(SACOLA_KEY);
      window.location.href = `pedido.html?p=${encodeURIComponent(data.order)}`;
    } catch (err) {
      erro(err.message);
      btn.disabled = false;
      trocaMetodo(metodo);
    }
  });

  /* ── boot ── */
  (async function iniciar() {
    try {
      const [rp, rf] = await Promise.all([fetch("/api/products"), fetch("/api/shipping")]);
      PRODUTOS = rp.ok ? await rp.json() : [];
      ZONAS = rf.ok ? await rf.json() : [];
    } catch {
      PRODUTOS = typeof PRODUCTS !== "undefined" ? PRODUCTS : (window.PRODUCTS || []);
    }
    if (!itens.length) {
      erro("A sua sacola está vazia. Volte ao catálogo e escolha os acessórios. 🐶");
      $("btn-pagar").disabled = true;
    }
    trocaMetodo("PIX");
    atualizaResumo();
  })();
})();
