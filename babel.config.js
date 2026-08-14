/**
 * O bundle web do Expo é servido como script clássico, não como módulo ES.
 * Nesse contexto `import.meta` é erro de sintaxe e derruba o app inteiro antes
 * do primeiro render.
 *
 * O zustand usa `import.meta.env.MODE` nos avisos de depreciação do middleware
 * `devtools`. Não usamos devtools, mas ele vem no mesmo barrel de `persist`, e
 * o Metro empacota o barrel inteiro.
 *
 * Este plugin troca `import.meta` por um objeto equivalente ao de produção, o
 * que também desliga esses avisos no build nativo — onde `import.meta` nunca
 * existiu de qualquer forma.
 */
function transformImportMeta({ types: t }) {
  return {
    name: 'transform-import-meta',
    visitor: {
      MetaProperty(path) {
        // MetaProperty também casa `new.target`; só nos interessa `import.meta`.
        if (path.node.meta.name !== 'import') return;
        path.replaceWith(
          t.objectExpression([
            t.objectProperty(
              t.identifier('env'),
              t.objectExpression([
                t.objectProperty(t.identifier('MODE'), t.stringLiteral('production')),
              ])
            ),
          ])
        );
      },
    },
  };
}

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [transformImportMeta],
  };
};
