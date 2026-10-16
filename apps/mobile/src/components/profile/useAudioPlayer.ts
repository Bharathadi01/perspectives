import { AudioPlayer, AudioStatus, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Plays one remote audio clip; releases the player on unmount. */
export function useAudioPlayer(uri: string) {
  const player = useRef<AudioPlayer | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () => () => {
      player.current?.remove();
      player.current = null;
    },
    [uri],
  );

  const onStatus = useCallback((status: AudioStatus) => {
    if (!status.isLoaded) return;
    setPlaying(status.playing);
    if (status.duration) setProgress(Math.min(1, status.currentTime / status.duration));
    if (status.didJustFinish) {
      setPlaying(false);
      setProgress(0);
      void player.current?.seekTo(0);
    }
  }, []);

  const toggle = useCallback(async () => {
    try {
      setError(null);
      if (!player.current) {
        await setAudioModeAsync({ playsInSilentMode: true });
        const created = createAudioPlayer({ uri });
        created.addListener('playbackStatusUpdate', onStatus);
        player.current = created;
        created.play();
        return;
      }
      if (player.current.playing) player.current.pause();
      else player.current.play();
    } catch {
      setError('Could not play this clip.');
      setPlaying(false);
    }
  }, [uri, onStatus]);

  return { playing, progress, error, toggle };
}
