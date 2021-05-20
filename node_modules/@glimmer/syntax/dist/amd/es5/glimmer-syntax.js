define('@glimmer/syntax', ['exports', '@glimmer/util', 'simple-html-tokenizer', '@handlebars/parser'], function (exports, util, simpleHtmlTokenizer, parser) { 'use strict';

  function buildMustache(path, params, hash, raw, loc, strip) {
    if (typeof path === 'string') {
      path = buildHead(path);
    }

    return {
      type: 'MustacheStatement',
      path: path,
      params: params || [],
      hash: hash || buildHash([]),
      escaped: !raw,
      loc: buildLoc(loc || null),
      strip: strip || {
        open: false,
        close: false
      }
    };
  }

  function buildBlock(path, params, hash, _defaultBlock, _elseBlock, loc, openStrip, inverseStrip, closeStrip) {
    var defaultBlock;
    var elseBlock;

    if (_defaultBlock.type === 'Template') {

      defaultBlock = util.assign({}, _defaultBlock, {
        type: 'Block'
      });
    } else {
      defaultBlock = _defaultBlock;
    }

    if (_elseBlock !== undefined && _elseBlock !== null && _elseBlock.type === 'Template') {

      elseBlock = util.assign({}, _elseBlock, {
        type: 'Block'
      });
    } else {
      elseBlock = _elseBlock;
    }

    return {
      type: 'BlockStatement',
      path: buildHead(path),
      params: params || [],
      hash: hash || buildHash([]),
      program: defaultBlock || null,
      inverse: elseBlock || null,
      loc: buildLoc(loc || null),
      openStrip: openStrip || {
        open: false,
        close: false
      },
      inverseStrip: inverseStrip || {
        open: false,
        close: false
      },
      closeStrip: closeStrip || {
        open: false,
        close: false
      }
    };
  }

  function buildElementModifier(path, params, hash, loc) {
    return {
      type: 'ElementModifierStatement',
      path: buildHead(path),
      params: params || [],
      hash: hash || buildHash([]),
      loc: buildLoc(loc || null)
    };
  }

  function buildPartial(name, params, hash, indent, loc) {
    return {
      type: 'PartialStatement',
      name: name,
      params: params || [],
      hash: hash || buildHash([]),
      indent: indent || '',
      strip: {
        open: false,
        close: false
      },
      loc: buildLoc(loc || null)
    };
  }

  function buildComment(value, loc) {
    return {
      type: 'CommentStatement',
      value: value,
      loc: buildLoc(loc || null)
    };
  }

  function buildMustacheComment(value, loc) {
    return {
      type: 'MustacheCommentStatement',
      value: value,
      loc: buildLoc(loc || null)
    };
  }

  function buildConcat(parts, loc) {
    return {
      type: 'ConcatStatement',
      parts: parts || [],
      loc: buildLoc(loc || null)
    };
  }

  function isLocSexp(value) {
    return Array.isArray(value) && value.length === 2 && value[0] === 'loc';
  }
  function isParamsSexp(value) {
    return Array.isArray(value) && !isLocSexp(value);
  }
  function isHashSexp(value) {
    if (typeof value === 'object' && value && !Array.isArray(value)) {
      return true;
    } else {
      return false;
    }
  }

  function normalizeModifier(sexp) {
    if (typeof sexp === 'string') {
      return buildElementModifier(sexp);
    }

    var path = normalizeHead(sexp[0]);
    var params;
    var hash;
    var loc = null;
    var parts = sexp.slice(1);
    var next = parts.shift();

    _process: {
      if (isParamsSexp(next)) {
        params = next;
      } else {
        break _process;
      }

      next = parts.shift();

      if (isHashSexp(next)) {
        hash = normalizeHash(next);
      } else {
        break _process;
      }
    }

    if (isLocSexp(next)) {
      loc = next[1];
    }

    return {
      type: 'ElementModifierStatement',
      path: path,
      params: params || [],
      hash: hash || buildHash([]),
      loc: buildLoc(loc || null)
    };
  }
  function normalizeAttr(sexp) {
    var name = sexp[0];
    var value;

    if (typeof sexp[1] === 'string') {
      value = buildText(sexp[1]);
    } else {
      value = sexp[1];
    }

    var loc = sexp[2] ? sexp[2][1] : undefined;
    return buildAttr(name, value, loc);
  }
  function normalizeHash(hash, loc) {
    var pairs = [];
    Object.keys(hash).forEach(function (key) {
      pairs.push(buildPair(key, hash[key]));
    });
    return buildHash(pairs, loc);
  }
  function normalizeHead(path) {
    if (typeof path === 'string') {
      return buildHead(path);
    } else {
      return buildHead(path[1], path[2] && path[2][1]);
    }
  }
  function normalizeElementOptions() {
    var out = {};

    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    for (var _i = 0, _args = args; _i < _args.length; _i++) {
      var arg = _args[_i];

      switch (arg[0]) {
        case 'attrs':
          {
            var rest = arg.slice(1);
            out.attrs = rest.map(normalizeAttr);
            break;
          }

        case 'modifiers':
          {
            var _rest = arg.slice(1);

            out.modifiers = _rest.map(normalizeModifier);
            break;
          }

        case 'body':
          {
            var _rest2 = arg.slice(1);

            out.children = _rest2;
            break;
          }

        case 'comments':
          {
            var _rest3 = arg.slice(1);

            out.comments = _rest3;
            break;
          }

        case 'as':
          {
            var _rest4 = arg.slice(1);

            out.blockParams = _rest4;
            break;
          }

        case 'loc':
          {
            var _rest5 = arg[1];
            out.loc = _rest5;
            break;
          }
      }
    }

    return out;
  }

  function buildElement(tag, options) {
    var normalized;

    if (Array.isArray(options)) {
      for (var _len2 = arguments.length, rest = new Array(_len2 > 2 ? _len2 - 2 : 0), _key2 = 2; _key2 < _len2; _key2++) {
        rest[_key2 - 2] = arguments[_key2];
      }

      normalized = normalizeElementOptions.apply(void 0, [options].concat(rest));
    } else {
      normalized = options || {};
    }

    var _normalized = normalized,
        attrs = _normalized.attrs,
        blockParams = _normalized.blockParams,
        modifiers = _normalized.modifiers,
        comments = _normalized.comments,
        children = _normalized.children,
        loc = _normalized.loc; // this is used for backwards compat, prior to `selfClosing` being part of the ElementNode AST

    var selfClosing = false;

    if (typeof tag === 'object') {
      selfClosing = tag.selfClosing;
      tag = tag.name;
    } else {
      if (tag.slice(-1) === '/') {
        tag = tag.slice(0, -1);
        selfClosing = true;
      }
    }

    return {
      type: 'ElementNode',
      tag: tag || '',
      selfClosing: selfClosing,
      attributes: attrs || [],
      blockParams: blockParams || [],
      modifiers: modifiers || [],
      comments: comments || [],
      children: children || [],
      loc: buildLoc(loc || null)
    };
  }

  function buildAttr(name, value, loc) {
    return {
      type: 'AttrNode',
      name: name,
      value: value,
      loc: buildLoc(loc || null)
    };
  }

  function buildText(chars, loc) {
    return {
      type: 'TextNode',
      chars: chars || '',
      loc: buildLoc(loc || null)
    };
  } // Expressions


  function buildSexpr(path, params, hash, loc) {
    return {
      type: 'SubExpression',
      path: buildHead(path),
      params: params || [],
      hash: hash || buildHash([]),
      loc: buildLoc(loc || null)
    };
  }

  function buildHead(original, loc) {
    if (typeof original !== 'string') return original;
    var parts = original.split('.');
    var thisHead = false;

    if (parts[0] === 'this') {
      thisHead = true;
      parts = parts.slice(1);
    }

    return {
      type: 'PathExpression',
      original: original,
      "this": thisHead,
      parts: parts,
      data: false,
      loc: buildLoc(loc || null)
    };
  }

  function buildLiteral(type, value, loc) {
    return {
      type: type,
      value: value,
      original: value,
      loc: buildLoc(loc || null)
    };
  } // Miscellaneous


  function buildHash(pairs, loc) {
    return {
      type: 'Hash',
      pairs: pairs || [],
      loc: buildLoc(loc || null)
    };
  }

  function buildPair(key, value, loc) {
    return {
      type: 'HashPair',
      key: key,
      value: value,
      loc: buildLoc(loc || null)
    };
  }

  function buildProgram(body, blockParams, loc) {
    return {
      type: 'Template',
      body: body || [],
      blockParams: blockParams || [],
      loc: buildLoc(loc || null)
    };
  }

  function buildBlockItself(body, blockParams, chained, loc) {
    if (chained === void 0) {
      chained = false;
    }

    return {
      type: 'Block',
      body: body || [],
      blockParams: blockParams || [],
      chained: chained,
      loc: buildLoc(loc || null)
    };
  }

  function buildTemplate(body, blockParams, loc) {
    return {
      type: 'Template',
      body: body || [],
      blockParams: blockParams || [],
      loc: buildLoc(loc || null)
    };
  }

  function buildSource(source) {
    return source || null;
  }

  function buildPosition(line, column) {
    return {
      line: line,
      column: column
    };
  }

  var SYNTHETIC = {
    source: '(synthetic)',
    start: {
      line: 1,
      column: 0
    },
    end: {
      line: 1,
      column: 0
    }
  };

  function buildLoc() {
    for (var _len3 = arguments.length, args = new Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
      args[_key3] = arguments[_key3];
    }

    if (args.length === 1) {
      var loc = args[0];

      if (loc && typeof loc === 'object') {
        return {
          source: buildSource(loc.source),
          start: buildPosition(loc.start.line, loc.start.column),
          end: buildPosition(loc.end.line, loc.end.column)
        };
      } else {
        return SYNTHETIC;
      }
    } else {
      var startLine = args[0],
          startColumn = args[1],
          endLine = args[2],
          endColumn = args[3],
          source = args[4];
      return {
        source: buildSource(source),
        start: buildPosition(startLine, startColumn),
        end: buildPosition(endLine, endColumn)
      };
    }
  }

  var builders = {
    mustache: buildMustache,
    block: buildBlock,
    partial: buildPartial,
    comment: buildComment,
    mustacheComment: buildMustacheComment,
    element: buildElement,
    elementModifier: buildElementModifier,
    attr: buildAttr,
    text: buildText,
    sexpr: buildSexpr,
    path: buildHead,
    concat: buildConcat,
    hash: buildHash,
    pair: buildPair,
    literal: buildLiteral,
    program: buildProgram,
    blockItself: buildBlockItself,
    template: buildTemplate,
    loc: buildLoc,
    pos: buildPosition,
    string: literal('StringLiteral'),
    "boolean": literal('BooleanLiteral'),
    number: literal('NumberLiteral'),
    undefined: function (_undefined) {
      function undefined$1() {
        return _undefined.apply(this, arguments);
      }

      undefined$1.toString = function () {
        return _undefined.toString();
      };

      return undefined$1;
    }(function () {
      return buildLiteral('UndefinedLiteral', undefined);
    }),
    "null": function _null() {
      return buildLiteral('NullLiteral', null);
    }
  };

  function literal(type) {
    return function (value) {
      return buildLiteral(type, value);
    };
  }

  /**
   * Subclass of `Error` with additional information
   * about location of incorrect markup.
   */
  // eslint-disable-next-line @typescript-eslint/naming-convention
  var SyntaxError = function () {
    SyntaxError.prototype = Object.create(Error.prototype);
    SyntaxError.prototype.constructor = SyntaxError;

    function SyntaxError(message, location) {
      var error = Error.call(this, message);
      this.message = message;
      this.stack = error.stack;
      this.location = location;
    }

    return SyntaxError;
  }();

  // Based on the ID validation regex in Handlebars.

  var ID_INVERSE_PATTERN = /[!"#%-,\.\/;->@\[-\^`\{-~]/; // Checks the element's attributes to see if it uses block params.
  // If it does, registers the block params with the program and
  // removes the corresponding attributes from the element.

  function parseElementBlockParams(element) {
    var params = parseBlockParams(element);
    if (params) element.blockParams = params;
  }

  function parseBlockParams(element) {
    var l = element.attributes.length;
    var attrNames = [];

    for (var i = 0; i < l; i++) {
      attrNames.push(element.attributes[i].name);
    }

    var asIndex = attrNames.indexOf('as');

    if (asIndex !== -1 && l > asIndex && attrNames[asIndex + 1].charAt(0) === '|') {
      // Some basic validation, since we're doing the parsing ourselves
      var paramsString = attrNames.slice(asIndex).join(' ');

      if (paramsString.charAt(paramsString.length - 1) !== '|' || paramsString.match(/\|/g).length !== 2) {
        throw new SyntaxError("Invalid block parameters syntax: '" + paramsString + "'", element.loc);
      }

      var params = [];

      for (var _i = asIndex + 1; _i < l; _i++) {
        var param = attrNames[_i].replace(/\|/g, '');

        if (param !== '') {
          if (ID_INVERSE_PATTERN.test(param)) {
            throw new SyntaxError("Invalid identifier for block parameters: '" + param + "' in '" + paramsString + "'", element.loc);
          }

          params.push(param);
        }
      }

      if (params.length === 0) {
        throw new SyntaxError("Cannot use zero block parameters: '" + paramsString + "'", element.loc);
      }

      element.attributes = element.attributes.slice(0, asIndex);
      return params;
    }

    return null;
  }

  function childrenFor(node) {
    switch (node.type) {
      case 'Block':
      case 'Template':
        return node.body;

      case 'ElementNode':
        return node.children;
    }
  }
  function appendChild(parent, node) {
    childrenFor(parent).push(node);
  }
  function isLiteral(path) {
    return path.type === 'StringLiteral' || path.type === 'BooleanLiteral' || path.type === 'NumberLiteral' || path.type === 'NullLiteral' || path.type === 'UndefinedLiteral';
  }
  function printLiteral(literal) {
    if (literal.type === 'UndefinedLiteral') {
      return 'undefined';
    } else {
      return JSON.stringify(literal.value);
    }
  }

  function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

  function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }
  var Parser = /*#__PURE__*/function () {
    function Parser(source, entityParser, mode) {
      if (entityParser === void 0) {
        entityParser = new simpleHtmlTokenizer.EntityParser(simpleHtmlTokenizer.HTML5NamedCharRefs);
      }

      if (mode === void 0) {
        mode = 'precompile';
      }

      this.elementStack = [];
      this.currentAttribute = null;
      this.currentNode = null;
      this.source = source.split(/(?:\r\n?|\n)/g);
      this.tokenizer = new simpleHtmlTokenizer.EventedTokenizer(this, entityParser, mode);
    }

    var _proto = Parser.prototype;

    _proto.acceptTemplate = function acceptTemplate(node) {
      return this[node.type](node);
    };

    _proto.acceptNode = function acceptNode(node) {
      return this[node.type](node);
    };

    _proto.currentElement = function currentElement() {
      return this.elementStack[this.elementStack.length - 1];
    };

    _proto.sourceForNode = function sourceForNode(node, endNode) {
      var firstLine = node.loc.start.line - 1;
      var currentLine = firstLine - 1;
      var firstColumn = node.loc.start.column;
      var string = [];
      var line;
      var lastLine;
      var lastColumn;

      if (endNode) {
        lastLine = endNode.loc.end.line - 1;
        lastColumn = endNode.loc.end.column;
      } else {
        lastLine = node.loc.end.line - 1;
        lastColumn = node.loc.end.column;
      }

      while (currentLine < lastLine) {
        currentLine++;
        line = this.source[currentLine];

        if (currentLine === firstLine) {
          if (firstLine === lastLine) {
            string.push(line.slice(firstColumn, lastColumn));
          } else {
            string.push(line.slice(firstColumn));
          }
        } else if (currentLine === lastLine) {
          string.push(line.slice(0, lastColumn));
        } else {
          string.push(line);
        }
      }

      return string.join('\n');
    };

    _createClass(Parser, [{
      key: "currentAttr",
      get: function get() {
        return this.currentAttribute;
      }
    }, {
      key: "currentTag",
      get: function get() {
        var node = this.currentNode;
        return node;
      }
    }, {
      key: "currentStartTag",
      get: function get() {
        var node = this.currentNode;
        return node;
      }
    }, {
      key: "currentEndTag",
      get: function get() {
        var node = this.currentNode;
        return node;
      }
    }, {
      key: "currentComment",
      get: function get() {
        var node = this.currentNode;
        return node;
      }
    }, {
      key: "currentData",
      get: function get() {
        var node = this.currentNode;
        return node;
      }
    }]);

    return Parser;
  }();

  function _defineProperties$1(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

  function _createClass$1(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties$1(Constructor.prototype, protoProps); if (staticProps) _defineProperties$1(Constructor, staticProps); return Constructor; }

  function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }
  var HandlebarsNodeVisitors = /*#__PURE__*/function (_Parser) {
    _inheritsLoose(HandlebarsNodeVisitors, _Parser);

    function HandlebarsNodeVisitors() {
      return _Parser.apply(this, arguments) || this;
    }

    var _proto = HandlebarsNodeVisitors.prototype;

    _proto.Program = function Program(program) {
      var body = [];
      var node;

      if (this.isTopLevel) {
        node = builders.template(body, program.blockParams, program.loc);
      } else {
        node = builders.blockItself(body, program.blockParams, program.chained, program.loc);
      }

      var i,
          l = program.body.length;
      this.elementStack.push(node);

      if (l === 0) {
        return this.elementStack.pop();
      }

      for (i = 0; i < l; i++) {
        this.acceptNode(program.body[i]);
      } // Ensure that that the element stack is balanced properly.


      var poppedNode = this.elementStack.pop();

      if (poppedNode !== node) {
        var elementNode = poppedNode;
        throw new SyntaxError('Unclosed element `' + elementNode.tag + '` (on line ' + elementNode.loc.start.line + ').', elementNode.loc);
      }

      return node;
    };

    _proto.BlockStatement = function BlockStatement(block) {
      if (this.tokenizer.state === "comment"
      /* comment */
      ) {
          this.appendToCommentData(this.sourceForNode(block));
          return;
        }

      if (this.tokenizer.state !== "data"
      /* data */
      && this.tokenizer['state'] !== "beforeData"
      /* beforeData */
      ) {
          throw new SyntaxError('A block may only be used inside an HTML element or another block.', block.loc);
        }

      var _acceptCallNodes = acceptCallNodes(this, block),
          path = _acceptCallNodes.path,
          params = _acceptCallNodes.params,
          hash = _acceptCallNodes.hash;

      var program = this.Program(block.program);
      var inverse = block.inverse ? this.Program(block.inverse) : null;
      var node = builders.block(path, params, hash, program, inverse, block.loc, block.openStrip, block.inverseStrip, block.closeStrip);
      var parentProgram = this.currentElement();
      appendChild(parentProgram, node);
    };

    _proto.MustacheStatement = function MustacheStatement(rawMustache) {
      var tokenizer = this.tokenizer;

      if (tokenizer.state === 'comment') {
        this.appendToCommentData(this.sourceForNode(rawMustache));
        return;
      }

      var mustache;
      var escaped = rawMustache.escaped,
          loc = rawMustache.loc,
          strip = rawMustache.strip;

      if (isLiteral(rawMustache.path)) {
        mustache = {
          type: 'MustacheStatement',
          path: this.acceptNode(rawMustache.path),
          params: [],
          hash: builders.hash(),
          escaped: escaped,
          loc: loc,
          strip: strip
        };
      } else {
        var _acceptCallNodes2 = acceptCallNodes(this, rawMustache),
            path = _acceptCallNodes2.path,
            params = _acceptCallNodes2.params,
            hash = _acceptCallNodes2.hash;

        mustache = builders.mustache(path, params, hash, !escaped, loc, strip);
      }

      switch (tokenizer.state) {
        // Tag helpers
        case "tagOpen"
        /* tagOpen */
        :
        case "tagName"
        /* tagName */
        :
          throw new SyntaxError("Cannot use mustaches in an elements tagname: `" + this.sourceForNode(rawMustache, rawMustache.path) + "` at L" + loc.start.line + ":C" + loc.start.column, mustache.loc);

        case "beforeAttributeName"
        /* beforeAttributeName */
        :
          addElementModifier(this.currentStartTag, mustache);
          break;

        case "attributeName"
        /* attributeName */
        :
        case "afterAttributeName"
        /* afterAttributeName */
        :
          this.beginAttributeValue(false);
          this.finishAttributeValue();
          addElementModifier(this.currentStartTag, mustache);
          tokenizer.transitionTo("beforeAttributeName"
          /* beforeAttributeName */
          );
          break;

        case "afterAttributeValueQuoted"
        /* afterAttributeValueQuoted */
        :
          addElementModifier(this.currentStartTag, mustache);
          tokenizer.transitionTo("beforeAttributeName"
          /* beforeAttributeName */
          );
          break;
        // Attribute values

        case "beforeAttributeValue"
        /* beforeAttributeValue */
        :
          this.beginAttributeValue(false);
          appendDynamicAttributeValuePart(this.currentAttribute, mustache);
          tokenizer.transitionTo("attributeValueUnquoted"
          /* attributeValueUnquoted */
          );
          break;

        case "attributeValueDoubleQuoted"
        /* attributeValueDoubleQuoted */
        :
        case "attributeValueSingleQuoted"
        /* attributeValueSingleQuoted */
        :
        case "attributeValueUnquoted"
        /* attributeValueUnquoted */
        :
          appendDynamicAttributeValuePart(this.currentAttribute, mustache);
          break;
        // TODO: Only append child when the tokenizer state makes
        // sense to do so, otherwise throw an error.

        default:
          appendChild(this.currentElement(), mustache);
      }

      return mustache;
    };

    _proto.ContentStatement = function ContentStatement(content) {
      updateTokenizerLocation(this.tokenizer, content);
      this.tokenizer.tokenizePart(content.value);
      this.tokenizer.flushData();
    };

    _proto.CommentStatement = function CommentStatement(rawComment) {
      var tokenizer = this.tokenizer;

      if (tokenizer.state === "comment"
      /* comment */
      ) {
          this.appendToCommentData(this.sourceForNode(rawComment));
          return null;
        }

      var value = rawComment.value,
          loc = rawComment.loc;
      var comment = builders.mustacheComment(value, loc);

      switch (tokenizer.state) {
        case "beforeAttributeName"
        /* beforeAttributeName */
        :
        case "afterAttributeName"
        /* afterAttributeName */
        :
          this.currentStartTag.comments.push(comment);
          break;

        case "beforeData"
        /* beforeData */
        :
        case "data"
        /* data */
        :
          appendChild(this.currentElement(), comment);
          break;

        default:
          throw new SyntaxError("Using a Handlebars comment when in the `" + tokenizer['state'] + "` state is not supported: \"" + comment.value + "\" on line " + loc.start.line + ":" + loc.start.column, rawComment.loc);
      }

      return comment;
    };

    _proto.PartialStatement = function PartialStatement(partial) {
      var loc = partial.loc;
      throw new SyntaxError("Handlebars partials are not supported: \"" + this.sourceForNode(partial, partial.name) + "\" at L" + loc.start.line + ":C" + loc.start.column, partial.loc);
    };

    _proto.PartialBlockStatement = function PartialBlockStatement(partialBlock) {
      var loc = partialBlock.loc;
      throw new SyntaxError("Handlebars partial blocks are not supported: \"" + this.sourceForNode(partialBlock, partialBlock.name) + "\" at L" + loc.start.line + ":C" + loc.start.column, partialBlock.loc);
    };

    _proto.Decorator = function Decorator(decorator) {
      var loc = decorator.loc;
      throw new SyntaxError("Handlebars decorators are not supported: \"" + this.sourceForNode(decorator, decorator.path) + "\" at L" + loc.start.line + ":C" + loc.start.column, decorator.loc);
    };

    _proto.DecoratorBlock = function DecoratorBlock(decoratorBlock) {
      var loc = decoratorBlock.loc;
      throw new SyntaxError("Handlebars decorator blocks are not supported: \"" + this.sourceForNode(decoratorBlock, decoratorBlock.path) + "\" at L" + loc.start.line + ":C" + loc.start.column, decoratorBlock.loc);
    };

    _proto.SubExpression = function SubExpression(sexpr) {
      var _acceptCallNodes3 = acceptCallNodes(this, sexpr),
          path = _acceptCallNodes3.path,
          params = _acceptCallNodes3.params,
          hash = _acceptCallNodes3.hash;

      return builders.sexpr(path, params, hash, sexpr.loc);
    };

    _proto.PathExpression = function PathExpression(path) {
      var original = path.original,
          loc = path.loc;
      var parts;

      if (original.indexOf('/') !== -1) {
        if (original.slice(0, 2) === './') {
          throw new SyntaxError("Using \"./\" is not supported in Glimmer and unnecessary: \"" + path.original + "\" on line " + loc.start.line + ".", path.loc);
        }

        if (original.slice(0, 3) === '../') {
          throw new SyntaxError("Changing context using \"../\" is not supported in Glimmer: \"" + path.original + "\" on line " + loc.start.line + ".", path.loc);
        }

        if (original.indexOf('.') !== -1) {
          throw new SyntaxError("Mixing '.' and '/' in paths is not supported in Glimmer; use only '.' to separate property paths: \"" + path.original + "\" on line " + loc.start.line + ".", path.loc);
        }

        parts = [path.parts.join('/')];
      } else if (original === '.') {
        var locationInfo = "L" + loc.start.line + ":C" + loc.start.column;
        throw new SyntaxError("'.' is not a supported path in Glimmer; check for a path with a trailing '.' at " + locationInfo + ".", path.loc);
      } else {
        parts = path.parts;
      }

      var thisHead = false; // This is to fix a bug in the Handlebars AST where the path expressions in
      // `{{this.foo}}` (and similarly `{{foo-bar this.foo named=this.foo}}` etc)
      // are simply turned into `{{foo}}`. The fix is to push it back onto the
      // parts array and let the runtime see the difference. However, we cannot
      // simply use the string `this` as it means literally the property called
      // "this" in the current context (it can be expressed in the syntax as
      // `{{[this]}}`, where the square bracket are generally for this kind of
      // escaping – such as `{{foo.["bar.baz"]}}` would mean lookup a property
      // named literally "bar.baz" on `this.foo`). By convention, we use `null`
      // for this purpose.

      if (original.match(/^this(\..+)?$/)) {
        thisHead = true;
      }

      return {
        type: 'PathExpression',
        original: path.original,
        "this": thisHead,
        parts: parts,
        data: path.data,
        loc: path.loc
      };
    };

    _proto.Hash = function Hash(hash) {
      var pairs = [];

      for (var i = 0; i < hash.pairs.length; i++) {
        var pair = hash.pairs[i];
        pairs.push(builders.pair(pair.key, this.acceptNode(pair.value), pair.loc));
      }

      return builders.hash(pairs, hash.loc);
    };

    _proto.StringLiteral = function StringLiteral(string) {
      return builders.literal('StringLiteral', string.value, string.loc);
    };

    _proto.BooleanLiteral = function BooleanLiteral(_boolean) {
      return builders.literal('BooleanLiteral', _boolean.value, _boolean.loc);
    };

    _proto.NumberLiteral = function NumberLiteral(number) {
      return builders.literal('NumberLiteral', number.value, number.loc);
    };

    _proto.UndefinedLiteral = function UndefinedLiteral(undef) {
      return builders.literal('UndefinedLiteral', undefined, undef.loc);
    };

    _proto.NullLiteral = function NullLiteral(nul) {
      return builders.literal('NullLiteral', null, nul.loc);
    };

    _createClass$1(HandlebarsNodeVisitors, [{
      key: "isTopLevel",
      get: function get() {
        return this.elementStack.length === 0;
      }
    }]);

    return HandlebarsNodeVisitors;
  }(Parser);

  function calculateRightStrippedOffsets(original, value) {
    if (value === '') {
      // if it is empty, just return the count of newlines
      // in original
      return {
        lines: original.split('\n').length - 1,
        columns: 0
      };
    } // otherwise, return the number of newlines prior to
    // `value`


    var difference = original.split(value)[0];
    var lines = difference.split(/\n/);
    var lineCount = lines.length - 1;
    return {
      lines: lineCount,
      columns: lines[lineCount].length
    };
  }

  function updateTokenizerLocation(tokenizer, content) {
    var line = content.loc.start.line;
    var column = content.loc.start.column;
    var offsets = calculateRightStrippedOffsets(content.original, content.value);
    line = line + offsets.lines;

    if (offsets.lines) {
      column = offsets.columns;
    } else {
      column = column + offsets.columns;
    }

    tokenizer.line = line;
    tokenizer.column = column;
  }

  function acceptCallNodes(compiler, node) {
    var path = compiler.PathExpression(node.path);
    var params = node.params ? node.params.map(function (e) {
      return compiler.acceptNode(e);
    }) : [];
    var hash = node.hash ? compiler.Hash(node.hash) : builders.hash();
    return {
      path: path,
      params: params,
      hash: hash
    };
  }

  function addElementModifier(element, mustache) {
    var path = mustache.path,
        params = mustache.params,
        hash = mustache.hash,
        loc = mustache.loc;

    if (isLiteral(path)) {
      var _modifier = "{{" + printLiteral(path) + "}}";

      var tag = "<" + element.name + " ... " + _modifier + " ...";
      throw new SyntaxError("In " + tag + ", " + _modifier + " is not a valid modifier: \"" + path.original + "\" on line " + (loc && loc.start.line) + ".", mustache.loc);
    }

    var modifier = builders.elementModifier(path, params, hash, loc);
    element.modifiers.push(modifier);
  }

  function appendDynamicAttributeValuePart(attribute, part) {
    attribute.isDynamic = true;
    attribute.parts.push(part);
  }

  // ParentNode and ChildKey types are derived from VisitorKeysMap

  var visitorKeys = {
    Program: util.tuple('body'),
    Template: util.tuple('body'),
    Block: util.tuple('body'),
    MustacheStatement: util.tuple('path', 'params', 'hash'),
    BlockStatement: util.tuple('path', 'params', 'hash', 'program', 'inverse'),
    ElementModifierStatement: util.tuple('path', 'params', 'hash'),
    PartialStatement: util.tuple('name', 'params', 'hash'),
    CommentStatement: util.tuple(),
    MustacheCommentStatement: util.tuple(),
    ElementNode: util.tuple('attributes', 'modifiers', 'children', 'comments'),
    AttrNode: util.tuple('value'),
    TextNode: util.tuple(),
    ConcatStatement: util.tuple('parts'),
    SubExpression: util.tuple('path', 'params', 'hash'),
    PathExpression: util.tuple(),
    StringLiteral: util.tuple(),
    BooleanLiteral: util.tuple(),
    NumberLiteral: util.tuple(),
    NullLiteral: util.tuple(),
    UndefinedLiteral: util.tuple(),
    Hash: util.tuple('pairs'),
    HashPair: util.tuple('value')
  };

  var TraversalError = function () {
    TraversalError.prototype = Object.create(Error.prototype);
    TraversalError.prototype.constructor = TraversalError;

    function TraversalError(message, node, parent, key) {
      var error = Error.call(this, message);
      this.key = key;
      this.message = message;
      this.node = node;
      this.parent = parent;
      this.stack = error.stack;
    }

    return TraversalError;
  }();
  function cannotRemoveNode(node, parent, key) {
    return new TraversalError('Cannot remove a node unless it is part of an array', node, parent, key);
  }
  function cannotReplaceNode(node, parent, key) {
    return new TraversalError('Cannot replace a node with multiple nodes unless it is part of an array', node, parent, key);
  }
  function cannotReplaceOrRemoveInKeyHandlerYet(node, key) {
    return new TraversalError('Replacing and removing in key handlers is not yet supported.', node, null, key);
  }

  function _defineProperties$2(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

  function _createClass$2(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties$2(Constructor.prototype, protoProps); if (staticProps) _defineProperties$2(Constructor, staticProps); return Constructor; }

  var Path = /*#__PURE__*/function () {
    function Path(node, parent, parentKey) {
      if (parent === void 0) {
        parent = null;
      }

      if (parentKey === void 0) {
        parentKey = null;
      }

      this.node = node;
      this.parent = parent;
      this.parentKey = parentKey;
    }

    var _proto = Path.prototype;

    _proto.parents = function parents() {
      var _this = this,
          _ref;

      return _ref = {}, _ref[Symbol.iterator] = function () {
        return new PathParentsIterator(_this);
      }, _ref;
    };

    _createClass$2(Path, [{
      key: "parentNode",
      get: function get() {
        return this.parent ? this.parent.node : null;
      }
    }]);

    return Path;
  }();

  var PathParentsIterator = /*#__PURE__*/function () {
    function PathParentsIterator(path) {
      this.path = path;
    }

    var _proto2 = PathParentsIterator.prototype;

    _proto2.next = function next() {
      if (this.path.parent) {
        this.path = this.path.parent;
        return {
          done: false,
          value: this.path
        };
      } else {
        return {
          done: true,
          value: null
        };
      }
    };

    return PathParentsIterator;
  }();

  function getEnterFunction(handler) {
    if (typeof handler === 'function') {
      return handler;
    } else {
      return handler.enter;
    }
  }

  function getExitFunction(handler) {
    if (typeof handler === 'function') {
      return undefined;
    } else {
      return handler.exit;
    }
  }

  function getKeyHandler(handler, key) {
    var keyVisitor = typeof handler !== 'function' ? handler.keys : undefined;
    if (keyVisitor === undefined) return;
    var keyHandler = keyVisitor[key];

    if (keyHandler !== undefined) {
      return keyHandler;
    }

    return keyVisitor.All;
  }

  function getNodeHandler(visitor, nodeType) {
    if (nodeType === 'Template' || nodeType === 'Block') {
      if (visitor.Program) {

        return visitor.Program;
      }
    }

    var handler = visitor[nodeType];

    if (handler !== undefined) {
      return handler;
    }

    return visitor.All;
  }

  function visitNode(visitor, path) {
    var node = path.node,
        parent = path.parent,
        parentKey = path.parentKey;
    var handler = getNodeHandler(visitor, node.type);
    var enter;
    var exit;

    if (handler !== undefined) {
      enter = getEnterFunction(handler);
      exit = getExitFunction(handler);
    }

    var result;

    if (enter !== undefined) {
      result = enter(node, path);
    }

    if (result !== undefined && result !== null) {
      if (JSON.stringify(node) === JSON.stringify(result)) {
        result = undefined;
      } else if (Array.isArray(result)) {
        visitArray(visitor, result, parent, parentKey);
        return result;
      } else {
        var _path = new Path(result, parent, parentKey);

        return visitNode(visitor, _path) || result;
      }
    }

    if (result === undefined) {
      var keys = visitorKeys[node.type];

      for (var i = 0; i < keys.length; i++) {
        var key = keys[i]; // we know if it has child keys we can widen to a ParentNode

        visitKey(visitor, handler, path, key);
      }

      if (exit !== undefined) {
        result = exit(node, path);
      }
    }

    return result;
  }

  function get(node, key) {
    return node[key];
  }

  function set(node, key, value) {
    node[key] = value;
  }

  function visitKey(visitor, handler, path, key) {
    var node = path.node;
    var value = get(node, key);

    if (!value) {
      return;
    }

    var keyEnter;
    var keyExit;

    if (handler !== undefined) {
      var keyHandler = getKeyHandler(handler, key);

      if (keyHandler !== undefined) {
        keyEnter = getEnterFunction(keyHandler);
        keyExit = getExitFunction(keyHandler);
      }
    }

    if (keyEnter !== undefined) {
      if (keyEnter(node, key) !== undefined) {
        throw cannotReplaceOrRemoveInKeyHandlerYet(node, key);
      }
    }

    if (Array.isArray(value)) {
      visitArray(visitor, value, path, key);
    } else {
      var keyPath = new Path(value, path, key);
      var result = visitNode(visitor, keyPath);

      if (result !== undefined) {
        // TODO: dynamically check the results by having a table of
        // expected node types in value space, not just type space
        assignKey(node, key, value, result);
      }
    }

    if (keyExit !== undefined) {
      if (keyExit(node, key) !== undefined) {
        throw cannotReplaceOrRemoveInKeyHandlerYet(node, key);
      }
    }
  }

  function visitArray(visitor, array, parent, parentKey) {
    for (var i = 0; i < array.length; i++) {
      var node = array[i];
      var path = new Path(node, parent, parentKey);
      var result = visitNode(visitor, path);

      if (result !== undefined) {
        i += spliceArray(array, i, result) - 1;
      }
    }
  }

  function assignKey(node, key, value, result) {
    if (result === null) {
      throw cannotRemoveNode(value, node, key);
    } else if (Array.isArray(result)) {
      if (result.length === 1) {
        set(node, key, result[0]);
      } else {
        if (result.length === 0) {
          throw cannotRemoveNode(value, node, key);
        } else {
          throw cannotReplaceNode(value, node, key);
        }
      }
    } else {
      set(node, key, result);
    }
  }

  function spliceArray(array, index, result) {
    if (result === null) {
      array.splice(index, 1);
      return 0;
    } else if (Array.isArray(result)) {
      array.splice.apply(array, [index, 1].concat(result));
      return result.length;
    } else {
      array.splice(index, 1, result);
      return 1;
    }
  }

  function traverse(node, visitor) {
    var path = new Path(node);
    visitNode(visitor, path);
  }

  var ATTR_VALUE_REGEX_TEST = /[\xA0"&]/;
  var ATTR_VALUE_REGEX_REPLACE = new RegExp(ATTR_VALUE_REGEX_TEST.source, 'g');
  var TEXT_REGEX_TEST = /[\xA0&<>]/;
  var TEXT_REGEX_REPLACE = new RegExp(TEXT_REGEX_TEST.source, 'g');

  function attrValueReplacer(_char) {
    switch (_char.charCodeAt(0)) {
      case 160
      /* NBSP */
      :
        return '&nbsp;';

      case 34
      /* QUOT */
      :
        return '&quot;';

      case 38
      /* AMP */
      :
        return '&amp;';

      default:
        return _char;
    }
  }

  function textReplacer(_char2) {
    switch (_char2.charCodeAt(0)) {
      case 160
      /* NBSP */
      :
        return '&nbsp;';

      case 38
      /* AMP */
      :
        return '&amp;';

      case 60
      /* LT */
      :
        return '&lt;';

      case 62
      /* GT */
      :
        return '&gt;';

      default:
        return _char2;
    }
  }

  function escapeAttrValue(attrValue) {
    if (ATTR_VALUE_REGEX_TEST.test(attrValue)) {
      return attrValue.replace(ATTR_VALUE_REGEX_REPLACE, attrValueReplacer);
    }

    return attrValue;
  }
  function escapeText(text) {
    if (TEXT_REGEX_TEST.test(text)) {
      return text.replace(TEXT_REGEX_REPLACE, textReplacer);
    }

    return text;
  }
  function isSynthetic(node) {
    if (node && node.loc) {
      return node.loc.source === '(synthetic)';
    }

    return false;
  }
  function sortByLoc(a, b) {
    // be conservative about the location where a new node is inserted
    if (isSynthetic(a) || isSynthetic(b)) {
      return 0;
    }

    if (a.loc.start.line < b.loc.start.line) {
      return -1;
    }

    if (a.loc.start.line === b.loc.start.line && a.loc.start.column < b.loc.start.column) {
      return -1;
    }

    if (a.loc.start.line === b.loc.start.line && a.loc.start.column === b.loc.start.column) {
      return 0;
    }

    return 1;
  }

  function _createForOfIteratorHelperLoose(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } it = o[Symbol.iterator](); return it.next.bind(it); }

  function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

  function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }
  var NON_WHITESPACE = /\S/;

  var Printer = /*#__PURE__*/function () {
    function Printer(options) {
      this.buffer = '';
      this.options = options;
    }
    /*
      This is used by _all_ methods on this Printer class that add to `this.buffer`,
      it allows consumers of the printer to use alternate string representations for
      a given node.
         The primary use case for this are things like source -> source codemod utilities.
      For example, ember-template-recast attempts to always preserve the original string
      formatting in each AST node if no modifications are made to it.
    */


    var _proto = Printer.prototype;

    _proto.handledByOverride = function handledByOverride(node, ensureLeadingWhitespace) {
      if (ensureLeadingWhitespace === void 0) {
        ensureLeadingWhitespace = false;
      }

      if (this.options.override !== undefined) {
        var result = this.options.override(node, this.options);

        if (typeof result === 'string') {
          if (ensureLeadingWhitespace && result !== '' && NON_WHITESPACE.test(result[0])) {
            result = " " + result;
          }

          this.buffer += result;
          return true;
        }
      }

      return false;
    };

    _proto.Node = function Node(node) {
      switch (node.type) {
        case 'MustacheStatement':
        case 'BlockStatement':
        case 'PartialStatement':
        case 'MustacheCommentStatement':
        case 'CommentStatement':
        case 'TextNode':
        case 'ElementNode':
        case 'AttrNode':
        case 'Block':
        case 'Template':
          return this.TopLevelStatement(node);

        case 'StringLiteral':
        case 'BooleanLiteral':
        case 'NumberLiteral':
        case 'UndefinedLiteral':
        case 'NullLiteral':
        case 'PathExpression':
        case 'SubExpression':
          return this.Expression(node);

        case 'Program':
          return this.Block(node);

        case 'ConcatStatement':
          // should have an AttrNode parent
          return this.ConcatStatement(node);

        case 'Hash':
          return this.Hash(node);

        case 'HashPair':
          return this.HashPair(node);

        case 'ElementModifierStatement':
          return this.ElementModifierStatement(node);
      }

      return unreachable(node, 'Node');
    };

    _proto.Expression = function Expression(expression) {
      switch (expression.type) {
        case 'StringLiteral':
        case 'BooleanLiteral':
        case 'NumberLiteral':
        case 'UndefinedLiteral':
        case 'NullLiteral':
          return this.Literal(expression);

        case 'PathExpression':
          return this.PathExpression(expression);

        case 'SubExpression':
          return this.SubExpression(expression);
      }

      return unreachable(expression, 'Expression');
    };

    _proto.Literal = function Literal(literal) {
      switch (literal.type) {
        case 'StringLiteral':
          return this.StringLiteral(literal);

        case 'BooleanLiteral':
          return this.BooleanLiteral(literal);

        case 'NumberLiteral':
          return this.NumberLiteral(literal);

        case 'UndefinedLiteral':
          return this.UndefinedLiteral(literal);

        case 'NullLiteral':
          return this.NullLiteral(literal);
      }

      return unreachable(literal, 'Literal');
    };

    _proto.TopLevelStatement = function TopLevelStatement(statement) {
      switch (statement.type) {
        case 'MustacheStatement':
          return this.MustacheStatement(statement);

        case 'BlockStatement':
          return this.BlockStatement(statement);

        case 'PartialStatement':
          return this.PartialStatement(statement);

        case 'MustacheCommentStatement':
          return this.MustacheCommentStatement(statement);

        case 'CommentStatement':
          return this.CommentStatement(statement);

        case 'TextNode':
          return this.TextNode(statement);

        case 'ElementNode':
          return this.ElementNode(statement);

        case 'Block':
        case 'Template':
          return this.Block(statement);

        case 'AttrNode':
          // should have element
          return this.AttrNode(statement);
      }

      unreachable(statement, 'TopLevelStatement');
    };

    _proto.Block = function Block(block) {
      /*
        When processing a template like:
             ```hbs
        {{#if whatever}}
          whatever
        {{else if somethingElse}}
          something else
        {{else}}
          fallback
        {{/if}}
        ```
             The AST still _effectively_ looks like:
             ```hbs
        {{#if whatever}}
          whatever
        {{else}}{{#if somethingElse}}
          something else
        {{else}}
          fallback
        {{/if}}{{/if}}
        ```
             The only way we can tell if that is the case is by checking for
        `block.chained`, but unfortunately when the actual statements are
        processed the `block.body[0]` node (which will always be a
        `BlockStatement`) has no clue that its anscestor `Block` node was
        chained.
             This "forwards" the `chained` setting so that we can check
        it later when processing the `BlockStatement`.
      */
      if (block.chained) {
        var firstChild = block.body[0];
        firstChild.chained = true;
      }

      if (this.handledByOverride(block)) {
        return;
      }

      this.TopLevelStatements(block.body);
    };

    _proto.TopLevelStatements = function TopLevelStatements(statements) {
      var _this = this;

      statements.forEach(function (statement) {
        return _this.TopLevelStatement(statement);
      });
    };

    _proto.ElementNode = function ElementNode(el) {
      if (this.handledByOverride(el)) {
        return;
      }

      this.OpenElementNode(el);
      this.TopLevelStatements(el.children);
      this.CloseElementNode(el);
    };

    _proto.OpenElementNode = function OpenElementNode(el) {
      this.buffer += "<" + el.tag;
      var parts = [].concat(el.attributes, el.modifiers, el.comments).sort(sortByLoc);

      for (var _iterator = _createForOfIteratorHelperLoose(parts), _step; !(_step = _iterator()).done;) {
        var part = _step.value;
        this.buffer += ' ';

        switch (part.type) {
          case 'AttrNode':
            this.AttrNode(part);
            break;

          case 'ElementModifierStatement':
            this.ElementModifierStatement(part);
            break;

          case 'MustacheCommentStatement':
            this.MustacheCommentStatement(part);
            break;
        }
      }

      if (el.blockParams.length) {
        this.BlockParams(el.blockParams);
      }

      if (el.selfClosing) {
        this.buffer += ' /';
      }

      this.buffer += '>';
    };

    _proto.CloseElementNode = function CloseElementNode(el) {
      if (el.selfClosing || voidMap[el.tag.toLowerCase()]) {
        return;
      }

      this.buffer += "</" + el.tag + ">";
    };

    _proto.AttrNode = function AttrNode(attr) {
      if (this.handledByOverride(attr)) {
        return;
      }

      var name = attr.name,
          value = attr.value;
      this.buffer += name;

      if (value.type !== 'TextNode' || value.chars.length > 0) {
        this.buffer += '=';
        this.AttrNodeValue(value);
      }
    };

    _proto.AttrNodeValue = function AttrNodeValue(value) {
      if (value.type === 'TextNode') {
        this.buffer += '"';
        this.TextNode(value, true);
        this.buffer += '"';
      } else {
        this.Node(value);
      }
    };

    _proto.TextNode = function TextNode(text, isAttr) {
      if (this.handledByOverride(text)) {
        return;
      }

      if (this.options.entityEncoding === 'raw') {
        this.buffer += text.chars;
      } else if (isAttr) {
        this.buffer += escapeAttrValue(text.chars);
      } else {
        this.buffer += escapeText(text.chars);
      }
    };

    _proto.MustacheStatement = function MustacheStatement(mustache) {
      if (this.handledByOverride(mustache)) {
        return;
      }

      this.buffer += mustache.escaped ? '{{' : '{{{';

      if (mustache.strip.open) {
        this.buffer += '~';
      }

      this.Expression(mustache.path);
      this.Params(mustache.params);
      this.Hash(mustache.hash);

      if (mustache.strip.close) {
        this.buffer += '~';
      }

      this.buffer += mustache.escaped ? '}}' : '}}}';
    };

    _proto.BlockStatement = function BlockStatement(block) {
      if (this.handledByOverride(block)) {
        return;
      }

      if (block.chained) {
        this.buffer += block.inverseStrip.open ? '{{~' : '{{';
        this.buffer += 'else ';
      } else {
        this.buffer += block.openStrip.open ? '{{~#' : '{{#';
      }

      this.Expression(block.path);
      this.Params(block.params);
      this.Hash(block.hash);

      if (block.program.blockParams.length) {
        this.BlockParams(block.program.blockParams);
      }

      if (block.chained) {
        this.buffer += block.inverseStrip.close ? '~}}' : '}}';
      } else {
        this.buffer += block.openStrip.close ? '~}}' : '}}';
      }

      this.Block(block.program);

      if (block.inverse) {
        if (!block.inverse.chained) {
          this.buffer += block.inverseStrip.open ? '{{~' : '{{';
          this.buffer += 'else';
          this.buffer += block.inverseStrip.close ? '~}}' : '}}';
        }

        this.Block(block.inverse);
      }

      if (!block.chained) {
        this.buffer += block.closeStrip.open ? '{{~/' : '{{/';
        this.Expression(block.path);
        this.buffer += block.closeStrip.close ? '~}}' : '}}';
      }
    };

    _proto.BlockParams = function BlockParams(blockParams) {
      this.buffer += " as |" + blockParams.join(' ') + "|";
    };

    _proto.PartialStatement = function PartialStatement(partial) {
      if (this.handledByOverride(partial)) {
        return;
      }

      this.buffer += '{{>';
      this.Expression(partial.name);
      this.Params(partial.params);
      this.Hash(partial.hash);
      this.buffer += '}}';
    };

    _proto.ConcatStatement = function ConcatStatement(concat) {
      var _this2 = this;

      if (this.handledByOverride(concat)) {
        return;
      }

      this.buffer += '"';
      concat.parts.forEach(function (part) {
        if (part.type === 'TextNode') {
          _this2.TextNode(part, true);
        } else {
          _this2.Node(part);
        }
      });
      this.buffer += '"';
    };

    _proto.MustacheCommentStatement = function MustacheCommentStatement(comment) {
      if (this.handledByOverride(comment)) {
        return;
      }

      this.buffer += "{{!--" + comment.value + "--}}";
    };

    _proto.ElementModifierStatement = function ElementModifierStatement(mod) {
      if (this.handledByOverride(mod)) {
        return;
      }

      this.buffer += '{{';
      this.Expression(mod.path);
      this.Params(mod.params);
      this.Hash(mod.hash);
      this.buffer += '}}';
    };

    _proto.CommentStatement = function CommentStatement(comment) {
      if (this.handledByOverride(comment)) {
        return;
      }

      this.buffer += "<!--" + comment.value + "-->";
    };

    _proto.PathExpression = function PathExpression(path) {
      if (this.handledByOverride(path)) {
        return;
      }

      this.buffer += path.original;
    };

    _proto.SubExpression = function SubExpression(sexp) {
      if (this.handledByOverride(sexp)) {
        return;
      }

      this.buffer += '(';
      this.Expression(sexp.path);
      this.Params(sexp.params);
      this.Hash(sexp.hash);
      this.buffer += ')';
    };

    _proto.Params = function Params(params) {
      var _this3 = this;

      // TODO: implement a top level Params AST node (just like the Hash object)
      // so that this can also be overridden
      if (params.length) {
        params.forEach(function (param) {
          _this3.buffer += ' ';

          _this3.Expression(param);
        });
      }
    };

    _proto.Hash = function Hash(hash) {
      var _this4 = this;

      if (this.handledByOverride(hash, true)) {
        return;
      }

      hash.pairs.forEach(function (pair) {
        _this4.buffer += ' ';

        _this4.HashPair(pair);
      });
    };

    _proto.HashPair = function HashPair(pair) {
      if (this.handledByOverride(pair)) {
        return;
      }

      this.buffer += pair.key;
      this.buffer += '=';
      this.Node(pair.value);
    };

    _proto.StringLiteral = function StringLiteral(str) {
      if (this.handledByOverride(str)) {
        return;
      }

      this.buffer += JSON.stringify(str.value);
    };

    _proto.BooleanLiteral = function BooleanLiteral(bool) {
      if (this.handledByOverride(bool)) {
        return;
      }

      this.buffer += bool.value;
    };

    _proto.NumberLiteral = function NumberLiteral(number) {
      if (this.handledByOverride(number)) {
        return;
      }

      this.buffer += number.value;
    };

    _proto.UndefinedLiteral = function UndefinedLiteral(node) {
      if (this.handledByOverride(node)) {
        return;
      }

      this.buffer += 'undefined';
    };

    _proto.NullLiteral = function NullLiteral(node) {
      if (this.handledByOverride(node)) {
        return;
      }

      this.buffer += 'null';
    };

    _proto.print = function print(node) {
      var options = this.options;

      if (options.override) {
        var result = options.override(node, options);

        if (result !== undefined) {
          return result;
        }
      }

      this.buffer = '';
      this.Node(node);
      return this.buffer;
    };

    return Printer;
  }();

  function unreachable(node, parentNodeType) {
    var loc = node.loc,
        type = node.type;
    throw new Error("Non-exhaustive node narrowing " + type + " @ location: " + JSON.stringify(loc) + " for parent " + parentNodeType);
  }

  function build(ast, options) {
    if (options === void 0) {
      options = {
        entityEncoding: 'transformed'
      };
    }

    if (!ast) {
      return '';
    }

    var printer = new Printer(options);
    return printer.print(ast);
  }

  var Walker = /*#__PURE__*/function () {
    function Walker(order) {
      this.order = order;
      this.stack = [];
    }

    var _proto = Walker.prototype;

    _proto.visit = function visit(node, callback) {
      if (!node) {
        return;
      }

      this.stack.push(node);

      if (this.order === 'post') {
        this.children(node, callback);
        callback(node, this);
      } else {
        callback(node, this);
        this.children(node, callback);
      }

      this.stack.pop();
    };

    _proto.children = function children(node, callback) {
      var type;

      if (node.type === 'Block' || node.type === 'Template' && visitors.Program) {
        type = 'Program';
      } else {
        type = node.type;
      }

      var visitor = visitors[type];

      if (visitor) {
        visitor(this, node, callback);
      }
    };

    return Walker;
  }();
  var visitors = {
    Program: function Program(walker, node, callback) {
      for (var i = 0; i < node.body.length; i++) {
        walker.visit(node.body[i], callback);
      }
    },
    Template: function Template(walker, node, callback) {
      for (var i = 0; i < node.body.length; i++) {
        walker.visit(node.body[i], callback);
      }
    },
    Block: function Block(walker, node, callback) {
      for (var i = 0; i < node.body.length; i++) {
        walker.visit(node.body[i], callback);
      }
    },
    ElementNode: function ElementNode(walker, node, callback) {
      for (var i = 0; i < node.children.length; i++) {
        walker.visit(node.children[i], callback);
      }
    },
    BlockStatement: function BlockStatement(walker, node, callback) {
      walker.visit(node.program, callback);
      walker.visit(node.inverse || null, callback);
    }
  };

  function _inheritsLoose$1(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }
  var voidMap = Object.create(null);
  var voidTagNames = 'area base br col command embed hr img input keygen link meta param source track wbr';
  voidTagNames.split(' ').forEach(function (tagName) {
    voidMap[tagName] = true;
  });
  var TokenizerEventHandlers = /*#__PURE__*/function (_HandlebarsNodeVisito) {
    _inheritsLoose$1(TokenizerEventHandlers, _HandlebarsNodeVisito);

    function TokenizerEventHandlers() {
      var _this;

      _this = _HandlebarsNodeVisito.apply(this, arguments) || this;
      _this.tagOpenLine = 0;
      _this.tagOpenColumn = 0;
      return _this;
    }

    var _proto = TokenizerEventHandlers.prototype;

    _proto.reset = function reset() {
      this.currentNode = null;
    } // Comment
    ;

    _proto.beginComment = function beginComment() {
      this.currentNode = builders.comment('');
      this.currentNode.loc = {
        source: null,
        start: builders.pos(this.tagOpenLine, this.tagOpenColumn),
        end: null
      };
    };

    _proto.appendToCommentData = function appendToCommentData(_char) {
      this.currentComment.value += _char;
    };

    _proto.finishComment = function finishComment() {
      this.currentComment.loc.end = builders.pos(this.tokenizer.line, this.tokenizer.column);
      appendChild(this.currentElement(), this.currentComment);
    } // Data
    ;

    _proto.beginData = function beginData() {
      this.currentNode = builders.text();
      this.currentNode.loc = {
        source: null,
        start: builders.pos(this.tokenizer.line, this.tokenizer.column),
        end: null
      };
    };

    _proto.appendToData = function appendToData(_char2) {
      this.currentData.chars += _char2;
    };

    _proto.finishData = function finishData() {
      this.currentData.loc.end = builders.pos(this.tokenizer.line, this.tokenizer.column);
      appendChild(this.currentElement(), this.currentData);
    } // Tags - basic
    ;

    _proto.tagOpen = function tagOpen() {
      this.tagOpenLine = this.tokenizer.line;
      this.tagOpenColumn = this.tokenizer.column;
    };

    _proto.beginStartTag = function beginStartTag() {
      this.currentNode = {
        type: 'StartTag',
        name: '',
        attributes: [],
        modifiers: [],
        comments: [],
        selfClosing: false,
        loc: SYNTHETIC
      };
    };

    _proto.beginEndTag = function beginEndTag() {
      this.currentNode = {
        type: 'EndTag',
        name: '',
        attributes: [],
        modifiers: [],
        comments: [],
        selfClosing: false,
        loc: SYNTHETIC
      };
    };

    _proto.finishTag = function finishTag() {
      var _this$tokenizer = this.tokenizer,
          line = _this$tokenizer.line,
          column = _this$tokenizer.column;
      var tag = this.currentTag;
      tag.loc = builders.loc(this.tagOpenLine, this.tagOpenColumn, line, column);

      if (tag.type === 'StartTag') {
        this.finishStartTag();

        if (voidMap[tag.name] || tag.selfClosing) {
          this.finishEndTag(true);
        }
      } else if (tag.type === 'EndTag') {
        this.finishEndTag(false);
      }
    };

    _proto.finishStartTag = function finishStartTag() {
      var _this$currentStartTag = this.currentStartTag,
          name = _this$currentStartTag.name,
          attrs = _this$currentStartTag.attributes,
          modifiers = _this$currentStartTag.modifiers,
          comments = _this$currentStartTag.comments,
          selfClosing = _this$currentStartTag.selfClosing;
      var loc = builders.loc(this.tagOpenLine, this.tagOpenColumn);
      var element = builders.element({
        name: name,
        selfClosing: selfClosing
      }, {
        attrs: attrs,
        modifiers: modifiers,
        comments: comments,
        loc: loc
      });
      this.elementStack.push(element);
    };

    _proto.finishEndTag = function finishEndTag(isVoid) {
      var tag = this.currentTag;
      var element = this.elementStack.pop();
      var parent = this.currentElement();
      validateEndTag(tag, element, isVoid);
      element.loc.end.line = this.tokenizer.line;
      element.loc.end.column = this.tokenizer.column;
      parseElementBlockParams(element);
      appendChild(parent, element);
    };

    _proto.markTagAsSelfClosing = function markTagAsSelfClosing() {
      this.currentTag.selfClosing = true;
    } // Tags - name
    ;

    _proto.appendToTagName = function appendToTagName(_char3) {
      this.currentTag.name += _char3;
    } // Tags - attributes
    ;

    _proto.beginAttribute = function beginAttribute() {
      var tag = this.currentTag;

      if (tag.type === 'EndTag') {
        throw new SyntaxError("Invalid end tag: closing tag must not have attributes, " + ("in `" + tag.name + "` (on line " + this.tokenizer.line + ")."), tag.loc);
      }

      this.currentAttribute = {
        name: '',
        parts: [],
        isQuoted: false,
        isDynamic: false,
        start: builders.pos(this.tokenizer.line, this.tokenizer.column),
        valueStartLine: 0,
        valueStartColumn: 0
      };
    };

    _proto.appendToAttributeName = function appendToAttributeName(_char4) {
      this.currentAttr.name += _char4;
    };

    _proto.beginAttributeValue = function beginAttributeValue(isQuoted) {
      this.currentAttr.isQuoted = isQuoted;
      this.currentAttr.valueStartLine = this.tokenizer.line;
      this.currentAttr.valueStartColumn = this.tokenizer.column;
    };

    _proto.appendToAttributeValue = function appendToAttributeValue(_char5) {
      var parts = this.currentAttr.parts;
      var lastPart = parts[parts.length - 1];

      if (lastPart && lastPart.type === 'TextNode') {
        lastPart.chars += _char5; // update end location for each added char

        lastPart.loc.end.line = this.tokenizer.line;
        lastPart.loc.end.column = this.tokenizer.column;
      } else {
        // initially assume the text node is a single char
        var loc = builders.loc(this.tokenizer.line, this.tokenizer.column, this.tokenizer.line, this.tokenizer.column); // the tokenizer line/column have already been advanced, correct location info

        if (_char5 === '\n') {
          loc.start.line -= 1;
          loc.start.column = lastPart ? lastPart.loc.end.column : this.currentAttr.valueStartColumn;
        } else {
          loc.start.column -= 1;
        }

        var text = builders.text(_char5, loc);
        parts.push(text);
      }
    };

    _proto.finishAttributeValue = function finishAttributeValue() {
      var _this$currentAttr = this.currentAttr,
          name = _this$currentAttr.name,
          parts = _this$currentAttr.parts,
          isQuoted = _this$currentAttr.isQuoted,
          isDynamic = _this$currentAttr.isDynamic,
          valueStartLine = _this$currentAttr.valueStartLine,
          valueStartColumn = _this$currentAttr.valueStartColumn;
      var value = assembleAttributeValue(parts, isQuoted, isDynamic, this.tokenizer.line);
      value.loc = builders.loc(valueStartLine, valueStartColumn, this.tokenizer.line, this.tokenizer.column);
      var loc = builders.loc(this.currentAttr.start.line, this.currentAttr.start.column, this.tokenizer.line, this.tokenizer.column);
      var attribute = builders.attr(name, value, loc);
      this.currentStartTag.attributes.push(attribute);
    };

    _proto.reportSyntaxError = function reportSyntaxError(message) {
      throw new SyntaxError("Syntax error at line " + this.tokenizer.line + " col " + this.tokenizer.column + ": " + message, builders.loc(this.tokenizer.line, this.tokenizer.column));
    };

    return TokenizerEventHandlers;
  }(HandlebarsNodeVisitors);

  function assembleAttributeValue(parts, isQuoted, isDynamic, line) {
    if (isDynamic) {
      if (isQuoted) {
        return assembleConcatenatedValue(parts);
      } else {
        if (parts.length === 1 || parts.length === 2 && parts[1].type === 'TextNode' && parts[1].chars === '/') {
          return parts[0];
        } else {
          throw new SyntaxError("An unquoted attribute value must be a string or a mustache, " + "preceeded by whitespace or a '=' character, and " + ("followed by whitespace, a '>' character, or '/>' (on line " + line + ")"), builders.loc(line, 0));
        }
      }
    } else {
      return parts.length > 0 ? parts[0] : builders.text('');
    }
  }

  function assembleConcatenatedValue(parts) {
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];

      if (part.type !== 'MustacheStatement' && part.type !== 'TextNode') {
        throw new SyntaxError('Unsupported node in quoted attribute value: ' + part['type'], part.loc);
      }
    }

    return builders.concat(parts);
  }

  function validateEndTag(tag, element, selfClosing) {
    var error;

    if (voidMap[tag.name] && !selfClosing) {
      // EngTag is also called by StartTag for void and self-closing tags (i.e.
      // <input> or <br />, so we need to check for that here. Otherwise, we would
      // throw an error for those cases.
      error = 'Invalid end tag ' + formatEndTagInfo(tag) + ' (void elements cannot have end tags).';
    } else if (element.tag === undefined) {
      error = 'Closing tag ' + formatEndTagInfo(tag) + ' without an open tag.';
    } else if (element.tag !== tag.name) {
      error = 'Closing tag ' + formatEndTagInfo(tag) + ' did not match last open tag `' + element.tag + '` (on line ' + element.loc.start.line + ').';
    }

    if (error) {
      throw new SyntaxError(error, element.loc);
    }
  }

  function formatEndTagInfo(tag) {
    return '`' + tag.name + '` (on line ' + tag.loc.end.line + ')';
  }

  var syntax = {
    parse: preprocess,
    builders: builders,
    print: build,
    traverse: traverse,
    Walker: Walker
  };
  function preprocess(html, options) {
    if (options === void 0) {
      options = {};
    }

    var mode = options.mode || 'precompile';
    var ast;

    if (typeof html === 'object') {
      ast = html;
    } else if (mode === 'codemod') {
      ast = parser.parseWithoutProcessing(html, options.parseOptions);
    } else {
      ast = parser.parse(html, options.parseOptions);
    }

    var entityParser = undefined;

    if (mode === 'codemod') {
      entityParser = new simpleHtmlTokenizer.EntityParser({});
    }

    var program = new TokenizerEventHandlers(html, entityParser, mode).acceptTemplate(ast);

    if (options && options.plugins && options.plugins.ast) {
      for (var i = 0, l = options.plugins.ast.length; i < l; i++) {
        var transform = options.plugins.ast[i];
        var env = util.assign({}, options, {
          syntax: syntax
        }, {
          plugins: undefined
        });
        var pluginResult = transform(env);
        traverse(program, pluginResult.visitor);
      }
    }

    return program;
  }



  var nodes = /*#__PURE__*/Object.freeze({
    __proto__: null
  });

  exports.AST = nodes;
  exports.Path = Path;
  exports.SyntaxError = SyntaxError;
  exports.TraversalError = TraversalError;
  exports.Walker = Walker;
  exports.builders = builders;
  exports.cannotRemoveNode = cannotRemoveNode;
  exports.cannotReplaceNode = cannotReplaceNode;
  exports.cannotReplaceOrRemoveInKeyHandlerYet = cannotReplaceOrRemoveInKeyHandlerYet;
  exports.isLiteral = isLiteral;
  exports.preprocess = preprocess;
  exports.print = build;
  exports.printLiteral = printLiteral;
  exports.sortByLoc = sortByLoc;
  exports.traverse = traverse;

  Object.defineProperty(exports, '__esModule', { value: true });

});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2xpbW1lci1zeW50YXguanMiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL0BnbGltbWVyL3N5bnRheC9saWIvYnVpbGRlcnMudHMiLCIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9AZ2xpbW1lci9zeW50YXgvbGliL2Vycm9ycy9zeW50YXgtZXJyb3IudHMiLCIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9AZ2xpbW1lci9zeW50YXgvbGliL3V0aWxzLnRzIiwiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvQGdsaW1tZXIvc3ludGF4L2xpYi9wYXJzZXIudHMiLCIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9AZ2xpbW1lci9zeW50YXgvbGliL3BhcnNlci9oYW5kbGViYXJzLW5vZGUtdmlzaXRvcnMudHMiLCIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9AZ2xpbW1lci9zeW50YXgvbGliL3R5cGVzL3Zpc2l0b3Ita2V5cy50cyIsIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL0BnbGltbWVyL3N5bnRheC9saWIvdHJhdmVyc2FsL2Vycm9ycy50cyIsIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL0BnbGltbWVyL3N5bnRheC9saWIvdHJhdmVyc2FsL3BhdGgudHMiLCIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9AZ2xpbW1lci9zeW50YXgvbGliL3RyYXZlcnNhbC90cmF2ZXJzZS50cyIsIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL0BnbGltbWVyL3N5bnRheC9saWIvZ2VuZXJhdGlvbi91dGlsLnRzIiwiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvQGdsaW1tZXIvc3ludGF4L2xpYi9nZW5lcmF0aW9uL3ByaW50ZXIudHMiLCIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9AZ2xpbW1lci9zeW50YXgvbGliL2dlbmVyYXRpb24vcHJpbnQudHMiLCIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9AZ2xpbW1lci9zeW50YXgvbGliL3RyYXZlcnNhbC93YWxrZXIudHMiLCIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9AZ2xpbW1lci9zeW50YXgvbGliL3BhcnNlci90b2tlbml6ZXItZXZlbnQtaGFuZGxlcnMudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgQVNUIGZyb20gJy4vdHlwZXMvbm9kZXMnO1xuaW1wb3J0IHsgT3B0aW9uLCBEaWN0IH0gZnJvbSAnQGdsaW1tZXIvaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBkZXByZWNhdGUsIGFzc2lnbiB9IGZyb20gJ0BnbGltbWVyL3V0aWwnO1xuaW1wb3J0IHsgTE9DQUxfREVCVUcgfSBmcm9tICdAZ2xpbW1lci9sb2NhbC1kZWJ1Zy1mbGFncyc7XG5pbXBvcnQgeyBTdHJpbmdMaXRlcmFsLCBCb29sZWFuTGl0ZXJhbCwgTnVtYmVyTGl0ZXJhbCB9IGZyb20gJy4vdHlwZXMvaGFuZGxlYmFycy1hc3QnO1xuXG4vLyBTdGF0ZW1lbnRzXG5cbmV4cG9ydCB0eXBlIEJ1aWxkZXJIZWFkID0gc3RyaW5nIHwgQVNULkV4cHJlc3Npb247XG5leHBvcnQgdHlwZSBUYWdEZXNjcmlwdG9yID0gc3RyaW5nIHwgeyBuYW1lOiBzdHJpbmc7IHNlbGZDbG9zaW5nOiBib29sZWFuIH07XG5cbmZ1bmN0aW9uIGJ1aWxkTXVzdGFjaGUoXG4gIHBhdGg6IEJ1aWxkZXJIZWFkIHwgQVNULkxpdGVyYWwsXG4gIHBhcmFtcz86IEFTVC5FeHByZXNzaW9uW10sXG4gIGhhc2g/OiBBU1QuSGFzaCxcbiAgcmF3PzogYm9vbGVhbixcbiAgbG9jPzogQVNULlNvdXJjZUxvY2F0aW9uLFxuICBzdHJpcD86IEFTVC5TdHJpcEZsYWdzXG4pOiBBU1QuTXVzdGFjaGVTdGF0ZW1lbnQge1xuICBpZiAodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgcGF0aCA9IGJ1aWxkSGVhZChwYXRoKTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgdHlwZTogJ011c3RhY2hlU3RhdGVtZW50JyxcbiAgICBwYXRoLFxuICAgIHBhcmFtczogcGFyYW1zIHx8IFtdLFxuICAgIGhhc2g6IGhhc2ggfHwgYnVpbGRIYXNoKFtdKSxcbiAgICBlc2NhcGVkOiAhcmF3LFxuICAgIGxvYzogYnVpbGRMb2MobG9jIHx8IG51bGwpLFxuICAgIHN0cmlwOiBzdHJpcCB8fCB7IG9wZW46IGZhbHNlLCBjbG9zZTogZmFsc2UgfSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gYnVpbGRCbG9jayhcbiAgcGF0aDogQnVpbGRlckhlYWQsXG4gIHBhcmFtczogT3B0aW9uPEFTVC5FeHByZXNzaW9uW10+LFxuICBoYXNoOiBPcHRpb248QVNULkhhc2g+LFxuICBfZGVmYXVsdEJsb2NrOiBBU1QuUG9zc2libHlEZXByZWNhdGVkQmxvY2ssXG4gIF9lbHNlQmxvY2s/OiBPcHRpb248QVNULlBvc3NpYmx5RGVwcmVjYXRlZEJsb2NrPixcbiAgbG9jPzogQVNULlNvdXJjZUxvY2F0aW9uLFxuICBvcGVuU3RyaXA/OiBBU1QuU3RyaXBGbGFncyxcbiAgaW52ZXJzZVN0cmlwPzogQVNULlN0cmlwRmxhZ3MsXG4gIGNsb3NlU3RyaXA/OiBBU1QuU3RyaXBGbGFnc1xuKTogQVNULkJsb2NrU3RhdGVtZW50IHtcbiAgbGV0IGRlZmF1bHRCbG9jazogQVNULkJsb2NrO1xuICBsZXQgZWxzZUJsb2NrOiBPcHRpb248QVNULkJsb2NrPiB8IHVuZGVmaW5lZDtcblxuICBpZiAoX2RlZmF1bHRCbG9jay50eXBlID09PSAnVGVtcGxhdGUnKSB7XG4gICAgaWYgKExPQ0FMX0RFQlVHKSB7XG4gICAgICBkZXByZWNhdGUoYGIucHJvZ3JhbSBpcyBkZXByZWNhdGVkLiBVc2UgYi5ibG9ja0l0c2VsZiBpbnN0ZWFkLmApO1xuICAgIH1cblxuICAgIGRlZmF1bHRCbG9jayA9IChhc3NpZ24oe30sIF9kZWZhdWx0QmxvY2ssIHsgdHlwZTogJ0Jsb2NrJyB9KSBhcyB1bmtub3duKSBhcyBBU1QuQmxvY2s7XG4gIH0gZWxzZSB7XG4gICAgZGVmYXVsdEJsb2NrID0gX2RlZmF1bHRCbG9jaztcbiAgfVxuXG4gIGlmIChfZWxzZUJsb2NrICE9PSB1bmRlZmluZWQgJiYgX2Vsc2VCbG9jayAhPT0gbnVsbCAmJiBfZWxzZUJsb2NrLnR5cGUgPT09ICdUZW1wbGF0ZScpIHtcbiAgICBpZiAoTE9DQUxfREVCVUcpIHtcbiAgICAgIGRlcHJlY2F0ZShgYi5wcm9ncmFtIGlzIGRlcHJlY2F0ZWQuIFVzZSBiLmJsb2NrSXRzZWxmIGluc3RlYWQuYCk7XG4gICAgfVxuXG4gICAgZWxzZUJsb2NrID0gKGFzc2lnbih7fSwgX2Vsc2VCbG9jaywgeyB0eXBlOiAnQmxvY2snIH0pIGFzIHVua25vd24pIGFzIEFTVC5CbG9jaztcbiAgfSBlbHNlIHtcbiAgICBlbHNlQmxvY2sgPSBfZWxzZUJsb2NrO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAnQmxvY2tTdGF0ZW1lbnQnLFxuICAgIHBhdGg6IGJ1aWxkSGVhZChwYXRoKSxcbiAgICBwYXJhbXM6IHBhcmFtcyB8fCBbXSxcbiAgICBoYXNoOiBoYXNoIHx8IGJ1aWxkSGFzaChbXSksXG4gICAgcHJvZ3JhbTogZGVmYXVsdEJsb2NrIHx8IG51bGwsXG4gICAgaW52ZXJzZTogZWxzZUJsb2NrIHx8IG51bGwsXG4gICAgbG9jOiBidWlsZExvYyhsb2MgfHwgbnVsbCksXG4gICAgb3BlblN0cmlwOiBvcGVuU3RyaXAgfHwgeyBvcGVuOiBmYWxzZSwgY2xvc2U6IGZhbHNlIH0sXG4gICAgaW52ZXJzZVN0cmlwOiBpbnZlcnNlU3RyaXAgfHwgeyBvcGVuOiBmYWxzZSwgY2xvc2U6IGZhbHNlIH0sXG4gICAgY2xvc2VTdHJpcDogY2xvc2VTdHJpcCB8fCB7IG9wZW46IGZhbHNlLCBjbG9zZTogZmFsc2UgfSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gYnVpbGRFbGVtZW50TW9kaWZpZXIoXG4gIHBhdGg6IEJ1aWxkZXJIZWFkLFxuICBwYXJhbXM/OiBBU1QuRXhwcmVzc2lvbltdLFxuICBoYXNoPzogQVNULkhhc2gsXG4gIGxvYz86IE9wdGlvbjxBU1QuU291cmNlTG9jYXRpb24+XG4pOiBBU1QuRWxlbWVudE1vZGlmaWVyU3RhdGVtZW50IHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAnRWxlbWVudE1vZGlmaWVyU3RhdGVtZW50JyxcbiAgICBwYXRoOiBidWlsZEhlYWQocGF0aCksXG4gICAgcGFyYW1zOiBwYXJhbXMgfHwgW10sXG4gICAgaGFzaDogaGFzaCB8fCBidWlsZEhhc2goW10pLFxuICAgIGxvYzogYnVpbGRMb2MobG9jIHx8IG51bGwpLFxuICB9O1xufVxuXG5mdW5jdGlvbiBidWlsZFBhcnRpYWwoXG4gIG5hbWU6IEFTVC5QYXRoRXhwcmVzc2lvbixcbiAgcGFyYW1zPzogQVNULkV4cHJlc3Npb25bXSxcbiAgaGFzaD86IEFTVC5IYXNoLFxuICBpbmRlbnQ/OiBzdHJpbmcsXG4gIGxvYz86IEFTVC5Tb3VyY2VMb2NhdGlvblxuKTogQVNULlBhcnRpYWxTdGF0ZW1lbnQge1xuICByZXR1cm4ge1xuICAgIHR5cGU6ICdQYXJ0aWFsU3RhdGVtZW50JyxcbiAgICBuYW1lOiBuYW1lLFxuICAgIHBhcmFtczogcGFyYW1zIHx8IFtdLFxuICAgIGhhc2g6IGhhc2ggfHwgYnVpbGRIYXNoKFtdKSxcbiAgICBpbmRlbnQ6IGluZGVudCB8fCAnJyxcbiAgICBzdHJpcDogeyBvcGVuOiBmYWxzZSwgY2xvc2U6IGZhbHNlIH0sXG4gICAgbG9jOiBidWlsZExvYyhsb2MgfHwgbnVsbCksXG4gIH07XG59XG5cbmZ1bmN0aW9uIGJ1aWxkQ29tbWVudCh2YWx1ZTogc3RyaW5nLCBsb2M/OiBBU1QuU291cmNlTG9jYXRpb24pOiBBU1QuQ29tbWVudFN0YXRlbWVudCB7XG4gIHJldHVybiB7XG4gICAgdHlwZTogJ0NvbW1lbnRTdGF0ZW1lbnQnLFxuICAgIHZhbHVlOiB2YWx1ZSxcbiAgICBsb2M6IGJ1aWxkTG9jKGxvYyB8fCBudWxsKSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gYnVpbGRNdXN0YWNoZUNvbW1lbnQoXG4gIHZhbHVlOiBzdHJpbmcsXG4gIGxvYz86IEFTVC5Tb3VyY2VMb2NhdGlvblxuKTogQVNULk11c3RhY2hlQ29tbWVudFN0YXRlbWVudCB7XG4gIHJldHVybiB7XG4gICAgdHlwZTogJ011c3RhY2hlQ29tbWVudFN0YXRlbWVudCcsXG4gICAgdmFsdWU6IHZhbHVlLFxuICAgIGxvYzogYnVpbGRMb2MobG9jIHx8IG51bGwpLFxuICB9O1xufVxuXG5mdW5jdGlvbiBidWlsZENvbmNhdChcbiAgcGFydHM6IChBU1QuVGV4dE5vZGUgfCBBU1QuTXVzdGFjaGVTdGF0ZW1lbnQpW10sXG4gIGxvYz86IEFTVC5Tb3VyY2VMb2NhdGlvblxuKTogQVNULkNvbmNhdFN0YXRlbWVudCB7XG4gIHJldHVybiB7XG4gICAgdHlwZTogJ0NvbmNhdFN0YXRlbWVudCcsXG4gICAgcGFydHM6IHBhcnRzIHx8IFtdLFxuICAgIGxvYzogYnVpbGRMb2MobG9jIHx8IG51bGwpLFxuICB9O1xufVxuXG4vLyBOb2Rlc1xuXG5leHBvcnQgdHlwZSBFbGVtZW50QXJncyA9XG4gIHwgWydhdHRycycsIC4uLkF0dHJTZXhwW11dXG4gIHwgWydtb2RpZmllcnMnLCAuLi5Nb2RpZmllclNleHBbXV1cbiAgfCBbJ2JvZHknLCAuLi5BU1QuU3RhdGVtZW50W11dXG4gIHwgWydjb21tZW50cycsIC4uLkVsZW1lbnRDb21tZW50W11dXG4gIHwgWydhcycsIC4uLnN0cmluZ1tdXVxuICB8IFsnbG9jJywgQVNULlNvdXJjZUxvY2F0aW9uXTtcblxuZXhwb3J0IHR5cGUgUGF0aFNleHAgPSBzdHJpbmcgfCBbJ3BhdGgnLCBzdHJpbmcsIExvY1NleHA/XTtcblxuZXhwb3J0IHR5cGUgTW9kaWZpZXJTZXhwID1cbiAgfCBzdHJpbmdcbiAgfCBbUGF0aFNleHAsIExvY1NleHA/XVxuICB8IFtQYXRoU2V4cCwgQVNULkV4cHJlc3Npb25bXSwgTG9jU2V4cD9dXG4gIHwgW1BhdGhTZXhwLCBBU1QuRXhwcmVzc2lvbltdLCBEaWN0PEFTVC5FeHByZXNzaW9uPiwgTG9jU2V4cD9dO1xuXG5leHBvcnQgdHlwZSBBdHRyU2V4cCA9IFtzdHJpbmcsIEFTVC5BdHRyTm9kZVsndmFsdWUnXSB8IHN0cmluZywgTG9jU2V4cD9dO1xuXG5leHBvcnQgdHlwZSBMb2NTZXhwID0gWydsb2MnLCBBU1QuU291cmNlTG9jYXRpb25dO1xuXG5leHBvcnQgdHlwZSBFbGVtZW50Q29tbWVudCA9IEFTVC5NdXN0YWNoZUNvbW1lbnRTdGF0ZW1lbnQgfCBBU1QuU291cmNlTG9jYXRpb24gfCBzdHJpbmc7XG5cbmV4cG9ydCB0eXBlIFNleHBWYWx1ZSA9XG4gIHwgc3RyaW5nXG4gIHwgQVNULkV4cHJlc3Npb25bXVxuICB8IERpY3Q8QVNULkV4cHJlc3Npb24+XG4gIHwgTG9jU2V4cFxuICB8IFBhdGhTZXhwXG4gIHwgdW5kZWZpbmVkO1xuXG5leHBvcnQgZnVuY3Rpb24gaXNMb2NTZXhwKHZhbHVlOiBTZXhwVmFsdWUpOiB2YWx1ZSBpcyBMb2NTZXhwIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkodmFsdWUpICYmIHZhbHVlLmxlbmd0aCA9PT0gMiAmJiB2YWx1ZVswXSA9PT0gJ2xvYyc7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1BhcmFtc1NleHAodmFsdWU6IFNleHBWYWx1ZSk6IHZhbHVlIGlzIEFTVC5FeHByZXNzaW9uW10ge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheSh2YWx1ZSkgJiYgIWlzTG9jU2V4cCh2YWx1ZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0hhc2hTZXhwKHZhbHVlOiBTZXhwVmFsdWUpOiB2YWx1ZSBpcyBEaWN0PEFTVC5FeHByZXNzaW9uPiB7XG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHZhbHVlICYmICFBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgIGV4cGVjdFR5cGU8RGljdDxBU1QuRXhwcmVzc2lvbj4+KHZhbHVlKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZnVuY3Rpb24gZXhwZWN0VHlwZTxUPihfaW5wdXQ6IFQpOiB2b2lkIHtcbiAgcmV0dXJuO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplTW9kaWZpZXIoc2V4cDogTW9kaWZpZXJTZXhwKTogQVNULkVsZW1lbnRNb2RpZmllclN0YXRlbWVudCB7XG4gIGlmICh0eXBlb2Ygc2V4cCA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gYnVpbGRFbGVtZW50TW9kaWZpZXIoc2V4cCk7XG4gIH1cblxuICBsZXQgcGF0aDogQVNULkV4cHJlc3Npb24gPSBub3JtYWxpemVIZWFkKHNleHBbMF0pO1xuICBsZXQgcGFyYW1zOiBBU1QuRXhwcmVzc2lvbltdIHwgdW5kZWZpbmVkO1xuICBsZXQgaGFzaDogQVNULkhhc2ggfCB1bmRlZmluZWQ7XG4gIGxldCBsb2M6IEFTVC5Tb3VyY2VMb2NhdGlvbiB8IG51bGwgPSBudWxsO1xuXG4gIGxldCBwYXJ0cyA9IHNleHAuc2xpY2UoMSk7XG4gIGxldCBuZXh0ID0gcGFydHMuc2hpZnQoKTtcblxuICBfcHJvY2Vzczoge1xuICAgIGlmIChpc1BhcmFtc1NleHAobmV4dCkpIHtcbiAgICAgIHBhcmFtcyA9IG5leHQgYXMgQVNULkV4cHJlc3Npb25bXTtcbiAgICB9IGVsc2Uge1xuICAgICAgYnJlYWsgX3Byb2Nlc3M7XG4gICAgfVxuXG4gICAgbmV4dCA9IHBhcnRzLnNoaWZ0KCk7XG5cbiAgICBpZiAoaXNIYXNoU2V4cChuZXh0KSkge1xuICAgICAgaGFzaCA9IG5vcm1hbGl6ZUhhc2gobmV4dCBhcyBEaWN0PEFTVC5FeHByZXNzaW9uPik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGJyZWFrIF9wcm9jZXNzO1xuICAgIH1cbiAgfVxuXG4gIGlmIChpc0xvY1NleHAobmV4dCkpIHtcbiAgICBsb2MgPSBuZXh0WzFdO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAnRWxlbWVudE1vZGlmaWVyU3RhdGVtZW50JyxcbiAgICBwYXRoLFxuICAgIHBhcmFtczogcGFyYW1zIHx8IFtdLFxuICAgIGhhc2g6IGhhc2ggfHwgYnVpbGRIYXNoKFtdKSxcbiAgICBsb2M6IGJ1aWxkTG9jKGxvYyB8fCBudWxsKSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZUF0dHIoc2V4cDogQXR0clNleHApOiBBU1QuQXR0ck5vZGUge1xuICBsZXQgbmFtZSA9IHNleHBbMF07XG4gIGxldCB2YWx1ZTtcblxuICBpZiAodHlwZW9mIHNleHBbMV0gPT09ICdzdHJpbmcnKSB7XG4gICAgdmFsdWUgPSBidWlsZFRleHQoc2V4cFsxXSk7XG4gIH0gZWxzZSB7XG4gICAgdmFsdWUgPSBzZXhwWzFdO1xuICB9XG5cbiAgbGV0IGxvYyA9IHNleHBbMl0gPyBzZXhwWzJdWzFdIDogdW5kZWZpbmVkO1xuXG4gIHJldHVybiBidWlsZEF0dHIobmFtZSwgdmFsdWUsIGxvYyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVIYXNoKGhhc2g6IERpY3Q8QVNULkV4cHJlc3Npb24+LCBsb2M/OiBBU1QuU291cmNlTG9jYXRpb24pOiBBU1QuSGFzaCB7XG4gIGxldCBwYWlyczogQVNULkhhc2hQYWlyW10gPSBbXTtcblxuICBPYmplY3Qua2V5cyhoYXNoKS5mb3JFYWNoKChrZXkpID0+IHtcbiAgICBwYWlycy5wdXNoKGJ1aWxkUGFpcihrZXksIGhhc2hba2V5XSkpO1xuICB9KTtcblxuICByZXR1cm4gYnVpbGRIYXNoKHBhaXJzLCBsb2MpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplSGVhZChwYXRoOiBQYXRoU2V4cCk6IEFTVC5FeHByZXNzaW9uIHtcbiAgaWYgKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBidWlsZEhlYWQocGF0aCk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGJ1aWxkSGVhZChwYXRoWzFdLCBwYXRoWzJdICYmIHBhdGhbMl1bMV0pO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVFbGVtZW50T3B0aW9ucyguLi5hcmdzOiBFbGVtZW50QXJnc1tdKTogQnVpbGRFbGVtZW50T3B0aW9ucyB7XG4gIGxldCBvdXQ6IEJ1aWxkRWxlbWVudE9wdGlvbnMgPSB7fTtcblxuICBmb3IgKGxldCBhcmcgb2YgYXJncykge1xuICAgIHN3aXRjaCAoYXJnWzBdKSB7XG4gICAgICBjYXNlICdhdHRycyc6IHtcbiAgICAgICAgbGV0IFssIC4uLnJlc3RdID0gYXJnO1xuICAgICAgICBvdXQuYXR0cnMgPSByZXN0Lm1hcChub3JtYWxpemVBdHRyKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBjYXNlICdtb2RpZmllcnMnOiB7XG4gICAgICAgIGxldCBbLCAuLi5yZXN0XSA9IGFyZztcbiAgICAgICAgb3V0Lm1vZGlmaWVycyA9IHJlc3QubWFwKG5vcm1hbGl6ZU1vZGlmaWVyKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBjYXNlICdib2R5Jzoge1xuICAgICAgICBsZXQgWywgLi4ucmVzdF0gPSBhcmc7XG4gICAgICAgIG91dC5jaGlsZHJlbiA9IHJlc3Q7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgY2FzZSAnY29tbWVudHMnOiB7XG4gICAgICAgIGxldCBbLCAuLi5yZXN0XSA9IGFyZztcblxuICAgICAgICBvdXQuY29tbWVudHMgPSByZXN0O1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2FzJzoge1xuICAgICAgICBsZXQgWywgLi4ucmVzdF0gPSBhcmc7XG4gICAgICAgIG91dC5ibG9ja1BhcmFtcyA9IHJlc3Q7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgY2FzZSAnbG9jJzoge1xuICAgICAgICBsZXQgWywgcmVzdF0gPSBhcmc7XG4gICAgICAgIG91dC5sb2MgPSByZXN0O1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gb3V0O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEJ1aWxkRWxlbWVudE9wdGlvbnMge1xuICBhdHRycz86IEFTVC5BdHRyTm9kZVtdO1xuICBtb2RpZmllcnM/OiBBU1QuRWxlbWVudE1vZGlmaWVyU3RhdGVtZW50W107XG4gIGNoaWxkcmVuPzogQVNULlN0YXRlbWVudFtdO1xuICBjb21tZW50cz86IEVsZW1lbnRDb21tZW50W107XG4gIGJsb2NrUGFyYW1zPzogc3RyaW5nW107XG4gIGxvYz86IEFTVC5Tb3VyY2VMb2NhdGlvbjtcbn1cblxuZnVuY3Rpb24gYnVpbGRFbGVtZW50KHRhZzogVGFnRGVzY3JpcHRvciwgb3B0aW9ucz86IEJ1aWxkRWxlbWVudE9wdGlvbnMpOiBBU1QuRWxlbWVudE5vZGU7XG5mdW5jdGlvbiBidWlsZEVsZW1lbnQodGFnOiBUYWdEZXNjcmlwdG9yLCAuLi5vcHRpb25zOiBFbGVtZW50QXJnc1tdKTogQVNULkVsZW1lbnROb2RlO1xuZnVuY3Rpb24gYnVpbGRFbGVtZW50KFxuICB0YWc6IFRhZ0Rlc2NyaXB0b3IsXG4gIG9wdGlvbnM/OiBCdWlsZEVsZW1lbnRPcHRpb25zIHwgRWxlbWVudEFyZ3MsXG4gIC4uLnJlc3Q6IEVsZW1lbnRBcmdzW11cbik6IEFTVC5FbGVtZW50Tm9kZSB7XG4gIGxldCBub3JtYWxpemVkOiBCdWlsZEVsZW1lbnRPcHRpb25zO1xuICBpZiAoQXJyYXkuaXNBcnJheShvcHRpb25zKSkge1xuICAgIG5vcm1hbGl6ZWQgPSBub3JtYWxpemVFbGVtZW50T3B0aW9ucyhvcHRpb25zLCAuLi5yZXN0KTtcbiAgfSBlbHNlIHtcbiAgICBub3JtYWxpemVkID0gb3B0aW9ucyB8fCB7fTtcbiAgfVxuXG4gIGxldCB7IGF0dHJzLCBibG9ja1BhcmFtcywgbW9kaWZpZXJzLCBjb21tZW50cywgY2hpbGRyZW4sIGxvYyB9ID0gbm9ybWFsaXplZDtcblxuICAvLyB0aGlzIGlzIHVzZWQgZm9yIGJhY2t3YXJkcyBjb21wYXQsIHByaW9yIHRvIGBzZWxmQ2xvc2luZ2AgYmVpbmcgcGFydCBvZiB0aGUgRWxlbWVudE5vZGUgQVNUXG4gIGxldCBzZWxmQ2xvc2luZyA9IGZhbHNlO1xuICBpZiAodHlwZW9mIHRhZyA9PT0gJ29iamVjdCcpIHtcbiAgICBzZWxmQ2xvc2luZyA9IHRhZy5zZWxmQ2xvc2luZztcbiAgICB0YWcgPSB0YWcubmFtZTtcbiAgfSBlbHNlIHtcbiAgICBpZiAodGFnLnNsaWNlKC0xKSA9PT0gJy8nKSB7XG4gICAgICB0YWcgPSB0YWcuc2xpY2UoMCwgLTEpO1xuICAgICAgc2VsZkNsb3NpbmcgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgdHlwZTogJ0VsZW1lbnROb2RlJyxcbiAgICB0YWc6IHRhZyB8fCAnJyxcbiAgICBzZWxmQ2xvc2luZzogc2VsZkNsb3NpbmcsXG4gICAgYXR0cmlidXRlczogYXR0cnMgfHwgW10sXG4gICAgYmxvY2tQYXJhbXM6IGJsb2NrUGFyYW1zIHx8IFtdLFxuICAgIG1vZGlmaWVyczogbW9kaWZpZXJzIHx8IFtdLFxuICAgIGNvbW1lbnRzOiAoY29tbWVudHMgYXMgQVNULk11c3RhY2hlQ29tbWVudFN0YXRlbWVudFtdKSB8fCBbXSxcbiAgICBjaGlsZHJlbjogY2hpbGRyZW4gfHwgW10sXG4gICAgbG9jOiBidWlsZExvYyhsb2MgfHwgbnVsbCksXG4gIH07XG59XG5cbmZ1bmN0aW9uIGJ1aWxkQXR0cihcbiAgbmFtZTogc3RyaW5nLFxuICB2YWx1ZTogQVNULkF0dHJOb2RlWyd2YWx1ZSddLFxuICBsb2M/OiBBU1QuU291cmNlTG9jYXRpb25cbik6IEFTVC5BdHRyTm9kZSB7XG4gIHJldHVybiB7XG4gICAgdHlwZTogJ0F0dHJOb2RlJyxcbiAgICBuYW1lOiBuYW1lLFxuICAgIHZhbHVlOiB2YWx1ZSxcbiAgICBsb2M6IGJ1aWxkTG9jKGxvYyB8fCBudWxsKSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gYnVpbGRUZXh0KGNoYXJzPzogc3RyaW5nLCBsb2M/OiBBU1QuU291cmNlTG9jYXRpb24pOiBBU1QuVGV4dE5vZGUge1xuICByZXR1cm4ge1xuICAgIHR5cGU6ICdUZXh0Tm9kZScsXG4gICAgY2hhcnM6IGNoYXJzIHx8ICcnLFxuICAgIGxvYzogYnVpbGRMb2MobG9jIHx8IG51bGwpLFxuICB9O1xufVxuXG4vLyBFeHByZXNzaW9uc1xuXG5mdW5jdGlvbiBidWlsZFNleHByKFxuICBwYXRoOiBCdWlsZGVySGVhZCxcbiAgcGFyYW1zPzogQVNULkV4cHJlc3Npb25bXSxcbiAgaGFzaD86IEFTVC5IYXNoLFxuICBsb2M/OiBBU1QuU291cmNlTG9jYXRpb25cbik6IEFTVC5TdWJFeHByZXNzaW9uIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAnU3ViRXhwcmVzc2lvbicsXG4gICAgcGF0aDogYnVpbGRIZWFkKHBhdGgpLFxuICAgIHBhcmFtczogcGFyYW1zIHx8IFtdLFxuICAgIGhhc2g6IGhhc2ggfHwgYnVpbGRIYXNoKFtdKSxcbiAgICBsb2M6IGJ1aWxkTG9jKGxvYyB8fCBudWxsKSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gYnVpbGRIZWFkKG9yaWdpbmFsOiBCdWlsZGVySGVhZCwgbG9jPzogQVNULlNvdXJjZUxvY2F0aW9uKTogQVNULkV4cHJlc3Npb24ge1xuICBpZiAodHlwZW9mIG9yaWdpbmFsICE9PSAnc3RyaW5nJykgcmV0dXJuIG9yaWdpbmFsO1xuXG4gIGxldCBwYXJ0cyA9IG9yaWdpbmFsLnNwbGl0KCcuJyk7XG4gIGxldCB0aGlzSGVhZCA9IGZhbHNlO1xuXG4gIGlmIChwYXJ0c1swXSA9PT0gJ3RoaXMnKSB7XG4gICAgdGhpc0hlYWQgPSB0cnVlO1xuICAgIHBhcnRzID0gcGFydHMuc2xpY2UoMSk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHR5cGU6ICdQYXRoRXhwcmVzc2lvbicsXG4gICAgb3JpZ2luYWwsXG4gICAgdGhpczogdGhpc0hlYWQsXG4gICAgcGFydHMsXG4gICAgZGF0YTogZmFsc2UsXG4gICAgbG9jOiBidWlsZExvYyhsb2MgfHwgbnVsbCksXG4gIH07XG59XG5cbmZ1bmN0aW9uIGJ1aWxkTGl0ZXJhbDxUIGV4dGVuZHMgQVNULkxpdGVyYWw+KFxuICB0eXBlOiBUWyd0eXBlJ10sXG4gIHZhbHVlOiBUWyd2YWx1ZSddLFxuICBsb2M/OiBBU1QuU291cmNlTG9jYXRpb25cbik6IFQge1xuICByZXR1cm4ge1xuICAgIHR5cGUsXG4gICAgdmFsdWUsXG4gICAgb3JpZ2luYWw6IHZhbHVlLFxuICAgIGxvYzogYnVpbGRMb2MobG9jIHx8IG51bGwpLFxuICB9IGFzIFQ7XG59XG5cbi8vIE1pc2NlbGxhbmVvdXNcblxuZnVuY3Rpb24gYnVpbGRIYXNoKHBhaXJzPzogQVNULkhhc2hQYWlyW10sIGxvYz86IEFTVC5Tb3VyY2VMb2NhdGlvbik6IEFTVC5IYXNoIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAnSGFzaCcsXG4gICAgcGFpcnM6IHBhaXJzIHx8IFtdLFxuICAgIGxvYzogYnVpbGRMb2MobG9jIHx8IG51bGwpLFxuICB9O1xufVxuXG5mdW5jdGlvbiBidWlsZFBhaXIoa2V5OiBzdHJpbmcsIHZhbHVlOiBBU1QuRXhwcmVzc2lvbiwgbG9jPzogQVNULlNvdXJjZUxvY2F0aW9uKTogQVNULkhhc2hQYWlyIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAnSGFzaFBhaXInLFxuICAgIGtleToga2V5LFxuICAgIHZhbHVlLFxuICAgIGxvYzogYnVpbGRMb2MobG9jIHx8IG51bGwpLFxuICB9O1xufVxuXG5mdW5jdGlvbiBidWlsZFByb2dyYW0oXG4gIGJvZHk/OiBBU1QuU3RhdGVtZW50W10sXG4gIGJsb2NrUGFyYW1zPzogc3RyaW5nW10sXG4gIGxvYz86IEFTVC5Tb3VyY2VMb2NhdGlvblxuKTogQVNULlRlbXBsYXRlIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAnVGVtcGxhdGUnLFxuICAgIGJvZHk6IGJvZHkgfHwgW10sXG4gICAgYmxvY2tQYXJhbXM6IGJsb2NrUGFyYW1zIHx8IFtdLFxuICAgIGxvYzogYnVpbGRMb2MobG9jIHx8IG51bGwpLFxuICB9O1xufVxuXG5mdW5jdGlvbiBidWlsZEJsb2NrSXRzZWxmKFxuICBib2R5PzogQVNULlN0YXRlbWVudFtdLFxuICBibG9ja1BhcmFtcz86IHN0cmluZ1tdLFxuICBjaGFpbmVkID0gZmFsc2UsXG4gIGxvYz86IEFTVC5Tb3VyY2VMb2NhdGlvblxuKTogQVNULkJsb2NrIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAnQmxvY2snLFxuICAgIGJvZHk6IGJvZHkgfHwgW10sXG4gICAgYmxvY2tQYXJhbXM6IGJsb2NrUGFyYW1zIHx8IFtdLFxuICAgIGNoYWluZWQsXG4gICAgbG9jOiBidWlsZExvYyhsb2MgfHwgbnVsbCksXG4gIH07XG59XG5cbmZ1bmN0aW9uIGJ1aWxkVGVtcGxhdGUoXG4gIGJvZHk/OiBBU1QuU3RhdGVtZW50W10sXG4gIGJsb2NrUGFyYW1zPzogc3RyaW5nW10sXG4gIGxvYz86IEFTVC5Tb3VyY2VMb2NhdGlvblxuKTogQVNULlRlbXBsYXRlIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAnVGVtcGxhdGUnLFxuICAgIGJvZHk6IGJvZHkgfHwgW10sXG4gICAgYmxvY2tQYXJhbXM6IGJsb2NrUGFyYW1zIHx8IFtdLFxuICAgIGxvYzogYnVpbGRMb2MobG9jIHx8IG51bGwpLFxuICB9O1xufVxuXG5mdW5jdGlvbiBidWlsZFNvdXJjZShzb3VyY2U/OiBzdHJpbmcpIHtcbiAgcmV0dXJuIHNvdXJjZSB8fCBudWxsO1xufVxuXG5mdW5jdGlvbiBidWlsZFBvc2l0aW9uKGxpbmU6IG51bWJlciwgY29sdW1uOiBudW1iZXIpIHtcbiAgcmV0dXJuIHtcbiAgICBsaW5lLFxuICAgIGNvbHVtbixcbiAgfTtcbn1cblxuZXhwb3J0IGNvbnN0IFNZTlRIRVRJQzogQVNULlNvdXJjZUxvY2F0aW9uID0ge1xuICBzb3VyY2U6ICcoc3ludGhldGljKScsXG4gIHN0YXJ0OiB7IGxpbmU6IDEsIGNvbHVtbjogMCB9LFxuICBlbmQ6IHsgbGluZTogMSwgY29sdW1uOiAwIH0sXG59O1xuXG5mdW5jdGlvbiBidWlsZExvYyhsb2M6IE9wdGlvbjxBU1QuU291cmNlTG9jYXRpb24+KTogQVNULlNvdXJjZUxvY2F0aW9uO1xuZnVuY3Rpb24gYnVpbGRMb2MoXG4gIHN0YXJ0TGluZTogbnVtYmVyLFxuICBzdGFydENvbHVtbjogbnVtYmVyLFxuICBlbmRMaW5lPzogbnVtYmVyLFxuICBlbmRDb2x1bW4/OiBudW1iZXIsXG4gIHNvdXJjZT86IHN0cmluZ1xuKTogQVNULlNvdXJjZUxvY2F0aW9uO1xuXG5mdW5jdGlvbiBidWlsZExvYyguLi5hcmdzOiBhbnlbXSk6IEFTVC5Tb3VyY2VMb2NhdGlvbiB7XG4gIGlmIChhcmdzLmxlbmd0aCA9PT0gMSkge1xuICAgIGxldCBsb2MgPSBhcmdzWzBdO1xuXG4gICAgaWYgKGxvYyAmJiB0eXBlb2YgbG9jID09PSAnb2JqZWN0Jykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc291cmNlOiBidWlsZFNvdXJjZShsb2Muc291cmNlKSxcbiAgICAgICAgc3RhcnQ6IGJ1aWxkUG9zaXRpb24obG9jLnN0YXJ0LmxpbmUsIGxvYy5zdGFydC5jb2x1bW4pLFxuICAgICAgICBlbmQ6IGJ1aWxkUG9zaXRpb24obG9jLmVuZC5saW5lLCBsb2MuZW5kLmNvbHVtbiksXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gU1lOVEhFVElDO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBsZXQgW3N0YXJ0TGluZSwgc3RhcnRDb2x1bW4sIGVuZExpbmUsIGVuZENvbHVtbiwgc291cmNlXSA9IGFyZ3M7XG4gICAgcmV0dXJuIHtcbiAgICAgIHNvdXJjZTogYnVpbGRTb3VyY2Uoc291cmNlKSxcbiAgICAgIHN0YXJ0OiBidWlsZFBvc2l0aW9uKHN0YXJ0TGluZSwgc3RhcnRDb2x1bW4pLFxuICAgICAgZW5kOiBidWlsZFBvc2l0aW9uKGVuZExpbmUsIGVuZENvbHVtbiksXG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCB7XG4gIG11c3RhY2hlOiBidWlsZE11c3RhY2hlLFxuICBibG9jazogYnVpbGRCbG9jayxcbiAgcGFydGlhbDogYnVpbGRQYXJ0aWFsLFxuICBjb21tZW50OiBidWlsZENvbW1lbnQsXG4gIG11c3RhY2hlQ29tbWVudDogYnVpbGRNdXN0YWNoZUNvbW1lbnQsXG4gIGVsZW1lbnQ6IGJ1aWxkRWxlbWVudCxcbiAgZWxlbWVudE1vZGlmaWVyOiBidWlsZEVsZW1lbnRNb2RpZmllcixcbiAgYXR0cjogYnVpbGRBdHRyLFxuICB0ZXh0OiBidWlsZFRleHQsXG4gIHNleHByOiBidWlsZFNleHByLFxuICBwYXRoOiBidWlsZEhlYWQsXG4gIGNvbmNhdDogYnVpbGRDb25jYXQsXG4gIGhhc2g6IGJ1aWxkSGFzaCxcbiAgcGFpcjogYnVpbGRQYWlyLFxuICBsaXRlcmFsOiBidWlsZExpdGVyYWwsXG4gIHByb2dyYW06IGJ1aWxkUHJvZ3JhbSxcbiAgYmxvY2tJdHNlbGY6IGJ1aWxkQmxvY2tJdHNlbGYsXG4gIHRlbXBsYXRlOiBidWlsZFRlbXBsYXRlLFxuICBsb2M6IGJ1aWxkTG9jLFxuICBwb3M6IGJ1aWxkUG9zaXRpb24sXG5cbiAgc3RyaW5nOiBsaXRlcmFsKCdTdHJpbmdMaXRlcmFsJykgYXMgKHZhbHVlOiBzdHJpbmcpID0+IFN0cmluZ0xpdGVyYWwsXG4gIGJvb2xlYW46IGxpdGVyYWwoJ0Jvb2xlYW5MaXRlcmFsJykgYXMgKHZhbHVlOiBib29sZWFuKSA9PiBCb29sZWFuTGl0ZXJhbCxcbiAgbnVtYmVyOiBsaXRlcmFsKCdOdW1iZXJMaXRlcmFsJykgYXMgKHZhbHVlOiBudW1iZXIpID0+IE51bWJlckxpdGVyYWwsXG4gIHVuZGVmaW5lZCgpIHtcbiAgICByZXR1cm4gYnVpbGRMaXRlcmFsKCdVbmRlZmluZWRMaXRlcmFsJywgdW5kZWZpbmVkKTtcbiAgfSxcbiAgbnVsbCgpIHtcbiAgICByZXR1cm4gYnVpbGRMaXRlcmFsKCdOdWxsTGl0ZXJhbCcsIG51bGwpO1xuICB9LFxufTtcblxudHlwZSBCdWlsZExpdGVyYWw8VCBleHRlbmRzIEFTVC5MaXRlcmFsPiA9ICh2YWx1ZTogVFsndmFsdWUnXSkgPT4gVDtcblxuZnVuY3Rpb24gbGl0ZXJhbDxUIGV4dGVuZHMgQVNULkxpdGVyYWw+KHR5cGU6IFRbJ3R5cGUnXSk6IEJ1aWxkTGl0ZXJhbDxUPiB7XG4gIHJldHVybiBmdW5jdGlvbiAodmFsdWU6IFRbJ3ZhbHVlJ10pOiBUIHtcbiAgICByZXR1cm4gYnVpbGRMaXRlcmFsKHR5cGUsIHZhbHVlKTtcbiAgfTtcbn1cbiIsImltcG9ydCAqIGFzIEFTVCBmcm9tICcuLi90eXBlcy9ub2Rlcyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3ludGF4RXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIGxvY2F0aW9uOiBBU1QuU291cmNlTG9jYXRpb247XG4gIGNvbnN0cnVjdG9yOiBTeW50YXhFcnJvckNvbnN0cnVjdG9yO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFN5bnRheEVycm9yQ29uc3RydWN0b3Ige1xuICBuZXcgKG1lc3NhZ2U6IHN0cmluZywgbG9jYXRpb246IEFTVC5Tb3VyY2VMb2NhdGlvbik6IFN5bnRheEVycm9yO1xuICByZWFkb25seSBwcm90b3R5cGU6IFN5bnRheEVycm9yO1xufVxuXG4vKipcbiAqIFN1YmNsYXNzIG9mIGBFcnJvcmAgd2l0aCBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4gKiBhYm91dCBsb2NhdGlvbiBvZiBpbmNvcnJlY3QgbWFya3VwLlxuICovXG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25hbWluZy1jb252ZW50aW9uXG5jb25zdCBTeW50YXhFcnJvcjogU3ludGF4RXJyb3JDb25zdHJ1Y3RvciA9IChmdW5jdGlvbiAoKSB7XG4gIFN5bnRheEVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKTtcbiAgU3ludGF4RXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU3ludGF4RXJyb3I7XG5cbiAgZnVuY3Rpb24gU3ludGF4RXJyb3IodGhpczogU3ludGF4RXJyb3IsIG1lc3NhZ2U6IHN0cmluZywgbG9jYXRpb246IEFTVC5Tb3VyY2VMb2NhdGlvbikge1xuICAgIGxldCBlcnJvciA9IEVycm9yLmNhbGwodGhpcywgbWVzc2FnZSk7XG5cbiAgICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xuICAgIHRoaXMuc3RhY2sgPSBlcnJvci5zdGFjaztcbiAgICB0aGlzLmxvY2F0aW9uID0gbG9jYXRpb247XG4gIH1cblxuICByZXR1cm4gU3ludGF4RXJyb3IgYXMgYW55O1xufSkoKTtcblxuZXhwb3J0IGRlZmF1bHQgU3ludGF4RXJyb3I7XG4iLCJpbXBvcnQgKiBhcyBBU1QgZnJvbSAnLi90eXBlcy9ub2Rlcyc7XG5pbXBvcnQgKiBhcyBIQlMgZnJvbSAnLi90eXBlcy9oYW5kbGViYXJzLWFzdCc7XG5pbXBvcnQgeyBPcHRpb24gfSBmcm9tICdAZ2xpbW1lci9pbnRlcmZhY2VzJztcbmltcG9ydCBTeW50YXhFcnJvciBmcm9tICcuL2Vycm9ycy9zeW50YXgtZXJyb3InO1xuXG4vLyBSZWdleCB0byB2YWxpZGF0ZSB0aGUgaWRlbnRpZmllciBmb3IgYmxvY2sgcGFyYW1ldGVycy5cbi8vIEJhc2VkIG9uIHRoZSBJRCB2YWxpZGF0aW9uIHJlZ2V4IGluIEhhbmRsZWJhcnMuXG5cbmxldCBJRF9JTlZFUlNFX1BBVFRFUk4gPSAvWyFcIiMlLSxcXC5cXC87LT5AXFxbLVxcXmBcXHstfl0vO1xuXG4vLyBDaGVja3MgdGhlIGVsZW1lbnQncyBhdHRyaWJ1dGVzIHRvIHNlZSBpZiBpdCB1c2VzIGJsb2NrIHBhcmFtcy5cbi8vIElmIGl0IGRvZXMsIHJlZ2lzdGVycyB0aGUgYmxvY2sgcGFyYW1zIHdpdGggdGhlIHByb2dyYW0gYW5kXG4vLyByZW1vdmVzIHRoZSBjb3JyZXNwb25kaW5nIGF0dHJpYnV0ZXMgZnJvbSB0aGUgZWxlbWVudC5cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlRWxlbWVudEJsb2NrUGFyYW1zKGVsZW1lbnQ6IEFTVC5FbGVtZW50Tm9kZSkge1xuICBsZXQgcGFyYW1zID0gcGFyc2VCbG9ja1BhcmFtcyhlbGVtZW50KTtcbiAgaWYgKHBhcmFtcykgZWxlbWVudC5ibG9ja1BhcmFtcyA9IHBhcmFtcztcbn1cblxuZnVuY3Rpb24gcGFyc2VCbG9ja1BhcmFtcyhlbGVtZW50OiBBU1QuRWxlbWVudE5vZGUpOiBPcHRpb248c3RyaW5nW10+IHtcbiAgbGV0IGwgPSBlbGVtZW50LmF0dHJpYnV0ZXMubGVuZ3RoO1xuICBsZXQgYXR0ck5hbWVzID0gW107XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBsOyBpKyspIHtcbiAgICBhdHRyTmFtZXMucHVzaChlbGVtZW50LmF0dHJpYnV0ZXNbaV0ubmFtZSk7XG4gIH1cblxuICBsZXQgYXNJbmRleCA9IGF0dHJOYW1lcy5pbmRleE9mKCdhcycpO1xuXG4gIGlmIChhc0luZGV4ICE9PSAtMSAmJiBsID4gYXNJbmRleCAmJiBhdHRyTmFtZXNbYXNJbmRleCArIDFdLmNoYXJBdCgwKSA9PT0gJ3wnKSB7XG4gICAgLy8gU29tZSBiYXNpYyB2YWxpZGF0aW9uLCBzaW5jZSB3ZSdyZSBkb2luZyB0aGUgcGFyc2luZyBvdXJzZWx2ZXNcbiAgICBsZXQgcGFyYW1zU3RyaW5nID0gYXR0ck5hbWVzLnNsaWNlKGFzSW5kZXgpLmpvaW4oJyAnKTtcbiAgICBpZiAoXG4gICAgICBwYXJhbXNTdHJpbmcuY2hhckF0KHBhcmFtc1N0cmluZy5sZW5ndGggLSAxKSAhPT0gJ3wnIHx8XG4gICAgICBwYXJhbXNTdHJpbmcubWF0Y2goL1xcfC9nKSEubGVuZ3RoICE9PSAyXG4gICAgKSB7XG4gICAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoXCJJbnZhbGlkIGJsb2NrIHBhcmFtZXRlcnMgc3ludGF4OiAnXCIgKyBwYXJhbXNTdHJpbmcgKyBcIidcIiwgZWxlbWVudC5sb2MpO1xuICAgIH1cblxuICAgIGxldCBwYXJhbXMgPSBbXTtcbiAgICBmb3IgKGxldCBpID0gYXNJbmRleCArIDE7IGkgPCBsOyBpKyspIHtcbiAgICAgIGxldCBwYXJhbSA9IGF0dHJOYW1lc1tpXS5yZXBsYWNlKC9cXHwvZywgJycpO1xuICAgICAgaWYgKHBhcmFtICE9PSAnJykge1xuICAgICAgICBpZiAoSURfSU5WRVJTRV9QQVRURVJOLnRlc3QocGFyYW0pKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFN5bnRheEVycm9yKFxuICAgICAgICAgICAgXCJJbnZhbGlkIGlkZW50aWZpZXIgZm9yIGJsb2NrIHBhcmFtZXRlcnM6ICdcIiArIHBhcmFtICsgXCInIGluICdcIiArIHBhcmFtc1N0cmluZyArIFwiJ1wiLFxuICAgICAgICAgICAgZWxlbWVudC5sb2NcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIHBhcmFtcy5wdXNoKHBhcmFtKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocGFyYW1zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IFN5bnRheEVycm9yKFxuICAgICAgICBcIkNhbm5vdCB1c2UgemVybyBibG9jayBwYXJhbWV0ZXJzOiAnXCIgKyBwYXJhbXNTdHJpbmcgKyBcIidcIixcbiAgICAgICAgZWxlbWVudC5sb2NcbiAgICAgICk7XG4gICAgfVxuXG4gICAgZWxlbWVudC5hdHRyaWJ1dGVzID0gZWxlbWVudC5hdHRyaWJ1dGVzLnNsaWNlKDAsIGFzSW5kZXgpO1xuICAgIHJldHVybiBwYXJhbXM7XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNoaWxkcmVuRm9yKFxuICBub2RlOiBBU1QuQmxvY2sgfCBBU1QuVGVtcGxhdGUgfCBBU1QuRWxlbWVudE5vZGVcbik6IEFTVC5Ub3BMZXZlbFN0YXRlbWVudFtdIHtcbiAgc3dpdGNoIChub2RlLnR5cGUpIHtcbiAgICBjYXNlICdCbG9jayc6XG4gICAgY2FzZSAnVGVtcGxhdGUnOlxuICAgICAgcmV0dXJuIG5vZGUuYm9keTtcbiAgICBjYXNlICdFbGVtZW50Tm9kZSc6XG4gICAgICByZXR1cm4gbm9kZS5jaGlsZHJlbjtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYXBwZW5kQ2hpbGQoXG4gIHBhcmVudDogQVNULkJsb2NrIHwgQVNULlRlbXBsYXRlIHwgQVNULkVsZW1lbnROb2RlLFxuICBub2RlOiBBU1QuU3RhdGVtZW50XG4pIHtcbiAgY2hpbGRyZW5Gb3IocGFyZW50KS5wdXNoKG5vZGUpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNMaXRlcmFsKHBhdGg6IEhCUy5FeHByZXNzaW9uKTogcGF0aCBpcyBIQlMuTGl0ZXJhbDtcbmV4cG9ydCBmdW5jdGlvbiBpc0xpdGVyYWwocGF0aDogQVNULkV4cHJlc3Npb24pOiBwYXRoIGlzIEFTVC5MaXRlcmFsO1xuZXhwb3J0IGZ1bmN0aW9uIGlzTGl0ZXJhbChcbiAgcGF0aDogSEJTLkV4cHJlc3Npb24gfCBBU1QuRXhwcmVzc2lvblxuKTogcGF0aCBpcyBIQlMuTGl0ZXJhbCB8IEFTVC5MaXRlcmFsIHtcbiAgcmV0dXJuIChcbiAgICBwYXRoLnR5cGUgPT09ICdTdHJpbmdMaXRlcmFsJyB8fFxuICAgIHBhdGgudHlwZSA9PT0gJ0Jvb2xlYW5MaXRlcmFsJyB8fFxuICAgIHBhdGgudHlwZSA9PT0gJ051bWJlckxpdGVyYWwnIHx8XG4gICAgcGF0aC50eXBlID09PSAnTnVsbExpdGVyYWwnIHx8XG4gICAgcGF0aC50eXBlID09PSAnVW5kZWZpbmVkTGl0ZXJhbCdcbiAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHByaW50TGl0ZXJhbChsaXRlcmFsOiBBU1QuTGl0ZXJhbCk6IHN0cmluZyB7XG4gIGlmIChsaXRlcmFsLnR5cGUgPT09ICdVbmRlZmluZWRMaXRlcmFsJykge1xuICAgIHJldHVybiAndW5kZWZpbmVkJztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkobGl0ZXJhbC52YWx1ZSk7XG4gIH1cbn1cbiIsImltcG9ydCB7XG4gIEV2ZW50ZWRUb2tlbml6ZXIsXG4gIEVudGl0eVBhcnNlcixcbiAgSFRNTDVOYW1lZENoYXJSZWZzIGFzIG5hbWVkQ2hhclJlZnMsXG59IGZyb20gJ3NpbXBsZS1odG1sLXRva2VuaXplcic7XG5pbXBvcnQgKiBhcyBBU1QgZnJvbSAnLi90eXBlcy9ub2Rlcyc7XG5pbXBvcnQgKiBhcyBIQlMgZnJvbSAnLi90eXBlcy9oYW5kbGViYXJzLWFzdCc7XG5pbXBvcnQgeyBPcHRpb24gfSBmcm9tICdAZ2xpbW1lci9pbnRlcmZhY2VzJztcbmltcG9ydCB7IGFzc2VydCwgZXhwZWN0IH0gZnJvbSAnQGdsaW1tZXIvdXRpbCc7XG5cbmV4cG9ydCB0eXBlIEVsZW1lbnQgPSBBU1QuVGVtcGxhdGUgfCBBU1QuQmxvY2sgfCBBU1QuRWxlbWVudE5vZGU7XG5cbmV4cG9ydCBpbnRlcmZhY2UgVGFnPFQgZXh0ZW5kcyAnU3RhcnRUYWcnIHwgJ0VuZFRhZyc+IHtcbiAgdHlwZTogVDtcbiAgbmFtZTogc3RyaW5nO1xuICBhdHRyaWJ1dGVzOiBhbnlbXTtcbiAgbW9kaWZpZXJzOiBhbnlbXTtcbiAgY29tbWVudHM6IGFueVtdO1xuICBzZWxmQ2xvc2luZzogYm9vbGVhbjtcbiAgbG9jOiBBU1QuU291cmNlTG9jYXRpb247XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXR0cmlidXRlIHtcbiAgbmFtZTogc3RyaW5nO1xuICBwYXJ0czogKEFTVC5NdXN0YWNoZVN0YXRlbWVudCB8IEFTVC5UZXh0Tm9kZSlbXTtcbiAgaXNRdW90ZWQ6IGJvb2xlYW47XG4gIGlzRHluYW1pYzogYm9vbGVhbjtcbiAgc3RhcnQ6IEFTVC5Qb3NpdGlvbjtcbiAgdmFsdWVTdGFydExpbmU6IG51bWJlcjtcbiAgdmFsdWVTdGFydENvbHVtbjogbnVtYmVyO1xufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgUGFyc2VyIHtcbiAgcHJvdGVjdGVkIGVsZW1lbnRTdGFjazogRWxlbWVudFtdID0gW107XG4gIHByaXZhdGUgc291cmNlOiBzdHJpbmdbXTtcbiAgcHVibGljIGN1cnJlbnRBdHRyaWJ1dGU6IE9wdGlvbjxBdHRyaWJ1dGU+ID0gbnVsbDtcbiAgcHVibGljIGN1cnJlbnROb2RlOiBPcHRpb248XG4gICAgQVNULkNvbW1lbnRTdGF0ZW1lbnQgfCBBU1QuVGV4dE5vZGUgfCBUYWc8J1N0YXJ0VGFnJyB8ICdFbmRUYWcnPlxuICA+ID0gbnVsbDtcbiAgcHVibGljIHRva2VuaXplcjogRXZlbnRlZFRva2VuaXplcjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBzb3VyY2U6IHN0cmluZyxcbiAgICBlbnRpdHlQYXJzZXIgPSBuZXcgRW50aXR5UGFyc2VyKG5hbWVkQ2hhclJlZnMpLFxuICAgIG1vZGU6ICdwcmVjb21waWxlJyB8ICdjb2RlbW9kJyA9ICdwcmVjb21waWxlJ1xuICApIHtcbiAgICB0aGlzLnNvdXJjZSA9IHNvdXJjZS5zcGxpdCgvKD86XFxyXFxuP3xcXG4pL2cpO1xuICAgIHRoaXMudG9rZW5pemVyID0gbmV3IEV2ZW50ZWRUb2tlbml6ZXIodGhpcywgZW50aXR5UGFyc2VyLCBtb2RlKTtcbiAgfVxuXG4gIGFic3RyYWN0IFByb2dyYW0obm9kZTogSEJTLlByb2dyYW0pOiBIQlMuT3V0cHV0PCdQcm9ncmFtJz47XG4gIGFic3RyYWN0IE11c3RhY2hlU3RhdGVtZW50KG5vZGU6IEhCUy5NdXN0YWNoZVN0YXRlbWVudCk6IEhCUy5PdXRwdXQ8J011c3RhY2hlU3RhdGVtZW50Jz47XG4gIGFic3RyYWN0IERlY29yYXRvcihub2RlOiBIQlMuRGVjb3JhdG9yKTogSEJTLk91dHB1dDwnRGVjb3JhdG9yJz47XG4gIGFic3RyYWN0IEJsb2NrU3RhdGVtZW50KG5vZGU6IEhCUy5CbG9ja1N0YXRlbWVudCk6IEhCUy5PdXRwdXQ8J0Jsb2NrU3RhdGVtZW50Jz47XG4gIGFic3RyYWN0IERlY29yYXRvckJsb2NrKG5vZGU6IEhCUy5EZWNvcmF0b3JCbG9jayk6IEhCUy5PdXRwdXQ8J0RlY29yYXRvckJsb2NrJz47XG4gIGFic3RyYWN0IFBhcnRpYWxTdGF0ZW1lbnQobm9kZTogSEJTLlBhcnRpYWxTdGF0ZW1lbnQpOiBIQlMuT3V0cHV0PCdQYXJ0aWFsU3RhdGVtZW50Jz47XG4gIGFic3RyYWN0IFBhcnRpYWxCbG9ja1N0YXRlbWVudChcbiAgICBub2RlOiBIQlMuUGFydGlhbEJsb2NrU3RhdGVtZW50XG4gICk6IEhCUy5PdXRwdXQ8J1BhcnRpYWxCbG9ja1N0YXRlbWVudCc+O1xuICBhYnN0cmFjdCBDb250ZW50U3RhdGVtZW50KG5vZGU6IEhCUy5Db250ZW50U3RhdGVtZW50KTogSEJTLk91dHB1dDwnQ29udGVudFN0YXRlbWVudCc+O1xuICBhYnN0cmFjdCBDb21tZW50U3RhdGVtZW50KG5vZGU6IEhCUy5Db21tZW50U3RhdGVtZW50KTogSEJTLk91dHB1dDwnQ29tbWVudFN0YXRlbWVudCc+O1xuICBhYnN0cmFjdCBTdWJFeHByZXNzaW9uKG5vZGU6IEhCUy5TdWJFeHByZXNzaW9uKTogSEJTLk91dHB1dDwnU3ViRXhwcmVzc2lvbic+O1xuICBhYnN0cmFjdCBQYXRoRXhwcmVzc2lvbihub2RlOiBIQlMuUGF0aEV4cHJlc3Npb24pOiBIQlMuT3V0cHV0PCdQYXRoRXhwcmVzc2lvbic+O1xuICBhYnN0cmFjdCBTdHJpbmdMaXRlcmFsKG5vZGU6IEhCUy5TdHJpbmdMaXRlcmFsKTogSEJTLk91dHB1dDwnU3RyaW5nTGl0ZXJhbCc+O1xuICBhYnN0cmFjdCBCb29sZWFuTGl0ZXJhbChub2RlOiBIQlMuQm9vbGVhbkxpdGVyYWwpOiBIQlMuT3V0cHV0PCdCb29sZWFuTGl0ZXJhbCc+O1xuICBhYnN0cmFjdCBOdW1iZXJMaXRlcmFsKG5vZGU6IEhCUy5OdW1iZXJMaXRlcmFsKTogSEJTLk91dHB1dDwnTnVtYmVyTGl0ZXJhbCc+O1xuICBhYnN0cmFjdCBVbmRlZmluZWRMaXRlcmFsKG5vZGU6IEhCUy5VbmRlZmluZWRMaXRlcmFsKTogSEJTLk91dHB1dDwnVW5kZWZpbmVkTGl0ZXJhbCc+O1xuICBhYnN0cmFjdCBOdWxsTGl0ZXJhbChub2RlOiBIQlMuTnVsbExpdGVyYWwpOiBIQlMuT3V0cHV0PCdOdWxsTGl0ZXJhbCc+O1xuXG4gIGFic3RyYWN0IHJlc2V0KCk6IHZvaWQ7XG4gIGFic3RyYWN0IGZpbmlzaERhdGEoKTogdm9pZDtcbiAgYWJzdHJhY3QgdGFnT3BlbigpOiB2b2lkO1xuICBhYnN0cmFjdCBiZWdpbkRhdGEoKTogdm9pZDtcbiAgYWJzdHJhY3QgYXBwZW5kVG9EYXRhKGNoYXI6IHN0cmluZyk6IHZvaWQ7XG4gIGFic3RyYWN0IGJlZ2luU3RhcnRUYWcoKTogdm9pZDtcbiAgYWJzdHJhY3QgYXBwZW5kVG9UYWdOYW1lKGNoYXI6IHN0cmluZyk6IHZvaWQ7XG4gIGFic3RyYWN0IGJlZ2luQXR0cmlidXRlKCk6IHZvaWQ7XG4gIGFic3RyYWN0IGFwcGVuZFRvQXR0cmlidXRlTmFtZShjaGFyOiBzdHJpbmcpOiB2b2lkO1xuICBhYnN0cmFjdCBiZWdpbkF0dHJpYnV0ZVZhbHVlKHF1b3RlZDogYm9vbGVhbik6IHZvaWQ7XG4gIGFic3RyYWN0IGFwcGVuZFRvQXR0cmlidXRlVmFsdWUoY2hhcjogc3RyaW5nKTogdm9pZDtcbiAgYWJzdHJhY3QgZmluaXNoQXR0cmlidXRlVmFsdWUoKTogdm9pZDtcbiAgYWJzdHJhY3QgbWFya1RhZ0FzU2VsZkNsb3NpbmcoKTogdm9pZDtcbiAgYWJzdHJhY3QgYmVnaW5FbmRUYWcoKTogdm9pZDtcbiAgYWJzdHJhY3QgZmluaXNoVGFnKCk6IHZvaWQ7XG4gIGFic3RyYWN0IGJlZ2luQ29tbWVudCgpOiB2b2lkO1xuICBhYnN0cmFjdCBhcHBlbmRUb0NvbW1lbnREYXRhKGNoYXI6IHN0cmluZyk6IHZvaWQ7XG4gIGFic3RyYWN0IGZpbmlzaENvbW1lbnQoKTogdm9pZDtcbiAgYWJzdHJhY3QgcmVwb3J0U3ludGF4RXJyb3IoZXJyb3I6IHN0cmluZyk6IHZvaWQ7XG5cbiAgZ2V0IGN1cnJlbnRBdHRyKCk6IEF0dHJpYnV0ZSB7XG4gICAgcmV0dXJuIGV4cGVjdCh0aGlzLmN1cnJlbnRBdHRyaWJ1dGUsICdleHBlY3RlZCBhdHRyaWJ1dGUnKTtcbiAgfVxuXG4gIGdldCBjdXJyZW50VGFnKCk6IFRhZzwnU3RhcnRUYWcnIHwgJ0VuZFRhZyc+IHtcbiAgICBsZXQgbm9kZSA9IHRoaXMuY3VycmVudE5vZGU7XG4gICAgYXNzZXJ0KG5vZGUgJiYgKG5vZGUudHlwZSA9PT0gJ1N0YXJ0VGFnJyB8fCBub2RlLnR5cGUgPT09ICdFbmRUYWcnKSwgJ2V4cGVjdGVkIHRhZycpO1xuICAgIHJldHVybiBub2RlIGFzIFRhZzwnU3RhcnRUYWcnIHwgJ0VuZFRhZyc+O1xuICB9XG5cbiAgZ2V0IGN1cnJlbnRTdGFydFRhZygpOiBUYWc8J1N0YXJ0VGFnJz4ge1xuICAgIGxldCBub2RlID0gdGhpcy5jdXJyZW50Tm9kZTtcbiAgICBhc3NlcnQobm9kZSAmJiBub2RlLnR5cGUgPT09ICdTdGFydFRhZycsICdleHBlY3RlZCBzdGFydCB0YWcnKTtcbiAgICByZXR1cm4gbm9kZSBhcyBUYWc8J1N0YXJ0VGFnJz47XG4gIH1cblxuICBnZXQgY3VycmVudEVuZFRhZygpOiBUYWc8J0VuZFRhZyc+IHtcbiAgICBsZXQgbm9kZSA9IHRoaXMuY3VycmVudE5vZGU7XG4gICAgYXNzZXJ0KG5vZGUgJiYgbm9kZS50eXBlID09PSAnRW5kVGFnJywgJ2V4cGVjdGVkIGVuZCB0YWcnKTtcbiAgICByZXR1cm4gbm9kZSBhcyBUYWc8J0VuZFRhZyc+O1xuICB9XG5cbiAgZ2V0IGN1cnJlbnRDb21tZW50KCk6IEFTVC5Db21tZW50U3RhdGVtZW50IHtcbiAgICBsZXQgbm9kZSA9IHRoaXMuY3VycmVudE5vZGU7XG4gICAgYXNzZXJ0KG5vZGUgJiYgbm9kZS50eXBlID09PSAnQ29tbWVudFN0YXRlbWVudCcsICdleHBlY3RlZCBhIGNvbW1lbnQnKTtcbiAgICByZXR1cm4gbm9kZSBhcyBBU1QuQ29tbWVudFN0YXRlbWVudDtcbiAgfVxuXG4gIGdldCBjdXJyZW50RGF0YSgpOiBBU1QuVGV4dE5vZGUge1xuICAgIGxldCBub2RlID0gdGhpcy5jdXJyZW50Tm9kZTtcbiAgICBhc3NlcnQobm9kZSAmJiBub2RlLnR5cGUgPT09ICdUZXh0Tm9kZScsICdleHBlY3RlZCBhIHRleHQgbm9kZScpO1xuICAgIHJldHVybiBub2RlIGFzIEFTVC5UZXh0Tm9kZTtcbiAgfVxuXG4gIGFjY2VwdFRlbXBsYXRlKG5vZGU6IEhCUy5Qcm9ncmFtKTogQVNULlRlbXBsYXRlIHtcbiAgICByZXR1cm4gKHRoaXMgYXMgYW55KVtub2RlLnR5cGVdKG5vZGUpIGFzIEFTVC5UZW1wbGF0ZTtcbiAgfVxuXG4gIGFjY2VwdE5vZGUobm9kZTogSEJTLlByb2dyYW0pOiBBU1QuQmxvY2sgfCBBU1QuVGVtcGxhdGU7XG4gIGFjY2VwdE5vZGU8VSBleHRlbmRzIEhCUy5Ob2RlIHwgQVNULk5vZGU+KG5vZGU6IEhCUy5Ob2RlKTogVTtcbiAgYWNjZXB0Tm9kZShub2RlOiBIQlMuTm9kZSk6IGFueSB7XG4gICAgcmV0dXJuICh0aGlzIGFzIGFueSlbbm9kZS50eXBlXShub2RlKTtcbiAgfVxuXG4gIGN1cnJlbnRFbGVtZW50KCk6IEVsZW1lbnQge1xuICAgIHJldHVybiB0aGlzLmVsZW1lbnRTdGFja1t0aGlzLmVsZW1lbnRTdGFjay5sZW5ndGggLSAxXTtcbiAgfVxuXG4gIHNvdXJjZUZvck5vZGUobm9kZTogSEJTLk5vZGUsIGVuZE5vZGU/OiB7IGxvYzogSEJTLlNvdXJjZUxvY2F0aW9uIH0pOiBzdHJpbmcge1xuICAgIGxldCBmaXJzdExpbmUgPSBub2RlLmxvYy5zdGFydC5saW5lIC0gMTtcbiAgICBsZXQgY3VycmVudExpbmUgPSBmaXJzdExpbmUgLSAxO1xuICAgIGxldCBmaXJzdENvbHVtbiA9IG5vZGUubG9jLnN0YXJ0LmNvbHVtbjtcbiAgICBsZXQgc3RyaW5nID0gW107XG4gICAgbGV0IGxpbmU7XG5cbiAgICBsZXQgbGFzdExpbmU6IG51bWJlcjtcbiAgICBsZXQgbGFzdENvbHVtbjogbnVtYmVyO1xuXG4gICAgaWYgKGVuZE5vZGUpIHtcbiAgICAgIGxhc3RMaW5lID0gZW5kTm9kZS5sb2MuZW5kLmxpbmUgLSAxO1xuICAgICAgbGFzdENvbHVtbiA9IGVuZE5vZGUubG9jLmVuZC5jb2x1bW47XG4gICAgfSBlbHNlIHtcbiAgICAgIGxhc3RMaW5lID0gbm9kZS5sb2MuZW5kLmxpbmUgLSAxO1xuICAgICAgbGFzdENvbHVtbiA9IG5vZGUubG9jLmVuZC5jb2x1bW47XG4gICAgfVxuXG4gICAgd2hpbGUgKGN1cnJlbnRMaW5lIDwgbGFzdExpbmUpIHtcbiAgICAgIGN1cnJlbnRMaW5lKys7XG4gICAgICBsaW5lID0gdGhpcy5zb3VyY2VbY3VycmVudExpbmVdO1xuXG4gICAgICBpZiAoY3VycmVudExpbmUgPT09IGZpcnN0TGluZSkge1xuICAgICAgICBpZiAoZmlyc3RMaW5lID09PSBsYXN0TGluZSkge1xuICAgICAgICAgIHN0cmluZy5wdXNoKGxpbmUuc2xpY2UoZmlyc3RDb2x1bW4sIGxhc3RDb2x1bW4pKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdHJpbmcucHVzaChsaW5lLnNsaWNlKGZpcnN0Q29sdW1uKSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoY3VycmVudExpbmUgPT09IGxhc3RMaW5lKSB7XG4gICAgICAgIHN0cmluZy5wdXNoKGxpbmUuc2xpY2UoMCwgbGFzdENvbHVtbikpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RyaW5nLnB1c2gobGluZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHN0cmluZy5qb2luKCdcXG4nKTtcbiAgfVxufVxuIiwiaW1wb3J0IGIgZnJvbSAnLi4vYnVpbGRlcnMnO1xuaW1wb3J0IHsgYXBwZW5kQ2hpbGQsIGlzTGl0ZXJhbCwgcHJpbnRMaXRlcmFsIH0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0ICogYXMgQVNUIGZyb20gJy4uL3R5cGVzL25vZGVzJztcbmltcG9ydCAqIGFzIEhCUyBmcm9tICcuLi90eXBlcy9oYW5kbGViYXJzLWFzdCc7XG5pbXBvcnQgeyBQYXJzZXIsIFRhZywgQXR0cmlidXRlIH0gZnJvbSAnLi4vcGFyc2VyJztcbmltcG9ydCBTeW50YXhFcnJvciBmcm9tICcuLi9lcnJvcnMvc3ludGF4LWVycm9yJztcbmltcG9ydCB7IE9wdGlvbiB9IGZyb20gJ0BnbGltbWVyL3V0aWwnO1xuaW1wb3J0IHsgUmVjYXN0IH0gZnJvbSAnQGdsaW1tZXIvaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBUb2tlbml6ZXJTdGF0ZSB9IGZyb20gJ3NpbXBsZS1odG1sLXRva2VuaXplcic7XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBIYW5kbGViYXJzTm9kZVZpc2l0b3JzIGV4dGVuZHMgUGFyc2VyIHtcbiAgYWJzdHJhY3QgYXBwZW5kVG9Db21tZW50RGF0YShzOiBzdHJpbmcpOiB2b2lkO1xuICBhYnN0cmFjdCBiZWdpbkF0dHJpYnV0ZVZhbHVlKHF1b3RlZDogYm9vbGVhbik6IHZvaWQ7XG4gIGFic3RyYWN0IGZpbmlzaEF0dHJpYnV0ZVZhbHVlKCk6IHZvaWQ7XG5cbiAgcHJpdmF0ZSBnZXQgaXNUb3BMZXZlbCgpIHtcbiAgICByZXR1cm4gdGhpcy5lbGVtZW50U3RhY2subGVuZ3RoID09PSAwO1xuICB9XG5cbiAgUHJvZ3JhbShwcm9ncmFtOiBIQlMuUHJvZ3JhbSk6IEFTVC5CbG9jaztcbiAgUHJvZ3JhbShwcm9ncmFtOiBIQlMuUHJvZ3JhbSk6IEFTVC5UZW1wbGF0ZTtcbiAgUHJvZ3JhbShwcm9ncmFtOiBIQlMuUHJvZ3JhbSk6IEFTVC5UZW1wbGF0ZSB8IEFTVC5CbG9jaztcbiAgUHJvZ3JhbShwcm9ncmFtOiBIQlMuUHJvZ3JhbSk6IEFTVC5CbG9jayB8IEFTVC5UZW1wbGF0ZSB7XG4gICAgbGV0IGJvZHk6IEFTVC5TdGF0ZW1lbnRbXSA9IFtdO1xuICAgIGxldCBub2RlO1xuXG4gICAgaWYgKHRoaXMuaXNUb3BMZXZlbCkge1xuICAgICAgbm9kZSA9IGIudGVtcGxhdGUoYm9keSwgcHJvZ3JhbS5ibG9ja1BhcmFtcywgcHJvZ3JhbS5sb2MpO1xuICAgIH0gZWxzZSB7XG4gICAgICBub2RlID0gYi5ibG9ja0l0c2VsZihib2R5LCBwcm9ncmFtLmJsb2NrUGFyYW1zLCBwcm9ncmFtLmNoYWluZWQsIHByb2dyYW0ubG9jKTtcbiAgICB9XG5cbiAgICBsZXQgaSxcbiAgICAgIGwgPSBwcm9ncmFtLmJvZHkubGVuZ3RoO1xuXG4gICAgdGhpcy5lbGVtZW50U3RhY2sucHVzaChub2RlKTtcblxuICAgIGlmIChsID09PSAwKSB7XG4gICAgICByZXR1cm4gdGhpcy5lbGVtZW50U3RhY2sucG9wKCkgYXMgQVNULkJsb2NrIHwgQVNULlRlbXBsYXRlO1xuICAgIH1cblxuICAgIGZvciAoaSA9IDA7IGkgPCBsOyBpKyspIHtcbiAgICAgIHRoaXMuYWNjZXB0Tm9kZShwcm9ncmFtLmJvZHlbaV0pO1xuICAgIH1cblxuICAgIC8vIEVuc3VyZSB0aGF0IHRoYXQgdGhlIGVsZW1lbnQgc3RhY2sgaXMgYmFsYW5jZWQgcHJvcGVybHkuXG4gICAgbGV0IHBvcHBlZE5vZGUgPSB0aGlzLmVsZW1lbnRTdGFjay5wb3AoKTtcbiAgICBpZiAocG9wcGVkTm9kZSAhPT0gbm9kZSkge1xuICAgICAgbGV0IGVsZW1lbnROb2RlID0gcG9wcGVkTm9kZSBhcyBBU1QuRWxlbWVudE5vZGU7XG5cbiAgICAgIHRocm93IG5ldyBTeW50YXhFcnJvcihcbiAgICAgICAgJ1VuY2xvc2VkIGVsZW1lbnQgYCcgKyBlbGVtZW50Tm9kZS50YWcgKyAnYCAob24gbGluZSAnICsgZWxlbWVudE5vZGUubG9jIS5zdGFydC5saW5lICsgJykuJyxcbiAgICAgICAgZWxlbWVudE5vZGUubG9jXG4gICAgICApO1xuICAgIH1cblxuICAgIHJldHVybiBub2RlO1xuICB9XG5cbiAgQmxvY2tTdGF0ZW1lbnQoYmxvY2s6IEhCUy5CbG9ja1N0YXRlbWVudCk6IEFTVC5CbG9ja1N0YXRlbWVudCB8IHZvaWQge1xuICAgIGlmICh0aGlzLnRva2VuaXplci5zdGF0ZSA9PT0gVG9rZW5pemVyU3RhdGUuY29tbWVudCkge1xuICAgICAgdGhpcy5hcHBlbmRUb0NvbW1lbnREYXRhKHRoaXMuc291cmNlRm9yTm9kZShibG9jaykpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChcbiAgICAgIHRoaXMudG9rZW5pemVyLnN0YXRlICE9PSBUb2tlbml6ZXJTdGF0ZS5kYXRhICYmXG4gICAgICB0aGlzLnRva2VuaXplclsnc3RhdGUnXSAhPT0gVG9rZW5pemVyU3RhdGUuYmVmb3JlRGF0YVxuICAgICkge1xuICAgICAgdGhyb3cgbmV3IFN5bnRheEVycm9yKFxuICAgICAgICAnQSBibG9jayBtYXkgb25seSBiZSB1c2VkIGluc2lkZSBhbiBIVE1MIGVsZW1lbnQgb3IgYW5vdGhlciBibG9jay4nLFxuICAgICAgICBibG9jay5sb2NcbiAgICAgICk7XG4gICAgfVxuXG4gICAgbGV0IHsgcGF0aCwgcGFyYW1zLCBoYXNoIH0gPSBhY2NlcHRDYWxsTm9kZXModGhpcywgYmxvY2spO1xuICAgIGxldCBwcm9ncmFtID0gdGhpcy5Qcm9ncmFtKGJsb2NrLnByb2dyYW0pO1xuICAgIGxldCBpbnZlcnNlID0gYmxvY2suaW52ZXJzZSA/IHRoaXMuUHJvZ3JhbShibG9jay5pbnZlcnNlKSA6IG51bGw7XG5cbiAgICBsZXQgbm9kZSA9IGIuYmxvY2soXG4gICAgICBwYXRoLFxuICAgICAgcGFyYW1zLFxuICAgICAgaGFzaCxcbiAgICAgIHByb2dyYW0sXG4gICAgICBpbnZlcnNlLFxuICAgICAgYmxvY2subG9jLFxuICAgICAgYmxvY2sub3BlblN0cmlwLFxuICAgICAgYmxvY2suaW52ZXJzZVN0cmlwLFxuICAgICAgYmxvY2suY2xvc2VTdHJpcFxuICAgICk7XG5cbiAgICBsZXQgcGFyZW50UHJvZ3JhbSA9IHRoaXMuY3VycmVudEVsZW1lbnQoKTtcblxuICAgIGFwcGVuZENoaWxkKHBhcmVudFByb2dyYW0sIG5vZGUpO1xuICB9XG5cbiAgTXVzdGFjaGVTdGF0ZW1lbnQocmF3TXVzdGFjaGU6IEhCUy5NdXN0YWNoZVN0YXRlbWVudCk6IEFTVC5NdXN0YWNoZVN0YXRlbWVudCB8IHZvaWQge1xuICAgIGxldCB7IHRva2VuaXplciB9ID0gdGhpcztcblxuICAgIGlmICh0b2tlbml6ZXIuc3RhdGUgPT09ICdjb21tZW50Jykge1xuICAgICAgdGhpcy5hcHBlbmRUb0NvbW1lbnREYXRhKHRoaXMuc291cmNlRm9yTm9kZShyYXdNdXN0YWNoZSkpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxldCBtdXN0YWNoZTogQVNULk11c3RhY2hlU3RhdGVtZW50O1xuICAgIGxldCB7IGVzY2FwZWQsIGxvYywgc3RyaXAgfSA9IHJhd011c3RhY2hlO1xuXG4gICAgaWYgKGlzTGl0ZXJhbChyYXdNdXN0YWNoZS5wYXRoKSkge1xuICAgICAgbXVzdGFjaGUgPSB7XG4gICAgICAgIHR5cGU6ICdNdXN0YWNoZVN0YXRlbWVudCcsXG4gICAgICAgIHBhdGg6IHRoaXMuYWNjZXB0Tm9kZTxBU1QuTGl0ZXJhbD4ocmF3TXVzdGFjaGUucGF0aCksXG4gICAgICAgIHBhcmFtczogW10sXG4gICAgICAgIGhhc2g6IGIuaGFzaCgpLFxuICAgICAgICBlc2NhcGVkLFxuICAgICAgICBsb2MsXG4gICAgICAgIHN0cmlwLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IHsgcGF0aCwgcGFyYW1zLCBoYXNoIH0gPSBhY2NlcHRDYWxsTm9kZXMoXG4gICAgICAgIHRoaXMsXG4gICAgICAgIHJhd011c3RhY2hlIGFzIEhCUy5NdXN0YWNoZVN0YXRlbWVudCAmIHtcbiAgICAgICAgICBwYXRoOiBIQlMuUGF0aEV4cHJlc3Npb247XG4gICAgICAgIH1cbiAgICAgICk7XG4gICAgICBtdXN0YWNoZSA9IGIubXVzdGFjaGUocGF0aCwgcGFyYW1zLCBoYXNoLCAhZXNjYXBlZCwgbG9jLCBzdHJpcCk7XG4gICAgfVxuXG4gICAgc3dpdGNoICh0b2tlbml6ZXIuc3RhdGUpIHtcbiAgICAgIC8vIFRhZyBoZWxwZXJzXG4gICAgICBjYXNlIFRva2VuaXplclN0YXRlLnRhZ09wZW46XG4gICAgICBjYXNlIFRva2VuaXplclN0YXRlLnRhZ05hbWU6XG4gICAgICAgIHRocm93IG5ldyBTeW50YXhFcnJvcihcbiAgICAgICAgICBgQ2Fubm90IHVzZSBtdXN0YWNoZXMgaW4gYW4gZWxlbWVudHMgdGFnbmFtZTogXFxgJHt0aGlzLnNvdXJjZUZvck5vZGUoXG4gICAgICAgICAgICByYXdNdXN0YWNoZSxcbiAgICAgICAgICAgIHJhd011c3RhY2hlLnBhdGhcbiAgICAgICAgICApfVxcYCBhdCBMJHtsb2Muc3RhcnQubGluZX06QyR7bG9jLnN0YXJ0LmNvbHVtbn1gLFxuICAgICAgICAgIG11c3RhY2hlLmxvY1xuICAgICAgICApO1xuXG4gICAgICBjYXNlIFRva2VuaXplclN0YXRlLmJlZm9yZUF0dHJpYnV0ZU5hbWU6XG4gICAgICAgIGFkZEVsZW1lbnRNb2RpZmllcih0aGlzLmN1cnJlbnRTdGFydFRhZywgbXVzdGFjaGUpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgVG9rZW5pemVyU3RhdGUuYXR0cmlidXRlTmFtZTpcbiAgICAgIGNhc2UgVG9rZW5pemVyU3RhdGUuYWZ0ZXJBdHRyaWJ1dGVOYW1lOlxuICAgICAgICB0aGlzLmJlZ2luQXR0cmlidXRlVmFsdWUoZmFsc2UpO1xuICAgICAgICB0aGlzLmZpbmlzaEF0dHJpYnV0ZVZhbHVlKCk7XG4gICAgICAgIGFkZEVsZW1lbnRNb2RpZmllcih0aGlzLmN1cnJlbnRTdGFydFRhZywgbXVzdGFjaGUpO1xuICAgICAgICB0b2tlbml6ZXIudHJhbnNpdGlvblRvKFRva2VuaXplclN0YXRlLmJlZm9yZUF0dHJpYnV0ZU5hbWUpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgVG9rZW5pemVyU3RhdGUuYWZ0ZXJBdHRyaWJ1dGVWYWx1ZVF1b3RlZDpcbiAgICAgICAgYWRkRWxlbWVudE1vZGlmaWVyKHRoaXMuY3VycmVudFN0YXJ0VGFnLCBtdXN0YWNoZSk7XG4gICAgICAgIHRva2VuaXplci50cmFuc2l0aW9uVG8oVG9rZW5pemVyU3RhdGUuYmVmb3JlQXR0cmlidXRlTmFtZSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICAvLyBBdHRyaWJ1dGUgdmFsdWVzXG4gICAgICBjYXNlIFRva2VuaXplclN0YXRlLmJlZm9yZUF0dHJpYnV0ZVZhbHVlOlxuICAgICAgICB0aGlzLmJlZ2luQXR0cmlidXRlVmFsdWUoZmFsc2UpO1xuICAgICAgICBhcHBlbmREeW5hbWljQXR0cmlidXRlVmFsdWVQYXJ0KHRoaXMuY3VycmVudEF0dHJpYnV0ZSEsIG11c3RhY2hlKTtcbiAgICAgICAgdG9rZW5pemVyLnRyYW5zaXRpb25UbyhUb2tlbml6ZXJTdGF0ZS5hdHRyaWJ1dGVWYWx1ZVVucXVvdGVkKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFRva2VuaXplclN0YXRlLmF0dHJpYnV0ZVZhbHVlRG91YmxlUXVvdGVkOlxuICAgICAgY2FzZSBUb2tlbml6ZXJTdGF0ZS5hdHRyaWJ1dGVWYWx1ZVNpbmdsZVF1b3RlZDpcbiAgICAgIGNhc2UgVG9rZW5pemVyU3RhdGUuYXR0cmlidXRlVmFsdWVVbnF1b3RlZDpcbiAgICAgICAgYXBwZW5kRHluYW1pY0F0dHJpYnV0ZVZhbHVlUGFydCh0aGlzLmN1cnJlbnRBdHRyaWJ1dGUhLCBtdXN0YWNoZSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICAvLyBUT0RPOiBPbmx5IGFwcGVuZCBjaGlsZCB3aGVuIHRoZSB0b2tlbml6ZXIgc3RhdGUgbWFrZXNcbiAgICAgIC8vIHNlbnNlIHRvIGRvIHNvLCBvdGhlcndpc2UgdGhyb3cgYW4gZXJyb3IuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBhcHBlbmRDaGlsZCh0aGlzLmN1cnJlbnRFbGVtZW50KCksIG11c3RhY2hlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbXVzdGFjaGU7XG4gIH1cblxuICBDb250ZW50U3RhdGVtZW50KGNvbnRlbnQ6IEhCUy5Db250ZW50U3RhdGVtZW50KTogdm9pZCB7XG4gICAgdXBkYXRlVG9rZW5pemVyTG9jYXRpb24odGhpcy50b2tlbml6ZXIsIGNvbnRlbnQpO1xuXG4gICAgdGhpcy50b2tlbml6ZXIudG9rZW5pemVQYXJ0KGNvbnRlbnQudmFsdWUpO1xuICAgIHRoaXMudG9rZW5pemVyLmZsdXNoRGF0YSgpO1xuICB9XG5cbiAgQ29tbWVudFN0YXRlbWVudChyYXdDb21tZW50OiBIQlMuQ29tbWVudFN0YXRlbWVudCk6IE9wdGlvbjxBU1QuTXVzdGFjaGVDb21tZW50U3RhdGVtZW50PiB7XG4gICAgbGV0IHsgdG9rZW5pemVyIH0gPSB0aGlzO1xuXG4gICAgaWYgKHRva2VuaXplci5zdGF0ZSA9PT0gVG9rZW5pemVyU3RhdGUuY29tbWVudCkge1xuICAgICAgdGhpcy5hcHBlbmRUb0NvbW1lbnREYXRhKHRoaXMuc291cmNlRm9yTm9kZShyYXdDb21tZW50KSk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBsZXQgeyB2YWx1ZSwgbG9jIH0gPSByYXdDb21tZW50O1xuICAgIGxldCBjb21tZW50ID0gYi5tdXN0YWNoZUNvbW1lbnQodmFsdWUsIGxvYyk7XG5cbiAgICBzd2l0Y2ggKHRva2VuaXplci5zdGF0ZSkge1xuICAgICAgY2FzZSBUb2tlbml6ZXJTdGF0ZS5iZWZvcmVBdHRyaWJ1dGVOYW1lOlxuICAgICAgY2FzZSBUb2tlbml6ZXJTdGF0ZS5hZnRlckF0dHJpYnV0ZU5hbWU6XG4gICAgICAgIHRoaXMuY3VycmVudFN0YXJ0VGFnLmNvbW1lbnRzLnB1c2goY29tbWVudCk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIFRva2VuaXplclN0YXRlLmJlZm9yZURhdGE6XG4gICAgICBjYXNlIFRva2VuaXplclN0YXRlLmRhdGE6XG4gICAgICAgIGFwcGVuZENoaWxkKHRoaXMuY3VycmVudEVsZW1lbnQoKSwgY29tbWVudCk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoXG4gICAgICAgICAgYFVzaW5nIGEgSGFuZGxlYmFycyBjb21tZW50IHdoZW4gaW4gdGhlIFxcYCR7dG9rZW5pemVyWydzdGF0ZSddfVxcYCBzdGF0ZSBpcyBub3Qgc3VwcG9ydGVkOiBcIiR7Y29tbWVudC52YWx1ZX1cIiBvbiBsaW5lICR7bG9jLnN0YXJ0LmxpbmV9OiR7bG9jLnN0YXJ0LmNvbHVtbn1gLFxuICAgICAgICAgIHJhd0NvbW1lbnQubG9jXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNvbW1lbnQ7XG4gIH1cblxuICBQYXJ0aWFsU3RhdGVtZW50KHBhcnRpYWw6IEhCUy5QYXJ0aWFsU3RhdGVtZW50KTogbmV2ZXIge1xuICAgIGxldCB7IGxvYyB9ID0gcGFydGlhbDtcblxuICAgIHRocm93IG5ldyBTeW50YXhFcnJvcihcbiAgICAgIGBIYW5kbGViYXJzIHBhcnRpYWxzIGFyZSBub3Qgc3VwcG9ydGVkOiBcIiR7dGhpcy5zb3VyY2VGb3JOb2RlKHBhcnRpYWwsIHBhcnRpYWwubmFtZSl9XCIgYXQgTCR7XG4gICAgICAgIGxvYy5zdGFydC5saW5lXG4gICAgICB9OkMke2xvYy5zdGFydC5jb2x1bW59YCxcbiAgICAgIHBhcnRpYWwubG9jXG4gICAgKTtcbiAgfVxuXG4gIFBhcnRpYWxCbG9ja1N0YXRlbWVudChwYXJ0aWFsQmxvY2s6IEhCUy5QYXJ0aWFsQmxvY2tTdGF0ZW1lbnQpOiBuZXZlciB7XG4gICAgbGV0IHsgbG9jIH0gPSBwYXJ0aWFsQmxvY2s7XG5cbiAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoXG4gICAgICBgSGFuZGxlYmFycyBwYXJ0aWFsIGJsb2NrcyBhcmUgbm90IHN1cHBvcnRlZDogXCIke3RoaXMuc291cmNlRm9yTm9kZShcbiAgICAgICAgcGFydGlhbEJsb2NrLFxuICAgICAgICBwYXJ0aWFsQmxvY2submFtZVxuICAgICAgKX1cIiBhdCBMJHtsb2Muc3RhcnQubGluZX06QyR7bG9jLnN0YXJ0LmNvbHVtbn1gLFxuICAgICAgcGFydGlhbEJsb2NrLmxvY1xuICAgICk7XG4gIH1cblxuICBEZWNvcmF0b3IoZGVjb3JhdG9yOiBIQlMuRGVjb3JhdG9yKTogbmV2ZXIge1xuICAgIGxldCB7IGxvYyB9ID0gZGVjb3JhdG9yO1xuXG4gICAgdGhyb3cgbmV3IFN5bnRheEVycm9yKFxuICAgICAgYEhhbmRsZWJhcnMgZGVjb3JhdG9ycyBhcmUgbm90IHN1cHBvcnRlZDogXCIke3RoaXMuc291cmNlRm9yTm9kZShcbiAgICAgICAgZGVjb3JhdG9yLFxuICAgICAgICBkZWNvcmF0b3IucGF0aFxuICAgICAgKX1cIiBhdCBMJHtsb2Muc3RhcnQubGluZX06QyR7bG9jLnN0YXJ0LmNvbHVtbn1gLFxuICAgICAgZGVjb3JhdG9yLmxvY1xuICAgICk7XG4gIH1cblxuICBEZWNvcmF0b3JCbG9jayhkZWNvcmF0b3JCbG9jazogSEJTLkRlY29yYXRvckJsb2NrKTogbmV2ZXIge1xuICAgIGxldCB7IGxvYyB9ID0gZGVjb3JhdG9yQmxvY2s7XG5cbiAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoXG4gICAgICBgSGFuZGxlYmFycyBkZWNvcmF0b3IgYmxvY2tzIGFyZSBub3Qgc3VwcG9ydGVkOiBcIiR7dGhpcy5zb3VyY2VGb3JOb2RlKFxuICAgICAgICBkZWNvcmF0b3JCbG9jayxcbiAgICAgICAgZGVjb3JhdG9yQmxvY2sucGF0aFxuICAgICAgKX1cIiBhdCBMJHtsb2Muc3RhcnQubGluZX06QyR7bG9jLnN0YXJ0LmNvbHVtbn1gLFxuICAgICAgZGVjb3JhdG9yQmxvY2subG9jXG4gICAgKTtcbiAgfVxuXG4gIFN1YkV4cHJlc3Npb24oc2V4cHI6IEhCUy5TdWJFeHByZXNzaW9uKTogQVNULlN1YkV4cHJlc3Npb24ge1xuICAgIGxldCB7IHBhdGgsIHBhcmFtcywgaGFzaCB9ID0gYWNjZXB0Q2FsbE5vZGVzKHRoaXMsIHNleHByKTtcbiAgICByZXR1cm4gYi5zZXhwcihwYXRoLCBwYXJhbXMsIGhhc2gsIHNleHByLmxvYyk7XG4gIH1cblxuICBQYXRoRXhwcmVzc2lvbihwYXRoOiBIQlMuUGF0aEV4cHJlc3Npb24pOiBBU1QuUGF0aEV4cHJlc3Npb24ge1xuICAgIGxldCB7IG9yaWdpbmFsLCBsb2MgfSA9IHBhdGg7XG4gICAgbGV0IHBhcnRzOiBzdHJpbmdbXTtcblxuICAgIGlmIChvcmlnaW5hbC5pbmRleE9mKCcvJykgIT09IC0xKSB7XG4gICAgICBpZiAob3JpZ2luYWwuc2xpY2UoMCwgMikgPT09ICcuLycpIHtcbiAgICAgICAgdGhyb3cgbmV3IFN5bnRheEVycm9yKFxuICAgICAgICAgIGBVc2luZyBcIi4vXCIgaXMgbm90IHN1cHBvcnRlZCBpbiBHbGltbWVyIGFuZCB1bm5lY2Vzc2FyeTogXCIke3BhdGgub3JpZ2luYWx9XCIgb24gbGluZSAke2xvYy5zdGFydC5saW5lfS5gLFxuICAgICAgICAgIHBhdGgubG9jXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICBpZiAob3JpZ2luYWwuc2xpY2UoMCwgMykgPT09ICcuLi8nKSB7XG4gICAgICAgIHRocm93IG5ldyBTeW50YXhFcnJvcihcbiAgICAgICAgICBgQ2hhbmdpbmcgY29udGV4dCB1c2luZyBcIi4uL1wiIGlzIG5vdCBzdXBwb3J0ZWQgaW4gR2xpbW1lcjogXCIke3BhdGgub3JpZ2luYWx9XCIgb24gbGluZSAke2xvYy5zdGFydC5saW5lfS5gLFxuICAgICAgICAgIHBhdGgubG9jXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICBpZiAob3JpZ2luYWwuaW5kZXhPZignLicpICE9PSAtMSkge1xuICAgICAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoXG4gICAgICAgICAgYE1peGluZyAnLicgYW5kICcvJyBpbiBwYXRocyBpcyBub3Qgc3VwcG9ydGVkIGluIEdsaW1tZXI7IHVzZSBvbmx5ICcuJyB0byBzZXBhcmF0ZSBwcm9wZXJ0eSBwYXRoczogXCIke3BhdGgub3JpZ2luYWx9XCIgb24gbGluZSAke2xvYy5zdGFydC5saW5lfS5gLFxuICAgICAgICAgIHBhdGgubG9jXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICBwYXJ0cyA9IFtwYXRoLnBhcnRzLmpvaW4oJy8nKV07XG4gICAgfSBlbHNlIGlmIChvcmlnaW5hbCA9PT0gJy4nKSB7XG4gICAgICBsZXQgbG9jYXRpb25JbmZvID0gYEwke2xvYy5zdGFydC5saW5lfTpDJHtsb2Muc3RhcnQuY29sdW1ufWA7XG4gICAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoXG4gICAgICAgIGAnLicgaXMgbm90IGEgc3VwcG9ydGVkIHBhdGggaW4gR2xpbW1lcjsgY2hlY2sgZm9yIGEgcGF0aCB3aXRoIGEgdHJhaWxpbmcgJy4nIGF0ICR7bG9jYXRpb25JbmZvfS5gLFxuICAgICAgICBwYXRoLmxvY1xuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGFydHMgPSBwYXRoLnBhcnRzO1xuICAgIH1cblxuICAgIGxldCB0aGlzSGVhZCA9IGZhbHNlO1xuXG4gICAgLy8gVGhpcyBpcyB0byBmaXggYSBidWcgaW4gdGhlIEhhbmRsZWJhcnMgQVNUIHdoZXJlIHRoZSBwYXRoIGV4cHJlc3Npb25zIGluXG4gICAgLy8gYHt7dGhpcy5mb299fWAgKGFuZCBzaW1pbGFybHkgYHt7Zm9vLWJhciB0aGlzLmZvbyBuYW1lZD10aGlzLmZvb319YCBldGMpXG4gICAgLy8gYXJlIHNpbXBseSB0dXJuZWQgaW50byBge3tmb299fWAuIFRoZSBmaXggaXMgdG8gcHVzaCBpdCBiYWNrIG9udG8gdGhlXG4gICAgLy8gcGFydHMgYXJyYXkgYW5kIGxldCB0aGUgcnVudGltZSBzZWUgdGhlIGRpZmZlcmVuY2UuIEhvd2V2ZXIsIHdlIGNhbm5vdFxuICAgIC8vIHNpbXBseSB1c2UgdGhlIHN0cmluZyBgdGhpc2AgYXMgaXQgbWVhbnMgbGl0ZXJhbGx5IHRoZSBwcm9wZXJ0eSBjYWxsZWRcbiAgICAvLyBcInRoaXNcIiBpbiB0aGUgY3VycmVudCBjb250ZXh0IChpdCBjYW4gYmUgZXhwcmVzc2VkIGluIHRoZSBzeW50YXggYXNcbiAgICAvLyBge3tbdGhpc119fWAsIHdoZXJlIHRoZSBzcXVhcmUgYnJhY2tldCBhcmUgZ2VuZXJhbGx5IGZvciB0aGlzIGtpbmQgb2ZcbiAgICAvLyBlc2NhcGluZyDigJMgc3VjaCBhcyBge3tmb28uW1wiYmFyLmJhelwiXX19YCB3b3VsZCBtZWFuIGxvb2t1cCBhIHByb3BlcnR5XG4gICAgLy8gbmFtZWQgbGl0ZXJhbGx5IFwiYmFyLmJhelwiIG9uIGB0aGlzLmZvb2ApLiBCeSBjb252ZW50aW9uLCB3ZSB1c2UgYG51bGxgXG4gICAgLy8gZm9yIHRoaXMgcHVycG9zZS5cbiAgICBpZiAob3JpZ2luYWwubWF0Y2goL150aGlzKFxcLi4rKT8kLykpIHtcbiAgICAgIHRoaXNIZWFkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgdHlwZTogJ1BhdGhFeHByZXNzaW9uJyxcbiAgICAgIG9yaWdpbmFsOiBwYXRoLm9yaWdpbmFsLFxuICAgICAgdGhpczogdGhpc0hlYWQsXG4gICAgICBwYXJ0cyxcbiAgICAgIGRhdGE6IHBhdGguZGF0YSxcbiAgICAgIGxvYzogcGF0aC5sb2MsXG4gICAgfTtcbiAgfVxuXG4gIEhhc2goaGFzaDogSEJTLkhhc2gpOiBBU1QuSGFzaCB7XG4gICAgbGV0IHBhaXJzOiBBU1QuSGFzaFBhaXJbXSA9IFtdO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBoYXNoLnBhaXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBsZXQgcGFpciA9IGhhc2gucGFpcnNbaV07XG4gICAgICBwYWlycy5wdXNoKGIucGFpcihwYWlyLmtleSwgdGhpcy5hY2NlcHROb2RlKHBhaXIudmFsdWUpLCBwYWlyLmxvYykpO1xuICAgIH1cblxuICAgIHJldHVybiBiLmhhc2gocGFpcnMsIGhhc2gubG9jKTtcbiAgfVxuXG4gIFN0cmluZ0xpdGVyYWwoc3RyaW5nOiBIQlMuU3RyaW5nTGl0ZXJhbCk6IEFTVC5TdHJpbmdMaXRlcmFsIHtcbiAgICByZXR1cm4gYi5saXRlcmFsKCdTdHJpbmdMaXRlcmFsJywgc3RyaW5nLnZhbHVlLCBzdHJpbmcubG9jKTtcbiAgfVxuXG4gIEJvb2xlYW5MaXRlcmFsKGJvb2xlYW46IEhCUy5Cb29sZWFuTGl0ZXJhbCk6IEFTVC5Cb29sZWFuTGl0ZXJhbCB7XG4gICAgcmV0dXJuIGIubGl0ZXJhbCgnQm9vbGVhbkxpdGVyYWwnLCBib29sZWFuLnZhbHVlLCBib29sZWFuLmxvYyk7XG4gIH1cblxuICBOdW1iZXJMaXRlcmFsKG51bWJlcjogSEJTLk51bWJlckxpdGVyYWwpOiBBU1QuTnVtYmVyTGl0ZXJhbCB7XG4gICAgcmV0dXJuIGIubGl0ZXJhbCgnTnVtYmVyTGl0ZXJhbCcsIG51bWJlci52YWx1ZSwgbnVtYmVyLmxvYyk7XG4gIH1cblxuICBVbmRlZmluZWRMaXRlcmFsKHVuZGVmOiBIQlMuVW5kZWZpbmVkTGl0ZXJhbCk6IEFTVC5VbmRlZmluZWRMaXRlcmFsIHtcbiAgICByZXR1cm4gYi5saXRlcmFsKCdVbmRlZmluZWRMaXRlcmFsJywgdW5kZWZpbmVkLCB1bmRlZi5sb2MpO1xuICB9XG5cbiAgTnVsbExpdGVyYWwobnVsOiBIQlMuTnVsbExpdGVyYWwpOiBBU1QuTnVsbExpdGVyYWwge1xuICAgIHJldHVybiBiLmxpdGVyYWwoJ051bGxMaXRlcmFsJywgbnVsbCwgbnVsLmxvYyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gY2FsY3VsYXRlUmlnaHRTdHJpcHBlZE9mZnNldHMob3JpZ2luYWw6IHN0cmluZywgdmFsdWU6IHN0cmluZykge1xuICBpZiAodmFsdWUgPT09ICcnKSB7XG4gICAgLy8gaWYgaXQgaXMgZW1wdHksIGp1c3QgcmV0dXJuIHRoZSBjb3VudCBvZiBuZXdsaW5lc1xuICAgIC8vIGluIG9yaWdpbmFsXG4gICAgcmV0dXJuIHtcbiAgICAgIGxpbmVzOiBvcmlnaW5hbC5zcGxpdCgnXFxuJykubGVuZ3RoIC0gMSxcbiAgICAgIGNvbHVtbnM6IDAsXG4gICAgfTtcbiAgfVxuXG4gIC8vIG90aGVyd2lzZSwgcmV0dXJuIHRoZSBudW1iZXIgb2YgbmV3bGluZXMgcHJpb3IgdG9cbiAgLy8gYHZhbHVlYFxuICBsZXQgZGlmZmVyZW5jZSA9IG9yaWdpbmFsLnNwbGl0KHZhbHVlKVswXTtcbiAgbGV0IGxpbmVzID0gZGlmZmVyZW5jZS5zcGxpdCgvXFxuLyk7XG4gIGxldCBsaW5lQ291bnQgPSBsaW5lcy5sZW5ndGggLSAxO1xuXG4gIHJldHVybiB7XG4gICAgbGluZXM6IGxpbmVDb3VudCxcbiAgICBjb2x1bW5zOiBsaW5lc1tsaW5lQ291bnRdLmxlbmd0aCxcbiAgfTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlVG9rZW5pemVyTG9jYXRpb24odG9rZW5pemVyOiBQYXJzZXJbJ3Rva2VuaXplciddLCBjb250ZW50OiBIQlMuQ29udGVudFN0YXRlbWVudCkge1xuICBsZXQgbGluZSA9IGNvbnRlbnQubG9jLnN0YXJ0LmxpbmU7XG4gIGxldCBjb2x1bW4gPSBjb250ZW50LmxvYy5zdGFydC5jb2x1bW47XG5cbiAgbGV0IG9mZnNldHMgPSBjYWxjdWxhdGVSaWdodFN0cmlwcGVkT2Zmc2V0cyhcbiAgICBjb250ZW50Lm9yaWdpbmFsIGFzIFJlY2FzdDxIQlMuU3RyaXBGbGFncywgc3RyaW5nPixcbiAgICBjb250ZW50LnZhbHVlXG4gICk7XG5cbiAgbGluZSA9IGxpbmUgKyBvZmZzZXRzLmxpbmVzO1xuICBpZiAob2Zmc2V0cy5saW5lcykge1xuICAgIGNvbHVtbiA9IG9mZnNldHMuY29sdW1ucztcbiAgfSBlbHNlIHtcbiAgICBjb2x1bW4gPSBjb2x1bW4gKyBvZmZzZXRzLmNvbHVtbnM7XG4gIH1cblxuICB0b2tlbml6ZXIubGluZSA9IGxpbmU7XG4gIHRva2VuaXplci5jb2x1bW4gPSBjb2x1bW47XG59XG5cbmZ1bmN0aW9uIGFjY2VwdENhbGxOb2RlcyhcbiAgY29tcGlsZXI6IEhhbmRsZWJhcnNOb2RlVmlzaXRvcnMsXG4gIG5vZGU6IHtcbiAgICBwYXRoOiBIQlMuUGF0aEV4cHJlc3Npb247XG4gICAgcGFyYW1zOiBIQlMuRXhwcmVzc2lvbltdO1xuICAgIGhhc2g6IEhCUy5IYXNoO1xuICB9XG4pOiB7IHBhdGg6IEFTVC5QYXRoRXhwcmVzc2lvbjsgcGFyYW1zOiBBU1QuRXhwcmVzc2lvbltdOyBoYXNoOiBBU1QuSGFzaCB9IHtcbiAgbGV0IHBhdGggPSBjb21waWxlci5QYXRoRXhwcmVzc2lvbihub2RlLnBhdGgpO1xuXG4gIGxldCBwYXJhbXMgPSBub2RlLnBhcmFtcyA/IG5vZGUucGFyYW1zLm1hcCgoZSkgPT4gY29tcGlsZXIuYWNjZXB0Tm9kZTxBU1QuRXhwcmVzc2lvbj4oZSkpIDogW107XG4gIGxldCBoYXNoID0gbm9kZS5oYXNoID8gY29tcGlsZXIuSGFzaChub2RlLmhhc2gpIDogYi5oYXNoKCk7XG5cbiAgcmV0dXJuIHsgcGF0aCwgcGFyYW1zLCBoYXNoIH07XG59XG5cbmZ1bmN0aW9uIGFkZEVsZW1lbnRNb2RpZmllcihlbGVtZW50OiBUYWc8J1N0YXJ0VGFnJz4sIG11c3RhY2hlOiBBU1QuTXVzdGFjaGVTdGF0ZW1lbnQpIHtcbiAgbGV0IHsgcGF0aCwgcGFyYW1zLCBoYXNoLCBsb2MgfSA9IG11c3RhY2hlO1xuXG4gIGlmIChpc0xpdGVyYWwocGF0aCkpIHtcbiAgICBsZXQgbW9kaWZpZXIgPSBge3ske3ByaW50TGl0ZXJhbChwYXRoKX19fWA7XG4gICAgbGV0IHRhZyA9IGA8JHtlbGVtZW50Lm5hbWV9IC4uLiAke21vZGlmaWVyfSAuLi5gO1xuXG4gICAgdGhyb3cgbmV3IFN5bnRheEVycm9yKFxuICAgICAgYEluICR7dGFnfSwgJHttb2RpZmllcn0gaXMgbm90IGEgdmFsaWQgbW9kaWZpZXI6IFwiJHtwYXRoLm9yaWdpbmFsfVwiIG9uIGxpbmUgJHtcbiAgICAgICAgbG9jICYmIGxvYy5zdGFydC5saW5lXG4gICAgICB9LmAsXG4gICAgICBtdXN0YWNoZS5sb2NcbiAgICApO1xuICB9XG5cbiAgbGV0IG1vZGlmaWVyID0gYi5lbGVtZW50TW9kaWZpZXIocGF0aCwgcGFyYW1zLCBoYXNoLCBsb2MpO1xuICBlbGVtZW50Lm1vZGlmaWVycy5wdXNoKG1vZGlmaWVyKTtcbn1cblxuZnVuY3Rpb24gYXBwZW5kRHluYW1pY0F0dHJpYnV0ZVZhbHVlUGFydChhdHRyaWJ1dGU6IEF0dHJpYnV0ZSwgcGFydDogQVNULk11c3RhY2hlU3RhdGVtZW50KSB7XG4gIGF0dHJpYnV0ZS5pc0R5bmFtaWMgPSB0cnVlO1xuICBhdHRyaWJ1dGUucGFydHMucHVzaChwYXJ0KTtcbn1cbiIsImltcG9ydCB7IHR1cGxlIH0gZnJvbSAnQGdsaW1tZXIvdXRpbCc7XG5pbXBvcnQgKiBhcyBBU1QgZnJvbSAnLi4vdHlwZXMvbm9kZXMnO1xuXG4vLyBlbnN1cmUgc3RheXMgaW4gc3luYyB3aXRoIHR5cGluZ1xuLy8gUGFyZW50Tm9kZSBhbmQgQ2hpbGRLZXkgdHlwZXMgYXJlIGRlcml2ZWQgZnJvbSBWaXNpdG9yS2V5c01hcFxuY29uc3QgdmlzaXRvcktleXMgPSB7XG4gIFByb2dyYW06IHR1cGxlKCdib2R5JyksXG4gIFRlbXBsYXRlOiB0dXBsZSgnYm9keScpLFxuICBCbG9jazogdHVwbGUoJ2JvZHknKSxcblxuICBNdXN0YWNoZVN0YXRlbWVudDogdHVwbGUoJ3BhdGgnLCAncGFyYW1zJywgJ2hhc2gnKSxcbiAgQmxvY2tTdGF0ZW1lbnQ6IHR1cGxlKCdwYXRoJywgJ3BhcmFtcycsICdoYXNoJywgJ3Byb2dyYW0nLCAnaW52ZXJzZScpLFxuICBFbGVtZW50TW9kaWZpZXJTdGF0ZW1lbnQ6IHR1cGxlKCdwYXRoJywgJ3BhcmFtcycsICdoYXNoJyksXG4gIFBhcnRpYWxTdGF0ZW1lbnQ6IHR1cGxlKCduYW1lJywgJ3BhcmFtcycsICdoYXNoJyksXG4gIENvbW1lbnRTdGF0ZW1lbnQ6IHR1cGxlKCksXG4gIE11c3RhY2hlQ29tbWVudFN0YXRlbWVudDogdHVwbGUoKSxcbiAgRWxlbWVudE5vZGU6IHR1cGxlKCdhdHRyaWJ1dGVzJywgJ21vZGlmaWVycycsICdjaGlsZHJlbicsICdjb21tZW50cycpLFxuICBBdHRyTm9kZTogdHVwbGUoJ3ZhbHVlJyksXG4gIFRleHROb2RlOiB0dXBsZSgpLFxuXG4gIENvbmNhdFN0YXRlbWVudDogdHVwbGUoJ3BhcnRzJyksXG4gIFN1YkV4cHJlc3Npb246IHR1cGxlKCdwYXRoJywgJ3BhcmFtcycsICdoYXNoJyksXG4gIFBhdGhFeHByZXNzaW9uOiB0dXBsZSgpLFxuXG4gIFN0cmluZ0xpdGVyYWw6IHR1cGxlKCksXG4gIEJvb2xlYW5MaXRlcmFsOiB0dXBsZSgpLFxuICBOdW1iZXJMaXRlcmFsOiB0dXBsZSgpLFxuICBOdWxsTGl0ZXJhbDogdHVwbGUoKSxcbiAgVW5kZWZpbmVkTGl0ZXJhbDogdHVwbGUoKSxcblxuICBIYXNoOiB0dXBsZSgncGFpcnMnKSxcbiAgSGFzaFBhaXI6IHR1cGxlKCd2YWx1ZScpLFxufTtcblxudHlwZSBWaXNpdG9yS2V5c01hcCA9IHR5cGVvZiB2aXNpdG9yS2V5cztcblxuZXhwb3J0IHR5cGUgVmlzaXRvcktleXMgPSB7IFtQIGluIGtleW9mIFZpc2l0b3JLZXlzTWFwXTogVmlzaXRvcktleXNNYXBbUF1bbnVtYmVyXSB9O1xuZXhwb3J0IHR5cGUgVmlzaXRvcktleTxOIGV4dGVuZHMgQVNULk5vZGU+ID0gVmlzaXRvcktleXNbTlsndHlwZSddXSAmIGtleW9mIE47XG5cbmV4cG9ydCBkZWZhdWx0IHZpc2l0b3JLZXlzO1xuIiwiaW1wb3J0ICogYXMgQVNUIGZyb20gJy4uL3R5cGVzL25vZGVzJztcbmltcG9ydCB7IE9wdGlvbiB9IGZyb20gJ0BnbGltbWVyL2ludGVyZmFjZXMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFRyYXZlcnNhbEVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcjogVHJhdmVyc2FsRXJyb3JDb25zdHJ1Y3RvcjtcbiAga2V5OiBzdHJpbmc7XG4gIG5vZGU6IEFTVC5Ob2RlO1xuICBwYXJlbnQ6IE9wdGlvbjxBU1QuTm9kZT47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHJhdmVyc2FsRXJyb3JDb25zdHJ1Y3RvciB7XG4gIG5ldyAobWVzc2FnZTogc3RyaW5nLCBub2RlOiBBU1QuTm9kZSwgcGFyZW50OiBPcHRpb248QVNULk5vZGU+LCBrZXk6IHN0cmluZyk6IFRyYXZlcnNhbEVycm9yO1xuICByZWFkb25seSBwcm90b3R5cGU6IFRyYXZlcnNhbEVycm9yO1xufVxuXG5jb25zdCBUcmF2ZXJzYWxFcnJvcjogVHJhdmVyc2FsRXJyb3JDb25zdHJ1Y3RvciA9IChmdW5jdGlvbiAoKSB7XG4gIFRyYXZlcnNhbEVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKTtcbiAgVHJhdmVyc2FsRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gVHJhdmVyc2FsRXJyb3I7XG5cbiAgZnVuY3Rpb24gVHJhdmVyc2FsRXJyb3IoXG4gICAgdGhpczogVHJhdmVyc2FsRXJyb3IsXG4gICAgbWVzc2FnZTogc3RyaW5nLFxuICAgIG5vZGU6IEFTVC5Ob2RlLFxuICAgIHBhcmVudDogT3B0aW9uPEFTVC5Ob2RlPixcbiAgICBrZXk6IHN0cmluZ1xuICApIHtcbiAgICBsZXQgZXJyb3IgPSBFcnJvci5jYWxsKHRoaXMsIG1lc3NhZ2UpO1xuXG4gICAgdGhpcy5rZXkgPSBrZXk7XG4gICAgdGhpcy5tZXNzYWdlID0gbWVzc2FnZTtcbiAgICB0aGlzLm5vZGUgPSBub2RlO1xuICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xuICAgIHRoaXMuc3RhY2sgPSBlcnJvci5zdGFjaztcbiAgfVxuXG4gIHJldHVybiBUcmF2ZXJzYWxFcnJvciBhcyBhbnk7XG59KSgpO1xuXG5leHBvcnQgZGVmYXVsdCBUcmF2ZXJzYWxFcnJvcjtcblxuZXhwb3J0IGZ1bmN0aW9uIGNhbm5vdFJlbW92ZU5vZGUobm9kZTogQVNULk5vZGUsIHBhcmVudDogQVNULk5vZGUsIGtleTogc3RyaW5nKSB7XG4gIHJldHVybiBuZXcgVHJhdmVyc2FsRXJyb3IoXG4gICAgJ0Nhbm5vdCByZW1vdmUgYSBub2RlIHVubGVzcyBpdCBpcyBwYXJ0IG9mIGFuIGFycmF5JyxcbiAgICBub2RlLFxuICAgIHBhcmVudCxcbiAgICBrZXlcbiAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNhbm5vdFJlcGxhY2VOb2RlKG5vZGU6IEFTVC5Ob2RlLCBwYXJlbnQ6IEFTVC5Ob2RlLCBrZXk6IHN0cmluZykge1xuICByZXR1cm4gbmV3IFRyYXZlcnNhbEVycm9yKFxuICAgICdDYW5ub3QgcmVwbGFjZSBhIG5vZGUgd2l0aCBtdWx0aXBsZSBub2RlcyB1bmxlc3MgaXQgaXMgcGFydCBvZiBhbiBhcnJheScsXG4gICAgbm9kZSxcbiAgICBwYXJlbnQsXG4gICAga2V5XG4gICk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjYW5ub3RSZXBsYWNlT3JSZW1vdmVJbktleUhhbmRsZXJZZXQobm9kZTogQVNULk5vZGUsIGtleTogc3RyaW5nKSB7XG4gIHJldHVybiBuZXcgVHJhdmVyc2FsRXJyb3IoXG4gICAgJ1JlcGxhY2luZyBhbmQgcmVtb3ZpbmcgaW4ga2V5IGhhbmRsZXJzIGlzIG5vdCB5ZXQgc3VwcG9ydGVkLicsXG4gICAgbm9kZSxcbiAgICBudWxsLFxuICAgIGtleVxuICApO1xufVxuIiwiaW1wb3J0IHsgTm9kZSB9IGZyb20gJy4uL3R5cGVzL25vZGVzJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGF0aDxOIGV4dGVuZHMgTm9kZT4ge1xuICBub2RlOiBOO1xuICBwYXJlbnQ6IFBhdGg8Tm9kZT4gfCBudWxsO1xuICBwYXJlbnRLZXk6IHN0cmluZyB8IG51bGw7XG5cbiAgY29uc3RydWN0b3Iobm9kZTogTiwgcGFyZW50OiBQYXRoPE5vZGU+IHwgbnVsbCA9IG51bGwsIHBhcmVudEtleTogc3RyaW5nIHwgbnVsbCA9IG51bGwpIHtcbiAgICB0aGlzLm5vZGUgPSBub2RlO1xuICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xuICAgIHRoaXMucGFyZW50S2V5ID0gcGFyZW50S2V5O1xuICB9XG5cbiAgZ2V0IHBhcmVudE5vZGUoKTogTm9kZSB8IG51bGwge1xuICAgIHJldHVybiB0aGlzLnBhcmVudCA/IHRoaXMucGFyZW50Lm5vZGUgOiBudWxsO1xuICB9XG5cbiAgcGFyZW50cygpOiBJdGVyYWJsZTxQYXRoPE5vZGU+IHwgbnVsbD4ge1xuICAgIHJldHVybiB7XG4gICAgICBbU3ltYm9sLml0ZXJhdG9yXTogKCkgPT4ge1xuICAgICAgICByZXR1cm4gbmV3IFBhdGhQYXJlbnRzSXRlcmF0b3IodGhpcyk7XG4gICAgICB9LFxuICAgIH07XG4gIH1cbn1cblxuY2xhc3MgUGF0aFBhcmVudHNJdGVyYXRvciBpbXBsZW1lbnRzIEl0ZXJhdG9yPFBhdGg8Tm9kZT4gfCBudWxsPiB7XG4gIHBhdGg6IFBhdGg8Tm9kZT47XG5cbiAgY29uc3RydWN0b3IocGF0aDogUGF0aDxOb2RlPikge1xuICAgIHRoaXMucGF0aCA9IHBhdGg7XG4gIH1cblxuICBuZXh0KCkge1xuICAgIGlmICh0aGlzLnBhdGgucGFyZW50KSB7XG4gICAgICB0aGlzLnBhdGggPSB0aGlzLnBhdGgucGFyZW50O1xuICAgICAgcmV0dXJuIHsgZG9uZTogZmFsc2UsIHZhbHVlOiB0aGlzLnBhdGggfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHsgZG9uZTogdHJ1ZSwgdmFsdWU6IG51bGwgfTtcbiAgICB9XG4gIH1cbn1cbiIsImltcG9ydCB2aXNpdG9yS2V5cywgeyBWaXNpdG9yS2V5cywgVmlzaXRvcktleSB9IGZyb20gJy4uL3R5cGVzL3Zpc2l0b3Ita2V5cyc7XG5pbXBvcnQge1xuICBjYW5ub3RSZW1vdmVOb2RlLFxuICBjYW5ub3RSZXBsYWNlTm9kZSxcbiAgY2Fubm90UmVwbGFjZU9yUmVtb3ZlSW5LZXlIYW5kbGVyWWV0LFxufSBmcm9tICcuL2Vycm9ycyc7XG5pbXBvcnQgKiBhcyBBU1QgZnJvbSAnLi4vdHlwZXMvbm9kZXMnO1xuaW1wb3J0IHsgZGVwcmVjYXRlIH0gZnJvbSAnQGdsaW1tZXIvdXRpbCc7XG5pbXBvcnQgeyBMT0NBTF9ERUJVRyB9IGZyb20gJ0BnbGltbWVyL2xvY2FsLWRlYnVnLWZsYWdzJztcbmltcG9ydCB7IE5vZGVIYW5kbGVyLCBOb2RlVmlzaXRvciwgS2V5SGFuZGxlciwgTm9kZVRyYXZlcnNhbCwgS2V5VHJhdmVyc2FsIH0gZnJvbSAnLi92aXNpdG9yJztcbmltcG9ydCBQYXRoIGZyb20gJy4vcGF0aCc7XG5cbmZ1bmN0aW9uIGdldEVudGVyRnVuY3Rpb248TiBleHRlbmRzIEFTVC5Ob2RlPihcbiAgaGFuZGxlcjogTm9kZVRyYXZlcnNhbDxOPlxuKTogTm9kZUhhbmRsZXI8Tj4gfCB1bmRlZmluZWQ7XG5mdW5jdGlvbiBnZXRFbnRlckZ1bmN0aW9uPE4gZXh0ZW5kcyBBU1QuTm9kZSwgSyBleHRlbmRzIFZpc2l0b3JLZXk8Tj4+KFxuICBoYW5kbGVyOiBLZXlUcmF2ZXJzYWw8TiwgSz5cbik6IEtleUhhbmRsZXI8TiwgSz4gfCB1bmRlZmluZWQ7XG5mdW5jdGlvbiBnZXRFbnRlckZ1bmN0aW9uPE4gZXh0ZW5kcyBBU1QuTm9kZSwgSyBleHRlbmRzIFZpc2l0b3JLZXk8Tj4+KFxuICBoYW5kbGVyOiBOb2RlVHJhdmVyc2FsPE4+IHwgS2V5VHJhdmVyc2FsPE4sIEs+XG4pOiBOb2RlSGFuZGxlcjxOPiB8IEtleUhhbmRsZXI8TiwgSz4gfCB1bmRlZmluZWQge1xuICBpZiAodHlwZW9mIGhhbmRsZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gaGFuZGxlcjtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gaGFuZGxlci5lbnRlciBhcyBOb2RlSGFuZGxlcjxOPiB8IEtleUhhbmRsZXI8TiwgSz47XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0RXhpdEZ1bmN0aW9uPE4gZXh0ZW5kcyBBU1QuTm9kZT4oaGFuZGxlcjogTm9kZVRyYXZlcnNhbDxOPik6IE5vZGVIYW5kbGVyPE4+IHwgdW5kZWZpbmVkO1xuZnVuY3Rpb24gZ2V0RXhpdEZ1bmN0aW9uPE4gZXh0ZW5kcyBBU1QuTm9kZSwgSyBleHRlbmRzIFZpc2l0b3JLZXk8Tj4+KFxuICBoYW5kbGVyOiBLZXlUcmF2ZXJzYWw8TiwgSz5cbik6IEtleUhhbmRsZXI8TiwgSz4gfCB1bmRlZmluZWQ7XG5mdW5jdGlvbiBnZXRFeGl0RnVuY3Rpb248TiBleHRlbmRzIEFTVC5Ob2RlLCBLIGV4dGVuZHMgVmlzaXRvcktleTxOPj4oXG4gIGhhbmRsZXI6IE5vZGVUcmF2ZXJzYWw8Tj4gfCBLZXlUcmF2ZXJzYWw8TiwgSz5cbik6IE5vZGVIYW5kbGVyPE4+IHwgS2V5SGFuZGxlcjxOLCBLPiB8IHVuZGVmaW5lZCB7XG4gIGlmICh0eXBlb2YgaGFuZGxlciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGhhbmRsZXIuZXhpdCBhcyBOb2RlSGFuZGxlcjxOPiB8IEtleUhhbmRsZXI8TiwgSz47XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0S2V5SGFuZGxlcjxOIGV4dGVuZHMgQVNULk5vZGUsIEsgZXh0ZW5kcyBWaXNpdG9yS2V5PE4+PihcbiAgaGFuZGxlcjogTm9kZVRyYXZlcnNhbDxOPixcbiAga2V5OiBLXG4pOiBLZXlUcmF2ZXJzYWw8TiwgSz4gfCBLZXlUcmF2ZXJzYWw8TiwgVmlzaXRvcktleTxOPj4gfCB1bmRlZmluZWQge1xuICBsZXQga2V5VmlzaXRvciA9IHR5cGVvZiBoYW5kbGVyICE9PSAnZnVuY3Rpb24nID8gaGFuZGxlci5rZXlzIDogdW5kZWZpbmVkO1xuICBpZiAoa2V5VmlzaXRvciA9PT0gdW5kZWZpbmVkKSByZXR1cm47XG5cbiAgbGV0IGtleUhhbmRsZXIgPSBrZXlWaXNpdG9yW2tleV07XG4gIGlmIChrZXlIYW5kbGVyICE9PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4ga2V5SGFuZGxlciBhcyBLZXlUcmF2ZXJzYWw8TiwgSz47XG4gIH1cbiAgcmV0dXJuIGtleVZpc2l0b3IuQWxsO1xufVxuXG5mdW5jdGlvbiBnZXROb2RlSGFuZGxlcjxOIGV4dGVuZHMgQVNULk5vZGU+KFxuICB2aXNpdG9yOiBOb2RlVmlzaXRvcixcbiAgbm9kZVR5cGU6IE5bJ3R5cGUnXVxuKTogTm9kZVRyYXZlcnNhbDxOPjtcbmZ1bmN0aW9uIGdldE5vZGVIYW5kbGVyKHZpc2l0b3I6IE5vZGVWaXNpdG9yLCBub2RlVHlwZTogJ0FsbCcpOiBOb2RlVHJhdmVyc2FsPEFTVC5Ob2RlPjtcbmZ1bmN0aW9uIGdldE5vZGVIYW5kbGVyPE4gZXh0ZW5kcyBBU1QuTm9kZT4oXG4gIHZpc2l0b3I6IE5vZGVWaXNpdG9yLFxuICBub2RlVHlwZTogTlsndHlwZSddXG4pOiBOb2RlVHJhdmVyc2FsPE4+IHwgTm9kZVRyYXZlcnNhbDxBU1QuTm9kZT4gfCB1bmRlZmluZWQge1xuICBpZiAobm9kZVR5cGUgPT09ICdUZW1wbGF0ZScgfHwgbm9kZVR5cGUgPT09ICdCbG9jaycpIHtcbiAgICBpZiAodmlzaXRvci5Qcm9ncmFtKSB7XG4gICAgICBpZiAoTE9DQUxfREVCVUcpIHtcbiAgICAgICAgZGVwcmVjYXRlKGBUT0RPYCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB2aXNpdG9yLlByb2dyYW0gYXMgYW55O1xuICAgIH1cbiAgfVxuXG4gIGxldCBoYW5kbGVyID0gdmlzaXRvcltub2RlVHlwZV07XG4gIGlmIChoYW5kbGVyICE9PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gKGhhbmRsZXIgYXMgdW5rbm93bikgYXMgTm9kZVRyYXZlcnNhbDxOPjtcbiAgfVxuICByZXR1cm4gdmlzaXRvci5BbGw7XG59XG5cbmZ1bmN0aW9uIHZpc2l0Tm9kZTxOIGV4dGVuZHMgQVNULk5vZGU+KFxuICB2aXNpdG9yOiBOb2RlVmlzaXRvcixcbiAgcGF0aDogUGF0aDxOPlxuKTogQVNULk5vZGUgfCBBU1QuTm9kZVtdIHwgdW5kZWZpbmVkIHwgbnVsbCB8IHZvaWQge1xuICBsZXQgeyBub2RlLCBwYXJlbnQsIHBhcmVudEtleSB9ID0gcGF0aDtcblxuICBsZXQgaGFuZGxlcjogTm9kZVRyYXZlcnNhbDxOPiA9IGdldE5vZGVIYW5kbGVyKHZpc2l0b3IsIG5vZGUudHlwZSk7XG4gIGxldCBlbnRlcjtcbiAgbGV0IGV4aXQ7XG5cbiAgaWYgKGhhbmRsZXIgIT09IHVuZGVmaW5lZCkge1xuICAgIGVudGVyID0gZ2V0RW50ZXJGdW5jdGlvbihoYW5kbGVyKTtcbiAgICBleGl0ID0gZ2V0RXhpdEZ1bmN0aW9uKGhhbmRsZXIpO1xuICB9XG5cbiAgbGV0IHJlc3VsdDogQVNULk5vZGUgfCBBU1QuTm9kZVtdIHwgdW5kZWZpbmVkIHwgbnVsbCB8IHZvaWQ7XG4gIGlmIChlbnRlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgcmVzdWx0ID0gZW50ZXIobm9kZSwgcGF0aCk7XG4gIH1cblxuICBpZiAocmVzdWx0ICE9PSB1bmRlZmluZWQgJiYgcmVzdWx0ICE9PSBudWxsKSB7XG4gICAgaWYgKEpTT04uc3RyaW5naWZ5KG5vZGUpID09PSBKU09OLnN0cmluZ2lmeShyZXN1bHQpKSB7XG4gICAgICByZXN1bHQgPSB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHJlc3VsdCkpIHtcbiAgICAgIHZpc2l0QXJyYXkodmlzaXRvciwgcmVzdWx0LCBwYXJlbnQsIHBhcmVudEtleSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0gZWxzZSB7XG4gICAgICBsZXQgcGF0aCA9IG5ldyBQYXRoKHJlc3VsdCwgcGFyZW50LCBwYXJlbnRLZXkpO1xuICAgICAgcmV0dXJuIHZpc2l0Tm9kZSh2aXNpdG9yLCBwYXRoKSB8fCByZXN1bHQ7XG4gICAgfVxuICB9XG5cbiAgaWYgKHJlc3VsdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgbGV0IGtleXMgPSB2aXNpdG9yS2V5c1tub2RlLnR5cGVdO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBsZXQga2V5ID0ga2V5c1tpXSBhcyBWaXNpdG9yS2V5c1tOWyd0eXBlJ11dICYga2V5b2YgTjtcbiAgICAgIC8vIHdlIGtub3cgaWYgaXQgaGFzIGNoaWxkIGtleXMgd2UgY2FuIHdpZGVuIHRvIGEgUGFyZW50Tm9kZVxuICAgICAgdmlzaXRLZXkodmlzaXRvciwgaGFuZGxlciwgcGF0aCwga2V5KTtcbiAgICB9XG5cbiAgICBpZiAoZXhpdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXN1bHQgPSBleGl0KG5vZGUsIHBhdGgpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGdldDxOIGV4dGVuZHMgQVNULk5vZGU+KFxuICBub2RlOiBOLFxuICBrZXk6IFZpc2l0b3JLZXlzW05bJ3R5cGUnXV0gJiBrZXlvZiBOXG4pOiBBU1QuTm9kZSB8IEFTVC5Ob2RlW10ge1xuICByZXR1cm4gKG5vZGVba2V5XSBhcyB1bmtub3duKSBhcyBBU1QuTm9kZSB8IEFTVC5Ob2RlW107XG59XG5cbmZ1bmN0aW9uIHNldDxOIGV4dGVuZHMgQVNULk5vZGUsIEsgZXh0ZW5kcyBrZXlvZiBOPihub2RlOiBOLCBrZXk6IEssIHZhbHVlOiBOW0tdKTogdm9pZCB7XG4gIG5vZGVba2V5XSA9IHZhbHVlO1xufVxuXG5mdW5jdGlvbiB2aXNpdEtleTxOIGV4dGVuZHMgQVNULk5vZGU+KFxuICB2aXNpdG9yOiBOb2RlVmlzaXRvcixcbiAgaGFuZGxlcjogTm9kZVRyYXZlcnNhbDxOPixcbiAgcGF0aDogUGF0aDxOPixcbiAga2V5OiBWaXNpdG9yS2V5c1tOWyd0eXBlJ11dICYga2V5b2YgTlxuKSB7XG4gIGxldCB7IG5vZGUgfSA9IHBhdGg7XG5cbiAgbGV0IHZhbHVlID0gZ2V0KG5vZGUsIGtleSk7XG4gIGlmICghdmFsdWUpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBsZXQga2V5RW50ZXI7XG4gIGxldCBrZXlFeGl0O1xuXG4gIGlmIChoYW5kbGVyICE9PSB1bmRlZmluZWQpIHtcbiAgICBsZXQga2V5SGFuZGxlciA9IGdldEtleUhhbmRsZXIoaGFuZGxlciwga2V5KTtcbiAgICBpZiAoa2V5SGFuZGxlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBrZXlFbnRlciA9IGdldEVudGVyRnVuY3Rpb24oa2V5SGFuZGxlcik7XG4gICAgICBrZXlFeGl0ID0gZ2V0RXhpdEZ1bmN0aW9uKGtleUhhbmRsZXIpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChrZXlFbnRlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKGtleUVudGVyKG5vZGUsIGtleSkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgY2Fubm90UmVwbGFjZU9yUmVtb3ZlSW5LZXlIYW5kbGVyWWV0KG5vZGUsIGtleSk7XG4gICAgfVxuICB9XG5cbiAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgdmlzaXRBcnJheSh2aXNpdG9yLCB2YWx1ZSwgcGF0aCwga2V5KTtcbiAgfSBlbHNlIHtcbiAgICBsZXQga2V5UGF0aCA9IG5ldyBQYXRoKHZhbHVlLCBwYXRoLCBrZXkpO1xuICAgIGxldCByZXN1bHQgPSB2aXNpdE5vZGUodmlzaXRvciwga2V5UGF0aCk7XG4gICAgaWYgKHJlc3VsdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBUT0RPOiBkeW5hbWljYWxseSBjaGVjayB0aGUgcmVzdWx0cyBieSBoYXZpbmcgYSB0YWJsZSBvZlxuICAgICAgLy8gZXhwZWN0ZWQgbm9kZSB0eXBlcyBpbiB2YWx1ZSBzcGFjZSwgbm90IGp1c3QgdHlwZSBzcGFjZVxuICAgICAgYXNzaWduS2V5KG5vZGUsIGtleSwgdmFsdWUsIHJlc3VsdCBhcyBhbnkpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChrZXlFeGl0ICE9PSB1bmRlZmluZWQpIHtcbiAgICBpZiAoa2V5RXhpdChub2RlLCBrZXkpICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IGNhbm5vdFJlcGxhY2VPclJlbW92ZUluS2V5SGFuZGxlcllldChub2RlLCBrZXkpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiB2aXNpdEFycmF5KFxuICB2aXNpdG9yOiBOb2RlVmlzaXRvcixcbiAgYXJyYXk6IEFTVC5Ob2RlW10sXG4gIHBhcmVudDogUGF0aDxBU1QuTm9kZT4gfCBudWxsLFxuICBwYXJlbnRLZXk6IHN0cmluZyB8IG51bGxcbikge1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgbGV0IG5vZGUgPSBhcnJheVtpXTtcbiAgICBsZXQgcGF0aCA9IG5ldyBQYXRoKG5vZGUsIHBhcmVudCwgcGFyZW50S2V5KTtcbiAgICBsZXQgcmVzdWx0ID0gdmlzaXROb2RlKHZpc2l0b3IsIHBhdGgpO1xuICAgIGlmIChyZXN1bHQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgaSArPSBzcGxpY2VBcnJheShhcnJheSwgaSwgcmVzdWx0KSAtIDE7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGFzc2lnbktleTxOIGV4dGVuZHMgQVNULk5vZGUsIEsgZXh0ZW5kcyBWaXNpdG9yS2V5PE4+PihcbiAgbm9kZTogTixcbiAga2V5OiBLLFxuICB2YWx1ZTogQVNULk5vZGUsXG4gIHJlc3VsdDogTltLXSB8IFtOW0tdXSB8IG51bGxcbikge1xuICBpZiAocmVzdWx0ID09PSBudWxsKSB7XG4gICAgdGhyb3cgY2Fubm90UmVtb3ZlTm9kZSh2YWx1ZSwgbm9kZSwga2V5KTtcbiAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHJlc3VsdCkpIHtcbiAgICBpZiAocmVzdWx0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgc2V0KG5vZGUsIGtleSwgcmVzdWx0WzBdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHJlc3VsdC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdGhyb3cgY2Fubm90UmVtb3ZlTm9kZSh2YWx1ZSwgbm9kZSwga2V5KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IGNhbm5vdFJlcGxhY2VOb2RlKHZhbHVlLCBub2RlLCBrZXkpO1xuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBzZXQobm9kZSwga2V5LCByZXN1bHQpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNwbGljZUFycmF5KGFycmF5OiBBU1QuTm9kZVtdLCBpbmRleDogbnVtYmVyLCByZXN1bHQ6IEFTVC5Ob2RlIHwgQVNULk5vZGVbXSB8IG51bGwpIHtcbiAgaWYgKHJlc3VsdCA9PT0gbnVsbCkge1xuICAgIGFycmF5LnNwbGljZShpbmRleCwgMSk7XG4gICAgcmV0dXJuIDA7XG4gIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShyZXN1bHQpKSB7XG4gICAgYXJyYXkuc3BsaWNlKGluZGV4LCAxLCAuLi5yZXN1bHQpO1xuICAgIHJldHVybiByZXN1bHQubGVuZ3RoO1xuICB9IGVsc2Uge1xuICAgIGFycmF5LnNwbGljZShpbmRleCwgMSwgcmVzdWx0KTtcbiAgICByZXR1cm4gMTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiB0cmF2ZXJzZShub2RlOiBBU1QuTm9kZSwgdmlzaXRvcjogTm9kZVZpc2l0b3IpIHtcbiAgbGV0IHBhdGggPSBuZXcgUGF0aChub2RlKTtcbiAgdmlzaXROb2RlKHZpc2l0b3IsIHBhdGgpO1xufVxuIiwiaW1wb3J0ICogYXMgQVNUIGZyb20gJy4uL3R5cGVzL25vZGVzJztcblxuY29uc3QgZW51bSBDaGFyIHtcbiAgTkJTUCA9IDB4YTAsXG4gIFFVT1QgPSAweDIyLFxuICBMVCA9IDB4M2MsXG4gIEdUID0gMHgzZSxcbiAgQU1QID0gMHgyNixcbn1cblxuY29uc3QgQVRUUl9WQUxVRV9SRUdFWF9URVNUID0gL1tcXHhBMFwiJl0vO1xuY29uc3QgQVRUUl9WQUxVRV9SRUdFWF9SRVBMQUNFID0gbmV3IFJlZ0V4cChBVFRSX1ZBTFVFX1JFR0VYX1RFU1Quc291cmNlLCAnZycpO1xuXG5jb25zdCBURVhUX1JFR0VYX1RFU1QgPSAvW1xceEEwJjw+XS87XG5jb25zdCBURVhUX1JFR0VYX1JFUExBQ0UgPSBuZXcgUmVnRXhwKFRFWFRfUkVHRVhfVEVTVC5zb3VyY2UsICdnJyk7XG5cbmZ1bmN0aW9uIGF0dHJWYWx1ZVJlcGxhY2VyKGNoYXI6IHN0cmluZykge1xuICBzd2l0Y2ggKGNoYXIuY2hhckNvZGVBdCgwKSkge1xuICAgIGNhc2UgQ2hhci5OQlNQOlxuICAgICAgcmV0dXJuICcmbmJzcDsnO1xuICAgIGNhc2UgQ2hhci5RVU9UOlxuICAgICAgcmV0dXJuICcmcXVvdDsnO1xuICAgIGNhc2UgQ2hhci5BTVA6XG4gICAgICByZXR1cm4gJyZhbXA7JztcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIGNoYXI7XG4gIH1cbn1cblxuZnVuY3Rpb24gdGV4dFJlcGxhY2VyKGNoYXI6IHN0cmluZykge1xuICBzd2l0Y2ggKGNoYXIuY2hhckNvZGVBdCgwKSkge1xuICAgIGNhc2UgQ2hhci5OQlNQOlxuICAgICAgcmV0dXJuICcmbmJzcDsnO1xuICAgIGNhc2UgQ2hhci5BTVA6XG4gICAgICByZXR1cm4gJyZhbXA7JztcbiAgICBjYXNlIENoYXIuTFQ6XG4gICAgICByZXR1cm4gJyZsdDsnO1xuICAgIGNhc2UgQ2hhci5HVDpcbiAgICAgIHJldHVybiAnJmd0Oyc7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBjaGFyO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBlc2NhcGVBdHRyVmFsdWUoYXR0clZhbHVlOiBzdHJpbmcpIHtcbiAgaWYgKEFUVFJfVkFMVUVfUkVHRVhfVEVTVC50ZXN0KGF0dHJWYWx1ZSkpIHtcbiAgICByZXR1cm4gYXR0clZhbHVlLnJlcGxhY2UoQVRUUl9WQUxVRV9SRUdFWF9SRVBMQUNFLCBhdHRyVmFsdWVSZXBsYWNlcik7XG4gIH1cbiAgcmV0dXJuIGF0dHJWYWx1ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGVzY2FwZVRleHQodGV4dDogc3RyaW5nKSB7XG4gIGlmIChURVhUX1JFR0VYX1RFU1QudGVzdCh0ZXh0KSkge1xuICAgIHJldHVybiB0ZXh0LnJlcGxhY2UoVEVYVF9SRUdFWF9SRVBMQUNFLCB0ZXh0UmVwbGFjZXIpO1xuICB9XG4gIHJldHVybiB0ZXh0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNTeW50aGV0aWMobm9kZTogQVNULk5vZGUpOiBib29sZWFuIHtcbiAgaWYgKG5vZGUgJiYgbm9kZS5sb2MpIHtcbiAgICByZXR1cm4gbm9kZS5sb2Muc291cmNlID09PSAnKHN5bnRoZXRpYyknO1xuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc29ydEJ5TG9jKGE6IEFTVC5Ob2RlLCBiOiBBU1QuTm9kZSk6IC0xIHwgMCB8IDEge1xuICAvLyBiZSBjb25zZXJ2YXRpdmUgYWJvdXQgdGhlIGxvY2F0aW9uIHdoZXJlIGEgbmV3IG5vZGUgaXMgaW5zZXJ0ZWRcbiAgaWYgKGlzU3ludGhldGljKGEpIHx8IGlzU3ludGhldGljKGIpKSB7XG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICBpZiAoYS5sb2Muc3RhcnQubGluZSA8IGIubG9jLnN0YXJ0LmxpbmUpIHtcbiAgICByZXR1cm4gLTE7XG4gIH1cblxuICBpZiAoYS5sb2Muc3RhcnQubGluZSA9PT0gYi5sb2Muc3RhcnQubGluZSAmJiBhLmxvYy5zdGFydC5jb2x1bW4gPCBiLmxvYy5zdGFydC5jb2x1bW4pIHtcbiAgICByZXR1cm4gLTE7XG4gIH1cblxuICBpZiAoYS5sb2Muc3RhcnQubGluZSA9PT0gYi5sb2Muc3RhcnQubGluZSAmJiBhLmxvYy5zdGFydC5jb2x1bW4gPT09IGIubG9jLnN0YXJ0LmNvbHVtbikge1xuICAgIHJldHVybiAwO1xuICB9XG5cbiAgcmV0dXJuIDE7XG59XG4iLCJpbXBvcnQge1xuICBBdHRyTm9kZSxcbiAgQmxvY2ssXG4gIEJsb2NrU3RhdGVtZW50LFxuICBFbGVtZW50Tm9kZSxcbiAgTXVzdGFjaGVTdGF0ZW1lbnQsXG4gIE5vZGUsXG4gIFByb2dyYW0sXG4gIFRleHROb2RlLFxuICBQYXJ0aWFsU3RhdGVtZW50LFxuICBDb25jYXRTdGF0ZW1lbnQsXG4gIE11c3RhY2hlQ29tbWVudFN0YXRlbWVudCxcbiAgQ29tbWVudFN0YXRlbWVudCxcbiAgRWxlbWVudE1vZGlmaWVyU3RhdGVtZW50LFxuICBFeHByZXNzaW9uLFxuICBQYXRoRXhwcmVzc2lvbixcbiAgU3ViRXhwcmVzc2lvbixcbiAgSGFzaCxcbiAgSGFzaFBhaXIsXG4gIExpdGVyYWwsXG4gIFN0cmluZ0xpdGVyYWwsXG4gIEJvb2xlYW5MaXRlcmFsLFxuICBOdW1iZXJMaXRlcmFsLFxuICBVbmRlZmluZWRMaXRlcmFsLFxuICBOdWxsTGl0ZXJhbCxcbiAgVG9wTGV2ZWxTdGF0ZW1lbnQsXG4gIFRlbXBsYXRlLFxufSBmcm9tICcuLi90eXBlcy9ub2Rlcyc7XG5pbXBvcnQgeyB2b2lkTWFwIH0gZnJvbSAnLi4vcGFyc2VyL3Rva2VuaXplci1ldmVudC1oYW5kbGVycyc7XG5pbXBvcnQgeyBlc2NhcGVUZXh0LCBlc2NhcGVBdHRyVmFsdWUsIHNvcnRCeUxvYyB9IGZyb20gJy4vdXRpbCc7XG5cbmNvbnN0IE5PTl9XSElURVNQQUNFID0gL1xcUy87XG5cbmV4cG9ydCBpbnRlcmZhY2UgUHJpbnRlck9wdGlvbnMge1xuICBlbnRpdHlFbmNvZGluZzogJ3RyYW5zZm9ybWVkJyB8ICdyYXcnO1xuXG4gIC8qKlxuICAgKiBVc2VkIHRvIG92ZXJyaWRlIHRoZSBtZWNoYW5pc20gb2YgcHJpbnRpbmcgYSBnaXZlbiBBU1QuTm9kZS5cbiAgICpcbiAgICogVGhpcyB3aWxsIGdlbmVyYWxseSBvbmx5IGJlIHVzZWZ1bCB0byBzb3VyY2UgLT4gc291cmNlIGNvZGVtb2RzXG4gICAqIHdoZXJlIHlvdSB3b3VsZCBsaWtlIHRvIHNwZWNpYWxpemUvb3ZlcnJpZGUgdGhlIHdheSBhIGdpdmVuIG5vZGUgaXNcbiAgICogcHJpbnRlZCAoZS5nLiB5b3Ugd291bGQgbGlrZSB0byBwcmVzZXJ2ZSBhcyBtdWNoIG9mIHRoZSBvcmlnaW5hbFxuICAgKiBmb3JtYXR0aW5nIGFzIHBvc3NpYmxlKS5cbiAgICpcbiAgICogV2hlbiB0aGUgcHJvdmlkZWQgb3ZlcnJpZGUgcmV0dXJucyB1bmRlZmluZWQsIHRoZSBkZWZhdWx0IGJ1aWx0IGluIHByaW50aW5nXG4gICAqIHdpbGwgYmUgZG9uZSBmb3IgdGhlIEFTVC5Ob2RlLlxuICAgKlxuICAgKiBAcGFyYW0gYXN0IHRoZSBhc3Qgbm9kZSB0byBiZSBwcmludGVkXG4gICAqIEBwYXJhbSBvcHRpb25zIHRoZSBvcHRpb25zIHNwZWNpZmllZCBkdXJpbmcgdGhlIHByaW50KCkgaW52b2NhdGlvblxuICAgKi9cbiAgb3ZlcnJpZGU/KGFzdDogTm9kZSwgb3B0aW9uczogUHJpbnRlck9wdGlvbnMpOiB2b2lkIHwgc3RyaW5nO1xufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQcmludGVyIHtcbiAgcHJpdmF0ZSBidWZmZXIgPSAnJztcbiAgcHJpdmF0ZSBvcHRpb25zOiBQcmludGVyT3B0aW9ucztcblxuICBjb25zdHJ1Y3RvcihvcHRpb25zOiBQcmludGVyT3B0aW9ucykge1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gIH1cblxuICAvKlxuICAgIFRoaXMgaXMgdXNlZCBieSBfYWxsXyBtZXRob2RzIG9uIHRoaXMgUHJpbnRlciBjbGFzcyB0aGF0IGFkZCB0byBgdGhpcy5idWZmZXJgLFxuICAgIGl0IGFsbG93cyBjb25zdW1lcnMgb2YgdGhlIHByaW50ZXIgdG8gdXNlIGFsdGVybmF0ZSBzdHJpbmcgcmVwcmVzZW50YXRpb25zIGZvclxuICAgIGEgZ2l2ZW4gbm9kZS5cblxuICAgIFRoZSBwcmltYXJ5IHVzZSBjYXNlIGZvciB0aGlzIGFyZSB0aGluZ3MgbGlrZSBzb3VyY2UgLT4gc291cmNlIGNvZGVtb2QgdXRpbGl0aWVzLlxuICAgIEZvciBleGFtcGxlLCBlbWJlci10ZW1wbGF0ZS1yZWNhc3QgYXR0ZW1wdHMgdG8gYWx3YXlzIHByZXNlcnZlIHRoZSBvcmlnaW5hbCBzdHJpbmdcbiAgICBmb3JtYXR0aW5nIGluIGVhY2ggQVNUIG5vZGUgaWYgbm8gbW9kaWZpY2F0aW9ucyBhcmUgbWFkZSB0byBpdC5cbiAgKi9cbiAgaGFuZGxlZEJ5T3ZlcnJpZGUobm9kZTogTm9kZSwgZW5zdXJlTGVhZGluZ1doaXRlc3BhY2UgPSBmYWxzZSk6IGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLm9wdGlvbnMub3ZlcnJpZGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgbGV0IHJlc3VsdCA9IHRoaXMub3B0aW9ucy5vdmVycmlkZShub2RlLCB0aGlzLm9wdGlvbnMpO1xuICAgICAgaWYgKHR5cGVvZiByZXN1bHQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGlmIChlbnN1cmVMZWFkaW5nV2hpdGVzcGFjZSAmJiByZXN1bHQgIT09ICcnICYmIE5PTl9XSElURVNQQUNFLnRlc3QocmVzdWx0WzBdKSkge1xuICAgICAgICAgIHJlc3VsdCA9IGAgJHtyZXN1bHR9YDtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuYnVmZmVyICs9IHJlc3VsdDtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgTm9kZShub2RlOiBOb2RlKTogdm9pZCB7XG4gICAgc3dpdGNoIChub2RlLnR5cGUpIHtcbiAgICAgIGNhc2UgJ011c3RhY2hlU3RhdGVtZW50JzpcbiAgICAgIGNhc2UgJ0Jsb2NrU3RhdGVtZW50JzpcbiAgICAgIGNhc2UgJ1BhcnRpYWxTdGF0ZW1lbnQnOlxuICAgICAgY2FzZSAnTXVzdGFjaGVDb21tZW50U3RhdGVtZW50JzpcbiAgICAgIGNhc2UgJ0NvbW1lbnRTdGF0ZW1lbnQnOlxuICAgICAgY2FzZSAnVGV4dE5vZGUnOlxuICAgICAgY2FzZSAnRWxlbWVudE5vZGUnOlxuICAgICAgY2FzZSAnQXR0ck5vZGUnOlxuICAgICAgY2FzZSAnQmxvY2snOlxuICAgICAgY2FzZSAnVGVtcGxhdGUnOlxuICAgICAgICByZXR1cm4gdGhpcy5Ub3BMZXZlbFN0YXRlbWVudChub2RlKTtcbiAgICAgIGNhc2UgJ1N0cmluZ0xpdGVyYWwnOlxuICAgICAgY2FzZSAnQm9vbGVhbkxpdGVyYWwnOlxuICAgICAgY2FzZSAnTnVtYmVyTGl0ZXJhbCc6XG4gICAgICBjYXNlICdVbmRlZmluZWRMaXRlcmFsJzpcbiAgICAgIGNhc2UgJ051bGxMaXRlcmFsJzpcbiAgICAgIGNhc2UgJ1BhdGhFeHByZXNzaW9uJzpcbiAgICAgIGNhc2UgJ1N1YkV4cHJlc3Npb24nOlxuICAgICAgICByZXR1cm4gdGhpcy5FeHByZXNzaW9uKG5vZGUpO1xuICAgICAgY2FzZSAnUHJvZ3JhbSc6XG4gICAgICAgIHJldHVybiB0aGlzLkJsb2NrKG5vZGUpO1xuICAgICAgY2FzZSAnQ29uY2F0U3RhdGVtZW50JzpcbiAgICAgICAgLy8gc2hvdWxkIGhhdmUgYW4gQXR0ck5vZGUgcGFyZW50XG4gICAgICAgIHJldHVybiB0aGlzLkNvbmNhdFN0YXRlbWVudChub2RlKTtcbiAgICAgIGNhc2UgJ0hhc2gnOlxuICAgICAgICByZXR1cm4gdGhpcy5IYXNoKG5vZGUpO1xuICAgICAgY2FzZSAnSGFzaFBhaXInOlxuICAgICAgICByZXR1cm4gdGhpcy5IYXNoUGFpcihub2RlKTtcbiAgICAgIGNhc2UgJ0VsZW1lbnRNb2RpZmllclN0YXRlbWVudCc6XG4gICAgICAgIHJldHVybiB0aGlzLkVsZW1lbnRNb2RpZmllclN0YXRlbWVudChub2RlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdW5yZWFjaGFibGUobm9kZSwgJ05vZGUnKTtcbiAgfVxuXG4gIEV4cHJlc3Npb24oZXhwcmVzc2lvbjogRXhwcmVzc2lvbik6IHZvaWQge1xuICAgIHN3aXRjaCAoZXhwcmVzc2lvbi50eXBlKSB7XG4gICAgICBjYXNlICdTdHJpbmdMaXRlcmFsJzpcbiAgICAgIGNhc2UgJ0Jvb2xlYW5MaXRlcmFsJzpcbiAgICAgIGNhc2UgJ051bWJlckxpdGVyYWwnOlxuICAgICAgY2FzZSAnVW5kZWZpbmVkTGl0ZXJhbCc6XG4gICAgICBjYXNlICdOdWxsTGl0ZXJhbCc6XG4gICAgICAgIHJldHVybiB0aGlzLkxpdGVyYWwoZXhwcmVzc2lvbik7XG4gICAgICBjYXNlICdQYXRoRXhwcmVzc2lvbic6XG4gICAgICAgIHJldHVybiB0aGlzLlBhdGhFeHByZXNzaW9uKGV4cHJlc3Npb24pO1xuICAgICAgY2FzZSAnU3ViRXhwcmVzc2lvbic6XG4gICAgICAgIHJldHVybiB0aGlzLlN1YkV4cHJlc3Npb24oZXhwcmVzc2lvbik7XG4gICAgfVxuICAgIHJldHVybiB1bnJlYWNoYWJsZShleHByZXNzaW9uLCAnRXhwcmVzc2lvbicpO1xuICB9XG5cbiAgTGl0ZXJhbChsaXRlcmFsOiBMaXRlcmFsKSB7XG4gICAgc3dpdGNoIChsaXRlcmFsLnR5cGUpIHtcbiAgICAgIGNhc2UgJ1N0cmluZ0xpdGVyYWwnOlxuICAgICAgICByZXR1cm4gdGhpcy5TdHJpbmdMaXRlcmFsKGxpdGVyYWwpO1xuICAgICAgY2FzZSAnQm9vbGVhbkxpdGVyYWwnOlxuICAgICAgICByZXR1cm4gdGhpcy5Cb29sZWFuTGl0ZXJhbChsaXRlcmFsKTtcbiAgICAgIGNhc2UgJ051bWJlckxpdGVyYWwnOlxuICAgICAgICByZXR1cm4gdGhpcy5OdW1iZXJMaXRlcmFsKGxpdGVyYWwpO1xuICAgICAgY2FzZSAnVW5kZWZpbmVkTGl0ZXJhbCc6XG4gICAgICAgIHJldHVybiB0aGlzLlVuZGVmaW5lZExpdGVyYWwobGl0ZXJhbCk7XG4gICAgICBjYXNlICdOdWxsTGl0ZXJhbCc6XG4gICAgICAgIHJldHVybiB0aGlzLk51bGxMaXRlcmFsKGxpdGVyYWwpO1xuICAgIH1cbiAgICByZXR1cm4gdW5yZWFjaGFibGUobGl0ZXJhbCwgJ0xpdGVyYWwnKTtcbiAgfVxuXG4gIFRvcExldmVsU3RhdGVtZW50KHN0YXRlbWVudDogVG9wTGV2ZWxTdGF0ZW1lbnQpIHtcbiAgICBzd2l0Y2ggKHN0YXRlbWVudC50eXBlKSB7XG4gICAgICBjYXNlICdNdXN0YWNoZVN0YXRlbWVudCc6XG4gICAgICAgIHJldHVybiB0aGlzLk11c3RhY2hlU3RhdGVtZW50KHN0YXRlbWVudCk7XG4gICAgICBjYXNlICdCbG9ja1N0YXRlbWVudCc6XG4gICAgICAgIHJldHVybiB0aGlzLkJsb2NrU3RhdGVtZW50KHN0YXRlbWVudCk7XG4gICAgICBjYXNlICdQYXJ0aWFsU3RhdGVtZW50JzpcbiAgICAgICAgcmV0dXJuIHRoaXMuUGFydGlhbFN0YXRlbWVudChzdGF0ZW1lbnQpO1xuICAgICAgY2FzZSAnTXVzdGFjaGVDb21tZW50U3RhdGVtZW50JzpcbiAgICAgICAgcmV0dXJuIHRoaXMuTXVzdGFjaGVDb21tZW50U3RhdGVtZW50KHN0YXRlbWVudCk7XG4gICAgICBjYXNlICdDb21tZW50U3RhdGVtZW50JzpcbiAgICAgICAgcmV0dXJuIHRoaXMuQ29tbWVudFN0YXRlbWVudChzdGF0ZW1lbnQpO1xuICAgICAgY2FzZSAnVGV4dE5vZGUnOlxuICAgICAgICByZXR1cm4gdGhpcy5UZXh0Tm9kZShzdGF0ZW1lbnQpO1xuICAgICAgY2FzZSAnRWxlbWVudE5vZGUnOlxuICAgICAgICByZXR1cm4gdGhpcy5FbGVtZW50Tm9kZShzdGF0ZW1lbnQpO1xuICAgICAgY2FzZSAnQmxvY2snOlxuICAgICAgY2FzZSAnVGVtcGxhdGUnOlxuICAgICAgICByZXR1cm4gdGhpcy5CbG9jayhzdGF0ZW1lbnQpO1xuICAgICAgY2FzZSAnQXR0ck5vZGUnOlxuICAgICAgICAvLyBzaG91bGQgaGF2ZSBlbGVtZW50XG4gICAgICAgIHJldHVybiB0aGlzLkF0dHJOb2RlKHN0YXRlbWVudCk7XG4gICAgfVxuICAgIHVucmVhY2hhYmxlKHN0YXRlbWVudCwgJ1RvcExldmVsU3RhdGVtZW50Jyk7XG4gIH1cblxuICBCbG9jayhibG9jazogQmxvY2sgfCBQcm9ncmFtIHwgVGVtcGxhdGUpOiB2b2lkIHtcbiAgICAvKlxuICAgICAgV2hlbiBwcm9jZXNzaW5nIGEgdGVtcGxhdGUgbGlrZTpcblxuICAgICAgYGBgaGJzXG4gICAgICB7eyNpZiB3aGF0ZXZlcn19XG4gICAgICAgIHdoYXRldmVyXG4gICAgICB7e2Vsc2UgaWYgc29tZXRoaW5nRWxzZX19XG4gICAgICAgIHNvbWV0aGluZyBlbHNlXG4gICAgICB7e2Vsc2V9fVxuICAgICAgICBmYWxsYmFja1xuICAgICAge3svaWZ9fVxuICAgICAgYGBgXG5cbiAgICAgIFRoZSBBU1Qgc3RpbGwgX2VmZmVjdGl2ZWx5XyBsb29rcyBsaWtlOlxuXG4gICAgICBgYGBoYnNcbiAgICAgIHt7I2lmIHdoYXRldmVyfX1cbiAgICAgICAgd2hhdGV2ZXJcbiAgICAgIHt7ZWxzZX19e3sjaWYgc29tZXRoaW5nRWxzZX19XG4gICAgICAgIHNvbWV0aGluZyBlbHNlXG4gICAgICB7e2Vsc2V9fVxuICAgICAgICBmYWxsYmFja1xuICAgICAge3svaWZ9fXt7L2lmfX1cbiAgICAgIGBgYFxuXG4gICAgICBUaGUgb25seSB3YXkgd2UgY2FuIHRlbGwgaWYgdGhhdCBpcyB0aGUgY2FzZSBpcyBieSBjaGVja2luZyBmb3JcbiAgICAgIGBibG9jay5jaGFpbmVkYCwgYnV0IHVuZm9ydHVuYXRlbHkgd2hlbiB0aGUgYWN0dWFsIHN0YXRlbWVudHMgYXJlXG4gICAgICBwcm9jZXNzZWQgdGhlIGBibG9jay5ib2R5WzBdYCBub2RlICh3aGljaCB3aWxsIGFsd2F5cyBiZSBhXG4gICAgICBgQmxvY2tTdGF0ZW1lbnRgKSBoYXMgbm8gY2x1ZSB0aGF0IGl0cyBhbnNjZXN0b3IgYEJsb2NrYCBub2RlIHdhc1xuICAgICAgY2hhaW5lZC5cblxuICAgICAgVGhpcyBcImZvcndhcmRzXCIgdGhlIGBjaGFpbmVkYCBzZXR0aW5nIHNvIHRoYXQgd2UgY2FuIGNoZWNrXG4gICAgICBpdCBsYXRlciB3aGVuIHByb2Nlc3NpbmcgdGhlIGBCbG9ja1N0YXRlbWVudGAuXG4gICAgKi9cbiAgICBpZiAoYmxvY2suY2hhaW5lZCkge1xuICAgICAgbGV0IGZpcnN0Q2hpbGQgPSBibG9jay5ib2R5WzBdIGFzIEJsb2NrU3RhdGVtZW50O1xuICAgICAgZmlyc3RDaGlsZC5jaGFpbmVkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5oYW5kbGVkQnlPdmVycmlkZShibG9jaykpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLlRvcExldmVsU3RhdGVtZW50cyhibG9jay5ib2R5KTtcbiAgfVxuXG4gIFRvcExldmVsU3RhdGVtZW50cyhzdGF0ZW1lbnRzOiBUb3BMZXZlbFN0YXRlbWVudFtdKSB7XG4gICAgc3RhdGVtZW50cy5mb3JFYWNoKChzdGF0ZW1lbnQpID0+IHRoaXMuVG9wTGV2ZWxTdGF0ZW1lbnQoc3RhdGVtZW50KSk7XG4gIH1cblxuICBFbGVtZW50Tm9kZShlbDogRWxlbWVudE5vZGUpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5oYW5kbGVkQnlPdmVycmlkZShlbCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLk9wZW5FbGVtZW50Tm9kZShlbCk7XG4gICAgdGhpcy5Ub3BMZXZlbFN0YXRlbWVudHMoZWwuY2hpbGRyZW4pO1xuICAgIHRoaXMuQ2xvc2VFbGVtZW50Tm9kZShlbCk7XG4gIH1cblxuICBPcGVuRWxlbWVudE5vZGUoZWw6IEVsZW1lbnROb2RlKTogdm9pZCB7XG4gICAgdGhpcy5idWZmZXIgKz0gYDwke2VsLnRhZ31gO1xuICAgIGNvbnN0IHBhcnRzID0gWy4uLmVsLmF0dHJpYnV0ZXMsIC4uLmVsLm1vZGlmaWVycywgLi4uZWwuY29tbWVudHNdLnNvcnQoc29ydEJ5TG9jKTtcblxuICAgIGZvciAoY29uc3QgcGFydCBvZiBwYXJ0cykge1xuICAgICAgdGhpcy5idWZmZXIgKz0gJyAnO1xuICAgICAgc3dpdGNoIChwYXJ0LnR5cGUpIHtcbiAgICAgICAgY2FzZSAnQXR0ck5vZGUnOlxuICAgICAgICAgIHRoaXMuQXR0ck5vZGUocGFydCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ0VsZW1lbnRNb2RpZmllclN0YXRlbWVudCc6XG4gICAgICAgICAgdGhpcy5FbGVtZW50TW9kaWZpZXJTdGF0ZW1lbnQocGFydCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ011c3RhY2hlQ29tbWVudFN0YXRlbWVudCc6XG4gICAgICAgICAgdGhpcy5NdXN0YWNoZUNvbW1lbnRTdGF0ZW1lbnQocGFydCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChlbC5ibG9ja1BhcmFtcy5sZW5ndGgpIHtcbiAgICAgIHRoaXMuQmxvY2tQYXJhbXMoZWwuYmxvY2tQYXJhbXMpO1xuICAgIH1cbiAgICBpZiAoZWwuc2VsZkNsb3NpbmcpIHtcbiAgICAgIHRoaXMuYnVmZmVyICs9ICcgLyc7XG4gICAgfVxuICAgIHRoaXMuYnVmZmVyICs9ICc+JztcbiAgfVxuXG4gIENsb3NlRWxlbWVudE5vZGUoZWw6IEVsZW1lbnROb2RlKTogdm9pZCB7XG4gICAgaWYgKGVsLnNlbGZDbG9zaW5nIHx8IHZvaWRNYXBbZWwudGFnLnRvTG93ZXJDYXNlKCldKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuYnVmZmVyICs9IGA8LyR7ZWwudGFnfT5gO1xuICB9XG5cbiAgQXR0ck5vZGUoYXR0cjogQXR0ck5vZGUpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5oYW5kbGVkQnlPdmVycmlkZShhdHRyKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxldCB7IG5hbWUsIHZhbHVlIH0gPSBhdHRyO1xuXG4gICAgdGhpcy5idWZmZXIgKz0gbmFtZTtcbiAgICBpZiAodmFsdWUudHlwZSAhPT0gJ1RleHROb2RlJyB8fCB2YWx1ZS5jaGFycy5sZW5ndGggPiAwKSB7XG4gICAgICB0aGlzLmJ1ZmZlciArPSAnPSc7XG4gICAgICB0aGlzLkF0dHJOb2RlVmFsdWUodmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIEF0dHJOb2RlVmFsdWUodmFsdWU6IEF0dHJOb2RlWyd2YWx1ZSddKSB7XG4gICAgaWYgKHZhbHVlLnR5cGUgPT09ICdUZXh0Tm9kZScpIHtcbiAgICAgIHRoaXMuYnVmZmVyICs9ICdcIic7XG4gICAgICB0aGlzLlRleHROb2RlKHZhbHVlLCB0cnVlKTtcbiAgICAgIHRoaXMuYnVmZmVyICs9ICdcIic7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuTm9kZSh2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgVGV4dE5vZGUodGV4dDogVGV4dE5vZGUsIGlzQXR0cj86IGJvb2xlYW4pOiB2b2lkIHtcbiAgICBpZiAodGhpcy5oYW5kbGVkQnlPdmVycmlkZSh0ZXh0KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuZW50aXR5RW5jb2RpbmcgPT09ICdyYXcnKSB7XG4gICAgICB0aGlzLmJ1ZmZlciArPSB0ZXh0LmNoYXJzO1xuICAgIH0gZWxzZSBpZiAoaXNBdHRyKSB7XG4gICAgICB0aGlzLmJ1ZmZlciArPSBlc2NhcGVBdHRyVmFsdWUodGV4dC5jaGFycyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuYnVmZmVyICs9IGVzY2FwZVRleHQodGV4dC5jaGFycyk7XG4gICAgfVxuICB9XG5cbiAgTXVzdGFjaGVTdGF0ZW1lbnQobXVzdGFjaGU6IE11c3RhY2hlU3RhdGVtZW50KTogdm9pZCB7XG4gICAgaWYgKHRoaXMuaGFuZGxlZEJ5T3ZlcnJpZGUobXVzdGFjaGUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5idWZmZXIgKz0gbXVzdGFjaGUuZXNjYXBlZCA/ICd7eycgOiAne3t7JztcblxuICAgIGlmIChtdXN0YWNoZS5zdHJpcC5vcGVuKSB7XG4gICAgICB0aGlzLmJ1ZmZlciArPSAnfic7XG4gICAgfVxuXG4gICAgdGhpcy5FeHByZXNzaW9uKG11c3RhY2hlLnBhdGgpO1xuICAgIHRoaXMuUGFyYW1zKG11c3RhY2hlLnBhcmFtcyk7XG4gICAgdGhpcy5IYXNoKG11c3RhY2hlLmhhc2gpO1xuXG4gICAgaWYgKG11c3RhY2hlLnN0cmlwLmNsb3NlKSB7XG4gICAgICB0aGlzLmJ1ZmZlciArPSAnfic7XG4gICAgfVxuXG4gICAgdGhpcy5idWZmZXIgKz0gbXVzdGFjaGUuZXNjYXBlZCA/ICd9fScgOiAnfX19JztcbiAgfVxuXG4gIEJsb2NrU3RhdGVtZW50KGJsb2NrOiBCbG9ja1N0YXRlbWVudCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmhhbmRsZWRCeU92ZXJyaWRlKGJsb2NrKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChibG9jay5jaGFpbmVkKSB7XG4gICAgICB0aGlzLmJ1ZmZlciArPSBibG9jay5pbnZlcnNlU3RyaXAub3BlbiA/ICd7e34nIDogJ3t7JztcbiAgICAgIHRoaXMuYnVmZmVyICs9ICdlbHNlICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuYnVmZmVyICs9IGJsb2NrLm9wZW5TdHJpcC5vcGVuID8gJ3t7fiMnIDogJ3t7Iyc7XG4gICAgfVxuXG4gICAgdGhpcy5FeHByZXNzaW9uKGJsb2NrLnBhdGgpO1xuICAgIHRoaXMuUGFyYW1zKGJsb2NrLnBhcmFtcyk7XG4gICAgdGhpcy5IYXNoKGJsb2NrLmhhc2gpO1xuICAgIGlmIChibG9jay5wcm9ncmFtLmJsb2NrUGFyYW1zLmxlbmd0aCkge1xuICAgICAgdGhpcy5CbG9ja1BhcmFtcyhibG9jay5wcm9ncmFtLmJsb2NrUGFyYW1zKTtcbiAgICB9XG5cbiAgICBpZiAoYmxvY2suY2hhaW5lZCkge1xuICAgICAgdGhpcy5idWZmZXIgKz0gYmxvY2suaW52ZXJzZVN0cmlwLmNsb3NlID8gJ359fScgOiAnfX0nO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmJ1ZmZlciArPSBibG9jay5vcGVuU3RyaXAuY2xvc2UgPyAnfn19JyA6ICd9fSc7XG4gICAgfVxuXG4gICAgdGhpcy5CbG9jayhibG9jay5wcm9ncmFtKTtcblxuICAgIGlmIChibG9jay5pbnZlcnNlKSB7XG4gICAgICBpZiAoIWJsb2NrLmludmVyc2UuY2hhaW5lZCkge1xuICAgICAgICB0aGlzLmJ1ZmZlciArPSBibG9jay5pbnZlcnNlU3RyaXAub3BlbiA/ICd7e34nIDogJ3t7JztcbiAgICAgICAgdGhpcy5idWZmZXIgKz0gJ2Vsc2UnO1xuICAgICAgICB0aGlzLmJ1ZmZlciArPSBibG9jay5pbnZlcnNlU3RyaXAuY2xvc2UgPyAnfn19JyA6ICd9fSc7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuQmxvY2soYmxvY2suaW52ZXJzZSk7XG4gICAgfVxuXG4gICAgaWYgKCFibG9jay5jaGFpbmVkKSB7XG4gICAgICB0aGlzLmJ1ZmZlciArPSBibG9jay5jbG9zZVN0cmlwLm9wZW4gPyAne3t+LycgOiAne3svJztcbiAgICAgIHRoaXMuRXhwcmVzc2lvbihibG9jay5wYXRoKTtcbiAgICAgIHRoaXMuYnVmZmVyICs9IGJsb2NrLmNsb3NlU3RyaXAuY2xvc2UgPyAnfn19JyA6ICd9fSc7XG4gICAgfVxuICB9XG5cbiAgQmxvY2tQYXJhbXMoYmxvY2tQYXJhbXM6IHN0cmluZ1tdKSB7XG4gICAgdGhpcy5idWZmZXIgKz0gYCBhcyB8JHtibG9ja1BhcmFtcy5qb2luKCcgJyl9fGA7XG4gIH1cblxuICBQYXJ0aWFsU3RhdGVtZW50KHBhcnRpYWw6IFBhcnRpYWxTdGF0ZW1lbnQpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5oYW5kbGVkQnlPdmVycmlkZShwYXJ0aWFsKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuYnVmZmVyICs9ICd7ez4nO1xuICAgIHRoaXMuRXhwcmVzc2lvbihwYXJ0aWFsLm5hbWUpO1xuICAgIHRoaXMuUGFyYW1zKHBhcnRpYWwucGFyYW1zKTtcbiAgICB0aGlzLkhhc2gocGFydGlhbC5oYXNoKTtcbiAgICB0aGlzLmJ1ZmZlciArPSAnfX0nO1xuICB9XG5cbiAgQ29uY2F0U3RhdGVtZW50KGNvbmNhdDogQ29uY2F0U3RhdGVtZW50KTogdm9pZCB7XG4gICAgaWYgKHRoaXMuaGFuZGxlZEJ5T3ZlcnJpZGUoY29uY2F0KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuYnVmZmVyICs9ICdcIic7XG4gICAgY29uY2F0LnBhcnRzLmZvckVhY2goKHBhcnQpID0+IHtcbiAgICAgIGlmIChwYXJ0LnR5cGUgPT09ICdUZXh0Tm9kZScpIHtcbiAgICAgICAgdGhpcy5UZXh0Tm9kZShwYXJ0LCB0cnVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuTm9kZShwYXJ0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLmJ1ZmZlciArPSAnXCInO1xuICB9XG5cbiAgTXVzdGFjaGVDb21tZW50U3RhdGVtZW50KGNvbW1lbnQ6IE11c3RhY2hlQ29tbWVudFN0YXRlbWVudCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmhhbmRsZWRCeU92ZXJyaWRlKGNvbW1lbnQpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5idWZmZXIgKz0gYHt7IS0tJHtjb21tZW50LnZhbHVlfS0tfX1gO1xuICB9XG5cbiAgRWxlbWVudE1vZGlmaWVyU3RhdGVtZW50KG1vZDogRWxlbWVudE1vZGlmaWVyU3RhdGVtZW50KTogdm9pZCB7XG4gICAgaWYgKHRoaXMuaGFuZGxlZEJ5T3ZlcnJpZGUobW9kKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuYnVmZmVyICs9ICd7eyc7XG4gICAgdGhpcy5FeHByZXNzaW9uKG1vZC5wYXRoKTtcbiAgICB0aGlzLlBhcmFtcyhtb2QucGFyYW1zKTtcbiAgICB0aGlzLkhhc2gobW9kLmhhc2gpO1xuICAgIHRoaXMuYnVmZmVyICs9ICd9fSc7XG4gIH1cblxuICBDb21tZW50U3RhdGVtZW50KGNvbW1lbnQ6IENvbW1lbnRTdGF0ZW1lbnQpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5oYW5kbGVkQnlPdmVycmlkZShjb21tZW50KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuYnVmZmVyICs9IGA8IS0tJHtjb21tZW50LnZhbHVlfS0tPmA7XG4gIH1cblxuICBQYXRoRXhwcmVzc2lvbihwYXRoOiBQYXRoRXhwcmVzc2lvbik6IHZvaWQge1xuICAgIGlmICh0aGlzLmhhbmRsZWRCeU92ZXJyaWRlKHBhdGgpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5idWZmZXIgKz0gcGF0aC5vcmlnaW5hbDtcbiAgfVxuXG4gIFN1YkV4cHJlc3Npb24oc2V4cDogU3ViRXhwcmVzc2lvbik6IHZvaWQge1xuICAgIGlmICh0aGlzLmhhbmRsZWRCeU92ZXJyaWRlKHNleHApKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5idWZmZXIgKz0gJygnO1xuICAgIHRoaXMuRXhwcmVzc2lvbihzZXhwLnBhdGgpO1xuICAgIHRoaXMuUGFyYW1zKHNleHAucGFyYW1zKTtcbiAgICB0aGlzLkhhc2goc2V4cC5oYXNoKTtcbiAgICB0aGlzLmJ1ZmZlciArPSAnKSc7XG4gIH1cblxuICBQYXJhbXMocGFyYW1zOiBFeHByZXNzaW9uW10pIHtcbiAgICAvLyBUT0RPOiBpbXBsZW1lbnQgYSB0b3AgbGV2ZWwgUGFyYW1zIEFTVCBub2RlIChqdXN0IGxpa2UgdGhlIEhhc2ggb2JqZWN0KVxuICAgIC8vIHNvIHRoYXQgdGhpcyBjYW4gYWxzbyBiZSBvdmVycmlkZGVuXG4gICAgaWYgKHBhcmFtcy5sZW5ndGgpIHtcbiAgICAgIHBhcmFtcy5mb3JFYWNoKChwYXJhbSkgPT4ge1xuICAgICAgICB0aGlzLmJ1ZmZlciArPSAnICc7XG4gICAgICAgIHRoaXMuRXhwcmVzc2lvbihwYXJhbSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBIYXNoKGhhc2g6IEhhc2gpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5oYW5kbGVkQnlPdmVycmlkZShoYXNoLCB0cnVlKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGhhc2gucGFpcnMuZm9yRWFjaCgocGFpcikgPT4ge1xuICAgICAgdGhpcy5idWZmZXIgKz0gJyAnO1xuICAgICAgdGhpcy5IYXNoUGFpcihwYWlyKTtcbiAgICB9KTtcbiAgfVxuXG4gIEhhc2hQYWlyKHBhaXI6IEhhc2hQYWlyKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuaGFuZGxlZEJ5T3ZlcnJpZGUocGFpcikpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmJ1ZmZlciArPSBwYWlyLmtleTtcbiAgICB0aGlzLmJ1ZmZlciArPSAnPSc7XG4gICAgdGhpcy5Ob2RlKHBhaXIudmFsdWUpO1xuICB9XG5cbiAgU3RyaW5nTGl0ZXJhbChzdHI6IFN0cmluZ0xpdGVyYWwpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5oYW5kbGVkQnlPdmVycmlkZShzdHIpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5idWZmZXIgKz0gSlNPTi5zdHJpbmdpZnkoc3RyLnZhbHVlKTtcbiAgfVxuXG4gIEJvb2xlYW5MaXRlcmFsKGJvb2w6IEJvb2xlYW5MaXRlcmFsKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuaGFuZGxlZEJ5T3ZlcnJpZGUoYm9vbCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmJ1ZmZlciArPSBib29sLnZhbHVlO1xuICB9XG5cbiAgTnVtYmVyTGl0ZXJhbChudW1iZXI6IE51bWJlckxpdGVyYWwpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5oYW5kbGVkQnlPdmVycmlkZShudW1iZXIpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5idWZmZXIgKz0gbnVtYmVyLnZhbHVlO1xuICB9XG5cbiAgVW5kZWZpbmVkTGl0ZXJhbChub2RlOiBVbmRlZmluZWRMaXRlcmFsKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuaGFuZGxlZEJ5T3ZlcnJpZGUobm9kZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmJ1ZmZlciArPSAndW5kZWZpbmVkJztcbiAgfVxuXG4gIE51bGxMaXRlcmFsKG5vZGU6IE51bGxMaXRlcmFsKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuaGFuZGxlZEJ5T3ZlcnJpZGUobm9kZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmJ1ZmZlciArPSAnbnVsbCc7XG4gIH1cblxuICBwcmludChub2RlOiBOb2RlKSB7XG4gICAgbGV0IHsgb3B0aW9ucyB9ID0gdGhpcztcblxuICAgIGlmIChvcHRpb25zLm92ZXJyaWRlKSB7XG4gICAgICBsZXQgcmVzdWx0ID0gb3B0aW9ucy5vdmVycmlkZShub2RlLCBvcHRpb25zKTtcblxuICAgICAgaWYgKHJlc3VsdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5idWZmZXIgPSAnJztcbiAgICB0aGlzLk5vZGUobm9kZSk7XG4gICAgcmV0dXJuIHRoaXMuYnVmZmVyO1xuICB9XG59XG5cbmZ1bmN0aW9uIHVucmVhY2hhYmxlKG5vZGU6IG5ldmVyLCBwYXJlbnROb2RlVHlwZTogc3RyaW5nKTogbmV2ZXIge1xuICBsZXQgeyBsb2MsIHR5cGUgfSA9IChub2RlIGFzIGFueSkgYXMgTm9kZTtcbiAgdGhyb3cgbmV3IEVycm9yKFxuICAgIGBOb24tZXhoYXVzdGl2ZSBub2RlIG5hcnJvd2luZyAke3R5cGV9IEAgbG9jYXRpb246ICR7SlNPTi5zdHJpbmdpZnkoXG4gICAgICBsb2NcbiAgICApfSBmb3IgcGFyZW50ICR7cGFyZW50Tm9kZVR5cGV9YFxuICApO1xufVxuIiwiaW1wb3J0IHsgTm9kZSB9IGZyb20gJy4uL3R5cGVzL25vZGVzJztcbmltcG9ydCBQcmludGVyLCB7IFByaW50ZXJPcHRpb25zIH0gZnJvbSAnLi9wcmludGVyJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gYnVpbGQoXG4gIGFzdDogTm9kZSxcbiAgb3B0aW9uczogUHJpbnRlck9wdGlvbnMgPSB7IGVudGl0eUVuY29kaW5nOiAndHJhbnNmb3JtZWQnIH1cbik6IHN0cmluZyB7XG4gIGlmICghYXN0KSB7XG4gICAgcmV0dXJuICcnO1xuICB9XG5cbiAgbGV0IHByaW50ZXIgPSBuZXcgUHJpbnRlcihvcHRpb25zKTtcbiAgcmV0dXJuIHByaW50ZXIucHJpbnQoYXN0KTtcbn1cbiIsImltcG9ydCB7IE9wdGlvbiB9IGZyb20gJ0BnbGltbWVyL2ludGVyZmFjZXMnO1xuaW1wb3J0ICogYXMgQVNUIGZyb20gJy4uL3R5cGVzL25vZGVzJztcblxuZXhwb3J0IHR5cGUgTm9kZUNhbGxiYWNrPE4gZXh0ZW5kcyBBU1QuTm9kZT4gPSAobm9kZTogTiwgd2Fsa2VyOiBXYWxrZXIpID0+IHZvaWQ7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFdhbGtlciB7XG4gIHB1YmxpYyBzdGFjazogYW55W10gPSBbXTtcbiAgY29uc3RydWN0b3IocHVibGljIG9yZGVyPzogYW55KSB7fVxuXG4gIHZpc2l0PE4gZXh0ZW5kcyBBU1QuTm9kZT4obm9kZTogT3B0aW9uPE4+LCBjYWxsYmFjazogTm9kZUNhbGxiYWNrPE4+KSB7XG4gICAgaWYgKCFub2RlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5zdGFjay5wdXNoKG5vZGUpO1xuXG4gICAgaWYgKHRoaXMub3JkZXIgPT09ICdwb3N0Jykge1xuICAgICAgdGhpcy5jaGlsZHJlbihub2RlLCBjYWxsYmFjayk7XG4gICAgICBjYWxsYmFjayhub2RlLCB0aGlzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2FsbGJhY2sobm9kZSwgdGhpcyk7XG4gICAgICB0aGlzLmNoaWxkcmVuKG5vZGUsIGNhbGxiYWNrKTtcbiAgICB9XG5cbiAgICB0aGlzLnN0YWNrLnBvcCgpO1xuICB9XG5cbiAgY2hpbGRyZW4obm9kZTogYW55LCBjYWxsYmFjazogYW55KSB7XG4gICAgbGV0IHR5cGU7XG4gICAgaWYgKG5vZGUudHlwZSA9PT0gJ0Jsb2NrJyB8fCAobm9kZS50eXBlID09PSAnVGVtcGxhdGUnICYmIHZpc2l0b3JzLlByb2dyYW0pKSB7XG4gICAgICB0eXBlID0gJ1Byb2dyYW0nO1xuICAgIH0gZWxzZSB7XG4gICAgICB0eXBlID0gbm9kZS50eXBlO1xuICAgIH1cblxuICAgIGxldCB2aXNpdG9yID0gKHZpc2l0b3JzIGFzIGFueSlbdHlwZV07XG4gICAgaWYgKHZpc2l0b3IpIHtcbiAgICAgIHZpc2l0b3IodGhpcywgbm9kZSwgY2FsbGJhY2spO1xuICAgIH1cbiAgfVxufVxuXG5sZXQgdmlzaXRvcnMgPSB7XG4gIFByb2dyYW0od2Fsa2VyOiBXYWxrZXIsIG5vZGU6IEFTVC5Qcm9ncmFtLCBjYWxsYmFjazogTm9kZUNhbGxiYWNrPEFTVC5Ob2RlPikge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbm9kZS5ib2R5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICB3YWxrZXIudmlzaXQobm9kZS5ib2R5W2ldLCBjYWxsYmFjayk7XG4gICAgfVxuICB9LFxuXG4gIFRlbXBsYXRlKHdhbGtlcjogV2Fsa2VyLCBub2RlOiBBU1QuVGVtcGxhdGUsIGNhbGxiYWNrOiBOb2RlQ2FsbGJhY2s8QVNULk5vZGU+KSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2RlLmJvZHkubGVuZ3RoOyBpKyspIHtcbiAgICAgIHdhbGtlci52aXNpdChub2RlLmJvZHlbaV0sIGNhbGxiYWNrKTtcbiAgICB9XG4gIH0sXG5cbiAgQmxvY2sod2Fsa2VyOiBXYWxrZXIsIG5vZGU6IEFTVC5CbG9jaywgY2FsbGJhY2s6IE5vZGVDYWxsYmFjazxBU1QuTm9kZT4pIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5vZGUuYm9keS5sZW5ndGg7IGkrKykge1xuICAgICAgd2Fsa2VyLnZpc2l0KG5vZGUuYm9keVtpXSwgY2FsbGJhY2spO1xuICAgIH1cbiAgfSxcblxuICBFbGVtZW50Tm9kZSh3YWxrZXI6IFdhbGtlciwgbm9kZTogQVNULkVsZW1lbnROb2RlLCBjYWxsYmFjazogTm9kZUNhbGxiYWNrPEFTVC5Ob2RlPikge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbm9kZS5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgd2Fsa2VyLnZpc2l0KG5vZGUuY2hpbGRyZW5baV0sIGNhbGxiYWNrKTtcbiAgICB9XG4gIH0sXG5cbiAgQmxvY2tTdGF0ZW1lbnQod2Fsa2VyOiBXYWxrZXIsIG5vZGU6IEFTVC5CbG9ja1N0YXRlbWVudCwgY2FsbGJhY2s6IE5vZGVDYWxsYmFjazxBU1QuQmxvY2s+KSB7XG4gICAgd2Fsa2VyLnZpc2l0KG5vZGUucHJvZ3JhbSwgY2FsbGJhY2spO1xuICAgIHdhbGtlci52aXNpdChub2RlLmludmVyc2UgfHwgbnVsbCwgY2FsbGJhY2spO1xuICB9LFxufTtcbiIsImltcG9ydCBiLCB7IFNZTlRIRVRJQyB9IGZyb20gJy4uL2J1aWxkZXJzJztcbmltcG9ydCB7IGFwcGVuZENoaWxkLCBwYXJzZUVsZW1lbnRCbG9ja1BhcmFtcyB9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7IEhhbmRsZWJhcnNOb2RlVmlzaXRvcnMgfSBmcm9tICcuL2hhbmRsZWJhcnMtbm9kZS12aXNpdG9ycyc7XG5pbXBvcnQgKiBhcyBBU1QgZnJvbSAnLi4vdHlwZXMvbm9kZXMnO1xuaW1wb3J0ICogYXMgSEJTIGZyb20gJy4uL3R5cGVzL2hhbmRsZWJhcnMtYXN0JztcbmltcG9ydCBTeW50YXhFcnJvciBmcm9tICcuLi9lcnJvcnMvc3ludGF4LWVycm9yJztcbmltcG9ydCB7IFRhZyB9IGZyb20gJy4uL3BhcnNlcic7XG5pbXBvcnQgYnVpbGRlcnMgZnJvbSAnLi4vYnVpbGRlcnMnO1xuaW1wb3J0IHRyYXZlcnNlIGZyb20gJy4uL3RyYXZlcnNhbC90cmF2ZXJzZSc7XG5pbXBvcnQgcHJpbnQgZnJvbSAnLi4vZ2VuZXJhdGlvbi9wcmludCc7XG5pbXBvcnQgV2Fsa2VyIGZyb20gJy4uL3RyYXZlcnNhbC93YWxrZXInO1xuaW1wb3J0IHsgcGFyc2UsIHBhcnNlV2l0aG91dFByb2Nlc3NpbmcgfSBmcm9tICdAaGFuZGxlYmFycy9wYXJzZXInO1xuaW1wb3J0IHsgYXNzaWduIH0gZnJvbSAnQGdsaW1tZXIvdXRpbCc7XG5pbXBvcnQgeyBOb2RlVmlzaXRvciB9IGZyb20gJy4uL3RyYXZlcnNhbC92aXNpdG9yJztcbmltcG9ydCB7IEVudGl0eVBhcnNlciB9IGZyb20gJ3NpbXBsZS1odG1sLXRva2VuaXplcic7XG5cbmV4cG9ydCBjb25zdCB2b2lkTWFwOiB7XG4gIFt0YWdOYW1lOiBzdHJpbmddOiBib29sZWFuO1xufSA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbmxldCB2b2lkVGFnTmFtZXMgPVxuICAnYXJlYSBiYXNlIGJyIGNvbCBjb21tYW5kIGVtYmVkIGhyIGltZyBpbnB1dCBrZXlnZW4gbGluayBtZXRhIHBhcmFtIHNvdXJjZSB0cmFjayB3YnInO1xudm9pZFRhZ05hbWVzLnNwbGl0KCcgJykuZm9yRWFjaCgodGFnTmFtZSkgPT4ge1xuICB2b2lkTWFwW3RhZ05hbWVdID0gdHJ1ZTtcbn0pO1xuXG5leHBvcnQgY2xhc3MgVG9rZW5pemVyRXZlbnRIYW5kbGVycyBleHRlbmRzIEhhbmRsZWJhcnNOb2RlVmlzaXRvcnMge1xuICBwcml2YXRlIHRhZ09wZW5MaW5lID0gMDtcbiAgcHJpdmF0ZSB0YWdPcGVuQ29sdW1uID0gMDtcblxuICByZXNldCgpIHtcbiAgICB0aGlzLmN1cnJlbnROb2RlID0gbnVsbDtcbiAgfVxuXG4gIC8vIENvbW1lbnRcblxuICBiZWdpbkNvbW1lbnQoKSB7XG4gICAgdGhpcy5jdXJyZW50Tm9kZSA9IGIuY29tbWVudCgnJyk7XG4gICAgdGhpcy5jdXJyZW50Tm9kZS5sb2MgPSB7XG4gICAgICBzb3VyY2U6IG51bGwsXG4gICAgICBzdGFydDogYi5wb3ModGhpcy50YWdPcGVuTGluZSwgdGhpcy50YWdPcGVuQ29sdW1uKSxcbiAgICAgIGVuZDogKG51bGwgYXMgYW55KSBhcyBBU1QuUG9zaXRpb24sXG4gICAgfTtcbiAgfVxuXG4gIGFwcGVuZFRvQ29tbWVudERhdGEoY2hhcjogc3RyaW5nKSB7XG4gICAgdGhpcy5jdXJyZW50Q29tbWVudC52YWx1ZSArPSBjaGFyO1xuICB9XG5cbiAgZmluaXNoQ29tbWVudCgpIHtcbiAgICB0aGlzLmN1cnJlbnRDb21tZW50LmxvYy5lbmQgPSBiLnBvcyh0aGlzLnRva2VuaXplci5saW5lLCB0aGlzLnRva2VuaXplci5jb2x1bW4pO1xuXG4gICAgYXBwZW5kQ2hpbGQodGhpcy5jdXJyZW50RWxlbWVudCgpLCB0aGlzLmN1cnJlbnRDb21tZW50KTtcbiAgfVxuXG4gIC8vIERhdGFcblxuICBiZWdpbkRhdGEoKSB7XG4gICAgdGhpcy5jdXJyZW50Tm9kZSA9IGIudGV4dCgpO1xuICAgIHRoaXMuY3VycmVudE5vZGUubG9jID0ge1xuICAgICAgc291cmNlOiBudWxsLFxuICAgICAgc3RhcnQ6IGIucG9zKHRoaXMudG9rZW5pemVyLmxpbmUsIHRoaXMudG9rZW5pemVyLmNvbHVtbiksXG4gICAgICBlbmQ6IChudWxsIGFzIGFueSkgYXMgQVNULlBvc2l0aW9uLFxuICAgIH07XG4gIH1cblxuICBhcHBlbmRUb0RhdGEoY2hhcjogc3RyaW5nKSB7XG4gICAgdGhpcy5jdXJyZW50RGF0YS5jaGFycyArPSBjaGFyO1xuICB9XG5cbiAgZmluaXNoRGF0YSgpIHtcbiAgICB0aGlzLmN1cnJlbnREYXRhLmxvYy5lbmQgPSBiLnBvcyh0aGlzLnRva2VuaXplci5saW5lLCB0aGlzLnRva2VuaXplci5jb2x1bW4pO1xuXG4gICAgYXBwZW5kQ2hpbGQodGhpcy5jdXJyZW50RWxlbWVudCgpLCB0aGlzLmN1cnJlbnREYXRhKTtcbiAgfVxuXG4gIC8vIFRhZ3MgLSBiYXNpY1xuXG4gIHRhZ09wZW4oKSB7XG4gICAgdGhpcy50YWdPcGVuTGluZSA9IHRoaXMudG9rZW5pemVyLmxpbmU7XG4gICAgdGhpcy50YWdPcGVuQ29sdW1uID0gdGhpcy50b2tlbml6ZXIuY29sdW1uO1xuICB9XG5cbiAgYmVnaW5TdGFydFRhZygpIHtcbiAgICB0aGlzLmN1cnJlbnROb2RlID0ge1xuICAgICAgdHlwZTogJ1N0YXJ0VGFnJyxcbiAgICAgIG5hbWU6ICcnLFxuICAgICAgYXR0cmlidXRlczogW10sXG4gICAgICBtb2RpZmllcnM6IFtdLFxuICAgICAgY29tbWVudHM6IFtdLFxuICAgICAgc2VsZkNsb3Npbmc6IGZhbHNlLFxuICAgICAgbG9jOiBTWU5USEVUSUMsXG4gICAgfTtcbiAgfVxuXG4gIGJlZ2luRW5kVGFnKCkge1xuICAgIHRoaXMuY3VycmVudE5vZGUgPSB7XG4gICAgICB0eXBlOiAnRW5kVGFnJyxcbiAgICAgIG5hbWU6ICcnLFxuICAgICAgYXR0cmlidXRlczogW10sXG4gICAgICBtb2RpZmllcnM6IFtdLFxuICAgICAgY29tbWVudHM6IFtdLFxuICAgICAgc2VsZkNsb3Npbmc6IGZhbHNlLFxuICAgICAgbG9jOiBTWU5USEVUSUMsXG4gICAgfTtcbiAgfVxuXG4gIGZpbmlzaFRhZygpIHtcbiAgICBsZXQgeyBsaW5lLCBjb2x1bW4gfSA9IHRoaXMudG9rZW5pemVyO1xuXG4gICAgbGV0IHRhZyA9IHRoaXMuY3VycmVudFRhZztcbiAgICB0YWcubG9jID0gYi5sb2ModGhpcy50YWdPcGVuTGluZSwgdGhpcy50YWdPcGVuQ29sdW1uLCBsaW5lLCBjb2x1bW4pO1xuXG4gICAgaWYgKHRhZy50eXBlID09PSAnU3RhcnRUYWcnKSB7XG4gICAgICB0aGlzLmZpbmlzaFN0YXJ0VGFnKCk7XG5cbiAgICAgIGlmICh2b2lkTWFwW3RhZy5uYW1lXSB8fCB0YWcuc2VsZkNsb3NpbmcpIHtcbiAgICAgICAgdGhpcy5maW5pc2hFbmRUYWcodHJ1ZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0YWcudHlwZSA9PT0gJ0VuZFRhZycpIHtcbiAgICAgIHRoaXMuZmluaXNoRW5kVGFnKGZhbHNlKTtcbiAgICB9XG4gIH1cblxuICBmaW5pc2hTdGFydFRhZygpIHtcbiAgICBsZXQgeyBuYW1lLCBhdHRyaWJ1dGVzOiBhdHRycywgbW9kaWZpZXJzLCBjb21tZW50cywgc2VsZkNsb3NpbmcgfSA9IHRoaXMuY3VycmVudFN0YXJ0VGFnO1xuICAgIGxldCBsb2MgPSBiLmxvYyh0aGlzLnRhZ09wZW5MaW5lLCB0aGlzLnRhZ09wZW5Db2x1bW4pO1xuICAgIGxldCBlbGVtZW50ID0gYi5lbGVtZW50KHsgbmFtZSwgc2VsZkNsb3NpbmcgfSwgeyBhdHRycywgbW9kaWZpZXJzLCBjb21tZW50cywgbG9jIH0pO1xuICAgIHRoaXMuZWxlbWVudFN0YWNrLnB1c2goZWxlbWVudCk7XG4gIH1cblxuICBmaW5pc2hFbmRUYWcoaXNWb2lkOiBib29sZWFuKSB7XG4gICAgbGV0IHRhZyA9IHRoaXMuY3VycmVudFRhZztcblxuICAgIGxldCBlbGVtZW50ID0gdGhpcy5lbGVtZW50U3RhY2sucG9wKCkgYXMgQVNULkVsZW1lbnROb2RlO1xuICAgIGxldCBwYXJlbnQgPSB0aGlzLmN1cnJlbnRFbGVtZW50KCk7XG5cbiAgICB2YWxpZGF0ZUVuZFRhZyh0YWcsIGVsZW1lbnQsIGlzVm9pZCk7XG5cbiAgICBlbGVtZW50LmxvYy5lbmQubGluZSA9IHRoaXMudG9rZW5pemVyLmxpbmU7XG4gICAgZWxlbWVudC5sb2MuZW5kLmNvbHVtbiA9IHRoaXMudG9rZW5pemVyLmNvbHVtbjtcblxuICAgIHBhcnNlRWxlbWVudEJsb2NrUGFyYW1zKGVsZW1lbnQpO1xuICAgIGFwcGVuZENoaWxkKHBhcmVudCwgZWxlbWVudCk7XG4gIH1cblxuICBtYXJrVGFnQXNTZWxmQ2xvc2luZygpIHtcbiAgICB0aGlzLmN1cnJlbnRUYWcuc2VsZkNsb3NpbmcgPSB0cnVlO1xuICB9XG5cbiAgLy8gVGFncyAtIG5hbWVcblxuICBhcHBlbmRUb1RhZ05hbWUoY2hhcjogc3RyaW5nKSB7XG4gICAgdGhpcy5jdXJyZW50VGFnLm5hbWUgKz0gY2hhcjtcbiAgfVxuXG4gIC8vIFRhZ3MgLSBhdHRyaWJ1dGVzXG5cbiAgYmVnaW5BdHRyaWJ1dGUoKSB7XG4gICAgbGV0IHRhZyA9IHRoaXMuY3VycmVudFRhZztcbiAgICBpZiAodGFnLnR5cGUgPT09ICdFbmRUYWcnKSB7XG4gICAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoXG4gICAgICAgIGBJbnZhbGlkIGVuZCB0YWc6IGNsb3NpbmcgdGFnIG11c3Qgbm90IGhhdmUgYXR0cmlidXRlcywgYCArXG4gICAgICAgICAgYGluIFxcYCR7dGFnLm5hbWV9XFxgIChvbiBsaW5lICR7dGhpcy50b2tlbml6ZXIubGluZX0pLmAsXG4gICAgICAgIHRhZy5sb2NcbiAgICAgICk7XG4gICAgfVxuXG4gICAgdGhpcy5jdXJyZW50QXR0cmlidXRlID0ge1xuICAgICAgbmFtZTogJycsXG4gICAgICBwYXJ0czogW10sXG4gICAgICBpc1F1b3RlZDogZmFsc2UsXG4gICAgICBpc0R5bmFtaWM6IGZhbHNlLFxuICAgICAgc3RhcnQ6IGIucG9zKHRoaXMudG9rZW5pemVyLmxpbmUsIHRoaXMudG9rZW5pemVyLmNvbHVtbiksXG4gICAgICB2YWx1ZVN0YXJ0TGluZTogMCxcbiAgICAgIHZhbHVlU3RhcnRDb2x1bW46IDAsXG4gICAgfTtcbiAgfVxuXG4gIGFwcGVuZFRvQXR0cmlidXRlTmFtZShjaGFyOiBzdHJpbmcpIHtcbiAgICB0aGlzLmN1cnJlbnRBdHRyLm5hbWUgKz0gY2hhcjtcbiAgfVxuXG4gIGJlZ2luQXR0cmlidXRlVmFsdWUoaXNRdW90ZWQ6IGJvb2xlYW4pIHtcbiAgICB0aGlzLmN1cnJlbnRBdHRyLmlzUXVvdGVkID0gaXNRdW90ZWQ7XG4gICAgdGhpcy5jdXJyZW50QXR0ci52YWx1ZVN0YXJ0TGluZSA9IHRoaXMudG9rZW5pemVyLmxpbmU7XG4gICAgdGhpcy5jdXJyZW50QXR0ci52YWx1ZVN0YXJ0Q29sdW1uID0gdGhpcy50b2tlbml6ZXIuY29sdW1uO1xuICB9XG5cbiAgYXBwZW5kVG9BdHRyaWJ1dGVWYWx1ZShjaGFyOiBzdHJpbmcpIHtcbiAgICBsZXQgcGFydHMgPSB0aGlzLmN1cnJlbnRBdHRyLnBhcnRzO1xuICAgIGxldCBsYXN0UGFydCA9IHBhcnRzW3BhcnRzLmxlbmd0aCAtIDFdO1xuXG4gICAgaWYgKGxhc3RQYXJ0ICYmIGxhc3RQYXJ0LnR5cGUgPT09ICdUZXh0Tm9kZScpIHtcbiAgICAgIGxhc3RQYXJ0LmNoYXJzICs9IGNoYXI7XG5cbiAgICAgIC8vIHVwZGF0ZSBlbmQgbG9jYXRpb24gZm9yIGVhY2ggYWRkZWQgY2hhclxuICAgICAgbGFzdFBhcnQubG9jLmVuZC5saW5lID0gdGhpcy50b2tlbml6ZXIubGluZTtcbiAgICAgIGxhc3RQYXJ0LmxvYy5lbmQuY29sdW1uID0gdGhpcy50b2tlbml6ZXIuY29sdW1uO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBpbml0aWFsbHkgYXNzdW1lIHRoZSB0ZXh0IG5vZGUgaXMgYSBzaW5nbGUgY2hhclxuICAgICAgbGV0IGxvYyA9IGIubG9jKFxuICAgICAgICB0aGlzLnRva2VuaXplci5saW5lLFxuICAgICAgICB0aGlzLnRva2VuaXplci5jb2x1bW4sXG4gICAgICAgIHRoaXMudG9rZW5pemVyLmxpbmUsXG4gICAgICAgIHRoaXMudG9rZW5pemVyLmNvbHVtblxuICAgICAgKTtcblxuICAgICAgLy8gdGhlIHRva2VuaXplciBsaW5lL2NvbHVtbiBoYXZlIGFscmVhZHkgYmVlbiBhZHZhbmNlZCwgY29ycmVjdCBsb2NhdGlvbiBpbmZvXG4gICAgICBpZiAoY2hhciA9PT0gJ1xcbicpIHtcbiAgICAgICAgbG9jLnN0YXJ0LmxpbmUgLT0gMTtcbiAgICAgICAgbG9jLnN0YXJ0LmNvbHVtbiA9IGxhc3RQYXJ0ID8gbGFzdFBhcnQubG9jLmVuZC5jb2x1bW4gOiB0aGlzLmN1cnJlbnRBdHRyLnZhbHVlU3RhcnRDb2x1bW47XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2Muc3RhcnQuY29sdW1uIC09IDE7XG4gICAgICB9XG5cbiAgICAgIGxldCB0ZXh0ID0gYi50ZXh0KGNoYXIsIGxvYyk7XG4gICAgICBwYXJ0cy5wdXNoKHRleHQpO1xuICAgIH1cbiAgfVxuXG4gIGZpbmlzaEF0dHJpYnV0ZVZhbHVlKCkge1xuICAgIGxldCB7IG5hbWUsIHBhcnRzLCBpc1F1b3RlZCwgaXNEeW5hbWljLCB2YWx1ZVN0YXJ0TGluZSwgdmFsdWVTdGFydENvbHVtbiB9ID0gdGhpcy5jdXJyZW50QXR0cjtcbiAgICBsZXQgdmFsdWUgPSBhc3NlbWJsZUF0dHJpYnV0ZVZhbHVlKHBhcnRzLCBpc1F1b3RlZCwgaXNEeW5hbWljLCB0aGlzLnRva2VuaXplci5saW5lKTtcbiAgICB2YWx1ZS5sb2MgPSBiLmxvYyh2YWx1ZVN0YXJ0TGluZSwgdmFsdWVTdGFydENvbHVtbiwgdGhpcy50b2tlbml6ZXIubGluZSwgdGhpcy50b2tlbml6ZXIuY29sdW1uKTtcblxuICAgIGxldCBsb2MgPSBiLmxvYyhcbiAgICAgIHRoaXMuY3VycmVudEF0dHIuc3RhcnQubGluZSxcbiAgICAgIHRoaXMuY3VycmVudEF0dHIuc3RhcnQuY29sdW1uLFxuICAgICAgdGhpcy50b2tlbml6ZXIubGluZSxcbiAgICAgIHRoaXMudG9rZW5pemVyLmNvbHVtblxuICAgICk7XG5cbiAgICBsZXQgYXR0cmlidXRlID0gYi5hdHRyKG5hbWUsIHZhbHVlLCBsb2MpO1xuXG4gICAgdGhpcy5jdXJyZW50U3RhcnRUYWcuYXR0cmlidXRlcy5wdXNoKGF0dHJpYnV0ZSk7XG4gIH1cblxuICByZXBvcnRTeW50YXhFcnJvcihtZXNzYWdlOiBzdHJpbmcpIHtcbiAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoXG4gICAgICBgU3ludGF4IGVycm9yIGF0IGxpbmUgJHt0aGlzLnRva2VuaXplci5saW5lfSBjb2wgJHt0aGlzLnRva2VuaXplci5jb2x1bW59OiAke21lc3NhZ2V9YCxcbiAgICAgIGIubG9jKHRoaXMudG9rZW5pemVyLmxpbmUsIHRoaXMudG9rZW5pemVyLmNvbHVtbilcbiAgICApO1xuICB9XG59XG5cbmZ1bmN0aW9uIGFzc2VtYmxlQXR0cmlidXRlVmFsdWUoXG4gIHBhcnRzOiAoQVNULk11c3RhY2hlU3RhdGVtZW50IHwgQVNULlRleHROb2RlKVtdLFxuICBpc1F1b3RlZDogYm9vbGVhbixcbiAgaXNEeW5hbWljOiBib29sZWFuLFxuICBsaW5lOiBudW1iZXJcbikge1xuICBpZiAoaXNEeW5hbWljKSB7XG4gICAgaWYgKGlzUXVvdGVkKSB7XG4gICAgICByZXR1cm4gYXNzZW1ibGVDb25jYXRlbmF0ZWRWYWx1ZShwYXJ0cyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChcbiAgICAgICAgcGFydHMubGVuZ3RoID09PSAxIHx8XG4gICAgICAgIChwYXJ0cy5sZW5ndGggPT09IDIgJiZcbiAgICAgICAgICBwYXJ0c1sxXS50eXBlID09PSAnVGV4dE5vZGUnICYmXG4gICAgICAgICAgKHBhcnRzWzFdIGFzIEFTVC5UZXh0Tm9kZSkuY2hhcnMgPT09ICcvJylcbiAgICAgICkge1xuICAgICAgICByZXR1cm4gcGFydHNbMF07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoXG4gICAgICAgICAgYEFuIHVucXVvdGVkIGF0dHJpYnV0ZSB2YWx1ZSBtdXN0IGJlIGEgc3RyaW5nIG9yIGEgbXVzdGFjaGUsIGAgK1xuICAgICAgICAgICAgYHByZWNlZWRlZCBieSB3aGl0ZXNwYWNlIG9yIGEgJz0nIGNoYXJhY3RlciwgYW5kIGAgK1xuICAgICAgICAgICAgYGZvbGxvd2VkIGJ5IHdoaXRlc3BhY2UsIGEgJz4nIGNoYXJhY3Rlciwgb3IgJy8+JyAob24gbGluZSAke2xpbmV9KWAsXG4gICAgICAgICAgYi5sb2MobGluZSwgMClcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHBhcnRzLmxlbmd0aCA+IDAgPyBwYXJ0c1swXSA6IGIudGV4dCgnJyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gYXNzZW1ibGVDb25jYXRlbmF0ZWRWYWx1ZShwYXJ0czogKEFTVC5NdXN0YWNoZVN0YXRlbWVudCB8IEFTVC5UZXh0Tm9kZSlbXSkge1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgbGV0IHBhcnQ6IEFTVC5CYXNlTm9kZSA9IHBhcnRzW2ldO1xuXG4gICAgaWYgKHBhcnQudHlwZSAhPT0gJ011c3RhY2hlU3RhdGVtZW50JyAmJiBwYXJ0LnR5cGUgIT09ICdUZXh0Tm9kZScpIHtcbiAgICAgIHRocm93IG5ldyBTeW50YXhFcnJvcihcbiAgICAgICAgJ1Vuc3VwcG9ydGVkIG5vZGUgaW4gcXVvdGVkIGF0dHJpYnV0ZSB2YWx1ZTogJyArIHBhcnRbJ3R5cGUnXSxcbiAgICAgICAgcGFydC5sb2NcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGIuY29uY2F0KHBhcnRzKTtcbn1cblxuZnVuY3Rpb24gdmFsaWRhdGVFbmRUYWcoXG4gIHRhZzogVGFnPCdTdGFydFRhZycgfCAnRW5kVGFnJz4sXG4gIGVsZW1lbnQ6IEFTVC5FbGVtZW50Tm9kZSxcbiAgc2VsZkNsb3Npbmc6IGJvb2xlYW5cbikge1xuICBsZXQgZXJyb3I7XG5cbiAgaWYgKHZvaWRNYXBbdGFnLm5hbWVdICYmICFzZWxmQ2xvc2luZykge1xuICAgIC8vIEVuZ1RhZyBpcyBhbHNvIGNhbGxlZCBieSBTdGFydFRhZyBmb3Igdm9pZCBhbmQgc2VsZi1jbG9zaW5nIHRhZ3MgKGkuZS5cbiAgICAvLyA8aW5wdXQ+IG9yIDxiciAvPiwgc28gd2UgbmVlZCB0byBjaGVjayBmb3IgdGhhdCBoZXJlLiBPdGhlcndpc2UsIHdlIHdvdWxkXG4gICAgLy8gdGhyb3cgYW4gZXJyb3IgZm9yIHRob3NlIGNhc2VzLlxuICAgIGVycm9yID0gJ0ludmFsaWQgZW5kIHRhZyAnICsgZm9ybWF0RW5kVGFnSW5mbyh0YWcpICsgJyAodm9pZCBlbGVtZW50cyBjYW5ub3QgaGF2ZSBlbmQgdGFncykuJztcbiAgfSBlbHNlIGlmIChlbGVtZW50LnRhZyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgZXJyb3IgPSAnQ2xvc2luZyB0YWcgJyArIGZvcm1hdEVuZFRhZ0luZm8odGFnKSArICcgd2l0aG91dCBhbiBvcGVuIHRhZy4nO1xuICB9IGVsc2UgaWYgKGVsZW1lbnQudGFnICE9PSB0YWcubmFtZSkge1xuICAgIGVycm9yID1cbiAgICAgICdDbG9zaW5nIHRhZyAnICtcbiAgICAgIGZvcm1hdEVuZFRhZ0luZm8odGFnKSArXG4gICAgICAnIGRpZCBub3QgbWF0Y2ggbGFzdCBvcGVuIHRhZyBgJyArXG4gICAgICBlbGVtZW50LnRhZyArXG4gICAgICAnYCAob24gbGluZSAnICtcbiAgICAgIGVsZW1lbnQubG9jLnN0YXJ0LmxpbmUgK1xuICAgICAgJykuJztcbiAgfVxuXG4gIGlmIChlcnJvcikge1xuICAgIHRocm93IG5ldyBTeW50YXhFcnJvcihlcnJvciwgZWxlbWVudC5sb2MpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGZvcm1hdEVuZFRhZ0luZm8odGFnOiBUYWc8J1N0YXJ0VGFnJyB8ICdFbmRUYWcnPikge1xuICByZXR1cm4gJ2AnICsgdGFnLm5hbWUgKyAnYCAob24gbGluZSAnICsgdGFnLmxvYy5lbmQubGluZSArICcpJztcbn1cblxuLyoqXG4gIEFTVFBsdWdpbnMgY2FuIG1ha2UgY2hhbmdlcyB0byB0aGUgR2xpbW1lciB0ZW1wbGF0ZSBBU1QgYmVmb3JlXG4gIGNvbXBpbGF0aW9uIGJlZ2lucy5cbiovXG5leHBvcnQgaW50ZXJmYWNlIEFTVFBsdWdpbkJ1aWxkZXIge1xuICAoZW52OiBBU1RQbHVnaW5FbnZpcm9ubWVudCk6IEFTVFBsdWdpbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBU1RQbHVnaW4ge1xuICBuYW1lOiBzdHJpbmc7XG4gIHZpc2l0b3I6IE5vZGVWaXNpdG9yO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEFTVFBsdWdpbkVudmlyb25tZW50IHtcbiAgbWV0YT86IG9iamVjdDtcbiAgc3ludGF4OiBTeW50YXg7XG59XG5pbnRlcmZhY2UgSGFuZGxlYmFyc1BhcnNlT3B0aW9ucyB7XG4gIHNyY05hbWU/OiBzdHJpbmc7XG4gIGlnbm9yZVN0YW5kYWxvbmU/OiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFByZXByb2Nlc3NPcHRpb25zIHtcbiAgbWV0YT86IHtcbiAgICBtb2R1bGVOYW1lPzogc3RyaW5nO1xuICB9O1xuICBwbHVnaW5zPzoge1xuICAgIGFzdD86IEFTVFBsdWdpbkJ1aWxkZXJbXTtcbiAgfTtcbiAgcGFyc2VPcHRpb25zPzogSGFuZGxlYmFyc1BhcnNlT3B0aW9ucztcblxuICAvKipcbiAgICBVc2VmdWwgZm9yIHNwZWNpZnlpbmcgYSBncm91cCBvZiBvcHRpb25zIHRvZ2V0aGVyLlxuXG4gICAgV2hlbiBgJ2NvZGVtb2QnYCB3ZSBkaXNhYmxlIGFsbCB3aGl0ZXNwYWNlIGNvbnRyb2wgaW4gaGFuZGxlYmFyc1xuICAgICh0byBwcmVzZXJ2ZSBhcyBtdWNoIGFzIHBvc3NpYmxlKSBhbmQgd2UgYWxzbyBhdm9pZCBhbnlcbiAgICBlc2NhcGluZy91bmVzY2FwaW5nIG9mIEhUTUwgZW50aXR5IGNvZGVzLlxuICAgKi9cbiAgbW9kZT86ICdjb2RlbW9kJyB8ICdwcmVjb21waWxlJztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTeW50YXgge1xuICBwYXJzZTogdHlwZW9mIHByZXByb2Nlc3M7XG4gIGJ1aWxkZXJzOiB0eXBlb2YgYnVpbGRlcnM7XG4gIHByaW50OiB0eXBlb2YgcHJpbnQ7XG4gIHRyYXZlcnNlOiB0eXBlb2YgdHJhdmVyc2U7XG4gIFdhbGtlcjogdHlwZW9mIFdhbGtlcjtcbn1cblxuY29uc3Qgc3ludGF4OiBTeW50YXggPSB7XG4gIHBhcnNlOiBwcmVwcm9jZXNzLFxuICBidWlsZGVycyxcbiAgcHJpbnQsXG4gIHRyYXZlcnNlLFxuICBXYWxrZXIsXG59O1xuXG5leHBvcnQgZnVuY3Rpb24gcHJlcHJvY2VzcyhodG1sOiBzdHJpbmcsIG9wdGlvbnM6IFByZXByb2Nlc3NPcHRpb25zID0ge30pOiBBU1QuVGVtcGxhdGUge1xuICBsZXQgbW9kZSA9IG9wdGlvbnMubW9kZSB8fCAncHJlY29tcGlsZSc7XG5cbiAgbGV0IGFzdDogSEJTLlByb2dyYW07XG4gIGlmICh0eXBlb2YgaHRtbCA9PT0gJ29iamVjdCcpIHtcbiAgICBhc3QgPSBodG1sO1xuICB9IGVsc2UgaWYgKG1vZGUgPT09ICdjb2RlbW9kJykge1xuICAgIGFzdCA9IHBhcnNlV2l0aG91dFByb2Nlc3NpbmcoaHRtbCwgb3B0aW9ucy5wYXJzZU9wdGlvbnMpIGFzIEhCUy5Qcm9ncmFtO1xuICB9IGVsc2Uge1xuICAgIGFzdCA9IHBhcnNlKGh0bWwsIG9wdGlvbnMucGFyc2VPcHRpb25zKSBhcyBIQlMuUHJvZ3JhbTtcbiAgfVxuXG4gIGxldCBlbnRpdHlQYXJzZXIgPSB1bmRlZmluZWQ7XG4gIGlmIChtb2RlID09PSAnY29kZW1vZCcpIHtcbiAgICBlbnRpdHlQYXJzZXIgPSBuZXcgRW50aXR5UGFyc2VyKHt9KTtcbiAgfVxuXG4gIGxldCBwcm9ncmFtID0gbmV3IFRva2VuaXplckV2ZW50SGFuZGxlcnMoaHRtbCwgZW50aXR5UGFyc2VyLCBtb2RlKS5hY2NlcHRUZW1wbGF0ZShhc3QpO1xuXG4gIGlmIChvcHRpb25zICYmIG9wdGlvbnMucGx1Z2lucyAmJiBvcHRpb25zLnBsdWdpbnMuYXN0KSB7XG4gICAgZm9yIChsZXQgaSA9IDAsIGwgPSBvcHRpb25zLnBsdWdpbnMuYXN0Lmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgbGV0IHRyYW5zZm9ybSA9IG9wdGlvbnMucGx1Z2lucy5hc3RbaV07XG4gICAgICBsZXQgZW52OiBBU1RQbHVnaW5FbnZpcm9ubWVudCA9IGFzc2lnbih7fSwgb3B0aW9ucywgeyBzeW50YXggfSwgeyBwbHVnaW5zOiB1bmRlZmluZWQgfSk7XG5cbiAgICAgIGxldCBwbHVnaW5SZXN1bHQgPSB0cmFuc2Zvcm0oZW52KTtcblxuICAgICAgdHJhdmVyc2UocHJvZ3JhbSwgcGx1Z2luUmVzdWx0LnZpc2l0b3IpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBwcm9ncmFtO1xufVxuIl0sIm5hbWVzIjpbImFzc2lnbiIsIkVudGl0eVBhcnNlciIsIm5hbWVkQ2hhclJlZnMiLCJFdmVudGVkVG9rZW5pemVyIiwiYiIsInR1cGxlIiwicHJpbnQiLCJwYXJzZVdpdGhvdXRQcm9jZXNzaW5nIiwicGFyc2UiXSwibWFwcGluZ3MiOiI7O0VBV0EsU0FBQSxhQUFBLENBQUEsSUFBQSxFQUFBLE1BQUEsRUFBQSxJQUFBLEVBQUEsR0FBQSxFQUFBLEdBQUEsRUFBQSxLQUFBLEVBTXdCO0VBRXRCLE1BQUksT0FBQSxJQUFBLEtBQUosUUFBQSxFQUE4QjtFQUM1QixJQUFBLElBQUksR0FBRyxTQUFTLENBQWhCLElBQWdCLENBQWhCO0VBQ0Q7O0VBRUQsU0FBTztFQUNMLElBQUEsSUFBSSxFQURDLG1CQUFBO0VBRUwsSUFBQSxJQUZLLEVBRUwsSUFGSztFQUdMLElBQUEsTUFBTSxFQUFFLE1BQU0sSUFIVCxFQUFBO0VBSUwsSUFBQSxJQUFJLEVBQUUsSUFBSSxJQUFJLFNBQVMsQ0FKbEIsRUFJa0IsQ0FKbEI7RUFLTCxJQUFBLE9BQU8s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
