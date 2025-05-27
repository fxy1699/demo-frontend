import React from 'react';
import './ResultDisplay.css';

function ResultDisplay({ result, isLoading }) {
  // 情绪中英文映射 - 只保留三种猫头鹰表情
  const emotionMap = {
    'happy': '开心',
    'angry': '生气/无聊',
    'sad': '悲伤',
    'thinking': '思考中'
  };
  
  // 生成情绪显示文本
  const getEmotionMessage = () => {
    if (isLoading) return '正在分析情绪...';
    if (!result || !result.emotion) return '等待分析...';
    // 如果是思考中状态，直接返回对应中文
    if (result.emotion === 'thinking') return '思考中...';
    return `猫头鹰情绪: ${emotionMap[result.emotion] || result.emotion}`;
  };

  // 渲染关键词
  const renderKeywords = () => {
    if (!result || !result.keywords || !result.keywords.length) return null;
    
    return (
      <div className="keywords-section">
        <h3>关键词</h3>
        <div className="keywords-container">
          {result.keywords.map((keyword, index) => (
            <span key={index} className="keyword-tag">{keyword}</span>
          ))}
        </div>
      </div>
    );
  };

  // 渲染摘要
  const renderSummary = () => {
    if (!result || !result.summary) return null;
    
    return (
      <div className="summary-section">
        <h3>内容摘要</h3>
        <p className="summary-text">{result.summary}</p>
      </div>
    );
  };
  
  return (
    <div className="result-section">
      <h2>分析结果</h2>
      <div className="emotion-result">
        <p>{getEmotionMessage()}</p>
      </div>
      {renderKeywords()}
      {renderSummary()}
    </div>
  );
}

export default ResultDisplay; 