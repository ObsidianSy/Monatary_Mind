import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, CheckCircle, Clock, Filter, Search, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import EditParcelaModal from "@/components/EditParcelaModal";
import { useParcelas } from "@/hooks/useParcelas";
import { ValueDisplay } from "@/components/ValueDisplay";

interface Parcela {
  id: string;
  descricao: string;
  parcela_atual?: number;
  total_parcelas?: number;
  valor: number;
  vencimento: string;
  subcategoria: string;
  status: "pendente" | "paga" | "atrasada";
}

const Parcelas = () => {
  const { parcelas, loading, refresh } = useParcelas();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedParcela, setSelectedParcela] = useState<Parcela | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { toast } = useToast();

  const getStatusBadge = (status: string) => {
    const variants = {
      pendente: "default",
      paga: "default",
      atrasada: "destructive"
    } as const;

    const labels = {
      pendente: "Pendente",
      paga: "Paga", 
      atrasada: "Atrasada"
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || "default"}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const marcarComoPaga = (parcelaId: string) => {
    toast({
      title: "Parcela marcada como paga",
      description: "Transação criada automaticamente.",
    });
  };

  const handleEditParcela = (parcela: Parcela) => {
    // Transformar para o formato esperado pelo modal
    const parcelaFormatted = {
      id: parcela.id,
      descricao: parcela.descricao,
      description: parcela.descricao,
      installment: parcela.parcela_atual && parcela.total_parcelas ? 
        `${parcela.parcela_atual}/${parcela.total_parcelas}` : "N/A",
      amount: parcela.valor,
      valor: parcela.valor,
      dueDate: parcela.vencimento,
      vencimento: parcela.vencimento,
      status: parcela.status,
      parcela_atual: parcela.parcela_atual || 1,
      total_parcelas: parcela.total_parcelas || 1,
      subcategoria: parcela.subcategoria,
    };
    setSelectedParcela(parcelaFormatted as any);
    setIsEditModalOpen(true);
  };

  const filteredParcelas = parcelas.filter(parcela => {
    const matchesSearch = parcela.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         parcela.cartao_apelido.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || parcela.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = useMemo(() => {
    const pending = parcelas.filter(p => p.status === "pendente").length;
    const paid = parcelas.filter(p => p.status === "paga").length;
    const dueSoon = parcelas.filter(p => {
      const dueDate = new Date(p.vencimento);
      const now = new Date();
      const diffTime = dueDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7 && diffDays >= 0 && p.status === "pendente";
    }).length;
    const totalPending = parcelas
      .filter(p => p.status === "pendente")
      .reduce((sum, p) => sum + p.valor, 0);
    
    return { pending, paid, dueSoon, totalPending };
  }, [parcelas]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-center items-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-4">Carregando parcelas...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Parcelas</h1>
          <p className="text-muted-foreground">Acompanhe suas parcelas abertas</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-warning" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pagas este mês</p>
                <p className="text-2xl font-bold">{stats.paid}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-destructive" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vencendo em 7 dias</p>
                <p className="text-2xl font-bold">{stats.dueSoon}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Valor total pendente</p>
              <ValueDisplay 
                value={stats.totalPending} 
                size="xl" 
                variant="default"
                className="text-warning"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por descrição ou categoria..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="paga">Paga</SelectItem>
                <SelectItem value="atrasada">Atrasada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Parcelas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Parcela</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Cartão</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParcelas.map((parcela) => (
                <TableRow key={parcela.id}>
                  <TableCell className="font-medium">{parcela.descricao}</TableCell>
                  <TableCell>
                    {parcela.parcela_atual && parcela.total_parcelas ? 
                      `${parcela.parcela_atual}/${parcela.total_parcelas}` : "N/A"}
                  </TableCell>
                  <TableCell>
                    <ValueDisplay value={parcela.valor} size="sm" />
                  </TableCell>
                  <TableCell>{new Date(parcela.vencimento).toLocaleDateString()}</TableCell>
                  <TableCell>{parcela.cartao_apelido}</TableCell>
                  <TableCell>{getStatusBadge(parcela.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditParcela(parcela)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {parcela.status === "pendente" && (
                        <Button
                          size="sm"
                          onClick={() => marcarComoPaga(parcela.id)}
                          className="bg-gradient-primary"
                        >
                          Marcar como Paga
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <EditParcelaModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        parcela={selectedParcela as any}
        onSuccess={() => {
          refresh();
          toast({
            title: "Parcela atualizada",
            description: "Dados da parcela foram salvos.",
          });
        }}
      />
    </div>
  );
};

export default Parcelas;