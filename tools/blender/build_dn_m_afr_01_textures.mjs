#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";

import sharp from "sharp";

const CHARACTER_ID = "DN-M-AFR-01";
const GENERATOR_VERSION = "1.0.0";
const SIZE = 1024;
const TWO_PI = Math.PI * 2;

const PALETTE = {
  indigoGrey: "#26343F",
  burntRust: "#98532E",
  cream: "#D2B58A",
  leather: "#4B3122",
  indigo: "#2F5871",
  bronze: "#A77A37",
  sand: "#CDB58D",
};

function usage() {
  return [
    "Usage:",
    "  node tools/blender/build_dn_m_afr_01_textures.mjs --output-root <private-directory>",
    "",
    `Generates deterministic ${SIZE}x${SIZE} PNG PBR texture sets for ${CHARACTER_ID}.`,
  ].join("\n");
}

function parseArguments(argv) {
  let outputRoot = null;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") {
      process.stdout.write(`${usage()}\n`);
      process.exit(0);
    }
    if (argument === "--output-root") {
      outputRoot = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (argument?.startsWith("--output-root=")) {
      outputRoot = argument.slice("--output-root=".length);
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }

  if (outputRoot === null || outputRoot.trim() === "") {
    throw new Error(`--output-root is required.\n\n${usage()}`);
  }

  return {
    outputRoot: isAbsolute(outputRoot)
      ? resolve(outputRoot)
      : resolve(process.cwd(), outputRoot),
  };
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

function clamp(value, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value));
}

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function mix(left, right, amount) {
  return left + (right - left) * clamp(amount);
}

function mixRgb(left, right, amount) {
  return [
    mix(left[0], right[0], amount),
    mix(left[1], right[1], amount),
    mix(left[2], right[2], amount),
  ];
}

function multiplyRgb(colour, factor) {
  return colour.map((channel) => clamp(channel * factor, 0, 255));
}

function hashNoise(x, y, seed) {
  let value = Math.imul(x + 0x9e3779b9, 0x85ebca6b);
  value ^= Math.imul(y + seed, 0xc2b2ae35);
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  value ^= value >>> 16;
  return (value >>> 0) / 0xffffffff;
}

function valueNoise(x, y, cellSize, seed) {
  const gridX = Math.floor(x / cellSize);
  const gridY = Math.floor(y / cellSize);
  const localX = smoothstep(0, 1, (x % cellSize) / cellSize);
  const localY = smoothstep(0, 1, (y % cellSize) / cellSize);
  const top = mix(
    hashNoise(gridX, gridY, seed),
    hashNoise(gridX + 1, gridY, seed),
    localX,
  );
  const bottom = mix(
    hashNoise(gridX, gridY + 1, seed),
    hashNoise(gridX + 1, gridY + 1, seed),
    localX,
  );
  return mix(top, bottom, localY);
}

function wovenSurface(x, y, seed, scale = 1) {
  const warp =
    0.5 +
    0.5 *
      Math.sin(
        (x / (4.8 * scale) + Math.sin(y / (31 * scale)) * 0.22) * TWO_PI,
      );
  const weft =
    0.5 +
    0.5 *
      Math.sin(
        (y / (6.2 * scale) + Math.sin(x / (37 * scale)) * 0.18) * TWO_PI,
      );
  const fibre = hashNoise(x, y, seed);
  const broad = valueNoise(x, y, 92 * scale, seed + 19);
  return {
    height: clamp(
      0.43 + warp * 0.16 + weft * 0.13 + fibre * 0.035 + broad * 0.025,
    ),
    variation: (broad - 0.5) * 0.08 + (fibre - 0.5) * 0.025,
  };
}

function lineMask(distance, width, softness = 1.5) {
  return 1 - smoothstep(width, width + softness, Math.abs(distance));
}

function borderMask(position, edge, width) {
  return lineMask(position - edge, width, width * 0.75);
}

function createTunicSample(x, y) {
  const surface = wovenSurface(x, y, 101);
  const base = hexToRgb(PALETTE.indigoGrey);
  const faintStripe = lineMask(((x + y * 0.12) % 86) - 43, 1.15, 1.6) * 0.055;
  return {
    albedo: multiplyRgb(base, 1 + surface.variation + faintStripe),
    height: clamp(surface.height + faintStripe * 0.08),
    roughness: clamp(
      0.8 + surface.variation * 0.25 + (surface.height - 0.5) * 0.11,
    ),
  };
}

