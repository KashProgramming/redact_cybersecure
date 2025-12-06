type VantaEffect = {
  destroy: () => void;
};

interface VantaGlobeConfig {
  el: HTMLElement;
  mouseControls?: boolean;
  touchControls?: boolean;
  gyroControls?: boolean;
  minHeight?: number;
  minWidth?: number;
  scale?: number;
  scaleMobile?: number;
}
