type FrameContext = {
  frame: number;
  deltaTime: number;
  now: number;
  avgFps: number;
  onePercentLowFps: number;
};

export default FrameContext;
