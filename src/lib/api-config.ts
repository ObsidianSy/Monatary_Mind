// api-config.ts
// Configuração centralizada da URL da API

/**
 * Obtém a URL base da API de forma inteligente:
 * 1. Tenta usar VITE_API_URL do .env (desenvolvimento ou build-time)
 * 2. Se NÃO tiver, detecta automaticamente baseado no window.location (runtime)
 * 3. Fallback para localhost:3001
 */
export function getApiUrl(): string {
    // 1. Verificar variável de ambiente (definida em tempo de BUILD)
    const envUrl = import.meta.env.VITE_API_URL;

    // Se a variável está definida e NÃO é localhost, usar ela
    // (útil para builds locais que vão para produção)
    if (envUrl && !envUrl.includes('localhost')) {
        console.log('🔗 API URL (do .env):', envUrl);
        return envUrl;
    }

    // 2. Detecção automática baseada no host (runtime)
    if (typeof window !== 'undefined') {
        const { protocol, hostname } = window.location;

        // Se for localhost/127.0.0.1, usar localhost:3001
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            const localUrl = `${protocol}//${hostname}:3001/api`;
            console.log('🔗 API URL (localhost):', localUrl);
            return localUrl;
        }

        // Se for qualquer outro host (IP ou domínio), usar ele na porta 3001
        const prodUrl = `${protocol}//${hostname}:3001/api`;
        console.log('🔗 API URL (auto-detectado):', prodUrl);
        return prodUrl;
    }

    // 3. Fallback (SSR ou ambiente sem window)
    const fallbackUrl = envUrl || 'http://localhost:3001/api';
    console.log('🔗 API URL (fallback):', fallbackUrl);
    return fallbackUrl;
}

/**
 * URL da API (calculada dinamicamente)
 */
export const API_BASE_URL = getApiUrl();

