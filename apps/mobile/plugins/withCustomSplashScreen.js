const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

function withCustomSplashScreen(config) {
  config = withDangerousMod(config, [
    "android",
    async (config) => {
      const resDir = path.join(
        config.modRequest.platformProjectRoot,
        "app/src/main/res",
      );

      // Update colors.xml: splashscreen_background -> #1A1614
      const colorsPath = path.join(resDir, "values/colors.xml");
      if (fs.existsSync(colorsPath)) {
        let colorsContent = fs.readFileSync(colorsPath, "utf8");
        colorsContent = colorsContent.replace(
          /(<color name="splashscreen_background">)#FFFFFF(<\/color>)/,
          "$1#1A1614$2",
        );
        fs.writeFileSync(colorsPath, colorsContent);
      }

      // Update styles.xml: windowBackground -> @color/splashscreen_background
      const stylesPath = path.join(resDir, "values/styles.xml");
      if (fs.existsSync(stylesPath)) {
        let stylesContent = fs.readFileSync(stylesPath, "utf8");
        stylesContent = stylesContent.replace(
          /(<item name="android:windowBackground">)@drawable\/splashscreen_logo(<\/item>)/,
          "$1@color/splashscreen_background$2",
        );
        fs.writeFileSync(stylesPath, stylesContent);
      }

      // Update ic_launcher_background.xml: remove bitmap, keep solid color only
      const drawableBgPath = path.join(
        resDir,
        "drawable/ic_launcher_background.xml",
      );
      if (fs.existsSync(drawableBgPath)) {
        const content = `<layer-list xmlns:android="http://schemas.android.com/apk/res/android">\n  <item android:drawable="@color/splashscreen_background"/>\n</layer-list>\n`;
        fs.writeFileSync(drawableBgPath, content);
      }

      return config;
    },
  ]);

  return config;
}

module.exports = withCustomSplashScreen;
