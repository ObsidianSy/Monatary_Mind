CREATE TABLE "financeiro"."audit_log" ( 
  "id" UUID NOT NULL DEFAULT uuid_generate_v4() ,
  "usuario_id" UUID NULL,
  "acao" VARCHAR(100) NOT NULL,
  "recurso" VARCHAR(100) NOT NULL,
  "recurso_id" UUID NULL,
  "dados_anteriores" JSONB NULL,
  "dados_novos" JSONB NULL,
  "ip_address" VARCHAR(45) NULL,
  "user_agent" TEXT NULL,
  "created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "financeiro"."cartao" ( 
  "id" UUID NOT NULL DEFAULT uuid_generate_v4() ,
  "tenant_id" TEXT NOT NULL,
  "apelido" TEXT NOT NULL,
  "bandeira" TEXT NULL,
  "limite_total" NUMERIC NOT NULL,
  "dia_fechamento" SMALLINT NOT NULL,
  "dia_vencimento" SMALLINT NOT NULL,
  "conta_pagamento_id" UUID NOT NULL,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false ,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now() ,
  CONSTRAINT "cartao_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "financeiro"."categoria" ( 
  "id" UUID NOT NULL DEFAULT uuid_generate_v4() ,
  "tenant_id" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "parent_id" UUID NULL,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false ,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now() ,
  CONSTRAINT "categoria_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "financeiro"."conta" ( 
  "id" UUID NOT NULL DEFAULT uuid_generate_v4() ,
  "tenant_id" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "saldo_inicial" NUMERIC NOT NULL DEFAULT 0 ,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false ,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now() ,
  CONSTRAINT "conta_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "equipamentos"."depreciacao" ( 
  "id" UUID NOT NULL DEFAULT uuid_generate_v4() ,
  "tenant_id" TEXT NOT NULL,
  "equipamento_id" UUID NOT NULL,
  "competencia" DATE NOT NULL,
  "valor" NUMERIC NOT NULL,
  "metodo" TEXT NULL DEFAULT 'linear'::text ,
  "observacoes" TEXT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE NULL DEFAULT now() ,
  CONSTRAINT "depreciacao_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "depreciacao_equipamento_id_competencia_key" UNIQUE ("equipamento_id", "competencia")
);
CREATE TABLE "equipamentos"."equipamento" ( 
  "id" UUID NOT NULL DEFAULT uuid_generate_v4() ,
  "tenant_id" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "marca" TEXT NULL,
  "modelo" TEXT NULL,
  "numero_serie" TEXT NULL,
  "patrimonio" TEXT NULL,
  "data_aquisicao" DATE NULL,
  "valor_aquisicao" NUMERIC NULL DEFAULT 0 ,
  "vida_util_anos" SMALLINT NULL DEFAULT 5 ,
  "localizacao" TEXT NULL,
  "status" TEXT NOT NULL DEFAULT 'ativo'::text ,
  "observacoes" TEXT NULL,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false ,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now() ,
  CONSTRAINT "equipamento_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "financeiro"."fatura" ( 
  "id" UUID NOT NULL DEFAULT uuid_generate_v4() ,
  "tenant_id" TEXT NOT NULL,
  "cartao_id" UUID NOT NULL,
  "competencia" DATE NOT NULL,
  "data_fechamento" DATE NOT NULL,
  "data_vencimento" DATE NOT NULL,
  "valor_fechado" NUMERIC NOT NULL DEFAULT 0 ,
  "status" TEXT NOT NULL DEFAULT 'aberta'::text ,
  "data_pagamento" DATE NULL,
  "valor_pago" NUMERIC NULL,
  "transacao_id" UUID NULL,
  CONSTRAINT "fatura_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fatura_cartao_id_competencia_key" UNIQUE ("cartao_id", "competencia")
);
CREATE TABLE "financeiro"."fatura_item" ( 
  "id" UUID NOT NULL DEFAULT uuid_generate_v4() ,
  "tenant_id" TEXT NOT NULL,
  "fatura_id" UUID NULL,
  "descricao" TEXT NULL,
  "categoria_id" UUID NOT NULL,
  "valor" NUMERIC NOT NULL,
  "data_compra" DATE NOT NULL,
  "parcela_numero" SMALLINT NULL DEFAULT 1 ,
  "parcela_total" SMALLINT NULL DEFAULT 1 ,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now() ,
  "cartao_id" UUID NULL,
  "competencia" DATE NULL,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false ,
  CONSTRAINT "fatura_item_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "equipamentos"."manutencao" ( 
  "id" UUID NOT NULL DEFAULT uuid_generate_v4() ,
  "tenant_id" TEXT NOT NULL,
  "equipamento_id" UUID NOT NULL,
  "tipo" TEXT NOT NULL,
  "descricao" TEXT NOT NULL,
  "data_inicio" DATE NOT NULL,
  "data_fim" DATE NULL,
  "custo" NUMERIC NULL DEFAULT 0 ,
  "tecnico_responsavel" TEXT NULL,
  "status" TEXT NOT NULL DEFAULT 'concluida'::text ,
  "observacoes" TEXT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE NULL DEFAULT now() ,
  CONSTRAINT "manutencao_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "equipamentos"."movimentacao" ( 
  "id" UUID NOT NULL DEFAULT uuid_generate_v4() ,
  "tenant_id" TEXT NOT NULL,
  "equipamento_id" UUID NOT NULL,
  "tipo" TEXT NOT NULL,
  "origem" TEXT NULL,
  "destino" TEXT NULL,
  "responsavel" TEXT NULL,
  "data_movimentacao" DATE NOT NULL,
  "observacoes" TEXT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE NULL DEFAULT now() ,
  CONSTRAINT "movimentacao_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "financeiro"."pagamento_fatura" ( 
  "id" UUID NOT NULL DEFAULT uuid_generate_v4() ,
  "tenant_id" TEXT NOT NULL,
  "fatura_id" UUID NOT NULL,
  "conta_id" UUID NOT NULL,
  "valor_pago" NUMERIC NOT NULL,
  "data_pagamento" DATE NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now() ,
  CONSTRAINT "pagamento_fatura_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "financeiro"."parametro" ( 
  "tenant_id" TEXT NOT NULL,
  "moeda" TEXT NOT NULL DEFAULT 'BRL'::text ,
  "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo'::text ,
  "alerta_dias_padrao" INTEGER NOT NULL DEFAULT 3 ,
  "horizonte_padrao" INTEGER NOT NULL DEFAULT 30 ,
  CONSTRAINT "parametro_pkey" PRIMARY KEY ("tenant_id")
);
CREATE TABLE "financeiro"."permission" ( 
  "id" UUID NOT NULL DEFAULT uuid_generate_v4() ,
  "recurso" VARCHAR(100) NOT NULL,
  "acao" VARCHAR(50) NOT NULL,
  "descricao" TEXT NULL,
  "created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "permission_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "permission_recurso_acao_key" UNIQUE ("recurso", "acao")
);
CREATE TABLE "estoque"."produto" ( 
  "id" UUID NOT NULL DEFAULT uuid_generate_v4() ,
  "tenant_id" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "categoria" TEXT NULL,
  "preco_venda" NUMERIC NOT NULL DEFAULT 0 ,
  "preco_custo" NUMERIC NULL DEFAULT 0 ,
  "quantidade_disponivel" INTEGER NOT NULL DEFAULT 0 ,
  "quantidade_reservada" INTEGER NULL DEFAULT 0 ,
  "estoque_minimo" INTEGER NULL DEFAULT 0 ,
  "is_ativo" BOOLEAN NOT NULL DEFAULT true ,
  "is_kit" BOOLEAN NULL DEFAULT false ,
  "variante" TEXT NULL,
  "imagem_url" TEXT NULL,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false ,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now() ,
  "updated_at" TIMESTAMP WITH TIME ZONE NULL DEFAULT now() ,
  CONSTRAINT "produto_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "produto_tenant_sku_unique" UNIQUE ("tenant_id", "sku")
);
CREATE TABLE "financeiro"."recorrencia" ( 
  "id" UUID NOT NULL DEFAULT uuid_generate_v4() ,
  "tenant_id" TEXT NOT NULL,
  "conta_id" UUID NOT NULL,
  "categoria_id" UUID NOT NULL,
  "tipo" TEXT NOT NULL,
  "descricao" TEXT NULL,
  "valor" NUMERIC NOT NULL,
  "frequencia" TEXT NOT NULL,
  "dia_vencimento" SMALLINT NULL,
  "dia_semana" SMALLINT NULL,
  "data_inicio" DATE NOT NULL,
  "data_fim" DATE NULL,
  "proxima_ocorrencia" DATE NOT NULL,
  "alerta_dias_antes" SMALLINT NOT NULL DEFAULT 3 ,
  "is_paused" BOOLEAN NOT NULL DEFAULT false ,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false ,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now() ,
  CONSTRAINT "recorrencia_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "financeiro"."role" ( 
  "id" UUID NOT NULL DEFAULT uuid_generate_v4() ,
  "nome" VARCHAR(50) NOT NULL,
  "descricao" TEXT NULL,
  "nivel_acesso" INTEGER NOT NULL DEFAULT 0 ,
  "created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "role_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "role_nome_key" UNIQUE ("nome")
);
CREATE TABLE "financeiro"."role_permission" ( 
  "id" UUID NOT NULL DEFAULT uuid_generate_v4() ,
  "role_id" UUID NOT NULL,
  "permission_id" UUID NOT NULL,
  "created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "role_permission_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "role_permission_role_id_permission_id_key" UNIQUE ("role_id", "permission_id")
);
CREATE TABLE "financeiro"."transacao" ( 
  "id" UUID NOT NULL DEFAULT uuid_generate_v4() ,
  "tenant_id" TEXT NOT NULL,
  "conta_id" UUID NOT NULL,
  "categoria_id" UUID NOT NULL,
  "tipo" TEXT NOT NULL,
  "descricao" TEXT NULL,
  "valor" NUMERIC NOT NULL,
  "data_transacao" DATE NOT NULL,
  "origem" TEXT NULL,
  "referencia" TEXT NULL,
  "status" TEXT NOT NULL DEFAULT 'previsto'::text ,
  "parcela_id" UUID NULL,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false ,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now() ,
  "mes_referencia" VARCHAR(7) NULL,
  CONSTRAINT "transacao_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "financeiro"."user_role" ( 
  "id" UUID NOT NULL DEFAULT uuid_generate_v4() ,
  "usuario_id" UUID NOT NULL,
  "role_id" UUID NOT NULL,
  "created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "user_role_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_role_usuario_id_role_id_key" UNIQUE ("usuario_id", "role_id")
);
CREATE TABLE "financeiro"."user_workspace" ( 
  "id" UUID NOT NULL DEFAULT uuid_generate_v4() ,
  "usuario_id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "padrao" BOOLEAN NULL DEFAULT false ,
  "created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "user_workspace_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_workspace_usuario_id_workspace_id_key" UNIQUE ("usuario_id", "workspace_id")
);
CREATE TABLE "financeiro"."usuario" ( 
  "id" UUID NOT NULL DEFAULT uuid_generate_v4() ,
  "email" VARCHAR(255) NOT NULL,
  "senha_hash" VARCHAR(255) NOT NULL,
  "nome" VARCHAR(200) NOT NULL,
  "ativo" BOOLEAN NULL DEFAULT true ,
  "email_verificado" BOOLEAN NULL DEFAULT false ,
  "ultimo_acesso" TIMESTAMP NULL,
  "created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  "updated_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "usuario_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "usuario_email_key" UNIQUE ("email")
);
CREATE TABLE "financeiro"."webhook_event" ( 
  "event_id" UUID NOT NULL,
  "event_type" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL,
  "processed_at" TIMESTAMP WITH TIME ZONE NULL DEFAULT now() ,
  CONSTRAINT "webhook_event_pkey" PRIMARY KEY ("event_id"),
  CONSTRAINT "ux_webhook_event_id" UNIQUE ("event_id")
);
CREATE TABLE "financeiro"."workspace" ( 
  "id" UUID NOT NULL DEFAULT uuid_generate_v4() ,
  "tenant_id" TEXT NOT NULL,
  "nome" VARCHAR(200) NOT NULL,
  "descricao" TEXT NULL,
  "cor" VARCHAR(7) NULL,
  "icone" VARCHAR(50) NULL,
  "ativo" BOOLEAN NULL DEFAULT true ,
  "created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  "updated_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "workspace_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "workspace_tenant_id_key" UNIQUE ("tenant_id")
);
ALTER TABLE "financeiro"."audit_log" ADD CONSTRAINT "audit_log_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "financeiro"."usuario" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "financeiro"."cartao" ADD CONSTRAINT "cartao_conta_pagamento_id_fkey" FOREIGN KEY ("conta_pagamento_id") REFERENCES "financeiro"."conta" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "financeiro"."categoria" ADD CONSTRAINT "categoria_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "financeiro"."categoria" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "equipamentos"."depreciacao" ADD CONSTRAINT "depreciacao_equipamento_id_fkey" FOREIGN KEY ("equipamento_id") REFERENCES "equipamentos"."equipamento" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "financeiro"."fatura_item" ADD CONSTRAINT "fatura_item_fatura_id_fkey" FOREIGN KEY ("fatura_id") REFERENCES "financeiro"."fatura" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "financeiro"."fatura_item" ADD CONSTRAINT "fatura_item_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "financeiro"."categoria" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "financeiro"."fatura_item" ADD CONSTRAINT "fatura_item_cartao_fk" FOREIGN KEY ("cartao_id") REFERENCES "financeiro"."cartao" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "equipamentos"."manutencao" ADD CONSTRAINT "manutencao_equipamento_id_fkey" FOREIGN KEY ("equipamento_id") REFERENCES "equipamentos"."equipamento" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "equipamentos"."movimentacao" ADD CONSTRAINT "movimentacao_equipamento_id_fkey" FOREIGN KEY ("equipamento_id") REFERENCES "equipamentos"."equipamento" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "financeiro"."pagamento_fatura" ADD CONSTRAINT "pagamento_fatura_fatura_id_fkey" FOREIGN KEY ("fatura_id") REFERENCES "financeiro"."fatura" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "financeiro"."pagamento_fatura" ADD CONSTRAINT "pagamento_fatura_conta_id_fkey" FOREIGN KEY ("conta_id") REFERENCES "financeiro"."conta" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "financeiro"."recorrencia" ADD CONSTRAINT "recorrencia_conta_id_fkey" FOREIGN KEY ("conta_id") REFERENCES "financeiro"."conta" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "financeiro"."recorrencia" ADD CONSTRAINT "recorrencia_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "financeiro"."categoria" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "financeiro"."role_permission" ADD CONSTRAINT "role_permission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "financeiro"."role" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "financeiro"."role_permission" ADD CONSTRAINT "role_permission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "financeiro"."permission" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "financeiro"."user_role" ADD CONSTRAINT "user_role_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "financeiro"."usuario" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "financeiro"."user_role" ADD CONSTRAINT "user_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "financeiro"."role" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "financeiro"."user_workspace" ADD CONSTRAINT "user_workspace_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "financeiro"."workspace" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
CREATE FUNCTION "public"."armor"() RETURNS TEXT|TEXT LANGUAGE C
AS
$$
pg_armor
$$;
CREATE FUNCTION "public"."crypt"() RETURNS TEXT LANGUAGE C
AS
$$
pg_crypt
$$;
CREATE FUNCTION "public"."dearmor"() RETURNS BYTEA LANGUAGE C
AS
$$
pg_dearmor
$$;
CREATE FUNCTION "public"."decrypt"() RETURNS BYTEA LANGUAGE C
AS
$$
pg_decrypt
$$;
CREATE FUNCTION "public"."decrypt_iv"() RETURNS BYTEA LANGUAGE C
AS
$$
pg_decrypt_iv
$$;
CREATE FUNCTION "public"."digest"() RETURNS BYTEA|BYTEA LANGUAGE C
AS
$$
pg_digest
$$;
CREATE FUNCTION "public"."encrypt"() RETURNS BYTEA LANGUAGE C
AS
$$
pg_encrypt
$$;
CREATE FUNCTION "public"."encrypt_iv"() RETURNS BYTEA LANGUAGE C
AS
$$
pg_encrypt_iv
$$;
CREATE FUNCTION "public"."gen_random_bytes"() RETURNS BYTEA LANGUAGE C
AS
$$
pg_random_bytes
$$;
CREATE FUNCTION "public"."gen_random_uuid"() RETURNS UUID LANGUAGE C
AS
$$
pg_random_uuid
$$;
CREATE FUNCTION "public"."gen_salt"() RETURNS TEXT|TEXT LANGUAGE C
AS
$$
pg_gen_salt_rounds
$$;
CREATE FUNCTION "public"."hmac"() RETURNS BYTEA|BYTEA LANGUAGE C
AS
$$
pg_hmac
$$;
CREATE FUNCTION "public"."pgp_armor_headers"(OUT key TEXT, OUT value TEXT) RETURNS RECORD LANGUAGE C
AS
$$
pgp_armor_headers
$$;
CREATE FUNCTION "public"."pgp_key_id"() RETURNS TEXT LANGUAGE C
AS
$$
pgp_key_id_w
$$;
CREATE FUNCTION "public"."pgp_pub_decrypt"() RETURNS TEXT|TEXT|TEXT LANGUAGE C
AS
$$
pgp_pub_decrypt_text
$$;
CREATE FUNCTION "public"."pgp_pub_decrypt_bytea"() RETURNS BYTEA|BYTEA|BYTEA LANGUAGE C
AS
$$
pgp_pub_decrypt_bytea
$$;
CREATE FUNCTION "public"."pgp_pub_encrypt"() RETURNS BYTEA|BYTEA LANGUAGE C
AS
$$
pgp_pub_encrypt_text
$$;
CREATE FUNCTION "public"."pgp_pub_encrypt_bytea"() RETURNS BYTEA|BYTEA LANGUAGE C
AS
$$
pgp_pub_encrypt_bytea
$$;
CREATE FUNCTION "public"."pgp_sym_decrypt"() RETURNS TEXT|TEXT LANGUAGE C
AS
$$
pgp_sym_decrypt_text
$$;
CREATE FUNCTION "public"."pgp_sym_decrypt_bytea"() RETURNS BYTEA|BYTEA LANGUAGE C
AS
$$
pgp_sym_decrypt_bytea
$$;
CREATE FUNCTION "public"."pgp_sym_encrypt"() RETURNS BYTEA|BYTEA LANGUAGE C
AS
$$
pgp_sym_encrypt_text
$$;
CREATE FUNCTION "public"."pgp_sym_encrypt_bytea"() RETURNS BYTEA|BYTEA LANGUAGE C
AS
$$
pgp_sym_encrypt_bytea
$$;
CREATE FUNCTION "public"."uuid_generate_v1"() RETURNS UUID LANGUAGE C
AS
$$
uuid_generate_v1
$$;
CREATE FUNCTION "public"."uuid_generate_v1mc"() RETURNS UUID LANGUAGE C
AS
$$
uuid_generate_v1mc
$$;
CREATE FUNCTION "public"."uuid_generate_v3"(IN namespace UUID, IN name TEXT) RETURNS UUID LANGUAGE C
AS
$$
uuid_generate_v3
$$;
CREATE FUNCTION "public"."uuid_generate_v4"() RETURNS UUID LANGUAGE C
AS
$$
uuid_generate_v4
$$;
CREATE FUNCTION "public"."uuid_generate_v5"(IN namespace UUID, IN name TEXT) RETURNS UUID LANGUAGE C
AS
$$
uuid_generate_v5
$$;
CREATE FUNCTION "public"."uuid_nil"() RETURNS UUID LANGUAGE C
AS
$$
uuid_nil
$$;
CREATE FUNCTION "public"."uuid_ns_dns"() RETURNS UUID LANGUAGE C
AS
$$
uuid_ns_dns
$$;
CREATE FUNCTION "public"."uuid_ns_oid"() RETURNS UUID LANGUAGE C
AS
$$
uuid_ns_oid
$$;
CREATE FUNCTION "public"."uuid_ns_url"() RETURNS UUID LANGUAGE C
AS
$$
uuid_ns_url
$$;
CREATE FUNCTION "public"."uuid_ns_x500"() RETURNS UUID LANGUAGE C
AS
$$
uuid_ns_x500
$$;
CREATE VIEW "equipamentos"."vw_equipamento_status"
AS
 SELECT e.id,
    e.nome,
    e.tipo,
    e.marca,
    e.modelo,
    e.localizacao,
    e.status,
    COALESCE(sum(m.custo), (0)::numeric) AS custo_total_manutencao,
    count(m.id) AS qtd_manutencoes
   FROM (equipamentos.equipamento e
     LEFT JOIN equipamentos.manutencao m ON ((m.equipamento_id = e.id)))
  WHERE (e.is_deleted = false)
  GROUP BY e.id;;
