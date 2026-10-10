-- Departamentos, estancias, lista de no rentar, cobros e índice de feriados.
-- Cada fila de negocio pertenece a un user_id verificado en el servidor.

create table if not exists apartments (
  id text primary key,
  user_id text not null,
  nombre text not null,
  direccion text not null default '',
  foto text,
  medidor_luz text not null default '',
  medidor_agua text not null default '',
  nota_servicios text not null default '',
  luz_dia integer,
  luz_centavos integer,
  agua_dia integer,
  agua_centavos integer,
  renta_centavos integer,
  inquilino text not null default '',
  telefono text not null default '',
  dia_pago integer,
  contrato_inicio text,
  contrato_fin text,
  ingreso text,
  ocupado boolean not null default false,
  notas text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists apartments_user_idx on apartments (user_id);
create index if not exists apartments_user_ocupado_idx on apartments (user_id, ocupado);
create index if not exists apartments_user_fin_idx on apartments (user_id, contrato_fin);

create table if not exists tenancies (
  id text primary key,
  user_id text not null,
  apartment_id text not null,
  inquilino text not null default '',
  renta_centavos integer,
  inicio text,
  fin text,
  created_at timestamptz not null default now()
);

create index if not exists tenancies_user_apt_idx on tenancies (user_id, apartment_id);

create table if not exists blacklist (
  id text primary key,
  user_id text not null,
  nombre text not null,
  telefono text not null default '',
  motivo text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists blacklist_user_idx on blacklist (user_id);
create index if not exists blacklist_user_nombre_idx on blacklist (user_id, nombre);

create table if not exists receipts (
  id text primary key,
  user_id text not null,
  apartment_id text not null,
  anio integer not null,
  mes integer not null,
  centavos integer not null,
  recibido_el text not null,
  unique (user_id, apartment_id, anio, mes)
);

create index if not exists receipts_user_period_idx on receipts (user_id, anio, mes);

create table if not exists holiday_cache (
  anio integer primary key,
  payload text not null,
  fetched_at timestamptz not null default now()
);
