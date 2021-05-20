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

class HandlebarsNodeVisitors extends _parser.Parser {
  get isTopLevel() {
    return this.elementStack.length === 0;
  }

  Program(program) {
    let body = [];
    let node;

    if (this.isTopLevel) {
      node = _builders.default.template(body, program.blockParams, program.loc);
    } else {
      node = _builders.default.blockItself(body, program.blockParams, program.chained, program.loc);
    }

    let i,
        l = program.body.length;
    this.elementStack.push(node);

    if (l === 0) {
      return this.elementStack.pop();
    }

    for (i = 0; i < l; i++) {
      this.acceptNode(program.body[i]);
    } // Ensure that that the element stack is balanced properly.


    let poppedNode = this.elementStack.pop();

    if (poppedNode !== node) {
      let elementNode = poppedNode;
      throw new _syntaxError.default('Unclosed element `' + elementNode.tag + '` (on line ' + elementNode.loc.start.line + ').', elementNode.loc);
    }

    return node;
  }

  BlockStatement(block) {
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

    let {
      path,
      params,
      hash
    } = acceptCallNodes(this, block);
    let program = this.Program(block.program);
    let inverse = block.inverse ? this.Program(block.inverse) : null;

    let node = _builders.default.block(path, params, hash, program, inverse, block.loc, block.openStrip, block.inverseStrip, block.closeStrip);

    let parentProgram = this.currentElement();
    (0, _utils.appendChild)(parentProgram, node);
  }

  MustacheStatement(rawMustache) {
    let {
      tokenizer
    } = this;

    if (tokenizer.state === 'comment') {
      this.appendToCommentData(this.sourceForNode(rawMustache));
      return;
    }

    let mustache;
    let {
      escaped,
      loc,
      strip
    } = rawMustache;

    if ((0, _utils.isLiteral)(rawMustache.path)) {
      mustache = {
        type: 'MustacheStatement',
        path: this.acceptNode(rawMustache.path),
        params: [],
        hash: _builders.default.hash(),
        escaped,
        loc,
        strip
      };
    } else {
      let {
        path,
        params,
        hash
      } = acceptCallNodes(this, rawMustache);
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
        throw new _syntaxError.default(`Cannot use mustaches in an elements tagname: \`${this.sourceForNode(rawMustache, rawMustache.path)}\` at L${loc.start.line}:C${loc.start.column}`, mustache.loc);

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
  }

  ContentStatement(content) {
    updateTokenizerLocation(this.tokenizer, content);
    this.tokenizer.tokenizePart(content.value);
    this.tokenizer.flushData();
  }

  CommentStatement(rawComment) {
    let {
      tokenizer
    } = this;

    if (tokenizer.state === "comment"
    /* comment */
    ) {
        this.appendToCommentData(this.sourceForNode(rawComment));
        return null;
      }

    let {
      value,
      loc
    } = rawComment;

    let comment = _builders.default.mustacheComment(value, loc);

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
        throw new _syntaxError.default(`Using a Handlebars comment when in the \`${tokenizer['state']}\` state is not supported: "${comment.value}" on line ${loc.start.line}:${loc.start.column}`, rawComment.loc);
    }

    return comment;
  }

  PartialStatement(partial) {
    let {
      loc
    } = partial;
    throw new _syntaxError.default(`Handlebars partials are not supported: "${this.sourceForNode(partial, partial.name)}" at L${loc.start.line}:C${loc.start.column}`, partial.loc);
  }

  PartialBlockStatement(partialBlock) {
    let {
      loc
    } = partialBlock;
    throw new _syntaxError.default(`Handlebars partial blocks are not supported: "${this.sourceForNode(partialBlock, partialBlock.name)}" at L${loc.start.line}:C${loc.start.column}`, partialBlock.loc);
  }

  Decorator(decorator) {
    let {
      loc
    } = decorator;
    throw new _syntaxError.default(`Handlebars decorators are not supported: "${this.sourceForNode(decorator, decorator.path)}" at L${loc.start.line}:C${loc.start.column}`, decorator.loc);
  }

  DecoratorBlock(decoratorBlock) {
    let {
      loc
    } = decoratorBlock;
    throw new _syntaxError.default(`Handlebars decorator blocks are not supported: "${this.sourceForNode(decoratorBlock, decoratorBlock.path)}" at L${loc.start.line}:C${loc.start.column}`, decoratorBlock.loc);
  }

  SubExpression(sexpr) {
    let {
      path,
      params,
      hash
    } = acceptCallNodes(this, sexpr);
    return _builders.default.sexpr(path, params, hash, sexpr.loc);
  }

  PathExpression(path) {
    let {
      original,
      loc
    } = path;
    let parts;

    if (original.indexOf('/') !== -1) {
      if (original.slice(0, 2) === './') {
        throw new _syntaxError.default(`Using "./" is not supported in Glimmer and unnecessary: "${path.original}" on line ${loc.start.line}.`, path.loc);
      }

      if (original.slice(0, 3) === '../') {
        throw new _syntaxError.default(`Changing context using "../" is not supported in Glimmer: "${path.original}" on line ${loc.start.line}.`, path.loc);
      }

      if (original.indexOf('.') !== -1) {
        throw new _syntaxError.default(`Mixing '.' and '/' in paths is not supported in Glimmer; use only '.' to separate property paths: "${path.original}" on line ${loc.start.line}.`, path.loc);
      }

      parts = [path.parts.join('/')];
    } else if (original === '.') {
      let locationInfo = `L${loc.start.line}:C${loc.start.column}`;
      throw new _syntaxError.default(`'.' is not a supported path in Glimmer; check for a path with a trailing '.' at ${locationInfo}.`, path.loc);
    } else {
      parts = path.parts;
    }

    let thisHead = false; // This is to fix a bug in the Handlebars AST where the path expressions in
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
      this: thisHead,
      parts,
      data: path.data,
      loc: path.loc
    };
  }

  Hash(hash) {
    let pairs = [];

    for (let i = 0; i < hash.pairs.length; i++) {
      let pair = hash.pairs[i];
      pairs.push(_builders.default.pair(pair.key, this.acceptNode(pair.value), pair.loc));
    }

    return _builders.default.hash(pairs, hash.loc);
  }

  StringLiteral(string) {
    return _builders.default.literal('StringLiteral', string.value, string.loc);
  }

  BooleanLiteral(boolean) {
    return _builders.default.literal('BooleanLiteral', boolean.value, boolean.loc);
  }

  NumberLiteral(number) {
    return _builders.default.literal('NumberLiteral', number.value, number.loc);
  }

  UndefinedLiteral(undef) {
    return _builders.default.literal('UndefinedLiteral', undefined, undef.loc);
  }

  NullLiteral(nul) {
    return _builders.default.literal('NullLiteral', null, nul.loc);
  }

}

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


  let difference = original.split(value)[0];
  let lines = difference.split(/\n/);
  let lineCount = lines.length - 1;
  return {
    lines: lineCount,
    columns: lines[lineCount].length
  };
}

