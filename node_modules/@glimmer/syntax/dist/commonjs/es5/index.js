"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  preprocess: true,
  builders: true,
  TraversalError: true,
  cannotRemoveNode: true,
  cannotReplaceNode: true,
  cannotReplaceOrRemoveInKeyHandlerYet: true,
  traverse: true,
  Path: true,
  Walker: true,
  print: true,
  sortByLoc: true,
  SyntaxError: true,
  AST: true,
  isLiteral: true,
  printLiteral: true
};
Object.defineProperty(exports, "preprocess", {
  enumerable: true,
  get: function () {
    return _tokenizerEventHandlers.preprocess;
  }
});
Object.defineProperty(exports, "builders", {
  enumerable: true,
  get: function () {
    return _builders.default;
  }
});
Object.defineProperty(exports, "TraversalError", {
  enumerable: true,
  get: function () {
    return _errors.default;
  }
});
Object.defineProperty(exports, "cannotRemoveNode", {
  enumerable: true,
  get: function () {
    return _errors.cannotRemoveNode;
  }
});
Object.defineProperty(exports, "cannotReplaceNode", {
  enumerable: true,
  get: function () {
    return _errors.cannotReplaceNode;
  }
});
Object.defineProperty(exports, "cannotReplaceOrRemoveInKeyHandlerYet", {
  enumerable: true,
  get: function () {
    return _errors.cannotReplaceOrRemoveInKeyHandlerYet;
  }
});
Object.defineProperty(exports, "traverse", {
  enumerable: true,
  get: function () {
    return _traverse.default;
  }
});
Object.defineProperty(exports, "Path", {
  enumerable: true,
  get: function () {
    return _path.default;
  }
});
Object.defineProperty(exports, "Walker", {
  enumerable: true,
  get: function () {
    return _walker.default;
  }
});
Object.defineProperty(exports, "print", {
  enumerable: true,
  get: function () {
    return _print.default;
  }
});
Object.defineProperty(exports, "sortByLoc", {
  enumerable: true,
  get: function () {
    return _util.sortByLoc;
  }
});
Object.defineProperty(exports, "SyntaxError", {
  enumerable: true,
  get: function () {
    return _syntaxError.default;
  }
});
Object.defineProperty(exports, "isLiteral", {
  enumerable: true,
  get: function () {
    return _utils.isLiteral;
  }
});
Object.defineProperty(exports, "printLiteral", {
  enumerable: true,
  get: function () {
    return _utils.printLiteral;
  }
});
exports.AST = void 0;

var _tokenizerEventHandlers = require("./lib/parser/tokenizer-event-handlers");

var _builders = _interopRequireDefault(require("./lib/builders"));

var _errors = _interopRequireWildcard(require("./lib/traversal/errors"));

var _traverse = _interopRequireDefault(require("./lib/traversal/traverse"));

var _visitor = require("./lib/traversal/visitor");

Object.keys(_visitor).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _visitor[key];
    }
  });
});

var _path = _interopRequireDefault(require("./lib/traversal/path"));

var _walker = _interopRequireDefault(require("./lib/traversal/walker"));

var _print = _interopRequireDefault(require("./lib/generation/print"));

var _util = require("./lib/generation/util");

var _syntaxError = _interopRequireDefault(require("./lib/errors/syntax-error"));

var AST = _interopRequireWildcard(require("./lib/types/nodes"));

exports.AST = AST;

var _utils = require("./lib/utils");

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3BhY2thZ2VzL0BnbGltbWVyL3N5bnRheC9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQTs7QUFVQTs7QUFDQTs7QUFNQTs7QUFDQTs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFHQTs7QUFHQTs7OztBQUVBIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdXNlZCBieSBlbWJlci1jb21waWxlclxuZXhwb3J0IHtcbiAgcHJlcHJvY2VzcyxcbiAgUHJlcHJvY2Vzc09wdGlvbnMsXG4gIEFTVFBsdWdpbixcbiAgQVNUUGx1Z2luQnVpbGRlcixcbiAgQVNUUGx1Z2luRW52aXJvbm1lbnQsXG4gIFN5bnRheCxcbn0gZnJvbSAnLi9saWIvcGFyc2VyL3Rva2VuaXplci1ldmVudC1oYW5kbGVycyc7XG5cbi8vIG5lZWRlZCBmb3IgdGVzdHMgb25seVxuZXhwb3J0IHsgZGVmYXVsdCBhcyBidWlsZGVycyB9IGZyb20gJy4vbGliL2J1aWxkZXJzJztcbmV4cG9ydCB7XG4gIGRlZmF1bHQgYXMgVHJhdmVyc2FsRXJyb3IsXG4gIGNhbm5vdFJlbW92ZU5vZGUsXG4gIGNhbm5vdFJlcGxhY2VOb2RlLFxuICBjYW5ub3RSZXBsYWNlT3JSZW1vdmVJbktleUhhbmRsZXJZZXQsXG59IGZyb20gJy4vbGliL3RyYXZlcnNhbC9lcnJvcnMnO1xuZXhwb3J0IHsgZGVmYXVsdCBhcyB0cmF2ZXJzZSB9IGZyb20gJy4vbGliL3RyYXZlcnNhbC90cmF2ZXJzZSc7XG5leHBvcnQgKiBmcm9tICcuL2xpYi90cmF2ZXJzYWwvdmlzaXRvcic7XG5leHBvcnQgeyBkZWZhdWx0IGFzIFBhdGggfSBmcm9tICcuL2xpYi90cmF2ZXJzYWwvcGF0aCc7XG5leHBvcnQgeyBkZWZhdWx0IGFzIFdhbGtlciB9IGZyb20gJy4vbGliL3RyYXZlcnNhbC93YWxrZXInO1xuZXhwb3J0IHsgZGVmYXVsdCBhcyBwcmludCB9IGZyb20gJy4vbGliL2dlbmVyYXRpb24vcHJpbnQnO1xuZXhwb3J0IHsgc29ydEJ5TG9jIH0gZnJvbSAnLi9saWIvZ2VuZXJhdGlvbi91dGlsJztcblxuLy8gZXJyb3JzXG5leHBvcnQgeyBkZWZhdWx0IGFzIFN5bnRheEVycm9yIH0gZnJvbSAnLi9saWIvZXJyb3JzL3N5bnRheC1lcnJvcic7XG5cbi8vIEFTVFxuaW1wb3J0ICogYXMgQVNUIGZyb20gJy4vbGliL3R5cGVzL25vZGVzJztcbmV4cG9ydCB7IEFTVCB9O1xuZXhwb3J0IHsgaXNMaXRlcmFsLCBwcmludExpdGVyYWwgfSBmcm9tICcuL2xpYi91dGlscyc7XG4iXSwic291cmNlUm9vdCI6IiJ9