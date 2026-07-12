const { withAndroidManifest } = require("@expo/config-plugins");

function withAppLinks(config) {
  config = withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;

    const application = androidManifest.application?.[0];
    if (!application) return config;

    const activity = application.activity?.find(
      (a) =>
        a.$?.["android:name"] === ".MainActivity" ||
        a.$?.["android:name"] === "host.exp.exponent.MainActivity",
    );
    if (!activity) return config;

    // Check if the intent-filter for app.watchr.me already exists
    const existingFilters = activity["intent-filter"] || [];
    const alreadyExists = existingFilters.some(
      (f) =>
        f.data?.some(
          (d) =>
            d.$?.["android:scheme"] === "https" &&
            d.$?.["android:host"] === "app.watchr.me",
        ),
    );
    if (alreadyExists) return config;

    const appLinksIntentFilter = {
      $: { "android:autoVerify": "true" },
      action: [
        { $: { "android:name": "android.intent.action.VIEW" } },
      ],
      category: [
        { $: { "android:name": "android.intent.category.DEFAULT" } },
        { $: { "android:name": "android.intent.category.BROWSABLE" } },
      ],
      data: [
        {
          $: {
            "android:scheme": "https",
            "android:host": "app.watchr.me",
          },
        },
      ],
    };

    if (!activity["intent-filter"]) {
      activity["intent-filter"] = [];
    }
    activity["intent-filter"].push(appLinksIntentFilter);

    return config;
  });

  return config;
}

module.exports = withAppLinks;
