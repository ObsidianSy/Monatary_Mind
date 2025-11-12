import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { pool, query } from './database.js';
import {
  authenticateToken,
  requirePermission,
  requireRole,
  getUserByEmail,
  getUserWithPermissions,
  createUser,
  updateLastAccess,
  logAudit,
  hashPassword,
  verifyPassword,
  generateToken,
  AuthRequest
} from './auth.js';

console.log('TZ:', Intl.DateTimeFormat().resolvedOptions().timeZone, new Date().toString());

// Carregar variáveis de ambiente do arquivo .env em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// ✅ Helper para converter Date para YYYY-MM-DD sem timezone shift
function toYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const app = express();
const PORT = process.env.PORT || 3001;

// Resolver caminhos (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares
app.use(cors({
  origin: function (origin, callback) {
    // Permitir requisições sem origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:8080',
      'http://localhost:5173',
      'http://localhost:3000',
      process.env.FRONTEND_URL,
    ].filter(Boolean);

    // Em produção, permitir qualquer origem HTTPS ou localhost
    if (process.env.NODE_ENV === 'production') {
      if (origin.startsWith('https://') || origin.startsWith('http://localhost')) {
        return callback(null, true);
      }
    }

    // Verificar se a origem está na lista permitida
    if (allowedOrigins.indexOf(origin) !== -1 || origin.startsWith('http://localhost')) {
      callback(null, true);
    } else {
      callback(null, true); // Permitir todas em desenvolvimento
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
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
app.post('/api/auth/login', async (req: Request, res: Response) => {
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
  } catch (error: any) {
    console.error('Erro no login:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao fazer login'
    });
  }
});

// Buscar workspaces do usuário
app.get('/api/auth/workspaces', authenticateToken(pool), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const result = await query(
      `SELECT 
        w.id,
        w.tenant_id,
        w.nome,
        w.descricao,
        w.cor,
        w.icone,
        uw.padrao AS is_padrao
      FROM financeiro.workspace w
      JOIN financeiro.user_workspace uw ON w.id = uw.workspace_id
      WHERE uw.usuario_id = $1 AND w.ativo = true
      ORDER BY uw.padrao DESC, w.nome ASC`,
      [userId]
    );

    res.json({
      success: true,
      workspaces: result.rows
    });
  } catch (error: any) {
    console.error('Erro ao buscar workspaces:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar workspaces'
    });
  }
});

// Selecionar workspace (salvar no token ou sessão)
app.post('/api/auth/select-workspace', authenticateToken(pool), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { workspaceId } = req.body;

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        error: 'workspaceId é obrigatório'
      });
    }

    // Verificar se o usuário tem acesso ao workspace
    const result = await query(
      `SELECT 
        w.id,
        w.tenant_id,
        w.nome,
        w.descricao,
        w.cor,
        w.icone
      FROM financeiro.workspace w
      JOIN financeiro.user_workspace uw ON w.id = uw.workspace_id
      WHERE uw.usuario_id = $1 AND w.id = $2 AND w.ativo = true`,
      [userId, workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Você não tem acesso a este workspace'
      });
    }

    const workspace = result.rows[0];

    // Gerar novo token com tenant_id incluso
    const token = generateToken({
      userId: req.user?.id!,
      email: req.user?.email!,
      nome: req.user?.nome!,
      tenantId: workspace.tenant_id
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
    });

    res.json({
      success: true,
      token,
      workspace
    });
  } catch (error: any) {
    console.error('Erro ao selecionar workspace:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao selecionar workspace'
    });
  }
});

// Registro de novo usuário
app.post('/api/auth/register', async (req: Request, res: Response) => {
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
  } catch (error: any) {
    console.error('Erro no registro:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao registrar usuário'
    });
  }
});

// Obter usuário autenticado
app.get('/api/auth/me', authenticateToken(pool), async (req: AuthRequest, res: Response) => {
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
  } catch (error: any) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar usuário'
    });
  }
});

// Logout
app.post('/api/auth/logout', authenticateToken(pool), async (req: AuthRequest, res: Response) => {
  try {
    // Log de auditoria
    await logAudit(pool, req.user?.id || null, 'logout', 'usuario', req.user?.id, null, null, req);

    // Limpar cookie
    res.clearCookie('token');

    res.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });
  } catch (error: any) {
    console.error('Erro no logout:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao fazer logout'
    });
  }
});

// ==================== ROTAS DE USUÁRIOS (Admin) ====================

