const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

function withR8Optimization(config) {
  config = withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.platformProjectRoot;

      // 1. Replace proguard-android.txt with proguard-android-optimize.txt in app/build.gradle
      const buildGradlePath = path.join(projectRoot, "app", "build.gradle");
      if (fs.existsSync(buildGradlePath)) {
        let contents = fs.readFileSync(buildGradlePath, "utf8");
        contents = contents.replace(
          /getDefaultProguardFile\("proguard-android\.txt"\)/,
          'getDefaultProguardFile("proguard-android-optimize.txt")'
        );
        fs.writeFileSync(buildGradlePath, contents);
      }

      // 2. Add android.r8.optimizedResourceShrinking=true to gradle.properties
      const gradlePropsPath = path.join(projectRoot, "gradle.properties");
      if (fs.existsSync(gradlePropsPath)) {
        let contents = fs.readFileSync(gradlePropsPath, "utf8");
        if (!contents.includes("android.r8.optimizedResourceShrinking")) {
          contents = contents.trimEnd() + "\n# Enable optimized resource shrinking (AGP 8.12+)\nandroid.r8.optimizedResourceShrinking=true\n";
          fs.writeFileSync(gradlePropsPath, contents);
        }
      }

      return config;
    },
  ]);

  return config;
}

module.exports = withR8Optimization;