function createTabardSample(x, y) {
  const u = x / (SIZE - 1);
  const v = y / (SIZE - 1);
  const surface = wovenSurface(x, y, 211, 1.08);
  const cream = hexToRgb(PALETTE.cream);
  const indigo = hexToRgb(PALETTE.indigo);
  const rust = hexToRgb(PALETTE.burntRust);
  const bronze = hexToRgb(PALETTE.bronze);

  const edgeBand =
    smoothstep(0.018, 0.026, Math.min(u, 1 - u)) *
    (1 - smoothstep(0.038, 0.047, Math.min(u, 1 - u)));
  const innerRule = borderMask(u, 0.073, 0.0023) + borderMask(u, 0.927, 0.0023);
  const centreDistance = Math.abs(u - 0.5);
  const diamondPhase = (((v * 7.5) % 1) + 1) % 1;
  const diamondDistance = Math.abs(
    centreDistance * 10.8 + Math.abs(diamondPhase - 0.5) - 0.5,
  );
  const diamondLine = lineMask(diamondDistance, 0.022, 0.012);
  const centrePanel = 1 - smoothstep(0.135, 0.145, centreDistance);
  const centreRule =
    lineMask(centreDistance - 0.105, 0.0035, 0.002) +
    lineMask(centreDistance - 0.123, 0.0025, 0.002);

  let colour = multiplyRgb(cream, 1 + surface.variation);
  colour = mixRgb(colour, rust, diamondLine * centrePanel * 0.84);
  colour = mixRgb(colour, bronze, centreRule * 0.9);
  colour = mixRgb(colour, indigo, clamp(edgeBand + innerRule * 0.72));

  const ornament = clamp(
    edgeBand + innerRule * 0.6 + diamondLine * centrePanel + centreRule,
  );
  return {
    albedo: colour,
    height: clamp(surface.height + ornament * 0.075),
    roughness: clamp(0.78 + surface.variation * 0.24 - ornament * 0.09),
  };
}

function createMantleSample(x, y) {
  const u = x / (SIZE - 1);
  const v = y / (SIZE - 1);
  const surface = wovenSurface(x, y, 307, 1.18);
  const rust = hexToRgb(PALETTE.burntRust);
  const indigo = hexToRgb(PALETTE.indigo);
  const bronze = hexToRgb(PALETTE.bronze);
  const cream = hexToRgb(PALETTE.cream);

  const edgeDistance = Math.min(u, 1 - u);
  const edgeBand =
    smoothstep(0.012, 0.02, edgeDistance) *
    (1 - smoothstep(0.031, 0.04, edgeDistance));
  const goldRule = borderMask(u, 0.056, 0.0022) + borderMask(u, 0.944, 0.0022);

  const sunX = u - 0.5;
  const sunY = v - 0.29;
  const radius = Math.hypot(sunX, sunY);
  const angle = Math.atan2(sunY, sunX);
  const sunRing = lineMask(radius - 0.095, 0.004, 0.003);
  const rayWave = Math.abs(Math.sin(angle * 8));
  const rayBand =
    (1 - smoothstep(0.08, 0.15, rayWave)) *
    smoothstep(0.12, 0.145, radius) *
    (1 - smoothstep(0.205, 0.23, radius));
  const sunDisc = 1 - smoothstep(0.047, 0.055, radius);

  const duneBase = 0.63 + Math.abs(u - 0.5) * 0.42;
  const duneSecond = 0.78 - Math.abs(u - 0.5) * 0.32;
  const duneLines =
    lineMask(v - duneBase, 0.004, 0.003) +
    lineMask(v - duneSecond, 0.004, 0.003);
  const steppedGeometry =
    lineMask(((u * 8 + v * 4) % 1) - 0.5, 0.026, 0.012) *
    smoothstep(0.48, 0.58, v) *
    (1 - smoothstep(0.88, 0.94, v));

  const bronzeMask = clamp(
    sunRing + rayBand + duneLines + steppedGeometry * 0.68,
  );
  const creamMask = sunDisc * 0.82;
  let colour = multiplyRgb(rust, 1 + surface.variation);
  colour = mixRgb(colour, cream, creamMask);
  colour = mixRgb(colour, bronze, bronzeMask);
  colour = mixRgb(colour, indigo, clamp(edgeBand + goldRule * 0.16));

  const ornament = clamp(edgeBand + goldRule + bronzeMask + creamMask);
  return {
    albedo: colour,
    height: clamp(surface.height + ornament * 0.085),
    roughness: clamp(0.82 + surface.variation * 0.2 - ornament * 0.11),
  };
}

