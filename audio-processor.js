/**
 * AudioWorkletProcessor — Captures raw PCM16 at 16kHz for Gemini Live API
 * Runs on dedicated audio thread for minimum latency
 */
class PCMCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = [];
    this._chunkSize = 1024; // samples per chunk
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const float32 = input[0]; // mono channel

    // Convert float32 → int16 PCM
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    // Send to main thread as base64
    const base64 = this._int16ToBase64(int16);
    this.port.postMessage({ type: 'pcm', data: base64 });

    return true;
  }

  _int16ToBase64(int16Array) {
    const bytes = new Uint8Array(int16Array.buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

registerProcessor('pcm-capture-processor', PCMCaptureProcessor);
