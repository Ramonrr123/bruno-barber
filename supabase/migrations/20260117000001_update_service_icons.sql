-- ============================================
-- ATUALIZAR ÍCONES DOS SERVIÇOS
-- Trocar emojis informais por opções mais profissionais
-- Manter: Social (✂️) e Degradê (💈)
-- ============================================

-- Atualizar "Combo Sapo" para um ícone mais profissional
UPDATE public.services
SET icon = '💇'
WHERE name = 'Combo Sapo' AND icon = '🐸';

-- Atualizar outros serviços com emojis informais (caso existam)
-- Platinado/Luzes - trocar para ícone profissional
UPDATE public.services
SET icon = '✨'
WHERE (name ILIKE '%platinado%' OR name ILIKE '%luzes%') 
  AND (icon LIKE '%❄️%' OR icon LIKE '%⚡%' OR icon LIKE '%🌟%');

-- Barba - trocar para ícone profissional
UPDATE public.services
SET icon = '🪒'
WHERE name ILIKE '%barba%' 
  AND icon NOT IN ('🪒', '✂️', '💈');

-- Combo/Pacote - trocar para ícone profissional
UPDATE public.services
SET icon = '💇'
WHERE (name ILIKE '%combo%' OR name ILIKE '%pacote%') 
  AND icon NOT IN ('💇', '✂️', '💈')
  AND icon LIKE '%🐸%';

-- Verificar os ícones atualizados
SELECT name, icon, description
FROM public.services
ORDER BY name;
