/**
 * 语音识别和语音活动检测工具类
 * 使用Web Speech API进行语音识别
 * 使用Web Audio API进行语音活动检测(VAD)
 */

class SpeechRecognitionService {
  constructor(options = {}) {
    this.recognition = null;
    this.isRecognizing = false;
    this.audioContext = null;
    this.audioStream = null;
    this.analyzer = null;
    this.scriptProcessor = null;
    this.vadActive = false;
    this.silenceTimeout = null;
    this.audioChunks = [];
    this.recordingSampleRate = 16000; // 录音采样率
    this.noSpeechTimeout = null;      // 无语音超时
    this.isSleeping = false;          // 休眠状态
    this.sleepingVAD = false;         // VAD休眠状态
    this.vadWakingTimeout = null;     // VAD唤醒超时
    this.continuousMode = false;      // 连续对话模式
    this.conversationContext = [];    // 对话上下文，存储历史对话内容
    this.isWaitingForAIResponse = false; // 是否正在等待AI响应
    this.reconnectAttempts = 0;       // 重连尝试次数
    this.maxReconnectAttempts = 3;    // 最大重连次数
    this.reconnectTimeout = null;     // 重连超时定时器
    this.isInitialized = false;       // 是否已初始化
    this.isStopping = false;          // 是否正在停止过程中
    this.currentTranscript = '';      // 当前识别的文本
    
    // 配置选项
    this.options = {
      language: options.language || 'zh-CN',         // 语音识别语言
      continuous: options.continuous || false,       // 连续识别模式
      interimResults: options.interimResults || true, // 返回中间结果
      silenceThreshold: options.silenceThreshold || -50, // 静音检测阈值 (dB)
      silenceTime: options.silenceTime || 1500,       // 静音持续时间判定为句子结束 (ms)
      noSpeechTime: options.noSpeechTime || 10000,    // 无语音输入超时时间 (ms)，默认10秒
      onResult: options.onResult || (() => {}),      // 识别结果回调
      onSilence: options.onSilence || (() => {}),    // 静音检测回调
      onError: options.onError || (() => {}),        // 错误回调
      onSpeechStart: options.onSpeechStart || (() => {}), // 语音开始回调
      onSpeechEnd: options.onSpeechEnd || (() => {}),    // 语音结束回调
      onStatusChange: options.onStatusChange || (() => {}), // 状态变化回调
      onSendToAI: options.onSendToAI || (() => {}),  // 发送到AI的回调
      onSleep: options.onSleep || (() => {}),        // 休眠回调
      onWakeUp: options.onWakeUp || (() => {}),      // 唤醒回调
      maxConversationLength: options.maxConversationLength || 10, // 保存的最大对话轮数
      autoRestart: options.autoRestart !== undefined ? options.autoRestart : true, // AI回复后是否自动重启识别
      fallbackToMediaRecorder: options.fallbackToMediaRecorder !== undefined ? options.fallbackToMediaRecorder : true, // 是否在Web Speech API失败时使用MediaRecorder API
      debugMode: options.debugMode || false          // 调试模式
    };
    
    // 状态追踪
    this.status = 'idle'; // 'idle', 'listening', 'userSpeaking', 'recognizing', 'aiProcessing', 'aiSpeaking', 'sleeping'
    
    // 检查浏览器是否支持语音识别API
    this.isWebSpeechSupported = ('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window);
    this.isMediaRecorderSupported = ('MediaRecorder' in window);
    
    if (!this.isWebSpeechSupported && !this.isMediaRecorderSupported) {
      throw new Error('您的浏览器不支持语音识别API或MediaRecorder API');
    }
    
    // 初始化语音识别
    this._initRecognition();
  }
  
  /**
   * 输出调试日志
   * 只有在 debugMode 开启时才会输出
   * @param {string} message - 日志消息
   * @private
   */
  _debugLog(message) {
    if (this.options && this.options.debugMode) {
      console.log(`[SpeechRecognition] ${message}`);
    }
  }
  
  /**
   * 初始化语音识别
   * @private
   */
  _initRecognition() {
    if (this.isInitialized) return;
    
    try {
      if (this.isWebSpeechSupported) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.lang = this.options.language;
        this.recognition.continuous = this.options.continuous;
        this.recognition.interimResults = this.options.interimResults;
        
        // 绑定事件
        this.recognition.onresult = this._handleRecognitionResult.bind(this);
        this.recognition.onerror = this._handleRecognitionError.bind(this);
        this.recognition.onend = this._handleRecognitionEnd.bind(this);
        this.recognition.onstart = this._handleRecognitionStart.bind(this);
        
        this._debugLog('Web Speech API 初始化成功');
      } else if (this.options.fallbackToMediaRecorder && this.isMediaRecorderSupported) {
        this._debugLog('Web Speech API 不可用，使用 MediaRecorder API 作为备选');
        // MediaRecorder 仅能提供音频录制功能，不能直接转录
        // 在这种情况下，我们只能录制音频并发送到后端进行处理
      }
      
      this.isInitialized = true;
      
      // 启动无语音超时检测
      this._startNoSpeechTimeout();
    } catch (error) {
      this._debugLog('语音识别初始化失败: ' + error.message);
      throw error;
    }
  }
  