CREATE VIEW "financeiro"."vw_fatura_item_resolvido"
AS
 SELECT fi.id,
    fi.tenant_id,
    fi.fatura_id,
    f.cartao_id,
    COALESCE(f.competencia, fi.data_compra) AS competencia,
    fi.descricao,
    fi.categoria_id,
    fi.valor,
    fi.data_compra,
    fi.parcela_numero,
    fi.parcela_total,
    f.status AS status_fatura,
    f.data_fechamento,
    f.data_vencimento,
    f.valor_fechado
   FROM (financeiro.fatura_item fi
     LEFT JOIN financeiro.fatura f ON ((f.id = fi.fatura_id)));;
CREATE VIEW "financeiro"."vw_fluxo_caixa_30d"
AS
 SELECT (date_trunc('day'::text, g.g))::date AS dia,
    sum(
        CASE
            WHEN (t.tipo = 'credito'::text) THEN t.valor
            ELSE (0)::numeric
        END) AS entradas,
    sum(
        CASE
            WHEN (t.tipo = 'debito'::text) THEN t.valor
            ELSE (0)::numeric
        END) AS saidas
   FROM (generate_series(now(), (now() + '30 days'::interval), '1 day'::interval) g(g)
     LEFT JOIN financeiro.transacao t ON (((t.data_transacao = (date_trunc('day'::text, g.g))::date) AND (t.status = ANY (ARRAY['previsto'::text, 'liquidado'::text])))))
  GROUP BY ((date_trunc('day'::text, g.g))::date)
  ORDER BY ((date_trunc('day'::text, g.g))::date);;
