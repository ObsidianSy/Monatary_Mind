import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
export function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    if (!token) {
        return res.status(401).json({ error: 'Token de autenticação não fornecido' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = {
            id: decoded.id,
            tenant_id: decoded.tenant_id,
            email: decoded.email
        };
        next();
    }
    catch (error) {
        return res.status(403).json({ error: 'Token inválido ou expirado' });
    }
}
export function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = {
                id: decoded.id,
                tenant_id: decoded.tenant_id,
                email: decoded.email
            };
        }
        catch (error) {
            // Token inválido, mas não bloqueia - continua sem user
        }
    }
    next();
}
