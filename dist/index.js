'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = loader;

var _schemaUtils = require('schema-utils');

var _schemaUtils2 = _interopRequireDefault(_schemaUtils);

var _loaderUtils = require('loader-utils');

var _postcss = require('postcss');

var _postcss2 = _interopRequireDefault(_postcss);

var _package = require('postcss/package.json');

var _package2 = _interopRequireDefault(_package);

var _options = require('./options.json');

var _options2 = _interopRequireDefault(_options);

var _url = require('./plugins/url');

var _url2 = _interopRequireDefault(_url);

var _import = require('./plugins/import');

var _import2 = _interopRequireDefault(_import);

var _Warning = require('./Warning');

var _Warning2 = _interopRequireDefault(_Warning);

var _SyntaxError = require('./SyntaxError');

var _SyntaxError2 = _interopRequireDefault(_SyntaxError);

var _utils = require('./utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*
  MIT License http://www.opensource.org/licenses/mit-license.php
  Author Tobias Koppers @sokra
*/

function loader(content, map, meta) {
  const options = (0, _loaderUtils.getOptions)(this) || {};

  (0, _schemaUtils2.default)(_options2.default, options, 'CSS Loader');

  const cb = this.async();
  const {
    url: urlOpt,
    import: importOpt,
    sourceMap,
    importLoaders
  } = Object.assign({}, { url: true, import: true, sourceMap: false, importLoaders: 0 }, options);

  const plugins = [];

  if (urlOpt) {
    plugins.push((0, _url2.default)());
  }

  if (importOpt) {
    plugins.push((0, _import2.default)({ importLoaders }));
  }

  // Reuse CSS AST (PostCSS AST e.g 'postcss-loader') to avoid reparsing
  if (meta) {
    const { ast } = meta;

    if (ast && ast.type === 'postcss' && ast.version === _package2.default.version) {
      // eslint-disable-next-line no-param-reassign
      content = ast.root;
    }
  }

  let prevMap = map;

  // Some loader emit source map as `{String}`
  if (sourceMap && typeof map === 'string') {
    prevMap = JSON.parse(map);
  }

  if (sourceMap && prevMap) {
    prevMap.sources = prevMap.sources.map(source => source.replace(/\\/g, '/'));
    prevMap.sourceRoot = '';
  }

  (0, _postcss2.default)(plugins).process(content, {
    // We need a prefix to avoid path rewriting of PostCSS
    from: `/css-loader!${(0, _loaderUtils.getRemainingRequest)(this).split('!').pop()}`,
    to: (0, _loaderUtils.getCurrentRequest)(this).split('!').pop(),
    map: sourceMap ? {
      prev: prevMap,
      sourcesContent: true,
      inline: false,
      annotation: false
    } : null
  }).then(result => {
    result.warnings().forEach(warning => this.emitWarning(new _Warning2.default(warning)));

    if (meta && meta.messages) {
      // eslint-disable-next-line no-param-reassign
      result.messages = result.messages.concat(meta.messages);
    }

    let newMap = result.map;

    if (sourceMap && newMap) {
      newMap = newMap.toJSON();
      newMap.sources = newMap.sources.map(source => source.split('!').pop().replace(/\\/g, '/'));
      newMap.sourceRoot = '';
      newMap.file = newMap.file.split('!').pop().replace(/\\/g, '/');
      newMap = JSON.stringify(newMap);
    }

    const runtimeCode = `module.exports = exports = require(${(0, _loaderUtils.stringifyRequest)(this, require.resolve('./runtime/api'))})(${!!sourceMap});\n`;
    const importCode = (0, _utils.messageReducer)(result.messages, 'import', '', this);
    const moduleCode = (0, _utils.messageReducer)(result.messages, 'module', `exports.push([module.id, ${JSON.stringify(result.css)}, ""${newMap ? `,${newMap}` : ''}]);\n`, this);
    const exportCode = (0, _utils.messageReducer)(result.messages, 'export', '', this);

    return cb(null, [`// CSS runtime\n${runtimeCode}\n`, importCode ? `// CSS imports\n${importCode}\n` : '', moduleCode ? `// CSS module\n${moduleCode}\n` : '', exportCode ? `// CSS exports\n${exportCode}\n` : ''].join(''));
  }).catch(error => {
    cb(error.name === 'CssSyntaxError' ? new _SyntaxError2.default(error) : error);
  });
}