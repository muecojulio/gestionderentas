-- Depósito en garantía de la estancia actual y de las ya cerradas.

alter table apartments add column if not exists deposito_centavos integer;
alter table apartments add column if not exists deposito_fecha text;
alter table apartments add column if not exists deposito_estado text;
alter table apartments add column if not exists deposito_nota text not null default '';

alter table tenancies add column if not exists deposito_centavos integer;
alter table tenancies add column if not exists deposito_fecha text;
alter table tenancies add column if not exists deposito_estado text;
alter table tenancies add column if not exists deposito_nota text not null default '';
