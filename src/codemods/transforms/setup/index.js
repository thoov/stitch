const { getParser } = require('codemod-cli').jscodeshift;

// https://astexplorer.net/#/gist/abbbde24e6599b8f0a7aa7e37416bf7e/dd15c330695ea3f53779aba07bfdfaeb77b0f238
module.exports = function transformer(file, api) {
  const j = getParser(api);
  let root = j(file.source);

  // TODO: make sure we only work on the correct files
  let returnStatments = root.find(j.ReturnStatement);
  let appToTreeCallExpression = root.find(j.CallExpression, {
    callee: {
      object: { name: 'app' },
      property: { name: 'toTree' }
    }
  });
  let emberNew = root.find(j.NewExpression, {
    callee: { name: 'EmberApp' }
  });

  let sourcemaps = false;
  if (emberNew.nodes()[0].arguments[1]) {
    emberNew.nodes()[0].arguments[1].properties.forEach(obj => {
      if (obj.key.name === 'sourcemaps') {
      	sourcemaps = true; // TODO: support {extensions: ['js', 'css']}
      }
    });
  }

  // Comments might be attached to the return statement so we nned to save them
  // and reattach them after we apply the transform.
  let comments = returnStatments.get(0).node.comments;

  let extraTrees = [];
  if (appToTreeCallExpression.nodes()[0]) {
    extraTrees = appToTreeCallExpression.nodes()[0].arguments;
  }

  returnStatments.replaceWith(path => {
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
	    compatBuildStatement(j, extraTrees, sourcemaps),
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

function compatBuildStatement(j, extraTrees, sourcemaps) {
  const id = j.identifier;
  const call = j.callExpression;
  const lit = j.literal;


  return j.variableDeclaration(
    'const',
    [
      j.variableDeclarator(
        id('tree'),
        call(
          j.memberExpression(
            call(id('require'), [lit('@embroider/compat')]),
            id('compatBuild'),
            false
          ),
          compatBuildOptions(j, extraTrees, sourcemaps)
        )
      )
    ]
  );
}

function compatBuildOptions(j, extraTrees, sourcemaps) {
  const id = j.identifier;
  const obj = j.objectExpression;

  if (extraTrees.length > 0 || sourcemaps) {
  	return [
  	  id('app'),
      id('Webpack'),
      obj(compatBuildThirdObject(j, extraTrees, sourcemaps))
  	]
  }

  return [
  	id('app'),
    id('Webpack')
  ]
}

function compatBuildThirdObject(j, extraTrees, sourcemaps) {
  const id = j.identifier;
  const prop = j.property;
  const obj = j.objectExpression;
  const arr = j.arrayExpression;
  const objArr = [];

  if (extraTrees.length > 0) {
    objArr.push(prop('init', id('extraPublicTrees'), arr([])));
  }

  if (sourcemaps) {
    objArr.push(prop('init', id('packagerOptions'), obj(packagerOptionsObject(j, sourcemaps))));
  }

  return objArr;
}

function packagerOptionsObject(j, sourcemaps) {
  const id = j.identifier;
  const prop = j.property;
  const obj = j.objectExpression;

  return [prop('init', id('webpackConfig'), obj(webpackConfigObject(j, sourcemaps)))];
}

function webpackConfigObject(j, sourcemaps) {
  const id = j.identifier;
  const prop = j.property;
  const lit = j.literal;

  if (sourcemaps) {
	return [prop('init', id('devtool'), lit('eval-cheap-source-map'))];
  }

  return [];
}

module.exports.type = 'js';