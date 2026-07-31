import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import sharp from "sharp";

const repositoryRoot = process.cwd();
const sourcePath = resolve(repositoryRoot, "public", "favicon.svg");
const publicDirectory = resolve(repositoryRoot, "public");
const iconDirectory = resolve(publicDirectory, "icons");
const source = await readFile(sourcePath);

const targets = [
  {
    path: resolve(publicDirectory, "favicon-32.png"),
    size: 32,
    opaque: false,
  },
  {
    path: resolve(publicDirectory, "apple-touch-icon.png"),
    size: 180,
    opaque: true,
  },
  {
    path: resolve(iconDirectory, "icon-192.png"),
    size: 192,
    opaque: true,
  },
  {
    path: resolve(iconDirectory, "icon-512.png"),
    size: 512,
    opaque: true,
  },
];

await mkdir(iconDirectory, { recursive: true });

await Promise.all(
  targets.map(({ path, size, opaque }) => {
    const image = sharp(source, { density: 384 }).resize(size, size);
    const output = opaque ? image.flatten({ background: "#12261f" }) : image;

    return output
      .png({
        compressionLevel: 9,
        adaptiveFiltering: true,
        palette: true,
      })
      .toFile(path);
  }),
);

console.log(
  `Built ${targets.length} deterministic release icons from public/favicon.svg.`,
);
