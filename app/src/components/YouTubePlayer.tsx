import { useEffect, useRef, useState } from 'react';
import { tone } from '../theme';

type YTPlayer = {
  getCurrentTime(): number;
  getDuration(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setPlaybackRate(rate: number): void;
  destroy(): void;
};
type YTNamespace = { Player: new (el: HTMLElement, options: Record<string, unknown>) => YTPlayer };

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiReady: Promise<void> | null = null;

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve();
  if (!apiReady) {
    apiReady = new Promise((resolve) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        resolve();
      };
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(script);
    });
  }
  return apiReady;
}

export function youTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
  return match ? match[1] : null;
}

export const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

// Allowance per 1s poll before a jump counts as skipping ahead.
const SKIP_TOLERANCE = 2;

/** Credits only continuously watched time: seeking past the furthest point watched jumps back, and speed is pinned to 1x. */
export function YouTubePlayer({ videoId, onProgress, onComplete }: {
  videoId: string; onProgress: (watched: number, duration: number) => void; onComplete: () => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onProgress, onComplete });
  callbacks.current = { onProgress, onComplete };
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let player: YTPlayer | null = null;
    let timer = 0;
    let cancelled = false;
    let furthest = 0;
    let completed = false;
    const container = holder.current;

    loadYouTubeApi().then(() => {
      if (cancelled || !container || !window.YT) return;
      const target = document.createElement('div');
      container.appendChild(target);
      player = new window.YT.Player(target, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: { rel: 0, playsinline: 1, disablekb: 1 },
        events: {
          onPlaybackRateChange: () => player?.setPlaybackRate(1),
          onError: () => setError('เปิดวิดีโอไม่ได้ ตรวจสอบลิงก์ หรือเปิดอนุญาต "การฝัง" ของวิดีโอบน YouTube'),
        },
      });
      timer = window.setInterval(() => {
        if (!player?.getCurrentTime) return;
        const current = player.getCurrentTime();
        const duration = player.getDuration();
        if (!duration) return;
        if (current > furthest + SKIP_TOLERANCE) player.seekTo(furthest, true);
        else if (current > furthest) furthest = current;
        callbacks.current.onProgress(furthest, duration);
        if (!completed && furthest >= duration - SKIP_TOLERANCE) {
          completed = true;
          callbacks.current.onComplete();
        }
      }, 1000);
    });

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      player?.destroy();
      if (container) container.innerHTML = '';
    };
  }, [videoId]);

  return (
    <div>
      <div ref={holder} className="yt-holder" style={{ aspectRatio: '16 / 9', maxWidth: '100%', borderRadius: 8, overflow: 'hidden', background: 'oklch(0.25 0.03 265)' }} />
      {error && <div style={{ fontSize: 12, color: tone('bad').fg, marginTop: 8 }}>{error}</div>}
    </div>
  );
}
