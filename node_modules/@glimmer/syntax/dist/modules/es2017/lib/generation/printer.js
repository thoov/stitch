import { voidMap } from '../parser/tokenizer-event-handlers';
import { escapeText, escapeAttrValue, sortByLoc } from './util';
const NON_WHITESPACE = /\S/;
export default class Printer {
  constructor(options) {
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


  handledByOverride(node, ensureLeadingWhitespace = false) {
    if (this.options.override !== undefined) {
      let result = this.options.override(node, this.options);

      if (typeof result === 'string') {
        if (ensureLeadingWhitespace && result !== '' && NON_WHITESPACE.test(result[0])) {
          result = ` ${result}`;
        }

        this.buffer += result;
        return true;
      }
    }

    return false;
  }

  Node(node) {
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
  }

  Expression(expression) {
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
  }

  Literal(literal) {
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
  }

  TopLevelStatement(statement) {
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
  }

  Block(block) {
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
      let firstChild = block.body[0];
      firstChild.chained = true;
    }

    if (this.handledByOverride(block)) {
      return;
    }

    this.TopLevelStatements(block.body);
  }

  TopLevelStatements(statements) {
    statements.forEach(statement => this.TopLevelStatement(statement));
  }

  ElementNode(el) {
    if (this.handledByOverride(el)) {
      return;
    }

    this.OpenElementNode(el);
    this.TopLevelStatements(el.children);
    this.CloseElementNode(el);
  }

