import fs from "node:fs/promises";
import * as T from "three";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url),
  C = require("../src/replay-core.js");
const source = JSON.parse(
  await fs.readFile("assets/tracks/mexico.geojson", "utf8"),
).features[0];
const model = C.circuit(source.geometry.coordinates, source.properties.length);
const curve = new T.CatmullRomCurve3(
  model.points.slice(0, -1).map((p) => new T.Vector3(p.x, 0, p.z)),
  true,
  "centripetal",
  0.1,
);
const points = curve
  .getSpacedPoints(2152)
  .map((p) => [+p.x.toFixed(3), +p.z.toFixed(3)]);
const scene = {
  length: 4304,
  points,
  source:
    "Bacinger MIT geographic line, centripetal render interpolation only; no survey accuracy added",
  width: { min: 14, max: 15.6, measured: false },
  elevation: { measured: false, mode: "flat" },
};
await fs.mkdir("assets/tracks/v3", { recursive: true });
await fs.writeFile(
  "assets/tracks/v3/render-path.js",
  "/* MIT derivative of Bacinger reference. Visual interpolation, not additional measurement. */\nglobalThis.MEXICO_RENDER_PATH=" +
    JSON.stringify(scene) +
    ";\n",
);
