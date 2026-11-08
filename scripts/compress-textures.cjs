/* Build-time tool only. BASISU points to a separately installed Binomial basisu encoder. */
const { execFileSync } = require("node:child_process");
const encoder = process.env.BASISU || "basisu";
for (const key of ["color", "normal", "roughness"])
  execFileSync(
    encoder,
    [
      "-ktx2",
      "-uastc",
      "-uastc_level",
      "1",
      "-mipmap",
      ...(key === "color" ? [] : ["-linear"]),
      "-file",
      "assets/materials/asphalt-" + key + ".jpg",
      "-output_file",
      "assets/materials/asphalt-" + key + ".ktx2",
    ],
    { stdio: "inherit" },
  );
