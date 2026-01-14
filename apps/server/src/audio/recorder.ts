/**
 * Audio Recorder - Microphone input using sox
 * Records audio from microphone for speech-to-text processing
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import type { RecordingOptions, AudioBuffer } from '../core/types.js';

// Default recording options
const DEFAULT_OPTIONS: RecordingOptions = {
  sampleRate: 16000,
  channels: 1,
  encoding: 'signed-integer',
  bitDepth: 16,
};

/**
 * Events emitted by AudioRecorder
 */
export interface RecorderEvents {
  'data': (chunk: Buffer) => void;
  'silence': () => void;
  'sound': () => void;
  'error': (error: Error) => void;
  'stop': (buffer: AudioBuffer) => void;
}

/**
 * Audio Recorder class using sox
 */
export class AudioRecorder extends EventEmitter {
  private options: RecordingOptions;
  private process: ChildProcess | null = null;
  private isRecording: boolean = false;
  private chunks: Buffer[] = [];
  private recordingStartTime: number = 0;
  
  // Silence detection
  private silenceTimeout: NodeJS.Timeout | null = null;
  private silenceThreshold: number;
  private silenceDuration: number;
  private lastSoundTime: number = 0;
  private hasSoundBeenDetected: boolean = false;

  constructor(
    options: Partial<RecordingOptions> = {},
    silenceThreshold: number = 2000,  // ms of silence before stopping
    silenceDuration: number = 300     // ms to check for silence
  ) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.silenceThreshold = silenceThreshold;
    this.silenceDuration = silenceDuration;
  }

  /**
   * Start recording from microphone
   */
  start(): void {
    if (this.isRecording) {
      logger.warn('Already recording');
      return;
    }

    this.chunks = [];
    this.recordingStartTime = Date.now();
    this.lastSoundTime = Date.now();
    this.isRecording = true;
    this.hasSoundBeenDetected = false;

    logger.debug('Starting audio recording...');

    // Use sox/rec to record audio
    // Using rate option to force resampling to 16kHz
    this.process = spawn('rec', [
      '-q',                                    // Quiet mode (suppress sox output)
      '-r', this.options.sampleRate.toString(), // Target sample rate
      '-c', this.options.channels.toString(),   // Channels
      '-b', this.options.bitDepth.toString(),   // Bit depth
      '-e', this.options.encoding,              // Encoding
      '-t', 'raw',                              // Output raw audio
      '-',                                      // Output to stdout
      'rate', this.options.sampleRate.toString(), // Force resample to target rate
    ]);

    if (!this.process.stdout || !this.process.stderr) {
      this.emit('error', new Error('Failed to start recording process'));
      return;
    }

    // Handle audio data
    this.process.stdout.on('data', (chunk: Buffer) => {
      this.chunks.push(chunk);
      this.emit('data', chunk);
      
      // Check for sound level (simple amplitude check)
      const hasSound = this.detectSound(chunk);
      if (hasSound) {
        this.lastSoundTime = Date.now();
        if (!this.hasSoundBeenDetected) {
          this.hasSoundBeenDetected = true;
          logger.debug('Sound detected!');
        }
        this.emit('sound');
      }
    });

    // Handle errors/warnings from sox
    this.process.stderr.on('data', (data: Buffer) => {
      const message = data.toString().trim();
      // Only log non-warning messages
      if (message && !message.includes('WARN')) {
        logger.debug('sox:', message);
      }
    });

    this.process.on('error', (error) => {
      logger.error('Recording process error:', error);
      this.emit('error', error);
      this.cleanup();
    });

    this.process.on('close', (code) => {
      if (code !== 0 && code !== null && code !== 143) { // 143 = SIGTERM
        logger.debug(`Recording process exited with code ${code}`);
      }
      this.cleanup();
    });

    // Start silence detection
    this.startSilenceDetection();

    logger.debug('Recording started');
  }

  /**
   * Stop recording and return audio buffer
   */
  stop(): AudioBuffer {
    if (!this.isRecording) {
      return this.createEmptyBuffer();
    }

    logger.debug('Stopping recording...');
    
    // Kill the recording process
    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = null;
    }

    // Stop silence detection
    this.stopSilenceDetection();

    // Create audio buffer from chunks
    const buffer = this.createAudioBuffer();
    
    this.isRecording = false;
    this.emit('stop', buffer);
    
    logger.debug(`Recording stopped. Duration: ${buffer.duration}ms, Size: ${buffer.data.length} bytes`);
    
    return buffer;
  }

  /**
   * Check if currently recording
   */
  getIsRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Get recording duration in ms
   */
  getDuration(): number {
    if (!this.isRecording) return 0;
    return Date.now() - this.recordingStartTime;
  }

  /**
   * Simple sound detection based on amplitude
   */
  private detectSound(chunk: Buffer): boolean {
    if (chunk.length < 2) return false;
    
    // Calculate RMS (root mean square) amplitude
    let sum = 0;
    const samples = Math.floor(chunk.length / 2); // 16-bit samples
    
    for (let i = 0; i < chunk.length - 1; i += 2) {
      const sample = chunk.readInt16LE(i);
      sum += sample * sample;
    }
    
    const rms = Math.sqrt(sum / samples);
    
    // Lower threshold for better detection
    // Typical silence is ~100-300 RMS, speech is ~1000-10000+
    const threshold = 300;
    
    return rms > threshold;
  }

  /**
   * Start monitoring for silence
   */
  private startSilenceDetection(): void {
    this.silenceTimeout = setInterval(() => {
      const silenceDuration = Date.now() - this.lastSoundTime;
      const recordingDuration = this.getDuration();
      
      // Only trigger silence if we've detected sound first and then silence
      // Or if we've been recording for a while with no sound
      if (this.hasSoundBeenDetected && silenceDuration > this.silenceThreshold) {
        logger.debug(`Silence detected for ${silenceDuration}ms after sound`);
        this.emit('silence');
      } else if (!this.hasSoundBeenDetected && recordingDuration > 5000) {
        // No sound detected for 5 seconds - might be mic issue
        logger.debug('No sound detected for 5 seconds');
        this.emit('silence');
      }
    }, this.silenceDuration);
  }

  /**
   * Stop silence monitoring
   */
  private stopSilenceDetection(): void {
    if (this.silenceTimeout) {
      clearInterval(this.silenceTimeout);
      this.silenceTimeout = null;
    }
  }

  /**
   * Create audio buffer from recorded chunks
   */
  private createAudioBuffer(): AudioBuffer {
    const data = Buffer.concat(this.chunks);
    const duration = this.calculateDuration(data.length);
    
    return {
      data,
      sampleRate: this.options.sampleRate,
      channels: this.options.channels,
      duration,
      format: 'raw',
    };
  }

  /**
   * Create empty audio buffer
   */
  private createEmptyBuffer(): AudioBuffer {
    return {
      data: Buffer.alloc(0),
      sampleRate: this.options.sampleRate,
      channels: this.options.channels,
      duration: 0,
      format: 'raw',
    };
  }

  /**
   * Calculate audio duration from buffer size
   */
  private calculateDuration(bufferSize: number): number {
    const bytesPerSample = this.options.bitDepth / 8;
    const totalSamples = bufferSize / (bytesPerSample * this.options.channels);
    return Math.round((totalSamples / this.options.sampleRate) * 1000);
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    this.stopSilenceDetection();
    this.isRecording = false;
    this.process = null;
  }
}

