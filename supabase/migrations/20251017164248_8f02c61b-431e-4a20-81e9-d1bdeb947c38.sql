-- Criar função para aplicar bloqueio progressivo do sistema
CREATE OR REPLACE FUNCTION apply_progressive_system_block(
  p_profile_id UUID,
  p_violation_category TEXT,
  p_reason TEXT
)
RETURNS TABLE(
  blocked BOOLEAN,
  block_duration_hours INTEGER,
  blocked_until TIMESTAMP WITH TIME ZONE,
  violation_count INTEGER,
  block_message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today_start TIMESTAMP WITH TIME ZONE;
  v_today_violations INTEGER;
  v_block_hours INTEGER;
  v_blocked_until TIMESTAMP WITH TIME ZONE;
  v_block_message TEXT;
  v_is_severe BOOLEAN;
BEGIN
  -- Definir início do dia (00:00)
  v_today_start := DATE_TRUNC('day', NOW());
  
  -- Categorias graves que acionam bloqueio do sistema
  v_is_severe := p_violation_category IN ('profanity', 'explicit_content', 'harassment');
  
  -- Se não é violação grave, não bloqueia o sistema
  IF NOT v_is_severe THEN
    RETURN QUERY SELECT 
      FALSE::BOOLEAN,
      0::INTEGER,
      NULL::TIMESTAMP WITH TIME ZONE,
      0::INTEGER,
      NULL::TEXT;
    RETURN;
  END IF;
  
  -- Contar violações graves no dia atual
  SELECT COUNT(*)
  INTO v_today_violations
  FROM moderation_violations mv
  JOIN blocked_messages bm ON bm.profile_id = mv.profile_id
  WHERE mv.profile_id = p_profile_id
    AND bm.created_at >= v_today_start
    AND bm.moderation_category IN ('profanity', 'explicit_content', 'harassment');
  
  -- Definir duração do bloqueio baseado no número de violações
  CASE 
    WHEN v_today_violations = 0 THEN
      -- Primeira violação: sem bloqueio, só aviso
      v_block_hours := 0;
      v_block_message := 'Primeiro aviso. Comportamento inadequado não será tolerado.';
      
    WHEN v_today_violations = 1 THEN
      -- Segunda violação: bloqueio de 1 hora
      v_block_hours := 1;
      v_block_message := 'Conta bloqueada por 1 hora devido a comportamento inadequado repetido.';
      
    WHEN v_today_violations = 2 THEN
      -- Terceira violação: bloqueio de 6 horas
      v_block_hours := 6;
      v_block_message := 'Conta bloqueada por 6 horas. Esta é sua última chance antes de bloqueio de 1 dia.';
      
    WHEN v_today_violations = 3 THEN
      -- Quarta violação: bloqueio de 24 horas (1 dia)
      v_block_hours := 24;
      v_block_message := 'Conta bloqueada por 24 horas devido a múltiplas violações graves.';
      
    ELSE
      -- 5+ violações: bloqueio de 7 dias
      v_block_hours := 168; -- 7 dias = 168 horas
      v_block_message := 'Conta bloqueada por 7 dias devido a violações graves repetidas.';
  END CASE;
  
  -- Se deve bloquear, aplicar bloqueio
  IF v_block_hours > 0 THEN
    v_blocked_until := NOW() + (v_block_hours || ' hours')::INTERVAL;
    
    -- Inserir ou atualizar bloqueio do sistema
    INSERT INTO system_blocks (
      profile_id,
      block_type,
      reason,
      blocked_until,
      is_permanent,
      created_at
    )
    VALUES (
      p_profile_id,
      'messaging',
      v_block_message || ' Motivo: ' || p_reason,
      v_blocked_until,
      FALSE,
      NOW()
    )
    ON CONFLICT (profile_id, block_type) 
    DO UPDATE SET
      reason = EXCLUDED.reason,
      blocked_until = EXCLUDED.blocked_until,
      created_at = NOW();
    
    RETURN QUERY SELECT 
      TRUE::BOOLEAN,
      v_block_hours,
      v_blocked_until,
      v_today_violations + 1,
      v_block_message;
  ELSE
    -- Não bloqueia, mas retorna aviso
    RETURN QUERY SELECT 
      FALSE::BOOLEAN,
      0::INTEGER,
      NULL::TIMESTAMP WITH TIME ZONE,
      v_today_violations + 1,
      v_block_message;
  END IF;
END;
$$;

-- Criar índice para melhorar performance de consultas de violações por dia
CREATE INDEX IF NOT EXISTS idx_blocked_messages_profile_created_category 
ON blocked_messages(profile_id, created_at DESC, moderation_category);

-- Adicionar comentário na função
COMMENT ON FUNCTION apply_progressive_system_block IS 'Aplica bloqueios progressivos do sistema baseado em violações graves no mesmo dia. Escala de 1 hora para 7 dias.';