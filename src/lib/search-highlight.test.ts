import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { highlightMatch } from "./search-highlight.ts";

describe("highlightMatch", () => {
  it("devuelve null sin consulta", () => {
    assert.equal(highlightMatch("Depto 3", ""), null);
  });

  it("ignora mayúsculas y diacríticos", () => {
    assert.deepEqual(highlightMatch("Departamento Roma", "dep"), {
      before: "",
      hit: "Dep",
      after: "artamento Roma",
    });
    assert.deepEqual(highlightMatch("Accesoria Ñuñoa", "nuno"), {
      before: "Accesoria ",
      hit: "Ñuño",
      after: "a",
    });
  });

  it("ignora signos al buscar pero respeta el texto original", () => {
    assert.deepEqual(highlightMatch("Interior 3, Roma Norte", "3 roma"), {
      before: "Interior ",
      hit: "3, Roma",
      after: " Norte",
    });
  });

  it("devuelve null si no hay coincidencia", () => {
    assert.equal(highlightMatch("Depto 3", "xochimilco"), null);
  });

  it("colapsa espacios repetidos sin perder el índice", () => {
    assert.deepEqual(highlightMatch("Depto   3", "3"), {
      before: "Depto ",
      hit: "3",
      after: "",
    });
  });
});
