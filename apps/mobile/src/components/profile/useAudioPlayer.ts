import { Audio, AVPlaybackStatus } from 'expo-av';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Plays one remote audio clip; unloads on unmount. */
export function useAudioPlayer(uri: string) {
  const sound = useRef<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () => () => {
      void sound.current?.unloadAsync();
      sound.current = null;
    },
    [uri],
  );

  const onStatus = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setPlaying(status.isPlaying);
    if (status.durationMillis) setProgress(status.positionMillis / status.durationMillis);
    if (status.didJustFinish) {
      setPlaying(false);
      setProgress(0);
      void sound.current?.setPositionAsync(0);
    }
  }, []);

  const toggle = useCallback(async () => {
    try {
      setError(null);
      if (!sound.current) {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound: created } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true }, onStatus);
        sound.current = created;
        return;
      }
      const status = await sound.current.getStatusAsync();
      if (status.isLoaded && status.isPlaying) await sound.current.pauseAsync();
      else await sound.current.playAsync();
    } catch {
      setError('Could not play this clip.');
      setPlaying(false);
    }
  }, [uri, onStatus]);

  return { playing, progress, error, toggle };
}
