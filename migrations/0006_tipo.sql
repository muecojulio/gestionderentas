-- Tipo de propiedad: departamento (por defecto) o accesoria.
alter table apartments add column if not exists tipo text not null default 'departamento' check (tipo in ('departamento', 'accesoria'));
create index if not exists apartments_user_tipo_idx on apartments (user_id, tipo);
