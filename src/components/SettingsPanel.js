import React, { useState, useEffect } from 'react';
import './SettingsPanel.css';
import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../config';
import ModelSelector from './ModelSelector';
import WebGazerCalibration from './WebGazerCalibration';
import BackendToggle from './BackendToggle';

const SettingsPanel = ({ 
  captureInterval = 3000, 
  onSave, 
  onClose, 
  onTestModeToggle, 
  testMode,
  backendStatus,
  onStartBackend,
  showCameraPreview = true,
  onCameraPreviewToggle,
  backgroundImage = 'home-1.jpg'
}) => {
  const [interval, setInterval] = useState(captureInterval);
  const [isStartingBackend, setIsStartingBackend] = useState(false);
  const [selectedBackground, setSelectedBackground] = useState(backgroundImage);
  const [activeTab, setActiveTab] = useState('general');
  const [prompts, setPrompts] = useState('');
  // const [selectedPromptCategory, setSelectedPromptCategory] = useState('system');
  // const [selectedPromptType, setSelectedPromptType] = useState('');
  const [editingPrompt, setEditingPrompt] = useState('');
  
  // Check stored IQ level in localStorage
  const storedIqLevel = localStorage.getItem('iqLevel');
  console.log(`[DEBUG] Initial localStorage iqLevel value: '${storedIqLevel}'`);
  
  const [iqLevel, setIqLevel] = useState(storedIqLevel || 'grownup'); // Default to grown-up
  
  console.log(`[DEBUG] SettingsPanel initialized with iqLevel: '${iqLevel}'`);
  
  const [loading, setLoading] = useState(false);
  
  // Fetch prompts from backend
  useEffect(() => {
    const fetchPrompts = async () => {
      if (backendStatus.isConnected) {
        try {
          setLoading(true);
          const response = await axios.get(`${API_BASE_URL}/api/prompts`);
          setPrompts(response.data);
          
          // Set default selected prompt type if prompts are loaded
          // if (response.data.system && Object.keys(response.data.system).length > 0) {
          //   setSelectedPromptType(Object.keys(response.data.system)[0]);
          //   setEditingPrompt(response.data.system[Object.keys(response.data.system)[0]]);
          // }
        } catch (error) {
          console.error('Failed to fetch prompts:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    
    fetchPrompts();
  }, [backendStatus.isConnected]);
  
  // Add effect to debug IQ level changes
  useEffect(() => {
    console.log(`[DEBUG] SettingsPanel - iqLevel state changed to: '${iqLevel}'`);
  }, [iqLevel]);
  
  // Update editing prompt when category or type changes
  // useEffect(() => {
  //   if (prompts[selectedPromptCategory] && selectedPromptType) {
  //     setEditingPrompt(prompts[selectedPromptCategory][selectedPromptType] || '');
  //   }
  // }, [selectedPromptCategory, selectedPromptType, prompts]);
  
  const backgroundOptions = [
    { value: 'home-1.jpg', label: 'Background 1' },
    { value: 'home-2.jpg', label: 'Background 2' },
    { value: 'home-3.jpg', label: 'Background 3' },
    { value: 'home-4.jpeg', label: 'Background 4' }
  ];
  
  const handleSave = () => {
    // Save settings to localStorage for persistence
    localStorage.setItem('captureInterval', interval);
    localStorage.setItem('iqLevel', iqLevel);
    
    // Add debugging log for IQ level saving
    console.log(`[DEBUG] Saving settings: interval=${interval}, background=${selectedBackground}, iqLevel=${iqLevel}`);
    console.log(`[DEBUG] Writing to localStorage: iqLevel=${iqLevel}`);
    
    // Verify localStorage was updated
    setTimeout(() => {
      const verifyIqLevel = localStorage.getItem('iqLevel');
      console.log(`[DEBUG] Verifying localStorage after save: iqLevel='${verifyIqLevel}'`);
    }, 100);
    
    onSave({
      captureInterval: interval,
      backgroundImage: selectedBackground,
      iqLevel: iqLevel
    });
  };
  
  const handleCheckBackend = async () => {
    setIsStartingBackend(true);
    await onStartBackend();
    setIsStartingBackend(false);
  };

  const handleCameraPreviewClick = () => {
    onCameraPreviewToggle(!showCameraPreview);
  };
  
  const handleSavePrompt = async () => {
    if (!editingPrompt) {
      return;
    }
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/prompts/update`, {
        // category: selectedPromptCategory,
        // type: selectedPromptType,
        text: editingPrompt
      });
      
      if (response.data.success) {
        // Update local state
        setPrompts(prev => (editingPrompt));
        
        alert('Prompt updated successfully');
      }
    } catch (error) {
      console.error('Failed to update prompt:', error);
      alert('Failed to update prompt. Please try again.');
    }
  };
  
  const renderPromptEditor = () => {
    return (
      
      <div className="prompt-editor">
        {/* <div className="prompt-selector"> */}
          {/* <div className="prompt-category">
            <label>Prompt Category:</label>
            <select 
              value={selectedPromptCategory}
              onChange={(e) => {
                setSelectedPromptCategory(e.target.value);
                if (prompts[e.target.value]) {
                  const firstKey = Object.keys(prompts[e.target.value])[0];
                  setSelectedPromptType(firstKey);
                }
              }}
            >
              <option value="system">System Prompts</option>
              <option value="emotion">Emotion Analysis</option>
              <option value="frontend">Frontend Prompts</option>
            </select>
          </div> */}
          
          {/* <div className="prompt-type">
            <label>Prompt Type:</label>
            <select 
              value={selectedPromptType}
              onChange={(e) => setSelectedPromptType(e.target.value)}
            >
              {prompts[selectedPromptCategory] && 
                Object.keys(prompts[selectedPromptCategory]).map(key => (
                  <option key={key} value={key}>{key}</option>
                ))}
            </select>
          </div> */}
        {/* </div> */}
        
        <div className="prompt-text-editor">
          <textarea 
            value={editingPrompt}
            onChange={(e) => setEditingPrompt(e.target.value)}
            rows={10}
            placeholder="Edit system prompt here..."
          />
          
          <button 
            className="save-prompt-button"
            onClick={handleSavePrompt}
            // disabled={!selectedPromptCategory || !selectedPromptType}
          >
            Save Prompt
          </button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h2>设置</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      
      <div className="settings-tab-bar">
        <button 
          className={`settings-tab ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          General
        </button>
        <button 
          className={`settings-tab ${activeTab === 'prompts' ? 'active' : ''}`}
          onClick={() => setActiveTab('prompts')}
        >
          Prompts
        </button>
        <button 
          className={`settings-tab ${activeTab === 'appearance' ? 'active' : ''}`}
          onClick={() => setActiveTab('appearance')}
        >
          Appearance
        </button>
        <button 
          className={`settings-tab ${activeTab === 'advanced' ? 'active' : ''}`}
          onClick={() => setActiveTab('advanced')}
        >
          Advanced
        </button>
      </div>
      
      <div className="settings-content">
        {activeTab === 'general' && (
          <>
            <div className="settings-section">
              <h3>后端连接</h3>
              
              <div className="setting-item">
                <div className="backend-status">
                  <span className={`status-indicator ${backendStatus.isConnected ? 'connected' : 'disconnected'}`}></span>
                  <span className="status-text">{backendStatus.message}</span>
                </div>
                
                <button 
                  className="start-backend-button"
                  onClick={handleCheckBackend}
                  disabled={backendStatus.isConnected || isStartingBackend}
                >
                  {isStartingBackend ? 'Starting backend...' : 'Start backend service'}
                </button>
                <span className="setting-description">
                  Start the multimodal backend service to interact with the user
                </span>
              </div>
            </div>
            
            {backendStatus.isConnected && (
              <div className="settings-section">
                <ModelSelector />
              </div>
            )}
            
            <div className="settings-section">
              <h3>Camera Settings</h3>
              
              <div className="setting-item">
                <label htmlFor="capture-interval">Auto-capture interval (ms):</label>
                <input 
                  id="capture-interval"
                  type="number"
                  min="1000"
                  max="10000"
                  step="500"
                  value={interval}
                  onChange={(e) => setInterval(parseInt(e.target.value))}
                />
                <span className="setting-description">
                  When camera is enabled, images will be automatically captured and analyzed every {interval/1000} seconds
                </span>
              </div>

              <div className="setting-item">
                <button 
                  className={`camera-preview-button ${showCameraPreview ? 'active' : ''}`}
                  onClick={handleCameraPreviewClick}
                >
                  {showCameraPreview ? 'Hide Camera Preview' : 'Show Camera Preview'}
                </button>
                <span className="setting-description">
                  Toggle the visibility of the camera preview window
                </span>
              </div>
            </div>

            <div className="settings-section">
              <h3>Eye Tracking Settings</h3>
              
              <div className="setting-item">
                <WebGazerCalibration buttonStyle="eye-tracking-button" />
                <span className="setting-description">
                  校准眼动追踪系统以改善猫头鹰的视线跟随效果
                </span>
              </div>
            </div>
            
            <div className="settings-section">
              <h3>IQ Setting</h3>
              
              <div className="setting-item">
                <label htmlFor="iq-slider">Assistant IQ Level:</label>
                <div className="iq-slider-container">
                  <input 
                    id="iq-slider"
                    type="range"
                    min="0"
                    max="3"
                    step="1"
                    value={
                      iqLevel === 'potato' ? 0 :
                      iqLevel === 'kiddo' ? 1 :
                      iqLevel === 'grownup' ? 2 : 3
                    }
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      const newIqLevel = 
                        val === 0 ? 'potato' :
                        val === 1 ? 'kiddo' :
                        val === 2 ? 'grownup' : 'einstein';
                      
                      // Add debugging log for IQ level change
                      console.log(`[DEBUG] IQ level changed to: ${newIqLevel} (value: ${val})`);
                      console.log(`[DEBUG] Before setIqLevel call, current iqLevel: ${iqLevel}`);
                      
                      setIqLevel(newIqLevel);
                      
                      // Log state immediately after update (won't show new value yet due to state batching)
                      console.log(`[DEBUG] After setIqLevel call (before re-render): ${iqLevel}`);
                      
                      // Check after a short delay to confirm state was updated
                      setTimeout(() => {
                        console.log(`[DEBUG] Current IQ level in state after delay: ${iqLevel}`);
                        console.log(`[DEBUG] Current localStorage IQ value: ${localStorage.getItem('iqLevel')}`);
                      }, 100);
                    }}
                    className="iq-slider"
                  />
                  <div className="iq-labels">
                    <span className={iqLevel === 'potato' ? 'active' : ''}>Potato (IQ 10)</span>
                    <span className={iqLevel === 'kiddo' ? 'active' : ''}>Kiddo (IQ 50)</span>
                    <span className={iqLevel === 'grownup' ? 'active' : ''}>Grown-up (IQ 100)</span>
                    <span className={iqLevel === 'einstein' ? 'active' : ''}>Einstein (IQ 200)</span>
                  </div>
                </div>
                <span className="setting-description">
                  Adjust the IQ level of the AI assistant's responses
                </span>
                
                <div className="debug-info" style={{ 
                  marginTop: '10px', 
                  padding: '5px', 
                  backgroundColor: '#f0f0f0', 
                  border: '1px solid #ccc',
                  borderRadius: '3px',
                  fontSize: '12px' 
                }}>
                  <strong>Debug Info:</strong><br />
                  Current IQ level: {iqLevel}<br />
                  localStorage IQ value: {localStorage.getItem('iqLevel') || 'not set'}<br />
                  Selected slider value: {
                    iqLevel === 'potato' ? '0' :
                    iqLevel === 'kiddo' ? '1' :
                    iqLevel === 'grownup' ? '2' : 
                    iqLevel === 'einstein' ? '3' : 'unknown'
                  }
                </div>
              </div>
            </div>
          </>
        )}
        
        {activeTab === 'prompts' && (
          <div className="settings-section">
            <h3>System Prompt Editor</h3>
            {loading ? (
              <p>Loading prompts...</p>
            ) : (
              renderPromptEditor()
            )}
            <span className="setting-description">
              Customize the AI prompts used by the system
            </span>
          </div>
        )}
        
        {activeTab === 'appearance' && (
          <div className="settings-section">
            <h3>Appearance</h3>
            
            <div className="setting-item">
              <label htmlFor="background-select">Background Image:</label>
              <div className="background-options">
                {backgroundOptions.map((option) => (
                  <div
                    key={option.value}
                    className={`background-option ${selectedBackground === option.value ? 'selected' : ''}`}
                    onClick={() => setSelectedBackground(option.value)}
                    style={{
                      backgroundImage: `url(${process.env.PUBLIC_URL}/background-img/${option.value})`
                    }}
                  >
                    <span className="background-label">{option.label}</span>
                  </div>
                ))}
              </div>
              <span className="setting-description">
                Select a background image for the app
              </span>
            </div>
          </div>
        )}
        
        {activeTab === 'advanced' && (
          <div className="settings-section">
            <h3>高级选项</h3>
            
            {/* Add HTTPS/HTTP warning message */}
            <div className="settings-warning" style={{
              padding: '10px',
              marginBottom: '15px',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffeeba',
              borderRadius: '4px',
              color: '#856404'
            }}>
              <strong>Mixed Content Warning</strong>
              <p>Your backend is running on HTTP (<code>http://172.208.104.103:8080</code>) while your frontend is running on HTTPS. Browsers block this "mixed content" by default.</p>
              
              <p><strong>Solutions:</strong></p>
              <ol>
                <li><strong>Use HTTP instead:</strong> Access the site via <code>http://skyris-ai-prod.vercel.app</code> instead of HTTPS</li>
                <li><strong>Allow insecure content:</strong> In your browser, look for a shield icon in the URL bar and click to allow insecure content for this site</li>
                <li><strong>For Chrome:</strong> Click the lock icon → Site settings → Insecure content → Allow</li>
                <li><strong>For Firefox:</strong> Click the lock icon with the slash → Disable protection for now</li>
                <li><strong>For production:</strong> Set up HTTPS on your backend with proper SSL certificates</li>
              </ol>
            </div>
            
            <div className="setting-item">
              <button 
                className={`test-mode-button ${testMode ? 'active' : ''}`}
                onClick={onTestModeToggle}
              >
                {testMode ? '退出测试模式' : '进入测试模式'}
              </button>
              <span className="setting-description">
                在测试模式中可以调整猫头鹰的外观和行为
              </span>
            </div>

            <BackendToggle />
          </div>
        )}
      </div>
      
      <div className="settings-footer">
        <button className="save-button" onClick={handleSave}>Save</button>
      </div>
    </div>
  );
};

export default SettingsPanel; 