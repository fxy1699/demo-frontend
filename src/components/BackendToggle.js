import React, { useState, useEffect } from 'react';
import { switchBackend, toggleIpMode, API_BASE_URL } from '../config';

// Modified to be integrated into settings panel instead of standalone
const BackendToggle = () => {
  const [usingPublic, setUsingPublic] = useState(false);
  const [usingAlternateIp, setUsingAlternateIp] = useState(false);
  const [useHttps, setUseHttps] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [displayUrl, setDisplayUrl] = useState(API_BASE_URL);

  useEffect(() => {
    // Check current backend
    try {
      const isPublic = localStorage.getItem('usePublicBackend') === 'true';
      const altIp = localStorage.getItem('useAlternateIp') === 'true';
      // HTTPS is disabled and forced to false
      localStorage.setItem('useHttps', 'false');
      setUsingPublic(isPublic);
      setUsingAlternateIp(altIp);
      setUseHttps(false);
      
      // Ensure the displayed URL always shows http://
      let urlToDisplay = API_BASE_URL;
      if (urlToDisplay.startsWith('https://')) {
        urlToDisplay = 'http://' + urlToDisplay.substring(8);
      }
      setDisplayUrl(urlToDisplay);
    } catch (e) {
      console.error('Error reading localStorage', e);
    }
  }, []);

  const handleToggle = () => {
    const newValue = !usingPublic;
    setUsingPublic(newValue);
    switchBackend(newValue);
  };

  const handleIpToggle = () => {
    toggleIpMode();
    setUsingAlternateIp(!usingAlternateIp);
  };

  // HTTPS toggle is now disabled
  const handleHttpsToggle = () => {
    alert("HTTPS has been disabled due to certificate issues. The application is configured to use HTTP only.");
  };

  // Always force HTTP protocol for display
  const currentProtocol = "http";

  return (
    <div className="settings-section">
      <h3>Backend Connection</h3>
      <div className="settings-field">
        <div className="current-backend">Current: {displayUrl}</div>
        
        {connectionError && (
          <div className="connection-error" style={{color: 'red', marginTop: '5px', fontSize: '12px'}}>
            {connectionError}
          </div>
        )}
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
          <label className="settings-option">
            <input
              type="checkbox"
              checked={usingPublic}
              onChange={handleToggle}
              className="settings-checkbox"
            />
            Use Public Backend
          </label>
          <label className="settings-option">
            <input
              type="checkbox"
              checked={usingAlternateIp}
              onChange={handleIpToggle}
              className="settings-checkbox"
            />
            Use Localhost:8080
          </label>
          <label className="settings-option" style={{opacity: 0.5}}>
            <input
              type="checkbox"
              checked={false}
              onChange={handleHttpsToggle}
              className="settings-checkbox"
              disabled={true}
            />
            Use HTTPS (currently disabled)
          </label>
        </div>
        
        <div style={{marginTop: '10px', fontSize: '12px', color: '#666'}}>
          <p>Current protocol: <strong>{currentProtocol}</strong></p>
          <p style={{color: '#ff6b6b'}}><strong>Note:</strong> HTTPS has been disabled due to certificate errors. The application is configured to use HTTP only.</p>
        </div>
      </div>
    </div>
  );
};

export default BackendToggle; 