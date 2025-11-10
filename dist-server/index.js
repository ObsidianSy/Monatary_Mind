import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import { pool, query } from './database.js';
import { authenticateToken, requirePermission, requireRole, getUserByEmail, getUserWithPermissions, createUser, updateLastAccess, logAudit, verifyPassword, generateToken } from './auth.js';
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;
// Resolver caminhos (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Middlewares
app.use(cors({
    origin: ['http://localhost:8080', 'http://localhost:5173'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
// ==================== SERVE FRONTEND (PRODUÇÃO) ====================
if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(__dirname, '../dist');
    app.use(express.static(distDir, {
        index: 'index.html',
        extensions: ['html'],
    }));
    // SPA fallback
    app.get(/^(?!\/api\/).+/, (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
    });
}
// Middleware de log
app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});
// ==================== ROTAS DE AUTENTICAÇÃO ====================
// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email e senha são obrigatórios'
            });
        }
        // Buscar usuário
        const user = await getUserByEmail(pool, email);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Credenciais inválidas'
            });
        }
        // Verificar senha
        const isValid = await verifyPassword(password, user.senha_hash);
        if (!isValid) {
            return res.status(401).json({
                success: false,
                error: 'Credenciais inválidas'
            });
        }
        // Verificar se está ativo
        if (!user.ativo) {
            return res.status(403).json({
                success: false,
                error: 'Usuário desativado'
            });
        }
        // Gerar token
        const token = generateToken({
            userId: user.id,
            email: user.email,
            nome: user.nome
        });
        // Atualizar último acesso
        await updateLastAccess(pool, user.id);
        // Log de auditoria
        await logAudit(pool, user.id, 'login', 'usuario', user.id, null, null, req);
        // Buscar dados completos com permissões
        const userWithPermissions = await getUserWithPermissions(pool, user.id);
        // Enviar token no cookie e no body
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
        });
        res.json({
            success: true,
            token,
            user: {
                id: userWithPermissions?.id,
                email: userWithPermissions?.email,
                nome: userWithPermissions?.nome,
                roles: userWithPermissions?.roles || [],
                permissions: userWithPermissions?.permissions || []
            }
        });
    }
    catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao fazer login'
        });
    }
});
// Registro de novo usuário
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, nome } = req.body;
        if (!email || !password || !nome) {
            return res.status(400).json({
                success: false,
                error: 'Email, senha e nome são obrigatórios'
            });
        }
        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Email inválido'
            });
        }
        // Validar senha (mínimo 8 caracteres)
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'Senha deve ter no mínimo 8 caracteres'
            });
        }
        // Verificar se email já existe
        const existingUser = await getUserByEmail(pool, email);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'Email já cadastrado'
            });
        }
        // Criar usuário (role padrão: USER)
        const user = await createUser(pool, email, password, nome, ['USER']);
        // Log de auditoria
        await logAudit(pool, user.id, 'register', 'usuario', user.id, null, { email, nome }, req);
        res.status(201).json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                nome: user.nome
            }
        });
    }
    catch (error) {
        console.error('Erro no registro:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao registrar usuário'
        });
    }
});
// Obter usuário autenticado
app.get('/api/auth/me', authenticateToken(pool), async (req, res) => {
    try {
        res.json({
            success: true,
            user: {
                id: req.user?.id,
                email: req.user?.email,
                nome: req.user?.nome,
                ativo: req.user?.ativo,
                email_verificado: req.user?.email_verificado,
                ultimo_acesso: req.user?.ultimo_acesso,
                roles: req.user?.roles || [],
                permissions: req.user?.permissions || []
            }
        });
    }
    catch (error) {
        console.error('Erro ao buscar usuário:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar usuário'
        });
    }
});
// Logout
app.post('/api/auth/logout', authenticateToken(pool), async (req, res) => {
    try {
        // Log de auditoria
        await logAudit(pool, req.user?.id || null, 'logout', 'usuario', req.user?.id, null, null, req);
        // Limpar cookie
        res.clearCookie('token');
        res.json({
            success: true,
            message: 'Logout realizado com sucesso'
        });
    }
    catch (error) {
        console.error('Erro no logout:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao fazer logout'
        });
    }
});
// ==================== ROTAS DE USUÁRIOS (Admin) ====================
// Listar todos os usuários (apenas ADMIN+)
app.get('/api/usuarios', authenticateToken(pool), requirePermission('usuario', 'read'), async (req, res) => {
    try {
        const result = await query(`SELECT 
        u.id, u.email, u.nome, u.ativo, u.email_verificado, u.ultimo_acesso, u.created_at,
        json_agg(json_build_object('id', r.id, 'nome', r.nome, 'nivel_acesso', r.nivel_acesso)) as roles
       FROM financeiro.usuario u
       LEFT JOIN financeiro.user_role ur ON u.id = ur.usuario_id
       LEFT JOIN financeiro.role r ON ur.role_id = r.id
       GROUP BY u.id, u.email, u.nome, u.ativo, u.email_verificado, u.ultimo_acesso, u.created_at
       ORDER BY u.created_at DESC`);
        res.json({ success: true, data: result.rows });
    }
    catch (error) {
        console.error('Erro ao buscar usuários:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// Criar novo usuário (apenas ADMIN+)
app.post('/api/usuarios', authenticateToken(pool), requirePermission('usuario', 'create'), async (req, res) => {
    try {
        const { email, password, nome, roles } = req.body;
        if (!email || !password || !nome) {
            return res.status(400).json({
                success: false,
                error: 'Email, senha e nome são obrigatórios'
            });
        }
        // Verificar se email já existe
        const existingUser = await getUserByEmail(pool, email);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'Email já cadastrado'
            });
        }
        // Criar usuário
        const user = await createUser(pool, email, password, nome, roles || ['USER']);
        // Log de auditoria
        await logAudit(pool, req.user?.id || null, 'create', 'usuario', user.id, null, { email, nome, roles }, req);
        res.status(201).json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                nome: user.nome
            }
        });
    }
    catch (error) {
        console.error('Erro ao criar usuário:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// Atualizar usuário (apenas ADMIN+)
app.put('/api/usuarios/:id', authenticateToken(pool), requirePermission('usuario', 'update'), async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, ativo, email_verificado } = req.body;
        // Buscar dados anteriores para auditoria
        const oldUserResult = await query('SELECT * FROM financeiro.usuario WHERE id = $1', [id]);
        const oldUser = oldUserResult.rows[0];
        if (!oldUser) {
            return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
        }
        // Atualizar
        const result = await query(`UPDATE financeiro.usuario 
       SET nome = COALESCE($1, nome), 
           ativo = COALESCE($2, ativo),
           email_verificado = COALESCE($3, email_verificado),
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, email, nome, ativo, email_verificado`, [nome, ativo, email_verificado, id]);
        // Log de auditoria
        await logAudit(pool, req.user?.id || null, 'update', 'usuario', id, oldUser, result.rows[0], req);
        res.json({ success: true, data: result.rows[0] });
    }
    catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// Deletar usuário (apenas SUPER_ADMIN)
app.delete('/api/usuarios/:id', authenticateToken(pool), requireRole(999), async (req, res) => {
    try {
        const { id } = req.params;
        // Buscar dados para auditoria
        const oldUserResult = await query('SELECT * FROM financeiro.usuario WHERE id = $1', [id]);
        const oldUser = oldUserResult.rows[0];
        if (!oldUser) {
            return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
        }
        // Deletar (cascata remove user_roles)
        await query('DELETE FROM financeiro.usuario WHERE id = $1', [id]);
        // Log de auditoria
        await logAudit(pool, req.user?.id || null, 'delete', 'usuario', id, oldUser, null, req);
        res.json({ success: true, message: 'Usuário deletado com sucesso' });
    }
    catch (error) {
        console.error('Erro ao deletar usuário:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// Atribuir roles a um usuário (apenas ADMIN+)
app.post('/api/usuarios/:id/roles', authenticateToken(pool), requirePermission('usuario', 'update'), async (req, res) => {
    try {
        const { id } = req.params;
        const { roleIds } = req.body;
        if (!Array.isArray(roleIds)) {
            return res.status(400).json({ success: false, error: 'roleIds deve ser um array' });
        }
        // Remover roles antigas
        await query('DELETE FROM financeiro.user_role WHERE usuario_id = $1', [id]);
        // Adicionar novas roles
        for (const roleId of roleIds) {
            await query('INSERT INTO financeiro.user_role (usuario_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, roleId]);
        }
        // Log de auditoria
        await logAudit(pool, req.user?.id || null, 'update_roles', 'usuario', id, null, { roleIds }, req);
        res.json({ success: true, message: 'Roles atualizadas com sucesso' });
    }
    catch (error) {
        console.error('Erro ao atribuir roles:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// ==================== ROTAS DE ROLES E PERMISSÕES ====================
// Listar roles
app.get('/api/roles', authenticateToken(pool), async (req, res) => {
    try {
        const result = await query('SELECT * FROM financeiro.role ORDER BY nivel_acesso DESC');
        res.json({ success: true, data: result.rows });
    }
    catch (error) {
        console.error('Erro ao buscar roles:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// Listar permissões
app.get('/api/permissions', authenticateToken(pool), requireRole(100), async (req, res) => {
    try {
        const result = await query('SELECT * FROM financeiro.permission ORDER BY recurso, acao');
        res.json({ success: true, data: result.rows });
    }
    catch (error) {
        console.error('Erro ao buscar permissões:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// Logs de auditoria (apenas ADMIN+)
app.get('/api/audit-logs', authenticateToken(pool), requirePermission('auditoria', 'read'), async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;
        const result = await query(`SELECT a.*, u.email as usuario_email, u.nome as usuario_nome
       FROM financeiro.audit_log a
       LEFT JOIN financeiro.usuario u ON a.usuario_id = u.id
       ORDER BY a.created_at DESC
       LIMIT $1 OFFSET $2`, [limit, offset]);
        res.json({ success: true, data: result.rows });
    }
    catch (error) {
        console.error('Erro ao buscar logs:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// ==================== ROTAS DE TESTE ====================
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/db-test', async (_req, res) => {
    try {
        const result = await query('SELECT NOW() as now, version() as version');
        res.json({
            success: true,
            data: result.rows[0],
            connection: 'PostgreSQL conectado com sucesso!'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// ==================== ROTAS DE CONTAS ====================
// Listar todas as contas
app.get('/api/contas', async (req, res) => {
    try {
        const tenant_id = req.query.tenant_id || 'obsidian';
        const result = await query(`SELECT * FROM financeiro.conta 
       WHERE tenant_id = $1
       ORDER BY nome`, [tenant_id]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Erro ao buscar contas:', error);
        res.status(500).json({ error: error.message });
    }
});
// Criar ou atualizar conta
app.post('/api/contas', async (req, res) => {
    try {
        const { id, nome, tipo, saldo_inicial, tenant_id } = req.body;
        if (!nome || !tipo) {
            return res.status(400).json({ error: 'Nome e tipo são obrigatórios' });
        }
        let result;
        if (id) {
            // Atualizar
            result = await query(`UPDATE financeiro.conta 
         SET nome = $1, tipo = $2, saldo_inicial = $3, updated_at = NOW()
         WHERE id = $4 AND tenant_id = $5
         RETURNING *`, [nome, tipo, saldo_inicial || 0, id, tenant_id || 'obsidian']);
        }
        else {
            // Inserir
            result = await query(`INSERT INTO financeiro.conta (nome, tipo, saldo_inicial, tenant_id)
         VALUES ($1, $2, $3, $4)
         RETURNING *`, [nome, tipo, saldo_inicial || 0, tenant_id || 'obsidian']);
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Erro ao salvar conta:', error);
        res.status(500).json({ error: error.message });
    }
});
// Deletar conta
app.delete('/api/contas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const tenant_id = req.query.tenant_id || 'obsidian';
        await query(`DELETE FROM financeiro.conta WHERE id = $1 AND tenant_id = $2`, [id, tenant_id]);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Erro ao deletar conta:', error);
        res.status(500).json({ error: error.message });
    }
});
// ==================== ROTAS DE CATEGORIAS ====================
// Listar todas as categorias com subcategorias
app.get('/api/categorias', async (req, res) => {
    try {
        const tenant_id = req.query.tenant_id || 'obsidian';
        // Buscar categorias principais
        const categorias = await query(`SELECT * FROM financeiro.categoria 
       WHERE tenant_id = $1 AND parent_id IS NULL
       ORDER BY tipo, nome`, [tenant_id]);
        // Buscar subcategorias
        const subcategorias = await query(`SELECT * FROM financeiro.categoria 
       WHERE tenant_id = $1 AND parent_id IS NOT NULL
       ORDER BY nome`, [tenant_id]);
        // Organizar em árvore
        const tree = categorias.rows.map(cat => ({
            ...cat,
            children: subcategorias.rows.filter(sub => sub.parent_id === cat.id)
        }));
        res.json(tree);
    }
    catch (error) {
        console.error('Erro ao buscar categorias:', error);
        res.status(500).json({ error: error.message });
    }
});
// Criar ou atualizar categoria
app.post('/api/categorias', async (req, res) => {
    try {
        const { id, nome, tipo, parent_id, tenant_id } = req.body;
        if (!nome) {
            return res.status(400).json({ error: 'Nome é obrigatório' });
        }
        // Se não tem parent_id, tipo é obrigatório
        if (!parent_id && !tipo) {
            return res.status(400).json({ error: 'Tipo é obrigatório para categoria principal' });
        }
        let result;
        if (id) {
            // Atualizar
            result = await query(`UPDATE financeiro.categoria 
         SET nome = $1, tipo = $2, parent_id = $3, updated_at = NOW()
         WHERE id = $4 AND tenant_id = $5
         RETURNING *`, [nome, tipo, parent_id, id, tenant_id || 'obsidian']);
        }
        else {
            // Inserir
            result = await query(`INSERT INTO financeiro.categoria (nome, tipo, parent_id, tenant_id)
         VALUES ($1, $2, $3, $4)
         RETURNING *`, [nome, tipo, parent_id, tenant_id || 'obsidian']);
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Erro ao salvar categoria:', error);
        res.status(500).json({ error: error.message });
    }
});
// Deletar categoria
app.delete('/api/categorias/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const tenant_id = req.query.tenant_id || 'obsidian';
        // Verificar se tem subcategorias
        const subs = await query(`SELECT COUNT(*) as count FROM financeiro.categoria WHERE parent_id = $1`, [id]);
        if (parseInt(subs.rows[0].count) > 0) {
            return res.status(400).json({
                error: 'Não é possível deletar categoria com subcategorias'
            });
        }
        await query(`DELETE FROM financeiro.categoria WHERE id = $1 AND tenant_id = $2`, [id, tenant_id]);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Erro ao deletar categoria:', error);
        res.status(500).json({ error: error.message });
    }
});
// ==================== ROTAS DE TRANSAÇÕES ====================
// Listar transações com filtros
app.get('/api/transacoes', async (req, res) => {
    try {
        const { tenant_id = 'obsidian', from, to, conta_id, categoria_id, tipo, status, limit = '100', offset = '0' } = req.query;
        let queryText = `
      SELECT t.*, 
             c.nome as conta_nome,
             cat.nome as categoria_nome,
             cat.parent_id as categoria_parent_id,
             cat.tipo as categoria_tipo,
             parent_cat.nome as categoria_pai_nome,
             parent_cat.id as categoria_pai_id
      FROM financeiro.transacao t
      LEFT JOIN conta c ON t.conta_id = c.id
      LEFT JOIN categoria cat ON t.categoria_id = cat.id
      LEFT JOIN categoria parent_cat ON cat.parent_id = parent_cat.id
      WHERE t.tenant_id = $1
    `;
        const params = [tenant_id];
        let paramIndex = 2;
        if (from) {
            queryText += ` AND t.data_transacao >= $${paramIndex}`;
            params.push(from);
            paramIndex++;
        }
        if (to) {
            queryText += ` AND t.data_transacao <= $${paramIndex}`;
            params.push(to);
            paramIndex++;
        }
        if (conta_id) {
            queryText += ` AND t.conta_id = $${paramIndex}`;
            params.push(conta_id);
            paramIndex++;
        }
        if (categoria_id) {
            // Buscar tanto pela categoria quanto pelas subcategorias
            queryText += ` AND (t.categoria_id = $${paramIndex} OR cat.parent_id = $${paramIndex})`;
            params.push(categoria_id);
            paramIndex++;
        }
        if (tipo) {
            queryText += ` AND t.tipo = $${paramIndex}`;
            params.push(tipo);
            paramIndex++;
        }
        if (status) {
            queryText += ` AND t.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }
        queryText += ` ORDER BY t.data_transacao DESC, t.created_at DESC`;
        queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));
        const result = await query(queryText, params);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Erro ao buscar transações:', error);
        res.status(500).json({ error: error.message });
    }
});
// Criar ou atualizar transação
app.post('/api/transacoes', async (req, res) => {
    try {
        const { id, tipo, valor, descricao, data_transacao, conta_id, conta_destino_id, categoria_id, origem = 'manual', status = 'previsto', referencia, mes_referencia, tenant_id = 'obsidian' } = req.body;
        if (!tipo || !valor || !descricao || !conta_id) {
            return res.status(400).json({
                error: 'Tipo, valor, descrição e conta são obrigatórios'
            });
        }
        // Validar valor positivo
        if (valor <= 0) {
            return res.status(400).json({
                error: 'Valor deve ser maior que zero'
            });
        }
        // Validar categoria para crédito/débito
        if ((tipo === 'credito' || tipo === 'debito') && !categoria_id) {
            return res.status(400).json({
                error: 'Categoria é obrigatória para crédito/débito'
            });
        }
        // Auto-preencher mes_referencia se não fornecido
        const mesRef = mes_referencia || (data_transacao ? data_transacao.substring(0, 7) : null);
        let result;
        if (id) {
            // Atualizar
            result = await query(`UPDATE financeiro.transacao 
         SET tipo = $1, valor = $2, descricao = $3, data_transacao = $4,
             conta_id = $5, categoria_id = $6, status = $7, referencia = $8,
             mes_referencia = $9
         WHERE id = $10 AND tenant_id = $11
         RETURNING *`, [tipo, valor, descricao, data_transacao, conta_id,
                categoria_id, status, referencia, mesRef, id, tenant_id]);
        }
        else {
            // Inserir
            result = await query(`INSERT INTO financeiro.transacao 
         (tipo, valor, descricao, data_transacao, conta_id,
          categoria_id, origem, status, referencia, mes_referencia, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`, [tipo, valor, descricao, data_transacao, conta_id,
                categoria_id, origem, status, referencia, mesRef, tenant_id]);
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Erro ao salvar transação:', error);
        res.status(500).json({ error: error.message });
    }
});
// Pagar transação (marcar previsto -> liquidado)
app.post('/api/transacoes/:id/pagar', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { valor_pago, data_pagamento, conta_id, tenant_id = 'obsidian' } = req.body;
        if (!valor_pago || !data_pagamento || !conta_id) {
            return res.status(400).json({ error: 'valor_pago, data_pagamento e conta_id são obrigatórios' });
        }
        await client.query('BEGIN');
        const tRes = await client.query(`SELECT * FROM financeiro.transacao WHERE id = $1 AND tenant_id = $2`, [id, tenant_id]);
        if (tRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Transação não encontrada' });
        }
        const trans = tRes.rows[0];
        if (trans.status === 'liquidado') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Transação já está liquidada' });
        }
        const updateRes = await client.query(`UPDATE financeiro.transacao
       SET status = 'liquidado', valor = $1, data_transacao = $2, conta_id = $3
       WHERE id = $4 AND tenant_id = $5
       RETURNING *`, [valor_pago, data_pagamento, conta_id, id, tenant_id]);
        await client.query('COMMIT');
        res.json(updateRes.rows[0]);
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao pagar transação:', error);
        res.status(500).json({ error: error.message });
    }
    finally {
        client.release();
    }
});
// Deletar transação
// Deletar transação (apenas ADMIN+ ou SUPER_ADMIN)
app.delete('/api/transacoes/:id', authenticateToken(pool), requirePermission('transacao', 'delete'), async (req, res) => {
    try {
        const { id } = req.params;
        const tenant_id = req.query.tenant_id || 'obsidian';
        // Buscar dados anteriores para auditoria
        const oldDataResult = await query(`SELECT * FROM financeiro.transacao WHERE id = $1 AND tenant_id = $2`, [id, tenant_id]);
        if (oldDataResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Transação não encontrada' });
        }
        await query(`DELETE FROM financeiro.transacao WHERE id = $1 AND tenant_id = $2`, [id, tenant_id]);
        // Log de auditoria
        await logAudit(pool, req.user?.id || null, 'delete', 'transacao', id, oldDataResult.rows[0], null, req);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Erro ao deletar transação:', error);
        res.status(500).json({ error: error.message });
    }
});
// ==================== ROTAS DE CARTÕES ====================
// Listar cartões
app.get('/api/cartoes', async (req, res) => {
    try {
        const tenant_id = req.query.tenant_id || 'obsidian';
        const result = await query(`SELECT c.*, co.nome as conta_pagamento_nome
       FROM financeiro.cartao c
       LEFT JOIN conta co ON c.conta_pagamento_id = co.id
       WHERE c.tenant_id = $1
       ORDER BY c.apelido`, [tenant_id]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Erro ao buscar cartões:', error);
        res.status(500).json({ error: error.message });
    }
});
// Criar ou atualizar cartão
app.post('/api/cartoes', async (req, res) => {
    try {
        const { id, apelido, bandeira, limite_total, dia_fechamento, dia_vencimento, conta_pagamento_id, ativo = true, tenant_id = 'obsidian' } = req.body;
        if (!apelido || !dia_fechamento || !dia_vencimento) {
            return res.status(400).json({
                error: 'Apelido, dia de fechamento e vencimento são obrigatórios'
            });
        }
        let result;
        if (id) {
            // Atualizar
            result = await query(`UPDATE financeiro.cartao 
         SET apelido = $1, bandeira = $2, limite_total = $3, 
             dia_fechamento = $4, dia_vencimento = $5, 
             conta_pagamento_id = $6, ativo = $7, updated_at = NOW()
         WHERE id = $8 AND tenant_id = $9
         RETURNING *`, [apelido, bandeira, limite_total, dia_fechamento, dia_vencimento,
                conta_pagamento_id, ativo, id, tenant_id]);
        }
        else {
            // Inserir
            result = await query(`INSERT INTO financeiro.cartao 
         (apelido, bandeira, limite_total, dia_fechamento, dia_vencimento,
          conta_pagamento_id, ativo, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`, [apelido, bandeira, limite_total, dia_fechamento, dia_vencimento,
                conta_pagamento_id, ativo, tenant_id]);
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Erro ao salvar cartão:', error);
        res.status(500).json({ error: error.message });
    }
});
// ==================== ROTAS DE FATURAS ====================
// Listar faturas
app.get('/api/faturas', async (req, res) => {
    try {
        const { tenant_id = 'obsidian', cartao_id, status, limit = '100' } = req.query;
        let queryText = `
      SELECT f.*, c.apelido as cartao_apelido
      FROM financeiro.fatura f
      LEFT JOIN cartao c ON f.cartao_id = c.id
      WHERE f.tenant_id = $1
    `;
        const params = [tenant_id];
        let paramIndex = 2;
        if (cartao_id) {
            queryText += ` AND f.cartao_id = $${paramIndex}`;
            params.push(cartao_id);
            paramIndex++;
        }
        if (status) {
            queryText += ` AND f.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }
        queryText += ` ORDER BY f.competencia DESC LIMIT $${paramIndex}`;
        params.push(parseInt(limit));
        const result = await query(queryText, params);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Erro ao buscar faturas:', error);
        res.status(500).json({ error: error.message });
    }
});
// ==================== ROTAS DE RECORRÊNCIAS ====================
// Listar recorrências
app.get('/api/recorrencias', async (req, res) => {
    try {
        const tenant_id = req.query.tenant_id || 'obsidian';
        const result = await query(`SELECT r.*, 
              c.nome as conta_nome,
              cat.nome as categoria_nome,
              cat.parent_id as categoria_parent_id,
              cat.tipo as categoria_tipo,
              parent_cat.nome as categoria_pai_nome,
              parent_cat.id as categoria_pai_id
       FROM financeiro.recorrencia r
       LEFT JOIN conta c ON r.conta_id = c.id
       LEFT JOIN categoria cat ON r.categoria_id = cat.id
       LEFT JOIN categoria parent_cat ON cat.parent_id = parent_cat.id
       WHERE r.tenant_id = $1
       ORDER BY r.descricao`, [tenant_id]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Erro ao buscar recorrências:', error);
        res.status(500).json({ error: error.message });
    }
});
// Criar ou atualizar recorrência
app.post('/api/recorrencias', async (req, res) => {
    try {
        const { id, conta_id, categoria_id, tipo, valor, descricao, frequencia, dia_vencimento, data_inicio, data_fim, is_paused = false, alerta_dias_antes, tenant_id = 'obsidian' } = req.body;
        if (!conta_id || !tipo || !valor || !descricao || !frequencia || !data_inicio) {
            return res.status(400).json({
                error: 'Conta, tipo, valor, descrição, frequência e data início são obrigatórios'
            });
        }
        if (!categoria_id) {
            return res.status(400).json({
                error: 'Categoria é obrigatória'
            });
        }
        let result;
        if (id) {
            // Atualizar
            result = await query(`UPDATE financeiro.recorrencia 
         SET conta_id = $1, categoria_id = $2,
             tipo = $3, valor = $4, descricao = $5, frequencia = $6,
             dia_vencimento = $7, data_inicio = $8, data_fim = $9,
             is_paused = $10, alerta_dias_antes = $11, updated_at = NOW()
         WHERE id = $12 AND tenant_id = $13
         RETURNING *`, [conta_id, categoria_id, tipo, valor, descricao,
                frequencia, dia_vencimento, data_inicio, data_fim, is_paused,
                alerta_dias_antes, id, tenant_id]);
        }
        else {
            // Inserir
            result = await query(`INSERT INTO financeiro.recorrencia 
         (conta_id, categoria_id, tipo, valor, descricao,
          frequencia, dia_vencimento, data_inicio, data_fim, is_paused,
          alerta_dias_antes, tenant_id, proxima_ocorrencia)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`, [conta_id, categoria_id, tipo, valor, descricao,
                frequencia, dia_vencimento, data_inicio, data_fim, is_paused,
                alerta_dias_antes, tenant_id, data_inicio]);
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Erro ao salvar recorrência:', error);
        res.status(500).json({ error: error.message });
    }
});
// Deletar recorrência
app.delete('/api/recorrencias/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const tenant_id = req.query.tenant_id || 'obsidian';
        await query(`DELETE FROM financeiro.recorrencia WHERE id = $1 AND tenant_id = $2`, [id, tenant_id]);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Erro ao deletar recorrência:', error);
        res.status(500).json({ error: error.message });
    }
});
// ==================== ROTAS DE COMPRAS (FATURA_ITEM) ====================
// Criar ou atualizar compra no cartão
app.post('/api/compras', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id, cartao_id, fatura_id, categoria_id, descricao, valor, data_compra, parcela_numero, parcela_total, competencia, observacoes, tenant_id = 'obsidian' } = req.body;
        console.log('🛒 POST /api/compras - Dados recebidos:', {
            cartao_id, categoria_id, descricao, valor, data_compra,
            parcela_numero, parcela_total, competencia
        });
        if (!cartao_id || !descricao || !valor || !data_compra) {
            console.error('❌ Validacao falhou - campos obrigatorios faltando');
            return res.status(400).json({
                error: 'cartao_id, descricao, valor e data_compra são obrigatórios'
            });
        }
        // Validar valor positivo
        if (valor <= 0) {
            console.error('❌ Validacao falhou - valor <= 0');
            return res.status(400).json({
                error: 'Valor deve ser maior que zero'
            });
        }
        // Validar parcelas
        if (parcela_numero && parcela_numero < 1) {
            console.error('❌ Validacao falhou - parcela_numero < 1');
            return res.status(400).json({
                error: 'Número da parcela deve ser maior ou igual a 1'
            });
        }
        if (parcela_total && parcela_total < 1) {
            console.error('❌ Validacao falhou - parcela_total < 1');
            return res.status(400).json({
                error: 'Total de parcelas deve ser maior ou igual a 1'
            });
        }
        if (parcela_numero && parcela_total && parcela_numero > parcela_total) {
            console.error('❌ Validacao falhou - parcela_numero > parcela_total');
            return res.status(400).json({
                error: 'Número da parcela não pode ser maior que o total de parcelas'
            });
        }
        if (!categoria_id) {
            console.warn('⚠️  categoria_id nao fornecido - item sera criado sem categoria');
        }
        await client.query('BEGIN');
        let result;
        if (id) {
            // Atualizar compra existente
            result = await client.query(`UPDATE financeiro.fatura_item 
         SET categoria_id = $1, descricao = $2, valor = $3, 
             data_compra = $4, parcela_numero = $5, parcela_total = $6,
             competencia = $7, updated_at = NOW()
         WHERE id = $8 AND tenant_id = $9
         RETURNING *`, [categoria_id, descricao, valor, data_compra, parcela_numero, parcela_total,
                competencia, id, tenant_id]);
        }
        else {
            // Criar nova compra
            // 1. Garantir que a fatura existe
            let faturaIdToUse = fatura_id;
            if (!faturaIdToUse) {
                // Buscar ou criar fatura para a competência
                const competenciaToUse = competencia || new Date(data_compra).toISOString().substring(0, 7) + '-01';
                const faturaExistente = await client.query(`SELECT id, status FROM financeiro.fatura 
           WHERE cartao_id = $1 AND competencia = $2 AND tenant_id = $3`, [cartao_id, competenciaToUse, tenant_id]);
                if (faturaExistente.rows.length > 0) {
                    faturaIdToUse = faturaExistente.rows[0].id;
                    // ✅ Validar se fatura está aberta
                    if (faturaExistente.rows[0].status !== 'aberta') {
                        await client.query('ROLLBACK');
                        return res.status(400).json({
                            error: `Não é possível adicionar compras em fatura ${faturaExistente.rows[0].status}`
                        });
                    }
                }
                else {
                    // Buscar informações do cartão
                    const cartaoResult = await client.query(`SELECT dia_vencimento FROM financeiro.cartao WHERE id = $1 AND tenant_id = $2`, [cartao_id, tenant_id]);
                    if (cartaoResult.rows.length === 0) {
                        await client.query('ROLLBACK');
                        return res.status(404).json({ error: 'Cartão não encontrado' });
                    }
                    const diaVencimento = cartaoResult.rows[0].dia_vencimento;
                    // Calcular data de vencimento e fechamento
                    const competenciaDate = new Date(competenciaToUse);
                    const dataVencimento = new Date(competenciaDate);
                    dataVencimento.setMonth(dataVencimento.getMonth() + 1);
                    dataVencimento.setDate(diaVencimento);
                    // Data de fechamento é 1 semana antes do vencimento
                    const dataFechamento = new Date(dataVencimento);
                    dataFechamento.setDate(dataFechamento.getDate() - 7);
                    console.log('DEBUG Criando nova fatura:', {
                        cartao_id, competenciaToUse,
                        data_vencimento: dataVencimento.toISOString().split('T')[0],
                        data_fechamento: dataFechamento.toISOString().split('T')[0]
                    });
                    // Criar fatura
                    const novaFatura = await client.query(`INSERT INTO financeiro.fatura 
             (cartao_id, competencia, data_vencimento, data_fechamento, valor_fechado, status, tenant_id)
             VALUES ($1, $2, $3, $4, 0, 'aberta', $5)
             RETURNING id`, [cartao_id, competenciaToUse, dataVencimento.toISOString().split('T')[0],
                        dataFechamento.toISOString().split('T')[0], tenant_id]).catch((err) => {
                        // Tratar erro de duplicação (UNIQUE constraint)
                        if (err.code === '23505') { // duplicate key
                            throw new Error(`Fatura para ${competenciaToUse} já existe. Recarregue a página e tente novamente.`);
                        }
                        throw err;
                    });
                    faturaIdToUse = novaFatura.rows[0].id;
                    console.log('DEBUG Fatura criada com ID:', faturaIdToUse);
                }
            }
            // 2. Inserir o item da fatura
            console.log(`📝 Inserindo fatura_item:`, {
                fatura_id: faturaIdToUse,
                parcela: `${parcela_numero || 1}/${parcela_total || 1}`,
                parcela_numero_value: parcela_numero,
                parcela_numero_final: parcela_numero || 1,
                valor,
                descricao
            });
            result = await client.query(`INSERT INTO financeiro.fatura_item 
         (fatura_id, categoria_id, descricao, valor, data_compra,
          parcela_numero, parcela_total, competencia, cartao_id, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`, [faturaIdToUse, categoria_id, descricao, valor, data_compra,
                parcela_numero || 1, parcela_total || 1, competencia, cartao_id, tenant_id]);
            console.log(`✅ Fatura_item criado: ID ${result.rows[0].id}, Parcela: ${result.rows[0].parcela_numero}/${result.rows[0].parcela_total}`);
            // 3. Atualizar transação "A Pagar" da fatura
            const faturaAtualizada = await client.query(`SELECT f.*, c.apelido as cartao_apelido, c.conta_pagamento_id as conta_id
         FROM financeiro.fatura f
         JOIN financeiro.cartao c ON f.cartao_id = c.id
         WHERE f.id = $1`, [faturaIdToUse]);
            const faturaInfo = faturaAtualizada.rows[0];
            // Calcular valor total atualizado da fatura
            const totalFatura = await client.query(`SELECT COALESCE(SUM(valor), 0) as total
         FROM financeiro.fatura_item
         WHERE fatura_id = $1 AND is_deleted = false`, [faturaIdToUse]);
            const valorTotal = parseFloat(totalFatura.rows[0].total);
            // Buscar ou criar categoria "Pagamento Cartão de Crédito"
            let categoriaResult = await client.query(`SELECT id FROM financeiro.categoria 
         WHERE nome = 'Pagamento Cartão de Crédito' 
         AND tipo = 'despesa'
         AND tenant_id = $1
         AND parent_id IS NULL`, [tenant_id]);
            let categoria_pagamento_id;
            if (categoriaResult.rows.length === 0) {
                const newCatResult = await client.query(`INSERT INTO financeiro.categoria (nome, tipo, tenant_id, parent_id)
           VALUES ('Pagamento Cartão de Crédito', 'despesa', $1, NULL)
           RETURNING id`, [tenant_id]);
                categoria_pagamento_id = newCatResult.rows[0].id;
            }
            else {
                categoria_pagamento_id = categoriaResult.rows[0].id;
            }
            // Buscar conta padrão (conta_id do cartão ou primeira conta disponível)
            let conta_id_transacao = faturaInfo.conta_id; // Se cartão tem conta_id configurada
            if (!conta_id_transacao) {
                // Buscar primeira conta disponível do tenant
                const contaResult = await client.query(`SELECT id FROM financeiro.conta 
           WHERE tenant_id = $1 
           ORDER BY id ASC 
           LIMIT 1`, [tenant_id]);
                if (contaResult.rows.length > 0) {
                    conta_id_transacao = contaResult.rows[0].id;
                }
                else {
                    throw new Error('Nenhuma conta encontrada. Crie uma conta antes de registrar compras.');
                }
            }
            // Formatar competência para descrição
            const comp = new Date(faturaInfo.competencia);
            const mesAno = comp.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            const descricaoTransacao = `Fatura ${faturaInfo.cartao_apelido} - ${mesAno}`;
            // Somente criar/atualizar transação "A Pagar" se a fatura estiver aberta
            if (faturaInfo.status === 'aberta') {
                if (faturaInfo.transacao_id) {
                    // Atualizar transação existente com novo valor
                    await client.query(`UPDATE financeiro.transacao
             SET valor = $1,
                 descricao = $2
             WHERE id = $3`, [valorTotal, descricaoTransacao, faturaInfo.transacao_id]);
                    console.log(`✅ Transação ${faturaInfo.transacao_id} atualizada: R$ ${valorTotal}`);
                }
                else {
                    // Criar nova transação "A Pagar"
                    // Converter data_vencimento para string YYYY-MM-DD
                    const dataVencimentoStr = faturaInfo.data_vencimento instanceof Date
                        ? faturaInfo.data_vencimento.toISOString().split('T')[0]
                        : String(faturaInfo.data_vencimento).split('T')[0];
                    const mesReferencia = dataVencimentoStr.substring(0, 7); // YYYY-MM
                    const novaTransacao = await client.query(`INSERT INTO financeiro.transacao 
             (tenant_id, tipo, valor, descricao, data_transacao, conta_id, categoria_id, 
              origem, referencia, status, mes_referencia)
             VALUES ($1, 'debito', $2, $3, $4, $5, $6, $7, $8, 'previsto', $9)
             RETURNING *`, [
                        tenant_id,
                        valorTotal,
                        descricaoTransacao,
                        dataVencimentoStr,
                        conta_id_transacao, // ✅ Agora inclui conta_id
                        categoria_pagamento_id,
                        `fatura:${faturaIdToUse}`,
                        `Fatura ${faturaInfo.competencia}`,
                        mesReferencia
                    ]);
                    // Vincular transação à fatura
                    await client.query(`UPDATE financeiro.fatura
             SET transacao_id = $1
             WHERE id = $2`, [novaTransacao.rows[0].id, faturaIdToUse]);
                    console.log(`✅ Transação ${novaTransacao.rows[0].id} criada (A Pagar): R$ ${valorTotal}`);
                }
            }
            else {
                console.warn(`⚠️ Fatura ${faturaIdToUse} com status '${faturaInfo.status}' — transação A Pagar não criada/atualizada.`);
            }
        }
        await client.query('COMMIT');
        console.log(`✅ Compra processada - Parcela ${parcela_numero || 1}/${parcela_total || 1}`);
        res.json(result.rows[0]);
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ ERRO Parcela ${req.body.parcela_numero}/${req.body.parcela_total}:`, error.message);
        res.status(500).json({ error: error.message });
    }
    finally {
        client.release();
    }
});
// Listar itens de fatura (compras)
app.get('/api/faturas/itens', async (req, res) => {
    try {
        const { tenant_id = 'obsidian', fatura_id, cartao_id, competencia, order = 'data_compra.desc', limit = '100', offset = '0' } = req.query;
        let queryText = `
      SELECT fi.*, 
             cat.nome as categoria_nome,
             cat.parent_id as categoria_parent_id,
             parent_cat.nome as categoria_pai_nome
      FROM financeiro.fatura_item fi
      LEFT JOIN financeiro.categoria cat ON fi.categoria_id = cat.id
      LEFT JOIN financeiro.categoria parent_cat ON cat.parent_id = parent_cat.id
      WHERE fi.tenant_id = $1 AND fi.is_deleted = false
    `;
        const params = [tenant_id];
        let paramIndex = 2;
        if (fatura_id) {
            queryText += ` AND fi.fatura_id = $${paramIndex}`;
            params.push(fatura_id);
            paramIndex++;
        }
        if (cartao_id) {
            queryText += ` AND fi.cartao_id = $${paramIndex}`;
            params.push(cartao_id);
            paramIndex++;
        }
        if (competencia) {
            queryText += ` AND fi.competencia = $${paramIndex}`;
            params.push(competencia);
            paramIndex++;
        }
        // Parse order
        const [orderField, orderDir] = order.split('.');
        const validFields = ['data_compra', 'valor', 'descricao', 'created_at'];
        const field = validFields.includes(orderField) ? orderField : 'data_compra';
        const direction = orderDir?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        // Ordenar por campo escolhido + parcela_numero como critério de desempate
        queryText += ` ORDER BY fi.${field} ${direction}, fi.parcela_numero ASC`;
        queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));
        const result = await query(queryText, params);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Erro ao buscar itens de fatura:', error);
        res.status(500).json({ error: error.message });
    }
});
// ==================== EVENTOS DE FATURA ====================
// Evento: Fechar fatura
app.post('/api/events/fatura.fechar', async (req, res) => {
    const client = await pool.connect();
    try {
        const { cartao_id, competencia, tenant_id } = req.body;
        if (!cartao_id || !competencia) {
            return res.status(400).json({ error: 'cartao_id e competencia são obrigatórios' });
        }
        await client.query('BEGIN');
        // Buscar fatura
        const faturaResult = await client.query(`SELECT * FROM financeiro.fatura 
       WHERE cartao_id = $1 AND competencia = $2 AND tenant_id = $3`, [cartao_id, competencia, tenant_id || 'obsidian']);
        if (faturaResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Fatura não encontrada' });
        }
        const fatura = faturaResult.rows[0];
        if (fatura.status === 'fechada' || fatura.status === 'paga') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Fatura já está fechada ou paga' });
        }
        // Calcular total dos itens
        const totalResult = await client.query(`SELECT COALESCE(SUM(valor), 0) as total
       FROM financeiro.fatura_item
       WHERE fatura_id = $1 AND is_deleted = false AND tenant_id = $2`, [fatura.id, tenant_id || 'obsidian']);
        const valorFechado = parseFloat(totalResult.rows[0].total);
        // ✅ Deletar transação "A Pagar" vinculada (se existir) para evitar duplicatas
        if (fatura.transacao_id) {
            await client.query(`DELETE FROM financeiro.transacao WHERE id = $1`, [fatura.transacao_id]);
            console.log(`🗑️ Transação A Pagar ${fatura.transacao_id} removida ao fechar fatura`);
        }
        // Atualizar fatura como fechada e limpar referência à transação
        const updateResult = await client.query(`UPDATE financeiro.fatura
       SET status = 'fechada',
           valor_fechado = $1,
           data_fechamento = CURRENT_DATE,
           transacao_id = NULL
       WHERE id = $2
       RETURNING *`, [valorFechado, fatura.id]);
        await client.query('COMMIT');
        console.log(`✅ Fatura ${fatura.id} fechada com valor R$ ${valorFechado}`);
        res.json(updateResult.rows[0]);
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao fechar fatura:', error);
        res.status(500).json({ error: error.message });
    }
    finally {
        client.release();
    }
});
// Evento: Pagar fatura (cria transação no ledger)
app.post('/api/events/fatura.pagar', async (req, res) => {
    const client = await pool.connect();
    try {
        const { fatura_id, conta_id, valor_pago, data_pagamento, tenant_id } = req.body;
        if (!fatura_id || !conta_id || !valor_pago || !data_pagamento) {
            return res.status(400).json({
                error: 'fatura_id, conta_id, valor_pago e data_pagamento são obrigatórios'
            });
        }
        await client.query('BEGIN');
        // Buscar fatura
        const faturaResult = await client.query(`SELECT f.*, c.apelido as cartao_apelido 
       FROM financeiro.fatura f
       JOIN financeiro.cartao c ON f.cartao_id = c.id
       WHERE f.id = $1 AND f.tenant_id = $2`, [fatura_id, tenant_id || 'obsidian']);
        if (faturaResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Fatura não encontrada' });
        }
        const fatura = faturaResult.rows[0];
        if (fatura.status === 'paga') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Fatura já está paga' });
        }
        // 1️⃣ Deletar transação "A Pagar" da fatura (some de A Pagar)
        if (fatura.transacao_id) {
            await client.query(`DELETE FROM financeiro.transacao WHERE id = $1`, [fatura.transacao_id]);
            console.log(`🗑️  Transação A Pagar ${fatura.transacao_id} removida`);
        }
        // 2️⃣ Buscar itens da fatura para desmembrar em transações separadas
        const itensResult = await client.query(`SELECT fi.*, cat.nome as categoria_nome
       FROM financeiro.fatura_item fi
       LEFT JOIN financeiro.categoria cat ON fi.categoria_id = cat.id
       WHERE fi.fatura_id = $1 AND fi.is_deleted = false
       ORDER BY fi.data_compra, fi.parcela_numero`, [fatura_id]);
        console.log(`📦 Desmembrando ${itensResult.rows.length} itens da fatura...`);
        // 3️⃣ Criar transações separadas para cada item
        for (const item of itensResult.rows) {
            const descricaoItem = item.parcela_total > 1
                ? `${item.descricao} (${item.parcela_numero}/${item.parcela_total})`
                : item.descricao;
            // Converter data_compra para string se for Date
            const dataCompraStr = item.data_compra instanceof Date
                ? item.data_compra.toISOString().split('T')[0]
                : String(item.data_compra).split('T')[0];
            await client.query(`INSERT INTO financeiro.transacao 
         (tenant_id, tipo, valor, descricao, data_transacao, conta_id, categoria_id, 
          origem, referencia, status, mes_referencia)
         VALUES ($1, 'debito', $2, $3, $4, $5, $6, $7, $8, 'liquidado', $9)`, [
                tenant_id || 'obsidian',
                item.valor,
                descricaoItem,
                data_pagamento,
                conta_id,
                item.categoria_id,
                `fatura_item:${item.id}`,
                `Item fatura ${fatura.cartao_apelido} - ${dataCompraStr}`,
                data_pagamento.substring(0, 7) // YYYY-MM (data_pagamento já é string do req.body)
            ]);
        }
        console.log(`✅ ${itensResult.rows.length} transações de itens criadas`);
        // 4️⃣ Atualizar fatura como paga e limpar transacao_id
        const updateResult = await client.query(`UPDATE financeiro.fatura
       SET status = 'paga',
           valor_pago = $1,
           data_pagamento = $2,
           transacao_id = NULL
       WHERE id = $3
       RETURNING *`, [valor_pago, data_pagamento, fatura_id]);
        await client.query('COMMIT');
        console.log(`✅ Fatura ${fatura_id} paga. ${itensResult.rows.length} transações de itens criadas.`);
        res.json({
            fatura: updateResult.rows[0],
            itens_desmembrados: itensResult.rows.length
        });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao pagar fatura:', error);
        res.status(500).json({ error: error.message });
    }
    finally {
        client.release();
    }
});
// ==================== INICIAR SERVIDOR ====================
app.listen(PORT, () => {
    console.log(`\n🚀 Servidor backend rodando em http://localhost:${PORT}`);
    console.log(`📊 Conectado ao PostgreSQL em ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    console.log(`🗄️  Database: ${process.env.DB_NAME}\n`);
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM recebido, fechando servidor...');
    await pool.end();
    process.exit(0);
});