CREATE VIEW "financeiro"."vw_role_permissions"
AS
 SELECT r.id AS role_id,
    r.nome AS role_nome,
    r.nivel_acesso,
    p.id AS permission_id,
    p.recurso,
    p.acao,
    p.descricao AS permission_descricao
   FROM ((financeiro.role r
     JOIN financeiro.role_permission rp ON ((r.id = rp.role_id)))
     JOIN financeiro.permission p ON ((rp.permission_id = p.id)));;
CREATE VIEW "financeiro"."vw_saldo_por_conta"
AS
 SELECT c.id AS conta_id,
    c.nome AS conta_nome,
    c.tipo,
    (c.saldo_inicial + COALESCE(sum(
        CASE
            WHEN ((t.tipo = 'credito'::text) AND (t.status = 'liquidado'::text)) THEN t.valor
            WHEN ((t.tipo = 'debito'::text) AND (t.status = 'liquidado'::text)) THEN (- t.valor)
            ELSE (0)::numeric
        END), (0)::numeric)) AS saldo_atual
   FROM (financeiro.conta c
     LEFT JOIN financeiro.transacao t ON (((t.conta_id = c.id) AND (t.is_deleted = false))))
  GROUP BY c.id;;
CREATE VIEW "financeiro"."vw_transacao_completo"
AS
 SELECT t.id,
    t.tenant_id,
    t.conta_id,
    co.nome AS conta_nome,
    t.categoria_id AS subcategoria_id,
    sc.nome AS subcategoria_nome,
    sc.parent_id AS categoria_pai_id,
    cp.nome AS categoria_pai_nome,
    t.tipo,
    t.descricao,
    t.valor,
    t.data_transacao,
    t.origem,
    t.referencia,
    t.status,
    t.parcela_id,
    t.is_deleted,
    t.created_at
   FROM (((financeiro.transacao t
     LEFT JOIN financeiro.conta co ON ((co.id = t.conta_id)))
     LEFT JOIN financeiro.categoria sc ON ((sc.id = t.categoria_id)))
     LEFT JOIN financeiro.categoria cp ON ((cp.id = sc.parent_id)));;
