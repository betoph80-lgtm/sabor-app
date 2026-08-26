/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Web Audio API context singleton for synthesis
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

// Ensure AudioContext is unlocked upon first user interaction
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };
  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
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
      // Main fundamental oscillator
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, startTime);

      // Bell chime overtone
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
 * Complete alert action: plays sound + triggers haptic vibration
 */
export function triggerWaiterNotificationAlert() {
  playKitchenReadySound();
  vibrateDevice();
}
