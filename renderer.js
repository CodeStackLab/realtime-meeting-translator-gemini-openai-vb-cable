const REALTIME_MODELS = {
  gemini: [
    {
      value: 'gemini-3.1-flash-live-preview',
      label: 'Gemini 3.1 Flash Live preview - fastest/newest audio',
    },
    {
      value: 'gemini-2.5-flash-native-audio-preview-12-2025',
      label: 'Gemini 2.5 Flash Native Audio 12-2025 - stable native audio',
    },
    {
      value: 'gemini-2.5-flash-native-audio-latest',
      label: 'Gemini 2.5 Flash Native Audio latest',
    },
    {
      value: 'gemini-2.5-flash-native-audio-preview-09-2025',
      label: 'Gemini 2.5 Flash Native Audio 09-2025',
    },
  ],
  openai: [
    { value: 'gpt-realtime-2', label: 'GPT Realtime 2 - most capable realtime voice' },
    { value: 'gpt-realtime-1.5', label: 'GPT Realtime 1.5 - best audio in/out voice' },
    { value: 'gpt-realtime', label: 'GPT Realtime - stable production voice' },
    { value: 'gpt-realtime-mini', label: 'GPT Realtime mini - lower cost' },
    { value: 'gpt-4o-realtime-preview', label: 'GPT-4o Realtime preview - legacy' },
    { value: 'gpt-4o-mini-realtime-preview', label: 'GPT-4o mini Realtime preview - legacy' },
  ],
};

const FORCE_TWO_WAY_VOICE_MODE = true;

const VOICES = {
  gemini: [
    ['Puck', 'Puck - male, upbeat'],
    ['Charon', 'Charon - male, deep'],
    ['Fenrir', 'Fenrir - male, strong'],
    ['Enceladus', 'Enceladus - male, warm'],
    ['Iapetus', 'Iapetus - male, clear'],
    ['Orus', 'Orus - male, smooth'],
    ['Aoede', 'Aoede - female, natural'],
    ['Kore', 'Kore - female, clear'],
    ['Zephyr', 'Zephyr - female, airy'],
  ],
  openai: [
    ['marin', 'Marin - natural voice'],
    ['cedar', 'Cedar - natural voice'],
  ],
};

let provider = 'gemini';
let selectedModel = REALTIME_MODELS.gemini[0].value;
let geminiApiKey = '';
let openaiApiKey = '';
let selectedVoice = 'Puck';
let buyerVoiceStyle = 'auto';
let translationMode = 'fast';
let buyerLang = 'English';
let myMicDeviceId = '';
let buyerMicDeviceId = '';
let translatedOutputDeviceId = '';
let buyerVoiceOutputDeviceId = '';
let monitorMyTranslation = false;
let buyerCaptureEnabled = false;
let playBuyerHindiVoice = false;
let myMicStream = null;
let buyerMicStream = null;
let myLiveSession = null;
let buyerLiveSession = null;
let running = false;
let starting = false;
let currentMy = { original: '', translated: '' };
let currentBuyer = { original: '', translated: '' };
let myOriginalCaption = '';
let myTranslationCaption = '';
let buyerOriginalCaption = '';
let buyerTranslationCaption = '';
let myWaveCtx = null;
let buyerWaveCtx = null;
let myAnalyser = null;
let buyerAnalyser = null;
let myAnimFrame = null;
let buyerAnimFrame = null;

const $ = (id) => document.getElementById(id);
const statusDot = $('statusDot');
const statusText = $('statusText');
const startBtn = $('startBtn');
const startBtnText = $('startBtnText');
const startHint = $('startHint');
const myMicStatus = $('myMicStatus');
const buyerMicStatus = $('buyerMicStatus');
const myOrigText = $('myOrigText');
const myTransText = $('myTransText');
const buyerOrigText = $('buyerOrigText');
const buyerTransText = $('buyerTransText');
const myOrigMeta = $('myOrigMeta');
const myTransMeta = $('myTransMeta');
const buyerOrigMeta = $('buyerOrigMeta');
const buyerTransMeta = $('buyerTransMeta');
const toast = $('toast');
const errorPanel = $('errorPanel');
const errorMessage = $('errorMessage');
const errorMeta = $('errorMeta');
let latestErrorDetails = '';

window.addEventListener('DOMContentLoaded', async () => {
  setupWaveforms();
  setupEvents();
  populateModels();
  populateVoices();
  await loadSettings();
  await populateDevices();
  setStatus('idle', getActiveApiKey() ? 'Ready. Press Start Live Translation.' : 'Add API key in Settings.');
});

