import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.env.PROFILE_REVIEW_ROOT ?? process.cwd());
const directory = resolve(root, "src/data/profile");
const receiptPath = resolve(root, "docs/professional-record-review.json");
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Budapest",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const files = readdirSync(directory)
  .filter((name) => name.endsWith(".json"))
  .sort();
const hashes = Object.fromEntries(
  files.map((name) => [
    name,
    createHash("sha256")
      .update(JSON.stringify(readJson(resolve(directory, name))))
      .digest("hex"),
  ]),
);
const failures = [];
if (existsSync(resolve(root, "content/profile.json")))
  failures.push(
    "A second editable professional record exists at content/profile.json.",
  );
if (existsSync(resolve(root, "scripts/build.py")))
  failures.push(
    "The retired generator must not be restored as a second authoring path.",
  );
const [settings] = readJson(resolve(directory, "site-settings.json"));
if (settings.sourcePolicy.primarySource !== "src/data/profile/")
  failures.push(
    "The declared canonical source differs from the production loader.",
  );
if (process.argv.includes("--record")) {
  const reviewedOn = process.argv
    .find((arg) => arg.startsWith("--reviewed-on="))
    ?.split("=")[1];
  if (
    !reviewedOn ||
    !/^\d{4}-\d{2}-\d{2}$/.test(reviewedOn) ||
    !Number.isFinite(Date.parse(reviewedOn)) ||
    new Date(reviewedOn).toISOString().slice(0, 10) !== reviewedOn ||
    reviewedOn > today
  ) {
    failures.push(
      "Record a real completed review with --reviewed-on=YYYY-MM-DD, not a future or invalid date.",
    );
  }
  if (failures.length === 0) {
    writeFileSync(
      receiptPath,
      JSON.stringify(
        {
          schemaVersion: 1,
          canonicalRoot: "src/data/profile/",
          reviewedOn,
          sourceHashes: hashes,
        },
        null,
        2,
      ) + "\n",
    );
    console.log(
      "Recorded professional-record review; no profile facts were changed.",
    );
  }
} else {
  if (!existsSync(receiptPath))
    failures.push("The professional-record review receipt is missing.");
  else {
    const receipt = readJson(receiptPath);
    const reviewTime = Date.parse(receipt.reviewedOn);
    if (
      receipt.schemaVersion !== 1 ||
      receipt.canonicalRoot !== "src/data/profile/"
    )
      failures.push("Invalid professional-record receipt contract.");
    if (
      !Number.isFinite(reviewTime) ||
      receipt.reviewedOn > today ||
      Date.parse(today) - reviewTime > 90 * 86400000
    )
      failures.push(
        "The professional-record review is invalid, future-dated or more than 90 days old.",
      );
    if (JSON.stringify(receipt.sourceHashes) !== JSON.stringify(hashes))
      failures.push(
        "The professional record changed after review. Reconcile site, document selections and evidence, then run pnpm review:record --reviewed-on=YYYY-MM-DD.",
      );
  }
}
if (failures.length) {
  for (const failure of failures) console.error(failure);
  process.exitCode = 1;
} else
  console.log("Professional-record authority and freshness checks passed.");
