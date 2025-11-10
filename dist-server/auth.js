import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
// ============================================
// CONFIGURAÇÕES
// ============================================
const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-super-segura-mude-em-producao-123456789';
const JWT_EXPIRES_IN = '7d'; // Token expira em 7 dias
const BCRYPT_ROUNDS = 10;
// ============================================
// FUNÇÕES DE HASH E VERIFICAÇÃO
// ============================================
export async function hashPassword(password) {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
}
export async function verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
}
// ============================================
// FUNÇÕES DE JWT
// ============================================
export function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}
export function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    }
    catch (error) {
        return null;
    }
}
// ============================================
// MIDDLEWARE DE AUTENTICAÇÃO
// ============================================
export function authenticateToken(pool) {
    return async (req, res, next) => {
        try {
            // Extrair token do header Authorization ou cookie
            const authHeader = req.headers.authorization;
            const cookieToken = req.cookies?.token;
            const token = authHeader?.startsWith('Bearer ')
                ? authHeader.substring(7)
                : cookieToken;
            if (!token) {
                return res.status(401).json({
                    success: false,
                    error: 'Token não fornecido'
                });
            }
            // Verificar token
            const payload = verifyToken(token);
            if (!payload) {
                return res.status(401).json({
                    success: false,
                    error: 'Token inválido ou expirado'
                });
            }
            // Buscar usuário completo com roles e permissões
            const user = await getUserWithPermissions(pool, payload.userId);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'Usuário não encontrado'
                });
            }
            if (!user.ativo) {
                return res.status(403).json({
                    success: false,
                    error: 'Usuário desativado'
                });
            }
            // Anexar usuário à requisição
            req.user = user;
            next();
        }
        catch (error) {
            console.error('Erro na autenticação:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao autenticar'
            });
        }
    };
}
// ============================================
// MIDDLEWARE DE AUTORIZAÇÃO (Permissões)
// ============================================
export function requirePermission(recurso, acao) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Não autenticado'
            });
        }
        // SUPER_ADMIN tem acesso total
        const isSuperAdmin = req.user.roles.some(r => r.nivel_acesso >= 999);
        if (isSuperAdmin) {
            return next();
        }
        // Verificar se o usuário tem a permissão específica
        const hasPermission = req.user.permissions.some(p => p.recurso === recurso && p.acao === acao);
        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                error: `Sem permissão para ${acao} ${recurso}`,
                required: { recurso, acao }
            });
        }
        next();
    };
}
// ============================================
// MIDDLEWARE DE NÍVEL DE ACESSO
// ============================================
export function requireRole(minLevel) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Não autenticado'
            });
        }
        const maxUserLevel = Math.max(...req.user.roles.map(r => r.nivel_acesso));
        if (maxUserLevel < minLevel) {
            return res.status(403).json({
                success: false,
                error: 'Nível de acesso insuficiente',
                required: minLevel,
                current: maxUserLevel
            });
        }
        next();
    };
}
// ============================================
// FUNÇÕES DE BANCO DE DADOS
// ============================================
export async function getUserByEmail(pool, email) {
    const result = await pool.query('SELECT * FROM financeiro.usuario WHERE email = $1', [email]);
    return result.rows[0] || null;
}
export async function getUserWithPermissions(pool, userId) {
    // Buscar usuário
    const userResult = await pool.query('SELECT id, email, nome, ativo, email_verificado, ultimo_acesso, created_at FROM financeiro.usuario WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
        return null;
    }
    const user = userResult.rows[0];
    // Buscar roles
    const rolesResult = await pool.query(`SELECT r.id, r.nome, r.nivel_acesso
     FROM financeiro.role r
     JOIN financeiro.user_role ur ON r.id = ur.role_id
     WHERE ur.usuario_id = $1`, [userId]);
    // Buscar permissões
    const permissionsResult = await pool.query(`SELECT DISTINCT p.recurso, p.acao
     FROM financeiro.permission p
     JOIN financeiro.role_permission rp ON p.id = rp.permission_id
     JOIN financeiro.user_role ur ON rp.role_id = ur.role_id
     WHERE ur.usuario_id = $1`, [userId]);
    return {
        ...user,
        roles: rolesResult.rows,
        permissions: permissionsResult.rows
    };
}
export async function createUser(pool, email, password, nome, roleNames = ['USER']) {
    // Hash da senha
    const senha_hash = await hashPassword(password);
    // Inserir usuário
    const userResult = await pool.query(`INSERT INTO financeiro.usuario (email, senha_hash, nome, ativo, email_verificado)
     VALUES ($1, $2, $3, true, false)
     RETURNING id, email, nome, ativo, email_verificado, ultimo_acesso, created_at`, [email, senha_hash, nome]);
    const user = userResult.rows[0];
    // Atribuir roles
    for (const roleName of roleNames) {
        const roleResult = await pool.query('SELECT id FROM financeiro.role WHERE nome = $1', [roleName]);
        if (roleResult.rows.length > 0) {
            await pool.query('INSERT INTO financeiro.user_role (usuario_id, role_id) VALUES ($1, $2)', [user.id, roleResult.rows[0].id]);
        }
    }
    return user;
}
export async function updateLastAccess(pool, userId) {
    await pool.query('UPDATE financeiro.usuario SET ultimo_acesso = CURRENT_TIMESTAMP WHERE id = $1', [userId]);
}
export async function logAudit(pool, userId, acao, recurso, recursoId = null, dadosAnteriores = null, dadosNovos = null, req) {
    const ipAddress = req?.ip || req?.headers['x-forwarded-for'] || null;
    const userAgent = req?.headers['user-agent'] || null;
    await pool.query(`INSERT INTO financeiro.audit_log 
     (usuario_id, acao, recurso, recurso_id, dados_anteriores, dados_novos, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
        userId,
        acao,
        recurso,
        recursoId,
        dadosAnteriores ? JSON.stringify(dadosAnteriores) : null,
        dadosNovos ? JSON.stringify(dadosNovos) : null,
        ipAddress,
        userAgent
    ]);
}
