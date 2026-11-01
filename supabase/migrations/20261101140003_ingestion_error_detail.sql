-- Error details are deliberately kept null by the worker to avoid storing source text.
alter table public.ingestion_jobs add column if not exists error_detail text;
