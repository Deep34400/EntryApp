const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

// react-native-network-logger tries multiple XHRInterceptor paths; in RN 0.81 only this one exists.
const XHR_INTERCEPTOR_REAL = path.resolve(
  __dirname,
  "node_modules/react-native/src/private/devsupport/devmenu/elementinspector/XHRInterceptor.js"
);

module.exports = (() => {
  const config = getDefaultConfig(__dirname);
  const { transformer, resolver } = config;

  config.transformer = {
    ...transformer,
    babelTransformerPath: require.resolve("react-native-svg-transformer"),
  };

  config.resolver = {
    ...resolver,
    assetExts: resolver.assetExts.filter((ext) => ext !== "svg"),
    sourceExts: [...resolver.sourceExts, "svg"],
    // Redirect obsolete XHRInterceptor paths to the real file so Metro does not warn about missing exports.
    resolveRequest: (context, moduleName, platform) => {
      if (
        moduleName === "react-native/src/private/inspector/XHRInterceptor" ||
        moduleName === "react-native/Libraries/Network/XHRInterceptor"
      ) {
        return { type: "sourceFile", filePath: XHR_INTERCEPTOR_REAL };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  };

  return config;
})();
