const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');

const liveSessions = {};
const logPath = path.join(__dirname, 'app-debug.log');
let mainWindow;

const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-live-preview';
const appIconPath = fs.existsSync(path.join(__dirname, 'assets', 'icon.ico'))
  ? path.join(__dirname, 'assets', 'icon.ico')
  : path.join(__dirname, 'assets', 'icon.svg');

function normalizeTranslationMode(mode) {
  return ['fast', 'balanced', 'accurate'].includes(mode) ? mode : 'fast';
}

function getRealtimeInputConfig(mode = 'fast') {
  const timings = {
    fast: { prefixPaddingMs: 60, silenceDurationMs: 100 },
    balanced: { prefixPaddingMs: 140, silenceDurationMs: 350 },
    accurate: { prefixPaddingMs: 220, silenceDurationMs: 800 },
  };
  const selected = timings[normalizeTranslationMode(mode)];
  return {
    automaticActivityDetection: {
      disabled: false,
      startOfSpeechSensitivity: 'START_SENSITIVITY_HIGH',
      endOfSpeechSensitivity: 'END_SENSITIVITY_HIGH',
      ...selected,
    },
    turnCoverage: 'TURN_INCLUDES_ONLY_ACTIVITY',
    activityHandling: 'NO_INTERRUPTION',
  };
}

function usesManualActivity(provider, mode) {
  return false;
}

function getOpenAiTurnDetection(mode = 'fast') {
  const timings = {
    fast: { prefix_padding_ms: 60, silence_duration_ms: 100 },
    balanced: { prefix_padding_ms: 140, silence_duration_ms: 350 },
    accurate: { prefix_padding_ms: 220, silence_duration_ms: 800 },
  };
  return {
    type: 'server_vad',
    ...(timings[normalizeTranslationMode(mode)] || timings.balanced),
  };
}