function setupEvents() {
  $('settingsBtn').addEventListener('click', () => $('settingsOverlay').classList.add('open'));
  $('closeSettings').addEventListener('click', closeSettings);
  $('settingsOverlay').addEventListener('click', (e) => {
    if (e.target === $('settingsOverlay')) closeSettings();
  });
  $('providerSelect').addEventListener('change', () => {
    provider = $('providerSelect').value;
    populateModels();
    populateVoices();
  });
  $('saveSettings').addEventListener('click', saveSettings);
  $('toggleKeys').addEventListener('click', toggleKeyVisibility);
  $('geminiKeyLink').addEventListener('click', (e) => {
    e.preventDefault();
    window.electronAPI.openExternal({ type: 'url', url: 'https://aistudio.google.com/app/apikey' });
  });
  $('openaiKeyLink').addEventListener('click', (e) => {
    e.preventDefault();
    window.electronAPI.openExternal({ type: 'url', url: 'https://platform.openai.com/api-keys' });
  });
  $('testModelBtn').addEventListener('click', testSelectedModelAccess);
  $('copyErrorBtn').addEventListener('click', copyLatestError);
  $('dismissErrorBtn').addEventListener('click', () => {
    errorPanel.hidden = true;
  });
  startBtn.addEventListener('click', () => {
    if (running || starting) stopLiveTranslation();
    else startLiveTranslation();
  });
}

async function loadSettings() {
  let cfg = {};
  try { cfg = await window.electronAPI.readConfig(); } catch {}

  provider = cfg.provider || localStorage.getItem('provider') || 'gemini';
  selectedModel = cfg.model || localStorage.getItem('model') || REALTIME_MODELS[provider][0].value;
  geminiApiKey = cfg.gemini_api_key || localStorage.getItem('gemini_api_key') || '';
  openaiApiKey = cfg.openai_api_key || localStorage.getItem('openai_api_key') || '';
  selectedVoice = cfg.voice || cfg.my_voice_gemini || localStorage.getItem('voice') || (provider === 'openai' ? 'marin' : 'Puck');
  buyerVoiceStyle = cfg.buyer_voice_style || localStorage.getItem('buyer_voice_style') || 'auto';
  translationMode = normalizeTranslationMode(cfg.translation_mode || localStorage.getItem('translation_mode') || 'fast');
  buyerLang = cfg.buyer_lang || localStorage.getItem('buyer_lang') || 'English';
  myMicDeviceId = cfg.my_mic_device || localStorage.getItem('my_mic_device') || '';
  buyerMicDeviceId = cfg.buyer_mic_device || localStorage.getItem('buyer_mic_device') || '';
  translatedOutputDeviceId = cfg.translated_output_device || localStorage.getItem('translated_output_device') || '';
  buyerVoiceOutputDeviceId = cfg.buyer_voice_output_device || localStorage.getItem('buyer_voice_output_device') || '';
  monitorMyTranslation = (cfg.monitor_my_translation ?? localStorage.getItem('monitor_my_translation')) === 'true';
  buyerCaptureEnabled = (cfg.buyer_capture_enabled ?? localStorage.getItem('buyer_capture_enabled') ?? 'true') === 'true';
  playBuyerHindiVoice = (cfg.play_buyer_hindi_voice ?? localStorage.getItem('play_buyer_hindi_voice') ?? 'true') === 'true';
  if (FORCE_TWO_WAY_VOICE_MODE) {
    buyerCaptureEnabled = true;
    playBuyerHindiVoice = true;
  }

  $('providerSelect').value = provider;
  populateModels();
  $('modelSelect').value = selectedModel;
  populateVoices();
  $('voiceSelect').value = selectedVoice;
  $('buyerVoiceStyleSelect').value = buyerVoiceStyle;
  $('translationModeSelect').value = translationMode;
  $('geminiKeyInput').value = geminiApiKey;
  $('openaiKeyInput').value = openaiApiKey;
  $('buyerLangSelect').value = buyerLang;
  $('monitorMyTranslation').checked = monitorMyTranslation;
  $('buyerCaptureEnabled').checked = buyerCaptureEnabled;
  $('playBuyerHindiVoice').checked = playBuyerHindiVoice;
}

