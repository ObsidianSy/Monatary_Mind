import { CreditCard as CreditCardType } from "@/types/financial";
import { CreditCard, Wifi } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface CreditCardDisplayProps {
    card: CreditCardType;
    usage: number;
    limite: number;
    onClick?: () => void;
    showDetails?: boolean;
}

// Mapeamento de BINs (6 primeiros dígitos) e bancos brasileiros
interface CardTheme {
    name: string;
    gradient: string;
    textColor: string;
    chipColor: string;
    pattern?: string;
}

const detectCardTheme = (cardNumber: string, apelido: string, bandeira: string): CardTheme => {
    const number = cardNumber?.replace(/\D/g, '') || '';
    const apelidoLower = apelido?.toLowerCase() || '';
    
    // Nubank - roxo característico
    if (apelidoLower.includes('nu') || apelidoLower.startsWith('nubank') || number.startsWith('5162')) {
        return {
            name: 'Nubank',
            gradient: 'from-[#820AD1] via-[#9c1de7] to-[#820AD1]',
            textColor: 'text-white',
            chipColor: 'from-purple-200 to-purple-300 border-purple-400/40',
            pattern: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)'
        };
    }
    
    // Santander - vermelho
    if (apelidoLower.includes('santander') || number.startsWith('5313') || number.startsWith('6062')) {
        return {
            name: 'Santander',
            gradient: 'from-[#EC0000] via-[#ff0000] to-[#c00000]',
            textColor: 'text-white',
            chipColor: 'from-red-200 to-red-300 border-red-400/40'
        };
    }
    
    // Inter - laranja
    if (apelidoLower.includes('inter') || number.startsWith('5163')) {
        return {
            name: 'Inter',
            gradient: 'from-[#FF7A00] via-[#ff8c1a] to-[#FF7A00]',
            textColor: 'text-white',
            chipColor: 'from-orange-200 to-orange-300 border-orange-400/40'
        };
    }
    
    // PagBank (PagSeguro) - verde
    if (apelidoLower.includes('pagbank') || apelidoLower.includes('pagseguro') || apelidoLower.includes('pag') || number.startsWith('5392')) {
        return {
            name: 'PagBank',
            gradient: 'from-[#00AB63] via-[#00c46e] to-[#008f50]',
            textColor: 'text-white',
            chipColor: 'from-green-200 to-green-300 border-green-400/40'
        };
    }
    
    // Sicoob - verde escuro
    if (apelidoLower.includes('sicoob') || number.startsWith('6363')) {
        return {
            name: 'Sicoob',
            gradient: 'from-[#00693E] via-[#007d49] to-[#005030]',
            textColor: 'text-white',
            chipColor: 'from-green-200 to-green-300 border-green-500/40'
        };
    }
    
    // Banco do Brasil - amarelo/azul
    if (apelidoLower.includes('bb') || apelidoLower.includes('banco do brasil') || number.startsWith('5905') || number.startsWith('6500')) {
        return {
            name: 'Banco do Brasil',
            gradient: 'from-[#FDB813] via-[#003682] to-[#002654]',
            textColor: 'text-white',
            chipColor: 'from-yellow-200 to-blue-300 border-yellow-400/40'
        };
    }
    
    // BTG Pactual - preto/dourado
    if (apelidoLower.includes('btg') || number.startsWith('5438')) {
        return {
            name: 'BTG',
            gradient: 'from-[#000000] via-[#1a1a1a] to-[#C5A572]',
            textColor: 'text-white',
            chipColor: 'from-yellow-300 to-yellow-400 border-yellow-500/40'
        };
    }
    
    // XP - preto/laranja
    if (apelidoLower.includes('xp') || number.startsWith('5301')) {
        return {
            name: 'XP',
            gradient: 'from-[#000000] via-[#1a1a1a] to-[#FF7A00]',
            textColor: 'text-white',
            chipColor: 'from-orange-200 to-orange-300 border-orange-400/40'
        };
    }
    
    // PicPay - verde claro
    if (apelidoLower.includes('picpay') || apelidoLower.includes('pic') || number.startsWith('5167')) {
        return {
            name: 'PicPay',
            gradient: 'from-[#21C25E] via-[#2dd36f] to-[#1ba850]',
            textColor: 'text-white',
            chipColor: 'from-green-200 to-green-300 border-green-400/40'
        };
    }
    
    // Neon - azul neon
    if (apelidoLower.includes('neon') || number.startsWith('5183')) {
        return {
            name: 'Neon',
            gradient: 'from-[#00D7D7] via-[#00e5e5] to-[#00b8b8]',
            textColor: 'text-white',
            chipColor: 'from-cyan-200 to-cyan-300 border-cyan-400/40'
        };
    }
    
    // Next - verde escuro/preto
    if (apelidoLower.includes('next') || number.startsWith('5468')) {
        return {
            name: 'Next',
            gradient: 'from-[#00AB4E] via-[#1a1a1a] to-[#000000]',
            textColor: 'text-white',
            chipColor: 'from-green-200 to-gray-300 border-green-400/40'
        };
    }
    
    // Will Bank - rosa/roxo
    if (apelidoLower.includes('will') || number.startsWith('5364')) {
        return {
            name: 'Will Bank',
            gradient: 'from-[#FF006B] via-[#B039D3] to-[#7B2CBF]',
            textColor: 'text-white',
            chipColor: 'from-pink-200 to-purple-300 border-pink-400/40'
        };
    }
    
    // Original - verde água
    if (apelidoLower.includes('original') || number.startsWith('5230')) {
        return {
            name: 'Original',
            gradient: 'from-[#57C7C0] via-[#6dd5ce] to-[#3eb5ae]',
            textColor: 'text-white',
            chipColor: 'from-teal-200 to-teal-300 border-teal-400/40'
        };
    }
    
    // Mercado Pago - azul claro
    if (apelidoLower.includes('mercado') || apelidoLower.includes('mp') || number.startsWith('5530')) {
        return {
            name: 'Mercado Pago',
            gradient: 'from-[#009EE3] via-[#00adef] to-[#0088c7]',
            textColor: 'text-white',
            chipColor: 'from-blue-200 to-blue-300 border-blue-400/40'
        };
    }
    
    // C6 Bank - cinza escuro
    if (apelidoLower.includes('c6') || number.startsWith('5067')) {
        return {
            name: 'C6 Bank',
            gradient: 'from-[#1A1A1A] via-[#2d2d2d] to-[#000000]',
            textColor: 'text-white',
            chipColor: 'from-gray-300 to-gray-400 border-gray-500/40'
        };
    }
    
    // Itaú - laranja/azul
    if (apelidoLower.includes('itau') || apelidoLower.includes('itaú') || number.startsWith('4376') || number.startsWith('6362')) {
        return {
            name: 'Itaú',
            gradient: 'from-[#FF6600] via-[#0057A5] to-[#003d82]',
            textColor: 'text-white',
            chipColor: 'from-orange-200 to-blue-300 border-orange-400/40'
        };
    }
    
    // Bradesco - vermelho
    if (apelidoLower.includes('bradesco') || number.startsWith('4551') || number.startsWith('6362')) {
        return {
            name: 'Bradesco',
            gradient: 'from-[#CC092F] via-[#e00a35] to-[#a0071d]',
            textColor: 'text-white',
            chipColor: 'from-red-200 to-red-300 border-red-400/40'
        };
    }
    
    // Caixa - azul
    if (apelidoLower.includes('caixa') || number.startsWith('6362')) {
        return {
            name: 'Caixa',
            gradient: 'from-[#0066A1] via-[#0077b6] to-[#004d7a]',
            textColor: 'text-white',
            chipColor: 'from-blue-200 to-blue-300 border-blue-400/40'
        };
    }
    
    // Safra - azul escuro
    if (apelidoLower.includes('safra') || number.startsWith('6543')) {
        return {
            name: 'Safra',
            gradient: 'from-[#002E5D] via-[#003d7a] to-[#001f3d]',
            textColor: 'text-white',
            chipColor: 'from-blue-200 to-blue-300 border-blue-500/40'
        };
    }
    
    // Digio - cinza/azul
    if (apelidoLower.includes('digio') || number.startsWith('6505')) {
        return {
            name: 'Digio',
            gradient: 'from-[#2C3E50] via-[#34495e] to-[#1a252f]',
            textColor: 'text-white',
            chipColor: 'from-gray-200 to-blue-200 border-gray-400/40'
        };
    }
    
    // Ame Digital - roxo/rosa
    if (apelidoLower.includes('ame') || apelidoLower.includes('americanas') || number.startsWith('6062')) {
        return {
            name: 'Ame',
            gradient: 'from-[#8B5CF6] via-[#EC4899] to-[#7C3AED]',
            textColor: 'text-white',
            chipColor: 'from-purple-200 to-pink-200 border-purple-400/40'
        };
    }
    
    // RecargaPay - verde/azul
    if (apelidoLower.includes('recarga') || number.startsWith('5521')) {
        return {
            name: 'RecargaPay',
            gradient: 'from-[#00D09C] via-[#00b889] to-[#00a077]',
            textColor: 'text-white',
            chipColor: 'from-green-200 to-teal-200 border-green-400/40'
        };
    }
    
    // Conta Simples - azul
    if (apelidoLower.includes('simples') || apelidoLower.includes('conta simples') || number.startsWith('5524')) {
        return {
            name: 'Conta Simples',
            gradient: 'from-[#0066FF] via-[#1a75ff] to-[#0052cc]',
            textColor: 'text-white',
            chipColor: 'from-blue-200 to-blue-300 border-blue-400/40'
        };
    }
    
    // Modal Mais - azul/verde
    if (apelidoLower.includes('modal') || number.startsWith('5570')) {
        return {
            name: 'Modal Mais',
            gradient: 'from-[#00A0E3] via-[#00b8e6] to-[#0088b8]',
            textColor: 'text-white',
            chipColor: 'from-blue-200 to-cyan-200 border-blue-400/40'
        };
    }
    
    // Superdigital - laranja/vermelho
    if (apelidoLower.includes('super') || apelidoLower.includes('superdigital') || number.startsWith('5486')) {
        return {
            name: 'Superdigital',
            gradient: 'from-[#FF6B00] via-[#ff7a1a] to-[#e65c00]',
            textColor: 'text-white',
            chipColor: 'from-orange-200 to-red-200 border-orange-400/40'
        };
    }
    
    // BV (Banco Votorantim) - azul petróleo
    if (apelidoLower.includes('bv') || apelidoLower.includes('votorantim') || number.startsWith('5581')) {
        return {
            name: 'BV',
            gradient: 'from-[#003865] via-[#004577] to-[#002a4a]',
            textColor: 'text-white',
            chipColor: 'from-blue-200 to-blue-300 border-blue-500/40'
        };
    }
    
    // Banrisul - azul/verde
    if (apelidoLower.includes('banrisul') || number.startsWith('5850')) {
        return {
            name: 'Banrisul',
            gradient: 'from-[#005CA9] via-[#007dc5] to-[#004a87]',
            textColor: 'text-white',
            chipColor: 'from-blue-200 to-green-200 border-blue-400/40'
        };
    }
    
    // Agibank - verde limão
    if (apelidoLower.includes('agi') || apelidoLower.includes('agibank') || number.startsWith('4315')) {
        return {
            name: 'Agibank',
            gradient: 'from-[#8BC53F] via-[#9dd44e] to-[#78ad33]',
            textColor: 'text-white',
            chipColor: 'from-lime-200 to-green-300 border-lime-400/40'
        };
    }
    
    // Pan - azul escuro
    if (apelidoLower.includes('pan') || apelidoLower.includes('banco pan') || number.startsWith('5482')) {
        return {
            name: 'Pan',
            gradient: 'from-[#004A8F] via-[#0059a6] to-[#003870]',
            textColor: 'text-white',
            chipColor: 'from-blue-200 to-blue-300 border-blue-500/40'
        };
    }
    
    // BMG - azul/verde
    if (apelidoLower.includes('bmg') || number.startsWith('5472')) {
        return {
            name: 'BMG',
            gradient: 'from-[#006CB7] via-[#0080d4] to-[#0056a0]',
            textColor: 'text-white',
            chipColor: 'from-blue-200 to-cyan-200 border-blue-400/40'
        };
    }
    
    // Rendimento - verde
    if (apelidoLower.includes('rendimento') || number.startsWith('5502')) {
        return {
            name: 'Rendimento',
            gradient: 'from-[#00B24A] via-[#00c957] to-[#009a3e]',
            textColor: 'text-white',
            chipColor: 'from-green-200 to-green-300 border-green-400/40'
        };
    }
    
    // BS2 - preto/dourado
    if (apelidoLower.includes('bs2') || number.startsWith('5473')) {
        return {
            name: 'BS2',
            gradient: 'from-[#000000] via-[#1a1a1a] to-[#D4AF37]',
            textColor: 'text-white',
            chipColor: 'from-yellow-200 to-yellow-300 border-yellow-500/40'
        };
    }
    
    // Bandeiras genéricas
    const bandeiraLower = bandeira.toLowerCase();
    if (bandeiraLower === 'mastercard') {
        return {
            name: 'Mastercard',
            gradient: 'from-[#EB001B] via-[#f79e1b] to-[#FF5F00]',
            textColor: 'text-white',
            chipColor: 'from-orange-200 to-red-300 border-orange-400/40'
        };
    }
    
    if (bandeiraLower === 'visa') {
        return {
            name: 'Visa',
            gradient: 'from-[#1A1F71] via-[#2e3ba1] to-[#1434CB]',
            textColor: 'text-white',
            chipColor: 'from-blue-200 to-blue-300 border-blue-400/40'
        };
    }
    
    if (bandeiraLower === 'elo') {
        return {
            name: 'Elo',
            gradient: 'from-[#FFCB05] via-[#ffd11a] to-[#000000]',
            textColor: 'text-gray-900',
            chipColor: 'from-yellow-200 to-yellow-300 border-yellow-500/40'
        };
    }
    
    // Amex - azul escuro
    if (bandeiraLower === 'amex' || bandeiraLower === 'american express') {
        return {
            name: 'Amex',
            gradient: 'from-[#006FCF] via-[#0081d5] to-[#005ba4]',
            textColor: 'text-white',
            chipColor: 'from-blue-200 to-blue-300 border-blue-500/40'
        };
    }
    
    // Default - azul moderno (padrão bonito)
    return {
        name: 'Card',
        gradient: 'from-[#667eea] via-[#764ba2] to-[#5b4a9f]',
        textColor: 'text-white',
        chipColor: 'from-purple-200 to-blue-300 border-purple-400/40'
    };
};

