import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Shield, CheckCircle, XCircle, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ============================================
// CONFIGURAÇÃO DA API
// ============================================
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface User {
  id: string;
  email: string;
  nome: string;
  ativo: boolean;
  email_verificado: boolean;
  ultimo_acesso: string | null;
  created_at: string;
  roles: { id: string; nome: string; nivel_acesso: number }[];
}

interface Role {
  id: string;
  nome: string;
  descricao: string;
  nivel_acesso: number;
}

export default function Usuarios() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  // Form states
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    nome: "",
    roles: [] as string[],
  });

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  async function loadUsers() {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("$\{API_BASE_URL\}/usuarios", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Erro ao carregar usuários");

      const data = await response.json();
      setUsers(data.data);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar usuários",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadRoles() {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("$\{API_BASE_URL\}/roles", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Erro ao carregar roles");

      const data = await response.json();
      setRoles(data.data);
    } catch (error: any) {
      console.error("Erro ao carregar roles:", error);
    }
  }

  async function handleCreateUser() {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("$\{API_BASE_URL\}/usuarios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          nome: formData.nome,
          roles: formData.roles.length > 0 ? formData.roles : ["USER"],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao criar usuário");
      }

      toast({
        title: "Usuário criado com sucesso!",
      });

      setIsCreateModalOpen(false);
      setFormData({ email: "", password: "", nome: "", roles: [] });
      loadUsers();
    } catch (error: any) {
      toast({
        title: "Erro ao criar usuário",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  async function handleUpdateUser() {
    if (!selectedUser) return;

    try {
      const token = localStorage.getItem("token");
      
      // Atualizar dados do usuário
      const updateResponse = await fetch(`$\{API_BASE_URL\}/usuarios/${selectedUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nome: formData.nome,
          ativo: true,
        }),
      });

      if (!updateResponse.ok) throw new Error("Erro ao atualizar usuário");

      // Atualizar roles
      if (formData.roles.length > 0) {
        const rolesResponse = await fetch(`$\{API_BASE_URL\}/usuarios/${selectedUser.id}/roles`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            roleIds: formData.roles,
          }),
        });

        if (!rolesResponse.ok) throw new Error("Erro ao atualizar roles");
      }

      toast({
        title: "Usuário atualizado com sucesso!",
      });

      setIsEditModalOpen(false);
      setSelectedUser(null);
      setFormData({ email: "", password: "", nome: "", roles: [] });
      loadUsers();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar usuário",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  async function handleDeleteUser(userId: string) {
    if (!confirm("Tem certeza que deseja excluir este usuário?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`$\{API_BASE_URL\}/usuarios/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Erro ao deletar usuário");

      toast({
        title: "Usuário deletado com sucesso!",
      });

      loadUsers();
    } catch (error: any) {
      toast({
        title: "Erro ao deletar usuário",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  function openEditModal(user: User) {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: "",
      nome: user.nome,
      roles: user.roles?.map(r => r.id) || [],
    });
    setIsEditModalOpen(true);
  }

  const getRoleBadgeColor = (nivel: number) => {
    if (nivel >= 999) return "bg-purple-500";
    if (nivel >= 100) return "bg-red-500";
    if (nivel >= 50) return "bg-orange-500";
    return "bg-blue-500";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Gerenciamento de Usuários
          </h1>
          <p className="text-muted-foreground mt-1">
            Crie, edite e gerencie usuários e permissões do sistema
          </p>
        </div>

        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
              <DialogDescription>
                Preencha os dados do novo usuário
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="usuario@email.com"
                />
              </div>
              <div>
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
              <div>
                <Label>Roles</Label>
                <Select
                  value={formData.roles[0] || ""}
                  onValueChange={(value) => setFormData({ ...formData, roles: [value] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.nome} - {role.descricao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateUser}>Criar Usuário</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuários do Sistema</CardTitle>
          <CardDescription>
            {users.length} usuário{users.length !== 1 ? "s" : ""} cadastrado{users.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último Acesso</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.nome}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {user.roles?.map((role) => (
                        <Badge
                          key={role.id}
                          className={getRoleBadgeColor(role.nivel_acesso)}
                        >
                          {role.nome}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.ativo ? (
                      <Badge variant="outline" className="bg-green-500/10">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-500/10">
                        <XCircle className="mr-1 h-3 w-3" />
                        Inativo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.ultimo_acesso
                      ? format(new Date(user.ultimo_acesso), "dd/MM/yyyy HH:mm", { locale: ptBR })
                      : "Nunca"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {user.id !== currentUser?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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

      {/* Modal de Edição */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Atualize os dados do usuário
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-nome">Nome</Label>
              <Input
                id="edit-nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                disabled
              />
            </div>
            <div>
              <Label>Roles</Label>
              <Select
                value={formData.roles[0] || ""}
                onValueChange={(value) => setFormData({ ...formData, roles: [value] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.nome} - {role.descricao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateUser}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

