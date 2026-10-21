import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseImageInfo } from "../scripts/fetch-photo.mjs";

const fixture = () =>
  JSON.parse(readFileSync(new URL("./fixtures/commons-imageinfo.json", import.meta.url), "utf8"));

const firstInfo = (json) => Object.values(json.query.pages)[0].imageinfo[0];

test("parses the real Commons fixture", () => {
  const p = parseImageInfo(fixture());
  assert.ok(p.author.length > 0);
  assert.ok(!p.author.includes("<"));
  assert.match(p.license, /CC|Public domain|PD/);
  assert.match(p.thumbUrl, /^https:\/\//);
  assert.match(p.source, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
});

test("rejects a non-free license", () => {
  const json = fixture();
  firstInfo(json).extmetadata.LicenseShortName.value = "All rights reserved";
  assert.throws(() => parseImageInfo(json), /license/i);
});

test("rejects NC, ND and GFDL-only licenses", () => {
  for (const lic of ["CC BY-NC 2.0", "CC BY-ND 4.0", "GFDL 1.2"]) {
    const json = fixture();
    firstInfo(json).extmetadata.LicenseShortName.value = lic;
    assert.throws(() => parseImageInfo(json), /license/i, lic);
  }
});

test("accepts CC0, Public domain and PD-* licenses", () => {
  for (const lic of ["CC0", "Public domain", "PD-old-70", "CC BY 4.0", "CC BY-SA 3.0"]) {
    const json = fixture();
    firstInfo(json).extmetadata.LicenseShortName.value = lic;
    assert.equal(parseImageInfo(json).license, lic);
  }
});
