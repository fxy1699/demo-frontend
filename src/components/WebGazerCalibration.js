import React, { useState, useRef, useEffect, useContext } from 'react';
// 删除 webgazer 导入
// import webgazer from 'webgazer';
import './WebGazerCalibration.css';
import { WebGazerContext } from '../App';

const WebGazerCalibration = ({ buttonStyle }) => {
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationStep, setCalibrationStep] = useState(0);
  const calibrationPointRef = useRef(null);
  const [calibrationError, setCalibrationError] = useState(null);
  const [showOverlay, setShowOverlay] = useState(false);
  
  // Get access to the WebGazerContext
  const webGazerContext = useContext(WebGazerContext);
  
  // Update context when calibration state changes
  useEffect(() => {
    if (webGazerContext) {
      webGazerContext.setCalibrating(isCalibrating);
    }
  }, [isCalibrating, webGazerContext]);
  
  // 修改校准点位置，确保它们不会太靠近屏幕边缘
  const [calibrationPoints, setCalibrationPoints] = useState([
    { x: 20, y: 20 },    // 左上角
    { x: 80, y: 20 },    // 右上角
    { x: 20, y: 80 },    // 左下角
    { x: 80, y: 80 },    // 右下角
    { x: 50, y: 50 }     // 中心点
  ]);
  
  // 检测浏览器是否支持摄像头
  useEffect(() => {
    const checkCameraSupport = async () => {
      try {
        // 判断浏览器是否支持 getUserMedia
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCalibrationError('您的浏览器不支持摄像头访问，眼动追踪功能可能无法使用。');
          return;
        }
        
        // Only check camera access when calibration is started and context allows it
        if (isCalibrating && webGazerContext?.calibrating) {
          await navigator.mediaDevices.getUserMedia({ video: true });
        }
      } catch (error) {
        console.error('摄像头访问失败:', error);
        setCalibrationError('无法访问摄像头，请确保已授予摄像头权限并重试。');
        // Stop calibration if camera access fails
        setIsCalibrating(false);
      }
    };
    
    checkCameraSupport();
  }, [isCalibrating, webGazerContext?.calibrating]);
  
  // 开始校准
  const startCalibration = () => {
    // 清除任何之前的错误
    setCalibrationError(null);
    
    // 检查 webgazer 是否已加载
    if (!window.webgazer) {
      setCalibrationError('webgazer 未能正确加载，请刷新页面后重试。');
      console.error('webgazer 对象未定义，请确保已正确加载 webgazer.js');
      return;
    }
    
    try {
      setIsCalibrating(true);
      setCalibrationStep(0);
      setShowOverlay(true);
      
      // 确保 WebGazer 已初始化
      if (typeof window.webgazer.isReady === 'function' && !window.webgazer.isReady()) {
        window.webgazer.begin();
      }
      
      // 显示视频预览以帮助用户定位
      window.webgazer.showVideoPreview(true);
      window.webgazer.showPredictionPoints(true);
      
      // Set the WebGazerContext calibrating state to true instead of direct DOM manipulation
      if (webGazerContext) {
        webGazerContext.setCalibrating(true);
      }
    } catch (error) {
      console.error('校准初始化失败:', error);
      setCalibrationError('初始化眼动追踪失败，请刷新页面后重试。');
      setIsCalibrating(false);
    }
  };
  
  // 移动到下一个校准点
  const nextCalibrationStep = () => {
    if (calibrationStep < calibrationPoints.length - 1) {
      setCalibrationStep(calibrationStep + 1);
    } else {
      // 校准完成
      finishCalibration();
    }
  };
  
  // 完成校准
  const finishCalibration = () => {
    setIsCalibrating(false);
    setShowOverlay(false);
    
    // 隐藏视频预览和预测点
    if (window.webgazer) {
      try {
        window.webgazer.showVideoPreview(false);
        window.webgazer.showPredictionPoints(true); // Keep showing prediction points
        
        // 保存校准数据
        if (typeof window.webgazer.saveDataAcrossSessions === 'function') {
          window.webgazer.saveDataAcrossSessions(true);
        }
      } catch (error) {
        console.error('完成校准时出错:', error);
      }
    }
    
    // Use the WebGazerContext instead of direct DOM manipulation
    if (webGazerContext) {
      webGazerContext.setCalibrating(false);
    }
  };
  
  // 使用当前点进行校准
  const calibratePoint = (e) => {
    // 阻止事件冒泡和默认行为
    e.preventDefault();
    e.stopPropagation();
    
    if (!window.webgazer) {
      console.error('webgazer 对象未定义，请确保已正确加载 webgazer.js');
      setCalibrationError('校准失败，webgazer未正确加载。');
      return;
    }
    
    try {
      const point = e.currentTarget; // 使用 currentTarget 而不是 target 确保我们始终获取到整个校准点元素
      const rect = point.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      
      console.log(`校准点击: x=${x}, y=${y}`); // 调试信息
      
      // 为当前点添加多个校准点击
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          window.webgazer.recordScreenPosition(x, y, 'click');
        }, i * 50);
      }
      
      // 短暂延迟后移动到下一点
      setTimeout(() => {
        nextCalibrationStep();
      }, 300);
    } catch (error) {
      console.error('校准点击处理失败:', error);
      setCalibrationError('校准过程中出错，请重试。');
    }
  };
  
  // 取消校准
  const cancelCalibration = () => {
    setIsCalibrating(false);
    setShowOverlay(false);
    if (window.webgazer) {
      try {
        window.webgazer.showVideoPreview(false);
        window.webgazer.showPredictionPoints(true); // Keep showing prediction points
      } catch (error) {
        console.error('取消校准时出错:', error);
      }
    }
    
    // Use the WebGazerContext instead of direct DOM manipulation
    if (webGazerContext) {
      webGazerContext.setCalibrating(false);
    }
  };

  // 关闭眼动追踪
  const closeEyeTracking = () => {
    if (window.webgazer) {
      try {
        window.webgazer.end();
        window.webgazer.showVideoPreview(false);
        window.webgazer.showPredictionPoints(false);
      } catch (error) {
        console.error('关闭眼动追踪时出错:', error);
      }
    }
    setShowOverlay(false);
    setIsCalibrating(false);
    if (webGazerContext) {
      webGazerContext.setCalibrating(false);
    }
  };
  
  // 获取当前校准点的位置样式
  const getCurrentPointStyle = () => {
    const point = calibrationPoints[calibrationStep];
    return {
      left: `${point.x}%`,
      top: `${point.y}%`
    };
  };
  
  return (
    <div className="webgazer-calibration">
      {calibrationError && (
        <div className="calibration-error">
          <p>{calibrationError}</p>
        </div>
      )}
      
      {!isCalibrating ? (
        <button className={buttonStyle || "calibration-button"} onClick={startCalibration} disabled={!!calibrationError}>
          <i className="fas fa-eye"></i>
        </button>
      ) : (
        <div className="calibration-container">
          <div className="calibration-overlay">
            <div 
              className="calibration-point" 
              style={getCurrentPointStyle()} 
              onClick={calibratePoint}
              ref={calibrationPointRef}
              tabIndex="0" // 使元素可聚焦
              role="button" // 辅助功能角色
              aria-label={`校准点 ${calibrationStep + 1}`} // 辅助功能标签
            >
              <div className="inner-point"></div>
            </div>
            <div className="calibration-instructions">
              <p>请盯着红点，然后点击它（当前第 {calibrationStep + 1} 个点，共 {calibrationPoints.length} 个）</p>
              <button className="cancel-button" onClick={cancelCalibration}>
                取消校准
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add close button for eye tracking */}
      {showOverlay && !isCalibrating && (
        <div className="eye-tracking-controls">
          <button className="close-eye-tracking" onClick={closeEyeTracking}>
            <i className="fas fa-times"></i> Exit Eye Tracking
          </button>
        </div>
      )}
    </div>
  );
};

export default WebGazerCalibration; 