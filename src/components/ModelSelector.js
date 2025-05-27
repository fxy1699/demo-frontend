import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS, OLLAMA_API_URL, MODEL_CONFIG, MODE_NAMES } from '../config';
import './ModelSelector.css';
import { ollamaAPI } from '../utils/ollamaIntegration';

const ModelSelector = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [models, setModels] = useState({
    api: MODEL_CONFIG.API_MODELS,
    ollama: MODEL_CONFIG.OLLAMA_MODELS,
    local: []
  });
  const [current, setCurrent] = useState({
    mode: 'api',  // 默认使用API模式
    model: { id: 'qwen-omni-turbo', name: 'Qwen Omni Turbo (在线)' }
  });
  
  // 获取可用模型列表
  useEffect(() => {
    const fetchModels = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // 从后端获取模型列表和当前配置
        const response = await axios.get(`${API_BASE_URL}${API_ENDPOINTS.LLM_MODELS}`);
        const backendModels = response.data.models || { api: [], ollama: [], local: [] };
        setCurrent(response.data.current || { mode: 'api', model: { id: 'qwen-omni-turbo', name: 'Qwen Omni Turbo (在线)' } });
        
        // 尝试从Ollama API直接获取模型
        try {
          const ollamaModels = await ollamaAPI.listModels();
          if (ollamaModels.length > 0) {
            // 使用直接从Ollama获取的模型列表
            setModels({
              ...backendModels,
              ollama: ollamaModels
            });
          } else {
            // 使用默认列表或后端返回的列表
            setModels({
              api: backendModels.api.length > 0 ? backendModels.api : MODEL_CONFIG.API_MODELS,
              ollama: backendModels.ollama.length > 0 ? backendModels.ollama : MODEL_CONFIG.OLLAMA_MODELS,
              local: backendModels.local
            });
          }
        } catch (ollamaError) {
          console.warn('Failed to fetch models from Ollama API directly:', ollamaError);
          // 使用默认列表或后端返回的列表
          setModels({
            api: backendModels.api.length > 0 ? backendModels.api : MODEL_CONFIG.API_MODELS,
            ollama: backendModels.ollama.length > 0 ? backendModels.ollama : MODEL_CONFIG.OLLAMA_MODELS,
            local: backendModels.local
          });
        }
      } catch (err) {
        console.error('获取模型列表失败:', err);
        setError('Failed to load model list, loaded default configuration');
        
        // 使用默认配置
        setModels({
          api: MODEL_CONFIG.API_MODELS,
          ollama: MODEL_CONFIG.OLLAMA_MODELS,
          local: []
        });
        
        // 如果后端不可用，尝试直接从Ollama获取
        try {
          const ollamaModels = await ollamaAPI.listModels();
          if (ollamaModels.length > 0) {
            // 更新Ollama模型列表
            setModels(prevModels => ({
              ...prevModels,
              ollama: ollamaModels
            }));
          }
        } catch (ollamaError) {
          console.error('Both backend and Ollama API failed:', ollamaError);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchModels();
  }, []);

  // 切换模型
  const handleModelChange = async (mode, modelId) => {
    setLoading(true);
    setError(null);
    
    try {
      // 尝试通过后端API切换模型
      try {
        await axios.post(`${API_BASE_URL}${API_ENDPOINTS.SET_LLM_MODEL}`, {
          mode,
          model_id: modelId
        });
      } catch (apiError) {
        console.warn('通过后端API切换模型失败:', apiError);
        setError('已更新前端模型设置，但后端可能未同步更新');
        
        // 如果后端不可用，但是模式是ollama，我们可以继续，因为前端可以直接使用Ollama API
        if (mode !== 'ollama' && mode !== 'api') {
          throw new Error('切换模型失败，后端不可用');
        }
      }
      
      // 更新当前模型信息
      setCurrent({
        mode,
        model: {
          id: modelId,
          name: findModelName(mode, modelId)
        }
      });
      
      // 如果是Ollama模式，确保ollamaAPI使用正确的模型
      if (mode === 'ollama' && modelId) {
        ollamaAPI.setDefaultModel(modelId);
      }
      
    } catch (err) {
      console.error('切换模型失败:', err);
      setError('切换模型失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // 根据模式和ID查找模型名称
  const findModelName = (mode, modelId) => {
    const modeModels = models[mode] || [];
    const model = modeModels.find(m => m.id === modelId);
    return model ? model.name : modelId;
  };

  return (
    <div className="model-selector">
      <h3>LLM Settings</h3>
      
      {error && <div className="model-error">{error}</div>}
      
      <div className="current-model">
        <div>
          Current Mode: <span className="highlight">{MODE_NAMES[current.mode] || current.mode}</span>
          {current.mode === 'api' && <span className="online-badge">在线</span>}
          {current.mode === 'ollama' && <span className="local-badge">本地</span>}
        </div>
        {current.model.id && (
          <div>Current Model: <span className="highlight">{current.model.name || current.model.id}</span></div>
        )}
      </div>
      
      <div className="model-groups">
        {/* API 模型 */}
        <div className="model-group">
          <h4>
            <span>在线API模型</span>
            <span className="mode-tag online">使用在线API</span>
          </h4>
          <div className="model-buttons">
            {models.api.map(model => (
              <button
                key={model.id}
                className={current.mode === 'api' && current.model.id === model.id ? 'active' : ''}
                onClick={() => handleModelChange('api', model.id)}
                disabled={loading}
              >
                {model.name}
              </button>
            ))}
            {models.api.length === 0 && <span className="no-models">无可用模型</span>}
          </div>
        </div>
        
        {/* Ollama 模型 */}
        <div className="model-group">
          <h4>
            <span>Ollama本地模型</span>
            <span className="mode-tag local">本地运行</span>
          </h4>
          <div className="model-buttons">
            {models.ollama.map(model => (
              <button
                key={model.id}
                className={current.mode === 'ollama' && current.model.id === model.id ? 'active' : ''}
                onClick={() => handleModelChange('ollama', model.id)}
                disabled={loading}
              >
                {model.name}
              </button>
            ))}
            {models.ollama.length === 0 && (
              <span className="no-models">
                未检测到可用Ollama模型
                <a href="https://ollama.com/" target="_blank" rel="noopener noreferrer" className="help-link">
                  了解Ollama
                </a>
              </span>
            )}
          </div>
        </div>
        
        {/* 其他模式 */}
        <div className="model-group">
          <h4>其他模式</h4>
          <div className="model-buttons">
            <button
              className={current.mode === 'rule' ? 'active' : ''}
              onClick={() => handleModelChange('rule', '')}
              disabled={loading}
            >
              规则模式 (不使用AI)
            </button>
          </div>
        </div>
      </div>
      
      {loading && <div className="loading">加载中...</div>}
    </div>
  );
};

export default ModelSelector; 