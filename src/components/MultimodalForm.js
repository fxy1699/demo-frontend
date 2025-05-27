import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import './MultimodalForm.css';

const MultimodalForm = ({ onProcessStart, onProcessEnd, onResult }) => {
  const [prompt, setPrompt] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [error, setError] = useState(null);
  const [inputType, setInputType] = useState('text'); // 'text', 'image', 'audio', 'video', 'frames'
  const [file, setFile] = useState(null);
  const [imageFrames, setImageFrames] = useState([]);
  const [preview, setPreview] = useState(null);
  const [withAudio, setWithAudio] = useState(false);
  const [audioStyle, setAudioStyle] = useState('cartoon');
  const [voice, setVoice] = useState('Cherry');
  const [maxTokens, setMaxTokens] = useState(1024);
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(0.9);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 处理提示文本输入
  const handlePromptChange = (e) => {
    setPrompt(e.target.value);
    if (e.target.value.length > 5000) {
      setError('提示文本长度超过限制（最大5000字符）');
    } else {
      setError(null);
    }
  };

  // 处理系统提示输入
  const handleSystemPromptChange = (e) => {
    setSystemPrompt(e.target.value);
  };

  // 处理文件选择
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // 检查文件类型是否匹配当前输入类型
      if (inputType === 'image' && !selectedFile.type.startsWith('image/')) {
        setError('请选择图片文件');
        setFile(null);
        setPreview(null);
        return;
      }
      
      if (inputType === 'audio' && !selectedFile.type.startsWith('audio/')) {
        setError('请选择音频文件');
        setFile(null);
        setPreview(null);
        return;
      }
      
      if (inputType === 'video' && !selectedFile.type.startsWith('video/')) {
        setError('请选择视频文件');
        setFile(null);
        setPreview(null);
        return;
      }
      
      setFile(selectedFile);
      setError(null);
      
      // 为图片和视频创建预览
      if (inputType === 'image' || inputType === 'video') {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        setPreview(null);
      }
    }
  };

  // 处理多帧图像选择
  const handleFramesChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    // 检查文件类型
    const invalidFiles = selectedFiles.filter(file => !file.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      setError('只能选择图片文件作为帧');
      return;
    }
    
    setImageFrames(selectedFiles);
    setError(null);
    
    // 为第一帧创建预览
    if (selectedFiles.length > 0) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFiles[0]);
    } else {
      setPreview(null);
    }
  };

  // 切换输入类型
  const handleInputTypeChange = (type) => {
    setInputType(type);
    setFile(null);
    setImageFrames([]);
    setPreview(null);
    setError(null);
  };

  // 提交表单
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 基本验证
    if (!prompt.trim()) {
      setError('请输入提示文本');
      return;
    }
    
    // 文件验证
    if ((inputType === 'image' || inputType === 'audio' || inputType === 'video') && !file) {
      setError(`请选择${inputType === 'image' ? '图片' : inputType === 'audio' ? '音频' : '视频'}文件`);
      return;
    }
    
    if (inputType === 'frames' && imageFrames.length === 0) {
      setError('请至少选择一个图片帧');
      return;
    }
    
    // 调用处理开始回调
    if (onProcessStart) {
      onProcessStart();
    }
    
    try {
      let response;
      
      if (inputType === 'text') {
        // 使用多模态API处理纯文本
        const formData = new FormData();
        formData.append('prompt', prompt);
        if (systemPrompt) formData.append('system_prompt', systemPrompt);
        formData.append('max_tokens', maxTokens);
        formData.append('temperature', temperature.toString());
        formData.append('top_p', topP.toString());
        formData.append('with_audio', withAudio ? 'true' : 'false');
        if (withAudio) {
          formData.append('voice', voice);
          formData.append('audio_style', audioStyle);
        }
        
        response = await axios.post(
          `${API_BASE_URL}/api/generate-multimodal`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }
        );
      } else if (inputType === 'frames') {
        // 多帧图像处理
        const formData = new FormData();
        formData.append('prompt', prompt);
        if (systemPrompt) formData.append('system_prompt', systemPrompt);
        formData.append('max_tokens', maxTokens);
        formData.append('temperature', temperature);
        formData.append('top_p', topP);
        formData.append('with_audio', withAudio ? 'true' : 'false');
        if (withAudio) formData.append('voice', voice);
        formData.append('audio_style', audioStyle);
        
        // 添加所有图片帧
        imageFrames.forEach(frame => {
          formData.append('image_files', frame);
        });
        
        response = await axios.post(
          `${API_BASE_URL}/api/multimodal/image-frames`,
          formData
        );
      } else {
        // 图片、音频或视频处理
        const formData = new FormData();
        formData.append('prompt', prompt);
        if (systemPrompt) formData.append('system_prompt', systemPrompt);
        formData.append('max_tokens', maxTokens);
        formData.append('temperature', temperature);
        formData.append('top_p', topP);
        formData.append('with_audio', withAudio ? 'true' : 'false');
        formData.append('audio_style', audioStyle);
        if (withAudio) formData.append('voice', voice);
        
        // 根据输入类型添加不同的文件
        if (inputType === 'image') {
          formData.append('image_file', file);
        } else if (inputType === 'audio') {
          formData.append('audio_file', file);
        } else if (inputType === 'video') {
          formData.append('video_file', file);
        }
        
        response = await axios.post(
          `${API_BASE_URL}/api/generate-multimodal`,
          formData
        );
      }
      
      // 处理结果
      if (onResult) {
        onResult(response.data);
      }
      
    } catch (err) {
      console.error('处理请求失败:', err);
      setError(err.response?.data?.error || '处理请求时出现错误');
      if (onResult) {
        onResult(null);
      }
    } finally {
      // 调用处理结束回调
      if (onProcessEnd) {
        onProcessEnd();
      }
    }
  };

  return (
    <div className="multimodal-form-container">
      <h2>多模态交互</h2>
      
      {/* 输入类型选择 */}
      <div className="input-type-selector">
        <button 
          className={`type-button ${inputType === 'text' ? 'active' : ''}`}
          onClick={() => handleInputTypeChange('text')}
        >
          文本输入
        </button>
        <button 
          className={`type-button ${inputType === 'image' ? 'active' : ''}`}
          onClick={() => handleInputTypeChange('image')}
        >
          图片输入
        </button>
        <button 
          className={`type-button ${inputType === 'audio' ? 'active' : ''}`}
          onClick={() => handleInputTypeChange('audio')}
        >
          音频输入
        </button>
        <button 
          className={`type-button ${inputType === 'video' ? 'active' : ''}`}
          onClick={() => handleInputTypeChange('video')}
        >
          视频输入
        </button>
        <button 
          className={`type-button ${inputType === 'frames' ? 'active' : ''}`}
          onClick={() => handleInputTypeChange('frames')}
        >
          多帧输入
        </button>
      </div>
      
      <form onSubmit={handleSubmit}>
        {/* 提示文本输入 */}
        <div className="form-group">
          <label htmlFor="prompt">提示文本:</label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={handlePromptChange}
            placeholder="请输入提示文本..."
            rows={4}
            required
          />
        </div>
        
        {/* 文件上传部分 */}
        {inputType !== 'text' && (
          <div className="form-group">
            <label htmlFor="file-upload">
              {inputType === 'image' ? '选择图片:' : 
               inputType === 'audio' ? '选择音频:' :
               inputType === 'video' ? '选择视频:' : '选择图片帧:'}
            </label>
            
            {inputType !== 'frames' ? (
              <input
                id="file-upload"
                type="file"
                onChange={handleFileChange}
                accept={
                  inputType === 'image' ? 'image/*' : 
                  inputType === 'audio' ? 'audio/*' : 'video/*'
                }
              />
            ) : (
              <input
                id="file-upload"
                type="file"
                onChange={handleFramesChange}
                accept="image/*"
                multiple
              />
            )}
            
            {/* 预览区域 */}
            {preview && (inputType === 'image' || inputType === 'video' || inputType === 'frames') && (
              <div className="preview-container">
                <img src={preview} alt="预览" className="file-preview" />
                {inputType === 'frames' && imageFrames.length > 0 && (
                  <div className="frames-info">已选择 {imageFrames.length} 个图片帧</div>
                )}
              </div>
            )}
            
            {inputType === 'audio' && file && (
              <div className="audio-info">
                已选择音频文件: {file.name}
              </div>
            )}
          </div>
        )}
        
        {/* 语音输出选项 */}
        <div className="audio-options">
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="withAudioOption"
              checked={withAudio}
              onChange={(e) => setWithAudio(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="withAudioOption">
              启用语音输出
            </label>
          </div>
          
          {withAudio && (
            <div className="audio-style-options">
              <div className="form-check form-check-inline">
                <input
                  className="form-check-input"
                  type="radio"
                  name="audioStyleOptions"
                  id="cartoonStyle"
                  value="cartoon"
                  checked={audioStyle === 'cartoon'}
                  onChange={() => setAudioStyle('cartoon')}
                />
                <label className="form-check-label" htmlFor="cartoonStyle">
                  卡通风格
                </label>
              </div>
              <div className="form-check form-check-inline">
                <input
                  className="form-check-input"
                  type="radio"
                  name="audioStyleOptions"
                  id="normalStyle"
                  value="normal"
                  checked={audioStyle === 'normal'}
                  onChange={() => setAudioStyle('normal')}
                />
                <label className="form-check-label" htmlFor="normalStyle">
                  普通人声
                </label>
              </div>
            </div>
          )}
        </div>
        
        {/* 高级选项切换 */}
        <div className="advanced-toggle">
          <button 
            type="button" 
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="toggle-button"
          >
            {showAdvanced ? '隐藏高级选项' : '显示高级选项'}
          </button>
        </div>
        
        {/* 高级选项 */}
        {showAdvanced && (
          <div className="advanced-options">
            <div className="form-group">
              <label htmlFor="system-prompt">系统提示:</label>
              <textarea
                id="system-prompt"
                value={systemPrompt}
                onChange={handleSystemPromptChange}
                placeholder="可选：设置系统提示..."
                rows={2}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="max-tokens">最大生成长度:</label>
              <input
                id="max-tokens"
                type="number"
                min="1"
                max="4096"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="temperature">温度 (0.1-1.0):</label>
              <input
                id="temperature"
                type="range"
                min="0.1"
                max="1.0"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
              />
              <span className="range-value">{temperature}</span>
            </div>
            
            <div className="form-group">
              <label htmlFor="top-p">Top P (0.1-1.0):</label>
              <input
                id="top-p"
                type="range"
                min="0.1"
                max="1.0"
                step="0.1"
                value={topP}
                onChange={(e) => setTopP(parseFloat(e.target.value))}
              />
              <span className="range-value">{topP}</span>
            </div>
          </div>
        )}
        
        {/* 错误信息显示 */}
        {error && <div className="error-message">{error}</div>}
        
        {/* 提交按钮 */}
        <button 
          type="submit" 
          className="submit-button"
          disabled={
            !prompt.trim() || 
            ((inputType === 'image' || inputType === 'audio' || inputType === 'video') && !file) ||
            (inputType === 'frames' && imageFrames.length === 0)
          }
        >
          生成
        </button>
      </form>
    </div>
  );
};

export default MultimodalForm; 