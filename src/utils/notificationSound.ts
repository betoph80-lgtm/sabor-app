/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NotificationAudioMode } from '../types.ts';

export interface NotificationAnnouncement {
  mesaNombre: string;
  platoNombre: string;
  cantidad?: number;
}

const AUDIO_MODE_KEY = 'restaurante_notif_audio_mode';

/**
 * Gets saved audio notification mode:
 * - 'VOICE': Timbre + Locución de Voz (Mesa + Plato) + Vibración
 * - 'BELL': Solo Timbre de Campana + Vibración
 * - 'MUTE': Silencio (Solo alerta visual)
 */
export function getSavedNotificationAudioMode(): NotificationAudioMode {
  if (typeof window === 'undefined') return 'VOICE';
  try {
    const saved = localStorage.getItem(AUDIO_MODE_KEY);
    if (saved === 'VOICE' || saved === 'BELL' || saved === 'MUTE') {
      return saved;
    }
  } catch (err) {
    console.warn('Could not read audio mode preference:', err);
  }
  return 'VOICE'; // Default: Speech + Bell chime
}

export function setSavedNotificationAudioMode(mode: NotificationAudioMode): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AUDIO_MODE_KEY, mode);
  } catch (err) {
    console.warn('Could not save audio mode preference:', err);
  }
}

// -------------------------------------------------------------
// Web Audio API context singleton for pleasant restaurant chime
// -------------------------------------------------------------
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// -------------------------------------------------------------
// Web Speech API: Spanish Voice Selection & Queue Manager
// -------------------------------------------------------------
let cachedSpanishVoice: SpeechSynthesisVoice | null = null;
const speechQueue: string[] = [];
let isSpeaking = false;
let speechTimeoutId: any = null;

function getSpanishVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  if (cachedSpanishVoice) return cachedSpanishVoice;

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // Search preferences:
  // 1. Peruvian Spanish (es-PE)
  // 2. Latin America Spanish (es-419)
  // 3. Regional Latin Spanish (es-MX, es-CO, es-CL, es-AR, es-US)
  // 4. Any Spanish dialect (es-*)
  // 5. Name containing Spanish or Español
  const match = 
    voices.find(v => v.lang === 'es-PE') ||
    voices.find(v => v.lang === 'es-419') ||
    voices.find(v => v.lang.startsWith('es-MX')) ||
    voices.find(v => v.lang.startsWith('es-CO')) ||
    voices.find(v => v.lang.startsWith('es-US')) ||
    voices.find(v => v.lang.startsWith('es')) ||
    voices.find(v => v.name.toLowerCase().includes('spanish') || v.name.toLowerCase().includes('español')) ||
    null;

  if (match) {
    cachedSpanishVoice = match;
  }
  return match;
}

// Preload voices and setup listener
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  try {
    window.speechSynthesis.getVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {
        cachedSpanishVoice = null;
        getSpanishVoice();
      };
    }
  } catch {
    // Ignore initial voice load error
  }
}

// Ensure audio context and speech synthesis are primed upon first user touch/click
if (typeof window !== 'undefined') {
  const unlockAudioAndSpeech = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    if ('speechSynthesis' in window) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      getSpanishVoice();
    }

    window.removeEventListener('click', unlockAudioAndSpeech);
    window.removeEventListener('touchstart', unlockAudioAndSpeech);
    window.removeEventListener('keydown', unlockAudioAndSpeech);
  };
  window.addEventListener('click', unlockAudioAndSpeech, { passive: true });
  window.addEventListener('touchstart', unlockAudioAndSpeech, { passive: true });
  window.addEventListener('keydown', unlockAudioAndSpeech, { passive: true });
}

function processSpeechQueue() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (isSpeaking || speechQueue.length === 0) return;

  const textToSpeak = speechQueue.shift();
  if (!textToSpeak) return;

  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'es-PE';
    utterance.rate = 1.03; // Smooth, clear, brisk cadence for restaurant kitchen announcements
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voice = getSpanishVoice();
    if (voice) {
      utterance.voice = voice;
    }

    isSpeaking = true;

    // Safety timeout in case a browser doesn't trigger onend
    if (speechTimeoutId) clearTimeout(speechTimeoutId);
    speechTimeoutId = setTimeout(() => {
      isSpeaking = false;
      processSpeechQueue();
    }, 7000);

    utterance.onend = () => {
      if (speechTimeoutId) clearTimeout(speechTimeoutId);
      isSpeaking = false;
      setTimeout(() => {
        processSpeechQueue();
      }, 150);
    };

    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      if (speechTimeoutId) clearTimeout(speechTimeoutId);
      isSpeaking = false;
      setTimeout(() => {
        processSpeechQueue();
      }, 100);
    };

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Failed to speak text:', err);
    isSpeaking = false;
  }
}

/**
 * Enqueues a voice synthesis announcement text.
 */