function createTrousersSample(x, y) {
  const surface = wovenSurface(x, y, 401, 1.32);
  const sand = hexToRgb(PALETTE.sand);
  const verticalWear =
    valueNoise(x, y, 168, 421) * 0.035 +
    Math.sin((x / SIZE) * TWO_PI * 3) * 0.012;
  return {
    albedo: multiplyRgb(sand, 0.97 + surface.variation - verticalWear),
    height: clamp(surface.height * 0.94 + verticalWear * 0.18),
    roughness: clamp(0.84 + surface.variation * 0.2 + verticalWear * 0.25),
  };
}

function createLeatherSample(x, y) {
  const leather = hexToRgb(PALETTE.leather);
  const broad = valueNoise(x, y, 96, 503);
  const medium = valueNoise(x, y, 29, 521);
  const pore = hashNoise(x, y, 547);
  const grain =
    0.5 +
    0.5 *
      Math.sin(
        (x / 19 + y / 73 + Math.sin(y / 41) * 0.7 + medium * 0.8) * TWO_PI,
      );
  const crease = lineMask(
    ((x * 0.23 + y * 0.11 + broad * 41) % 117) - 58.5,
    0.9,
    1.8,
  );
  const height = clamp(
    0.35 + broad * 0.18 + medium * 0.13 + grain * 0.08 - crease * 0.09,
  );
  return {
    albedo: multiplyRgb(
      leather,
      0.87 + broad * 0.18 + (medium - 0.5) * 0.08 - crease * 0.05,
    ),
    height,
    roughness: clamp(0.66 + (1 - broad) * 0.12 + pore * 0.055 + crease * 0.07),
  };
}

const MATERIALS = [
  {
    slug: "tunic_indigo_grey_woven",
    label: "Indigo-grey woven base tunic",
    uvUse: "Tile across the base tunic and sleeve guards",
    tileable: true,
    normalStrength: 0.65,
    sample: createTunicSample,
  },
  {
    slug: "tabard_cream_geometric",
    label: "Cream geometric tabard with indigo edge bands",
    uvUse: "Garment-space front panel, vertically oriented",
    tileable: false,
    normalStrength: 0.9,
    sample: createTabardSample,
  },
  {
    slug: "mantle_burnt_rust_sun_dune",
    label: "Burnt-rust mantle with angular sun and dune geometry",
    uvUse: "Garment-space mantle panel with protected border alignment",
    tileable: false,
    normalStrength: 0.95,
    sample: createMantleSample,
  },
  {
    slug: "trousers_sand_woven",
    label: "Sand woven trousers",
    uvUse: "Tile across trouser panels with vertical grain orientation",
    tileable: true,
    normalStrength: 0.55,
    sample: createTrousersSample,
  },
  {
    slug: "leather_dark_grain",
    label: "Dark vegetable-tanned leather accents",
    uvUse: "Tile across belts, pouches, straps, wraps and footwear accents",
    tileable: true,
    normalStrength: 1.25,
    sample: createLeatherSample,
  },
];

