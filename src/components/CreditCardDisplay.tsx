import { CreditCard as CreditCardType } from "@/types/financial";
import { CreditCard, Wallet, CircleDot } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { ValueDisplay } from "./ValueDisplay";

interface CreditCardDisplayProps {
    card: CreditCardType;
    usage: number;
    limite: number;
    onClick?: () => void;
    showDetails?: boolean;
}

// Cores de acento sutis por bandeira (usadas em detalhes)
const brandAccents: Record<string, { primary: string; secondary: string; text: string }> = {
    visa: { primary: "bg-blue-500", secondary: "from-blue-50 to-blue-100", text: "text-blue-600" },
    mastercard: { primary: "bg-orange-500", secondary: "from-orange-50 to-red-50", text: "text-orange-600" },
    elo: { primary: "bg-yellow-500", secondary: "from-yellow-50 to-orange-50", text: "text-yellow-600" },
    amex: { primary: "bg-teal-500", secondary: "from-teal-50 to-cyan-50", text: "text-teal-600" },
    hipercard: { primary: "bg-pink-500", secondary: "from-pink-50 to-purple-50", text: "text-pink-600" },
    default: { primary: "bg-slate-500", secondary: "from-slate-50 to-gray-100", text: "text-slate-600" },
};

// Logos SVG simplificados das bandeiras
const BrandLogo = ({ brand }: { brand: string }) => {
    const brandLower = brand.toLowerCase();

    if (brandLower === "visa") {
        return (
            <div className="text-blue-600 font-bold text-2xl italic tracking-wider">
                VISA
            </div>
        );
    }

    if (brandLower === "mastercard") {
        return (
            <div className="flex items-center gap-0.5">
                <div className="w-8 h-8 rounded-full bg-red-500 opacity-80" />
                <div className="w-8 h-8 rounded-full bg-orange-400 opacity-80 -ml-4" />
            </div>
        );
    }

    if (brandLower === "elo") {
        return (
            <div className="text-yellow-600 font-bold text-xl tracking-wider">
                elo
            </div>
        );
    }

    if (brandLower === "amex") {
        return (
            <div className="text-teal-600 font-bold text-xl">
                AMEX
            </div>
        );
    }

    // Default
    return (
        <CreditCard className="w-8 h-8 text-slate-600" />
    );
};

export function CreditCardDisplay({
    card,
    usage,
    limite,
    onClick,
    showDetails = true
}: CreditCardDisplayProps) {
    const accent = brandAccents[card.bandeira.toLowerCase()] || brandAccents.default;
    const disponivel = limite - usage;
    const usagePercentage = limite > 0 ? (usage / limite) * 100 : 0;

    // Número do cartão formatado (simulado)
    const cardNumber = "•••• •••• •••• ••••";

    return (
        <div
            className="group relative cursor-pointer"
            onClick={onClick}
        >
            {/* Cartão principal - design branco minimalista */}
            <div
                className={`
          relative w-full aspect-[1.586/1] rounded-2xl
          bg-white border border-gray-200
          shadow-lg
          transition-all duration-300
          group-hover:scale-[1.02] group-hover:shadow-xl
          overflow-hidden
        `}
            >
                {/* Gradiente sutil de fundo por bandeira */}
                <div className={`absolute inset-0 bg-gradient-to-br ${accent.secondary} opacity-40`} />

                {/* Padrões decorativos sutis */}
                <div className="absolute inset-0 opacity-5" style={{
                    backgroundImage: `radial-gradient(circle at 20% 50%, rgba(0,0,0,0.05) 0%, transparent 50%),
                           radial-gradient(circle at 80% 80%, rgba(0,0,0,0.03) 0%, transparent 50%)`
                }} />

                {/* Chip do cartão */}
                <div className="absolute top-12 left-6">
                    <div className="w-12 h-9 rounded-md bg-gradient-to-br from-yellow-100 via-yellow-200 to-yellow-300 shadow-md border border-yellow-400/30">
                        <div className="w-full h-full rounded-md flex items-center justify-center">
                            <div className="grid grid-cols-2 gap-0.5">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-yellow-600/40" />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contactless icon */}
                <div className="absolute top-12 right-6">
                    <CircleDot className="w-6 h-6 text-gray-400 rotate-90" strokeWidth={1.5} />
                </div>

                {/* Conteúdo do cartão */}
                <div className="relative h-full p-6 flex flex-col justify-between">
                    {/* Header - Logo da bandeira */}
                    <div className="flex items-start justify-between">
                        <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                            Credit Card
                        </div>
                        <BrandLogo brand={card.bandeira} />
                    </div>

                    {/* Meio - Número do cartão */}
                    <div className="space-y-3 mt-4">
                        <div className="font-mono text-lg sm:text-xl tracking-[0.25em] text-gray-700 font-light">
                            {cardNumber}
                        </div>

                        {showDetails && (
                            <div className="flex items-end justify-between">
                                <div>
                                    <div className="text-[9px] text-gray-400 uppercase tracking-wide mb-0.5">
                                        Card Holder
                                    </div>
                                    <div className="font-medium text-gray-700 uppercase tracking-wide text-xs leading-tight">
                                        {card.apelido}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[9px] text-gray-400 uppercase tracking-wide mb-0.5">
                                        Expires
                                    </div>
                                    <div className="font-mono text-gray-700 text-xs leading-tight">
                                        {card.dia_vencimento}/{String(new Date().getFullYear()).slice(-2)}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer - Informações de uso */}
                    {showDetails && (
                        <div className="space-y-2">
                            {/* Barra de progresso */}
                            <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-500 ${usagePercentage >= 90 ? accent.primary + ' opacity-80' :
                                        usagePercentage >= 70 ? accent.primary + ' opacity-60' :
                                            accent.primary + ' opacity-50'
                                        }`}
                                    style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                                />
                            </div>

                            {/* Valores */}
                            <div className="flex items-end justify-between">
                                <div>
                                    <div className="text-gray-400 text-[9px] uppercase tracking-wide mb-0.5">Balance</div>
                                    <div className={`font-bold text-base ${accent.text} leading-tight`}>
                                        {formatCurrency(disponivel)}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-gray-400 text-[9px] uppercase tracking-wide mb-0.5">Limit</div>
                                    <div className="font-medium text-sm text-gray-600 leading-tight">
                                        {formatCurrency(limite)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Efeito de brilho no hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/50 to-white/0 translate-x-full group-hover:translate-x-0 transition-transform duration-1000" />
                </div>
            </div>

            {/* Sombra sutil colorida */}
            <div
                className={`absolute inset-0 -z-10 rounded-2xl ${accent.primary} opacity-0 group-hover:opacity-10 blur-xl transition-opacity duration-300`}
            />
        </div>
    );
}
