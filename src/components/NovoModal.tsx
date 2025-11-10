import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowDownCircle, 
  ArrowUpCircle, 
  ArrowLeftRight, 
  Repeat, 
  CreditCard,
  FileText
} from "lucide-react";
import NewTransactionModal from "./NewTransactionModal";
import NewCardModal from "./NewCardModal";
import AddPurchaseModal from "./AddPurchaseModal";

interface NovoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: "receita" | "despesa" | "transferencia" | "recorrencia" | "compra-cartao" | "cheque";
}

export function NovoModal({ open, onOpenChange, defaultType = "despesa" }: NovoModalProps) {
  const [activeTab, setActiveTab] = useState(defaultType);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);

  const handleTabChange = (value: string) => {
    setActiveTab(value as typeof defaultType);
    
    // Open respective modals
    if (value === "receita" || value === "despesa" || value === "transferencia") {
      setTransactionModalOpen(true);
      onOpenChange(false);
    } else if (value === "compra-cartao") {
      setPurchaseModalOpen(true);
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Novo Lançamento</DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
              <TabsTrigger value="despesa" className="flex items-center gap-1">
                <ArrowDownCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Despesa</span>
              </TabsTrigger>
              <TabsTrigger value="receita" className="flex items-center gap-1">
                <ArrowUpCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Receita</span>
              </TabsTrigger>
              <TabsTrigger value="transferencia" className="flex items-center gap-1">
                <ArrowLeftRight className="h-4 w-4" />
                <span className="hidden sm:inline">Transfer.</span>
              </TabsTrigger>
              <TabsTrigger value="recorrencia" className="flex items-center gap-1">
                <Repeat className="h-4 w-4" />
                <span className="hidden sm:inline">Recorr.</span>
              </TabsTrigger>
              <TabsTrigger value="compra-cartao" className="flex items-center gap-1">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Cartão</span>
              </TabsTrigger>
              <TabsTrigger value="cheque" className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Cheque</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="despesa" className="mt-4">
              <p className="text-sm text-muted-foreground text-center py-8">
                Abrindo formulário de despesa...
              </p>
            </TabsContent>
            
            <TabsContent value="receita" className="mt-4">
              <p className="text-sm text-muted-foreground text-center py-8">
                Abrindo formulário de receita...
              </p>
            </TabsContent>
            
            <TabsContent value="transferencia" className="mt-4">
              <p className="text-sm text-muted-foreground text-center py-8">
                Abrindo formulário de transferência...
              </p>
            </TabsContent>

            <TabsContent value="recorrencia" className="mt-4">
              <p className="text-sm text-muted-foreground text-center py-8">
                Em breve: Configurar recorrência
              </p>
            </TabsContent>

            <TabsContent value="compra-cartao" className="mt-4">
              <p className="text-sm text-muted-foreground text-center py-8">
                Abrindo formulário de compra no cartão...
              </p>
            </TabsContent>

            <TabsContent value="cheque" className="mt-4">
              <p className="text-sm text-muted-foreground text-center py-8">
                Em breve: Emitir/Receber cheque
              </p>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Modals existentes */}
      <NewTransactionModal
        open={transactionModalOpen}
        onOpenChange={setTransactionModalOpen}
      />

      <AddPurchaseModal
        open={purchaseModalOpen}
        onOpenChange={setPurchaseModalOpen}
      />
    </>
  );
}
