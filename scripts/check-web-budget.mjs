import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const bundleDirectory = new URL("../apps/product/dist/_expo/static/js/web/", import.meta.url);
const entries = (await readdir(bundleDirectory)).filter(
  (name) => name.startsWith("entry-") && name.endsWith(".js"),
);

if (entries.length !== 1) {
  throw new Error(`Expected one web entry bundle, found ${entries.length}. Run pnpm build first.`);
}

const bundle = await readFile(join(bundleDirectory.pathname, entries[0]));
const gzipBytes = gzipSync(bundle, { level: 9 }).byteLength;
const rawLimit = 2_800_000;
const gzipLimit = 625_000;

process.stdout.write(
  `Web entry: ${bundle.byteLength.toLocaleString()} raw bytes, ${gzipBytes.toLocaleString()} gzip bytes.\n`,
);

if (bundle.byteLength > rawLimit || gzipBytes > gzipLimit) {
  process.stderr.write(
    `Web entry exceeds its ${rawLimit.toLocaleString()} raw / ${gzipLimit.toLocaleString()} gzip byte budget.\n`,
  );
  process.exit(1);
}
