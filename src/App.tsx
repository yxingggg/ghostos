import { useEffect, useState } from 'react';
import { Desktop } from './ui/Desktop';
import { BootSequence } from './ui/BootSequence';
import { registerBuiltinApps } from './apps';
import { useSettings } from './state/settingsStore';
import { useVfs } from './state/vfsStore';
import { useNotes } from './state/notesStore';
import { useMusic } from './state/musicStore';
import { setPersistenceNoticeHandler } from './state/persist';
import { useToasts } from './state/toastStore';

registerBuiltinApps();

type Phase = 'booting' | 'ready';

export function App() {
  const [phase, setPhase] = useState<Phase>('booting');
  const [hydrated, setHydrated] = useState(false);
  const hydrateSettings = useSettings((s) => s.hydrate);
  const hydrateVfs = useVfs((s) => s.hydrate);
  const hydrateNotes = useNotes((s) => s.hydrate);
  const hydrateMusic = useMusic((s) => s.hydrate);
  const push = useToasts((s) => s.push);

  // Rehydrate all persisted state before showing the desktop.
  useEffect(() => {
    setPersistenceNoticeHandler((reason) => push(reason, 'error'));
    void Promise.all([hydrateSettings(), hydrateVfs(), hydrateNotes(), hydrateMusic()]).then(() =>
      setHydrated(true),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ready = phase === 'ready' && hydrated;

  return (
    <div className="h-full w-full">
      {ready ? <Desktop /> : <BootSequence onDone={() => setPhase('ready')} />}
    </div>
  );
}
