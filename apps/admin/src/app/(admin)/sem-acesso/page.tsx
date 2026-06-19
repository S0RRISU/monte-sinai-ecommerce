'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight, Lock, LogOut, ShieldAlert } from 'lucide-react';
import { signOut } from '@/lib/admin-services';
import { useAdminStore } from '@/store/admin-store';

export default function NoAccessPage() {
  const router = useRouter();
  const { profile, setProfile } = useAdminStore();

  async function handleSwitchAccount() {
    await signOut();
    setProfile(null);
    router.replace('/login?next=/dashboard&semAcesso=1');
  }

  return (
    <div className="admin-no-access-page">
      <section className="admin-no-access-card">
        <span className="admin-no-access-icon">
          <ShieldAlert className="size-8" />
        </span>
        <p className="admin-no-access-eyebrow">Acesso bloqueado</p>
        <h1>Esta conta nao tem acesso ao painel</h1>
        <p className="admin-no-access-copy">
          {profile?.email ? (
            <>
              Voce esta conectado como <strong>{profile.email}</strong>. Saia desta sessao para entrar com uma conta admin, equipe ou developer.
            </>
          ) : (
            'Entre com uma conta admin, equipe ou developer para acessar o painel.'
          )}
        </p>

        <div className="admin-no-access-actions">
          <button type="button" className="admin-button admin-button-primary" onClick={handleSwitchAccount}>
            <LogOut className="size-4" />
            Sair e trocar conta
          </button>
          <button type="button" className="admin-button admin-button-soft" onClick={handleSwitchAccount}>
            <Lock className="size-4" />
            Ir para login
          </button>
        </div>

        <div className="admin-no-access-note">
          <ArrowRight className="size-4" />
          Se essa pessoa deve acessar o painel, libere o papel e os modulos em Usuarios e permissoes.
        </div>
      </section>
    </div>
  );
}
