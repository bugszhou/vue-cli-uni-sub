const path = require("path");
const fs = require("fs");

const isWin = /^win/.test(process.platform);

const normalizePath = path => (isWin ? path.replace(/\\/g, '/') : path);
const mainPath = normalizePath(path.resolve(process.env.UNI_INPUT_DIR, 'main.'));

module.exports = (api) => {
  const configPath = path.join(process.cwd(), "uni-sub.config.json");

  if (!fs.existsSync(configPath)) {
    return;
  }

  const config = JSON.parse(fs.readFileSync(configPath));

  if (!config.subPackageRoots || !config.subPackageRoots.length) {
    return;
  }

  api.configureWebpack((webpackConfig) => {
    const splitChunks = webpackConfig.optimization.splitChunks;
    const cacheGroups = splitChunks.cacheGroups;
    splitChunks.cacheGroups = {
      ...cacheGroups,
      subCommons: {
        test(module) {

          if (module.type === 'css/mini-extract') {
            return false
          }
          if (module.resource && (
              normalizePath(module.resource).indexOf(mainPath) === 0 // main.js
          )) {
            return false
          }

          return (
            module.resource &&
            /\.(js|ts)$/.test(module.resource) &&
            config.subPackageRoots.some((item) => module.identifier().includes(item))
          );
        },
        name: function (module) {
          const moduleName = module.identifier();
          const result = config.subPackageRoots.filter((sub) => {
            if (moduleName.includes(sub)) {
              return true;
            }
            return false;
          });
          if (result.length && result[0]) {
            return `${result[0]}/build~commons/commons`;
          }
          return `common/vendor`;
        },
        chunks: "all",
        minSize: 0,
        minChunks: 1,
      },
      commons: {
        test (module) {
          if (config.subPackageRoots.some((item) => module.identifier().includes(item))) {
            return false;
          }

          if (module.type === 'css/mini-extract') {
            return false
          }
          if (module.resource && (
            module.resource.indexOf('.vue') !== -1 ||
              module.resource.indexOf('.nvue') !== -1 ||
              normalizePath(module.resource).indexOf(mainPath) === 0 // main.js
          )) {
            return false
          }
          return true
        },
        minChunks: 1,
        name: 'common/vendor',
        chunks: 'all'
      },
    }

    return {
      optimization: {
        ...webpackConfig.optimization,
        splitChunks,
      }
    };
  });
}