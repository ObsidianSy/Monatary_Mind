/**
 * Sistema de mensagens de erro específicas e úteis para o usuário
 * Cada mensagem indica claramente o problema e sugere uma solução
 */

export const ErrorMessages = {
  // ========== TRANSAÇÕES ==========
  transaction: {
    load: {
      title: "Não foi possível carregar transações",
      description: "Verifique sua conexão com a internet e tente novamente.",
    },
    create: {
      title: "Transação não foi criada",
      description: "Verifique se todos os campos obrigatórios estão preenchidos corretamente.",
      insufficientBalance: "Saldo insuficiente na conta selecionada para esta transação.",
      invalidDate: "A data da transação não pode ser superior a 10 anos no futuro.",
      duplicated: "Já existe uma transação idêntica nesta data. Deseja criar mesmo assim?",
    },
    update: {
      title: "Não foi possível atualizar transação",
      description: "A transação pode ter sido excluída ou você não tem permissão para editá-la.",
      alreadyPaid: "Transações já pagas não podem ser editadas. Cancele o pagamento primeiro.",
    },
    delete: {
      title: "Não foi possível excluir transação",
      description: "A transação pode estar vinculada a uma fatura ou recorrência ativa.",
      hasInstallments: "Esta transação possui parcelas. Exclua as parcelas primeiro ou use a opção 'Excluir tudo'.",
    },
    generate: {
      title: "Não foi possível gerar transações",
      description: "Verifique se há recorrências ativas no período selecionado.",
      noPending: "Não há recorrências pendentes para serem geradas neste período.",
    },
  },

  // ========== CARTÕES ==========
  card: {
    load: {
      title: "Não foi possível carregar cartões",
      description: "Verifique sua conexão e tente novamente.",
    },
    create: {
      title: "Cartão não foi criado",
      description: "Verifique se o nome do cartão já não existe e se as datas estão corretas.",
      invalidClosingDay: "O dia de fechamento deve estar entre 1 e 31.",
      invalidDueDay: "O dia de vencimento deve estar entre 1 e 31.",
      duplicateName: "Já existe um cartão com este nome. Escolha outro nome.",
      dueDateBeforeClosing: "A data de vencimento deve ser posterior ao dia de fechamento.",
    },
    update: {
      title: "Não foi possível atualizar cartão",
      description: "O cartão pode ter sido excluído ou você não tem permissão.",
      hasOpenInvoice: "Não é possível alterar datas de cartão com fatura em aberto. Feche a fatura primeiro.",
    },
    delete: {
      title: "Não foi possível excluir cartão",
      description: "O cartão possui faturas ou compras vinculadas.",
      hasInvoices: "Exclua todas as faturas deste cartão antes de removê-lo.",
      hasPurchases: "Exclua todas as compras deste cartão antes de removê-lo.",
    },
  },

  // ========== FATURAS ==========
  invoice: {
    load: {
      title: "Não foi possível carregar faturas",
      description: "Verifique sua conexão e tente novamente.",
    },
    close: {
      title: "Não foi possível fechar fatura",
      description: "Verifique se há compras vinculadas a esta fatura.",
      alreadyClosed: "Esta fatura já foi fechada anteriormente.",
      noPurchases: "Não há compras nesta fatura para fechar.",
      invalidAmount: "O valor da fatura não confere com o total das compras.",
    },
    pay: {
      title: "Não foi possível pagar fatura",
      description: "Verifique se a conta de pagamento tem saldo suficiente.",
      notClosed: "A fatura precisa estar fechada antes de ser paga.",
      alreadyPaid: "Esta fatura já foi paga anteriormente.",
      insufficientBalance: "Saldo insuficiente na conta selecionada.",
    },
    edit: {
      title: "Não foi possível editar fatura",
      description: "Faturas pagas não podem ser editadas.",
      alreadyPaid: "Esta fatura já foi paga e não pode ser modificada.",
    },
    delete: {
      title: "Não foi possível excluir fatura",
      description: "Exclua todas as compras desta fatura antes de removê-la.",
      hasPurchases: "Esta fatura possui {count} compras vinculadas.",
      alreadyPaid: "Faturas pagas não podem ser excluídas. Estorne o pagamento primeiro.",
    },
  },

  // ========== COMPRAS/PARCELAS ==========
  purchase: {
    create: {
      title: "Compra não foi registrada",
      description: "Verifique se o cartão e a categoria estão selecionados corretamente.",
      invalidAmount: "O valor da compra deve ser maior que zero.",
      invalidInstallments: "O número de parcelas deve estar entre 1 e 48.",
      exceedsLimit: "Esta compra excede o limite disponível do cartão.",
    },
    edit: {
      title: "Não foi possível editar compra",
      description: "A compra pode estar vinculada a uma fatura fechada.",
      invoiceClosed: "Não é possível editar compras de faturas já fechadas.",
    },
    delete: {
      title: "Não foi possível excluir compra",
      description: "A compra pode estar vinculada a uma fatura fechada ou paga.",
      hasInstallments: "Esta compra possui parcelas. Exclua todas as parcelas ou use 'Excluir tudo'.",
    },
    installment: {
      update: {
        title: "Não foi possível atualizar parcela",
        description: "A parcela pode estar vinculada a uma fatura fechada.",
      },
      pay: {
        title: "Não foi possível marcar parcela como paga",
        description: "Verifique se a fatura desta parcela está fechada.",
      },
    },
  },

  // ========== CATEGORIAS ==========
  category: {
    load: {
      title: "Não foi possível carregar categorias",
      description: "Verifique sua conexão e tente novamente.",
    },
    create: {
      title: "Categoria não foi criada",
      description: "Verifique se o nome da categoria já não existe.",
      duplicateName: "Já existe uma categoria com este nome.",
      invalidType: "Selecione um tipo válido: Receita, Despesa ou Transferência.",
    },
    update: {
      title: "Não foi possível atualizar categoria",
      description: "A categoria pode estar sendo usada em transações ativas.",
    },
    delete: {
      title: "Não foi possível excluir categoria",
      description: "Esta categoria está sendo usada em transações ou possui subcategorias.",
      hasTransactions: "Exclua ou reclassifique as {count} transações desta categoria primeiro.",
      hasSubcategories: "Exclua as subcategorias desta categoria antes de removê-la.",
    },
  },

  // ========== CONTAS ==========
  account: {
    load: {
      title: "Não foi possível carregar contas",
      description: "Verifique sua conexão e tente novamente.",
    },
    create: {
      title: "Conta não foi criada",
      description: "Verifique se o nome da conta já não existe.",
      duplicateName: "Já existe uma conta com este nome.",
      invalidBalance: "O saldo inicial não pode ser negativo para contas do tipo Banco.",
    },
    update: {
      title: "Não foi possível atualizar conta",
      description: "A conta pode ter transações vinculadas que impedem a alteração.",
    },
    delete: {
      title: "Não foi possível excluir conta",
      description: "Esta conta possui transações ou está definida como pagamento de cartões.",
      hasTransactions: "Transfira ou exclua as {count} transações desta conta primeiro.",
      usedInCard: "Esta conta é usada como pagamento de cartões. Altere os cartões primeiro.",
    },
  },

  // ========== RECORRÊNCIAS ==========
  recurrence: {
    load: {
      title: "Não foi possível carregar recorrências",
      description: "Verifique sua conexão e tente novamente.",
    },
    create: {
      title: "Recorrência não foi criada",
      description: "Verifique se todos os campos obrigatórios estão preenchidos.",
      invalidFrequency: "Selecione uma frequência válida: Diária, Semanal, Mensal ou Anual.",
      invalidDueDay: "O dia de vencimento deve estar entre 1 e 31.",
      endBeforeStart: "A data final deve ser posterior à data inicial.",
    },
    update: {
      title: "Não foi possível atualizar recorrência",
      description: "A recorrência pode ter transações geradas que impedem alterações.",
      hasGeneratedTransactions: "Esta recorrência já gerou transações. Crie uma nova recorrência.",
    },
    delete: {
      title: "Não foi possível excluir recorrência",
      description: "Exclua as transações geradas por esta recorrência antes de removê-la.",
      hasTransactions: "Esta recorrência possui {count} transações geradas.",
    },
  },

  // ========== AUTENTICAÇÃO ==========
  auth: {
    login: {
      title: "Não foi possível fazer login",
      invalidCredentials: "E-mail ou senha incorretos. Verifique e tente novamente.",
      accountLocked: "Sua conta foi bloqueada por segurança. Entre em contato com o suporte.",
      accountInactive: "Sua conta está inativa. Entre em contato com o administrador.",
      sessionExpired: "Sua sessão expirou. Faça login novamente.",
    },
    register: {
      title: "Não foi possível criar conta",
      emailExists: "Este e-mail já está cadastrado. Use outro e-mail ou faça login.",
      weakPassword: "A senha deve ter no mínimo 8 caracteres, incluindo letras e números.",
      invalidEmail: "Digite um endereço de e-mail válido.",
    },
    logout: {
      title: "Erro ao sair",
      description: "Houve um problema ao encerrar sua sessão.",
    },
  },

  // ========== WORKSPACES ==========
  workspace: {
    load: {
      title: "Não foi possível carregar empresas",
      description: "Verifique sua conexão e tente novamente.",
    },
    create: {
      title: "Empresa não foi criada",
      description: "Verifique se o nome da empresa já não existe.",
      duplicateName: "Já existe uma empresa com este nome.",
      invalidTenant: "O identificador da empresa contém caracteres inválidos.",
    },
    select: {
      title: "Não foi possível selecionar empresa",
      description: "Você pode não ter permissão para acessar esta empresa.",
      noPermission: "Você não tem permissão para acessar esta empresa.",
    },
    delete: {
      title: "Não foi possível excluir empresa",
      description: "A empresa possui dados que impedem sua exclusão.",
      hasData: "Exclua todos os dados da empresa antes de removê-la.",
    },
  },

  // ========== USUÁRIOS ==========
  user: {
    load: {
      title: "Não foi possível carregar usuários",
      description: "Verifique sua conexão e tente novamente.",
    },
    create: {
      title: "Usuário não foi criado",
      description: "Verifique se o e-mail já não está cadastrado.",
      emailExists: "Este e-mail já está sendo usado por outro usuário.",
      invalidRole: "Selecione uma função válida para o usuário.",
    },
    update: {
      title: "Não foi possível atualizar usuário",
      description: "Você pode não ter permissão para editar este usuário.",
      noPermission: "Apenas administradores podem editar usuários.",
    },
    delete: {
      title: "Não foi possível excluir usuário",
      description: "Não é possível excluir usuários com transações ou dados vinculados.",
      hasData: "Transfira os dados deste usuário para outro antes de excluí-lo.",
      lastAdmin: "Não é possível excluir o último administrador do sistema.",
    },
  },

  // ========== INVENTÁRIO ==========
  inventory: {
    equipment: {
      load: {
        title: "Não foi possível carregar equipamentos",
        description: "Verifique sua conexão e tente novamente.",
      },
      save: {
        title: "Equipamento não foi salvo",
        description: "Verifique se todos os campos obrigatórios estão preenchidos.",
        duplicateCode: "Já existe um equipamento com este código patrimonial.",
      },
      delete: {
        title: "Não foi possível excluir equipamento",
        description: "O equipamento pode ter movimentações ou manutenções vinculadas.",
      },
    },
    product: {
      load: {
        title: "Não foi possível carregar produtos",
        description: "Verifique sua conexão e tente novamente.",
      },
    },
  },

  // ========== GENÉRICO ==========
  generic: {
    network: {
      title: "Erro de conexão",
      description: "Não foi possível conectar ao servidor. Verifique sua internet.",
    },
    permission: {
      title: "Sem permissão",
      description: "Você não tem permissão para realizar esta ação.",
    },
    notFound: {
      title: "Não encontrado",
      description: "O recurso solicitado não foi encontrado ou foi excluído.",
    },
    validation: {
      title: "Dados inválidos",
      description: "Verifique os campos e tente novamente.",
    },
    server: {
      title: "Erro no servidor",
      description: "Ocorreu um erro inesperado. Tente novamente em instantes.",
    },
  },
};

