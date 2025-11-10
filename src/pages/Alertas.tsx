import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Clock, CreditCard, Calendar, TrendingUp, AlertTriangle, Settings, Mail, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AlertaConfig {
  id: string;
  tipo: "parcela" | "recorrencia" | "fatura" | "limite" | "recebimento";
  titulo: string;
  descricao: string;
  ativo: boolean;
  dias_antecedencia: number;
  canais: ("app" | "email" | "whatsapp" | "telegram")[];
  silencio_inicio?: string;
  silencio_fim?: string;
}

interface AlertaAtivo {
  id: string;
  tipo: "parcela" | "recorrencia" | "fatura" | "limite" | "recebimento";
  titulo: string;
  descricao: string;
  data_vencimento?: string;
  valor?: number;
  prioridade: "alta" | "media" | "baixa";
  data_criacao: string;
  lido: boolean;
}

// TODO: Replace with real API endpoints when alert system is implemented
// For now using simplified mock data to be replaced with actual backend integration

const mockConfiguracoes: AlertaConfig[] = [];
const mockAlertasAtivos: AlertaAtivo[] = [];

const Alertas = () => {
  const [configuracoes, setConfiguracoes] = useState<AlertaConfig[]>(mockConfiguracoes);
  const [alertasAtivos, setAlertasAtivos] = useState<AlertaAtivo[]>(mockAlertasAtivos);
  const { toast } = useToast();

  const toggleConfiguracao = (id: string) => {
    setConfiguracoes(prev => 
      prev.map(config => 
        config.id === id ? { ...config, ativo: !config.ativo } : config
      )
    );
    
    toast({
      title: "Configuração atualizada",
      description: "As alterações foram salvas.",
    });
  };

  const marcarComoLido = (id: string) => {
    setAlertasAtivos(prev => 
      prev.map(alerta => 
        alerta.id === id ? { ...alerta, lido: true } : alerta
      )
    );
  };

  const getAlertaIcon = (tipo: string) => {
    const icons = {
      parcela: <Calendar className="h-4 w-4" />,
      recorrencia: <Clock className="h-4 w-4" />,
      fatura: <CreditCard className="h-4 w-4" />,
      limite: <AlertTriangle className="h-4 w-4" />,
      recebimento: <TrendingUp className="h-4 w-4" />
    };
    return icons[tipo as keyof typeof icons];
  };

  const getPrioridadeBadge = (prioridade: string) => {
    const variants = {
      alta: "destructive",
      media: "default", 
      baixa: "secondary"
    } as const;

    return (
      <Badge variant={variants[prioridade as keyof typeof variants]}>
        {prioridade.charAt(0).toUpperCase() + prioridade.slice(1)}
      </Badge>
    );
  };

  const getCanalIcon = (canal: string) => {
    const icons = {
      app: <Bell className="h-4 w-4" />,
      email: <Mail className="h-4 w-4" />,
      whatsapp: <MessageSquare className="h-4 w-4" />,
      telegram: <MessageSquare className="h-4 w-4" />
    };
    return icons[canal as keyof typeof icons];
  };

  const alertasNaoLidos = alertasAtivos.filter(alerta => !alerta.lido).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Alertas</h1>
          <p className="text-muted-foreground">Gerencie suas notificações financeiras</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="destructive" className="px-3 py-1">
            {alertasNaoLidos} não lidos
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Bell className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Alertas Ativos</p>
                <p className="text-2xl font-bold">{alertasAtivos.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Não Lidos</p>
                <p className="text-2xl font-bold text-destructive">{alertasNaoLidos}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4 text-success" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Configurações Ativas</p>
                <p className="text-2xl font-bold text-success">{configuracoes.filter(c => c.ativo).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-warning" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Hoje</p>
                <p className="text-2xl font-bold text-warning">2</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="ativos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ativos">Alertas Ativos</TabsTrigger>
          <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
        </TabsList>
        
        <TabsContent value="ativos">
          <Card>
            <CardHeader>
              <CardTitle>Alertas Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alertasAtivos.map((alerta) => (
                  <div 
                    key={alerta.id} 
                    className={`p-4 rounded-lg border transition-colors ${
                      !alerta.lido ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          alerta.prioridade === 'alta' ? 'bg-destructive/10 text-destructive' :
                          alerta.prioridade === 'media' ? 'bg-warning/10 text-warning' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {getAlertaIcon(alerta.tipo)}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`font-semibold ${!alerta.lido ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {alerta.titulo}
                            </h3>
                            {getPrioridadeBadge(alerta.prioridade)}
                            {!alerta.lido && <Badge variant="outline">Novo</Badge>}
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2">{alerta.descricao}</p>
                          
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            {alerta.data_vencimento && (
                              <span>Vencimento: {new Date(alerta.data_vencimento).toLocaleDateString()}</span>
                            )}
                            {alerta.valor && (
                              <span>Valor: R$ {alerta.valor.toFixed(2)}</span>
                            )}
                            <span>Criado: {new Date(alerta.data_criacao).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {!alerta.lido && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => marcarComoLido(alerta.id)}
                          >
                            Marcar como lido
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {alertasAtivos.length === 0 && (
                  <div className="text-center py-8">
                    <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhum alerta ativo no momento</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="configuracoes">
          <div className="space-y-6">
            {configuracoes.map((config) => (
              <Card key={config.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      {getAlertaIcon(config.tipo)}
                    </div>
                    <div>
                      <CardTitle className="text-base">{config.titulo}</CardTitle>
                      <p className="text-sm text-muted-foreground">{config.descricao}</p>
                    </div>
                  </div>
                  <Switch 
                    checked={config.ativo}
                    onCheckedChange={() => toggleConfiguracao(config.id)}
                  />
                </CardHeader>
                
                {config.ativo && (
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor={`dias-${config.id}`}>Dias de antecedência</Label>
                        <Input
                          id={`dias-${config.id}`}
                          type="number"
                          min="0"
                          max="30"
                          value={config.dias_antecedencia}
                          className="mt-1"
                        />
                      </div>
                      
                       <div>
                         <Label>Canais de notificação</Label>
                         <div className="flex gap-2 mt-1">
                           {["app", "email", "whatsapp", "telegram"].map((canal) => (
                             <Button
                               key={canal}
                               variant={config.canais.includes(canal as any) ? "default" : "outline"}
                               size="sm"
                               className="flex items-center gap-1"
                               onClick={() => {
                                 const newCanais = config.canais.includes(canal as any) 
                                   ? config.canais.filter(c => c !== canal)
                                   : [...config.canais, canal as any];
                                 setConfiguracoes(prev => 
                                   prev.map(c => c.id === config.id ? { ...c, canais: newCanais } : c)
                                 );
                               }}
                             >
                               {getCanalIcon(canal)}
                               <span className="capitalize">{canal}</span>
                             </Button>
                           ))}
                         </div>
                       </div>
                      
                      <div>
                        <Label>Janela de silêncio</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="time"
                            placeholder="Início"
                            value={config.silencio_inicio || ""}
                          />
                          <Input
                            type="time"
                            placeholder="Fim"
                            value={config.silencio_fim || ""}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Alertas;