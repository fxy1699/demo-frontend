import React, { useState, useEffect, useRef, createContext } from 'react';
import './App.css';
import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from './config';
import OwlImageAnimation from './components/OwlImageAnimation';
import WebGazerCalibration from './components/WebGazerCalibration';
import OwlTest from './components/OwlTest';
import UnifiedChatbox from './components/UnifiedChatbox';
import SettingsPanel from './components/SettingsPanel';
import SpeechRecognitionService from './utils/speechRecognition';
import StatusBar from './components/StatusBar';

// Create a context for the WebGazer state
export const WebGazerContext = createContext(null);

// Create a context for sharing prompts across components
export const PromptContext = createContext({});

// 默认猫头鹰控制配置
const defaultOwlControls = {
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

function App() {
  const [testMode, setTestMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showChatbox, setShowChatbox] = useState(false);
  const [showCameraPreview, setShowCameraPreview] = useState(true);
  const [backgroundImage, setBackgroundImage] = useState('home-1.jpg');
  const [backendStatus, setBackendStatus] = useState({
    isChecking: true,
    isConnected: false,
    message: '正在检查后端连接...'
  });
  const [lastCheckTime, setLastCheckTime] = useState(0);
  const [emotion, setEmotion] = useState('neutral');
  const [loading, setLoading] = useState(false);
  const [owlControls, setOwlControls] = useState(defaultOwlControls);
  const [captureInterval, setCaptureInterval] = useState(3000); // 默认3秒
  const [response, setResponse] = useState(null);
  const [cameraEnabled, setCameraEnabled] = useState(false); // Ensure camera is off by default
  const [audioEnabled, setAudioEnabled] = useState(false);
  const cameraVideoRef = useRef(null);
  const [webGazerCalibrating, setWebGazerCalibrating] = useState(false);
  const [showManualInstructions, setShowManualInstructions] = useState(true);
  const [speechRecognitionStatus, setSpeechRecognitionStatus] = useState('idle'); // 新增：语音识别状态
  
  // 添加表情识别结果状态
  const [emotionAnalysisResult, setEmotionAnalysisResult] = useState(null);
  
  // Get stored IQ level with debug logging
  const storedIqLevel = localStorage.getItem('iqLevel');
  console.log(`[DEBUG] App.js - Initial localStorage iqLevel value: '${storedIqLevel}'`);
  
  const [iqLevel, setIqLevel] = useState(storedIqLevel || 'grownup'); // Get IQ level from localStorage
  
  // Generate a unique session ID for context memory
  const [sessionId, setSessionId] = useState('');
  
  // Generate a session ID on initial app load
  useEffect(() => {
    // Check if we already have a sessionId in localStorage
    const storedSessionId = localStorage.getItem('skyrisSessionId');
    if (storedSessionId) {
      setSessionId(storedSessionId);
      console.log(`[DEBUG] Using existing session ID: ${storedSessionId}`);
    } else {
      // Generate a new unique session ID
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);
      localStorage.setItem('skyrisSessionId', newSessionId);
      console.log(`[DEBUG] Generated new session ID: ${newSessionId}`);
    }
  }, []);
  
  console.log(`[DEBUG] App.js - Component initialized with iqLevel state: '${iqLevel}'`);
  
  // Add effect to monitor changes to iqLevel
  useEffect(() => {
    console.log(`[DEBUG] App.js - iqLevel state changed to: '${iqLevel}'`);
  }, [iqLevel]);
  
  // 语音识别服务的引用
  const speechServiceRef = useRef(null);
  
  // 音频元素引用
  const audioRef = useRef(null);
  
  // 添加一个状态来跟踪AI是否正在说话
  const [aiSpeaking, setAiSpeaking] = useState(false);
  
  // 添加一个状态来跟踪是否启用语音自动打断功能
  const [autoInterruptEnabled, setAutoInterruptEnabled] = useState(true);
  
  // Add a ref for auto-capture interval
  const autoCaptureIntervalRef = useRef(null);
  
  const [prompts, setPrompts] = useState({
    // Default prompts in case fetching fails
    auto_capture: 'Analyze this image',
    default_file_prompt: 'Please analyse this content',
    emotion_analysis_with_image: 'Please look at this image, analyze my current expression, emotion, and possible psychological state. Even if you cannot determine, please give a reasonable guess and response.',
    voice_with_image: 'Here is my voice input: "{transcript}"\nPlease also look at this image and analyze my expression and emotion, and give a reasonable response.',
    // Add specialized prompts for object recognition
    object_recognition: 'Please identify and describe the object in my hand or in the image. Tell me what it is, its features, and its用途。',
    object_query_with_image: 'Here is my voice input: "{transcript}"\nPlease carefully look at the image, identify and describe the object in my hand or in the image.'
  });
  
  // 初始化自动捕获间隔
  const autoCapture = localStorage.getItem('autoCapture') === 'true' || false;
  
  // Function to start the backend server
  const startBackendServer = async () => {
    try {
      setBackendStatus({
        isChecking: true,
        isConnected: false,
        message: 'Checking backend connection...'
      });
      
      console.log('Attempting to check/start backend server...');
      
      // First, check if the backend is already running
      const isConnected = await checkBackendConnection();
      
      if (isConnected) {
        console.log('Backend is already running');
        return;
      }
      
      // Use direct backend URL to start the server
      const startUrl = `${API_BASE_URL}${API_ENDPOINTS.START_BACKEND}`;
      
      console.log(`Attempting to start backend: ${startUrl}`);
      
      try {
        const startResponse = await axios.get(startUrl);
        
        if (startResponse.status === 200) {
          console.log('Backend start request successful');
          
          // Wait a moment for the backend to initialize
          setTimeout(async () => {
            const backendStarted = await checkBackendConnection();
            if (backendStarted) {
              setBackendStatus({
                isChecking: false,
                isConnected: true,
                message: 'Backend started successfully'
              });
            } else {
              setBackendStatus({
                isChecking: false,
                isConnected: false,
                message: 'Backend start request was successful, but connection failed'
              });
              setShowManualInstructions(true);
            }
          }, 3000);
          return;
        }
      } catch (error) {
        console.error('Failed to start backend:', error);
        
        // Check if it's a mixed content error
        if (error.message && (
          error.message.includes('Mixed Content') || 
          error.message.includes('SSL') || 
          error.message.includes('ERR_SSL_PROTOCOL_ERROR') ||
          error.message.includes('ERR_CERT_AUTHORITY_INVALID'))) {
          console.error('Mixed content error when trying to start backend');
        }
      }
      
      // If we reach here, all attempts failed
      console.log('Backend start attempt failed, showing manual instructions');
      
      // If backend is not connected, show instructions
      setBackendStatus({
        isChecking: false,
        isConnected: false,
        message: window.location.protocol === 'https:' ?
          'Mixed content error: Cannot connect to HTTP backend from HTTPS site. Try accessing the site via HTTP instead.' :
          'Backend is not running. Please start it manually.'
      });
      
      setShowManualInstructions(true);
      
    } catch (error) {
      console.error('Error checking/starting backend:', error);
      
      // Provide more specific error message based on error type
      let errorMessage = 'Failed to check backend server, please check network connection';
      if (error.name === 'AbortError') {
        errorMessage = 'Backend server check timeout, please check server status or manually start backend';
      } else if (error.message) {
        errorMessage = `Backend server error: ${error.message}`;
      }
      
      setBackendStatus({
        isChecking: false,
        isConnected: false,
        message: errorMessage
      });
      
      setShowManualInstructions(true);
    }
  };
  
  // Function to check backend connection status
  const checkBackendConnection = async () => {
    try {
      console.log('Checking backend connection...');
      setBackendStatus({
        ...backendStatus,
        isChecking: true,
        message: 'Checking backend connection...'
      });
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

      // Add logging for environment and API URL
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`API Base URL: ${API_BASE_URL}`);
      
      // Instead of using relative URLs, we'll directly target the backend
      // This may result in mixed content warnings, but can be resolved with browser settings
      const healthcheckUrl = `${API_BASE_URL}${API_ENDPOINTS.CHECK_CONNECTION || '/api/healthcheck'}`;
      
      console.log(`Check Connection URL: ${healthcheckUrl}`);
      
      try {
        const response = await axios.get(healthcheckUrl, {
          signal: controller.signal
        }).finally(() => {
          clearTimeout(timeoutId);
        });
        
        if (response.status === 200) {
          console.log('Backend connection check successful');
          setBackendStatus({
            isChecking: false,
            isConnected: true,
            message: 'Backend connection success'
          });
          return true;
        }
        
        console.log('Backend connection check failed, status code:', response.status);
        setBackendStatus({
          isChecking: false,
          isConnected: false,
          message: 'Backend connection failed, service may be abnormal'
        });
        
        // Only show manual instructions in development mode
        if (process.env.NODE_ENV === 'development') {
          setShowManualInstructions(true);
        } else {
          setShowManualInstructions(false);
        }
        
        return false;
      } catch (axiosError) {
        // Handle mixed content errors
        if (axiosError.message && (
            axiosError.message.includes('SSL') || 
            axiosError.message.includes('ERR_SSL_PROTOCOL_ERROR') ||
            axiosError.message.includes('ERR_CERT_AUTHORITY_INVALID') ||
            axiosError.message.includes('Mixed Content')
        )) {
          console.error('Backend connection certificate error:', axiosError.message);
          
          // Determine if we're trying to use HTTPS
          const isHttpsRequest = window.location.protocol === 'https:';
          
          setBackendStatus({
            isChecking: false,
            isConnected: false,
            message: isHttpsRequest ? 
              'Mixed content blocked: Your HTTPS frontend cannot load HTTP backend content.' : 
              'Connection error. Please check if the backend server is running.'
          });
          
          setShowManualInstructions(true);
          return false;
        }
        
        // Re-throw for general error handling
        throw axiosError;
      }
    } catch (error) {
      console.error('Backend connection check exception:', error);
      
      // Check if it's a timeout error
      const errorMessage = error.code === 'ECONNABORTED' || error.name === 'AbortError'
        ? 'Backend connection timeout, service may not be running or unavailable'
        : 'Failed to connect to backend server, please check if service is running';
      
      setBackendStatus({
        isChecking: false,
        isConnected: false,
        message: errorMessage
      });
      
      // Only show manual instructions in development mode
      if (process.env.NODE_ENV === 'development') {
        setShowManualInstructions(true);
      } else {
        setShowManualInstructions(false);
      }
      
      return false;
    }
  };
  
  // 检查后端是否连接
  useEffect(() => {
    checkBackendConnection();
    
    // 不再设置定期检查
    // const intervalId = setInterval(() => {
    //   if (!backendStatus.isConnected) {
    //     checkBackendConnection();
    //   }
    // }, 10000); // Check every 10 seconds if not connected
    
    // return () => clearInterval(intervalId);
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps
  
  // 加载保存的猫头鹰配置
  useEffect(() => {
    const loadOwlConfig = async () => {
      try {
        // 首先尝试从localStorage加载配置
        const savedConfig = localStorage.getItem('owlControlsConfig');
        if (savedConfig) {
          try {
            const parsedConfig = JSON.parse(savedConfig);
            setOwlControls(parsedConfig);
            console.log("在App.js中成功从localStorage加载猫头鹰配置");
            return; // 如果成功加载localStorage配置，跳过后续步骤
          } catch (localStorageError) {
            console.warn('在App.js中解析localStorage配置失败:', localStorageError);
          }
        }
        
        // 如果localStorage中没有配置，尝试从JSON文件加载
        try {
          // 导入预配置的猫头鹰设置
          const owlConfigJson = require('./owl-config.json');
          if (owlConfigJson) {
            console.log("在App.js中成功从JSON文件加载猫头鹰配置");
            setOwlControls(owlConfigJson);
            localStorage.setItem('owlControlsConfig', JSON.stringify(owlConfigJson));
            return; // 加载成功后跳过后续步骤
          }
        } catch (jsonError) {
          console.warn('在App.js中无法通过require加载owl-config.json:', jsonError);
        }
        
        // 最后尝试从公共目录获取JSON
        try {
          const response = await fetch(`${process.env.PUBLIC_URL}/owl-config.json`);
          if (response.ok) {
            const owlConfigJson = await response.json();
            console.log("在App.js中成功从公共目录加载猫头鹰配置");
            setOwlControls(owlConfigJson);
            localStorage.setItem('owlControlsConfig', JSON.stringify(owlConfigJson));
          }
        } catch (fetchError) {
          console.warn('在App.js中无法从公共目录获取owl-config.json:', fetchError);
        }
        
        // 尝试加载设置偏好
        const savedCaptureInterval = localStorage.getItem('captureInterval');
        if (savedCaptureInterval) {
          setCaptureInterval(parseInt(savedCaptureInterval));
        }
      } catch (error) {
        console.error('在App.js中加载配置失败:', error);
      }
    };
    
    loadOwlConfig();
  }, []);
  
  const toggleTestMode = () => {
    const newTestMode = !testMode;
    setTestMode(newTestMode);
    // 当退出测试模式时，确保设置面板是关闭的
    if (!newTestMode) {
      setShowSettings(false);
    }
  };
  
  const toggleSettings = () => {
    setShowSettings(!showSettings);
    if (!showSettings) {
      setShowChatbox(false);
    }
  };
  
  const toggleChatbox = () => {
    setShowChatbox(!showChatbox);
    if (!showChatbox) {
      setShowSettings(false);
      
      // Ensure smooth transition when opening chatbox
      const owlContainer = document.querySelector('.centered-owl-container');
      if (owlContainer) {
        owlContainer.style.transition = 'transform 0.3s ease, top 0.3s ease';
      }
    } else {
      // Ensure smooth transition when closing chatbox
      const owlContainer = document.querySelector('.centered-owl-container');
      if (owlContainer) {
        owlContainer.style.transition = 'transform 0.3s ease, top 0.3s ease';
      }
    }
  };
  
  const handleSaveSettings = (settings) => {
    console.log(`[DEBUG] Received settings in App.js:`, settings);
    console.log(`[DEBUG] IQ level from settings: ${settings.iqLevel}`);
    
    setCaptureInterval(settings.captureInterval);
    if (settings.backgroundImage) {
      setBackgroundImage(settings.backgroundImage);
    }
    if (settings.iqLevel) {
      console.log(`[DEBUG] Setting App.js iqLevel state from: ${iqLevel} to: ${settings.iqLevel}`);
      setIqLevel(settings.iqLevel);
      localStorage.setItem('iqLevel', settings.iqLevel);
    }
    setShowSettings(false);
  };
  
  const handleProcessStart = () => {
    setLoading(true);
    setEmotion('thinking');
    setResponse(null);
  };
  
  const handleProcessEnd = () => {
    setLoading(false);
    if (!response) {
      setEmotion('neutral');
    }
  };
  
  const handleResponse = (result) => {
    setResponse(result);
    
    // 根据结果设置情绪
    if (result) {
      // 使用API返回的情绪标签，现在情绪标签已经在后端处理为三种猫头鹰表情
      if (result.emotion) {
        setEmotion(result.emotion);
      } 
      // 从文本内容推断情绪作为备选方案
      else if (result.text) {
        // 尝试从文本内容推断情绪
        const text = result.text.toLowerCase();
        if (text.includes('高兴') || text.includes('开心') || text.includes('快乐') || 
            text.includes('很好') || text.includes('棒') || text.includes('喜欢')) {
          setEmotion('happy');
        } else if (text.includes('悲伤') || text.includes('难过') || text.includes('伤心') || 
                  text.includes('失望') || text.includes('遗憾')) {
          setEmotion('sad');
        } else {
          // 生气或无聊作为默认状态
          setEmotion('angry');
        }
      } else {
        // 默认状态
        setEmotion('angry');
      }
    } else {
      // 没有结果时的默认状态
      setEmotion('angry');
    }
  };

  // 处理从测试模式保存的配置更新
  const handleOwlConfigUpdate = (newConfig) => {
    setOwlControls(newConfig);
  };
  
  // If we need to modify the captureAndSendImage function in App.js, we'll do it here
  const captureAndSendImage = async () => {
    console.log("[NOTICE] This manual capture function is for testing only.");
    console.log("[NOTICE] For interactive object recognition, please use voice commands with the camera on.");
    console.log("[NOTICE] Examples: 'What am I holding?' or 'Can you identify this?'");
    
    if (!cameraEnabled || !cameraVideoRef.current) {
      console.error('Cannot capture image - camera not enabled or not initialized');
      return;
    }
    
    try {
      setLoading(true);
      
      // 创建一个画布来捕获当前视频帧
      const canvas = document.createElement('canvas');
      canvas.width = cameraVideoRef.current.videoWidth;
      canvas.height = cameraVideoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Unable to get canvas context');
      }
      
      ctx.drawImage(cameraVideoRef.current, 0, 0, canvas.width, canvas.height);
      
      // 将图像转换为blob
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.9);
      });
      
      if (!blob) {
        throw new Error('Failed to capture image');
      }
      
            const formData = new FormData();
      
      // 添加图像文件
      const imageFile = new File([blob], 'manual-capture.jpg', { type: 'image/jpeg' });
            formData.append('image_file', imageFile);
            
      // Add the manual object recognition prompt
      formData.append('prompt', prompts.object_recognition || '请识别并描述我手中或图片中显示的物体。');
            
      // 添加会话ID
      if (sessionId) {
            formData.append('session_id', sessionId);
      }
            
      // Add IQ level
            formData.append('iq_level', iqLevel);
            
      // 添加音频设置
      formData.append('with_audio', audioEnabled.toString());
      formData.append('audio_style', 'cartoon');
      
      // Use a manual test flag to signal this is a test capture
      formData.append('manual_test', 'true');
      
      // 发送请求到后端
      const response = await axios.post(`${API_BASE_URL}/api/generate-multimodal`, formData, {
                  headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log('Manual capture received response:', response.data);
      
      // 处理响应
      handleResponse(response.data);
      
            } catch (error) {
      console.error('Image capture or processing failed:', error);
    } finally {
              setLoading(false);
    }
  };

  // Manage auto-capture interval when camera is enabled/disabled or capture interval changes
  useEffect(() => {
    // Clear any existing interval
    if (autoCaptureIntervalRef.current) {
      clearInterval(autoCaptureIntervalRef.current);
      autoCaptureIntervalRef.current = null;
    }
    
    // No longer automatically start capture when camera is enabled
    // Image capture will only be triggered by voice input
    
    return () => {
      if (autoCaptureIntervalRef.current) {
        clearInterval(autoCaptureIntervalRef.current);
      }
    };
  }, [cameraEnabled, captureInterval, backendStatus.isConnected]);

  const handleCameraToggle = () => {
    const newState = !cameraEnabled;
    setCameraEnabled(newState);
    
    // 如果禁用摄像头，清除定时器
    if (!newState && window.emotionTimerID) {
      clearInterval(window.emotionTimerID);
      window.emotionTimerID = null;
      console.log('已停止表情识别定时器');
      
      // Stop WebGazer if it's running
      if (window.webgazer) {
        try {
          window.webgazer.end(); // Stop WebGazer completely
          window.webgazer.showVideoPreview(false);
          window.webgazer.showPredictionPoints(false);
          // Reset calibration state
          setWebGazerCalibrating(false);
        } catch (error) {
          console.error('Error stopping WebGazer:', error);
        }
      }
      
      // Stop camera stream
      if (cameraVideoRef.current?.srcObject) {
        const tracks = cameraVideoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        cameraVideoRef.current.srcObject = null;
      }
      
      // Clear auto-capture interval
      if (autoCaptureIntervalRef.current) {
        clearInterval(autoCaptureIntervalRef.current);
        autoCaptureIntervalRef.current = null;
      }
    }
  };
  
  const handleAudioToggle = () => {
    const newState = !audioEnabled;
    setAudioEnabled(newState);
  };

  // Handle camera setup/teardown when cameraEnabled changes
  useEffect(() => {
    const initializeCamera = async () => {
      if (cameraEnabled && cameraVideoRef.current) {
        try {
          // 清除可能存在的旧定时器
          if (window.emotionTimerID) {
            clearInterval(window.emotionTimerID);
            window.emotionTimerID = null;
          }
          
          console.log('正在初始化摄像头...');
          
          // 请求摄像头权限，设置更高质量
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              width: { ideal: 640 },
              height: { ideal: 480 },
              frameRate: { ideal: 30 }  // 请求更高帧率以获得流畅效果
            } 
          });
          
          // 设置视频源
          cameraVideoRef.current.srcObject = stream;
          
          // 添加事件监听器，在视频真正可以播放时才开始截图
          cameraVideoRef.current.oncanplay = () => {
            console.log('视频可以播放了，摄像头完全准备就绪');
            
            // 确保视频是播放状态
            cameraVideoRef.current.play().then(() => {
              console.log('视频播放已启动，开始表情识别');
              
              // 先执行一次截图
              setTimeout(() => {
                captureAndSendEmotionFrame();
              }, 500);
              
              // 设置定时器每3秒截取一张图片
              const emotionTimer = setInterval(() => {
                captureAndSendEmotionFrame();
              }, 3000);
              
              // 保存定时器ID，以便后续清除
              window.emotionTimerID = emotionTimer;
            }).catch(err => {
              console.error('无法播放视频:', err);
            });
            
            // 只触发一次
            cameraVideoRef.current.oncanplay = null;
          };
          
          // 播放视频流 - 这会触发上面的oncanplay事件
          cameraVideoRef.current.play().catch(err => {
            console.error('初始播放视频失败:', err);
          });
          
          console.log('摄像头初始化完成，等待视频准备就绪');
          
        } catch (err) {
          console.error('访问摄像头失败:', err);
          setCameraEnabled(false);
        }
      } else if (!cameraEnabled && cameraVideoRef.current?.srcObject) {
        // 停止所有视频轨道
        const tracks = cameraVideoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        cameraVideoRef.current.srcObject = null;
      }
    };
    
    // Initialize camera immediately when enabled
    if (cameraEnabled) {
      initializeCamera();
    }
    
    // Cleanup function to ensure camera is always stopped when disabled
    return () => {
      if (cameraVideoRef.current?.srcObject) {
        const tracks = cameraVideoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        cameraVideoRef.current.srcObject = null;
      }
    };
  }, [cameraEnabled]);

  // 添加防抖动的检查连接函数
  const handleCheckConnection = () => {
    const now = Date.now();
    // 如果距离上次检查不到5秒，则不再检查
    if (now - lastCheckTime < 5000) {
      console.log('Check too frequent, please try again later');
      setBackendStatus(prev => ({
        ...prev,
        message: 'Check too frequent, please try again later'
      }));
      return;
    }
    
    setLastCheckTime(now);
    checkBackendConnection();
  };

  // Create value for WebGazerContext
  const webGazerValue = {
    calibrating: webGazerCalibrating && cameraEnabled, // Only allow calibration when camera is enabled
    setCalibrating: (calibrating) => {
      // Only allow calibration to start if camera is enabled
      if (calibrating && !cameraEnabled) {
        console.log('Cannot start calibration: Camera is not enabled');
        return;
      }
      setWebGazerCalibrating(calibrating);
    }
  };

  // Watch for changes in webGazerCalibrating
  useEffect(() => {
    // If calibration is active, ensure bottom controls are visible but non-interactive
    const bottomControls = document.querySelector('.bottom-controls-container');
    if (bottomControls) {
      if (webGazerCalibrating) {
        bottomControls.classList.add('calibrating');
      } else {
        bottomControls.classList.remove('calibrating');
      }
    }
    
    // Add or remove 'calibrating' class to the document body
    if (webGazerCalibrating) {
      document.body.classList.add('calibrating');
    } else {
      document.body.classList.remove('calibrating');
    }
  }, [webGazerCalibrating]);

  // 监听语音识别状态变化
  useEffect(() => {
    if (audioEnabled && !speechServiceRef.current) {
      // 初始化语音识别服务
      try {
        speechServiceRef.current = new SpeechRecognitionService({
          language: 'zh-CN',
          continuous: false,
          interimResults: true,
          silenceThreshold: -45,
          silenceTime: 1000,
          noSpeechTime: 15000,
          autoRestart: true,
          onStatusChange: (status) => {
            console.log('Speech recognition status changed:', status);
            setSpeechRecognitionStatus(status);
            
            // 新增：检测到用户开始说话时，如果AI正在说话且启用了自动打断，就打断AI的语音
            if (status === 'userSpeaking' && aiSpeaking && autoInterruptEnabled) {
              console.log('Detected user speaking, automatically interrupting AI speech');
              interruptAiSpeech();
            }
          },
          onResult: (result) => {
            console.log('Speech recognition result:', result);
            // 如果识别结果是最终结果，则发送到后端
            if (result.isFinal && result.transcript) {
              handleSpeechRecognitionResult(result.transcript);
            }
          },
          onSilence: () => {
            console.log('Detected silence, sentence ended');
          },
          onError: (err) => {
            console.error('Speech recognition error:', err);
          }
        });
        
        // 启动语音识别
        speechServiceRef.current.start().catch(e => {
          console.error('Failed to start speech recognition:', e);
          setAudioEnabled(false);
        });
      } catch (err) {
        console.error('Failed to initialize speech recognition service:', err);
        setAudioEnabled(false);
      }
    } else if (!audioEnabled && speechServiceRef.current) {
      // 停止语音识别
      speechServiceRef.current.stop();
      speechServiceRef.current = null;
    }
    
    return () => {
      // 组件卸载时停止语音识别
      if (speechServiceRef.current) {
        speechServiceRef.current.stop();
        speechServiceRef.current = null;
      }
    };
  }, [audioEnabled]);

  // 新增：打断AI语音功能
  const interruptAiSpeech = () => {
    // 如果使用的是Audio对象播放音频
    if (audioRef.current) {
      audioRef.current.pause();
      // 重置音频源
      audioRef.current.src = '';
    }
    
    // 如果使用的是语音合成API
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    // 通知语音服务AI已停止说话
    if (speechServiceRef.current) {
      speechServiceRef.current.setAiSpeaking(false);
    }
    
    // 更新状态
    setAiSpeaking(false);
    
    // 可选：播放短提示音表示打断成功
    const interruptSound = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
    interruptSound.volume = 0.3;
    interruptSound.play().catch(e => console.log('Failed to play interruption sound'));
  };

  // 处理语音识别结果，发送到后端
  const handleSpeechRecognitionResult = async (transcript) => {
    if (!transcript || !transcript.trim()) {
      console.log('No valid transcript received');
      return;
    }
    
    try {
      console.log('Received speech recognition result:', transcript);
      
      // 更新状态显示处理中
      setSpeechRecognitionStatus('processing');
      setLoading(true);
      setEmotion('thinking');
      
      // 如果AI正在说话并且支持自动打断，尝试打断AI
      if (aiSpeaking && autoInterruptEnabled) {
        interruptAiSpeech();
      }
      
      // 创建一个FormData实例用于发送到后端
      const formData = new FormData();
      formData.append('prompt', transcript);
      
      // Add session ID for context memory
      formData.append('session_id', sessionId);
      console.log(`Including session ID in speech request: ${sessionId}`);
      
      // Always set these parameters for all requests
      formData.append('with_audio', 'true');
      formData.append('audio_style', 'cartoon');
      formData.append('iq_level', iqLevel); // Pass IQ level to the backend
      
      // 如果摄像头已启用，尝试添加当前视频帧为图像
      if (cameraEnabled && cameraVideoRef.current) {
        try {
          // 创建一个canvas元素以捕获视频帧
          const canvas = document.createElement('canvas');
          const video = cameraVideoRef.current;
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          
          // 确保视频已加载
          if (video.readyState === 4) {
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // 将canvas内容转换为blob并添加到FormData
            canvas.toBlob((blob) => {
              if (blob) {
                const imageFile = new File([blob], 'webcam-capture.jpg', { type: 'image/jpeg' });
                formData.append('image_file', imageFile);
                
                // Check if this is an object recognition query
                const isObjectQuery = isObjectRecognitionQuery(transcript);
                
                // Instead of using a templated prompt from the frontend, let the backend handle
                // the prompt construction with its own system prompts
                formData.append('analyze', 'true');
                
                // Set a flag for object recognition to trigger appropriate backend prompt
                if (isObjectQuery) {
                  formData.append('object_query', 'true');
                }
                
                console.log('Sending voice + image request with session ID:', sessionId);
                
                // 发送请求到后端
                sendRequestToBackend(formData, transcript);
              } else {
                // 若无法创建blob，回退到纯文本请求
                console.log('Failed to create blob from canvas, falling back to text-only request');
                sendRequestToBackend(formData, transcript);
              }
            }, 'image/jpeg', 0.9);
          } else {
            // 视频未准备好，回退到纯文本请求
            console.log('Video not ready, falling back to text-only request');
            sendRequestToBackend(formData, transcript);
          }
        } catch (error) {
          // 捕获视频帧失败，回退到纯文本请求
          console.error('Failed to capture video frame:', error);
          sendRequestToBackend(formData, transcript);
        }
      } else {
        // 摄像头未启用，使用纯文本请求
        console.log('Camera not enabled, using text-only request');
        sendRequestToBackend(formData, transcript);
      }
    } catch (error) {
      console.error('Error processing speech recognition result:', error);
      
      // 更新状态以显示错误
      setSpeechRecognitionStatus('error');
      setLoading(false);
      
      // 结束AI说话状态
      if (speechServiceRef.current) {
        speechServiceRef.current.setAiSpeaking(false);
      }
      
      // 设置错误响应
      const errorResponse = {
        text: "Sorry, there was an error processing your request",
        input: transcript,
        error: error.message
      };
      handleResponse(errorResponse);
    }
  };
  
  // Helper function to detect if the user's query is asking for object recognition
  const isObjectRecognitionQuery = (text) => {
    const lowercaseText = text.toLowerCase();
    const objectQueryKeywords = [
      "what am i holding", "what is this", "what's this", "what is that", 
      "what's that", "what object", "identify this", "recognize this",
      "what do you see", "what can you see", "what is in my hand",
      "我拿着什么", "这是什么", "那是什么", "这个东西是什么", 
      "识别一下这个", "你看到了什么", "我手里有什么"
    ];
    
    return objectQueryKeywords.some(keyword => lowercaseText.includes(keyword));
  };
  
  // 新增：发送请求到后端的函数
  const sendRequestToBackend = async (formData, transcript) => {
    try {
      // Add IQ level and ensure session ID is in the request
      formData.append('iq_level', iqLevel);
      if (!formData.has('session_id')) {
        formData.append('session_id', sessionId);
      }
      console.log(`[DEBUG] IQ level in request to backends: ${iqLevel}`);
      // Use direct backend URL - may trigger mixed content warnings in HTTPS environments
      const apiUrl = `${API_BASE_URL}${API_ENDPOINTS.GENERATE_MULTIMODAL}`;
      
      console.log(`Sending request to: ${apiUrl}`);
      
      // 发送请求到后端
      const response = await axios.post(
        apiUrl,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      // Store the session ID from the response if provided
      if (response.data && response.data.session_id && response.data.session_id !== sessionId) {
        console.log(`Updating session ID from ${sessionId} to ${response.data.session_id}`);
        setSessionId(response.data.session_id);
        localStorage.setItem('skyrisSessionId', response.data.session_id);
      }
      
      // 更新猫头鹰情绪并包含用户输入
      if (response.data) {
        // 在响应数据中添加用户输入，以便在UI中显示
        const enhancedResponse = {
          ...response.data,
          input: transcript // 保存用户的语音输入
        };
        
        // 更新响应状态
        handleResponse(enhancedResponse);
      }
      
      // 处理音频响应
      handleAudioResponse(response.data);
    } catch (error) {
      console.error('Backend request failed:', error);
      
      // Check for mixed content or certificate errors
      const errorMessage = error.message || '';
      if (errorMessage.includes('Mixed Content') || 
          errorMessage.includes('SSL') || 
          errorMessage.includes('ERR_SSL_PROTOCOL_ERROR') ||
          errorMessage.includes('ERR_CERT_AUTHORITY_INVALID')) {
        console.error('Mixed content or certificate error detected:', errorMessage);
        
        // Show more specific error message for mixed content issues
        const errorResponse = {
          text: "Mixed content blocked: Your HTTPS frontend cannot load content from the HTTP backend. Please try one of these solutions:\n1. Open the website using HTTP instead of HTTPS\n2. Enable insecure content in your browser for this site\n3. Access the application from a local development environment",
          input: transcript,
          error: error.message
        };
        handleResponse(errorResponse);
        return;
      }
      
      // 处理错误，结束AI说话状态
      if (speechServiceRef.current) {
        speechServiceRef.current.setAiSpeaking(false);
      }
      
      // 设置错误响应
      const errorResponse = {
        text: "Sorry, there was an error processing your request. There might be a secure connection issue.",
        input: transcript,
        error: error.message
      };
      handleResponse(errorResponse);
    }
  };
  
  // 播放音频响应
  const playAudioResponse = (audioBase64, text) => {
    try {
      // 如果已经有语音服务，告诉它AI正在说话
      if (speechServiceRef.current) {
        speechServiceRef.current.setAiSpeaking(true, text);
      }
      
      // 设置AI正在说话状态
      setAiSpeaking(true);
      
      // 创建音频源
      const audioSrc = `data:audio/wav;base64,${audioBase64}`;
      
      if (!audioRef.current) {
        // 如果音频元素不存在，创建一个新的
        const audioElement = new Audio(audioSrc);
        audioRef.current = audioElement;
        
        // 设置音频结束事件
        audioElement.onended = () => {
          // 语音结束后，告诉语音服务AI已经停止说话
          if (speechServiceRef.current) {
            speechServiceRef.current.setAiSpeaking(false);
          }
          // 更新AI说话状态
          setAiSpeaking(false);
        };
      } else {
        // 如果音频元素已存在，更新它的源
        audioRef.current.src = audioSrc;
        
        // 确保onended事件处理程序是最新的
        audioRef.current.onended = () => {
          if (speechServiceRef.current) {
            speechServiceRef.current.setAiSpeaking(false);
          }
          // 更新AI说话状态
          setAiSpeaking(false);
        };
      }
      
      // 播放音频
      audioRef.current.play().catch(e => {
        console.error('Failed to play audio:', e);
        // 播放失败也要结束AI说话状态
        if (speechServiceRef.current) {
          speechServiceRef.current.setAiSpeaking(false);
        }
        setAiSpeaking(false);
      });
    } catch (error) {
      console.error('Failed to process audio response:', error);
      // 出错时结束AI说话状态
      if (speechServiceRef.current) {
        speechServiceRef.current.setAiSpeaking(false);
      }
      setAiSpeaking(false);
    }
  };
  
  // 使用浏览器的语音合成API朗读文本
  const speakTextUsingBrowser = (text) => {
    if ('speechSynthesis' in window) {
      // 设置AI正在说话状态
      setAiSpeaking(true);
      
      // 创建一个新的SpeechSynthesisUtterance实例
      const utterance = new SpeechSynthesisUtterance(text);
      
      // 设置语言为中文
      utterance.lang = 'zh-CN';
      
      // 设置结束事件
      utterance.onend = () => {
        // 语音结束后，告诉语音服务AI已经停止说话
        if (speechServiceRef.current) {
          speechServiceRef.current.setAiSpeaking(false);
        }
        setAiSpeaking(false);
      };
      
      // 设置错误事件
      utterance.onerror = () => {
        console.error('Browser speech synthesis error');
        if (speechServiceRef.current) {
          speechServiceRef.current.setAiSpeaking(false);
        }
        setAiSpeaking(false);
      };
      
      // 朗读文本
      speechSynthesis.speak(utterance);
      
      // 通知服务AI正在说话
      if (speechServiceRef.current) {
        speechServiceRef.current.setAiSpeaking(true, text);
      }
    } else {
      console.warn('Browser does not support speech synthesis API');
      // 即使不支持语音合成，也要通知用户结果
      alert(`AI response: ${text}`);
      
      // 通知服务AI已停止说话
      if (speechServiceRef.current) {
        speechServiceRef.current.setAiSpeaking(false);
      }
    }
  };

  // 添加新的流式播放音频函数
  const playStreamedAudio = (text, style = 'very_slow') => {
    try {
      // 如果已经有语音服务，告诉它AI正在说话
      if (speechServiceRef.current) {
        speechServiceRef.current.setAiSpeaking(true, text);
      }
      
      // 设置AI正在说话状态
      setAiSpeaking(true);

      // 创建一个新的Audio元素用于流式播放
      const audioElement = new Audio();
      audioRef.current = audioElement;
      
      // 设置音频结束事件
      audioElement.onended = () => {
        // 语音结束后，告诉语音服务AI已经停止说话
        if (speechServiceRef.current) {
          speechServiceRef.current.setAiSpeaking(false);
        }
        // 更新AI说话状态
        setAiSpeaking(false);
      };
      
      // 使用MediaSource API进行流式播放
      const mediaSource = new MediaSource();
      audioElement.src = URL.createObjectURL(mediaSource);
      
      mediaSource.addEventListener('sourceopen', async () => {
        try {
          // 创建音频缓冲区
          const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
          
          // 发送请求到流式API
          const response = await fetch(`${API_BASE_URL}/api/stream-speech`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text, style })
          });
          
          // 创建一个可读流
          const reader = response.body.getReader();
          
          // 处理流数据
          let chunks = [];
          const processStream = async () => {
            const { done, value } = await reader.read();
            
            if (done) {
              // 流结束，关闭缓冲区
              try {
                sourceBuffer.addEventListener('updateend', () => {
                  if (!sourceBuffer.updating) {
                    mediaSource.endOfStream();
                  }
                });
              } catch (e) {
                console.error('结束流时出错:', e);
              }
              return;
            }
            
            // 添加数据到缓冲区
            chunks.push(value);
            try {
              if (!sourceBuffer.updating) {
                const chunk = new Uint8Array(concatenateArrayBuffers(chunks));
                sourceBuffer.appendBuffer(chunk);
                chunks = [];
              }
            } catch (e) {
              console.error('添加音频缓冲区时出错:', e);
            }
            
            // 继续处理流
            await processStream();
          };
          
          // 开始播放
          audioElement.play().catch(e => {
            console.error('播放流式音频失败:', e);
            if (speechServiceRef.current) {
              speechServiceRef.current.setAiSpeaking(false);
            }
            setAiSpeaking(false);
          });
          
          // 开始处理流
          await processStream();
        } catch (error) {
          console.error('流式音频处理失败:', error);
          if (speechServiceRef.current) {
            speechServiceRef.current.setAiSpeaking(false);
          }
          setAiSpeaking(false);
        }
      });
    } catch (error) {
      console.error('流式音频播放失败:', error);
      if (speechServiceRef.current) {
        speechServiceRef.current.setAiSpeaking(false);
      }
      setAiSpeaking(false);
    }
  };

  // 辅助函数：合并ArrayBuffer数组
  const concatenateArrayBuffers = (buffers) => {
    // 计算总长度
    let totalLength = 0;
    for (const buffer of buffers) {
      totalLength += buffer.byteLength;
    }
    
    // 创建一个新的ArrayBuffer
    const result = new Uint8Array(totalLength);
    
    // 复制所有数据
    let offset = 0;
    for (const buffer of buffers) {
      result.set(new Uint8Array(buffer), offset);
      offset += buffer.byteLength;
    }
    
    return result.buffer;
  };

  // 修改现有的音频响应处理
  const handleAudioResponse = (data) => {
    // 如果有音频数据，使用base64播放
    if (data && data.audio) {
      playAudioResponse(data.audio, data.text);
    } 
    // 如果没有音频但有文本，尝试流式播放
    else if (data && data.text) {
      // 使用流式音频API (如果文本长度超过一定值，使用流式API可以减少延迟)
      if (data.text.length > 20) {
        playStreamedAudio(data.text, 'very_slow');
      } else {
        // 短文本使用浏览器合成
        speakTextUsingBrowser(data.text);
      }
    }
  };

  // Function to fetch prompts from backend when connected
  const fetchPrompts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/prompts`);
      if (response.data && response.data.capabilities) {
        console.log('Received capabilities from backend:', response.data.capabilities);
        
        // We now only get capabilities information, not actual prompts
        // This helps ensure that prompts are managed by the backend
        const capabilities = response.data.capabilities;
        
        // Log the capabilities
        if (capabilities.image_analysis) {
          console.log('Backend supports image analysis');
        }
        
        if (capabilities.voice_recognition) {
          console.log('Backend supports voice recognition');
        }
        
        if (capabilities.object_recognition) {
          console.log('Backend supports object recognition');
        }
      }
    } catch (error) {
      console.error('Failed to fetch capabilities from backend:', error);
      // Continue using default functionality
    }
  };

  // Fetch capabilities from backend when connected
  useEffect(() => {
    if (backendStatus.isConnected) {
      fetchPrompts();
    }
  }, [backendStatus.isConnected]);

  const handleCameraPreviewToggle = (newValue) => {
    setShowCameraPreview(newValue);
  };

  // 新增函数：捕获并发送表情帧
  const captureAndSendEmotionFrame = () => {
    try {
      // 检查摄像头状态
      if (!cameraVideoRef.current || 
          !cameraVideoRef.current.srcObject || 
          !cameraEnabled) {
        console.log('摄像头未准备好，无法截取图片');
        return;
      }
      
      // 检查视频是否已经加载并可以播放
      if (cameraVideoRef.current.readyState < 3) { // HAVE_FUTURE_DATA = 3
        console.log('视频尚未足够加载，等待下一次截图，当前readyState:', cameraVideoRef.current.readyState);
        return;
      }
      
      // 确认视频尺寸有效
      if (!cameraVideoRef.current.videoWidth || !cameraVideoRef.current.videoHeight) {
        console.log('视频尺寸无效，等待下一次截图');
        return;
      }
      
      console.log('截取视频帧用于表情识别');
      
      // 静默截取图片，不影响用户体验
      const canvas = document.createElement('canvas');
      canvas.width = cameraVideoRef.current.videoWidth;
      canvas.height = cameraVideoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        console.error('无法获取canvas上下文');
        return;
      }
      
      // 将视频帧绘制到canvas
      ctx.drawImage(cameraVideoRef.current, 0, 0, canvas.width, canvas.height);
      
      // 将canvas转换为blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          console.error('无法创建图像Blob');
          return;
        }
        
        // 创建FormData对象
        const formData = new FormData();
        const imageFile = new File([blob], 'emotion-frame.jpg', { type: 'image/jpeg' });
        formData.append('image_file', imageFile);
        
        try {
          // 静默发送到后端进行表情识别
          const response = await axios.post(`${API_BASE_URL}/api/generate-emotion`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
          
          // 处理返回的表情识别结果
          console.log('表情识别结果:', response.data);
          if (response.data && response.data.emotion) {
            setEmotionAnalysisResult({
              emotion: response.data.emotion,
              confidence: Math.round(response.data.confidence || 0)
            });
          }
        } catch (error) {
          console.error('发送表情帧失败:', error);
          // 静默失败，不影响用户体验
        }
      }, 'image/jpeg', 0.9);
      
    } catch (error) {
      console.error('截取表情帧失败:', error);
      // 静默失败，不影响用户体验
    }
  };

  // 在组件卸载时清除定时器
  useEffect(() => {
    return () => {
      if (window.emotionTimerID) {
        clearInterval(window.emotionTimerID);
        window.emotionTimerID = null;
      }
    };
  }, []);

  return (
    <PromptContext.Provider value={prompts}>
      <WebGazerContext.Provider value={webGazerValue}>
        <div className="ios-container" style={{
          backgroundImage: `url(${process.env.PUBLIC_URL}/background-img/${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}>
          <StatusBar 
            cameraEnabled={cameraEnabled} 
            theme={
              // Determine theme based on background image
              // Most iOS backgrounds are dark, so we'll use light as default
              backgroundImage.includes('home-1') || 
              backgroundImage.includes('dark') ? 
              'light' : 'dark'
            } 
          />
          <div className="App">
            {/* 移除独立的语音识别按钮和面板 */}
            
            {/* Settings panel */}
            {showSettings && (
              <SettingsPanel 
                captureInterval={captureInterval}
                onSave={handleSaveSettings}
                onClose={() => setShowSettings(false)}
                onTestModeToggle={toggleTestMode}
                testMode={testMode}
                backendStatus={backendStatus}
                onStartBackend={startBackendServer}
                showCameraPreview={showCameraPreview}
                onCameraPreviewToggle={handleCameraPreviewToggle}
                backgroundImage={backgroundImage}
              />
            )}
            
            {testMode ? (
              <OwlTest 
                onConfigUpdate={handleOwlConfigUpdate} 
                onExitTestMode={toggleTestMode}
              />
            ) : (
              <div className={`main-content 
                ${showChatbox ? 'chatbox-open' : 'chatbox-closed'} 
                ${webGazerCalibrating ? 'calibrating' : ''} 
                ${showCameraPreview && cameraEnabled ? 'show-camera' : ''} 
                ${audioEnabled && (response || speechRecognitionStatus === 'aiProcessing' || speechRecognitionStatus === 'aiSpeaking') ? 'show-recognition-results' : ''}
              `}>
                {/* Chatbox panel - only shown when toggled */}
                {showChatbox && (
                  <div className="chatbox-panel">
                    {/* Add close button at the top of chatbox */}
                    <div className="chatbox-close-button" onClick={toggleChatbox}>
                      <i className="fas fa-times"></i>
                    </div>
                    
                    <UnifiedChatbox 
                      onProcessStart={handleProcessStart}
                      onProcessEnd={handleProcessEnd}
                      onResponse={handleResponse}
                      backendConnected={backendStatus.isConnected}
                      captureInterval={captureInterval}
                      onCameraToggle={setCameraEnabled}
                      onAudioToggle={setAudioEnabled}
                      cameraEnabled={cameraEnabled}
                      audioEnabled={audioEnabled}
                      useExternalCamera={true}
                    />
                    
                    {!backendStatus.isChecking && !backendStatus.isConnected && (
                      <div className="connection-error">
                        <p>{backendStatus.message}</p>
                        <button className="start-backend-button" onClick={startBackendServer}>
                          Start backend server
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                {/* 表情识别结果显示 - 移到这里确保在按钮组上面 */}
                {emotionAnalysisResult && (
                  <div className="emotion-analysis-result">
                    <div className="emotion-result-content">
                      <span className="emotion-label">表情识别结果:</span>
                      <span className="emotion-value">{emotionAnalysisResult.emotion}</span>
                      <span className="confidence-label">置信度:</span>
                      <span className="confidence-value">{emotionAnalysisResult.confidence}%</span>
                    </div>
                  </div>
                )}
                
                {/* Centered and enlarged owl character */}
                <div className="centered-owl-container">
                  <OwlImageAnimation emotion={emotion} isLoading={loading} controls={owlControls} />
                  
                  {/* Camera container moved to bottom right */}
                  {cameraEnabled && (
                    <div className={`camera-container bottom-right ${showCameraPreview ? 'show' : ''}`}>
                      <video 
                        ref={cameraVideoRef}
                        autoPlay 
                        playsInline
                        muted
                        className="camera-preview"
                      />
                      <div className="camera-status status-bottom">
                        <span className={`status-indicator active`}></span>
                        Camera is on, automatically analyze every {captureInterval/1000} seconds
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Bottom controls moved to center bottom */}
                <div className={`bottom-controls-container ${webGazerCalibrating ? 'hidden' : ''}`}>
                  {/* Voice recognition status indicator */}
                  {audioEnabled && (
                    <div className="speech-status-indicator">
                      <div className={`speech-status ${speechRecognitionStatus}`}>
                        {speechRecognitionStatus === 'idle' && 'Waiting for voice input...'}
                        {speechRecognitionStatus === 'listening' && 'Listening...'}
                        {speechRecognitionStatus === 'userSpeaking' && 'Listening...'}
                        {speechRecognitionStatus === 'recognizing' && 'Recognizing...'}
                        {speechRecognitionStatus === 'aiProcessing' && 'AI is processing...'}
                        {speechRecognitionStatus === 'aiSpeaking' && 'AI is responding...'}
                        {speechRecognitionStatus === 'sleeping' && 'Sleeping...'}
                      </div>
                      
                      {/* 添加自动打断开关 */}
                      {aiSpeaking && (
                        <div className="auto-interrupt-toggle" title={autoInterruptEnabled ? "已启用自动打断" : "已禁用自动打断"}>
                          <label>
                            <input 
                              type="checkbox" 
                              checked={autoInterruptEnabled} 
                              onChange={() => setAutoInterruptEnabled(!autoInterruptEnabled)} 
                            />
                            Auto interrupt
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* 识别结果及AI回复显示 */}
                  {audioEnabled && (response || speechRecognitionStatus === 'aiProcessing' || speechRecognitionStatus === 'aiSpeaking') && (
                    <div className="recognition-results">
                      {response && response.input && (
                        <div className="user-input">
                          <span className="input-label">You said:</span> {response.input}
                        </div>
                      )}
                      {response && response.text && (
                        <div className="ai-response">
                          <span className="response-label">AI response:</span> {response.text}
                          {/* 添加情绪标签显示 */}
                          {response.emotion && (
                            <span className="emotion-tag">
                              Emotion: {response.emotion === 'happy' ? 'Happy' : 
                                   response.emotion === 'sad' ? 'Sad' : 
                                   response.emotion === 'angry' ? 'Angry/Bored' : 
                                   response.emotion}
                            </span>
                          )}
                          {/* 添加打断按钮 */}
                          {aiSpeaking && (
                            <button 
                              className="interrupt-button" 
                              onClick={interruptAiSpeech}
                              title="Interrupt AI response"
                            >
                              <i className="fas fa-hand-paper"></i> Interrupt
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* File, camera, audio buttons */}
                  <div className="control-buttons-group">
                    {/* Settings button */}
                    <button 
                      className={`control-button settings-button ${showSettings ? 'active' : ''}`}
                      onClick={toggleSettings}
                      title="Settings"
                    >
                      <i className="fas fa-cog"></i>
                    </button>
                    
                    {/* Chatbox toggle button */}
                    <button 
                      className={`control-button chatbox-button ${showChatbox ? 'active' : ''}`}
                      onClick={toggleChatbox}
                      title="Chat"
                    >
                      <i className="fas fa-comments"></i>
                    </button>
                    
                    {/* File upload button - now always opens chatbox first */}
                    <button 
                      className="control-button file-button" 
                      onClick={() => {
                        setShowChatbox(true);
                        // Slight delay to ensure chatbox is open before triggering file selection
                        setTimeout(() => {
                          const fileButtonInChatbox = document.querySelector('.unified-chatbox input[type="file"]');
                          if (fileButtonInChatbox) {
                            fileButtonInChatbox.click();
                          }
                        }, 300);
                      }}
                      title="Upload File"
                    >
                      <i className="fas fa-paperclip"></i>
                    </button>
                    
                    {/* Camera toggle button */}
                    <button 
                      className={`control-button camera-button ${cameraEnabled ? 'active' : ''}`} 
                      onClick={handleCameraToggle}
                      title={cameraEnabled ? "Turn Off Camera" : "Turn On Camera"}
                    >
                      <i className={`fas ${cameraEnabled ? 'fa-video' : 'fa-video-slash'}`}></i>
                    </button>
                    
                    {/* Audio toggle button */}
                    <button 
                      className={`control-button audio-button ${audioEnabled ? 'active' : ''} ${audioEnabled && speechRecognitionStatus ? speechRecognitionStatus : ''}`}
                      onClick={handleAudioToggle}
                      title={audioEnabled ? "Turn Off Voice Input" : "Turn On Voice Input"}
                    >
                      <i className={`fas ${audioEnabled ? 'fa-microphone' : 'fa-microphone-slash'}`}></i>
                    </button>
                    
                    {/* 删除表情识别按钮 */}
                    
                    {/* Backend connection button (only when needed) */}
                    {!backendStatus.isConnected && (
                      <button 
                        className="control-button start-backend-button" 
                        onClick={startBackendServer}
                        disabled={backendStatus.isChecking}
                      >
                        {backendStatus.isChecking ? 'Starting Backend...' : 'Start Backend Service'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* 将后端启动失败提示移到main-content外部 */}
            {!backendStatus.isConnected && showManualInstructions && (
              <div className="manual-start-instructions">
                <div className="instruction-header">
                  <h3>Backend Connection Failed</h3>
                  <button className="close-instruction-button" onClick={() => setShowManualInstructions(false)}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                <p>The application is configured to connect to the backend at:</p>
                <code>{API_BASE_URL}</code>
                
                <p>To start the backend manually, please run:</p>
                <div className="code-block">
                  <code>cd /path/to/backend && python app.py</code>
                </div>
                
                <p>Common backend locations:</p>
                <ul>
                  <li><code>../backend</code> - relative to frontend</li>
                  <li><code>C:\Users\skyrisai\Desktop\demo-repository\backend</code> - based on server logs</li>
                </ul>
                
                <button 
                  className="retry-button" 
                  onClick={handleCheckConnection}
                  disabled={backendStatus.isChecking}
                >
                  {backendStatus.isChecking ? 'Checking...' : 'Check connection again'}
                </button>
              </div>
            )}
          </div>
        </div>
      </WebGazerContext.Provider>
    </PromptContext.Provider>
  );
}

export default App; 