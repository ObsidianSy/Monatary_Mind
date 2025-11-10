import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Settings, Globe, Bell, Webhook, Key, Download, Upload, Trash2, TestTube } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ConfigGeral {
  moeda: string;
  timezone: string;
  formato_data: string;
  horizonte_projecao: number;
  tema: "light" | "dark" | "auto";
}

interface ConfigAlertas {
  email_ativo: boolean;
  whatsapp_ativo: boolean;
  telegram_ativo: boolean;
  dias_padrao: number;
  silencio_inicio: string;
  silencio_fim: string;
}

interface ConfigIntegracao {
  webhook_url: string;
  webhook_ativo: boolean;
  api_key: string;
  ultimo_teste: string;
  status_conexao: "conectado" | "erro" | "desconectado";
}

const Configuracoes = () => {
  const [configGeral, setConfigGeral] = useState<ConfigGeral>({
    moeda: "BRL",
    timezone: "America/Sao_Paulo",
    formato_data: "dd/MM/yyyy",
    horizonte_projecao: 30,
    tema: "auto"
  });

  const [configAlertas, setConfigAlertas] = useState<ConfigAlertas>({
    email_ativo: true,
    whatsapp_ativo: false,
    telegram_ativo: false,
    dias_padrao: 3,
    silencio_inicio: "22:00",
    silencio_fim: "08:00"
  });

  const [configIntegracao, setConfigIntegracao] = useState<ConfigIntegracao>({
    webhook_url: "https://api.exemplo.com/webhook",
    webhook_ativo: true,
    api_key: "sk-1234****",
    ultimo_teste: "2024-01-15T10:30:00",
    status_conexao: "conectado"
  });

  const { toast } = useToast();

  const salvarConfiguracoes = async () => {
    // Aqui você implementaria a chamada real para o SDK
    // await postEvent("configuracao.upsert", { geral: configGeral, alertas: configAlertas, integracao: configIntegracao });
    
    toast({
      title: "Configurações salvas",
      description: "Todas as alterações foram aplicadas com sucesso.",
    });
  };

  const testarWebhook = async () => {
    toast({
      title: "Testando webhook...",
      description: "Enviando requisição de teste.",
    });
    
    try {
      // Aqui você implementaria o teste real do webhook
      // const response = await fetch(configIntegracao.webhook_url, { method: 'POST', ... });
      
      // Simular teste por enquanto
      setTimeout(() => {
        setConfigIntegracao(prev => ({
          ...prev,
          ultimo_teste: new Date().toISOString(),
          status_conexao: "conectado"
        }));
        
        toast({
          title: "Teste concluído",
          description: "Webhook respondeu com sucesso.",
        });
      }, 2000);
    } catch (error) {
      setConfigIntegracao(prev => ({
        ...prev,
        status_conexao: "erro"
      }));
      
      toast({
        title: "Erro no teste",
        description: "Falha ao conectar com o webhook.",
        variant: "destructive"
      });
    }
  };

  const exportarDados = () => {
    toast({
      title: "Exportação iniciada",
      description: "Seus dados serão baixados em formato JSON.",
    });
  };

  const importarDados = () => {
    toast({
      title: "Importação preparada",
      description: "Selecione o arquivo JSON para importar.",
    });
  };

  const limparDados = () => {
    if (confirm("Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.")) {
      toast({
        title: "Dados limpos",
        description: "Todos os dados foram removidos do sistema.",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      conectado: "default",
      erro: "destructive",
      desconectado: "secondary"
    } as const;

    const labels = {
      conectado: "Conectado",
      erro: "Erro",
      desconectado: "Desconectado"
    };

    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground">Personalize o comportamento do sistema</p>
        </div>
        
        <Button onClick={salvarConfiguracoes}>
          <Settings className="h-4 w-4 mr-2" />
          Salvar Todas
        </Button>
      </div>

      <Tabs defaultValue="geral" className="space-y-4">
        <TabsList>
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="alertas">Alertas</TabsTrigger>
          <TabsTrigger value="integracao">Integração</TabsTrigger>
          <TabsTrigger value="dados">Dados</TabsTrigger>
        </TabsList>
        
        <TabsContent value="geral">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Configurações Gerais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="moeda">Moeda</Label>
                    <Select value={configGeral.moeda} onValueChange={(value) => 
                      setConfigGeral(prev => ({ ...prev, moeda: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BRL">Real Brasileiro (BRL)</SelectItem>
                        <SelectItem value="USD">Dólar Americano (USD)</SelectItem>
                        <SelectItem value="EUR">Euro (EUR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select value={configGeral.timezone} onValueChange={(value) => 
                      setConfigGeral(prev => ({ ...prev, timezone: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/Sao_Paulo">São Paulo (UTC-3)</SelectItem>
                        <SelectItem value="America/New_York">Nova York (UTC-5)</SelectItem>
                        <SelectItem value="Europe/London">Londres (UTC+0)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="formato_data">Formato de Data</Label>
                    <Select value={configGeral.formato_data} onValueChange={(value) => 
                      setConfigGeral(prev => ({ ...prev, formato_data: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dd/MM/yyyy">DD/MM/YYYY</SelectItem>
                        <SelectItem value="MM/dd/yyyy">MM/DD/YYYY</SelectItem>
                        <SelectItem value="yyyy-MM-dd">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="horizonte">Horizonte de Projeção (dias)</Label>
                    <Input
                      id="horizonte"
                      type="number"
                      min="7"
                      max="365"
                      value={configGeral.horizonte_projecao}
                      onChange={(e) => setConfigGeral(prev => ({ 
                        ...prev, 
                        horizonte_projecao: parseInt(e.target.value) 
                      }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="tema">Tema</Label>
                    <Select value={configGeral.tema} onValueChange={(value: "light" | "dark" | "auto") => 
                      setConfigGeral(prev => ({ ...prev, tema: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Automático</SelectItem>
                        <SelectItem value="light">Claro</SelectItem>
                        <SelectItem value="dark">Escuro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="alertas">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Configurações de Alertas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Canais de Notificação</h3>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <p className="text-sm text-muted-foreground">Receber alertas por email</p>
                    </div>
                    <Switch
                      id="email"
                      checked={configAlertas.email_ativo}
                      onCheckedChange={(checked) => 
                        setConfigAlertas(prev => ({ ...prev, email_ativo: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="whatsapp">WhatsApp</Label>
                      <p className="text-sm text-muted-foreground">Notificações via WhatsApp</p>
                    </div>
                    <Switch
                      id="whatsapp"
                      checked={configAlertas.whatsapp_ativo}
                      onCheckedChange={(checked) => 
                        setConfigAlertas(prev => ({ ...prev, whatsapp_ativo: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="telegram">Telegram</Label>
                      <p className="text-sm text-muted-foreground">Alertas via Telegram</p>
                    </div>
                    <Switch
                      id="telegram"
                      checked={configAlertas.telegram_ativo}
                      onCheckedChange={(checked) => 
                        setConfigAlertas(prev => ({ ...prev, telegram_ativo: checked }))}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Configurações Padrão</h3>
                  
                  <div>
                    <Label htmlFor="dias_padrao">Dias de Antecedência</Label>
                    <Input
                      id="dias_padrao"
                      type="number"
                      min="0"
                      max="30"
                      value={configAlertas.dias_padrao}
                      onChange={(e) => setConfigAlertas(prev => ({ 
                        ...prev, 
                        dias_padrao: parseInt(e.target.value) 
                      }))}
                    />
                  </div>

                  <div>
                    <Label>Janela de Silêncio</Label>
                    <div className="flex gap-2 mt-2">
                      <div className="flex-1">
                        <Label htmlFor="silencio_inicio" className="text-xs">Início</Label>
                        <Input
                          id="silencio_inicio"
                          type="time"
                          value={configAlertas.silencio_inicio}
                          onChange={(e) => setConfigAlertas(prev => ({ 
                            ...prev, 
                            silencio_inicio: e.target.value 
                          }))}
                        />
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="silencio_fim" className="text-xs">Fim</Label>
                        <Input
                          id="silencio_fim"
                          type="time"
                          value={configAlertas.silencio_fim}
                          onChange={(e) => setConfigAlertas(prev => ({ 
                            ...prev, 
                            silencio_fim: e.target.value 
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="integracao">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Integração com APIs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border">
                  <div>
                    <h3 className="font-semibold">Status da Conexão</h3>
                    <p className="text-sm text-muted-foreground">
                      Último teste: {new Date(configIntegracao.ultimo_teste).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(configIntegracao.status_conexao)}
                    <Button variant="outline" size="sm" onClick={testarWebhook}>
                      <TestTube className="h-4 w-4 mr-2" />
                      Testar
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="webhook_url">URL do Webhook</Label>
                      <Input
                        id="webhook_url"
                        value={configIntegracao.webhook_url}
                        onChange={(e) => setConfigIntegracao(prev => ({ 
                          ...prev, 
                          webhook_url: e.target.value 
                        }))}
                        placeholder="https://api.exemplo.com/webhook"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="webhook_ativo">Webhook Ativo</Label>
                        <p className="text-sm text-muted-foreground">Enviar eventos para o webhook</p>
                      </div>
                      <Switch
                        id="webhook_ativo"
                        checked={configIntegracao.webhook_ativo}
                        onCheckedChange={(checked) => 
                          setConfigIntegracao(prev => ({ ...prev, webhook_ativo: checked }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="api_key">API Key</Label>
                      <div className="flex gap-2">
                        <Input
                          id="api_key"
                          type="password"
                          value={configIntegracao.api_key}
                          onChange={(e) => setConfigIntegracao(prev => ({ 
                            ...prev, 
                            api_key: e.target.value 
                          }))}
                          placeholder="sk-1234567890abcdef"
                        />
                        <Button variant="outline" size="sm">
                          <Key className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label>Eventos Enviados</Label>
                      <div className="space-y-2 mt-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">transacao.upsert</Badge>
                          <Badge variant="outline">recorrencia.upsert</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">fatura.fechar</Badge>
                          <Badge variant="outline">fatura.pagar</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="dados">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Backup e Restauração</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button variant="outline" onClick={exportarDados}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar Dados
                  </Button>
                  <Button variant="outline" onClick={importarDados}>
                    <Upload className="h-4 w-4 mr-2" />
                    Importar Dados
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Exporte seus dados em formato JSON para backup ou migração.
                  Use a importação para restaurar dados de um backup anterior.
                </p>
              </CardContent>
            </Card>

            <Card className="border-destructive/20">
              <CardHeader>
                <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Limpar Todos os Dados</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Esta ação removerá permanentemente todas as transações, contas, 
                      categorias e configurações. Esta ação não pode ser desfeita.
                    </p>
                    <Button variant="destructive" onClick={limparDados}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Limpar Todos os Dados
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Configuracoes;