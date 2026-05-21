const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ── Gemini Live API (real-time WebSocket) ─────────
  liveOpen:      (p) => ipcRenderer.invoke('live-open', p),
  liveSendAudio: (p) => ipcRenderer.invoke('live-send-audio', p),
  liveSendTurnComplete: (p) => ipcRenderer.invoke('live-send-turn-complete', p),
  liveClose:     (p) => ipcRenderer.invoke('live-close', p),

  // Live API events from main → renderer
  onLiveAudio:        (cb) => ipcRenderer.on('live-audio',        (_e, d) => cb(d)),
  onLiveInputTranscript: (cb) => ipcRenderer.on('live-input-transcript', (_e, d) => cb(d)),
  onLiveTranscript:   (cb) => ipcRenderer.on('live-transcript',   (_e, d) => cb(d)),
  onLiveTurnComplete: (cb) => ipcRenderer.on('live-turn-complete',(_e, d) => cb(d)),
  onLiveError:        (cb) => ipcRenderer.on('live-error',        (_e, d) => cb(d)),
  onLiveClosed:       (cb) => ipcRenderer.on('live-closed',       (_e, d) => cb(d)),
  onLiveInterrupted:  (cb) => ipcRenderer.on('live-interrupted',  (_e, d) => cb(d)),

  // Remove listeners (cleanup)
  offLiveEvents: () => {
    ['live-audio','live-input-transcript','live-transcript','live-turn-complete','live-error','live-closed','live-interrupted']
      .forEach(ch => ipcRenderer.removeAllListeners(ch));
  },

  // ── File & config ─────────────────────────────────
  saveConversation: (p) => ipcRenderer.invoke('save-conversation', p),
  openExternal:     (p) => ipcRenderer.invoke('open-external', p),
  readConfig:       ()  => ipcRenderer.invoke('read-config'),
  writeConfig:      (d) => ipcRenderer.invoke('write-config', d),
  logEvent:         (label, data = {}) => ipcRenderer.invoke('log-event', { label, data }),
  readDebugLogTail: (p) => ipcRenderer.invoke('read-debug-log-tail', p),
  testLiveModel:    (p) => ipcRenderer.invoke('test-live-model', p),
});