function buildMaterialPixels(material) {
  const pixelCount = SIZE * SIZE;
  const albedo = Buffer.allocUnsafe(pixelCount * 3);
  const roughness = Buffer.allocUnsafe(pixelCount);
  const height = Buffer.allocUnsafe(pixelCount);
  const heights = new Float32Array(pixelCount);

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const pixelIndex = y * SIZE + x;
      const colourIndex = pixelIndex * 3;
      const sample = material.sample(x, y);
      heights[pixelIndex] = sample.height;
      albedo[colourIndex] = Math.round(clamp(sample.albedo[0], 0, 255));
      albedo[colourIndex + 1] = Math.round(clamp(sample.albedo[1], 0, 255));
      albedo[colourIndex + 2] = Math.round(clamp(sample.albedo[2], 0, 255));
      roughness[pixelIndex] = Math.round(clamp(sample.roughness) * 255);
      height[pixelIndex] = Math.round(clamp(sample.height) * 255);
    }
  }

  const normal = Buffer.allocUnsafe(pixelCount * 3);
  for (let y = 0; y < SIZE; y += 1) {
    const previousY = y === 0 ? (material.tileable ? SIZE - 1 : 0) : y - 1;
    const nextY = y === SIZE - 1 ? (material.tileable ? 0 : SIZE - 1) : y + 1;
    for (let x = 0; x < SIZE; x += 1) {
      const previousX = x === 0 ? (material.tileable ? SIZE - 1 : 0) : x - 1;
      const nextX = x === SIZE - 1 ? (material.tileable ? 0 : SIZE - 1) : x + 1;
      const dx =
        (heights[y * SIZE + nextX] - heights[y * SIZE + previousX]) *
        material.normalStrength;
      const dy =
        (heights[nextY * SIZE + x] - heights[previousY * SIZE + x]) *
        material.normalStrength;
      const inverseLength = 1 / Math.hypot(dx, dy, 1);
      const pixelIndex = (y * SIZE + x) * 3;
      normal[pixelIndex] = Math.round((-dx * inverseLength * 0.5 + 0.5) * 255);
      normal[pixelIndex + 1] = Math.round(
        (-dy * inverseLength * 0.5 + 0.5) * 255,
      );
      normal[pixelIndex + 2] = Math.round((inverseLength * 0.5 + 0.5) * 255);
    }
  }

  return { albedo, roughness, height, normal };
}

async function encodePng(raw, channels) {
  let pipeline = sharp(raw, {
    raw: {
      width: SIZE,
      height: SIZE,
      channels,
    },
  });
  if (channels === 1) {
    pipeline = pipeline.toColourspace("b-w");
  }
  return pipeline
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      palette: false,
      effort: 10,
    })
    .toBuffer();
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function writeTexture(outputDirectory, fileName, raw, channels, mapType) {
  const encoded = await encodePng(raw, channels);
  await writeFile(join(outputDirectory, fileName), encoded);
  return {
    file: fileName,
    mapType,
    channels,
    colourSpace: mapType === "albedo" ? "sRGB" : "Non-Color",
    bytes: encoded.length,
    sha256: sha256(encoded),
  };
}

async function generateMaterial(outputDirectory, material) {
  const pixels = buildMaterialPixels(material);
  const prefix = `dn_m_afr_01_${material.slug}`;
  const files = [];

  files.push(
    await writeTexture(
      outputDirectory,
      `${prefix}_albedo.png`,
      pixels.albedo,
      3,
      "albedo",
    ),
  );
  files.push(
    await writeTexture(
      outputDirectory,
      `${prefix}_roughness.png`,
      pixels.roughness,
      1,
      "roughness",
    ),
  );
  files.push(
    await writeTexture(
      outputDirectory,
      `${prefix}_height.png`,
      pixels.height,
      1,
      "normal-like-height",
    ),
  );
  files.push(
    await writeTexture(
      outputDirectory,
      `${prefix}_normal.png`,
      pixels.normal,
      3,
      "tangent-normal",
    ),
  );

  return {
    slug: material.slug,
    label: material.label,
    uvUse: material.uvUse,
    tileable: material.tileable,
    files,
  };
}

async function main() {
  const { outputRoot } = parseArguments(process.argv.slice(2));
  const outputDirectory = join(
    outputRoot,
    "dn-m-afr-01",
    "textures",
    `${SIZE}`,
  );
  await mkdir(outputDirectory, { recursive: true });

  const generatedMaterials = [];
  for (const material of MATERIALS) {
    generatedMaterials.push(await generateMaterial(outputDirectory, material));
  }

  const manifest = {
    schemaVersion: "1.0.0",
    generatorVersion: GENERATOR_VERSION,
    characterId: CHARACTER_ID,
    deterministic: true,
    networkAccess: false,
    dimensions: {
      width: SIZE,
      height: SIZE,
    },
    canonicalPalette: PALETTE,
    materialCount: generatedMaterials.length,
    textureCount: generatedMaterials.reduce(
      (count, material) => count + material.files.length,
      0,
    ),
    materials: generatedMaterials,
  };
  const manifestBuffer = Buffer.from(
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    join(outputDirectory, "texture-manifest.json"),
    manifestBuffer,
  );

  process.stdout.write(
    `${JSON.stringify(
      {
        outputDirectory,
        manifestSha256: sha256(manifestBuffer),
        ...manifest,
      },
      null,
      2,
    )}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
