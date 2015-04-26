/* global WebSocket,
          URL
*/

import Transport from './transport.es6.js';
import PeerConnection from './peer-connection.es6.js';

window.addEventListener('load', function() {
  var connectBtn = document.getElementById('ws-connect');

  var wsAddressInput = document.getElementById('ws-address');
  var remoteLoggingInput = document.getElementById('remote-logging');

  var screen = {
    brightnessInput: document.getElementById('power-brightness'),
    enabledInput: document.getElementById('power-screen-enabled')
  };

  var peer = {
    connectBtn: document.getElementById('rtc-connect'),
    disconnectBtn: document.getElementById('rtc-disconnect'),
    facingMode: document.getElementById('rtc-facing-mode')
  };

  var camera = {
    flashModeSelect: document.getElementById('flash-mode'),
    takePictureBtn: document.getElementById('take-picture'),
    cameraPictureImg: document.getElementById('camera-picture'),
    cameraVideo: document.getElementById('camera-video')
  };

  var battery = {
    levelLabel: document.getElementById('battery-level'),
    refreshBtn: document.getElementById('refresh-battery-status')
  };

  var storage = {
    retrieveBtn: document.getElementById('retrieve-file-list'),
    fileList: document.getElementById('file-list')
  };

  var connectionStatusLabel = document.getElementById('ws-connection-status');

  var connections = window.connections = {
    websocket: null,
    peer: null
  };

  function closePeerConnection() {
    peer.connectBtn.disabled = false;
    peer.disconnectBtn.disabled = true;
    peer.facingMode.disabled = false;

    if (connections.peer) {
      connections.peer.close();
      connections.peer = null;

      camera.cameraVideo.pause();
      camera.cameraVideo.mozSrcObject = null;

      send({
        type: 'peer',
        method: 'close'
      });
    }
  }

  function send(applicationMessage, blobs) {
    Transport.send(applicationMessage, blobs).then(function(dataToSend) {
      connections.websocket.send(dataToSend);
    });
  }

  function setReadyState() {
    var statusString = 'UNKNOWN';
    var readyState = connections.websocket.readyState;

    switch (readyState) {
      case 0:
        statusString = 'CONNECTING';
        break;

      case 1:
        statusString = 'OPEN';
        break;

      case 2:
        statusString = 'CLOSING';
        break;

      case 3:
        statusString = 'CLOSED';
        break;
    }

    if (readyState === 0 || readyState === 2) {
      setTimeout(setReadyState, 500);
    }

    connectionStatusLabel.textContent = statusString;
  }

  connectBtn.addEventListener('click', function() {
    connections.websocket = new WebSocket(
      'ws://{address}:8008'.replace('{address}', wsAddressInput.value)
    );

    connections.websocket.binaryType = 'arraybuffer';

    setReadyState();

    connections.websocket.onmessage = function(e) {
      var data = Transport.receive(e.data);
      var message = data.message;

      if (message.type === 'console') {
        console[message.method].apply(console, message.args);
        return;
      }

      if (message.type === 'battery') {
        if (message.method === 'status') {
          battery.levelLabel.textContent = message.value.level;
          return;
        }
        return;
      }

      if (message.type === 'camera') {
        if (message.method === 'picture') {
          camera.cameraPictureImg.src = URL.createObjectURL(data.blobs[0]);
          return;
        }

        if (message.method === 'capabilities') {
          console.log('capabilities: %s', JSON.stringify(message.value));
          return;
        }

        return;
      }

      if (message.type === 'peer') {
        if (message.method === 'answer') {
          console.log('Answer received %s', JSON.stringify(message.value));
          connections.peer.acceptAnswer(message.value);
          return;
        }
        return;
      }

      if (message.type === 'storage') {
        if (message.method === 'list') {
          message.value.names.forEach(function(name, index) {
            var li = document.createElement('li');

            var blobUrl = URL.createObjectURL(data.blobs[index]);

            var fileName = document.createElement('a');
            fileName.textContent = name;
            fileName.href = blobUrl;
            fileName.download = name;

            var img = document.createElement('img');
            img.src = blobUrl;

            var deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.textContent = 'Delete';
            deleteButton.dataset.id = name;

            li.appendChild(fileName);
            li.appendChild(img);
            li.appendChild(deleteButton);

            storage.fileList.appendChild(li);
          });
          return;
        }
        return;
      }
    };
  });

  screen.brightnessInput.addEventListener('change', function() {
    send({
      type: 'power',
      method: 'brightness',
      value: screen.brightnessInput.value
    });
  });

  screen.enabledInput.addEventListener('change', function() {
    send({
      type: 'power',
      method: 'screen-enabled',
      value: screen.enabledInput.checked
    });
  });

  remoteLoggingInput.addEventListener('change', function() {
    send({
      type: 'logger',
      method: remoteLoggingInput.checked ? 'on' : 'off'
    });
  });

  battery.refreshBtn.addEventListener('click', function() {
    send({ type: 'battery', method: 'status'});
  });

  camera.flashModeSelect.addEventListener('change', function() {
    send({
      type: 'camera',
      method: 'flash-mode',
      value: camera.flashModeSelect.value
    });
  });

  camera.takePictureBtn.addEventListener('click', function() {
    if (connections.peer) {
      var confirmMessage =
        'Peer connection is active! Do you want to close it?';
      if(window.confirm(confirmMessage)) {
        closePeerConnection();
      } else {
        return;
      }
    }

    send({
      type: 'camera',
      method: 'take-picture'
    });
  });

  peer.connectBtn.addEventListener('click', function() {
    connections.peer = new PeerConnection();

    connections.peer.on('ice-candidate', function(candidate) {
      // Firing this callback with a null candidate indicates that trickle ICE
      // gathering has finished, and all the candidates are now present in
      // "localDescription". Waiting until now to create the answer saves us
      // from having to send offer + answer + iceCandidates separately.
      if (candidate === null) {
        var offer = connections.peer.getLocalDescription();

        send({
          type: 'peer',
          method: 'offer',
          value: {
            type: offer.type,
            sdp: offer.sdp
          },
          facingMode: peer.facingMode.value
        });
      }
    });

    connections.peer.on('add-stream', function(stream) {
      camera.cameraVideo.mozSrcObject = stream;
      camera.cameraVideo.play();
    });

    navigator.mozGetUserMedia({ video: true, fake: true }, function(stream) {
      connections.peer.addStream(stream);

      connections.peer.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: true
      });
    }, function(e) {});

    peer.connectBtn.disabled = true;
    peer.disconnectBtn.disabled = false;
    peer.facingMode.disabled = true;
  });

  peer.disconnectBtn.addEventListener('click', function() {
    closePeerConnection();
  });

  storage.retrieveBtn.addEventListener('click', function() {
    storage.fileList.textContent = '';

    send({
      type: 'storage',
      method: 'list',
      pageSize: 5
    });
  });

  storage.fileList.addEventListener('click', function(e) {
    if (e.target.nodeName.toLowerCase() === 'button') {
      send({
        type: 'storage',
        method: 'delete',
        value: e.target.dataset.id
      });

      e.target.closest('li').remove();
    }
  });
});
