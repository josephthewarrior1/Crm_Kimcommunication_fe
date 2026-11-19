import styles from './tagtog-signin.module.css';

type Recovery = { message: string; canRetry: boolean };

const recoveryByReason: Record<string, Recovery> = {
  access_denied: {
    message: 'Akun Anda belum punya akses ke CRM. Hubungi admin kantor.',
    canRetry: false,
  },
  link_required: {
    message: 'Minta admin kantor menautkan akun TAGTOG Anda ke akun CRM.',
    canRetry: false,
  },
  managed: {
    message: 'Akun CRM dikelola di TAGTOG. Hubungi admin kantor untuk mendapat akses.',
    canRetry: false,
  },
  expired: {
    message: 'Permintaan masuk sudah kedaluwarsa. Silakan coba lagi.',
    canRetry: true,
  },
  invalid: {
    message: 'Permintaan masuk tidak dapat diverifikasi. Silakan coba lagi.',
    canRetry: true,
  },
  unavailable: {
    message: 'CRM sedang tidak bisa memeriksa sesi masuk Anda. Silakan coba lagi.',
    canRetry: true,
  },
};

export default function TagtogRecovery({ reason, returnTo }: { reason: string; returnTo: string }) {
  const { message, canRetry } = Object.prototype.hasOwnProperty.call(recoveryByReason, reason)
    ? recoveryByReason[reason]
    : recoveryByReason.invalid;
  const href = canRetry ? '/api/tagtog/start?returnTo=' + encodeURIComponent(returnTo) : '/api/tagtog/portal';

  return (
    <main className={styles.screen} lang="id">
      <section className={styles.content} aria-labelledby="crm-recovery-title">
        <p className={styles.brand}>TAGTOG CRM</p>
        <h1 className={styles.title} id="crm-recovery-title">CRM belum bisa dibuka</h1>
        <p className={styles.message}>{message}</p>
        <a className={styles.action} href={href}>{canRetry ? 'Coba lagi' : 'Kembali ke TAGTOG'}</a>
      </section>
    </main>
  );
}
