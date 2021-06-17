const { getParser } = require('codemod-cli').jscodeshift;

module.exports = function transformer(file, api) {
  const j = getParser(api);
  const root = j(file.source);

  let returnStatments = root.find(j.ReturnStatement);
  let appToTreeCallExpression = root.find(j.CallExpression, {
    callee: {
      object: { name: 'app' },
      property: { name: 'toTree' }
    }
  });

  // Comments might be attached to the return statement so we nned to save them
  // and reattach them after we apply the transform.
  let comments = returnStatments.get(0).node.comments;

  let toTreeArguments = [];
  if (appToTreeCallExpression.nodes()[0]) {
    toTreeArguments = appToTreeCallExpression.nodes()[0].arguments;
  }

  returnStatments.replaceWith(path => {
    // this checks if the return statement is `return app.toTree();`
    if (appToTreeCallExpression.nodes()[0] !== path.node.argument) {
      return path.node;
    }

    return [
      buildWebpackRequire(j),
      buildCompatStatement(j, toTreeArguments)
    ];
  });

  returnStatments.get(0).node.comments = comments;
  return root.toSource({ quote: 'single' });
}

/*
  responsible for building:

  const {
    Webpack
  } = require('@embroider/webpack');
*/
function buildWebpackRequire(j) {
  const id = j.identifier;
  const obj = j.objectProperty;
  const call = j.callExpression;

  let webpackRequire = obj(id('Webpack'), id('Webpack'));
  webpackRequire.shorthand = true;

  return j.variableDeclaration('const', [
    j.variableDeclarator(
      j.objectPattern([ webpackRequire ]),
      call(id('require'), [j.stringLiteral('@embroider/webpack')])
    )
  ]);
}

/*
  responsible for building:

  return require('@embroider/compat').compatBuild(app, Webpack);

  we also handle:

  return require('@embroider/compat').compatBuild(app, Webpack, {
    extraPublicTrees: [foo]
  });

  we handle this second case in this transform since we will be destructive on
  app.toTree and would lose any arguments that are passed into toTree();
*/
function buildCompatStatement(j, toTreeArguments) {
  const lit = j.literal;
  const id = j.identifier;
  const prop = j.property;
  const obj = j.objectExpression;
  const call = j.callExpression;
  const arr = j.arrayExpression;

  let args = [
    id('app'),
    id('Webpack')
  ];

  if (toTreeArguments.length > 0) {
    let extraPublicTrees = prop('init', id('extraPublicTrees'), arr([]));
    extraPublicTrees.value = toTreeArguments[0];

    args = [
      id('app'),
      id('Webpack'),
      obj([ extraPublicTrees ])
    ];
  }

  return j.returnStatement(
    call(
      j.memberExpression(
        call(id('require'), [lit('@embroider/compat')]),
        id('compatBuild')
      ),
      args
    )
  );
}

module.exports.type = 'js';