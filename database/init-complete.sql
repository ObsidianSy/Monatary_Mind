-- ============================================
-- SCRIPT COMPLETO DE INICIALIZAÇÃO DO BANCO
-- Para deploy em VPS - PostgreSQL 17.6
-- ============================================

-- Criar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CRIAR SCHEMA
-- ============================================
CREATE SCHEMA IF NOT EXISTS financeiro;

-- ============================================
-- TABELA: CONTA
-- ============================================
CREATE TABLE IF NOT EXISTS financeiro.conta (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'obsidian',
    nome VARCHAR(200) NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('corrente', 'poupanca', 'investimento', 'dinheiro', 'carteira')),
    saldo_inicial DECIMAL(15, 2) DEFAULT 0.00,
    saldo_atual DECIMAL(15, 2) DEFAULT 0.00,
    ativo BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conta_tenant ON financeiro.conta(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conta_ativo ON financeiro.conta(ativo) WHERE is_deleted = false;

-- ============================================
-- TABELA: CATEGORIA
-- ============================================
CREATE TABLE IF NOT EXISTS financeiro.categoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'obsidian',
    nome VARCHAR(100) NOT NULL,
    tipo VARCHAR(50) CHECK (tipo IN ('despesa', 'receita', 'transferencia')),
    parent_id UUID REFERENCES financeiro.categoria(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_categoria_tenant ON financeiro.categoria(tenant_id);
CREATE INDEX IF NOT EXISTS idx_categoria_parent ON financeiro.categoria(parent_id);
CREATE INDEX IF NOT EXISTS idx_categoria_tipo ON financeiro.categoria(tipo);

-- ============================================
-- TABELA: TRANSACAO
-- ============================================
CREATE TABLE IF NOT EXISTS financeiro.transacao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'obsidian',
    descricao VARCHAR(255) NOT NULL,
    valor DECIMAL(15, 2) NOT NULL CHECK (valor > 0),
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('credito', 'debito', 'transferencia')),
    data_transacao DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'previsto' CHECK (status IN ('previsto', 'liquidado', 'cancelado')),
    origem VARCHAR(50) NOT NULL DEFAULT 'manual',
    referencia VARCHAR(255),
    conta_id UUID REFERENCES financeiro.conta(id) ON DELETE SET NULL,
    categoria_id UUID REFERENCES financeiro.categoria(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transacao_tenant ON financeiro.transacao(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transacao_data ON financeiro.transacao(data_transacao);
CREATE INDEX IF NOT EXISTS idx_transacao_tipo ON financeiro.transacao(tipo);
CREATE INDEX IF NOT EXISTS idx_transacao_status ON financeiro.transacao(status);
CREATE INDEX IF NOT EXISTS idx_transacao_conta ON financeiro.transacao(conta_id);
CREATE INDEX IF NOT EXISTS idx_transacao_categoria ON financeiro.transacao(categoria_id);

-- ============================================
-- TABELA: CARTAO
-- ============================================
CREATE TABLE IF NOT EXISTS financeiro.cartao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'obsidian',
    apelido VARCHAR(100) NOT NULL,
    limite DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    dia_fechamento INTEGER NOT NULL CHECK (dia_fechamento BETWEEN 1 AND 31),
    dia_vencimento INTEGER NOT NULL CHECK (dia_vencimento BETWEEN 1 AND 31),
    conta_pagamento_id UUID REFERENCES financeiro.conta(id) ON DELETE SET NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cartao_tenant ON financeiro.cartao(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cartao_ativo ON financeiro.cartao(ativo);

-- ============================================
-- TABELA: FATURA
-- ============================================
CREATE TABLE IF NOT EXISTS financeiro.fatura (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cartao_id UUID NOT NULL REFERENCES financeiro.cartao(id) ON DELETE CASCADE,
    competencia DATE NOT NULL,
    data_vencimento DATE NOT NULL,
    valor_total DECIMAL(15, 2) DEFAULT 0.00,
    valor_pago DECIMAL(15, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'aberta' CHECK (status IN ('aberta', 'fechada', 'paga', 'vencida')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cartao_id, competencia)
);

CREATE INDEX IF NOT EXISTS idx_fatura_cartao ON financeiro.fatura(cartao_id);
CREATE INDEX IF NOT EXISTS idx_fatura_competencia ON financeiro.fatura(competencia);
CREATE INDEX IF NOT EXISTS idx_fatura_status ON financeiro.fatura(status);

-- ============================================
-- TABELA: FATURA_ITEM
-- ============================================
CREATE TABLE IF NOT EXISTS financeiro.fatura_item (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fatura_id UUID NOT NULL REFERENCES financeiro.fatura(id) ON DELETE CASCADE,
    descricao VARCHAR(255) NOT NULL,
    valor DECIMAL(15, 2) NOT NULL CHECK (valor > 0),
    data_compra DATE NOT NULL,
    categoria_id UUID REFERENCES financeiro.categoria(id) ON DELETE SET NULL,
    parcela_numero INTEGER,
    parcela_total INTEGER,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fatura_item_fatura ON financeiro.fatura_item(fatura_id);
CREATE INDEX IF NOT EXISTS idx_fatura_item_categoria ON financeiro.fatura_item(categoria_id);

-- ============================================
-- TABELA: RECORRENCIA
-- ============================================
CREATE TABLE IF NOT EXISTS financeiro.recorrencia (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'obsidian',
    descricao VARCHAR(255) NOT NULL,
    valor DECIMAL(15, 2) NOT NULL CHECK (valor > 0),
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('credito', 'debito')),
    dia_vencimento INTEGER NOT NULL CHECK (dia_vencimento BETWEEN 1 AND 31),
    conta_id UUID REFERENCES financeiro.conta(id) ON DELETE SET NULL,
    categoria_id UUID REFERENCES financeiro.categoria(id) ON DELETE SET NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recorrencia_tenant ON financeiro.recorrencia(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recorrencia_ativo ON financeiro.recorrencia(ativo);

-- ============================================
-- TABELA: CHEQUE
-- ============================================
CREATE TABLE IF NOT EXISTS financeiro.cheque (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'obsidian',
    numero VARCHAR(50) NOT NULL,
    valor DECIMAL(15, 2) NOT NULL CHECK (valor > 0),
    data_emissao DATE NOT NULL,
    data_vencimento DATE NOT NULL,
    favorecido VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pendente' CHECK (status IN ('pendente', 'compensado', 'devolvido', 'cancelado')),
    conta_id UUID REFERENCES financeiro.conta(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cheque_tenant ON financeiro.cheque(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cheque_status ON financeiro.cheque(status);
CREATE INDEX IF NOT EXISTS idx_cheque_vencimento ON financeiro.cheque(data_vencimento);

-- ============================================
-- INCLUIR AUTH SCHEMA
-- ============================================
\i database/auth-schema.sql

-- ============================================
-- COMENTÁRIOS
-- ============================================
COMMENT ON SCHEMA financeiro IS 'Schema principal do sistema financeiro';
COMMENT ON TABLE financeiro.conta IS 'Contas bancárias e carteiras';
COMMENT ON TABLE financeiro.categoria IS 'Categorias e subcategorias hierárquicas';
COMMENT ON TABLE financeiro.transacao IS 'Transações financeiras (receitas/despesas)';
COMMENT ON TABLE financeiro.cartao IS 'Cartões de crédito';
COMMENT ON TABLE financeiro.fatura IS 'Faturas mensais dos cartões';
COMMENT ON TABLE financeiro.fatura_item IS 'Itens/compras das faturas';
COMMENT ON TABLE financeiro.recorrencia IS 'Receitas/despesas recorrentes';
COMMENT ON TABLE financeiro.cheque IS 'Controle de cheques';
