-- Script de inicialização do banco de dados financeiro
-- PostgreSQL 17.6

-- ============================================
-- EXTENSÕES
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- SCHEMA
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
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('credito', 'debito', 'transferencia')),
    valor DECIMAL(15, 2) NOT NULL,
    descricao TEXT NOT NULL,
    data_transacao DATE NOT NULL,
    data_vencimento DATE,
    conta_id UUID NOT NULL REFERENCES financeiro.conta(id) ON DELETE RESTRICT,
    conta_destino_id UUID REFERENCES financeiro.conta(id) ON DELETE RESTRICT,
    categoria_id UUID REFERENCES financeiro.categoria(id) ON DELETE SET NULL,
    subcategoria_id UUID REFERENCES financeiro.categoria(id) ON DELETE SET NULL,
    origem VARCHAR(100) DEFAULT 'manual',
    referencia VARCHAR(200),
    status VARCHAR(50) DEFAULT 'previsto' CHECK (status IN ('previsto', 'liquidado', 'cancelado', 'atrasado')),
    grupo_id UUID,
    parcela_numero INTEGER,
    parcela_total INTEGER,
    instrumento VARCHAR(50),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transacao_tenant ON financeiro.transacao(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transacao_conta ON financeiro.transacao(conta_id);
CREATE INDEX IF NOT EXISTS idx_transacao_data ON financeiro.transacao(data_transacao);
CREATE INDEX IF NOT EXISTS idx_transacao_status ON financeiro.transacao(status);
CREATE INDEX IF NOT EXISTS idx_transacao_tipo ON financeiro.transacao(tipo);
CREATE INDEX IF NOT EXISTS idx_transacao_categoria ON financeiro.transacao(categoria_id);

-- ============================================
-- TABELA: CARTAO
-- ============================================
CREATE TABLE IF NOT EXISTS financeiro.cartao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'obsidian',
    apelido VARCHAR(100) NOT NULL,
    bandeira VARCHAR(50) CHECK (bandeira IN ('visa', 'mastercard', 'elo', 'amex', 'hipercard')),
    limite_total DECIMAL(15, 2) DEFAULT 0.00,
    dia_fechamento INTEGER NOT NULL CHECK (dia_fechamento >= 1 AND dia_fechamento <= 31),
    dia_vencimento INTEGER NOT NULL CHECK (dia_vencimento >= 1 AND dia_vencimento <= 31),
    conta_pagamento_id UUID REFERENCES financeiro.conta(id) ON DELETE SET NULL,
    ativo BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cartao_tenant ON financeiro.cartao(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cartao_ativo ON financeiro.cartao(ativo) WHERE is_deleted = false;

-- ============================================
-- TABELA: FATURA
-- ============================================
CREATE TABLE IF NOT EXISTS financeiro.fatura (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'obsidian',
    cartao_id UUID NOT NULL REFERENCES financeiro.cartao(id) ON DELETE CASCADE,
    competencia VARCHAR(7) NOT NULL, -- YYYY-MM
    status VARCHAR(50) DEFAULT 'aberta' CHECK (status IN ('aberta', 'fechada', 'paga')),
    valor_total DECIMAL(15, 2) DEFAULT 0.00,
    valor_fechado DECIMAL(15, 2),
    valor_pago DECIMAL(15, 2),
    data_fechamento DATE,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    transacao_id UUID REFERENCES financeiro.transacao(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cartao_id, competencia)
);

CREATE INDEX IF NOT EXISTS idx_fatura_tenant ON financeiro.fatura(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fatura_cartao ON financeiro.fatura(cartao_id);
CREATE INDEX IF NOT EXISTS idx_fatura_competencia ON financeiro.fatura(competencia);
CREATE INDEX IF NOT EXISTS idx_fatura_status ON financeiro.fatura(status);

-- ============================================
-- TABELA: FATURA_ITEM
-- ============================================
CREATE TABLE IF NOT EXISTS financeiro.fatura_item (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'obsidian',
    fatura_id UUID NOT NULL REFERENCES financeiro.fatura(id) ON DELETE CASCADE,
    cartao_id UUID REFERENCES financeiro.cartao(id) ON DELETE SET NULL,
    descricao TEXT NOT NULL,
    valor DECIMAL(15, 2) NOT NULL,
    data_compra DATE NOT NULL,
    categoria_id UUID REFERENCES financeiro.categoria(id) ON DELETE SET NULL,
    subcategoria_id UUID REFERENCES financeiro.categoria(id) ON DELETE SET NULL,
    parcela_numero INTEGER,
    parcela_total INTEGER,
    competencia VARCHAR(7), -- YYYY-MM
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fatura_item_tenant ON financeiro.fatura_item(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fatura_item_fatura ON financeiro.fatura_item(fatura_id);
CREATE INDEX IF NOT EXISTS idx_fatura_item_cartao ON financeiro.fatura_item(cartao_id);
CREATE INDEX IF NOT EXISTS idx_fatura_item_data ON financeiro.fatura_item(data_compra);

-- ============================================
-- TABELA: RECORRENCIA
-- ============================================
CREATE TABLE IF NOT EXISTS financeiro.recorrencia (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'obsidian',
    conta_id UUID NOT NULL REFERENCES financeiro.conta(id) ON DELETE CASCADE,
    categoria_id UUID REFERENCES financeiro.categoria(id) ON DELETE SET NULL,
    subcategoria_id UUID REFERENCES financeiro.categoria(id) ON DELETE SET NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('credito', 'debito')),
    valor DECIMAL(15, 2) NOT NULL,
    descricao TEXT NOT NULL,
    frequencia VARCHAR(50) NOT NULL CHECK (frequencia IN ('diario', 'semanal', 'quinzenal', 'mensal', 'anual')),
    dia_vencimento INTEGER CHECK (dia_vencimento >= 1 AND dia_vencimento <= 31),
    dia_semana INTEGER CHECK (dia_semana >= 0 AND dia_semana <= 6),
    data_inicio DATE NOT NULL,
    data_fim DATE,
    ativo BOOLEAN DEFAULT true,
    is_paused BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    proxima_ocorrencia DATE NOT NULL,
    alerta_dias_antes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recorrencia_tenant ON financeiro.recorrencia(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recorrencia_conta ON financeiro.recorrencia(conta_id);
CREATE INDEX IF NOT EXISTS idx_recorrencia_ativo ON financeiro.recorrencia(ativo) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_recorrencia_proxima ON financeiro.recorrencia(proxima_ocorrencia);

-- ============================================
-- TABELA: CHEQUE
-- ============================================
CREATE TABLE IF NOT EXISTS financeiro.cheque (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'obsidian',
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('emitido', 'recebido')),
    numero VARCHAR(50) NOT NULL,
    banco VARCHAR(100),
    agencia VARCHAR(20),
    conta_bancaria VARCHAR(50),
    nominal VARCHAR(200) NOT NULL,
    documento VARCHAR(20),
    valor DECIMAL(15, 2) NOT NULL,
    data_emissao DATE NOT NULL,
    data_prev_compensacao DATE NOT NULL,
    data_compensacao DATE,
    status VARCHAR(50) DEFAULT 'emitido' CHECK (status IN ('emitido', 'depositado', 'compensado', 'devolvido', 'sustado', 'cancelado')),
    conta_id UUID NOT NULL REFERENCES financeiro.conta(id) ON DELETE RESTRICT,
    transacao_id UUID REFERENCES financeiro.transacao(id) ON DELETE SET NULL,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cheque_tenant ON financeiro.cheque(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cheque_conta ON financeiro.cheque(conta_id);
CREATE INDEX IF NOT EXISTS idx_cheque_status ON financeiro.cheque(status);
CREATE INDEX IF NOT EXISTS idx_cheque_data_compensacao ON financeiro.cheque(data_prev_compensacao);

-- ============================================
-- CATEGORIAS PADRÃO
-- ============================================
INSERT INTO financeiro.categoria (nome, tipo, parent_id, tenant_id) VALUES
    ('Alimentação', 'despesa', NULL, 'obsidian'),
    ('Transporte', 'despesa', NULL, 'obsidian'),
    ('Moradia', 'despesa', NULL, 'obsidian'),
    ('Saúde', 'despesa', NULL, 'obsidian'),
    ('Lazer', 'despesa', NULL, 'obsidian'),
    ('Educação', 'despesa', NULL, 'obsidian'),
    ('Salário', 'receita', NULL, 'obsidian'),
    ('Investimentos', 'receita', NULL, 'obsidian'),
    ('Freelance', 'receita', NULL, 'obsidian')
ON CONFLICT DO NOTHING;

-- ============================================
-- TRIGGERS PARA UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conta_updated_at BEFORE UPDATE ON financeiro.conta
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categoria_updated_at BEFORE UPDATE ON financeiro.categoria
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transacao_updated_at BEFORE UPDATE ON financeiro.transacao
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cartao_updated_at BEFORE UPDATE ON financeiro.cartao
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fatura_updated_at BEFORE UPDATE ON financeiro.fatura
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fatura_item_updated_at BEFORE UPDATE ON financeiro.fatura_item
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recorrencia_updated_at BEFORE UPDATE ON financeiro.recorrencia
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cheque_updated_at BEFORE UPDATE ON financeiro.cheque
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEWS ÚTEIS
-- ============================================

-- View de saldo das contas
CREATE OR REPLACE VIEW financeiro.v_saldos_conta AS
SELECT 
    c.id,
    c.nome,
    c.tipo,
    c.saldo_inicial,
    COALESCE(c.saldo_inicial, 0) + 
    COALESCE((SELECT SUM(valor) FROM financeiro.transacao WHERE conta_id = c.id AND tipo = 'credito' AND status = 'liquidado'), 0) -
    COALESCE((SELECT SUM(valor) FROM financeiro.transacao WHERE conta_id = c.id AND tipo = 'debito' AND status = 'liquidado'), 0) as saldo_atual
FROM financeiro.conta c
WHERE c.is_deleted = false;

-- View de próximas transações
CREATE OR REPLACE VIEW financeiro.v_proximas_transacao AS
SELECT 
    t.id,
    t.descricao,
    t.valor,
    t.data_vencimento,
    t.tipo,
    t.status,
    c.nome as conta_nome,
    cat.nome as categoria_nome
FROM financeiro.transacao t
LEFT JOIN financeiro.conta c ON t.conta_id = c.id
LEFT JOIN financeiro.categoria cat ON COALESCE(t.subcategoria_id, t.categoria_id) = cat.id
WHERE t.status = 'previsto'
  AND t.data_vencimento >= CURRENT_DATE
ORDER BY t.data_vencimento;

COMMENT ON TABLE financeiro.conta IS 'Contas bancárias, carteiras e investimentos';
COMMENT ON TABLE financeiro.categoria IS 'Categorias e subcategorias de transações';
COMMENT ON TABLE financeiro.transacao IS 'Lançamentos financeiros (ledger)';
COMMENT ON TABLE financeiro.cartao IS 'Cartões de crédito';
COMMENT ON TABLE financeiro.fatura IS 'Faturas dos cartões de crédito';
COMMENT ON TABLE financeiro.fatura_item IS 'Itens/compras das faturas';
COMMENT ON TABLE financeiro.recorrencia IS 'Transações recorrentes programadas';
COMMENT ON TABLE financeiro.cheque IS 'Controle de cheques emitidos e recebidos';
