# Linus Acessórios Pet

Catálogo online da **Linus Acessórios Pet** — ateliê de acessórios para pets em cartelas de 5 e 10 unidades (laços, gravatas, gargantilhas, bandanas e itens de penteado), com pedido pelo WhatsApp.

- **77 produtos** com foto, preço e categoria (`products.js`)
- Filtros por categoria, fêmea/macho, coleção Safari e promoção, com busca e ordenação
- Botão de pedido por WhatsApp com a mensagem já preenchida
- Site 100% estático (HTML + CSS + JS), sem build e sem dependências

## Rodando localmente

```bash
python3 -m http.server 8080
# abra http://localhost:8080
```

## Estrutura

```
index.html        página única do catálogo
styles.css        design system (patch costurado: rosa, pesponto, escalope)
app.js            filtros, busca, ordenação e renderização do catálogo
products.js       dados dos 77 produtos
assets/products/  fotos dos produtos (webp 640px)
assets/brand/     logo, patch e bandeiras de pagamento
```

## Contato da loja

- WhatsApp: [(84) 99682-7176](https://wa.me/5584996827176)
- Instagram: [@linus.acessoriospet](https://instagram.com/linus.acessoriospet)
