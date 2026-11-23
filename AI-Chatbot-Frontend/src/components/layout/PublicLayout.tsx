import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { FaFacebook, FaYoutube, FaEnvelope, FaPhone, FaMapMarkerAlt } from 'react-icons/fa';
import { MdMenu, MdClose, MdExpandMore, MdDashboard, MdLogout, MdPerson } from 'react-icons/md';
import { useAuthStore } from '@/store/auth.store';
import { useEffect, useRef, useState } from 'react';
import { ThemeLangControls } from '@/components/ui/ThemeLangControls';
import { BrandLogo, BrandMark } from '@/components/brand/BrandLogo';
import { useLang } from '@/lib/i18n';
import { getDocsMeta, invalidateDocsData } from '@/lib/docs';
import { prefetchDocsData } from '@/lib/docsPrefetch';

export function PublicLayout() {
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [docsVisible, setDocsVisible] = useState(false);
  const docsVersionRef = useRef<number | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const { t, lang } = useLang();
  const authed = status === 'authenticated' && !!user;
  // Tutor is a focused study workspace: keep the top navbar, drop the footer.
  const hideFooter = location.pathname === '/tutor' || location.pathname.startsWith('/tutor/');

  // The Documentation link is public only while the backend reports an
  // accessible published snapshot (enabled + published + inside its window).
  useEffect(() => {
    let active = true;
    const sync = (force = false) => {
      getDocsMeta({ force })
        .then((meta) => {
          if (!active) return;
          if (docsVersionRef.current !== null && docsVersionRef.current !== meta.version) {
            invalidateDocsData();
          }
          docsVersionRef.current = meta.version;
          setDocsVisible(Boolean(meta.accessible));
        })
        .catch(() => {
          if (active) setDocsVisible(false);
        });
    };
    sync();
    const onFocus = () => sync(true);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') sync(true);
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      active = false;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Warm the lazy /docs chunk in the background once the link is visible, but
  // only when the connection can spare the bandwidth. On metered or slow
  // cellular links this prefetch competes with the page the learner is
  // actually waiting for; hover/tap still warms it on demand.
  useEffect(() => {
    if (!docsVisible) return;
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
    ).connection;
    if (connection?.saveData) return;
    if (connection?.effectiveType && connection.effectiveType !== '4g') return;

    let cancelled = false;
    const run = () => {
      if (!cancelled) prefetchDocsData();
    };
    const idleHandle =
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback(run, { timeout: 3000 })
        : window.setTimeout(run, 2000);
    return () => {
      cancelled = true;
      if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleHandle);
      else window.clearTimeout(idleHandle);
    };
  }, [docsVisible]);

  const warmDocs = () => {
    prefetchDocsData();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMenuOpen(false); setProfileOpen(false); }
    };
    const onClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick); };
  }, []);

  const close = () => setMenuOpen(false);
  const go = (path: string) => { close(); setProfileOpen(false); navigate(path); };
  const doLogout = async () => { setProfileOpen(false); close(); await logout(); navigate('/'); };

  const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    padding: '8px 13px', borderRadius: 999, fontWeight: 700 as const, fontSize: 13.5,
    color: isActive ? 'var(--bg-body)' : 'var(--text-primary)',
    textDecoration: 'none' as const,
  });
  const linkClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'nav-link-active' : undefined);

  return (
    <div className="pg-app flex flex-col" style={{ minHeight: '100vh' }}>
      <header className="public-header sticky-header flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 brand-link" onClick={close}>
          <BrandLogo size={38} tagline="Class 3 study buddy" />
        </Link>

        <nav className="public-nav-desktop" aria-label="Primary">
          <NavLink to="/" style={linkStyle} className={linkClass} end>{t('nav.home')}</NavLink>
          <NavLink to="/tutor" style={linkStyle} className={linkClass}>{t('nav.tutor')}</NavLink>
          <NavLink to="/practice" style={linkStyle} className={linkClass}>{t('nav.practice')}</NavLink>
          <NavLink to="/books" style={linkStyle} className={linkClass}>{t('nav.books')}</NavLink>
          {docsVisible && (
            <NavLink
              to="/docs"
              style={linkStyle}
              className={linkClass}
              onPointerEnter={warmDocs}
              onFocus={warmDocs}
            >
              {t('nav.docs')}
            </NavLink>
          )}
          <NavLink to="/about" style={linkStyle} className={linkClass}>{t('nav.about')}</NavLink>
          <NavLink to="/contact" style={linkStyle} className={linkClass}>{t('nav.contact')}</NavLink>
          {authed && user?.role === 'admin' && <NavLink to="/admin" style={linkStyle} className={linkClass}>{t('nav.dashboard')}</NavLink>}
        </nav>

        <div className="public-header-actions">
          <div className="hide-sm"><ThemeLangControls compact /></div>
          {!authed ? (
            <div className="hide-sm flex items-center gap-2">
              <button className="pg-btn-secondary header-btn" onClick={() => go('/login')}>{t('nav.login')}</button>
              <button className="pg-btn-candy header-btn" onClick={() => go('/register')}>{t('nav.getStarted')}</button>
            </div>
          ) : (
            <div className="hide-sm profile-wrap" ref={profileRef}>
              <button className="profile-btn" onClick={() => setProfileOpen((o) => !o)} aria-haspopup="menu" aria-expanded={profileOpen}>
                <span className="profile-avatar">{(user?.name || 'S').slice(0, 1).toUpperCase()}</span>
                <span className="profile-name">{user?.name}</span>
                <MdExpandMore size={16} />
              </button>
              {profileOpen && (
                <div className="profile-menu" role="menu">
                  <div className="profile-menu-head">
                    <strong>{user?.name}</strong>
                    <span>{user?.email}</span>
                  </div>
                  {user?.role === 'admin'
                    ? <button role="menuitem" onClick={() => go('/admin')}><MdDashboard size={15} /> {t('nav.dashboard')}</button>
                    : <button role="menuitem" onClick={() => go('/welcome')}><MdPerson size={15} /> {t('nav.profile')}</button>}
                  <button role="menuitem" onClick={() => go('/help')}><MdPerson size={15} /> {t('nav.help')}</button>
                  <button role="menuitem" className="danger" onClick={() => void doLogout()}><MdLogout size={15} /> {t('nav.logout')}</button>
                </div>
              )}
            </div>
          )}
          <button
            className="btn btn-ghost btn-icon public-nav-toggle"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? t('nav.close') : t('nav.menu')}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <MdClose size={20} /> : <MdMenu size={22} />}
          </button>
        </div>

        <div className={`public-mobile-menu${menuOpen ? ' open' : ''}`}>
          <div className="mobile-toggles"><ThemeLangControls compact /></div>
          <Link to="/" className="nav-link" onClick={close}>{t('nav.home')}</Link>
          <Link to="/tutor" className="nav-link" onClick={close}>{t('nav.tutor')}</Link>
          <Link to="/practice" className="nav-link" onClick={close}>{t('nav.practice')}</Link>
          <Link to="/books" className="nav-link" onClick={close}>{t('nav.books')}</Link>
          {docsVisible && (
            <Link to="/docs" className="nav-link" onClick={close} onPointerEnter={warmDocs} onFocus={warmDocs}>
              {t('nav.docs')}
            </Link>
          )}
          <Link to="/about" className="nav-link" onClick={close}>{t('nav.about')}</Link>
          <Link to="/contact" className="nav-link" onClick={close}>{t('nav.contact')}</Link>
          <Link to="/help" className="nav-link" onClick={close}>{t('nav.help')}</Link>
          {authed && user?.role === 'admin' && <Link to="/admin" className="nav-link" onClick={close}>{t('nav.dashboard')}</Link>}
          <div className="mobile-menu-divider" />
          {!authed ? (
            <>
              <Link to="/login" className="nav-link" onClick={close}>{t('nav.login')}</Link>
              <button className="pg-btn-candy" style={{ minHeight: 46 }} onClick={() => go('/register')}>{t('nav.getStarted')}</button>
            </>
          ) : (
            <>
              <div className="mobile-user">{user?.name} ({user?.email})</div>
              <button className="pg-btn-secondary" style={{ minHeight: 46 }} onClick={() => void doLogout()}>{t('nav.logout')}</button>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 route-fade">
        <Outlet key={lang} />
      </main>

      {!hideFooter && (
        <footer className="site-footer">
          <div className="pg-container footer-grid">
            <div>
              <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
                <BrandMark size={40} />
                <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                  <strong style={{ fontFamily: 'Outfit, sans-serif' }}>Shikhi Bondhu</strong>
                  <span className="brand-tagline">Class 3 study buddy</span>
                </span>
              </div>
              <p>{t('footer.tag')}</p>
              <p className="footer-small">{t('footer.made')}</p>
              <div className="social-row">
                <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook"><FaFacebook /></a>
                <a href="https://youtube.com" target="_blank" rel="noreferrer" aria-label="YouTube"><FaYoutube /></a>
                <a href="mailto:hello@shikhibondhu.app" aria-label="Email"><FaEnvelope /></a>
              </div>
            </div>
            <div>
              <h4>{t('footer.explore')}</h4>
              <Link to="/">{t('nav.home')}</Link>
              <Link to="/tutor">{t('nav.tutor')}</Link>
              <Link to="/practice">{t('nav.practice')}</Link>
              <Link to="/books">{t('nav.books')}</Link>
              {docsVisible && <Link to="/docs" onPointerEnter={warmDocs} onFocus={warmDocs}>{t('nav.docs')}</Link>}
            </div>
            <div>
              <h4>{t('footer.support')}</h4>
              <Link to="/about">{t('nav.about')}</Link>
              <Link to="/contact">{t('nav.contact')}</Link>
              <Link to="/help">{t('nav.help')}</Link>
              <Link to="/privacy">{t('nav.privacy')}</Link>
              {!authed && <Link to="/login">{t('nav.login')}</Link>}
            </div>
            <div>
              <h4>{t('footer.contact')}</h4>
              <span><FaEnvelope size={12} /> hello@shikhibondhu.app</span>
              <span><FaPhone size={12} /> +880 1XXX XXXXXX</span>
              <span><FaMapMarkerAlt size={12} /> Dhaka, Bangladesh</span>
            </div>
          </div>
          <div className="footer-bottom">© 2026 Shikhi Bondhu. {t('footer.rights')}</div>
        </footer>
      )}
    </div>
  );
}
