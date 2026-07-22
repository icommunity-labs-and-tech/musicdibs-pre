-- Solicitado tras ticket de leandrogladiadores@outlook.com: el usuario no
-- tenia forma de ver cuando se iba a publicar su promocion premium ya
-- aprobada. Se anade un campo de fecha programada, editable a mano por un
-- admin (via SQL/service role por ahora, sin panel UI dedicado), visible
-- para el usuario en su historial de promos premium.
alter table premium_social_promotions
  add column if not exists scheduled_publish_date date;

comment on column premium_social_promotions.scheduled_publish_date is
  'Fecha estimada de publicacion de la promocion, editada a mano por un admin (equipo de marketing). Visible para el usuario en su historial de promos premium.';