CREATE VIEW "financeiro"."vw_user_workspaces"
AS
 SELECT u.id AS usuario_id,
    u.email,
    u.nome AS usuario_nome,
    w.id AS workspace_id,
    w.tenant_id,
    w.nome AS workspace_nome,
    w.descricao AS workspace_descricao,
    w.cor AS workspace_cor,
    w.icone AS workspace_icone,
    uw.padrao AS is_padrao
   FROM ((financeiro.usuario u
     JOIN financeiro.user_workspace uw ON ((u.id = uw.usuario_id)))
     JOIN financeiro.workspace w ON ((uw.workspace_id = w.id)))
  WHERE ((u.ativo = true) AND (w.ativo = true));;
CREATE VIEW "financeiro"."vw_usuario_permissions"
AS
 SELECT DISTINCT u.id AS usuario_id,
    u.email,
    u.nome,
    p.recurso,
    p.acao,
    r.nivel_acesso
   FROM ((((financeiro.usuario u
     JOIN financeiro.user_role ur ON ((u.id = ur.usuario_id)))
     JOIN financeiro.role r ON ((ur.role_id = r.id)))
     JOIN financeiro.role_permission rp ON ((r.id = rp.role_id)))
     JOIN financeiro.permission p ON ((rp.permission_id = p.id)))
  WHERE (u.ativo = true);;
CREATE VIEW "financeiro"."vw_usuarios_roles"
AS
 SELECT u.id AS usuario_id,
    u.email,
    u.nome,
    u.ativo,
    u.ultimo_acesso,
    r.id AS role_id,
    r.nome AS role_nome,
    r.nivel_acesso,
    r.descricao AS role_descricao
   FROM ((financeiro.usuario u
     LEFT JOIN financeiro.user_role ur ON ((u.id = ur.usuario_id)))
     LEFT JOIN financeiro.role r ON ((ur.role_id = r.id)))
  WHERE (u.ativo = true);;
