const fs = require("node:fs");
const { circuit } = require("../src/replay-core.js");
const source = JSON.parse(
  fs.readFileSync("assets/tracks/mexico.geojson", "utf8"),
);
const feature = source.features[0];
fs.writeFileSync(
  "assets/tracks/mexico.js",
  "/* MIT: Tomislav Bacinger; see LICENSE-MIT.txt. Approximate geographic reference, not a survey. */\nglobalThis.MEXICO_TRACK=" +
    JSON.stringify({
      id: "mexico-bacinger",
      name: feature.properties.Name,
      length: feature.properties.length,
      coordinates: feature.geometry.coordinates,
      source:
        "https://github.com/bacinger/f1-circuits/blob/master/circuits/mx-1962.geojson",
      license: "MIT",
    }) +
    ";\n",
);
console.log(
  "Prepared fixed Mexico reference:",
  circuit(feature.geometry.coordinates, feature.properties.length).length,
);
