# Configuração de Cron Jobs - Após o Remix

Este projeto possui duas edge functions que devem ser executadas periodicamente via cron jobs:

## 1. Função: `proposal-auto-complete`
**Propósito:** Completa automaticamente propostas onde o prazo de confirmação do owner expirou.

**Frequência recomendada:** A cada 15 minutos

## 2. Função: `cleanup-orphaned-documents`
**Propósito:** Remove documentos de verificação órfãos e antigos do storage.

**Frequência recomendada:** 1x por dia (às 03:00 AM)

---

## Como Configurar os Cron Jobs (Após o Remix)

### Pré-requisitos
1. As edge functions já estão no projeto e serão implantadas automaticamente
2. Você precisa ter acesso ao SQL Editor do seu projeto Supabase

### Passo 1: Habilitar Extensões (Executar uma única vez)
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

**Nota:** Se você não tiver permissões de superusuário, pode pular este passo - as extensões provavelmente já estão habilitadas no Supabase.

### Passo 2: Obter suas Credenciais
Vá até as variáveis de ambiente do seu projeto e copie:
- `VITE_SUPABASE_URL` (exemplo: `https://seu-project-ref.supabase.co`)
- `VITE_SUPABASE_PUBLISHABLE_KEY` (sua chave anon)

### Passo 3: Agendar os Cron Jobs

**Importante:** Substitua `<SEU_PROJECT_REF>` e `<SUA_ANON_KEY>` pelos valores reais do seu projeto.

```sql
-- Cron Job 1: Auto-completar propostas (a cada 15 minutos)
SELECT cron.schedule(
  'auto-complete-proposals-every-15min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://<SEU_PROJECT_REF>.supabase.co/functions/v1/proposal-auto-complete',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <SUA_ANON_KEY>"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) as request_id;
  $$
);

-- Cron Job 2: Limpar documentos órfãos (diariamente às 03:00)
SELECT cron.schedule(
  'cleanup-orphaned-documents-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://<SEU_PROJECT_REF>.supabase.co/functions/v1/cleanup-orphaned-documents',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <SUA_ANON_KEY>"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) as request_id;
  $$
);
```

### Passo 4: Verificar se os Cron Jobs Foram Criados
```sql
SELECT jobid, schedule, command 
FROM cron.job 
ORDER BY jobid DESC;
```

Você deve ver os dois jobs listados.

### Passo 5: Testar Manualmente (Opcional)
```sql
-- Testar a função de auto-completar propostas
SELECT net.http_post(
  url := 'https://<SEU_PROJECT_REF>.supabase.co/functions/v1/proposal-auto-complete',
  headers := '{"Content-Type": "application/json", "Authorization": "Bearer <SUA_ANON_KEY>"}'::jsonb,
  body := '{"test": true}'::jsonb
) as request_id;
```

---

## Troubleshooting

### Erro: "permission denied to create extension pg_cron"
Isso significa que você não tem privilégios de superusuário. **Não é um problema!** As extensões `pg_cron` e `pg_net` já estão habilitadas por padrão no Supabase. Pule para o Passo 2.

### Erro: "function cron.schedule does not exist"
Isso significa que a extensão `pg_cron` não está habilitada. Entre em contato com o suporte do Supabase ou seu administrador de banco de dados.

### Como Remover um Cron Job
```sql
SELECT cron.unschedule('nome-do-job');
```

### Como Ver os Logs de Execução
```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = <ID_DO_SEU_JOB>
ORDER BY start_time DESC 
LIMIT 10;
```

---

## Alternativa: Execução Manual Temporária

Se você não conseguir configurar os cron jobs imediatamente, pode executar as funções manualmente via:

1. **API REST (curl):**
```bash
curl -X POST \
  'https://<SEU_PROJECT_REF>.supabase.co/functions/v1/proposal-auto-complete' \
  -H 'Authorization: Bearer <SUA_ANON_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{"time": "2024-01-01T00:00:00Z"}'
```

2. **Agendador externo:** Use um serviço como GitHub Actions, Vercel Cron, ou qualquer outro agendador de tarefas para chamar as edge functions via HTTP.
