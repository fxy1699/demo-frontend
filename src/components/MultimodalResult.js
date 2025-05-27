import React, { useEffect, useState, useRef } from 'react';
import { API_BASE_URL } from '../config';
import './MultimodalResult.css';

const MultimodalResult = ({ result }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  
  useEffect(() => {
    // 当结果变化时重置音频状态
    setIsPlaying(false);
    
    // 如果有音频且audioRef存在，加载音频
    if (result?.audio && audioRef.current) {
      const audioSrc = `data:audio/wav;base64,${result.audio}`;
      audioRef.current.src = audioSrc;
      audioRef.current.load();
    }
  }, [result]);
  
  // 处理音频播放/暂停
  const toggleAudio = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    
    setIsPlaying(!isPlaying);
  };
  
  // 音频播放结束处理
  const handleAudioEnded = () => {
    setIsPlaying(false);
  };
  
  // 下载音频
  const downloadAudio = () => {
    if (!result?.audio) return;
    
    const link = document.createElement('a');
    link.href = `${API_BASE_URL}/api/multimodal/audio-output?audio_base64=${encodeURIComponent(result.audio)}`;
    link.download = 'audio_response.wav';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // 如果没有结果则返回null
  if (!result) return null;
  
  return (
    <div className="multimodal-result">
      <h2>Generated Results</h2>
      
      {/* Processing time information */}
      {result.processing_time && (
        <div className="processing-info">
          Processing Time: {result.processing_time}
        </div>
      )}
      
      {/* Text results */}
      {result.text && (
        <div className="text-result">
          <h3>Text Content</h3>
          <div className="result-content">
            {result.text.split('\n').map((line, index) => (
              <p key={index}>{line || <br />}</p>
            ))}
          </div>
        </div>
      )}
      
      {/* Audio player */}
      {result.audio && (
        <div className="audio-result">
          <h3>Audio Output</h3>
          <div className="audio-controls">
            <button 
              className={`play-button ${isPlaying ? 'playing' : ''}`}
              onClick={toggleAudio}
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button 
              className="download-button"
              onClick={downloadAudio}
            >
              Download Audio
            </button>
            <audio 
              ref={audioRef} 
              onEnded={handleAudioEnded}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      )}
      
      {/* Model information */}
      {result.model && (
        <div className="model-info">
          Model Used: {result.model}
        </div>
      )}
      
      {/* Error information */}
      {result.error && (
        <div className="error-info">
          Error: {result.error}
        </div>
      )}
    </div>
  );
};

export default MultimodalResult; 