function makeErrorId(prefix = 'ZT') {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${stamp}-${random}`;
}

function logEvent(label, data = {}) {
  const safeData = { ...data };
  if (safeData.apiKey) safeData.apiKey = '[redacted]';
  const line = `[${new Date().toISOString()}] ${label} ${JSON.stringify(safeData)}\n`;
  try { fs.appendFileSync(logPath, line, 'utf8'); } catch {}
}

process.on('uncaughtException', (err) => {
  if (err?.code === 'EPIPE') return;
  logEvent('uncaughtException', { message: err.message, stack: err.stack });
});

process.on('unhandledRejection', (err) => {
  logEvent('unhandledRejection', { message: err?.message || String(err), stack: err?.stack });
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 980,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
    title: 'Realtime Meeting Translator',
    icon: appIconPath,
    backgroundColor: '#0b1020',
    show: false,
    titleBarStyle: 'hiddenInset',
    frame: true,
  });

  mainWindow.loadFile('index.html');
  mainWindow.once('ready-to-show', () => mainWindow.show());
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  logEvent('app.ready');
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

const configPath = path.join(__dirname, 'config.json');

ipcMain.handle('read-config', () => {
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return {};
  }
});

ipcMain.handle('write-config', (event, data) => {
  try {
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf8');
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('log-event', (event, { label, data }) => {
  logEvent(label || 'renderer.event', data || {});
  return { success: true };
});

ipcMain.handle('read-debug-log-tail', (event, { lines = 120 } = {}) => {
  try {
    const text = fs.readFileSync(logPath, 'utf8');
    return { success: true, text: text.split(/\r?\n/).slice(-lines).join('\n'), logPath };
  } catch (e) {
    return { success: false, error: e.message, logPath };
  }
});

ipcMain.handle('test-live-model', async (event, {
  provider = 'gemini',
  apiKey,
  model,
  voice,
  translationMode = 'fast',
}) => {
  const selectedModel = model || (provider === 'openai'
    ? 'gpt-realtime-2'
    : DEFAULT_GEMINI_MODEL);
  const errorId = makeErrorId('ZT-TEST');

  if (!apiKey) {
    return { success: false, errorId, error: 'Missing API key.' };
  }

  logEvent('test-live-model.start', { errorId, provider, selectedModel });

  return new Promise((resolve) => {
    let settled = false;
    let ws;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { ws?.close(); } catch {}
      logEvent('test-live-model.finish', {
        errorId,
        provider,
        selectedModel,
        success: result.success,
        error: result.error,
      });
      resolve({ errorId, provider, model: selectedModel, ...result });
    };

    const timer = setTimeout(() => {
      finish({ success: false, error: 'Model access test timed out.' });
    }, 15000);

    try {
      const url = provider === 'openai'
        ? `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(selectedModel)}`
        : `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;

      ws = provider === 'openai'
        ? new WebSocket(url, {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          })
        : new WebSocket(url);
    } catch (e) {
      finish({ success: false, error: e.message || 'Could not create model test connection.' });
      return;
    }

    ws.on('open', () => {
      try {
        if (provider === 'openai') {
          ws.send(JSON.stringify({
            type: 'session.update',
            session: {
              type: 'realtime',
              model: selectedModel,
              instructions: 'Model access test. Do not answer.',
              output_modalities: ['audio'],
              audio: {
                input: {
                  format: { type: 'audio/pcm', rate: 24000 },
                  turn_detection: getOpenAiTurnDetection(translationMode),
                  transcription: { model: 'gpt-4o-mini-transcribe' },
                },
                output: {
                  format: { type: 'audio/pcm', rate: 24000 },
                  voice: voice || 'marin',
                },
              },
            },
          }));
          return;
        }

        ws.send(JSON.stringify({
          setup: {
            model: `models/${selectedModel}`,
            generationConfig: {
              responseModalities: ['AUDIO'],
              thinkingConfig: getGeminiThinkingConfig(selectedModel),
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voice || 'Puck' },
                },
              },
            },
            realtimeInputConfig: getRealtimeInputConfig(translationMode),
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction: {
              parts: [{ text: 'Model access test. Translate only.' }],
            },
          },
        }));
      } catch (e) {
        finish({ success: false, error: e.message || 'Could not send model test setup.' });
      }
    });

    ws.on('message', (rawData) => {
      try {
        const msg = JSON.parse(rawData.toString());
        if (provider === 'openai') {
          if (msg.type === 'session.updated') finish({ success: true });
          if (msg.type === 'error') finish({ success: false, error: msg.error?.message || 'OpenAI model test failed.' });
          return;
        }
        if (msg.setupComplete) finish({ success: true });
        if (msg.error) finish({ success: false, error: msg.error.message || msg.error.status || 'Gemini model test failed.' });
      } catch {
        finish({ success: false, error: 'Could not parse model test response.' });
      }
    });

    ws.on('error', (err) => {
      finish({ success: false, error: err.message || 'Realtime WebSocket error.' });
    });

    ws.on('close', (code, reasonBuffer) => {
      if (settled) return;
      const reason = rawCloseReason(reasonBuffer);
      finish({ success: false, error: reason || `Connection closed before setup completed (code ${code}).` });
    });
  });
});

