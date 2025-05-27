import React, { useState, useEffect } from 'react';
import OwlImageAnimation from './OwlImageAnimation';
import OwlControlPanel from './OwlControlPanel';
import './OwlTest.css';

// 默认配置
const defaultControls = {
  // 整体控制
  overall: { scale: 1, zIndex: 1 },
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
      irisScale: 1
    },
    rightEye: { 
      scale: 1, x: 0, y: 0, rotation: 0,
      pupilScale: 1, pupilX: 0, pupilY: 0,
      irisScale: 1
    },
    // 添加眼皮控制
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

const OwlTest = ({ onConfigUpdate, onExitTestMode }) => {
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('emotion'); // 'emotion' 或 'control'
  const [owlControls, setOwlControls] = useState(defaultControls);
  // 添加思考状态持续时间状态
  const [thinkingDuration, setThinkingDuration] = useState(0);
  const [thinkingTimer, setThinkingTimer] = useState(null);
  
  // 初始化时自动加载保存的配置
  useEffect(() => {
    const loadOwlConfig = async () => {
      try {
        // 首先检查localStorage中是否有保存的配置
        const savedConfig = localStorage.getItem('owlControlsConfig');
        if (savedConfig) {
          try {
            const parsedConfig = JSON.parse(savedConfig);
            setOwlControls(parsedConfig);
            console.log("已从localStorage加载保存的配置");
            
            // 通知父组件配置已更新
            if (onConfigUpdate) {
              onConfigUpdate(parsedConfig);
            }
            return; // 如果成功加载了localStorage中的配置，就不再尝试其他方式
          } catch (localStorageError) {
            console.warn('解析localStorage配置失败:', localStorageError);
            // 如果解析失败，继续尝试其他方式加载
          }
        }
        
        // 尝试导入默认配置文件
        try {
          // 导入预先配置的猫头鹰设置
          const owlConfigJson = require('../owl-config.json');
          if (owlConfigJson) {
            console.log("成功从JSON文件加载猫头鹰配置");
            setOwlControls(owlConfigJson);
            
            // 将配置保存到localStorage以备将来使用
            localStorage.setItem('owlControlsConfig', JSON.stringify(owlConfigJson));
            
            // 通知父组件
            if (onConfigUpdate) {
              onConfigUpdate(owlConfigJson);
            }
            return; // 成功后跳过后续步骤
          }
        } catch (error) {
          console.warn('无法通过require加载owl-config.json，尝试fetch:', error);
        }
        
        // 从公共目录获取JSON作为最后的方案
        try {
          const response = await fetch(`${process.env.PUBLIC_URL}/owl-config.json`);
          if (response.ok) {
            const owlConfigJson = await response.json();
            console.log("成功从公共目录加载猫头鹰配置");
            setOwlControls(owlConfigJson);
            
            // 将配置保存到localStorage以备将来使用
            localStorage.setItem('owlControlsConfig', JSON.stringify(owlConfigJson));
            
            // 通知父组件
            if (onConfigUpdate) {
              onConfigUpdate(owlConfigJson);
            }
          }
        } catch (fetchError) {
          console.warn('无法从公共目录获取owl-config.json:', fetchError);
        }
      } catch (generalError) {
        console.error('加载猫头鹰配置时出错:', generalError);
      }
    };
    
    loadOwlConfig();
    // 空依赖数组，仅在组件挂载时执行一次
  }, []);
  
  // 加载保存的配置
  const loadSavedConfig = () => {
    try {
      const savedConfig = localStorage.getItem('owlControlsConfig');
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        setOwlControls(parsedConfig);
        console.log("已加载保存的配置");
        
        // 通知父组件配置已更新
        if (onConfigUpdate) {
          onConfigUpdate(parsedConfig);
        }
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    }
  };
  
  // 当onConfigUpdate改变时更新父组件，但避免无限循环
  useEffect(() => {
    // 仅当onConfigUpdate函数变化时才执行
    // 如果已经有保存的配置，则通知父组件，但不要在此处再次设置本地状态
    const savedConfig = localStorage.getItem('owlControlsConfig');
    if (savedConfig && onConfigUpdate) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        onConfigUpdate(parsedConfig);
      } catch (error) {
        console.error('处理保存配置失败:', error);
      }
    }
  }, [onConfigUpdate]); // 仅依赖onConfigUpdate函数变化
  
  // 保存配置
  const saveConfig = (newConfig) => {
    try {
      localStorage.setItem('owlControlsConfig', JSON.stringify(newConfig));
      setOwlControls(newConfig);
      
      // 通知父组件配置已更新
      if (onConfigUpdate) {
        onConfigUpdate(newConfig);
      }
      
    } catch (error) {
      console.error('保存配置失败:', error);
    }
  };
  
  // 情绪选项
  const emotions = [
    { value: 'neutral', label: 'Neutral' },
    { value: 'happy', label: 'Happy' },
    { value: 'sad', label: 'Sad' },
    { value: 'boring', label: 'Angry/Bored' },
    { value: 'thinking', label: 'Thinking' }
  ];
  
  const handleEmotionChange = (emotion) => {
    // 如果有计时器，先清除
    if (thinkingTimer) {
      clearInterval(thinkingTimer);
      setThinkingTimer(null);
    }
    
    setIsLoading(false);
    setCurrentEmotion(emotion);
    setThinkingDuration(0);
  };

  // 模拟思考状态的切换
  const toggleThinking = () => {
    if (currentEmotion === 'thinking') {
      if (isLoading) {
        // 如果当前正在"思考中"且加载状态开启，则关闭加载状态
        setIsLoading(false);
        
        // 清除计时器
        if (thinkingTimer) {
          clearInterval(thinkingTimer);
          setThinkingTimer(null);
        }
        setThinkingDuration(0);
      } else {
        // 如果当前正在"思考中"但加载状态关闭，则开启加载状态并设置计时器
        setIsLoading(true);
        
        // 设置计时器，模拟思考进度
        const timer = setInterval(() => {
          setThinkingDuration(prev => {
            const newDuration = prev + 1;
            
            // 如果达到模拟最大时间（10秒），自动停止
            if (newDuration >= 10) {
              clearInterval(timer);
              setThinkingTimer(null);
              setIsLoading(false);
              return 0;
            }
            
            return newDuration;
          });
        }, 1000);
        
        setThinkingTimer(timer);
      }
    } else {
      // 如果当前不是"思考中"状态，先切换到"思考中"再启动加载
      setCurrentEmotion('thinking');
      setIsLoading(true);
      
      // 设置计时器，模拟思考进度
      const timer = setInterval(() => {
        setThinkingDuration(prev => {
          const newDuration = prev + 1;
          
          // 如果达到模拟最大时间（10秒），自动停止
          if (newDuration >= 10) {
            clearInterval(timer);
            setThinkingTimer(null);
            setIsLoading(false);
            return 0;
          }
          
          return newDuration;
        });
      }, 1000);
      
      setThinkingTimer(timer);
    }
  };
  
  // 清理计时器
  useEffect(() => {
    return () => {
      if (thinkingTimer) {
        clearInterval(thinkingTimer);
      }
    };
  }, [thinkingTimer]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };
  
  return (
    <div className="owl-test-container">
      <div className="test-header">
        <h1>Owl Test Mode</h1>
        <button 
          className="exit-test-mode-button"
          onClick={onExitTestMode}
        >
          Exit and Return to Home
        </button>
      </div>
      
      <div className="test-tabs">
        <button 
          className={`tab-button ${activeTab === 'emotion' ? 'active' : ''}`}
          onClick={() => handleTabChange('emotion')}
        >
          Emotion Test
        </button>
        <button 
          className={`tab-button ${activeTab === 'control' ? 'active' : ''}`}
          onClick={() => handleTabChange('control')}
        >
          Control Panel
        </button>
      </div>
      
      {activeTab === 'emotion' ? (
        <div className="emotion-test-panel">
          <div className="owl-display">
            <OwlImageAnimation 
              emotion={currentEmotion} 
              isLoading={isLoading} 
              controls={owlControls}
            />
          </div>
          
          <div className="controls-section">
            <div className="emotion-buttons">
              {emotions.map((emotion) => (
                <button
                  key={emotion.value}
                  className={`emotion-button ${currentEmotion === emotion.value && !isLoading ? 'active' : ''}`}
                  onClick={() => handleEmotionChange(emotion.value)}
                >
                  {emotion.label}
                </button>
              ))}
            </div>
            
            <button
              className={`thinking-toggle ${isLoading ? 'active-thinking' : ''}`}
              onClick={toggleThinking}
              title="Simulate thinking loading state"
            >
              {isLoading ? `Thinking (${thinkingDuration}s)` : 'Simulate Thinking'}
            </button>
            
            <div className="emotion-description">
              <h3>Current Emotion: {emotions.find(e => e.value === currentEmotion)?.label || 'Neutral'}</h3>
              <p>
                {currentEmotion === 'happy' ? 'The owl looks very happy!' :
                 currentEmotion === 'sad' ? 'The owl looks a bit sad...' :
                 currentEmotion === 'boring' ? 'The owl looks bored or angry...' :
                 currentEmotion === 'thinking' ? 'The owl is thinking, eyes slightly rotating...' :
                 'The owl\'s expression is calm, in a neutral state.'
                }
              </p>
              {currentEmotion === 'thinking' && (
                <p className="thinking-hint">
                  Tip: Click the "Simulate Thinking" button to test the thinking animation effect
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="control-panel">
          <OwlControlPanel 
            controls={owlControls} 
            onSaveConfig={saveConfig}
          />
        </div>
      )}
    </div>
  );
};

export default OwlTest; 