-- ============================================
-- SISTEMA DE AUTENTICAÇÃO E PERMISSÕES
-- ============================================

-- ============================================
-- TABELA: USUARIOS
-- ============================================
CREATE TABLE IF NOT EXISTS financeiro.usuario (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    nome VARCHAR(200) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    email_verificado BOOLEAN DEFAULT false,
    ultimo_acesso TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usuario_email ON financeiro.usuario(email);
CREATE INDEX IF NOT EXISTS idx_usuario_ativo ON financeiro.usuario(ativo);

-- ============================================
-- TABELA: ROLES (Papéis/Funções)
-- ============================================
CREATE TABLE IF NOT EXISTS financeiro.role (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(50) NOT NULL UNIQUE,
    descricao TEXT,
    nivel_acesso INTEGER NOT NULL DEFAULT 0, -- 0=user, 50=manager, 100=admin, 999=super_admin
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_role_nome ON financeiro.role(nome);

-- ============================================
-- TABELA: PERMISSIONS (Permissões)
-- ============================================
CREATE TABLE IF NOT EXISTS financeiro.permission (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recurso VARCHAR(100) NOT NULL, -- Ex: 'transacao', 'usuario', 'categoria'
    acao VARCHAR(50) NOT NULL, -- Ex: 'create', 'read', 'update', 'delete'
    descricao TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(recurso, acao)
);

CREATE INDEX IF NOT EXISTS idx_permission_recurso ON financeiro.permission(recurso);

-- ============================================
-- TABELA: USER_ROLES (Relacionamento N:N)
-- ============================================
CREATE TABLE IF NOT EXISTS financeiro.user_role (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES financeiro.usuario(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES financeiro.role(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(usuario_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_role_usuario ON financeiro.user_role(usuario_id);
CREATE INDEX IF NOT EXISTS idx_user_role_role ON financeiro.user_role(role_id);

-- ============================================
-- TABELA: ROLE_PERMISSIONS (Relacionamento N:N)
-- ============================================
CREATE TABLE IF NOT EXISTS financeiro.role_permission (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES financeiro.role(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES financeiro.permission(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permission_role ON financeiro.role_permission(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permission_permission ON financeiro.role_permission(permission_id);

-- ============================================
-- TABELA: AUDIT_LOG (Log de Auditoria)
-- ============================================
CREATE TABLE IF NOT EXISTS financeiro.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID REFERENCES financeiro.usuario(id) ON DELETE SET NULL,
    acao VARCHAR(100) NOT NULL,
    recurso VARCHAR(100) NOT NULL,
    recurso_id UUID,
    dados_anteriores JSONB,
    dados_novos JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_log_usuario ON financeiro.audit_log(usuario_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_recurso ON financeiro.audit_log(recurso, recurso_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON financeiro.audit_log(created_at DESC);

-- ============================================
-- SEED: ROLES PADRÃO
-- ============================================
INSERT INTO financeiro.role (nome, descricao, nivel_acesso) VALUES
    ('SUPER_ADMIN', 'Administrador Master - Acesso total ao sistema', 999),
    ('ADMIN', 'Administrador - Pode gerenciar usuários e configurações', 100),
    ('MANAGER', 'Gerente - Pode aprovar transações e ver relatórios', 50),
    ('USER', 'Usuário Padrão - Acesso básico ao sistema', 0)
ON CONFLICT (nome) DO NOTHING;

-- ============================================
-- SEED: PERMISSIONS PADRÃO
-- ============================================
INSERT INTO financeiro.permission (recurso, acao, descricao) VALUES
    -- Transações
    ('transacao', 'create', 'Criar transações'),
    ('transacao', 'read', 'Visualizar transações'),
    ('transacao', 'update', 'Editar transações'),
    ('transacao', 'delete', 'Excluir transações'),
    
    -- Categorias
    ('categoria', 'create', 'Criar categorias'),
    ('categoria', 'read', 'Visualizar categorias'),
    ('categoria', 'update', 'Editar categorias'),
    ('categoria', 'delete', 'Excluir categorias'),
    
    -- Contas
    ('conta', 'create', 'Criar contas'),
    ('conta', 'read', 'Visualizar contas'),
    ('conta', 'update', 'Editar contas'),
    ('conta', 'delete', 'Excluir contas'),
    
    -- Usuários
    ('usuario', 'create', 'Criar usuários'),
    ('usuario', 'read', 'Visualizar usuários'),
    ('usuario', 'update', 'Editar usuários'),
    ('usuario', 'delete', 'Excluir usuários'),
    
    -- Roles e Permissões
    ('role', 'create', 'Criar roles'),
    ('role', 'read', 'Visualizar roles'),
    ('role', 'update', 'Editar roles'),
    ('role', 'delete', 'Excluir roles'),
    ('permission', 'manage', 'Gerenciar permissões'),
    
    -- Relatórios
    ('relatorio', 'read', 'Visualizar relatórios'),
    ('relatorio', 'export', 'Exportar relatórios'),
    
    -- Configurações
    ('configuracao', 'read', 'Visualizar configurações'),
    ('configuracao', 'update', 'Alterar configurações'),
    
    -- Auditoria
    ('auditoria', 'read', 'Visualizar logs de auditoria')
ON CONFLICT (recurso, acao) DO NOTHING;

-- ============================================
-- SEED: ATRIBUIR PERMISSÕES AOS ROLES
-- ============================================

-- SUPER_ADMIN: Todas as permissões
INSERT INTO financeiro.role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM financeiro.role r
CROSS JOIN financeiro.permission p
WHERE r.nome = 'SUPER_ADMIN'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ADMIN: Todas exceto gerenciar roles e permissões
INSERT INTO financeiro.role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM financeiro.role r
CROSS JOIN financeiro.permission p
WHERE r.nome = 'ADMIN'
  AND p.recurso != 'permission'
  AND NOT (p.recurso = 'role' AND p.acao IN ('create', 'delete'))
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- MANAGER: Ler tudo, editar transações/contas/categorias, ver relatórios
INSERT INTO financeiro.role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM financeiro.role r
CROSS JOIN financeiro.permission p
WHERE r.nome = 'MANAGER'
  AND (
    p.acao = 'read' OR
    p.acao = 'export' OR
    (p.recurso IN ('transacao', 'conta', 'categoria') AND p.acao IN ('create', 'update'))
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- USER: Ler e criar transações/categorias, ler contas
INSERT INTO financeiro.role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM financeiro.role r
CROSS JOIN financeiro.permission p
WHERE r.nome = 'USER'
  AND (
    (p.recurso IN ('transacao', 'categoria') AND p.acao IN ('create', 'read', 'update')) OR
    (p.recurso = 'conta' AND p.acao = 'read') OR
    (p.recurso = 'relatorio' AND p.acao = 'read')
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================
-- SEED: USUÁRIO ADMINISTRADOR MASTER
-- ============================================
-- Senha: senhaadmin123
-- Hash gerado com bcrypt (10 rounds): $2b$10$vP5C8qZ.rW2x3yH9QX8pXOzB1eKQqZ8YzB2F5eKQqZ8YzB2F5eKQq
-- NOTA: Este hash será substituído no código Node.js com bcrypt real

DO $$
DECLARE
    v_usuario_id UUID;
    v_role_id UUID;
BEGIN
    -- Inserir usuário master
    INSERT INTO financeiro.usuario (email, senha_hash, nome, ativo, email_verificado)
    VALUES (
        'vitorandrade1937@gmail.com',
        '$2b$10$placeholder', -- Será atualizado pelo backend
        'Administrador Master',
        true,
        true
    )
    ON CONFLICT (email) DO UPDATE
    SET nome = EXCLUDED.nome, ativo = EXCLUDED.ativo
    RETURNING id INTO v_usuario_id;

    -- Obter ID da role SUPER_ADMIN
    SELECT id INTO v_role_id FROM financeiro.role WHERE nome = 'SUPER_ADMIN';

    -- Atribuir role SUPER_ADMIN ao usuário master
    INSERT INTO financeiro.user_role (usuario_id, role_id)
    VALUES (v_usuario_id, v_role_id)
    ON CONFLICT (usuario_id, role_id) DO NOTHING;
END $$;

-- ============================================
-- VIEWS ÚTEIS
-- ============================================

-- View: Usuários com suas roles
CREATE OR REPLACE VIEW financeiro.vw_usuarios_roles AS
SELECT 
    u.id AS usuario_id,
    u.email,
    u.nome,
    u.ativo,
    u.ultimo_acesso,
    r.id AS role_id,
    r.nome AS role_nome,
    r.nivel_acesso,
    r.descricao AS role_descricao
FROM financeiro.usuario u
LEFT JOIN financeiro.user_role ur ON u.id = ur.usuario_id
LEFT JOIN financeiro.role r ON ur.role_id = r.id
WHERE u.ativo = true;

-- View: Permissões por role
CREATE OR REPLACE VIEW financeiro.vw_role_permissions AS
SELECT 
    r.id AS role_id,
    r.nome AS role_nome,
    r.nivel_acesso,
    p.id AS permission_id,
    p.recurso,
    p.acao,
    p.descricao AS permission_descricao
FROM financeiro.role r
JOIN financeiro.role_permission rp ON r.id = rp.role_id
JOIN financeiro.permission p ON rp.permission_id = p.id;

-- View: Permissões por usuário (achatado)
CREATE OR REPLACE VIEW financeiro.vw_usuario_permissions AS
SELECT DISTINCT
    u.id AS usuario_id,
    u.email,
    u.nome,
    p.recurso,
    p.acao,
    r.nivel_acesso
FROM financeiro.usuario u
JOIN financeiro.user_role ur ON u.id = ur.usuario_id
JOIN financeiro.role r ON ur.role_id = r.id
JOIN financeiro.role_permission rp ON r.id = rp.role_id
JOIN financeiro.permission p ON rp.permission_id = p.id
WHERE u.ativo = true;

-- ============================================
-- COMENTÁRIOS
-- ============================================
COMMENT ON TABLE financeiro.usuario IS 'Usuários do sistema com autenticação';
COMMENT ON TABLE financeiro.role IS 'Papéis/Funções com níveis de acesso';
COMMENT ON TABLE financeiro.permission IS 'Permissões granulares do sistema';
COMMENT ON TABLE financeiro.user_role IS 'Relacionamento entre usuários e roles';
COMMENT ON TABLE financeiro.role_permission IS 'Relacionamento entre roles e permissões';
COMMENT ON TABLE financeiro.audit_log IS 'Log de auditoria de todas as ações do sistema';