function updateTokenizerLocation(tokenizer, content) {
  let line = content.loc.start.line;
  let column = content.loc.start.column;
  let offsets = calculateRightStrippedOffsets(content.original, content.value);
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
  let path = compiler.PathExpression(node.path);
  let params = node.params ? node.params.map(e => compiler.acceptNode(e)) : [];
  let hash = node.hash ? compiler.Hash(node.hash) : _builders.default.hash();
  return {
    path,
    params,
    hash
  };
}

function addElementModifier(element, mustache) {
  let {
    path,
    params,
    hash,
    loc
  } = mustache;

  if ((0, _utils.isLiteral)(path)) {
    let modifier = `{{${(0, _utils.printLiteral)(path)}}}`;
    let tag = `<${element.name} ... ${modifier} ...`;
    throw new _syntaxError.default(`In ${tag}, ${modifier} is not a valid modifier: "${path.original}" on line ${loc && loc.start.line}.`, mustache.loc);
  }

  let modifier = _builders.default.elementModifier(path, params, hash, loc);

  element.modifiers.push(modifier);
}

function appendDynamicAttributeValuePart(attribute, part) {
  attribute.isDynamic = true;
  attribute.parts.push(part);
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL0BnbGltbWVyL3N5bnRheC9saWIvcGFyc2VyL2hhbmRsZWJhcnMtbm9kZS12aXNpdG9ycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUE7O0FBQ0E7O0FBR0E7O0FBQ0E7Ozs7QUFLTSxNQUFBLHNCQUFBLFNBQUEsY0FBQSxDQUFxRDtBQUt6RCxNQUFBLFVBQUEsR0FBc0I7QUFDcEIsV0FBTyxLQUFBLFlBQUEsQ0FBQSxNQUFBLEtBQVAsQ0FBQTtBQUNEOztBQUtELEVBQUEsT0FBTyxDQUFBLE9BQUEsRUFBcUI7QUFDMUIsUUFBSSxJQUFJLEdBQVIsRUFBQTtBQUNBLFFBQUEsSUFBQTs7QUFFQSxRQUFJLEtBQUosVUFBQSxFQUFxQjtBQUNuQixNQUFBLElBQUksR0FBRyxrQkFBQSxRQUFBLENBQUEsSUFBQSxFQUFpQixPQUFPLENBQXhCLFdBQUEsRUFBc0MsT0FBTyxDQUFwRCxHQUFPLENBQVA7QUFERixLQUFBLE1BRU87QUFDTCxNQUFBLElBQUksR0FBRyxrQkFBQSxXQUFBLENBQUEsSUFBQSxFQUFvQixPQUFPLENBQTNCLFdBQUEsRUFBeUMsT0FBTyxDQUFoRCxPQUFBLEVBQTBELE9BQU8sQ0FBeEUsR0FBTyxDQUFQO0FBQ0Q7O0FBRUQsUUFBQSxDQUFBO0FBQUEsUUFDRSxDQUFDLEdBQUcsT0FBTyxDQUFQLElBQUEsQ0FETixNQUFBO0FBR0EsU0FBQSxZQUFBLENBQUEsSUFBQSxDQUFBLElBQUE7O0FBRUEsUUFBSSxDQUFDLEtBQUwsQ0FBQSxFQUFhO0FBQ1gsYUFBTyxLQUFBLFlBQUEsQ0FBUCxHQUFPLEVBQVA7QUFDRDs7QUFFRCxTQUFLLENBQUMsR0FBTixDQUFBLEVBQVksQ0FBQyxHQUFiLENBQUEsRUFBbUIsQ0FBbkIsRUFBQSxFQUF3QjtBQUN0QixXQUFBLFVBQUEsQ0FBZ0IsT0FBTyxDQUFQLElBQUEsQ0FBaEIsQ0FBZ0IsQ0FBaEI7QUFwQndCLEtBQUEsQ0F1QjFCOzs7QUFD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Q0FBZjs7QUFDQSxFQUFBLE9BQU8sQ0FBUCxTQUFBLENBQUEsSUFBQSxDQUFBLFFBQUE7QUFDRDs7QUFFRCxTQUFBLCtCQUFBLENBQUEsU0FBQSxFQUFBLElBQUEsRUFBMEY7QUFDeEYsRUFBQSxTQUFTLENBQVQsU0FBQSxHQUFBLElBQUE7QUFDQSxFQUFBLFNBQVMsQ0FBVCxLQUFBLENBQUEsSUFBQSxDQUFBLElBQUE7QUFDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBiIGZyb20gJy4uL2J1aWxkZXJzJztcbmltcG9ydCB7IGFwcGVuZENoaWxkLCBpc0xpdGVyYWwsIHByaW50TGl0ZXJhbCB9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCAqIGFzIEFTVCBmcm9tICcuLi90eXBlcy9ub2Rlcyc7XG5pbXBvcnQgKiBhcyBIQlMgZnJvbSAnLi4vdHlwZXMvaGFuZGxlYmFycy1hc3QnO1xuaW1wb3J0IHsgUGFyc2VyLCBUYWcsIEF0dHJpYnV0ZSB9IGZyb20gJy4uL3BhcnNlcic7XG5pbXBvcnQgU3ludGF4RXJyb3IgZnJvbSAnLi4vZXJyb3JzL3N5bnRheC1lcnJvcic7XG5pbXBvcnQgeyBPcHRpb24gfSBmcm9tICdAZ2xpbW1lci91dGlsJztcbmltcG9ydCB7IFJlY2FzdCB9IGZyb20gJ0BnbGltbWVyL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgVG9rZW5pemVyU3RhdGUgfSBmcm9tICdzaW1wbGUtaHRtbC10b2tlbml6ZXInO1xuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgSGFuZGxlYmFyc05vZGVWaXNpdG9ycyBleHRlbmRzIFBhcnNlciB7XG4gIGFic3RyYWN0IGFwcGVuZFRvQ29tbWVudERhdGEoczogc3RyaW5nKTogdm9pZDtcbiAgYWJzdHJhY3QgYmVnaW5BdHRyaWJ1dGVWYWx1ZShxdW90ZWQ6IGJvb2xlYW4pOiB2b2lkO1xuICBhYnN0cmFjdCBmaW5pc2hBdHRyaWJ1dGVWYWx1ZSgpOiB2b2lkO1xuXG4gIHByaXZhdGUgZ2V0IGlzVG9wTGV2ZWwoKSB7XG4gICAgcmV0dXJuIHRoaXMuZWxlbWVudFN0YWNrLmxlbmd0aCA9PT0gMDtcbiAgfVxuXG4gIFByb2dyYW0ocHJvZ3JhbTogSEJTLlByb2dyYW0pOiBBU1QuQmxvY2s7XG4gIFByb2dyYW0ocHJvZ3JhbTogSEJTLlByb2dyYW0pOiBBU1QuVGVtcGxhdGU7XG4gIFByb2dyYW0ocHJvZ3JhbTogSEJTLlByb2dyYW0pOiBBU1QuVGVtcGxhdGUgfCBBU1QuQmxvY2s7XG4gIFByb2dyYW0ocHJvZ3JhbTogSEJTLlByb2dyYW0pOiBBU1QuQmxvY2sgfCBBU1QuVGVtcGxhdGUge1xuICAgIGxldCBib2R5OiBBU1QuU3RhdGVtZW50W10gPSBbXTtcbiAgICBsZXQgbm9kZTtcblxuICAgIGlmICh0aGlzLmlzVG9wTGV2ZWwpIHtcbiAgICAgIG5vZGUgPSBiLnRlbXBsYXRlKGJvZHksIHByb2dyYW0uYmxvY2tQYXJhbXMsIHByb2dyYW0ubG9jKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbm9kZSA9IGIuYmxvY2tJdHNlbGYoYm9keSwgcHJvZ3JhbS5ibG9ja1BhcmFtcywgcHJvZ3JhbS5jaGFpbmVkLCBwcm9ncmFtLmxvYyk7XG4gICAgfVxuXG4gICAgbGV0IGksXG4gICAgICBsID0gcHJvZ3JhbS5ib2R5Lmxlbmd0aDtcblxuICAgIHRoaXMuZWxlbWVudFN0YWNrLnB1c2gobm9kZSk7XG5cbiAgICBpZiAobCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHRoaXMuZWxlbWVudFN0YWNrLnBvcCgpIGFzIEFTVC5CbG9jayB8IEFTVC5UZW1wbGF0ZTtcbiAgICB9XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgbDsgaSsrKSB7XG4gICAgICB0aGlzLmFjY2VwdE5vZGUocHJvZ3JhbS5ib2R5W2ldKTtcbiAgICB9XG5cbiAgICAvLyBFbnN1cmUgdGhhdCB0aGF0IHRoZSBlbGVtZW50IHN0YWNrIGlzIGJhbGFuY2VkIHByb3Blcmx5LlxuICAgIGxldCBwb3BwZWROb2RlID0gdGhpcy5lbGVtZW50U3RhY2sucG9wKCk7XG4gICAgaWYgKHBvcHBlZE5vZGUgIT09IG5vZGUpIHtcbiAgICAgIGxldCBlbGVtZW50Tm9kZSA9IHBvcHBlZE5vZGUgYXMgQVNULkVsZW1lbnROb2RlO1xuXG4gICAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoXG4gICAgICAgICdVbmNsb3NlZCBlbGVtZW50IGAnICsgZWxlbWVudE5vZGUudGFnICsgJ2AgKG9uIGxpbmUgJyArIGVsZW1lbnROb2RlLmxvYyEuc3RhcnQubGluZSArICcpLicsXG4gICAgICAgIGVsZW1lbnROb2RlLmxvY1xuICAgICAgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbm9kZTtcbiAgfVxuXG4gIEJsb2NrU3RhdGVtZW50KGJsb2NrOiBIQlMuQmxvY2tTdGF0ZW1lbnQpOiBBU1QuQmxvY2tTdGF0ZW1lbnQgfCB2b2lkIHtcbiAgICBpZiAodGhpcy50b2tlbml6ZXIuc3RhdGUgPT09IFRva2VuaXplclN0YXRlLmNvbW1lbnQpIHtcbiAgICAgIHRoaXMuYXBwZW5kVG9Db21tZW50RGF0YSh0aGlzLnNvdXJjZUZvck5vZGUoYmxvY2spKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoXG4gICAgICB0aGlzLnRva2VuaXplci5zdGF0ZSAhPT0gVG9rZW5pemVyU3RhdGUuZGF0YSAmJlxuICAgICAgdGhpcy50b2tlbml6ZXJbJ3N0YXRlJ10gIT09IFRva2VuaXplclN0YXRlLmJlZm9yZURhdGFcbiAgICApIHtcbiAgICAgIHRocm93IG5ldyBTeW50YXhFcnJvcihcbiAgICAgICAgJ0EgYmxvY2sgbWF5IG9ubHkgYmUgdXNlZCBpbnNpZGUgYW4gSFRNTCBlbGVtZW50IG9yIGFub3RoZXIgYmxvY2suJyxcbiAgICAgICAgYmxvY2subG9jXG4gICAgICApO1xuICAgIH1cblxuICAgIGxldCB7IHBhdGgsIHBhcmFtcywgaGFzaCB9ID0gYWNjZXB0Q2FsbE5vZGVzKHRoaXMsIGJsb2NrKTtcbiAgICBsZXQgcHJvZ3JhbSA9IHRoaXMuUHJvZ3JhbShibG9jay5wcm9ncmFtKTtcbiAgICBsZXQgaW52ZXJzZSA9IGJsb2NrLmludmVyc2UgPyB0aGlzLlByb2dyYW0oYmxvY2suaW52ZXJzZSkgOiBudWxsO1xuXG4gICAgbGV0IG5vZGUgPSBiLmJsb2NrKFxuICAgICAgcGF0aCxcbiAgICAgIHBhcmFtcyxcbiAgICAgIGhhc2gsXG4gICAgICBwcm9ncmFtLFxuICAgICAgaW52ZXJzZSxcbiAgICAgIGJsb2NrLmxvYyxcbiAgICAgIGJsb2NrLm9wZW5TdHJpcCxcbiAgICAgIGJsb2NrLmludmVyc2VTdHJpcCxcbiAgICAgIGJsb2NrLmNsb3NlU3RyaXBcbiAgICApO1xuXG4gICAgbGV0IHBhcmVudFByb2dyYW0gPSB0aGlzLmN1cnJlbnRFbGVtZW50KCk7XG5cbiAgICBhcHBlbmRDaGlsZChwYXJlbnRQcm9ncmFtLCBub2RlKTtcbiAgfVxuXG4gIE11c3RhY2hlU3RhdGVtZW50KHJhd011c3RhY2hlOiBIQlMuTXVzdGFjaGVTdGF0ZW1lbnQpOiBBU1QuTXVzdGFjaGVTdGF0ZW1lbnQgfCB2b2lkIHtcbiAgICBsZXQgeyB0b2tlbml6ZXIgfSA9IHRoaXM7XG5cbiAgICBpZiAodG9rZW5pemVyLnN0YXRlID09PSAnY29tbWVudCcpIHtcbiAgICAgIHRoaXMuYXBwZW5kVG9Db21tZW50RGF0YSh0aGlzLnNvdXJjZUZvck5vZGUocmF3TXVzdGFjaGUpKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsZXQgbXVzdGFjaGU6IEFTVC5NdXN0YWNoZVN0YXRlbWVudDtcbiAgICBsZXQgeyBlc2NhcGVkLCBsb2MsIHN0cmlwIH0gPSByYXdNdXN0YWNoZTtcblxuICAgIGlmIChpc0xpdGVyYWwocmF3TXVzdGFjaGUucGF0aCkpIHtcbiAgICAgIG11c3RhY2hlID0ge1xuICAgICAgICB0eXBlOiAnTXVzdGFjaGVTdGF0ZW1lbnQnLFxuICAgICAgICBwYXRoOiB0aGlzLmFjY2VwdE5vZGU8QVNULkxpdGVyYWw+KHJhd011c3RhY2hlLnBhdGgpLFxuICAgICAgICBwYXJhbXM6IFtdLFxuICAgICAgICBoYXNoOiBiLmhhc2goKSxcbiAgICAgICAgZXNjYXBlZCxcbiAgICAgICAgbG9jLFxuICAgICAgICBzdHJpcCxcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxldCB7IHBhdGgsIHBhcmFtcywgaGFzaCB9ID0gYWNjZXB0Q2FsbE5vZGVzKFxuICAgICAgICB0aGlzLFxuICAgICAgICByYXdNdXN0YWNoZSBhcyBIQlMuTXVzdGFjaGVTdGF0ZW1lbnQgJiB7XG4gICAgICAgICAgcGF0aDogSEJTLlBhdGhFeHByZXNzaW9uO1xuICAgICAgICB9XG4gICAgICApO1xuICAgICAgbXVzdGFjaGUgPSBiLm11c3RhY2hlKHBhdGgsIHBhcmFtcywgaGFzaCwgIWVzY2FwZWQsIGxvYywgc3RyaXApO1xuICAgIH1cblxuICAgIHN3aXRjaCAodG9rZW5pemVyLnN0YXRlKSB7XG4gICAgICAvLyBUYWcgaGVscGVyc1xuICAgICAgY2FzZSBUb2tlbml6ZXJTdGF0ZS50YWdPcGVuOlxuICAgICAgY2FzZSBUb2tlbml6ZXJTdGF0ZS50YWdOYW1lOlxuICAgICAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoXG4gICAgICAgICAgYENhbm5vdCB1c2UgbXVzdGFjaGVzIGluIGFuIGVsZW1lbnRzIHRhZ25hbWU6IFxcYCR7dGhpcy5zb3VyY2VGb3JOb2RlKFxuICAgICAgICAgICAgcmF3TXVzdGFjaGUsXG4gICAgICAgICAgICByYXdNdXN0YWNoZS5wYXRoXG4gICAgICAgICAgKX1cXGAgYXQgTCR7bG9jLnN0YXJ0LmxpbmV9OkMke2xvYy5zdGFydC5jb2x1bW59YCxcbiAgICAgICAgICBtdXN0YWNoZS5sb2NcbiAgICAgICAgKTtcblxuICAgICAgY2FzZSBUb2tlbml6ZXJTdGF0ZS5iZWZvcmVBdHRyaWJ1dGVOYW1lOlxuICAgICAgICBhZGRFbGVtZW50TW9kaWZpZXIodGhpcy5jdXJyZW50U3RhcnRUYWcsIG11c3RhY2hlKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFRva2VuaXplclN0YXRlLmF0dHJpYnV0ZU5hbWU6XG4gICAgICBjYXNlIFRva2VuaXplclN0YXRlLmFmdGVyQXR0cmlidXRlTmFtZTpcbiAgICAgICAgdGhpcy5iZWdpbkF0dHJpYnV0ZVZhbHVlKGZhbHNlKTtcbiAgICAgICAgdGhpcy5maW5pc2hBdHRyaWJ1dGVWYWx1ZSgpO1xuICAgICAgICBhZGRFbGVtZW50TW9kaWZpZXIodGhpcy5jdXJyZW50U3RhcnRUYWcsIG11c3RhY2hlKTtcbiAgICAgICAgdG9rZW5pemVyLnRyYW5zaXRpb25UbyhUb2tlbml6ZXJTdGF0ZS5iZWZvcmVBdHRyaWJ1dGVOYW1lKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFRva2VuaXplclN0YXRlLmFmdGVyQXR0cmlidXRlVmFsdWVRdW90ZWQ6XG4gICAgICAgIGFkZEVsZW1lbnRNb2RpZmllcih0aGlzLmN1cnJlbnRTdGFydFRhZywgbXVzdGFjaGUpO1xuICAgICAgICB0b2tlbml6ZXIudHJhbnNpdGlvblRvKFRva2VuaXplclN0YXRlLmJlZm9yZUF0dHJpYnV0ZU5hbWUpO1xuICAgICAgICBicmVhaztcblxuICAgICAgLy8gQXR0cmlidXRlIHZhbHVlc1xuICAgICAgY2FzZSBUb2tlbml6ZXJTdGF0ZS5iZWZvcmVBdHRyaWJ1dGVWYWx1ZTpcbiAgICAgICAgdGhpcy5iZWdpbkF0dHJpYnV0ZVZhbHVlKGZhbHNlKTtcbiAgICAgICAgYXBwZW5kRHluYW1pY0F0dHJpYnV0ZVZhbHVlUGFydCh0aGlzLmN1cnJlbnRBdHRyaWJ1dGUhLCBtdXN0YWNoZSk7XG4gICAgICAgIHRva2VuaXplci50cmFuc2l0aW9uVG8oVG9rZW5pemVyU3RhdGUuYXR0cmlidXRlVmFsdWVVbnF1b3RlZCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBUb2tlbml6ZXJTdGF0ZS5hdHRyaWJ1dGVWYWx1ZURvdWJsZVF1b3RlZDpcbiAgICAgIGNhc2UgVG9rZW5pemVyU3RhdGUuYXR0cmlidXRlVmFsdWVTaW5nbGVRdW90ZWQ6XG4gICAgICBjYXNlIFRva2VuaXplclN0YXRlLmF0dHJpYnV0ZVZhbHVlVW5xdW90ZWQ6XG4gICAgICAgIGFwcGVuZER5bmFtaWNBdHRyaWJ1dGVWYWx1ZVBhcnQodGhpcy5jdXJyZW50QXR0cmlidXRlISwgbXVzdGFjaGUpO1xuICAgICAgICBicmVhaztcblxuICAgICAgLy8gVE9ETzogT25seSBhcHBlbmQgY2hpbGQgd2hlbiB0aGUgdG9rZW5pemVyIHN0YXRlIG1ha2VzXG4gICAgICAvLyBzZW5zZSB0byBkbyBzbywgb3RoZXJ3aXNlIHRocm93IGFuIGVycm9yLlxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgYXBwZW5kQ2hpbGQodGhpcy5jdXJyZW50RWxlbWVudCgpLCBtdXN0YWNoZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG11c3RhY2hlO1xuICB9XG5cbiAgQ29udGVudFN0YXRlbWVudChjb250ZW50OiBIQlMuQ29udGVudFN0YXRlbWVudCk6IHZvaWQge1xuICAgIHVwZGF0ZVRva2VuaXplckxvY2F0aW9uKHRoaXMudG9rZW5pemVyLCBjb250ZW50KTtcblxuICAgIHRoaXMudG9rZW5pemVyLnRva2VuaXplUGFydChjb250ZW50LnZhbHVlKTtcbiAgICB0aGlzLnRva2VuaXplci5mbHVzaERhdGEoKTtcbiAgfVxuXG4gIENvbW1lbnRTdGF0ZW1lbnQocmF3Q29tbWVudDogSEJTLkNvbW1lbnRTdGF0ZW1lbnQpOiBPcHRpb248QVNULk11c3RhY2hlQ29tbWVudFN0YXRlbWVudD4ge1xuICAgIGxldCB7IHRva2VuaXplciB9ID0gdGhpcztcblxuICAgIGlmICh0b2tlbml6ZXIuc3RhdGUgPT09IFRva2VuaXplclN0YXRlLmNvbW1lbnQpIHtcbiAgICAgIHRoaXMuYXBwZW5kVG9Db21tZW50RGF0YSh0aGlzLnNvdXJjZUZvck5vZGUocmF3Q29tbWVudCkpO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgbGV0IHsgdmFsdWUsIGxvYyB9ID0gcmF3Q29tbWVudDtcbiAgICBsZXQgY29tbWVudCA9IGIubXVzdGFjaGVDb21tZW50KHZhbHVlLCBsb2MpO1xuXG4gICAgc3dpdGNoICh0b2tlbml6ZXIuc3RhdGUpIHtcbiAgICAgIGNhc2UgVG9rZW5pemVyU3RhdGUuYmVmb3JlQXR0cmlidXRlTmFtZTpcbiAgICAgIGNhc2UgVG9rZW5pemVyU3RhdGUuYWZ0ZXJBdHRyaWJ1dGVOYW1lOlxuICAgICAgICB0aGlzLmN1cnJlbnRTdGFydFRhZy5jb21tZW50cy5wdXNoKGNvbW1lbnQpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSBUb2tlbml6ZXJTdGF0ZS5iZWZvcmVEYXRhOlxuICAgICAgY2FzZSBUb2tlbml6ZXJTdGF0ZS5kYXRhOlxuICAgICAgICBhcHBlbmRDaGlsZCh0aGlzLmN1cnJlbnRFbGVtZW50KCksIGNvbW1lbnQpO1xuICAgICAgICBicmVhaztcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IFN5bnRheEVycm9yKFxuICAgICAgICAgIGBVc2luZyBhIEhhbmRsZWJhcnMgY29tbWVudCB3aGVuIGluIHRoZSBcXGAke3Rva2VuaXplclsnc3RhdGUnXX1cXGAgc3RhdGUgaXMgbm90IHN1cHBvcnRlZDogXCIke2NvbW1lbnQudmFsdWV9XCIgb24gbGluZSAke2xvYy5zdGFydC5saW5lfToke2xvYy5zdGFydC5jb2x1bW59YCxcbiAgICAgICAgICByYXdDb21tZW50LmxvY1xuICAgICAgICApO1xuICAgIH1cblxuICAgIHJldHVybiBjb21tZW50O1xuICB9XG5cbiAgUGFydGlhbFN0YXRlbWVudChwYXJ0aWFsOiBIQlMuUGFydGlhbFN0YXRlbWVudCk6IG5ldmVyIHtcbiAgICBsZXQgeyBsb2MgfSA9IHBhcnRpYWw7XG5cbiAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoXG4gICAgICBgSGFuZGxlYmFycyBwYXJ0aWFscyBhcmUgbm90IHN1cHBvcnRlZDogXCIke3RoaXMuc291cmNlRm9yTm9kZShwYXJ0aWFsLCBwYXJ0aWFsLm5hbWUpfVwiIGF0IEwke1xuICAgICAgICBsb2Muc3RhcnQubGluZVxuICAgICAgfTpDJHtsb2Muc3RhcnQuY29sdW1ufWAsXG4gICAgICBwYXJ0aWFsLmxvY1xuICAgICk7XG4gIH1cblxuICBQYXJ0aWFsQmxvY2tTdGF0ZW1lbnQocGFydGlhbEJsb2NrOiBIQlMuUGFydGlhbEJsb2NrU3RhdGVtZW50KTogbmV2ZXIge1xuICAgIGxldCB7IGxvYyB9ID0gcGFydGlhbEJsb2NrO1xuXG4gICAgdGhyb3cgbmV3IFN5bnRheEVycm9yKFxuICAgICAgYEhhbmRsZWJhcnMgcGFydGlhbCBibG9ja3MgYXJlIG5vdCBzdXBwb3J0ZWQ6IFwiJHt0aGlzLnNvdXJjZUZvck5vZGUoXG4gICAgICAgIHBhcnRpYWxCbG9jayxcbiAgICAgICAgcGFydGlhbEJsb2NrLm5hbWVcbiAgICAgICl9XCIgYXQgTCR7bG9jLnN0YXJ0LmxpbmV9OkMke2xvYy5zdGFydC5jb2x1bW59YCxcbiAgICAgIHBhcnRpYWxCbG9jay5sb2NcbiAgICApO1xuICB9XG5cbiAgRGVjb3JhdG9yKGRlY29yYXRvcjogSEJTLkRlY29yYXRvcik6IG5ldmVyIHtcbiAgICBsZXQgeyBsb2MgfSA9IGRlY29yYXRvcjtcblxuICAgIHRocm93IG5ldyBTeW50YXhFcnJvcihcbiAgICAgIGBIYW5kbGViYXJzIGRlY29yYXRvcnMgYXJlIG5vdCBzdXBwb3J0ZWQ6IFwiJHt0aGlzLnNvdXJjZUZvck5vZGUoXG4gICAgICAgIGRlY29yYXRvcixcbiAgICAgICAgZGVjb3JhdG9yLnBhdGhcbiAgICAgICl9XCIgYXQgTCR7bG9jLnN0YXJ0LmxpbmV9OkMke2xvYy5zdGFydC5jb2x1bW59YCxcbiAgICAgIGRlY29yYXRvci5sb2NcbiAgICApO1xuICB9XG5cbiAgRGVjb3JhdG9yQmxvY2soZGVjb3JhdG9yQmxvY2s6IEhCUy5EZWNvcmF0b3JCbG9jayk6IG5ldmVyIHtcbiAgICBsZXQgeyBsb2MgfSA9IGRlY29yYXRvckJsb2NrO1xuXG4gICAgdGhyb3cgbmV3IFN5bnRheEVycm9yKFxuICAgICAgYEhhbmRsZWJhcnMgZGVjb3JhdG9yIGJsb2NrcyBhcmUgbm90IHN1cHBvcnRlZDogXCIke3RoaXMuc291cmNlRm9yTm9kZShcbiAgICAgICAgZGVjb3JhdG9yQmxvY2ssXG4gICAgICAgIGRlY29yYXRvckJsb2NrLnBhdGhcbiAgICAgICl9XCIgYXQgTCR7bG9jLnN0YXJ0LmxpbmV9OkMke2xvYy5zdGFydC5jb2x1bW59YCxcbiAgICAgIGRlY29yYXRvckJsb2NrLmxvY1xuICAgICk7XG4gIH1cblxuICBTdWJFeHByZXNzaW9uKHNleHByOiBIQlMuU3ViRXhwcmVzc2lvbik6IEFTVC5TdWJFeHByZXNzaW9uIHtcbiAgICBsZXQgeyBwYXRoLCBwYXJhbXMsIGhhc2ggfSA9IGFjY2VwdENhbGxOb2Rlcyh0aGlzLCBzZXhwcik7XG4gICAgcmV0dXJuIGIuc2V4cHIocGF0aCwgcGFyYW1zLCBoYXNoLCBzZXhwci5sb2MpO1xuICB9XG5cbiAgUGF0aEV4cHJlc3Npb24ocGF0aDogSEJTLlBhdGhFeHByZXNzaW9uKTogQVNULlBhdGhFeHByZXNzaW9uIHtcbiAgICBsZXQgeyBvcmlnaW5hbCwgbG9jIH0gPSBwYXRoO1xuICAgIGxldCBwYXJ0czogc3RyaW5nW107XG5cbiAgICBpZiAob3JpZ2luYWwuaW5kZXhPZignLycpICE9PSAtMSkge1xuICAgICAgaWYgKG9yaWdpbmFsLnNsaWNlKDAsIDIpID09PSAnLi8nKSB7XG4gICAgICAgIHRocm93IG5ldyBTeW50YXhFcnJvcihcbiAgICAgICAgICBgVXNpbmcgXCIuL1wiIGlzIG5vdCBzdXBwb3J0ZWQgaW4gR2xpbW1lciBhbmQgdW5uZWNlc3Nhcnk6IFwiJHtwYXRoLm9yaWdpbmFsfVwiIG9uIGxpbmUgJHtsb2Muc3RhcnQubGluZX0uYCxcbiAgICAgICAgICBwYXRoLmxvY1xuICAgICAgICApO1xuICAgICAgfVxuICAgICAgaWYgKG9yaWdpbmFsLnNsaWNlKDAsIDMpID09PSAnLi4vJykge1xuICAgICAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoXG4gICAgICAgICAgYENoYW5naW5nIGNvbnRleHQgdXNpbmcgXCIuLi9cIiBpcyBub3Qgc3VwcG9ydGVkIGluIEdsaW1tZXI6IFwiJHtwYXRoLm9yaWdpbmFsfVwiIG9uIGxpbmUgJHtsb2Muc3RhcnQubGluZX0uYCxcbiAgICAgICAgICBwYXRoLmxvY1xuICAgICAgICApO1xuICAgICAgfVxuICAgICAgaWYgKG9yaWdpbmFsLmluZGV4T2YoJy4nKSAhPT0gLTEpIHtcbiAgICAgICAgdGhyb3cgbmV3IFN5bnRheEVycm9yKFxuICAgICAgICAgIGBNaXhpbmcgJy4nIGFuZCAnLycgaW4gcGF0aHMgaXMgbm90IHN1cHBvcnRlZCBpbiBHbGltbWVyOyB1c2Ugb25seSAnLicgdG8gc2VwYXJhdGUgcHJvcGVydHkgcGF0aHM6IFwiJHtwYXRoLm9yaWdpbmFsfVwiIG9uIGxpbmUgJHtsb2Muc3RhcnQubGluZX0uYCxcbiAgICAgICAgICBwYXRoLmxvY1xuICAgICAgICApO1xuICAgICAgfVxuICAgICAgcGFydHMgPSBbcGF0aC5wYXJ0cy5qb2luKCcvJyldO1xuICAgIH0gZWxzZSBpZiAob3JpZ2luYWwgPT09ICcuJykge1xuICAgICAgbGV0IGxvY2F0aW9uSW5mbyA9IGBMJHtsb2Muc3RhcnQubGluZX06QyR7bG9jLnN0YXJ0LmNvbHVtbn1gO1xuICAgICAgdGhyb3cgbmV3IFN5bnRheEVycm9yKFxuICAgICAgICBgJy4nIGlzIG5vdCBhIHN1cHBvcnRlZCBwYXRoIGluIEdsaW1tZXI7IGNoZWNrIGZvciBhIHBhdGggd2l0aCBhIHRyYWlsaW5nICcuJyBhdCAke2xvY2F0aW9uSW5mb30uYCxcbiAgICAgICAgcGF0aC5sb2NcbiAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhcnRzID0gcGF0aC5wYXJ0cztcbiAgICB9XG5cbiAgICBsZXQgdGhpc0hlYWQgPSBmYWxzZTtcblxuICAgIC8vIFRoaXMgaXMgdG8gZml4IGEgYnVnIGluIHRoZSBIYW5kbGViYXJzIEFTVCB3aGVyZSB0aGUgcGF0aCBleHByZXNzaW9ucyBpblxuICAgIC8vIGB7e3RoaXMuZm9vfX1gIChhbmQgc2ltaWxhcmx5IGB7e2Zvby1iYXIgdGhpcy5mb28gbmFtZWQ9dGhpcy5mb299fWAgZXRjKVxuICAgIC8vIGFyZSBzaW1wbHkgdHVybmVkIGludG8gYHt7Zm9vfX1gLiBUaGUgZml4IGlzIHRvIHB1c2ggaXQgYmFjayBvbnRvIHRoZVxuICAgIC8vIHBhcnRzIGFycmF5IGFuZCBsZXQgdGhlIHJ1bnRpbWUgc2VlIHRoZSBkaWZmZXJlbmNlLiBIb3dldmVyLCB3ZSBjYW5ub3RcbiAgICAvLyBzaW1wbHkgdXNlIHRoZSBzdHJpbmcgYHRoaXNgIGFzIGl0IG1lYW5zIGxpdGVyYWxseSB0aGUgcHJvcGVydHkgY2FsbGVkXG4gICAgLy8gXCJ0aGlzXCIgaW4gdGhlIGN1cnJlbnQgY29udGV4dCAoaXQgY2FuIGJlIGV4cHJlc3NlZCBpbiB0aGUgc3ludGF4IGFzXG4gICAgLy8gYHt7W3RoaXNdfX1gLCB3aGVyZSB0aGUgc3F1YXJlIGJyYWNrZXQgYXJlIGdlbmVyYWxseSBmb3IgdGhpcyBraW5kIG9mXG4gICAgLy8gZXNjYXBpbmcg4oCTIHN1Y2ggYXMgYHt7Zm9vLltcImJhci5iYXpcIl19fWAgd291bGQgbWVhbiBsb29rdXAgYSBwcm9wZXJ0eVxuICAgIC8vIG5hbWVkIGxpdGVyYWxseSBcImJhci5iYXpcIiBvbiBgdGhpcy5mb29gKS4gQnkgY29udmVudGlvbiwgd2UgdXNlIGBudWxsYFxuICAgIC8vIGZvciB0aGlzIHB1cnBvc2UuXG4gICAgaWYgKG9yaWdpbmFsLm1hdGNoKC9edGhpcyhcXC4uKyk/JC8pKSB7XG4gICAgICB0aGlzSGVhZCA9IHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHR5cGU6ICdQYXRoRXhwcmVzc2lvbicsXG4gICAgICBvcmlnaW5hbDogcGF0aC5vcmlnaW5hbCxcbiAgICAgIHRoaXM6IHRoaXNIZWFkLFxuICAgICAgcGFydHMsXG4gICAgICBkYXRhOiBwYXRoLmRhdGEsXG4gICAgICBsb2M6IHBhdGgubG9jLFxuICAgIH07XG4gIH1cblxuICBIYXNoKGhhc2g6IEhCUy5IYXNoKTogQVNULkhhc2gge1xuICAgIGxldCBwYWlyczogQVNULkhhc2hQYWlyW10gPSBbXTtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaGFzaC5wYWlycy5sZW5ndGg7IGkrKykge1xuICAgICAgbGV0IHBhaXIgPSBoYXNoLnBhaXJzW2ldO1xuICAgICAgcGFpcnMucHVzaChiLnBhaXIocGFpci5rZXksIHRoaXMuYWNjZXB0Tm9kZShwYWlyLnZhbHVlKSwgcGFpci5sb2MpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYi5oYXNoKHBhaXJzLCBoYXNoLmxvYyk7XG4gIH1cblxuICBTdHJpbmdMaXRlcmFsKHN0cmluZzogSEJTLlN0cmluZ0xpdGVyYWwpOiBBU1QuU3RyaW5nTGl0ZXJhbCB7XG4gICAgcmV0dXJuIGIubGl0ZXJhbCgnU3RyaW5nTGl0ZXJhbCcsIHN0cmluZy52YWx1ZSwgc3RyaW5nLmxvYyk7XG4gIH1cblxuICBCb29sZWFuTGl0ZXJhbChib29sZWFuOiBIQlMuQm9vbGVhbkxpdGVyYWwpOiBBU1QuQm9vbGVhbkxpdGVyYWwge1xuICAgIHJldHVybiBiLmxpdGVyYWwoJ0Jvb2xlYW5MaXRlcmFsJywgYm9vbGVhbi52YWx1ZSwgYm9vbGVhbi5sb2MpO1xuICB9XG5cbiAgTnVtYmVyTGl0ZXJhbChudW1iZXI6IEhCUy5OdW1iZXJMaXRlcmFsKTogQVNULk51bWJlckxpdGVyYWwge1xuICAgIHJldHVybiBiLmxpdGVyYWwoJ051bWJlckxpdGVyYWwnLCBudW1iZXIudmFsdWUsIG51bWJlci5sb2MpO1xuICB9XG5cbiAgVW5kZWZpbmVkTGl0ZXJhbCh1bmRlZjogSEJTLlVuZGVmaW5lZExpdGVyYWwpOiBBU1QuVW5kZWZpbmVkTGl0ZXJhbCB7XG4gICAgcmV0dXJuIGIubGl0ZXJhbCgnVW5kZWZpbmVkTGl0ZXJhbCcsIHVuZGVmaW5lZCwgdW5kZWYubG9jKTtcbiAgfVxuXG4gIE51bGxMaXRlcmFsKG51bDogSEJTLk51bGxMaXRlcmFsKTogQVNULk51bGxMaXRlcmFsIHtcbiAgICByZXR1cm4gYi5saXRlcmFsKCdOdWxsTGl0ZXJhbCcsIG51bGwsIG51bC5sb2MpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNhbGN1bGF0ZVJpZ2h0U3RyaXBwZWRPZmZzZXRzKG9yaWdpbmFsOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcpIHtcbiAgaWYgKHZhbHVlID09PSAnJykge1xuICAgIC8vIGlmIGl0IGlzIGVtcHR5LCBqdXN0IHJldHVybiB0aGUgY291bnQgb2YgbmV3bGluZXNcbiAgICAvLyBpbiBvcmlnaW5hbFxuICAgIHJldHVybiB7XG4gICAgICBsaW5lczogb3JpZ2luYWwuc3BsaXQoJ1xcbicpLmxlbmd0aCAtIDEsXG4gICAgICBjb2x1bW5zOiAwLFxuICAgIH07XG4gIH1cblxuICAvLyBvdGhlcndpc2UsIHJldHVybiB0aGUgbnVtYmVyIG9mIG5ld2xpbmVzIHByaW9yIHRvXG4gIC8vIGB2YWx1ZWBcbiAgbGV0IGRpZmZlcmVuY2UgPSBvcmlnaW5hbC5zcGxpdCh2YWx1ZSlbMF07XG4gIGxldCBsaW5lcyA9IGRpZmZlcmVuY2Uuc3BsaXQoL1xcbi8pO1xuICBsZXQgbGluZUNvdW50ID0gbGluZXMubGVuZ3RoIC0gMTtcblxuICByZXR1cm4ge1xuICAgIGxpbmVzOiBsaW5lQ291bnQsXG4gICAgY29sdW1uczogbGluZXNbbGluZUNvdW50XS5sZW5ndGgsXG4gIH07XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVRva2VuaXplckxvY2F0aW9uKHRva2VuaXplcjogUGFyc2VyWyd0b2tlbml6ZXInXSwgY29udGVudDogSEJTLkNvbnRlbnRTdGF0ZW1lbnQpIHtcbiAgbGV0IGxpbmUgPSBjb250ZW50LmxvYy5zdGFydC5saW5lO1xuICBsZXQgY29sdW1uID0gY29udGVudC5sb2Muc3RhcnQuY29sdW1uO1xuXG4gIGxldCBvZmZzZXRzID0gY2FsY3VsYXRlUmlnaHRTdHJpcHBlZE9mZnNldHMoXG4gICAgY29udGVudC5vcmlnaW5hbCBhcyBSZWNhc3Q8SEJTLlN0cmlwRmxhZ3MsIHN0cmluZz4sXG4gICAgY29udGVudC52YWx1ZVxuICApO1xuXG4gIGxpbmUgPSBsaW5lICsgb2Zmc2V0cy5saW5lcztcbiAgaWYgKG9mZnNldHMubGluZXMpIHtcbiAgICBjb2x1bW4gPSBvZmZzZXRzLmNvbHVtbnM7XG4gIH0gZWxzZSB7XG4gICAgY29sdW1uID0gY29sdW1uICsgb2Zmc2V0cy5jb2x1bW5zO1xuICB9XG5cbiAgdG9rZW5pemVyLmxpbmUgPSBsaW5lO1xuICB0b2tlbml6ZXIuY29sdW1uID0gY29sdW1uO1xufVxuXG5mdW5jdGlvbiBhY2NlcHRDYWxsTm9kZXMoXG4gIGNvbXBpbGVyOiBIYW5kbGViYXJzTm9kZVZpc2l0b3JzLFxuICBub2RlOiB7XG4gICAgcGF0aDogSEJTLlBhdGhFeHByZXNzaW9uO1xuICAgIHBhcmFtczogSEJTLkV4cHJlc3Npb25bXTtcbiAgICBoYXNoOiBIQlMuSGFzaDtcbiAgfVxuKTogeyBwYXRoOiBBU1QuUGF0aEV4cHJlc3Npb247IHBhcmFtczogQVNULkV4cHJlc3Npb25bXTsgaGFzaDogQVNULkhhc2ggfSB7XG4gIGxldCBwYXRoID0gY29tcGlsZXIuUGF0aEV4cHJlc3Npb24obm9kZS5wYXRoKTtcblxuICBsZXQgcGFyYW1zID0gbm9kZS5wYXJhbXMgPyBub2RlLnBhcmFtcy5tYXAoKGUpID0+IGNvbXBpbGVyLmFjY2VwdE5vZGU8QVNULkV4cHJlc3Npb24+KGUpKSA6IFtdO1xuICBsZXQgaGFzaCA9IG5vZGUuaGFzaCA/IGNvbXBpbGVyLkhhc2gobm9kZS5oYXNoKSA6IGIuaGFzaCgpO1xuXG4gIHJldHVybiB7IHBhdGgsIHBhcmFtcywgaGFzaCB9O1xufVxuXG5mdW5jdGlvbiBhZGRFbGVtZW50TW9kaWZpZXIoZWxlbWVudDogVGFnPCdTdGFydFRhZyc+LCBtdXN0YWNoZTogQVNULk11c3RhY2hlU3RhdGVtZW50KSB7XG4gIGxldCB7IHBhdGgsIHBhcmFtcywgaGFzaCwgbG9jIH0gPSBtdXN0YWNoZTtcblxuICBpZiAoaXNMaXRlcmFsKHBhdGgpKSB7XG4gICAgbGV0IG1vZGlmaWVyID0gYHt7JHtwcmludExpdGVyYWwocGF0aCl9fX1gO1xuICAgIGxldCB0YWcgPSBgPCR7ZWxlbWVudC5uYW1lfSAuLi4gJHttb2RpZmllcn0gLi4uYDtcblxuICAgIHRocm93IG5ldyBTeW50YXhFcnJvcihcbiAgICAgIGBJbiAke3RhZ30sICR7bW9kaWZpZXJ9IGlzIG5vdCBhIHZhbGlkIG1vZGlmaWVyOiBcIiR7cGF0aC5vcmlnaW5hbH1cIiBvbiBsaW5lICR7XG4gICAgICAgIGxvYyAmJiBsb2Muc3RhcnQubGluZVxuICAgICAgfS5gLFxuICAgICAgbXVzdGFjaGUubG9jXG4gICAgKTtcbiAgfVxuXG4gIGxldCBtb2RpZmllciA9IGIuZWxlbWVudE1vZGlmaWVyKHBhdGgsIHBhcmFtcywgaGFzaCwgbG9jKTtcbiAgZWxlbWVudC5tb2RpZmllcnMucHVzaChtb2RpZmllcik7XG59XG5cbmZ1bmN0aW9uIGFwcGVuZER5bmFtaWNBdHRyaWJ1dGVWYWx1ZVBhcnQoYXR0cmlidXRlOiBBdHRyaWJ1dGUsIHBhcnQ6IEFTVC5NdXN0YWNoZVN0YXRlbWVudCkge1xuICBhdHRyaWJ1dGUuaXNEeW5hbWljID0gdHJ1ZTtcbiAgYXR0cmlidXRlLnBhcnRzLnB1c2gocGFydCk7XG59XG4iXSwic291cmNlUm9vdCI6IiJ9