import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../config';
import './UploadForm.css';

const UploadForm = ({ onFileUpload, onProcessStart, onProcessEnd, onResult }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [text, setText] = useState('');
  const [mode, setMode] = useState('image'); // 'image' 或 'text'
  
  // 处理文件选择
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith('image/')) {
        setError('请选择图片文件');
        setFile(null);
        setPreview(null);
        return;
      }
      
      setFile(selectedFile);
      setError(null);
      
      // 创建预览
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
      
      // 通知父组件文件已选择
      if (onFileUpload) {
        onFileUpload(selectedFile);
      }
    }
  };
  
  // 处理文本输入
  const handleTextChange = (e) => {
    setText(e.target.value);
    
    if (e.target.value.length > 5000) {
      setError('文本长度超过限制（最大5000字符）');
    } else {
      setError(null);
    }
  };
  
  // 提交表单
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (mode === 'image') {
      // 图片模式
      if (!file) {
        setError('请先选择图片文件');
        return;
      }
      await analyzeImage();
    } else {
      // 文本模式
      if (!text || !text.trim()) {
        setError('请输入文本内容');
        return;
      }
      if (text.length > 5000) {
        setError('文本长度超过限制（最大5000字符）');
        return;
      }
      await analyzeText();
    }
  };
  
  // 分析图片
  const analyzeImage = async () => {
    // 通知开始处理
    if (onProcessStart) {
      onProcessStart();
    }
    
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(
        API_BASE_URL + API_ENDPOINTS.ANALYZE_IMAGE, 
        formData, 
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      // 返回结果给父组件
      if (onResult) {
        onResult(response.data);
      }
    } catch (err) {
      console.error('图片上传失败:', err);
      setError(err.response?.data?.error || '图片上传或分析过程中出现错误');
      if (onResult) {
        onResult(null);
      }
    } finally {
      // 通知处理结束
      if (onProcessEnd) {
        onProcessEnd();
      }
    }
  };
  
  // 分析文本
  const analyzeText = async () => {
    // 通知开始处理
    if (onProcessStart) {
      onProcessStart();
    }
    
    setError(null);
    
    try {
      const response = await axios.post(
        API_BASE_URL + API_ENDPOINTS.ANALYZE_TEXT, 
        { text },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      // 返回结果给父组件
      if (onResult) {
        onResult(response.data);
      }
    } catch (err) {
      console.error('文本分析失败:', err);
      setError(err.response?.data?.error || '文本分析过程中出现错误');
      if (onResult) {
        onResult(null);
      }
    } finally {
      // 通知处理结束
      if (onProcessEnd) {
        onProcessEnd();
      }
    }
  };
  
  // 切换模式（图片/文本）
  /* 当前使用单独的按钮替代此函数，保留以备将来可能需要使用
  const toggleMode = () => {
    setMode(mode === 'image' ? 'text' : 'image');
    setError(null);
    setResult(null);
  };
  */
  
  return (
    <div className="upload-section">
      <div className="upload-tabs">
        <button 
          className={`tab-button ${mode === 'image' ? 'active' : ''}`}
          onClick={() => setMode('image')}
        >
          图片分析
        </button>
        <button 
          className={`tab-button ${mode === 'text' ? 'active' : ''}`}
          onClick={() => setMode('text')}
        >
          文本分析
        </button>
      </div>
      
      <form onSubmit={handleSubmit}>
        {mode === 'image' ? (
          /* 图片上传表单 */
          <div className="form-group">
            <label className="input-label">
              选择图片:
              <input 
                type="file" 
                accept="image/jpeg,image/png" 
                onChange={handleFileChange}
                className="file-input"
              />
            </label>
            
            {preview && (
              <div className="preview-container">
                <img src={preview} alt="预览" className="image-preview" />
              </div>
            )}
          </div>
        ) : (
          /* 文本输入表单 */
          <div className="form-group">
            <label className="input-label">
              输入文本:
              <textarea 
                value={text}
                onChange={handleTextChange}
                className="text-input"
                placeholder="请在此输入需要分析的文本（最多5000字符）..."
                rows={6}
              />
            </label>
            <div className="text-counter">
              {text.length}/5000 字符
            </div>
          </div>
        )}
        
        {error && <p className="error-message">{error}</p>}
        
        <button 
          type="submit" 
          className="submit-button"
          disabled={(mode === 'image' && !file) || (mode === 'text' && (!text || text.length > 5000))}
        >
          {mode === 'image' ? '分析图片' : '分析文本'}
        </button>
      </form>
    </div>
  );
};

export default UploadForm; 