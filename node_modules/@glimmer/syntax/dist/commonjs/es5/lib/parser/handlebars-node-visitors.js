"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.HandlebarsNodeVisitors = void 0;

var _builders = _interopRequireDefault(require("../builders"));

var _utils = require("../utils");

var _parser = require("../parser");

var _syntaxError = _interopRequireDefault(require("../errors/syntax-error"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}

function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  return Constructor;
}

function _inheritsLoose(subClass, superClass) {
  subClass.prototype = Object.create(superClass.prototype);
  subClass.prototype.constructor = subClass;
  subClass.__proto__ = superClass;
}

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
      node = _builders.default.template(body, program.blockParams, program.loc);
    } else {
      node = _builders.default.blockItself(body, program.blockParams, program.chained, program.loc);
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
      throw new _syntaxError.default('Unclosed element `' + elementNode.tag + '` (on line ' + elementNode.loc.start.line + ').', elementNode.loc);
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
        throw new _syntaxError.default('A block may only be used inside an HTML element or another block.', block.loc);
      }

    var _acceptCallNodes = acceptCallNodes(this, block),
        path = _acceptCallNodes.path,
        params = _acceptCallNodes.params,
        hash = _acceptCallNodes.hash;

    var program = this.Program(block.program);
    var inverse = block.inverse ? this.Program(block.inverse) : null;

    var node = _builders.default.block(path, params, hash, program, inverse, block.loc, block.openStrip, block.inverseStrip, block.closeStrip);

    var parentProgram = this.currentElement();
    (0, _utils.appendChild)(parentProgram, node);
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

    if ((0, _utils.isLiteral)(rawMustache.path)) {
      mustache = {
        type: 'MustacheStatement',
        path: this.acceptNode(rawMustache.path),
        params: [],
        hash: _builders.default.hash(),
        escaped: escaped,
        loc: loc,
        strip: strip
      };
    } else {
      var _acceptCallNodes2 = acceptCallNodes(this, rawMustache),
          path = _acceptCallNodes2.path,
          params = _acceptCallNodes2.params,
          hash = _acceptCallNodes2.hash;

      mustache = _builders.default.mustache(path, params, hash, !escaped, loc, strip);
    }

    switch (tokenizer.state) {
      // Tag helpers
      case "tagOpen"
      /* tagOpen */
      :
      case "tagName"
      /* tagName */
      :
        throw new _syntaxError.default("Cannot use mustaches in an elements tagname: `" + this.sourceForNode(rawMustache, rawMustache.path) + "` at L" + loc.start.line + ":C" + loc.start.column, mustache.loc);

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
        (0, _utils.appendChild)(this.currentElement(), mustache);
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

    var comment = _builders.default.mustacheComment(value, loc);

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
        (0, _utils.appendChild)(this.currentElement(), comment);
        break;

      default:
        throw new _syntaxError.default("Using a Handlebars comment when in the `" + tokenizer['state'] + "` state is not supported: \"" + comment.value + "\" on line " + loc.start.line + ":" + loc.start.column, rawComment.loc);
    }

    return comment;
  };

  _proto.PartialStatement = function PartialStatement(partial) {
    var loc = partial.loc;
    throw new _syntaxError.default("Handlebars partials are not supported: \"" + this.sourceForNode(partial, partial.name) + "\" at L" + loc.start.line + ":C" + loc.start.column, partial.loc);
  };

  _proto.PartialBlockStatement = function PartialBlockStatement(partialBlock) {
    var loc = partialBlock.loc;
    throw new _syntaxError.default("Handlebars partial blocks are not supported: \"" + this.sourceForNode(partialBlock, partialBlock.name) + "\" at L" + loc.start.line + ":C" + loc.start.column, partialBlock.loc);
  };

  _proto.Decorator = function Decorator(decorator) {
    var loc = decorator.loc;
    throw new _syntaxError.default("Handlebars decorators are not supported: \"" + this.sourceForNode(decorator, decorator.path) + "\" at L" + loc.start.line + ":C" + loc.start.column, decorator.loc);
  };

  _proto.DecoratorBlock = function DecoratorBlock(decoratorBlock) {
    var loc = decoratorBlock.loc;
    throw new _syntaxError.default("Handlebars decorator blocks are not supported: \"" + this.sourceForNode(decoratorBlock, decoratorBlock.path) + "\" at L" + loc.start.line + ":C" + loc.start.column, decoratorBlock.loc);
  };

  _proto.SubExpression = function SubExpression(sexpr) {
    var _acceptCallNodes3 = acceptCallNodes(this, sexpr),
        path = _acceptCallNodes3.path,
        params = _acceptCallNodes3.params,
        hash = _acceptCallNodes3.hash;

    return _builders.default.sexpr(path, params, hash, sexpr.loc);
  };

  _proto.PathExpression = function PathExpression(path) {
    var original = path.original,
        loc = path.loc;
    var parts;

    if (original.indexOf('/') !== -1) {
      if (original.slice(0, 2) === './') {
        throw new _syntaxError.default("Using \"./\" is not supported in Glimmer and unnecessary: \"" + path.original + "\" on line " + loc.start.line + ".", path.loc);
      }

      if (original.slice(0, 3) === '../') {
        throw new _syntaxError.default("Changing context using \"../\" is not supported in Glimmer: \"" + path.original + "\" on line " + loc.start.line + ".", path.loc);
      }

      if (original.indexOf('.') !== -1) {
        throw new _syntaxError.default("Mixing '.' and '/' in paths is not supported in Glimmer; use only '.' to separate property paths: \"" + path.original + "\" on line " + loc.start.line + ".", path.loc);
      }

      parts = [path.parts.join('/')];
    } else if (original === '.') {
      var locationInfo = "L" + loc.start.line + ":C" + loc.start.column;
      throw new _syntaxError.default("'.' is not a supported path in Glimmer; check for a path with a trailing '.' at " + locationInfo + ".", path.loc);
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
      pairs.push(_builders.default.pair(pair.key, this.acceptNode(pair.value), pair.loc));
    }

    return _builders.default.hash(pairs, hash.loc);
  };

  _proto.StringLiteral = function StringLiteral(string) {
    return _builders.default.literal('StringLiteral', string.value, string.loc);
  };

  _proto.BooleanLiteral = function BooleanLiteral(_boolean) {
    return _builders.default.literal('BooleanLiteral', _boolean.value, _boolean.loc);
  };

  _proto.NumberLiteral = function NumberLiteral(number) {
    return _builders.default.literal('NumberLiteral', number.value, number.loc);
  };

  _proto.UndefinedLiteral = function UndefinedLiteral(undef) {
    return _builders.default.literal('UndefinedLiteral', undefined, undef.loc);
  };

  _proto.NullLiteral = function NullLiteral(nul) {
    return _builders.default.literal('NullLiteral', null, nul.loc);
  };

  _createClass(HandlebarsNodeVisitors, [{
    key: "isTopLevel",
    get: function get() {
      return this.elementStack.length === 0;
    }
  }]);

  return HandlebarsNodeVisitors;
}(_parser.Parser);

