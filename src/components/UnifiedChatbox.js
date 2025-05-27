import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../config';
import './UnifiedChatbox.css';
import WebGazerCalibration from './WebGazerCalibration';
import { ollamaAPI, memoryStore } from '../utils/ollamaIntegration';
import { PromptContext } from '../App';

const UnifiedChatbox = ({
  onProcessStart,
  onProcessEnd,
  onResponse,
  backendConnected,
  captureInterval,
  onCameraToggle,
  onAudioToggle,
  cameraEnabled,
  audioEnabled,
  useExternalCamera = false
}) => {
  // Import prompts from context
  const prompts = useContext(PromptContext);
  
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [conversation, setConversation] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const cameraCaptureIntervalRef = useRef(null);
  const canvasRef = useRef(null);
  
  // Speech recognition setup
  const recognitionRef = useRef(null);
  const [transcript, setTranscript] = useState('');
  const [recognizing, setRecognizing] = useState(false);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'zh-CN';
      
      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
        
        // Log speech detection for debugging
        console.log('Speech detected:', currentTranscript);
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setRecognizing(false);
      };
      
      recognition.onend = () => {
        if (recognizing) {
          recognition.start();
        }
      };
      
      recognitionRef.current = recognition;
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [recognizing]);
  
  // Handle audio input toggle
  useEffect(() => {
    if (audioEnabled) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setRecognizing(true);
        } catch (error) {
          console.error('Error starting speech recognition:', error);
        }
      }
    } else {
      if (recognitionRef.current && recognizing) {
        recognitionRef.current.stop();
        setRecognizing(false);
      }
    }
  }, [audioEnabled, recognizing]);
  
  // Auto-scroll to bottom of chat - 优化滚动性能
  const scrollToBottom = () => {
    // 使用requestAnimationFrame优化滚动性能
    if (chatContainerRef.current) {
      window.requestAnimationFrame(() => {
        chatContainerRef.current.scrollIntoView({ behavior: 'auto' });
      });
    }
  };
  
  // Scroll when conversation updates
  useEffect(() => {
    scrollToBottom();
  }, [conversation]);
  
  // Define startCamera function before using it
  const startCamera = async () => {
    try {
      // Check if the camera is already running
      if (videoRef.current && videoRef.current.srcObject) {
        console.log('Camera is already running');
        return;
      }

      console.log('Attempting to start camera');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      console.log('Got camera stream:', stream);
      
      if (videoRef.current) {
        console.log('Setting video source');
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded, attempting to play');
          videoRef.current.play()
            .then(() => {
              console.log('Camera started successfully - ready for speech-triggered capture');
              
              // We no longer set up periodic captures
              // Instead, images will be captured when speech is detected
              
              onCameraToggle(true);
            })
            .catch(err => {
              console.error('Error playing video:', err);
              setError('启动摄像头失败: ' + err.message);
              stopCamera();
              onCameraToggle(false);
            });
        };
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('无法访问摄像头，请确保授予了摄像头权限: ' + err.message);
      stopCamera();
      onCameraToggle(false);
    }
  };
  
  // Camera handling
  useEffect(() => {
    // Don't initialize camera if we're using an external camera
    if (useExternalCamera) return;
    
    // Only start camera if explicitly enabled
    if (cameraEnabled) {
      startCamera();
    } else {
      stopCamera();
    }
    
    return () => {
      if (!useExternalCamera) {
        stopCamera();
      }
    };
  }, [cameraEnabled, captureInterval, useExternalCamera]);
  
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    // Clear any capture intervals that might exist
    if (cameraCaptureIntervalRef.current) {
      console.log('Clearing camera capture interval');
      clearInterval(cameraCaptureIntervalRef.current);
      cameraCaptureIntervalRef.current = null;
    }
  };
  
  // 添加记录上一次响应的变量
  const [lastResponse, setLastResponse] = useState(null);
  
  // 修改处理后端响应的函数，立即显示文本响应
  const handleBackendResponse = (data, originalText) => {
    console.log('处理后端响应:', data);
    
    // 检查是否有ECoT数据
    if (data.ecot_steps) {
      console.log('ECoT步骤信息:', data.ecot_steps);
    }
    
    // 检查是否是ECoT模式
    console.log('ECoT模式启用状态:', data.ecot_enabled);
    
    // 打印原始数据以排查问题
    console.log('完整响应数据:', JSON.stringify(data));
    
    // 检测重复响应
    const currentResponseText = data.text || '';
    const responseEmotion = data.emotion || 'neutral';
    
    // 如果当前响应与上一次相同，且不是测试模式
    if (lastResponse && 
        lastResponse.text === currentResponseText && 
        lastResponse.emotion === responseEmotion &&
        !originalText.toLowerCase().includes('test_ecot')) {
      
      console.log('检测到重复响应，添加变化...');
      
      // 随机选择不同的情感响应
      const alternativeResponses = [
        { text: '我能理解你的感受，让我们一起找到解决方案。', emotion: 'happy' },
        { text: '你的问题很有深度，需要仔细思考。', emotion: 'sad' },
        { text: '这个情况确实比较复杂，但我们可以一步步分析。', emotion: 'angry' },
        { text: '听起来你遇到了挑战，我很乐意提供帮助。', emotion: 'happy' },
        { text: '我明白这可能让你感到困惑，让我尝试解释清楚。', emotion: 'sad' }
      ];
      
      // 随机选择一个不同的响应
      const randomIndex = Math.floor(Math.random() * alternativeResponses.length);
      data.text = alternativeResponses[randomIndex].text;
      data.emotion = alternativeResponses[randomIndex].emotion;
      
      console.log('已修改为替代响应:', data.text, data.emotion);
    }
    
    // 更新上一次响应记录
    setLastResponse({
      text: data.text || '',
      emotion: data.emotion || 'neutral'
    });
    
    // 立即添加响应到对话
    let responseText = '无响应内容';
    
    // 检查不同数据格式
    if (data.text) {
        responseText = data.text;
    } else if (data.result) {
        responseText = data.result;
    } else if (data.summary) {
        responseText = data.summary;
    } else if (data.emotion) {
        const emotionMap = {
            'happy': '猫头鹰感觉到了快乐的情绪！',
            'sad': '猫头鹰感觉到了悲伤的情绪。',
            'angry': '猫头鹰感觉到了愤怒的情绪！',
            'fear': '猫头鹰感觉到了恐惧的情绪。',
            'surprise': '猫头鹰感觉到了惊讶的情绪！',
            'neutral': '猫头鹰感觉情绪很平静。'
        };
        responseText = emotionMap[data.emotion] || `猫头鹰检测到情绪: ${data.emotion}`;
        
        if (data.sentiment_score !== undefined) {
            responseText += ` (情感分数: ${data.sentiment_score.toFixed(2)})`;
        }
    }
    
    // 先显示文本响应，不等待音频处理
    const newResponse = {
        id: Date.now(),
        type: 'system',
        text: responseText,
        originalPrompt: originalText,
        data: data
    };
    
    setConversation(prev => [...prev, newResponse]);
    
    // 调用回调函数
    if (onResponse) {
        onResponse(data);
    }
    
    if (onProcessEnd) {
        onProcessEnd();
    }
    
    // 如果启用了音频且有音频数据，在后台处理音频
    if (audioEnabled && data.audio) {
        // 在另一个微任务中处理音频，避免阻塞UI
        setTimeout(() => {
            try {
                console.log('后台处理音频数据');
                const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
                audio.playbackRate = 2.0; // 使用最快的播放速度
                audio.volume = 0.8; // 略微降低音量
                audio.play().catch(error => {
                    console.error('播放音频失败:', error);
                });
            } catch (error) {
                console.error('创建音频对象失败:', error);
            }
        }, 100); // 短暂延迟确保UI先更新
    }
};

