/* Painel da Linus — produtos, pedidos e frete */
(function () {
  const $ = (id) => document.getElementById(id);
  const real = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const dataBR = (iso) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

  let PRODUTOS = [];
  let PEDIDOS = [];
  let editandoId = null;
  let fotoUrl = null;
  let fotoUrl2 = null;

  async function api(caminho, opts = {}) {
    const r = await fetch(`/api/admin/${caminho}`, {
      headers: opts.body instanceof File ? {} : { "Content-Type": "application/json" },
      ...opts,
      body: opts.body instanceof File ? opts.body : opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const data = await r.json().catch(() => ({}));
    if (r.status === 401 && caminho !== "session") {
      mostrarLogin();
      throw new Error("Sessão expirada — entre de novo.");
    }
    if (!r.ok) throw new Error(data.error || "Erro inesperado");
    return data;
  }

  /* ── telas ── */
  function mostrarLogin() {
    $("tela-login").hidden = false;
    $("tela-painel").hidden = true;
  }
  async function mostrarPainel() {
    $("tela-login").hidden = true;
    $("tela-painel").hidden = false;
    await Promise.all([carregarProdutos(), carregarPedidos(), carregarFrete()]);
  }

  $("form-login").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("btn-entrar");
    btn.disabled = true;
    btn.textContent = "Entrando…";
    try {
      await api("login", { method: "POST", body: { password: $("senha").value } });
      $("senha").value = "";
      $("login-erro").hidden = true;
      await mostrarPainel();
    } catch (err) {
      $("login-erro").textContent = err.message;
      $("login-erro").hidden = false;
    } finally {
      btn.disabled = false;
      btn.textContent = "Entrar";
    }
  });

  $("btn-sair").addEventListener("click", async () => {
    try { await api("logout", { method: "POST" }); } catch {}
    mostrarLogin();
  });

  /* ── abas ── */
  document.querySelectorAll(".adm-aba").forEach((b) => {
    b.addEventListener("click", () => {
      document.querySelectorAll(".adm-aba").forEach((x) => x.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true");
      for (const aba of ["produtos", "pedidos", "frete"]) $(`aba-${aba}`).hidden = aba !== b.dataset.aba;
    });
  });

  /* ── produtos ── */
  async function carregarProdutos() {
    PRODUTOS = await api("products");
    renderProdutos();
  }

  function renderProdutos() {
    const q = ($("adm-busca").value || "").toLowerCase();
    const lista = PRODUTOS.filter((p) => !q || (p.name + " " + p.cat).toLowerCase().includes(q));
    $("tabela-produtos").querySelector("tbody").innerHTML = lista
      .map(
        (p) => `<tr class="${p.active ? "" : "adm-inativo"}" data-id="${p.id}">
        <td>${p.img ? `<img class="adm-thumb" src="${p.img}" alt="" loading="lazy">` : "—"}</td>
        <td><strong>${p.name}</strong>${p.stock !== null ? `<br><span class="adm-nota">estoque: ${p.stock}</span>` : ""}</td>
        <td>${p.cat}</td>
        <td>${real(p.price)}${p.compare ? `<br><s class="adm-nota">${real(p.compare)}</s>` : ""}</td>
        <td>${p.stock === null ? "—" : p.stock}</td>
        <td>${p.active ? "✅" : "🚫"}</td>
        <td class="adm-acoes">
          <button class="adm-btn-mini" data-editar="${p.id}" type="button">Editar</button>
          <button class="adm-btn-mini perigo" data-excluir="${p.id}" type="button">Excluir</button>
        </td>
      </tr>`
      )
      .join("");
  }

  $("adm-busca").addEventListener("input", renderProdutos);

  $("tabela-produtos").addEventListener("click", async (e) => {
    const editar = e.target.closest("[data-editar]");
    const excluir = e.target.closest("[data-excluir]");
    if (editar) abrirFormulario(PRODUTOS.find((p) => p.id === Number(editar.dataset.editar)));
    if (excluir) {
      const p = PRODUTOS.find((x) => x.id === Number(excluir.dataset.excluir));
      if (!confirm(`Excluir "${p.name}" de vez? Se preferir só tirar da loja, edite e desmarque "Produto ativo".`)) return;
      await api(`products/${p.id}`, { method: "DELETE" });
      await carregarProdutos();
    }
  });

  /* formulário */
  const dlg = $("dlg-produto");
  $("btn-novo").addEventListener("click", () => abrirFormulario(null));
  $("btn-cancelar").addEventListener("click", () => dlg.close());

  function abrirFormulario(p) {
    editandoId = p ? p.id : null;
    fotoUrl = p ? p.img : null;
    fotoUrl2 = p ? p.img2 : null;
    $("dlg-titulo").textContent = p ? `Editar: ${p.name}` : "Novo produto";
    $("p-nome").value = p?.name || "";
    $("p-descricao").value = p?.description || "";
    $("p-cat").value = p?.cat || "Laços";
    $("p-gen").value = p?.gen || "";
    $("p-preco").value = p ? String(p.price).replace(".", ",") : "";
    $("p-compare").value = p?.compare ? String(p.compare).replace(".", ",") : "";
    $("p-qty").value = p?.qty ?? "";
    $("p-estoque").value = p?.stock ?? "";
    $("p-tag-safari").checked = !!p?.tags?.includes("safari");
    $("p-tag-pronta").checked = !!p?.tags?.includes("pronta-entrega");
    $("p-tag-outlet").checked = !!p?.tags?.includes("outlet");
    $("p-ativo").checked = p ? p.active : true;
    $("p-foto").value = "";
    $("p-foto-status").textContent = "";
    $("p-foto2").value = "";
    $("p-foto2-status").textContent = "";
    $("produto-erro").hidden = true;
    const prev = $("p-foto-preview");
    prev.hidden = !fotoUrl;
    if (fotoUrl) prev.src = fotoUrl;
    const prev2 = $("p-foto2-preview");
    prev2.hidden = !fotoUrl2;
    if (fotoUrl2) prev2.src = fotoUrl2;
    dlg.showModal();
  }

  function ligarUpload(inputId, previewId, statusId, aoSubir) {
    $(inputId).addEventListener("change", async () => {
      const f = $(inputId).files[0];
      if (!f) return;
      $(statusId).textContent = "Enviando foto…";
      try {
        const r = await fetch(`/api/admin/upload?filename=${encodeURIComponent(f.name)}`, {
          method: "POST",
          headers: { "Content-Type": f.type || "application/octet-stream" },
          body: f,
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Falha no envio");
        aoSubir(data.url);
        const prev = $(previewId);
        prev.src = data.url;
        prev.hidden = false;
        $(statusId).textContent = "✓ Foto enviada";
      } catch (err) {
        $(statusId).textContent = `Erro: ${err.message}`;
      }
    });
  }
  ligarUpload("p-foto", "p-foto-preview", "p-foto-status", (u) => { fotoUrl = u; });
  ligarUpload("p-foto2", "p-foto2-preview", "p-foto2-status", (u) => { fotoUrl2 = u; });

  const numeroBR = (v) => {
    const n = Number(String(v).replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  };

  $("form-produto").addEventListener("submit", async (e) => {
    e.preventDefault();
    const tags = [];
    if ($("p-tag-safari").checked) tags.push("safari");
    if ($("p-tag-pronta").checked) tags.push("pronta-entrega");
    if ($("p-tag-outlet").checked) tags.push("outlet");

    const corpo = {
      name: $("p-nome").value,
      description: $("p-descricao").value,
      cat: $("p-cat").value,
      gen: $("p-gen").value || null,
      price: numeroBR($("p-preco").value),
      compare: $("p-compare").value.trim() ? numeroBR($("p-compare").value) : null,
      qty: $("p-qty").value.trim() || null,
      stock: $("p-estoque").value.trim() === "" ? null : $("p-estoque").value,
      tags,
      img: fotoUrl,
      img2: fotoUrl2,
      active: $("p-ativo").checked,
    };

    const btn = $("btn-salvar-produto");
    btn.disabled = true;
    btn.textContent = "Salvando…";
    try {
      if (editandoId) await api(`products/${editandoId}`, { method: "PUT", body: corpo });
      else await api("products", { method: "POST", body: corpo });
      dlg.close();
      await carregarProdutos();
    } catch (err) {
      $("produto-erro").textContent = err.message;
      $("produto-erro").hidden = false;
    } finally {
      btn.disabled = false;
      btn.textContent = "Salvar produto";
    }
  });

  /* ── pedidos ── */
  const STATUS = ["pendente", "pago", "enviado", "entregue", "cancelado", "recusado", "expirado", "estornado"];

  async function carregarPedidos() {
    PEDIDOS = await api("orders");
    const pagos = PEDIDOS.filter((p) => p.status === "pago").length;
    $("conta-pagos").textContent = pagos;
    $("conta-pagos").hidden = pagos === 0;
    renderPedidos();
  }

  function renderPedidos() {
    const tbody = $("tabela-pedidos").querySelector("tbody");
    if (!PEDIDOS.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem">Nenhum pedido ainda — em breve! 🐶</td></tr>`;
      return;
    }
    tbody.innerHTML = PEDIDOS.map((p) => {
      const opcoes = STATUS.map((s) => `<option value="${s}" ${s === p.status ? "selected" : ""}>${s}</option>`).join("");
      return `<tr data-id="${p.id}">
        <td><strong>${p.public_id}</strong></td>
        <td>${dataBR(p.created_at)}</td>
        <td>${p.customer_name}<br><span class="adm-nota">${p.customer_phone || p.customer_email}</span></td>
        <td>${real(p.total)}</td>
        <td>${p.payment_method === "PIX" ? "Pix" : "Cartão"}</td>
        <td><select class="adm-status st-${p.status}" data-status="${p.id}">${opcoes}</select></td>
        <td class="adm-acoes"><button class="adm-btn-mini" data-detalhe="${p.id}" type="button">Detalhes</button></td>
      </tr>`;
    }).join("");
  }

  $("tabela-pedidos").addEventListener("change", async (e) => {
    const sel = e.target.closest("[data-status]");
    if (!sel) return;
    try {
      await api(`orders/${sel.dataset.status}`, { method: "PUT", body: { status: sel.value } });
      sel.className = `adm-status st-${sel.value}`;
      const pedido = PEDIDOS.find((p) => p.id === Number(sel.dataset.status));
      if (pedido) pedido.status = sel.value;
    } catch (err) {
      alert(err.message);
    }
  });

  $("tabela-pedidos").addEventListener("click", (e) => {
    const b = e.target.closest("[data-detalhe]");
    if (!b) return;
    const linha = b.closest("tr");
    const aberta = linha.nextElementSibling?.classList.contains("adm-detalhe");
    document.querySelectorAll(".adm-detalhe").forEach((x) => x.remove());
    if (aberta) return;
    const p = PEDIDOS.find((x) => x.id === Number(b.dataset.detalhe));
    const e2 = p.address || {};
    const tr = document.createElement("tr");
    tr.className = "adm-detalhe";
    tr.innerHTML = `<td colspan="7">
      <strong>Itens:</strong>
      <ul>${p.items.map((i) => `<li>${i.qty}x ${i.name} — ${real(i.price * i.qty)}</li>`).join("")}</ul>
      <p style="margin-top:.6rem"><strong>Entrega:</strong> ${e2.logradouro || ""}, ${e2.numero || ""} ${e2.complemento || ""} — ${e2.bairro || ""}, ${e2.cidade || ""}/${e2.uf || ""} · CEP ${e2.cep || ""} · Frete ${real(p.shipping_cost)} (${p.shipping_region})</p>
      <p><strong>Cliente:</strong> ${p.customer_name} · ${p.customer_email} · ${p.customer_phone || "sem telefone"}</p>
      ${p.paid_at ? `<p><strong>Pago em:</strong> ${dataBR(p.paid_at)}</p>` : ""}
    </td>`;
    linha.after(tr);
  });

  /* ── frete ── */
  async function carregarFrete() {
    const zonas = await api("shipping");
    $("tabela-frete").querySelector("tbody").innerHTML = zonas
      .map(
        (z) => `<tr data-region="${z.region}">
        <td><strong>${z.label}</strong></td>
        <td><input class="adm-frete-custo" inputmode="decimal" value="${String(z.cost).replace(".", ",")}" style="width:90px"></td>
        <td><input class="adm-frete-gratis" inputmode="decimal" value="${z.free_above === null ? "" : String(z.free_above).replace(".", ",")}" placeholder="—" style="width:110px"></td>
      </tr>`
      )
      .join("");
  }

  $("btn-salvar-frete").addEventListener("click", async () => {
    const zones = [...$("tabela-frete").querySelectorAll("tbody tr")].map((tr) => ({
      region: tr.dataset.region,
      cost: numeroBR(tr.querySelector(".adm-frete-custo").value),
      free_above: tr.querySelector(".adm-frete-gratis").value.trim() === "" ? null : numeroBR(tr.querySelector(".adm-frete-gratis").value),
    }));
    try {
      await api("shipping", { method: "PUT", body: { zones } });
      $("frete-salvo").hidden = false;
      setTimeout(() => { $("frete-salvo").hidden = true; }, 2500);
    } catch (err) {
      alert(err.message);
    }
  });

  /* ── boot ── */
  (async function () {
    try {
      const s = await api("session");
      if (s.ok) await mostrarPainel();
      else mostrarLogin();
    } catch {
      mostrarLogin();
    }
  })();
})();