/**
 * Função auxiliar para formatar mensagens com placeholders
 * Exemplo: formatError("Esta categoria tem {count} transações", { count: 5 })
 */
export function formatErrorMessage(
  message: string,
  params?: Record<string, string | number>
): string {
  if (!params) return message;

  let formatted = message;
  Object.entries(params).forEach(([key, value]) => {
    formatted = formatted.replace(`{${key}}`, String(value));
  });

  return formatted;
}

/**
 * Extrai mensagem de erro útil de diferentes tipos de erro
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  return "Ocorreu um erro inesperado.";
}

/**
 * Detecta tipo de erro HTTP e retorna mensagem apropriada
 */
export function getHttpErrorMessage(status: number, resource: string): string {
  switch (status) {
    case 400:
      return `Dados inválidos ao processar ${resource}. Verifique os campos.`;
    case 401:
      return "Sua sessão expirou. Faça login novamente.";
    case 403:
      return `Você não tem permissão para acessar ${resource}.`;
    case 404:
      return `${resource} não foi encontrado ou foi excluído.`;
    case 409:
      return `${resource} já existe ou está em conflito com outro registro.`;
    case 422:
      return `Não foi possível processar ${resource}. Verifique os dados.`;
    case 500:
      return "Erro no servidor. Tente novamente em instantes.";
    case 503:
      return "Serviço temporariamente indisponível. Tente novamente.";
    default:
      return `Erro ao processar ${resource}. Tente novamente.`;
  }
}
