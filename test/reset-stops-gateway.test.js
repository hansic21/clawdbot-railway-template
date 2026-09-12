import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("reset handler stops gateway before deleting config", () => {
  const src = fs.readFileSync(new URL("../src/server.js", import.meta.url), "utf8");
  const idx = src.indexOf('app.post("/setup/api/reset"');
  assert.ok(idx >= 0);
  const window = src.slice(idx, idx + 900);
  // 2026-09-13: 중단은 stopGatewayIntentionally()를 거친다 (supervisor 자동 재기동 억제).
  // 구현 문자열이 아니라 "리셋이 게이트웨이를 멈춘다"는 의도를 검사한다.
  assert.match(window, /stopGatewayIntentionally\(\)|gatewayProc\.kill\("SIGTERM"\)/);
});