function saveSettings() {
  provider = $('providerSelect').value;
  selectedModel = $('modelSelect').value;
  geminiApiKey = $('geminiKeyInput').value.trim();
  openaiApiKey = $('openaiKeyInput').value.trim();
  selectedVoice = $('voiceSelect').value;
  buyerVoiceStyle = $('buyerVoiceStyleSelect').value;
  translationMode = normalizeTranslationMode($('translationModeSelect').value);
  buyerLang = $('buyerLangSelect').value;
  myMicDeviceId = $('myMicSelect').value;
  buyerMicDeviceId = $('buyerMicSelect').value;
  translatedOutputDeviceId = $('translatedOutputSelect').value;
  buyerVoiceOutputDeviceId = $('buyerVoiceOutputSelect').value;
  monitorMyTranslation = $('monitorMyTranslation').checked;
  buyerCaptureEnabled = $('buyerCaptureEnabled').checked;
  playBuyerHindiVoice = $('playBuyerHindiVoice').checked;
  if (FORCE_TWO_WAY_VOICE_MODE) {
    buyerCaptureEnabled = true;
    playBuyerHindiVoice = true;
    $('buyerCaptureEnabled').checked = true;
    $('playBuyerHindiVoice').checked = true;
  }

  localStorage.setItem('provider', provider);
  localStorage.setItem('model', selectedModel);
  localStorage.setItem('gemini_api_key', geminiApiKey);
  localStorage.setItem('openai_api_key', openaiApiKey);
  localStorage.setItem('voice', selectedVoice);
  localStorage.setItem('buyer_voice_style', buyerVoiceStyle);
  localStorage.setItem('translation_mode', translationMode);
  localStorage.setItem('buyer_lang', buyerLang);
  localStorage.setItem('my_mic_device', myMicDeviceId);
  localStorage.setItem('buyer_mic_device', buyerMicDeviceId);
  localStorage.setItem('translated_output_device', translatedOutputDeviceId);
  localStorage.setItem('buyer_voice_output_device', buyerVoiceOutputDeviceId);
  localStorage.setItem('monitor_my_translation', String(monitorMyTranslation));
  localStorage.setItem('buyer_capture_enabled', String(buyerCaptureEnabled));
  localStorage.setItem('play_buyer_hindi_voice', String(playBuyerHindiVoice));

  window.electronAPI.writeConfig({
    provider,
    model: selectedModel,
    gemini_api_key: geminiApiKey,
    openai_api_key: openaiApiKey,
    voice: selectedVoice,
    buyer_voice_style: buyerVoiceStyle,
    translation_mode: translationMode,
    buyer_lang: buyerLang,
    monitor_my_translation: monitorMyTranslation,
    buyer_capture_enabled: buyerCaptureEnabled,
    play_buyer_hindi_voice: playBuyerHindiVoice,
    my_mic_device: myMicDeviceId,
    buyer_mic_device: buyerMicDeviceId,
    translated_output_device: translatedOutputDeviceId,
    buyer_voice_output_device: buyerVoiceOutputDeviceId,
  });

  closeSettings();
  showToast('Settings saved', 'success');
  setStatus('idle', getActiveApiKey() ? 'Ready. Press Start Live Translation.' : 'Add API key in Settings.');
}

async function testSelectedModelAccess() {
  provider = $('providerSelect').value;
  selectedModel = $('modelSelect').value;
  geminiApiKey = $('geminiKeyInput').value.trim();
  openaiApiKey = $('openaiKeyInput').value.trim();
  selectedVoice = $('voiceSelect').value;
  translationMode = normalizeTranslationMode($('translationModeSelect').value);
  const apiKey = getActiveApiKey();

  if (!apiKey) {
    showToast(`Add ${provider === 'openai' ? 'OpenAI' : 'Gemini'} API key first.`, 'error');
    return;
  }

  $('testModelBtn').disabled = true;
  $('testModelBtn').textContent = 'Testing...';
  setStatus('busy', `Testing ${selectedModel} access...`);

  try {
    const res = await window.electronAPI.testLiveModel({
      provider,
      apiKey,
      model: selectedModel,
      voice: selectedVoice,
      translationMode,
    });
    if (res.success) {
      showToast(`${res.model} is available for your API key.`, 'success');
      setStatus('idle', `Model OK: ${res.model}`);
      return;
    }
    const err = new Error(res.error || 'Model access test failed.');
    err.errorId = res.errorId;
    await showAppError('Model access test failed', err);
    setStatus('error', `Model test failed: ${res.model}`);
  } catch (e) {
    await showAppError('Model access test failed', e);
    setStatus('error', e.message || 'Model access test failed');
  } finally {
    $('testModelBtn').disabled = false;
    $('testModelBtn').textContent = 'Test model access';
  }
}

function closeSettings() {
  $('settingsOverlay').classList.remove('open');
}

function populateModels() {
  const select = $('modelSelect');
  const models = REALTIME_MODELS[provider] || REALTIME_MODELS.gemini;
  select.innerHTML = '';
  models.forEach((model) => {
    const option = document.createElement('option');
    option.value = model.value;
    option.textContent = model.label;
    select.appendChild(option);
  });
  if (!models.some((m) => m.value === selectedModel)) selectedModel = models[0].value;
  select.value = selectedModel;
}

function populateVoices() {
  const select = $('voiceSelect');
  const voices = VOICES[provider] || VOICES.gemini;
  select.innerHTML = '';
  voices.forEach(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  });
  if (!voices.some(([value]) => value === selectedVoice)) selectedVoice = voices[0][0];
  select.value = selectedVoice;
}

function getBuyerHindiVoice() {
  if (provider === 'openai') {
    if (buyerVoiceStyle === 'male') return 'cedar';
    if (buyerVoiceStyle === 'female') return 'marin';
    return 'marin';
  }
  if (buyerVoiceStyle === 'male') return 'Puck';
  if (buyerVoiceStyle === 'female') return 'Aoede';
  return 'Aoede';
}

function normalizeTranslationMode(mode) {
  return ['fast', 'balanced', 'accurate'].includes(mode) ? mode : 'fast';
}

function getTranslationModeLabel() {
  if (translationMode === 'fast') return 'Ultra Realtime Streaming';
  if (translationMode === 'accurate') return 'Accurate Sentence Mode';
  return 'Balanced Sentence Mode';
}

