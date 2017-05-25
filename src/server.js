// load modules
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const config = require('./cli-parser.js');
const PanTilt = require('./servo');
const Camera = require('./camera.js');
const BOUNDARY = 'MYBOUNDARY';
const panTilt = new PanTilt();
const camera = new Camera(config);
// serve static files from the public directory
app.use(express.static('public'));
// handle requests for the video stream
app.get('/live.jpg', (req, res) => {
  res.writeHead(200, {
    'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
    'Connection': 'keep-alive',
    // here we define the boundary marker for browser to identify subsequent frames
    'Content-Type': `multipart/x-mixed-replace;boundary="${BOUNDARY}"`,
    'Expires': 'Thu, Jan 01 1970 00:00:00 GMT',
    'Pragma': 'no-cache'
  });

  // connection closed - finish the response
  res.on('close', () => res.end());

  let loop = () => {
    return camera.capture()
      .then((frame) => {
        if (res.finished) {
          return;
        }
        // serve a single frame
        res.write(`--${BOUNDARY}\r\n`);
        res.write('Content-Type: image/jpeg\r\n');
        res.write(`Content-Length: ${frame.length}\r\n`);
        res.write('\r\n');
        res.write(Buffer(frame), 'binary');
        res.write('\r\n');

        // attempt to cache another frame after 50ms = ~20fps
        setTimeout(loop, 50);
      })
      .catch((e) => {
        res.writeHead(500, 'Server Error');
        res.write(e.message);
        res.end();
      });
  };

  loop();
});

// handle socket client connection
io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
  
  socket.on('rotateBy', (x, y) => {
    x *= -config.speed;
    y *= config.speed;
    
    if (config.panFlip) {
      x *= -1;
    }

    if (config.tiltFlip) {
      y *= -1;
    }

    // console.log(`Rotate by x:${x.toFixed(1)}% y:${y.toFixed(1)}%`);
    panTilt.rotateBy(x, y);
  });
});
// start HTTP server
http.listen(config.port, config.address, () => {
  console.log(`Server listening at http://${config.address}:${config.port}`);
});
// disconnect the camera when closing the script
process.on('exit', () => camera.destroy());