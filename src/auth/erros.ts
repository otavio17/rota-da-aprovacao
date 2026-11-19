// Traduz os códigos de erro do Firebase (Authentication e Firestore) para frases em português.
const MENSAGENS: Record<string, string> = {
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/invalid-login-credentials': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'E-mail ou senha incorretos.',
  'auth/invalid-email': 'Digite um e-mail válido.',
  'auth/missing-password': 'Digite a senha.',
  'auth/email-already-in-use': 'Já existe uma conta com este e-mail. Use “Entrar”.',
  'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
  'auth/too-many-requests': 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.',
  'auth/network-request-failed': 'Sem conexão com a internet.',
  'auth/operation-not-allowed': 'O login por e-mail e senha ainda não está ativado no Firebase.',
  'auth/unauthorized-domain':
    'Este endereço não está autorizado no Firebase (Authentication › Configurações › Domínios autorizados).',
  'auth/configuration-not-found': 'O Firebase Authentication ainda não foi ativado neste projeto.',
  'permission-denied': 'Sem permissão para ver estes dados. Confira as regras do Firestore.',
  unavailable: 'Sem conexão com o servidor. Tente de novo quando a internet voltar.',
};

export function codigoDoErro(erro: unknown): string {
  if (typeof erro === 'object' && erro !== null && 'code' in erro) {
    return String((erro as { code: unknown }).code);
  }
  return '';
}

export function mensagemDeErro(erro: unknown): string {
  const codigo = codigoDoErro(erro);
  if (Object.hasOwn(MENSAGENS, codigo)) return MENSAGENS[codigo];
  return `Não foi possível concluir${codigo ? ` (${codigo})` : ''}. Tente de novo.`;
}
