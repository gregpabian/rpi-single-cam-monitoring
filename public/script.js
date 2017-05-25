// grab references to DOM elements
var statusEl = document.getElementById('status');
var joystickEl = document.getElementById('joystick');
// initialize WebSocket
var socket = io();
// define helper flags
var speed = 500;
var last = 0;
var radius = joystickEl.parentElement.clientWidth / 2;
var position = [radius, radius];
var isMoving = false;
var isConnected = false;
// touch support
var joyTouch;
// bind to socket events
socket.on('connect', function() {
  statusEl.textContent = 'Connected';
  isConnected = true;
});
socket.on('disconnect', function() {
  statusEl.textContent = 'Disconnected';
  isConnected = false;
});
// handle mouse inputs
joystickEl.addEventListener('mousedown', handleStart, false);
joystickEl.addEventListener('touchstart', handleStart, false);
document.addEventListener('mousemove', handleMove, false);
document.addEventListener('touchmove', handleMove, false);
document.addEventListener('mouseup', handleEnd, false);
document.addEventListener('touchend', handleEnd, false);
// start RAF loop
loop();

function handleStart(event) {
  if (!isConnected) {
    return;
  }

  event.preventDefault();
  joystickEl.classList.add('move');
  isMoving = true;
  // touch support
  if (event.changedTouches) {
    joyTouch = event.changedTouches[0];
  }
}

function handleMove(event) {
  if (!isMoving) {
    return;
  }
  
  var rect = joystickEl.parentElement.getBoundingClientRect();
  // current joystick position
  // touch support
  if (event.changedTouches && joyTouch) {
    var touch = Array.prototype.filter.call(event.changedTouches, (touch) => touch.identifier === joyTouch.identifier)[0];
    if (touch) {
      position = [touch.clientX - rect.left, touch.clientY - rect.top];
    } else {
      return;
    }
  } else {
    position = [event.clientX - rect.left, event.clientY - rect.top];
  }
  // vector between the joystick and panel center
  var v = [position[0] - radius, position[1] - radius];
  // vector length i.e. distance between the joystick and panel center
  var d = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
  // distance greater than the radius, needs to be limited
  if (d > radius) {
    position = [radius + v[0] * radius / d, radius + v[1] * radius / d];
    d = radius;
  }
  
  joystickEl.style.left = position[0] + 'px';
  joystickEl.style.top = position[1] + 'px';
}

function handleEnd() {
  joystickEl.classList.remove('move');
  isMoving = false;
  // touch support
  var hasTouch = Array.prototype.some.call(event.changedTouches || [], function (touch) {
    return touch.identifier === joyTouch.identifier;
  });
  
  if (joyTouch && hasTouch) {
    joyTouch = null;
  }
}

function centerJoystick(time) {
  // convert time delta to seconds
  var t = (time - last) / 1000;
  
  position = [parseFloat(joystickEl.style.left) || 0, parseFloat(joystickEl.style.top) || 0];
  var v = [position[0] - radius, position[1] - radius];
  var d = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
  var u = [v[0] / d, v[1] / d];
  
  if (d > 1) {
    var s = Math.min(d, speed * t);
    u = [u[0] * s, u[1] * s];
    position = [position[0] - u[0], position[1] - u[1]];
  } else {
    position = [radius, radius];
    last = 0;
  }
  
  joystickEl.style.left = position[0] + 'px';
  joystickEl.style.top = position[1] + 'px';
}


function loop(time) {
  if (!last) {
    last = time;
  }
  
  if (!isMoving) {
    centerJoystick(time);
  } else {
    socket.emit('rotateBy', (position[0] - radius) / radius, (position[1] - radius) / radius);
  }
  
  last = time;
  
  requestAnimationFrame(loop);
}