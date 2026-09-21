import { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { NAV, SCREEN_META, type Screen } from './data';
import { ProfileContext, useAuth } from './hooks/useAuth';
import type { Role } from './lib/supabase';
import { Badges } from './screens/Badges';
import { Contractors } from './screens/Contractors';
import { Dashboard } from './screens/Dashboard';
import { AuthMessage, Login } from './screens/Login';
import { EMPTY_DRAFT, Permits, type PermitDraft } from './screens/Permits';
import { Reports } from './screens/Reports';
import { Training } from './screens/Training';
import { Users } from './screens/Users';
import { C, SANS } from './theme';

type AppProps = { defaultScreen?: Screen; showEnglishLabels?: boolean };

const HIDDEN_SCREENS: Record<Role, Screen[]> = {
  safety: [],
  contractor: ['reports', 'users'],
  area_owner: ['permits', 'users'],
  manager: ['permits', 'users'],
};

export default function App({ defaultScreen = 'dashboard', showEnglishLabels = true }: AppProps) {
  const { session, profile, loading } = useAuth();
  const [screen, setScreen] = useState<Screen>(defaultScreen);
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
  }, [userId, defaultScreen]);

  if (loading) return <AuthMessage>กำลังตรวจสอบการเข้าสู่ระบบ...</AuthMessage>;
  if (!session) return <Login />;
  if (!profile) return <AuthMessage showSignOut>บัญชีนี้ยังไม่ได้กำหนดบทบาทในระบบ กรุณาติดต่อเจ้าหน้าที่ความปลอดภัย</AuthMessage>;

  const screens = NAV.map((n) => n.id).filter((id) => !HIDDEN_SCREENS[profile.role].includes(id));
  const current = screens.includes(screen) ? screen : 'dashboard';
  const [title, subtitle] = SCREEN_META[current];

  return (
    <ProfileContext.Provider value={profile}>
      <div style={{ display: 'flex', alignItems: 'stretch', minHeight: '100vh', fontFamily: SANS, color: C.ink, fontSize: 14, lineHeight: 1.5 }}>
        <Sidebar screen={current} screens={screens} onNavigate={setScreen} bilingual={showEnglishLabels} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Topbar title={title} subtitle={subtitle} onNewPermit={screens.includes('permits') ? () => setScreen('permits') : undefined} />
          <main style={{ flex: 1, padding: '20px 24px 40px' }}>
            {current === 'dashboard' && <Dashboard />}
            {current === 'contractors' && <Contractors />}
            {current === 'badges' && <Badges selected={badge} onSelect={setBadge} />}
            {current === 'training' && <Training />}
            {current === 'permits' && (
              <Permits step={step} onStep={setStep} permitType={permitType} onPermitType={setPermitType} draft={draft} onDraft={setDraft} />
            )}
            {current === 'reports' && <Reports />}
            {current === 'users' && <Users />}
          </main>
        </div>
      </div>
    </ProfileContext.Provider>
  );
}