exports.HandlebarsNodeVisitors = HandlebarsNodeVisitors;

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
  var hash = node.hash ? compiler.Hash(node.hash) : _builders.default.hash();
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

  if ((0, _utils.isLiteral)(path)) {
    var _modifier = "{{" + (0, _utils.printLiteral)(path) + "}}";

    var tag = "<" + element.name + " ... " + _modifier + " ...";
    throw new _syntaxError.default("In " + tag + ", " + _modifier + " is not a valid modifier: \"" + path.original + "\" on line " + (loc && loc.start.line) + ".", mustache.loc);
  }

  var modifier = _builders.default.elementModifier(path, params, hash, loc);

  element.modifiers.push(modifier);
}

function appendDynamicAttributeValuePart(attribute, part) {
  attribute.isDynamic = true;
  attribute.parts.push(part);
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL0BnbGltbWVyL3N5bnRheC9saWIvcGFyc2VyL2hhbmRsZWJhcnMtbm9kZS12aXNpdG9ycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUE7O0FBQ0E7O0FBR0E7O0FBQ0E7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBS0EsSUFBTSxzQkFBTixHQUFBLGFBQUEsVUFBQSxPQUFBLEVBQUE7QUFBQSxFQUFBLGNBQUEsQ0FBQSxzQkFBQSxFQUFBLE9BQUEsQ0FBQTs7QUFBQSxXQUFBLHNCQUFBLEdBQUE7QUFBQSxXQUFBLE9BQUEsQ0FBQSxLQUFBLENBQUEsSUFBQSxFQUFBLFNBQUEsS0FBQSxJQUFBO0FBQUE7O0FBQUEsTUFBQSxNQUFBLEdBQUEsc0JBQUEsQ0FBQSxTQUFBOztBQUFBLEVBQUEsTUFBQSxDQUFBLE9BQUEsR0FZRSxTQUFBLE9BQUEsQ0FBQSxPQUFBLEVBQTRCO0FBQzFCLFFBQUksSUFBSSxHQUFSLEVBQUE7QUFDQSxRQUFBLElBQUE7O0FBRUEsUUFBSSxLQUFKLFVBQUEsRUFBcUI7QUFDbkIsTUFBQSxJQUFJLEdBQUcsa0JBQUEsUUFBQSxDQUFBLElBQUEsRUFBaUIsT0FBTyxDQUF4QixXQUFBLEVBQXNDLE9BQU8sQ0FBcEQsR0FBTyxDQUFQO0FBREYsS0FBQSxNQUVPO0FBQ0wsTUFBQSxJQUFJLEdBQUcsa0JBQUEsV0FBQSxDQUFBLElBQUEsRUFBb0IsT0FBTyxDQUEzQixXQUFBLEVBQXlDLE9BQU8sQ0FBaEQsT0FBQSxFQUEwRCxPQUFPLENBQXhFLEdBQU8sQ0FBUDtBQUNEOztBQUVELFFBQUEsQ0FBQTtBQUFBLFFBQ0UsQ0FBQyxHQUFHLE9BQU8sQ0FBUCxJQUFBLENBRE4sTUFBQTtBQUdBLFNBQUEsWUFBQSxDQUFBLElBQUEsQ0FBQSxJQUFBOztBQUVBLFFBQUksQ0FBQyxLQUFMLENBQUEsRUFBYTtBQUNYLGFBQU8sS0FBQSxZQUFBLENBQVAsR0FBTyxFQUFQO0FBQ0Q7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cnQgYiBmcm9tICcuLi9idWlsZGVycyc7XG5pbXBvcnQgeyBhcHBlbmRDaGlsZCwgaXNMaXRlcmFsLCBwcmludExpdGVyYWwgfSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQgKiBhcyBBU1QgZnJvbSAnLi4vdHlwZXMvbm9kZXMnO1xuaW1wb3J0ICogYXMgSEJTIGZyb20gJy4uL3R5cGVzL2hhbmRsZWJhcnMtYXN0JztcbmltcG9ydCB7IFBhcnNlciwgVGFnLCBBdHRyaWJ1dGUgfSBmcm9tICcuLi9wYXJzZXInO1xuaW1wb3J0IFN5bnRheEVycm9yIGZyb20gJy4uL2Vycm9ycy9zeW50YXgtZXJyb3InO1xuaW1wb3J0IHsgT3B0aW9uIH0gZnJvbSAnQGdsaW1tZXIvdXRpbCc7XG5pbXBvcnQgeyBSZWNhc3QgfSBmcm9tICdAZ2xpbW1lci9pbnRlcmZhY2VzJztcbmltcG9ydCB7IFRva2VuaXplclN0YXRlIH0gZnJvbSAnc2ltcGxlLWh0bWwtdG9rZW5pemVyJztcblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEhhbmRsZWJhcnNOb2RlVmlzaXRvcnMgZXh0ZW5kcyBQYXJzZXIge1xuICBhYnN0cmFjdCBhcHBlbmRUb0NvbW1lbnREYXRhKHM6IHN0cmluZyk6IHZvaWQ7XG4gIGFic3RyYWN0IGJlZ2luQXR0cmlidXRlVmFsdWUocXVvdGVkOiBib29sZWFuKTogdm9pZDtcbiAgYWJzdHJhY3QgZmluaXNoQXR0cmlidXRlVmFsdWUoKTogdm9pZDtcblxuICBwcml2YXRlIGdldCBpc1RvcExldmVsKCkge1xuICAgIHJldHVybiB0aGlzLmVsZW1lbnRTdGFjay5sZW5ndGggPT09IDA7XG4gIH1cblxuICBQcm9ncmFtKHByb2dyYW06IEhCUy5Qcm9ncmFtKTogQVNULkJsb2NrO1xuICBQcm9ncmFtKHByb2dyYW06IEhCUy5Qcm9ncmFtKTogQVNULlRlbXBsYXRlO1xuICBQcm9ncmFtKHByb2dyYW06IEhCUy5Qcm9ncmFtKTogQVNULlRlbXBsYXRlIHwgQVNULkJsb2NrO1xuICBQcm9ncmFtKHByb2dyYW06IEhCUy5Qcm9ncmFtKTogQVNULkJsb2NrIHwgQVNULlRlbXBsYXRlIHtcbiAgICBsZXQgYm9keTogQVNULlN0YXRlbWVudFtdID0gW107XG4gICAgbGV0IG5vZGU7XG5cbiAgICBpZiAodGhpcy5pc1RvcExldmVsKSB7XG4gICAgICBub2RlID0gYi50ZW1wbGF0ZShib2R5LCBwcm9ncmFtLmJsb2NrUGFyYW1zLCBwcm9ncmFtLmxvYyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5vZGUgPSBiLmJsb2NrSXRzZWxmKGJvZHksIHByb2dyYW0uYmxvY2tQYXJhbXMsIHByb2dyYW0uY2hhaW5lZCwgcHJvZ3JhbS5sb2MpO1xuICAgIH1cblxuICAgIGxldCBpLFxuICAgICAgbCA9IHByb2dyYW0uYm9keS5sZW5ndGg7XG5cbiAgICB0aGlzLmVsZW1lbnRTdGFjay5wdXNoKG5vZGUpO1xuXG4gICAgaWYgKGwgPT09IDApIHtcbiAgICAgIHJldHVybiB0aGlzLmVsZW1lbnRTdGFjay5wb3AoKSBhcyBBU1QuQmxvY2sgfCBBU1QuVGVtcGxhdGU7XG4gICAgfVxuXG4gICAgZm9yIChpID0gMDsgaSA8IGw7IGkrKykge1xuICAgICAgdGhpcy5hY2NlcHROb2RlKHByb2dyYW0uYm9keVtpXSk7XG4gICAgfVxuXG4gICAgLy8gRW5zdXJlIHRoYXQgdGhhdCB0aGUgZWxlbWVudCBzdGFjayBpcyBiYWxhbmNlZCBwcm9wZXJseS5cbiAgICBsZXQgcG9wcGVkTm9kZSA9IHRoaXMuZWxlbWVudFN0YWNrLnBvcCgpO1xuICAgIGlmIChwb3BwZWROb2RlICE9PSBub2RlKSB7XG4gICAgICBsZXQgZWxlbWVudE5vZGUgPSBwb3BwZWROb2RlIGFzIEFTVC5FbGVtZW50Tm9kZTtcblxuICAgICAgdGhyb3cgbmV3IFN5bnRheEVycm9yKFxuICAgICAgICAnVW5jbG9zZWQgZWxlbWVudCBgJyArIGVsZW1lbnROb2RlLnRhZyArICdgIChvbiBsaW5lICcgKyBlbGVtZW50Tm9kZS5sb2MhLnN0YXJ0LmxpbmUgKyAnKS4nLFxuICAgICAgICBlbGVtZW50Tm9kZS5sb2NcbiAgICAgICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cblxuICBCbG9ja1N0YXRlbWVudChibG9jazogSEJTLkJsb2NrU3RhdGVtZW50KTogQVNULkJsb2NrU3RhdGVtZW50IHwgdm9pZCB7XG4gICAgaWYgKHRoaXMudG9rZW5pemVyLnN0YXRlID09PSBUb2tlbml6ZXJTdGF0ZS5jb21tZW50KSB7XG4gICAgICB0aGlzLmFwcGVuZFRvQ29tbWVudERhdGEodGhpcy5zb3VyY2VGb3JOb2RlKGJsb2NrKSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKFxuICAgICAgdGhpcy50b2tlbml6ZXIuc3RhdGUgIT09IFRva2VuaXplclN0YXRlLmRhdGEgJiZcbiAgICAgIHRoaXMudG9rZW5pemVyWydzdGF0ZSddICE9PSBUb2tlbml6ZXJTdGF0ZS5iZWZvcmVEYXRhXG4gICAgKSB7XG4gICAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoXG4gICAgICAgICdBIGJsb2NrIG1heSBvbmx5IGJlIHVzZWQgaW5zaWRlIGFuIEhUTUwgZWxlbWVudCBvciBhbm90aGVyIGJsb2NrLicsXG4gICAgICAgIGJsb2NrLmxvY1xuICAgICAgKTtcbiAgICB9XG5cbiAgICBsZXQgeyBwYXRoLCBwYXJhbXMsIGhhc2ggfSA9IGFjY2VwdENhbGxOb2Rlcyh0aGlzLCBibG9jayk7XG4gICAgbGV0IHByb2dyYW0gPSB0aGlzLlByb2dyYW0oYmxvY2sucHJvZ3JhbSk7XG4gICAgbGV0IGludmVyc2UgPSBibG9jay5pbnZlcnNlID8gdGhpcy5Qcm9ncmFtKGJsb2NrLmludmVyc2UpIDogbnVsbDtcblxuICAgIGxldCBub2RlID0gYi5ibG9jayhcbiAgICAgIHBhdGgsXG4gICAgICBwYXJhbXMsXG4gICAgICBoYXNoLFxuICAgICAgcHJvZ3JhbSxcbiAgICAgIGludmVyc2UsXG4gICAgICBibG9jay5sb2MsXG4gICAgICBibG9jay5vcGVuU3RyaXAsXG4gICAgICBibG9jay5pbnZlcnNlU3RyaXAsXG4gICAgICBibG9jay5jbG9zZVN0cmlwXG4gICAgKTtcblxuICAgIGxldCBwYXJlbnRQcm9ncmFtID0gdGhpcy5jdXJyZW50RWxlbWVudCgpO1xuXG4gICAgYXBwZW5kQ2hpbGQocGFyZW50UHJvZ3JhbSwgbm9kZSk7XG4gIH1cblxuICBNdXN0YWNoZVN0YXRlbWVudChyYXdNdXN0YWNoZTogSEJTLk11c3RhY2hlU3RhdGVtZW50KTogQVNULk11c3RhY2hlU3RhdGVtZW50IHwgdm9pZCB7XG4gICAgbGV0IHsgdG9rZW5pemVyIH0gPSB0aGlzO1xuXG4gICAgaWYgKHRva2VuaXplci5zdGF0ZSA9PT0gJ2NvbW1lbnQnKSB7XG4gICAgICB0aGlzLmFwcGVuZFRvQ29tbWVudERhdGEodGhpcy5zb3VyY2VGb3JOb2RlKHJhd011c3RhY2hlKSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbGV0IG11c3RhY2hlOiBBU1QuTXVzdGFjaGVTdGF0ZW1lbnQ7XG4gICAgbGV0IHsgZXNjYXBlZCwgbG9jLCBzdHJpcCB9ID0gcmF3TXVzdGFjaGU7XG5cbiAgICBpZiAoaXNMaXRlcmFsKHJhd011c3RhY2hlLnBhdGgpKSB7XG4gICAgICBtdXN0YWNoZSA9IHtcbiAgICAgICAgdHlwZTogJ011c3RhY2hlU3RhdGVtZW50JyxcbiAgICAgICAgcGF0aDogdGhpcy5hY2NlcHROb2RlPEFTVC5MaXRlcmFsPihyYXdNdXN0YWNoZS5wYXRoKSxcbiAgICAgICAgcGFyYW1zOiBbXSxcbiAgICAgICAgaGFzaDogYi5oYXNoKCksXG4gICAgICAgIGVzY2FwZWQsXG4gICAgICAgIGxvYyxcbiAgICAgICAgc3RyaXAsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBsZXQgeyBwYXRoLCBwYXJhbXMsIGhhc2ggfSA9IGFjY2VwdENhbGxOb2RlcyhcbiAgICAgICAgdGhpcyxcbiAgICAgICAgcmF3TXVzdGFjaGUgYXMgSEJTLk11c3RhY2hlU3RhdGVtZW50ICYge1xuICAgICAgICAgIHBhdGg6IEhCUy5QYXRoRXhwcmVzc2lvbjtcbiAgICAgICAgfVxuICAgICAgKTtcbiAgICAgIG11c3RhY2hlID0gYi5tdXN0YWNoZShwYXRoLCBwYXJhbXMsIGhhc2gsICFlc2NhcGVkLCBsb2MsIHN0cmlwKTtcbiAgICB9XG5cbiAgICBzd2l0Y2ggKHRva2VuaXplci5zdGF0ZSkge1xuICAgICAgLy8gVGFnIGhlbHBlcnNcbiAgICAgIGNhc2UgVG9rZW5pemVyU3RhdGUudGFnT3BlbjpcbiAgICAgIGNhc2UgVG9rZW5pemVyU3RhdGUudGFnTmFtZTpcbiAgICAgICAgdGhyb3cgbmV3IFN5bnRheEVycm9yKFxuICAgICAgICAgIGBDYW5ub3QgdXNlIG11c3RhY2hlcyBpbiBhbiBlbGVtZW50cyB0YWduYW1lOiBcXGAke3RoaXMuc291cmNlRm9yTm9kZShcbiAgICAgICAgICAgIHJhd011c3RhY2hlLFxuICAgICAgICAgICAgcmF3TXVzdGFjaGUucGF0aFxuICAgICAgICAgICl9XFxgIGF0IEwke2xvYy5zdGFydC5saW5lfTpDJHtsb2Muc3RhcnQuY29sdW1ufWAsXG4gICAgICAgICAgbXVzdGFjaGUubG9jXG4gICAgICAgICk7XG5cbiAgICAgIGNhc2UgVG9rZW5pemVyU3RhdGUuYmVmb3JlQXR0cmlidXRlTmFtZTpcbiAgICAgICAgYWRkRWxlbWVudE1vZGlmaWVyKHRoaXMuY3VycmVudFN0YXJ0VGFnLCBtdXN0YWNoZSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBUb2tlbml6ZXJTdGF0ZS5hdHRyaWJ1dGVOYW1lOlxuICAgICAgY2FzZSBUb2tlbml6ZXJTdGF0ZS5hZnRlckF0dHJpYnV0ZU5hbWU6XG4gICAgICAgIHRoaXMuYmVnaW5BdHRyaWJ1dGVWYWx1ZShmYWxzZSk7XG4gICAgICAgIHRoaXMuZmluaXNoQXR0cmlidXRlVmFsdWUoKTtcbiAgICAgICAgYWRkRWxlbWVudE1vZGlmaWVyKHRoaXMuY3VycmVudFN0YXJ0VGFnLCBtdXN0YWNoZSk7XG4gICAgICAgIHRva2VuaXplci50cmFuc2l0aW9uVG8oVG9rZW5pemVyU3RhdGUuYmVmb3JlQXR0cmlidXRlTmFtZSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBUb2tlbml6ZXJTdGF0ZS5hZnRlckF0dHJpYnV0ZVZhbHVlUXVvdGVkOlxuICAgICAgICBhZGRFbGVtZW50TW9kaWZpZXIodGhpcy5jdXJyZW50U3RhcnRUYWcsIG11c3RhY2hlKTtcbiAgICAgICAgdG9rZW5pemVyLnRyYW5zaXRpb25UbyhUb2tlbml6ZXJTdGF0ZS5iZWZvcmVBdHRyaWJ1dGVOYW1lKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIC8vIEF0dHJpYnV0ZSB2YWx1ZXNcbiAgICAgIGNhc2UgVG9rZW5pemVyU3RhdGUuYmVmb3JlQXR0cmlidXRlVmFsdWU6XG4gICAgICAgIHRoaXMuYmVnaW5BdHRyaWJ1dGVWYWx1ZShmYWxzZSk7XG4gICAgICAgIGFwcGVuZER5bmFtaWNBdHRyaWJ1dGVWYWx1ZVBhcnQodGhpcy5jdXJyZW50QXR0cmlidXRlISwgbXVzdGFjaGUpO1xuICAgICAgICB0b2tlbml6ZXIudHJhbnNpdGlvblRvKFRva2VuaXplclN0YXRlLmF0dHJpYnV0ZVZhbHVlVW5xdW90ZWQpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgVG9rZW5pemVyU3RhdGUuYXR0cmlidXRlVmFsdWVEb3VibGVRdW90ZWQ6XG4gICAgICBjYXNlIFRva2VuaXplclN0YXRlLmF0dHJpYnV0ZVZhbHVlU2luZ2xlUXVvdGVkOlxuICAgICAgY2FzZSBUb2tlbml6ZXJTdGF0ZS5hdHRyaWJ1dGVWYWx1ZVVucXVvdGVkOlxuICAgICAgICBhcHBlbmREeW5hbWljQXR0cmlidXRlVmFsdWVQYXJ0KHRoaXMuY3VycmVudEF0dHJpYnV0ZSEsIG11c3RhY2hlKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIC8vIFRPRE86IE9ubHkgYXBwZW5kIGNoaWxkIHdoZW4gdGhlIHRva2VuaXplciBzdGF0ZSBtYWtlc1xuICAgICAgLy8gc2Vuc2UgdG8gZG8gc28sIG90aGVyd2lzZSB0aHJvdyBhbiBlcnJvci5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGFwcGVuZENoaWxkKHRoaXMuY3VycmVudEVsZW1lbnQoKSwgbXVzdGFjaGUpO1xuICAgIH1cblxuICAgIHJldHVybiBtdXN0YWNoZTtcbiAgfVxuXG4gIENvbnRlbnRTdGF0ZW1lbnQoY29udGVudDogSEJTLkNvbnRlbnRTdGF0ZW1lbnQpOiB2b2lkIHtcbiAgICB1cGRhdGVUb2tlbml6ZXJMb2NhdGlvbih0aGlzLnRva2VuaXplciwgY29udGVudCk7XG5cbiAgICB0aGlzLnRva2VuaXplci50b2tlbml6ZVBhcnQoY29udGVudC52YWx1ZSk7XG4gICAgdGhpcy50b2tlbml6ZXIuZmx1c2hEYXRhKCk7XG4gIH1cblxuICBDb21tZW50U3RhdGVtZW50KHJhd0NvbW1lbnQ6IEhCUy5Db21tZW50U3RhdGVtZW50KTogT3B0aW9uPEFTVC5NdXN0YWNoZUNvbW1lbnRTdGF0ZW1lbnQ+IHtcbiAgICBsZXQgeyB0b2tlbml6ZXIgfSA9IHRoaXM7XG5cbiAgICBpZiAodG9rZW5pemVyLnN0YXRlID09PSBUb2tlbml6ZXJTdGF0ZS5jb21tZW50KSB7XG4gICAgICB0aGlzLmFwcGVuZFRvQ29tbWVudERhdGEodGhpcy5zb3VyY2VGb3JOb2RlKHJhd0NvbW1lbnQpKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGxldCB7IHZhbHVlLCBsb2MgfSA9IHJhd0NvbW1lbnQ7XG4gICAgbGV0IGNvbW1lbnQgPSBiLm11c3RhY2hlQ29tbWVudCh2YWx1ZSwgbG9jKTtcblxuICAgIHN3aXRjaCAodG9rZW5pemVyLnN0YXRlKSB7XG4gICAgICBjYXNlIFRva2VuaXplclN0YXRlLmJlZm9yZUF0dHJpYnV0ZU5hbWU6XG4gICAgICBjYXNlIFRva2VuaXplclN0YXRlLmFmdGVyQXR0cmlidXRlTmFtZTpcbiAgICAgICAgdGhpcy5jdXJyZW50U3RhcnRUYWcuY29tbWVudHMucHVzaChjb21tZW50KTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgVG9rZW5pemVyU3RhdGUuYmVmb3JlRGF0YTpcbiAgICAgIGNhc2UgVG9rZW5pemVyU3RhdGUuZGF0YTpcbiAgICAgICAgYXBwZW5kQ2hpbGQodGhpcy5jdXJyZW50RWxlbWVudCgpLCBjb21tZW50KTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBTeW50YXhFcnJvcihcbiAgICAgICAgICBgVXNpbmcgYSBIYW5kbGViYXJzIGNvbW1lbnQgd2hlbiBpbiB0aGUgXFxgJHt0b2tlbml6ZXJbJ3N0YXRlJ119XFxgIHN0YXRlIGlzIG5vdCBzdXBwb3J0ZWQ6IFwiJHtjb21tZW50LnZhbHVlfVwiIG9uIGxpbmUgJHtsb2Muc3RhcnQubGluZX06JHtsb2Muc3RhcnQuY29sdW1ufWAsXG4gICAgICAgICAgcmF3Q29tbWVudC5sb2NcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY29tbWVudDtcbiAgfVxuXG4gIFBhcnRpYWxTdGF0ZW1lbnQocGFydGlhbDogSEJTLlBhcnRpYWxTdGF0ZW1lbnQpOiBuZXZlciB7XG4gICAgbGV0IHsgbG9jIH0gPSBwYXJ0aWFsO1xuXG4gICAgdGhyb3cgbmV3IFN5bnRheEVycm9yKFxuICAgICAgYEhhbmRsZWJhcnMgcGFydGlhbHMgYXJlIG5vdCBzdXBwb3J0ZWQ6IFwiJHt0aGlzLnNvdXJjZUZvck5vZGUocGFydGlhbCwgcGFydGlhbC5uYW1lKX1cIiBhdCBMJHtcbiAgICAgICAgbG9jLnN0YXJ0LmxpbmVcbiAgICAgIH06QyR7bG9jLnN0YXJ0LmNvbHVtbn1gLFxuICAgICAgcGFydGlhbC5sb2NcbiAgICApO1xuICB9XG5cbiAgUGFydGlhbEJsb2NrU3RhdGVtZW50KHBhcnRpYWxCbG9jazogSEJTLlBhcnRpYWxCbG9ja1N0YXRlbWVudCk6IG5ldmVyIHtcbiAgICBsZXQgeyBsb2MgfSA9IHBhcnRpYWxCbG9jaztcblxuICAgIHRocm93IG5ldyBTeW50YXhFcnJvcihcbiAgICAgIGBIYW5kbGViYXJzIHBhcnRpYWwgYmxvY2tzIGFyZSBub3Qgc3VwcG9ydGVkOiBcIiR7dGhpcy5zb3VyY2VGb3JOb2RlKFxuICAgICAgICBwYXJ0aWFsQmxvY2ssXG4gICAgICAgIHBhcnRpYWxCbG9jay5uYW1lXG4gICAgICApfVwiIGF0IEwke2xvYy5zdGFydC5saW5lfTpDJHtsb2Muc3RhcnQuY29sdW1ufWAsXG4gICAgICBwYXJ0aWFsQmxvY2subG9jXG4gICAgKTtcbiAgfVxuXG4gIERlY29yYXRvcihkZWNvcmF0b3I6IEhCUy5EZWNvcmF0b3IpOiBuZXZlciB7XG4gICAgbGV0IHsgbG9jIH0gPSBkZWNvcmF0b3I7XG5cbiAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoXG4gICAgICBgSGFuZGxlYmFycyBkZWNvcmF0b3JzIGFyZSBub3Qgc3VwcG9ydGVkOiBcIiR7dGhpcy5zb3VyY2VGb3JOb2RlKFxuICAgICAgICBkZWNvcmF0b3IsXG4gICAgICAgIGRlY29yYXRvci5wYXRoXG4gICAgICApfVwiIGF0IEwke2xvYy5zdGFydC5saW5lfTpDJHtsb2Muc3RhcnQuY29sdW1ufWAsXG4gICAgICBkZWNvcmF0b3IubG9jXG4gICAgKTtcbiAgfVxuXG4gIERlY29yYXRvckJsb2NrKGRlY29yYXRvckJsb2NrOiBIQlMuRGVjb3JhdG9yQmxvY2spOiBuZXZlciB7XG4gICAgbGV0IHsgbG9jIH0gPSBkZWNvcmF0b3JCbG9jaztcblxuICAgIHRocm93IG5ldyBTeW50YXhFcnJvcihcbiAgICAgIGBIYW5kbGViYXJzIGRlY29yYXRvciBibG9ja3MgYXJlIG5vdCBzdXBwb3J0ZWQ6IFwiJHt0aGlzLnNvdXJjZUZvck5vZGUoXG4gICAgICAgIGRlY29yYXRvckJsb2NrLFxuICAgICAgICBkZWNvcmF0b3JCbG9jay5wYXRoXG4gICAgICApfVwiIGF0IEwke2xvYy5zdGFydC5saW5lfTpDJHtsb2Muc3RhcnQuY29sdW1ufWAsXG4gICAgICBkZWNvcmF0b3JCbG9jay5sb2NcbiAgICApO1xuICB9XG5cbiAgU3ViRXhwcmVzc2lvbihzZXhwcjogSEJTLlN1YkV4cHJlc3Npb24pOiBBU1QuU3ViRXhwcmVzc2lvbiB7XG4gICAgbGV0IHsgcGF0aCwgcGFyYW1zLCBoYXNoIH0gPSBhY2NlcHRDYWxsTm9kZXModGhpcywgc2V4cHIpO1xuICAgIHJldHVybiBiLnNleHByKHBhdGgsIHBhcmFtcywgaGFzaCwgc2V4cHIubG9jKTtcbiAgfVxuXG4gIFBhdGhFeHByZXNzaW9uKHBhdGg6IEhCUy5QYXRoRXhwcmVzc2lvbik6IEFTVC5QYXRoRXhwcmVzc2lvbiB7XG4gICAgbGV0IHsgb3JpZ2luYWwsIGxvYyB9ID0gcGF0aDtcbiAgICBsZXQgcGFydHM6IHN0cmluZ1tdO1xuXG4gICAgaWYgKG9yaWdpbmFsLmluZGV4T2YoJy8nKSAhPT0gLTEpIHtcbiAgICAgIGlmIChvcmlnaW5hbC5zbGljZSgwLCAyKSA9PT0gJy4vJykge1xuICAgICAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoXG4gICAgICAgICAgYFVzaW5nIFwiLi9cIiBpcyBub3Qgc3VwcG9ydGVkIGluIEdsaW1tZXIgYW5kIHVubmVjZXNzYXJ5OiBcIiR7cGF0aC5vcmlnaW5hbH1cIiBvbiBsaW5lICR7bG9jLnN0YXJ0LmxpbmV9LmAsXG4gICAgICAgICAgcGF0aC5sb2NcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIGlmIChvcmlnaW5hbC5zbGljZSgwLCAzKSA9PT0gJy4uLycpIHtcbiAgICAgICAgdGhyb3cgbmV3IFN5bnRheEVycm9yKFxuICAgICAgICAgIGBDaGFuZ2luZyBjb250ZXh0IHVzaW5nIFwiLi4vXCIgaXMgbm90IHN1cHBvcnRlZCBpbiBHbGltbWVyOiBcIiR7cGF0aC5vcmlnaW5hbH1cIiBvbiBsaW5lICR7bG9jLnN0YXJ0LmxpbmV9LmAsXG4gICAgICAgICAgcGF0aC5sb2NcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIGlmIChvcmlnaW5hbC5pbmRleE9mKCcuJykgIT09IC0xKSB7XG4gICAgICAgIHRocm93IG5ldyBTeW50YXhFcnJvcihcbiAgICAgICAgICBgTWl4aW5nICcuJyBhbmQgJy8nIGluIHBhdGhzIGlzIG5vdCBzdXBwb3J0ZWQgaW4gR2xpbW1lcjsgdXNlIG9ubHkgJy4nIHRvIHNlcGFyYXRlIHByb3BlcnR5IHBhdGhzOiBcIiR7cGF0aC5vcmlnaW5hbH1cIiBvbiBsaW5lICR7bG9jLnN0YXJ0LmxpbmV9LmAsXG4gICAgICAgICAgcGF0aC5sb2NcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIHBhcnRzID0gW3BhdGgucGFydHMuam9pbignLycpXTtcbiAgICB9IGVsc2UgaWYgKG9yaWdpbmFsID09PSAnLicpIHtcbiAgICAgIGxldCBsb2NhdGlvbkluZm8gPSBgTCR7bG9jLnN0YXJ0LmxpbmV9OkMke2xvYy5zdGFydC5jb2x1bW59YDtcbiAgICAgIHRocm93IG5ldyBTeW50YXhFcnJvcihcbiAgICAgICAgYCcuJyBpcyBub3QgYSBzdXBwb3J0ZWQgcGF0aCBpbiBHbGltbWVyOyBjaGVjayBmb3IgYSBwYXRoIHdpdGggYSB0cmFpbGluZyAnLicgYXQgJHtsb2NhdGlvbkluZm99LmAsXG4gICAgICAgIHBhdGgubG9jXG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYXJ0cyA9IHBhdGgucGFydHM7XG4gICAgfVxuXG4gICAgbGV0IHRoaXNIZWFkID0gZmFsc2U7XG5cbiAgICAvLyBUaGlzIGlzIHRvIGZpeCBhIGJ1ZyBpbiB0aGUgSGFuZGxlYmFycyBBU1Qgd2hlcmUgdGhlIHBhdGggZXhwcmVzc2lvbnMgaW5cbiAgICAvLyBge3t0aGlzLmZvb319YCAoYW5kIHNpbWlsYXJseSBge3tmb28tYmFyIHRoaXMuZm9vIG5hbWVkPXRoaXMuZm9vfX1gIGV0YylcbiAgICAvLyBhcmUgc2ltcGx5IHR1cm5lZCBpbnRvIGB7e2Zvb319YC4gVGhlIGZpeCBpcyB0byBwdXNoIGl0IGJhY2sgb250byB0aGVcbiAgICAvLyBwYXJ0cyBhcnJheSBhbmQgbGV0IHRoZSBydW50aW1lIHNlZSB0aGUgZGlmZmVyZW5jZS4gSG93ZXZlciwgd2UgY2Fubm90XG4gICAgLy8gc2ltcGx5IHVzZSB0aGUgc3RyaW5nIGB0aGlzYCBhcyBpdCBtZWFucyBsaXRlcmFsbHkgdGhlIHByb3BlcnR5IGNhbGxlZFxuICAgIC8vIFwidGhpc1wiIGluIHRoZSBjdXJyZW50IGNvbnRleHQgKGl0IGNhbiBiZSBleHByZXNzZWQgaW4gdGhlIHN5bnRheCBhc1xuICAgIC8vIGB7e1t0aGlzXX19YCwgd2hlcmUgdGhlIHNxdWFyZSBicmFja2V0IGFyZSBnZW5lcmFsbHkgZm9yIHRoaXMga2luZCBvZlxuICAgIC8vIGVzY2FwaW5nIOKAkyBzdWNoIGFzIGB7e2Zvby5bXCJiYXIuYmF6XCJdfX1gIHdvdWxkIG1lYW4gbG9va3VwIGEgcHJvcGVydHlcbiAgICAvLyBuYW1lZCBsaXRlcmFsbHkgXCJiYXIuYmF6XCIgb24gYHRoaXMuZm9vYCkuIEJ5IGNvbnZlbnRpb24sIHdlIHVzZSBgbnVsbGBcbiAgICAvLyBmb3IgdGhpcyBwdXJwb3NlLlxuICAgIGlmIChvcmlnaW5hbC5tYXRjaCgvXnRoaXMoXFwuLispPyQvKSkge1xuICAgICAgdGhpc0hlYWQgPSB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB0eXBlOiAnUGF0aEV4cHJlc3Npb24nLFxuICAgICAgb3JpZ2luYWw6IHBhdGgub3JpZ2luYWwsXG4gICAgICB0aGlzOiB0aGlzSGVhZCxcbiAgICAgIHBhcnRzLFxuICAgICAgZGF0YTogcGF0aC5kYXRhLFxuICAgICAgbG9jOiBwYXRoLmxvYyxcbiAgICB9O1xuICB9XG5cbiAgSGFzaChoYXNoOiBIQlMuSGFzaCk6IEFTVC5IYXNoIHtcbiAgICBsZXQgcGFpcnM6IEFTVC5IYXNoUGFpcltdID0gW107XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGhhc2gucGFpcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGxldCBwYWlyID0gaGFzaC5wYWlyc1tpXTtcbiAgICAgIHBhaXJzLnB1c2goYi5wYWlyKHBhaXIua2V5LCB0aGlzLmFjY2VwdE5vZGUocGFpci52YWx1ZSksIHBhaXIubG9jKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGIuaGFzaChwYWlycywgaGFzaC5sb2MpO1xuICB9XG5cbiAgU3RyaW5nTGl0ZXJhbChzdHJpbmc6IEhCUy5TdHJpbmdMaXRlcmFsKTogQVNULlN0cmluZ0xpdGVyYWwge1xuICAgIHJldHVybiBiLmxpdGVyYWwoJ1N0cmluZ0xpdGVyYWwnLCBzdHJpbmcudmFsdWUsIHN0cmluZy5sb2MpO1xuICB9XG5cbiAgQm9vbGVhbkxpdGVyYWwoYm9vbGVhbjogSEJTLkJvb2xlYW5MaXRlcmFsKTogQVNULkJvb2xlYW5MaXRlcmFsIHtcbiAgICByZXR1cm4gYi5saXRlcmFsKCdCb29sZWFuTGl0ZXJhbCcsIGJvb2xlYW4udmFsdWUsIGJvb2xlYW4ubG9jKTtcbiAgfVxuXG4gIE51bWJlckxpdGVyYWwobnVtYmVyOiBIQlMuTnVtYmVyTGl0ZXJhbCk6IEFTVC5OdW1iZXJMaXRlcmFsIHtcbiAgICByZXR1cm4gYi5saXRlcmFsKCdOdW1iZXJMaXRlcmFsJywgbnVtYmVyLnZhbHVlLCBudW1iZXIubG9jKTtcbiAgfVxuXG4gIFVuZGVmaW5lZExpdGVyYWwodW5kZWY6IEhCUy5VbmRlZmluZWRMaXRlcmFsKTogQVNULlVuZGVmaW5lZExpdGVyYWwge1xuICAgIHJldHVybiBiLmxpdGVyYWwoJ1VuZGVmaW5lZExpdGVyYWwnLCB1bmRlZmluZWQsIHVuZGVmLmxvYyk7XG4gIH1cblxuICBOdWxsTGl0ZXJhbChudWw6IEhCUy5OdWxsTGl0ZXJhbCk6IEFTVC5OdWxsTGl0ZXJhbCB7XG4gICAgcmV0dXJuIGIubGl0ZXJhbCgnTnVsbExpdGVyYWwnLCBudWxsLCBudWwubG9jKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjYWxjdWxhdGVSaWdodFN0cmlwcGVkT2Zmc2V0cyhvcmlnaW5hbDogc3RyaW5nLCB2YWx1ZTogc3RyaW5nKSB7XG4gIGlmICh2YWx1ZSA9PT0gJycpIHtcbiAgICAvLyBpZiBpdCBpcyBlbXB0eSwganVzdCByZXR1cm4gdGhlIGNvdW50IG9mIG5ld2xpbmVzXG4gICAgLy8gaW4gb3JpZ2luYWxcbiAgICByZXR1cm4ge1xuICAgICAgbGluZXM6IG9yaWdpbmFsLnNwbGl0KCdcXG4nKS5sZW5ndGggLSAxLFxuICAgICAgY29sdW1uczogMCxcbiAgICB9O1xuICB9XG5cbiAgLy8gb3RoZXJ3aXNlLCByZXR1cm4gdGhlIG51bWJlciBvZiBuZXdsaW5lcyBwcmlvciB0b1xuICAvLyBgdmFsdWVgXG4gIGxldCBkaWZmZXJlbmNlID0gb3JpZ2luYWwuc3BsaXQodmFsdWUpWzBdO1xuICBsZXQgbGluZXMgPSBkaWZmZXJlbmNlLnNwbGl0KC9cXG4vKTtcbiAgbGV0IGxpbmVDb3VudCA9IGxpbmVzLmxlbmd0aCAtIDE7XG5cbiAgcmV0dXJuIHtcbiAgICBsaW5lczogbGluZUNvdW50LFxuICAgIGNvbHVtbnM6IGxpbmVzW2xpbmVDb3VudF0ubGVuZ3RoLFxuICB9O1xufVxuXG5mdW5jdGlvbiB1cGRhdGVUb2tlbml6ZXJMb2NhdGlvbih0b2tlbml6ZXI6IFBhcnNlclsndG9rZW5pemVyJ10sIGNvbnRlbnQ6IEhCUy5Db250ZW50U3RhdGVtZW50KSB7XG4gIGxldCBsaW5lID0gY29udGVudC5sb2Muc3RhcnQubGluZTtcbiAgbGV0IGNvbHVtbiA9IGNvbnRlbnQubG9jLnN0YXJ0LmNvbHVtbjtcblxuICBsZXQgb2Zmc2V0cyA9IGNhbGN1bGF0ZVJpZ2h0U3RyaXBwZWRPZmZzZXRzKFxuICAgIGNvbnRlbnQub3JpZ2luYWwgYXMgUmVjYXN0PEhCUy5TdHJpcEZsYWdzLCBzdHJpbmc+LFxuICAgIGNvbnRlbnQudmFsdWVcbiAgKTtcblxuICBsaW5lID0gbGluZSArIG9mZnNldHMubGluZXM7XG4gIGlmIChvZmZzZXRzLmxpbmVzKSB7XG4gICAgY29sdW1uID0gb2Zmc2V0cy5jb2x1bW5zO1xuICB9IGVsc2Uge1xuICAgIGNvbHVtbiA9IGNvbHVtbiArIG9mZnNldHMuY29sdW1ucztcbiAgfVxuXG4gIHRva2VuaXplci5saW5lID0gbGluZTtcbiAgdG9rZW5pemVyLmNvbHVtbiA9IGNvbHVtbjtcbn1cblxuZnVuY3Rpb24gYWNjZXB0Q2FsbE5vZGVzKFxuICBjb21waWxlcjogSGFuZGxlYmFyc05vZGVWaXNpdG9ycyxcbiAgbm9kZToge1xuICAgIHBhdGg6IEhCUy5QYXRoRXhwcmVzc2lvbjtcbiAgICBwYXJhbXM6IEhCUy5FeHByZXNzaW9uW107XG4gICAgaGFzaDogSEJTLkhhc2g7XG4gIH1cbik6IHsgcGF0aDogQVNULlBhdGhFeHByZXNzaW9uOyBwYXJhbXM6IEFTVC5FeHByZXNzaW9uW107IGhhc2g6IEFTVC5IYXNoIH0ge1xuICBsZXQgcGF0aCA9IGNvbXBpbGVyLlBhdGhFeHByZXNzaW9uKG5vZGUucGF0aCk7XG5cbiAgbGV0IHBhcmFtcyA9IG5vZGUucGFyYW1zID8gbm9kZS5wYXJhbXMubWFwKChlKSA9PiBjb21waWxlci5hY2NlcHROb2RlPEFTVC5FeHByZXNzaW9uPihlKSkgOiBbXTtcbiAgbGV0IGhhc2ggPSBub2RlLmhhc2ggPyBjb21waWxlci5IYXNoKG5vZGUuaGFzaCkgOiBiLmhhc2goKTtcblxuICByZXR1cm4geyBwYXRoLCBwYXJhbXMsIGhhc2ggfTtcbn1cblxuZnVuY3Rpb24gYWRkRWxlbWVudE1vZGlmaWVyKGVsZW1lbnQ6IFRhZzwnU3RhcnRUYWcnPiwgbXVzdGFjaGU6IEFTVC5NdXN0YWNoZVN0YXRlbWVudCkge1xuICBsZXQgeyBwYXRoLCBwYXJhbXMsIGhhc2gsIGxvYyB9ID0gbXVzdGFjaGU7XG5cbiAgaWYgKGlzTGl0ZXJhbChwYXRoKSkge1xuICAgIGxldCBtb2RpZmllciA9IGB7eyR7cHJpbnRMaXRlcmFsKHBhdGgpfX19YDtcbiAgICBsZXQgdGFnID0gYDwke2VsZW1lbnQubmFtZX0gLi4uICR7bW9kaWZpZXJ9IC4uLmA7XG5cbiAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoXG4gICAgICBgSW4gJHt0YWd9LCAke21vZGlmaWVyfSBpcyBub3QgYSB2YWxpZCBtb2RpZmllcjogXCIke3BhdGgub3JpZ2luYWx9XCIgb24gbGluZSAke1xuICAgICAgICBsb2MgJiYgbG9jLnN0YXJ0LmxpbmVcbiAgICAgIH0uYCxcbiAgICAgIG11c3RhY2hlLmxvY1xuICAgICk7XG4gIH1cblxuICBsZXQgbW9kaWZpZXIgPSBiLmVsZW1lbnRNb2RpZmllcihwYXRoLCBwYXJhbXMsIGhhc2gsIGxvYyk7XG4gIGVsZW1lbnQubW9kaWZpZXJzLnB1c2gobW9kaWZpZXIpO1xufVxuXG5mdW5jdGlvbiBhcHBlbmREeW5hbWljQXR0cmlidXRlVmFsdWVQYXJ0KGF0dHJpYnV0ZTogQXR0cmlidXRlLCBwYXJ0OiBBU1QuTXVzdGFjaGVTdGF0ZW1lbnQpIHtcbiAgYXR0cmlidXRlLmlzRHluYW1pYyA9IHRydWU7XG4gIGF0dHJpYnV0ZS5wYXJ0cy5wdXNoKHBhcnQpO1xufVxuIl0sInNvdXJjZVJvb3QiOiIifQ==