  /**
   * 设置当前状态
   * @param {string} status - 新的状态
   * @private
   */
  _setStatus(status) {
    if (this.status !== status) {
      this.status = status;
      this.options.onStatusChange(status);
      
      // 如果进入了休眠状态，调用休眠回调
      if (status === 'sleeping') {
        this.options.onSleep();
      }
      
      // 重置无语音超时
      if (status === 'userSpeaking') {
        this._resetNoSpeechTimeout();
      }
    }
  }
  
  /**
   * 启动无语音超时检测
   * @private
   */
  _startNoSpeechTimeout() {
    // 清除已有的超时
    this._clearNoSpeechTimeout();
    
    // 如果已经在休眠中，不需要再设置超时
    if (this.isSleeping) return;
    
    // 设置新的超时
    this.noSpeechTimeout = setTimeout(() => {
      // 只有在非AI说话且正在识别状态时才进入休眠
      if (this.isRecognizing && this.status !== 'aiSpeaking' && this.status !== 'aiProcessing') {
        this._debugLog('检测到无语音输入，进入休眠状态');
        this._enterSleepMode();
      }
    }, this.options.noSpeechTime);
  }
  
  /**
   * 清除无语音超时
   * @private
   */
  _clearNoSpeechTimeout() {
    if (this.noSpeechTimeout) {
      clearTimeout(this.noSpeechTimeout);
      this.noSpeechTimeout = null;
    }
  }
  
  /**
   * 重置无语音超时
   * @private
   */
  _resetNoSpeechTimeout() {
    this._clearNoSpeechTimeout();
    this._startNoSpeechTimeout();
  }
  
  /**
   * 进入休眠模式
   * @private
   */
  _enterSleepMode() {
    // 只有在非休眠状态下才执行
    if (this.isSleeping) return;
    
    this.isSleeping = true;
    this.sleepingVAD = true;
    
    // 更新状态
    this._setStatus('sleeping');
    
    // 停止语音识别，但保持VAD活动以便能够唤醒
    this._safelyStopRecognition();
    
    // 保持VAD处于活动状态以监听唤醒的语音
    this._debugLog('语音识别已暂停，进入休眠模式');
  }
  
  /**
   * 安全停止语音识别（避免抛出错误）
   * @private
   */
  _safelyStopRecognition() {
    try {
      if (this.recognition && !this.isStopping) {
        this.isStopping = true;
        this.recognition.stop();
        setTimeout(() => {
          this.isStopping = false;
        }, 200);
      }
    } catch (e) {
      this._debugLog('停止识别出错，可能是识别尚未完全启动: ' + e.message);
    }
  }
  
