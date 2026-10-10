-- Cambios de renta al cumplirse un año de contrato.

create table if not exists rent_adjustments (
  id text primary key,
  user_id text not null,
  apartment_id text not null,
  anterior_centavos integer not null,
  nuevo_centavos integer not null,
  vigente_desde text not null,
  created_at timestamptz not null default now()
);

create index if not exists rent_adjustments_user_apt_idx
  on rent_adjustments (user_id, apartment_id, vigente_desde);
