import { useEffect, useState, type FormEvent } from 'react';
import { Campo, Logo, Carregando, Icone } from '@shared/ui';
import { VERSAO } from '@shared/versao';
import { lembrarLogin } from '@shared/lembrar';
import { api, type Usuario } from './api';

const memoria = lembrarLogin('uppa-financeiro');

export function Entrar({ aoEntrar }: { aoEntrar: (u: Usuario) => void }) {
  const [primeiro, setPrimeiro] = useState<boolean | null>(null);
  const [f, setF] = useState({ nome: '', login: memoria.usuario, senha: '' });
  const [lembrar, setLembrar] = useState(memoria.lembrar);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    api.get<{ precisa: boolean }>('/admin/setup').then((r) => setPrimeiro(r.precisa)).catch((e) => setErro(e.message));
  }, []);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setOcupado(true);
    try {
      const r = await api.post<{ token: string }>(primeiro ? '/admin/setup' : '/admin/login', { ...f, lembrar });
      api.gravarToken(r.token, lembrar);
      memoria.salvar(lembrar, f.login);
      aoEntrar(await api.get<Usuario>('/admin/me'));
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="tela-entrada">
      <form className="cartao-entrada" onSubmit={enviar}>
        <div className="marca-entrada">
          <Logo tamanho={32} /> UPPA Financeiro
        </div>
        {memoria.usuario && !primeiro && (
          <span className="pilula" aria-label="Usuário lembrado neste computador">
            <Icone nome="perfil" /> {memoria.usuario}
          </span>
        )}
        <h1>{primeiro ? 'Criar o administrador' : 'Entrar na tesouraria'}</h1>
        <p className="subtitulo">{primeiro ? 'Primeiro acesso: crie o usuário administrador da UPPA.' : 'Sócios, mensalidades, caixa e avisos da UPPA Roraima.'}</p>
        {primeiro === null && !erro && <Carregando />}
        {primeiro && (
          <Campo rotulo="Seu nome">
            <input className="input" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} required autoComplete="name" />
          </Campo>
        )}
        {primeiro !== null && (
          <>
            <Campo rotulo="Usuário">
              <input className="input" value={f.login} onChange={(e) => setF({ ...f, login: e.target.value })} required autoComplete="username" autoCapitalize="none" />
            </Campo>
            <Campo rotulo="Senha" ajuda={primeiro ? 'Pelo menos 8 caracteres.' : undefined}>
              <input className="input" type="password" value={f.senha} onChange={(e) => setF({ ...f, senha: e.target.value })} required autoComplete={primeiro ? 'new-password' : 'current-password'} />
            </Campo>
            <label className="check">
              <input type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} />
              <span>
                Lembrar de mim <span className="muted small">(não marque em computador compartilhado)</span>
              </span>
            </label>
          </>
        )}
        {erro && <div className="alert bad">{erro}</div>}
        {primeiro !== null && (
          <button className="btn block" disabled={ocupado}>
            {primeiro ? 'Criar administrador e entrar' : 'Entrar'}
          </button>
        )}
      </form>
      <footer className="rodape-entrada">
        <span>UPPA Roraima — União de Pais e Pessoas Autistas</span>
        <span>Acesso restrito à diretoria e à tesouraria</span>
        <span>Versão {VERSAO}</span>
      </footer>
    </div>
  );
}
