import React, { useEffect, useState, useRef } from 'react';
import './OwlAnimation.css';

const OwlAnimation = ({ emotion, isLoading }) => {
  const [blinkLeft, setBlinkLeft] = useState(false);
  const [blinkRight, setBlinkRight] = useState(false);
  const blinkInterval = useRef(null);
  
  // 随机眨眼动画
  useEffect(() => {
    const startBlinking = () => {
      blinkInterval.current = setInterval(() => {
        // 随机决定是单眼还是双眼眨眼
        const doubleBlink = Math.random() > 0.3;
        
        setBlinkLeft(true);
        if (doubleBlink) setBlinkRight(true);
        
        // 眨眼动画结束后重置状态
        setTimeout(() => {
          setBlinkLeft(false);
          if (doubleBlink) setBlinkRight(false);
        }, 200);
        
      }, Math.random() * 3000 + 2000); // 随机间隔2-5秒
    };
    
    startBlinking();
    
    return () => {
      if (blinkInterval.current) {
        clearInterval(blinkInterval.current);
      }
    };
  }, []);
  
  // 根据不同情绪状态展示不同的表情
  const getEmotionState = () => {
    if (isLoading) return 'thinking';
    if (!emotion) return 'neutral';
    
    // 根据情绪设置表情
    switch(emotion.toLowerCase()) {
      case 'happy':
      case '快乐':
      case 'positive':
      case '积极':
        return 'happy';
      case 'sad':
      case '悲伤':
      case 'negative':
      case '消极':
        return 'sad';
      case 'angry':
      case '愤怒':
      case 'boring':
      case '无聊':
        return 'boring';
      case 'neutral':
      case '中性':
      case 'normal':
      case '正常':
        return 'neutral';
      default:
        return 'neutral';
    }
  };
  
  const emotionState = getEmotionState();
  
  return (
    <div className="owl-section">
      <div className="character-container">
        <div className={`character ${emotionState}`}>
          {/* 身体基础 */}
          <div className="character-body">
            <div className="feathers"></div>
            <div className="feather-pattern"></div>
          </div>
          
          {/* 翅膀 */}
          <div className="wings">
            <div className="wing left"></div>
            <div className="wing right"></div>
          </div>
          
          {/* 脸部和表情 */}
          <div className="character-face">
            {/* 眼睛 */}
            <div className="character-eyes">
              <div className={`character-eye left ${blinkLeft ? 'blink' : ''}`}>
                <div className="eye-outline"></div>
                <div className="eye-iris"></div>
                <div className="eye-pupil"></div>
                <div className="eye-highlight"></div>
                <div className="eye-highlight-2"></div>
                <div className="eye-lid"></div>
              </div>
              <div className={`character-eye right ${blinkRight ? 'blink' : ''}`}>
                <div className="eye-outline"></div>
                <div className="eye-iris"></div>
                <div className="eye-pupil"></div>
                <div className="eye-highlight"></div>
                <div className="eye-highlight-2"></div>
                <div className="eye-lid"></div>
              </div>
            </div>
            
            {/* 眉毛 */}
            <div className="character-eyebrows">
              <div className="character-eyebrow left"></div>
              <div className="character-eyebrow right"></div>
            </div>
            
            {/* 嘴巴/喙 */}
            <div className="character-mouth"></div>
          </div>
          
          {/* 脚爪 */}
          <div className="feet">
            <div className="foot left"></div>
            <div className="foot right"></div>
          </div>
        </div>
      </div>
      
      {/* 思考中指示器 */}
      {isLoading && (
        <div className="thinking-indicator">
          <span>思考中</span>
          <span className="dots">
            <span className="dot">.</span>
            <span className="dot">.</span>
            <span className="dot">.</span>
          </span>
        </div>
      )}
      
      {/* 隐藏的眨眼控制器 */}
      <div className="blink-controller"></div>
    </div>
  );
};

export default OwlAnimation; 