import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, Mail, AlertCircle, Eye, EyeOff, TrendingUp, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);
      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo de volta.",
      });
    } catch (err: any) {
      setError(err.message || "Erro ao fazer login");
      toast({
        title: "Erro no login",
        description: err.message || "Credenciais inválidas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* Lado Esquerdo - Branding/Imagem */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ background: 'linear-gradient(120deg, #0f172a 60%, #312e81 100%)' }}>
        {/* Imagem de fundo */}
        <img
          src="/bg-login.jpg"
          alt="Login background"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-80"
          draggable={false}
        />
        {/* Overlay para escurecer e dar contraste */}
        <div className="absolute inset-0 bg-slate-900/60" />
        {/* Efeitos de fundo */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Formas geométricas abstratas */}
          <div className="absolute top-20 left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
        </div>
        {/* Conteúdo */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo/Header */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 backdrop-blur-sm rounded-xl">
              <TrendingUp className="h-8 w-8 text-white" strokeWidth={2} />
            </div>
            <span className="text-white text-2xl font-bold">Monetary Mind</span>
          </div>
          {/* Texto central */}
          <div className="space-y-6 max-w-lg">
            <h1 className="text-5xl font-bold text-white leading-tight drop-shadow-lg">
              Gestão Financeira Inteligente.<br />
              Controle Total.
            </h1>
            <p className="text-lg text-slate-200 drop-shadow">
              Do planejamento às análises detalhadas, nossa plataforma oferece
              as ferramentas que você precisa para gerenciar suas finanças com eficiência.
            </p>
          </div>
          {/* Footer */}
          <div className="flex gap-2">
            <div className="w-8 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-1 bg-white/40 rounded-full"></div>
            <div className="w-1 h-1 bg-white/40 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Lado Direito - Formulário */}
      <div className="flex-1 flex items-center justify-center bg-white p-4 lg:p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Header Mobile */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="p-2 bg-slate-900 rounded-xl">
              <TrendingUp className="h-6 w-6 text-white" strokeWidth={2} />
            </div>
            <span className="text-slate-900 text-xl font-bold">Monetary Mind</span>
          </div>

          {/* Botão voltar (opcional) */}
          <button className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar ao Site</span>
          </button>

          {/* Título */}
          <div className="space-y-2">
            <h2 className="text-4xl font-bold text-slate-900">Bem-vindo de Volta!</h2>
            <p className="text-slate-600">Faça login para gerenciar suas finanças com facilidade.</p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert variant="destructive" className="animate-shake">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Digite seu email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 border-slate-200 focus:border-slate-900 focus:ring-slate-900/20 transition-all"
                required
                autoComplete="email"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 text-sm font-medium">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 pr-10 border-slate-200 focus:border-slate-900 focus:ring-slate-900/20 transition-all"
                  required
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <Label
                  htmlFor="remember"
                  className="text-sm text-slate-600 cursor-pointer"
                >
                  Lembrar-me
                </Label>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 text-base font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-pulse {
          animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}
