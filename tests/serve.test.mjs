import { test } from "node:test";
import assert from "node:assert/strict";
import { isServable } from "../scripts/serve.mjs";

test("dot-folder paths are blocked", () => {
  assert.equal(isServable("/.git/config"), false);
  assert.equal(isServable("/.superpowers/x.html"), false);
  assert.equal(isServable("/css/.hidden"), false);
});

test("normal paths are allowed", () => {
  assert.equal(isServable("/css/paper.css"), true);
  assert.equal(isServable("/"), true);
});
