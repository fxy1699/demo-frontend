import React, { useState, useEffect, useRef, useContext } from 'react';
import './OwlImageAnimation.css';
import { transitionBetweenEmotions } from './OwlEmotionTransition';
import { WebGazerContext } from '../App';
// 修改导入方式
// import webgazer from 'webgazer';
// WebGazer 使用 UMD 模式，需要通过 window 全局对象访问
// 而不是通过 import 导入，因此删除导入语句

// 注意：虽然这些图片导入看起来未使用，但实际上它们通过CSS background-image使用
// 保留这些导入是为了确保webpack能够正确打包这些资源
// 如果您看到ESLint警告，可以使用 /* eslint-disable no-unused-vars */ 注释禁用警告

/* eslint-disable no-unused-vars */
// 导入猫头鹰各部分图片（使用中文文件名）
import bodyImg from './bobo-parts/_0008_身体.png';
import leftWingImg from './bobo-parts/_0005_左翅膀.png';
import rightWingImg from './bobo-parts/_0006_右翅膀.png';
import leftEyeImg from './bobo-parts/_0003_左眼.png';
import rightEyeImg from './bobo-parts/_0001_右眼.png';
import beakImg from './bobo-parts/_0004_嘴.png';
import tailImg from './bobo-parts/_0007_尾巴.png';
/* eslint-enable no-unused-vars */

