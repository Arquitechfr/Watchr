const { withAndroidStyles } = require("@expo/config-plugins");

function withEdgeToEdge(config) {
  return withAndroidStyles(config, (mod) => {
    const appTheme = mod.modResults.resources.style?.find(
      (s) => s.$.name === "AppTheme"
    );
    if (!appTheme) return mod;

    const deprecatedAttrs = [
      "android:statusBarColor",
      "android:navigationBarColor",
    ];

    appTheme.item = (appTheme.item || []).filter(
      (item) => !deprecatedAttrs.includes(item.$?.name)
    );

    return mod;
  });
}

module.exports = withEdgeToEdge;
