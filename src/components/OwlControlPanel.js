import React, { useState, useEffect, useRef } from 'react';
import OwlImageAnimation from './OwlImageAnimation';
import OwlControls from './OwlControls';
import './OwlControlPanel.css';

const OwlControlPanel = ({ controls: propControls, onSaveConfig }) => {
  // 使用ref来存储之前的props值，避免循环依赖
  const prevPropControlsRef = useRef();
  const fileInputRef = useRef(null);
  
  // 定义猫头鹰控制状态，使用传入的配置或默认配置
  const defaultControls = {
    // 整体控制
    overall: { scale: 1 },
    // 各部分控制
    body: { visible: true, scale: 1, x: 0, y: 0, rotation: 0 },
    wings: { 
      visible: true, 
      leftWing: { scale: 1, x: 0, y: 0, rotation: 0 },
      rightWing: { scale: 1, x: 0, y: 0, rotation: 0 }
    },
    eyes: { 
      visible: true,
      leftEye: { 
        scale: 1, x: 0, y: 0, rotation: 0,
        pupilScale: 1, pupilX: 0, pupilY: 0,
        bluePupilVisible: true,
        bluePupilScale: 1, bluePupilX: 0, bluePupilY: 0, bluePupilRotation: 0
      },
      rightEye: { 
        scale: 1, x: 0, y: 0, rotation: 0,
        pupilScale: 1, pupilX: 0, pupilY: 0,
        bluePupilVisible: true,
        bluePupilScale: 1, bluePupilX: 0, bluePupilY: 0, bluePupilRotation: 0
      },
      eyelids: {
        visible: true,
        leftEyelid: { scale: 1, x: 0, y: 0, rotation: 0 },
        rightEyelid: { scale: 1, x: 0, y: 0, rotation: 0 }
      }
    },
    eyebrows: {
      visible: true,
      leftEyebrow: { scale: 1, x: 0, y: 0, rotation: 0 },
      rightEyebrow: { scale: 1, x: 0, y: 0, rotation: 0 }
    },
    beak: { visible: true, scale: 1, x: 0, y: 0, rotation: 0 },
    feet: { visible: true, scale: 1, x: 0, y: 0, rotation: 0 },
    // 眨眼动画控制
    blinkAnimation: { enabled: true, interval: { min: 2000, max: 5000 }, duration: 200 }
  };
  
  const [owlControls, setOwlControls] = useState(propControls || defaultControls);

  // 当props.controls变化时更新本地状态
  useEffect(() => {
    // 只有当propControls真实变化时才更新状态
    const prevPropControls = prevPropControlsRef.current;
    
    if (propControls && 
        (!prevPropControls || 
          JSON.stringify(propControls) !== JSON.stringify(prevPropControls))) {
      setOwlControls(propControls);
      prevPropControlsRef.current = propControls;
    }
  }, [propControls]);

  // 当控制面板更新时的回调
  const handleControlsChange = (newControls) => {
    setOwlControls(newControls);
    // 如果父组件提供了保存配置的回调，则调用
    if (onSaveConfig) {
      onSaveConfig(newControls);
    }
  };

  // 当需要保存配置时的回调
  const handleSaveConfig = () => {
    // 如果父组件提供了保存配置的回调，则调用
    if (onSaveConfig) {
      onSaveConfig(owlControls);
    }
  };

  return (
    <div className="owl-control-panel">
      <h2 className="panel-title">Owl Control Panel</h2>
      
      <div className="panel-content">
        <div className="owl-preview">
          <div className="owl-preview-container">
            <OwlImageAnimation 
              emotion="neutral" 
              controls={owlControls} 
            />
          </div>
        </div>
        
        <div className="controls-container">
          <OwlControls 
            controls={owlControls} 
            onChange={handleControlsChange}
            onSave={handleSaveConfig}
          />
        </div>
      </div>
    </div>
  );
};

export default OwlControlPanel; 