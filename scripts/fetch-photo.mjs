import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const USER_AGENT = "flora-dictionary/1.0 (personal study site)";
const ALLOWED_LICENSE = /^(CC0|Public domain|PD-.*|CC BY(-SA)?( .*)?)$/i;
const PARTS = ["flowers", "scents"];

export function parseImageInfo(apiJson) {
  const page = Object.values(apiJson?.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  if (!info) throw new Error("no imageinfo in response (file not found?)");
  const meta = info.extmetadata ?? {};

  const license = String(meta.LicenseShortName?.value ?? "").trim();
  if (!ALLOWED_LICENSE.test(license)) {
    throw new Error(`license not allowed: "${license}"`);
  }

  const author = String(meta.Artist?.value ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!author) throw new Error("author is empty");

  return {
    thumbUrl: info.thumburl,
    author,
    license,
    licenseUrl: meta.LicenseUrl?.value ?? "",
    source: info.descriptionurl,
  };
}

async function get(url) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res;
}

async function main() {
  const [part, id, title] = process.argv.slice(2);
  if (!PARTS.includes(part) || !id || !title) {
    console.error('usage: node scripts/fetch-photo.mjs <flowers|scents> <id> "File:Title.jpg"');
    process.exit(2);
  }
  const api =
    "https://commons.wikimedia.org/w/api.php?action=query&titles=" +
    encodeURIComponent(title) +
    "&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=320&format=json";
  const { thumbUrl, ...meta } = parseImageInfo(await (await get(api)).json());

  const bytes = Buffer.from(await (await get(thumbUrl)).arrayBuffer());
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const rel = `images/${part}/${id}.jpg`;
  await mkdir(join(root, "images", part), { recursive: true });
  await writeFile(join(root, rel), bytes);

  console.log(JSON.stringify({ file: rel, ...meta }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
