'use client';

import React, { useState } from 'react';
import { useAuth } from '../../lib/context/AuthContext';
import { ArrowRight, Building2, CalendarDays, Eye, EyeOff, Headphones, Loader2, LockKeyhole, ShieldCheck, User, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { toast } from 'sonner';
import styles from './login.module.css';

export default function LoginPage() {
  const { login } = useAuth();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!usernameOrEmail.trim() || !password) {
      toast.error('Please enter both username/email and password.');
      return;
    }
    setLoading(true);
    try {
      await login({ usernameOrEmail: usernameOrEmail.trim(), password });
    } catch {
      // AuthContext displays the login error and handles successful navigation.
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <aside className={styles.story} aria-label="KIM CRM workspace">
          <div className={styles.brand}>
            <span className={styles.brandMark} aria-hidden="true">K</span>
            <span>KIM COMMUNICATION</span>
          </div>
          <div className={styles.storyContent}>
            <h2 className={styles.headline}>Your team.<br /><span>One workspace.</span></h2>
            <p className={styles.storyDescription}>Keep your contacts, companies, and events together in KIM CRM. Work smarter, build stronger relationships.</p>
            <ul className={styles.features}>
              <li>
                <span className={styles.featureIcon}><Users aria-hidden="true" /></span>
                <div><h3>Manage Contacts</h3><p>Keep your network organized</p></div>
              </li>
              <li>
                <span className={styles.featureIcon}><Building2 aria-hidden="true" /></span>
                <div><h3>Track Companies</h3><p>See the bigger picture</p></div>
              </li>
              <li>
                <span className={styles.featureIcon}><CalendarDays aria-hidden="true" /></span>
                <div><h3>Organize Events</h3><p>Plan, collaborate, and execute</p></div>
              </li>
            </ul>
          </div>
          <p className={styles.signature}>Relationships<br />create opportunity.<span aria-hidden="true" /></p>
          <p className={styles.storyFooter}>People <span aria-hidden="true">·</span> Connections <span aria-hidden="true">·</span> Opportunities</p>
        </aside>

        <section className={styles.formPanel} aria-labelledby="login-heading">
          <Dialog>
            <div className={styles.help}>
              <span>Need help?</span>
              <DialogTrigger asChild><button type="button">Contact IT</button></DialogTrigger>
            </div>
            <div className={styles.formContent}>
              <div className={`${styles.brand} ${styles.formBrand}`}>
                <span className={styles.brandMark} aria-hidden="true">K</span>
                <span>KIM COMMUNICATION</span>
              </div>
              <header className={styles.intro}>
                <h1 id="login-heading">Welcome back</h1>
                <p>Sign in to manage leads, events, and holding companies in one workspace.</p>
              </header>
              <form onSubmit={handleSubmit} className={styles.form} aria-busy={loading}>
                <div className={styles.field}>
                  <label htmlFor="login-username">Username or Email</label>
                  <div className={styles.inputWrap}>
                    <User className={styles.inputIcon} aria-hidden="true" />
                    <input
                      id="login-username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      value={usernameOrEmail}
                      onChange={(e) => setUsernameOrEmail(e.target.value)}
                      placeholder="Enter your username or email"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>
                <div className={styles.field}>
                  <label htmlFor="login-password">Password</label>
                  <div className={styles.inputWrap}>
                    <LockKeyhole className={styles.inputIcon} aria-hidden="true" />
                    <input
                      id="login-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      disabled={loading}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                      className={styles.passwordToggle}
                    >
                      {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                    </button>
                  </div>
                </div>
                <div className={styles.formOptions}>
                  <span className={styles.secureLabel}><ShieldCheck aria-hidden="true" />Secure team access</span>
                  <DialogTrigger asChild><button type="button">Forgot password?</button></DialogTrigger>
                </div>
                <button type="submit" disabled={loading} className={styles.submit}>
                  {loading ? <><Loader2 aria-hidden="true" className="animate-spin" /><span role="status">Signing in...</span></> : <>Sign In<ArrowRight aria-hidden="true" /></>}
                </button>
              </form>
              <footer className={styles.formFooter}>
                <p>KIM Communication<span>Customer relationship management</span></p>
              </footer>
            </div>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Headphones className="h-5 w-5" aria-hidden="true" /></span>
                <DialogTitle>Need help signing in?</DialogTitle>
                <DialogDescription>Contact your IT team or CRM administrator for help with your account.</DialogDescription>
              </DialogHeader>
              <div className="ms-modal-body space-y-3 text-sm leading-6 text-slate-600">
                <p>If you forgot your password, your CRM administrator can reset it for you. Share your username or work email so they can find your account.</p>
                <p className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-blue-900">For a new account or changes to your access, contact the administrator who manages your team&apos;s CRM.</p>
              </div>
            </DialogContent>
          </Dialog>
        </section>
      </div>
    </main>
  );
}
