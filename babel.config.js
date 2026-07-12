module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Required by react-native-reanimated v4 (used via react-native-keyboard-controller)
    // — must be the last plugin.
    plugins: ['react-native-worklets/plugin'],
  };
};
