/*
 * Gera um PROMPT pronto por produto para criar a foto "acessório no cachorro"
 * numa ferramenta de IA de imagem (ChatGPT/DALL·E, Gemini, etc.).
 *
 * Rode:  node scripts/gerar-prompts.mjs
 * Saída: prompts/<slug>.txt  (um por produto)
 *        prompts/TODOS.md     (todos juntos, pra copiar em lote)
 *        prompts/COMO-GERAR.md (passo a passo)
 *
 * Cada prompt pede pra IA usar a FOTO DO SEU PRODUTO como referência do
 * acessório (anexe assets/products/<img> na ferramenta) e variar a raça do pet.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const destino = join(raiz, "prompts");
mkdirSync(destino, { recursive: true });

const bruto = readFileSync(join(raiz, "products.js"), "utf8");
const produtos = JSON.parse(bruto.slice(bruto.indexOf("["), bruto.lastIndexOf("]") + 1));

/* raças fofas e variadas — rotacionadas entre os produtos */
const RACAS = [
  "Maltês", "Yorkshire Terrier", "Shih-tzu", "Poodle toy", "Lhasa Apso",
  "Spitz Alemão (Lulu da Pomerânia)", "Bichon Frisé", "Buldogue Francês", "Pug",
  "Golden Retriever filhote", "Schnauzer mini", "Beagle", "Cavalier King Charles",
  "Cocker Spaniel", "Dachshund (salsicha)", "Pinscher", "Chihuahua", "Border Collie filhote",
];

/* onde o acessório fica, por categoria */
const COLOCACAO = {
  "Laços": "com o laço preso no alto da cabeça (ou fixado em uma das orelhas), como num pet recém-saído do banho e tosa",
  "Gravatas": "com a gravatinha presa no pescoço, centralizada logo abaixo do queixo",
  "Gargantilhas & Colares": "com a gargantilha/colar em volta do pescoço, bem à mostra sobre o peito",
  "Bandanas & Lenços": "com a bandana amarrada no pescoço, caindo naturalmente sobre o peito",
  "Penteados": "com o enfeite preso em um topete/penteadinho no alto da cabeça",
  "Conjuntos": "usando o conjunto combinando (laço na cabeça e gravata no pescoço)",
};

/* fundo por gênero do produto (combinando com a marca) */
function fundo(p) {
  if (p.gen === "fêmea") return "rosa bem clarinho";
  if (p.gen === "macho") return "azul-serenity bem clarinho";
  return "creme/bege bem clarinho";
}

function promptDe(p, i) {
  const raca = RACAS[i % RACAS.length];
  const colocacao = COLOCACAO[p.cat] || "usando o acessório de forma bem visível";
  return `PROMPT — ${p.name}
(categoria: ${p.cat})
Anexe na IA a foto do produto: ${p.img}

Fotografia realista em alta resolução de um(a) ${raca} fofo(a), sentado(a) e olhando para a câmera, ${colocacao}.
Use a imagem anexada do produto como referência EXATA do acessório — mesmas cores, estampa e formato do "${p.name}".
Estilo: foto de estúdio profissional para e-commerce pet, luz suave e difusa, fundo liso ${fundo(p)}, foco nítido no pet e no acessório, expressão simpática e natural.
Enquadramento quadrado 1:1, pet centralizado, acessório claramente visível e bem posicionado.
Evite: deformações, dedos/mãos humanas, texto, marca d'água, acessório distorcido, mais de um pet.

→ Salve o resultado como: assets/applied/${p.slug}.webp`;
}

const guia = `# Como gerar as fotos "acessório no pet"

O objetivo: cada produto ganha uma 2ª foto, de um cachorro usando o acessório.
Essa foto aparece **no hover do card** e no botão **"Ver no pet"** da página do produto.

## Passo a passo (por produto)

1. Abra o prompt do produto em \`prompts/<slug>.txt\` (ou pegue de \`prompts/TODOS.md\`).
2. Na sua ferramenta de imagem (ChatGPT/DALL·E, Gemini, etc.):
   - **Anexe a foto do produto** indicada no prompt (\`assets/products/...\`). Isso faz a IA
     manter as cores e a estampa do SEU acessório.
   - Cole o texto do prompt.
3. Gere. Se não gostar, peça "gere outra variação" ou troque a raça no prompt.
4. Salve o resultado com o nome exato indicado: \`assets/applied/<slug>.webp\`
   (pode ser .webp, .jpg ou .png — de preferência quadrada, ~800x800).

## Ligar as fotos no site

Depois de salvar uma ou várias fotos em \`assets/applied/\`, rode:

    node scripts/sync-applied.mjs

Pronto: cada produto que tiver a foto passa a mostrá-la no hover e no "Ver no pet".
Os que ainda não têm continuam com o zoom suave da própria foto — nada quebra.

## Dicas de qualidade
- Fundo liso e claro (o prompt já pede) deixa o catálogo uniforme e bonito.
- Mantenha 1:1 (quadrada) pra encaixar certinho no card.
- Faça primeiro os campeões de venda; o site aceita ir recebendo aos poucos.

Total de prompts gerados: ${produtos.length}.
`;

let todos = `# Todos os prompts (${produtos.length})\n\nUm bloco por produto. Lembre de anexar a foto do produto indicada em cada um.\n\n`;
produtos.forEach((p, i) => {
  const txt = promptDe(p, i);
  writeFileSync(join(destino, `${p.slug}.txt`), txt + "\n", "utf8");
  todos += `\n---\n\n\`\`\`\n${txt}\n\`\`\`\n`;
});
writeFileSync(join(destino, "TODOS.md"), todos, "utf8");
writeFileSync(join(destino, "COMO-GERAR.md"), guia, "utf8");

console.log(`✓ ${produtos.length} prompts em prompts/<slug>.txt`);
console.log("✓ prompts/TODOS.md e prompts/COMO-GERAR.md");
