// API配置
// 在开发环境中通过代理服务器请求，在生产环境中直接请求后端
const getApiBaseUrl = () => {
  // Check settings
  const useAlternateIp = localStorage.getItem('useAlternateIp') === 'true';
  
  if (process.env.NODE_ENV === 'production') {
    // In production, use the same domain (Vercel will proxy to backend)
    // This avoids mixed content issues since we're using the same HTTPS domain
    return process.env.REACT_APP_BACKEND_URL || 'https://demo.skyrisai.com';
  } else {
    // In development, check if public backend is available
    try {
      const publicBackend = localStorage.getItem('usePublicBackend');
      if (publicBackend === 'true') {
        // Use HTTP for development
        return useAlternateIp ? 
          'http://localhost:8080' : 
          'http://172.208.104.103:8080';
      }
    } catch (e) {
      console.log('Error accessing localStorage', e);
    }
    // Default to localhost with standard development port
    return 'http://localhost:5001';
  }
};

export const API_BASE_URL = getApiBaseUrl();

// Function to switch between local and public backend
export const switchBackend = (usePublic) => {
  try {
    localStorage.setItem('usePublicBackend', usePublic ? 'true' : 'false');
    // Force reload to apply the new backend URL
    window.location.reload();
  } catch (e) {
    console.error('Failed to switch backend', e);
  }
};

// Toggle between different IP/port combinations for testing connectivity
export const toggleIpMode = () => {
  try {
    const current = localStorage.getItem('useAlternateIp') === 'true';
    localStorage.setItem('useAlternateIp', (!current).toString());
    window.location.reload();
  } catch (e) {
    console.error('Failed to toggle IP mode', e);
  }
};

// Ollama API配置
// Note: Ollama will only work in development mode since it requires local access
export const OLLAMA_API_URL = process.env.NODE_ENV === 'production'
  ? null // Not available in production
  : 'http://127.0.0.1:11434/api';
export const OLLAMA_DEFAULT_MODEL = 'qwen2.5:7b';

// API端点
export const API_ENDPOINTS = {
  ANALYZE_TEXT: '/api/analyze-text',
  ANALYZE_IMAGE: '/api/analyze-emotion',
  ANALYZE_AUDIO: '/api/analyze-audio',
  ANALYZE_VIDEO: '/api/analyze-video',
  CHECK_CONNECTION: '/api/healthcheck',
  START_BACKEND: '/api/start-backend',
  // 新增多模态API端点
  GENERATE_TEXT: '/api/generate-text',
  GENERATE_MULTIMODAL: '/api/generate-multimodal',
  MULTIMODAL_IMAGE_FRAMES: '/api/multimodal/image-frames',
  MULTIMODAL_AUDIO_OUTPUT: '/api/multimodal/audio-output',
  LLM_CONFIG: '/api/llm/config',
  // 模型管理API端点
  LLM_MODELS: '/api/llm/models',
  SET_LLM_MODEL: '/api/llm/set-model',
  // Ollama API端点
  OLLAMA_GENERATE: '/generate',
  OLLAMA_MODELS: '/tags'
};

// 默认模型配置
export const MODEL_CONFIG = {
  // 在线API模型
  API_MODELS: [
    { id: 'qwen-omni-turbo', name: 'Qwen Omni Turbo (Online)' },
    { id: 'qwen-turbo', name: 'Qwen Turbo (Online)' },
    { id: 'qwen-plus', name: 'Qwen Plus (Online)' }
  ],
  // 本地Ollama模型
  OLLAMA_MODELS: [
    { id: 'qwen2.5:7b', name: 'Qwen 2.5 7B (Local)' },
    { id: 'llama3:8b', name: 'Llama 3 8B (Local)' }
  ],
  // 默认模式
  DEFAULT_MODE: 'api'
};

// 模式名称映射
export const MODE_NAMES = {
  api: 'Cloud API',
  ollama: 'Ollama Local LLM',
  local: 'Local LLM',
  rule: 'Rule Mode (Without AI)'
};

// 模拟响应数据（测试模式使用）
export const MOCK_RESPONSE = {
  emotion: 'happy',
  sentiment_score: 0.85,
  keywords: ['积极', '快乐', '美好'],
  summary: '这是一个非常积极的文本，表达了对生活的热爱和对未来的期待。'
};

// 上传配置
export const UPLOAD_CONFIG = {
  // 允许的文件类型
  ACCEPTED_FILE_TYPES: {
    IMAGE: 'image/*',
    AUDIO: 'audio/*',
    VIDEO: 'video/*'
  },
  // 最大文件大小 (32MB)
  MAX_FILE_SIZE: 32 * 1024 * 1024,
};

// 错误消息
export const ERROR_MESSAGES = {
  FILE_TOO_LARGE: '文件太大，请上传不超过32MB的文件',
  INVALID_FILE_TYPE: '不支持的文件类型',
  UPLOAD_FAILED: '上传失败，请重试',
  ANALYSIS_FAILED: '分析失败，请重试',
  NO_TEXT: '请输入文本内容',
  SERVER_ERROR: '服务器错误，请稍后重试',
  CONNECTION_ERROR: '无法连接到后端服务，请确保服务已启动并刷新页面'
};

// 连接检查配置
export const CONNECTION_CHECK_INTERVAL = 60000; // 60秒检查一次

// 其他配置
export const MAX_TEXT_LENGTH = 5000; // 最大文本长度限制

// 多模态配置
export const MULTIMODAL_CONFIG = {
  // 默认语音选项
  VOICE_OPTIONS: [
    { value: 'Cherry', label: 'Cherry (女声)' },
    { value: 'Ethan', label: 'Ethan (男声)' }
  ]
  // Removed the DEFAULT_SYSTEM_PROMPT - now loaded from the backend prompt_manager
}; 