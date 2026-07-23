/*
 * Liga as FOTOS REAIS "produto aplicado no pet" aos produtos.
 *
 * Fluxo pra trocar um placeholder pela foto de verdade:
 *   1. salve a foto em  assets/applied/<slug>.webp   (aceita .webp .jpg .jpeg .png)
 *      o <slug> é o mesmo que aparece no campo "slug"/no nome do arquivo do produto.
 *      ex.:  assets/applied/10-lacos-m-zebra-1547e.webp
 *   2. rode:  node scripts/sync-applied.mjs
 *
 * O script preenche o campo img2 de cada produto que já tem foto real.
 * Quem não tem foto continua usando o desenho da categoria (placeholder).
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const arqProdutos = join(raiz, "products.js");
const pastaAplicadas = join(raiz, "assets", "applied");
const EXTS = ["webp", "jpg", "jpeg", "png"];

/* lê o array de produtos de dentro do products.js */
const bruto = readFileSync(arqProdutos, "utf8");
const inicio = bruto.indexOf("[");
const fim = bruto.lastIndexOf("]");
if (inicio === -1 || fim === -1) {
  console.error("Não encontrei o array de produtos em products.js");
  process.exit(1);
}
const produtos = JSON.parse(bruto.slice(inicio, fim + 1));

/* mapa slug -> caminho da foto aplicada, se existir */
const arquivos = existsSync(pastaAplicadas) ? readdirSync(pastaAplicadas) : [];
function fotoDoSlug(slug) {
  for (const ext of EXTS) {
    const nome = `${slug}.${ext}`;
    if (arquivos.includes(nome)) return `assets/applied/${nome}`;
  }
  return null;
}

let ligadas = 0;
for (const p of produtos) {
  const foto = fotoDoSlug(p.slug);
  if (foto) {
    p.img2 = foto;
    ligadas++;
  } else if ("img2" in p) {
    delete p.img2; // voltou a não ter foto real -> usa o placeholder de novo
  }
}

const saida = "const PRODUCTS = " + JSON.stringify(produtos) + ";\n";
writeFileSync(arqProdutos, saida, "utf8");

console.log(`✓ ${ligadas} de ${produtos.length} produtos com foto real aplicada (img2).`);
console.log(`  Os outros ${produtos.length - ligadas} usam o desenho da categoria.`);
if (!ligadas) {
  console.log("\nDica: salve fotos em assets/applied/<slug>.webp e rode de novo.");
}
