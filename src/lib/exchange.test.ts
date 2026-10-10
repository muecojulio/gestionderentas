import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  centavosToUsd,
  formatRate,
  formatUsd,
  parseBanxicoLatest,
  parseFrankfurterLatest,
} from "./exchange.ts";

function githubEnvelope(payload: unknown) {
  return {
    encoding: "base64",
    content: Buffer.from(JSON.stringify(payload), "utf8").toString("base64"),
  };
}

const banxicoPayload = {
  source: "banxico",
  date: "2026-10-09",
  rates: [
    { base: "EUR", quote: "MXN", type: "informational", value: 20.6419 },
    { base: "USD", quote: "MXN", type: "close", value: 18.4111 },
    { base: "USD", quote: "MXN", type: "reference", value: 18.4163 },
  ],
};

describe("parseBanxicoLatest", () => {
  it("elige la tasa de referencia USD→MXN del dataset de Banxico", () => {
    const quote = parseBanxicoLatest(githubEnvelope(banxicoPayload));
    assert.equal(quote?.rate, 18.4163);
    assert.equal(quote?.rateDate, "2026-10-09");
    assert.match(quote?.source ?? "", /Banxico/);
    assert.match(quote?.source ?? "", /CC BY 4.0/);
  });

  it("acepta la tasa de cierre cuando no hay referencia", () => {
    const payload = {
      date: "2026-10-09",
      rates: [{ base: "USD", quote: "MXN", type: "close", value: 18.4111 }],
    };
    assert.equal(parseBanxicoLatest(githubEnvelope(payload))?.rate, 18.4111);
  });

  it("tolera saltos de línea en el base64 de la API de GitHub", () => {
    const envelope = githubEnvelope(banxicoPayload);
    const withBreaks = { ...envelope, content: envelope.content.replace(/(.{60})/g, "$1\n") };
    assert.equal(parseBanxicoLatest(withBreaks)?.rate, 18.4163);
  });

  it("rechaza formatos inesperados", () => {
    assert.equal(parseBanxicoLatest(null), null);
    assert.equal(parseBanxicoLatest({}), null);
    assert.equal(parseBanxicoLatest({ encoding: "base64", content: "!!!" }), null);
    assert.equal(parseBanxicoLatest(githubEnvelope({ rates: "nope" })), null);
    assert.equal(
      parseBanxicoLatest(githubEnvelope({ rates: [{ base: "USD", quote: "MXN", value: -5 }] })),
      null,
    );
  });
});

describe("parseFrankfurterLatest", () => {
  it("lee la tasa MXN de la respuesta del BCE", () => {
    const quote = parseFrankfurterLatest({ base: "USD", date: "2026-10-09", rates: { MXN: 18.42 } });
    assert.equal(quote?.rate, 18.42);
    assert.equal(quote?.rateDate, "2026-10-09");
    assert.match(quote?.source ?? "", /Banco Central Europeo/);
  });

  it("rechaza respuestas sin tasa", () => {
    assert.equal(parseFrankfurterLatest(null), null);
    assert.equal(parseFrankfurterLatest({ rates: {} }), null);
    assert.equal(parseFrankfurterLatest({ rates: { MXN: "x" } }), null);
  });
});

describe("formato y conversión", () => {
  it("formatea la tasa con dos decimales", () => {
    assert.equal(formatRate(18.4163), "18.42");
  });

  it("convierte centavos a dólares y los formatea", () => {
    assert.ok(Math.abs(centavosToUsd(184_163, 18.4163) - 100) < 1e-9);
    // 1,841,630 centavos = $18,416.30 MXN ≈ 1,000 USD.
    assert.match(formatUsd(1_841_630, 18.4163), /USD\s?1,000/);
    assert.match(formatUsd(184_163, 18.4163), /USD\s?100/);
    // Sin tasa válida no divide entre cero.
    assert.equal(centavosToUsd(1000, 0), 0);
    assert.match(formatUsd(1000, 0), /USD\s?0/);
  });
});
