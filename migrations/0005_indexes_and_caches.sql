-- Índices de consulta y cachés de fuentes públicas (sin llave ni registro).

-- Resumen anual de cobros (listPortfolio: sum(centavos) por user_id + anio) y
-- la línea de tiempo de ingresos (listIncomeTimeline). El índice único
-- (user_id, apartment_id, anio, mes) no cubre la agregación por (user_id, anio)
-- porque apartment_id va antes que anio en la llave.
create index if not exists receipts_user_anio_idx on receipts (user_id, anio);

-- Caché del tipo de cambio USD/MXN. Fuentes públicas sin llave: la API pública
-- de GitHub (repositorio AllRates-Today/central-bank-exchange-rates, datos
-- oficiales de Banxico, licencia CC BY 4.0) y Frankfurter (datos del BCE).
-- El TTL se controla en src/lib/exchange.functions.ts.
create table if not exists exchange_cache (
  pair text primary key,
  rate numeric not null,
  source text not null default '',
  source_label text not null default '',
  rate_date text not null default '',
  fetched_at timestamptz not null default now()
);