function getTimingInstruction() {
  if (translationMode === 'fast') {
    return 'Timing mode: Ultra Realtime Streaming. Start translating while the speaker is still talking. Output short natural phrase chunks immediately, but still use complete words and normal spaces.';
  }
  if (translationMode === 'accurate') {
    return 'Timing mode: Accurate Sentence Mode. Wait for a complete sentence or clear natural pause, then output one polished sentence. A little delay is acceptable for clarity.';
  }
  return 'Timing mode: Balanced Sentence Mode. Wait for a short natural pause or complete phrase, then output one clean sentence quickly. Capture phrases such as "main ghar ja raha hun" as one unit before translating.';
}

function buildMyTranslationPrompt() {
  return [
    'You are a realtime Hindi/Hinglish to English speech translation engine for a live meeting.',
    getTimingInstruction(),
    'Your only job is translation. Do not answer questions. Do not continue the conversation. Do not add advice.',
    'If the speaker says "aap kaise ho", say only "How are you?"',
    'Translate fragmented speech into one clean, meaningful English sentence when possible.',
    'Do not summarize or change intent; keep the sentence meaning accurate and complete.',
    'Preserve names, numbers, prices, account details, dates, promises, and business meaning exactly.',
    'Use simple professional English that sounds natural when spoken to a buyer.',
    'Speak in a clear professional Indian male English style.',
    'Never stream broken letters or joined words. Use complete words with normal spaces.',
    'Prefer short sentence-wise output over word-by-word output.',
    'Never output markdown, analysis, labels, notes, "Awaiting input", "I understand", or internal reasoning.',
    'Output only the English translation.',
  ].join(' ');
}

function buildBuyerTranslationPrompt() {
  return [
    `You are a realtime ${buyerLang} to Hindi/Hinglish speech translation engine for a live meeting.`,
    getTimingInstruction(),
    `The buyer speaks ${buyerLang}. Translate only what the buyer says.`,
    'Never answer the buyer. Never reply to questions. Never add advice or explanations.',
    'If the buyer says "How are you?", say only "Aap kaise ho?" Never say "Main theek hoon".',
    'Translate fragmented speech into one clean, meaningful Hindi/Hinglish sentence when possible.',
    'Do not summarize or change intent; keep the sentence meaning accurate and complete.',
    'Use simple professional Hindi/Hinglish that an Indian caller can understand easily.',
    'Never stream broken letters or joined words. Use complete words with normal spaces.',
    'Prefer short sentence-wise output over word-by-word output.',
    'Preserve names, numbers, prices, account details, dates, promises, and business meaning exactly.',
    'Never output markdown, analysis, labels, notes, "Awaiting input", "I understand", or internal reasoning.',
    'Output only the Hindi translation.',
  ].join(' ');
}

async function populateDevices() {
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter((d) => d.kind === 'audioinput');
    const audioOutputs = devices.filter((d) => d.kind === 'audiooutput');
    const savedMyMic = findSavedDevice(audioInputs, myMicDeviceId);
    const savedMyMicIsCable = /cable|vb-audio/i.test(savedMyMic?.label || '');
    const preferredMyMic = !savedMyMicIsCable && savedMyMic?.deviceId
      ? savedMyMic.deviceId
      : findDeviceId(audioInputs, ['bh900', 'microphone']) || findNonCableInput(audioInputs);
    const savedBuyerSource = findSavedDevice(audioInputs, buyerMicDeviceId);
    const buyerSourceLooksOldCable = /cable output/i.test(savedBuyerSource?.label || '') && !/cable-?a/i.test(savedBuyerSource?.label || '');
    const preferredBuyerSource = !buyerSourceLooksOldCable && savedBuyerSource?.deviceId
      ? savedBuyerSource.deviceId
      : findDeviceId(audioInputs, ['cable-a output'])
        || findDeviceId(audioInputs, ['cable a output'])
        || findDeviceId(audioInputs, ['cable output', 'vb-audio']);
    myMicDeviceId = preferredMyMic;
    buyerMicDeviceId = preferredBuyerSource;
    const savedTranslatedOutput = findSavedDevice(audioOutputs, translatedOutputDeviceId);
    const translatedOutputLooksOldCable = /cable input/i.test(savedTranslatedOutput?.label || '') && !/cable-?b/i.test(savedTranslatedOutput?.label || '');
    translatedOutputDeviceId = !translatedOutputLooksOldCable && savedTranslatedOutput?.deviceId
      ? savedTranslatedOutput.deviceId
      : findDeviceId(audioOutputs, ['cable-b input'])
        || findDeviceId(audioOutputs, ['cable b input'])
        || findDeviceId(audioOutputs, ['cable input', 'vb-audio']);
    const savedBuyerVoiceOutput = findSavedDevice(audioOutputs, buyerVoiceOutputDeviceId);
    buyerVoiceOutputDeviceId = savedBuyerVoiceOutput?.deviceId
      || findDeviceId(audioOutputs, ['bh900'])
      || findDeviceId(audioOutputs, ['headphones'])
      || findDeviceId(audioOutputs, ['speaker']);
    localStorage.setItem('my_mic_device', myMicDeviceId);
    localStorage.setItem('buyer_mic_device', buyerMicDeviceId);
    localStorage.setItem('translated_output_device', translatedOutputDeviceId);
    localStorage.setItem('buyer_voice_output_device', buyerVoiceOutputDeviceId);
    fillDeviceSelect($('myMicSelect'), audioInputs, preferredMyMic);
    fillDeviceSelect($('buyerMicSelect'), audioInputs, preferredBuyerSource);
    fillDeviceSelect($('translatedOutputSelect'), audioOutputs, translatedOutputDeviceId, 'System default output');
    fillDeviceSelect($('buyerVoiceOutputSelect'), audioOutputs, buyerVoiceOutputDeviceId, 'System default output');
  } catch (e) {
    showToast('Mic permission denied. Please allow microphone access.', 'error');
  }
}

