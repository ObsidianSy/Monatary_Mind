import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata um valor numérico como moeda brasileira (BRL)
 * @param value - Valor numérico ou string para formatar
 * @returns String formatada como "R$ 1.000,00"
 */
export function formatCurrency(value: number | string): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    console.warn('formatCurrency: valor inválido', value);
    return 'R$ 0,00';
  }
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numValue);
}

/**
 * Converte uma string de moeda brasileira para número
 * @param value - String no formato "R$ 1.000,00"
 * @returns Número parseado
 */
export function parseCurrencyToNumber(value: string): number {
  // Remove "R$", espaços, pontos (milhares) e substitui vírgula por ponto
  const cleanValue = value
    .replace(/R\$\s?/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  
  return parseFloat(cleanValue);
}

/**
 * Censura um valor monetário
 * @param value - Valor formatado como moeda
 * @param censored - Se deve censurar ou não
 * @returns Valor censurado ou original
 */
export function censorValue(value: string, censored: boolean): string {
  if (!censored) return value;
  return value.replace(/\d/g, '•');
}
