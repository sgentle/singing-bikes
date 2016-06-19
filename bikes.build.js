(function () {

var style = function (el, styles) { return Object.keys(styles).forEach(function (k) { return el.style[k] = styles[k]; }); };

var image = function (src) { return new Promise(function (resolve, reject) {
  var img = new Image();
  img.src = src;
  img.onload = function () { return resolve(img); };
}); };

var isSafari = navigator.userAgent.indexOf('Safari/') > -1 &&
  navigator.userAgent.indexOf('Chrome/') === -1;

var animationStyles = document.createElement('style');
animationStyles.textContent = "\n  @keyframes rotate {\n    0% {\n      transform: rotate(0deg);\n    }\n\n    100% {\n      transform: rotate(-359deg);\n    }\n  }\n";
document.head.appendChild(animationStyles);

var colorImage = function (src, color) { return image(src).then(function (img) {
    var canvas = document.createElement('canvas');
    canvas.width = img.width; canvas.height = img.height;
    ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(img, 0, 0);
    return canvas;
  }); };


var context = new (window.AudioContext || window.webkitAudioContext);
var globalGain = context.createGain();
globalGain.connect(context.destination);

var gains = [];
var updateGlobalGain = function () {
  var totalGain = Math.max(1, gains.reduce(function (a, b) { return a + b; }, 0));
  globalGain.gain.value = totalGain ? 1/totalGain : 1;
};
var gainsi = 0;
var getMixer = function () {
  var i = gainsi++;
  gains[i] = 0;
  return function (gain) {
    gains[i] = gain;
    updateGlobalGain();
  };
}

var bikeify = function (el) {
  var color = el.getAttribute('color') || '#FFF';
  var freq = el.getAttribute('frequency') || 440;

  style(el, {
    position: 'relative',
    display: 'inline-block',
    width: '325px',
    height: '300px'
  });

  colorImage('bikeframe.png', color).then(function (canvas) {
    style(canvas, { width: '100%', height: '100%' });
    el.appendChild(canvas);
  });

  var pedalAssembly = document.createElement('div');
  style(pedalAssembly, {
    position: 'absolute',
    top: '40px',
    left: '38px',
    width: '86.5px',
    height: '80.5px'
  });
  el.appendChild(pedalAssembly);

  colorImage('bikespinner.png', color).then(function (canvas) {
    style(canvas, {
      position: 'absolute',
      top: '0px',
      left: '0px',
      width: '86.5px',
      height: '80.5px'
    });
    pedalAssembly.appendChild(canvas);
  });

  var animCheckpoint = null;
  var animStart = null;

  colorImage('bikepedal.png', color).then(function (canvas) {
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
  .then(function () {
    style(pedalAssembly, {
      animationName: 'rotate',
      animationDuration: '10000000000ms',
      animationIterationCount: 'infinite',
      animationTimingFunction: 'linear',
      animationFillMode: 'both'
    });
  })
  .then(function () {
    animStart = Date.now();
    animCheckpoint = animStart;
  });

  var osc = context.createOscillator();
  osc.frequency.value = freq;
  osc.start();

  var halfosc = context.createOscillator();
  halfosc.frequency.value = freq/2;
  halfosc.start();

  var quartosc = context.createOscillator();
  quartosc.frequency.value = freq/4;
  quartosc.start();

  var gain = context.createGain();
  gain.gain.value = 0;

  var vibratoosc = context.createOscillator();
  vibratoosc.frequency.value = 1;
  vibratoosc.start();

  var vibratogain = context.createGain();
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

  var mixer = getMixer();

  var speed = 0;
  var oldspeed = speed;
  var MIN_DURATION = 100;
  var offset = 0;

  var updateSpeed = function (newspeed) {
    if (newspeed > 1) return;
    oldspeed = speed;
    speed = newspeed;
    var dur = 1/speed * MIN_DURATION;
    var olddur = 1/oldspeed * MIN_DURATION;
    var rotations = (Date.now() - animCheckpoint) / olddur;
    offset = (offset + rotations) % 1;
    var offs = offset * dur;

    // Antidelay compensates for the fact that the animation position resets
    // when we change the duration but the origin for the delay doesn't.
    var antidelay = (animStart - Date.now()) % dur;
    var delay = -1 * dur - offs - antidelay;

    pedalAssembly.style.animationDuration = dur + "ms";
    pedalAssembly.style.animationDelay = delay + "ms";
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
    var scale = Math.log2(1 + speed);
    vibratogain.gain.value = scale * 0.1;
    gain.gain.value = scale * 0.233;
    mixer(scale);

  }

  var ACCEL = 0.05;
  var FRICTION = 0.02;
  var STOP = 0.001;

  var holding = false;
  var inside = false;
  var timer = null;

  var startTimer = function () {
    if (timer) return;
    timer = setInterval(function () {
      if (holding && inside) {
        updateSpeed(speed + ACCEL);
      }
      else {
        updateSpeed(speed * (1 - FRICTION));
        if (speed < STOP) stopTimer();
      }
    }, 100);
  };
  var stopTimer = function () {
    clearInterval(timer);
    timer = null;
  };

  el.addEventListener('mousedown', function () { holding = true; inside = true; startTimer(); })
  el.addEventListener('touchstart', function () { holding = true; inside = true; startTimer(); })
  window.addEventListener('mousedown', function () { holding = true; })
  window.addEventListener('mouseup', function () { holding = false; })
  window.addEventListener('touchend', function () { holding = false; })
  el.addEventListener('mouseleave', function () { inside = false; })
  el.addEventListener('mouseenter', function (ev) { inside = true; if (holding) startTimer(); })
};


Array.prototype.slice.apply(document.querySelectorAll('singing-bike')).forEach(bikeify);

})();
