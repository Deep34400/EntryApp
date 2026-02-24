module.exports = function (api) {
  api.cache(true);
  const isProd = api.env("production");
  const plugins = [
    [
      "module-resolver",
      {
        root: ["./"],
        alias: {
          "@": "./client",
          "@shared": "./shared",
        },
        extensions: [".ios.js", ".android.js", ".js", ".ts", ".tsx", ".json"],
      },
    ],
    "react-native-reanimated/plugin",
  ];
  if (isProd) {
    plugins.push(["transform-remove-console", { exclude: ["error", "warn"] }]);
  }
  return {
    presets: ["babel-preset-expo"],
    plugins,
  };
};
