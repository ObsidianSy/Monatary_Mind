/**
 * Validações para Endpoints de Cartão de Crédito
 *
 * Adiciona validação de entrada para endpoints críticos:
 * - POST /api/compras
 * - POST /api/events/fatura.fechar
 * - POST /api/events/fatura.pagar
 *
 * IMPORTANTE: Adicionar ao server/index.ts
 */
import { z } from "zod";
/**
 * Schema de validação para compra em cartão
 */
export const CompraSchema = z.object({
    cartao_id: z.string().uuid("cartao_id deve ser um UUID válido"),
    categoria_id: z.string().uuid("categoria_id deve ser um UUID válido"),
    descricao: z.string()
        .min(3, "Descrição deve ter no mínimo 3 caracteres")
        .max(200, "Descrição deve ter no máximo 200 caracteres"),
    valor: z.number()
        .positive("Valor deve ser positivo")
        .max(1000000, "Valor máximo de R$ 1.000.000,00"),
    data_compra: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "data_compra deve estar no formato YYYY-MM-DD"),
    parcelas: z.number()
        .int("Número de parcelas deve ser inteiro")
        .min(1, "Mínimo 1 parcela")
        .max(36, "Máximo 36 parcelas")
        .optional()
        .default(1),
    observacoes: z.string()
        .max(500, "Observações devem ter no máximo 500 caracteres")
        .optional(),
});
/**
 * Schema de validação para fechar fatura
 */
export const FecharFaturaSchema = z.object({
    fatura_id: z.string().uuid("fatura_id deve ser um UUID válido"),
    data_fechamento: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "data_fechamento deve estar no formato YYYY-MM-DD")
        .optional(),
});
/**
 * Schema de validação para pagar fatura
 */
export const PagarFaturaSchema = z.object({
    fatura_id: z.string().uuid("fatura_id deve ser um UUID válido"),
    conta_id: z.string().uuid("conta_id deve ser um UUID válido"),
    valor: z.number()
        .positive("Valor deve ser positivo")
        .max(1000000, "Valor máximo de R$ 1.000.000,00"),
    data_pagamento: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "data_pagamento deve estar no formato YYYY-MM-DD"),
    observacoes: z.string()
        .max(500, "Observações devem ter no máximo 500 caracteres")
        .optional(),
});
/**
 * Middleware de validação genérico
 */
export function validateRequest(schema) {
    return (req, res, next) => {
        try {
            const validated = schema.parse(req.body);
            req.validatedBody = validated;
            next();
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    error: "Validação falhou",
                    details: error.errors.map(err => ({
                        campo: err.path.join("."),
                        mensagem: err.message,
                    })),
                });
            }
            next(error);
        }
    };
}
/**
 * EXEMPLO DE USO NO server/index.ts:
 *
 * import { CompraSchema, validateRequest } from './validations';
 *
 * app.post("/api/compras",
 *   validateRequest(CompraSchema),
 *   async (req, res) => {
 *     const data = req.validatedBody; // ✅ Dados validados
 *     // ... resto do código
 *   }
 * );
 *
 * app.post("/api/events/fatura.fechar",
 *   validateRequest(FecharFaturaSchema),
 *   async (req, res) => {
 *     const data = req.validatedBody;
 *     // ... resto do código
 *   }
 * );
 *
 * app.post("/api/events/fatura.pagar",
 *   validateRequest(PagarFaturaSchema),
 *   async (req, res) => {
 *     const data = req.validatedBody;
 *     // ... resto do código
 *   }
 * );
 */
/**
 * TESTES RECOMENDADOS:
 *
 * 1. Compra válida:
 * POST /api/compras
 * {
 *   "cartao_id": "uuid-valido",
 *   "categoria_id": "uuid-valido",
 *   "descricao": "Compra teste",
 *   "valor": 100.50,
 *   "data_compra": "2025-11-08",
 *   "parcelas": 3
 * }
 *
 * 2. Compra inválida (valor negativo):
 * POST /api/compras
 * {
 *   "cartao_id": "uuid-valido",
 *   "valor": -50, // ❌ Erro esperado
 *   ...
 * }
 *
 * 3. Fechar fatura inválida (UUID malformado):
 * POST /api/events/fatura.fechar
 * {
 *   "fatura_id": "nao-e-uuid" // ❌ Erro esperado
 * }
 */
