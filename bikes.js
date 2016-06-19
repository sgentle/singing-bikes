(() => {

const style = (el, styles) =>
  Object.keys(styles).forEach(k => el.style[k] = styles[k]);

const image = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.src = src;
  img.onload = () => resolve(img);
});

const isSafari = navigator.userAgent.indexOf('Safari/') > -1 &&
  navigator.userAgent.indexOf('Chrome/') === -1;

const animationStyles = document.createElement('style');
animationStyles.textContent = `
  @keyframes rotate {
    0% {
      transform: rotate(0deg);
    }

    100% {
      transform: rotate(-359deg);
    }
  }
`;
document.head.appendChild(animationStyles);

const colorImage = (src, color) =>
  image(src).then(img => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width; canvas.height = img.height;
    ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(img, 0, 0);
    return canvas;
  });


const context = new (window.AudioContext || window.webkitAudioContext);
const globalGain = context.createGain();
globalGain.connect(context.destination);

const gains = [];
const updateGlobalGain = () => {
  const totalGain = Math.max(1, gains.reduce((a, b) => a + b, 0));
  globalGain.gain.value = totalGain ? 1/totalGain : 1;
};
let gainsi = 0;
const getMixer = () => {
  const i = gainsi++;
  gains[i] = 0;
  return (gain) => {
    gains[i] = gain;
    updateGlobalGain();
  };
}

const bikeify = (el) => {
  const color = el.getAttribute('color') || '#FFF';
  const freq = el.getAttribute('frequency') || 440;
  const base = el.getAttribute('base') || '';

  style(el, {
    position: 'relative',
    display: 'inline-block',
    width: '325px',
    height: '300px'
  });

  colorImage(base + 'bikeframe.png', color).then(canvas => {
    style(canvas, { width: '100%', height: '100%' });
    el.appendChild(canvas);
  });

  const pedalAssembly = document.createElement('div');
  style(pedalAssembly, {
    position: 'absolute',
    top: '40px',
    left: '38px',
    width: '86.5px',
    height: '80.5px'
  });
  el.appendChild(pedalAssembly);

  colorImage(base + 'bikespinner.png', color).then(canvas => {
    style(canvas, {
      position: 'absolute',
      top: '0px',
      left: '0px',
      width: '86.5px',
      height: '80.5px'
    });
    pedalAssembly.appendChild(canvas);
  });

  let animCheckpoint = null;
  let animStart = null;

  colorImage(base + 'bikepedal.png', color).then(canvas => {
    style(canvas, {
      position: 'absolute',
      top: '30px',
      left: '30px',
      width: '52.5px',
      height: '44.25px',
      transformOrigin: '46px 15px',
      animationName: 'rotate',
      animationDuration: 'inherit',
      animationDelay: 'inherit',
      animationPlayState: 'inherit',
      animationIterationCount: 'infinite',
      animationTimingFunction: 'linear',
      animationDirection: 'reverse',
      animationFillMode: 'both',
      zIndex: '1'
    });
    pedalAssembly.appendChild(canvas);
  })
  .then(() => {
    style(pedalAssembly, {
      animationName: 'rotate',
      animationDuration: '10000000000ms',
      animationIterationCount: 'infinite',
      animationTimingFunction: 'linear',
      animationFillMode: 'both'
    });
  })
  .then(() => {
    animStart = Date.now();
    animCheckpoint = animStart;
  });

  const osc = context.createOscillator();
  osc.frequency.value = freq;
  osc.start();

  const halfosc = context.createOscillator();
  halfosc.frequency.value = freq/2;
  halfosc.start();

  const quartosc = context.createOscillator();
  quartosc.frequency.value = freq/4;
  quartosc.start();

  const gain = context.createGain();
  gain.gain.value = 0;

  const vibratoosc = context.createOscillator();
  vibratoosc.frequency.value = 1;
  vibratoosc.start();

  const vibratogain = context.createGain();
  vibratogain.gain.value = 0;

  vibratoosc.connect(vibratogain);
  vibratogain.connect(gain.gain);

  vibratofreqgain = context.createGain();
  vibratofreqgain.gain.value = -2;

  vibratoosc.connect(vibratofreqgain);
  vibratofreqgain.connect(osc.frequency);

  osc.connect(gain);
  halfosc.connect(gain);
  quartosc.connect(gain);
  gain.connect(globalGain);

  const mixer = getMixer();

  let speed = 0;
  let oldspeed = speed;
  const MIN_DURATION = 100;
  let offset = 0;

  const updateSpeed = (newspeed) => {
    if (newspeed > 1) return;
    oldspeed = speed;
    speed = newspeed;
    let dur = 1/speed * MIN_DURATION;
    if (!isFinite(dur)) dur = 10000000000;

    const olddur = 1/oldspeed * MIN_DURATION;
    const rotations = (Date.now() - animCheckpoint) / olddur;
    offset = (offset + rotations) % 1;
    const offs = offset * dur;

    // Antidelay compensates for the fact that the animation position resets
    // when we change the duration but the origin for the delay doesn't.
    const antidelay = (animStart - Date.now()) % dur;
    const delay = -1 * dur - offs - antidelay;

    pedalAssembly.style.animationDuration = `${dur}ms`;
    pedalAssembly.style.animationDelay = `${delay}ms`;
    if (isSafari) {
      // This workaround brought to you by bizarrely inconsistent behaviour
      // when changing animationDuration
      pedalAssembly.style.animationPlayState = 'paused';
      pedalAssembly.offsetWidth = pedalAssembly.offsetWidth;
      pedalAssembly.style.animationPlayState = 'running';
    }
    animCheckpoint = Date.now();

    vibratogain.gain.value = 0.1;
    vibratoosc.frequency.value = 1000 / dur;
    const scale = Math.log2(1 + speed);
    vibratogain.gain.value = scale * 0.1;
    gain.gain.value = scale * 0.233;
    mixer(scale);
  }

  const ACCEL = 0.05;
  const FRICTION = 0.02;
  const STOP = 0.001;

  let holding = false;
  let inside = false;
  let timer = null;

  const startTimer = () => {
    if (timer) return;
    timer = setInterval(() => {
      if (holding && inside) {
        updateSpeed(speed + ACCEL);
      }
      else {
        updateSpeed(speed * (1 - FRICTION));
        if (speed < STOP) {
          updateSpeed(0);
          stopTimer();
        }
      }
    }, 100);
  };
  const stopTimer = () => {
    clearInterval(timer);
    timer = null;
  };

  el.addEventListener('mousedown', () => { holding = true; inside = true; startTimer(); })
  el.addEventListener('touchstart', () => { holding = true; inside = true; startTimer(); })
  window.addEventListener('mousedown', () => { holding = true; })
  window.addEventListener('mouseup', () => { holding = false; })
  window.addEventListener('touchend', () => { holding = false; })
  el.addEventListener('mouseleave', () => { inside = false; })
  el.addEventListener('mouseenter', (ev) => { inside = true; if (holding) startTimer(); })
};


Array.prototype.slice.apply(document.querySelectorAll('singing-bike')).forEach(bikeify);

})();