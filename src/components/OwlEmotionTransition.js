// OwlEmotionTransition.js
// 提供两种猫头鹰情绪状态之间的过渡动画

// 猫头鹰的眉毛位置、眼睛大小等属性的预设，根据情绪状态定义
export const emotionPresets = {
  // 中性/默认状态
  neutral: {
    eyebrows: {
      leftEyebrow: { x: 0, y: 0, rotation: 0 },
      rightEyebrow: { x: 0, y: 0, rotation: 0 }
    },
    eyes: {
      leftEye: { 
        pupilScale: 1, 
        pupilX: 0, 
        pupilY: 0,
      },
      rightEye: { 
        pupilScale: 1, 
        pupilX: 0, 
        pupilY: 0,
      }
    }
  },
  
  // 开心状态
  happy: {
    eyebrows: {
      leftEyebrow: { x: 0, y: -5, rotation: -5 },
      rightEyebrow: { x: 0, y: -5, rotation: 5 }
    },
    eyes: {
      leftEye: { 
        pupilScale: 0.85, 
        pupilX: 0, 
        pupilY: 2,
      },
      rightEye: { 
        pupilScale: 0.85, 
        pupilX: 0, 
        pupilY: 2,
      }
    }
  },
  
  // 悲伤状态
  sad: {
    eyebrows: {
      leftEyebrow: { x: 2, y: 5, rotation: 15 },
      rightEyebrow: { x: -2, y: 5, rotation: -15 }
    },
    eyes: {
      leftEye: { 
        pupilScale: 1.1, 
        pupilX: 0, 
        pupilY: 5,
      },
      rightEye: { 
        pupilScale: 1.1, 
        pupilX: 0, 
        pupilY: 5,
      }
    }
  },
  
  // 生气状态
  angry: {
    eyebrows: {
      leftEyebrow: { x: 2, y: -2, rotation: 20 },
      rightEyebrow: { x: -2, y: -2, rotation: -20 }
    },
    eyes: {
      leftEye: { 
        pupilScale: 0.8, 
        pupilX: 2, 
        pupilY: 0,
      },
      rightEye: { 
        pupilScale: 0.8, 
        pupilX: -2, 
        pupilY: 0,
      }
    }
  },
  
  // 无聊状态
  boring: {
    eyebrows: {
      leftEyebrow: { x: 0, y: 3, rotation: 0 },
      rightEyebrow: { x: 0, y: 3, rotation: 0 }
    },
    eyes: {
      leftEye: { 
        pupilScale: 0.9, 
        pupilX: 5, 
        pupilY: 0,
      },
      rightEye: { 
        pupilScale: 0.9, 
        pupilX: -5, 
        pupilY: 0,
      }
    }
  },
  
  // 思考状态
  thinking: {
    eyebrows: {
      leftEyebrow: { x: 0, y: -2, rotation: -10 },
      rightEyebrow: { x: 0, y: 2, rotation: 10 }
    },
    eyes: {
      leftEye: { 
        pupilScale: 0.9, 
        pupilX: 3, 
        pupilY: -3,
      },
      rightEye: { 
        pupilScale: 0.9, 
        pupilX: -3, 
        pupilY: -3,
      }
    }
  },
  
  // 惊讶状态
  surprised: {
    eyebrows: {
      leftEyebrow: { x: 0, y: -8, rotation: 0 },
      rightEyebrow: { x: 0, y: -8, rotation: 0 }
    },
    eyes: {
      leftEye: { 
        pupilScale: 1.3, 
        pupilX: 0, 
        pupilY: 0,
      },
      rightEye: { 
        pupilScale: 1.3, 
        pupilX: 0, 
        pupilY: 0,
      }
    }
  }
};

/**
 * 在两种情绪状态之间产生平滑过渡的动画
 * @param {string} fromEmotion - 起始情绪状态
 * @param {string} toEmotion - 目标情绪状态
 * @param {function} updateCallback - 更新回调函数，接收当前过渡状态
 * @param {number} duration - 过渡动画持续时间(毫秒)
 * @returns {function} 停止动画的函数
 */
export const transitionBetweenEmotions = (fromEmotion, toEmotion, updateCallback, duration = 800) => {
  // 获取起始和目标情绪的预设
  const startPreset = emotionPresets[fromEmotion] || emotionPresets.neutral;
  const endPreset = emotionPresets[toEmotion] || emotionPresets.neutral;
  
  const startTime = performance.now();
  let animationFrameId = null;
  
  // 动画函数
  const animate = (currentTime) => {
    const elapsedTime = currentTime - startTime;
    const progress = Math.min(elapsedTime / duration, 1);
    
    // 使用缓动函数使动画更自然
    const easedProgress = easeInOutCubic(progress);
    
    // 计算当前过渡状态
    const currentState = {
      eyebrows: {
        leftEyebrow: {
          x: interpolate(startPreset.eyebrows.leftEyebrow.x, endPreset.eyebrows.leftEyebrow.x, easedProgress),
          y: interpolate(startPreset.eyebrows.leftEyebrow.y, endPreset.eyebrows.leftEyebrow.y, easedProgress),
          rotation: interpolate(startPreset.eyebrows.leftEyebrow.rotation, endPreset.eyebrows.leftEyebrow.rotation, easedProgress)
        },
        rightEyebrow: {
          x: interpolate(startPreset.eyebrows.rightEyebrow.x, endPreset.eyebrows.rightEyebrow.x, easedProgress),
          y: interpolate(startPreset.eyebrows.rightEyebrow.y, endPreset.eyebrows.rightEyebrow.y, easedProgress),
          rotation: interpolate(startPreset.eyebrows.rightEyebrow.rotation, endPreset.eyebrows.rightEyebrow.rotation, easedProgress)
        }
      },
      eyes: {
        leftEye: {
          pupilScale: interpolate(startPreset.eyes.leftEye.pupilScale, endPreset.eyes.leftEye.pupilScale, easedProgress),
          pupilX: interpolate(startPreset.eyes.leftEye.pupilX, endPreset.eyes.leftEye.pupilX, easedProgress),
          pupilY: interpolate(startPreset.eyes.leftEye.pupilY, endPreset.eyes.leftEye.pupilY, easedProgress)
        },
        rightEye: {
          pupilScale: interpolate(startPreset.eyes.rightEye.pupilScale, endPreset.eyes.rightEye.pupilScale, easedProgress),
          pupilX: interpolate(startPreset.eyes.rightEye.pupilX, endPreset.eyes.rightEye.pupilX, easedProgress),
          pupilY: interpolate(startPreset.eyes.rightEye.pupilY, endPreset.eyes.rightEye.pupilY, easedProgress)
        }
      }
    };
    
    // 调用更新回调
    updateCallback(currentState);
    
    // 如果动画未完成，继续下一帧
    if (progress < 1) {
      animationFrameId = requestAnimationFrame(animate);
    }
  };
  
  // 开始动画
  animationFrameId = requestAnimationFrame(animate);
  
  // 返回停止动画的函数
  return () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  };
};

// 辅助函数：线性插值
const interpolate = (start, end, progress) => {
  return start + (end - start) * progress;
};

// 辅助函数：缓动函数
const easeInOutCubic = (t) => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}; 