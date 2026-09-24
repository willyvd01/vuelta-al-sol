-- Fase 10a: permite ocultar, solo en el calendario impreso, la silueta de
-- las casillas vacías de la rejilla de 9. En el álbum digital esas casillas
-- siempre se muestran (son la forma de agregar gente), así que esto no
-- afecta nada ahí.
alter table public.familias
  add column mostrar_siluetas_impresas boolean not null default true;