// 使用更高效的方式播放音频
const playStreamedAudio = async (text) => {
    if (!text || text.trim().length === 0) {
        console.log('没有文本内容，跳过音频播放');
        return;
    }

    console.log(`准备播放文本: "${text.substring(0, 30)}..."`);

    try {
        // 直接使用标准API一次性请求音频
        const formData = new FormData();
        formData.append('prompt', text);
        formData.append('with_audio', 'true');
        formData.append('audio_style', 'fast'); // 使用最快的音频风格
        
        // 使用无阻塞请求方式
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
        
        console.log('发送音频请求');
        const response = await fetch(`${API_BASE_URL}/api/generate-multimodal`, {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.audio) {
            console.log('收到音频数据，立即播放');
            const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
            audio.playbackRate = 1.75; // 大幅提高播放速度
            audio.play().catch(error => {
                console.error('音频播放失败:', error);
            });
        } else {
            console.error('没有收到音频数据');
        }
    } catch (error) {
        console.error('音频播放失败:', error);
    }
};

// 辅助函数：将文本分成较小的块
// 由于我们现在使用直接播放音频的方式，这个函数不再需要
// 保留注释以便未来参考
/*
const splitTextIntoChunks = (text, maxLength) => {
    // ...函数原有内容...
};
*/
  
  const [conversationHistory, setConversationHistory] = useState([]);
  const MAX_HISTORY_LENGTH = 10; // Keep last 10 exchanges for context

  const handleSendTextToBackend = async (text) => {
    if (!backendConnected) {
      setIsProcessing(false);
      setError('后端服务未连接或无响应，请检查后端服务是否正常运行。');
      return;
    }
    
    setIsProcessing(true);
    onProcessStart();
    
    // 创建临时响应以立即显示用户输入的处理状态
    const tempResponseId = Date.now();
    const tempResponse = {
      id: tempResponseId,
      type: 'system',
      text: '...',
      isLoading: true
    };
    
    // 立即添加临时响应到对话
    setConversation(prev => [...prev, tempResponse]);
    
    try {
      // 创建FormData对象
      const formData = new FormData();
      formData.append('prompt', text);
      formData.append('with_audio', audioEnabled.toString());
      formData.append('audio_style', 'fast'); // 使用最快的音频风格
      formData.append('ecot_enabled', 'true'); // 启用情感思维链
      formData.append('priority', 'high'); // 添加高优先级标志
      formData.append('immediate_response', 'true'); // 请求快速响应
      
      // 添加随机数，避免缓存
      formData.append('random', Math.random().toString());
      
      // 添加强制ECoT调试标志
      formData.append('force_ecot', 'true');
      
      // 打印FormData内容以进行调试
      const formDataObj = {};
      formData.forEach((value, key) => {
        formDataObj[key] = value;
      });
      console.log('发送请求内容:', formDataObj);
      
      // 使用fetch API
      console.log('发送请求到后端...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 缩短超时时间
      
      const response = await fetch(`${API_BASE_URL}/api/generate-multimodal`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`服务器返回错误: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('后端返回结果:', data);
      
      // 先移除临时响应
      setConversation(prev => prev.filter(msg => msg.id !== tempResponseId));
      
      // 处理实际响应
      handleBackendResponse(data, text);
      if (onResponse) onResponse(data);
    } catch (error) {
      console.error('发生错误:', error);
      
      // 移除临时响应并显示错误
      setConversation(prev => prev.filter(msg => msg.id !== tempResponseId));
      setError(`发生错误: ${error.message || '未知错误'}`);
    } finally {
      setIsProcessing(false);
      if (onProcessEnd) onProcessEnd();
    }
  };
  
  const handleSendFileToBackend = async (file, text = '') => {
    setIsProcessing(true);
    if (onProcessStart) onProcessStart();
    
    try {
      const formData = new FormData();
      
      // 添加提示文本
      const defaultFilePrompt = prompts.defaultFilePrompt || '请分析这个内容';
      formData.append('prompt', text || defaultFilePrompt);
      
      // 添加音频输出设置
      formData.append('with_audio', audioEnabled.toString());
      formData.append('audio_style', 'fast'); // 使用最快的音频风格
      formData.append('ecot_enabled', 'true'); // 启用情感思维链
      // 添加高优先级标志
      formData.append('priority', 'high');
      
      // 根据文件类型添加文件
      if (file.type.startsWith('image/')) {
        formData.append('image_file', file);
        console.log('发送图片到后端处理');
      } else if (file.type.startsWith('audio/')) {
        formData.append('audio_file', file);
        console.log('发送音频到后端处理');
      } else if (file.type.startsWith('video/')) {
        formData.append('video_file', file);
        console.log('发送视频到后端处理');
      } else {
        setError('不支持的文件类型');
        setIsProcessing(false);
        if (onProcessEnd) onProcessEnd();
        return;
      }
      
      // 使用AbortController设置超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25秒超时
      
      // 使用fetch API代替axios
      const response = await fetch(`${API_BASE_URL}/api/generate-multimodal`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`服务器返回错误: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('后端返回多模态处理结果:', data);
      
      // 处理响应
      handleBackendResponse(data, text);
    } catch (err) {
      console.error('发送文件失败:', err);
      setError('处理文件时出错: ' + (err.message || '未知错误'));
      if (onProcessEnd) onProcessEnd();
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Define handleSendMessage after the backend functions
  const handleSendMessage = async (text = null) => {
    const messageToSend = text || message;
    
    if (!messageToSend.trim() && files.length === 0) {
      setError('请输入消息或选择文件');
      return;
    }
    
    if (!backendConnected) {
      setError('后端服务未连接，无法发送消息');
      return;
    }
    
    // 特殊测试模式 - 针对特定的输入使用不同的请求
    if (messageToSend.toLowerCase().includes('test_ecot')) {
      // 直接添加用户消息到对话
      const newUserMessage = {
        id: Date.now(),
        type: 'user',
        text: messageToSend,
      };
      setConversation(prev => [...prev, newUserMessage]);
      
      // 清空输入
      if (!text) setMessage('');
      
      // 创建5个不同测试内容的临时模拟响应
      const testResponses = [
        { emotion: 'happy', response: '我很高兴能帮助你解决问题！' },
        { emotion: 'sad', response: '我理解这对你来说很困难，让我们一起想办法。' },
        { emotion: 'angry', response: '这种情况确实令人沮丧，但我们可以一起面对。' },
        { emotion: 'happy', response: '这真是个好消息！恭喜你取得了进展。' },
        { emotion: 'sad', response: '我能感受到你的失落，这确实是个艰难的时刻。' }
      ];
      
      // 逐个添加不同测试内容的响应
      for (let i = 0; i < testResponses.length; i++) {
        const testResponse = testResponses[i];
        
        // 使用setTimeout错开显示
        setTimeout(() => {
          const mockData = {
            text: testResponse.response,
            emotion: testResponse.emotion,
            ecot_enabled: true,
            ecot_steps: {
              step1_context: `测试ECoT步骤1 - ${i+1}`,
              step2_others_emotions: `测试ECoT步骤2 - ${i+1}`,
              step3_self_emotions: `测试ECoT步骤3 - ${i+1}`,
              step4_managing_emotions: `测试ECoT步骤4 - ${i+1}`,
              step5_influencing_emotions: `测试ECoT步骤5 - ${i+1}`
            }
          };
          handleBackendResponse(mockData, `测试ECoT ${i+1}`);
        }, i * 1500); // 每1.5秒添加一个响应
      }
      
      return;
    }
    
    // 正常处理消息流程
    // Add message to conversation
    const newMessage = {
      id: Date.now(),
      type: 'user',
      text: messageToSend,
      files: files.length > 0 ? [...files] : [],
      previews: previews.length > 0 ? [...previews] : []
    };
    
    setConversation(prev => [...prev, newMessage]);
    
    // Clear input fields
    if (!text) setMessage('');
    setFiles([]);
    setPreviews([]);
    setError(null);
    
    // If we have files, send them with the message
    if (files.length > 0) {
      await handleSendFileToBackend(files[0], messageToSend);
    } else {
      // Text-only message
      await handleSendTextToBackend(messageToSend);
    }
  };
  
  // Process transcript when it changes - this is where we'll sync the image capture with speech
  useEffect(() => {
    // Only process when we have a transcript and we're not already processing
    if (transcript && !isProcessing && audioEnabled) {
      console.log('Speech detected, preparing to capture image when speech ends...');
      
      // Use a timeout to capture after user stops speaking
    const timeoutId = setTimeout(() => {
        console.log('Speech appears to have ended, capturing synchronized image...');
        
        // Only proceed if camera is enabled and we have a valid transcript
        if (cameraEnabled && videoRef.current && transcript.trim()) {
          // We're starting a processing session
          setIsProcessing(true);
          if (onProcessStart) onProcessStart();
          
          // Capture image from webcam
          const canvas = document.createElement('canvas');
          try {
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              throw new Error('Failed to get canvas context');
            }
            
            // Draw current video frame to canvas
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            
            // Convert to blob
            canvas.toBlob((blob) => {
              if (!blob) {
                console.error('Failed to create image blob');
                setError('无法捕获图像');
                setIsProcessing(false);
                if (onProcessEnd) onProcessEnd();
                return;
              }
              
              // Create file from blob
              const file = new File([blob], 'speech-triggered-capture.jpg', { type: 'image/jpeg' });
              
              // Create a more detailed combined prompt with the transcript
              // Use prompt from context if available, otherwise use default
              const voiceWithImagePrompt = prompts.voiceWithImage || 
                '以下是我的语音输入: "{transcript}"\n请同时看这张图片，回答我的问题。如果我在询问图片中的物品，请详细描述。';
              const enhancedPrompt = voiceWithImagePrompt.replace('{transcript}', transcript);
              
              // Create formData with both speech and image
              const formData = new FormData();
              formData.append('prompt', enhancedPrompt);
              formData.append('image_file', file);
              formData.append('with_audio', audioEnabled.toString());
              formData.append('audio_style', 'fast');
              formData.append('voice_input', transcript);
              formData.append('ecot_enabled', 'true'); // 启用情感思维链
              
              // 添加用户消息到会话
              const newMessage = {
                id: Date.now(),
                type: 'user',
                text: transcript,
                files: [file],
                previews: [URL.createObjectURL(file)]
              };
              
              setConversation(prev => [...prev, newMessage]);
              
              // 创建临时响应
              const tempResponseId = Date.now() + 1;
              const tempResponse = {
                id: tempResponseId,
                type: 'system',
                text: '...',
                isLoading: true
              };
              
              // 立即添加临时响应
              setConversation(prev => [...prev, tempResponse]);
              
              // Send to backend
              console.log('Sending synchronized image and speech to backend...');
              
              // 使用AbortController设置超时
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 15000); // 减少超时时间
              
              // 使用fetch API替代axios
              fetch(`${API_BASE_URL}/api/generate-multimodal`, {
                method: 'POST',
                body: formData,
                signal: controller.signal
              })
              .then(response => {
                clearTimeout(timeoutId);
                if (!response.ok) {
                  throw new Error(`服务器返回错误: ${response.status}`);
                }
                return response.json();
              })
              .then(data => {
                // 移除临时响应
                setConversation(prev => prev.filter(msg => msg.id !== tempResponseId));
                
                console.log('Received multimodal response from backend:', data);
                handleBackendResponse(data, enhancedPrompt);
              })
              .catch(err => {
                // 移除临时响应
                setConversation(prev => prev.filter(msg => msg.id !== tempResponseId));
                
                console.error('Failed to process synchronized speech and image:', err);
                setError('处理语音和图像时出错: ' + (err.message || '未知错误'));
              })
              .finally(() => {
                setIsProcessing(false);
                if (onProcessEnd) onProcessEnd();
              });
            }, 'image/jpeg', 0.9);
          } catch (error) {
            console.error('Error during synchronized image capture:', error);
            setError('图像捕获过程中出现错误');
            setIsProcessing(false);
            if (onProcessEnd) onProcessEnd();
          } finally {
            // Clean up canvas
            canvas.remove();
          }
        } else if (transcript.trim()) {
          // No camera enabled, just send the text
          console.log('Camera not enabled, sending only speech...');
          handleSendTextToBackend(transcript);
        }
        
        // Clear the transcript after processing
        setTranscript('');
      }, 1500); // 1.5 second delay after speech ends
    
    return () => clearTimeout(timeoutId);
    }
  }, [transcript, isProcessing, audioEnabled, cameraEnabled]);
  
  const captureAndSendImage = () => {
    console.log('Manual image capture requested');
    
    if (!videoRef.current || !cameraEnabled) {
      console.log('Cannot capture image - camera not ready');
      return;
    }
    
    // Capture image from webcam
    const canvas = document.createElement('canvas');
    try {
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }
      
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      if (!blob) {
          console.error('Failed to create image blob');
        setError('无法捕获图像');
        return;
      }
      
        const file = new File([blob], 'manual-capture.jpg', { type: 'image/jpeg' });
        
        // Use standard prompt for manual captures
        const emotionAnalysisPrompt = prompts.emotionAnalysisWithImage || 
          '请看这张图片，分析我当前的表情、情绪状态，以及可能的心理状态。';
      
        console.log('Manual image capture successful, sending to backend');
        
        const formData = new FormData();
        formData.append('prompt', emotionAnalysisPrompt);
        formData.append('image_file', file);
        formData.append('with_audio', audioEnabled.toString());
        formData.append('audio_style', 'fast');
        formData.append('analyze', 'true');
        formData.append('ecot_enabled', 'true'); // 启用情感思维链
        
        // Send to backend
        setIsProcessing(true);
        if (onProcessStart) onProcessStart();
        
        // 创建临时响应以立即显示处理状态
        const tempResponseId = Date.now();
        const tempResponse = {
          id: tempResponseId,
          type: 'system',
          text: '...',
          isLoading: true
        };
        
        // 立即添加临时响应到对话
        setConversation(prev => [...prev, tempResponse]);
        
        // 使用AbortController设置超时
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        // 使用fetch API替代axios
        fetch(`${API_BASE_URL}/api/generate-multimodal`, {
          method: 'POST',
          body: formData,
          signal: controller.signal
        })
        .then(response => {
          clearTimeout(timeoutId);
          if (!response.ok) {
            throw new Error(`服务器返回错误: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          // 移除临时响应
          setConversation(prev => prev.filter(msg => msg.id !== tempResponseId));
          
          console.log('Received backend response for manual capture:', data);
          handleBackendResponse(data, emotionAnalysisPrompt);
        })
        .catch(err => {
          // 移除临时响应
          setConversation(prev => prev.filter(msg => msg.id !== tempResponseId));
          
          console.error('Failed to send manual image capture:', err);
          setError('处理图像时出错: ' + (err.message || '未知错误'));
        })
        .finally(() => {
          setIsProcessing(false);
          if (onProcessEnd) onProcessEnd();
        });
    }, 'image/jpeg', 0.9);
    } catch (error) {
      console.error('Error during manual image capture:', error);
      setError('图像捕获过程中出现错误');
    } finally {
      canvas.remove();
    }
  };
  
  const handleMessageChange = (e) => {
    setMessage(e.target.value);
  };
  
  const handleFileButtonClick = () => {
    fileInputRef.current.click();
  };
  
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
      setFiles(selectedFiles);
      
      // Create previews for images and videos
      const newPreviews = selectedFiles.map(file => {
        if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
          return URL.createObjectURL(file);
        }
        return null;
      });
      
      setPreviews(newPreviews);
    }
  };
  
  // Check camera status on component mount
  useEffect(() => {
    if (cameraEnabled) {
      console.log('Camera should be enabled - videoRef:', videoRef.current);
      
      // If videoRef exists but doesn't have srcObject, try to start camera
      if (videoRef.current && !videoRef.current.srcObject) {
        console.log('Video element exists but no srcObject - trying to start camera');
        startCamera();
      }
    }
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // Add debugging to component
  useEffect(() => {
    console.log('Camera enabled state changed:', cameraEnabled);
    console.log('Video element ref:', videoRef.current);
    if (videoRef.current) {
      console.log('Video srcObject:', videoRef.current.srcObject);
    }
  }, [cameraEnabled]);

  // Make sure when camera is toggled on, we start the camera
  const handleToggleCamera = () => {
    console.log('Toggle camera clicked, current state:', cameraEnabled);
    if (cameraEnabled) {
      console.log('Stopping camera');
      if (!useExternalCamera) {
        stopCamera();
      }
      onCameraToggle(false);
    } else {
      console.log('Starting camera');
      // Set cameraEnabled first and let useEffect handle starting the camera
      onCameraToggle(true);
    }
  };
  
  const handleToggleAudio = () => {
    onAudioToggle(!audioEnabled);
  };
  
  // 渲染加载状态的组件
  const LoadingDots = () => {
    const [dots, setDots] = useState('.');
    
    useEffect(() => {
      const interval = setInterval(() => {
        setDots(prev => prev.length >= 3 ? '.' : prev + '.');
      }, 300);
      
      return () => clearInterval(interval);
    }, []);
    
    return <span className="loading-dots">{dots}</span>;
  };
  
  // 优化聊天记录渲染 - 限制最大显示条数
  const MAX_VISIBLE_MESSAGES = 20; // 最多显示20条消息
  
  const renderConversation = () => {
    // 只显示最新的20条消息，提高渲染性能
    const visibleMessages = conversation.slice(-MAX_VISIBLE_MESSAGES);
    
    return visibleMessages.map(message => (
      <div key={message.id} className={`chat-message ${message.type}-message`}>
        {message.type === 'user' && (
          <div className="message-content user-content">
            {message.previews && message.previews.length > 0 && message.previews[0] && (
              <div className="message-media">
                {message.files[0].type.startsWith('image/') ? (
                  <img src={message.previews[0]} alt="User upload" className="media-preview" loading="lazy" />
                ) : message.files[0].type.startsWith('video/') ? (
                  <video src={message.previews[0]} className="media-preview" controls preload="metadata" />
                ) : (
                  <div className="file-info">{message.files[0].name}</div>
                )}
              </div>
            )}
            <div className="message-text">
              <span className="message-sender">You:</span>
              {message.text}
            </div>
          </div>
        )}
        
        {message.type === 'system' && (
          <div className={`message-content system-content ${message.isLoading ? 'loading' : ''}`}>
            <div className="message-text">
              <span className="message-sender">猫头鹰:</span>
              {message.isLoading ? <LoadingDots /> : message.text}
            </div>
            {!message.isLoading && message.data && message.data.sentiment_score !== undefined && (
              <div className="sentiment-score">
                情感分数: {message.data.sentiment_score.toFixed(2)}
              </div>
            )}
          </div>
        )}
      </div>
    ));
  };
  
  // Load conversation history from localStorage
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('conversationHistory');
      if (savedHistory) {
        setConversationHistory(JSON.parse(savedHistory));
        console.log('Loaded conversation history from localStorage');
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    }
  }, []);

  // Save conversation history to localStorage when updated
  useEffect(() => {
    if (conversationHistory.length > 0) {
      try {
        localStorage.setItem('conversationHistory', JSON.stringify(conversationHistory));
      } catch (error) {
        console.error('Failed to save conversation history:', error);
      }
    }
  }, [conversationHistory]);
  
  // Enable clicking the file input from outside the component
  useEffect(() => {
    // Expose a function to simulate click on file input
    if (fileInputRef.current) {
      fileInputRef.current.handleFileButtonClick = handleFileButtonClick;
    }
    
    return () => {
      if (fileInputRef.current) {
        delete fileInputRef.current.handleFileButtonClick;
      }
    };
  }, []);

  return (
    <div className={`unified-chatbox ${cameraEnabled ? 'chatbox-with-camera' : ''}`}>
      {/* Single column layout, with camera in bottom right when enabled */}
      <div className="chatbox-header">
        <h2>Skyris Pet Owl</h2>
      </div>
      
      <div className="chat-container" ref={chatContainerRef}>
        {conversation.length === 0 ? (
          <div className="empty-chat">
            <p>Share your day with Skyris!</p>
          </div>
        ) : (
          renderConversation()
        )}
      </div>
      
      <div className="input-controls">
        {/* Removed media controls that duplicate bottom icons */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          style={{ display: 'none' }}
          accept="image/*,audio/*,video/*"
        />
        
        <div className="message-input-container">
          <textarea 
            className="message-input"
            placeholder={audioEnabled ? "Listening to voice input..." : "Type message here..."}
            value={message}
            onChange={handleMessageChange}
            disabled={isProcessing}
          />
          
          <button 
            className="send-button" 
            onClick={() => handleSendMessage()}
            disabled={(!message.trim() && files.length === 0) || isProcessing || !backendConnected}
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      {/* 预览区域 - Conditionally render based on file previews */}
      {previews.length > 0 ? (
        <div className="preview-container">
          {previews.map((preview, index) => (
            <div key={index} className="preview-item">
              {files[index].type.startsWith('image/') ? (
                <img src={preview} alt={`Preview ${index}`} className="file-preview" />
              ) : files[index].type.startsWith('video/') ? (
                <video src={preview} className="file-preview" controls />
              ) : (
                <div className="file-info">{files[index].name}</div>
              )}
              <button 
                className="remove-preview" 
                onClick={() => {
                  const newFiles = [...files];
                  const newPreviews = [...previews];
                  newFiles.splice(index, 1);
                  newPreviews.splice(index, 1);
                  setFiles(newFiles);
                  setPreviews(newPreviews);
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : (
        // Empty preview area placeholder to maintain consistent height
        <div className="empty-preview-container"></div>
      )}
      
      {/* Camera display at bottom-right when enabled */}
      {cameraEnabled && !useExternalCamera && (
        <div className="camera-container bottom-right">
          <video 
            ref={videoRef}
            autoPlay 
            playsInline
            muted
            className="camera-preview"
            style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div className="camera-status status-bottom">
            <span className={`status-indicator ${cameraCaptureIntervalRef.current ? 'active' : ''}`}></span>
            Camera is on, automatically analyze every {captureInterval/1000} seconds
          </div>
          
          <div className={`live-transcript ${transcript ? 'active' : 'empty'}`}>
            {transcript || "Listening..."}
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedChatbox;
