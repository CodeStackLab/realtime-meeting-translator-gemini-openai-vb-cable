class LiveSession {
  constructor({
    sessionId,
    provider,
    apiKey,
    model,
    voice,
    translationMode = 'fast',
    outputMode,
    playAudio = true,
    outputDeviceId = '',
    systemPrompt,
    onInputTranscript,
    onTranscript,
    onTurnComplete,
    onStatus,
    onClose,
    onInterrupted,
    onAudioPlaybackStart,
  }) {
    this.sessionId = sessionId;
    this.provider = provider;
    this.apiKey = apiKey;
    this.model = model;
    this.voice = voice;
    this.translationMode = translationMode;
    this.outputMode = outputMode;
    this.playAudio = playAudio;
    this.outputDeviceId = outputDeviceId;
    this.systemPrompt = systemPrompt;
    this.onInputTranscript = onInputTranscript || (() => {});
    this.onTranscript = onTranscript || (() => {});
    this.onTurnComplete = onTurnComplete || (() => {});
    this.onStatus = onStatus || (() => {});
    this.onClose = onClose || (() => {});
    this.onInterrupted = onInterrupted || (() => {});
    this.onAudioPlaybackStart = onAudioPlaybackStart || (() => {});

    this.audioCtx = null;
    this.workletNode = null;
    this.scriptNode = null;
    this.silentGain = null;
    this.analyser = null;
    this.isOpen = false;
    this.pcmQueue = [];
    this.isPlaying = false;
    this.sampleRate = 24000;
    this.inputSampleRate = 16000;
    this.silenceFrames = 0;
    this.lastTurnCompleteAt = 0;
    this.activeSourceNode = null;
    this.inputMutedUntil = 0;
    this.voiceActiveSince = 0;
    this.lastVoiceAt = 0;
    this.lastSoftFlushAt = 0;
    this.flushHoldUntil = 0;
    this.pendingAudioAfterFlush = [];
    this.drainFlushTimer = null;
  }

  async open(micStream) {
    this.onStatus('busy', 'Connecting to Gemini Live...');
    window.electronAPI.logEvent('renderer.live-session.open.start', {
      sessionId: this.sessionId,
      provider: this.provider,
      model: this.model,
      translationMode: this.translationMode,
      outputMode: this.outputMode,
      playAudio: this.playAudio,
      tracks: micStream?.getAudioTracks?.().map((track) => ({ label: track.label, enabled: track.enabled, muted: track.muted })) || [],
    });

    const res = await window.electronAPI.liveOpen({
      provider: this.provider,
      apiKey: this.apiKey,
      sessionId: this.sessionId,
      model: this.model,
      voice: this.voice,
      translationMode: this.translationMode,
      outputMode: this.outputMode,
      systemPrompt: this.systemPrompt,
    });

    if (!res.success) {
      const err = new Error(res.error || 'Failed to open Live session');
      err.errorId = res.errorId;
      throw err;
    }

    this.isOpen = true;
    window.electronAPI.logEvent('renderer.live-session.open.success', { sessionId: this.sessionId });
    this.onStatus('active', 'Live translation running');

    window.electronAPI.onLiveAudio((d) => {
      if (d.sessionId !== this.sessionId || !this.playAudio) return;
      window.electronAPI.logEvent('renderer.live-audio.received', { sessionId: this.sessionId, bytesBase64: d.audioBase64?.length || 0 });
      this._enqueuePCM(d.audioBase64);
    });

    window.electronAPI.onLiveTranscript((d) => {
      if (d.sessionId !== this.sessionId) return;
      window.electronAPI.logEvent('renderer.live-transcript.received', { sessionId: this.sessionId, chars: d.text?.length || 0, append: Boolean(d.append) });
      this.onTranscript(d.text, Boolean(d.append));
    });

    window.electronAPI.onLiveInputTranscript((d) => {
      if (d.sessionId !== this.sessionId) return;
      window.electronAPI.logEvent('renderer.live-input-transcript.received', { sessionId: this.sessionId, chars: d.text?.length || 0 });
      this.onInputTranscript(d.text, Boolean(d.append));
    });

    window.electronAPI.onLiveTurnComplete((d) => {
      if (d.sessionId !== this.sessionId) return;
      this.onTurnComplete();
    });

    window.electronAPI.onLiveError((d) => {
      if (d.sessionId !== this.sessionId) return;
      this.onStatus('error', d.error || 'Live API error');
    });

    window.electronAPI.onLiveClosed((d) => {
      if (d.sessionId !== this.sessionId) return;
      const wasOpen = this.isOpen;
      this.isOpen = false;
      this.onStatus('idle', 'Session closed');
      if (wasOpen) {
        this.onClose();
      }
    });

    window.electronAPI.onLiveInterrupted?.((d) => {
      if (d.sessionId !== this.sessionId) return;
      this.handleInterruption();
    });

    await this._startMicCapture(micStream);
  }

  async startCaptureOnly(micStream) {
    this.isOpen = false;
    await this._startMicCapture(micStream);
  }

  async _startMicCapture(stream) {
    window.electronAPI.logEvent('renderer.capture.start', {
      sessionId: this.sessionId,
      tracks: stream?.getAudioTracks?.().map((track) => ({ label: track.label, enabled: track.enabled, muted: track.muted })) || [],
    });
    this.audioCtx = new AudioContext({ sampleRate: this.inputSampleRate });
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
    await this.audioCtx.audioWorklet.addModule('audio-processor.js');

    const src = this.audioCtx.createMediaStreamSource(stream);
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 512;
    src.connect(this.analyser);

    this.silentGain = this.audioCtx.createGain();
    this.silentGain.gain.value = 0;

    this.scriptNode = this.audioCtx.createScriptProcessor(512, 1, 1);
    this.scriptNode.onaudioprocess = async (event) => {
      if (!this.isOpen) return;
      if (Date.now() < this.inputMutedUntil) return;
      const input = event.inputBuffer.getChannelData(0);
      const base64 = this._floatToPcm16Base64(input);
      const rms = this._getRms(input);
      this.sentChunks = (this.sentChunks || 0) + 1;
      if (this.sentChunks <= 5 || this.sentChunks % 50 === 0) {
        window.electronAPI.logEvent('renderer.script.pcm', {
          sessionId: this.sessionId,
          sentChunks: this.sentChunks,
          bytesBase64: base64.length,
        });
      }
      await this._sendOrQueueAudio(base64);
      this._trackInputLevel(rms);
      await this._maybeSoftFlush(rms);
    };

    src.connect(this.scriptNode);
    this.scriptNode.connect(this.silentGain);
    this.silentGain.connect(this.audioCtx.destination);
  }

  _getRms(float32) {
    let sum = 0;
    for (let i = 0; i < float32.length; i++) sum += float32[i] * float32[i];
    return Math.sqrt(sum / float32.length);
  }

  _trackInputLevel(rms) {
    if (rms > 0.012) {
      this.silenceFrames = 0;
      return;
    }
    this.silenceFrames += 1;
  }

  async _sendOrQueueAudio(base64) {
    if (Date.now() < this.flushHoldUntil) {
      this.pendingAudioAfterFlush.push(base64);
      this._scheduleFlushDrain();
      return;
    }
    await window.electronAPI.liveSendAudio({
      sessionId: this.sessionId,
      audioBase64: base64,
    });
  }

  _scheduleFlushDrain() {
    if (this.drainFlushTimer) return;
    const delay = Math.max(20, this.flushHoldUntil - Date.now() + 10);
    this.drainFlushTimer = setTimeout(() => {
      this.drainFlushTimer = null;
      this._drainQueuedAudio();
    }, delay);
  }

  async _drainQueuedAudio() {
    if (!this.isOpen || Date.now() < this.flushHoldUntil) {
      this._scheduleFlushDrain();
      return;
    }
    const queue = this.pendingAudioAfterFlush.splice(0);
    for (const audioBase64 of queue) {
      await window.electronAPI.liveSendAudio({
        sessionId: this.sessionId,
        audioBase64,
      });
    }
    if (queue.length) {
      window.electronAPI.logEvent('renderer.soft-flush.drain', {
        sessionId: this.sessionId,
        queuedChunks: queue.length,
      });
    }
  }

  async _maybeSoftFlush(rms) {
    // Gemini Live derives turns from VAD/end-of-speech. Repeated forced
    // audioStreamEnd calls during native audio can close the channel, so keep
    // this disabled for Gemini-only builds and tune VAD in main.js instead.
    return;
    if (this.translationMode !== 'fast') return;

    const now = Date.now();
    const speaking = rms > 0.018;
    if (!speaking) {
      if (now - this.lastVoiceAt > 260) this.voiceActiveSince = 0;
      return;
    }

    this.lastVoiceAt = now;
    if (!this.voiceActiveSince) {
      this.voiceActiveSince = now;
      this.lastSoftFlushAt = now;
      return;
    }

    if (now - this.voiceActiveSince < 520) return;
    if (now - this.lastSoftFlushAt < 720) return;

    this.lastSoftFlushAt = now;
    this.flushHoldUntil = now + 300;
    window.electronAPI.logEvent('renderer.soft-flush', {
      sessionId: this.sessionId,
      mode: this.translationMode,
      activeMs: now - this.voiceActiveSince,
      holdMs: this.flushHoldUntil - now,
    });
    await window.electronAPI.liveSendTurnComplete({ sessionId: this.sessionId });
    this._scheduleFlushDrain();
  }

  _floatToPcm16Base64(float32) {
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const sample = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }
    const bytes = new Uint8Array(int16.buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  _enqueuePCM(base64) {
    const bytes = atob(base64);
    const int16 = new Int16Array(bytes.length / 2);
    for (let i = 0; i < int16.length; i++) {
      const value = bytes.charCodeAt(i * 2) | (bytes.charCodeAt(i * 2 + 1) << 8);
      int16[i] = value > 32767 ? value - 65536 : value;
    }
    this.pcmQueue.push(int16);
    if (!this.isPlaying) this._playQueue();
  }

  async _playQueue() {
    if (this.pcmQueue.length === 0) {
      this.isPlaying = false;
      return;
    }
    this.isPlaying = true;

    const int16 = this.pcmQueue.shift();
    if (!this._playCtx) {
      this._playCtx = new AudioContext({ sampleRate: this.sampleRate });
    }
    if (this._playCtx.state === 'suspended') {
      await this._playCtx.resume();
    }

    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff);
    }

    const buffer = this._playCtx.createBuffer(1, float32.length, this.sampleRate);
    buffer.copyToChannel(float32, 0);

    const src = this._playCtx.createBufferSource();
    src.buffer = buffer;
    src.connect(await this._getPlaybackDestination());
    src.onended = () => {
      if (this.activeSourceNode === src) {
        this.activeSourceNode = null;
      }
      this._playQueue();
    };
    this.activeSourceNode = src;
    this.onAudioPlaybackStart(buffer.duration || 0);
    src.start();
  }

  suppressInput(ms = 900) {
    this.inputMutedUntil = Math.max(this.inputMutedUntil, Date.now() + ms);
  }

  async _getPlaybackDestination() {
    if (!this.outputDeviceId || !this._playCtx.createMediaStreamDestination) {
      return this._playCtx.destination;
    }
    if (!this._sinkAudio) {
      this._sinkDestination = this._playCtx.createMediaStreamDestination();
      this._sinkAudio = new Audio();
      this._sinkAudio.srcObject = this._sinkDestination.stream;
      this._sinkAudio.autoplay = true;
      if (this._sinkAudio.setSinkId) {
        await this._sinkAudio.setSinkId(this.outputDeviceId);
      }
      await this._sinkAudio.play().catch(() => {});
    }
    return this._sinkDestination;
  }

  handleInterruption() {
    window.electronAPI.logEvent('renderer.audio.interrupted', { sessionId: this.sessionId });
    this.pcmQueue = [];
    if (this.activeSourceNode) {
      try {
        this.activeSourceNode.stop();
      } catch {}
      this.activeSourceNode = null;
    }
    this.isPlaying = false;
    this.onInterrupted?.();
  }

  getAnalyser() {
    return this.analyser;
  }

  async close() {
    this.isOpen = false;
    if (this.activeSourceNode) {
      try { this.activeSourceNode.stop(); } catch {}
      this.activeSourceNode = null;
    }
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.scriptNode) {
      this.scriptNode.disconnect();
      this.scriptNode = null;
    }
    if (this.silentGain) {
      this.silentGain.disconnect();
      this.silentGain = null;
    }
    if (this.audioCtx) {
      await this.audioCtx.close();
      this.audioCtx = null;
    }
    if (this._playCtx) {
      await this._playCtx.close();
      this._playCtx = null;
    }
    if (this._sinkAudio) {
      this._sinkAudio.pause();
      this._sinkAudio.srcObject = null;
      this._sinkAudio = null;
      this._sinkDestination = null;
    }
    if (this.drainFlushTimer) {
      clearTimeout(this.drainFlushTimer);
      this.drainFlushTimer = null;
    }
    this.pendingAudioAfterFlush = [];
    await window.electronAPI.liveClose({ sessionId: this.sessionId });
  }
}