const OwlImageAnimation = ({ 
  emotion = 'neutral', 
  isLoading = false,
  // 接收控制面板参数
  controls = {
    // 整体控制
    overall: { scale: 1 },
    // 各部分控制
    body: { visible: true, scale: 1, x: 0, y: 0, rotation: 0 },
    wings: { 
      visible: true, 
      leftWing: { scale: 1, x: 0, y: 0, rotation: 0 },
      rightWing: { scale: 1, x: 0, y: 0, rotation: 0 }
    },
    eyes: { 
      visible: true,
      leftEye: { 
        scale: 1, x: 0, y: 0, rotation: 0,
        pupilScale: 1, pupilX: 0, pupilY: 0,
        bluePupilVisible: true,
        bluePupilScale: 1, bluePupilX: 0, bluePupilY: 0, bluePupilRotation: 0
      },
      rightEye: { 
        scale: 1, x: 0, y: 0, rotation: 0,
        pupilScale: 1, pupilX: 0, pupilY: 0,
        bluePupilVisible: true,
        bluePupilScale: 1, bluePupilX: 0, bluePupilY: 0, bluePupilRotation: 0
      },
      eyelids: {
        visible: true,
        leftEyelid: { scale: 1, x: 0, y: 0, rotation: 0 },
        rightEyelid: { scale: 1, x: 0, y: 0, rotation: 0 }
      }
    },
    eyebrows: {
      visible: true,
      leftEyebrow: { scale: 1, x: 0, y: 0, rotation: 0 },
      rightEyebrow: { scale: 1, x: 0, y: 0, rotation: 0 }
    },
    beak: { visible: true, scale: 1, x: 0, y: 0, rotation: 0 },
    feet: { visible: true, scale: 1, x: 0, y: 0, rotation: 0 },
    // 尾巴控制
    tail: { visible: true, scale: 1, x: 0, y: 0, rotation: 0 },
    // 眨眼动画控制
    blinkAnimation: { enabled: true, interval: { min: 2000, max: 5000 }, duration: 200 }
  }
}) => {
  const [blinkLeft, setBlinkLeft] = useState(false);
  const [blinkRight, setBlinkRight] = useState(false);
  const blinkInterval = useRef(null);
  // 添加思考动画状态
  const [thinkingOffset, setThinkingOffset] = useState({ x: 0, y: 0 });
  const thinkingAnimationRef = useRef(null);
  const prevEmotionRef = useRef(emotion);
  
  // 添加翅膀动画状态
  const [wingsOffset, setWingsOffset] = useState({ x: 0, y: 0, rotation: 0 });
  const wingsAnimationRef = useRef(null);
  
  // 添加愤怒动画状态
  const [angryOffset, setAngryOffset] = useState({ x: 0, y: 0, rotation: 0 });
  const angryAnimationRef = useRef(null);
  
  // 添加眼泪动画状态
  const [tearDrops, setTearDrops] = useState([]);
  const tearAnimationRef = useRef(null);
  const tearIntervalRef = useRef(null);
  
  // WebGazer 状态
  const [gazeTracking, setGazeTracking] = useState(false);
  const [gazePosition, setGazePosition] = useState({ x: 0, y: 0 });
  const [eyeTrackingOffset, setEyeTrackingOffset] = useState({ x: 0, y: 0 });
  const owlContainerRef = useRef(null);
  const webgazerInitialized = useRef(false);

  // Get WebGazer context to check if camera is enabled
  const webGazerContext = useContext(WebGazerContext);

  // Only initialize WebGazer when camera is enabled and calibration is active
  useEffect(() => {
    if (webGazerContext?.calibrating && !webgazerInitialized.current) {
      // Initialize WebGazer here
      webgazerInitialized.current = true;
      setGazeTracking(true);
    } else if (!webGazerContext?.calibrating && webgazerInitialized.current) {
      // Clean up WebGazer when camera is disabled
      webgazerInitialized.current = false;
      setGazeTracking(false);
    }
  }, [webGazerContext?.calibrating]);
  
  // 根据不同情绪状态展示不同的表情
  const getEmotionState = () => {
    if (isLoading && emotion !== 'thinking') return 'neutral'; // 如果正在加载且不是思考状态，显示中性状态
    if (!emotion) return 'neutral';
    
    // 根据情绪设置表情
    switch(emotion.toLowerCase()) {
      case 'thinking':
      case '思考中':
        return 'thinking';
      case 'happy':
      case '快乐':
      case 'positive':
      case '积极':
        return 'happy';
      case 'sad':
      case '悲伤':
      case 'negative':
      case '消极':
        return 'sad';
      case 'angry':
      case '愤怒':
        return 'angry';
      case 'boring':
      case '无聊':
        return 'boring';
      case 'surprised':
      case '惊讶':
        return 'surprised';
      case 'neutral':
      case '中性':
      case 'normal':
      case '正常':
        return 'neutral';
      default:
        return 'neutral';
    }
  };
  
  const emotionState = getEmotionState();
  
  // 当情绪状态变化时，应用过渡动画
  useEffect(() => {
    const prevEmotion = prevEmotionRef.current;
    const currentEmotion = emotionState;
    
    // 如果情绪状态有变化，并且不是初始渲染
    if (prevEmotion && prevEmotion !== currentEmotion) {
      // 应用情绪过渡
      const stopTransition = transitionBetweenEmotions(
        prevEmotion,
        currentEmotion,
        (transitionState) => {
          // 更新猫头鹰控制参数
          const newControls = {
            ...controls,
            eyebrows: {
              ...controls.eyebrows,
              leftEyebrow: {
                ...controls.eyebrows.leftEyebrow,
                x: transitionState.eyebrows.leftEyebrow.x,
                y: transitionState.eyebrows.leftEyebrow.y,
                rotation: transitionState.eyebrows.leftEyebrow.rotation
              },
              rightEyebrow: {
                ...controls.eyebrows.rightEyebrow,
                x: transitionState.eyebrows.rightEyebrow.x,
                y: transitionState.eyebrows.rightEyebrow.y,
                rotation: transitionState.eyebrows.rightEyebrow.rotation
              }
            },
            eyes: {
              ...controls.eyes,
              leftEye: {
                ...controls.eyes.leftEye,
                pupilScale: transitionState.eyes.leftEye.pupilScale,
                pupilX: transitionState.eyes.leftEye.pupilX,
                pupilY: transitionState.eyes.leftEye.pupilY
              },
              rightEye: {
                ...controls.eyes.rightEye,
                pupilScale: transitionState.eyes.rightEye.pupilScale,
                pupilX: transitionState.eyes.rightEye.pupilX,
                pupilY: transitionState.eyes.rightEye.pupilY
              }
            }
          };
          
          // 注意: 由于函数式组件的限制，这里不能直接修改 controls 参数，
          // 而是需要通过某种方式将更新后的控制参数应用到猫头鹰上
          // 可以使用自定义事件或全局状态管理
          
          // 这里直接修改DOM元素样式来实现动画效果
          const container = owlContainerRef.current;
          if (container) {
            const leftEyebrow = container.querySelector('.owl-eyebrow-left');
            const rightEyebrow = container.querySelector('.owl-eyebrow-right');
            const leftPupil = container.querySelector('.owl-pupil-left');
            const rightPupil = container.querySelector('.owl-pupil-right');
            
            if (leftEyebrow && rightEyebrow && leftPupil && rightPupil) {
              // 应用眉毛变换
              leftEyebrow.style.transform = `translate(${transitionState.eyebrows.leftEyebrow.x}px, ${transitionState.eyebrows.leftEyebrow.y}px) rotate(${transitionState.eyebrows.leftEyebrow.rotation}deg)`;
              rightEyebrow.style.transform = `translate(${transitionState.eyebrows.rightEyebrow.x}px, ${transitionState.eyebrows.rightEyebrow.y}px) rotate(${transitionState.eyebrows.rightEyebrow.rotation}deg)`;
              
              // 应用瞳孔变换
              leftPupil.style.transform = `translate(${transitionState.eyes.leftEye.pupilX}px, ${transitionState.eyes.leftEye.pupilY}px) scale(${transitionState.eyes.leftEye.pupilScale})`;
              rightPupil.style.transform = `translate(${transitionState.eyes.rightEye.pupilX}px, ${transitionState.eyes.rightEye.pupilY}px) scale(${transitionState.eyes.rightEye.pupilScale})`;
            }
          }
        }
      );
      
      // 清理函数，用于在组件卸载或状态再次更新时停止动画
      return () => {
        if (stopTransition) stopTransition();
      };
    }
    
    // 更新前一个情绪状态的引用
    prevEmotionRef.current = emotionState;
  }, [emotionState, controls]);

  // 随机眨眼动画
  useEffect(() => {
    // 如果未启用眨眼动画，则不启动
    if (!controls.blinkAnimation.enabled) {
      // 确保清除任何现有的计时器
      if (blinkInterval.current) {
        clearInterval(blinkInterval.current);
        blinkInterval.current = null;
      }
      return;
    }

    // 眨眼动画持续时间，设置微调值使动画更快更自然
    const blinkDuration = Math.min(controls.blinkAnimation.duration, 180); // 限制最大时间
    
    const startBlinking = () => {
      // 先清除任何现有的计时器
      if (blinkInterval.current) {
        clearInterval(blinkInterval.current);
      }
      
      // 设置新的眨眼定时器
      blinkInterval.current = setInterval(() => {
        // 随机决定是单眼还是双眼眨眼
        const doubleBlink = Math.random() > 0.3;
        
        // 同步双眼眨眼 (对于从上到下的覆盖效果更自然)
        if (doubleBlink) {
          setBlinkLeft(true);
          setBlinkRight(true);
          
          setTimeout(() => {
            setBlinkLeft(false);
            setBlinkRight(false);
          }, blinkDuration);
        } else {
          // 单眼眨眼 - 随机选择左眼或右眼
          const blinkLeftEye = Math.random() > 0.5;
          if (blinkLeftEye) {
            setBlinkLeft(true);
            setTimeout(() => setBlinkLeft(false), blinkDuration);
          } else {
            setBlinkRight(true);
            setTimeout(() => setBlinkRight(false), blinkDuration);
          }
        }
        
        // 有时会连续眨几次眼
        if (Math.random() > 0.7) {
          setTimeout(() => {
            if (doubleBlink) {
              setBlinkLeft(true);
              setBlinkRight(true);
              
              setTimeout(() => {
                setBlinkLeft(false);
                setBlinkRight(false);
              }, blinkDuration);
            } else {
              // 单眼快速眨眼
              const quickBlinkLeft = Math.random() > 0.5;
              if (quickBlinkLeft) {
                setBlinkLeft(true);
                setTimeout(() => setBlinkLeft(false), blinkDuration);
              } else {
                setBlinkRight(true);
                setTimeout(() => setBlinkRight(false), blinkDuration);
              }
            }
          }, blinkDuration + 100);
        }
        
      }, Math.random() * 
         (controls.blinkAnimation.interval.max - controls.blinkAnimation.interval.min) + 
         controls.blinkAnimation.interval.min);
    };
    
    startBlinking();
    
    return () => {
      if (blinkInterval.current) {
        clearInterval(blinkInterval.current);
        blinkInterval.current = null;
      }
    };
  }, [
    controls.blinkAnimation.enabled, 
    controls.blinkAnimation.duration,
    controls.blinkAnimation.interval.min,
    controls.blinkAnimation.interval.max
  ]);

  // 思考状态下的眼睛动画
  useEffect(() => {
    if (emotionState === 'thinking') {
      // 创建思考时眼睛缓慢移动的动画
      let step = 0;
      const animateThinking = () => {
        // 使用正弦和余弦函数创建平滑的循环运动
        const xOffset = Math.sin(step * 0.05) * 1.5;
        const yOffset = Math.cos(step * 0.03) * 1;
        setThinkingOffset({ x: xOffset, y: yOffset });
        step++;
        thinkingAnimationRef.current = requestAnimationFrame(animateThinking);
      };
      
      thinkingAnimationRef.current = requestAnimationFrame(animateThinking);
      
      return () => {
        if (thinkingAnimationRef.current) {
          cancelAnimationFrame(thinkingAnimationRef.current);
        }
        setThinkingOffset({ x: 0, y: 0 });
      };
    }
  }, [emotionState]);

  // 翅膀动画（开心状态）
  useEffect(() => {
    if (emotionState === 'happy') {
      let step = 0;
      const animateWings = () => {
        // 翅膀轻微摆动效果
        const rotationOffset = Math.sin(step * 0.1) * 3; // 左右摆动3度
        const yOffset = Math.abs(Math.sin(step * 0.1)) * 2; // 上下移动2像素
        setWingsOffset({ x: 0, y: yOffset, rotation: rotationOffset });
        step++;
        wingsAnimationRef.current = requestAnimationFrame(animateWings);
      };
      
      wingsAnimationRef.current = requestAnimationFrame(animateWings);
      
      return () => {
        if (wingsAnimationRef.current) {
          cancelAnimationFrame(wingsAnimationRef.current);
        }
        setWingsOffset({ x: 0, y: 0, rotation: 0 });
      };
    }
  }, [emotionState]);

  // 眼泪动画（悲伤状态）
  useEffect(() => {
    if (emotionState === 'sad') {
      // 生成眼泪
      const generateTear = () => {
        const tearId = Date.now() + Math.random();
        const size = Math.random() * 3 + 3; // 3-6像素
        const leftEye = Math.random() > 0.5; // 随机选择左眼或右眼
        
        // 新的眼泪
        const newTear = {
          id: tearId,
          size,
          leftEye,
          y: 0,
          opacity: 0.8,
          speed: Math.random() * 0.3 + 0.1
        };
        
        // 添加到眼泪数组
        setTearDrops(prev => [...prev, newTear]);
      };
      
      // 更新眼泪位置和透明度
      const updateTears = () => {
        setTearDrops(prev => 
          prev.map(tear => {
            // 更新位置
            const newY = tear.y + tear.speed * 2;
            const newOpacity = tear.opacity - 0.006; // 逐渐变淡
            
            // 如果眼泪消失，则移除
            if (newOpacity <= 0) {
              return null;
            }
            
            return { ...tear, y: newY, opacity: newOpacity };
          }).filter(Boolean) // 移除null值（已消失的眼泪）
        );
      };
      
      // 启动眼泪动画
      const animateTears = () => {
        updateTears();
        tearAnimationRef.current = requestAnimationFrame(animateTears);
      };
      
      // 定期生成新的眼泪
      tearIntervalRef.current = setInterval(() => {
        if (Math.random() > 0.6) { // 随机决定是否生成眼泪
          generateTear();
        }
      }, 1200); // 每1200毫秒尝试生成一次
      
      // 启动动画
      tearAnimationRef.current = requestAnimationFrame(animateTears);
      
      return () => {
        if (tearAnimationRef.current) {
          cancelAnimationFrame(tearAnimationRef.current);
        }
        if (tearIntervalRef.current) {
          clearInterval(tearIntervalRef.current);
        }
        setTearDrops([]); // 清空眼泪
      };
    }
  }, [emotionState]);

  // 愤怒抖动动画
  useEffect(() => {
    if (emotionState === 'angry') {
      let step = 0;
      const animateAngry = () => {
        // 微小的随机抖动
        if (step % 5 === 0) { // 每5帧更新一次，减少抖动频率
          const xOffset = (Math.random() - 0.5) * 1.2;
          const yOffset = (Math.random() - 0.5) * 1.2;
          const rotationOffset = (Math.random() - 0.5) * 1.5;
          setAngryOffset({
            x: xOffset,
            y: yOffset,
            rotation: rotationOffset
          });
        }
        step++;
        angryAnimationRef.current = requestAnimationFrame(animateAngry);
      };
      
      angryAnimationRef.current = requestAnimationFrame(animateAngry);
      
      return () => {
        if (angryAnimationRef.current) {
          cancelAnimationFrame(angryAnimationRef.current);
        }
        setAngryOffset({ x: 0, y: 0, rotation: 0 });
      };
    }
  }, [emotionState]);

  // 根据情绪状态获取眼睛样式
  const getEyeStylesByEmotion = (state) => {
    // 默认中性状态的参数
    const defaultEyeStyles = {
      leftPupil: { scale: 1, x: 0, y: 0 },
      rightPupil: { scale: 1, x: 0, y: 0 },
      leftIris: { scale: 1, x: 0, y: 0, opacity: 1 },
      rightIris: { scale: 1, x: 0, y: 0, opacity: 1 },
      leftHighlight: { bigScale: 1, bigOpacity: 1, smallScale: 1, smallOpacity: 1, blurOpacity: 0.6 },
      rightHighlight: { bigScale: 1, bigOpacity: 1, smallScale: 1, smallOpacity: 1, blurOpacity: 0.6 }
    };
    
    switch(state) {
      case 'thinking':
        return {
          leftPupil: { scale: 0.9, x: -1, y: -1 },
          rightPupil: { scale: 0.9, x: 1, y: -1 },
          leftIris: { scale: 0.95, x: -1, y: -1, opacity: 0.95 },
          rightIris: { scale: 0.95, x: 1, y: -1, opacity: 0.95 },
          leftHighlight: { bigScale: 0.9, bigOpacity: 0.9, smallScale: 0.9, smallOpacity: 0.9, blurOpacity: 0.5 },
          rightHighlight: { bigScale: 0.9, bigOpacity: 0.9, smallScale: 0.9, smallOpacity: 0.9, blurOpacity: 0.5 }
        };
      case 'happy':
        return {
          leftPupil: { scale: 1.2, x: 0, y: 0 },
          rightPupil: { scale: 1.2, x: 0, y: 0 },
          leftIris: { scale: 1.1, x: 0, y: 0, opacity: 1 },
          rightIris: { scale: 1.1, x: 0, y: 0, opacity: 1 },
          leftHighlight: { bigScale: 1.2, bigOpacity: 1, smallScale: 1.2, smallOpacity: 1, blurOpacity: 0.8 },
          rightHighlight: { bigScale: 1.2, bigOpacity: 1, smallScale: 1.2, smallOpacity: 1, blurOpacity: 0.8 }
        };
      case 'sad':
        return {
          leftPupil: { scale: 0.9, x: 0, y: 2 },
          rightPupil: { scale: 0.9, x: 0, y: 2 },
          leftIris: { scale: 0.9, x: 0, y: 1, opacity: 0.9 },
          rightIris: { scale: 0.9, x: 0, y: 1, opacity: 0.9 },
          leftHighlight: { bigScale: 0.8, bigOpacity: 0.7, smallScale: 0.8, smallOpacity: 0.7, blurOpacity: 0.4 },
          rightHighlight: { bigScale: 0.8, bigOpacity: 0.7, smallScale: 0.8, smallOpacity: 0.7, blurOpacity: 0.4 }
        };
      case 'boring':
        return {
          leftPupil: { scale: 1, x: 0, y: 0, scaleY: 0.8 },
          rightPupil: { scale: 1, x: 0, y: 0, scaleY: 0.8 },
          leftIris: { scale: 0.95, x: 0, y: 0, opacity: 0.8 },
          rightIris: { scale: 0.95, x: 0, y: 0, opacity: 0.8 },
          leftHighlight: { bigScale: 0.9, bigOpacity: 0.8, smallScale: 0.9, smallOpacity: 0.8, blurOpacity: 0.5 },
          rightHighlight: { bigScale: 0.9, bigOpacity: 0.8, smallScale: 0.9, smallOpacity: 0.8, blurOpacity: 0.5 }
        };
      case 'angry':
        return {
          leftPupil: { scale: 0.8, x: 0, y: 0 },
          rightPupil: { scale: 0.8, x: 0, y: 0 },
          leftIris: { scale: 0.85, x: 0, y: 0, opacity: 0.9 },
          rightIris: { scale: 0.85, x: 0, y: 0, opacity: 0.9 },
          leftHighlight: { bigScale: 0.7, bigOpacity: 0.6, smallScale: 0.7, smallOpacity: 0.6, blurOpacity: 0.3 },
          rightHighlight: { bigScale: 0.7, bigOpacity: 0.6, smallScale: 0.7, smallOpacity: 0.6, blurOpacity: 0.3 }
        };
      case 'surprised':
        return {
          leftPupil: { scale: 1.3, x: 0, y: 0 },
          rightPupil: { scale: 1.3, x: 0, y: 0 },
          leftIris: { scale: 1.2, x: 0, y: 0, opacity: 1 },
          rightIris: { scale: 1.2, x: 0, y: 0, opacity: 1 },
          leftHighlight: { bigScale: 1.3, bigOpacity: 1, smallScale: 1.3, smallOpacity: 1, blurOpacity: 0.9 },
          rightHighlight: { bigScale: 1.3, bigOpacity: 1, smallScale: 1.3, smallOpacity: 1, blurOpacity: 0.9 }
        };
      default:
        return defaultEyeStyles;
    }
  };

  // 获取当前情绪的眼睛样式
  const eyeStyles = getEyeStylesByEmotion(emotionState);

  // 生成CSS变换样式
  const getTransformStyle = (element) => {
    const { scale = 1, x = 0, y = 0, rotation = 0 } = element;
    return {
      transform: `scale(${scale}) translate(${x}px, ${y}px) rotate(${rotation}deg)`,
    };
  };

  // 应用控制面板的样式
  const overallStyle = {
    transform: `scale(${controls.overall.scale || 1})`,
    zIndex: controls.overall.zIndex || 1
  };

  // 身体样式
  const bodyStyle = {
    ...getTransformStyle(controls.body),
    display: controls.body.visible ? 'block' : 'none',
    // 应用愤怒状态的抖动效果
    ...(emotionState === 'angry' && {
      transform: `scale(${controls.body.scale}) 
                 translate(${controls.body.x + angryOffset.x}px, ${controls.body.y + angryOffset.y}px) 
                 rotate(${controls.body.rotation + angryOffset.rotation}deg)`
    })
  };

  // 翅膀样式
  const leftWingStyle = {
    ...getTransformStyle(controls.wings.leftWing),
    display: controls.wings.visible ? 'block' : 'none',
    // 应用开心状态的翅膀摆动效果
    ...(emotionState === 'happy' && {
      transform: `scale(${controls.wings.leftWing.scale}) 
                 translate(${controls.wings.leftWing.x}px, ${controls.wings.leftWing.y - wingsOffset.y}px) 
                 rotate(${controls.wings.leftWing.rotation - wingsOffset.rotation}deg)`
    })
  };
  
  const rightWingStyle = {
    ...getTransformStyle(controls.wings.rightWing),
    display: controls.wings.visible ? 'block' : 'none',
    // 应用开心状态的翅膀摆动效果
    ...(emotionState === 'happy' && {
      transform: `scale(${controls.wings.rightWing.scale}) 
                 translate(${controls.wings.rightWing.x}px, ${controls.wings.rightWing.y - wingsOffset.y}px) 
                 rotate(${controls.wings.rightWing.rotation + wingsOffset.rotation}deg)`
    })
  };

  // 眼睛样式
  const leftEyeStyle = {
    ...getTransformStyle(controls.eyes.leftEye),
    display: controls.eyes.visible ? 'block' : 'none',
    // 应用愤怒状态的抖动效果
    ...(emotionState === 'angry' && {
      transform: `scale(${controls.eyes.leftEye.scale}) 
                 translate(${controls.eyes.leftEye.x + angryOffset.x * 0.5}px, 
                          ${controls.eyes.leftEye.y + angryOffset.y * 0.5}px) 
                 rotate(${controls.eyes.leftEye.rotation}deg)`
    })
  };
  
  const rightEyeStyle = {
    ...getTransformStyle(controls.eyes.rightEye),
    display: controls.eyes.visible ? 'block' : 'none',
    // 应用愤怒状态的抖动效果
    ...(emotionState === 'angry' && {
      transform: `scale(${controls.eyes.rightEye.scale}) 
                 translate(${controls.eyes.rightEye.x + angryOffset.x * 0.5}px, 
                          ${controls.eyes.rightEye.y + angryOffset.y * 0.5}px) 
                 rotate(${controls.eyes.rightEye.rotation}deg)`
    })
  };

  // 添加眼皮样式
  const leftEyelidStyle = {
    ...getTransformStyle(controls.eyes?.eyelids?.leftEyelid || { scale: 1, x: 0, y: 0, rotation: 0 }),
    display: (controls.eyes?.eyelids?.visible !== false) ? 'block' : 'none',
    // 统一左眼皮样式
    borderRadius: '40% 45% 0 0',
    backgroundColor: '#fefefe',
    boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.05)',
    // 确保与右眼对称
    transformOrigin: 'center top'
  };
  
  const rightEyelidStyle = {
    ...getTransformStyle(controls.eyes?.eyelids?.rightEyelid || { scale: 1, x: 0, y: 0, rotation: 0 }),
    display: (controls.eyes?.eyelids?.visible !== false) ? 'block' : 'none',
    // 统一右眼皮样式
    borderRadius: '40% 45% 0 0',
    backgroundColor: '#fefefe',
    boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.05)',
    // 确保与左眼对称
    transformOrigin: 'center top'
  };

  // 更新眼睛瞳孔样式，加入动画效果
  const leftPupilStyle = {
    transform: `scale(${controls.eyes.leftEye.pupilScale * eyeStyles.leftPupil.scale}) 
                translate(${controls.eyes.leftEye.pupilX + eyeStyles.leftPupil.x + 
                          (emotionState === 'thinking' ? thinkingOffset.x : emotionState === 'neutral' && gazeTracking ? eyeTrackingOffset.x : 0)}px, 
                          ${controls.eyes.leftEye.pupilY + eyeStyles.leftPupil.y + 
                          (emotionState === 'thinking' ? thinkingOffset.y : emotionState === 'neutral' && gazeTracking ? eyeTrackingOffset.y : 0)}px)`,
    transformOrigin: 'center',
    ...(eyeStyles.leftPupil.scaleY && { 
      transform: `scale(${controls.eyes.leftEye.pupilScale * eyeStyles.leftPupil.scale}, 
                       ${controls.eyes.leftEye.pupilScale * eyeStyles.leftPupil.scale * eyeStyles.leftPupil.scaleY}) 
                 translate(${controls.eyes.leftEye.pupilX + eyeStyles.leftPupil.x + 
                          (emotionState === 'thinking' ? thinkingOffset.x : emotionState === 'neutral' && gazeTracking ? eyeTrackingOffset.x : 0)}px, 
                          ${controls.eyes.leftEye.pupilY + eyeStyles.leftPupil.y + 
                          (emotionState === 'thinking' ? thinkingOffset.y : emotionState === 'neutral' && gazeTracking ? eyeTrackingOffset.y : 0)}px)` 
    })
  };
  
  const rightPupilStyle = {
    transform: `scale(${controls.eyes.rightEye.pupilScale * eyeStyles.rightPupil.scale}) 
                translate(${controls.eyes.rightEye.pupilX + eyeStyles.rightPupil.x + 
                          (emotionState === 'thinking' ? thinkingOffset.x : emotionState === 'neutral' && gazeTracking ? eyeTrackingOffset.x : 0)}px, 
                          ${controls.eyes.rightEye.pupilY + eyeStyles.rightPupil.y + 
                          (emotionState === 'thinking' ? thinkingOffset.y : emotionState === 'neutral' && gazeTracking ? eyeTrackingOffset.y : 0)}px)`,
    transformOrigin: 'center',
    ...(eyeStyles.rightPupil.scaleY && { 
      transform: `scale(${controls.eyes.rightEye.pupilScale * eyeStyles.rightPupil.scale}, 
                       ${controls.eyes.rightEye.pupilScale * eyeStyles.rightPupil.scale * eyeStyles.rightPupil.scaleY}) 
                 translate(${controls.eyes.rightEye.pupilX + eyeStyles.rightPupil.x + 
                          (emotionState === 'thinking' ? thinkingOffset.x : emotionState === 'neutral' && gazeTracking ? eyeTrackingOffset.x : 0)}px, 
                          ${controls.eyes.rightEye.pupilY + eyeStyles.rightPupil.y + 
                          (emotionState === 'thinking' ? thinkingOffset.y : emotionState === 'neutral' && gazeTracking ? eyeTrackingOffset.y : 0)}px)` 
    })
  };

  // 更新眼睛虹膜样式
  const leftIrisStyle = {
    display: controls.eyes.leftEye.bluePupilVisible ? 'block' : 'none',
    transform: `scale(${controls.eyes.leftEye.bluePupilScale * eyeStyles.leftIris.scale}) 
                translate(${controls.eyes.leftEye.bluePupilX + eyeStyles.leftIris.x + 
                          (emotionState === 'thinking' ? thinkingOffset.x * 0.8 : (emotionState === 'neutral' && gazeTracking) ? eyeTrackingOffset.x * 0.8 : 0)}px, 
                          ${controls.eyes.leftEye.bluePupilY + eyeStyles.leftIris.y + 
                          (emotionState === 'thinking' ? thinkingOffset.y * 0.8 : (emotionState === 'neutral' && gazeTracking) ? eyeTrackingOffset.y * 0.8 : 0)}px) 
                rotate(${controls.eyes.leftEye.bluePupilRotation || 0}deg)`,
    opacity: eyeStyles.leftIris.opacity
  };
  
  const rightIrisStyle = {
    display: controls.eyes.rightEye.bluePupilVisible ? 'block' : 'none',
    transform: `scale(${controls.eyes.rightEye.bluePupilScale * eyeStyles.rightIris.scale}) 
                translate(${controls.eyes.rightEye.bluePupilX + eyeStyles.rightIris.x + 
                          (emotionState === 'thinking' ? thinkingOffset.x * 0.8 : (emotionState === 'neutral' && gazeTracking) ? eyeTrackingOffset.x * 0.8 : 0)}px, 
                          ${controls.eyes.rightEye.bluePupilY + eyeStyles.rightIris.y + 
                          (emotionState === 'thinking' ? thinkingOffset.y * 0.8 : (emotionState === 'neutral' && gazeTracking) ? eyeTrackingOffset.y * 0.8 : 0)}px) 
                rotate(${controls.eyes.rightEye.bluePupilRotation || 0}deg)`,
    opacity: eyeStyles.rightIris.opacity
  };

  // 眉毛样式
  const leftEyebrowStyle = {
    ...getTransformStyle(controls.eyebrows.leftEyebrow),
    display: controls.eyebrows.visible ? 'block' : 'none',
    // 根据情绪状态调整眉毛
    ...(emotionState === 'thinking' && { 
      transform: `scale(${controls.eyebrows.leftEyebrow.scale}) 
                  translate(${controls.eyebrows.leftEyebrow.x}px, 
                           ${controls.eyebrows.leftEyebrow.y - 3}px) 
                  rotate(${controls.eyebrows.leftEyebrow.rotation + 5}deg)` 
    }),
    ...(emotionState === 'happy' && { 
      transform: `scale(${controls.eyebrows.leftEyebrow.scale}) 
                  translate(${controls.eyebrows.leftEyebrow.x}px, 
                           ${controls.eyebrows.leftEyebrow.y - 4}px) 
                  rotate(${controls.eyebrows.leftEyebrow.rotation + 8}deg)` 
    }),
    ...(emotionState === 'sad' && { 
      transform: `scale(${controls.eyebrows.leftEyebrow.scale}) 
                  translate(${controls.eyebrows.leftEyebrow.x + 2}px, 
                           ${controls.eyebrows.leftEyebrow.y + 2}px) 
                  rotate(${controls.eyebrows.leftEyebrow.rotation - 10}deg)` 
    }),
    ...(emotionState === 'angry' && { 
      transform: `scale(${controls.eyebrows.leftEyebrow.scale}) 
                  translate(${controls.eyebrows.leftEyebrow.x - 2}px, 
                           ${controls.eyebrows.leftEyebrow.y - 3}px) 
                  rotate(${controls.eyebrows.leftEyebrow.rotation - 20}deg)`,
      transition: 'transform 0.1s ease'  // 添加微小的过渡效果，配合抖动动画
    })
  };
  
  const rightEyebrowStyle = {
    ...getTransformStyle(controls.eyebrows.rightEyebrow),
    display: controls.eyebrows.visible ? 'block' : 'none',
    // 根据情绪状态调整眉毛
    ...(emotionState === 'thinking' && { 
      transform: `scale(${controls.eyebrows.rightEyebrow.scale}) 
                  translate(${controls.eyebrows.rightEyebrow.x}px, 
                           ${controls.eyebrows.rightEyebrow.y - 3}px) 
                  rotate(${controls.eyebrows.rightEyebrow.rotation - 5}deg)` 
    }),
    ...(emotionState === 'happy' && { 
      transform: `scale(${controls.eyebrows.rightEyebrow.scale}) 
                  translate(${controls.eyebrows.rightEyebrow.x}px, 
                           ${controls.eyebrows.rightEyebrow.y - 4}px) 
                  rotate(${controls.eyebrows.rightEyebrow.rotation - 8}deg)` 
    }),
    ...(emotionState === 'sad' && { 
      transform: `scale(${controls.eyebrows.rightEyebrow.scale}) 
                  translate(${controls.eyebrows.rightEyebrow.x - 2}px, 
                           ${controls.eyebrows.rightEyebrow.y + 2}px) 
                  rotate(${controls.eyebrows.rightEyebrow.rotation + 10}deg)` 
    }),
    ...(emotionState === 'angry' && { 
      transform: `scale(${controls.eyebrows.rightEyebrow.scale}) 
                  translate(${controls.eyebrows.rightEyebrow.x + 2}px, 
                           ${controls.eyebrows.rightEyebrow.y - 3}px) 
                  rotate(${controls.eyebrows.rightEyebrow.rotation + 20}deg)`,
      transition: 'transform 0.1s ease'  // 添加微小的过渡效果，配合抖动动画
    })
  };

  // 喙/鼻子样式
  const beakStyle = {
    ...getTransformStyle(controls.beak),
    display: controls.beak.visible ? 'block' : 'none',
    // 生气状态下喙的位置变化
    ...(emotionState === 'angry' && {
      transform: `scale(${controls.beak.scale * 0.95}) 
                 translate(${controls.beak.x}px, ${controls.beak.y + 1}px) 
                 rotate(${controls.beak.rotation + angryOffset.rotation * 0.5}deg)`,
    })
  };

  // 爪子样式
  const feetStyle = {
    ...getTransformStyle(controls.feet),
    display: controls.feet.visible ? 'block' : 'none'
  };

  // 尾巴样式
  const tailStyle = {
    ...getTransformStyle(controls.tail || { scale: 1, x: 0, y: 0, rotation: 0 }),
    display: controls.tail?.visible !== false ? 'block' : 'none'
  };

  return (
    <div className="owl-section">
      <div className="character-container" style={overallStyle} ref={owlContainerRef}>
        <div className={`character ${emotionState}`}>
          {/* 猫头鹰身体 */}
          <div className="owl-body" style={bodyStyle}></div>
          
          {/* 猫头鹰翅膀 */}
          <div className="owl-wing left" style={leftWingStyle}></div>
          <div className="owl-wing right" style={rightWingStyle}></div>
          
          {/* 猫头鹰尾巴 */}
          <div className="owl-tail" style={tailStyle}></div>
          
          {/* 猫头鹰眼睛组件 - 左眼 */}
          <div className="owl-eyes">
            <div className={`owl-eye ${blinkLeft ? 'blink' : ''} ${emotionState === 'angry' ? 'angry' : ''}`} style={leftEyeStyle}>
              <div className="eye-white left"></div>
              <div className="eye-iris left" style={leftIrisStyle}></div>
              <div className="eye-pupil left" style={leftPupilStyle}></div>
              <div className="eye-highlight big left" style={{transform: `scale(${eyeStyles.leftHighlight.bigScale})`, opacity: eyeStyles.leftHighlight.bigOpacity}}></div>
              <div className="eye-highlight small left" style={{transform: `scale(${eyeStyles.leftHighlight.smallScale})`, opacity: eyeStyles.leftHighlight.smallOpacity}}></div>
              <div className="eye-highlight blur left" style={{opacity: eyeStyles.leftHighlight.blurOpacity}}></div>
              <div className="eye-lid left" style={leftEyelidStyle}></div>
              
              {/* 左眼的眼泪 */}
              {emotionState === 'sad' && tearDrops.filter(tear => tear.leftEye).map(tear => (
                <div 
                  key={tear.id}
                  style={{
                    position: 'absolute',
                    width: `${tear.size}px`,
                    height: `${tear.size * 1.5}px`,
                    backgroundColor: 'rgba(164, 214, 255, 0.8)',
                    borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                    bottom: '10%',
                    left: '50%',
                    transform: `translate(-50%, ${tear.y}px)`,
                    opacity: tear.opacity,
                    zIndex: 10,
                    boxShadow: '0 0 3px rgba(164, 214, 255, 0.5)'
                  }}
                />
              ))}
            </div>
            
            {/* 猫头鹰眼睛组件 - 右眼 */}
            <div className={`owl-eye ${blinkRight ? 'blink' : ''} ${emotionState === 'angry' ? 'angry' : ''}`} style={rightEyeStyle}>
              <div className="eye-white right"></div>
              <div className="eye-iris right" style={rightIrisStyle}></div>
              <div className="eye-pupil right" style={rightPupilStyle}></div>
              <div className="eye-highlight big right" style={{transform: `scale(${eyeStyles.rightHighlight.bigScale})`, opacity: eyeStyles.rightHighlight.bigOpacity}}></div>
              <div className="eye-highlight small right" style={{transform: `scale(${eyeStyles.rightHighlight.smallScale})`, opacity: eyeStyles.rightHighlight.smallOpacity}}></div>
              <div className="eye-highlight blur right" style={{opacity: eyeStyles.rightHighlight.blurOpacity}}></div>
              <div className="eye-lid right" style={rightEyelidStyle}></div>
              
              {/* 右眼的眼泪 */}
              {emotionState === 'sad' && tearDrops.filter(tear => !tear.leftEye).map(tear => (
                <div 
                  key={tear.id}
                  style={{
                    position: 'absolute',
                    width: `${tear.size}px`,
                    height: `${tear.size * 1.5}px`,
                    backgroundColor: 'rgba(164, 214, 255, 0.8)',
                    borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                    bottom: '10%',
                    left: '50%',
                    transform: `translate(-50%, ${tear.y}px)`,
                    opacity: tear.opacity,
                    zIndex: 10,
                    boxShadow: '0 0 3px rgba(164, 214, 255, 0.5)'
                  }}
                />
              ))}
            </div>
          </div>
          
          {/* 猫头鹰眉毛 */}
          <div className="owl-eyebrows">
            <div className="owl-eyebrow left" style={leftEyebrowStyle}></div>
            <div className="owl-eyebrow right" style={rightEyebrowStyle}></div>
          </div>
          
          {/* 猫头鹰鼻子/喙 */}
          <div className="owl-nose" style={beakStyle}></div>
          
          {/* 猫头鹰爪子 */}
          <div className="owl-feet" style={feetStyle}></div>
          
          {/* WebGazer 状态指示器 - 仅开发阶段可见，可以在生产环境中移除 */}
          {process.env.NODE_ENV === 'development' && (
            <div 
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                fontSize: '10px',
                background: 'rgba(0,0,0,0.5)',
                color: 'white',
                padding: '2px 5px',
                borderRadius: '4px',
                display: 'none' // 默认隐藏，需要可见时改为 'block'
              }}
            >
              {gazeTracking ? '视线跟踪：开启' : '视线跟踪：关闭'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OwlImageAnimation; 