// Logo da bandeira (canto superior direito)
const BrandLogo = ({ brand }: { brand: string }) => {
    const brandLower = brand.toLowerCase();

    if (brandLower === "mastercard") {
        return (
            <div className="flex items-center -space-x-3">
                <div className="w-7 h-7 rounded-full bg-[#EB001B]" />
                <div className="w-7 h-7 rounded-full bg-[#FF5F00]" />
            </div>
        );
    }

    if (brandLower === "visa") {
        return (
            <div className="text-white font-bold text-2xl italic tracking-wide">
                VISA
            </div>
        );
    }

    if (brandLower === "elo") {
        return (
            <div className="text-yellow-500 font-bold text-xl tracking-wide">
                elo
            </div>
        );
    }

    if (brandLower === "amex") {
        return (
            <div className="text-white font-bold text-xl bg-blue-600 px-2 py-0.5 rounded">
                AMEX
            </div>
        );
    }

    return <CreditCard className="w-6 h-6 opacity-70" />;
};


export function CreditCardDisplay({
    card,
    usage,
    limite,
    onClick,
    showDetails = true
}: CreditCardDisplayProps) {
    const theme = detectCardTheme(card.numero || '', card.apelido, card.bandeira);
    const disponivel = limite - usage;
    const usagePercentage = limite > 0 ? (usage / limite) * 100 : 0;

    // Formatar número do cartão (últimos 4 dígitos visíveis)
    const lastFourDigits = card.numero?.slice(-4) || '123';
    const cardNumber = `•••• •••• •••• ${lastFourDigits}`;

    return (
        <div
            className="group relative cursor-pointer max-w-[380px]"
            onClick={onClick}
        >
            {/* Cartão principal - design moderno tipo Nubank */}
            <div
                className={`
                    relative w-full aspect-[1.586/1] rounded-[18px]
                    bg-gradient-to-br ${theme.gradient}
                    shadow-lg
                    transition-all duration-300
                    group-hover:scale-[1.03] group-hover:shadow-2xl
                    overflow-hidden
                `}
            >
                {/* Padrão decorativo de fundo */}
                {theme.pattern && (
                    <div 
                        className="absolute inset-0 opacity-30" 
                        style={{ backgroundImage: theme.pattern }}
                    />
                )}
                
                {/* Ondas decorativas mais sutis */}
                <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
                <div className="absolute -left-6 -bottom-6 w-32 h-32 rounded-full bg-black/10 blur-xl" />
                
                {/* Forma decorativa no topo - onda/curva estilizada */}
                <div className="absolute top-0 left-0 right-0 h-24 overflow-hidden">
                    <svg 
                        viewBox="0 0 400 100" 
                        className="absolute w-full h-full opacity-10"
                        preserveAspectRatio="none"
                    >
                        <path 
                            d="M0,30 Q100,10 200,25 T400,20 L400,0 L0,0 Z" 
                            fill="white"
                        />
                    </svg>
                </div>
                
                {/* Círculos decorativos flutuantes */}
                <div className="absolute top-3 left-20 w-16 h-16 rounded-full bg-white/5" />
                <div className="absolute top-8 left-32 w-10 h-10 rounded-full bg-white/3" />
                <div className="absolute top-12 right-16 w-20 h-20 rounded-full bg-black/5" />
                
                {/* Textura de linhas diagonais sutil */}
                <div className="absolute inset-0 opacity-[0.03]" style={{
                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, currentColor 2px, currentColor 4px)'
                }} />
                
                {/* Brilho sutil no topo */}
                <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/10 to-transparent" />

                {/* Chip do cartão - menor e mais realista com bordas arredondadas */}
                <div className="absolute top-6 left-5">
                    <div className={`w-11 h-9 rounded-lg bg-gradient-to-br ${theme.chipColor} shadow-lg border`}>
                        <div className="w-full h-full rounded-lg flex items-center justify-center relative overflow-hidden">
                            {/* Brilho no chip */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent rounded-lg" />
                            <div className="grid grid-cols-3 gap-[3px] p-1.5 relative z-10">
                                {[...Array(9)].map((_, i) => (
                                    <div key={i} className="w-[3.5px] h-[3.5px] rounded-full bg-yellow-800/70 shadow-sm" />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Ícone Contactless com glow */}
                <div className="absolute top-6 right-5">
                    <div className="relative">
                        <Wifi className={`w-6 h-6 ${theme.textColor} opacity-60 rotate-90`} strokeWidth={1.8} />
                        <Wifi className={`w-6 h-6 ${theme.textColor} opacity-25 rotate-90 absolute inset-0 blur-[2px]`} strokeWidth={1.8} />
                    </div>
                </div>

                {/* Conteúdo do cartão */}
                <div className={`relative h-full p-5 flex flex-col justify-between ${theme.textColor}`}>
                    {/* Logo da bandeira - topo direito */}
                    <div className="flex items-start justify-end">
                        <div className="mt-1">
                            <BrandLogo brand={card.bandeira} />
                        </div>
                    </div>

                    {/* Meio - Número do cartão */}
                    <div className="space-y-3 mt-auto">
                        <div className="font-mono text-[17px] tracking-[0.28em] font-light drop-shadow-md">
                            {cardNumber}
                        </div>

                        <div className="flex items-end justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="text-[10px] uppercase tracking-widest mb-1 opacity-70 font-medium">
                                    Nome do Cartão
                                </div>
                                <div className="font-bold uppercase tracking-wider text-[13px] leading-tight truncate drop-shadow-sm">
                                    {card.apelido}
                                </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <div className="text-[10px] uppercase tracking-widest mb-1 opacity-70 font-medium">
                                    Vencimento
                                </div>
                                <div className="font-mono font-semibold text-[13px] leading-tight drop-shadow-sm">
                                    dia {card.dia_vencimento}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Efeito de brilho no hover mais intenso */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-[18px]">
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 rounded-[18px]" />
                </div>
            </div>

            {/* Card info abaixo (disponível/limite) - mais compacto */}
            {showDetails && (
                <div className="mt-3 space-y-2">
                    {/* Barra de uso */}
                    <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
                        <div
                            className={`h-full transition-all duration-500 ${
                                usagePercentage >= 90 ? 'bg-red-500' :
                                usagePercentage >= 70 ? 'bg-yellow-500' :
                                'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                        />
                    </div>

                    {/* Valores */}
                    <div className="flex items-center justify-between text-sm">
                        <div>
                            <div className="text-gray-500 dark:text-gray-400 text-[10px] uppercase tracking-wide">Disponível</div>
                            <div className="font-bold text-green-600 dark:text-green-400">
                                {formatCurrency(disponivel)}
                            </div>
                        </div>
                        <div className="text-center px-2">
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                {usagePercentage.toFixed(0)}%
                            </span>
                        </div>
                        <div className="text-right">
                            <div className="text-gray-500 dark:text-gray-400 text-[10px] uppercase tracking-wide">Limite</div>
                            <div className="font-semibold text-gray-600 dark:text-gray-300">
                                {formatCurrency(limite)}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