/**
 * Record audio for a specific duration
 */
export async function recordForDuration(
  durationMs: number,
  options?: Partial<RecordingOptions>
): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    const recorder = new AudioRecorder(options);
    
    const timeout = setTimeout(() => {
      const buffer = recorder.stop();
      resolve(buffer);
    }, durationMs);
    
    recorder.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    
    recorder.start();
  });
}

/**
 * Record until silence is detected
 */
export async function recordUntilSilence(
  options?: Partial<RecordingOptions>,
  silenceThreshold: number = 2000,
  maxDuration: number = 30000
): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    const recorder = new AudioRecorder(options, silenceThreshold, 300);
    let resolved = false;
    
    // Maximum recording time safety
    const maxTimeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        logger.debug('Max recording duration reached');
        const buffer = recorder.stop();
        resolve(buffer);
      }
    }, maxDuration);
    
    // Stop on silence
    recorder.on('silence', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(maxTimeout);
        const buffer = recorder.stop();
        resolve(buffer);
      }
    });
    
    recorder.on('error', (error) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(maxTimeout);
        reject(error);
      }
    });
    
    recorder.start();
  });
}

/**
 * Simple test function to verify recording works
 */
export async function testRecording(durationSeconds: number = 3): Promise<void> {
  logger.info(`Testing recording for ${durationSeconds} seconds...`);
  logger.info('Speak into your microphone now!');
  
  const buffer = await recordForDuration(durationSeconds * 1000);
  
  logger.info(`Recorded ${buffer.duration}ms of audio`);
  logger.info(`Buffer size: ${buffer.data.length} bytes`);
  
  // Calculate average amplitude
  let sum = 0;
  const samples = Math.floor(buffer.data.length / 2);
  for (let i = 0; i < buffer.data.length - 1; i += 2) {
    const sample = buffer.data.readInt16LE(i);
    sum += Math.abs(sample);
  }
  const avgAmplitude = sum / samples;
  
  logger.info(`Average amplitude: ${avgAmplitude.toFixed(0)}`);
  
  if (avgAmplitude < 100) {
    logger.warn('Very low audio level - check microphone!');
  } else if (avgAmplitude < 500) {
    logger.info('Low audio level detected');
  } else {
    logger.success('Good audio level detected!');
  }
}

// Default export
export default AudioRecorder;

