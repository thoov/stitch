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

  let extraTrees = [];
  if (appToTreeCallExpression.nodes()[0]) {
    extraTrees = appToTreeCallExpression.nodes()[0].arguments;
  }

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
	  compatBuildStatement(j, extraTrees),


      j.returnStatement(j.identifier('tree'))
    ];
  });

  returnStatments.get(0).node.comments = comments;

  if (extraTrees.length > 0) {
    let compatBuild = root.find(j.CallExpression, {
      callee: {
        object: {
          callee: {
            name: 'require'
          }
        },

        property: {
          name: 'compatBuild'
        }
      }
    }).filter(path => {
      return path.value.arguments[0].name === 'app' && path.value.arguments[1].name === 'Webpack';
    });

    // TODO: clean this up with less magic numbers
  	compatBuild.nodes()[0].arguments[2].properties[0].value = extraTrees[0];
  }

  return root.toSource({quote: 'single'});
}

function compatBuildStatement(j, extraTrees) {
  if (extraTrees.length > 0) {
    return j.variableDeclaration('const', [
      j.variableDeclarator(j.identifier('tree'), j.callExpression(j.memberExpression(
        j.callExpression(j.identifier('require'), [j.literal('@embroider/compat')]),
        j.identifier('compatBuild'),
        false
      ), [j.identifier('app'), j.identifier('Webpack'), j.objectExpression([
        j.property('init', j.identifier('extraPublicTrees'), j.arrayExpression([]))
      ])]))
    ]);
  }

  return j.variableDeclaration('const', [
    j.variableDeclarator(j.identifier('tree'), j.callExpression(j.memberExpression(
      j.callExpression(j.identifier('require'), [j.literal('@embroider/compat')]),
      j.identifier('compatBuild'),
      false
    ), [j.identifier('app'), j.identifier('Webpack')]))
  ]);
}


module.exports.type = 'js';