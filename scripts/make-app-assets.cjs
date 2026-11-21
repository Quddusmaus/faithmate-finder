// Builds the Capacitor icon/splash sources in assets/ from public/pwa-512x512.png
// (the only logo we have). Then `npm run cap:assets` makes every native size.
// Swap in a higher-resolution logo here when one exists.
// Note: capacitor-assets also reformats AndroidManifest.xml (whitespace only);
// discard that part of the diff before committing.
const sharp = require("sharp");
const SRC = "public/pwa-512x512.png";
const CREAM = "#faf8f4"; // app background: --background in src/index.css
(async () => {
  // Inner artwork without the baked-in rounded corners: 400x400 from (56,56).
  const crop = await sharp(SRC).removeAlpha().extract({ left: 56, top: 56, width: 400, height: 400 }).png().toBuffer();

  // iOS + legacy Android icon: full-bleed 1024, no alpha (Apple rejects alpha).
  const iosPad = 48;
  const iosPadded = await sharp(crop).extend({ top: iosPad, bottom: iosPad, left: iosPad, right: iosPad, extendWith: "copy" }).png().toBuffer();
  await sharp(iosPadded).resize(1024, 1024, { kernel: "lanczos3" }).removeAlpha().png().toFile("assets/icon-only.png");

  // Android adaptive icon: launchers show the centre ~61-67% and mask it to a
  // circle/squircle, so pad the artwork (continuing its edge colours) until the
  // hearts fit the safe zone. Foreground left empty.
  const pad = 70;
  const padded = await sharp(crop).extend({ top: pad, bottom: pad, left: pad, right: pad, extendWith: "copy" }).png().toBuffer();
  await sharp(padded).blur(0.6).resize(1024, 1024, { kernel: "lanczos3" }).png().toFile("assets/icon-background.png");
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toFile("assets/icon-foreground.png");

  // Splash: rounded logo centred on the app's cream background.
  const size = 640, r = 150;
  const mask = Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="#fff"/></svg>`);
  const logo = await sharp(crop).resize(size, size, { kernel: "lanczos3" }).ensureAlpha()
    .composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  for (const name of ["splash.png", "splash-dark.png"]) {
    await sharp({ create: { width: 2732, height: 2732, channels: 3, background: CREAM } })
      .composite([{ input: logo, gravity: "centre" }]).png().toFile("assets/" + name);
  }
  console.log("done");
})().catch((e) => { console.error(e); process.exit(1); });