  /**
   * 唤醒语音识别
   * @private
   */
  async _wakeUp() {
    // 只有在休眠状态下才执行
    if (!this.isSleeping) return;
    
    this.isSleeping = false;
    this.sleepingVAD = false;
    
    this._debugLog('检测到语音，唤醒系统');
    
    // 调用唤醒回调
    this.options.onWakeUp();
    
    // 重启语音识别
    try {
      // 重新初始化语音识别
      this._initRecognition();
      
      // 启动识别
      await this.start();
      
      this._debugLog('语音识别已重新启动');
    } catch (e) {
      this._debugLog('唤醒系统失败: ' + e.message);
      this.options.onError(e);
    }
    
    // 清除唤醒超时
    if (this.vadWakingTimeout) {
      clearTimeout(this.vadWakingTimeout);
      this.vadWakingTimeout = null;
    }
  }
  
  /**
   * 启动语音识别和VAD
   */
  async start() {
    // 防止重复启动
    if (this.isRecognizing && !this.isSleeping) return;
    
    try {
      // 如果在休眠状态，唤醒
      if (this.isSleeping) {
        await this._wakeUp();
        return;
      }
      
      this._setStatus('listening');
      
      // 确保初始化
      if (!this.isInitialized) {
        this._initRecognition();
      }
      
      // 启动语音识别
      if (this.isWebSpeechSupported) {
        try {
          this.recognition.start();
        } catch (e) {
          // 如果启动失败，可能是之前的实例尚未完全释放，尝试重新创建
          this._debugLog('启动语音识别失败，尝试重新初始化: ' + e.message);
          this.isInitialized = false;
          this._initRecognition();
          this.recognition.start();
        }
      }
      
      // 获取音频流并启动VAD
      await this._startVAD();
      
      this.isRecognizing = true;
      
      // 启动无语音超时
      this._startNoSpeechTimeout();
    } catch (error) {
      this._debugLog('启动语音识别失败: ' + error.message);
      
      // 如果使用Web Speech API失败，尝试降级到MediaRecorder
      if (this.options.fallbackToMediaRecorder && this.isMediaRecorderSupported && !this.isWebSpeechSupported) {
        this._debugLog('尝试使用MediaRecorder替代');
        await this._startMediaRecorderFallback();
      } else {
        this.options.onError(error);
        this._setStatus('idle');
      }
    }
  }
  
  /**
   * 使用MediaRecorder作为备选方案
   * @private
   */
  async _startMediaRecorderFallback() {
    try {
      // MediaRecorder仅能录制音频，无法提供实时转录
      // 此处仅实现音频录制功能
      this._debugLog('使用MediaRecorder作为备选方案');
      
      // 获取音频流
      await this._startVAD();
      
      this.isRecognizing = true;
      this._setStatus('listening');
    } catch (error) {
      this._debugLog('使用MediaRecorder替代失败: ' + error.message);
      this.options.onError(error);
      this._setStatus('idle');
    }
  }
  
  /**
   * 停止语音识别和VAD
   */
  stop() {
    // 防止重复停止
    if (!this.isRecognizing && !this.isSleeping) return;
    
    // 清除无语音超时
    this._clearNoSpeechTimeout();
    
    // 如果在休眠状态，先唤醒再停止
    if (this.isSleeping) {
      this.isSleeping = false;
      this.sleepingVAD = false;
    }
    
    // 停止语音识别
    this._safelyStopRecognition();
    
    // 停止VAD
    this._stopVAD();
    
    // 清除静音定时器
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
    
    // 清除重连定时器
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.isRecognizing = false;
    this._setStatus('idle');
  }
  
