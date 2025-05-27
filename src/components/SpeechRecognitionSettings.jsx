import React, { useState, useEffect } from 'react';
import './SpeechRecognitionSettings.css';

/**
 * 语音识别设置组件
 * 用于调整语音识别参数
 */
const SpeechRecognitionSettings = ({ 
  settings, 
  onSave, 
  onClose 
}) => {
  // 初始化状态，使用传入的设置或默认值
  const [silenceThreshold, setSilenceThreshold] = useState(settings?.silenceThreshold || -50);
  const [silenceTime, setSilenceTime] = useState(settings?.silenceTime || 1500);
  const [noSpeechTime, setNoSpeechTime] = useState(settings?.noSpeechTime || 10000);
  const [language, setLanguage] = useState(settings?.language || 'zh-CN');
  const [continuous, setContinuous] = useState(settings?.continuous || false);
  const [autoRestart, setAutoRestart] = useState(
    settings?.autoRestart !== undefined ? settings.autoRestart : true
  );
  
  // 支持的语言列表
  const languages = [
    { code: 'zh-CN', name: '中文（简体）' },
    { code: 'en-US', name: '英语（美国）' },
    { code: 'ja-JP', name: '日语' },
    { code: 'ko-KR', name: '韩语' },
    { code: 'fr-FR', name: '法语' },
    { code: 'de-DE', name: '德语' },
    { code: 'it-IT', name: '意大利语' },
    { code: 'es-ES', name: '西班牙语' },
    { code: 'ru-RU', name: '俄语' }
  ];
  
  // 保存设置
  const handleSave = () => {
    const newSettings = {
      silenceThreshold,
      silenceTime,
      noSpeechTime,
      language,
      continuous,
      autoRestart
    };
    
    onSave(newSettings);
  };
  
  // 重置为默认设置
  const handleReset = () => {
    setSilenceThreshold(-50);
    setSilenceTime(1500);
    setNoSpeechTime(10000);
    setLanguage('zh-CN');
    setContinuous(false);
    setAutoRestart(true);
  };
  
  return (
    <div className="speech-recognition-settings">
      <div className="settings-header">
        <h2>Speech Recognition Settings</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      
      <div className="settings-content">
        <div className="settings-section">
          <h3>Basic Settings</h3>
          
          <div className="setting-item">
            <label htmlFor="language">Recognition Language:</label>
            <select 
              id="language" 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
            <span className="setting-description">
              Select the target language for speech recognition
            </span>
          </div>
          
          <div className="setting-item">
            <label htmlFor="continuous">Continuous Recognition Mode:</label>
            <div className="toggle-switch">
              <input
                type="checkbox"
                id="continuous"
                checked={continuous}
                onChange={(e) => setContinuous(e.target.checked)}
              />
              <label htmlFor="continuous"></label>
            </div>
            <span className="setting-description">
              When enabled, recognition will continue after each sentence is completed
            </span>
          </div>
          
          <div className="setting-item">
            <label htmlFor="auto-restart">AI reply and restart recognition:</label>
            <div className="toggle-switch">
              <input
                type="checkbox"
                id="auto-restart"
                checked={autoRestart}
                onChange={(e) => setAutoRestart(e.target.checked)}
              />
              <label htmlFor="auto-restart"></label>
            </div>
            <span className="setting-description">
              When enabled, AI reply will restart the recognition process
            </span>
          </div>
        </div>
        
        <div className="settings-section">
          <h3>Voice Activity Detection (VAD) Settings</h3>
          
          <div className="setting-item">
            <label htmlFor="silence-threshold">Silence Detection Threshold (dB):</label>
            <div className="range-input-container">
              <input 
                id="silence-threshold"
                type="range"
                min="-70"
                max="-30"
                step="1"
                value={silenceThreshold}
                onChange={(e) => setSilenceThreshold(parseInt(e.target.value))}
              />
              <span className="range-value">{silenceThreshold} dB</span>
            </div>
            <span className="setting-description">
              The decibel threshold for silence detection. Lower values are more sensitive and may increase false recognition; higher values are less sensitive and may miss small speech
            </span>
            <div className="threshold-guide">
              <div className="threshold-marker low" title="High sensitivity, suitable for quiet environments">-70 dB (High sensitivity)</div>
              <div className="threshold-marker medium" title="Medium sensitivity, suitable for general environments">-50 dB (Recommended)</div>
              <div className="threshold-marker high" title="Low sensitivity, suitable for noisy environments">-30 dB (Low sensitivity)</div>
            </div>
          </div>
          
          <div className="setting-item">
            <label htmlFor="silence-time">Silence Duration (ms):</label>
            <div className="range-input-container">
              <input 
                id="silence-time"
                type="range"
                min="500"
                max="3000"
                step="100"
                value={silenceTime}
                onChange={(e) => setSilenceTime(parseInt(e.target.value))}
              />
              <span className="range-value">{silenceTime} ms</span>
            </div>
            <span className="setting-description">
              How long silence lasts before being considered a sentence end. Shorter values provide faster response, longer values avoid short pauses in sentences being incorrectly recognized as sentence ends
            </span>
          </div>
          
          <div className="setting-item">
            <label htmlFor="no-speech-time">No Speech Timeout (ms):</label>
            <div className="range-input-container">
              <input 
                id="no-speech-time"
                type="range"
                min="5000"
                max="30000"
                step="1000"
                value={noSpeechTime}
                onChange={(e) => setNoSpeechTime(parseInt(e.target.value))}
              />
              <span className="range-value">{(noSpeechTime / 1000).toFixed(1)} seconds</span>
            </div>
            <span className="setting-description">
              Time for the system to enter sleep mode after no speech input
            </span>
          </div>
        </div>
      </div>
      
      <div className="settings-footer">
        <button className="reset-button" onClick={handleReset}>Reset to default</button>
        <button className="save-button" onClick={handleSave}>Save Settings</button>
      </div>
    </div>
  );
};

export default SpeechRecognitionSettings; 