import { describe, expect, it } from 'vitest';
import { mensagemDeErro } from './erros';
import { validarCadastro, validarLogin } from './validacao';

describe('mensagemDeErro', () => {
  it('traduz os erros de login e de cadastro mais comuns', () => {
    expect(mensagemDeErro({ code: 'auth/invalid-credential' })).toBe('E-mail ou senha incorretos.');
    expect(mensagemDeErro({ code: 'auth/email-already-in-use' })).toContain('Já existe uma conta');
    expect(mensagemDeErro({ code: 'permission-denied' })).toContain('Sem permissão');
  });

  it('mostra o código quando não conhece o erro', () => {
    expect(mensagemDeErro({ code: 'auth/algo-novo' })).toBe(
      'Não foi possível concluir (auth/algo-novo). Tente de novo.',
    );
  });

  it('não quebra com erros sem código', () => {
    expect(mensagemDeErro(new Error('x'))).toBe('Não foi possível concluir. Tente de novo.');
  });

  it('não confunde propriedades do JavaScript com mensagens', () => {
    expect(mensagemDeErro({ code: 'constructor' })).toBe(
      'Não foi possível concluir (constructor). Tente de novo.',
    );
  });
});

describe('validarCadastro', () => {
  it('pede nome, e-mail válido e senha de pelo menos 6 caracteres', () => {
    expect(validarCadastro(' ', 'ana@exemplo.com', '123456')).toBe('Digite seu nome.');
    expect(validarCadastro('Ana', 'ana', '123456')).toBe('Digite um e-mail válido.');
    expect(validarCadastro('Ana', 'ana@exemplo.com', '12345')).toBe(
      'A senha precisa ter pelo menos 6 caracteres.',
    );
  });

  it('aceita um cadastro completo, mesmo com espaços no e-mail', () => {
    expect(validarCadastro('Ana', ' ana@exemplo.com ', '123456')).toBeNull();
  });
});

describe('validarLogin', () => {
  it('exige e-mail válido e senha', () => {
    expect(validarLogin('ana', 'x')).toBe('Digite um e-mail válido.');
    expect(validarLogin('ana@exemplo.com', '')).toBe('Digite a senha.');
    expect(validarLogin('ana@exemplo.com', 'x')).toBeNull();
  });
});