ipcMain.handle('save-conversation', async (event, { format, data }) => {
  const ext = format === 'csv' ? 'csv' : 'txt';
  const filters = format === 'csv'
    ? [{ name: 'CSV Files', extensions: ['csv'] }]
    : [{ name: 'Text Files', extensions: ['txt'] }];

  const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Conversation',
    defaultPath: `zoom-conversation-${Date.now()}.${ext}`,
    filters,
  });

  if (canceled || !filePath) return { success: false };

  try {
    fs.writeFileSync(filePath, data, 'utf8');
    return { success: true, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('live-open', (event, {
  provider = 'gemini',
  apiKey,
  sessionId,
  systemPrompt,
  voice,
  model,
  outputMode = 'audio',
  translationMode = 'fast',
}) => {
  return new Promise((resolve) => {
    let ws;
    let openTimer;
    let selectedModel = model || (provider === 'openai'
      ? 'gpt-realtime'
      : DEFAULT_GEMINI_MODEL);
    let setupComplete = false;
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      if (openTimer) clearTimeout(openTimer);
      logEvent('live-open.finish', { sessionId, provider, outputMode, success: result.success, error: result.error });
      resolve(result);
    };

    try {
      const url = provider === 'openai'
        ? `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(selectedModel)}`
        : `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;

      ws = provider === 'openai'
        ? new WebSocket(url, {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          })
        : new WebSocket(url);

      logEvent('live-open.create', { sessionId, provider, selectedModel, outputMode, translationMode: normalizeTranslationMode(translationMode) });

      openTimer = setTimeout(() => {
        try { ws?.close(); } catch {}
        finish({
          success: false,
          error: `${provider === 'openai' ? 'OpenAI' : 'Gemini'} Live connection timed out. Check API key, model access, and internet.`,
        });
      }, 15000);
    } catch (e) {
      finish({ success: false, error: e.message || 'Could not create Live connection' });
      return;
    }

    liveSessions[sessionId] = {
      ws,
      provider,
      manualActivity: usesManualActivity(provider, translationMode),
      activityOpen: false,
    };

    ws.on('open', () => {
      try {
        logEvent('ws.open', { sessionId, provider, selectedModel, outputMode });
        if (provider === 'openai') {
          ws.send(JSON.stringify({
            type: 'session.update',
            session: {
              type: 'realtime',
              model: selectedModel,
              instructions: systemPrompt,
              modalities: outputMode === 'audio' ? ['text', 'audio'] : ['text'],
              output_modalities: outputMode === 'audio' ? ['audio'] : ['text'],
              audio: {
                input: {
                  format: { type: 'audio/pcm', rate: 24000 },
                  turn_detection: getOpenAiTurnDetection(translationMode),
                  transcription: { model: 'gpt-4o-mini-transcribe' },
                },
                output: {
                  format: { type: 'audio/pcm', rate: 24000 },
                  voice: voice || 'marin',
                },
              },
            },
          }));
          return;
        }

        ws.send(JSON.stringify({
          setup: {
            model: `models/${selectedModel}`,
            generationConfig: {
              responseModalities: outputMode === 'audio' ? ['AUDIO'] : ['TEXT'],
              thinkingConfig: getGeminiThinkingConfig(selectedModel),
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voice || 'Puck' },
                },
              },
            },
            realtimeInputConfig: getRealtimeInputConfig(translationMode),
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction: {
              parts: [{ text: systemPrompt }],
            },
          },
        }));
        logEvent('ws.setup.sent', {
          sessionId,
          provider,
          selectedModel,
          outputMode,
          manualActivity: usesManualActivity(provider, translationMode),
        });
      } catch (e) {
        logEvent('ws.setup.error', { sessionId, provider, error: e.message });
        finish({ success: false, error: e.message || 'Could not send Live setup message' });
      }
    });

    ws.on('message', (rawData) => {
      try {
        const msg = JSON.parse(rawData.toString());
        const msgType = provider === 'openai'
          ? msg.type
          : (msg.setupComplete ? 'setupComplete' : msg.serverContent ? 'serverContent' : msg.error ? 'error' : Object.keys(msg)[0]);
        logEvent('ws.message', { sessionId, provider, type: msgType });

        if (provider === 'openai') {
          if (msg.type === 'session.updated' && !setupComplete) {
            setupComplete = true;
            finish({ success: true });
            return;
          }
          if (msg.type === 'response.audio.delta' && msg.delta) {
            logEvent('live-audio.out', { sessionId, bytesBase64: msg.delta.length });
            mainWindow.webContents.send('live-audio', {
              sessionId,
              audioBase64: msg.delta,
              mimeType: 'audio/pcm;rate=24000',
            });
          }
          if ((msg.type === 'response.audio_transcript.delta' || msg.type === 'response.text.delta') && msg.delta) {
            logEvent('live-transcript.out', { sessionId, chars: msg.delta.length, append: true });
            mainWindow.webContents.send('live-transcript', { sessionId, text: msg.delta, append: true });
          }
          if (msg.type === 'conversation.item.input_audio_transcription.completed' && msg.transcript) {
            logEvent('live-input-transcript.out', { sessionId, chars: msg.transcript.length });
            mainWindow.webContents.send('live-input-transcript', { sessionId, text: msg.transcript });
          }
          if (msg.type === 'response.done') {
            mainWindow.webContents.send('live-turn-complete', { sessionId });
          }
          if (msg.type === 'error') {
            if (!setupComplete) finish({ success: false, error: msg.error?.message || 'OpenAI realtime error' });
            mainWindow.webContents.send('live-error', {
              sessionId,
              error: msg.error?.message || 'OpenAI realtime error',
            });
          }
          if (msg.type === 'input_audio_buffer.speech_started') {
            logEvent('live-interrupted.in', { sessionId, provider: 'openai' });
            mainWindow.webContents.send('live-interrupted', { sessionId });
          }
          return;
        }

        if (msg.setupComplete && !setupComplete) {
          setupComplete = true;
          finish({ success: true });
          return;
        }

        if (msg.error) {
          const errorMessage = msg.error.message || msg.error.status || 'Gemini Live error';
          if (!setupComplete) finish({ success: false, error: errorMessage });
          mainWindow.webContents.send('live-error', { sessionId, error: errorMessage });
          return;
        }

        if (msg.serverContent?.interrupted) {
          logEvent('live-interrupted.out', { sessionId, provider: 'gemini' });
          mainWindow.webContents.send('live-interrupted', { sessionId });
        }

        const parts = msg?.serverContent?.modelTurn?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            logEvent('live-audio.out', { sessionId, bytesBase64: part.inlineData.data.length });
            mainWindow.webContents.send('live-audio', {
              sessionId,
              audioBase64: part.inlineData.data,
              mimeType: part.inlineData.mimeType || 'audio/pcm;rate=24000',
            });
          }
          if (part.text) {
            logEvent('live-transcript.out', { sessionId, chars: part.text.length, append: true });
            mainWindow.webContents.send('live-transcript', { sessionId, text: part.text, append: true });
          }
        }

        if (msg?.serverContent?.inputTranscription?.text) {
          logEvent('live-input-transcript.out', { sessionId, chars: msg.serverContent.inputTranscription.text.length });
          mainWindow.webContents.send('live-input-transcript', {
            sessionId,
            text: msg.serverContent.inputTranscription.text,
            append: true,
          });
        }
        if (msg?.serverContent?.outputTranscription?.text) {
          logEvent('live-transcript.out', { sessionId, chars: msg.serverContent.outputTranscription.text.length, append: true });
          mainWindow.webContents.send('live-transcript', {
            sessionId,
            text: msg.serverContent.outputTranscription.text,
            append: true,
          });
        }
        if (msg?.serverContent?.turnComplete) {
          mainWindow.webContents.send('live-turn-complete', { sessionId });
        }
      } catch {
        logEvent('ws.message.parse-error', { sessionId, provider });
      }
    });

    ws.on('error', (err) => {
      const errorId = makeErrorId('ZT-WS');
      logEvent('ws.error', { errorId, sessionId, provider, error: err.message });
      if (!setupComplete) finish({ success: false, error: err.message, errorId });
      mainWindow.webContents.send('live-error', { sessionId, error: err.message, errorId });
    });

    ws.on('close', (code, reasonBuffer) => {
      delete liveSessions[sessionId];
      const errorId = !setupComplete ? makeErrorId('ZT-CLOSE') : undefined;
      const closeReason = rawCloseReason(reasonBuffer);
      logEvent('ws.close', { errorId, sessionId, provider, code, reason: closeReason, setupComplete });
      if (!setupComplete) {
        finish({
          success: false,
          error: `Live session closed before setup completed (code ${code}).`,
          errorId,
        });
      }
      mainWindow.webContents.send('live-closed', { sessionId, code, reason: closeReason, errorId });
    });
  });
});

function rawCloseReason(reason) {
  if (!reason) return '';
  if (Buffer.isBuffer(reason)) return reason.toString('utf8');
  return String(reason);
}

function getGeminiThinkingConfig(model) {
  if (/gemini-3/i.test(model || '')) {
    return { thinkingLevel: 'minimal' };
  }
  return {
    thinkingBudget: 0,
    includeThoughts: false,
  };
}

ipcMain.handle('live-send-audio', (event, { sessionId, audioBase64 }) => {
  const session = liveSessions[sessionId];
  const ws = session?.ws;
  if (!ws || ws.readyState !== WebSocket.OPEN) return { success: false, error: 'No session' };

  try {
    session.chunkCount = (session.chunkCount || 0) + 1;
    if (session.chunkCount <= 5 || session.chunkCount % 50 === 0) {
      logEvent('live-send-audio.chunk', { sessionId, provider: session.provider, chunkCount: session.chunkCount, bytesBase64: audioBase64?.length || 0 });
    }
    if (session.provider === 'openai') {
      ws.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: audioBase64 }));
    } else {
      if (session.manualActivity && !session.activityOpen) {
        ws.send(JSON.stringify({ realtimeInput: { activityStart: {} } }));
        session.activityOpen = true;
        logEvent('live-activity-start', { sessionId });
      }
      ws.send(JSON.stringify({
        realtimeInput: {
          audio: {
            mimeType: 'audio/pcm;rate=16000',
            data: audioBase64,
          },
        },
      }));
    }
    return { success: true };
  } catch (e) {
    logEvent('live-send-audio.error', { sessionId, error: e.message });
    return { success: false, error: e.message };
  }
});

ipcMain.handle('live-send-turn-complete', (event, { sessionId }) => {
  const session = liveSessions[sessionId];
  const ws = session?.ws;
  if (!ws || ws.readyState !== WebSocket.OPEN) return { success: false, error: 'No session' };
  if (session.provider !== 'gemini') return { success: true };
  try {
    if (session.manualActivity) {
      if (!session.activityOpen) return { success: true };
      ws.send(JSON.stringify({ realtimeInput: { activityEnd: {} } }));
      session.activityOpen = false;
      logEvent('live-activity-end', { sessionId });
    } else {
      ws.send(JSON.stringify({
        realtimeInput: {
          audioStreamEnd: true,
        },
      }));
    }
    logEvent('live-send-turn-complete', { sessionId });
    return { success: true };
  } catch (e) {
    logEvent('live-send-turn-complete.error', { sessionId, error: e.message });
    return { success: false, error: e.message };
  }
});

ipcMain.handle('live-close', (event, { sessionId }) => {
  const session = liveSessions[sessionId];
  if (session?.ws) {
    logEvent('live-close', { sessionId, provider: session.provider, chunkCount: session.chunkCount || 0 });
    session.ws.close();
    delete liveSessions[sessionId];
  }
  return { success: true };
});

ipcMain.handle('open-external', async (event, { type, filePath, url }) => {
  try {
    if (type === 'zoom') {
      const zoomPaths = [
        `C:\\Users\\${process.env.USERNAME}\\AppData\\Roaming\\Zoom\\bin\\Zoom.exe`,
        'C:\\Program Files\\Zoom\\bin\\Zoom.exe',
        'C:\\Program Files (x86)\\Zoom\\bin\\Zoom.exe',
      ];
      const found = zoomPaths.find((p) => fs.existsSync(p));
      if (found) {
        shell.openPath(found);
        return { success: true };
      }
      shell.openExternal('https://zoom.us/download');
      return { success: true, note: 'Zoom not found, opened download page' };
    }
    if (type === 'url' && (url || filePath)) {
      shell.openExternal(url || filePath);
      return { success: true };
    }
    if (type === 'file' && filePath) {
      shell.openPath(filePath);
      return { success: true };
    }
    return { success: false, error: 'Unknown type' };
  } catch (e) {
    return { success: false, error: e.message };
  }
});
