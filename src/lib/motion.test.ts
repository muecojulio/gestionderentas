import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isSwipeCommitted, resolveSwipeAxis } from "./motion.ts";

describe("gestos horizontales", () => {
  it("espera una distancia mínima antes de decidir el eje", () => {
    assert.equal(resolveSwipeAxis(7, 2), null);
    assert.equal(resolveSwipeAxis(8, 8), "y");
  });

  it("solo bloquea el eje horizontal cuando predomina claramente", () => {
    assert.equal(resolveSwipeAxis(15, 10), "x");
    assert.equal(resolveSwipeAxis(10, 9), "y");
    assert.equal(resolveSwipeAxis(4, 14), "y");
  });

  it("confirma un arrastre por distancia o un flick rápido en la misma dirección", () => {
    assert.equal(isSwipeCommitted(-64, 0, 60), true);
    assert.equal(isSwipeCommitted(-40, -0.7, 60), true);
    assert.equal(isSwipeCommitted(-40, -0.3, 60), false);
    assert.equal(isSwipeCommitted(-40, 0.8, 60), false);
  });
});
