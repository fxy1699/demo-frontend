import React, { useState, useEffect } from 'react';
import './StatusBar.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWifi } from '@fortawesome/free-solid-svg-icons';

const StatusBar = ({ cameraEnabled, theme = 'dark' }) => {
  const [currentTime, setCurrentTime] = useState('');
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [isCharging, setIsCharging] = useState(false);

  // Update time every minute
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      // Format as HH:MM with leading zeros
      setCurrentTime(`${hours < 10 ? '0' + hours : hours}:${minutes < 10 ? '0' + minutes : minutes}`);
    };

    updateTime(); // Initial update
    const intervalId = setInterval(updateTime, 15000); // Update every 15 seconds

    return () => clearInterval(intervalId);
  }, []);

  // Get battery status if available
  useEffect(() => {
    const getBatteryInfo = async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await navigator.getBattery();
          const updateBatteryStatus = () => {
            setBatteryLevel(Math.floor(battery.level * 100));
            setIsCharging(battery.charging);
          };

          updateBatteryStatus(); // Initial update
          
          // Add event listeners for battery status changes
          battery.addEventListener('levelchange', updateBatteryStatus);
          battery.addEventListener('chargingchange', updateBatteryStatus);

          return () => {
            battery.removeEventListener('levelchange', updateBatteryStatus);
            battery.removeEventListener('chargingchange', updateBatteryStatus);
          };
        } catch (error) {
          console.error('Error accessing battery status:', error);
        }
      }
    };

    getBatteryInfo();
  }, []);

  return (
    <div className={`status-bar ${theme}`}>
      <div className="dynamic-island">
        <div className="dynamic-island-content">
          <div className="camera-notch"></div>
        </div>
      </div>
      <div className="status-left">
        <span className="time">{currentTime}</span>
      </div>
      <div className="status-right">
        {cameraEnabled && <div className="camera-indicator"></div>}
        <div className="wifi-icon ios-style">
          <FontAwesomeIcon icon={faWifi} />
        </div>
        <div className={`battery ${isCharging ? 'charging' : ''}`}>
          <div className="battery-level" style={{ width: `${batteryLevel}%` }}></div>
          <span className="battery-percentage">{batteryLevel}</span>
        </div>
      </div>
    </div>
  );
};

export default StatusBar; 