import { RULES } from '@perspective/contracts';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

export interface PickedMedia {
  dataBase64: string;
  mimeType: string;
  /** Local preview URI. */
  uri: string;
}

function splitDataUri(dataUri: string): { mimeType: string; dataBase64: string } | null {
  const match = /^data:([^;,]+)[^,]*;base64,(.*)$/.exec(dataUri);
  return match ? { mimeType: match[1], dataBase64: match[2] } : null;
}

function detectImageMime(base64: string, fallbackMime?: string | null): string {
  if (base64.startsWith('/9j/')) return 'image/jpeg';
  if (base64.startsWith('iVBOR')) return 'image/png';
  if (base64.startsWith('UklGR')) return 'image/webp';
  if (fallbackMime) {
    const clean = fallbackMime.split(';')[0].trim().toLowerCase();
    if (clean === 'image/jpeg' || clean === 'image/jpg') return 'image/jpeg';
    if (clean === 'image/png') return 'image/png';
    if (clean === 'image/webp') return 'image/webp';
  }
  return 'image/jpeg';
}

async function uriToBase64(uri: string): Promise<{ dataBase64: string; mimeType: string }> {
  const blob = await (await fetch(uri)).blob();
  const dataUri = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.readAsDataURL(blob);
  });
  const parts = splitDataUri(dataUri);
  if (!parts) throw new Error('Could not read file');
  return { dataBase64: parts.dataBase64, mimeType: (blob.type || parts.mimeType).split(';')[0] };
}

/**
 * Picks a photo from the library, or takes one with the camera (used for the selfie).
 * Browsers have no camera API here, so the web build falls back to choosing a file.
 */
export async function pickPhoto(source: 'library' | 'camera' = 'library'): Promise<PickedMedia | null> {
  const useCamera = source === 'camera' && Platform.OS !== 'web';
  const permission = useCamera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error(useCamera ? 'Camera access is needed for the selfie.' : 'Photo access is needed to add a photo.');
  }
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.6,
    base64: true,
    allowsEditing: true,
    aspect: [4, 5],
    cameraType: ImagePicker.CameraType.front,
  };
  const result = useCamera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  if (asset.base64) {
    const mimeType = detectImageMime(asset.base64, asset.mimeType);
    return { dataBase64: asset.base64, mimeType, uri: asset.uri };
  }
  const fromUri = splitDataUri(asset.uri) ?? (await uriToBase64(asset.uri));
  const mimeType = detectImageMime(fromUri.dataBase64, fromUri.mimeType);
  return { ...fromUri, mimeType, uri: asset.uri };
}

export interface Recording extends PickedMedia {
  durationSec: number;
}

/** Records a voice post; stops automatically at the 15-second limit. */
export function useVoiceRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const startedAt = useRef(0);
  const active = useRef(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<Recording | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearTimer = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };

  const stop = useCallback(async () => {
    clearTimer();
    if (!active.current) return;
    active.current = false;
    setIsRecording(false);
    try {
      const seconds = (Date.now() - startedAt.current) / 1000;
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error('No recording');
      const durationSec = Math.min(RULES.audioMaxSeconds, Math.max(0.5, Number(seconds.toFixed(1))));
      const data = await uriToBase64(uri);
      const mimeType = 'audio/m4a';
      setResult({ ...data, mimeType, uri, durationSec });
    } catch {
      setError('Recording failed. Please try again.');
    }
  }, [recorder]);

  const start = useCallback(async () => {
    setError(null);
    setResult(null);
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError('Microphone access is needed to record.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      active.current = true;
      startedAt.current = Date.now();
      setElapsed(0);
      setIsRecording(true);
      timer.current = setInterval(() => {
        const secs = (Date.now() - startedAt.current) / 1000;
        setElapsed(secs);
        if (secs >= RULES.audioMaxSeconds) void stop();
      }, 200);
    } catch {
      setError(
        Platform.OS === 'web'
          ? 'Recording isn’t available in this browser. Try Chrome, or record on your phone.'
          : 'Could not start recording.',
      );
    }
  }, [recorder, stop]);

  useEffect(() => () => clearTimer(), []);

  return { start, stop, isRecording, elapsed, result, error, reset: () => setResult(null) };
}
