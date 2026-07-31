import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import sharp from "sharp";

const repositoryRoot = process.cwd();
const socialDirectory = resolve(repositoryRoot, "public", "assets", "social");
const outputDirectory = resolve(
  repositoryRoot,
  "AI-COLLAB",
  ".watch-state",
  "release-previews",
);
const outputPath = resolve(outputDirectory, "social-card-contact-sheet.jpg");
const manifest = JSON.parse(
  await readFile(resolve(socialDirectory, "manifest.json"), "utf8"),
);

const columns = 3;
const cardWidth = 400;
const cardHeight = 210;
const rows = Math.ceil(manifest.cards.length / columns);
const composites = [];

for (const [index, card] of manifest.cards.entries()) {
  const input = resolve(repositoryRoot, "public", card.path);
  const thumbnail = await sharp(input)
    .resize(cardWidth, cardHeight, { fit: "fill" })
    .jpeg({ quality: 88, chromaSubsampling: "4:4:4" })
    .toBuffer();

  composites.push({
    input: thumbnail,
    left: (index % columns) * cardWidth,
    top: Math.floor(index / columns) * cardHeight,
  });
}

await mkdir(outputDirectory, { recursive: true });
await sharp({
  create: {
    width: columns * cardWidth,
    height: rows * cardHeight,
    channels: 3,
    background: "#12261f",
  },
})
  .composite(composites)
  .jpeg({ quality: 90, chromaSubsampling: "4:4:4" })
  .toFile(outputPath);

console.log(
  `Built ${outputPath} with ${manifest.cards.length} route-specific cards.`,
);
