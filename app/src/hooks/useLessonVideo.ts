import { useCallback, useEffect, useState } from 'react';
import { VIDEO_LENGTH } from '../data';

const STEP_SEC = 10;
const TICK_MS = 700;

export function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Simulated watch-time tracking for the mandatory lesson video. */
export function useLessonVideo() {
  const [sec, setSec] = useState(0);
  const [playing, setPlaying] = useState(false);
  const done = sec >= VIDEO_LENGTH;

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setSec((s) => Math.min(VIDEO_LENGTH, s + STEP_SEC)), TICK_MS);
    return () => clearInterval(t);
  }, [playing]);

  useEffect(() => {
    if (done) setPlaying(false);
  }, [done]);

  const toggle = useCallback(() => {
    if (!done) setPlaying((p) => !p);
  }, [done]);

  const finish = useCallback(() => {
    setSec(VIDEO_LENGTH);
    setPlaying(false);
  }, []);

  return { sec, playing, done, toggle, finish };
}

export type LessonVideo = ReturnType<typeof useLessonVideo>;
