import React, { useState, useEffect, useRef } from 'react';
import SpeechRecognitionService from '../utils/speechRecognition';
import './SpeechToText.css';

/**
 * Speech Recognition Component
 * Demonstrates how to use SpeechRecognitionService for speech recognition and VAD
 */
const SpeechToText = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isFinal, setIsFinal] = useState(false);
  const [error, setError] = useState(null);
  const [currentStatus, setCurrentStatus] = useState('idle'); // 'idle', 'listening', 'userSpeaking', 'recognizing', 'aiProcessing', 'aiSpeaking'
  
  // 保存语音识别服务实例的引用
  const speechServiceRef = useRef(null);
  
  // Get status text description
  const getStatusText = (status) => {
    switch (status) {
      case 'idle':
        return 'Idle, waiting for voice input';
      case 'listening':
        return 'Waiting for user to speak...';
      case 'userSpeaking':
        return 'User is speaking...';
      case 'recognizing':
        return 'Speech recognition in progress...';
      case 'aiProcessing':
        return 'AI is processing...';
      case 'aiSpeaking':
        return 'AI is responding...';
      default:
        return 'Unknown status';
    }
  };
  
  // 初始化语音识别服务
  useEffect(() => {
    try {
      // 创建语音识别服务实例
      speechServiceRef.current = new SpeechRecognitionService({
        language: 'zh-CN',
        continuous: false,
        interimResults: true,
        silenceThreshold: -50, // 静音检测阈值(dB)
        silenceTime: 1500,     // 静音持续时间(ms)
        
        // 识别结果回调
        onResult: (result) => {
          setTranscript(result.transcript);
          setIsFinal(result.isFinal);
        },
        
        // 语音开始回调
        onSpeechStart: () => {
          console.log('检测到语音开始');
        },
        
        // 语音结束回调
        onSpeechEnd: () => {
          console.log('检测到语音结束');
        },
        
        // 静音回调(句子结束)
        onSilence: () => {
          console.log('检测到静音，句子结束');
          setIsListening(false);
        },
        
        // 错误回调
        onError: (err) => {
          console.error('语音识别错误:', err);
          setError(err.message || '语音识别出错');
          setIsListening(false);
        },
        
        // 状态变化回调
        onStatusChange: (status) => {
          console.log('语音识别状态变化:', status);
          setCurrentStatus(status);
          
          // 当状态为listening时，更新isListening状态
          if (status === 'listening' || status === 'userSpeaking' || status === 'recognizing') {
            setIsListening(true);
          } else if (status === 'idle') {
            setIsListening(false);
          }
        },
        
        // 发送到AI的回调
        onSendToAI: (data) => {
          console.log('发送数据到AI:', data);
          
          // 模拟调用AI服务
          console.log('模拟AI服务处理中...');
          
          // 延迟2秒，模拟AI处理时间
          setTimeout(() => {
            // 模拟AI响应结束
            if (speechServiceRef.current) {
              speechServiceRef.current.setAiSpeaking(true);
              
              // 模拟AI说话3秒
              setTimeout(() => {
                if (speechServiceRef.current) {
                  speechServiceRef.current.setAiSpeaking(false);
                }
              }, 3000);
            }
          }, 2000);
        }
      });
      
      // 组件卸载时清理资源
      return () => {
        if (speechServiceRef.current) {
          speechServiceRef.current.stop();
          speechServiceRef.current = null;
        }
      };
    } catch (err) {
      console.error('初始化语音识别服务失败:', err);
      setError(err.message || '初始化语音识别服务失败');
    }
  }, []);
  
  // 开始/停止语音识别
  const toggleListening = async () => {
    if (!speechServiceRef.current) {
      setError('语音识别服务未初始化');
      return;
    }
    
    try {
      if (isListening) {
        // 停止识别
        speechServiceRef.current.stop();
      } else {
        // 开始新的识别
        setTranscript('');
        setIsFinal(false);
        setError(null);
        
        // 启动识别
        await speechServiceRef.current.start();
      }
    } catch (err) {
      console.error('切换语音识别状态失败:', err);
      setError(err.message || '切换语音识别状态失败');
    }
  };
  
  // 手动模拟AI说话状态
  const simulateAiSpeaking = () => {
    if (!speechServiceRef.current) return;
    
    // 设置AI开始说话
    speechServiceRef.current.setAiSpeaking(true);
    
    // 3秒后结束
    setTimeout(() => {
      if (speechServiceRef.current) {
        speechServiceRef.current.setAiSpeaking(false);
      }
    }, 3000);
  };
  
  return (
    <div className="speech-to-text-container">
      <h2>Speech Recognition</h2>
      
      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}
      
      <div className="status-display">
        <div className={`status-indicator-large ${currentStatus}`}>
          {getStatusText(currentStatus)}
        </div>
      </div>
      
      <div className="controls">
        <button 
          onClick={toggleListening}
          className={`listen-button ${isListening ? 'listening' : ''}`}
          disabled={currentStatus === 'aiProcessing' || currentStatus === 'aiSpeaking'}
        >
          {isListening ? 'Stop Recognition' : 'Start Recognition'}
        </button>
        
        {/* Demo AI response button */}
        <button 
          onClick={simulateAiSpeaking}
          className="ai-response-button"
          disabled={isListening || currentStatus === 'aiProcessing' || currentStatus === 'aiSpeaking'}
        >
          Simulate AI Response
        </button>
      </div>
      
      <div className="transcript-container">
        <h3>Recognition Results:</h3>
        <div className={`transcript ${isFinal ? 'final' : ''}`}>
          {transcript || '(No recognition results)'}
        </div>
        <div className="transcript-status">
          {isFinal ? 'Final Result' : isListening ? 'Interim Result' : ''}
        </div>
      </div>
      
      <div className="instructions">
        <h3>说明:</h3>
        <ul>
          <li>点击"开始识别"按钮开始语音识别</li>
          <li>说完一句话后停顿，系统会自动检测句子结束</li>
          <li>检测到句子结束后，会自动停止识别并处理结果</li>
          <li>系统会显示不同状态：空闲、等待输入、用户说话中、语音识别中、AI处理中、AI回复中</li>
          <li>点击"模拟AI响应"按钮可以测试AI响应状态</li>
        </ul>
      </div>
    </div>
  );
};

export default SpeechToText; 