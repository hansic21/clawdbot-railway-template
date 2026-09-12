import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// 2026-09-13 인시던트 회귀 가드.
// 게이트웨이 자식이 죽어도 PID1은 살아 있어서 Railway restartPolicy가 발동하지 않는다.
// 재기동 기계는 이미 있었고 exit 이벤트가 그것을 부르지 않은 것이 결함이었다.
// 슬랙 9봇이 6시간 26분 침묵했다.
const src = fs.readFileSync(new URL("../src/server.js", import.meta.url), "utf8");

test("게이트웨이 exit이 재기동을 예약한다", () => {
  const exitHandler = src.match(/gatewayProc\.on\("exit"[\s\S]*?\n  \}\);/);
  assert.ok(exitHandler, "exit 핸들러를 찾지 못했다");
  assert.match(
    exitHandler[0],
    /scheduleGatewayRespawn\(/,
    "exit 핸들러가 재기동을 예약하지 않는다 - 2026-09-13 인시던트 재발 조건",
  );
});

test("재기동에 백오프와 상한이 있다", () => {
  assert.match(src, /RESPAWN_MAX_ATTEMPTS/);
  assert.match(src, /respawnHalted = true/, "크래시 루프 차단이 없다");
  assert.match(src, /Math\.min\(RESPAWN_BASE_MS \* 2 \*\* /, "지수 백오프가 없다");
});

test("의도적 중단은 되살리지 않는다", () => {
  assert.match(src, /function stopGatewayIntentionally\(\)/);
  assert.match(src, /suppressRespawnUntil/);
  // 모든 의도적 kill은 억제기를 거쳐야 한다.
  const rawKills = src.match(/gatewayProc\.kill\("SIGTERM"\)/g) || [];
  assert.equal(
    rawKills.length,
    1,
    `SIGTERM 직접 호출은 stopGatewayIntentionally 안에 1개만 있어야 한다 (발견: ${rawKills.length})`,
  );
});

test("/healthz는 게이트웨이가 죽으면 503을 돌려준다", () => {
  assert.match(src, /res\.status\(degraded \? 503 : 200\)/);
  assert.match(src, /const degraded = isConfigured\(\) && !gatewayReachable/);
});
