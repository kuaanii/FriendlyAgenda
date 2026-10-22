const fs = require("node:fs/promises");
const path = require("node:path");
// Development helper: sharp is only needed to regenerate the checked-in icon.
const sharp = require(process.env.SHARP_PATH || "sharp");
(async () => {
  const png = await sharp(path.join(__dirname, "icon.svg"))
    .resize(256, 256)
    .png()
    .toBuffer();
  await sharp(path.join(__dirname, "icon.svg"))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(__dirname, "icon.png"));
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18);
  await fs.writeFile(
    path.join(__dirname, "icon.ico"),
    Buffer.concat([header, png]),
  );
  for (const scale of [1, 2]) {
    const suffix = scale === 1 ? "" : "@2x";
    await sharp(path.join(__dirname, "tray.svg"))
      .resize(18 * scale, 18 * scale)
      .png()
      .toFile(path.join(__dirname, `trayTemplate${suffix}.png`));
  }
})();