function findDeviceId(devices, keywords) {
  const lowerKeywords = keywords.map((word) => word.toLowerCase());
  const match = devices.find((device) => {
    const label = (device.label || '').toLowerCase();
    return lowerKeywords.every((word) => label.includes(word));
  });
  return match?.deviceId || '';
}

function findSavedDevice(devices, savedValue) {
  if (!savedValue) return null;
  const exact = devices.find((device) => device.deviceId === savedValue);
  if (exact) return exact;
  const normalizedSaved = normalizeDeviceName(savedValue);
  return devices.find((device) => normalizeDeviceName(device.label || '').includes(normalizedSaved))
    || devices.find((device) => normalizedSaved.includes(normalizeDeviceName(device.label || '')))
    || null;
}

function normalizeDeviceName(value) {
  return String(value)
    .toLowerCase()
    .replace(/communications\s*-\s*/g, '')
    .replace(/default\s*-\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function findNonCableInput(devices) {
  const match = devices.find((device) => !/cable|vb-audio/i.test(device.label || ''));
  return match?.deviceId || '';
}

function fillDeviceSelect(select, devices, selected, defaultLabel = '') {
  select.innerHTML = '';
  if (defaultLabel) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = defaultLabel;
    select.appendChild(option);
  }
  devices.forEach((device, index) => {
    const option = document.createElement('option');
    option.value = device.deviceId;
    option.textContent = device.label || `Microphone ${index + 1}`;
    select.appendChild(option);
  });
  if (selected) select.value = selected;
}

async function startLiveTranslation() {
  const apiKey = getActiveApiKey();
  if (!apiKey) {
    showToast(`Add ${provider === 'openai' ? 'OpenAI' : 'Gemini'} API key first.`, 'error');
    $('settingsOverlay').classList.add('open');
    return;
  }

  starting = true;
  updateStartButton();
  setStatus('busy', 'Starting both realtime translation channels...');

  try {
    resetTranscriptState();
    const myConstraints = {
      audio: myMicDeviceId
        ? { deviceId: { exact: myMicDeviceId }, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        : { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    };
    const buyerConstraints = {
      audio: buyerMicDeviceId
        ? { deviceId: { exact: buyerMicDeviceId }, echoCancellation: false, noiseSuppression: false, autoGainControl: false }
        : { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    };
    myMicStream = await navigator.mediaDevices.getUserMedia(myConstraints);
    if (buyerCaptureEnabled) {
      buyerMicStream = await navigator.mediaDevices.getUserMedia(buyerConstraints);
    }
    window.electronAPI.logEvent('renderer.start.settings', {
      provider,
      model: selectedModel,
      translationMode,
      buyerCaptureEnabled,
      playBuyerHindiVoice,
      myMicDeviceId,
      buyerMicDeviceId,
      translatedOutputDeviceId,
      buyerVoiceOutputDeviceId,
      myTracks: myMicStream?.getAudioTracks?.().map((track) => ({ label: track.label, enabled: track.enabled, muted: track.muted })) || [],
      buyerTracks: buyerMicStream?.getAudioTracks?.().map((track) => ({ label: track.label, enabled: track.enabled, muted: track.muted })) || [],
    });

    myLiveSession = new LiveSession({
      sessionId: `my-${Date.now()}`,
      provider,
      apiKey,
      model: selectedModel,
      voice: selectedVoice,
      translationMode,
      outputMode: 'audio',
      playAudio: true,
      outputDeviceId: translatedOutputDeviceId,
      systemPrompt: buildMyTranslationPrompt(),
      onInputTranscript: (text, append) => updateTranscript('myOriginal', text, append),
      onTranscript: (text, append) => updateTranscript('myTranslation', text, append),
      onTurnComplete: () => {},
      onStatus: (state, msg) => setStatus(state, msg),
      onClose: () => {
        if (running) {
          stopLiveTranslation();
          showToast('Your voice translation channel disconnected.', 'warning');
        }
      },
      onInterrupted: () => {
        showToast('Interrupted translation playback.', 'info');
      },
    });

    if (buyerCaptureEnabled) {
      buyerLiveSession = new LiveSession({
        sessionId: `buyer-${Date.now()}`,
        provider,
        apiKey,
        model: selectedModel,
        voice: getBuyerHindiVoice(),
        translationMode,
        outputMode: playBuyerHindiVoice ? 'audio' : 'text',
        playAudio: playBuyerHindiVoice,
        outputDeviceId: buyerVoiceOutputDeviceId,
        systemPrompt: buildBuyerTranslationPrompt(),
        onInputTranscript: (text, append) => updateTranscript('buyerOriginal', text, append),
        onTranscript: (text, append) => updateTranscript('buyerTranslation', text, append),
        onTurnComplete: () => {},
        onStatus: (state, msg) => setStatus(state, msg),
        onClose: () => {
          if (running) {
            stopLiveTranslation();
            showToast('Buyer translation channel disconnected.', 'warning');
          }
        },
        onInterrupted: () => {
          showToast('Interrupted buyer translation playback.', 'info');
        },
        onAudioPlaybackStart: (durationSeconds) => {
          myLiveSession?.suppressInput(Math.max(900, Math.ceil((durationSeconds || 0) * 1000) + 350));
        },
      });
    }

    running = true;
    setStatus('busy', 'Connecting Gemini channels...');
    showToast('Connecting Gemini...', 'success');
    starting = false;
    updateStartButton();

    const myOpen = myLiveSession.open(myMicStream)
      .then(() => {
        myAnalyser = myLiveSession.getAnalyser();
        startWaveform('my');
        myMicStatus.textContent = 'Your mic connected to Gemini';
        setStatus('active', 'Your Hindi to English voice channel is live.');
      })
      .catch((e) => {
        myMicStatus.textContent = 'Your Gemini channel failed';
        showAppError('Your voice channel failed', e);
        setStatus('error', e.message || 'Your voice channel failed');
      });

    const buyerOpen = buyerLiveSession
      ? buyerLiveSession.open(buyerMicStream)
        .then(() => {
          buyerAnalyser = buyerLiveSession.getAnalyser();
          startWaveform('buyer');
          buyerMicStatus.textContent = 'Buyer caption channel connected';
        })
        .catch((e) => {
          buyerMicStatus.textContent = 'Buyer caption channel failed';
          showAppError('Buyer caption failed', e);
        })
      : Promise.resolve();

    Promise.allSettled([myOpen, buyerOpen]).then(() => {
      if (running) window.electronAPI.logEvent('renderer.start.channels.settled', {});
    });
  } catch (e) {
    await stopLiveTranslation();
    setStatus('error', e.message || 'Could not start live translation');
    showAppError('Start failed', e);
  } finally {
    if (!running) starting = false;
    updateStartButton();
  }
}

async function stopLiveTranslation() {
  starting = false;
  running = false;
  updateStartButton();

  if (myLiveSession) {
    try { await myLiveSession.close(); } catch {}
    myLiveSession = null;
  }
  if (buyerLiveSession) {
    try { await buyerLiveSession.close(); } catch {}
    buyerLiveSession = null;
  }
  if (myMicStream) {
    myMicStream.getTracks().forEach((track) => track.stop());
    myMicStream = null;
  }
  if (buyerMicStream) {
    buyerMicStream.getTracks().forEach((track) => track.stop());
    buyerMicStream = null;
  }
  window.electronAPI.offLiveEvents();
  stopWaveform('my');
  stopWaveform('buyer');
  myMicStatus.textContent = 'Mic off';
  buyerMicStatus.textContent = 'Listening off';
  setStatus('idle', 'Stopped. Press Start Live Translation when ready.');
}

function updateStartButton() {
  startBtn.disabled = starting;
  startBtn.classList.toggle('stop', running || starting);
  startBtnText.textContent = starting ? 'Starting...' : (running ? 'Stop Translation' : 'Start Live Translation');
  const modeLabel = getTranslationModeLabel();
  startHint.textContent = running ? `${modeLabel} active on both sides` : `${modeLabel} ready`;
  myMicStatus.textContent = running || starting ? 'Hindi mic streaming' : 'Mic off';
  buyerMicStatus.textContent = running || starting ? 'Buyer audio streaming' : 'Listening off';
}

function resetTranscriptState() {
  currentMy = { original: '', translated: '' };
  currentBuyer = { original: '', translated: '' };
  myOriginalCaption = '';
  myTranslationCaption = '';
  buyerOriginalCaption = '';
  buyerTranslationCaption = '';
  setTranscript(myOrigText, 'Your Hindi speech appears here.');
  setTranscript(myTransText, 'Realtime English translation appears here.');
  setTranscript(buyerOrigText, 'Buyer speech appears here.');
  setTranscript(buyerTransText, 'Buyer ka Hindi translation yahan dikhega.');
  [myOrigMeta, myTransMeta, buyerOrigMeta, buyerTransMeta].forEach((el) => { el.textContent = ''; });
}

function updateTranscript(kind, text, append) {
  const now = new Date().toLocaleTimeString();
  const cleanText = sanitizeCaptionChunk(text);
  if (!cleanText) return;
  if (kind === 'myOriginal') {
    myOriginalCaption = mergeCaption(myOriginalCaption, cleanText, append);
    currentMy.original = myOriginalCaption;
    setTranscript(myOrigText, myOriginalCaption);
    myOrigMeta.textContent = now;
    flashBox(myOrigText);
  } else if (kind === 'myTranslation') {
    myTranslationCaption = mergeCaption(myTranslationCaption, cleanText, append);
    currentMy.translated = myTranslationCaption;
    setTranscript(myTransText, myTranslationCaption);
    myTransMeta.textContent = now;
    flashBox(myTransText);
  } else if (kind === 'buyerOriginal') {
    buyerOriginalCaption = mergeCaption(buyerOriginalCaption, cleanText, append);
    currentBuyer.original = buyerOriginalCaption;
    setTranscript(buyerOrigText, buyerOriginalCaption);
    buyerOrigMeta.textContent = now;
    flashBox(buyerOrigText);
  } else if (kind === 'buyerTranslation') {
    buyerTranslationCaption = mergeCaption(buyerTranslationCaption, cleanText, append);
    currentBuyer.translated = buyerTranslationCaption;
    setTranscript(buyerTransText, buyerTranslationCaption);
    buyerTransMeta.textContent = now;
    flashBox(buyerTransText);
  }
}

function sanitizeCaptionChunk(value) {
  const original = String(value || '');
  const leadingSpace = /^\s/.test(original) ? ' ' : '';
  let text = original.trim();
  if (!text) return '';
  if (/\*\*(Awaiting|Interpreting|Analysis|Translation|Reasoning|Note)[^*]*\*\*/i.test(text)) return '';
  if (/^(Awaiting Further Input|Interpreting Fragmented Input|I understand|My analysis|The latest input)/i.test(text)) return '';
  text = text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/<noise>/gi, '')
    .replace(/\bAwaiting Further Input\b/gi, '')
    .replace(/\bInterpreting Fragmented Input\b/gi, '')
    .replace(/\bI understand\b[^.?!]*[.?!]?/gi, '')
    .replace(/\bMy role is translation\b[^.?!]*[.?!]?/gi, '')
    .replace(/\bMy analysis[^.?!]*[.?!]?/gi, '')
    .trim();
  if (/^(therefore|however|because),?\s/i.test(text)) return '';
  return `${leadingSpace}${text}`;
}

function mergeCaption(existing, incoming, append) {
  const raw = incoming || '';
  const text = raw.trim();
  if (!text) return existing;
  if (!append) return text;
  if (!existing) return text;
  if (existing.endsWith(text)) return existing;
  const incomingLooksLikeToken = text.length <= 3 && !/\s/.test(text);
  const needsSpace = /^\s/.test(raw)
    || (!incomingLooksLikeToken
    && !/\s$/.test(existing)
    && !/^[.,!?;:]/.test(text));
  const separator = needsSpace && !/\s$/.test(existing) ? ' ' : '';
  const merged = `${existing}${separator}${text}`;
  return cleanCaptionText(merged).split(/\s+/).slice(-140).join(' ');
}

function cleanCaptionText(text) {
  let cleaned = text
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/([(\["'])\s+/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
  cleaned = repairJoinedEnglishWords(cleaned);
  cleaned = repairJoinedHindiWords(cleaned);
  cleaned = segmentHindiIfNeeded(cleaned);
  return cleaned;
}

function repairJoinedEnglishWords(text) {
  const replacements = [
    [/\bhearme\b/gi, 'hear me'],
    [/\bcanuseit\b/gi, 'can use it'],
    [/\bcreatean\b/gi, 'create an'],
    [/\baccountforyouandyoucanuseit\b/gi, 'account for you and you can use it'],
    [/\baccountforyou\b/gi, 'account for you'],
    [/\byoucanuseit\b/gi, 'you can use it'],
    [/\bforyou\b/gi, 'for you'],
    [/\byouandyou\b/gi, 'you and you'],
    [/\bplease([a-z])/gi, 'please $1'],
    [/\bhello([A-Z])/g, 'hello $1'],
    [/\b(can|will|should|would|could|please|your|you|my|the|an|a|to|for|and)([A-Z][a-z])/g, '$1 $2'],
  ];
  return replacements.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), text);
}

function repairJoinedHindiWords(text) {
  const replacements = [
    [/हेलोआप/g, 'हेलो आप'],
    [/कैसेहो/g, 'कैसे हो'],
    [/कहामेरी/g, 'कहा मेरी'],
    [/मेरीआवाज/g, 'मेरी आवाज'],
    [/सुनपा/g, 'सुन पा'],
    [/मैंआपसे/g, 'मैं आपसे'],
    [/कहनाचाहता/g, 'कहना चाहता'],
    [/आपकेलिए/g, 'आपके लिए'],
    [/लिएएक/g, 'लिए एक'],
    [/अकाउंटबना/g, 'अकाउंट बना'],
    [/बनाऊंगा/g, 'बनाऊंगा'],
    [/यूजकरिएगा/g, 'यूज करिएगा'],
  ];
  return replacements.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), text);
}

function segmentHindiIfNeeded(text) {
  if (!/[\u0900-\u097F]{8,}/.test(text) || typeof Intl === 'undefined' || !Intl.Segmenter) {
    return text;
  }
  try {
    const segmenter = new Intl.Segmenter('hi', { granularity: 'word' });
    return text.replace(/[\u0900-\u097F]{8,}/g, (chunk) => {
      const words = Array.from(segmenter.segment(chunk))
        .filter((part) => part.isWordLike)
        .map((part) => part.segment);
      return words.length > 1 ? words.join(' ') : chunk;
    });
  } catch {
    return text;
  }
}

function setTranscript(element, text) {
  element.textContent = text;
}

function getActiveApiKey() {
  return provider === 'openai' ? openaiApiKey : geminiApiKey;
}

function setStatus(state, text) {
  statusText.textContent = text;
  statusDot.className = 'status-dot';
  if (state === 'active') statusDot.classList.add('active');
  if (state === 'busy' || state === 'connecting') statusDot.classList.add('busy');
  if (state === 'error') statusDot.classList.add('error');
}

function setupWaveforms() {
  myWaveCtx = $('myWaveform').getContext('2d');
  buyerWaveCtx = $('buyerWaveform').getContext('2d');
}

function startWaveform(side) {
  const canvas = side === 'my' ? $('myWaveform') : $('buyerWaveform');
  const ctx = side === 'my' ? myWaveCtx : buyerWaveCtx;
  const color = side === 'my' ? '#42a5ff' : '#2dd4bf';

  const draw = () => {
    const analyser = side === 'my' ? myAnalyser : buyerAnalyser;
    drawWaveform(canvas, ctx, analyser, color);
    if (side === 'my') myAnimFrame = requestAnimationFrame(draw);
    else buyerAnimFrame = requestAnimationFrame(draw);
  };
  draw();
}

function stopWaveform(side) {
  if (side === 'my' && myAnimFrame) cancelAnimationFrame(myAnimFrame);
  if (side === 'buyer' && buyerAnimFrame) cancelAnimationFrame(buyerAnimFrame);
  if (side === 'my') myAnimFrame = null;
  else buyerAnimFrame = null;
  const ctx = side === 'my' ? myWaveCtx : buyerWaveCtx;
  const canvas = side === 'my' ? $('myWaveform') : $('buyerWaveform');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawWaveform(canvas, ctx, analyser, color) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();

  if (!analyser) {
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
    return;
  }

  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteTimeDomainData(data);
  const step = canvas.width / data.length;
  for (let i = 0; i < data.length; i++) {
    const x = i * step;
    const y = (data[i] / 255) * canvas.height;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function flashBox(element) {
  const parent = element.closest('.transcript-box');
  if (!parent) return;
  parent.classList.remove('flash-update');
  void parent.offsetWidth;
  parent.classList.add('flash-update');
}

function toggleKeyVisibility() {
  const inputs = [$('geminiKeyInput'), $('openaiKeyInput')];
  const shouldShow = inputs[0].type === 'password';
  inputs.forEach((input) => { input.type = shouldShow ? 'text' : 'password'; });
  $('toggleKeys').textContent = shouldShow ? 'Hide keys' : 'Show keys';
}

let toastTimer;
function showToast(message, type = 'info') {
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), type === 'error' ? 30000 : 3500);
}

async function showAppError(title, err) {
  const message = err?.message || String(err || 'Unknown error');
  const errorId = err?.errorId || `ZT-UI-${Date.now().toString(36).toUpperCase()}`;
  const timestamp = new Date().toLocaleString();
  let logTail = '';
  let logPath = 'app-debug.log';
  try {
    const res = await window.electronAPI.readDebugLogTail?.({ lines: 80 });
    if (res?.success) {
      logTail = res.text || '';
      logPath = res.logPath || logPath;
    }
  } catch {}

  latestErrorDetails = [
    `${title}`,
    `Error ID: ${errorId}`,
    `Time: ${timestamp}`,
    `Message: ${message}`,
    `Provider: ${provider}`,
    `Model: ${selectedModel}`,
    `Log: ${logPath}`,
    '',
    'Recent log:',
    logTail || '(log tail unavailable)',
  ].join('\n');

  errorMessage.textContent = `${title}: ${message}`;
  errorMeta.textContent = `Error ID: ${errorId} | ${timestamp}`;
  errorPanel.hidden = false;
  showToast(`${title}: ${message} | Error ID: ${errorId}`, 'error');
  window.electronAPI.logEvent('renderer.error.visible', { errorId, title, message, provider, model: selectedModel });
}

async function copyLatestError() {
  if (!latestErrorDetails) return;
  try {
    await navigator.clipboard.writeText(latestErrorDetails);
    showToast('Error details copied', 'success');
  } catch {
    showToast('Copy failed. Error panel text can stay open for manual copy.', 'error');
  }
}
