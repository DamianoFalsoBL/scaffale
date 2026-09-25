-- Classics have publication years well before 1800 (Open Library reports e.g. 1300s),
-- and ancient works can even be BCE. Keep only a sanity bound.
alter table public.media_items drop constraint media_items_year_check;
alter table public.media_items
  add constraint media_items_year_check check (year between -3000 and 3000);
