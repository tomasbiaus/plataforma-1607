-- Prueba de notificaciones (correr sobre la base de prueba con seed e2e)
\set ON_ERROR_STOP 1
create or replace function pg_temp.como(uid text) returns void language plpgsql as $$ begin
  perform set_config('request.jwt.claim.sub', uid, false); end $$;
grant execute on function pg_temp.como(text) to authenticated;
update public.avisos_config set slack_url = 'https://hooks.slack.com/services/PRUEBA' where id = 1;

-- Tomás le asigna a Matías la tarea de Jack
select pg_temp.como('00000000-0000-0000-0000-00000000000a'); set role authenticated;
insert into tarea_responsables (tarea_id, profile_id) select id, '00000000-0000-0000-0000-00000000000b' from tareas where titulo = 'Propuestas gráficas Jack';
select estado_tarea((select id from tareas where titulo = 'Propuestas gráficas Jack'), 'hecha');
update tareas set prioridad = 'baja' where titulo = 'Propuestas gráficas Jack';
reset role;
select 'Matías recibe: ' || string_agg(tipo || ' | ' || texto, E'\n                ' order by creado) from notificaciones where para = '00000000-0000-0000-0000-00000000000b';
select 'Tomás (actor) no recibe nada: ' || count(*) from notificaciones where para = '00000000-0000-0000-0000-00000000000a';

-- Matías intenta leer avisos ajenos
select pg_temp.como('00000000-0000-0000-0000-00000000000b'); set role authenticated;
select 'Matías ve ' || count(*) || ' avisos (los suyos)' from notificaciones;
select 'Matías no ve config Slack: ' || count(*) from avisos_config;
do $$ begin perform avisos_slack('https://hooks.slack.com/x'); raise exception 'NO DEBERÍA'; exception when others then if sqlerrm = 'NO DEBERÍA' then raise; end if; end $$;
reset role;

-- Meso: se le envía el Brief y lo aprueba
update entregas set estado = 'enviado' where titulo = 'Brief estratégico' and proyecto_id = (select id from proyectos where clave = 'meso');
select pg_temp.como('00000000-0000-0000-0000-00000000000c'); set role authenticated;
select responder_entrega((select id from entregas where titulo = 'Brief estratégico' and proyecto_id = (select id from proyectos where clave = 'meso')), true, 'Nos encantó!');
reset role;
select 'Aviso cliente → ' || string_agg(p.nombre || ': ' || n.texto || ' / ' || coalesce(n.detalle, ''), ' | ') from notificaciones n join profiles p on p.id = n.para where n.tipo = 'cliente';
