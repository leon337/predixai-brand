const fallbackHandler = require("./workforce-catalog-fallback.js");

// Quando este módulo é carregado pelo handler v2, devolve somente o fallback
// para evitar recursão circular. Quando a Vercel carrega o arquivo físico
// /api/workforce-catalog, encaminha para o handler v2 validado.
module.exports = fallbackHandler;

const loadedByV2 = module.parent?.filename?.endsWith("workforce-catalog-v2.js") === true;
if (!loadedByV2) {
  module.exports = require("./workforce-catalog-v2.js");
}
