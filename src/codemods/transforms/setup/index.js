const { getParser } = require('codemod-cli').jscodeshift;

// https://astexplorer.net/#/gist/abbbde24e6599b8f0a7aa7e37416bf7e/dd15c330695ea3f53779aba07bfdfaeb77b0f238
module.exports = function transformer(file, api) {
  const j = getParser(api);
  let root = j(file.source);

  // TODO: make sure we only work on the correct files

  let returnStatments = root.find(j.ReturnStatement);
  let appToTreeCallExpression = root.find(j.CallExpression, {
    callee: {
      object: {
        name: 'app'
      },

      property: {
        name: 'toTree'
      }
    }
  });

  // Comments might be attached to the return statement so we nned to save them
  // and reattach them after we apply the transform.
  let comments = returnStatments.get(0).node.comments;

  returnStatments.replaceWith((path) => {
    // this checks if the return statement is `return app.toTree();`
    if (appToTreeCallExpression.nodes()[0] !== path.node.argument) {
      return path.node;
    }

    return [
      j.variableDeclaration('const', [
        j.variableDeclarator(
          j.objectPattern([
      		j.objectProperty(
              j.identifier('Webpack'),
              j.identifier('Webpack'),
              false,
              true
            )
    	  ]),
          j.callExpression(
            j.identifier('require'), [j.stringLiteral('@embroider/webpack')])
        )
      ]),
      j.variableDeclaration('const', [
        j.variableDeclarator(j.identifier('tree'), j.callExpression(j.memberExpression(
          j.callExpression(j.identifier('require'), [j.literal('@embroider/compat')]),
          j.identifier('compatBuild'),
          false
        ), [j.identifier('app'), j.identifier('Webpack')]))
      ]),

      j.returnStatement(j.identifier('tree'))
    ];
  });

  returnStatments.get(0).node.comments = comments;

  return root.toSource({quote: 'single'});
};

module.exports.type = 'js';