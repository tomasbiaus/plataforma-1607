\set ON_ERROR_STOP 1
-- Datos de prueba (como superusuario)
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-00000000000a','tomas@1607studio.com'),
 ('00000000-0000-0000-0000-00000000000b','matias@1607studio.com'),
 ('00000000-0000-0000-0000-00000000000c','meso@cliente.com'),
 ('00000000-0000-0000-0000-00000000000d','jack@cliente.com');
insert into clientes (id, clave, nombre) values ('10000000-0000-0000-0000-000000000001','meso','Meso'),('10000000-0000-0000-0000-000000000002','jack','Jack Tower');
update profiles set rol='admin', nombre='Tomás' where email='tomas@1607studio.com';
update profiles set rol='equipo', nombre='Matías' where email='matias@1607studio.com';
update profiles set cliente_id='10000000-0000-0000-0000-000000000001' where email='meso@cliente.com';
update profiles set cliente_id='10000000-0000-0000-0000-000000000002' where email='jack@cliente.com';
insert into proyectos (id, clave, cliente_id, nombre, etapa) values
 ('20000000-0000-0000-0000-000000000001','meso','10000000-0000-0000-0000-000000000001','Rebranding Meso',2),
 ('20000000-0000-0000-0000-000000000002','jack','10000000-0000-0000-0000-000000000002','Identidad Jack Tower',4);
insert into proyecto_equipo values ('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000a'),('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000b');
insert into entregas (id, proyecto_id, titulo, etapa, estado) values
 ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Concepto A','Concepto','enviado'),
 ('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','Concepto B','Concepto','enviado'),
 ('30000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001','Sistema visual','Diseño','interno'),
 ('30000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000002','Papelería','Revisiones','enviado');
insert into tareas (id, proyecto_id, titulo, privada) values ('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Tarea normal',false),('40000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','Cobro privado',true);
insert into tareas (id, proyecto_id, titulo, etapa) values ('40000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000002','Única de revisiones','Revisiones');
insert into cuotas (proyecto_id, orden, concepto, pct, monto, estado) values ('20000000-0000-0000-0000-000000000001',1,'Anticipo',50,950,'pagado');

create or replace function pg_temp.como(uid text) returns void language plpgsql as $$ begin
  perform set_config('request.jwt.claim.sub', uid, false); end $$;
grant execute on function pg_temp.como(text) to authenticated;

-- ===== Matías (equipo)
select pg_temp.como('00000000-0000-0000-0000-00000000000b'); set role authenticated;
select 'matias proyectos' t, count(*) from proyectos;
select 'matias tareas (sin privadas)' t, count(*) from tareas;
select 'matias cuotas' t, count(*) from cuotas;
select 'matias entregas' t, count(*) from entregas;
do $$ begin perform numeros_abrir('x'); raise notice 'FALLA: matias abrió numeros'; exception when others then raise notice 'ok matias no puede abrir Números: %', sqlerrm; end $$;
do $$ begin update profiles set rol='admin' where id=auth.uid(); raise notice 'FALLA: matias se hizo admin'; exception when others then raise notice 'ok matias no puede cambiarse el rol: %', sqlerrm; end $$;
do $$ begin insert into tareas (titulo, privada) values ('x', true); raise notice 'FALLA: matias creó privada'; exception when others then raise notice 'ok matias no crea privadas'; end $$;
reset role;

-- ===== Cliente Meso
select pg_temp.como('00000000-0000-0000-0000-00000000000c'); set role authenticated;
select 'meso proyectos' t, count(*) from proyectos;
select 'meso entregas visibles (sin internas)' t, count(*) from entregas;
select 'meso tareas' t, count(*) from tareas;
select 'meso actividad' t, count(*) from actividad;
select 'meso cuotas' t, count(*) from cuotas;
select 'meso clientes' t, count(*) from clientes;
do $$ begin perform responder_entrega('30000000-0000-0000-0000-000000000004', true); raise notice 'FALLA: meso respondió entrega de jack'; exception when others then raise notice 'ok meso no toca a Jack: %', sqlerrm; end $$;
do $$ begin update entregas set estado='aprobado'; raise notice 'filas que meso pudo editar directo: %', (select count(*) from entregas where estado='aprobado'); end $$;
select responder_entrega('30000000-0000-0000-0000-000000000001', true, 'Elegimos este');
reset role;
select 'tras elegir: etapa meso' t, etapa from proyectos where clave='meso';
select 'tras elegir: entregas' t, titulo, estado from entregas where proyecto_id='20000000-0000-0000-0000-000000000001' order by titulo;
select 'tareas auto' t, titulo, privada from tareas where proyecto_id='20000000-0000-0000-0000-000000000001' order by titulo;
select 'actividad' t, tipo, texto from actividad order by id;

-- ===== Tomás (admin) y Números
select pg_temp.como('00000000-0000-0000-0000-00000000000a'); set role authenticated;
select 'tomas tareas (con privadas)' t, count(*) from tareas;
select 'tomas cuotas antes de abrir' t, count(*) from cuotas;
select 'estado' t, numeros_estado();
select numeros_crear_clave('secreto1607');
select 'tomas cuotas abierto' t, count(*) from cuotas;
select numeros_cerrar();
select 'tomas cuotas cerrado' t, count(*) from cuotas;
select 'clave mal' t, numeros_abrir('mal');
select 'clave bien' t, numeros_abrir('secreto1607');
select 'tomas cuotas reabierto' t, count(*) from cuotas;
do $$ begin perform * from numeros_clave; raise notice 'FALLA: tomas lee el hash'; exception when others then raise notice 'ok nadie lee el hash: %', sqlerrm; end $$;
-- etapa completa
select estado_tarea('40000000-0000-0000-0000-000000000003', 'hecha');
reset role;
select 'jack tras completar revisiones' t, etapa from proyectos where clave='jack';
select 'tareas privadas de jack' t, titulo from tareas where proyecto_id='20000000-0000-0000-0000-000000000002' and privada;
