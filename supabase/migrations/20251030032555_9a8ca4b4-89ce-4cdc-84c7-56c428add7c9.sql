-- Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Configurar cron job para executar a cada 15 minutos
SELECT cron.schedule(
  'auto-complete-proposals-every-15min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://bvjulkcmzfzyfwobwlnx.supabase.co/functions/v1/proposal-auto-complete',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2anVsa2NtemZ6eWZ3b2J3bG54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDg4OTgsImV4cCI6MjA3NTQyNDg5OH0.xtitLE6re52Uqwnu36Rr4STTcoZNR8S0SoqOsd7sxxc"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);