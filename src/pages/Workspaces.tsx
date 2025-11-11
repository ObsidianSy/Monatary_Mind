import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus, Pencil, Trash2, Briefcase, Home, TrendingUp, Wallet, Globe, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Workspace {
    id: string;
    tenant_id: string;
    nome: string;
    descricao: string | null;
    cor: string;
    icone: string;
    ativo: boolean;
    created_at: string;
    updated_at: string;
}

interface User {
    id: string;
    nome: string;
    email: string;
    padrao?: boolean;
    acesso_desde?: string;
}

const iconMap: Record<string, any> = {
    briefcase: Briefcase,
    home: Home,
    trending: TrendingUp,
    wallet: Wallet,
    globe: Globe,
    building: Building2,
};

const colorOptions = [
    { value: 'blue', label: 'Azul', class: 'bg-blue-500' },
    { value: 'green', label: 'Verde', class: 'bg-green-500' },
    { value: 'purple', label: 'Roxo', class: 'bg-purple-500' },
    { value: 'orange', label: 'Laranja', class: 'bg-orange-500' },
    { value: 'pink', label: 'Rosa', class: 'bg-pink-500' },
    { value: 'red', label: 'Vermelho', class: 'bg-red-500' },
];

const iconOptions = [
    { value: 'briefcase', label: 'Pasta', Icon: Briefcase },
    { value: 'home', label: 'Casa', Icon: Home },
    { value: 'trending', label: 'Gráfico', Icon: TrendingUp },
    { value: 'wallet', label: 'Carteira', Icon: Wallet },
    { value: 'globe', label: 'Globo', Icon: Globe },
    { value: 'building', label: 'Prédio', Icon: Building2 },
];

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export default function Workspaces() {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
    const [deletingWorkspace, setDeletingWorkspace] = useState<Workspace | null>(null);
    const [usersDialogOpen, setUsersDialogOpen] = useState(false);
    const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
    const [workspaceUsers, setWorkspaceUsers] = useState<User[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        tenant_id: '',
        nome: '',
        descricao: '',
        cor: 'blue',
        icone: 'briefcase',
    });

    useEffect(() => {
        loadWorkspaces();
    }, []);

    const loadWorkspaces = async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/workspaces/all`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) throw new Error('Erro ao carregar workspaces');

            const data = await response.json();
            setWorkspaces(data.data);
        } catch (error: any) {
            toast({
                title: "Erro ao carregar workspaces",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenDialog = (workspace?: Workspace) => {
        if (workspace) {
            setEditingWorkspace(workspace);
            setFormData({
                tenant_id: workspace.tenant_id,
                nome: workspace.nome,
                descricao: workspace.descricao || '',
                cor: workspace.cor,
                icone: workspace.icone,
            });
        } else {
            setEditingWorkspace(null);
            setFormData({
                tenant_id: '',
                nome: '',
                descricao: '',
                cor: 'blue',
                icone: 'briefcase',
            });
        }
        setDialogOpen(true);
    };

    const handleSave = async () => {
        try {
            // Validação: verificar se tenant_id já existe (apenas para novos workspaces)
            if (!editingWorkspace) {
                const existingWorkspace = workspaces.find(
                    w => w.tenant_id.toLowerCase() === formData.tenant_id.toLowerCase()
                );

                if (existingWorkspace) {
                    toast({
                        title: "Erro",
                        description: `Já existe um workspace com o tenant_id "${formData.tenant_id}"`,
                        variant: "destructive",
                    });
                    return;
                }
            }

            const token = localStorage.getItem('token');
            const url = editingWorkspace
                ? `${API_BASE_URL}/workspaces/${editingWorkspace.id}`
                : `${API_BASE_URL}/workspaces`;

            const method = editingWorkspace ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao salvar workspace');
            }

            toast({
                title: editingWorkspace ? "Workspace atualizado!" : "Workspace criado!",
                description: "Operação realizada com sucesso.",
            });

            setDialogOpen(false);
            loadWorkspaces();
        } catch (error: any) {
            toast({
                title: "Erro",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const handleDelete = async () => {
        if (!deletingWorkspace) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/workspaces/${deletingWorkspace.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao excluir workspace');
            }

            toast({
                title: "Workspace excluído!",
                description: "Operação realizada com sucesso.",
            });

            setDeleteDialogOpen(false);
            setDeletingWorkspace(null);
            loadWorkspaces();
        } catch (error: any) {
            toast({
                title: "Erro",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const loadWorkspaceUsers = async (workspaceId: string) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) throw new Error('Erro ao carregar usuários');

            const data = await response.json();
            setWorkspaceUsers(data.data);
        } catch (error: any) {
            toast({
                title: "Erro ao carregar usuários",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const loadAllUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/users/all`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) throw new Error('Erro ao carregar usuários');

            const data = await response.json();
            setAllUsers(data.data);
        } catch (error: any) {
            toast({
                title: "Erro ao carregar usuários",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const handleOpenUsersDialog = async (workspace: Workspace) => {
        setSelectedWorkspace(workspace);
        setUsersDialogOpen(true);
        await Promise.all([
            loadWorkspaceUsers(workspace.id),
            loadAllUsers()
        ]);
    };

    const handleAddUser = async () => {
        if (!selectedWorkspace || !selectedUserId) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/workspaces/${selectedWorkspace.id}/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ usuario_id: selectedUserId }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao adicionar usuário');
            }

            toast({
                title: "Usuário adicionado!",
                description: "O usuário agora tem acesso a este workspace.",
            });

            setSelectedUserId('');
            loadWorkspaceUsers(selectedWorkspace.id);
        } catch (error: any) {
            toast({
                title: "Erro",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const handleRemoveUser = async (userId: string) => {
        if (!selectedWorkspace) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/workspaces/${selectedWorkspace.id}/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao remover usuário');
            }

            toast({
                title: "Usuário removido!",
                description: "O usuário não tem mais acesso a este workspace.",
            });

            loadWorkspaceUsers(selectedWorkspace.id);
        } catch (error: any) {
            toast({
                title: "Erro",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const getColorClass = (cor: string) => {
        const colorOption = colorOptions.find(c => c.value === cor);
        return colorOption?.class || 'bg-blue-500';
    };

    const getIcon = (iconName: string) => {
        const Icon = iconMap[iconName] || Briefcase;
        return Icon;
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Workspaces</h1>
                    <p className="text-muted-foreground">Gerencie os workspaces do sistema</p>
                </div>
                <Button onClick={() => handleOpenDialog()} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Novo Workspace
                </Button>
            </div>

            {isLoading ? (
                <div className="text-center py-12">Carregando...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {workspaces.map((workspace) => {
                        const Icon = getIcon(workspace.icone);
                        const colorClass = getColorClass(workspace.cor);

                        return (
                            <Card
                                key={workspace.id}
                                className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary/50"
                            >
                                {/* Header com ícone e badge */}
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className={`p-3 rounded-xl ${colorClass} shadow-md group-hover:shadow-lg transition-shadow`}>
                                            <Icon className="h-5 w-5 text-white" strokeWidth={2.5} />
                                        </div>
                                        <Badge
                                            variant={workspace.ativo ? "default" : "secondary"}
                                            className="text-xs"
                                        >
                                            {workspace.ativo ? "Ativo" : "Inativo"}
                                        </Badge>
                                    </div>

                                    <div>
                                        <CardTitle className="text-lg font-bold mb-1 line-clamp-1">
                                            {workspace.nome}
                                        </CardTitle>
                                        <CardDescription className="text-xs font-mono">
                                            {workspace.tenant_id}
                                        </CardDescription>
                                    </div>
                                </CardHeader>

                                {/* Descrição */}
                                <CardContent className="pt-0 pb-3">
                                    <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px] mb-3">
                                        {workspace.descricao || 'Sem descrição'}
                                    </p>

                                    {/* Botões de ação - layout compacto */}
                                    <div className="flex flex-col gap-1.5">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleOpenUsersDialog(workspace)}
                                            className="w-full justify-start h-8 text-xs"
                                        >
                                            <Users className="h-3.5 w-3.5 mr-1.5" />
                                            Gerenciar Usuários
                                        </Button>

                                        <div className="flex gap-1.5">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleOpenDialog(workspace)}
                                                className="flex-1 h-8 text-xs"
                                            >
                                                <Pencil className="h-3 w-3 mr-1" />
                                                Editar
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setDeletingWorkspace(workspace);
                                                    setDeleteDialogOpen(true);
                                                }}
                                                className="flex-1 h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                            >
                                                <Trash2 className="h-3 w-3 mr-1" />
                                                Excluir
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>

                                {/* Efeito de hover sutil */}
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-transparent transition-all duration-300 pointer-events-none" />
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Dialog de Criar/Editar */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editingWorkspace ? 'Editar Workspace' : 'Novo Workspace'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingWorkspace
                                ? 'Atualize as informações do workspace'
                                : 'Crie um novo workspace para organizar suas finanças'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {!editingWorkspace && (
                            <div className="space-y-2">
                                <Label htmlFor="tenant_id">Tenant ID *</Label>
                                <Input
                                    id="tenant_id"
                                    value={formData.tenant_id}
                                    onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
                                    placeholder="ex: main, personal, business"
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="nome">Nome *</Label>
                            <Input
                                id="nome"
                                value={formData.nome}
                                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                placeholder="ex: Principal, Pessoal"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="descricao">Descrição</Label>
                            <Textarea
                                id="descricao"
                                value={formData.descricao}
                                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                                placeholder="Descreva o propósito deste workspace"
                                rows={3}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="cor">Cor</Label>
                                <Select value={formData.cor} onValueChange={(value) => setFormData({ ...formData, cor: value })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {colorOptions.map((color) => (
                                            <SelectItem key={color.value} value={color.value}>
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-4 h-4 rounded ${color.class}`}></div>
                                                    {color.label}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="icone">Ícone</Label>
                                <Select value={formData.icone} onValueChange={(value) => setFormData({ ...formData, icone: value })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {iconOptions.map((icon) => (
                                            <SelectItem key={icon.value} value={icon.value}>
                                                <div className="flex items-center gap-2">
                                                    <icon.Icon className="h-4 w-4" />
                                                    {icon.label}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSave}>
                            {editingWorkspace ? 'Salvar' : 'Criar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog de Confirmação de Exclusão */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir o workspace <strong>{deletingWorkspace?.nome}</strong>?
                            Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeletingWorkspace(null)}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Dialog de Gerenciamento de Usuários */}
            <Dialog open={usersDialogOpen} onOpenChange={setUsersDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Gerenciar Usuários - {selectedWorkspace?.nome}</DialogTitle>
                        <DialogDescription>
                            Adicione ou remova usuários que têm acesso a este workspace
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Adicionar Usuário */}
                        <div className="space-y-2">
                            <Label>Adicionar Usuário</Label>
                            <div className="flex gap-2">
                                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                    <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="Selecione um usuário..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allUsers
                                            .filter(u => !workspaceUsers.find(wu => wu.id === u.id))
                                            .map((user) => (
                                                <SelectItem key={user.id} value={user.id}>
                                                    {user.nome} ({user.email})
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                                <Button onClick={handleAddUser} disabled={!selectedUserId}>
                                    <Plus className="h-4 w-4 mr-1" />
                                    Adicionar
                                </Button>
                            </div>
                        </div>

                        <Separator />

                        {/* Lista de Usuários */}
                        <div className="space-y-2">
                            <Label>Usuários com Acesso ({workspaceUsers.length})</Label>
                            <ScrollArea className="h-[300px] border rounded-lg p-2">
                                <div className="space-y-2">
                                    {workspaceUsers.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-8">
                                            Nenhum usuário com acesso a este workspace
                                        </p>
                                    ) : (
                                        workspaceUsers.map((user) => (
                                            <Card key={user.id} className="p-3">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-medium">{user.nome}</p>
                                                        <p className="text-sm text-muted-foreground">{user.email}</p>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleRemoveUser(user.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </Card>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button onClick={() => setUsersDialogOpen(false)}>
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