// Listar todos os usuários (apenas ADMIN+)
app.get('/api/usuarios', authenticateToken(pool), requirePermission('usuario', 'read'), async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT 
        u.id, u.email, u.nome, u.ativo, u.email_verificado, u.ultimo_acesso, u.created_at,
        json_agg(json_build_object('id', r.id, 'nome', r.nome, 'nivel_acesso', r.nivel_acesso)) as roles
       FROM financeiro.usuario u
       LEFT JOIN financeiro.user_role ur ON u.id = ur.usuario_id
       LEFT JOIN financeiro.role r ON ur.role_id = r.id
       GROUP BY u.id, u.email, u.nome, u.ativo, u.email_verificado, u.ultimo_acesso, u.created_at
       ORDER BY u.created_at DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Criar novo usuário (apenas ADMIN+)
app.post('/api/usuarios', authenticateToken(pool), requirePermission('usuario', 'create'), async (req: AuthRequest, res: Response) => {
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
  } catch (error: any) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Atualizar usuário (apenas ADMIN+)
app.put('/api/usuarios/:id', authenticateToken(pool), requirePermission('usuario', 'update'), async (req: AuthRequest, res: Response) => {
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
    const result = await query(
      `UPDATE financeiro.usuario 
       SET nome = COALESCE($1, nome), 
           ativo = COALESCE($2, ativo),
           email_verificado = COALESCE($3, email_verificado),
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, email, nome, ativo, email_verificado`,
      [nome, ativo, email_verificado, id]
    );

    // Log de auditoria
    await logAudit(pool, req.user?.id || null, 'update', 'usuario', id, oldUser, result.rows[0], req);

    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Deletar usuário (apenas SUPER_ADMIN)
app.delete('/api/usuarios/:id', authenticateToken(pool), requireRole(999), async (req: AuthRequest, res: Response) => {
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
  } catch (error: any) {
    console.error('Erro ao deletar usuário:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Atribuir roles a um usuário (apenas ADMIN+)
app.post('/api/usuarios/:id/roles', authenticateToken(pool), requirePermission('usuario', 'update'), async (req: AuthRequest, res: Response) => {
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
      await query(
        'INSERT INTO financeiro.user_role (usuario_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [id, roleId]
      );
    }

    // Log de auditoria
    await logAudit(pool, req.user?.id || null, 'update_roles', 'usuario', id, null, { roleIds }, req);

    res.json({ success: true, message: 'Roles atualizadas com sucesso' });
  } catch (error: any) {
    console.error('Erro ao atribuir roles:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Buscar workspaces de um usuário (apenas ADMIN+)
app.get('/api/usuarios/:id/workspaces', authenticateToken(pool), requirePermission('usuario', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT 
        w.id,
        w.tenant_id,
        w.nome,
        w.descricao,
        w.cor,
        w.icone,
        uw.padrao AS is_padrao
      FROM financeiro.workspace w
      JOIN financeiro.user_workspace uw ON w.id = uw.workspace_id
      WHERE uw.usuario_id = $1 AND w.ativo = true
      ORDER BY uw.padrao DESC, w.nome ASC`,
      [id]
    );

    res.json({ success: true, workspaces: result.rows });
  } catch (error: any) {
    console.error('Erro ao buscar workspaces do usuário:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Atribuir workspaces a um usuário (apenas ADMIN+)
app.post('/api/usuarios/:id/workspaces', authenticateToken(pool), requirePermission('usuario', 'update'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { workspaceIds } = req.body;

    if (!Array.isArray(workspaceIds)) {
      return res.status(400).json({ success: false, error: 'workspaceIds deve ser um array' });
    }

    // Remover workspaces antigos
    await query('DELETE FROM financeiro.user_workspace WHERE usuario_id = $1', [id]);

    // Adicionar novos workspaces
    for (let i = 0; i < workspaceIds.length; i++) {
      const workspaceId = workspaceIds[i];
      const isPadrao = i === 0; // Primeiro será o padrão

      await query(
        'INSERT INTO financeiro.user_workspace (usuario_id, workspace_id, padrao) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [id, workspaceId, isPadrao]
      );
    }

    // Log de auditoria
    await logAudit(pool, req.user?.id || null, 'update_workspaces', 'usuario', id, null, { workspaceIds }, req);

    res.json({ success: true, message: 'Workspaces atualizados com sucesso' });
  } catch (error: any) {
    console.error('Erro ao atribuir workspaces:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ROTAS DE WORKSPACES (ADMIN) ====================

// Listar todos os workspaces (apenas SUPER_ADMIN)
app.get('/api/workspaces/all', authenticateToken(pool), requireRole(999), async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT * FROM financeiro.workspace ORDER BY nome`
    );
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Erro ao buscar workspaces:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Criar novo workspace (apenas SUPER_ADMIN)
app.post('/api/workspaces', authenticateToken(pool), requireRole(999), async (req: AuthRequest, res: Response) => {
  try {
    const { tenant_id, nome, descricao, cor, icone } = req.body;

    if (!tenant_id || !nome) {
      return res.status(400).json({
        success: false,
        error: 'tenant_id e nome são obrigatórios'
      });
    }

    // Verificar se tenant_id já existe
    const existing = await query(
      'SELECT id FROM financeiro.workspace WHERE tenant_id = $1',
      [tenant_id]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Já existe um workspace com este tenant_id'
      });
    }

    // Criar o workspace
    const result = await query(
      `INSERT INTO financeiro.workspace (tenant_id, nome, descricao, cor, icone, ativo)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING *`,
      [tenant_id, nome, descricao || null, cor || 'blue', icone || 'briefcase']
    );

    const newWorkspace = result.rows[0];

    // Adicionar automaticamente o usuário que criou ao workspace
    if (req.user?.id) {
      await query(
        `INSERT INTO financeiro.user_workspace (usuario_id, workspace_id, padrao)
         VALUES ($1, $2, false)
         ON CONFLICT (usuario_id, workspace_id) DO NOTHING`,
        [Number(req.user.id), newWorkspace.id]
      );
    }

    res.json({ success: true, data: newWorkspace });
  } catch (error: any) {
    console.error('Erro ao criar workspace:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Atualizar workspace (apenas SUPER_ADMIN)
app.put('/api/workspaces/:id', authenticateToken(pool), requireRole(999), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { nome, descricao, cor, icone, ativo } = req.body;

    const result = await query(
      `UPDATE financeiro.workspace
       SET nome = COALESCE($1, nome),
           descricao = COALESCE($2, descricao),
           cor = COALESCE($3, cor),
           icone = COALESCE($4, icone),
           ativo = COALESCE($5, ativo),
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [nome, descricao, cor, icone, ativo, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Workspace não encontrado'
      });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Erro ao atualizar workspace:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Deletar workspace (apenas SUPER_ADMIN)
app.delete('/api/workspaces/:id', authenticateToken(pool), requireRole(999), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar se há usuários atribuídos
    const users = await query(
      'SELECT COUNT(*) as count FROM financeiro.user_workspace WHERE workspace_id = $1',
      [id]
    );

    if (parseInt(users.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        error: 'Não é possível excluir workspace com usuários atribuídos. Remova os usuários primeiro.'
      });
    }

    const result = await query(
      'DELETE FROM financeiro.workspace WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Workspace não encontrado'
      });
    }

    res.json({ success: true, message: 'Workspace excluído com sucesso' });
  } catch (error: any) {
    console.error('Erro ao deletar workspace:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Listar usuários com acesso a um workspace (apenas SUPER_ADMIN)
app.get('/api/workspaces/:id/users', authenticateToken(pool), requireRole(999), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT 
        u.id,
        u.nome,
        u.email,
        uw.padrao,
        uw.created_at as acesso_desde
      FROM financeiro.usuario u
      JOIN financeiro.user_workspace uw ON u.id = uw.usuario_id
      WHERE uw.workspace_id = $1
      ORDER BY u.nome`,
      [id]
    );

    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Erro ao buscar usuários do workspace:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Listar todos os usuários (para adicionar ao workspace)
app.get('/api/users/all', authenticateToken(pool), requireRole(999), async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT id, nome, email FROM financeiro.usuario ORDER BY nome`
    );

    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Adicionar usuário ao workspace (apenas SUPER_ADMIN)
app.post('/api/workspaces/:id/users', authenticateToken(pool), requireRole(999), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { usuario_id, padrao } = req.body;

    if (!usuario_id) {
      return res.status(400).json({
        success: false,
        error: 'usuario_id é obrigatório'
      });
    }

    // Verificar se o workspace existe
    const workspace = await query(
      'SELECT id FROM financeiro.workspace WHERE id = $1',
      [id]
    );

    if (workspace.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Workspace não encontrado'
      });
    }

    // Verificar se o usuário existe
    const user = await query(
      'SELECT id FROM financeiro.usuario WHERE id = $1',
      [usuario_id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado'
      });
    }

    // Inserir permissão
    await query(
      `INSERT INTO financeiro.user_workspace (usuario_id, workspace_id, padrao)
       VALUES ($1, $2, $3)
       ON CONFLICT (usuario_id, workspace_id) DO UPDATE
       SET padrao = EXCLUDED.padrao`,
      [usuario_id, id, padrao || false]
    );

    res.json({ success: true, message: 'Usuário adicionado ao workspace com sucesso' });
  } catch (error: any) {
    console.error('Erro ao adicionar usuário ao workspace:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remover usuário do workspace (apenas SUPER_ADMIN)
app.delete('/api/workspaces/:id/users/:userId', authenticateToken(pool), requireRole(999), async (req: AuthRequest, res: Response) => {
  try {
    const { id, userId } = req.params;

    const result = await query(
      'DELETE FROM financeiro.user_workspace WHERE workspace_id = $1 AND usuario_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Permissão não encontrada'
      });
    }

    res.json({ success: true, message: 'Usuário removido do workspace com sucesso' });
  } catch (error: any) {
    console.error('Erro ao remover usuário do workspace:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ROTAS DE ROLES E PERMISSÕES ====================

// Listar roles
app.get('/api/roles', authenticateToken(pool), async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT * FROM financeiro.role ORDER BY nivel_acesso DESC'
    );
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Erro ao buscar roles:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Listar permissões
app.get('/api/permissions', authenticateToken(pool), requireRole(100), async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT * FROM financeiro.permission ORDER BY recurso, acao'
    );
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Erro ao buscar permissões:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Logs de auditoria (apenas ADMIN+)
app.get('/api/audit-logs', authenticateToken(pool), requirePermission('auditoria', 'read'), async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await query(
      `SELECT a.*, u.email as usuario_email, u.nome as usuario_nome
       FROM financeiro.audit_log a
       LEFT JOIN financeiro.usuario u ON a.usuario_id = u.id
       ORDER BY a.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Erro ao buscar logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ROTAS DE TESTE ====================

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/db-test', async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT NOW() as now, version() as version');
    res.json({
      success: true,
      data: result.rows[0],
      connection: 'PostgreSQL conectado com sucesso!'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== ROTAS DE CONTAS ====================

// Listar todas as contas
app.get('/api/contas', authenticateToken(pool), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Selecione um workspace primeiro' });
    }
    const result = await query(
      `SELECT * FROM financeiro.conta 
       WHERE tenant_id = $1
       ORDER BY nome`,
      [tenantId]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Erro ao buscar contas:', error);
    res.status(500).json({ error: error.message });
  }
});

// Criar ou atualizar conta
app.post('/api/contas', authenticateToken(pool), async (req: AuthRequest, res: Response) => {
  try {
    const { id, nome, tipo, saldo_inicial } = req.body;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'Selecione um workspace primeiro' });
    }

    if (!nome || !tipo) {
      return res.status(400).json({ error: 'Nome e tipo são obrigatórios' });
    }

    let result;
    if (id) {
      // Atualizar
      result = await query(
        `UPDATE financeiro.conta 
         SET nome = $1, tipo = $2, saldo_inicial = $3
         WHERE id = $4 AND tenant_id = $5
         RETURNING *`,
        [nome, tipo, saldo_inicial || 0, id, tenantId]
      );
    } else {
      // Inserir
      result = await query(
        `INSERT INTO financeiro.conta (nome, tipo, saldo_inicial, tenant_id)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [nome, tipo, saldo_inicial || 0, tenantId]
      );
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Erro ao salvar conta:', error);
    res.status(500).json({ error: error.message });
  }
});

// Deletar conta
app.delete('/api/contas/:id', authenticateToken(pool), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Selecione um workspace primeiro' });
    }

    await query(
      `DELETE FROM financeiro.conta WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao deletar conta:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ROTAS DE PROJEÇÃO E SALDO ====================

// Saldo das contas
app.get('/api/saldo_conta', authenticateToken(pool), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Selecione um workspace primeiro' });
    }
    const result = await query(
      `SELECT id, nome, tipo, saldo_inicial, 
         saldo_inicial as saldo_atual
       FROM financeiro.conta
       WHERE tenant_id = $1
       ORDER BY nome`,
      [tenantId]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Erro ao buscar saldo das contas:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fluxo dos próximos 30 dias
app.get('/api/fluxo_30d', authenticateToken(pool), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Selecione um workspace primeiro' });
    }

    // Buscar transações futuras (próximos 30 dias)
    const result = await query(
      `SELECT 
         to_char(data_transacao, 'YYYY-MM-DD') as dia,
         SUM(CASE WHEN tipo = 'credito' THEN valor ELSE 0 END) as entradas,
         SUM(CASE WHEN tipo = 'debito' THEN valor ELSE 0 END) as saidas
       FROM financeiro.transacao
       WHERE tenant_id = $1
         AND data_transacao >= CURRENT_DATE
         AND data_transacao < CURRENT_DATE + INTERVAL '30 days'
       GROUP BY data_transacao
       ORDER BY data_transacao`,
      [tenantId]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Erro ao buscar fluxo de caixa:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ROTAS DE CATEGORIAS ====================

// Listar todas as categorias com subcategorias
app.get('/api/categorias', authenticateToken(pool), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Selecione um workspace primeiro' });
    }

    // Buscar categorias principais
    const categorias = await query(
      `SELECT * FROM financeiro.categoria 
       WHERE tenant_id = $1 AND parent_id IS NULL
       ORDER BY tipo, nome`,
      [tenantId]
    );

    // Buscar subcategorias
    const subcategorias = await query(
      `SELECT * FROM financeiro.categoria 
       WHERE tenant_id = $1 AND parent_id IS NOT NULL
       ORDER BY nome`,
      [tenantId]
    );

    // Organizar em árvore
    const tree = categorias.rows.map(cat => ({
      ...cat,
      children: subcategorias.rows.filter(sub => sub.parent_id === cat.id)
    }));

    res.json(tree);
  } catch (error: any) {
    console.error('Erro ao buscar categorias:', error);
    res.status(500).json({ error: error.message });
  }
});

// Criar ou atualizar categoria
app.post('/api/categorias', authenticateToken(pool), async (req: AuthRequest, res: Response) => {
  try {
    let { id, nome, tipo, parent_id } = req.body;
    const tenantId = req.user?.tenantId;

    console.log('📝 POST /api/categorias - Dados recebidos:', { id, nome, tipo, parent_id, tenantId });

    if (!tenantId) {
      return res.status(400).json({ error: 'Selecione um workspace primeiro' });
    }

    if (!nome) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    // Se tem parent_id, buscar o tipo da categoria pai
    if (parent_id && !tipo) {
      const parentResult = await query(
        `SELECT tipo FROM financeiro.categoria WHERE id = $1 AND tenant_id = $2`,
        [parent_id, tenantId]
      );

      if (parentResult.rows.length === 0) {
        return res.status(400).json({ error: 'Categoria pai não encontrada' });
      }

      tipo = parentResult.rows[0].tipo;
      console.log('🔗 Subcategoria herda tipo da categoria pai:', tipo);
    }

    // Se não tem parent_id, tipo é obrigatório
    if (!parent_id && !tipo) {
      return res.status(400).json({ error: 'Tipo é obrigatório para categoria principal' });
    }

    let result;
    if (id) {
      // Atualizar
      console.log('🔄 Atualizando categoria:', { id, nome, tipo, parent_id, tenantId });
      result = await query(
        `UPDATE financeiro.categoria 
         SET nome = $1, tipo = $2, parent_id = $3
         WHERE id = $4 AND tenant_id = $5
         RETURNING *`,
        [nome, tipo, parent_id, id, tenantId]
      );
    } else {
      // Inserir
      console.log('➕ Inserindo nova categoria:', { nome, tipo, parent_id, tenantId });
      result = await query(
        `INSERT INTO financeiro.categoria (nome, tipo, parent_id, tenant_id)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [nome, tipo, parent_id, tenantId]
      );
    }

    console.log('✅ Categoria salva com sucesso:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('❌ Erro ao salvar categoria:', error);
    res.status(500).json({ error: error.message });
  }
});

// Deletar categoria
app.delete('/api/categorias/:id', authenticateToken(pool), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    console.log('🗑️ DELETE /api/categorias - Deletando categoria:', { id, tenantId });

    if (!tenantId) {
      return res.status(400).json({ error: 'Selecione um workspace primeiro' });
    }

    // Verificar se tem subcategorias
    const subs = await query(
      `SELECT COUNT(*) as count FROM financeiro.categoria WHERE parent_id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    console.log('🔍 Subcategorias encontradas:', subs.rows[0].count);

    if (parseInt(subs.rows[0].count) > 0) {
      return res.status(400).json({
        error: 'Não é possível deletar categoria com subcategorias'
      });
    }

    const result = await query(
      `DELETE FROM financeiro.categoria WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [id, tenantId]
    );

    console.log('✅ Categoria deletada:', result.rows[0]);
    res.json({ success: true });
  } catch (error: any) {
    console.error('❌ Erro ao deletar categoria:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ROTAS DE TRANSAÇÕES ====================

// Listar transações com filtros
app.get('/api/transacoes', authenticateToken(pool), async (req: AuthRequest, res: Response) => {
  try {
    const {
      tenantId = req.user?.tenantId,
      from,
      to,
      conta_id,
      categoria_id,
      tipo,
      status,
      limit = '100',
      offset = '0'
    } = req.query;

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

    const params: any[] = [tenantId];
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
    params.push(parseInt(limit as string), parseInt(offset as string));

    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Erro ao buscar transações:', error);
    res.status(500).json({ error: error.message });
  }
});

// Criar ou atualizar transação
app.post('/api/transacoes', authenticateToken(pool), async (req: AuthRequest, res: Response) => {
  try {
    const {
      id,
      tipo,
      valor,
      descricao,
      data_transacao,
      conta_id,
      conta_destino_id,
      categoria_id,
      origem = 'manual',
      status = 'previsto',
      referencia,
      mes_referencia
    } = req.body;

    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'Selecione um workspace primeiro' });
    }

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
      result = await query(
        `UPDATE financeiro.transacao 
         SET tipo = $1, valor = $2, descricao = $3, data_transacao = $4,
             conta_id = $5, categoria_id = $6, status = $7, referencia = $8,
             mes_referencia = $9
         WHERE id = $10 AND tenant_id = $11
         RETURNING *`,
        [tipo, valor, descricao, data_transacao, conta_id,
          categoria_id, status, referencia, mesRef, id, tenantId]
      );
    } else {
      // Inserir
      result = await query(
        `INSERT INTO financeiro.transacao 
         (tipo, valor, descricao, data_transacao, conta_id,
          categoria_id, origem, status, referencia, mes_referencia, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [tipo, valor, descricao, data_transacao, conta_id,
          categoria_id, origem, status, referencia, mesRef, tenantId]
      );
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Erro ao salvar transação:', error);
    res.status(500).json({ error: error.message });
  }
});

// Pagar transação (marcar previsto -> liquidado)
app.post('/api/transacoes/:id/pagar', authenticateToken(pool), async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { valor_pago, data_pagamento, conta_id } = req.body;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'Selecione um workspace primeiro' });
    }

    if (!valor_pago || !data_pagamento || !conta_id) {
      return res.status(400).json({ error: 'valor_pago, data_pagamento e conta_id são obrigatórios' });
    }

    await client.query('BEGIN');

    const tRes = await client.query(
      `SELECT * FROM financeiro.transacao WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (tRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Transação não encontrada' });
    }

    const trans = tRes.rows[0];
    if (trans.status === 'liquidado') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Transação já está liquidada' });
    }

    const updateRes = await client.query(
      `UPDATE financeiro.transacao
       SET status = 'liquidado', valor = $1, data_transacao = $2, conta_id = $3
       WHERE id = $4 AND tenant_id = $5
       RETURNING *`,
      [valor_pago, data_pagamento, conta_id, id, tenantId]
    );

    await client.query('COMMIT');
    res.json(updateRes.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Erro ao pagar transação:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Deletar transação
// Deletar transação (apenas ADMIN+ ou SUPER_ADMIN)
app.delete('/api/transacoes/:id', authenticateToken(pool), requirePermission('transacao', 'delete'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Selecione um workspace primeiro' });
    }

    // Buscar dados anteriores para auditoria
    const oldDataResult = await query(
      `SELECT * FROM financeiro.transacao WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (oldDataResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Transação não encontrada' });
    }

    await query(
      `DELETE FROM financeiro.transacao WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    // Log de auditoria
    await logAudit(pool, req.user?.id || null, 'delete', 'transacao', id, oldDataResult.rows[0], null, req);

    res.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao deletar transação:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ROTAS DE CARTÕES ====================

// Listar cartões
app.get('/api/cartoes', authenticateToken(pool), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Selecione um workspace primeiro' });
    }
    const result = await query(
      `SELECT c.*, co.nome as conta_pagamento_nome
       FROM financeiro.cartao c
       LEFT JOIN conta co ON c.conta_pagamento_id = co.id
       WHERE c.tenant_id = $1
       ORDER BY c.apelido`,
      [tenantId]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Erro ao buscar cartões:', error);
    res.status(500).json({ error: error.message });
  }
});

// Criar ou atualizar cartão
app.post('/api/cartoes', authenticateToken(pool), async (req: AuthRequest, res: Response) => {
  try {
    const {
      id,
      apelido,
      bandeira,
      limite_total,
      dia_fechamento,
      dia_vencimento,
      conta_pagamento_id,
      is_deleted = false,
      tenantId = req.user?.tenantId
    } = req.body;

    // Validação: campos obrigatórios apenas para INSERT
    if (!id && (!apelido || !dia_fechamento || !dia_vencimento)) {
      return res.status(400).json({
        error: 'Apelido, dia de fechamento e vencimento são obrigatórios'
      });
    }

    let result;
    if (id) {
      // Atualizar - monta query dinâmica apenas com campos fornecidos
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (apelido !== undefined) {
        updates.push(`apelido = $${paramCount++}`);
        values.push(apelido);
      }
      if (bandeira !== undefined) {
        updates.push(`bandeira = $${paramCount++}`);
        values.push(bandeira);
      }
      if (limite_total !== undefined) {
        updates.push(`limite_total = $${paramCount++}`);
        values.push(limite_total);
      }
      if (dia_fechamento !== undefined) {
        updates.push(`dia_fechamento = $${paramCount++}`);
        values.push(dia_fechamento);
      }
      if (dia_vencimento !== undefined) {
        updates.push(`dia_vencimento = $${paramCount++}`);
        values.push(dia_vencimento);
      }
      if (conta_pagamento_id !== undefined) {
        updates.push(`conta_pagamento_id = $${paramCount++}`);
        values.push(conta_pagamento_id);
      }
      if (is_deleted !== undefined) {
        updates.push(`is_deleted = $${paramCount++}`);
        values.push(is_deleted);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          error: 'Nenhum campo para atualizar'
        });
      }

      values.push(id);
      values.push(tenantId);

      result = await query(
        `UPDATE financeiro.cartao 
         SET ${updates.join(', ')}
         WHERE id = $${paramCount++} AND tenant_id = $${paramCount++}
         RETURNING *`,
        values
      );
    } else {
      // Inserir
      result = await query(
        `INSERT INTO financeiro.cartao 
         (apelido, bandeira, limite_total, dia_fechamento, dia_vencimento,
          conta_pagamento_id, is_deleted, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [apelido, bandeira, limite_total, dia_fechamento, dia_vencimento,
          conta_pagamento_id, is_deleted, tenantId]
      );
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Erro ao salvar cartão:', error);
    res.status(500).json({ error: error.message });
  }
});

// Deletar cartão (soft delete)
app.delete('/api/cartoes/:id', authenticateToken(pool), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'Selecione um workspace primeiro' });
    }

    // Verificar se existem faturas abertas para este cartão
    const faturasResult = await query(
      `SELECT COUNT(*) as total 
       FROM financeiro.fatura 
       WHERE cartao_id = $1 AND tenant_id = $2 AND status = 'aberta'`,
      [id, tenantId]
    );

    if (parseInt(faturasResult.rows[0].total) > 0) {
      return res.status(409).json({
        error: 'Não é possível excluir cartão com faturas em aberto'
      });
    }

    // Soft delete
    const result = await query(
      `UPDATE financeiro.cartao 
       SET is_deleted = true 
       WHERE id = $1 AND tenant_id = $2 
       RETURNING *`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cartão não encontrado' });
    }

    res.json({ message: 'Cartão excluído com sucesso', cartao: result.rows[0] });
  } catch (error: any) {
    console.error('Erro ao deletar cartão:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ROTAS DE FATURAS ====================

// Listar faturas
app.get('/api/faturas', authenticateToken(pool), async (req: AuthRequest, res: Response) => {
  try {
    const {
      tenantId = req.user?.tenantId,
      cartao_id,
      status,
      limit = '100'
    } = req.query;

    let queryText = `
      SELECT f.*, c.apelido as cartao_apelido
      FROM financeiro.fatura f
      LEFT JOIN cartao c ON f.cartao_id = c.id
      WHERE f.tenant_id = $1
    `;

    const params: any[] = [tenantId];
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
    params.push(parseInt(limit as string));

    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Erro ao buscar faturas:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ROTAS DE RECORRÊNCIAS ====================

// Listar recorrências
app.get('/api/recorrencias', authenticateToken(pool), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Selecione um workspace primeiro' });
    }
    const result = await query(
      `SELECT r.*, 
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
       ORDER BY r.descricao`,
      [tenantId]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Erro ao buscar recorrências:', error);
    res.status(500).json({ error: error.message });
  }
});

// Criar ou atualizar recorrência
app.post('/api/recorrencias', authenticateToken(pool), async (req: AuthRequest, res: Response) => {
  try {
    const {
      id,
      conta_id,
      categoria_id,
      tipo,
      valor,
      descricao,
      frequencia,
      dia_vencimento,
      data_inicio,
      data_fim,
      is_paused = false,
      alerta_dias_antes,
      tenantId = req.user?.tenantId
    } = req.body;

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
      result = await query(
        `UPDATE financeiro.recorrencia 
         SET conta_id = $1, categoria_id = $2,
             tipo = $3, valor = $4, descricao = $5, frequencia = $6,
             dia_vencimento = $7, data_inicio = $8, data_fim = $9,
             is_paused = $10, alerta_dias_antes = $11
         WHERE id = $12 AND tenant_id = $13
         RETURNING *`,
        [conta_id, categoria_id, tipo, valor, descricao,
          frequencia, dia_vencimento, data_inicio, data_fim, is_paused,
          alerta_dias_antes, id, tenantId]
      );
    } else {
      // Inserir
      result = await query(
        `INSERT INTO financeiro.recorrencia 
         (conta_id, categoria_id, tipo, valor, descricao,
          frequencia, dia_vencimento, data_inicio, data_fim, is_paused,
          alerta_dias_antes, tenantId, proxima_ocorrencia)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [conta_id, categoria_id, tipo, valor, descricao,
          frequencia, dia_vencimento, data_inicio, data_fim, is_paused,
          alerta_dias_antes, tenantId, data_inicio]
      );
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Erro ao salvar recorrência:', error);
    res.status(500).json({ error: error.message });
  }
});

// Deletar recorrência
app.delete('/api/recorrencias/:id', authenticateToken(pool), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Selecione um workspace primeiro' });
    }

    await query(
      `DELETE FROM financeiro.recorrencia WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao deletar recorrência:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ROTAS DE COMPRAS (FATURA_ITEM) ====================

// Criar ou atualizar compra no cartão
app.post('/api/compras', authenticateToken(pool), async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();

  try {
    const {
      id,
      cartao_id,
      fatura_id,
      categoria_id,
      descricao,
      valor,
      data_compra,
      parcela_numero,
      parcela_total,
      competencia,
      observacoes,
      tenantId = req.user?.tenantId
    } = req.body;

    console.log('🛒 POST /api/compras - Dados recebidos:', {
      cartao_id, categoria_id, descricao, valor, data_compra,
      parcela_numero, parcela_total, competencia,
      data_compra_tipo: typeof data_compra,
      data_compra_parseada: data_compra ? new Date(data_compra) : null
    });

    console.log(`🔥 CRIANDO COMPRA: "${descricao}" - Parcela ${parcela_numero || 1}/${parcela_total || 1}`);

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
      // ✅ VALIDAÇÃO: Não permitir editar compras de faturas pagas
      const itemExistente = await client.query(
        `SELECT fi.*, f.status as fatura_status
         FROM financeiro.fatura_item fi
         JOIN financeiro.fatura f ON fi.fatura_id = f.id
         WHERE fi.id = $1 AND fi.tenant_id = $2`,
        [id, tenantId]
      );

      if (itemExistente.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Compra não encontrada' });
      }

      if (itemExistente.rows[0].fatura_status === 'paga') {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Não é possível editar compras de faturas já pagas'
        });
      }

      if (itemExistente.rows[0].fatura_status === 'fechada') {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Não é possível editar compras de faturas fechadas'
        });
      }

      // Atualizar compra existente
      result = await client.query(
        `UPDATE financeiro.fatura_item 
         SET categoria_id = $1, descricao = $2, valor = $3, 
             data_compra = $4, parcela_numero = $5, parcela_total = $6,
             competencia = $7
         WHERE id = $8 AND tenant_id = $9
         RETURNING *`,
        [categoria_id, descricao, valor, data_compra, parcela_numero, parcela_total,
          competencia, id, tenantId]
      );
    } else {
      // Criar nova compra
      // 1. Garantir que a fatura existe
      let faturaIdToUse = fatura_id;

      if (!faturaIdToUse) {
        // Buscar ou criar fatura para a competência
        // ✅ TZ-safe: construir competencia sem depender de toISOString (evita voltar um dia em UTC)
        const competenciaToUse = competencia || (() => {
          // Parse yyyy-MM-dd como LOCAL, não UTC (adiciona T00:00 força local time)
          const [y, m, d] = data_compra.split('-').map(Number);
          const dc = new Date(y, m - 1, d); // Construir com ano, mês (0-11), dia
          const year = dc.getFullYear();
          const month = String(dc.getMonth() + 1).padStart(2, '0');
          console.log(`📅 Fallback competencia: data_compra=${data_compra} -> ${year}-${month}-01 (dia=${dc.getDate()})`);
          return `${year}-${month}-01`;
        })();

        const faturaExistente = await client.query(
          `SELECT id, status FROM financeiro.fatura 
           WHERE cartao_id = $1 AND competencia = $2 AND tenant_id = $3`,
          [cartao_id, competenciaToUse, tenantId]
        );

        if (faturaExistente.rows.length > 0) {
          faturaIdToUse = faturaExistente.rows[0].id;

          // ✅ Validar se fatura está aberta
          if (faturaExistente.rows[0].status !== 'aberta') {
            await client.query('ROLLBACK');
            return res.status(400).json({
              error: `Não é possível adicionar compras em fatura ${faturaExistente.rows[0].status}`
            });
          }
        } else {
          // Buscar informações do cartão
          const cartaoResult = await client.query(
            `SELECT dia_vencimento FROM financeiro.cartao WHERE id = $1 AND tenant_id = $2`,
            [cartao_id, tenantId]
          );

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
            data_vencimento: toYmd(dataVencimento),
            data_fechamento: toYmd(dataFechamento)
          });

          // Criar fatura
          const novaFatura = await client.query(
            `INSERT INTO financeiro.fatura 
             (cartao_id, competencia, data_vencimento, data_fechamento, valor_fechado, status, tenant_id)
             VALUES ($1, $2, $3, $4, 0, 'aberta', $5)
             RETURNING id`,
            [cartao_id, competenciaToUse, toYmd(dataVencimento),
              toYmd(dataFechamento), tenantId]
          ).catch((err) => {
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

      result = await client.query(
        `INSERT INTO financeiro.fatura_item 
         (fatura_id, categoria_id, descricao, valor, data_compra,
          parcela_numero, parcela_total, competencia, cartao_id, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [faturaIdToUse, categoria_id, descricao, valor, data_compra,
          parcela_numero || 1, parcela_total || 1, competencia, cartao_id, tenantId]
      );

      console.log(`✅ Fatura_item criado: ID ${result.rows[0].id}, Parcela: ${result.rows[0].parcela_numero}/${result.rows[0].parcela_total}, data_compra=${result.rows[0].data_compra}, competencia=${result.rows[0].competencia}`);

      // 3. Atualizar transação "A Pagar" da fatura
      const faturaAtualizada = await client.query(
        `SELECT f.*, c.apelido as cartao_apelido, c.conta_pagamento_id as conta_id
         FROM financeiro.fatura f
         JOIN financeiro.cartao c ON f.cartao_id = c.id
         WHERE f.id = $1`,
        [faturaIdToUse]
      );

      const faturaInfo = faturaAtualizada.rows[0];

      // Calcular valor total atualizado da fatura
      const totalFatura = await client.query(
        `SELECT COALESCE(SUM(valor), 0) as total
         FROM financeiro.fatura_item
         WHERE fatura_id = $1 AND is_deleted = false`,
        [faturaIdToUse]
      );

      const valorTotal = parseFloat(totalFatura.rows[0].total);

      // Buscar ou criar categoria "Pagamento Cartão de Crédito"
      let categoriaResult = await client.query(
        `SELECT id FROM financeiro.categoria 
         WHERE nome = 'Pagamento Cartão de Crédito' 
         AND tipo = 'despesa'
         AND tenant_id = $1
         AND parent_id IS NULL`,
        [tenantId]
      );

      let categoria_pagamento_id;
      if (categoriaResult.rows.length === 0) {
        const newCatResult = await client.query(
          `INSERT INTO financeiro.categoria (nome, tipo, tenantId, parent_id)
           VALUES ('Pagamento Cartão de Crédito', 'despesa', $1, NULL)
           RETURNING id`,
          [tenantId]
        );
        categoria_pagamento_id = newCatResult.rows[0].id;
      } else {
        categoria_pagamento_id = categoriaResult.rows[0].id;
      }

      // Buscar conta padrão (conta_id do cartão ou primeira conta disponível)
      let conta_id_transacao = faturaInfo.conta_id; // Se cartão tem conta_id configurada

      if (!conta_id_transacao) {
        // Buscar primeira conta disponível do tenant
        const contaResult = await client.query(
          `SELECT id FROM financeiro.conta 
           WHERE tenant_id = $1 
           ORDER BY id ASC 
           LIMIT 1`,
          [tenantId]
        );

        if (contaResult.rows.length > 0) {
          conta_id_transacao = contaResult.rows[0].id;
        } else {
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
          await client.query(
            `UPDATE financeiro.transacao
             SET valor = $1,
                 descricao = $2
             WHERE id = $3`,
            [valorTotal, descricaoTransacao, faturaInfo.transacao_id]
          );
          console.log(`✅ Transação ${faturaInfo.transacao_id} atualizada: R$ ${valorTotal}`);
        } else {
          // Criar nova transação "A Pagar"
          // Converter data_vencimento para string YYYY-MM-DD (TZ-safe)
          const dataVencimentoStr = faturaInfo.data_vencimento instanceof Date
            ? toYmd(faturaInfo.data_vencimento)
            : String(faturaInfo.data_vencimento).split('T')[0];

          const mesReferencia = dataVencimentoStr.substring(0, 7); // YYYY-MM

          const novaTransacao = await client.query(
            `INSERT INTO financeiro.transacao 
             (tenant_id, tipo, valor, descricao, data_transacao, conta_id, categoria_id, 
              origem, referencia, status, mes_referencia)
             VALUES ($1, 'debito', $2, $3, $4, $5, $6, $7, $8, 'previsto', $9)
             RETURNING *`,
            [
              tenantId,
              valorTotal,
              descricaoTransacao,
              dataVencimentoStr,
              conta_id_transacao,  // ✅ Agora inclui conta_id
              categoria_pagamento_id,
              `fatura:${faturaIdToUse}`,
              `Fatura ${faturaInfo.competencia}`,
              mesReferencia
            ]
          );

          // Vincular transação à fatura
          await client.query(
            `UPDATE financeiro.fatura
             SET transacao_id = $1
             WHERE id = $2`,
            [novaTransacao.rows[0].id, faturaIdToUse]
          );

          console.log(`✅ Transação ${novaTransacao.rows[0].id} criada (A Pagar): R$ ${valorTotal}`);
        }
      } else {
        console.warn(`⚠️ Fatura ${faturaIdToUse} com status '${faturaInfo.status}' — transação A Pagar não criada/atualizada.`);
      }
    }

    await client.query('COMMIT');
    console.log(`✅ Compra processada - Parcela ${parcela_numero || 1}/${parcela_total || 1}`);
    res.json(result.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error(`❌ ERRO Parcela ${req.body.parcela_numero}/${req.body.parcela_total}:`, error.message);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Listar itens de fatura (compras)
app.get('/api/faturas/itens', authenticateToken(pool), async (req: AuthRequest, res: Response) => {
  try {
    const {
      tenantId = req.user?.tenantId,
      fatura_id,
      cartao_id,
      competencia,
      order = 'data_compra.desc',
      limit = '100',
      offset = '0'
    } = req.query;

    // ✅ FIX: Retornar data_compra e competencia como strings YYYY-MM-DD
    // Evita conversão automática Date → ISO UTC → shift de timezone no front
    let queryText = `
      SELECT 
        fi.id,
        fi.fatura_id,
        fi.categoria_id,
        fi.descricao,
        TO_CHAR(fi.data_compra, 'YYYY-MM-DD') AS data_compra,
        fi.parcela_numero,
        fi.parcela_total,
        fi.valor,
        TO_CHAR(fi.competencia, 'YYYY-MM-DD') AS competencia,
        fi.cartao_id,
        fi.tenant_id,
        fi.created_at,
        fi.is_deleted,
        cat.nome AS categoria_nome,
        cat.parent_id AS categoria_parent_id,
        parent_cat.nome AS categoria_pai_nome
      FROM financeiro.fatura_item fi
      LEFT JOIN financeiro.categoria cat ON fi.categoria_id = cat.id
      LEFT JOIN financeiro.categoria parent_cat ON cat.parent_id = parent_cat.id
      WHERE fi.tenant_id = $1 AND fi.is_deleted = false
    `;

    const params: any[] = [tenantId];
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
    const [orderField, orderDir] = (order as string).split('.');
    const validFields = ['data_compra', 'valor', 'descricao', 'created_at'];
    const field = validFields.includes(orderField) ? orderField : 'data_compra';
    const direction = orderDir?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // ✅ FIX: Garantir ordenação numérica de parcela_numero (pode estar como TEXT no banco)
    // Nota: data_compra e competencia agora são aliases TO_CHAR, então ordenamos sem prefixo fi.
    const orderColumn = (field === 'data_compra' || field === 'competencia') ? field : `fi.${field}`;
    queryText += ` ORDER BY ${orderColumn} ${direction}, CAST(fi.parcela_numero AS INTEGER) ASC`;
    queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string), parseInt(offset as string));

    console.log('🔍 Query SQL:', queryText);
    console.log('🔍 Params:', params);

    const result = await query(queryText, params);

    // � DEBUG INTENSIVO: Ver TODAS as parcelas retornadas
    console.log('\n�🔥🔥 DEBUG COMPLETO - Total itens:', result.rows.length);
    result.rows.forEach((row, idx) => {
      console.log(`\n[${idx + 1}] ${row.descricao}`);
      console.log(`    📅 Data Compra: ${row.data_compra} (tipo: ${typeof row.data_compra})`);
      console.log(`    🔢 Parcela: ${row.parcela_numero}/${row.parcela_total} (tipos: ${typeof row.parcela_numero}/${typeof row.parcela_total})`);
      console.log(`    💰 Valor: R$ ${row.valor}`);
      console.log(`    📆 Competência: ${row.competencia}`);
      console.log(`    🆔 ID: ${row.id}`);
    });
    console.log('\n🔥🔥🔥 FIM DEBUG\n');

    res.json(result.rows);
  } catch (error: any) {
    console.error('Erro ao buscar itens de fatura:', error);
    res.status(500).json({ error: error.message });
  }
});

// Atualizar parcela (fatura_item) - usado pelo evento parcela.upsert
app.post('/api/parcelas', authenticateToken(pool), async (req: AuthRequest, res: Response) => {
  try {
    const { id, descricao, valor, categoria_id, data_compra } = req.body;
    const tenantId = req.user?.tenantId;

    if (!id) {
      return res.status(400).json({ error: 'ID da parcela é obrigatório' });
    }

    if (!tenantId) {
      return res.status(400).json({ error: 'Selecione um workspace primeiro' });
    }

    // Verificar se a parcela existe e se a fatura não está fechada/paga
    const parcelaResult = await query(
      `SELECT fi.*, f.status as fatura_status
       FROM financeiro.fatura_item fi
       JOIN financeiro.fatura f ON fi.fatura_id = f.id
       WHERE fi.id = $1 AND fi.tenant_id = $2`,
      [id, tenantId]
    );

    if (parcelaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Parcela não encontrada' });
    }

    const parcela = parcelaResult.rows[0];

    if (parcela.fatura_status === 'fechada') {
      return res.status(400).json({
        error: 'Não é possível editar parcelas de fatura fechada'
      });
    }

    if (parcela.fatura_status === 'paga') {
      return res.status(400).json({
        error: 'Não é possível editar parcelas de fatura paga'
      });
    }

    // Atualizar apenas os campos fornecidos
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (descricao !== undefined) {
      updates.push(`descricao = $${paramCount++}`);
      values.push(descricao);
    }
    if (valor !== undefined) {
      updates.push(`valor = $${paramCount++}`);
      values.push(valor);
    }
    if (categoria_id !== undefined) {
      updates.push(`categoria_id = $${paramCount++}`);
      values.push(categoria_id);
    }
    if (data_compra !== undefined) {
      updates.push(`data_compra = $${paramCount++}`);
      values.push(data_compra);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    values.push(id);
    values.push(tenantId);

    const result = await query(
      `UPDATE financeiro.fatura_item 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount++} AND tenant_id = $${paramCount++}
       RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Erro ao atualizar parcela:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== EVENTOS DE FATURA ====================

// Evento: Fechar fatura
app.post('/api/events/fatura.fechar', authenticateToken(pool), async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();

  try {
    const { cartao_id, competencia } = req.body;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'Selecione um workspace primeiro' });
    }

    if (!cartao_id || !competencia) {
      return res.status(400).json({ error: 'cartao_id e competencia são obrigatórios' });
    }

    await client.query('BEGIN');

    // Buscar fatura
    const faturaResult = await client.query(
      `SELECT * FROM financeiro.fatura 
       WHERE cartao_id = $1 AND competencia = $2 AND tenant_id = $3`,
      [cartao_id, competencia, tenantId]
    );

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
    const totalResult = await client.query(
      `SELECT COALESCE(SUM(valor), 0) as total
       FROM financeiro.fatura_item
       WHERE fatura_id = $1 AND is_deleted = false AND tenant_id = $2`,
      [fatura.id, tenantId]
    );

    const valorFechado = parseFloat(totalResult.rows[0].total);

    // ✅ Deletar transação "A Pagar" vinculada (se existir) para evitar duplicatas
    if (fatura.transacao_id) {
      await client.query(
        `DELETE FROM financeiro.transacao WHERE id = $1`,
        [fatura.transacao_id]
      );
      console.log(`🗑️ Transação A Pagar ${fatura.transacao_id} removida ao fechar fatura`);
    }

    // Atualizar fatura como fechada e limpar referência à transação
    const updateResult = await client.query(
      `UPDATE financeiro.fatura
       SET status = 'fechada',
           valor_fechado = $1,
           data_fechamento = CURRENT_DATE,
           transacao_id = NULL
       WHERE id = $2
       RETURNING *`,
      [valorFechado, fatura.id]
    );

    await client.query('COMMIT');

    console.log(`✅ Fatura ${fatura.id} fechada com valor R$ ${valorFechado}`);
    res.json(updateResult.rows[0]);

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Erro ao fechar fatura:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Evento: Pagar fatura (cria transação no ledger)
app.post('/api/events/fatura.pagar', authenticateToken(pool), async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();

  try {
    const { fatura_id, conta_id, valor_pago, data_pagamento } = req.body;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'Selecione um workspace primeiro' });
    }

    if (!fatura_id || !conta_id || !valor_pago || !data_pagamento) {
      return res.status(400).json({
        error: 'fatura_id, conta_id, valor_pago e data_pagamento são obrigatórios'
      });
    }

    await client.query('BEGIN');

    // Buscar fatura
    const faturaResult = await client.query(
      `SELECT f.*, c.apelido as cartao_apelido 
       FROM financeiro.fatura f
       JOIN financeiro.cartao c ON f.cartao_id = c.id
       WHERE f.id = $1 AND f.tenant_id = $2`,
      [fatura_id, tenantId]
    );

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
      await client.query(
        `DELETE FROM financeiro.transacao WHERE id = $1`,
        [fatura.transacao_id]
      );
      console.log(`🗑️  Transação A Pagar ${fatura.transacao_id} removida`);
    }

    // 2️⃣ Buscar itens da fatura para desmembrar em transações separadas
    const itensResult = await client.query(
      `SELECT fi.*, cat.nome as categoria_nome
       FROM financeiro.fatura_item fi
       LEFT JOIN financeiro.categoria cat ON fi.categoria_id = cat.id
       WHERE fi.fatura_id = $1 AND fi.is_deleted = false
       ORDER BY fi.data_compra, fi.parcela_numero`,
      [fatura_id]
    );

    console.log(`📦 Desmembrando ${itensResult.rows.length} itens da fatura...`);

    // 3️⃣ Criar transações separadas para cada item
    for (const item of itensResult.rows) {
      const descricaoItem = item.parcela_total > 1
        ? `${item.descricao} (${item.parcela_numero}/${item.parcela_total})`
        : item.descricao;

      // Converter data_compra para string se for Date (TZ-safe)
      const dataCompraStr = item.data_compra instanceof Date
        ? toYmd(item.data_compra)
        : String(item.data_compra).split('T')[0];

      await client.query(
        `INSERT INTO financeiro.transacao 
         (tenant_id, tipo, valor, descricao, data_transacao, conta_id, categoria_id, 
          origem, referencia, status, mes_referencia)
         VALUES ($1, 'debito', $2, $3, $4, $5, $6, $7, $8, 'liquidado', $9)`,
        [
          tenantId,
          item.valor,
          descricaoItem,
          data_pagamento,
          conta_id,
          item.categoria_id,
          `fatura_item:${item.id}`,
          `Item fatura ${fatura.cartao_apelido} - ${dataCompraStr}`,
          data_pagamento.substring(0, 7) // YYYY-MM (data_pagamento já é string do req.body)
        ]
      );
    }

    console.log(`✅ ${itensResult.rows.length} transações de itens criadas`);

    // 4️⃣ Atualizar fatura como paga e limpar transacao_id
    const updateResult = await client.query(
      `UPDATE financeiro.fatura
       SET status = 'paga',
           valor_pago = $1,
           data_pagamento = $2,
           transacao_id = NULL
       WHERE id = $3
       RETURNING *`,
      [valor_pago, data_pagamento, fatura_id]
    );

    await client.query('COMMIT');

    console.log(`✅ Fatura ${fatura_id} paga. ${itensResult.rows.length} transações de itens criadas.`);
    res.json({
      fatura: updateResult.rows[0],
      itens_desmembrados: itensResult.rows.length
    });

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Erro ao pagar fatura:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// 🔥 DEBUG: Endpoint para verificar TODAS as parcelas TESS no banco
app.get("/api/debug/parcelas", async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        id,
        descricao,
        TO_CHAR(data_compra, 'YYYY-MM-DD') as data_compra,
        TO_CHAR(competencia, 'YYYY-MM-DD') as competencia,
        parcela_numero,
        parcela_total,
        valor,
        fatura_id,
        cartao_id,
        TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at,
        ativo
      FROM financeiro.fatura_item
      WHERE descricao ILIKE '%tess%'
      ORDER BY created_at DESC, parcela_numero
    `);

    const agrupado = result.rows.reduce((acc: any, p: any) => {
      const key = `${p.descricao}_${p.data_compra}_${p.parcela_total}x`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(p);
      return acc;
    }, {});

    res.json({
      total_no_banco: result.rows.length,
      todas_parcelas: result.rows,
      agrupado_por_compra: agrupado,
      diagnostico: {
        tem_parcela_1: result.rows.some((p: any) => p.parcela_numero === 1),
        tem_parcela_2: result.rows.some((p: any) => p.parcela_numero === 2),
        tem_parcela_3: result.rows.some((p: any) => p.parcela_numero === 3),
        ativas: result.rows.filter((p: any) => p.ativo).length,
        inativas: result.rows.filter((p: any) => !p.ativo).length
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 🔍 DEBUG: Endpoint para listar schema completo do banco
app.get("/api/debug/schema", async (req, res) => {
  try {
    // Listar todas as tabelas
    const tablesResult = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'financeiro'
      ORDER BY table_name;
    `);

    const schema: any = {};

    for (const row of tablesResult.rows) {
      const tableName = row.table_name;

      // Colunas
      const columnsResult = await query(`
        SELECT 
          column_name, 
          data_type, 
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'financeiro' 
          AND table_name = $1
        ORDER BY ordinal_position;
      `, [tableName]);

      // Constraints
      const constraintsResult = await query(`
        SELECT 
          tc.constraint_type,
          kcu.column_name,
          ccu.table_name AS foreign_table,
          ccu.column_name AS foreign_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        LEFT JOIN information_schema.constraint_column_usage ccu 
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_schema = 'financeiro' 
          AND tc.table_name = $1
          AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY');
      `, [tableName]);

      schema[tableName] = {
        columns: columnsResult.rows,
        constraints: constraintsResult.rows
      };
    }

    res.json({
      total_tables: tablesResult.rows.length,
      tables: tablesResult.rows.map((r: any) => r.table_name),
      schema
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ROTAS DE ESTOQUE (PRODUTOS) ====================

// GET /api/produtos - Listar produtos ativos do tenant
app.get('/api/produtos', authenticateToken(pool), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant não identificado' });
    }

    const result = await pool.query(`
      SELECT 
        id,
        tenant_id,
        sku,
        nome,
        categoria,
        preco_venda,
        preco_custo,
        quantidade_disponivel,
        quantidade_reservada,
        estoque_minimo,
        is_ativo,
        is_kit,
        variante,
        imagem_url,
        created_at,
        updated_at
      FROM estoque.produto
      WHERE tenant_id = $1 AND is_deleted = false
      ORDER BY nome ASC;
    `, [tenantId]);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Erro ao buscar produtos:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/produtos - Criar novo produto
app.post('/api/produtos', authenticateToken(pool), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant não identificado' });
    }

    const {
      sku,
      nome,
      categoria,
      preco_venda,
      preco_custo,
      quantidade_disponivel,
      quantidade_reservada,
      estoque_minimo,
      is_ativo,
      is_kit,
      variante,
      imagem_url
    } = req.body;

    // Validação básica
    if (!sku || !nome) {
      return res.status(400).json({ error: 'SKU e nome são obrigatórios' });
    }

    const result = await pool.query(`
      INSERT INTO estoque.produto (
        tenant_id,
        sku,
        nome,
        categoria,
        preco_venda,
        preco_custo,
        quantidade_disponivel,
        quantidade_reservada,
        estoque_minimo,
        is_ativo,
        is_kit,
        variante,
        imagem_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `, [
      tenantId,
      sku,
      nome,
      categoria || null,
      preco_venda || 0,
      preco_custo || 0,
      quantidade_disponivel || 0,
      quantidade_reservada || 0,
      estoque_minimo || 0,
      is_ativo !== undefined ? is_ativo : true,
      is_kit || false,
      variante || null,
      imagem_url || null
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Erro ao criar produto:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/produtos/:id - Atualizar produto
app.put('/api/produtos/:id', authenticateToken(pool), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant não identificado' });
    }

    const {
      sku,
      nome,
      categoria,
      preco_venda,
      preco_custo,
      quantidade_disponivel,
      quantidade_reservada,
      estoque_minimo,
      is_ativo,
      is_kit,
      variante,
      imagem_url
    } = req.body;

    // Verificar se produto existe e pertence ao tenant
    const checkResult = await pool.query(
      'SELECT id FROM estoque.produto WHERE id = $1 AND tenant_id = $2 AND is_deleted = false',
      [id, tenantId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    const result = await pool.query(`
      UPDATE estoque.produto
      SET 
        sku = COALESCE($1, sku),
        nome = COALESCE($2, nome),
        categoria = $3,
        preco_venda = COALESCE($4, preco_venda),
        preco_custo = COALESCE($5, preco_custo),
        quantidade_disponivel = COALESCE($6, quantidade_disponivel),
        quantidade_reservada = COALESCE($7, quantidade_reservada),
        estoque_minimo = COALESCE($8, estoque_minimo),
        is_ativo = COALESCE($9, is_ativo),
        is_kit = COALESCE($10, is_kit),
        variante = $11,
        imagem_url = $12,
        updated_at = now()
      WHERE id = $13 AND tenant_id = $14
      RETURNING *;
    `, [
      sku,
      nome,
      categoria,
      preco_venda,
      preco_custo,
      quantidade_disponivel,
      quantidade_reservada,
      estoque_minimo,
      is_ativo,
      is_kit,
      variante,
      imagem_url,
      id,
      tenantId
    ]);

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/produtos/:id - Hard delete (remover permanentemente)
app.delete('/api/produtos/:id', authenticateToken(pool), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant não identificado' });
    }

    // Verificar se produto existe e pertence ao tenant
    const checkResult = await pool.query(
      'SELECT id FROM estoque.produto WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    // Hard delete - remover permanentemente do banco
    await pool.query(
      'DELETE FROM estoque.produto WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    console.log(`✅ Produto ${id} removido permanentemente do banco`);
    res.status(204).send();
  } catch (error: any) {
    console.error('Erro ao deletar produto:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ROTAS DE EQUIPAMENTOS ====================

// GET /api/equipamentos - Listar equipamentos ativos do tenant
app.get('/api/equipamentos', authenticateToken(pool), async (req: AuthRequest, res: Response) => {
  console.log('🔍 GET /api/equipamentos - Requisição recebida');
  try {
    const tenantId = req.user?.tenantId;
    console.log('🔑 Tenant ID:', tenantId);

    if (!tenantId) {
      console.log('❌ Tenant não identificado');
      return res.status(401).json({ error: 'Tenant não identificado' });
    }

    console.log('📡 Executando query no banco...');
    const result = await pool.query(`
      SELECT 
        id,
        tenant_id,
        nome,
        tipo,
        marca,
        modelo,
        numero_serie,
        patrimonio,
        data_aquisicao,
        valor_aquisicao,
        vida_util_anos,
        localizacao,
        status,
        observacoes,
        created_at
      FROM equipamentos.equipamento
      WHERE tenant_id = $1 AND is_deleted = false
      ORDER BY created_at DESC;
    `, [tenantId]);

    console.log(`✅ Query executada: ${result.rows.length} equipamentos encontrados`);
    res.json(result.rows);
  } catch (error: any) {
    console.error('❌ Erro ao buscar equipamentos:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/equipamentos/:id - Buscar equipamento específico
app.get('/api/equipamentos/:id', authenticateToken(pool), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant não identificado' });
    }

    const result = await pool.query(`
      SELECT 
        id,
        tenant_id,
        nome,
        tipo,
        marca,
        modelo,
        numero_serie,
        patrimonio,
        data_aquisicao,
        valor_aquisicao,
        vida_util_anos,
        localizacao,
        status,
        observacoes,
        created_at
      FROM equipamentos.equipamento
      WHERE id = $1 AND tenant_id = $2 AND is_deleted = false;
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipamento não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Erro ao buscar equipamento:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/equipamentos - Criar novo equipamento
app.post('/api/equipamentos', authenticateToken(pool), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant não identificado' });
    }

    const {
      nome,
      tipo,
      marca,
      modelo,
      numero_serie,
      patrimonio,
      data_aquisicao,
      valor_aquisicao,
      vida_util_anos,
      localizacao,
      status,
      observacoes
    } = req.body;

    // Validação básica
    if (!nome || !tipo) {
      return res.status(400).json({ error: 'Nome e tipo são obrigatórios' });
    }

    const result = await pool.query(`
      INSERT INTO equipamentos.equipamento (
        tenant_id,
        nome,
        tipo,
        marca,
        modelo,
        numero_serie,
        patrimonio,
        data_aquisicao,
        valor_aquisicao,
        vida_util_anos,
        localizacao,
        status,
        observacoes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `, [
      tenantId,
      nome,
      tipo,
      marca || null,
      modelo || null,
      numero_serie || null,
      patrimonio || null,
      data_aquisicao || null,
      valor_aquisicao || 0,
      vida_util_anos || 5,
      localizacao || null,
      status || 'ativo',
      observacoes || null
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Erro ao criar equipamento:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/equipamentos/:id - Atualizar equipamento
app.put('/api/equipamentos/:id', authenticateToken(pool), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant não identificado' });
    }

    const {
      nome,
      tipo,
      marca,
      modelo,
      numero_serie,
      patrimonio,
      data_aquisicao,
      valor_aquisicao,
      vida_util_anos,
      localizacao,
      status,
      observacoes
    } = req.body;

    // Verificar se equipamento existe e pertence ao tenant
    const checkResult = await pool.query(
      'SELECT id FROM equipamentos.equipamento WHERE id = $1 AND tenant_id = $2 AND is_deleted = false',
      [id, tenantId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Equipamento não encontrado' });
    }

    const result = await pool.query(`
      UPDATE equipamentos.equipamento
      SET 
        nome = COALESCE($1, nome),
        tipo = COALESCE($2, tipo),
        marca = $3,
        modelo = $4,
        numero_serie = $5,
        patrimonio = $6,
        data_aquisicao = $7,
        valor_aquisicao = COALESCE($8, valor_aquisicao),
        vida_util_anos = COALESCE($9, vida_util_anos),
        localizacao = $10,
        status = COALESCE($11, status),
        observacoes = $12
      WHERE id = $13 AND tenant_id = $14
      RETURNING *;
    `, [
      nome,
      tipo,
      marca,
      modelo,
      numero_serie,
      patrimonio,
      data_aquisicao,
      valor_aquisicao,
      vida_util_anos,
      localizacao,
      status,
      observacoes,
      id,
      tenantId
    ]);

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Erro ao atualizar equipamento:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/equipamentos/:id - Hard delete (remover permanentemente do banco)
app.delete('/api/equipamentos/:id', authenticateToken(pool), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant não identificado' });
    }

    // Verificar se equipamento existe e pertence ao tenant
    const checkResult = await pool.query(
      'SELECT id FROM equipamentos.equipamento WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Equipamento não encontrado' });
    }

    // Hard delete - remover permanentemente do banco
    await pool.query(
      'DELETE FROM equipamentos.equipamento WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    console.log(`✅ Equipamento ${id} removido permanentemente do banco`);
    res.status(204).send();
  } catch (error: any) {
    console.error('Erro ao deletar equipamento:', error);
    res.status(500).json({ error: error.message });
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






