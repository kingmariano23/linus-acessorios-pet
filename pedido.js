/* Linus Acessórios Pet — acompanhamento do pedido (PIX + confirmação) */
(function () {
  const caixa = document.getElementById("caixa");
  const real = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const id = new URLSearchParams(location.search).get("p") || "";
  let timer = null;

  function itensHTML(p) {
    return `<section class="bloco" style="text-align:left; margin-top:1.6rem">
      <h2>Resumo do pedido ${p.public_id}</h2>
      ${p.items.map((i) => `<div class="resumo-item"><span>${i.qty}x ${i.name}</span><span>${real(i.price * i.qty)}</span></div>`).join("")}
      <div class="resumo-linha"><span>Subtotal</span><span>${real(p.subtotal)}</span></div>
      <div class="resumo-linha"><span>Frete</span><span>${p.shipping_cost === 0 ? "Grátis 🎉" : real(p.shipping_cost)}</span></div>
      <div class="resumo-linha total"><span>Total</span><span>${real(p.total)}</span></div>
    </section>`;
  }

  function render(p) {
    if (p.status === "pago") {
      clearInterval(timer);
      caixa.innerHTML = `
        <span class="status-selo status-pago">✓ Pagamento confirmado</span>
        <h1 style="margin-top:1rem">Pedido feito, ${"capricho a caminho"}! 🐶</h1>
        <p class="pagina-sub" style="margin-top:.6rem">Recebemos o seu pagamento. Vamos preparar as cartelas e postar de Natal-RN para o seu endereço. Qualquer coisa, chama a gente no <a href="https://wa.me/5584996827176" target="_blank" rel="noopener">WhatsApp</a>.</p>
        ${itensHTML(p)}
        <a class="btn btn-vinho" style="margin-top:1.4rem" href="index.html#catalogo">Voltar ao catálogo</a>`;
      return;
    }

    if (p.status === "pendente" && p.payment_method === "PIX" && p.pix_payload) {
      caixa.innerHTML = `
        <span class="status-selo status-pendente pulso">⏳ Aguardando o Pix</span>
        <h1 style="margin-top:1rem">Pague com o Pix para confirmar</h1>
        <p class="pagina-sub" style="margin-top:.6rem">Abra o app do seu banco, escaneie o QR Code (ou use o copia-e-cola). A confirmação aparece aqui sozinha, na hora. ⚡</p>
        <img class="pix-qr" src="data:image/png;base64,${p.pix_qr}" alt="QR Code do Pix" width="240" height="240">
        <div class="pix-copia">
          <input type="text" readonly value="${p.pix_payload}" id="pix-texto" aria-label="Código Pix copia-e-cola">
          <button class="btn btn-vinho" type="button" id="pix-copiar">Copiar</button>
        </div>
        ${itensHTML(p)}`;
      document.getElementById("pix-copiar").addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(p.pix_payload);
        } catch {
          document.getElementById("pix-texto").select();
          document.execCommand("copy");
        }
        document.getElementById("pix-copiar").textContent = "Copiado ✓";
        setTimeout(() => { const b = document.getElementById("pix-copiar"); if (b) b.textContent = "Copiar"; }, 2500);
      });
      return;
    }

    if (p.status === "pendente") {
      caixa.innerHTML = `
        <span class="status-selo status-pendente pulso">⏳ Processando pagamento</span>
        <h1 style="margin-top:1rem">Quase lá…</h1>
        <p class="pagina-sub" style="margin-top:.6rem">Estamos confirmando o seu pagamento. Esta página atualiza sozinha.</p>
        ${itensHTML(p)}`;
      return;
    }

    clearInterval(timer);
    const rotulos = {
      recusado: "Pagamento recusado",
      cancelado: "Pedido cancelado",
      expirado: "Pix expirado",
      estornado: "Pagamento estornado",
      enviado: "Pedido enviado 📦",
      entregue: "Pedido entregue 🎉",
    };
    const positivo = ["enviado", "entregue"].includes(p.status);
    caixa.innerHTML = `
      <span class="status-selo ${positivo ? "status-pago" : "status-outro"}">${rotulos[p.status] || p.status}</span>
      ${positivo
        ? `<h1 style="margin-top:1rem">Obrigada pela compra! 🐾</h1>`
        : `<h1 style="margin-top:1rem">Este pedido não foi concluído</h1>
           <p class="pagina-sub" style="margin-top:.6rem">Você pode tentar de novo pelo catálogo, ou falar com a gente no <a href="https://wa.me/5584996827176" target="_blank" rel="noopener">WhatsApp</a> que resolvemos juntinho.</p>`}
      ${itensHTML(p)}
      <a class="btn btn-vinho" style="margin-top:1.4rem" href="index.html#catalogo">Voltar ao catálogo</a>`;
  }

  async function buscar() {
    try {
      const r = await fetch(`/api/order-status?id=${encodeURIComponent(id)}`);
      if (!r.ok) throw new Error();
      const p = await r.json();
      render(p);
    } catch {
      clearInterval(timer);
      caixa.innerHTML = `
        <span class="status-selo status-outro">Pedido não encontrado</span>
        <p class="pagina-sub" style="margin-top:1rem">Confira o link, ou fale com a gente no <a href="https://wa.me/5584996827176" target="_blank" rel="noopener">WhatsApp</a>.</p>
        <a class="btn btn-vinho" href="index.html">Ir para a loja</a>`;
    }
  }

  buscar();
  timer = setInterval(buscar, 5000);
})();
