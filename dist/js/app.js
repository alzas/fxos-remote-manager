(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.FxRemoteManager = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/* global WebSocket,
          URL
*/

'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _transportEs6Js = require('./transport.es6.js');

var _transportEs6Js2 = _interopRequireDefault(_transportEs6Js);

var _peerConnectionEs6Js = require('./peer-connection.es6.js');

var _peerConnectionEs6Js2 = _interopRequireDefault(_peerConnectionEs6Js);

var getUserMedia = (navigator.mozGetUserMedia || navigator.webkitGetUserMedia || navigator.getUserMedia).bind(navigator);

window.addEventListener('load', function () {
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
    cameraVideo: document.getElementById('camera-video'),
    startTracking: document.getElementById('take-picture-every'),
    trackingInterval: document.getElementById('interval-value'),
    trackingIntervalType: document.getElementById('interval-type'),
    stopTracking: document.getElementById('stop-taking-picture')
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
    _transportEs6Js2['default'].send(applicationMessage, blobs).then(function (dataToSend) {
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

  connectBtn.addEventListener('click', function () {
    connections.websocket = new WebSocket('ws://{address}:8008'.replace('{address}', wsAddressInput.value));

    connections.websocket.binaryType = 'arraybuffer';

    setReadyState();

    connections.websocket.onmessage = function (e) {
      var data = _transportEs6Js2['default'].receive(e.data);
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
          message.value.names.forEach(function (name, index) {
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

  screen.brightnessInput.addEventListener('change', function () {
    send({
      type: 'power',
      method: 'brightness',
      value: screen.brightnessInput.value
    });
  });

  screen.enabledInput.addEventListener('change', function () {
    send({
      type: 'power',
      method: 'screen-enabled',
      value: screen.enabledInput.checked
    });
  });

  remoteLoggingInput.addEventListener('change', function () {
    send({
      type: 'logger',
      method: remoteLoggingInput.checked ? 'on' : 'off'
    });
  });

  battery.refreshBtn.addEventListener('click', function () {
    send({ type: 'battery', method: 'status' });
  });

  camera.flashModeSelect.addEventListener('change', function () {
    send({
      type: 'camera',
      method: 'flash-mode',
      value: camera.flashModeSelect.value
    });
  });

  camera.takePictureBtn.addEventListener('click', function () {
    if (connections.peer) {
      var confirmMessage = 'Peer connection is active! Do you want to close it?';
      if (window.confirm(confirmMessage)) {
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

  camera.startTracking.addEventListener('click', function () {
    send({
      type: 'camera',
      method: 'tracking-start',
      value: {
        interval: Number.parseInt(camera.trackingInterval.value, 10),
        type: camera.trackingIntervalType.value
      }
    });
  });

  camera.stopTracking.addEventListener('click', function () {
    send({
      type: 'camera',
      method: 'tracking-stop'
    });
  });

  peer.connectBtn.addEventListener('click', function () {
    connections.peer = new _peerConnectionEs6Js2['default']();

    connections.peer.on('ice-candidate', function (candidate) {
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

    connections.peer.on('add-stream', function (stream) {
      camera.cameraVideo.mozSrcObject = stream;
      camera.cameraVideo.play();
    });

    getUserMedia({ video: true, fake: true }, function (stream) {
      connections.peer.addStream(stream);

      connections.peer.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
    }, function (e) {
      console.error(e);
    });

    peer.connectBtn.disabled = true;
    peer.disconnectBtn.disabled = false;
    peer.facingMode.disabled = true;
  });

  peer.disconnectBtn.addEventListener('click', function () {
    closePeerConnection();
  });

  storage.retrieveBtn.addEventListener('click', function () {
    storage.fileList.textContent = '';

    send({
      type: 'storage',
      method: 'list',
      pageSize: 5
    });
  });

  storage.fileList.addEventListener('click', function (e) {
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

},{"./peer-connection.es6.js":4,"./transport.es6.js":5}],2:[function(require,module,exports){
/*global Map, Set */

'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
function ensureValidEventName(eventName) {
  if (!eventName || typeof eventName !== 'string') {
    throw new Error('Event name should be a valid non-empty string!');
  }
}

function ensureValidHandler(handler) {
  if (typeof handler !== 'function') {
    throw new Error('Handler should be a function!');
  }
}

function ensureAllowedEventName(allowedEvents, eventName) {
  if (allowedEvents && allowedEvents.indexOf(eventName) < 0) {
    throw new Error('Event "' + eventName + '" is not allowed!');
  }
}

// Implements publish/subscribe behaviour that can be applied to any object,
// so that object can be listened for custom events. "this" context is the
// object with Map "listeners" property used to store handlers.
var eventDispatcher = {
  /**
   * Registers listener function to be executed once event occurs.
   * @param {string} eventName Name of the event to listen for.
   * @param {function} handler Handler to be executed once event occurs.
   */
  on: function on(eventName, handler) {
    ensureValidEventName(eventName);
    ensureAllowedEventName(this.allowedEvents, eventName);
    ensureValidHandler(handler);

    var handlers = this.listeners.get(eventName);

    if (!handlers) {
      handlers = new Set();
      this.listeners.set(eventName, handlers);
    }

    // Set.add ignores handler if it has been already registered
    handlers.add(handler);
  },

  /**
   * Removes registered listener for the specified event.
   * @param {string} eventName Name of the event to remove listener for.
   * @param {function} handler Handler to remove, so it won't be executed
   * next time event occurs.
   */
  off: function off(eventName, handler) {
    ensureValidEventName(eventName);
    ensureAllowedEventName(this.allowedEvents, eventName);
    ensureValidHandler(handler);

    var handlers = this.listeners.get(eventName);

    if (!handlers) {
      return;
    }

    handlers['delete'](handler);

    if (!handlers.size) {
      this.listeners['delete'](eventName);
    }
  },

  /**
   * Removes all registered listeners for the specified event.
   * @param {string} eventName Name of the event to remove all listeners for.
   */
  offAll: function offAll(eventName) {
    if (typeof eventName === 'undefined') {
      this.listeners.clear();
      return;
    }

    ensureValidEventName(eventName);
    ensureAllowedEventName(this.allowedEvents, eventName);

    var handlers = this.listeners.get(eventName);

    if (!handlers) {
      return;
    }

    handlers.clear();

    this.listeners['delete'](eventName);
  },

  /**
   * Emits specified event so that all registered handlers will be called
   * with the specified parameters.
   * @param {string} eventName Name of the event to call handlers for.
   * @param {Object} parameters Optional parameters that will be passed to
   * every registered handler.
   */
  emit: function emit(eventName, parameters) {
    ensureValidEventName(eventName);
    ensureAllowedEventName(this.allowedEvents, eventName);

    var handlers = this.listeners.get(eventName);

    if (!handlers) {
      return;
    }

    handlers.forEach(function (handler) {
      try {
        handler(parameters);
      } catch (e) {
        console.error(e);
      }
    });
  }
};

exports['default'] = {
  /**
   * Mixes dispatcher methods into target object.
   * @param {Object} target Object to mix dispatcher methods into.
   * @param {Array.<string>} allowedEvents Optional list of the allowed event
   * names that can be emitted and listened for.
   * @returns {Object} Target object with added dispatcher methods.
   */
  mixin: function mixin(target, allowedEvents) {
    if (!target || typeof target !== 'object') {
      throw new Error('Object to mix into should be valid object!');
    }

    if (typeof allowedEvents !== 'undefined' && !Array.isArray(allowedEvents)) {
      throw new Error('Allowed events should be a valid array of strings!');
    }

    Object.keys(eventDispatcher).forEach(function (method) {
      if (typeof target[method] !== 'undefined') {
        throw new Error('Object to mix into already has "' + method + '" property defined!');
      }
      target[method] = eventDispatcher[method].bind(this);
    }, { listeners: new Map(), allowedEvents: allowedEvents });

    return target;
  }
};
module.exports = exports['default'];

},{}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
var WebSocketUtils = {
  /**
   * Mask every data element with the mask (WebSocket specific algorithm).
   * @param {Array} mask Mask array.
   * @param {Array} array Data array to mask.
   * @returns {Array} Masked data array.
   */
  mask: function mask(_mask, array) {
    if (_mask) {
      for (var i = 0; i < array.length; i++) {
        array[i] = array[i] ^ _mask[i % 4];
      }
    }
    return array;
  },

  /**
   * Generates 4-item array, every item of which is element of byte mask.
   * @returns {Uint8Array}
   */
  generateRandomMask: function generateRandomMask() {
    var random = new Uint8Array(4);

    window.crypto.getRandomValues(random);

    return random;
  },

  /**
   * Converts string to Uint8Array.
   * @param {string} stringValue String value to convert.
   * @returns {Uint8Array}
   */
  stringToArray: function stringToArray(stringValue) {
    if (typeof stringValue !== 'string') {
      throw new Error('stringValue should be valid string!');
    }

    var array = new Uint8Array(stringValue.length);
    for (var i = 0; i < stringValue.length; i++) {
      array[i] = stringValue.charCodeAt(i);
    }

    return array;
  },

  /**
   * Converts array to string. Every array element is considered as char code.
   * @param {Uint8Array} array Array with the char codes.
   * @returns {string}
   */
  arrayToString: function arrayToString(array) {
    return String.fromCharCode.apply(null, array);
  },

  /**
   * Reads unsigned 16 bit value from two consequent 8-bit array elements.
   * @param {Uint8Array} array Array to read from.
   * @param {Number} offset Index to start read value.
   * @returns {Number}
   */
  readUInt16: function readUInt16(array, offset) {
    offset = offset || 0;
    return (array[offset] << 8) + array[offset + 1];
  },

  /**
   * Reads unsigned 32 bit value from four consequent 8-bit array elements.
   * @param {Uint8Array} array Array to read from.
   * @param {Number} offset Index to start read value.
   * @returns {Number}
   */
  readUInt32: function readUInt32(array, offset) {
    offset = offset || 0;
    return (array[offset] << 24) + (array[offset + 1] << 16) + (array[offset + 2] << 8) + array[offset + 3];
  },

  /**
   * Writes unsigned 16 bit value to two consequent 8-bit array elements.
   * @param {Uint8Array} array Array to write to.
   * @param {Number} value 16 bit unsigned value to write into array.
   * @param {Number} offset Index to start write value.
   * @returns {Number}
   */
  writeUInt16: function writeUInt16(array, value, offset) {
    array[offset] = (value & 65280) >> 8;
    array[offset + 1] = value & 255;
  },

  /**
   * Writes unsigned 16 bit value to two consequent 8-bit array elements.
   * @param {Uint8Array} array Array to write to.
   * @param {Number} value 16 bit unsigned value to write into array.
   * @param {Number} offset Index to start write value.
   * @returns {Number}
   */
  writeUInt32: function writeUInt32(array, value, offset) {
    array[offset] = (value & 4278190080) >> 24;
    array[offset + 1] = (value & 16711680) >> 16;
    array[offset + 2] = (value & 65280) >> 8;
    array[offset + 3] = value & 255;
  }
};

exports['default'] = WebSocketUtils;
module.exports = exports['default'];

},{}],4:[function(require,module,exports){
/* global Promise,
          mozRTCPeerConnection,
          mozRTCSessionDescription,
          webkitRTCPeerConnection,
          webkitRTCSessionDescription
*/

'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _eventDispatcherJs = require('event-dispatcher-js');

var _eventDispatcherJs2 = _interopRequireDefault(_eventDispatcherJs);

var RTCPeerConnection = window.mozRTCPeerConnection || window.webkitRTCPeerConnection;

var RTCSessionDescription = window.mozRTCSessionDescription || window.webkitRTCSessionDescription;

var privates = {
  connection: Symbol('connection'),

  getConnection: Symbol('getConnection')
};

var PeerConnection = (function () {
  function PeerConnection() {
    _classCallCheck(this, PeerConnection);

    _eventDispatcherJs2['default'].mixin(this, ['add-stream', 'ice-candidate', 'signaling-state-change']);

    var connection = new RTCPeerConnection({
      iceServers: [{
        url: 'stun:stun.l.google.com:19302',
        urls: 'stun:stun.l.google.com:19302'
      }]
    });

    connection.addEventListener('icecandidate', (function (e) {
      this.emit('ice-candidate', e.candidate);
    }).bind(this));

    connection.addEventListener('addstream', (function (e) {
      this.emit('add-stream', e.stream);
    }).bind(this));

    connection.addEventListener('signalingstatechange', (function (e) {
      this.emit('signaling-state-change', e);
    }).bind(this));

    this[privates.connection] = connection;
  }

  _createClass(PeerConnection, [{
    key: 'getLocalDescription',
    value: function getLocalDescription() {
      return this[privates.getConnection]().localDescription;
    }
  }, {
    key: 'addStream',
    value: function addStream(stream) {
      return this[privates.getConnection]().addStream(stream);
    }
  }, {
    key: 'createOffer',
    value: function createOffer(options) {
      var connection = this[privates.getConnection]();
      return new Promise(function (resolve, reject) {
        connection.createDataChannel('data-channel', { reliable: true });

        connection.createOffer(function (localDescription) {
          connection.setLocalDescription(localDescription, function () {
            resolve(localDescription);
          }, reject);
        }, reject, options);
      });
    }
  }, {
    key: 'acceptOffer',
    value: function acceptOffer(offer) {
      var connection = this[privates.getConnection]();
      return new Promise(function (resolve, reject) {
        var remoteDescription = new RTCSessionDescription(offer);

        connection.setRemoteDescription(remoteDescription, function () {
          connection.createAnswer(function (localDescription) {
            connection.setLocalDescription(localDescription, function () {
              resolve(localDescription);
            }, reject);
          }, reject);
        }, reject);
      });
    }
  }, {
    key: 'acceptAnswer',
    value: function acceptAnswer(answer) {
      var connection = this[privates.getConnection]();
      return new Promise(function (resolve, reject) {
        connection.setRemoteDescription(new RTCSessionDescription(answer), function () {
          resolve();
        }, reject);
      });
    }
  }, {
    key: 'close',
    value: function close() {
      var connection = this[privates.getConnection]();

      connection.getLocalStreams().forEach(function (stream) {
        stream.stop();
      });

      connection.close();

      this[privates.connection] = null;
    }
  }, {
    key: privates.getConnection,
    value: function () {
      var connection = this[privates.connection];

      if (!connection) {
        throw new Error('Connection is closed!');
      }

      return connection;
    }
  }]);

  return PeerConnection;
})();

exports['default'] = PeerConnection;
module.exports = exports['default'];

},{"event-dispatcher-js":2}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _websocketServerUtils = require('websocket-server-utils');

var _websocketServerUtils2 = _interopRequireDefault(_websocketServerUtils);

function joinBlobs(blobs) {
  var result = {
    totalSize: 0,
    meta: [],
    data: null
  };

  var promises = blobs.map(function (blob) {
    var position = result.totalSize;

    result.totalSize += blob.size;

    result.meta.push({ type: blob.type, size: blob.size });

    return blobToArrayBuffer(blob).then(function (buffer) {
      result.data.set(new Uint8Array(buffer), position);
    });
  });

  result.data = new Uint8Array(result.totalSize);

  return Promise.all(promises).then(function () {
    return result;
  });
}

function blobToArrayBuffer(blob) {
  return new Promise(function (resolve) {
    var reader = new FileReader();

    reader.addEventListener('loadend', function () {
      resolve(reader.result);
    });

    reader.readAsArrayBuffer(blob);
  });
}

exports['default'] = {
  send: function send(message, blobs) {
    var blobsJoinPromise = !blobs || !blobs.length ? Promise.resolve() : joinBlobs(blobs);

    return blobsJoinPromise.then(function (blobs) {
      if (blobs) {
        message.__blobs = blobs.meta;
      }

      var serializedApplicationMessage = _websocketServerUtils2['default'].stringToArray(JSON.stringify(message));

      var applicationMessageLength = serializedApplicationMessage.length;

      // Two bytes to have size of application message in joined data array
      var dataToSend = new Uint8Array(2 + applicationMessageLength + (blobs ? blobs.data.length : 0));

      // Write serialized application message length
      _websocketServerUtils2['default'].writeUInt16(dataToSend, applicationMessageLength, 0);

      // Write serialized application message itself
      dataToSend.set(serializedApplicationMessage, 2);

      if (blobs) {
        dataToSend.set(blobs.data, 2 + applicationMessageLength);
      }

      return dataToSend;
    });
  },

  receive: function receive(messageData) {
    var data = new Uint8Array(messageData);
    var dataOffset = 2;
    var applicationMessageLength = (data[0] << 8) + data[1];

    var applicationMessage = JSON.parse(String.fromCharCode.apply(null, data.subarray(dataOffset, dataOffset + applicationMessageLength)));

    var blobs, position;
    if (applicationMessage.__blobs && applicationMessage.__blobs.length) {
      position = dataOffset + applicationMessageLength;
      blobs = applicationMessage.__blobs.map(function (meta) {
        position += meta.size;
        return new Blob([data.subarray(position - meta.size, position)], { type: meta.type });
      });

      delete applicationMessage.__blobs;
    }

    return {
      message: applicationMessage,
      blobs: blobs
    };
  }
};
module.exports = exports['default'];

},{"websocket-server-utils":3}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvbWVkaWEvYXphc3lwa2luL3Byb2plY3RzL2dpdGh1Yi9meG9zLXJlbW90ZS1tYW5hZ2VyL3NyYy9qcy9hcHAuZXM2LmpzIiwiL21lZGlhL2F6YXN5cGtpbi9wcm9qZWN0cy9naXRodWIvZnhvcy1yZW1vdGUtbWFuYWdlci9jb21wb25lbnRzL2V2ZW50LWRpc3BhdGNoZXItanMvZXZlbnQtZGlzcGF0Y2hlci5lczYuanMiLCIvbWVkaWEvYXphc3lwa2luL3Byb2plY3RzL2dpdGh1Yi9meG9zLXJlbW90ZS1tYW5hZ2VyL2NvbXBvbmVudHMvZnhvcy13ZWJzb2NrZXQtc2VydmVyL3NyYy91dGlscy5lczYuanMiLCIvbWVkaWEvYXphc3lwa2luL3Byb2plY3RzL2dpdGh1Yi9meG9zLXJlbW90ZS1tYW5hZ2VyL3NyYy9qcy9wZWVyLWNvbm5lY3Rpb24uZXM2LmpzIiwiL21lZGlhL2F6YXN5cGtpbi9wcm9qZWN0cy9naXRodWIvZnhvcy1yZW1vdGUtbWFuYWdlci9zcmMvanMvdHJhbnNwb3J0LmVzNi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7OzhCQ0lzQixvQkFBb0I7Ozs7bUNBQ2YsMEJBQTBCOzs7O0FBRXJELElBQUksWUFBWSxHQUFHLENBQ2pCLFNBQVMsQ0FBQyxlQUFlLElBQ3pCLFNBQVMsQ0FBQyxrQkFBa0IsSUFDNUIsU0FBUyxDQUFDLFlBQVksQ0FBQSxDQUN0QixJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7O0FBRWxCLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsWUFBVztBQUN6QyxNQUFJLFVBQVUsR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFDOztBQUV2RCxNQUFJLGNBQWMsR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQzNELE1BQUks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QUU7QUFDcEQsZ0JBQVEsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDO0FBQ3RCLGVBQU8sSUFBSSxJQUFJLENBQ2IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDLEVBQy9DLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FDcEIsQ0FBQztPQUNILENBQUMsQ0FBQzs7QUFFSCxhQUFPLGtCQUFrQixDQUFDLE9BQU8sQ0FBQztLQUNuQzs7QUFFRCxXQUFPO0FBQ0wsYUFBTyxFQUFFLGtCQUFrQjtBQUMzQixXQUFLLEVBQUUsS0FBSztLQUNiLENBQUM7R0FDSDtDQUNGIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qIGdsb2JhbCBXZWJTb2NrZXQsXG4gICAgICAgICAgVVJMXG4qL1xuXG5pbXBvcnQgVHJhbnNwb3J0IGZyb20gJy4vdHJhbnNwb3J0LmVzNi5qcyc7XG5pbXBvcnQgUGVlckNvbm5lY3Rpb24gZnJvbSAnLi9wZWVyLWNvbm5lY3Rpb24uZXM2LmpzJztcblxudmFyIGdldFVzZXJNZWRpYSA9IChcbiAgbmF2aWdhdG9yLm1vekdldFVzZXJNZWRpYSB8fFxuICBuYXZpZ2F0b3Iud2Via2l0R2V0VXNlck1lZGlhIHx8XG4gIG5hdmlnYXRvci5nZXRVc2VyTWVkaWFcbikuYmluZChuYXZpZ2F0b3IpO1xuXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIGZ1bmN0aW9uKCkge1xuICB2YXIgY29ubmVjdEJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd3cy1jb25uZWN0Jyk7XG5cbiAgdmFyIHdzQWRkcmVzc0lucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3dzLWFkZHJlc3MnKTtcbiAgdmFyIHJlbW90ZUxvZ2dpbmdJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZW1vdGUtbG9nZ2luZycpO1xuXG4gIHZhciBzY3JlZW4gPSB7XG4gICAgYnJpZ2h0bmVzc0lucHV0OiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncG93ZXItYnJpZ2h0bmVzcycpLFxuICAgIGVuYWJsZWRJbnB1dDogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Bvd2VyLXNjcmVlbi1lbmFibGVkJylcbiAgfTtcblxuICB2YXIgcGVlciA9IHtcbiAgICBjb25uZWN0QnRuOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncnRjLWNvbm5lY3QnKSxcbiAgICBkaXNjb25uZWN0QnRuOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncnRjLWRpc2Nvbm5lY3QnKSxcbiAgICBmYWNpbmdNb2RlOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncnRjLWZhY2luZy1tb2RlJylcbiAgfTtcblxuICB2YXIgY2FtZXJhID0ge1xuICAgIGZsYXNoTW9kZVNlbGVjdDogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ZsYXNoLW1vZGUnKSxcbiAgICB0YWtlUGljdHVyZUJ0bjogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Rha2UtcGljdHVyZScpLFxuICAgIGNhbWVyYVBpY3R1cmVJbWc6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYW1lcmEtcGljdHVyZScpLFxuICAgIGNhbWVyYVZpZGVvOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FtZXJhLXZpZGVvJyksXG4gICAgc3RhcnRUcmFja2luZzogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Rha2UtcGljdHVyZS1ldmVyeScpLFxuICAgIHRyYWNraW5nSW50ZXJ2YWw6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdpbnRlcnZhbC12YWx1ZScpLFxuICAgIHRyYWNraW5nSW50ZXJ2YWxUeXBlOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaW50ZXJ2YWwtdHlwZScpLFxuICAgIHN0b3BUcmFja2luZzogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3N0b3AtdGFraW5nLXBpY3R1cmUnKVxuICB9O1xuXG4gIHZhciBiYXR0ZXJ5ID0ge1xuICAgIGxldmVsTGFiZWw6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYXR0ZXJ5LWxldmVsJyksXG4gICAgcmVmcmVzaEJ0bjogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3JlZnJlc2gtYmF0dGVyeS1zdGF0dXMnKVxuICB9O1xuXG4gIHZhciBzdG9yYWdlID0ge1xuICAgIHJldHJpZXZlQnRuOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmV0cmlldmUtZmlsZS1saXN0JyksXG4gICAgZmlsZUxpc3Q6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmaWxlLWxpc3QnKVxuICB9O1xuXG4gIHZhciBjb25uZWN0aW9uU3RhdHVzTGFiZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnd3MtY29ubmVjdGlvbi1zdGF0dXMnKTtcblxuICB2YXIgY29ubmVjdGlvbnMgPSB3aW5kb3cuY29ubmVjdGlvbnMgPSB7XG4gICAgd2Vic29ja2V0OiBudWxsLFxuICAgIHBlZXI6IG51bGxcbiAgfTtcblxuICBmdW5jdGlvbiBjbG9zZVBlZXJDb25uZWN0aW9uKCkge1xuICAgIHBlZXIuY29ubmVjdEJ0bi5kaXNhYmxlZCA9IGZhbHNlO1xuICAgIHBlZXIuZGlzY29ubmVjdEJ0bi5kaXNhYmxlZCA9IHRydWU7XG4gICAgcGVlci5mYWNpbmdNb2RlLmRpc2FibGVkID0gZmFsc2U7XG5cbiAgICBpZiAoY29ubmVjdGlvbnMucGVlcikge1xuICAgICAgY29ubmVjdGlvbnMucGVlci5jbG9zZSgpO1xuICAgICAgY29ubmVjdGlvbnMucGVlciA9IG51bGw7XG5cbiAgICAgIGNhbWVyYS5jYW1lcmFWaWRlby5wYXVzZSgpO1xuICAgICAgY2FtZXJhLmNhbWVyYVZpZGVvLm1velNyY09iamVjdCA9IG51bGw7XG5cbiAgICAgIHNlbmQoe1xuICAgICAgICB0eXBlOiAncGVlcicsXG4gICAgICAgIG1ldGhvZDogJ2Nsb3NlJ1xuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gc2VuZChhcHBsaWNhdGlvbk1lc3NhZ2UsIGJsb2JzKSB7XG4gICAgVHJhbnNwb3J0LnNlbmQoYXBwbGljYXRpb25NZXNzYWdlLCBibG9icykudGhlbihmdW5jdGlvbihkYXRhVG9TZW5kKSB7XG4gICAgICBjb25uZWN0aW9ucy53ZWJzb2NrZXQuc2VuZChkYXRhVG9TZW5kKTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldFJlYWR5U3RhdGUoKSB7XG4gICAgdmFyIHN0YXR1c1N0cmluZyA9ICdVTktOT1dOJztcbiAgICB2YXIgcmVhZHlTdGF0ZSA9IGNvbm5lY3Rpb25zLndlYnNvY2tldC5yZWFkeVN0YXRlO1xuXG4gICAgc3dpdGNoIChyZWFkeVN0YXRlKSB7XG4gICAgICBjYXNlIDA6XG4gICAgICAgIHN0YXR1c1N0cmluZyA9ICdDT05ORUNUSU5HJztcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMTpcbiAgICAgICAgc3RhdHVzU3RyaW5nID0gJ09QRU4nO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAyOlxuICAgICAgICBzdGF0dXNTdHJpbmcgPSAnQ0xPU0lORyc7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDM6XG4gICAgICAgIHN0YXR1c1N0cmluZyA9ICdDTE9TRUQnO1xuICAgICAgICBicmVhaztcbiAgICB9XG5cbiAgICBpZiAocmVhZHlTdGF0ZSA9PT0gMCB8fCByZWFkeVN0YXRlID09PSAyKSB7XG4gICAgICBzZXRUaW1lb3V0KHNldFJlYWR5U3RhdGUsIDUwMCk7XG4gICAgfVxuXG4gICAgY29ubmVjdGlvblN0YXR1c0xhYmVsLnRleHRDb250ZW50ID0gc3RhdHVzU3RyaW5nO1xuICB9XG5cbiAgY29ubmVjdEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgIGNvbm5lY3Rpb25zLndlYnNvY2tldCA9IG5ldyBXZWJTb2NrZXQoXG4gICAgICAnd3M6Ly97YWRkcmVzc306ODAwOCcucmVwbGFjZSgne2FkZHJlc3N9Jywgd3NBZGRyZXNzSW5wdXQudmFsdWUpXG4gICAgKTtcblxuICAgIGNvbm5lY3Rpb25zLndlYnNvY2tldC5iaW5hcnlUeXBlID0gJ2FycmF5YnVmZmVyJztcblxuICAgIHNldFJlYWR5U3RhdGUoKTtcblxuICAgIGNvbm5lY3Rpb25zLndlYnNvY2tldC5vbm1lc3NhZ2UgPSBmdW5jdGlvbihlKSB7XG4gICAgICB2YXIgZGF0YSA9IFRyYW5zcG9ydC5yZWNlaXZlKGUuZGF0YSk7XG4gICAgICB2YXIgbWVzc2FnZSA9IGRhdGEubWVzc2FnZTtcblxuICAgICAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gJ2NvbnNvbGUnKSB7XG4gICAgICAgIGNvbnNvbGVbbWVzc2FnZS5tZXRob2RdLmFwcGx5KGNvbnNvbGUsIG1lc3NhZ2UuYXJncyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gJ2JhdHRlcnknKSB7XG4gICAgICAgIGlmIChtZXNzYWdlLm1ldGhvZCA9PT0gJ3N0YXR1cycpIHtcbiAgICAgICAgICBiYXR0ZXJ5LmxldmVsTGFiZWwudGV4dENvbnRlbnQgPSBtZXNzYWdlLnZhbHVlLmxldmVsO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChtZXNzYWdlLnR5cGUgPT09ICdjYW1lcmEnKSB7XG4gICAgICAgIGlmIChtZXNzYWdlLm1ldGhvZCA9PT0gJ3BpY3R1cmUnKSB7XG4gICAgICAgICAgY2FtZXJhLmNhbWVyYVBpY3R1cmVJbWcuc3JjID0gVVJMLmNyZWF0ZU9iamVjdFVSTChkYXRhLmJsb2JzWzBdKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobWVzc2FnZS5tZXRob2QgPT09ICdjYXBhYmlsaXRpZXMnKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ2NhcGFiaWxpdGllczogJXMnLCBKU09OLnN0cmluZ2lmeShtZXNzYWdlLnZhbHVlKSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAobWVzc2FnZS50eXBlID09PSAncGVlcicpIHtcbiAgICAgICAgaWYgKG1lc3NhZ2UubWV0aG9kID09PSAnYW5zd2VyJykge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdBbnN3ZXIgcmVjZWl2ZWQgJXMnLCBKU09OLnN0cmluZ2lmeShtZXNzYWdlLnZhbHVlKSk7XG4gICAgICAgICAgY29ubmVjdGlvbnMucGVlci5hY2NlcHRBbnN3ZXIobWVzc2FnZS52YWx1ZSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gJ3N0b3JhZ2UnKSB7XG4gICAgICAgIGlmIChtZXNzYWdlLm1ldGhvZCA9PT0gJ2xpc3QnKSB7XG4gICAgICAgICAgbWVzc2FnZS52YWx1ZS5uYW1lcy5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUsIGluZGV4KSB7XG4gICAgICAgICAgICB2YXIgbGkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xuXG4gICAgICAgICAgICB2YXIgYmxvYlVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoZGF0YS5ibG9ic1tpbmRleF0pO1xuXG4gICAgICAgICAgICB2YXIgZmlsZU5hbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gICAgICAgICAgICBmaWxlTmFtZS50ZXh0Q29udGVudCA9IG5hbWU7XG4gICAgICAgICAgICBmaWxlTmFtZS5ocmVmID0gYmxvYlVybDtcbiAgICAgICAgICAgIGZpbGVOYW1lLmRvd25sb2FkID0gbmFtZTtcblxuICAgICAgICAgICAgdmFyIGltZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpO1xuICAgICAgICAgICAgaW1nLnNyYyA9IGJsb2JVcmw7XG5cbiAgICAgICAgICAgIHZhciBkZWxldGVCdXR0b24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTtcbiAgICAgICAgICAgIGRlbGV0ZUJ1dHRvbi50eXBlID0gJ2J1dHRvbic7XG4gICAgICAgICAgICBkZWxldGVCdXR0b24udGV4dENvbnRlbnQgPSAnRGVsZXRlJztcbiAgICAgICAgICAgIGRlbGV0ZUJ1dHRvbi5kYXRhc2V0LmlkID0gbmFtZTtcblxuICAgICAgICAgICAgbGkuYXBwZW5kQ2hpbGQoZmlsZU5hbWUpO1xuICAgICAgICAgICAgbGkuYXBwZW5kQ2hpbGQoaW1nKTtcbiAgICAgICAgICAgIGxpLmFwcGVuZENoaWxkKGRlbGV0ZUJ1dHRvbik7XG5cbiAgICAgICAgICAgIHN0b3JhZ2UuZmlsZUxpc3QuYXBwZW5kQ2hpbGQobGkpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG5cbiAgc2NyZWVuLmJyaWdodG5lc3NJbnB1dC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICBzZW5kKHtcbiAgICAgIHR5cGU6ICdwb3dlcicsXG4gICAgICBtZXRob2Q6ICdicmlnaHRuZXNzJyxcbiAgICAgIHZhbHVlOiBzY3JlZW4uYnJpZ2h0bmVzc0lucHV0LnZhbHVlXG4gICAgfSk7XG4gIH0pO1xuXG4gIHNjcmVlbi5lbmFibGVkSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgc2VuZCh7XG4gICAgICB0eXBlOiAncG93ZXInLFxuICAgICAgbWV0aG9kOiAnc2NyZWVuLWVuYWJsZWQnLFxuICAgICAgdmFsdWU6IHNjcmVlbi5lbmFibGVkSW5wdXQuY2hlY2tlZFxuICAgIH0pO1xuICB9KTtcblxuICByZW1vdGVMb2dnaW5nSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgc2VuZCh7XG4gICAgICB0eXBlOiAnbG9nZ2VyJyxcbiAgICAgIG1ldGhvZDogcmVtb3RlTG9nZ2luZ0lucHV0LmNoZWNrZWQgPyAnb24nIDogJ29mZidcbiAgICB9KTtcbiAgfSk7XG5cbiAgYmF0dGVyeS5yZWZyZXNoQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgc2VuZCh7IHR5cGU6ICdiYXR0ZXJ5JywgbWV0aG9kOiAnc3RhdHVzJ30pO1xuICB9KTtcblxuICBjYW1lcmEuZmxhc2hNb2RlU2VsZWN0LmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgIHNlbmQoe1xuICAgICAgdHlwZTogJ2NhbWVyYScsXG4gICAgICBtZXRob2Q6ICdmbGFzaC1tb2RlJyxcbiAgICAgIHZhbHVlOiBjYW1lcmEuZmxhc2hNb2RlU2VsZWN0LnZhbHVlXG4gICAgfSk7XG4gIH0pO1xuXG4gIGNhbWVyYS50YWtlUGljdHVyZUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgIGlmIChjb25uZWN0aW9ucy5wZWVyKSB7XG4gICAgICB2YXIgY29uZmlybU1lc3NhZ2UgPVxuICAgICAgICAnUGVlciBjb25uZWN0aW9uIGlzIGFjdGl2ZSEgRG8geW91IHdhbnQgdG8gY2xvc2UgaXQ/JztcbiAgICAgIGlmKHdpbmRvdy5jb25maXJtKGNvbmZpcm1NZXNzYWdlKSkge1xuICAgICAgICBjbG9zZVBlZXJDb25uZWN0aW9uKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuXG4gICAgc2VuZCh7XG4gICAgICB0eXBlOiAnY2FtZXJhJyxcbiAgICAgIG1ldGhvZDogJ3Rha2UtcGljdHVyZSdcbiAgICB9KTtcbiAgfSk7XG5cbiAgY2FtZXJhLnN0YXJ0VHJhY2tpbmcuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgc2VuZCh7XG4gICAgICB0eXBlOiAnY2FtZXJhJyxcbiAgICAgIG1ldGhvZDogJ3RyYWNraW5nLXN0YXJ0JyxcbiAgICAgIHZhbHVlOiB7XG4gICAgICAgIGludGVydmFsOiBOdW1iZXIucGFyc2VJbnQoY2FtZXJhLnRyYWNraW5nSW50ZXJ2YWwudmFsdWUsIDEwKSxcbiAgICAgICAgdHlwZTogY2FtZXJhLnRyYWNraW5nSW50ZXJ2YWxUeXBlLnZhbHVlXG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xuXG4gIGNhbWVyYS5zdG9wVHJhY2tpbmcuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgc2VuZCh7XG4gICAgICB0eXBlOiAnY2FtZXJhJyxcbiAgICAgIG1ldGhvZDogJ3RyYWNraW5nLXN0b3AnXG4gICAgfSk7XG4gIH0pO1xuXG4gIHBlZXIuY29ubmVjdEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgIGNvbm5lY3Rpb25zLnBlZXIgPSBuZXcgUGVlckNvbm5lY3Rpb24oKTtcblxuICAgIGNvbm5lY3Rpb25zLnBlZXIub24oJ2ljZS1jYW5kaWRhdGUnLCBmdW5jdGlvbihjYW5kaWRhdGUpIHtcbiAgICAgIC8vIEZpcmluZyB0aGlzIGNhbGxiYWNrIHdpdGggYSBudWxsIGNhbmRpZGF0ZSBpbmRpY2F0ZXMgdGhhdCB0cmlja2xlIElDRVxuICAgICAgLy8gZ2F0aGVyaW5nIGhhcyBmaW5pc2hlZCwgYW5kIGFsbCB0aGUgY2FuZGlkYXRlcyBhcmUgbm93IHByZXNlbnQgaW5cbiAgICAgIC8vIFwibG9jYWxEZXNjcmlwdGlvblwiLiBXYWl0aW5nIHVudGlsIG5vdyB0byBjcmVhdGUgdGhlIGFuc3dlciBzYXZlcyB1c1xuICAgICAgLy8gZnJvbSBoYXZpbmcgdG8gc2VuZCBvZmZlciArIGFuc3dlciArIGljZUNhbmRpZGF0ZXMgc2VwYXJhdGVseS5cbiAgICAgIGlmIChjYW5kaWRhdGUgPT09IG51bGwpIHtcbiAgICAgICAgdmFyIG9mZmVyID0gY29ubmVjdGlvbnMucGVlci5nZXRMb2NhbERlc2NyaXB0aW9uKCk7XG5cbiAgICAgICAgc2VuZCh7XG4gICAgICAgICAgdHlwZTogJ3BlZXInLFxuICAgICAgICAgIG1ldGhvZDogJ29mZmVyJyxcbiAgICAgICAgICB2YWx1ZToge1xuICAgICAgICAgICAgdHlwZTogb2ZmZXIudHlwZSxcbiAgICAgICAgICAgIHNkcDogb2ZmZXIuc2RwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBmYWNpbmdNb2RlOiBwZWVyLmZhY2luZ01vZGUudmFsdWVcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjb25uZWN0aW9ucy5wZWVyLm9uKCdhZGQtc3RyZWFtJywgZnVuY3Rpb24oc3RyZWFtKSB7XG4gICAgICBjYW1lcmEuY2FtZXJhVmlkZW8ubW96U3JjT2JqZWN0ID0gc3RyZWFtO1xuICAgICAgY2FtZXJhLmNhbWVyYVZpZGVvLnBsYXkoKTtcbiAgICB9KTtcblxuICAgIGdldFVzZXJNZWRpYSh7IHZpZGVvOiB0cnVlLCBmYWtlOiB0cnVlIH0sIGZ1bmN0aW9uKHN0cmVhbSkge1xuICAgICAgY29ubmVjdGlvbnMucGVlci5hZGRTdHJlYW0oc3RyZWFtKTtcblxuICAgICAgY29ubmVjdGlvbnMucGVlci5jcmVhdGVPZmZlcih7XG4gICAgICAgIG9mZmVyVG9SZWNlaXZlQXVkaW86IHRydWUsXG4gICAgICAgIG9mZmVyVG9SZWNlaXZlVmlkZW86IHRydWVcbiAgICAgIH0pO1xuICAgIH0sIGZ1bmN0aW9uKGUpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgfSk7XG5cbiAgICBwZWVyLmNvbm5lY3RCdG4uZGlzYWJsZWQgPSB0cnVlO1xuICAgIHBlZXIuZGlzY29ubmVjdEJ0bi5kaXNhYmxlZCA9IGZhbHNlO1xuICAgIHBlZXIuZmFjaW5nTW9kZS5kaXNhYmxlZCA9IHRydWU7XG4gIH0pO1xuXG4gIHBlZXIuZGlzY29ubmVjdEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgIGNsb3NlUGVlckNvbm5lY3Rpb24oKTtcbiAgfSk7XG5cbiAgc3RvcmFnZS5yZXRyaWV2ZUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgIHN0b3JhZ2UuZmlsZUxpc3QudGV4dENvbnRlbnQgPSAnJztcblxuICAgIHNlbmQoe1xuICAgICAgdHlwZTogJ3N0b3JhZ2UnLFxuICAgICAgbWV0aG9kOiAnbGlzdCcsXG4gICAgICBwYWdlU2l6ZTogNVxuICAgIH0pO1xuICB9KTtcblxuICBzdG9yYWdlLmZpbGVMaXN0LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgIGlmIChlLnRhcmdldC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09PSAnYnV0dG9uJykge1xuICAgICAgc2VuZCh7XG4gICAgICAgIHR5cGU6ICdzdG9yYWdlJyxcbiAgICAgICAgbWV0aG9kOiAnZGVsZXRlJyxcbiAgICAgICAgdmFsdWU6IGUudGFyZ2V0LmRhdGFzZXQuaWRcbiAgICAgIH0pO1xuXG4gICAgICBlLnRhcmdldC5jbG9zZXN0KCdsaScpLnJlbW92ZSgpO1xuICAgIH1cbiAgfSk7XG59KTtcbiIsIi8qZ2xvYmFsIE1hcCwgU2V0ICovXG5cbmZ1bmN0aW9uIGVuc3VyZVZhbGlkRXZlbnROYW1lKGV2ZW50TmFtZSkge1xuICBpZiAoIWV2ZW50TmFtZSB8fCB0eXBlb2YgZXZlbnROYW1lICE9PSAnc3RyaW5nJykge1xuICAgIHRocm93IG5ldyBFcnJvcignRXZlbnQgbmFtZSBzaG91bGQgYmUgYSB2YWxpZCBub24tZW1wdHkgc3RyaW5nIScpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGVuc3VyZVZhbGlkSGFuZGxlcihoYW5kbGVyKSB7XG4gIGlmICh0eXBlb2YgaGFuZGxlciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHRocm93IG5ldyBFcnJvcignSGFuZGxlciBzaG91bGQgYmUgYSBmdW5jdGlvbiEnKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBlbnN1cmVBbGxvd2VkRXZlbnROYW1lKGFsbG93ZWRFdmVudHMsIGV2ZW50TmFtZSkge1xuICBpZiAoYWxsb3dlZEV2ZW50cyAmJiBhbGxvd2VkRXZlbnRzLmluZGV4T2YoZXZlbnROYW1lKSA8IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0V2ZW50IFwiJyArIGV2ZW50TmFtZSArICdcIiBpcyBub3QgYWxsb3dlZCEnKTtcbiAgfVxufVxuXG4vLyBJbXBsZW1lbnRzIHB1Ymxpc2gvc3Vic2NyaWJlIGJlaGF2aW91ciB0aGF0IGNhbiBiZSBhcHBsaWVkIHRvIGFueSBvYmplY3QsXG4vLyBzbyB0aGF0IG9iamVjdCBjYW4gYmUgbGlzdGVuZWQgZm9yIGN1c3RvbSBldmVudHMuIFwidGhpc1wiIGNvbnRleHQgaXMgdGhlXG4vLyBvYmplY3Qgd2l0aCBNYXAgXCJsaXN0ZW5lcnNcIiBwcm9wZXJ0eSB1c2VkIHRvIHN0b3JlIGhhbmRsZXJzLlxudmFyIGV2ZW50RGlzcGF0Y2hlciA9IHtcbiAgLyoqXG4gICAqIFJlZ2lzdGVycyBsaXN0ZW5lciBmdW5jdGlvbiB0byBiZSBleGVjdXRlZCBvbmNlIGV2ZW50IG9jY3Vycy5cbiAgICogQHBhcmFtIHtzdHJpbmd9IGV2ZW50TmFtZSBOYW1lIG9mIHRoZSBldmVudCB0byBsaXN0ZW4gZm9yLlxuICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBoYW5kbGVyIEhhbmRsZXIgdG8gYmUgZXhlY3V0ZWQgb25jZSBldmVudCBvY2N1cnMuXG4gICAqL1xuICBvbjogZnVuY3Rpb24oZXZlbnROYW1lLCBoYW5kbGVyKSB7XG4gICAgZW5zdXJlVmFsaWRFdmVudE5hbWUoZXZlbnROYW1lKTtcbiAgICBlbnN1cmVBbGxvd2VkRXZlbnROYW1lKHRoaXMuYWxsb3dlZEV2ZW50cywgZXZlbnROYW1lKTtcbiAgICBlbnN1cmVWYWxpZEhhbmRsZXIoaGFuZGxlcik7XG5cbiAgICB2YXIgaGFuZGxlcnMgPSB0aGlzLmxpc3RlbmVycy5nZXQoZXZlbnROYW1lKTtcblxuICAgIGlmICghaGFuZGxlcnMpIHtcbiAgICAgIGhhbmRsZXJzID0gbmV3IFNldCgpO1xuICAgICAgdGhpcy5saXN0ZW5lcnMuc2V0KGV2ZW50TmFtZSwgaGFuZGxlcnMpO1xuICAgIH1cblxuICAgIC8vIFNldC5hZGQgaWdub3JlcyBoYW5kbGVyIGlmIGl0IGhhcyBiZWVuIGFscmVhZHkgcmVnaXN0ZXJlZFxuICAgIGhhbmRsZXJzLmFkZChoYW5kbGVyKTtcbiAgfSxcblxuICAvKipcbiAgICogUmVtb3ZlcyByZWdpc3RlcmVkIGxpc3RlbmVyIGZvciB0aGUgc3BlY2lmaWVkIGV2ZW50LlxuICAgKiBAcGFyYW0ge3N0cmluZ30gZXZlbnROYW1lIE5hbWUgb2YgdGhlIGV2ZW50IHRvIHJlbW92ZSBsaXN0ZW5lciBmb3IuXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGhhbmRsZXIgSGFuZGxlciB0byByZW1vdmUsIHNvIGl0IHdvbid0IGJlIGV4ZWN1dGVkXG4gICAqIG5leHQgdGltZSBldmVudCBvY2N1cnMuXG4gICAqL1xuICBvZmY6IGZ1bmN0aW9uKGV2ZW50TmFtZSwgaGFuZGxlcikge1xuICAgIGVuc3VyZVZhbGlkRXZlbnROYW1lKGV2ZW50TmFtZSk7XG4gICAgZW5zdXJlQWxsb3dlZEV2ZW50TmFtZSh0aGlzLmFsbG93ZWRFdmVudHMsIGV2ZW50TmFtZSk7XG4gICAgZW5zdXJlVmFsaWRIYW5kbGVyKGhhbmRsZXIpO1xuXG4gICAgdmFyIGhhbmRsZXJzID0gdGhpcy5saXN0ZW5lcnMuZ2V0KGV2ZW50TmFtZSk7XG5cbiAgICBpZiAoIWhhbmRsZXJzKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaGFuZGxlcnMuZGVsZXRlKGhhbmRsZXIpO1xuXG4gICAgaWYgKCFoYW5kbGVycy5zaXplKSB7XG4gICAgICB0aGlzLmxpc3RlbmVycy5kZWxldGUoZXZlbnROYW1lKTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgYWxsIHJlZ2lzdGVyZWQgbGlzdGVuZXJzIGZvciB0aGUgc3BlY2lmaWVkIGV2ZW50LlxuICAgKiBAcGFyYW0ge3N0cmluZ30gZXZlbnROYW1lIE5hbWUgb2YgdGhlIGV2ZW50IHRvIHJlbW92ZSBhbGwgbGlzdGVuZXJzIGZvci5cbiAgICovXG4gIG9mZkFsbDogZnVuY3Rpb24oZXZlbnROYW1lKSB7XG4gICAgaWYgKHR5cGVvZiBldmVudE5hbWUgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB0aGlzLmxpc3RlbmVycy5jbGVhcigpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGVuc3VyZVZhbGlkRXZlbnROYW1lKGV2ZW50TmFtZSk7XG4gICAgZW5zdXJlQWxsb3dlZEV2ZW50TmFtZSh0aGlzLmFsbG93ZWRFdmVudHMsIGV2ZW50TmFtZSk7XG5cbiAgICB2YXIgaGFuZGxlcnMgPSB0aGlzLmxpc3RlbmVycy5nZXQoZXZlbnROYW1lKTtcblxuICAgIGlmICghaGFuZGxlcnMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBoYW5kbGVycy5jbGVhcigpO1xuXG4gICAgdGhpcy5saXN0ZW5lcnMuZGVsZXRlKGV2ZW50TmFtZSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEVtaXRzIHNwZWNpZmllZCBldmVudCBzbyB0aGF0IGFsbCByZWdpc3RlcmVkIGhhbmRsZXJzIHdpbGwgYmUgY2FsbGVkXG4gICAqIHdpdGggdGhlIHNwZWNpZmllZCBwYXJhbWV0ZXJzLlxuICAgKiBAcGFyYW0ge3N0cmluZ30gZXZlbnROYW1lIE5hbWUgb2YgdGhlIGV2ZW50IHRvIGNhbGwgaGFuZGxlcnMgZm9yLlxuICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1ldGVycyBPcHRpb25hbCBwYXJhbWV0ZXJzIHRoYXQgd2lsbCBiZSBwYXNzZWQgdG9cbiAgICogZXZlcnkgcmVnaXN0ZXJlZCBoYW5kbGVyLlxuICAgKi9cbiAgZW1pdDogZnVuY3Rpb24oZXZlbnROYW1lLCBwYXJhbWV0ZXJzKSB7XG4gICAgZW5zdXJlVmFsaWRFdmVudE5hbWUoZXZlbnROYW1lKTtcbiAgICBlbnN1cmVBbGxvd2VkRXZlbnROYW1lKHRoaXMuYWxsb3dlZEV2ZW50cywgZXZlbnROYW1lKTtcblxuICAgIHZhciBoYW5kbGVycyA9IHRoaXMubGlzdGVuZXJzLmdldChldmVudE5hbWUpO1xuXG4gICAgaWYgKCFoYW5kbGVycykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGhhbmRsZXJzLmZvckVhY2goZnVuY3Rpb24oaGFuZGxlcikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgaGFuZGxlcihwYXJhbWV0ZXJzKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufTtcblxuZXhwb3J0IGRlZmF1bHQge1xuICAvKipcbiAgICogTWl4ZXMgZGlzcGF0Y2hlciBtZXRob2RzIGludG8gdGFyZ2V0IG9iamVjdC5cbiAgICogQHBhcmFtIHtPYmplY3R9IHRhcmdldCBPYmplY3QgdG8gbWl4IGRpc3BhdGNoZXIgbWV0aG9kcyBpbnRvLlxuICAgKiBAcGFyYW0ge0FycmF5LjxzdHJpbmc+fSBhbGxvd2VkRXZlbnRzIE9wdGlvbmFsIGxpc3Qgb2YgdGhlIGFsbG93ZWQgZXZlbnRcbiAgICogbmFtZXMgdGhhdCBjYW4gYmUgZW1pdHRlZCBhbmQgbGlzdGVuZWQgZm9yLlxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUYXJnZXQgb2JqZWN0IHdpdGggYWRkZWQgZGlzcGF0Y2hlciBtZXRob2RzLlxuICAgKi9cbiAgbWl4aW46IGZ1bmN0aW9uKHRhcmdldCwgYWxsb3dlZEV2ZW50cykge1xuICAgIGlmICghdGFyZ2V0IHx8IHR5cGVvZiB0YXJnZXQgIT09ICdvYmplY3QnKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ09iamVjdCB0byBtaXggaW50byBzaG91bGQgYmUgdmFsaWQgb2JqZWN0IScpO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgYWxsb3dlZEV2ZW50cyAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgICAgIUFycmF5LmlzQXJyYXkoYWxsb3dlZEV2ZW50cykpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQWxsb3dlZCBldmVudHMgc2hvdWxkIGJlIGEgdmFsaWQgYXJyYXkgb2Ygc3RyaW5ncyEnKTtcbiAgICB9XG5cbiAgICBPYmplY3Qua2V5cyhldmVudERpc3BhdGNoZXIpLmZvckVhY2goZnVuY3Rpb24obWV0aG9kKSB7XG4gICAgICBpZiAodHlwZW9mIHRhcmdldFttZXRob2RdICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgJ09iamVjdCB0byBtaXggaW50byBhbHJlYWR5IGhhcyBcIicgKyBtZXRob2QgKyAnXCIgcHJvcGVydHkgZGVmaW5lZCEnXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICB0YXJnZXRbbWV0aG9kXSA9IGV2ZW50RGlzcGF0Y2hlclttZXRob2RdLmJpbmQodGhpcyk7XG4gICAgfSwgeyBsaXN0ZW5lcnM6IG5ldyBNYXAoKSwgYWxsb3dlZEV2ZW50czogYWxsb3dlZEV2ZW50cyB9KTtcblxuICAgIHJldHVybiB0YXJnZXQ7XG4gIH1cbn07XG4iLCJ2YXIgV2ViU29ja2V0VXRpbHMgPSB7XG4gIC8qKlxuICAgKiBNYXNrIGV2ZXJ5IGRhdGEgZWxlbWVudCB3aXRoIHRoZSBtYXNrIChXZWJTb2NrZXQgc3BlY2lmaWMgYWxnb3JpdGhtKS5cbiAgICogQHBhcmFtIHtBcnJheX0gbWFzayBNYXNrIGFycmF5LlxuICAgKiBAcGFyYW0ge0FycmF5fSBhcnJheSBEYXRhIGFycmF5IHRvIG1hc2suXG4gICAqIEByZXR1cm5zIHtBcnJheX0gTWFza2VkIGRhdGEgYXJyYXkuXG4gICAqL1xuICBtYXNrKG1hc2ssIGFycmF5KSB7XG4gICAgaWYgKG1hc2spIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgYXJyYXlbaV0gPSBhcnJheVtpXSBeIG1hc2tbaSAlIDRdO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gYXJyYXk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlcyA0LWl0ZW0gYXJyYXksIGV2ZXJ5IGl0ZW0gb2Ygd2hpY2ggaXMgZWxlbWVudCBvZiBieXRlIG1hc2suXG4gICAqIEByZXR1cm5zIHtVaW50OEFycmF5fVxuICAgKi9cbiAgZ2VuZXJhdGVSYW5kb21NYXNrKCkge1xuICAgIHZhciByYW5kb20gPSBuZXcgVWludDhBcnJheSg0KTtcblxuICAgIHdpbmRvdy5jcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKHJhbmRvbSk7XG5cbiAgICByZXR1cm4gcmFuZG9tO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDb252ZXJ0cyBzdHJpbmcgdG8gVWludDhBcnJheS5cbiAgICogQHBhcmFtIHtzdHJpbmd9IHN0cmluZ1ZhbHVlIFN0cmluZyB2YWx1ZSB0byBjb252ZXJ0LlxuICAgKiBAcmV0dXJucyB7VWludDhBcnJheX1cbiAgICovXG4gIHN0cmluZ1RvQXJyYXkoc3RyaW5nVmFsdWUpIHtcbiAgICBpZiAodHlwZW9mIHN0cmluZ1ZhbHVlICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdzdHJpbmdWYWx1ZSBzaG91bGQgYmUgdmFsaWQgc3RyaW5nIScpO1xuICAgIH1cblxuICAgIHZhciBhcnJheSA9IG5ldyBVaW50OEFycmF5KHN0cmluZ1ZhbHVlLmxlbmd0aCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHJpbmdWYWx1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgYXJyYXlbaV0gPSBzdHJpbmdWYWx1ZS5jaGFyQ29kZUF0KGkpO1xuICAgIH1cblxuICAgIHJldHVybiBhcnJheTtcbiAgfSxcblxuICAvKipcbiAgICogQ29udmVydHMgYXJyYXkgdG8gc3RyaW5nLiBFdmVyeSBhcnJheSBlbGVtZW50IGlzIGNvbnNpZGVyZWQgYXMgY2hhciBjb2RlLlxuICAgKiBAcGFyYW0ge1VpbnQ4QXJyYXl9IGFycmF5IEFycmF5IHdpdGggdGhlIGNoYXIgY29kZXMuXG4gICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAqL1xuICBhcnJheVRvU3RyaW5nKGFycmF5KSB7XG4gICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkobnVsbCwgYXJyYXkpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZWFkcyB1bnNpZ25lZCAxNiBiaXQgdmFsdWUgZnJvbSB0d28gY29uc2VxdWVudCA4LWJpdCBhcnJheSBlbGVtZW50cy5cbiAgICogQHBhcmFtIHtVaW50OEFycmF5fSBhcnJheSBBcnJheSB0byByZWFkIGZyb20uXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBvZmZzZXQgSW5kZXggdG8gc3RhcnQgcmVhZCB2YWx1ZS5cbiAgICogQHJldHVybnMge051bWJlcn1cbiAgICovXG4gIHJlYWRVSW50MTYoYXJyYXksIG9mZnNldCkge1xuICAgIG9mZnNldCA9IG9mZnNldCB8fCAwO1xuICAgIHJldHVybiAoYXJyYXlbb2Zmc2V0XSA8PCA4KSArIGFycmF5W29mZnNldCArIDFdO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZWFkcyB1bnNpZ25lZCAzMiBiaXQgdmFsdWUgZnJvbSBmb3VyIGNvbnNlcXVlbnQgOC1iaXQgYXJyYXkgZWxlbWVudHMuXG4gICAqIEBwYXJhbSB7VWludDhBcnJheX0gYXJyYXkgQXJyYXkgdG8gcmVhZCBmcm9tLlxuICAgKiBAcGFyYW0ge051bWJlcn0gb2Zmc2V0IEluZGV4IHRvIHN0YXJ0IHJlYWQgdmFsdWUuXG4gICAqIEByZXR1cm5zIHtOdW1iZXJ9XG4gICAqL1xuICByZWFkVUludDMyKGFycmF5LCBvZmZzZXQpIHtcbiAgICBvZmZzZXQgPSBvZmZzZXQgfHwgMDtcbiAgICByZXR1cm4gKGFycmF5W29mZnNldF0gPDwgMjQpICtcbiAgICAgIChhcnJheVtvZmZzZXQgKyAxXSA8PCAxNikgK1xuICAgICAgKGFycmF5IFtvZmZzZXQgKyAyXSA8PCA4KSArXG4gICAgICBhcnJheVtvZmZzZXQgKyAzXTtcbiAgfSxcblxuICAvKipcbiAgICogV3JpdGVzIHVuc2lnbmVkIDE2IGJpdCB2YWx1ZSB0byB0d28gY29uc2VxdWVudCA4LWJpdCBhcnJheSBlbGVtZW50cy5cbiAgICogQHBhcmFtIHtVaW50OEFycmF5fSBhcnJheSBBcnJheSB0byB3cml0ZSB0by5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IHZhbHVlIDE2IGJpdCB1bnNpZ25lZCB2YWx1ZSB0byB3cml0ZSBpbnRvIGFycmF5LlxuICAgKiBAcGFyYW0ge051bWJlcn0gb2Zmc2V0IEluZGV4IHRvIHN0YXJ0IHdyaXRlIHZhbHVlLlxuICAgKiBAcmV0dXJucyB7TnVtYmVyfVxuICAgKi9cbiAgd3JpdGVVSW50MTYoYXJyYXksIHZhbHVlLCBvZmZzZXQpIHtcbiAgICBhcnJheVtvZmZzZXRdID0gKHZhbHVlICYgMHhmZjAwKSA+PiA4O1xuICAgIGFycmF5W29mZnNldCArIDFdID0gdmFsdWUgJiAweGZmO1xuICB9LFxuXG4gIC8qKlxuICAgKiBXcml0ZXMgdW5zaWduZWQgMTYgYml0IHZhbHVlIHRvIHR3byBjb25zZXF1ZW50IDgtYml0IGFycmF5IGVsZW1lbnRzLlxuICAgKiBAcGFyYW0ge1VpbnQ4QXJyYXl9IGFycmF5IEFycmF5IHRvIHdyaXRlIHRvLlxuICAgKiBAcGFyYW0ge051bWJlcn0gdmFsdWUgMTYgYml0IHVuc2lnbmVkIHZhbHVlIHRvIHdyaXRlIGludG8gYXJyYXkuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBvZmZzZXQgSW5kZXggdG8gc3RhcnQgd3JpdGUgdmFsdWUuXG4gICAqIEByZXR1cm5zIHtOdW1iZXJ9XG4gICAqL1xuICB3cml0ZVVJbnQzMihhcnJheSwgdmFsdWUsIG9mZnNldCkge1xuICAgIGFycmF5W29mZnNldF0gPSAodmFsdWUgJiAweGZmMDAwMDAwKSA+PiAyNDtcbiAgICBhcnJheVtvZmZzZXQgKyAxXSA9ICh2YWx1ZSAmIDB4ZmYwMDAwKSA+PiAxNjtcbiAgICBhcnJheVtvZmZzZXQgKyAyXSA9ICh2YWx1ZSAmIDB4ZmYwMCkgPj4gODtcbiAgICBhcnJheVtvZmZzZXQgKyAzXSA9IHZhbHVlICYgMHhmZjtcbiAgfVxufTtcblxuZXhwb3J0IGRlZmF1bHQgV2ViU29ja2V0VXRpbHM7XG4iLCIvKiBnbG9iYWwgUHJvbWlzZSxcbiAgICAgICAgICBtb3pSVENQZWVyQ29ubmVjdGlvbixcbiAgICAgICAgICBtb3pSVENTZXNzaW9uRGVzY3JpcHRpb24sXG4gICAgICAgICAgd2Via2l0UlRDUGVlckNvbm5lY3Rpb24sXG4gICAgICAgICAgd2Via2l0UlRDU2Vzc2lvbkRlc2NyaXB0aW9uXG4qL1xuXG5pbXBvcnQgRXZlbnREaXNwYXRjaGVyIGZyb20gJ2V2ZW50LWRpc3BhdGNoZXItanMnO1xuXG52YXIgUlRDUGVlckNvbm5lY3Rpb24gPSB3aW5kb3cubW96UlRDUGVlckNvbm5lY3Rpb24gfHxcbiAgd2luZG93LndlYmtpdFJUQ1BlZXJDb25uZWN0aW9uO1xuXG52YXIgUlRDU2Vzc2lvbkRlc2NyaXB0aW9uID0gd2luZG93Lm1velJUQ1Nlc3Npb25EZXNjcmlwdGlvbiB8fFxuICB3aW5kb3cud2Via2l0UlRDU2Vzc2lvbkRlc2NyaXB0aW9uO1xuXG52YXIgcHJpdmF0ZXMgPSB7XG4gIGNvbm5lY3Rpb246IFN5bWJvbCgnY29ubmVjdGlvbicpLFxuXG4gIGdldENvbm5lY3Rpb246IFN5bWJvbCgnZ2V0Q29ubmVjdGlvbicpXG59O1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQZWVyQ29ubmVjdGlvbiB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIEV2ZW50RGlzcGF0Y2hlci5taXhpbihcbiAgICAgIHRoaXMsIFsnYWRkLXN0cmVhbScsICdpY2UtY2FuZGlkYXRlJywgJ3NpZ25hbGluZy1zdGF0ZS1jaGFuZ2UnXVxuICAgICk7XG5cbiAgICB2YXIgY29ubmVjdGlvbiA9IG5ldyBSVENQZWVyQ29ubmVjdGlvbih7XG4gICAgICBpY2VTZXJ2ZXJzOiBbe1xuICAgICAgICB1cmw6ICdzdHVuOnN0dW4ubC5nb29nbGUuY29tOjE5MzAyJyxcbiAgICAgICAgdXJsczogJ3N0dW46c3R1bi5sLmdvb2dsZS5jb206MTkzMDInXG4gICAgICB9XVxuICAgIH0pO1xuXG4gICAgY29ubmVjdGlvbi5hZGRFdmVudExpc3RlbmVyKCdpY2VjYW5kaWRhdGUnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgdGhpcy5lbWl0KCdpY2UtY2FuZGlkYXRlJywgZS5jYW5kaWRhdGUpO1xuICAgIH0uYmluZCh0aGlzKSk7XG5cbiAgICBjb25uZWN0aW9uLmFkZEV2ZW50TGlzdGVuZXIoJ2FkZHN0cmVhbScsIGZ1bmN0aW9uIChlKSB7XG4gICAgICB0aGlzLmVtaXQoJ2FkZC1zdHJlYW0nLCBlLnN0cmVhbSk7XG4gICAgfS5iaW5kKHRoaXMpKTtcblxuICAgIGNvbm5lY3Rpb24uYWRkRXZlbnRMaXN0ZW5lcignc2lnbmFsaW5nc3RhdGVjaGFuZ2UnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgdGhpcy5lbWl0KCdzaWduYWxpbmctc3RhdGUtY2hhbmdlJywgZSk7XG4gICAgfS5iaW5kKHRoaXMpKTtcblxuICAgIHRoaXNbcHJpdmF0ZXMuY29ubmVjdGlvbl0gPSBjb25uZWN0aW9uO1xuICB9XG5cbiAgZ2V0TG9jYWxEZXNjcmlwdGlvbigpIHtcbiAgICByZXR1cm4gdGhpc1twcml2YXRlcy5nZXRDb25uZWN0aW9uXSgpLmxvY2FsRGVzY3JpcHRpb247XG4gIH1cblxuICBhZGRTdHJlYW0oc3RyZWFtKSB7XG4gICAgcmV0dXJuIHRoaXNbcHJpdmF0ZXMuZ2V0Q29ubmVjdGlvbl0oKS5hZGRTdHJlYW0oc3RyZWFtKTtcbiAgfVxuXG4gIGNyZWF0ZU9mZmVyKG9wdGlvbnMpIHtcbiAgICB2YXIgY29ubmVjdGlvbiA9IHRoaXNbcHJpdmF0ZXMuZ2V0Q29ubmVjdGlvbl0oKTtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICBjb25uZWN0aW9uLmNyZWF0ZURhdGFDaGFubmVsKCdkYXRhLWNoYW5uZWwnLCB7IHJlbGlhYmxlOiB0cnVlIH0pO1xuXG4gICAgICBjb25uZWN0aW9uLmNyZWF0ZU9mZmVyKGZ1bmN0aW9uKGxvY2FsRGVzY3JpcHRpb24pIHtcbiAgICAgICAgY29ubmVjdGlvbi5zZXRMb2NhbERlc2NyaXB0aW9uKGxvY2FsRGVzY3JpcHRpb24sIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJlc29sdmUobG9jYWxEZXNjcmlwdGlvbik7XG4gICAgICAgIH0sIHJlamVjdCk7XG4gICAgICB9LCByZWplY3QsIG9wdGlvbnMpO1xuICAgIH0pO1xuICB9XG5cbiAgYWNjZXB0T2ZmZXIob2ZmZXIpIHtcbiAgICB2YXIgY29ubmVjdGlvbiA9IHRoaXNbcHJpdmF0ZXMuZ2V0Q29ubmVjdGlvbl0oKTtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICB2YXIgcmVtb3RlRGVzY3JpcHRpb24gPSBuZXcgUlRDU2Vzc2lvbkRlc2NyaXB0aW9uKG9mZmVyKTtcblxuICAgICAgY29ubmVjdGlvbi5zZXRSZW1vdGVEZXNjcmlwdGlvbihyZW1vdGVEZXNjcmlwdGlvbiwgZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbm5lY3Rpb24uY3JlYXRlQW5zd2VyKGZ1bmN0aW9uKGxvY2FsRGVzY3JpcHRpb24pIHtcbiAgICAgICAgICBjb25uZWN0aW9uLnNldExvY2FsRGVzY3JpcHRpb24obG9jYWxEZXNjcmlwdGlvbiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXNvbHZlKGxvY2FsRGVzY3JpcHRpb24pO1xuICAgICAgICAgIH0sIHJlamVjdCk7XG4gICAgICAgIH0sIHJlamVjdCk7XG4gICAgICB9LCByZWplY3QpO1xuICAgIH0pO1xuICB9XG5cbiAgYWNjZXB0QW5zd2VyKGFuc3dlcikge1xuICAgIHZhciBjb25uZWN0aW9uID0gdGhpc1twcml2YXRlcy5nZXRDb25uZWN0aW9uXSgpO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIGNvbm5lY3Rpb24uc2V0UmVtb3RlRGVzY3JpcHRpb24oXG4gICAgICAgIG5ldyBSVENTZXNzaW9uRGVzY3JpcHRpb24oYW5zd2VyKSwgZnVuY3Rpb24oKSB7IHJlc29sdmUoKTsgfSwgcmVqZWN0XG4gICAgICApO1xuICAgIH0pO1xuICB9XG5cbiAgY2xvc2UoKSB7XG4gICAgdmFyIGNvbm5lY3Rpb24gPSB0aGlzW3ByaXZhdGVzLmdldENvbm5lY3Rpb25dKCk7XG5cbiAgICBjb25uZWN0aW9uLmdldExvY2FsU3RyZWFtcygpLmZvckVhY2goZnVuY3Rpb24oc3RyZWFtKSB7XG4gICAgICBzdHJlYW0uc3RvcCgpO1xuICAgIH0pO1xuXG4gICAgY29ubmVjdGlvbi5jbG9zZSgpO1xuXG4gICAgdGhpc1twcml2YXRlcy5jb25uZWN0aW9uXSA9IG51bGw7XG4gIH1cblxuICBbcHJpdmF0ZXMuZ2V0Q29ubmVjdGlvbl0oKSB7XG4gICAgdmFyIGNvbm5lY3Rpb24gPSB0aGlzW3ByaXZhdGVzLmNvbm5lY3Rpb25dO1xuXG4gICAgaWYgKCFjb25uZWN0aW9uKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nvbm5lY3Rpb24gaXMgY2xvc2VkIScpO1xuICAgIH1cblxuICAgIHJldHVybiBjb25uZWN0aW9uO1xuICB9XG59XG4iLCJpbXBvcnQgVXRpbHMgZnJvbSAnd2Vic29ja2V0LXNlcnZlci11dGlscyc7XG5cbmZ1bmN0aW9uIGpvaW5CbG9icyhibG9icykge1xuICB2YXIgcmVzdWx0ID0ge1xuICAgIHRvdGFsU2l6ZTogMCxcbiAgICBtZXRhOiBbXSxcbiAgICBkYXRhOiBudWxsXG4gIH07XG5cbiAgdmFyIHByb21pc2VzID0gYmxvYnMubWFwKGZ1bmN0aW9uKGJsb2IpIHtcbiAgICB2YXIgcG9zaXRpb24gPSByZXN1bHQudG90YWxTaXplO1xuXG4gICAgcmVzdWx0LnRvdGFsU2l6ZSArPSBibG9iLnNpemU7XG5cbiAgICByZXN1bHQubWV0YS5wdXNoKHsgdHlwZTogYmxvYi50eXBlLCBzaXplOiBibG9iLnNpemUgfSk7XG5cbiAgICByZXR1cm4gYmxvYlRvQXJyYXlCdWZmZXIoYmxvYikudGhlbihmdW5jdGlvbihidWZmZXIpIHtcbiAgICAgIHJlc3VsdC5kYXRhLnNldChuZXcgVWludDhBcnJheShidWZmZXIpLCBwb3NpdGlvbik7XG4gICAgfSk7XG4gIH0pO1xuXG4gIHJlc3VsdC5kYXRhID0gbmV3IFVpbnQ4QXJyYXkocmVzdWx0LnRvdGFsU2l6ZSk7XG5cbiAgcmV0dXJuIFByb21pc2UuYWxsKHByb21pc2VzKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBibG9iVG9BcnJheUJ1ZmZlcihibG9iKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlKSB7XG4gICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG5cbiAgICByZWFkZXIuYWRkRXZlbnRMaXN0ZW5lcignbG9hZGVuZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgcmVzb2x2ZShyZWFkZXIucmVzdWx0KTtcbiAgICB9KTtcblxuICAgIHJlYWRlci5yZWFkQXNBcnJheUJ1ZmZlcihibG9iKTtcbiAgfSk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgc2VuZDogZnVuY3Rpb24obWVzc2FnZSwgYmxvYnMpIHtcbiAgICB2YXIgYmxvYnNKb2luUHJvbWlzZSA9ICFibG9icyB8fCAhYmxvYnMubGVuZ3RoID9cbiAgICAgIFByb21pc2UucmVzb2x2ZSgpIDogam9pbkJsb2JzKGJsb2JzKTtcblxuICAgIHJldHVybiBibG9ic0pvaW5Qcm9taXNlLnRoZW4oZnVuY3Rpb24oYmxvYnMpIHtcbiAgICAgIGlmIChibG9icykge1xuICAgICAgICBtZXNzYWdlLl9fYmxvYnMgPSBibG9icy5tZXRhO1xuICAgICAgfVxuXG4gICAgICB2YXIgc2VyaWFsaXplZEFwcGxpY2F0aW9uTWVzc2FnZSA9IFV0aWxzLnN0cmluZ1RvQXJyYXkoXG4gICAgICAgIEpTT04uc3RyaW5naWZ5KG1lc3NhZ2UpXG4gICAgICApO1xuXG4gICAgICB2YXIgYXBwbGljYXRpb25NZXNzYWdlTGVuZ3RoID0gc2VyaWFsaXplZEFwcGxpY2F0aW9uTWVzc2FnZS5sZW5ndGg7XG5cbiAgICAgIC8vIFR3byBieXRlcyB0byBoYXZlIHNpemUgb2YgYXBwbGljYXRpb24gbWVzc2FnZSBpbiBqb2luZWQgZGF0YSBhcnJheVxuICAgICAgdmFyIGRhdGFUb1NlbmQgPSBuZXcgVWludDhBcnJheShcbiAgICAgICAgMiArIGFwcGxpY2F0aW9uTWVzc2FnZUxlbmd0aCArIChibG9icyA/IGJsb2JzLmRhdGEubGVuZ3RoIDogMClcbiAgICAgICk7XG5cbiAgICAgIC8vIFdyaXRlIHNlcmlhbGl6ZWQgYXBwbGljYXRpb24gbWVzc2FnZSBsZW5ndGhcbiAgICAgIFV0aWxzLndyaXRlVUludDE2KGRhdGFUb1NlbmQsIGFwcGxpY2F0aW9uTWVzc2FnZUxlbmd0aCwgMCk7XG5cbiAgICAgIC8vIFdyaXRlIHNlcmlhbGl6ZWQgYXBwbGljYXRpb24gbWVzc2FnZSBpdHNlbGZcbiAgICAgIGRhdGFUb1NlbmQuc2V0KHNlcmlhbGl6ZWRBcHBsaWNhdGlvbk1lc3NhZ2UsIDIpO1xuXG4gICAgICBpZiAoYmxvYnMpIHtcbiAgICAgICAgZGF0YVRvU2VuZC5zZXQoYmxvYnMuZGF0YSwgMiArICBhcHBsaWNhdGlvbk1lc3NhZ2VMZW5ndGgpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZGF0YVRvU2VuZDtcbiAgICB9KTtcbiAgfSxcblxuICByZWNlaXZlOiBmdW5jdGlvbihtZXNzYWdlRGF0YSkge1xuICAgIHZhciBkYXRhID0gbmV3IFVpbnQ4QXJyYXkobWVzc2FnZURhdGEpO1xuICAgIHZhciBkYXRhT2Zmc2V0ID0gMjtcbiAgICB2YXIgYXBwbGljYXRpb25NZXNzYWdlTGVuZ3RoID0gKGRhdGFbMF0gPDwgOCkgKyBkYXRhWzFdO1xuXG4gICAgdmFyIGFwcGxpY2F0aW9uTWVzc2FnZSA9IEpTT04ucGFyc2UoXG4gICAgICBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KFxuICAgICAgICBudWxsLCBkYXRhLnN1YmFycmF5KGRhdGFPZmZzZXQsIGRhdGFPZmZzZXQgKyBhcHBsaWNhdGlvbk1lc3NhZ2VMZW5ndGgpXG4gICAgICApXG4gICAgKTtcblxuICAgIHZhciBibG9icywgcG9zaXRpb247XG4gICAgaWYgKGFwcGxpY2F0aW9uTWVzc2FnZS5fX2Jsb2JzICYmIGFwcGxpY2F0aW9uTWVzc2FnZS5fX2Jsb2JzLmxlbmd0aCkge1xuICAgICAgcG9zaXRpb24gPSBkYXRhT2Zmc2V0ICsgYXBwbGljYXRpb25NZXNzYWdlTGVuZ3RoO1xuICAgICAgYmxvYnMgPSBhcHBsaWNhdGlvbk1lc3NhZ2UuX19ibG9icy5tYXAoZnVuY3Rpb24obWV0YSkge1xuICAgICAgICBwb3NpdGlvbiArPSBtZXRhLnNpemU7XG4gICAgICAgIHJldHVybiBuZXcgQmxvYihcbiAgICAgICAgICBbZGF0YS5zdWJhcnJheShwb3NpdGlvbiAtIG1ldGEuc2l6ZSwgcG9zaXRpb24pXSxcbiAgICAgICAgICB7IHR5cGU6IG1ldGEudHlwZSB9XG4gICAgICAgICk7XG4gICAgICB9KTtcblxuICAgICAgZGVsZXRlIGFwcGxpY2F0aW9uTWVzc2FnZS5fX2Jsb2JzO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBtZXNzYWdlOiBhcHBsaWNhdGlvbk1lc3NhZ2UsXG4gICAgICBibG9iczogYmxvYnNcbiAgICB9O1xuICB9XG59O1xuIl19
