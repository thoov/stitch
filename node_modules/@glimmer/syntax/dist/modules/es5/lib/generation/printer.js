function _createForOfIteratorHelperLoose(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } it = o[Symbol.iterator](); return it.next.bind(it); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

import { voidMap } from '../parser/tokenizer-event-handlers';
import { escapeText, escapeAttrValue, sortByLoc } from './util';
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

export { Printer as default };

function unreachable(node, parentNodeType) {
  var loc = node.loc,
      type = node.type;
  throw new Error("Non-exhaustive node narrowing " + type + " @ location: " + JSON.stringify(loc) + " for parent " + parentNodeType);
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL0BnbGltbWVyL3N5bnRheC9saWIvZ2VuZXJhdGlvbi9wcmludGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQTRCQSxTQUFBLE9BQUEsUUFBQSxvQ0FBQTtBQUNBLFNBQUEsVUFBQSxFQUFBLGVBQUEsRUFBQSxTQUFBLFFBQUEsUUFBQTtBQUVBLElBQU0sY0FBYyxHQUFwQixJQUFBOztJQXNCYyxPO0FBSVosbUJBQUEsT0FBQSxFQUFtQztBQUgzQixTQUFBLE1BQUEsR0FBQSxFQUFBO0FBSU4sU0FBQSxPQUFBLEdBQUEsT0FBQTtBQUNEO0FBRUQ7Ozs7Ozs7Ozs7OztTQVNBLGlCLEdBQUEsMkJBQWlCLElBQWpCLEVBQThCLHVCQUE5QixFQUE2RDtBQUFBLFFBQS9CLHVCQUErQjtBQUEvQixNQUFBLHVCQUErQixHQUE1QyxLQUE0QztBQUFBOztBQUMzRCxRQUFJLEtBQUEsT0FBQSxDQUFBLFFBQUEsS0FBSixTQUFBLEVBQXlDO0FBQ3ZDLFVBQUksTUFBTSxHQUFHLEtBQUEsT0FBQSxDQUFBLFFBQUEsQ0FBQSxJQUFBLEVBQTRCLEtBQXpDLE9BQWEsQ0FBYjs7QUFDQSxVQUFJLE9BQUEsTUFBQSxLQUFKLFFBQUEsRUFBZ0M7QUFDOUIsWUFBSSx1QkFBdUIsSUFBSSxNQUFNLEtBQWpDLEVBQUEsSUFBNEMsY0FBYyxDQUFkLElBQUEsQ0FBb0IsTUFBTSxDQUExRSxDQUEwRSxDQUExQixDQUFoRCxFQUFnRjtBQUM5RSxVQUFBLE1BQU0sU0FBTixNQUFBO0FBQ0Q7O0FBRUQsYUFBQSxNQUFBLElBQUEsTUFBQTtBQUNBLGVBQUEsSUFBQTtBQUNEO0FBQ0Y7O0FBRUQsV0FBQSxLQUFBO0FBQ0QsRzs7U0FFRCxJLEdBQUEsY0FBSSxJQUFKLEVBQWU7QUFDYixZQUFRLElBQUksQ0FBWixJQUFBO0FBQ0UsV0FBQSxtQkFBQTtBQUNBLFdBQUEsZ0JBQUE7QUFDQSxXQUFBLGtCQUFBO0FBQ0EsV0FBQSwwQkFB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QUEsSUFBQSxDQUFBLElBQUE7QUFDQSxXQUFPLEtBQVAsTUFBQTtBQUNELEc7Ozs7O1NBN2VXLE87O0FBZ2ZkLFNBQUEsV0FBQSxDQUFBLElBQUEsRUFBQSxjQUFBLEVBQXdEO0FBQUEsTUFDbEQsR0FEa0QsR0FDdEQsSUFEc0QsQ0FDbEQsR0FEa0Q7QUFBQSxNQUMzQyxJQUQyQyxHQUN0RCxJQURzRCxDQUMzQyxJQUQyQztBQUV0RCxRQUFNLElBQUEsS0FBQSxvQ0FDNkIsSUFEN0IscUJBQ2lELElBQUksQ0FBSixTQUFBLENBQUEsR0FBQSxDQURqRCxvQkFBTixjQUFNLENBQU47QUFLRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIEF0dHJOb2RlLFxuICBCbG9jayxcbiAgQmxvY2tTdGF0ZW1lbnQsXG4gIEVsZW1lbnROb2RlLFxuICBNdXN0YWNoZVN0YXRlbWVudCxcbiAgTm9kZSxcbiAgUHJvZ3JhbSxcbiAgVGV4dE5vZGUsXG4gIFBhcnRpYWxTdGF0ZW1lbnQsXG4gIENvbmNhdFN0YXRlbWVudCxcbiAgTXVzdGFjaGVDb21tZW50U3RhdGVtZW50LFxuICBDb21tZW50U3RhdGVtZW50LFxuICBFbGVtZW50TW9kaWZpZXJTdGF0ZW1lbnQsXG4gIEV4cHJlc3Npb24sXG4gIFBhdGhFeHByZXNzaW9uLFxuICBTdWJFeHByZXNzaW9uLFxuICBIYXNoLFxuICBIYXNoUGFpcixcbiAgTGl0ZXJhbCxcbiAgU3RyaW5nTGl0ZXJhbCxcbiAgQm9vbGVhbkxpdGVyYWwsXG4gIE51bWJlckxpdGVyYWwsXG4gIFVuZGVmaW5lZExpdGVyYWwsXG4gIE51bGxMaXRlcmFsLFxuICBUb3BMZXZlbFN0YXRlbWVudCxcbiAgVGVtcGxhdGUsXG59IGZyb20gJy4uL3R5cGVzL25vZGVzJztcbmltcG9ydCB7IHZvaWRNYXAgfSBmcm9tICcuLi9wYXJzZXIvdG9rZW5pemVyLWV2ZW50LWhhbmRsZXJzJztcbmltcG9ydCB7IGVzY2FwZVRleHQsIGVzY2FwZUF0dHJWYWx1ZSwgc29ydEJ5TG9jIH0gZnJvbSAnLi91dGlsJztcblxuY29uc3QgTk9OX1dISVRFU1BBQ0UgPSAvXFxTLztcblxuZXhwb3J0IGludGVyZmFjZSBQcmludGVyT3B0aW9ucyB7XG4gIGVudGl0eUVuY29kaW5nOiAndHJhbnNmb3JtZWQnIHwgJ3Jhdyc7XG5cbiAgLyoqXG4gICAqIFVzZWQgdG8gb3ZlcnJpZGUgdGhlIG1lY2hhbmlzbSBvZiBwcmludGluZyBhIGdpdmVuIEFTVC5Ob2RlLlxuICAgKlxuICAgKiBUaGlzIHdpbGwgZ2VuZXJhbGx5IG9ubHkgYmUgdXNlZnVsIHRvIHNvdXJjZSAtPiBzb3VyY2UgY29kZW1vZHNcbiAgICogd2hlcmUgeW91IHdvdWxkIGxpa2UgdG8gc3BlY2lhbGl6ZS9vdmVycmlkZSB0aGUgd2F5IGEgZ2l2ZW4gbm9kZSBpc1xuICAgKiBwcmludGVkIChlLmcuIHlvdSB3b3VsZCBsaWtlIHRvIHByZXNlcnZlIGFzIG11Y2ggb2YgdGhlIG9yaWdpbmFsXG4gICAqIGZvcm1hdHRpbmcgYXMgcG9zc2libGUpLlxuICAgKlxuICAgKiBXaGVuIHRoZSBwcm92aWRlZCBvdmVycmlkZSByZXR1cm5zIHVuZGVmaW5lZCwgdGhlIGRlZmF1bHQgYnVpbHQgaW4gcHJpbnRpbmdcbiAgICogd2lsbCBiZSBkb25lIGZvciB0aGUgQVNULk5vZGUuXG4gICAqXG4gICAqIEBwYXJhbSBhc3QgdGhlIGFzdCBub2RlIHRvIGJlIHByaW50ZWRcbiAgICogQHBhcmFtIG9wdGlvbnMgdGhlIG9wdGlvbnMgc3BlY2lmaWVkIGR1cmluZyB0aGUgcHJpbnQoKSBpbnZvY2F0aW9uXG4gICAqL1xuICBvdmVycmlkZT8oYXN0OiBOb2RlLCBvcHRpb25zOiBQcmludGVyT3B0aW9ucyk6IHZvaWQgfCBzdHJpbmc7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFByaW50ZXIge1xuICBwcml2YXRlIGJ1ZmZlciA9ICcnO1xuICBwcml2YXRlIG9wdGlvbnM6IFByaW50ZXJPcHRpb25zO1xuXG4gIGNvbnN0cnVjdG9yKG9wdGlvbnM6IFByaW50ZXJPcHRpb25zKSB7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgfVxuXG4gIC8qXG4gICAgVGhpcyBpcyB1c2VkIGJ5IF9hbGxfIG1ldGhvZHMgb24gdGhpcyBQcmludGVyIGNsYXNzIHRoYXQgYWRkIHRvIGB0aGlzLmJ1ZmZlcmAsXG4gICAgaXQgYWxsb3dzIGNvbnN1bWVycyBvZiB0aGUgcHJpbnRlciB0byB1c2UgYWx0ZXJuYXRlIHN0cmluZyByZXByZXNlbnRhdGlvbnMgZm9yXG4gICAgYSBnaXZlbiBub2RlLlxuXG4gICAgVGhlIHByaW1hcnkgdXNlIGNhc2UgZm9yIHRoaXMgYXJlIHRoaW5ncyBsaWtlIHNvdXJjZSAtPiBzb3VyY2UgY29kZW1vZCB1dGlsaXRpZXMuXG4gICAgRm9yIGV4YW1wbGUsIGVtYmVyLXRlbXBsYXRlLXJlY2FzdCBhdHRlbXB0cyB0byBhbHdheXMgcHJlc2VydmUgdGhlIG9yaWdpbmFsIHN0cmluZ1xuICAgIGZvcm1hdHRpbmcgaW4gZWFjaCBBU1Qgbm9kZSBpZiBubyBtb2RpZmljYXRpb25zIGFyZSBtYWRlIHRvIGl0LlxuICAqL1xuICBoYW5kbGVkQnlPdmVycmlkZShub2RlOiBOb2RlLCBlbnN1cmVMZWFkaW5nV2hpdGVzcGFjZSA9IGZhbHNlKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5vdmVycmlkZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBsZXQgcmVzdWx0ID0gdGhpcy5vcHRpb25zLm92ZXJyaWRlKG5vZGUsIHRoaXMub3B0aW9ucyk7XG4gICAgICBpZiAodHlwZW9mIHJlc3VsdCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgaWYgKGVuc3VyZUxlYWRpbmdXaGl0ZXNwYWNlICYmIHJlc3VsdCAhPT0gJycgJiYgTk9OX1dISVRFU1BBQ0UudGVzdChyZXN1bHRbMF0pKSB7XG4gICAgICAgICAgcmVzdWx0ID0gYCAke3Jlc3VsdH1gO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5idWZmZXIgKz0gcmVzdWx0O1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBOb2RlKG5vZGU6IE5vZGUpOiB2b2lkIHtcbiAgICBzd2l0Y2ggKG5vZGUudHlwZSkge1xuICAgICAgY2FzZSAnTXVzdGFjaGVTdGF0ZW1lbnQnOlxuICAgICAgY2FzZSAnQmxvY2tTdGF0ZW1lbnQnOlxuICAgICAgY2FzZSAnUGFydGlhbFN0YXRlbWVudCc6XG4gICAgICBjYXNlICdNdXN0YWNoZUNvbW1lbnRTdGF0ZW1lbnQnOlxuICAgICAgY2FzZSAnQ29tbWVudFN0YXRlbWVudCc6XG4gICAgICBjYXNlICdUZXh0Tm9kZSc6XG4gICAgICBjYXNlICdFbGVtZW50Tm9kZSc6XG4gICAgICBjYXNlICdBdHRyTm9kZSc6XG4gICAgICBjYXNlICdCbG9jayc6XG4gICAgICBjYXNlICdUZW1wbGF0ZSc6XG4gICAgICAgIHJldHVybiB0aGlzLlRvcExldmVsU3RhdGVtZW50KG5vZGUpO1xuICAgICAgY2FzZSAnU3RyaW5nTGl0ZXJhbCc6XG4gICAgICBjYXNlICdCb29sZWFuTGl0ZXJhbCc6XG4gICAgICBjYXNlICdOdW1iZXJMaXRlcmFsJzpcbiAgICAgIGNhc2UgJ1VuZGVmaW5lZExpdGVyYWwnOlxuICAgICAgY2FzZSAnTnVsbExpdGVyYWwnOlxuICAgICAgY2FzZSAnUGF0aEV4cHJlc3Npb24nOlxuICAgICAgY2FzZSAnU3ViRXhwcmVzc2lvbic6XG4gICAgICAgIHJldHVybiB0aGlzLkV4cHJlc3Npb24obm9kZSk7XG4gICAgICBjYXNlICdQcm9ncmFtJzpcbiAgICAgICAgcmV0dXJuIHRoaXMuQmxvY2sobm9kZSk7XG4gICAgICBjYXNlICdDb25jYXRTdGF0ZW1lbnQnOlxuICAgICAgICAvLyBzaG91bGQgaGF2ZSBhbiBBdHRyTm9kZSBwYXJlbnRcbiAgICAgICAgcmV0dXJuIHRoaXMuQ29uY2F0U3RhdGVtZW50KG5vZGUpO1xuICAgICAgY2FzZSAnSGFzaCc6XG4gICAgICAgIHJldHVybiB0aGlzLkhhc2gobm9kZSk7XG4gICAgICBjYXNlICdIYXNoUGFpcic6XG4gICAgICAgIHJldHVybiB0aGlzLkhhc2hQYWlyKG5vZGUpO1xuICAgICAgY2FzZSAnRWxlbWVudE1vZGlmaWVyU3RhdGVtZW50JzpcbiAgICAgICAgcmV0dXJuIHRoaXMuRWxlbWVudE1vZGlmaWVyU3RhdGVtZW50KG5vZGUpO1xuICAgIH1cblxuICAgIHJldHVybiB1bnJlYWNoYWJsZShub2RlLCAnTm9kZScpO1xuICB9XG5cbiAgRXhwcmVzc2lvbihleHByZXNzaW9uOiBFeHByZXNzaW9uKTogdm9pZCB7XG4gICAgc3dpdGNoIChleHByZXNzaW9uLnR5cGUpIHtcbiAgICAgIGNhc2UgJ1N0cmluZ0xpdGVyYWwnOlxuICAgICAgY2FzZSAnQm9vbGVhbkxpdGVyYWwnOlxuICAgICAgY2FzZSAnTnVtYmVyTGl0ZXJhbCc6XG4gICAgICBjYXNlICdVbmRlZmluZWRMaXRlcmFsJzpcbiAgICAgIGNhc2UgJ051bGxMaXRlcmFsJzpcbiAgICAgICAgcmV0dXJuIHRoaXMuTGl0ZXJhbChleHByZXNzaW9uKTtcbiAgICAgIGNhc2UgJ1BhdGhFeHByZXNzaW9uJzpcbiAgICAgICAgcmV0dXJuIHRoaXMuUGF0aEV4cHJlc3Npb24oZXhwcmVzc2lvbik7XG4gICAgICBjYXNlICdTdWJFeHByZXNzaW9uJzpcbiAgICAgICAgcmV0dXJuIHRoaXMuU3ViRXhwcmVzc2lvbihleHByZXNzaW9uKTtcbiAgICB9XG4gICAgcmV0dXJuIHVucmVhY2hhYmxlKGV4cHJlc3Npb24sICdFeHByZXNzaW9uJyk7XG4gIH1cblxuICBMaXRlcmFsKGxpdGVyYWw6IExpdGVyYWwpIHtcbiAgICBzd2l0Y2ggKGxpdGVyYWwudHlwZSkge1xuICAgICAgY2FzZSAnU3RyaW5nTGl0ZXJhbCc6XG4gICAgICAgIHJldHVybiB0aGlzLlN0cmluZ0xpdGVyYWwobGl0ZXJhbCk7XG4gICAgICBjYXNlICdCb29sZWFuTGl0ZXJhbCc6XG4gICAgICAgIHJldHVybiB0aGlzLkJvb2xlYW5MaXRlcmFsKGxpdGVyYWwpO1xuICAgICAgY2FzZSAnTnVtYmVyTGl0ZXJhbCc6XG4gICAgICAgIHJldHVybiB0aGlzLk51bWJlckxpdGVyYWwobGl0ZXJhbCk7XG4gICAgICBjYXNlICdVbmRlZmluZWRMaXRlcmFsJzpcbiAgICAgICAgcmV0dXJuIHRoaXMuVW5kZWZpbmVkTGl0ZXJhbChsaXRlcmFsKTtcbiAgICAgIGNhc2UgJ051bGxMaXRlcmFsJzpcbiAgICAgICAgcmV0dXJuIHRoaXMuTnVsbExpdGVyYWwobGl0ZXJhbCk7XG4gICAgfVxuICAgIHJldHVybiB1bnJlYWNoYWJsZShsaXRlcmFsLCAnTGl0ZXJhbCcpO1xuICB9XG5cbiAgVG9wTGV2ZWxTdGF0ZW1lbnQoc3RhdGVtZW50OiBUb3BMZXZlbFN0YXRlbWVudCkge1xuICAgIHN3aXRjaCAoc3RhdGVtZW50LnR5cGUpIHtcbiAgICAgIGNhc2UgJ011c3RhY2hlU3RhdGVtZW50JzpcbiAgICAgICAgcmV0dXJuIHRoaXMuTXVzdGFjaGVTdGF0ZW1lbnQoc3RhdGVtZW50KTtcbiAgICAgIGNhc2UgJ0Jsb2NrU3RhdGVtZW50JzpcbiAgICAgICAgcmV0dXJuIHRoaXMuQmxvY2tTdGF0ZW1lbnQoc3RhdGVtZW50KTtcbiAgICAgIGNhc2UgJ1BhcnRpYWxTdGF0ZW1lbnQnOlxuICAgICAgICByZXR1cm4gdGhpcy5QYXJ0aWFsU3RhdGVtZW50KHN0YXRlbWVudCk7XG4gICAgICBjYXNlICdNdXN0YWNoZUNvbW1lbnRTdGF0ZW1lbnQnOlxuICAgICAgICByZXR1cm4gdGhpcy5NdXN0YWNoZUNvbW1lbnRTdGF0ZW1lbnQoc3RhdGVtZW50KTtcbiAgICAgIGNhc2UgJ0NvbW1lbnRTdGF0ZW1lbnQnOlxuICAgICAgICByZXR1cm4gdGhpcy5Db21tZW50U3RhdGVtZW50KHN0YXRlbWVudCk7XG4gICAgICBjYXNlICdUZXh0Tm9kZSc6XG4gICAgICAgIHJldHVybiB0aGlzLlRleHROb2RlKHN0YXRlbWVudCk7XG4gICAgICBjYXNlICdFbGVtZW50Tm9kZSc6XG4gICAgICAgIHJldHVybiB0aGlzLkVsZW1lbnROb2RlKHN0YXRlbWVudCk7XG4gICAgICBjYXNlICdCbG9jayc6XG4gICAgICBjYXNlICdUZW1wbGF0ZSc6XG4gICAgICAgIHJldHVybiB0aGlzLkJsb2NrKHN0YXRlbWVudCk7XG4gICAgICBjYXNlICdBdHRyTm9kZSc6XG4gICAgICAgIC8vIHNob3VsZCBoYXZlIGVsZW1lbnRcbiAgICAgICAgcmV0dXJuIHRoaXMuQXR0ck5vZGUoc3RhdGVtZW50KTtcbiAgICB9XG4gICAgdW5yZWFjaGFibGUoc3RhdGVtZW50LCAnVG9wTGV2ZWxTdGF0ZW1lbnQnKTtcbiAgfVxuXG4gIEJsb2NrKGJsb2NrOiBCbG9jayB8IFByb2dyYW0gfCBUZW1wbGF0ZSk6IHZvaWQge1xuICAgIC8qXG4gICAgICBXaGVuIHByb2Nlc3NpbmcgYSB0ZW1wbGF0ZSBsaWtlOlxuXG4gICAgICBgYGBoYnNcbiAgICAgIHt7I2lmIHdoYXRldmVyfX1cbiAgICAgICAgd2hhdGV2ZXJcbiAgICAgIHt7ZWxzZSBpZiBzb21ldGhpbmdFbHNlfX1cbiAgICAgICAgc29tZXRoaW5nIGVsc2VcbiAgICAgIHt7ZWxzZX19XG4gICAgICAgIGZhbGxiYWNrXG4gICAgICB7ey9pZn19XG4gICAgICBgYGBcblxuICAgICAgVGhlIEFTVCBzdGlsbCBfZWZmZWN0aXZlbHlfIGxvb2tzIGxpa2U6XG5cbiAgICAgIGBgYGhic1xuICAgICAge3sjaWYgd2hhdGV2ZXJ9fVxuICAgICAgICB3aGF0ZXZlclxuICAgICAge3tlbHNlfX17eyNpZiBzb21ldGhpbmdFbHNlfX1cbiAgICAgICAgc29tZXRoaW5nIGVsc2VcbiAgICAgIHt7ZWxzZX19XG4gICAgICAgIGZhbGxiYWNrXG4gICAgICB7ey9pZn19e3svaWZ9fVxuICAgICAgYGBgXG5cbiAgICAgIFRoZSBvbmx5IHdheSB3ZSBjYW4gdGVsbCBpZiB0aGF0IGlzIHRoZSBjYXNlIGlzIGJ5IGNoZWNraW5nIGZvclxuICAgICAgYGJsb2NrLmNoYWluZWRgLCBidXQgdW5mb3J0dW5hdGVseSB3aGVuIHRoZSBhY3R1YWwgc3RhdGVtZW50cyBhcmVcbiAgICAgIHByb2Nlc3NlZCB0aGUgYGJsb2NrLmJvZHlbMF1gIG5vZGUgKHdoaWNoIHdpbGwgYWx3YXlzIGJlIGFcbiAgICAgIGBCbG9ja1N0YXRlbWVudGApIGhhcyBubyBjbHVlIHRoYXQgaXRzIGFuc2Nlc3RvciBgQmxvY2tgIG5vZGUgd2FzXG4gICAgICBjaGFpbmVkLlxuXG4gICAgICBUaGlzIFwiZm9yd2FyZHNcIiB0aGUgYGNoYWluZWRgIHNldHRpbmcgc28gdGhhdCB3ZSBjYW4gY2hlY2tcbiAgICAgIGl0IGxhdGVyIHdoZW4gcHJvY2Vzc2luZyB0aGUgYEJsb2NrU3RhdGVtZW50YC5cbiAgICAqL1xuICAgIGlmIChibG9jay5jaGFpbmVkKSB7XG4gICAgICBsZXQgZmlyc3RDaGlsZCA9IGJsb2NrLmJvZHlbMF0gYXMgQmxvY2tTdGF0ZW1lbnQ7XG4gICAgICBmaXJzdENoaWxkLmNoYWluZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmhhbmRsZWRCeU92ZXJyaWRlKGJsb2NrKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuVG9wTGV2ZWxTdGF0ZW1lbnRzKGJsb2NrLmJvZHkpO1xuICB9XG5cbiAgVG9wTGV2ZWxTdGF0ZW1lbnRzKHN0YXRlbWVudHM6IFRvcExldmVsU3RhdGVtZW50W10pIHtcbiAgICBzdGF0ZW1lbnRzLmZvckVhY2goKHN0YXRlbWVudCkgPT4gdGhpcy5Ub3BMZXZlbFN0YXRlbWVudChzdGF0ZW1lbnQpKTtcbiAgfVxuXG4gIEVsZW1lbnROb2RlKGVsOiBFbGVtZW50Tm9kZSk6IHZvaWQge1xuICAgIGlmICh0aGlzLmhhbmRsZWRCeU92ZXJyaWRlKGVsKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuT3BlbkVsZW1lbnROb2RlKGVsKTtcbiAgICB0aGlzLlRvcExldmVsU3RhdGVtZW50cyhlbC5jaGlsZHJlbik7XG4gICAgdGhpcy5DbG9zZUVsZW1lbnROb2RlKGVsKTtcbiAgfVxuXG4gIE9wZW5FbGVtZW50Tm9kZShlbDogRWxlbWVudE5vZGUpOiB2b2lkIHtcbiAgICB0aGlzLmJ1ZmZlciArPSBgPCR7ZWwudGFnfWA7XG4gICAgY29uc3QgcGFydHMgPSBbLi4uZWwuYXR0cmlidXRlcywgLi4uZWwubW9kaWZpZXJzLCAuLi5lbC5jb21tZW50c10uc29ydChzb3J0QnlMb2MpO1xuXG4gICAgZm9yIChjb25zdCBwYXJ0IG9mIHBhcnRzKSB7XG4gICAgICB0aGlzLmJ1ZmZlciArPSAnICc7XG4gICAgICBzd2l0Y2ggKHBhcnQudHlwZSkge1xuICAgICAgICBjYXNlICdBdHRyTm9kZSc6XG4gICAgICAgICAgdGhpcy5BdHRyTm9kZShwYXJ0KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnRWxlbWVudE1vZGlmaWVyU3RhdGVtZW50JzpcbiAgICAgICAgICB0aGlzLkVsZW1lbnRNb2RpZmllclN0YXRlbWVudChwYXJ0KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnTXVzdGFjaGVDb21tZW50U3RhdGVtZW50JzpcbiAgICAgICAgICB0aGlzLk11c3RhY2hlQ29tbWVudFN0YXRlbWVudChwYXJ0KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGVsLmJsb2NrUGFyYW1zLmxlbmd0aCkge1xuICAgICAgdGhpcy5CbG9ja1BhcmFtcyhlbC5ibG9ja1BhcmFtcyk7XG4gICAgfVxuICAgIGlmIChlbC5zZWxmQ2xvc2luZykge1xuICAgICAgdGhpcy5idWZmZXIgKz0gJyAvJztcbiAgICB9XG4gICAgdGhpcy5idWZmZXIgKz0gJz4nO1xuICB9XG5cbiAgQ2xvc2VFbGVtZW50Tm9kZShlbDogRWxlbWVudE5vZGUpOiB2b2lkIHtcbiAgICBpZiAoZWwuc2VsZkNsb3NpbmcgfHwgdm9pZE1hcFtlbC50YWcudG9Mb3dlckNhc2UoKV0pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5idWZmZXIgKz0gYDwvJHtlbC50YWd9PmA7XG4gIH1cblxuICBBdHRyTm9kZShhdHRyOiBBdHRyTm9kZSk6IHZvaWQge1xuICAgIGlmICh0aGlzLmhhbmRsZWRCeU92ZXJyaWRlKGF0dHIpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbGV0IHsgbmFtZSwgdmFsdWUgfSA9IGF0dHI7XG5cbiAgICB0aGlzLmJ1ZmZlciArPSBuYW1lO1xuICAgIGlmICh2YWx1ZS50eXBlICE9PSAnVGV4dE5vZGUnIHx8IHZhbHVlLmNoYXJzLmxlbmd0aCA+IDApIHtcbiAgICAgIHRoaXMuYnVmZmVyICs9ICc9JztcbiAgICAgIHRoaXMuQXR0ck5vZGVWYWx1ZSh2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgQXR0ck5vZGVWYWx1ZSh2YWx1ZTogQXR0ck5vZGVbJ3ZhbHVlJ10pIHtcbiAgICBpZiAodmFsdWUudHlwZSA9PT0gJ1RleHROb2RlJykge1xuICAgICAgdGhpcy5idWZmZXIgKz0gJ1wiJztcbiAgICAgIHRoaXMuVGV4dE5vZGUodmFsdWUsIHRydWUpO1xuICAgICAgdGhpcy5idWZmZXIgKz0gJ1wiJztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5Ob2RlKHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICBUZXh0Tm9kZSh0ZXh0OiBUZXh0Tm9kZSwgaXNBdHRyPzogYm9vbGVhbik6IHZvaWQge1xuICAgIGlmICh0aGlzLmhhbmRsZWRCeU92ZXJyaWRlKHRleHQpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5lbnRpdHlFbmNvZGluZyA9PT0gJ3JhdycpIHtcbiAgICAgIHRoaXMuYnVmZmVyICs9IHRleHQuY2hhcnM7XG4gICAgfSBlbHNlIGlmIChpc0F0dHIpIHtcbiAgICAgIHRoaXMuYnVmZmVyICs9IGVzY2FwZUF0dHJWYWx1ZSh0ZXh0LmNoYXJzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5idWZmZXIgKz0gZXNjYXBlVGV4dCh0ZXh0LmNoYXJzKTtcbiAgICB9XG4gIH1cblxuICBNdXN0YWNoZVN0YXRlbWVudChtdXN0YWNoZTogTXVzdGFjaGVTdGF0ZW1lbnQpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5oYW5kbGVkQnlPdmVycmlkZShtdXN0YWNoZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmJ1ZmZlciArPSBtdXN0YWNoZS5lc2NhcGVkID8gJ3t7JyA6ICd7e3snO1xuXG4gICAgaWYgKG11c3RhY2hlLnN0cmlwLm9wZW4pIHtcbiAgICAgIHRoaXMuYnVmZmVyICs9ICd+JztcbiAgICB9XG5cbiAgICB0aGlzLkV4cHJlc3Npb24obXVzdGFjaGUucGF0aCk7XG4gICAgdGhpcy5QYXJhbXMobXVzdGFjaGUucGFyYW1zKTtcbiAgICB0aGlzLkhhc2gobXVzdGFjaGUuaGFzaCk7XG5cbiAgICBpZiAobXVzdGFjaGUuc3RyaXAuY2xvc2UpIHtcbiAgICAgIHRoaXMuYnVmZmVyICs9ICd+JztcbiAgICB9XG5cbiAgICB0aGlzLmJ1ZmZlciArPSBtdXN0YWNoZS5lc2NhcGVkID8gJ319JyA6ICd9fX0nO1xuICB9XG5cbiAgQmxvY2tTdGF0ZW1lbnQoYmxvY2s6IEJsb2NrU3RhdGVtZW50KTogdm9pZCB7XG4gICAgaWYgKHRoaXMuaGFuZGxlZEJ5T3ZlcnJpZGUoYmxvY2spKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKGJsb2NrLmNoYWluZWQpIHtcbiAgICAgIHRoaXMuYnVmZmVyICs9IGJsb2NrLmludmVyc2VTdHJpcC5vcGVuID8gJ3t7ficgOiAne3snO1xuICAgICAgdGhpcy5idWZmZXIgKz0gJ2Vsc2UgJztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5idWZmZXIgKz0gYmxvY2sub3BlblN0cmlwLm9wZW4gPyAne3t+IycgOiAne3sjJztcbiAgICB9XG5cbiAgICB0aGlzLkV4cHJlc3Npb24oYmxvY2sucGF0aCk7XG4gICAgdGhpcy5QYXJhbXMoYmxvY2sucGFyYW1zKTtcbiAgICB0aGlzLkhhc2goYmxvY2suaGFzaCk7XG4gICAgaWYgKGJsb2NrLnByb2dyYW0uYmxvY2tQYXJhbXMubGVuZ3RoKSB7XG4gICAgICB0aGlzLkJsb2NrUGFyYW1zKGJsb2NrLnByb2dyYW0uYmxvY2tQYXJhbXMpO1xuICAgIH1cblxuICAgIGlmIChibG9jay5jaGFpbmVkKSB7XG4gICAgICB0aGlzLmJ1ZmZlciArPSBibG9jay5pbnZlcnNlU3RyaXAuY2xvc2UgPyAnfn19JyA6ICd9fSc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuYnVmZmVyICs9IGJsb2NrLm9wZW5TdHJpcC5jbG9zZSA/ICd+fX0nIDogJ319JztcbiAgICB9XG5cbiAgICB0aGlzLkJsb2NrKGJsb2NrLnByb2dyYW0pO1xuXG4gICAgaWYgKGJsb2NrLmludmVyc2UpIHtcbiAgICAgIGlmICghYmxvY2suaW52ZXJzZS5jaGFpbmVkKSB7XG4gICAgICAgIHRoaXMuYnVmZmVyICs9IGJsb2NrLmludmVyc2VTdHJpcC5vcGVuID8gJ3t7ficgOiAne3snO1xuICAgICAgICB0aGlzLmJ1ZmZlciArPSAnZWxzZSc7XG4gICAgICAgIHRoaXMuYnVmZmVyICs9IGJsb2NrLmludmVyc2VTdHJpcC5jbG9zZSA/ICd+fX0nIDogJ319JztcbiAgICAgIH1cblxuICAgICAgdGhpcy5CbG9jayhibG9jay5pbnZlcnNlKTtcbiAgICB9XG5cbiAgICBpZiAoIWJsb2NrLmNoYWluZWQpIHtcbiAgICAgIHRoaXMuYnVmZmVyICs9IGJsb2NrLmNsb3NlU3RyaXAub3BlbiA/ICd7e34vJyA6ICd7ey8nO1xuICAgICAgdGhpcy5FeHByZXNzaW9uKGJsb2NrLnBhdGgpO1xuICAgICAgdGhpcy5idWZmZXIgKz0gYmxvY2suY2xvc2VTdHJpcC5jbG9zZSA/ICd+fX0nIDogJ319JztcbiAgICB9XG4gIH1cblxuICBCbG9ja1BhcmFtcyhibG9ja1BhcmFtczogc3RyaW5nW10pIHtcbiAgICB0aGlzLmJ1ZmZlciArPSBgIGFzIHwke2Jsb2NrUGFyYW1zLmpvaW4oJyAnKX18YDtcbiAgfVxuXG4gIFBhcnRpYWxTdGF0ZW1lbnQocGFydGlhbDogUGFydGlhbFN0YXRlbWVudCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmhhbmRsZWRCeU92ZXJyaWRlKHBhcnRpYWwpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5idWZmZXIgKz0gJ3t7Pic7XG4gICAgdGhpcy5FeHByZXNzaW9uKHBhcnRpYWwubmFtZSk7XG4gICAgdGhpcy5QYXJhbXMocGFydGlhbC5wYXJhbXMpO1xuICAgIHRoaXMuSGFzaChwYXJ0aWFsLmhhc2gpO1xuICAgIHRoaXMuYnVmZmVyICs9ICd9fSc7XG4gIH1cblxuICBDb25jYXRTdGF0ZW1lbnQoY29uY2F0OiBDb25jYXRTdGF0ZW1lbnQpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5oYW5kbGVkQnlPdmVycmlkZShjb25jYXQpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5idWZmZXIgKz0gJ1wiJztcbiAgICBjb25jYXQucGFydHMuZm9yRWFjaCgocGFydCkgPT4ge1xuICAgICAgaWYgKHBhcnQudHlwZSA9PT0gJ1RleHROb2RlJykge1xuICAgICAgICB0aGlzLlRleHROb2RlKHBhcnQsIHRydWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5Ob2RlKHBhcnQpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMuYnVmZmVyICs9ICdcIic7XG4gIH1cblxuICBNdXN0YWNoZUNvbW1lbnRTdGF0ZW1lbnQoY29tbWVudDogTXVzdGFjaGVDb21tZW50U3RhdGVtZW50KTogdm9pZCB7XG4gICAgaWYgKHRoaXMuaGFuZGxlZEJ5T3ZlcnJpZGUoY29tbWVudCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmJ1ZmZlciArPSBge3shLS0ke2NvbW1lbnQudmFsdWV9LS19fWA7XG4gIH1cblxuICBFbGVtZW50TW9kaWZpZXJTdGF0ZW1lbnQobW9kOiBFbGVtZW50TW9kaWZpZXJTdGF0ZW1lbnQpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5oYW5kbGVkQnlPdmVycmlkZShtb2QpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5idWZmZXIgKz0gJ3t7JztcbiAgICB0aGlzLkV4cHJlc3Npb24obW9kLnBhdGgpO1xuICAgIHRoaXMuUGFyYW1zKG1vZC5wYXJhbXMpO1xuICAgIHRoaXMuSGFzaChtb2QuaGFzaCk7XG4gICAgdGhpcy5idWZmZXIgKz0gJ319JztcbiAgfVxuXG4gIENvbW1lbnRTdGF0ZW1lbnQoY29tbWVudDogQ29tbWVudFN0YXRlbWVudCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmhhbmRsZWRCeU92ZXJyaWRlKGNvbW1lbnQpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5idWZmZXIgKz0gYDwhLS0ke2NvbW1lbnQudmFsdWV9LS0+YDtcbiAgfVxuXG4gIFBhdGhFeHByZXNzaW9uKHBhdGg6IFBhdGhFeHByZXNzaW9uKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuaGFuZGxlZEJ5T3ZlcnJpZGUocGF0aCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmJ1ZmZlciArPSBwYXRoLm9yaWdpbmFsO1xuICB9XG5cbiAgU3ViRXhwcmVzc2lvbihzZXhwOiBTdWJFeHByZXNzaW9uKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuaGFuZGxlZEJ5T3ZlcnJpZGUoc2V4cCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmJ1ZmZlciArPSAnKCc7XG4gICAgdGhpcy5FeHByZXNzaW9uKHNleHAucGF0aCk7XG4gICAgdGhpcy5QYXJhbXMoc2V4cC5wYXJhbXMpO1xuICAgIHRoaXMuSGFzaChzZXhwLmhhc2gpO1xuICAgIHRoaXMuYnVmZmVyICs9ICcpJztcbiAgfVxuXG4gIFBhcmFtcyhwYXJhbXM6IEV4cHJlc3Npb25bXSkge1xuICAgIC8vIFRPRE86IGltcGxlbWVudCBhIHRvcCBsZXZlbCBQYXJhbXMgQVNUIG5vZGUgKGp1c3QgbGlrZSB0aGUgSGFzaCBvYmplY3QpXG4gICAgLy8gc28gdGhhdCB0aGlzIGNhbiBhbHNvIGJlIG92ZXJyaWRkZW5cbiAgICBpZiAocGFyYW1zLmxlbmd0aCkge1xuICAgICAgcGFyYW1zLmZvckVhY2goKHBhcmFtKSA9PiB7XG4gICAgICAgIHRoaXMuYnVmZmVyICs9ICcgJztcbiAgICAgICAgdGhpcy5FeHByZXNzaW9uKHBhcmFtKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIEhhc2goaGFzaDogSGFzaCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmhhbmRsZWRCeU92ZXJyaWRlKGhhc2gsIHRydWUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaGFzaC5wYWlycy5mb3JFYWNoKChwYWlyKSA9PiB7XG4gICAgICB0aGlzLmJ1ZmZlciArPSAnICc7XG4gICAgICB0aGlzLkhhc2hQYWlyKHBhaXIpO1xuICAgIH0pO1xuICB9XG5cbiAgSGFzaFBhaXIocGFpcjogSGFzaFBhaXIpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5oYW5kbGVkQnlPdmVycmlkZShwYWlyKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuYnVmZmVyICs9IHBhaXIua2V5O1xuICAgIHRoaXMuYnVmZmVyICs9ICc9JztcbiAgICB0aGlzLk5vZGUocGFpci52YWx1ZSk7XG4gIH1cblxuICBTdHJpbmdMaXRlcmFsKHN0cjogU3RyaW5nTGl0ZXJhbCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmhhbmRsZWRCeU92ZXJyaWRlKHN0cikpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmJ1ZmZlciArPSBKU09OLnN0cmluZ2lmeShzdHIudmFsdWUpO1xuICB9XG5cbiAgQm9vbGVhbkxpdGVyYWwoYm9vbDogQm9vbGVhbkxpdGVyYWwpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5oYW5kbGVkQnlPdmVycmlkZShib29sKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuYnVmZmVyICs9IGJvb2wudmFsdWU7XG4gIH1cblxuICBOdW1iZXJMaXRlcmFsKG51bWJlcjogTnVtYmVyTGl0ZXJhbCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmhhbmRsZWRCeU92ZXJyaWRlKG51bWJlcikpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmJ1ZmZlciArPSBudW1iZXIudmFsdWU7XG4gIH1cblxuICBVbmRlZmluZWRMaXRlcmFsKG5vZGU6IFVuZGVmaW5lZExpdGVyYWwpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5oYW5kbGVkQnlPdmVycmlkZShub2RlKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuYnVmZmVyICs9ICd1bmRlZmluZWQnO1xuICB9XG5cbiAgTnVsbExpdGVyYWwobm9kZTogTnVsbExpdGVyYWwpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5oYW5kbGVkQnlPdmVycmlkZShub2RlKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuYnVmZmVyICs9ICdudWxsJztcbiAgfVxuXG4gIHByaW50KG5vZGU6IE5vZGUpIHtcbiAgICBsZXQgeyBvcHRpb25zIH0gPSB0aGlzO1xuXG4gICAgaWYgKG9wdGlvbnMub3ZlcnJpZGUpIHtcbiAgICAgIGxldCByZXN1bHQgPSBvcHRpb25zLm92ZXJyaWRlKG5vZGUsIG9wdGlvbnMpO1xuXG4gICAgICBpZiAocmVzdWx0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmJ1ZmZlciA9ICcnO1xuICAgIHRoaXMuTm9kZShub2RlKTtcbiAgICByZXR1cm4gdGhpcy5idWZmZXI7XG4gIH1cbn1cblxuZnVuY3Rpb24gdW5yZWFjaGFibGUobm9kZTogbmV2ZXIsIHBhcmVudE5vZGVUeXBlOiBzdHJpbmcpOiBuZXZlciB7XG4gIGxldCB7IGxvYywgdHlwZSB9ID0gKG5vZGUgYXMgYW55KSBhcyBOb2RlO1xuICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgYE5vbi1leGhhdXN0aXZlIG5vZGUgbmFycm93aW5nICR7dHlwZX0gQCBsb2NhdGlvbjogJHtKU09OLnN0cmluZ2lmeShcbiAgICAgIGxvY1xuICAgICl9IGZvciBwYXJlbnQgJHtwYXJlbnROb2RlVHlwZX1gXG4gICk7XG59XG4iXSwic291cmNlUm9vdCI6IiJ9