  /**
   * 启动语音活动检测(VAD)
   * @private
   */
  async _startVAD() {
    if (this.audioContext && this.scriptProcessor) {
      this._debugLog('VAD已经在运行中，无需重新启动');
      return;
    }
    
    try {
      // 获取麦克风音频流
      if (!this.audioStream) {
        this._debugLog('开始请求麦克风权限...');
        try {
          this.audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              channelCount: 1,
              sampleRate: this.recordingSampleRate
            }
          });
          this._debugLog('麦克风权限获取成功');
        } catch (micError) {
          this._debugLog(`麦克风权限请求失败: ${micError.name} - ${micError.message}`);
          // 包装错误以提供更多信息
          const enhancedError = new Error(this._getEnhancedErrorMessage(micError));
          enhancedError.originalError = micError;
          throw enhancedError;
        }
      }
      
      // 创建音频上下文
      if (!this.audioContext) {
        // 根据浏览器兼容性创建AudioContext
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) {
          throw new Error('您的浏览器不支持音频处理所需的AudioContext API');
        }
        
        this._debugLog('创建AudioContext...');
        try {
          this.audioContext = new AudioContext({
            sampleRate: this.recordingSampleRate
          });
          this._debugLog('AudioContext创建成功');
        } catch (audioCtxError) {
          this._debugLog(`创建AudioContext失败: ${audioCtxError.message}`);
          throw audioCtxError;
        }
      }
      
      // 如果AudioContext处于suspended状态，需要恢复
      if (this.audioContext.state === 'suspended') {
        this._debugLog('AudioContext处于suspended状态，尝试恢复...');
        await this.audioContext.resume();
        this._debugLog('AudioContext已恢复');
      }
      
      // 创建音频源节点
      this._debugLog('创建音频处理节点...');
      const source = this.audioContext.createMediaStreamSource(this.audioStream);
      
      // 创建分析器节点
      this.analyzer = this.audioContext.createAnalyser();
      this.analyzer.fftSize = 1024; // 提高精度
      this.analyzer.smoothingTimeConstant = 0.5; // 平滑系数，降低灵敏度
      
      // 创建ScriptProcessorNode (注：此API已被弃用，但兼容性更好)
      this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      // 连接节点
      source.connect(this.analyzer);
      this.analyzer.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);
      
      // 处理音频数据并进行VAD
      this.scriptProcessor.onaudioprocess = this._processAudio.bind(this);
      
      // 开始录制音频数据
      this.audioChunks = [];
      
      this._debugLog('VAD启动成功');
    } catch (error) {
      this._debugLog('启动VAD失败: ' + error.message);
      
      // 添加更详细的错误日志
      if (error.originalError) {
        this._debugLog(`原始错误: ${error.originalError.name} - ${error.originalError.message}`);
      }
      
      this.options.onError(error);
      
      // 尝试不同的配置重试一次
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        this._debugLog(`尝试重新连接 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        // 清理之前的资源
        await this._stopVAD();
        
        // 延迟重试
        this.reconnectTimeout = setTimeout(() => {
          this._startVAD().catch(e => {
            this._debugLog('重新连接失败: ' + e.message);
          });
        }, 1000);
      }
    }
  }
  
  /**
   * 获取增强的错误消息
   * @param {Error} error - 原始错误
   * @returns {string} - 增强的错误消息
   * @private
   */
  _getEnhancedErrorMessage(error) {
    if (!error) return '未知错误';
    
    switch (error.name) {
      case 'NotAllowedError':
        return '麦克风访问被拒绝。请在浏览器设置中允许麦克风访问。';
      case 'NotFoundError':
        return '未找到麦克风设备。请检查您的设备连接。';
      case 'NotReadableError':
      case 'TrackStartError':
        return '麦克风设备无法读取，可能被其他应用程序占用。请关闭其他可能使用麦克风的应用。';
      case 'OverconstrainedError':
        return '无法满足请求的麦克风配置要求。';
      case 'TypeError':
        return '无效的音频设置参数。';
      default:
        return `${error.name}: ${error.message}`;
    }
  }
  
  /**
   * 停止语音活动检测
   * @private
   */
  async _stopVAD() {
    // 断开和关闭音频节点
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    
    if (this.analyzer) {
      this.analyzer.disconnect();
      this.analyzer = null;
    }
    
    // 停止音频流
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }
    
    // 关闭音频上下文
    if (this.audioContext) {
      try {
        if (this.audioContext.state !== 'closed') {
          // 首先尝试挂起，然后再关闭，可能会减少一些错误
          await this.audioContext.suspend();
          await this.audioContext.close();
        }
      } catch (e) {
        this._debugLog('关闭音频上下文失败: ' + e.message);
      } finally {
        this.audioContext = null;
      }
    }
    
    this.vadActive = false;
    this._debugLog('VAD已停止');
  }
  
  /**
   * 处理音频数据并进行VAD
   * @param {AudioProcessingEvent} e - 音频处理事件
   * @private
   */
  _processAudio(e) {
    try {
      // 获取音频数据
      const input = e.inputBuffer.getChannelData(0);
      const output = e.outputBuffer.getChannelData(0);
      
      // 将输入复制到输出(必要的，否则ScriptProcessor会停止工作)
      for (let i = 0; i < input.length; i++) {
        output[i] = 0; // 设置为0避免回声
      }
      
      // 如果不是在休眠VAD模式，保存音频数据以发送到服务器
      if (!this.sleepingVAD) {
        // 复制数据以避免引用原始数据导致的问题
        this.audioChunks.push(new Float32Array(input));
      }
      
      // 计算音量大小
      const bufferLength = this.analyzer.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      this.analyzer.getByteFrequencyData(dataArray);
      
      // 计算平均音量
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      
      // 将音量值转换为分贝 (避免log(0)错误)
      const db = average > 0 ? 20 * Math.log10(average / 255) : -100;
      
      // 判断是否有语音活动
      const isSpeaking = db > this.options.silenceThreshold;
      
      // 如果在休眠VAD模式下检测到语音，尝试唤醒
      if (this.sleepingVAD && isSpeaking) {
        // 防止多次唤醒，使用超时机制
        if (!this.vadWakingTimeout) {
          this._debugLog(`检测到声音 (${db.toFixed(2)} dB)，准备唤醒`);
          this.vadWakingTimeout = setTimeout(() => {
            this._wakeUp();
          }, 300); // 300毫秒后唤醒，避免噪音误触发
        }
        return;
      }
      
      // 正常VAD处理
      if (this.isSleeping) return; // 如果在休眠状态，不做进一步处理
      
      // 处理语音状态变化
      if (isSpeaking && !this.vadActive) {
        // 语音开始
        this.vadActive = true;
        this._setStatus('userSpeaking');
        this.options.onSpeechStart();
        
        // 清除静音定时器
        if (this.silenceTimeout) {
          clearTimeout(this.silenceTimeout);
          this.silenceTimeout = null;
        }
        
        this._debugLog(`检测到语音开始 (${db.toFixed(2)} dB)`);
      } else if (!isSpeaking && this.vadActive) {
        // 可能检测到静音，设置定时器确认
        if (!this.silenceTimeout) {
          this._setStatus('recognizing');
          
          this._debugLog(`可能检测到语音结束 (${db.toFixed(2)} dB)，等待确认`);
          
          this.silenceTimeout = setTimeout(() => {
            // 持续静音，判定为语音结束
            this.vadActive = false;
            this.options.onSpeechEnd();
            this.options.onSilence();
            
            this._debugLog('确认检测到语音结束');
            
            // 停止识别和VAD
            this.stop();
            
            // 发送录制的音频到服务器
            this._sendAudioToServer();
            
          }, this.options.silenceTime);
        }
      } else if (isSpeaking && this.silenceTimeout) {
        // 重新检测到语音，取消静音定时器
        this._debugLog(`检测到语音继续 (${db.toFixed(2)} dB)`);
        clearTimeout(this.silenceTimeout);
        this.silenceTimeout = null;
        this._setStatus('userSpeaking');
      }
    } catch (error) {
      this._debugLog('处理音频数据出错: ' + error.message);
      // 非致命错误，继续运行
    }
  }
  
  /**
   * 将录制的音频数据发送到服务器
   * @private
   */
  _sendAudioToServer() {
    if (this.audioChunks.length === 0) {
      this._debugLog('没有可用的音频数据');
      return;
    }
    
    try {
      // 合并所有音频块
      const mergedBuffer = this._mergeAudioBuffers(this.audioChunks);
      
      // 创建WAV文件
      const wavBlob = this._createWavFile(mergedBuffer);
      
      // 设置状态为AI处理中
      this._setStatus('aiProcessing');
      this.isWaitingForAIResponse = true;
      
      // 记录当前对话到上下文
      if (this.lastTranscript) {
        this.conversationContext.push({
          role: 'user',
          content: this.lastTranscript
        });
        
        // 限制对话历史长度
        if (this.conversationContext.length > this.options.maxConversationLength * 2) {
          this.conversationContext = this.conversationContext.slice(-this.options.maxConversationLength * 2);
        }
      }
      
      this._debugLog(`准备发送音频到服务器，音频长度(字节): ${wavBlob.size}`);
      
      // 通知外部发送到AI
      this.options.onSendToAI({
        audioBlob: wavBlob,
        transcript: this.lastTranscript,
        conversationContext: this.conversationContext // 传递对话历史上下文
      });
      
      // 清空音频数据
      this.audioChunks = [];
      
    } catch (error) {
      this._debugLog('发送音频数据失败: ' + error.message);
      this.options.onError(error);
      this._setStatus('idle');
      this.isWaitingForAIResponse = false;
    }
  }
  
  /**
   * 合并多个音频缓冲区
   * @param {Array<Float32Array>} buffers - 音频缓冲区数组
   * @returns {Float32Array} - 合并后的音频缓冲区
   * @private
   */
  _mergeAudioBuffers(buffers) {
    // 计算总长度
    let totalLength = 0;
    for (const buffer of buffers) {
      totalLength += buffer.length;
    }
    
    // 创建新的缓冲区
    const mergedBuffer = new Float32Array(totalLength);
    
    // 合并缓冲区
    let offset = 0;
    for (const buffer of buffers) {
      mergedBuffer.set(buffer, offset);
      offset += buffer.length;
    }
    
    return mergedBuffer;
  }
  
  /**
   * 创建WAV文件
   * @param {Float32Array} buffer - 音频数据
   * @returns {Blob} - WAV文件Blob
   * @private
   */
  _createWavFile(buffer) {
    try {
      // WAV文件头
      const numSamples = buffer.length;
      const numChannels = 1;
      const bitsPerSample = 16;
      const bytesPerSample = bitsPerSample / 8;
      const blockAlign = numChannels * bytesPerSample;
      const byteRate = this.recordingSampleRate * blockAlign;
      const dataSize = numSamples * blockAlign;
      const headerSize = 44;
      const wavBuffer = new ArrayBuffer(headerSize + dataSize);
      const view = new DataView(wavBuffer);
      
      // 写入WAV文件头
      // "RIFF"
      view.setUint8(0, 0x52);
      view.setUint8(1, 0x49);
      view.setUint8(2, 0x46);
      view.setUint8(3, 0x46);
      // 文件大小
      view.setUint32(4, 36 + dataSize, true);
      // "WAVE"
      view.setUint8(8, 0x57);
      view.setUint8(9, 0x41);
      view.setUint8(10, 0x56);
      view.setUint8(11, 0x45);
      // "fmt "
      view.setUint8(12, 0x66);
      view.setUint8(13, 0x6d);
      view.setUint8(14, 0x74);
      view.setUint8(15, 0x20);
      // 格式块大小
      view.setUint32(16, 16, true);
      // 音频格式 (1 表示 PCM)
      view.setUint16(20, 1, true);
      // 声道数
      view.setUint16(22, numChannels, true);
      // 采样率
      view.setUint32(24, this.recordingSampleRate, true);
      // 字节率
      view.setUint32(28, byteRate, true);
      // 块对齐
      view.setUint16(32, blockAlign, true);
      // 位深度
      view.setUint16(34, bitsPerSample, true);
      // "data"
      view.setUint8(36, 0x64);
      view.setUint8(37, 0x61);
      view.setUint8(38, 0x74);
      view.setUint8(39, 0x61);
      // 数据大小
      view.setUint32(40, dataSize, true);
      
      // 写入音频数据
      const floatTo16BitPCM = (output, offset, input) => {
        for (let i = 0; i < input.length; i++, offset += 2) {
          const s = Math.max(-1, Math.min(1, input[i]));
          output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
      };
      
      floatTo16BitPCM(view, 44, buffer);
      
      return new Blob([wavBuffer], { type: 'audio/wav' });
    } catch (error) {
      this._debugLog('创建WAV文件失败: ' + error.message);
      throw error;
    }
  }
  
  /**
   * 处理语音识别结果
   * @param {SpeechRecognitionEvent} event - 语音识别事件
   * @private
   */
  _handleRecognitionResult(event) {
    try {
      const results = event.results;
      const result = {
        transcript: '',
        isFinal: false
      };
      
      for (let i = event.resultIndex; i < results.length; i++) {
        result.transcript += results[i][0].transcript;
        result.isFinal = results[i].isFinal;
      }
      
      // 保存最后的转录文本，以便发送到服务器
      this.lastTranscript = result.transcript;
      
      // 更新当前识别的文本
      this.currentTranscript = result.transcript;
      
      // 重置无语音超时
      this._resetNoSpeechTimeout();
      
      // 更新状态
      if (!result.isFinal) {
        this._setStatus('recognizing');
      }
      
      // 调用结果回调
      this.options.onResult(result);
      
      // 如果是最终结果，停止识别 - 注意，这里不立即停止，让VAD来处理
      if (result.isFinal) {
        this._debugLog('检测到最终识别结果: ' + result.transcript);
      }
    } catch (error) {
      this._debugLog('处理识别结果出错: ' + error.message);
      // 非致命错误，继续运行
    }
  }
  
  /**
   * 处理语音识别错误
   * @param {SpeechRecognitionError} event - 语音识别错误事件
   * @private
   */
  _handleRecognitionError(event) {
    // 记录错误信息，便于调试
    this._debugLog('语音识别错误: ' + event.error);
    
    // 特殊处理一些常见错误
    switch (event.error) {
      case 'no-speech':
        // 没有检测到语音，这是正常的
        this._debugLog('未检测到语音输入');
        return; // 不触发错误回调
        
      case 'aborted':
        // 中止操作通常是预期的
        this._debugLog('语音识别被中止，这通常是预期行为');
        return; // 不触发错误回调
        
      case 'network':
        // 网络错误，可能需要重试
        this._debugLog('网络错误，尝试重新连接');
        
        // 如果支持降级到本地录制，则启用
        if (this.options.fallbackToMediaRecorder && this.isMediaRecorderSupported) {
          this._debugLog('网络不可用，降级到本地录制模式');
          this.isWebSpeechSupported = false; // 临时禁用Web Speech API
          
          // 延迟后尝试重启
          setTimeout(() => {
            if (this.isRecognizing) {
              this.stop();
              this.start().catch(e => {
                this._debugLog('重启失败: ' + e.message);
              });
            }
          }, 1000);
          return;
        }
        break;
        
      case 'audio-capture':
        // 音频捕获错误
        this._debugLog('音频捕获设备错误，请检查麦克风权限');
        break;
        
      case 'not-allowed':
        // 权限被拒绝
        this._debugLog('麦克风访问被拒绝');
        break;
    }
    
    // 对于其他类型的错误，触发回调
    this.options.onError(event);
    
    // 根据错误严重性决定是否停止识别
    if (['audio-capture', 'not-allowed', 'service-not-allowed'].includes(event.error)) {
      // 严重错误，停止识别
      this.stop();
      this._setStatus('idle');
    } else if (this.isRecognizing) {
      // 非严重错误，尝试重启
      try {
        this._safelyStopRecognition();
        
        // 延迟重启，避免连续错误
        setTimeout(() => {
          if (this.isWebSpeechSupported && this.isRecognizing) {
            try {
              this.recognition.start();
            } catch (e) {
              this._debugLog('重启失败: ' + e.message);
            }
          }
        }, 1000);
      } catch (e) {
        this._debugLog('处理错误后重启失败: ' + e.message);
      }
    }
  }
  
  /**
   * 处理语音识别结束
   * @private
   */
  _handleRecognitionEnd() {
    this._debugLog('语音识别会话结束');
    
    // 如果不是正常停止或进入休眠导致的结束，尝试重启
    if (this.isRecognizing && !this.isSleeping && !this.isStopping && this.status !== 'aiProcessing') {
      this._debugLog('语音识别意外结束，尝试重启');
      
      // 设置延迟以避免过于频繁地重启
      setTimeout(() => {
        try {
          if (this.isRecognizing && !this.isSleeping && !this.isStopping && this.isWebSpeechSupported) {
            this.recognition.start();
            this._debugLog('语音识别已重启');
          }
        } catch (e) {
          this._debugLog('重启语音识别失败: ' + e.message);
          // 如果重启失败，且处于正常工作状态，设置为空闲
          if (this.isRecognizing && !this.isSleeping) {
            this.isRecognizing = false;
            this._setStatus('idle');
          }
        }
      }, 500);
    }
  }
  
  /**
   * 处理语音识别开始
   * @private
   */
  _handleRecognitionStart() {
    this._debugLog('语音识别会话开始');
    this.isRecognizing = true;
    
    // 启动无语音超时检测
    this._resetNoSpeechTimeout();
  }
  
  /**
   * 设置AI说话状态
   * @param {boolean} speaking - 是否正在说话
   * @param {string} [aiResponse] - AI的回复内容
   */
  setAiSpeaking(speaking, aiResponse) {
    if (speaking) {
      // AI开始说话时，清除无语音超时
      this._clearNoSpeechTimeout();
      this._setStatus('aiSpeaking');
      
      // 如果提供了AI回复内容，保存到对话历史
      if (aiResponse) {
        this.conversationContext.push({
          role: 'assistant',
          content: aiResponse
        });
      }
    } else {
      // AI结束说话时，如果不在休眠状态且启用了自动重启，重新启动识别
      this._setStatus('idle');
      this.isWaitingForAIResponse = false;
      
      if (!this.isSleeping && this.options.autoRestart) {
        this._debugLog('AI回复结束，自动重启语音识别');
        
        // 给UI一点时间来更新
        setTimeout(() => {
          try {
            this.start().catch(e => {
              this._debugLog('自动重启失败: ' + e.message);
            });
          } catch (e) {
            this._debugLog('自动重启语音识别失败: ' + e.message);
          }
        }, 500);
      } else {
        // 如果不自动重启，则设置无语音超时
        if (!this.isSleeping) {
          this._startNoSpeechTimeout();
        }
      }
    }
  }
  
  /**
   * 设置连续对话模式
   * @param {boolean} enabled - 是否启用连续对话
   */
  setContinuousMode(enabled) {
    this.continuousMode = enabled;
    this.options.autoRestart = enabled;
    this._debugLog(`连续对话模式已${enabled ? '开启' : '关闭'}`);
  }
  
  /**
   * 清除对话历史上下文
   */
  clearConversationContext() {
    this.conversationContext = [];
    this._debugLog('对话历史已清除');
  }
  
  /**
   * 获取当前对话历史上下文
   * @returns {Array} - 对话历史
   */
  getConversationContext() {
    return [...this.conversationContext];
  }
  
  /**
   * 检查是否正在等待AI响应
   * @returns {boolean} - 是否等待AI响应
   */
  isWaitingForResponse() {
    return this.isWaitingForAIResponse;
  }
  
  /**
   * 中断当前的AI响应
   */
  interruptAIResponse() {
    if (this.status === 'aiProcessing' || this.status === 'aiSpeaking') {
      this._debugLog('中断AI响应');
      this.setAiSpeaking(false);
    }
  }
  
  /**
   * 手动进入休眠模式
   */
  sleep() {
    this._enterSleepMode();
  }
  
  /**
   * 手动唤醒
   */
  async wakeUp() {
    await this._wakeUp();
  }
  
  /**
   * 获取当前状态
   * @returns {string} - 当前状态
   */
  getStatus() {
    return this.status;
  }
  
  /**
   * 判断是否处于休眠状态
   * @returns {boolean} - 是否休眠
   */
  isInSleepMode() {
    return this.isSleeping;
  }
  
  /**
   * 获取当前正在识别的文本
   * @returns {string} 当前识别的文本
   */
  getCurrentTranscript() {
    // Return the current interim transcript if available
    return this.currentTranscript || '';
  }
  
  /**
   * 检查语音识别是否处于活动状态
   * @returns {boolean} 语音识别是否正在监听
   */
  isListening() {
    return this.isRecognizing && (this.status === 'listening' || this.status === 'userSpeaking');
  }
  
  /**
   * 检查是否可以检测到音频
   * @returns {boolean} 是否已初始化音频分析
   */
  canDetectAudio() {
    return this.analyzer !== null && this.vadActive;
  }
}

export default SpeechRecognitionService; 