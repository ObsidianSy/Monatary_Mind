import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Building2, Loader2 } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface Workspace {
    id: string;
    tenant_id: string;
    nome: string;
    descricao: string;
    cor: string;
    icone: string;
    is_padrao?: boolean;
}

interface UserWorkspacesModalProps {
    userId: string;
    userName: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function UserWorkspacesModal({
    userId,
    userName,
    isOpen,
    onClose,
    onSuccess,
}: UserWorkspacesModalProps) {
    const [allWorkspaces, setAllWorkspaces] = useState<Workspace[]>([]);
    const [userWorkspaces, setUserWorkspaces] = useState<Workspace[]>([]);
    const [selectedWorkspaces, setSelectedWorkspaces] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen, userId]);

    async function loadData() {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");

            // Buscar todos os workspaces
            const allResponse = await fetch(`${API_BASE_URL}/auth/workspaces`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const allData = await allResponse.json();

            // Buscar workspaces do usuário
            const userResponse = await fetch(`${API_BASE_URL}/usuarios/${userId}/workspaces`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const userData = await userResponse.json();

            setAllWorkspaces(allData.workspaces || []);
            setUserWorkspaces(userData.workspaces || []);
            setSelectedWorkspaces((userData.workspaces || []).map((w: Workspace) => w.id));
        } catch (error: any) {
            toast({
                title: "Erro ao carregar workspaces",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        try {
            setSaving(true);
            const token = localStorage.getItem("token");

            const response = await fetch(`${API_BASE_URL}/usuarios/${userId}/workspaces`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ workspaceIds: selectedWorkspaces }),
            });

            if (!response.ok) throw new Error("Erro ao atualizar workspaces");

            toast({
                title: "Workspaces atualizados!",
                description: `Acesso de ${userName} aos workspaces foi atualizado.`,
            });

            onSuccess();
            onClose();
        } catch (error: any) {
            toast({
                title: "Erro ao atualizar workspaces",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    }

    const toggleWorkspace = (workspaceId: string) => {
        setSelectedWorkspaces((prev) =>
            prev.includes(workspaceId)
                ? prev.filter((id) => id !== workspaceId)
                : [...prev, workspaceId]
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 text-2xl">
                        <div className="p-2 bg-slate-900 rounded-xl">
                            <Building2 className="h-6 w-6 text-white" />
                        </div>
                        Gerenciar Workspaces
                    </DialogTitle>
                    <DialogDescription className="text-base">
                        Selecione os workspaces que <span className="font-medium text-slate-900">{userName}</span> pode acessar
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                        {allWorkspaces.map((workspace) => (
                            <div
                                key={workspace.id}
                                className={`flex items-center space-x-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedWorkspaces.includes(workspace.id)
                                        ? 'border-slate-900 bg-slate-50 shadow-sm'
                                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                                onClick={() => toggleWorkspace(workspace.id)}
                            >
                                <Checkbox
                                    id={workspace.id}
                                    checked={selectedWorkspaces.includes(workspace.id)}
                                    onCheckedChange={() => toggleWorkspace(workspace.id)}
                                    className="data-[state=checked]:bg-slate-900 data-[state=checked]:border-slate-900"
                                />
                                <label
                                    htmlFor={workspace.id}
                                    className="flex-1 cursor-pointer flex items-center gap-4"
                                >
                                    <div
                                        className="p-3 rounded-xl shadow-sm"
                                        style={{
                                            backgroundColor: `${workspace.cor}15`,
                                            border: `1px solid ${workspace.cor}30`
                                        }}
                                    >
                                        <Building2
                                            className="h-5 w-5"
                                            style={{ color: workspace.cor }}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-slate-900">{workspace.nome}</p>
                                        {workspace.descricao && (
                                            <p className="text-sm text-slate-600 mt-0.5">
                                                {workspace.descricao}
                                            </p>
                                        )}
                                    </div>
                                </label>
                            </div>
                        ))}
                    </div>
                )}

                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={saving}
                        className="h-11 px-6"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="h-11 px-6 bg-slate-900 hover:bg-slate-800"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            "Salvar Alterações"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
