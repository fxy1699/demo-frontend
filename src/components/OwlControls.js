import React, { useState } from 'react';
import './OwlControls.css';

const OwlControls = ({ controls, onChange, onSave }) => {
  // 当前活动的标签页
  const [activeTab, setActiveTab] = useState('overall');
  
  // 处理控制值变化
  const handleControlChange = (section, property, value, nestedProperty = null, deepNestedProperty = null) => {
    const newControls = { ...controls };
    
    // 确保section在newControls中存在
    if (!newControls[section]) {
      newControls[section] = {};
    }
    
    if (deepNestedProperty) {
      if (!newControls[section][property]) {
        newControls[section][property] = {};
      }
      if (!newControls[section][property][nestedProperty]) {
        newControls[section][property][nestedProperty] = {};
      }
      newControls[section][property][nestedProperty][deepNestedProperty] = value;
    } else if (nestedProperty) {
      if (!newControls[section][property]) {
        newControls[section][property] = {};
      }
      newControls[section][property][nestedProperty] = value;
    } else {
      newControls[section][property] = value;
    }
    
    onChange(newControls);
  };
  
  // 处理复选框变化
  const handleCheckboxChange = (section, property, checked, nestedProperty = null, deepNestedProperty = null) => {
    handleControlChange(section, property, checked, nestedProperty, deepNestedProperty);
  };
  
  // 处理数值变化
  const handleSliderChange = (section, property, value, nestedProperty = null, deepNestedProperty = null) => {
    handleControlChange(section, property, parseFloat(value), nestedProperty, deepNestedProperty);
  };

  // 处理数字输入框变化
  const handleInputChange = (section, property, value, nestedProperty = null, deepNestedProperty = null) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      handleControlChange(section, property, numValue, nestedProperty, deepNestedProperty);
    }
  };
  
  // 重置控制项
  const handleReset = (section, property, defaultValue, nestedProperty = null, deepNestedProperty = null) => {
    handleControlChange(section, property, defaultValue, nestedProperty, deepNestedProperty);
  };
  
  // 保存配置到本地存储
  const handleSaveConfig = () => {
    try {
      localStorage.setItem('owlControlsConfig', JSON.stringify(controls));
      // 如果父组件提供了保存回调，则调用
      if (onSave) {
        onSave(controls);
      }
      alert('配置已保存！');
    } catch (error) {
      console.error('保存配置失败:', error);
      alert('保存配置失败！');
    }
  };

  // 导出配置到文件
  const handleExportConfig = () => {
    try {
      const configStr = JSON.stringify(controls, null, 2);
      const blob = new Blob([configStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'owl-controls-config.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出配置失败:', error);
      alert('导出配置失败！');
    }
  };
  
  // 从本地存储加载配置
  const handleLoadConfig = () => {
    try {
      const savedConfig = localStorage.getItem('owlControlsConfig');
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        onChange(parsedConfig);
        // 如果父组件提供了保存回调，则调用
        if (onSave) {
          onSave(parsedConfig);
        }
        alert('配置已加载！');
      } else {
        alert('没有找到保存的配置！');
      }
    } catch (error) {
      console.error('加载配置失败:', error);
      alert('加载配置失败！');
    }
  };

  // 从文件导入配置
  const handleImportConfig = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsedConfig = JSON.parse(e.target.result);
          onChange(parsedConfig);
          if (onSave) {
            onSave(parsedConfig);
          }
          alert('配置已从文件导入！');
        } catch (error) {
          console.error('导入配置失败:', error);
          alert('导入配置失败！文件格式不正确。');
        }
      };
      reader.readAsText(file);
    }
  };
  
  // 重置所有配置
  const handleResetAll = () => {
    if (window.confirm('确定要重置所有配置吗？这将恢复默认设置。')) {
      const defaultControls = {
        overall: { scale: 1 },
        body: { visible: true, scale: 1, x: 0, y: 0, rotation: 0 },
        wings: { 
          visible: true, 
          leftWing: { 
            scale: 1, x: 0, y: 0, rotation: 0,
            transformOriginX: 'right', transformOriginY: 'center',
            transformOriginXPercent: 100, transformOriginYPercent: 50
          },
          rightWing: { 
            scale: 1, x: 0, y: 0, rotation: 0,
            transformOriginX: 'left', transformOriginY: 'center',
            transformOriginXPercent: 0, transformOriginYPercent: 50
          }
        },
        eyes: { 
          visible: true,
          leftEye: { 
            scale: 1, x: 0, y: 0, rotation: 0,
            pupilScale: 1, pupilX: 0, pupilY: 0
          },
          rightEye: { 
            scale: 1, x: 0, y: 0, rotation: 0,
            pupilScale: 1, pupilX: 0, pupilY: 0
          },
          eyelids: {
            visible: true,
            leftEyelid: { scale: 1, x: 0, y: 0, rotation: 0 },
            rightEyelid: { scale: 1, x: 0, y: 0, rotation: 0 }
          }
        },
        beak: { visible: true, scale: 1, x: 0, y: 0, rotation: 0 },
        tail: { visible: true, scale: 1, x: 0, y: 0, rotation: 0 },
        blinkAnimation: { enabled: true, interval: { min: 2000, max: 5000 }, duration: 200 }
      };
      onChange(defaultControls);
      // 如果父组件提供了保存回调，则调用
      if (onSave) {
        onSave(defaultControls);
      }
      alert('所有配置已重置！');
    }
  };
  
  // 渲染复选框控制项
  const renderCheckbox = (label, section, property, defaultValue = true, nestedProperty = null, deepNestedProperty = null) => {
    let checked;
    
    try {
      if (deepNestedProperty) {
        checked = controls[section]?.[property]?.[nestedProperty]?.[deepNestedProperty];
      } else if (nestedProperty) {
        checked = controls[section]?.[property]?.[nestedProperty];
      } else {
        checked = controls[section]?.[property];
      }
      
      // 如果值是undefined，使用默认值
      if (checked === undefined) {
        checked = defaultValue;
      }
    } catch (error) {
      console.warn(`Error accessing control value: ${section}.${property}${nestedProperty ? `.${nestedProperty}` : ''}${deepNestedProperty ? `.${deepNestedProperty}` : ''}`);
      checked = defaultValue;
    }
    
    return (
      <div className="control-item checkbox-control">
        <label>
          <input 
            type="checkbox"
            checked={checked}
            onChange={(e) => handleCheckboxChange(section, property, e.target.checked, nestedProperty, deepNestedProperty)}
          />
          {label}
        </label>
        <button 
          className="reset-button small"
          onClick={() => handleReset(section, property, defaultValue, nestedProperty, deepNestedProperty)}
        >
          重置
        </button>
      </div>
    );
  };
  
  // 渲染滑块和数字输入控制项
  const renderSlider = (label, section, property, min, max, step = 0.1, defaultValue = 1, nestedProperty = null, deepNestedProperty = null) => {
    let value;
    
    try {
      if (deepNestedProperty) {
        value = controls[section]?.[property]?.[nestedProperty]?.[deepNestedProperty];
      } else if (nestedProperty) {
        value = controls[section]?.[property]?.[nestedProperty];
      } else {
        value = controls[section]?.[property];
      }
      
      // 如果值是undefined，使用默认值
      if (value === undefined) {
        value = defaultValue;
      }
    } catch (error) {
      console.warn(`Error accessing control value: ${section}.${property}${nestedProperty ? `.${nestedProperty}` : ''}${deepNestedProperty ? `.${deepNestedProperty}` : ''}`);
      value = defaultValue;
    }
    
    return (
      <div className="control-item">
        <label>{label}: {value.toFixed(1)}</label>
        <div className="slider-container">
          <input 
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => handleSliderChange(section, property, e.target.value, nestedProperty, deepNestedProperty)}
          />
          <button 
            className="reset-button"
            onClick={() => handleReset(section, property, defaultValue, nestedProperty, deepNestedProperty)}
          >
            重置
          </button>
        </div>
      </div>
    );
  };
  
  // 渲染颜色选择器控制项
  /* 
  // 当前未使用，但保留以备将来可能需要添加颜色控制
  const renderColorPicker = (label, section, property, defaultValue = '#ffcc00', nestedProperty = null) => {
    const value = nestedProperty 
      ? controls[section]?.[property]?.[nestedProperty] 
      : controls[section]?.[property];
    
    return (
      <div className="control-item">
        <label>{label}:</label>
        <div className="color-picker-container">
          <input 
            type="color"
            value={value}
            onChange={(e) => handleControlChange(section, property, e.target.value, nestedProperty)}
          />
          <button 
            className="reset-button"
            onClick={() => handleReset(section, property, defaultValue, nestedProperty)}
          >
            重置
          </button>
        </div>
      </div>
    );
  };
  */
  
  // 渲染整体控制项
  const renderOverallControls = () => (
    <div className="control-group">
      <h3>整体控制</h3>
      {renderSlider('缩放比例', 'overall', 'scale', 0.5, 2, 0.1, 1)}
    </div>
  );
  
  // 渲染身体控制项
  const renderBodyControls = () => (
    <div className="control-group">
      <h3>身体控制</h3>
      {renderCheckbox('显示', 'body', 'visible', true)}
      {renderSlider('缩放比例', 'body', 'scale', 0.5, 2, 0.1, 1)}
      {renderSlider('X轴位置', 'body', 'x', -100, 100, 1, 0)}
      {renderSlider('Y轴位置', 'body', 'y', -100, 100, 1, 0)}
      {renderSlider('旋转角度', 'body', 'rotation', -180, 180, 1, 0)}
    </div>
  );
  
  // 渲染翅膀控制项
  const renderWingsControls = () => (
    <div className="control-group">
      <h3>翅膀控制</h3>
      {renderCheckbox('显示', 'wings', 'visible', true)}
      
      <div className="control-subgroup">
        <h4>左翅膀</h4>
        {renderSlider('缩放比例', 'wings', 'leftWing', 0.5, 2, 0.1, 1, 'scale')}
        {renderSlider('X轴位置', 'wings', 'leftWing', -100, 100, 1, 0, 'x')}
        {renderSlider('Y轴位置', 'wings', 'leftWing', -100, 100, 1, 0, 'y')}
        {renderSlider('旋转角度', 'wings', 'leftWing', -180, 180, 1, 0, 'rotation')}
        
        <h5>旋转轴心</h5>
        {renderSlider('水平轴心点 (%)', 'wings', 'leftWing', 0, 100, 1, 100, 'transformOriginXPercent')}
        {renderSlider('垂直轴心点 (%)', 'wings', 'leftWing', 0, 100, 1, 50, 'transformOriginYPercent')}
      </div>
      
      <div className="control-subgroup">
        <h4>右翅膀</h4>
        {renderSlider('缩放比例', 'wings', 'rightWing', 0.5, 2, 0.1, 1, 'scale')}
        {renderSlider('X轴位置', 'wings', 'rightWing', -100, 100, 1, 0, 'x')}
        {renderSlider('Y轴位置', 'wings', 'rightWing', -100, 100, 1, 0, 'y')}
        {renderSlider('旋转角度', 'wings', 'rightWing', -180, 180, 1, 0, 'rotation')}
        
        <h5>旋转轴心</h5>
        {renderSlider('水平轴心点 (%)', 'wings', 'rightWing', 0, 100, 1, 0, 'transformOriginXPercent')}
        {renderSlider('垂直轴心点 (%)', 'wings', 'rightWing', 0, 100, 1, 50, 'transformOriginYPercent')}
      </div>
    </div>
  );
  
  // 渲染眼睛控制项
  const renderEyesControls = () => {
    return (
      <div className="control-section">
        <h3>眼睛控制</h3>
        {renderCheckbox('显示眼睛', 'eyes', 'visible', true)}
        
        <div className="control-group">
          <h4>左眼控制</h4>
          {renderSlider('缩放', 'eyes', 'leftEye', 0.5, 1.5, 0.05, 1, 'scale')}
          {renderSlider('X 位置', 'eyes', 'leftEye', -50, 50, 1, 0, 'x')}
          {renderSlider('Y 位置', 'eyes', 'leftEye', -50, 50, 1, 0, 'y')}
          {renderSlider('旋转', 'eyes', 'leftEye', -30, 30, 1, 0, 'rotation')}
        </div>
        
        <div className="control-group">
          <h4>右眼控制</h4>
          {renderSlider('缩放', 'eyes', 'rightEye', 0.5, 1.5, 0.05, 1, 'scale')}
          {renderSlider('X 位置', 'eyes', 'rightEye', -50, 50, 1, 0, 'x')}
          {renderSlider('Y 位置', 'eyes', 'rightEye', -50, 50, 1, 0, 'y')}
          {renderSlider('旋转', 'eyes', 'rightEye', -30, 30, 1, 0, 'rotation')}
        </div>
      </div>
    );
  };
  
  // 渲染喙/鼻子控制项
  const renderBeakControls = () => (
    <div className="control-group">
      <h3>喙/鼻子控制</h3>
      {renderCheckbox('显示', 'beak', 'visible', true)}
      {renderSlider('缩放比例', 'beak', 'scale', 0.5, 2, 0.1, 1)}
      {renderSlider('X轴位置', 'beak', 'x', -100, 100, 1, 0)}
      {renderSlider('Y轴位置', 'beak', 'y', -100, 100, 1, 0)}
      {renderSlider('旋转角度', 'beak', 'rotation', -180, 180, 1, 0)}
    </div>
  );
  
  // 渲染尾巴控制项
  const renderTailControls = () => (
    <div className="control-group">
      <h3>尾巴控制</h3>
      {renderCheckbox('显示', 'tail', 'visible', true)}
      {renderSlider('缩放比例', 'tail', 'scale', 0.5, 2, 0.1, 1)}
      {renderSlider('X轴位置', 'tail', 'x', -100, 100, 1, 0)}
      {renderSlider('Y轴位置', 'tail', 'y', -100, 100, 1, 0)}
      {renderSlider('旋转角度', 'tail', 'rotation', -180, 180, 1, 0)}
    </div>
  );
  
  // 渲染动画控制项
  const renderAnimationControls = () => (
    <div className="control-group">
      <h3>动画控制</h3>
      {renderCheckbox('启用眨眼动画', 'blinkAnimation', 'enabled', true)}
      {renderSlider('眨眼持续时间(毫秒)', 'blinkAnimation', 'duration', 100, 500, 10, 200)}
      {renderSlider('最小间隔时间(毫秒)', 'blinkAnimation', 'interval', 1000, 5000, 100, 2000, 'min')}
      {renderSlider('最大间隔时间(毫秒)', 'blinkAnimation', 'interval', 3000, 10000, 100, 5000, 'max')}
    </div>
  );
  
  return (
    <div className="owl-controls">
      <div className="tabs">
        <div className="tab-row">
          <button 
            className={`tab-button ${activeTab === 'overall' ? 'active' : ''}`}
            onClick={() => setActiveTab('overall')}
          >
            整体
          </button>
          <button 
            className={`tab-button ${activeTab === 'body' ? 'active' : ''}`}
            onClick={() => setActiveTab('body')}
          >
            身体
          </button>
          <button 
            className={`tab-button ${activeTab === 'eyes' ? 'active' : ''}`}
            onClick={() => setActiveTab('eyes')}
          >
            眼睛
          </button>
        </div>
        <div className="tab-row">
          <button 
            className={`tab-button ${activeTab === 'wings' ? 'active' : ''}`}
            onClick={() => setActiveTab('wings')}
          >
            翅膀
          </button>
          <button 
            className={`tab-button ${activeTab === 'beak' ? 'active' : ''}`}
            onClick={() => setActiveTab('beak')}
          >
            喙
          </button>
          <button 
            className={`tab-button ${activeTab === 'tail' ? 'active' : ''}`}
            onClick={() => setActiveTab('tail')}
          >
            尾巴
          </button>
          <button 
            className={`tab-button ${activeTab === 'animation' ? 'active' : ''}`}
            onClick={() => setActiveTab('animation')}
          >
            动画
          </button>
        </div>
      </div>
      
      <div className="controls-panel">
        {activeTab === 'overall' && renderOverallControls()}
        {activeTab === 'body' && renderBodyControls()}
        {activeTab === 'wings' && renderWingsControls()}
        {activeTab === 'eyes' && renderEyesControls()}
        {activeTab === 'beak' && renderBeakControls()}
        {activeTab === 'tail' && renderTailControls()}
        {activeTab === 'animation' && renderAnimationControls()}
      </div>
      
      <div className="control-actions">
        <button className="save-btn" onClick={handleSaveConfig}>保存</button>
        <button className="load-btn" onClick={handleLoadConfig}>加载</button>
        <button className="export-btn" onClick={handleExportConfig}>导出</button>
        <label className="import-btn">
          导入
          <input 
            type="file" 
            accept=".json" 
            style={{ display: 'none' }} 
            onChange={handleImportConfig}
          />
        </label>
        <button className="reset-btn" onClick={handleResetAll}>重置</button>
      </div>
    </div>
  );
};

export default OwlControls; 