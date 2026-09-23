import { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { NAV, SCREEN_META, type Screen } from './data';
import { ProfileContext, useAuth } from './hooks/useAuth';
import type { PermissionKey } from './lib/permissions';
import { Badges } from './screens/Badges';
import { Contractors } from './screens/Contractors';
import { Dashboard } from './screens/Dashboard';
import { Findings } from './screens/Findings';
import { AuthMessage, ChangePassword, Login } from './screens/Login';
import { EMPTY_DRAFT, Permits, type PermitDraft } from './screens/Permits';
import { Reports } from './screens/Reports';
import { Training } from './screens/Training';
import { Users } from './screens/Users';
import { C, SANS } from './theme';

type AppProps = { defaultScreen?: Screen; showEnglishLabels?: boolean };

/** Menu entries that need a permission; the rest are visible to every signed-in user. */
const SCREEN_PERMISSION: Partial<Record<Screen, PermissionKey>> = {
  permits: 'request_permits',
  reports: 'view_reports',
  users: 'manage_users',
};

export default function App({ defaultScreen = 'dashboard', showEnglishLabels = true }: AppProps) {
  const { session, profile, loading, reloadProfile } = useAuth();
  const [screen, setScreen] = useState<Screen>(defaultScreen);
  const [changingPassword, setChangingPassword] = useState(false);
  const [query, setQuery] = useState('');
  // Kept at app level so progress survives switching between menu screens.
  const [badge, setBadge] = useState(0);
  const [step, setStep] = useState(1);
  const [permitType, setPermitType] = useState(0);
  const [draft, setDraft] = useState<PermitDraft>(EMPTY_DRAFT);

  const userId = session?.user.id;
  useEffect(() => {
    setScreen(defaultScreen);
    setStep(1);
    setDraft(EMPTY_DRAFT);
    setQuery('');
  }, [userId, defaultScreen]);

  if (loading) return <AuthMessage>กำลังตรวจสอบการเข้าสู่ระบบ...</AuthMessage>;
  if (!session) return <Login />;
  if (!profile) return <AuthMessage showSignOut>บัญชีนี้ยังไม่ได้กำหนดบทบาทในระบบ กรุณาติดต่อเจ้าหน้าที่ความปลอดภัย</AuthMessage>;
  if (profile.must_change_password || changingPassword) {
    return (
      <ChangePassword
        forced={profile.must_change_password}
        onDone={() => {
          setChangingPassword(false);
          reloadProfile();
        }}
        onCancel={() => setChangingPassword(false)}
      />
    );
  }

  const screens = NAV.map((n) => n.id).filter((id) => {
    const needed = SCREEN_PERMISSION[id];
    return !needed || profile.permissions.includes(needed);
  });
  const current = screens.includes(screen) ? screen : 'dashboard';
  const [title, subtitle] = SCREEN_META[current];

  return (
    <ProfileContext.Provider value={profile}>
      <div style={{ display: 'flex', alignItems: 'stretch', minHeight: 'var(--screen-h)', fontFamily: SANS, color: C.ink, fontSize: 14, lineHeight: 1.5 }}>
        <Sidebar screen={current} screens={screens} onNavigate={setScreen} onChangePassword={() => setChangingPassword(true)} bilingual={showEnglishLabels} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Topbar
            title={title}
            subtitle={subtitle}
            query={query}
            onQuery={(q) => {
              setQuery(q);
              // Search results are shown in the dashboard's permit table.
              if (q.trim()) setScreen('dashboard');
            }}
            onNewPermit={screens.includes('permits') ? () => setScreen('permits') : undefined}
          />
          <main style={{ flex: 1, padding: '20px 24px 40px' }}>
            {current === 'dashboard' && <Dashboard query={query} />}
            {current === 'contractors' && <Contractors />}
            {current === 'badges' && <Badges selected={badge} onSelect={setBadge} />}
            {current === 'training' && <Training />}
            {current === 'permits' && (
              <Permits step={step} onStep={setStep} permitType={permitType} onPermitType={setPermitType} draft={draft} onDraft={setDraft} />
            )}
            {current === 'findings' && <Findings />}
            {current === 'reports' && <Reports />}
            {current === 'users' && <Users />}
          </main>
        </div>
      </div>
    </ProfileContext.Provider>
  );
}
