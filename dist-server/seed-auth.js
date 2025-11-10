import { query } from './database.js';
import { hashPassword } from './auth.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
/**
 * Script para aplicar schema de autenticação e criar usuário master
 * Executa: npm run seed-auth
 */
async function seedAuth() {
    try {
        console.log('🔐 Iniciando seed de autenticação...\n');
        // 1. Aplicar schema de autenticação
        console.log('📋 Aplicando schema de autenticação...');
        const authSchemaSQL = readFileSync(join(__dirname, '../database/auth-schema.sql'), 'utf8');
        await query(authSchemaSQL);
        console.log('✅ Schema de autenticação aplicado\n');
        // 2. Gerar hash da senha master
        console.log('🔑 Gerando hash da senha...');
        const masterPassword = 'senhaadmin123';
        const passwordHash = await hashPassword(masterPassword);
        console.log(`✅ Hash gerado: ${passwordHash.substring(0, 20)}...\n`);
        // 3. Criar ou atualizar usuário master
        console.log('👤 Criando usuário master...');
        const masterEmail = 'vitorandrade1937@gmail.com';
        const userResult = await query(`INSERT INTO financeiro.usuario (email, senha_hash, nome, ativo, email_verificado)
       VALUES ($1, $2, $3, true, true)
       ON CONFLICT (email) DO UPDATE
       SET senha_hash = EXCLUDED.senha_hash,
           nome = EXCLUDED.nome,
           ativo = EXCLUDED.ativo,
           email_verificado = EXCLUDED.email_verificado,
           updated_at = NOW()
       RETURNING id, email, nome`, [masterEmail, passwordHash, 'Administrador Master']);
        const masterUser = userResult.rows[0];
        console.log(`✅ Usuário criado: ${masterUser.email} (ID: ${masterUser.id})\n`);
        // 4. Atribuir role SUPER_ADMIN
        console.log('🎭 Atribuindo role SUPER_ADMIN...');
        const roleResult = await query(`SELECT id FROM financeiro.role WHERE nome = 'SUPER_ADMIN'`);
        if (roleResult.rows.length === 0) {
            throw new Error('Role SUPER_ADMIN não encontrada! Verifique se o schema foi aplicado corretamente.');
        }
        await query(`INSERT INTO financeiro.user_role (usuario_id, role_id)
       VALUES ($1, $2)
       ON CONFLICT (usuario_id, role_id) DO NOTHING`, [masterUser.id, roleResult.rows[0].id]);
        console.log('✅ Role SUPER_ADMIN atribuída\n');
        // 5. Verificar permissões
        console.log('🔍 Verificando permissões...');
        const permissionsResult = await query(`SELECT COUNT(*) as total
       FROM financeiro.permission p
       JOIN financeiro.role_permission rp ON p.id = rp.permission_id
       JOIN financeiro.user_role ur ON rp.role_id = ur.role_id
       WHERE ur.usuario_id = $1`, [masterUser.id]);
        console.log(`✅ ${permissionsResult.rows[0].total} permissões atribuídas\n`);
        // 6. Resumo final
        console.log('═══════════════════════════════════════════════════');
        console.log('✅ SEED DE AUTENTICAÇÃO CONCLUÍDO COM SUCESSO!');
        console.log('═══════════════════════════════════════════════════');
        console.log(`📧 Email: ${masterEmail}`);
        console.log(`🔑 Senha: ${masterPassword}`);
        console.log(`🎭 Role: SUPER_ADMIN`);
        console.log(`🛡️  Permissões: ${permissionsResult.rows[0].total} (acesso total)`);
        console.log('═══════════════════════════════════════════════════\n');
        console.log('⚠️  IMPORTANTE: Altere a senha após o primeiro login!\n');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Erro ao executar seed:', error.message);
        console.error(error);
        process.exit(1);
    }
}
seedAuth();
