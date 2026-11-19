const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Devolve a primeira mensagem de erro do formulário de entrada, ou null se estiver tudo certo.
export function validarLogin(email: string, senha: string): string | null {
  if (!EMAIL.test(email.trim())) return 'Digite um e-mail válido.';
  if (!senha) return 'Digite a senha.';
  return null;
}

export function validarCadastro(nome: string, email: string, senha: string): string | null {
  if (nome.trim().length < 2) return 'Digite seu nome.';
  if (!EMAIL.test(email.trim())) return 'Digite um e-mail válido.';
  if (senha.length < 6) return 'A senha precisa ter pelo menos 6 caracteres.';
  return null;
}
