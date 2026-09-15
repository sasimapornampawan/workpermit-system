import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { SCREEN_META, type Screen } from './data';
import { useLessonVideo } from './hooks/useLessonVideo';
import { Badges } from './screens/Badges';
import { Contractors } from './screens/Contractors';
import { Dashboard } from './screens/Dashboard';
import { Permits } from './screens/Permits';
import { Reports } from './screens/Reports';
import { Training } from './screens/Training';
import { C, SANS } from './theme';

type AppProps = { defaultScreen?: Screen; showEnglishLabels?: boolean };

export default function App({ defaultScreen = 'dashboard', showEnglishLabels = true }: AppProps) {
  const [screen, setScreen] = useState<Screen>(defaultScreen);
  // Kept at app level so progress survives switching between menu screens.
  const [badge, setBadge] = useState(0);
  const [step, setStep] = useState(1);
  const [permitType, setPermitType] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState<string | null>(null);
  const video = useLessonVideo();

  const [title, subtitle] = SCREEN_META[screen];

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', minHeight: '100vh', fontFamily: SANS, color: C.ink, fontSize: 14, lineHeight: 1.5 }}>
      <Sidebar screen={screen} onNavigate={setScreen} bilingual={showEnglishLabels} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Topbar title={title} subtitle={subtitle} onNewPermit={() => setScreen('permits')} />
        <main style={{ flex: 1, padding: '20px 24px 40px' }}>
          {screen === 'dashboard' && <Dashboard />}
          {screen === 'contractors' && <Contractors />}
          {screen === 'badges' && <Badges selected={badge} onSelect={setBadge} />}
          {screen === 'training' && <Training video={video} quizAnswer={quizAnswer} onAnswer={setQuizAnswer} />}
          {screen === 'permits' && <Permits step={step} onStep={setStep} permitType={permitType} onPermitType={setPermitType} />}
          {screen === 'reports' && <Reports />}
        </main>
      </div>
    </div>
  );
}
