/**
 * Audio module exports
 */

export { AudioRecorder, recordForDuration, recordUntilSilence, testRecording } from './recorder.js';
export { playFile, playBuffer, stopPlayback } from './player.js';
export { WakeWordDetector, type WakeWordConfig } from './wakeWord.js';