export function queueSpeech(text: string, clearPrevious: boolean = false) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  
  if (clearPrevious) {
    try {
      window.speechSynthesis.cancel();
      speechQueue.length = 0;
      isSpeaking = false;
    } catch {
      // Ignore cancel errors
    }
  }

  speechQueue.push(text);
  processSpeechQueue();
}

/**
 * Speaks a specific dish and table notification immediately.
 */
export function speakNotificationItem(mesaNombre: string, platoNombre: string, cantidad?: number) {
  const cantPrefix = cantidad && cantidad > 1 ? `${cantidad} ` : '';
  const text = `${mesaNombre}: ${cantPrefix}${platoNombre} listo para servir`;
  queueSpeech(text, true);
}

/**
 * Plays a bright, cheerful restaurant service bell chime (ding-dong).
 * Uses pure Web Audio API synthesis for zero network latency and 100% offline reliability.
 */
export function playKitchenReadySound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Helper to synthesize a single rich bell tone
    const playBellTone = (freq: number, startTime: number, duration: number, gainValue: number) => {
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, startTime);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2.02, startTime); // slightly detuned harmonic for metallic shimmer

      // Envelope for main tone
      gain1.gain.setValueAtTime(0.0001, startTime);
      gain1.gain.exponentialRampToValueAtTime(gainValue, startTime + 0.015);
      gain1.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      // Envelope for overtone
      gain2.gain.setValueAtTime(0.0001, startTime);
      gain2.gain.exponentialRampToValueAtTime(gainValue * 0.4, startTime + 0.01);
      gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + (duration * 0.6));

      osc1.connect(gain1);
      osc2.connect(gain2);

      gain1.connect(ctx.destination);
      gain2.connect(ctx.destination);

      osc1.start(startTime);
      osc2.start(startTime);

      osc1.stop(startTime + duration);
      osc2.stop(startTime + duration);
    };

    // 1st chime tone (E5: 659.25 Hz)
    playBellTone(659.25, now, 0.45, 0.4);
    // 2nd chime tone (A5: 880 Hz) - slightly louder and longer
    playBellTone(880.0, now + 0.14, 0.8, 0.5);
    // 3rd chime harmonic (C#6: 1108.7 Hz) - high accent
    playBellTone(1108.73, now + 0.28, 1.1, 0.45);

  } catch (err) {
    console.warn('Audio notification failed:', err);
  }
}

/**
 * Triggers haptic vibration on devices supporting the Vibration API.
 * Uses a rhythmic multi-pulse pattern to catch the waiter's attention.
 */
export function vibrateDevice(pattern: number[] = [250, 100, 250, 100, 400]) {
  try {
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch (err) {
    console.warn('Vibration not supported or failed:', err);
  }
}

/**
 * Complete alert action:
 * - Checks current Audio Notification Mode ('VOICE' | 'BELL' | 'MUTE')
 * - Vibrates device (if not MUTE)
 * - Plays kitchen bell chime (if VOICE or BELL)
 * - Speaks the announced table and dish name (if VOICE and announcements provided)
 */
export function triggerWaiterNotificationAlert(
  announcements?: NotificationAnnouncement[],
  customMode?: NotificationAudioMode
) {
  const mode = customMode || getSavedNotificationAudioMode();

  // If muted completely, skip audio and voice
  if (mode === 'MUTE') {
    return;
  }

  // 1. Haptic vibration
  vibrateDevice();

  // 2. Kitchen bell chime (Both VOICE and BELL modes play the chime)
  playKitchenReadySound();

  // 3. Spoken voice announcement (VOICE mode only)
  if (mode === 'VOICE' && announcements && announcements.length > 0) {
    // Group announcements by mesa to produce natural sentence phrasing
    const byMesa: Record<string, NotificationAnnouncement[]> = {};
    announcements.forEach(a => {
      const key = a.mesaNombre || 'Mesa';
      if (!byMesa[key]) byMesa[key] = [];
      byMesa[key].push(a);
    });

    Object.entries(byMesa).forEach(([mesa, items]) => {
      let phrase = '';
      if (items.length === 1) {
        const item = items[0];
        const cantPrefix = item.cantidad && item.cantidad > 1 ? `${item.cantidad} ` : '';
        phrase = `${mesa}: ${cantPrefix}${item.platoNombre} listo`;
      } else if (items.length === 2) {
        const item1 = items[0];
        const item2 = items[1];
        const cant1 = item1.cantidad && item1.cantidad > 1 ? `${item1.cantidad} ` : '';
        const cant2 = item2.cantidad && item2.cantidad > 1 ? `${item2.cantidad} ` : '';
        phrase = `${mesa}: ${cant1}${item1.platoNombre} y ${cant2}${item2.platoNombre} listos`;
      } else {
        const count = items.reduce((acc, curr) => acc + (curr.cantidad || 1), 0);
        const dishes = items.slice(0, 3).map(i => i.platoNombre).join(', ');
        phrase = `${mesa}: ${count} platos listos: ${dishes}`;
      }

      // Delay speech slightly (~420ms) so the initial chime tone rings out first
      setTimeout(() => {
        queueSpeech(phrase);
      }, 420);
    });
  }
}
