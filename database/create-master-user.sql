-- Script para criar usuário administrador master
-- Email: vitorandrade1937@gmail.com
-- Senha: senhaadmin123

-- Importar schema de autenticação
\i database/auth-schema.sql

-- Atualizar senha do usuário master com hash correto
-- Este script será executado após o bcrypt gerar o hash real
DO $$
DECLARE
    v_usuario_id UUID;
    v_senha_hash TEXT;
BEGIN
    -- Hash gerado para 'senhaadmin123'
    v_senha_hash := '$2b$10$HASH_PLACEHOLDER'; -- Será substituído pelo Node.js
    
    -- Atualizar ou inserir usuário master
    INSERT INTO financeiro.usuario (email, senha_hash, nome, ativo, email_verificado)
    VALUES (
        'vitorandrade1937@gmail.com',
        v_senha_hash,
        'Administrador Master',
        true,
        true
    )
    ON CONFLICT (email) DO UPDATE
    SET senha_hash = EXCLUDED.senha_hash,
        nome = EXCLUDED.nome,
        ativo = EXCLUDED.ativo,
        email_verificado = EXCLUDED.email_verificado
    RETURNING id INTO v_usuario_id;

    -- Atribuir role SUPER_ADMIN
    INSERT INTO financeiro.user_role (usuario_id, role_id)
    SELECT v_usuario_id, id FROM financeiro.role WHERE nome = 'SUPER_ADMIN'
    ON CONFLICT (usuario_id, role_id) DO NOTHING;

    RAISE NOTICE 'Usuário master criado/atualizado: %', v_usuario_id;
END $$;
