function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }

import b from '../builders';
import { appendChild, isLiteral, printLiteral } from '../utils';
import { Parser } from '../parser';
import SyntaxError from '../errors/syntax-error';
export var HandlebarsNodeVisitors = /*#__PURE__*/function (_Parser) {
  _inheritsLoose(HandlebarsNodeVisitors, _Parser);

  function HandlebarsNodeVisitors() {
    return _Parser.apply(this, arguments) || this;
  }

  var _proto = HandlebarsNodeVisitors.prototype;

  _proto.Program = function Program(program) {
    var body = [];
    var node;

    if (this.isTopLevel) {
      node = b.template(body, program.blockParams, program.loc);
    } else {
      node = b.blockItself(body, program.blockParams, program.chained, program.loc);
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
    var node = b.block(path, params, hash, program, inverse, block.loc, block.openStrip, block.inverseStrip, block.closeStrip);
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
        hash: b.hash(),
        escaped: escaped,
        loc: loc,
        strip: strip
      };
    } else {
      var _acceptCallNodes2 = acceptCallNodes(this, rawMustache),
          path = _acceptCallNodes2.path,
          params = _acceptCallNodes2.params,
          hash = _acceptCallNodes2.hash;

      mustache = b.mustache(path, params, hash, !escaped, loc, strip);
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
    var comment = b.mustacheComment(value, loc);

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

    return b.sexpr(path, params, hash, sexpr.loc);
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
      pairs.push(b.pair(pair.key, this.acceptNode(pair.value), pair.loc));
    }

    return b.hash(pairs, hash.loc);
  };

  _proto.StringLiteral = function StringLiteral(string) {
    return b.literal('StringLiteral', string.value, string.loc);
  };

  _proto.BooleanLiteral = function BooleanLiteral(_boolean) {
    return b.literal('BooleanLiteral', _boolean.value, _boolean.loc);
  };

  _proto.NumberLiteral = function NumberLiteral(number) {
    return b.literal('NumberLiteral', number.value, number.loc);
  };

  _proto.UndefinedLiteral = function UndefinedLiteral(undef) {
    return b.literal('UndefinedLiteral', undefined, undef.loc);
  };

  _proto.NullLiteral = function NullLiteral(nul) {
    return b.literal('NullLiteral', null, nul.loc);
  };

  _createClass(HandlebarsNodeVisitors, [{
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
  var hash = node.hash ? compiler.Hash(node.hash) : b.hash();
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

  var modifier = b.elementModifier(path, params, hash, loc);
  element.modifiers.push(modifier);
}

function appendDynamicAttributeValuePart(attribute, part) {
  attribute.isDynamic = true;
  attribute.parts.push(part);
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL0BnbGltbWVyL3N5bnRheC9saWIvcGFyc2VyL2hhbmRsZWJhcnMtbm9kZS12aXNpdG9ycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxPQUFBLENBQUEsTUFBQSxhQUFBO0FBQ0EsU0FBQSxXQUFBLEVBQUEsU0FBQSxFQUFBLFlBQUEsUUFBQSxVQUFBO0FBR0EsU0FBQSxNQUFBLFFBQUEsV0FBQTtBQUNBLE9BQUEsV0FBQSxNQUFBLHdCQUFBO0FBS0EsV0FBTSxzQkFBTjtBQUFBOztBQUFBO0FBQUE7QUFBQTs7QUFBQTs7QUFBQSxTQVlFLE9BWkYsR0FZRSxpQkFBTyxPQUFQLEVBQTRCO0FBQzFCLFFBQUksSUFBSSxHQUFSLEVBQUE7QUFDQSxRQUFBLElBQUE7O0FBRUEsUUFBSSxLQUFKLFVBQUEsRUFBcUI7QUFDbkIsTUFBQSxJQUFJLEdBQUcsQ0FBQyxDQUFELFFBQUEsQ0FBQSxJQUFBLEVBQWlCLE9BQU8sQ0FBeEIsV0FBQSxFQUFzQyxPQUFPLENBQXBELEdBQU8sQ0FBUDtBQURGLEtBQUEsTUFFTztBQUNMLE1BQUEsSUFBSSxHQUFHLENBQUMsQ0FBRCxXQUFBLENBQUEsSUFBQSxFQUFvQixPQUFPLENBQTNCLFdBQUEsRUFBeUMsT0FBTyxDQUFoRCxPQUFBLEVBQTBELE9BQU8sQ0FBeEUsR0FBTyxDQUFQO0FBQ0Q7O0FBRUQsUUFBQSxDQUFBO0FBQUEsUUFDRSxDQUFDLEdBQUcsT0FBTyxDQUFQLElBQUEsQ0FETixNQUFBO0FBR0EsU0FBQSxZQUFBLENBQUEsSUFBQSxDQUFBLElBQUE7O0FBRUEsUUFBSSxDQUFDLEtBQUwsQ0FBQSxFQUFhO0FBQ1gsYUFBTyxLQUFBLFlBQUEsQ0FBUCxHQUFPLEVBQVA7QUFDRDs7QUFFRCxTQUFLLENBQUMsR0FBTixDQUFBLEVBQVksQ0FBQyxHQUFiLENBQUEsRUFBbUIsQ0FBbkIsRUFBQSxFQUF3QjtBQUN0QixXQUFBLFVBQUEsQ0FBZ0IsT0FBTyxD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LEVBQUEsSUFBQSxFQUEwRjtBQUN4RixFQUFBLFNBQVMsQ0FBVCxTQUFBLEdBQUEsSUFBQTtBQUNBLEVBQUEsU0FBUyxDQUFULEtBQUEsQ0FBQSxJQUFBLENBQUEsSUFBQTtBQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGIgZnJvbSAnLi4vYnVpbGRlcnMnO1xuaW1wb3J0IHsgYXBwZW5kQ2hpbGQsIGlzTGl0ZXJhbCwgcHJpbnRMaXRlcmFsIH0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0ICogYXMgQVNUIGZyb20gJy4uL3R5cGVzL25vZGVzJztcbmltcG9ydCAqIGFzIEhCUyBmcm9tICcuLi90eXBlcy9oYW5kbGViYXJzLWFzdCc7XG5pbXBvcnQgeyBQYXJzZXIsIFRhZywgQXR0cmlidXRlIH0gZnJvbSAnLi4vcGFyc2VyJztcbmltcG9ydCBTeW50YXhFcnJvciBmcm9tICcuLi9lcnJvcnMvc3ludGF4LWVycm9yJztcbmltcG9ydCB7IE9wdGlvbiB9IGZyb20gJ0BnbGltbWVyL3V0aWwnO1xuaW1wb3J0IHsgUmVjYXN0IH0gZnJvbSAnQGdsaW1tZXIvaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBUb2tlbml6ZXJTdGF0ZSB9IGZyb20gJ3NpbXBsZS1odG1sLXRva2VuaXplcic7XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBIYW5kbGViYXJzTm9kZVZpc2l0b3JzIGV4dGVuZHMgUGFyc2VyIHtcbiAgYWJzdHJhY3QgYXBwZW5kVG9Db21tZW50RGF0YShzOiBzdHJpbmcpOiB2b2lkO1xuICBhYnN0cmFjdCBiZWdpbkF0dHJpYnV0ZVZhbHVlKHF1b3RlZDogYm9vbGVhbik6IHZvaWQ7XG4gIGFic3RyYWN0IGZpbmlzaEF0dHJpYnV0ZVZhbHVlKCk6IHZvaWQ7XG5cbiAgcHJpdmF0ZSBnZXQgaXNUb3BMZXZlbCgpIHtcbiAgICByZXR1cm4gdGhpcy5lbGVtZW50U3RhY2subGVuZ3RoID09PSAwO1xuICB9XG5cbiAgUHJvZ3JhbShwcm9ncmFtOiBIQlMuUHJvZ3JhbSk6IEFTVC5CbG9jaztcbiAgUHJvZ3JhbShwcm9ncmFtOiBIQlMuUHJvZ3JhbSk6IEFTVC5UZW1wbGF0ZTtcbiAgUHJvZ3JhbShwcm9ncmFtOiBIQlMuUHJvZ3JhbSk6IEFTVC5UZW1wbGF0ZSB8IEFTVC5CbG9jaztcbiAgUHJvZ3JhbShwcm9ncmFtOiBIQlMuUHJvZ3JhbSk6IEFTVC5CbG9jayB8IEFTVC5UZW1wbGF0ZSB7XG4gICAgbGV0IGJvZHk6IEFTVC5TdGF0ZW1lbnRbXSA9IFtdO1xuICAgIGxldCBub2RlO1xuXG4gICAgaWYgKHRoaXMuaXNUb3BMZXZlbCkge1xuICAgICAgbm9kZSA9IGIudGVtcGxhdGUoYm9keSwgcHJvZ3JhbS5ibG9ja1BhcmFtcywgcHJvZ3JhbS5sb2MpO1xuICAgIH0gZWxzZSB7XG4gICAgICBub2RlID0gYi5ibG9ja0l0c2VsZihib2R5LCBwcm9ncmFtLmJsb2NrUGFyYW1zLCBwcm9ncmFtLmNoYWluZWQsIHByb2dyYW0ubG9jKTtcbiAgICB9XG5cbiAgICBsZXQgaSxcbiAgICAgIGwgPSBwcm9ncmFtLmJvZHkubGVuZ3RoO1xuXG4gICAgdGhpcy5lbGVtZW50U3RhY2sucHVzaChub2RlKTtcblxuICAgIGlmIChsID09PSAwKSB7XG4gICAgICByZXR1cm4gdGhpcy5lbGVtZW50U3RhY2sucG9wKCkgYXMgQVNULkJsb2NrIHwgQVNULlRlbXBsYXRlO1xuICAgIH1cblxuICAgIGZvciAoaSA9IDA7IGkgPCBsOyBpKyspIHtcbiAgICAgIHRoaXMuYWNjZXB0Tm9kZShwcm9ncmFtLmJvZHlbaV0pO1xuICAgIH1cblxuICAgIC8vIEVuc3VyZSB0aGF0IHRoYXQgdGhlIGVsZW1lbnQgc3RhY2sgaXMgYmFsYW5jZWQgcHJvcGVybHkuXG4gICAgbGV0IHBvcHBlZE5vZGUgPSB0aGlzLmVsZW1lbnRTdGFjay5wb3AoKTtcbiAgICBpZiAocG9wcGVkTm9kZSAhPT0gbm9kZSkge1xuICAgICAgbGV0IGVsZW1lbnROb2RlID0gcG9wcGVkTm9kZSBhcyBBU1QuRWxlbWVudE5vZGU7XG5cbiAgICAgIHRocm93IG5ldyBTeW50YXhFcnJvcihcbiAgICAgICAgJ1VuY2xvc2VkIGVsZW1lbnQgYCcgKyBlbGVtZW50Tm9kZS50YWcgKyAnYCAob24gbGluZSAnICsgZWxlbWVudE5vZGUubG9jIS5zdGFydC5saW5lICsgJykuJyxcbiAgICAgICAgZWxlbWVudE5vZGUubG9jXG4gICAgICApO1xuICAgIH1cblxuICAgIHJldHVybiBub2RlO1xuICB9XG5cbiAgQmxvY2tTdGF0ZW1lbnQoYmxvY2s6IEhCUy5CbG9ja1N0YXRlbWVudCk6IEFTVC5CbG9ja1N0YXRlbWVudCB8IHZvaWQge1xuICAgIGlmICh0aGlzLnRva2VuaXplci5zdGF0ZSA9PT0gVG9rZW5pemVyU3RhdGUuY29tbWVudCkge1xuICAgICAgdGhpcy5hcHBlbmRUb0NvbW1lbnREYXRhKHRoaXMuc291cmNlRm9yTm9kZShibG9jaykpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChcbiAgICAgIHRoaXMudG9rZW5pemVyLnN0YXRlICE9PSBUb2tlbml6ZXJTdGF0ZS5kYXRhICYmXG4gICAgICB0aGlzLnRva2VuaXplclsnc3RhdGUnXSAhPT0gVG9rZW5pemVyU3RhdGUuYmVmb3JlRGF0YVxuICAgICkge1xuICAgICAgdGhyb3cgbmV3IFN5bnRheEVycm9yKFxuICAgICAgICAnQSBibG9jayBtYXkgb25seSBiZSB1c2VkIGluc2lkZSBhbiBIVE1MIGVsZW1lbnQgb3IgYW5vdGhlciBibG9jay4nLFxuICAgICAgICBibG9jay5sb2NcbiAgICAgICk7XG4gICAgfVxuXG4gICAgbGV0IHsgcGF0aCwgcGFyYW1zLCBoYXNoIH0gPSBhY2NlcHRDYWxsTm9kZXModGhpcywgYmxvY2spO1xuICAgIGxldCBwcm9ncmFtID0gdGhpcy5Qcm9ncmFtKGJsb2NrLnByb2dyYW0pO1xuICAgIGxldCBpbnZlcnNlID0gYmxvY2suaW52ZXJzZSA/IHRoaXMuUHJvZ3JhbShibG9jay5pbnZlcnNlKSA6IG51bGw7XG5cbiAgICBsZXQgbm9kZSA9IGIuYmxvY2soXG4gICAgICBwYXRoLFxuICAgICAgcGFyYW1zLFxuICAgICAgaGFzaCxcbiAgICAgIHByb2dyYW0sXG4gICAgICBpbnZlcnNlLFxuICAgICAgYmxvY2subG9jLFxuICAgICAgYmxvY2sub3BlblN0cmlwLFxuICAgICAgYmxvY2suaW52ZXJzZVN0cmlwLFxuICAgICAgYmxvY2suY2xvc2VTdHJpcFxuICAgICk7XG5cbiAgICBsZXQgcGFyZW50UHJvZ3JhbSA9IHRoaXMuY3VycmVudEVsZW1lbnQoKTtcblxuICAgIGFwcGVuZENoaWxkKHBhcmVudFByb2dyYW0sIG5vZGUpO1xuICB9XG5cbiAgTXVzdGFjaGVTdGF0ZW1lbnQocmF3TXVzdGFjaGU6IEhCUy5NdXN0YWNoZVN0YXRlbWVudCk6IEFTVC5NdXN0YWNoZVN0YXRlbWVudCB8IHZvaWQge1xuICAgIGxldCB7IHRva2VuaXplciB9ID0gdGhpcztcblxuICAgIGlmICh0b2tlbml6ZXIuc3RhdGUgPT09ICdjb21tZW50Jykge1xuICAgICAgdGhpcy5hcHBlbmRUb0NvbW1lbnREYXRhKHRoaXMuc291cmNlRm9yTm9kZShyYXdNdXN0YWNoZSkpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxldCBtdXN0YWNoZTogQVNULk11c3RhY2hlU3RhdGVtZW50O1xuICAgIGxldCB7IGVzY2FwZWQsIGxvYywgc3RyaXAgfSA9IHJhd011c3RhY2hlO1xuXG4gICAgaWYgKGlzTGl0ZXJhbChyYXdNdXN0YWNoZS5wYXRoKSkge1xuICAgICAgbXVzdGFjaGUgPSB7XG4gICAgICAgIHR5cGU6ICdNdXN0YWNoZVN0YXRlbWVudCcsXG4gICAgICAgIHBhdGg6IHRoaXMuYWNjZXB0Tm9kZTxBU1QuTGl0ZXJhbD4ocmF3TXVzdGFjaGUucGF0aCksXG4gICAgICAgIHBhcmFtczogW10sXG4gICAgICAgIGhhc2g6IGIuaGFzaCgpLFxuICAgICAgICBlc2NhcGVkLFxuICAgICAgICBsb2MsXG4gICAgICAgIHN0cmlwLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IHsgcGF0aCwgcGFyYW1zLCBoYXNoIH0gPSBhY2NlcHRDYWxsTm9kZXMoXG4gICAgICAgIHRoaXMsXG4gICAgICAgIHJhd011c3RhY2hlIGFzIEhCUy5NdXN0YWNoZVN0YXRlbWVudCAmIHtcbiAgICAgICAgICBwYXRoOiBIQlMuUGF0aEV4cHJlc3Npb247XG4gICAgICAgIH1cbiAgICAgICk7XG4gICAgICBtdXN0YWNoZSA9IGIubXVzdGFjaGUocGF0aCwgcGFyYW1zLCBoYXNoLCAhZXNjYXBlZCwgbG9jLCBzdHJpcCk7XG4gICAgfVxuXG4gICAgc3dpdGNoICh0b2tlbml6ZXIuc3RhdGUpIHtcbiAgICAgIC8vIFRhZyBoZWxwZXJzXG4gICAgICBjYXNlIFRva2VuaXplclN0YXRlLnRhZ09wZW46XG4gICAgICBjYXNlIFRva2VuaXplclN0YXRlLnRhZ05hbWU6XG4gICAgICAgIHRocm93IG5ldyBTeW50YXhFcnJvcihcbiAgICAgICAgICBgQ2Fubm90IHVzZSBtdXN0YWNoZXMgaW4gYW4gZWxlbWVudHMgdGFnbmFtZTogXFxgJHt0aGlzLnNvdXJjZUZvck5vZGUoXG4gICAgICAgICAgICByYXdNdXN0YWNoZSxcbiAgICAgICAgICAgIHJhd011c3RhY2hlLnBhdGhcbiAgICAgICAgICApfVxcYCBhdCBMJHtsb2Muc3RhcnQubGluZX06QyR7bG9jLnN0YXJ0LmNvbHVtbn1gLFxuICAgICAgICAgIG11c3RhY2hlLmxvY1xuICAgICAgICApO1xuXG4gICAgICBjYXNlIFRva2VuaXplclN0YXRlLmJlZm9yZUF0dHJpYnV0ZU5hbWU6XG4gICAgICAgIGFkZEVsZW1lbnRNb2RpZmllcih0aGlzLmN1cnJlbnRTdGFydFRhZywgbXVzdGFjaGUpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgVG9rZW5pemVyU3RhdGUuYXR0cmlidXRlTmFtZTpcbiAgICAgIGNhc2UgVG9rZW5pemVyU3RhdGUuYWZ0ZXJBdHRyaWJ1dGVOYW1lOlxuICAgICAgICB0aGlzLmJlZ2luQXR0cmlidXRlVmFsdWUoZmFsc2UpO1xuICAgICAgICB0aGlzLmZpbmlzaEF0dHJpYnV0ZVZhbHVlKCk7XG4gICAgICAgIGFkZEVsZW1lbnRNb2RpZmllcih0aGlzLmN1cnJlbnRTdGFydFRhZywgbXVzdGFjaGUpO1xuICAgICAgICB0b2tlbml6ZXIudHJhbnNpdGlvblRvKFRva2VuaXplclN0YXRlLmJlZm9yZUF0dHJpYnV0ZU5hbWUpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgVG9rZW5pemVyU3RhdGUuYWZ0ZXJBdHRyaWJ1dGVWYWx1ZVF1b3RlZDpcbiAgICAgICAgYWRkRWxlbWVudE1vZGlmaWVyKHRoaXMuY3VycmVudFN0YXJ0VGFnLCBtdXN0YWNoZSk7XG4gICAgICAgIHRva2VuaXplci50cmFuc2l0aW9uVG8oVG9rZW5pemVyU3RhdGUuYmVmb3JlQXR0cmlidXRlTmFtZSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICAvLyBBdHRyaWJ1dGUgdmFsdWVzXG4gICAgICBjYXNlIFRva2VuaXplclN0YXRlLmJlZm9yZUF0dHJpYnV0ZVZhbHVlOlxuICAgICAgICB0aGlzLmJlZ2luQXR0cmlidXRlVmFsdWUoZmFsc2UpO1xuICAgICAgICBhcHBlbmREeW5hbWljQXR0cmlidXRlVmFsdWVQYXJ0KHRoaXMuY3VycmVudEF0dHJpYnV0ZSEsIG11c3RhY2hlKTtcbiAgICAgICAgdG9rZW5pemVyLnRyYW5zaXRpb25UbyhUb2tlbml6ZXJTdGF0ZS5hdHRyaWJ1dGVWYWx1ZVVucXVvdGVkKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFRva2VuaXplclN0YXRlLmF0dHJpYnV0ZVZhbHVlRG91YmxlUXVvdGVkOlxuICAgICAgY2FzZSBUb2tlbml6ZXJTdGF0ZS5hdHRyaWJ1dGVWYWx1ZVNpbmdsZVF1b3RlZDpcbiAgICAgIGNhc2UgVG9rZW5pemVyU3RhdGUuYXR0cmlidXRlVmFsdWVVbnF1b3RlZDpcbiAgICAgICAgYXBwZW5kRHluYW1pY0F0dHJpYnV0ZVZhbHVlUGFydCh0aGlzLmN1cnJlbnRBdHRyaWJ1dGUhLCBtdXN0YWNoZSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICAvLyBUT0RPOiBPbmx5IGFwcGVuZCBjaGlsZCB3aGVuIHRoZSB0b2tlbml6ZXIgc3RhdGUgbWFrZXNcbiAgICAgIC8vIHNlbnNlIHRvIGRvIHNvLCBvdGhlcndpc2UgdGhyb3cgYW4gZXJyb3IuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBhcHBlbmRDaGlsZCh0aGlzLmN1cnJlbnRFbGVtZW50KCksIG11c3RhY2hlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbXVzdGFjaGU7XG4gIH1cblxuICBDb250ZW50U3RhdGVtZW50KGNvbnRlbnQ6IEhCUy5Db250ZW50U3RhdGVtZW50KTogdm9pZCB7XG4gICAgdXBkYXRlVG9rZW5pemVyTG9jYXRpb24odGhpcy50b2tlbml6ZXIsIGNvbnRlbnQpO1xuXG4gICAgdGhpcy50b2tlbml6ZXIudG9rZW5pemVQYXJ0KGNvbnRlbnQudmFsdWUpO1xuICAgIHRoaXMudG9rZW5pemVyLmZsdXNoRGF0YSgpO1xuICB9XG5cbiAgQ29tbWVudFN0YXRlbWVudChyYXdDb21tZW50OiBIQlMuQ29tbWVudFN0YXRlbWVudCk6IE9wdGlvbjxBU1QuTXVzdGFjaGVDb21tZW50U3RhdGVtZW50PiB7XG4gICAgbGV0IHsgdG9rZW5pemVyIH0gPSB0aGlzO1xuXG4gICAgaWYgKHRva2VuaXplci5zdGF0ZSA9PT0gVG9rZW5pemVyU3RhdGUuY29tbWVudCkge1xuICAgICAgdGhpcy5hcHBlbmRUb0NvbW1lbnREYXRhKHRoaXMuc291cmNlRm9yTm9kZShyYXdDb21tZW50KSk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBsZXQgeyB2YWx1ZSwgbG9jIH0gPSByYXdDb21tZW50O1xuICAgIGxldCBjb21tZW50ID0gYi5tdXN0YWNoZUNvbW1lbnQodmFsdWUsIGxvYyk7XG5cbiAgICBzd2l0Y2ggKHRva2VuaXplci5zdGF0ZSkge1xuICAgICAgY2FzZSBUb2tlbml6ZXJTdGF0ZS5iZWZvcmVBdHRyaWJ1dGVOYW1lOlxuICAgICAgY2FzZSBUb2tlbml6ZXJTdGF0ZS5hZnRlckF0dHJpYnV0ZU5hbWU6XG4gICAgICAgIHRoaXMuY3VycmVudFN0YXJ0VGFnLmNvbW1lbnRzLnB1c2goY29tbWVudCk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIFRva2VuaXplclN0YXRlLmJlZm9yZURhdGE6XG4gICAgICBjYXNlIFRva2VuaXplclN0YXRlLmRhdGE6XG4gICAgICAgIGFwcGVuZENoaWxkKHRoaXMuY3VycmVudEVsZW1lbnQoKSwgY29tbWVudCk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoXG4gICAgICAgICAgYFVzaW5nIGEgSGFuZGxlYmFycyBjb21tZW50IHdoZW4gaW4gdGhlIFxcYCR7dG9rZW5pemVyWydzdGF0ZSddfVxcYCBzdGF0ZSBpcyBub3Qgc3VwcG9ydGVkOiBcIiR7Y29tbWVudC52YWx1ZX1cIiBvbiBsaW5lICR7bG9jLnN0YXJ0LmxpbmV9OiR7bG9jLnN0YXJ0LmNvbHVtbn1gLFxuICAgICAgICAgIHJhd0NvbW1lbnQubG9jXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNvbW1lbnQ7XG4gIH1cblxuICBQYXJ0aWFsU3RhdGVtZW50KHBhcnRpYWw6IEhCUy5QYXJ0aWFsU3RhdGVtZW50KTogbmV2ZXIge1xuICAgIGxldCB7IGxvYyB9ID0gcGFydGlhbDtcblxuICAgIHRocm93IG5ldyBTeW50YXhFcnJvcihcbiAgICAgIGBIYW5kbGViYXJzIHBhcnRpYWxzIGFyZSBub3Qgc3VwcG9ydGVkOiBcIiR7dGhpcy5zb3VyY2VGb3JOb2RlKHBhcnRpYWwsIHBhcnRpYWwubmFtZSl9XCIgYXQgTCR7XG4gICAgICAgIGxvYy5zdGFydC5saW5lXG4gICAgICB9OkMke2xvYy5zdGFydC5jb2x1bW59YCxcbiAgICAgIHBhcnRpYWwubG9jXG4gICAgKTtcbiAgfVxuXG4gIFBhcnRpYWxCbG9ja1N0YXRlbWVudChwYXJ0aWFsQmxvY2s6IEhCUy5QYXJ0aWFsQmxvY2tTdGF0ZW1lbnQpOiBuZXZlciB7XG4gICAgbGV0IHsgbG9jIH0gPSBwYXJ0aWFsQmxvY2s7XG5cbiAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoXG4gICAgICBgSGFuZGxlYmFycyBwYXJ0aWFsIGJsb2NrcyBhcmUgbm90IHN1cHBvcnRlZDogXCIke3RoaXMuc291cmNlRm9yTm9kZShcbiAgICAgICAgcGFydGlhbEJsb2NrLFxuICAgICAgICBwYXJ0aWFsQmxvY2submFtZVxuICAgICAgKX1cIiBhdCBMJHtsb2Muc3RhcnQubGluZX06QyR7bG9jLnN0YXJ0LmNvbHVtbn1gLFxuICAgICAgcGFydGlhbEJsb2NrLmxvY1xuICAgICk7XG4gIH1cblxuICBEZWNvcmF0b3IoZGVjb3JhdG9yOiBIQlMuRGVjb3JhdG9yKTogbmV2ZXIge1xuICAgIGxldCB7IGxvYyB9ID0gZGVjb3JhdG9yO1xuXG4gICAgdGhyb3cgbmV3IFN5bnRheEVycm9yKFxuICAgICAgYEhhbmRsZWJhcnMgZGVjb3JhdG9ycyBhcmUgbm90IHN1cHBvcnRlZDogXCIke3RoaXMuc291cmNlRm9yTm9kZShcbiAgICAgICAgZGVjb3JhdG9yLFxuICAgICAgICBkZWNvcmF0b3IucGF0aFxuICAgICAgKX1cIiBhdCBMJHtsb2Muc3RhcnQubGluZX06QyR7bG9jLnN0YXJ0LmNvbHVtbn1gLFxuICAgICAgZGVjb3JhdG9yLmxvY1xuICAgICk7XG4gIH1cblxuICBEZWNvcmF0b3JCbG9jayhkZWNvcmF0b3JCbG9jazogSEJTLkRlY29yYXRvckJsb2NrKTogbmV2ZXIge1xuICAgIGxldCB7IGxvYyB9ID0gZGVjb3JhdG9yQmxvY2s7XG5cbiAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoXG4gICAgICBgSGFuZGxlYmFycyBkZWNvcmF0b3IgYmxvY2tzIGFyZSBub3Qgc3VwcG9ydGVkOiBcIiR7dGhpcy5zb3VyY2VGb3JOb2RlKFxuICAgICAgICBkZWNvcmF0b3JCbG9jayxcbiAgICAgICAgZGVjb3JhdG9yQmxvY2sucGF0aFxuICAgICAgKX1cIiBhdCBMJHtsb2Muc3RhcnQubGluZX06QyR7bG9jLnN0YXJ0LmNvbHVtbn1gLFxuICAgICAgZGVjb3JhdG9yQmxvY2subG9jXG4gICAgKTtcbiAgfVxuXG4gIFN1YkV4cHJlc3Npb24oc2V4cHI6IEhCUy5TdWJFeHByZXNzaW9uKTogQVNULlN1YkV4cHJlc3Npb24ge1xuICAgIGxldCB7IHBhdGgsIHBhcmFtcywgaGFzaCB9ID0gYWNjZXB0Q2FsbE5vZGVzKHRoaXMsIHNleHByKTtcbiAgICByZXR1cm4gYi5zZXhwcihwYXRoLCBwYXJhbXMsIGhhc2gsIHNleHByLmxvYyk7XG4gIH1cblxuICBQYXRoRXhwcmVzc2lvbihwYXRoOiBIQlMuUGF0aEV4cHJlc3Npb24pOiBBU1QuUGF0aEV4cHJlc3Npb24ge1xuICAgIGxldCB7IG9yaWdpbmFsLCBsb2MgfSA9IHBhdGg7XG4gICAgbGV0IHBhcnRzOiBzdHJpbmdbXTtcblxuICAgIGlmIChvcmlnaW5hbC5pbmRleE9mKCcvJykgIT09IC0xKSB7XG4gICAgICBpZiAob3JpZ2luYWwuc2xpY2UoMCwgMikgPT09ICcuLycpIHtcbiAgICAgICAgdGhyb3cgbmV3IFN5bnRheEVycm9yKFxuICAgICAgICAgIGBVc2luZyBcIi4vXCIgaXMgbm90IHN1cHBvcnRlZCBpbiBHbGltbWVyIGFuZCB1bm5lY2Vzc2FyeTogXCIke3BhdGgub3JpZ2luYWx9XCIgb24gbGluZSAke2xvYy5zdGFydC5saW5lfS5gLFxuICAgICAgICAgIHBhdGgubG9jXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICBpZiAob3JpZ2luYWwuc2xpY2UoMCwgMykgPT09ICcuLi8nKSB7XG4gICAgICAgIHRocm93IG5ldyBTeW50YXhFcnJvcihcbiAgICAgICAgICBgQ2hhbmdpbmcgY29udGV4dCB1c2luZyBcIi4uL1wiIGlzIG5vdCBzdXBwb3J0ZWQgaW4gR2xpbW1lcjogXCIke3BhdGgub3JpZ2luYWx9XCIgb24gbGluZSAke2xvYy5zdGFydC5saW5lfS5gLFxuICAgICAgICAgIHBhdGgubG9jXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICBpZiAob3JpZ2luYWwuaW5kZXhPZignLicpICE9PSAtMSkge1xuICAgICAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoXG4gICAgICAgICAgYE1peGluZyAnLicgYW5kICcvJyBpbiBwYXRocyBpcyBub3Qgc3VwcG9ydGVkIGluIEdsaW1tZXI7IHVzZSBvbmx5ICcuJyB0byBzZXBhcmF0ZSBwcm9wZXJ0eSBwYXRoczogXCIke3BhdGgub3JpZ2luYWx9XCIgb24gbGluZSAke2xvYy5zdGFydC5saW5lfS5gLFxuICAgICAgICAgIHBhdGgubG9jXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICBwYXJ0cyA9IFtwYXRoLnBhcnRzLmpvaW4oJy8nKV07XG4gICAgfSBlbHNlIGlmIChvcmlnaW5hbCA9PT0gJy4nKSB7XG4gICAgICBsZXQgbG9jYXRpb25JbmZvID0gYEwke2xvYy5zdGFydC5saW5lfTpDJHtsb2Muc3RhcnQuY29sdW1ufWA7XG4gICAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoXG4gICAgICAgIGAnLicgaXMgbm90IGEgc3VwcG9ydGVkIHBhdGggaW4gR2xpbW1lcjsgY2hlY2sgZm9yIGEgcGF0aCB3aXRoIGEgdHJhaWxpbmcgJy4nIGF0ICR7bG9jYXRpb25JbmZvfS5gLFxuICAgICAgICBwYXRoLmxvY1xuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGFydHMgPSBwYXRoLnBhcnRzO1xuICAgIH1cblxuICAgIGxldCB0aGlzSGVhZCA9IGZhbHNlO1xuXG4gICAgLy8gVGhpcyBpcyB0byBmaXggYSBidWcgaW4gdGhlIEhhbmRsZWJhcnMgQVNUIHdoZXJlIHRoZSBwYXRoIGV4cHJlc3Npb25zIGluXG4gICAgLy8gYHt7dGhpcy5mb299fWAgKGFuZCBzaW1pbGFybHkgYHt7Zm9vLWJhciB0aGlzLmZvbyBuYW1lZD10aGlzLmZvb319YCBldGMpXG4gICAgLy8gYXJlIHNpbXBseSB0dXJuZWQgaW50byBge3tmb299fWAuIFRoZSBmaXggaXMgdG8gcHVzaCBpdCBiYWNrIG9udG8gdGhlXG4gICAgLy8gcGFydHMgYXJyYXkgYW5kIGxldCB0aGUgcnVudGltZSBzZWUgdGhlIGRpZmZlcmVuY2UuIEhvd2V2ZXIsIHdlIGNhbm5vdFxuICAgIC8vIHNpbXBseSB1c2UgdGhlIHN0cmluZyBgdGhpc2AgYXMgaXQgbWVhbnMgbGl0ZXJhbGx5IHRoZSBwcm9wZXJ0eSBjYWxsZWRcbiAgICAvLyBcInRoaXNcIiBpbiB0aGUgY3VycmVudCBjb250ZXh0IChpdCBjYW4gYmUgZXhwcmVzc2VkIGluIHRoZSBzeW50YXggYXNcbiAgICAvLyBge3tbdGhpc119fWAsIHdoZXJlIHRoZSBzcXVhcmUgYnJhY2tldCBhcmUgZ2VuZXJhbGx5IGZvciB0aGlzIGtpbmQgb2ZcbiAgICAvLyBlc2NhcGluZyDigJMgc3VjaCBhcyBge3tmb28uW1wiYmFyLmJhelwiXX19YCB3b3VsZCBtZWFuIGxvb2t1cCBhIHByb3BlcnR5XG4gICAgLy8gbmFtZWQgbGl0ZXJhbGx5IFwiYmFyLmJhelwiIG9uIGB0aGlzLmZvb2ApLiBCeSBjb252ZW50aW9uLCB3ZSB1c2UgYG51bGxgXG4gICAgLy8gZm9yIHRoaXMgcHVycG9zZS5cbiAgICBpZiAob3JpZ2luYWwubWF0Y2goL150aGlzKFxcLi4rKT8kLykpIHtcbiAgICAgIHRoaXNIZWFkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgdHlwZTogJ1BhdGhFeHByZXNzaW9uJyxcbiAgICAgIG9yaWdpbmFsOiBwYXRoLm9yaWdpbmFsLFxuICAgICAgdGhpczogdGhpc0hlYWQsXG4gICAgICBwYXJ0cyxcbiAgICAgIGRhdGE6IHBhdGguZGF0YSxcbiAgICAgIGxvYzogcGF0aC5sb2MsXG4gICAgfTtcbiAgfVxuXG4gIEhhc2goaGFzaDogSEJTLkhhc2gpOiBBU1QuSGFzaCB7XG4gICAgbGV0IHBhaXJzOiBBU1QuSGFzaFBhaXJbXSA9IFtdO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBoYXNoLnBhaXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBsZXQgcGFpciA9IGhhc2gucGFpcnNbaV07XG4gICAgICBwYWlycy5wdXNoKGIucGFpcihwYWlyLmtleSwgdGhpcy5hY2NlcHROb2RlKHBhaXIudmFsdWUpLCBwYWlyLmxvYykpO1xuICAgIH1cblxuICAgIHJldHVybiBiLmhhc2gocGFpcnMsIGhhc2gubG9jKTtcbiAgfVxuXG4gIFN0cmluZ0xpdGVyYWwoc3RyaW5nOiBIQlMuU3RyaW5nTGl0ZXJhbCk6IEFTVC5TdHJpbmdMaXRlcmFsIHtcbiAgICByZXR1cm4gYi5saXRlcmFsKCdTdHJpbmdMaXRlcmFsJywgc3RyaW5nLnZhbHVlLCBzdHJpbmcubG9jKTtcbiAgfVxuXG4gIEJvb2xlYW5MaXRlcmFsKGJvb2xlYW46IEhCUy5Cb29sZWFuTGl0ZXJhbCk6IEFTVC5Cb29sZWFuTGl0ZXJhbCB7XG4gICAgcmV0dXJuIGIubGl0ZXJhbCgnQm9vbGVhbkxpdGVyYWwnLCBib29sZWFuLnZhbHVlLCBib29sZWFuLmxvYyk7XG4gIH1cblxuICBOdW1iZXJMaXRlcmFsKG51bWJlcjogSEJTLk51bWJlckxpdGVyYWwpOiBBU1QuTnVtYmVyTGl0ZXJhbCB7XG4gICAgcmV0dXJuIGIubGl0ZXJhbCgnTnVtYmVyTGl0ZXJhbCcsIG51bWJlci52YWx1ZSwgbnVtYmVyLmxvYyk7XG4gIH1cblxuICBVbmRlZmluZWRMaXRlcmFsKHVuZGVmOiBIQlMuVW5kZWZpbmVkTGl0ZXJhbCk6IEFTVC5VbmRlZmluZWRMaXRlcmFsIHtcbiAgICByZXR1cm4gYi5saXRlcmFsKCdVbmRlZmluZWRMaXRlcmFsJywgdW5kZWZpbmVkLCB1bmRlZi5sb2MpO1xuICB9XG5cbiAgTnVsbExpdGVyYWwobnVsOiBIQlMuTnVsbExpdGVyYWwpOiBBU1QuTnVsbExpdGVyYWwge1xuICAgIHJldHVybiBiLmxpdGVyYWwoJ051bGxMaXRlcmFsJywgbnVsbCwgbnVsLmxvYyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gY2FsY3VsYXRlUmlnaHRTdHJpcHBlZE9mZnNldHMob3JpZ2luYWw6IHN0cmluZywgdmFsdWU6IHN0cmluZykge1xuICBpZiAodmFsdWUgPT09ICcnKSB7XG4gICAgLy8gaWYgaXQgaXMgZW1wdHksIGp1c3QgcmV0dXJuIHRoZSBjb3VudCBvZiBuZXdsaW5lc1xuICAgIC8vIGluIG9yaWdpbmFsXG4gICAgcmV0dXJuIHtcbiAgICAgIGxpbmVzOiBvcmlnaW5hbC5zcGxpdCgnXFxuJykubGVuZ3RoIC0gMSxcbiAgICAgIGNvbHVtbnM6IDAsXG4gICAgfTtcbiAgfVxuXG4gIC8vIG90aGVyd2lzZSwgcmV0dXJuIHRoZSBudW1iZXIgb2YgbmV3bGluZXMgcHJpb3IgdG9cbiAgLy8gYHZhbHVlYFxuICBsZXQgZGlmZmVyZW5jZSA9IG9yaWdpbmFsLnNwbGl0KHZhbHVlKVswXTtcbiAgbGV0IGxpbmVzID0gZGlmZmVyZW5jZS5zcGxpdCgvXFxuLyk7XG4gIGxldCBsaW5lQ291bnQgPSBsaW5lcy5sZW5ndGggLSAxO1xuXG4gIHJldHVybiB7XG4gICAgbGluZXM6IGxpbmVDb3VudCxcbiAgICBjb2x1bW5zOiBsaW5lc1tsaW5lQ291bnRdLmxlbmd0aCxcbiAgfTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlVG9rZW5pemVyTG9jYXRpb24odG9rZW5pemVyOiBQYXJzZXJbJ3Rva2VuaXplciddLCBjb250ZW50OiBIQlMuQ29udGVudFN0YXRlbWVudCkge1xuICBsZXQgbGluZSA9IGNvbnRlbnQubG9jLnN0YXJ0LmxpbmU7XG4gIGxldCBjb2x1bW4gPSBjb250ZW50LmxvYy5zdGFydC5jb2x1bW47XG5cbiAgbGV0IG9mZnNldHMgPSBjYWxjdWxhdGVSaWdodFN0cmlwcGVkT2Zmc2V0cyhcbiAgICBjb250ZW50Lm9yaWdpbmFsIGFzIFJlY2FzdDxIQlMuU3RyaXBGbGFncywgc3RyaW5nPixcbiAgICBjb250ZW50LnZhbHVlXG4gICk7XG5cbiAgbGluZSA9IGxpbmUgKyBvZmZzZXRzLmxpbmVzO1xuICBpZiAob2Zmc2V0cy5saW5lcykge1xuICAgIGNvbHVtbiA9IG9mZnNldHMuY29sdW1ucztcbiAgfSBlbHNlIHtcbiAgICBjb2x1bW4gPSBjb2x1bW4gKyBvZmZzZXRzLmNvbHVtbnM7XG4gIH1cblxuICB0b2tlbml6ZXIubGluZSA9IGxpbmU7XG4gIHRva2VuaXplci5jb2x1bW4gPSBjb2x1bW47XG59XG5cbmZ1bmN0aW9uIGFjY2VwdENhbGxOb2RlcyhcbiAgY29tcGlsZXI6IEhhbmRsZWJhcnNOb2RlVmlzaXRvcnMsXG4gIG5vZGU6IHtcbiAgICBwYXRoOiBIQlMuUGF0aEV4cHJlc3Npb247XG4gICAgcGFyYW1zOiBIQlMuRXhwcmVzc2lvbltdO1xuICAgIGhhc2g6IEhCUy5IYXNoO1xuICB9XG4pOiB7IHBhdGg6IEFTVC5QYXRoRXhwcmVzc2lvbjsgcGFyYW1zOiBBU1QuRXhwcmVzc2lvbltdOyBoYXNoOiBBU1QuSGFzaCB9IHtcbiAgbGV0IHBhdGggPSBjb21waWxlci5QYXRoRXhwcmVzc2lvbihub2RlLnBhdGgpO1xuXG4gIGxldCBwYXJhbXMgPSBub2RlLnBhcmFtcyA/IG5vZGUucGFyYW1zLm1hcCgoZSkgPT4gY29tcGlsZXIuYWNjZXB0Tm9kZTxBU1QuRXhwcmVzc2lvbj4oZSkpIDogW107XG4gIGxldCBoYXNoID0gbm9kZS5oYXNoID8gY29tcGlsZXIuSGFzaChub2RlLmhhc2gpIDogYi5oYXNoKCk7XG5cbiAgcmV0dXJuIHsgcGF0aCwgcGFyYW1zLCBoYXNoIH07XG59XG5cbmZ1bmN0aW9uIGFkZEVsZW1lbnRNb2RpZmllcihlbGVtZW50OiBUYWc8J1N0YXJ0VGFnJz4sIG11c3RhY2hlOiBBU1QuTXVzdGFjaGVTdGF0ZW1lbnQpIHtcbiAgbGV0IHsgcGF0aCwgcGFyYW1zLCBoYXNoLCBsb2MgfSA9IG11c3RhY2hlO1xuXG4gIGlmIChpc0xpdGVyYWwocGF0aCkpIHtcbiAgICBsZXQgbW9kaWZpZXIgPSBge3ske3ByaW50TGl0ZXJhbChwYXRoKX19fWA7XG4gICAgbGV0IHRhZyA9IGA8JHtlbGVtZW50Lm5hbWV9IC4uLiAke21vZGlmaWVyfSAuLi5gO1xuXG4gICAgdGhyb3cgbmV3IFN5bnRheEVycm9yKFxuICAgICAgYEluICR7dGFnfSwgJHttb2RpZmllcn0gaXMgbm90IGEgdmFsaWQgbW9kaWZpZXI6IFwiJHtwYXRoLm9yaWdpbmFsfVwiIG9uIGxpbmUgJHtcbiAgICAgICAgbG9jICYmIGxvYy5zdGFydC5saW5lXG4gICAgICB9LmAsXG4gICAgICBtdXN0YWNoZS5sb2NcbiAgICApO1xuICB9XG5cbiAgbGV0IG1vZGlmaWVyID0gYi5lbGVtZW50TW9kaWZpZXIocGF0aCwgcGFyYW1zLCBoYXNoLCBsb2MpO1xuICBlbGVtZW50Lm1vZGlmaWVycy5wdXNoKG1vZGlmaWVyKTtcbn1cblxuZnVuY3Rpb24gYXBwZW5kRHluYW1pY0F0dHJpYnV0ZVZhbHVlUGFydChhdHRyaWJ1dGU6IEF0dHJpYnV0ZSwgcGFydDogQVNULk11c3RhY2hlU3RhdGVtZW50KSB7XG4gIGF0dHJpYnV0ZS5pc0R5bmFtaWMgPSB0cnVlO1xuICBhdHRyaWJ1dGUucGFydHMucHVzaChwYXJ0KTtcbn1cbiJdLCJzb3VyY2VSb290IjoiIn0=