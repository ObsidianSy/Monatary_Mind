// Página de Títulos (Cheques)

import { useState } from "react";
import { useCheques } from "@/hooks/useCheques";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  FileText, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Clock,
  AlertCircle,
  Ban
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const statusConfig = {
  emitido: { label: "Emitido", color: "bg-blue-500", icon: FileText },
  depositado: { label: "Depositado", color: "bg-yellow-500", icon: Clock },
  compensado: { label: "Compensado", color: "bg-green-500", icon: CheckCircle2 },
  devolvido: { label: "Devolvido", color: "bg-red-500", icon: XCircle },
  sustado: { label: "Sustado", color: "bg-orange-500", icon: AlertCircle },
  cancelado: { label: "Cancelado", color: "bg-gray-500", icon: Ban },
};

export default function Titulos() {
  const { 
    cheques, 
    chequesEmitidos, 
    chequesRecebidos,
    loading,
    depositar,
    compensar,
    devolver,
    sustar,
    cancelar 
  } = useCheques();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const StatusBadge = ({ status }: { status: keyof typeof statusConfig }) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    
    return (
      <Badge variant="outline" className="gap-1">
        <div className={cn("w-2 h-2 rounded-full", config.color)} />
        {config.label}
      </Badge>
    );
  };

  const ChequeActions = ({ cheque }: { cheque: any }) => {
    const handleAction = async (action: string) => {
      try {
        switch (action) {
          case "depositar":
            await depositar(cheque.id);
            break;
          case "compensar":
            await compensar(cheque.id, format(new Date(), "yyyy-MM-dd"));
            break;
          case "devolver":
            await devolver(cheque.id);
            break;
          case "sustar":
            await sustar(cheque.id);
            break;
          case "cancelar":
            await cancelar(cheque.id);
            break;
        }
      } catch (error) {
        console.error("Erro ao processar ação:", error);
      }
    };

    if (cheque.status === "emitido") {
      return (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleAction("compensar")}>
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Compensar
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleAction("sustar")}>
            <AlertCircle className="h-4 w-4 mr-1" />
            Sustar
          </Button>
        </div>
      );
    }

    if (cheque.status === "depositado") {
      return (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleAction("compensar")}>
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Compensar
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleAction("devolver")}>
            <XCircle className="h-4 w-4 mr-1" />
            Devolver
          </Button>
        </div>
      );
    }

    return null;
  };

  const ChequeTable = ({ cheques, tipo }: { cheques: any[]; tipo: "emitido" | "recebido" }) => {
    if (cheques.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-1">
              Nenhum cheque {tipo === "emitido" ? "emitido" : "recebido"}
            </p>
            <p className="text-sm text-muted-foreground">
              Adicione um novo cheque para começar
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>{tipo === "emitido" ? "Favorecido" : "Emitente"}</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Emissão</TableHead>
                <TableHead>Prev. Compensação</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cheques.map((cheque) => (
                <TableRow key={cheque.id}>
                  <TableCell className="font-mono">{cheque.numero}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{cheque.nominal}</p>
                      {cheque.documento && (
                        <p className="text-xs text-muted-foreground">{cheque.documento}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(cheque.valor)}
                  </TableCell>
                  <TableCell>
                    {format(new Date(cheque.data_emissao), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    {format(new Date(cheque.data_prev_compensacao), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={cheque.status} />
                  </TableCell>
                  <TableCell>
                    <ChequeActions cheque={cheque} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  // Calcular resumos
  const totalEmitidos = chequesEmitidos.reduce((sum, c) => sum + c.valor, 0);
  const totalRecebidos = chequesRecebidos.reduce((sum, c) => sum + c.valor, 0);
  const pendentesEmitidos = chequesEmitidos.filter(
    c => c.status === "emitido" || c.status === "depositado"
  ).length;
  const pendentesRecebidos = chequesRecebidos.filter(
    c => c.status === "emitido" || c.status === "depositado"
  ).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Títulos</h1>
          <p className="text-muted-foreground">
            Gerenciamento de cheques emitidos e recebidos
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Cheque
        </Button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Emitidos (Total)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(totalEmitidos)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {chequesEmitidos.length} cheques
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Emitidos (Pendentes)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendentesEmitidos}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Aguardando compensação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Recebidos (Total)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(totalRecebidos)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {chequesRecebidos.length} cheques
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Recebidos (Pendentes)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendentesRecebidos}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Aguardando compensação
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="emitidos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="emitidos">
            Emitidos
            <Badge variant="secondary" className="ml-2">{chequesEmitidos.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="recebidos">
            Recebidos
            <Badge variant="secondary" className="ml-2">{chequesRecebidos.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="emitidos">
          <ChequeTable cheques={chequesEmitidos} tipo="emitido" />
        </TabsContent>

        <TabsContent value="recebidos">
          <ChequeTable cheques={chequesRecebidos} tipo="recebido" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