  OpenElementNode(el) {
    this.buffer += `<${el.tag}`;
    const parts = [...el.attributes, ...el.modifiers, ...el.comments].sort(sortByLoc);

    for (const part of parts) {
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
  }

  CloseElementNode(el) {
    if (el.selfClosing || voidMap[el.tag.toLowerCase()]) {
      return;
    }

    this.buffer += `</${el.tag}>`;
  }

  AttrNode(attr) {
    if (this.handledByOverride(attr)) {
      return;
    }

    let {
      name,
      value
    } = attr;
    this.buffer += name;

    if (value.type !== 'TextNode' || value.chars.length > 0) {
      this.buffer += '=';
      this.AttrNodeValue(value);
    }
  }

  AttrNodeValue(value) {
    if (value.type === 'TextNode') {
      this.buffer += '"';
      this.TextNode(value, true);
      this.buffer += '"';
    } else {
      this.Node(value);
    }
  }

  TextNode(text, isAttr) {
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
  }

  MustacheStatement(mustache) {
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
  }

  BlockStatement(block) {
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
  }

  BlockParams(blockParams) {
    this.buffer += ` as |${blockParams.join(' ')}|`;
  }

  PartialStatement(partial) {
    if (this.handledByOverride(partial)) {
      return;
    }

    this.buffer += '{{>';
    this.Expression(partial.name);
    this.Params(partial.params);
    this.Hash(partial.hash);
    this.buffer += '}}';
  }

  ConcatStatement(concat) {
    if (this.handledByOverride(concat)) {
      return;
    }

    this.buffer += '"';
    concat.parts.forEach(part => {
      if (part.type === 'TextNode') {
        this.TextNode(part, true);
      } else {
        this.Node(part);
      }
    });
    this.buffer += '"';
  }

  MustacheCommentStatement(comment) {
    if (this.handledByOverride(comment)) {
      return;
    }

    this.buffer += `{{!--${comment.value}--}}`;
  }

  ElementModifierStatement(mod) {
    if (this.handledByOverride(mod)) {
      return;
    }

    this.buffer += '{{';
    this.Expression(mod.path);
    this.Params(mod.params);
    this.Hash(mod.hash);
    this.buffer += '}}';
  }

  CommentStatement(comment) {
    if (this.handledByOverride(comment)) {
      return;
    }

    this.buffer += `<!--${comment.value}-->`;
  }

  PathExpression(path) {
    if (this.handledByOverride(path)) {
      return;
    }

    this.buffer += path.original;
  }

  SubExpression(sexp) {
    if (this.handledByOverride(sexp)) {
      return;
    }

    this.buffer += '(';
    this.Expression(sexp.path);
    this.Params(sexp.params);
    this.Hash(sexp.hash);
    this.buffer += ')';
  }

  Params(params) {
    // TODO: implement a top level Params AST node (just like the Hash object)
    // so that this can also be overridden
    if (params.length) {
      params.forEach(param => {
        this.buffer += ' ';
        this.Expression(param);
      });
    }
  }

  Hash(hash) {
    if (this.handledByOverride(hash, true)) {
      return;
    }

    hash.pairs.forEach(pair => {
      this.buffer += ' ';
      this.HashPair(pair);
    });
  }

  HashPair(pair) {
    if (this.handledByOverride(pair)) {
      return;
    }

    this.buffer += pair.key;
    this.buffer += '=';
    this.Node(pair.value);
  }

  StringLiteral(str) {
    if (this.handledByOverride(str)) {
      return;
    }

    this.buffer += JSON.stringify(str.value);
  }

  BooleanLiteral(bool) {
    if (this.handledByOverride(bool)) {
      return;
    }

    this.buffer += bool.value;
  }

  NumberLiteral(number) {
    if (this.handledByOverride(number)) {
      return;
    }

    this.buffer += number.value;
  }

  UndefinedLiteral(node) {
    if (this.handledByOverride(node)) {
      return;
    }

    this.buffer += 'undefined';
  }

  NullLiteral(node) {
    if (this.handledByOverride(node)) {
      return;
    }

    this.buffer += 'null';
  }

  print(node) {
    let {
      options
    } = this;

    if (options.override) {
      let result = options.override(node, options);

      if (result !== undefined) {
        return result;
      }
    }

    this.buffer = '';
    this.Node(node);
    return this.buffer;
  }

}

function unreachable(node, parentNodeType) {
  let {
    loc,
    type
  } = node;
  throw new Error(`Non-exhaustive node narrowing ${type} @ location: ${JSON.stringify(loc)} for parent ${parentNodeType}`);
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL0BnbGltbWVyL3N5bnRheC9saWIvZ2VuZXJhdGlvbi9wcmludGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQTRCQSxTQUFTLE9BQVQsUUFBd0Isb0NBQXhCO0FBQ0EsU0FBUyxVQUFULEVBQXFCLGVBQXJCLEVBQXNDLFNBQXRDLFFBQXVELFFBQXZEO0FBRUEsTUFBTSxjQUFjLEdBQUcsSUFBdkI7QUFzQkEsZUFBYyxNQUFPLE9BQVAsQ0FBYztBQUkxQixFQUFBLFdBQUEsQ0FBWSxPQUFaLEVBQW1DO0FBSDNCLFNBQUEsTUFBQSxHQUFTLEVBQVQ7QUFJTixTQUFLLE9BQUwsR0FBZSxPQUFmO0FBQ0Q7QUFFRDs7Ozs7Ozs7OztBQVNBLEVBQUEsaUJBQWlCLENBQUMsSUFBRCxFQUFhLHVCQUF1QixHQUFHLEtBQXZDLEVBQTRDO0FBQzNELFFBQUksS0FBSyxPQUFMLENBQWEsUUFBYixLQUEwQixTQUE5QixFQUF5QztBQUN2QyxVQUFJLE1BQU0sR0FBRyxLQUFLLE9BQUwsQ0FBYSxRQUFiLENBQXNCLElBQXRCLEVBQTRCLEtBQUssT0FBakMsQ0FBYjs7QUFDQSxVQUFJLE9BQU8sTUFBUCxLQUFrQixRQUF0QixFQUFnQztBQUM5QixZQUFJLHVCQUF1QixJQUFJLE1BQU0sS0FBSyxFQUF0QyxJQUE0QyxjQUFjLENBQUMsSUFBZixDQUFvQixNQUFNLENBQUMsQ0FBRCxDQUExQixDQUFoRCxFQUFnRjtBQUM5RSxVQUFBLE1BQU0sR0FBRyxJQUFJLE1BQU0sRUFBbkI7QUFDRDs7QUFFRCxhQUFLLE1BQUwsSUFBZSxNQUFmO0FBQ0EsZUFBTyxJQUFQO0FBQ0Q7QUFDRjs7QUFFRCxXQUFPLEtBQVA7QUFDRDs7QUFFRCxFQUFBLElBQUksQ0FBQyxJQUFELEVBQVc7QUFDYixZQUFRLElBQUksQ0FBQyxJQUFiO0FBQ0UsV0FBSyxtQkFBTDtBQUNBLFdBQUssZ0JBQUw7QUFDQSxXQUFLLGtCQUFMO0FBQ0EsV0FBSywwQkFB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Q3hCLGVBQU8sTUFBUDtBQUNEO0FBQ0Y7O0FBRUQsU0FBSyxNQUFMLEdBQWMsRUFBZDtBQUNBLFNBQUssSUFBTCxDQUFVLElBQVY7QUFDQSxXQUFPLEtBQUssTUFBWjtBQUNEOztBQTdleUI7O0FBZ2Y1QixTQUFTLFdBQVQsQ0FBcUIsSUFBckIsRUFBa0MsY0FBbEMsRUFBd0Q7QUFDdEQsTUFBSTtBQUFFLElBQUEsR0FBRjtBQUFPLElBQUE7QUFBUCxNQUFpQixJQUFyQjtBQUNBLFFBQU0sSUFBSSxLQUFKLENBQ0osaUNBQWlDLElBQUksZ0JBQWdCLElBQUksQ0FBQyxTQUFMLENBQ25ELEdBRG1ELENBRXBELGVBQWUsY0FBYyxFQUgxQixDQUFOO0FBS0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBBdHRyTm9kZSxcbiAgQmxvY2ssXG4gIEJsb2NrU3RhdGVtZW50LFxuICBFbGVtZW50Tm9kZSxcbiAgTXVzdGFjaGVTdGF0ZW1lbnQsXG4gIE5vZGUsXG4gIFByb2dyYW0sXG4gIFRleHROb2RlLFxuICBQYXJ0aWFsU3RhdGVtZW50LFxuICBDb25jYXRTdGF0ZW1lbnQsXG4gIE11c3RhY2hlQ29tbWVudFN0YXRlbWVudCxcbiAgQ29tbWVudFN0YXRlbWVudCxcbiAgRWxlbWVudE1vZGlmaWVyU3RhdGVtZW50LFxuICBFeHByZXNzaW9uLFxuICBQYXRoRXhwcmVzc2lvbixcbiAgU3ViRXhwcmVzc2lvbixcbiAgSGFzaCxcbiAgSGFzaFBhaXIsXG4gIExpdGVyYWwsXG4gIFN0cmluZ0xpdGVyYWwsXG4gIEJvb2xlYW5MaXRlcmFsLFxuICBOdW1iZXJMaXRlcmFsLFxuICBVbmRlZmluZWRMaXRlcmFsLFxuICBOdWxsTGl0ZXJhbCxcbiAgVG9wTGV2ZWxTdGF0ZW1lbnQsXG4gIFRlbXBsYXRlLFxufSBmcm9tICcuLi90eXBlcy9ub2Rlcyc7XG5pbXBvcnQgeyB2b2lkTWFwIH0gZnJvbSAnLi4vcGFyc2VyL3Rva2VuaXplci1ldmVudC1oYW5kbGVycyc7XG5pbXBvcnQgeyBlc2NhcGVUZXh0LCBlc2NhcGVBdHRyVmFsdWUsIHNvcnRCeUxvYyB9IGZyb20gJy4vdXRpbCc7XG5cbmNvbnN0IE5PTl9XSElURVNQQUNFID0gL1xcUy87XG5cbmV4cG9ydCBpbnRlcmZhY2UgUHJpbnRlck9wdGlvbnMge1xuICBlbnRpdHlFbmNvZGluZzogJ3RyYW5zZm9ybWVkJyB8ICdyYXcnO1xuXG4gIC8qKlxuICAgKiBVc2VkIHRvIG92ZXJyaWRlIHRoZSBtZWNoYW5pc20gb2YgcHJpbnRpbmcgYSBnaXZlbiBBU1QuTm9kZS5cbiAgICpcbiAgICogVGhpcyB3aWxsIGdlbmVyYWxseSBvbmx5IGJlIHVzZWZ1bCB0byBzb3VyY2UgLT4gc291cmNlIGNvZGVtb2RzXG4gICAqIHdoZXJlIHlvdSB3b3VsZCBsaWtlIHRvIHNwZWNpYWxpemUvb3ZlcnJpZGUgdGhlIHdheSBhIGdpdmVuIG5vZGUgaXNcbiAgICogcHJpbnRlZCAoZS5nLiB5b3Ugd291bGQgbGlrZSB0byBwcmVzZXJ2ZSBhcyBtdWNoIG9mIHRoZSBvcmlnaW5hbFxuICAgKiBmb3JtYXR0aW5nIGFzIHBvc3NpYmxlKS5cbiAgICpcbiAgICogV2hlbiB0aGUgcHJvdmlkZWQgb3ZlcnJpZGUgcmV0dXJucyB1bmRlZmluZWQsIHRoZSBkZWZhdWx0IGJ1aWx0IGluIHByaW50aW5nXG4gICAqIHdpbGwgYmUgZG9uZSBmb3IgdGhlIEFTVC5Ob2RlLlxuICAgKlxuICAgKiBAcGFyYW0gYXN0IHRoZSBhc3Qgbm9kZSB0byBiZSBwcmludGVkXG4gICAqIEBwYXJhbSBvcHRpb25zIHRoZSBvcHRpb25zIHNwZWNpZmllZCBkdXJpbmcgdGhlIHByaW50KCkgaW52b2NhdGlvblxuICAgKi9cbiAgb3ZlcnJpZGU/KGFzdDogTm9kZSwgb3B0aW9uczogUHJpbnRlck9wdGlvbnMpOiB2b2lkIHwgc3RyaW5nO1xufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQcmludGVyIHtcbiAgcHJpdmF0ZSBidWZmZXIgPSAnJztcbiAgcHJpdmF0ZSBvcHRpb25zOiBQcmludGVyT3B0aW9ucztcblxuICBjb25zdHJ1Y3RvcihvcHRpb25zOiBQcmludGVyT3B0aW9ucykge1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gIH1cblxuICAvKlxuICAgIFRoaXMgaXMgdXNlZCBieSBfYWxsXyBtZXRob2RzIG9uIHRoaXMgUHJpbnRlciBjbGFzcyB0aGF0IGFkZCB0byBgdGhpcy5idWZmZXJgLFxuICAgIGl0IGFsbG93cyBjb25zdW1lcnMgb2YgdGhlIHByaW50ZXIgdG8gdXNlIGFsdGVybmF0ZSBzdHJpbmcgcmVwcmVzZW50YXRpb25zIGZvclxuICAgIGEgZ2l2ZW4gbm9kZS5cblxuICAgIFRoZSBwcmltYXJ5IHVzZSBjYXNlIGZvciB0aGlzIGFyZSB0aGluZ3MgbGlrZSBzb3VyY2UgLT4gc291cmNlIGNvZGVtb2QgdXRpbGl0aWVzLlxuICAgIEZvciBleGFtcGxlLCBlbWJlci10ZW1wbGF0ZS1yZWNhc3QgYXR0ZW1wdHMgdG8gYWx3YXlzIHByZXNlcnZlIHRoZSBvcmlnaW5hbCBzdHJpbmdcbiAgICBmb3JtYXR0aW5nIGluIGVhY2ggQVNUIG5vZGUgaWYgbm8gbW9kaWZpY2F0aW9ucyBhcmUgbWFkZSB0byBpdC5cbiAgKi9cbiAgaGFuZGxlZEJ5T3ZlcnJpZGUobm9kZTogTm9kZSwgZW5zdXJlTGVhZGluZ1doaXRlc3BhY2UgPSBmYWxzZSk6IGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLm9wdGlvbnMub3ZlcnJpZGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgbGV0IHJlc3VsdCA9IHRoaXMub3B0aW9ucy5vdmVycmlkZShub2RlLCB0aGlzLm9wdGlvbnMpO1xuICAgICAgaWYgKHR5cGVvZiByZXN1bHQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGlmIChlbnN1cmVMZWFkaW5nV2hpdGVzcGFjZSAmJiByZXN1bHQgIT09ICcnICYmIE5PTl9XSElURVNQQUNFLnRlc3QocmVzdWx0WzBdKSkge1xuICAgICAgICAgIHJlc3VsdCA9IGAgJHtyZXN1bHR9YDtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuYnVmZmVyICs9IHJlc3VsdDtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgTm9kZShub2RlOiBOb2RlKTogdm9pZCB7XG4gICAgc3dpdGNoIChub2RlLnR5cGUpIHtcbiAgICAgIGNhc2UgJ011c3RhY2hlU3RhdGVtZW50JzpcbiAgICAgIGNhc2UgJ0Jsb2NrU3RhdGVtZW50JzpcbiAgICAgIGNhc2UgJ1BhcnRpYWxTdGF0ZW1lbnQnOlxuICAgICAgY2FzZSAnTXVzdGFjaGVDb21tZW50U3RhdGVtZW50JzpcbiAgICAgIGNhc2UgJ0NvbW1lbnRTdGF0ZW1lbnQnOlxuICAgICAgY2FzZSAnVGV4dE5vZGUnOlxuICAgICAgY2FzZSAnRWxlbWVudE5vZGUnOlxuICAgICAgY2FzZSAnQXR0ck5vZGUnOlxuICAgICAgY2FzZSAnQmxvY2snOlxuICAgICAgY2FzZSAnVGVtcGxhdGUnOlxuICAgICAgICByZXR1cm4gdGhpcy5Ub3BMZXZlbFN0YXRlbWVudChub2RlKTtcbiAgICAgIGNhc2UgJ1N0cmluZ0xpdGVyYWwnOlxuICAgICAgY2FzZSAnQm9vbGVhbkxpdGVyYWwnOlxuICAgICAgY2FzZSAnTnVtYmVyTGl0ZXJhbCc6XG4gICAgICBjYXNlICdVbmRlZmluZWRMaXRlcmFsJzpcbiAgICAgIGNhc2UgJ051bGxMaXRlcmFsJzpcbiAgICAgIGNhc2UgJ1BhdGhFeHByZXNzaW9uJzpcbiAgICAgIGNhc2UgJ1N1YkV4cHJlc3Npb24nOlxuICAgICAgICByZXR1cm4gdGhpcy5FeHByZXNzaW9uKG5vZGUpO1xuICAgICAgY2FzZSAnUHJvZ3JhbSc6XG4gICAgICAgIHJldHVybiB0aGlzLkJsb2NrKG5vZGUpO1xuICAgICAgY2FzZSAnQ29uY2F0U3RhdGVtZW50JzpcbiAgICAgICAgLy8gc2hvdWxkIGhhdmUgYW4gQXR0ck5vZGUgcGFyZW50XG4gICAgICAgIHJldHVybiB0aGlzLkNvbmNhdFN0YXRlbWVudChub2RlKTtcbiAgICAgIGNhc2UgJ0hhc2gnOlxuICAgICAgICByZXR1cm4gdGhpcy5IYXNoKG5vZGUpO1xuICAgICAgY2FzZSAnSGFzaFBhaXInOlxuICAgICAgICByZXR1cm4gdGhpcy5IYXNoUGFpcihub2RlKTtcbiAgICAgIGNhc2UgJ0VsZW1lbnRNb2RpZmllclN0YXRlbWVudCc6XG4gICAgICAgIHJldHVybiB0aGlzLkVsZW1lbnRNb2RpZmllclN0YXRlbWVudChub2RlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdW5yZWFjaGFibGUobm9kZSwgJ05vZGUnKTtcbiAgfVxuXG4gIEV4cHJlc3Npb24oZXhwcmVzc2lvbjogRXhwcmVzc2lvbik6IHZvaWQge1xuICAgIHN3aXRjaCAoZXhwcmVzc2lvbi50eXBlKSB7XG4gICAgICBjYXNlICdTdHJpbmdMaXRlcmFsJzpcbiAgICAgIGNhc2UgJ0Jvb2xlYW5MaXRlcmFsJzpcbiAgICAgIGNhc2UgJ051bWJlckxpdGVyYWwnOlxuICAgICAgY2FzZSAnVW5kZWZpbmVkTGl0ZXJhbCc6XG4gICAgICBjYXNlICdOdWxsTGl0ZXJhbCc6XG4gICAgICAgIHJldHVybiB0aGlzLkxpdGVyYWwoZXhwcmVzc2lvbik7XG4gICAgICBjYXNlICdQYXRoRXhwcmVzc2lvbic6XG4gICAgICAgIHJldHVybiB0aGlzLlBhdGhFeHByZXNzaW9uKGV4cHJlc3Npb24pO1xuICAgICAgY2FzZSAnU3ViRXhwcmVzc2lvbic6XG4gICAgICAgIHJldHVybiB0aGlzLlN1YkV4cHJlc3Npb24oZXhwcmVzc2lvbik7XG4gICAgfVxuICAgIHJldHVybiB1bnJlYWNoYWJsZShleHByZXNzaW9uLCAnRXhwcmVzc2lvbicpO1xuICB9XG5cbiAgTGl0ZXJhbChsaXRlcmFsOiBMaXRlcmFsKSB7XG4gICAgc3dpdGNoIChsaXRlcmFsLnR5cGUpIHtcbiAgICAgIGNhc2UgJ1N0cmluZ0xpdGVyYWwnOlxuICAgICAgICByZXR1cm4gdGhpcy5TdHJpbmdMaXRlcmFsKGxpdGVyYWwpO1xuICAgICAgY2FzZSAnQm9vbGVhbkxpdGVyYWwnOlxuICAgICAgICByZXR1cm4gdGhpcy5Cb29sZWFuTGl0ZXJhbChsaXRlcmFsKTtcbiAgICAgIGNhc2UgJ051bWJlckxpdGVyYWwnOlxuICAgICAgICByZXR1cm4gdGhpcy5OdW1iZXJMaXRlcmFsKGxpdGVyYWwpO1xuICAgICAgY2FzZSAnVW5kZWZpbmVkTGl0ZXJhbCc6XG4gICAgICAgIHJldHVybiB0aGlzLlVuZGVmaW5lZExpdGVyYWwobGl0ZXJhbCk7XG4gICAgICBjYXNlICdOdWxsTGl0ZXJhbCc6XG4gICAgICAgIHJldHVybiB0aGlzLk51bGxMaXRlcmFsKGxpdGVyYWwpO1xuICAgIH1cbiAgICByZXR1cm4gdW5yZWFjaGFibGUobGl0ZXJhbCwgJ0xpdGVyYWwnKTtcbiAgfVxuXG4gIFRvcExldmVsU3RhdGVtZW50KHN0YXRlbWVudDogVG9wTGV2ZWxTdGF0ZW1lbnQpIHtcbiAgICBzd2l0Y2ggKHN0YXRlbWVudC50eXBlKSB7XG4gICAgICBjYXNlICdNdXN0YWNoZVN0YXRlbWVudCc6XG4gICAgICAgIHJldHVybiB0aGlzLk11c3RhY2hlU3RhdGVtZW50KHN0YXRlbWVudCk7XG4gICAgICBjYXNlICdCbG9ja1N0YXRlbWVudCc6XG4gICAgICAgIHJldHVybiB0aGlzLkJsb2NrU3RhdGVtZW50KHN0YXRlbWVudCk7XG4gICAgICBjYXNlICdQYXJ0aWFsU3RhdGVtZW50JzpcbiAgICAgICAgcmV0dXJuIHRoaXMuUGFydGlhbFN0YXRlbWVudChzdGF0ZW1lbnQpO1xuICAgICAgY2FzZSAnTXVzdGFjaGVDb21tZW50U3RhdGVtZW50JzpcbiAgICAgICAgcmV0dXJuIHRoaXMuTXVzdGFjaGVDb21tZW50U3RhdGVtZW50KHN0YXRlbWVudCk7XG4gICAgICBjYXNlICdDb21tZW50U3RhdGVtZW50JzpcbiAgICAgICAgcmV0dXJuIHRoaXMuQ29tbWVudFN0YXRlbWVudChzdGF0ZW1lbnQpO1xuICAgICAgY2FzZSAnVGV4dE5vZGUnOlxuICAgICAgICByZXR1cm4gdGhpcy5UZXh0Tm9kZShzdGF0ZW1lbnQpO1xuICAgICAgY2FzZSAnRWxlbWVudE5vZGUnOlxuICAgICAgICByZXR1cm4gdGhpcy5FbGVtZW50Tm9kZShzdGF0ZW1lbnQpO1xuICAgICAgY2FzZSAnQmxvY2snOlxuICAgICAgY2FzZSAnVGVtcGxhdGUnOlxuICAgICAgICByZXR1cm4gdGhpcy5CbG9jayhzdGF0ZW1lbnQpO1xuICAgICAgY2FzZSAnQXR0ck5vZGUnOlxuICAgICAgICAvLyBzaG91bGQgaGF2ZSBlbGVtZW50XG4gICAgICAgIHJldHVybiB0aGlzLkF0dHJOb2RlKHN0YXRlbWVudCk7XG4gICAgfVxuICAgIHVucmVhY2hhYmxlKHN0YXRlbWVudCwgJ1RvcExldmVsU3RhdGVtZW50Jyk7XG4gIH1cblxuICBCbG9jayhibG9jazogQmxvY2sgfCBQcm9ncmFtIHwgVGVtcGxhdGUpOiB2b2lkIHtcbiAgICAvKlxuICAgICAgV2hlbiBwcm9jZXNzaW5nIGEgdGVtcGxhdGUgbGlrZTpcblxuICAgICAgYGBgaGJzXG4gICAgICB7eyNpZiB3aGF0ZXZlcn19XG4gICAgICAgIHdoYXRldmVyXG4gICAgICB7e2Vsc2UgaWYgc29tZXRoaW5nRWxzZX19XG4gICAgICAgIHNvbWV0aGluZyBlbHNlXG4gICAgICB7e2Vsc2V9fVxuICAgICAgICBmYWxsYmFja1xuICAgICAge3svaWZ9fVxuICAgICAgYGBgXG5cbiAgICAgIFRoZSBBU1Qgc3RpbGwgX2VmZmVjdGl2ZWx5XyBsb29rcyBsaWtlOlxuXG4gICAgICBgYGBoYnNcbiAgICAgIHt7I2lmIHdoYXRldmVyfX1cbiAgICAgICAgd2hhdGV2ZXJcbiAgICAgIHt7ZWxzZX19e3sjaWYgc29tZXRoaW5nRWxzZX19XG4gICAgICAgIHNvbWV0aGluZyBlbHNlXG4gICAgICB7e2Vsc2V9fVxuICAgICAgICBmYWxsYmFja1xuICAgICAge3svaWZ9fXt7L2lmfX1cbiAgICAgIGBgYFxuXG4gICAgICBUaGUgb25seSB3YXkgd2UgY2FuIHRlbGwgaWYgdGhhdCBpcyB0aGUgY2FzZSBpcyBieSBjaGVja2luZyBmb3JcbiAgICAgIGBibG9jay5jaGFpbmVkYCwgYnV0IHVuZm9ydHVuYXRlbHkgd2hlbiB0aGUgYWN0dWFsIHN0YXRlbWVudHMgYXJlXG4gICAgICBwcm9jZXNzZWQgdGhlIGBibG9jay5ib2R5WzBdYCBub2RlICh3aGljaCB3aWxsIGFsd2F5cyBiZSBhXG4gICAgICBgQmxvY2tTdGF0ZW1lbnRgKSBoYXMgbm8gY2x1ZSB0aGF0IGl0cyBhbnNjZXN0b3IgYEJsb2NrYCBub2RlIHdhc1xuICAgICAgY2hhaW5lZC5cblxuICAgICAgVGhpcyBcImZvcndhcmRzXCIgdGhlIGBjaGFpbmVkYCBzZXR0aW5nIHNvIHRoYXQgd2UgY2FuIGNoZWNrXG4gICAgICBpdCBsYXRlciB3aGVuIHByb2Nlc3NpbmcgdGhlIGBCbG9ja1N0YXRlbWVudGAuXG4gICAgKi9cbiAgICBpZiAoYmxvY2suY2hhaW5lZCkge1xuICAgICAgbGV0IGZpcnN0Q2hpbGQgPSBibG9jay5ib2R5WzBdIGFzIEJsb2NrU3RhdGVtZW50O1xuICAgICAgZmlyc3RDaGlsZC5jaGFpbmVkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5oYW5kbGVkQnlPdmVycmlkZShibG9jaykpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLlRvcExldmVsU3RhdGVtZW50cyhibG9jay5ib2R5KTtcbiAgfVxuXG4gIFRvcExldmVsU3RhdGVtZW50cyhzdGF0ZW1lbnRzOiBUb3BMZXZlbFN0YXRlbWVudFtdKSB7XG4gICAgc3RhdGVtZW50cy5mb3JFYWNoKChzdGF0ZW1lbnQpID0+IHRoaXMuVG9wTGV2ZWxTdGF0ZW1lbnQoc3RhdGVtZW50KSk7XG4gIH1cblxuICBFbGVtZW50Tm9kZShlbDogRWxlbWVudE5vZGUpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5oYW5kbGVkQnlPdmVycmlkZShlbCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLk9wZW5FbGVtZW50Tm9kZShlbCk7XG4gICAgdGhpcy5Ub3BMZXZlbFN0YXRlbWVudHMoZWwuY2hpbGRyZW4pO1xuICAgIHRoaXMuQ2xvc2VFbGVtZW50Tm9kZShlbCk7XG4gIH1cblxuICBPcGVuRWxlbWVudE5vZGUoZWw6IEVsZW1lbnROb2RlKTogdm9pZCB7XG4gICAgdGhpcy5idWZmZXIgKz0gYDwke2VsLnRhZ31gO1xuICAgIGNvbnN0IHBhcnRzID0gWy4uLmVsLmF0dHJpYnV0ZXMsIC4uLmVsLm1vZGlmaWVycywgLi4uZWwuY29tbWVudHNdLnNvcnQoc29ydEJ5TG9jKTtcblxuICAgIGZvciAoY29uc3QgcGFydCBvZiBwYXJ0cykge1xuICAgICAgdGhpcy5idWZmZXIgKz0gJyAnO1xuICAgICAgc3dpdGNoIChwYXJ0LnR5cGUpIHtcbiAgICAgICAgY2FzZSAnQXR0ck5vZGUnOlxuICAgICAgICAgIHRoaXMuQXR0ck5vZGUocGFydCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ0VsZW1lbnRNb2RpZmllclN0YXRlbWVudCc6XG4gICAgICAgICAgdGhpcy5FbGVtZW50TW9kaWZpZXJTdGF0ZW1lbnQocGFydCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ011c3RhY2hlQ29tbWVudFN0YXRlbWVudCc6XG4gICAgICAgICAgdGhpcy5NdXN0YWNoZUNvbW1lbnRTdGF0ZW1lbnQocGFydCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChlbC5ibG9ja1BhcmFtcy5sZW5ndGgpIHtcbiAgICAgIHRoaXMuQmxvY2tQYXJhbXMoZWwuYmxvY2tQYXJhbXMpO1xuICAgIH1cbiAgICBpZiAoZWwuc2VsZkNsb3NpbmcpIHtcbiAgICAgIHRoaXMuYnVmZmVyICs9ICcgLyc7XG4gICAgfVxuICAgIHRoaXMuYnVmZmVyICs9ICc+JztcbiAgfVxuXG4gIENsb3NlRWxlbWVudE5vZGUoZWw6IEVsZW1lbnROb2RlKTogdm9pZCB7XG4gICAgaWYgKGVsLnNlbGZDbG9zaW5nIHx8IHZvaWRNYXBbZWwudGFnLnRvTG93ZXJDYXNlKCldKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuYnVmZmVyICs9IGA8LyR7ZWwudGFnfT5gO1xuICB9XG5cbiAgQXR0ck5vZGUoYXR0cjogQXR0ck5vZGUpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5oYW5kbGVkQnlPdmVycmlkZShhdHRyKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxldCB7IG5hbWUsIHZhbHVlIH0gPSBhdHRyO1xuXG4gICAgdGhpcy5idWZmZXIgKz0gbmFtZTtcbiAgICBpZiAodmFsdWUudHlwZSAhPT0gJ1RleHROb2RlJyB8fCB2YWx1ZS5jaGFycy5sZW5ndGggPiAwKSB7XG4gICAgICB0aGlzLmJ1ZmZlciArPSAnPSc7XG4gICAgICB0aGlzLkF0dHJOb2RlVmFsdWUodmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIEF0dHJOb2RlVmFsdWUodmFsdWU6IEF0dHJOb2RlWyd2YWx1ZSddKSB7XG4gICAgaWYgKHZhbHVlLnR5cGUgPT09ICdUZXh0Tm9kZScpIHtcbiAgICAgIHRoaXMuYnVmZmVyICs9ICdcIic7XG4gICAgICB0aGlzLlRleHROb2RlKHZhbHVlLCB0cnVlKTtcbiAgICAgIHRoaXMuYnVmZmVyICs9ICdcIic7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuTm9kZSh2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgVGV4dE5vZGUodGV4dDogVGV4dE5vZGUsIGlzQXR0cj86IGJvb2xlYW4pOiB2b2lkIHtcbiAgICBpZiAodGhpcy5oYW5kbGVkQnlPdmVycmlkZSh0ZXh0KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuZW50aXR5RW5jb2RpbmcgPT09ICdyYXcnKSB7XG4gICAgICB0aGlzLmJ1ZmZlciArPSB0ZXh0LmNoYXJzO1xuICAgIH0gZWxzZSBpZiAoaXNBdHRyKSB7XG4gICAgICB0aGlzLmJ1ZmZlciArPSBlc2NhcGVBdHRyVmFsdWUodGV4dC5jaGFycyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuYnVmZmVyICs9IGVzY2FwZVRleHQodGV4dC5jaGFycyk7XG4gICAgfVxuICB9XG5cbiAgTXVzdGFjaGVTdGF0ZW1lbnQobXVzdGFjaGU6IE11c3RhY2hlU3RhdGVtZW50KTogdm9pZCB7XG4gICAgaWYgKHRoaXMuaGFuZGxlZEJ5T3ZlcnJpZGUobXVzdGFjaGUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5idWZmZXIgKz0gbXVzdGFjaGUuZXNjYXBlZCA/ICd7eycgOiAne3t7JztcblxuICAgIGlmIChtdXN0YWNoZS5zdHJpcC5vcGVuKSB7XG4gICAgICB0aGlzLmJ1ZmZlciArPSAnfic7XG4gICAgfVxuXG4gICAgdGhpcy5FeHByZXNzaW9uKG11c3RhY2hlLnBhdGgpO1xuICAgIHRoaXMuUGFyYW1zKG11c3RhY2hlLnBhcmFtcyk7XG4gICAgdGhpcy5IYXNoKG11c3RhY2hlLmhhc2gpO1xuXG4gICAgaWYgKG11c3RhY2hlLnN0cmlwLmNsb3NlKSB7XG4gICAgICB0aGlzLmJ1ZmZlciArPSAnfic7XG4gICAgfVxuXG4gICAgdGhpcy5idWZmZXIgKz0gbXVzdGFjaGUuZXNjYXBlZCA/ICd9fScgOiAnfX19JztcbiAgfVxuXG4gIEJsb2NrU3RhdGVtZW50KGJsb2NrOiBCbG9ja1N0YXRlbWVudCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmhhbmRsZWRCeU92ZXJyaWRlKGJsb2NrKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChibG9jay5jaGFpbmVkKSB7XG4gICAgICB0aGlzLmJ1ZmZlciArPSBibG9jay5pbnZlcnNlU3RyaXAub3BlbiA/ICd7e34nIDogJ3t7JztcbiAgICAgIHRoaXMuYnVmZmVyICs9ICdlbHNlICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuYnVmZmVyICs9IGJsb2NrLm9wZW5TdHJpcC5vcGVuID8gJ3t7fiMnIDogJ3t7Iyc7XG4gICAgfVxuXG4gICAgdGhpcy5FeHByZXNzaW9uKGJsb2NrLnBhdGgpO1xuICAgIHRoaXMuUGFyYW1zKGJsb2NrLnBhcmFtcyk7XG4gICAgdGhpcy5IYXNoKGJsb2NrLmhhc2gpO1xuICAgIGlmIChibG9jay5wcm9ncmFtLmJsb2NrUGFyYW1zLmxlbmd0aCkge1xuICAgICAgdGhpcy5CbG9ja1BhcmFtcyhibG9jay5wcm9ncmFtLmJsb2NrUGFyYW1zKTtcbiAgICB9XG5cbiAgICBpZiAoYmxvY2suY2hhaW5lZCkge1xuICAgICAgdGhpcy5idWZmZXIgKz0gYmxvY2suaW52ZXJzZVN0cmlwLmNsb3NlID8gJ359fScgOiAnfX0nO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmJ1ZmZlciArPSBibG9jay5vcGVuU3RyaXAuY2xvc2UgPyAnfn19JyA6ICd9fSc7XG4gICAgfVxuXG4gICAgdGhpcy5CbG9jayhibG9jay5wcm9ncmFtKTtcblxuICAgIGlmIChibG9jay5pbnZlcnNlKSB7XG4gICAgICBpZiAoIWJsb2NrLmludmVyc2UuY2hhaW5lZCkge1xuICAgICAgICB0aGlzLmJ1ZmZlciArPSBibG9jay5pbnZlcnNlU3RyaXAub3BlbiA/ICd7e34nIDogJ3t7JztcbiAgICAgICAgdGhpcy5idWZmZXIgKz0gJ2Vsc2UnO1xuICAgICAgICB0aGlzLmJ1ZmZlciArPSBibG9jay5pbnZlcnNlU3RyaXAuY2xvc2UgPyAnfn19JyA6ICd9fSc7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuQmxvY2soYmxvY2suaW52ZXJzZSk7XG4gICAgfVxuXG4gICAgaWYgKCFibG9jay5jaGFpbmVkKSB7XG4gICAgICB0aGlzLmJ1ZmZlciArPSBibG9jay5jbG9zZVN0cmlwLm9wZW4gPyAne3t+LycgOiAne3svJztcbiAgICAgIHRoaXMuRXhwcmVzc2lvbihibG9jay5wYXRoKTtcbiAgICAgIHRoaXMuYnVmZmVyICs9IGJsb2NrLmNsb3NlU3RyaXAuY2xvc2UgPyAnfn19JyA6ICd9fSc7XG4gICAgfVxuICB9XG5cbiAgQmxvY2tQYXJhbXMoYmxvY2tQYXJhbXM6IHN0cmluZ1tdKSB7XG4gICAgdGhpcy5idWZmZXIgKz0gYCBhcyB8JHtibG9ja1BhcmFtcy5qb2luKCcgJyl9fGA7XG4gIH1cblxuICBQYXJ0aWFsU3RhdGVtZW50KHBhcnRpYWw6IFBhcnRpYWxTdGF0ZW1lbnQpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5oYW5kbGVkQnlPdmVycmlkZShwYXJ0aWFsKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuYnVmZmVyICs9ICd7ez4nO1xuICAgIHRoaXMuRXhwcmVzc2lvbihwYXJ0aWFsLm5hbWUpO1xuICAgIHRoaXMuUGFyYW1zKHBhcnRpYWwucGFyYW1zKTtcbiAgICB0aGlzLkhhc2gocGFydGlhbC5oYXNoKTtcbiAgICB0aGlzLmJ1ZmZlciArPSAnfX0nO1xuICB9XG5cbiAgQ29uY2F0U3RhdGVtZW50KGNvbmNhdDogQ29uY2F0U3RhdGVtZW50KTogdm9pZCB7XG4gICAgaWYgKHRoaXMuaGFuZGxlZEJ5T3ZlcnJpZGUoY29uY2F0KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuYnVmZmVyICs9ICdcIic7XG4gICAgY29uY2F0LnBhcnRzLmZvckVhY2goKHBhcnQpID0+IHtcbiAgICAgIGlmIChwYXJ0LnR5cGUgPT09ICdUZXh0Tm9kZScpIHtcbiAgICAgICAgdGhpcy5UZXh0Tm9kZShwYXJ0LCB0cnVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuTm9kZShwYXJ0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLmJ1ZmZlciArPSAnXCInO1xuICB9XG5cbiAgTXVzdGFjaGVDb21tZW50U3RhdGVtZW50KGNvbW1lbnQ6IE11c3RhY2hlQ29tbWVudFN0YXRlbWVudCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmhhbmRsZWRCeU92ZXJyaWRlKGNvbW1lbnQpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5idWZmZXIgKz0gYHt7IS0tJHtjb21tZW50LnZhbHVlfS0tfX1gO1xuICB9XG5cbiAgRWxlbWVudE1vZGlmaWVyU3RhdGVtZW50KG1vZDogRWxlbWVudE1vZGlmaWVyU3RhdGVtZW50KTogdm9pZCB7XG4gICAgaWYgKHRoaXMuaGFuZGxlZEJ5T3ZlcnJpZGUobW9kKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuYnVmZmVyICs9ICd7eyc7XG4gICAgdGhpcy5FeHByZXNzaW9uKG1vZC5wYXRoKTtcbiAgICB0aGlzLlBhcmFtcyhtb2QucGFyYW1zKTtcbiAgICB0aGlzLkhhc2gobW9kLmhhc2gpO1xuICAgIHRoaXMuYnVmZmVyICs9ICd9fSc7XG4gIH1cblxuICBDb21tZW50U3RhdGVtZW50KGNvbW1lbnQ6IENvbW1lbnRTdGF0ZW1lbnQpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5oYW5kbGVkQnlPdmVycmlkZShjb21tZW50KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuYnVmZmVyICs9IGA8IS0tJHtjb21tZW50LnZhbHVlfS0tPmA7XG4gIH1cblxuICBQYXRoRXhwcmVzc2lvbihwYXRoOiBQYXRoRXhwcmVzc2lvbik6IHZvaWQge1xuICAgIGlmICh0aGlzLmhhbmRsZWRCeU92ZXJyaWRlKHBhdGgpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5idWZmZXIgKz0gcGF0aC5vcmlnaW5hbDtcbiAgfVxuXG4gIFN1YkV4cHJlc3Npb24oc2V4cDogU3ViRXhwcmVzc2lvbik6IHZvaWQge1xuICAgIGlmICh0aGlzLmhhbmRsZWRCeU92ZXJyaWRlKHNleHApKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5idWZmZXIgKz0gJygnO1xuICAgIHRoaXMuRXhwcmVzc2lvbihzZXhwLnBhdGgpO1xuICAgIHRoaXMuUGFyYW1zKHNleHAucGFyYW1zKTtcbiAgICB0aGlzLkhhc2goc2V4cC5oYXNoKTtcbiAgICB0aGlzLmJ1ZmZlciArPSAnKSc7XG4gIH1cblxuICBQYXJhbXMocGFyYW1zOiBFeHByZXNzaW9uW10pIHtcbiAgICAvLyBUT0RPOiBpbXBsZW1lbnQgYSB0b3AgbGV2ZWwgUGFyYW1zIEFTVCBub2RlIChqdXN0IGxpa2UgdGhlIEhhc2ggb2JqZWN0KVxuICAgIC8vIHNvIHRoYXQgdGhpcyBjYW4gYWxzbyBiZSBvdmVycmlkZGVuXG4gICAgaWYgKHBhcmFtcy5sZW5ndGgpIHtcbiAgICAgIHBhcmFtcy5mb3JFYWNoKChwYXJhbSkgPT4ge1xuICAgICAgICB0aGlzLmJ1ZmZlciArPSAnICc7XG4gICAgICAgIHRoaXMuRXhwcmVzc2lvbihwYXJhbSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBIYXNoKGhhc2g6IEhhc2gpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5oYW5kbGVkQnlPdmVycmlkZShoYXNoLCB0cnVlKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGhhc2gucGFpcnMuZm9yRWFjaCgocGFpcikgPT4ge1xuICAgICAgdGhpcy5idWZmZXIgKz0gJyAnO1xuICAgICAgdGhpcy5IYXNoUGFpcihwYWlyKTtcbiAgICB9KTtcbiAgfVxuXG4gIEhhc2hQYWlyKHBhaXI6IEhhc2hQYWlyKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuaGFuZGxlZEJ5T3ZlcnJpZGUocGFpcikpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmJ1ZmZlciArPSBwYWlyLmtleTtcbiAgICB0aGlzLmJ1ZmZlciArPSAnPSc7XG4gICAgdGhpcy5Ob2RlKHBhaXIudmFsdWUpO1xuICB9XG5cbiAgU3RyaW5nTGl0ZXJhbChzdHI6IFN0cmluZ0xpdGVyYWwpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5oYW5kbGVkQnlPdmVycmlkZShzdHIpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5idWZmZXIgKz0gSlNPTi5zdHJpbmdpZnkoc3RyLnZhbHVlKTtcbiAgfVxuXG4gIEJvb2xlYW5MaXRlcmFsKGJvb2w6IEJvb2xlYW5MaXRlcmFsKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuaGFuZGxlZEJ5T3ZlcnJpZGUoYm9vbCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmJ1ZmZlciArPSBib29sLnZhbHVlO1xuICB9XG5cbiAgTnVtYmVyTGl0ZXJhbChudW1iZXI6IE51bWJlckxpdGVyYWwpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5oYW5kbGVkQnlPdmVycmlkZShudW1iZXIpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5idWZmZXIgKz0gbnVtYmVyLnZhbHVlO1xuICB9XG5cbiAgVW5kZWZpbmVkTGl0ZXJhbChub2RlOiBVbmRlZmluZWRMaXRlcmFsKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuaGFuZGxlZEJ5T3ZlcnJpZGUobm9kZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmJ1ZmZlciArPSAndW5kZWZpbmVkJztcbiAgfVxuXG4gIE51bGxMaXRlcmFsKG5vZGU6IE51bGxMaXRlcmFsKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuaGFuZGxlZEJ5T3ZlcnJpZGUobm9kZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmJ1ZmZlciArPSAnbnVsbCc7XG4gIH1cblxuICBwcmludChub2RlOiBOb2RlKSB7XG4gICAgbGV0IHsgb3B0aW9ucyB9ID0gdGhpcztcblxuICAgIGlmIChvcHRpb25zLm92ZXJyaWRlKSB7XG4gICAgICBsZXQgcmVzdWx0ID0gb3B0aW9ucy5vdmVycmlkZShub2RlLCBvcHRpb25zKTtcblxuICAgICAgaWYgKHJlc3VsdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5idWZmZXIgPSAnJztcbiAgICB0aGlzLk5vZGUobm9kZSk7XG4gICAgcmV0dXJuIHRoaXMuYnVmZmVyO1xuICB9XG59XG5cbmZ1bmN0aW9uIHVucmVhY2hhYmxlKG5vZGU6IG5ldmVyLCBwYXJlbnROb2RlVHlwZTogc3RyaW5nKTogbmV2ZXIge1xuICBsZXQgeyBsb2MsIHR5cGUgfSA9IChub2RlIGFzIGFueSkgYXMgTm9kZTtcbiAgdGhyb3cgbmV3IEVycm9yKFxuICAgIGBOb24tZXhoYXVzdGl2ZSBub2RlIG5hcnJvd2luZyAke3R5cGV9IEAgbG9jYXRpb246ICR7SlNPTi5zdHJpbmdpZnkoXG4gICAgICBsb2NcbiAgICApfSBmb3IgcGFyZW50ICR7cGFyZW50Tm9kZVR5cGV9YFxuICApO1xufVxuIl0sInNvdXJjZVJvb3QiOiIifQ==