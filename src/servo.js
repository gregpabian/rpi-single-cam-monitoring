// require modules
const pigpio = require('pigpio');
const Gpio = pigpio.Gpio;
// define default servo configuration
const defaultConfig = {
  pan: {
    max: 550,
    min: 2450,
    pin: 22
  },
  tilt: {
    max: 1700,
    min: 1000,
    pin: 23
  }
};

class PanTilt {
  constructor(config) {
    this.config = config || defaultConfig;
    // initialize GPIOs
    this.pan = new Gpio(this.config.pan.pin, {mode: Gpio.OUTPUT});
    this.tilt = new Gpio(this.config.tilt.pin, {mode: Gpio.OUTPUT});
    // center servos
    this.rotate(50, 50);
  }
  // return current pan/tilt head position
  getPosition() {
    const pan = this.pan.getServoPulseWidth();
    const tilt = this.tilt.getServoPulseWidth();

    return {
      x: this.pulseToPercent(pan, this.config.pan.min, this.config.pan.max),
      y: this.pulseToPercent(tilt, this.config.tilt.min, this.config.tilt.max)
    };
  }
  // rotate pan/tilt head to the given position
  rotate(x, y) {
    this.pan.servoWrite(this.percentToPulse(x, this.config.pan.min, this.config.pan.max));
    this.tilt.servoWrite(this.percentToPulse(y, this.config.tilt.min, this.config.tilt.max));
  }
  // rotate pan/tilt head by the given percentage
  rotateBy(x, y) {
    // convert percents to pulse widths
    x = this.clamp(Math.round(x) + this.pan.getServoPulseWidth(), this.config.pan.min, this.config.pan.max);
    y = this.clamp(Math.round(y) + this.tilt.getServoPulseWidth(), this.config.tilt.min, this.config.tilt.max);
    this.pan.servoWrite(x);
    this.tilt.servoWrite(y);
  }
  // convert 0-100% value to a pulse width in [min,max] range
  percentToPulse(value, min, max) {
    return Math.round(value * (max - min) / 100 + min);
  }
  // convert pulse width to 0-100% range
  pulseToPercent(value, min, max) {
    return (value - min) / (max - min) * 100;
  }
  // clamp a number within the inclusive min-max range
  clamp(value, min, max) {
    if (min > max) {
      [max, min] = [min, max];
    }
    return Math.max(Math.min(value, max), min);
  }
}

module.exports = PanTilt;
