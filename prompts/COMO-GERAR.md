# Como gerar as fotos "acessório no pet"

O objetivo: cada produto ganha uma 2ª foto, de um cachorro usando o acessório.
Essa foto aparece **no hover do card** e no botão **"Ver no pet"** da página do produto.

## Passo a passo (por produto)

1. Abra o prompt do produto em `prompts/<slug>.txt` (ou pegue de `prompts/TODOS.md`).
2. Na sua ferramenta de imagem (ChatGPT/DALL·E, Gemini, etc.):
   - **Anexe a foto do produto** indicada no prompt (`assets/products/...`). Isso faz a IA
     manter as cores e a estampa do SEU acessório.
   - Cole o texto do prompt.
3. Gere. Se não gostar, peça "gere outra variação" ou troque a raça no prompt.
4. Salve o resultado com o nome exato indicado: `assets/applied/<slug>.webp`
   (pode ser .webp, .jpg ou .png — de preferência quadrada, ~800x800).

## Ligar as fotos no site

Depois de salvar uma ou várias fotos em `assets/applied/`, rode:

    node scripts/sync-applied.mjs

Pronto: cada produto que tiver a foto passa a mostrá-la no hover e no "Ver no pet".
Os que ainda não têm continuam com o zoom suave da própria foto — nada quebra.

## Dicas de qualidade
- Fundo liso e claro (o prompt já pede) deixa o catálogo uniforme e bonito.
- Mantenha 1:1 (quadrada) pra encaixar certinho no card.
- Faça primeiro os campeões de venda; o site aceita ir recebendo aos poucos.

Total de prompts gerados: 77.
