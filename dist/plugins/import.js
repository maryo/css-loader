'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _postcss = require('postcss');

var _postcss2 = _interopRequireDefault(_postcss);

var _postcssValueParser = require('postcss-value-parser');

var _postcssValueParser2 = _interopRequireDefault(_postcssValueParser);

var _loaderUtils = require('loader-utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function getImportPrefix(loaderContext, importLoaders) {
  const loadersRequest = loaderContext.loaders.slice(loaderContext.loaderIndex, loaderContext.loaderIndex + 1 + importLoaders).map(x => x.request).join('!');

  return `-!${loadersRequest}!`;
}

const pluginName = 'postcss-css-loader-import';

const getArg = nodes => nodes.length !== 0 && nodes[0].type === 'string' ? nodes[0].value : _postcssValueParser2.default.stringify(nodes);

const getUrl = node => {
  if (node.type === 'function' && node.value.toLowerCase() === 'url') {
    return getArg(node.nodes);
  }

  if (node.type === 'string') {
    return node.value;
  }

  return '';
};

const parseImport = params => {
  const { nodes } = (0, _postcssValueParser2.default)(params);

  if (nodes.length === 0) {
    return null;
  }

  const url = getUrl(nodes[0]);

  if (url.trim().length === 0) {
    return null;
  }

  return {
    url,
    media: _postcssValueParser2.default.stringify(nodes.slice(1)).trim()
  };
};

exports.default = _postcss2.default.plugin(pluginName, (options = {}) => function process(css, result) {
  const { importLoaders } = options;
  const imports = {};

  css.walkAtRules(/^import$/i, atrule => {
    // Convert only top-level @import
    if (atrule.parent.type !== 'root') {
      return;
    }

    if (atrule.nodes) {
      // eslint-disable-next-line consistent-return
      return result.warn("It looks like you didn't end your @import statement correctly. " + 'Child nodes are attached to it.', { node: atrule });
    }

    const parsed = parseImport(atrule.params);

    if (!parsed) {
      // eslint-disable-next-line consistent-return
      return result.warn(`Unable to find uri in '${atrule.toString()}'`, {
        node: atrule
      });
    }

    atrule.remove();

    imports[`"${parsed.url}"${parsed.media ? ` "${parsed.media.toLowerCase()}"` : ''}`] = parsed;
  });

  Object.keys(imports).forEach(token => {
    const importee = imports[token];

    result.messages.push({
      pluginName,
      type: 'import',
      import(accumulator, currentValue, index, array, loaderContext) {
        const { url, media } = importee;

        if ((0, _loaderUtils.isUrlRequest)(url)) {
          // Remove `#hash` and `?#hash` from `require`
          const [normalizedUrl] = url.split(/(\?)?#/);

          // Requestable url in `@import` at-rule (`@import './style.css`)
          return `${accumulator}exports.i(require(${(0, _loaderUtils.stringifyRequest)(loaderContext, getImportPrefix(loaderContext, importLoaders) + (0, _loaderUtils.urlToRequest)(normalizedUrl))}), ${JSON.stringify(media)});\n`;
        }

        // Absolute url in `@import` at-rule (`@import 'https://example.com/style.css`)
        return `${accumulator}exports.push([module.id, ${JSON.stringify(`@import url(${url});`)}, ${JSON.stringify(media)}]);\n`;
      }
    });
  });
});