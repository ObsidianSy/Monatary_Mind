-- Criar schema de estoque
CREATE SCHEMA IF NOT EXISTS estoque;

-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de produtos
CREATE TABLE IF NOT EXISTS estoque.produto (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL,
    sku TEXT NOT NULL,
    nome TEXT NOT NULL,
    categoria TEXT,
    preco_venda NUMERIC NOT NULL DEFAULT 0,
    preco_custo NUMERIC DEFAULT 0,
    quantidade_disponivel INTEGER NOT NULL DEFAULT 0,
    quantidade_reservada INTEGER DEFAULT 0,
    estoque_minimo INTEGER DEFAULT 0,
    is_ativo BOOLEAN NOT NULL DEFAULT true,
    is_kit BOOLEAN DEFAULT false,
    variante TEXT,
    imagem_url TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Índices para performance
    CONSTRAINT produto_tenant_sku_unique UNIQUE (tenant_id, sku)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_produto_tenant ON estoque.produto(tenant_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_produto_sku ON estoque.produto(sku) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_produto_nome ON estoque.produto(nome) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_produto_ativo ON estoque.produto(is_ativo) WHERE is_deleted = false;

-- Comentários
COMMENT ON TABLE estoque.produto IS 'Produtos do estoque e-commerce';
COMMENT ON COLUMN estoque.produto.tenant_id IS 'ID do tenant (workspace)';
COMMENT ON COLUMN estoque.produto.sku IS 'Código SKU único por tenant';
COMMENT ON COLUMN estoque.produto.is_kit IS 'Se o produto é um kit/combo';
COMMENT ON COLUMN estoque.produto.is_deleted IS 'Soft delete flag';
