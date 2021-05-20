"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _tokenizerEventHandlers = require("../parser/tokenizer-event-handlers");

var _util = require("./util");

function _createForOfIteratorHelperLoose(o, allowArrayLike) {
  var it;

  if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) {
    if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") {
      if (it) o = it;
      var i = 0;
      return function () {
        if (i >= o.length) return {
          done: true
        };
        return {
          done: false,
          value: o[i++]
        };
      };
    }

    throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }

  it = o[Symbol.iterator]();
  return it.next.bind(it);
}

function _unsupportedIterableToArray(o, minLen) {
  if (!o) return;
  if (typeof o === "string") return _arrayLikeToArray(o, minLen);
  var n = Object.prototype.toString.call(o).slice(8, -1);
  if (n === "Object" && o.constructor) n = o.constructor.name;
  if (n === "Map" || n === "Set") return Array.from(o);
  if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
}

function _arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length) len = arr.length;

  for (var i = 0, arr2 = new Array(len); i < len; i++) {
    arr2[i] = arr[i];
  }

  return arr2;
}

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
    var parts = [].concat(el.attributes, el.modifiers, el.comments).sort(_util.sortByLoc);

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
    if (el.selfClosing || _tokenizerEventHandlers.voidMap[el.tag.toLowerCase()]) {
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
      this.buffer += (0, _util.escapeAttrValue)(text.chars);
    } else {
      this.buffer += (0, _util.escapeText)(text.chars);
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
    var _this3 = this; // TODO: implement a top level Params AST node (just like the Hash object)
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

exports.default = Printer;

function unreachable(node, parentNodeType) {
  var loc = node.loc,
      type = node.type;
  throw new Error("Non-exhaustive node narrowing " + type + " @ location: " + JSON.stringify(loc) + " for parent " + parentNodeType);
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL0BnbGltbWVyL3N5bnRheC9saWIvZ2VuZXJhdGlvbi9wcmludGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUE0QkE7O0FBQ0E7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFQSxJQUFNLGNBQWMsR0FBcEIsSUFBQTs7SUFzQmMsTztBQUlaLFdBQUEsT0FBQSxDQUFBLE9BQUEsRUFBbUM7QUFIM0IsU0FBQSxNQUFBLEdBQUEsRUFBQTtBQUlOLFNBQUEsT0FBQSxHQUFBLE9BQUE7QUFDRDtBQUVEOzs7Ozs7Ozs7Ozs7U0FTQSxpQixHQUFBLFNBQUEsaUJBQUEsQ0FBQSxJQUFBLEVBQUEsdUJBQUEsRUFBNkQ7QUFBQSxRQUEvQix1QkFBK0IsS0FBQSxLQUFBLENBQUEsRUFBQTtBQUEvQixNQUFBLHVCQUErQixHQUE1QyxLQUFhO0FBQStCOztBQUMzRCxRQUFJLEtBQUEsT0FBQSxDQUFBLFFBQUEsS0FBSixTQUFBLEVBQXlDO0FBQ3ZDLFVBQUksTUFBTSxHQUFHLEtBQUEsT0FBQSxDQUFBLFFBQUEsQ0FBQSxJQUFBLEVBQTRCLEtBQXpDLE9BQWEsQ0FBYjs7QUFDQSxVQUFJLE9BQUEsTUFBQSxLQUFKLFFBQUEsRUFBZ0M7QUFDOUIsWUFBSSx1QkFBdUIsSUFBSSxNQUFNLEtBQWpDLEVBQUEsSUFBNEMsY0FBYyxDQUFkLElBQUEsQ0FBb0IsTUFBTSxDQUExRSxDQUEwRSxDQUExQixDQUFoRCxFQUFnRjtBQUM5RSxVQUFBLE1BQU0sR0FBQSxNQUFOLE1BQUE7QUFDRDs7QUFFRCxhQUFBLE1BQUEsSUFBQSxNQUFBO0FBQ0EsZUFBQSxJQUFBO0FBQ0Q7QUFDRjs7QUFFRCxXQUFBLEtBQUE7OztTQUdGLEksR0FBQSxTQUFBLElBQUEsQ0FBQSxJQUFBLEVBQWU7QUFDYixZQUFRLElBQUksQ0FBWixJQUFBO0FBQ0UsV0FBQSxtQkFBQTtBQUNBLFdBQUEsZ0JBQUE7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QSxTQUFBLFdBQUEsQ0FBQSxJQUFBLEVBQTZCO0FBQzNCLFFBQUksS0FBQSxpQkFBQSxDQUFKLElBQUksQ0FBSixFQUFrQztBQUNoQztBQUNEOztBQUVELFNBQUEsTUFBQSxJQUFBLE1BQUE7OztTQUdGLEssR0FBQSxTQUFBLEtBQUEsQ0FBQSxJQUFBLEVBQWdCO0FBQUEsUUFDUixPQURRLEdBQUEsS0FBQSxPQUFBOztBQUdkLFFBQUksT0FBTyxDQUFYLFFBQUEsRUFBc0I7QUFDcEIsVUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFQLFFBQUEsQ0FBQSxJQUFBLEVBQWIsT0FBYSxDQUFiOztBQUVBLFVBQUksTUFBTSxLQUFWLFNBQUEsRUFBMEI7QUFDeEIsZUFBQSxNQUFBO0FBQ0Q7QUFDRjs7QUFFRCxTQUFBLE1BQUEsR0FBQSxFQUFBO0FBQ0EsU0FBQSxJQUFBLENBQUEsSUFBQTtBQUNBLFdBQU8sS0FBUCxNQUFBOzs7Ozs7OztBQUlKLFNBQUEsV0FBQSxDQUFBLElBQUEsRUFBQSxjQUFBLEVBQXdEO0FBQUEsTUFDbEQsR0FEa0QsR0FDdEQsSUFEc0QsQ0FBQSxHQUFBO0FBQUEsTUFDM0MsSUFEMkMsR0FDdEQsSUFEc0QsQ0FBQSxJQUFBO0FBRXRELFFBQU0sSUFBQSxLQUFBLENBQUEsbUNBQUEsSUFBQSxHQUFBLGVBQUEsR0FDaUQsSUFBSSxDQUFKLFNBQUEsQ0FEakQsR0FDaUQsQ0FEakQsR0FBQSxjQUFBLEdBQU4sY0FBTSxDQUFOO0FBS0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBBdHRyTm9kZSxcbiAgQmxvY2ssXG4gIEJsb2NrU3RhdGVtZW50LFxuICBFbGVtZW50Tm9kZSxcbiAgTXVzdGFjaGVTdGF0ZW1lbnQsXG4gIE5vZGUsXG4gIFByb2dyYW0sXG4gIFRleHROb2RlLFxuICBQYXJ0aWFsU3RhdGVtZW50LFxuICBDb25jYXRTdGF0ZW1lbnQsXG4gIE11c3RhY2hlQ29tbWVudFN0YXRlbWVudCxcbiAgQ29tbWVudFN0YXRlbWVudCxcbiAgRWxlbWVudE1vZGlmaWVyU3RhdGVtZW50LFxuICBFeHByZXNzaW9uLFxuICBQYXRoRXhwcmVzc2lvbixcbiAgU3ViRXhwcmVzc2lvbixcbiAgSGFzaCxcbiAgSGFzaFBhaXIsXG4gIExpdGVyYWwsXG4gIFN0cmluZ0xpdGVyYWwsXG4gIEJvb2xlYW5MaXRlcmFsLFxuICBOdW1iZXJMaXRlcmFsLFxuICBVbmRlZmluZWRMaXRlcmFsLFxuICBOdWxsTGl0ZXJhbCxcbiAgVG9wTGV2ZWxTdGF0ZW1lbnQsXG4gIFRlbXBsYXRlLFxufSBmcm9tICcuLi90eXBlcy9ub2Rlcyc7XG5pbXBvcnQgeyB2b2lkTWFwIH0gZnJvbSAnLi4vcGFyc2VyL3Rva2VuaXplci1ldmVudC1oYW5kbGVycyc7XG5pbXBvcnQgeyBlc2NhcGVUZXh0LCBlc2NhcGVBdHRyVmFsdWUsIHNvcnRCeUxvYyB9IGZyb20gJy4vdXRpbCc7XG5cbmNvbnN0IE5PTl9XSElURVNQQUNFID0gL1xcUy87XG5cbmV4cG9ydCBpbnRlcmZhY2UgUHJpbnRlck9wdGlvbnMge1xuICBlbnRpdHlFbmNvZGluZzogJ3RyYW5zZm9ybWVkJyB8ICdyYXcnO1xuXG4gIC8qKlxuICAgKiBVc2VkIHRvIG92ZXJyaWRlIHRoZSBtZWNoYW5pc20gb2YgcHJpbnRpbmcgYSBnaXZlbiBBU1QuTm9kZS5cbiAgICpcbiAgICogVGhpcyB3aWxsIGdlbmVyYWxseSBvbmx5IGJlIHVzZWZ1bCB0byBzb3VyY2UgLT4gc291cmNlIGNvZGVtb2RzXG4gICAqIHdoZXJlIHlvdSB3b3VsZCBsaWtlIHRvIHNwZWNpYWxpemUvb3ZlcnJpZGUgdGhlIHdheSBhIGdpdmVuIG5vZGUgaXNcbiAgICogcHJpbnRlZCAoZS5nLiB5b3Ugd291bGQgbGlrZSB0byBwcmVzZXJ2ZSBhcyBtdWNoIG9mIHRoZSBvcmlnaW5hbFxuICAgKiBmb3JtYXR0aW5nIGFzIHBvc3NpYmxlKS5cbiAgICpcbiAgICogV2hlbiB0aGUgcHJvdmlkZWQgb3ZlcnJpZGUgcmV0dXJucyB1bmRlZmluZWQsIHRoZSBkZWZhdWx0IGJ1aWx0IGluIHByaW50aW5nXG4gICAqIHdpbGwgYmUgZG9uZSBmb3IgdGhlIEFTVC5Ob2RlLlxuICAgKlxuICAgKiBAcGFyYW0gYXN0IHRoZSBhc3Qgbm9kZSB0byBiZSBwcmludGVkXG4gICAqIEBwYXJhbSBvcHRpb25zIHRoZSBvcHRpb25zIHNwZWNpZmllZCBkdXJpbmcgdGhlIHByaW50KCkgaW52b2NhdGlvblxuICAgKi9cbiAgb3ZlcnJpZGU/KGFzdDogTm9kZSwgb3B0aW9uczogUHJpbnRlck9wdGlvbnMpOiB2b2lkIHwgc3RyaW5nO1xufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQcmludGVyIHtcbiAgcHJpdmF0ZSBidWZmZXIgPSAnJztcbiAgcHJpdmF0ZSBvcHRpb25zOiBQcmludGVyT3B0aW9ucztcblxuICBjb25zdHJ1Y3RvcihvcHRpb25zOiBQcmludGVyT3B0aW9ucykge1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gIH1cblxuICAvKlxuICAgIFRoaXMgaXMgdXNlZCBieSBfYWxsXyBtZXRob2RzIG9uIHRoaXMgUHJpbnRlciBjbGFzcyB0aGF0IGFkZCB0byBgdGhpcy5idWZmZXJgLFxuICAgIGl0IGFsbG93cyBjb25zdW1lcnMgb2YgdGhlIHByaW50ZXIgdG8gdXNlIGFsdGVybmF0ZSBzdHJpbmcgcmVwcmVzZW50YXRpb25zIGZvclxuICAgIGEgZ2l2ZW4gbm9kZS5cblxuICAgIFRoZSBwcmltYXJ5IHVzZSBjYXNlIGZvciB0aGlzIGFyZSB0aGluZ3MgbGlrZSBzb3VyY2UgLT4gc291cmNlIGNvZGVtb2QgdXRpbGl0aWVzLlxuICAgIEZvciBleGFtcGxlLCBlbWJlci10ZW1wbGF0ZS1yZWNhc3QgYXR0ZW1wdHMgdG8gYWx3YXlzIHByZXNlcnZlIHRoZSBvcmlnaW5hbCBzdHJpbmdcbiAgICBmb3JtYXR0aW5nIGluIGVhY2ggQVNUIG5vZGUgaWYgbm8gbW9kaWZpY2F0aW9ucyBhcmUgbWFkZSB0byBpdC5cbiAgKi9cbiAgaGFuZGxlZEJ5T3ZlcnJpZGUobm9kZTogTm9kZSwgZW5zdXJlTGVhZGluZ1doaXRlc3BhY2UgPSBmYWxzZSk6IGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLm9wdGlvbnMub3ZlcnJpZGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgbGV0IHJlc3VsdCA9IHRoaXMub3B0aW9ucy5vdmVycmlkZShub2RlLCB0aGlzLm9wdGlvbnMpO1xuICAgICAgaWYgKHR5cGVvZiByZXN1bHQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGlmIChlbnN1cmVMZWFkaW5nV2hpdGVzcGFjZSAmJiByZXN1bHQgIT09ICcnICYmIE5PTl9XSElURVNQQUNFLnRlc3QocmVzdWx0WzBdKSkge1xuICAgICAgICAgIHJlc3VsdCA9IGAgJHtyZXN1bHR9YDtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuYnVmZmVyICs9IHJlc3VsdDtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgTm9kZShub2RlOiBOb2RlKTogdm9pZCB7XG4gICAgc3dpdGNoIChub2RlLnR5cGUpIHtcbiAgICAgIGNhc2UgJ011c3RhY2hlU3RhdGVtZW50JzpcbiAgICAgIGNhc2UgJ0Jsb2NrU3RhdGVtZW50JzpcbiAgICAgIGNhc2UgJ1BhcnRpYWxTdGF0ZW1lbnQnOlxuICAgICAgY2FzZSAnTXVzdGFjaGVDb21tZW50U3RhdGVtZW50JzpcbiAgICAgIGNhc2UgJ0NvbW1lbnRTdGF0ZW1lbnQnOlxuICAgICAgY2FzZSAnVGV4dE5vZGUnOlxuICAgICAgY2FzZSAnRWxlbWVudE5vZGUnOlxuICAgICAgY2FzZSAnQXR0ck5vZGUnOlxuICAgICAgY2FzZSAnQmxvY2snOlxuICAgICAgY2FzZSAnVGVtcGxhdGUnOlxuICAgICAgICByZXR1cm4gdGhpcy5Ub3BMZXZlbFN0YXRlbWVudChub2RlKTtcbiAgICAgIGNhc2UgJ1N0cmluZ0xpdGVyYWwnOlxuICAgICAgY2FzZSAnQm9vbGVhbkxpdGVyYWwnOlxuICAgICAgY2FzZSAnTnVtYmVyTGl0ZXJhbCc6XG4gICAgICBjYXNlICdVbmRlZmluZWRMaXRlcmFsJzpcbiAgICAgIGNhc2UgJ051bGxMaXRlcmFsJzpcbiAgICAgIGNhc2UgJ1BhdGhFeHByZXNzaW9uJzpcbiAgICAgIGNhc2UgJ1N1YkV4cHJlc3Npb24nOlxuICAgICAgICByZXR1cm4gdGhpcy5FeHByZXNzaW9uKG5vZGUpO1xuICAgICAgY2FzZSAnUHJvZ3JhbSc6XG4gICAgICAgIHJldHVybiB0aGlzLkJsb2NrKG5vZGUpO1xuICAgICAgY2FzZSAnQ29uY2F0U3RhdGVtZW50JzpcbiAgICAgICAgLy8gc2hvdWxkIGhhdmUgYW4gQXR0ck5vZGUgcGFyZW50XG4gICAgICAgIHJldHVybiB0aGlzLkNvbmNhdFN0YXRlbWVudChub2RlKTtcbiAgICAgIGNhc2UgJ0hhc2gnOlxuICAgICAgICByZXR1cm4gdGhpcy5IYXNoKG5vZGUpO1xuICAgICAgY2FzZSAnSGFzaFBhaXInOlxuICAgICAgICByZXR1cm4gdGhpcy5IYXNoUGFpcihub2RlKTtcbiAgICAgIGNhc2UgJ0VsZW1lbnRNb2RpZmllclN0YXRlbWVudCc6XG4gICAgICAgIHJldHVybiB0aGlzLkVsZW1lbnRNb2RpZmllclN0YXRlbWVudChub2RlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdW5yZWFjaGFibGUobm9kZSwgJ05vZGUnKTtcbiAgfVxuXG4gIEV4cHJlc3Npb24oZXhwcmVzc2lvbjogRXhwcmVzc2lvbik6IHZvaWQge1xuICAgIHN3aXRjaCAoZXhwcmVzc2lvbi50eXBlKSB7XG4gICAgICBjYXNlICdTdHJpbmdMaXRlcmFsJzpcbiAgICAgIGNhc2UgJ0Jvb2xlYW5MaXRlcmFsJzpcbiAgICAgIGNhc2UgJ051bWJlckxpdGVyYWwnOlxuICAgICAgY2FzZSAnVW5kZWZpbmVkTGl0ZXJhbCc6XG4gICAgICBjYXNlICdOdWxsTGl0ZXJhbCc6XG4gICAgICAgIHJldHVybiB0aGlzLkxpdGVyYWwoZXhwcmVzc2lvbik7XG4gICAgICBjYXNlICdQYXRoRXhwcmVzc2lvbic6XG4gICAgICAgIHJldHVybiB0aGlzLlBhdGhFeHByZXNzaW9uKGV4cHJlc3Npb24pO1xuICAgICAgY2FzZSAnU3ViRXhwcmVzc2lvbic6XG4gICAgICAgIHJldHVybiB0aGlzLlN1YkV4cHJlc3Npb24oZXhwcmVzc2lvbik7XG4gICAgfVxuICAgIHJldHVybiB1bnJlYWNoYWJsZShleHByZXNzaW9uLCAnRXhwcmVzc2lvbicpO1xuICB9XG5cbiAgTGl0ZXJhbChsaXRlcmFsOiBMaXRlcmFsKSB7XG4gICAgc3dpdGNoIChsaXRlcmFsLnR5cGUpIHtcbiAgICAgIGNhc2UgJ1N0cmluZ0xpdGVyYWwnOlxuICAgICAgICByZXR1cm4gdGhpcy5TdHJpbmdMaXRlcmFsKGxpdGVyYWwpO1xuICAgICAgY2FzZSAnQm9vbGVhbkxpdGVyYWwnOlxuICAgICAgICByZXR1cm4gdGhpcy5Cb29sZWFuTGl0ZXJhbChsaXRlcmFsKTtcbiAgICAgIGNhc2UgJ051bWJlckxpdGVyYWwnOlxuICAgICAgICByZXR1cm4gdGhpcy5OdW1iZXJMaXRlcmFsKGxpdGVyYWwpO1xuICAgICAgY2FzZSAnVW5kZWZpbmVkTGl0ZXJhbCc6XG4gICAgICAgIHJldHVybiB0aGlzLlVuZGVmaW5lZExpdGVyYWwobGl0ZXJhbCk7XG4gICAgICBjYXNlICdOdWxsTGl0ZXJhbCc6XG4gICAgICAgIHJldHVybiB0aGlzLk51bGxMaXRlcmFsKGxpdGVyYWwpO1xuICAgIH1cbiAgICByZXR1cm4gdW5yZWFjaGFibGUobGl0ZXJhbCwgJ0xpdGVyYWwnKTtcbiAgfVxuXG4gIFRvcExldmVsU3RhdGVtZW50KHN0YXRlbWVudDogVG9wTGV2ZWxTdGF0ZW1lbnQpIHtcbiAgICBzd2l0Y2ggKHN0YXRlbWVudC50eXBlKSB7XG4gICAgICBjYXNlICdNdXN0YWNoZVN0YXRlbWVudCc6XG4gICAgICAgIHJldHVybiB0aGlzLk11c3RhY2hlU3RhdGVtZW50KHN0YXRlbWVudCk7XG4gICAgICBjYXNlICdCbG9ja1N0YXRlbWVudCc6XG4gICAgICAgIHJldHVybiB0aGlzLkJsb2NrU3RhdGVtZW50KHN0YXRlbWVudCk7XG4gICAgICBjYXNlICdQYXJ0aWFsU3RhdGVtZW50JzpcbiAgICAgICAgcmV0dXJuIHRoaXMuUGFydGlhbFN0YXRlbWVudChzdGF0ZW1lbnQpO1xuICAgICAgY2FzZSAnTXVzdGFjaGVDb21tZW50U3RhdGVtZW50JzpcbiAgICAgICAgcmV0dXJuIHRoaXMuTXVzdGFjaGVDb21tZW50U3RhdGVtZW50KHN0YXRlbWVudCk7XG4gICAgICBjYXNlICdDb21tZW50U3RhdGVtZW50JzpcbiAgICAgICAgcmV0dXJuIHRoaXMuQ29tbWVudFN0YXRlbWVudChzdGF0ZW1lbnQpO1xuICAgICAgY2FzZSAnVGV4dE5vZGUnOlxuICAgICAgICByZXR1cm4gdGhpcy5UZXh0Tm9kZShzdGF0ZW1lbnQpO1xuICAgICAgY2FzZSAnRWxlbWVudE5vZGUnOlxuICAgICAgICByZXR1cm4gdGhpcy5FbGVtZW50Tm9kZShzdGF0ZW1lbnQpO1xuICAgICAgY2FzZSAnQmxvY2snOlxuICAgICAgY2FzZSAnVGVtcGxhdGUnOlxuICAgICAgICByZXR1cm4gdGhpcy5CbG9jayhzdGF0ZW1lbnQpO1xuICAgICAgY2FzZSAnQXR0ck5vZGUnOlxuICAgICAgICAvLyBzaG91bGQgaGF2ZSBlbGVtZW50XG4gICAgICAgIHJldHVybiB0aGlzLkF0dHJOb2RlKHN0YXRlbWVudCk7XG4gICAgfVxuICAgIHVucmVhY2hhYmxlKHN0YXRlbWVudCwgJ1RvcExldmVsU3RhdGVtZW50Jyk7XG4gIH1cblxuICBCbG9jayhibG9jazogQmxvY2sgfCBQcm9ncmFtIHwgVGVtcGxhdGUpOiB2b2lkIHtcbiAgICAvKlxuICAgICAgV2hlbiBwcm9jZXNzaW5nIGEgdGVtcGxhdGUgbGlrZTpcblxuICAgICAgYGBgaGJzXG4gICAgICB7eyNpZiB3aGF0ZXZlcn19XG4gICAgICAgIHdoYXRldmVyXG4gICAgICB7e2Vsc2UgaWYgc29tZXRoaW5nRWxzZX19XG4gICAgICAgIHNvbWV0aGluZyBlbHNlXG4gICAgICB7e2Vsc2V9fVxuICAgICAgICBmYWxsYmFja1xuICAgICAge3svaWZ9fVxuICAgICAgYGBgXG5cbiAgICAgIFRoZSBBU1Qgc3RpbGwgX2VmZmVjdGl2ZWx5XyBsb29rcyBsaWtlOlxuXG4gICAgICBgYGBoYnNcbiAgICAgIHt7I2lmIHdoYXRldmVyfX1cbiAgICAgICAgd2hhdGV2ZXJcbiAgICAgIHt7ZWxzZX19e3sjaWYgc29tZXRoaW5nRWxzZX19XG4gICAgICAgIHNvbWV0aGluZyBlbHNlXG4gICAgICB7e2Vsc2V9fVxuICAgICAgICBmYWxsYmFja1xuICAgICAge3svaWZ9fXt7L2lmfX1cbiAgICAgIGBgYFxuXG4gICAgICBUaGUgb25seSB3YXkgd2UgY2FuIHRlbGwgaWYgdGhhdCBpcyB0aGUgY2FzZSBpcyBieSBjaGVja2luZyBmb3JcbiAgICAgIGBibG9jay5jaGFpbmVkYCwgYnV0IHVuZm9ydHVuYXRlbHkgd2hlbiB0aGUgYWN0dWFsIHN0YXRlbWVudHMgYXJlXG4gICAgICBwcm9jZXNzZWQgdGhlIGBibG9jay5ib2R5WzBdYCBub2RlICh3aGljaCB3aWxsIGFsd2F5cyBiZSBhXG4gICAgICBgQmxvY2tTdGF0ZW1lbnRgKSBoYXMgbm8gY2x1ZSB0aGF0IGl0cyBhbnNjZXN0b3IgYEJsb2NrYCBub2RlIHdhc1xuICAgICAgY2hhaW5lZC5cblxuICAgICAgVGhpcyBcImZvcndhcmRzXCIgdGhlIGBjaGFpbmVkYCBzZXR0aW5nIHNvIHRoYXQgd2UgY2FuIGNoZWNrXG4gICAgICBpdCBsYXRlciB3aGVuIHByb2Nlc3NpbmcgdGhlIGBCbG9ja1N0YXRlbWVudGAuXG4gICAgKi9cbiAgICBpZiAoYmxvY2suY2hhaW5lZCkge1xuICAgICAgbGV0IGZpcnN0Q2hpbGQgPSBibG9jay5ib2R5WzBdIGFzIEJsb2NrU3RhdGVtZW50O1xuICAgICAgZmlyc3RDaGlsZC5jaGFpbmVkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5oYW5kbGVkQnlPdmVycmlkZShibG9jaykpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLlRvcExldmVsU3RhdGVtZW50cyhibG9jay5ib2R5KTtcbiAgfVxuXG4gIFRvcExldmVsU3RhdGVtZW50cyhzdGF0ZW1lbnRzOiBUb3BMZXZlbFN0YXRlbWVudFtdKSB7XG4gICAgc3RhdGVtZW50cy5mb3JFYWNoKChzdGF0ZW1lbnQpID0+IHRoaXMuVG9wTGV2ZWxTdGF0ZW1lbnQoc3RhdGVtZW50KSk7XG4gIH1cblxuICBFbGVtZW50Tm9kZShlbDogRWxlbWVudE5vZGUpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5oYW5kbGVkQnlPdmVycmlkZShlbCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLk9wZW5FbGVtZW50Tm9kZShlbCk7XG4gICAgdGhpcy5Ub3BMZXZlbFN0YXRlbWVudHMoZWwuY2hpbGRyZW4pO1xuICAgIHRoaXMuQ2xvc2VFbGVtZW50Tm9kZShlbCk7XG4gIH1cblxuICBPcGVuRWxlbWVudE5vZGUoZWw6IEVsZW1lbnROb2RlKTogdm9pZCB7XG4gICAgdGhpcy5idWZmZXIgKz0gYDwke2VsLnRhZ31gO1xuICAgIGNvbnN0IHBhcnRzID0gWy4uLmVsLmF0dHJpYnV0ZXMsIC4uLmVsLm1vZGlmaWVycywgLi4uZWwuY29tbWVudHNdLnNvcnQoc29ydEJ5TG9jKTtcblxuICAgIGZvciAoY29uc3QgcGFydCBvZiBwYXJ0cykge1xuICAgICAgdGhpcy5idWZmZXIgKz0gJyAnO1xuICAgICAgc3dpdGNoIChwYXJ0LnR5cGUpIHtcbiAgICAgICAgY2FzZSAnQXR0ck5vZGUnOlxuICAgICAgICAgIHRoaXMuQXR0ck5vZGUocGFydCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ0VsZW1lbnRNb2RpZmllclN0YXRlbWVudCc6XG4gICAgICAgICAgdGhpcy5FbGVtZW50TW9kaWZpZXJTdGF0ZW1lbnQocGFydCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ011c3RhY2hlQ29tbWVudFN0YXRlbWVudCc6XG4gICAgICAgICAgdGhpcy5NdXN0YWNoZUNvbW1lbnRTdGF0ZW1lbnQocGFydCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChlbC5ibG9ja1BhcmFtcy5sZW5ndGgpIHtcbiAgICAgIHRoaXMuQmxvY2tQYXJhbXMoZWwuYmxvY2tQYXJhbXMpO1xuICAgIH1cbiAgICBpZiAoZWwuc2VsZkNsb3NpbmcpIHtcbiAgICAgIHRoaXMuYnVmZmVyICs9ICcgLyc7XG4gICAgfVxuICAgIHRoaXMuYnVmZmVyICs9ICc+JztcbiAgfVxuXG4gIENsb3NlRWxlbWVudE5vZGUoZWw6IEVsZW1lbnROb2RlKTogdm9pZCB7XG4gICAgaWYgKGVsLnNlbGZDbG9zaW5nIHx8IHZvaWRNYXBbZWwudGFnLnRvTG93ZXJDYXNlKCldKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuYnVmZmVyICs9IGA8LyR7ZWwudGFnfT5gO1xuICB9XG5cbiAgQXR0ck5vZGUoYXR0cjogQXR0ck5vZGUpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5oYW5kbGVkQnlPdmVycmlkZShhdHRyKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxldCB7IG5hbWUsIHZhbHVlIH0gPSBhdHRyO1xuXG4gICAgdGhpcy5idWZmZXIgKz0gbmFtZTtcbiAgICBpZiAodmFsdWUudHlwZSAhPT0gJ1RleHROb2RlJyB8fCB2YWx1ZS5jaGFycy5sZW5ndGggPiAwKSB7XG4gICAgICB0aGlzLmJ1ZmZlciArPSAnPSc7XG4gICAgICB0aGlzLkF0dHJOb2RlVmFsdWUodmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIEF0dHJOb2RlVmFsdWUodmFsdWU6IEF0dHJOb2RlWyd2YWx1ZSddKSB7XG4gICAgaWYgKHZhbHVlLnR5cGUgPT09ICdUZXh0Tm9kZScpIHtcbiAgICAgIHRoaXMuYnVmZmVyICs9ICdcIic7XG4gICAgICB0aGlzLlRleHROb2RlKHZhbHVlLCB0cnVlKTtcbiAgICAgIHRoaXMuYnVmZmVyICs9ICdcIic7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuTm9kZSh2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgVGV4dE5vZGUodGV4dDogVGV4dE5vZGUsIGlzQXR0cj86IGJvb2xlYW4pOiB2b2lkIHtcbiAgICBpZiAodGhpcy5oYW5kbGVkQnlPdmVycmlkZSh0ZXh0KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuZW50aXR5RW5jb2RpbmcgPT09ICdyYXcnKSB7XG4gICAgICB0aGlzLmJ1ZmZlciArPSB0ZXh0LmNoYXJzO1xuICAgIH0gZWxzZSBpZiAoaXNBdHRyKSB7XG4gICAgICB0aGlzLmJ1ZmZlciArPSBlc2NhcGVBdHRyVmFsdWUodGV4dC5jaGFycyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuYnVmZmVyICs9IGVzY2FwZVRleHQodGV4dC5jaGFycyk7XG4gICAgfVxuICB9XG5cbiAgTXVzdGFjaGVTdGF0ZW1lbnQobXVzdGFjaGU6IE11c3RhY2hlU3RhdGVtZW50KTogdm9pZCB7XG4gICAgaWYgKHRoaXMuaGFuZGxlZEJ5T3ZlcnJpZGUobXVzdGFjaGUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5idWZmZXIgKz0gbXVzdGFjaGUuZXNjYXBlZCA/ICd7eycgOiAne3t7JztcblxuICAgIGlmIChtdXN0YWNoZS5zdHJpcC5vcGVuKSB7XG4gICAgICB0aGlzLmJ1ZmZlciArPSAnfic7XG4gICAgfVxuXG4gICAgdGhpcy5FeHByZXNzaW9uKG11c3RhY2hlLnBhdGgpO1xuICAgIHRoaXMuUGFyYW1zKG11c3RhY2hlLnBhcmFtcyk7XG4gICAgdGhpcy5IYXNoKG11c3RhY2hlLmhhc2gpO1xuXG4gICAgaWYgKG11c3RhY2hlLnN0cmlwLmNsb3NlKSB7XG4gICAgICB0aGlzLmJ1ZmZlciArPSAnfic7XG4gICAgfVxuXG4gICAgdGhpcy5idWZmZXIgKz0gbXVzdGFjaGUuZXNjYXBlZCA/ICd9fScgOiAnfX19JztcbiAgfVxuXG4gIEJsb2NrU3RhdGVtZW50KGJsb2NrOiBCbG9ja1N0YXRlbWVudCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmhhbmRsZWRCeU92ZXJyaWRlKGJsb2NrKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChibG9jay5jaGFpbmVkKSB7XG4gICAgICB0aGlzLmJ1ZmZlciArPSBibG9jay5pbnZlcnNlU3RyaXAub3BlbiA/ICd7e34nIDogJ3t7JztcbiAgICAgIHRoaXMuYnVmZmVyICs9ICdlbHNlICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuYnVmZmVyICs9IGJsb2NrLm9wZW5TdHJpcC5vcGVuID8gJ3t7fiMnIDogJ3t7Iyc7XG4gICAgfVxuXG4gICAgdGhpcy5FeHByZXNzaW9uKGJsb2NrLnBhdGgpO1xuICAgIHRoaXMuUGFyYW1zKGJsb2NrLnBhcmFtcyk7XG4gICAgdGhpcy5IYXNoKGJsb2NrLmhhc2gpO1xuICAgIGlmIChibG9jay5wcm9ncmFtLmJsb2NrUGFyYW1zLmxlbmd0aCkge1xuICAgICAgdGhpcy5CbG9ja1BhcmFtcyhibG9jay5wcm9ncmFtLmJsb2NrUGFyYW1zKTtcbiAgICB9XG5cbiAgICBpZiAoYmxvY2suY2hhaW5lZCkge1xuICAgICAgdGhpcy5idWZmZXIgKz0gYmxvY2suaW52ZXJzZVN0cmlwLmNsb3NlID8gJ359fScgOiAnfX0nO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmJ1ZmZlciArPSBibG9jay5vcGVuU3RyaXAuY2xvc2UgPyAnfn19JyA6ICd9fSc7XG4gICAgfVxuXG4gICAgdGhpcy5CbG9jayhibG9jay5wcm9ncmFtKTtcblxuICAgIGlmIChibG9jay5pbnZlcnNlKSB7XG4gICAgICBpZiAoIWJsb2NrLmludmVyc2UuY2hhaW5lZCkge1xuICAgICAgICB0aGlzLmJ1ZmZlciArPSBibG9jay5pbnZlcnNlU3RyaXAub3BlbiA/ICd7e34nIDogJ3t7JztcbiAgICAgICAgdGhpcy5idWZmZXIgKz0gJ2Vsc2UnO1xuICAgICAgICB0aGlzLmJ1ZmZlciArPSBibG9jay5pbnZlcnNlU3RyaXAuY2xvc2UgPyAnfn19JyA6ICd9fSc7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuQmxvY2soYmxvY2suaW52ZXJzZSk7XG4gICAgfVxuXG4gICAgaWYgKCFibG9jay5jaGFpbmVkKSB7XG4gICAgICB0aGlzLmJ1ZmZlciArPSBibG9jay5jbG9zZVN0cmlwLm9wZW4gPyAne3t+LycgOiAne3svJztcbiAgICAgIHRoaXMuRXhwcmVzc2lvbihibG9jay5wYXRoKTtcbiAgICAgIHRoaXMuYnVmZmVyICs9IGJsb2NrLmNsb3NlU3RyaXAuY2xvc2UgPyAnfn19JyA6ICd9fSc7XG4gICAgfVxuICB9XG5cbiAgQmxvY2tQYXJhbXMoYmxvY2tQYXJhbXM6IHN0cmluZ1tdKSB7XG4gICAgdGhpcy5idWZmZXIgKz0gYCBhcyB8JHtibG9ja1BhcmFtcy5qb2luKCcgJyl9fGA7XG4gIH1cblxuICBQYXJ0aWFsU3RhdGVtZW50KHBhcnRpYWw6IFBhcnRpYWxTdGF0ZW1lbnQpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5oYW5kbGVkQnlPdmVycmlkZShwYXJ0aWFsKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuYnVmZmVyICs9ICd7ez4nO1xuICAgIHRoaXMuRXhwcmVzc2lvbihwYXJ0aWFsLm5hbWUpO1xuICAgIHRoaXMuUGFyYW1zKHBhcnRpYWwucGFyYW1zKTtcbiAgICB0aGlzLkhhc2gocGFydGlhbC5oYXNoKTtcbiAgICB0aGlzLmJ1ZmZlciArPSAnfX0nO1xuICB9XG5cbiAgQ29uY2F0U3RhdGVtZW50KGNvbmNhdDogQ29uY2F0U3RhdGVtZW50KTogdm9pZCB7XG4gICAgaWYgKHRoaXMuaGFuZGxlZEJ5T3ZlcnJpZGUoY29uY2F0KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuYnVmZmVyICs9ICdcIic7XG4gICAgY29uY2F0LnBhcnRzLmZvckVhY2goKHBhcnQpID0+IHtcbiAgICAgIGlmIChwYXJ0LnR5cGUgPT09ICdUZXh0Tm9kZScpIHtcbiAgICAgICAgdGhpcy5UZXh0Tm9kZShwYXJ0LCB0cnVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuTm9kZShwYXJ0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLmJ1ZmZlciArPSAnXCInO1xuICB9XG5cbiAgTXVzdGFjaGVDb21tZW50U3RhdGVtZW50KGNvbW1lbnQ6IE11c3RhY2hlQ29tbWVudFN0YXRlbWVudCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmhhbmRsZWRCeU92ZXJyaWRlKGNvbW1lbnQpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5idWZmZXIgKz0gYHt7IS0tJHtjb21tZW50LnZhbHVlfS0tfX1gO1xuICB9XG5cbiAgRWxlbWVudE1vZGlmaWVyU3RhdGVtZW50KG1vZDogRWxlbWVudE1vZGlmaWVyU3RhdGVtZW50KTogdm9pZCB7XG4gICAgaWYgKHRoaXMuaGFuZGxlZEJ5T3ZlcnJpZGUobW9kKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuYnVmZmVyICs9ICd7eyc7XG4gICAgdGhpcy5FeHByZXNzaW9uKG1vZC5wYXRoKTtcbiAgICB0aGlzLlBhcmFtcyhtb2QucGFyYW1zKTtcbiAgICB0aGlzLkhhc2gobW9kLmhhc2gpO1xuICAgIHRoaXMuYnVmZmVyICs9ICd9fSc7XG4gIH1cblxuICBDb21tZW50U3RhdGVtZW50KGNvbW1lbnQ6IENvbW1lbnRTdGF0ZW1lbnQpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5oYW5kbGVkQnlPdmVycmlkZShjb21tZW50KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuYnVmZmVyICs9IGA8IS0tJHtjb21tZW50LnZhbHVlfS0tPmA7XG4gIH1cblxuICBQYXRoRXhwcmVzc2lvbihwYXRoOiBQYXRoRXhwcmVzc2lvbik6IHZvaWQge1xuICAgIGlmICh0aGlzLmhhbmRsZWRCeU92ZXJyaWRlKHBhdGgpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5idWZmZXIgKz0gcGF0aC5vcmlnaW5hbDtcbiAgfVxuXG4gIFN1YkV4cHJlc3Npb24oc2V4cDogU3ViRXhwcmVzc2lvbik6IHZvaWQge1xuICAgIGlmICh0aGlzLmhhbmRsZWRCeU92ZXJyaWRlKHNleHApKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5idWZmZXIgKz0gJygnO1xuICAgIHRoaXMuRXhwcmVzc2lvbihzZXhwLnBhdGgpO1xuICAgIHRoaXMuUGFyYW1zKHNleHAucGFyYW1zKTtcbiAgICB0aGlzLkhhc2goc2V4cC5oYXNoKTtcbiAgICB0aGlzLmJ1ZmZlciArPSAnKSc7XG4gIH1cblxuICBQYXJhbXMocGFyYW1zOiBFeHByZXNzaW9uW10pIHtcbiAgICAvLyBUT0RPOiBpbXBsZW1lbnQgYSB0b3AgbGV2ZWwgUGFyYW1zIEFTVCBub2RlIChqdXN0IGxpa2UgdGhlIEhhc2ggb2JqZWN0KVxuICAgIC8vIHNvIHRoYXQgdGhpcyBjYW4gYWxzbyBiZSBvdmVycmlkZGVuXG4gICAgaWYgKHBhcmFtcy5sZW5ndGgpIHtcbiAgICAgIHBhcmFtcy5mb3JFYWNoKChwYXJhbSkgPT4ge1xuICAgICAgICB0aGlzLmJ1ZmZlciArPSAnICc7XG4gICAgICAgIHRoaXMuRXhwcmVzc2lvbihwYXJhbSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBIYXNoKGhhc2g6IEhhc2gpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5oYW5kbGVkQnlPdmVycmlkZShoYXNoLCB0cnVlKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGhhc2gucGFpcnMuZm9yRWFjaCgocGFpcikgPT4ge1xuICAgICAgdGhpcy5idWZmZXIgKz0gJyAnO1xuICAgICAgdGhpcy5IYXNoUGFpcihwYWlyKTtcbiAgICB9KTtcbiAgfVxuXG4gIEhhc2hQYWlyKHBhaXI6IEhhc2hQYWlyKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuaGFuZGxlZEJ5T3ZlcnJpZGUocGFpcikpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmJ1ZmZlciArPSBwYWlyLmtleTtcbiAgICB0aGlzLmJ1ZmZlciArPSAnPSc7XG4gICAgdGhpcy5Ob2RlKHBhaXIudmFsdWUpO1xuICB9XG5cbiAgU3RyaW5nTGl0ZXJhbChzdHI6IFN0cmluZ0xpdGVyYWwpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5oYW5kbGVkQnlPdmVycmlkZShzdHIpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5idWZmZXIgKz0gSlNPTi5zdHJpbmdpZnkoc3RyLnZhbHVlKTtcbiAgfVxuXG4gIEJvb2xlYW5MaXRlcmFsKGJvb2w6IEJvb2xlYW5MaXRlcmFsKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuaGFuZGxlZEJ5T3ZlcnJpZGUoYm9vbCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmJ1ZmZlciArPSBib29sLnZhbHVlO1xuICB9XG5cbiAgTnVtYmVyTGl0ZXJhbChudW1iZXI6IE51bWJlckxpdGVyYWwpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5oYW5kbGVkQnlPdmVycmlkZShudW1iZXIpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5idWZmZXIgKz0gbnVtYmVyLnZhbHVlO1xuICB9XG5cbiAgVW5kZWZpbmVkTGl0ZXJhbChub2RlOiBVbmRlZmluZWRMaXRlcmFsKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuaGFuZGxlZEJ5T3ZlcnJpZGUobm9kZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmJ1ZmZlciArPSAndW5kZWZpbmVkJztcbiAgfVxuXG4gIE51bGxMaXRlcmFsKG5vZGU6IE51bGxMaXRlcmFsKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuaGFuZGxlZEJ5T3ZlcnJpZGUobm9kZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmJ1ZmZlciArPSAnbnVsbCc7XG4gIH1cblxuICBwcmludChub2RlOiBOb2RlKSB7XG4gICAgbGV0IHsgb3B0aW9ucyB9ID0gdGhpcztcblxuICAgIGlmIChvcHRpb25zLm92ZXJyaWRlKSB7XG4gICAgICBsZXQgcmVzdWx0ID0gb3B0aW9ucy5vdmVycmlkZShub2RlLCBvcHRpb25zKTtcblxuICAgICAgaWYgKHJlc3VsdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5idWZmZXIgPSAnJztcbiAgICB0aGlzLk5vZGUobm9kZSk7XG4gICAgcmV0dXJuIHRoaXMuYnVmZmVyO1xuICB9XG59XG5cbmZ1bmN0aW9uIHVucmVhY2hhYmxlKG5vZGU6IG5ldmVyLCBwYXJlbnROb2RlVHlwZTogc3RyaW5nKTogbmV2ZXIge1xuICBsZXQgeyBsb2MsIHR5cGUgfSA9IChub2RlIGFzIGFueSkgYXMgTm9kZTtcbiAgdGhyb3cgbmV3IEVycm9yKFxuICAgIGBOb24tZXhoYXVzdGl2ZSBub2RlIG5hcnJvd2luZyAke3R5cGV9IEAgbG9jYXRpb246ICR7SlNPTi5zdHJpbmdpZnkoXG4gICAgICBsb2NcbiAgICApfSBmb3IgcGFyZW50ICR7cGFyZW50Tm9kZVR5cGV9YFxuICApO1xufVxuIl0sInNvdXJjZVJvb3QiOiIifQ==