(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.FxRemoteManager = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

/* global WebSocket,
          URL
*/

var _Transport = require('./transport.es6.js');

var _Transport2 = _interopRequireDefault(_Transport);

var _PeerConnection = require('./peer-connection.es6.js');

var _PeerConnection2 = _interopRequireDefault(_PeerConnection);

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
    _Transport2['default'].send(applicationMessage, blobs).then(function (dataToSend) {
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
      var data = _Transport2['default'].receive(e.data);
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
    connections.peer = new _PeerConnection2['default']();

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
        offerToReceiveAudio: false,
        offerToReceiveVideo: true
      });
    }, function (e) {});

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
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
/*global Map, Set */

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
  mask: (function (_mask) {
    function mask(_x, _x2) {
      return _mask.apply(this, arguments);
    }

    mask.toString = function () {
      return _mask.toString();
    };

    return mask;
  })(function (mask, array) {
    if (mask) {
      for (var i = 0; i < array.length; i++) {
        array[i] = array[i] ^ mask[i % 4];
      }
    }
    return array;
  }),

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
'use strict';

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, '__esModule', {
  value: true
});
/* global Promise,
          mozRTCPeerConnection,
          mozRTCSessionDescription,
          webkitRTCPeerConnection,
          webkitRTCSessionDescription
*/

var _EventDispatcher = require('event-dispatcher-js');

var _EventDispatcher2 = _interopRequireDefault(_EventDispatcher);

var RTCPeerConnection = window.mozRTCPeerConnection || window.webkitRTCPeerConnection;

var RTCSessionDescription = window.mozRTCSessionDescription || window.webkitRTCSessionDescription;

var privates = {
  connection: Symbol('connection'),

  getConnection: Symbol('getConnection')
};

var PeerConnection = (function () {
  function PeerConnection() {
    _classCallCheck(this, PeerConnection);

    _EventDispatcher2['default'].mixin(this, ['add-stream', 'ice-candidate', 'signaling-state-change']);

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

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _Utils = require('websocket-server-utils');

var _Utils2 = _interopRequireDefault(_Utils);

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

      var serializedApplicationMessage = _Utils2['default'].stringToArray(JSON.stringify(message));

      var applicationMessageLength = serializedApplicationMessage.length;

      // Two bytes to have size of application message in joined data array
      var dataToSend = new Uint8Array(2 + applicationMessageLength + (blobs ? blobs.data.length : 0));

      // Write serialized application message length
      _Utils2['default'].writeUInt16(dataToSend, applicationMessageLength, 0);

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvcHJvamVjdHMvZ2l0aHViL2Z4b3MtcmVtb3RlLW1hbmFnZXIvc3JjL2pzL2FwcC5lczYuanMiLCIvcHJvamVjdHMvZ2l0aHViL2Z4b3MtcmVtb3RlLW1hbmFnZXIvY29tcG9uZW50cy9ldmVudC1kaXNwYXRjaGVyLWpzL2V2ZW50LWRpc3BhdGNoZXIuZXM2LmpzIiwiL3Byb2plY3RzL2dpdGh1Yi9meG9zLXJlbW90ZS1tYW5hZ2VyL2NvbXBvbmVudHMvZnhvcy13ZWJzb2NrZXQtc2VydmVyL3NyYy91dGlscy5lczYuanMiLCIvcHJvamVjdHMvZ2l0aHViL2Z4b3MtcmVtb3RlLW1hbmFnZXIvc3JjL2pzL3BlZXItY29ubmVjdGlvbi5lczYuanMiLCIvcHJvamVjdHMvZ2l0aHViL2Z4b3MtcmVtb3RlLW1hbmFnZXIvc3JjL2pzL3RyYW5zcG9ydC5lczYuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozt5QkNJc0Isb0JBQW9COzs7OzhCQUNmLDBCQUEwQjs7OztBQUVyRCxJQUFJLFlBQVksR0FBRyxDQUNqQixTQUFTLENBQUMsZUFBZSxJQUN6QixTQUFTLENBQUMsa0JBQWtCLElBQzVCLFNBQVMsQ0FBQyxZQUFZLENBQUEsQ0FDdEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDOztBQUVsQixNQUFNLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLFlBQVc7QUFDekMsTUFBSSxVQUFVLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQzs7QUFFdkQsTUFBSSxjQUFjLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUMzRCxNQUFJLGtCQUFrQixHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsQ0FBQzs7QUFFbkUsTUFBSSxNQUFNLEdBQUc7QUFDWCxtQkFB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QUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQyxFQUMvQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQ3BCLENBQUM7T0FDSCxDQUFDLENBQUM7O0FBRUgsYUFBTyxrQkFBa0IsQ0FBQyxPQUFPLENBQUM7S0FDbkM7O0FBRUQsV0FBTztBQUNMLGFBQU8sRUFBRSxrQkFBa0I7QUFDM0IsV0FBSyxFQUFFLEtBQUs7S0FDYixDQUFDO0dBQ0g7Q0FDRiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKiBnbG9iYWwgV2ViU29ja2V0LFxuICAgICAgICAgIFVSTFxuKi9cblxuaW1wb3J0IFRyYW5zcG9ydCBmcm9tICcuL3RyYW5zcG9ydC5lczYuanMnO1xuaW1wb3J0IFBlZXJDb25uZWN0aW9uIGZyb20gJy4vcGVlci1jb25uZWN0aW9uLmVzNi5qcyc7XG5cbnZhciBnZXRVc2VyTWVkaWEgPSAoXG4gIG5hdmlnYXRvci5tb3pHZXRVc2VyTWVkaWEgfHxcbiAgbmF2aWdhdG9yLndlYmtpdEdldFVzZXJNZWRpYSB8fFxuICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhXG4pLmJpbmQobmF2aWdhdG9yKTtcblxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCBmdW5jdGlvbigpIHtcbiAgdmFyIGNvbm5lY3RCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnd3MtY29ubmVjdCcpO1xuXG4gIHZhciB3c0FkZHJlc3NJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd3cy1hZGRyZXNzJyk7XG4gIHZhciByZW1vdGVMb2dnaW5nSW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVtb3RlLWxvZ2dpbmcnKTtcblxuICB2YXIgc2NyZWVuID0ge1xuICAgIGJyaWdodG5lc3NJbnB1dDogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Bvd2VyLWJyaWdodG5lc3MnKSxcbiAgICBlbmFibGVkSW5wdXQ6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwb3dlci1zY3JlZW4tZW5hYmxlZCcpXG4gIH07XG5cbiAgdmFyIHBlZXIgPSB7XG4gICAgY29ubmVjdEJ0bjogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3J0Yy1jb25uZWN0JyksXG4gICAgZGlzY29ubmVjdEJ0bjogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3J0Yy1kaXNjb25uZWN0JyksXG4gICAgZmFjaW5nTW9kZTogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3J0Yy1mYWNpbmctbW9kZScpXG4gIH07XG5cbiAgdmFyIGNhbWVyYSA9IHtcbiAgICBmbGFzaE1vZGVTZWxlY3Q6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmbGFzaC1tb2RlJyksXG4gICAgdGFrZVBpY3R1cmVCdG46IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0YWtlLXBpY3R1cmUnKSxcbiAgICBjYW1lcmFQaWN0dXJlSW1nOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FtZXJhLXBpY3R1cmUnKSxcbiAgICBjYW1lcmFWaWRlbzogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbWVyYS12aWRlbycpLFxuICAgIHN0YXJ0VHJhY2tpbmc6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0YWtlLXBpY3R1cmUtZXZlcnknKSxcbiAgICB0cmFja2luZ0ludGVydmFsOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaW50ZXJ2YWwtdmFsdWUnKSxcbiAgICB0cmFja2luZ0ludGVydmFsVHlwZTogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ludGVydmFsLXR5cGUnKSxcbiAgICBzdG9wVHJhY2tpbmc6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzdG9wLXRha2luZy1waWN0dXJlJylcbiAgfTtcblxuICB2YXIgYmF0dGVyeSA9IHtcbiAgICBsZXZlbExhYmVsOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmF0dGVyeS1sZXZlbCcpLFxuICAgIHJlZnJlc2hCdG46IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZWZyZXNoLWJhdHRlcnktc3RhdHVzJylcbiAgfTtcblxuICB2YXIgc3RvcmFnZSA9IHtcbiAgICByZXRyaWV2ZUJ0bjogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3JldHJpZXZlLWZpbGUtbGlzdCcpLFxuICAgIGZpbGVMaXN0OiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZmlsZS1saXN0JylcbiAgfTtcblxuICB2YXIgY29ubmVjdGlvblN0YXR1c0xhYmVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3dzLWNvbm5lY3Rpb24tc3RhdHVzJyk7XG5cbiAgdmFyIGNvbm5lY3Rpb25zID0gd2luZG93LmNvbm5lY3Rpb25zID0ge1xuICAgIHdlYnNvY2tldDogbnVsbCxcbiAgICBwZWVyOiBudWxsXG4gIH07XG5cbiAgZnVuY3Rpb24gY2xvc2VQZWVyQ29ubmVjdGlvbigpIHtcbiAgICBwZWVyLmNvbm5lY3RCdG4uZGlzYWJsZWQgPSBmYWxzZTtcbiAgICBwZWVyLmRpc2Nvbm5lY3RCdG4uZGlzYWJsZWQgPSB0cnVlO1xuICAgIHBlZXIuZmFjaW5nTW9kZS5kaXNhYmxlZCA9IGZhbHNlO1xuXG4gICAgaWYgKGNvbm5lY3Rpb25zLnBlZXIpIHtcbiAgICAgIGNvbm5lY3Rpb25zLnBlZXIuY2xvc2UoKTtcbiAgICAgIGNvbm5lY3Rpb25zLnBlZXIgPSBudWxsO1xuXG4gICAgICBjYW1lcmEuY2FtZXJhVmlkZW8ucGF1c2UoKTtcbiAgICAgIGNhbWVyYS5jYW1lcmFWaWRlby5tb3pTcmNPYmplY3QgPSBudWxsO1xuXG4gICAgICBzZW5kKHtcbiAgICAgICAgdHlwZTogJ3BlZXInLFxuICAgICAgICBtZXRob2Q6ICdjbG9zZSdcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHNlbmQoYXBwbGljYXRpb25NZXNzYWdlLCBibG9icykge1xuICAgIFRyYW5zcG9ydC5zZW5kKGFwcGxpY2F0aW9uTWVzc2FnZSwgYmxvYnMpLnRoZW4oZnVuY3Rpb24oZGF0YVRvU2VuZCkge1xuICAgICAgY29ubmVjdGlvbnMud2Vic29ja2V0LnNlbmQoZGF0YVRvU2VuZCk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBzZXRSZWFkeVN0YXRlKCkge1xuICAgIHZhciBzdGF0dXNTdHJpbmcgPSAnVU5LTk9XTic7XG4gICAgdmFyIHJlYWR5U3RhdGUgPSBjb25uZWN0aW9ucy53ZWJzb2NrZXQucmVhZHlTdGF0ZTtcblxuICAgIHN3aXRjaCAocmVhZHlTdGF0ZSkge1xuICAgICAgY2FzZSAwOlxuICAgICAgICBzdGF0dXNTdHJpbmcgPSAnQ09OTkVDVElORyc7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDE6XG4gICAgICAgIHN0YXR1c1N0cmluZyA9ICdPUEVOJztcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMjpcbiAgICAgICAgc3RhdHVzU3RyaW5nID0gJ0NMT1NJTkcnO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAzOlxuICAgICAgICBzdGF0dXNTdHJpbmcgPSAnQ0xPU0VEJztcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgaWYgKHJlYWR5U3RhdGUgPT09IDAgfHwgcmVhZHlTdGF0ZSA9PT0gMikge1xuICAgICAgc2V0VGltZW91dChzZXRSZWFkeVN0YXRlLCA1MDApO1xuICAgIH1cblxuICAgIGNvbm5lY3Rpb25TdGF0dXNMYWJlbC50ZXh0Q29udGVudCA9IHN0YXR1c1N0cmluZztcbiAgfVxuXG4gIGNvbm5lY3RCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICBjb25uZWN0aW9ucy53ZWJzb2NrZXQgPSBuZXcgV2ViU29ja2V0KFxuICAgICAgJ3dzOi8ve2FkZHJlc3N9OjgwMDgnLnJlcGxhY2UoJ3thZGRyZXNzfScsIHdzQWRkcmVzc0lucHV0LnZhbHVlKVxuICAgICk7XG5cbiAgICBjb25uZWN0aW9ucy53ZWJzb2NrZXQuYmluYXJ5VHlwZSA9ICdhcnJheWJ1ZmZlcic7XG5cbiAgICBzZXRSZWFkeVN0YXRlKCk7XG5cbiAgICBjb25uZWN0aW9ucy53ZWJzb2NrZXQub25tZXNzYWdlID0gZnVuY3Rpb24oZSkge1xuICAgICAgdmFyIGRhdGEgPSBUcmFuc3BvcnQucmVjZWl2ZShlLmRhdGEpO1xuICAgICAgdmFyIG1lc3NhZ2UgPSBkYXRhLm1lc3NhZ2U7XG5cbiAgICAgIGlmIChtZXNzYWdlLnR5cGUgPT09ICdjb25zb2xlJykge1xuICAgICAgICBjb25zb2xlW21lc3NhZ2UubWV0aG9kXS5hcHBseShjb25zb2xlLCBtZXNzYWdlLmFyZ3MpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChtZXNzYWdlLnR5cGUgPT09ICdiYXR0ZXJ5Jykge1xuICAgICAgICBpZiAobWVzc2FnZS5tZXRob2QgPT09ICdzdGF0dXMnKSB7XG4gICAgICAgICAgYmF0dGVyeS5sZXZlbExhYmVsLnRleHRDb250ZW50ID0gbWVzc2FnZS52YWx1ZS5sZXZlbDtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAobWVzc2FnZS50eXBlID09PSAnY2FtZXJhJykge1xuICAgICAgICBpZiAobWVzc2FnZS5tZXRob2QgPT09ICdwaWN0dXJlJykge1xuICAgICAgICAgIGNhbWVyYS5jYW1lcmFQaWN0dXJlSW1nLnNyYyA9IFVSTC5jcmVhdGVPYmplY3RVUkwoZGF0YS5ibG9ic1swXSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1lc3NhZ2UubWV0aG9kID09PSAnY2FwYWJpbGl0aWVzJykge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdjYXBhYmlsaXRpZXM6ICVzJywgSlNPTi5zdHJpbmdpZnkobWVzc2FnZS52YWx1ZSkpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gJ3BlZXInKSB7XG4gICAgICAgIGlmIChtZXNzYWdlLm1ldGhvZCA9PT0gJ2Fuc3dlcicpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnQW5zd2VyIHJlY2VpdmVkICVzJywgSlNPTi5zdHJpbmdpZnkobWVzc2FnZS52YWx1ZSkpO1xuICAgICAgICAgIGNvbm5lY3Rpb25zLnBlZXIuYWNjZXB0QW5zd2VyKG1lc3NhZ2UudmFsdWUpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChtZXNzYWdlLnR5cGUgPT09ICdzdG9yYWdlJykge1xuICAgICAgICBpZiAobWVzc2FnZS5tZXRob2QgPT09ICdsaXN0Jykge1xuICAgICAgICAgIG1lc3NhZ2UudmFsdWUubmFtZXMuZm9yRWFjaChmdW5jdGlvbihuYW1lLCBpbmRleCkge1xuICAgICAgICAgICAgdmFyIGxpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcblxuICAgICAgICAgICAgdmFyIGJsb2JVcmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGRhdGEuYmxvYnNbaW5kZXhdKTtcblxuICAgICAgICAgICAgdmFyIGZpbGVOYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICAgICAgICAgICAgZmlsZU5hbWUudGV4dENvbnRlbnQgPSBuYW1lO1xuICAgICAgICAgICAgZmlsZU5hbWUuaHJlZiA9IGJsb2JVcmw7XG4gICAgICAgICAgICBmaWxlTmFtZS5kb3dubG9hZCA9IG5hbWU7XG5cbiAgICAgICAgICAgIHZhciBpbWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKTtcbiAgICAgICAgICAgIGltZy5zcmMgPSBibG9iVXJsO1xuXG4gICAgICAgICAgICB2YXIgZGVsZXRlQnV0dG9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XG4gICAgICAgICAgICBkZWxldGVCdXR0b24udHlwZSA9ICdidXR0b24nO1xuICAgICAgICAgICAgZGVsZXRlQnV0dG9uLnRleHRDb250ZW50ID0gJ0RlbGV0ZSc7XG4gICAgICAgICAgICBkZWxldGVCdXR0b24uZGF0YXNldC5pZCA9IG5hbWU7XG5cbiAgICAgICAgICAgIGxpLmFwcGVuZENoaWxkKGZpbGVOYW1lKTtcbiAgICAgICAgICAgIGxpLmFwcGVuZENoaWxkKGltZyk7XG4gICAgICAgICAgICBsaS5hcHBlbmRDaGlsZChkZWxldGVCdXR0b24pO1xuXG4gICAgICAgICAgICBzdG9yYWdlLmZpbGVMaXN0LmFwcGVuZENoaWxkKGxpKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuXG4gIHNjcmVlbi5icmlnaHRuZXNzSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgc2VuZCh7XG4gICAgICB0eXBlOiAncG93ZXInLFxuICAgICAgbWV0aG9kOiAnYnJpZ2h0bmVzcycsXG4gICAgICB2YWx1ZTogc2NyZWVuLmJyaWdodG5lc3NJbnB1dC52YWx1ZVxuICAgIH0pO1xuICB9KTtcblxuICBzY3JlZW4uZW5hYmxlZElucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgIHNlbmQoe1xuICAgICAgdHlwZTogJ3Bvd2VyJyxcbiAgICAgIG1ldGhvZDogJ3NjcmVlbi1lbmFibGVkJyxcbiAgICAgIHZhbHVlOiBzY3JlZW4uZW5hYmxlZElucHV0LmNoZWNrZWRcbiAgICB9KTtcbiAgfSk7XG5cbiAgcmVtb3RlTG9nZ2luZ0lucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgIHNlbmQoe1xuICAgICAgdHlwZTogJ2xvZ2dlcicsXG4gICAgICBtZXRob2Q6IHJlbW90ZUxvZ2dpbmdJbnB1dC5jaGVja2VkID8gJ29uJyA6ICdvZmYnXG4gICAgfSk7XG4gIH0pO1xuXG4gIGJhdHRlcnkucmVmcmVzaEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgIHNlbmQoeyB0eXBlOiAnYmF0dGVyeScsIG1ldGhvZDogJ3N0YXR1cyd9KTtcbiAgfSk7XG5cbiAgY2FtZXJhLmZsYXNoTW9kZVNlbGVjdC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICBzZW5kKHtcbiAgICAgIHR5cGU6ICdjYW1lcmEnLFxuICAgICAgbWV0aG9kOiAnZmxhc2gtbW9kZScsXG4gICAgICB2YWx1ZTogY2FtZXJhLmZsYXNoTW9kZVNlbGVjdC52YWx1ZVxuICAgIH0pO1xuICB9KTtcblxuICBjYW1lcmEudGFrZVBpY3R1cmVCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICBpZiAoY29ubmVjdGlvbnMucGVlcikge1xuICAgICAgdmFyIGNvbmZpcm1NZXNzYWdlID1cbiAgICAgICAgJ1BlZXIgY29ubmVjdGlvbiBpcyBhY3RpdmUhIERvIHlvdSB3YW50IHRvIGNsb3NlIGl0Pyc7XG4gICAgICBpZih3aW5kb3cuY29uZmlybShjb25maXJtTWVzc2FnZSkpIHtcbiAgICAgICAgY2xvc2VQZWVyQ29ubmVjdGlvbigpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cblxuICAgIHNlbmQoe1xuICAgICAgdHlwZTogJ2NhbWVyYScsXG4gICAgICBtZXRob2Q6ICd0YWtlLXBpY3R1cmUnXG4gICAgfSk7XG4gIH0pO1xuXG4gIGNhbWVyYS5zdGFydFRyYWNraW5nLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgIHNlbmQoe1xuICAgICAgdHlwZTogJ2NhbWVyYScsXG4gICAgICBtZXRob2Q6ICd0cmFja2luZy1zdGFydCcsXG4gICAgICB2YWx1ZToge1xuICAgICAgICBpbnRlcnZhbDogTnVtYmVyLnBhcnNlSW50KGNhbWVyYS50cmFja2luZ0ludGVydmFsLnZhbHVlLCAxMCksXG4gICAgICAgIHR5cGU6IGNhbWVyYS50cmFja2luZ0ludGVydmFsVHlwZS52YWx1ZVxuICAgICAgfVxuICAgIH0pO1xuICB9KTtcblxuICBjYW1lcmEuc3RvcFRyYWNraW5nLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgIHNlbmQoe1xuICAgICAgdHlwZTogJ2NhbWVyYScsXG4gICAgICBtZXRob2Q6ICd0cmFja2luZy1zdG9wJ1xuICAgIH0pO1xuICB9KTtcblxuICBwZWVyLmNvbm5lY3RCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICBjb25uZWN0aW9ucy5wZWVyID0gbmV3IFBlZXJDb25uZWN0aW9uKCk7XG5cbiAgICBjb25uZWN0aW9ucy5wZWVyLm9uKCdpY2UtY2FuZGlkYXRlJywgZnVuY3Rpb24oY2FuZGlkYXRlKSB7XG4gICAgICAvLyBGaXJpbmcgdGhpcyBjYWxsYmFjayB3aXRoIGEgbnVsbCBjYW5kaWRhdGUgaW5kaWNhdGVzIHRoYXQgdHJpY2tsZSBJQ0VcbiAgICAgIC8vIGdhdGhlcmluZyBoYXMgZmluaXNoZWQsIGFuZCBhbGwgdGhlIGNhbmRpZGF0ZXMgYXJlIG5vdyBwcmVzZW50IGluXG4gICAgICAvLyBcImxvY2FsRGVzY3JpcHRpb25cIi4gV2FpdGluZyB1bnRpbCBub3cgdG8gY3JlYXRlIHRoZSBhbnN3ZXIgc2F2ZXMgdXNcbiAgICAgIC8vIGZyb20gaGF2aW5nIHRvIHNlbmQgb2ZmZXIgKyBhbnN3ZXIgKyBpY2VDYW5kaWRhdGVzIHNlcGFyYXRlbHkuXG4gICAgICBpZiAoY2FuZGlkYXRlID09PSBudWxsKSB7XG4gICAgICAgIHZhciBvZmZlciA9IGNvbm5lY3Rpb25zLnBlZXIuZ2V0TG9jYWxEZXNjcmlwdGlvbigpO1xuXG4gICAgICAgIHNlbmQoe1xuICAgICAgICAgIHR5cGU6ICdwZWVyJyxcbiAgICAgICAgICBtZXRob2Q6ICdvZmZlcicsXG4gICAgICAgICAgdmFsdWU6IHtcbiAgICAgICAgICAgIHR5cGU6IG9mZmVyLnR5cGUsXG4gICAgICAgICAgICBzZHA6IG9mZmVyLnNkcFxuICAgICAgICAgIH0sXG4gICAgICAgICAgZmFjaW5nTW9kZTogcGVlci5mYWNpbmdNb2RlLnZhbHVlXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY29ubmVjdGlvbnMucGVlci5vbignYWRkLXN0cmVhbScsIGZ1bmN0aW9uKHN0cmVhbSkge1xuICAgICAgY2FtZXJhLmNhbWVyYVZpZGVvLm1velNyY09iamVjdCA9IHN0cmVhbTtcbiAgICAgIGNhbWVyYS5jYW1lcmFWaWRlby5wbGF5KCk7XG4gICAgfSk7XG5cbiAgICBnZXRVc2VyTWVkaWEoeyB2aWRlbzogdHJ1ZSwgZmFrZTogdHJ1ZSB9LCBmdW5jdGlvbihzdHJlYW0pIHtcbiAgICAgIGNvbm5lY3Rpb25zLnBlZXIuYWRkU3RyZWFtKHN0cmVhbSk7XG5cbiAgICAgIGNvbm5lY3Rpb25zLnBlZXIuY3JlYXRlT2ZmZXIoe1xuICAgICAgICBvZmZlclRvUmVjZWl2ZUF1ZGlvOiBmYWxzZSxcbiAgICAgICAgb2ZmZXJUb1JlY2VpdmVWaWRlbzogdHJ1ZVxuICAgICAgfSk7XG4gICAgfSwgZnVuY3Rpb24oZSkge30pO1xuXG4gICAgcGVlci5jb25uZWN0QnRuLmRpc2FibGVkID0gdHJ1ZTtcbiAgICBwZWVyLmRpc2Nvbm5lY3RCdG4uZGlzYWJsZWQgPSBmYWxzZTtcbiAgICBwZWVyLmZhY2luZ01vZGUuZGlzYWJsZWQgPSB0cnVlO1xuICB9KTtcblxuICBwZWVyLmRpc2Nvbm5lY3RCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICBjbG9zZVBlZXJDb25uZWN0aW9uKCk7XG4gIH0pO1xuXG4gIHN0b3JhZ2UucmV0cmlldmVCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICBzdG9yYWdlLmZpbGVMaXN0LnRleHRDb250ZW50ID0gJyc7XG5cbiAgICBzZW5kKHtcbiAgICAgIHR5cGU6ICdzdG9yYWdlJyxcbiAgICAgIG1ldGhvZDogJ2xpc3QnLFxuICAgICAgcGFnZVNpemU6IDVcbiAgICB9KTtcbiAgfSk7XG5cbiAgc3RvcmFnZS5maWxlTGlzdC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICBpZiAoZS50YXJnZXQubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gJ2J1dHRvbicpIHtcbiAgICAgIHNlbmQoe1xuICAgICAgICB0eXBlOiAnc3RvcmFnZScsXG4gICAgICAgIG1ldGhvZDogJ2RlbGV0ZScsXG4gICAgICAgIHZhbHVlOiBlLnRhcmdldC5kYXRhc2V0LmlkXG4gICAgICB9KTtcblxuICAgICAgZS50YXJnZXQuY2xvc2VzdCgnbGknKS5yZW1vdmUoKTtcbiAgICB9XG4gIH0pO1xufSk7XG4iLCIvKmdsb2JhbCBNYXAsIFNldCAqL1xuXG5mdW5jdGlvbiBlbnN1cmVWYWxpZEV2ZW50TmFtZShldmVudE5hbWUpIHtcbiAgaWYgKCFldmVudE5hbWUgfHwgdHlwZW9mIGV2ZW50TmFtZSAhPT0gJ3N0cmluZycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0V2ZW50IG5hbWUgc2hvdWxkIGJlIGEgdmFsaWQgbm9uLWVtcHR5IHN0cmluZyEnKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBlbnN1cmVWYWxpZEhhbmRsZXIoaGFuZGxlcikge1xuICBpZiAodHlwZW9mIGhhbmRsZXIgIT09ICdmdW5jdGlvbicpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0hhbmRsZXIgc2hvdWxkIGJlIGEgZnVuY3Rpb24hJyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZW5zdXJlQWxsb3dlZEV2ZW50TmFtZShhbGxvd2VkRXZlbnRzLCBldmVudE5hbWUpIHtcbiAgaWYgKGFsbG93ZWRFdmVudHMgJiYgYWxsb3dlZEV2ZW50cy5pbmRleE9mKGV2ZW50TmFtZSkgPCAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdFdmVudCBcIicgKyBldmVudE5hbWUgKyAnXCIgaXMgbm90IGFsbG93ZWQhJyk7XG4gIH1cbn1cblxuLy8gSW1wbGVtZW50cyBwdWJsaXNoL3N1YnNjcmliZSBiZWhhdmlvdXIgdGhhdCBjYW4gYmUgYXBwbGllZCB0byBhbnkgb2JqZWN0LFxuLy8gc28gdGhhdCBvYmplY3QgY2FuIGJlIGxpc3RlbmVkIGZvciBjdXN0b20gZXZlbnRzLiBcInRoaXNcIiBjb250ZXh0IGlzIHRoZVxuLy8gb2JqZWN0IHdpdGggTWFwIFwibGlzdGVuZXJzXCIgcHJvcGVydHkgdXNlZCB0byBzdG9yZSBoYW5kbGVycy5cbnZhciBldmVudERpc3BhdGNoZXIgPSB7XG4gIC8qKlxuICAgKiBSZWdpc3RlcnMgbGlzdGVuZXIgZnVuY3Rpb24gdG8gYmUgZXhlY3V0ZWQgb25jZSBldmVudCBvY2N1cnMuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBldmVudE5hbWUgTmFtZSBvZiB0aGUgZXZlbnQgdG8gbGlzdGVuIGZvci5cbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gaGFuZGxlciBIYW5kbGVyIHRvIGJlIGV4ZWN1dGVkIG9uY2UgZXZlbnQgb2NjdXJzLlxuICAgKi9cbiAgb246IGZ1bmN0aW9uKGV2ZW50TmFtZSwgaGFuZGxlcikge1xuICAgIGVuc3VyZVZhbGlkRXZlbnROYW1lKGV2ZW50TmFtZSk7XG4gICAgZW5zdXJlQWxsb3dlZEV2ZW50TmFtZSh0aGlzLmFsbG93ZWRFdmVudHMsIGV2ZW50TmFtZSk7XG4gICAgZW5zdXJlVmFsaWRIYW5kbGVyKGhhbmRsZXIpO1xuXG4gICAgdmFyIGhhbmRsZXJzID0gdGhpcy5saXN0ZW5lcnMuZ2V0KGV2ZW50TmFtZSk7XG5cbiAgICBpZiAoIWhhbmRsZXJzKSB7XG4gICAgICBoYW5kbGVycyA9IG5ldyBTZXQoKTtcbiAgICAgIHRoaXMubGlzdGVuZXJzLnNldChldmVudE5hbWUsIGhhbmRsZXJzKTtcbiAgICB9XG5cbiAgICAvLyBTZXQuYWRkIGlnbm9yZXMgaGFuZGxlciBpZiBpdCBoYXMgYmVlbiBhbHJlYWR5IHJlZ2lzdGVyZWRcbiAgICBoYW5kbGVycy5hZGQoaGFuZGxlcik7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgcmVnaXN0ZXJlZCBsaXN0ZW5lciBmb3IgdGhlIHNwZWNpZmllZCBldmVudC5cbiAgICogQHBhcmFtIHtzdHJpbmd9IGV2ZW50TmFtZSBOYW1lIG9mIHRoZSBldmVudCB0byByZW1vdmUgbGlzdGVuZXIgZm9yLlxuICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBoYW5kbGVyIEhhbmRsZXIgdG8gcmVtb3ZlLCBzbyBpdCB3b24ndCBiZSBleGVjdXRlZFxuICAgKiBuZXh0IHRpbWUgZXZlbnQgb2NjdXJzLlxuICAgKi9cbiAgb2ZmOiBmdW5jdGlvbihldmVudE5hbWUsIGhhbmRsZXIpIHtcbiAgICBlbnN1cmVWYWxpZEV2ZW50TmFtZShldmVudE5hbWUpO1xuICAgIGVuc3VyZUFsbG93ZWRFdmVudE5hbWUodGhpcy5hbGxvd2VkRXZlbnRzLCBldmVudE5hbWUpO1xuICAgIGVuc3VyZVZhbGlkSGFuZGxlcihoYW5kbGVyKTtcblxuICAgIHZhciBoYW5kbGVycyA9IHRoaXMubGlzdGVuZXJzLmdldChldmVudE5hbWUpO1xuXG4gICAgaWYgKCFoYW5kbGVycykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGhhbmRsZXJzLmRlbGV0ZShoYW5kbGVyKTtcblxuICAgIGlmICghaGFuZGxlcnMuc2l6ZSkge1xuICAgICAgdGhpcy5saXN0ZW5lcnMuZGVsZXRlKGV2ZW50TmFtZSk7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGFsbCByZWdpc3RlcmVkIGxpc3RlbmVycyBmb3IgdGhlIHNwZWNpZmllZCBldmVudC5cbiAgICogQHBhcmFtIHtzdHJpbmd9IGV2ZW50TmFtZSBOYW1lIG9mIHRoZSBldmVudCB0byByZW1vdmUgYWxsIGxpc3RlbmVycyBmb3IuXG4gICAqL1xuICBvZmZBbGw6IGZ1bmN0aW9uKGV2ZW50TmFtZSkge1xuICAgIGlmICh0eXBlb2YgZXZlbnROYW1lID09PSAndW5kZWZpbmVkJykge1xuICAgICAgdGhpcy5saXN0ZW5lcnMuY2xlYXIoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBlbnN1cmVWYWxpZEV2ZW50TmFtZShldmVudE5hbWUpO1xuICAgIGVuc3VyZUFsbG93ZWRFdmVudE5hbWUodGhpcy5hbGxvd2VkRXZlbnRzLCBldmVudE5hbWUpO1xuXG4gICAgdmFyIGhhbmRsZXJzID0gdGhpcy5saXN0ZW5lcnMuZ2V0KGV2ZW50TmFtZSk7XG5cbiAgICBpZiAoIWhhbmRsZXJzKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaGFuZGxlcnMuY2xlYXIoKTtcblxuICAgIHRoaXMubGlzdGVuZXJzLmRlbGV0ZShldmVudE5hbWUpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBFbWl0cyBzcGVjaWZpZWQgZXZlbnQgc28gdGhhdCBhbGwgcmVnaXN0ZXJlZCBoYW5kbGVycyB3aWxsIGJlIGNhbGxlZFxuICAgKiB3aXRoIHRoZSBzcGVjaWZpZWQgcGFyYW1ldGVycy5cbiAgICogQHBhcmFtIHtzdHJpbmd9IGV2ZW50TmFtZSBOYW1lIG9mIHRoZSBldmVudCB0byBjYWxsIGhhbmRsZXJzIGZvci5cbiAgICogQHBhcmFtIHtPYmplY3R9IHBhcmFtZXRlcnMgT3B0aW9uYWwgcGFyYW1ldGVycyB0aGF0IHdpbGwgYmUgcGFzc2VkIHRvXG4gICAqIGV2ZXJ5IHJlZ2lzdGVyZWQgaGFuZGxlci5cbiAgICovXG4gIGVtaXQ6IGZ1bmN0aW9uKGV2ZW50TmFtZSwgcGFyYW1ldGVycykge1xuICAgIGVuc3VyZVZhbGlkRXZlbnROYW1lKGV2ZW50TmFtZSk7XG4gICAgZW5zdXJlQWxsb3dlZEV2ZW50TmFtZSh0aGlzLmFsbG93ZWRFdmVudHMsIGV2ZW50TmFtZSk7XG5cbiAgICB2YXIgaGFuZGxlcnMgPSB0aGlzLmxpc3RlbmVycy5nZXQoZXZlbnROYW1lKTtcblxuICAgIGlmICghaGFuZGxlcnMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBoYW5kbGVycy5mb3JFYWNoKGZ1bmN0aW9uKGhhbmRsZXIpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGhhbmRsZXIocGFyYW1ldGVycyk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn07XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgLyoqXG4gICAqIE1peGVzIGRpc3BhdGNoZXIgbWV0aG9kcyBpbnRvIHRhcmdldCBvYmplY3QuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSB0YXJnZXQgT2JqZWN0IHRvIG1peCBkaXNwYXRjaGVyIG1ldGhvZHMgaW50by5cbiAgICogQHBhcmFtIHtBcnJheS48c3RyaW5nPn0gYWxsb3dlZEV2ZW50cyBPcHRpb25hbCBsaXN0IG9mIHRoZSBhbGxvd2VkIGV2ZW50XG4gICAqIG5hbWVzIHRoYXQgY2FuIGJlIGVtaXR0ZWQgYW5kIGxpc3RlbmVkIGZvci5cbiAgICogQHJldHVybnMge09iamVjdH0gVGFyZ2V0IG9iamVjdCB3aXRoIGFkZGVkIGRpc3BhdGNoZXIgbWV0aG9kcy5cbiAgICovXG4gIG1peGluOiBmdW5jdGlvbih0YXJnZXQsIGFsbG93ZWRFdmVudHMpIHtcbiAgICBpZiAoIXRhcmdldCB8fCB0eXBlb2YgdGFyZ2V0ICE9PSAnb2JqZWN0Jykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdPYmplY3QgdG8gbWl4IGludG8gc2hvdWxkIGJlIHZhbGlkIG9iamVjdCEnKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGFsbG93ZWRFdmVudHMgIT09ICd1bmRlZmluZWQnICYmXG4gICAgICAgICFBcnJheS5pc0FycmF5KGFsbG93ZWRFdmVudHMpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FsbG93ZWQgZXZlbnRzIHNob3VsZCBiZSBhIHZhbGlkIGFycmF5IG9mIHN0cmluZ3MhJyk7XG4gICAgfVxuXG4gICAgT2JqZWN0LmtleXMoZXZlbnREaXNwYXRjaGVyKS5mb3JFYWNoKGZ1bmN0aW9uKG1ldGhvZCkge1xuICAgICAgaWYgKHR5cGVvZiB0YXJnZXRbbWV0aG9kXSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICdPYmplY3QgdG8gbWl4IGludG8gYWxyZWFkeSBoYXMgXCInICsgbWV0aG9kICsgJ1wiIHByb3BlcnR5IGRlZmluZWQhJ1xuICAgICAgICApO1xuICAgICAgfVxuICAgICAgdGFyZ2V0W21ldGhvZF0gPSBldmVudERpc3BhdGNoZXJbbWV0aG9kXS5iaW5kKHRoaXMpO1xuICAgIH0sIHsgbGlzdGVuZXJzOiBuZXcgTWFwKCksIGFsbG93ZWRFdmVudHM6IGFsbG93ZWRFdmVudHMgfSk7XG5cbiAgICByZXR1cm4gdGFyZ2V0O1xuICB9XG59O1xuIiwidmFyIFdlYlNvY2tldFV0aWxzID0ge1xuICAvKipcbiAgICogTWFzayBldmVyeSBkYXRhIGVsZW1lbnQgd2l0aCB0aGUgbWFzayAoV2ViU29ja2V0IHNwZWNpZmljIGFsZ29yaXRobSkuXG4gICAqIEBwYXJhbSB7QXJyYXl9IG1hc2sgTWFzayBhcnJheS5cbiAgICogQHBhcmFtIHtBcnJheX0gYXJyYXkgRGF0YSBhcnJheSB0byBtYXNrLlxuICAgKiBAcmV0dXJucyB7QXJyYXl9IE1hc2tlZCBkYXRhIGFycmF5LlxuICAgKi9cbiAgbWFzayhtYXNrLCBhcnJheSkge1xuICAgIGlmIChtYXNrKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGFycmF5W2ldID0gYXJyYXlbaV0gXiBtYXNrW2kgJSA0XTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGFycmF5O1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZXMgNC1pdGVtIGFycmF5LCBldmVyeSBpdGVtIG9mIHdoaWNoIGlzIGVsZW1lbnQgb2YgYnl0ZSBtYXNrLlxuICAgKiBAcmV0dXJucyB7VWludDhBcnJheX1cbiAgICovXG4gIGdlbmVyYXRlUmFuZG9tTWFzaygpIHtcbiAgICB2YXIgcmFuZG9tID0gbmV3IFVpbnQ4QXJyYXkoNCk7XG5cbiAgICB3aW5kb3cuY3J5cHRvLmdldFJhbmRvbVZhbHVlcyhyYW5kb20pO1xuXG4gICAgcmV0dXJuIHJhbmRvbTtcbiAgfSxcblxuICAvKipcbiAgICogQ29udmVydHMgc3RyaW5nIHRvIFVpbnQ4QXJyYXkuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBzdHJpbmdWYWx1ZSBTdHJpbmcgdmFsdWUgdG8gY29udmVydC5cbiAgICogQHJldHVybnMge1VpbnQ4QXJyYXl9XG4gICAqL1xuICBzdHJpbmdUb0FycmF5KHN0cmluZ1ZhbHVlKSB7XG4gICAgaWYgKHR5cGVvZiBzdHJpbmdWYWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignc3RyaW5nVmFsdWUgc2hvdWxkIGJlIHZhbGlkIHN0cmluZyEnKTtcbiAgICB9XG5cbiAgICB2YXIgYXJyYXkgPSBuZXcgVWludDhBcnJheShzdHJpbmdWYWx1ZS5sZW5ndGgpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyaW5nVmFsdWUubGVuZ3RoOyBpKyspIHtcbiAgICAgIGFycmF5W2ldID0gc3RyaW5nVmFsdWUuY2hhckNvZGVBdChpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYXJyYXk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbnZlcnRzIGFycmF5IHRvIHN0cmluZy4gRXZlcnkgYXJyYXkgZWxlbWVudCBpcyBjb25zaWRlcmVkIGFzIGNoYXIgY29kZS5cbiAgICogQHBhcmFtIHtVaW50OEFycmF5fSBhcnJheSBBcnJheSB3aXRoIHRoZSBjaGFyIGNvZGVzLlxuICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgKi9cbiAgYXJyYXlUb1N0cmluZyhhcnJheSkge1xuICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KG51bGwsIGFycmF5KTtcbiAgfSxcblxuICAvKipcbiAgICogUmVhZHMgdW5zaWduZWQgMTYgYml0IHZhbHVlIGZyb20gdHdvIGNvbnNlcXVlbnQgOC1iaXQgYXJyYXkgZWxlbWVudHMuXG4gICAqIEBwYXJhbSB7VWludDhBcnJheX0gYXJyYXkgQXJyYXkgdG8gcmVhZCBmcm9tLlxuICAgKiBAcGFyYW0ge051bWJlcn0gb2Zmc2V0IEluZGV4IHRvIHN0YXJ0IHJlYWQgdmFsdWUuXG4gICAqIEByZXR1cm5zIHtOdW1iZXJ9XG4gICAqL1xuICByZWFkVUludDE2KGFycmF5LCBvZmZzZXQpIHtcbiAgICBvZmZzZXQgPSBvZmZzZXQgfHwgMDtcbiAgICByZXR1cm4gKGFycmF5W29mZnNldF0gPDwgOCkgKyBhcnJheVtvZmZzZXQgKyAxXTtcbiAgfSxcblxuICAvKipcbiAgICogUmVhZHMgdW5zaWduZWQgMzIgYml0IHZhbHVlIGZyb20gZm91ciBjb25zZXF1ZW50IDgtYml0IGFycmF5IGVsZW1lbnRzLlxuICAgKiBAcGFyYW0ge1VpbnQ4QXJyYXl9IGFycmF5IEFycmF5IHRvIHJlYWQgZnJvbS5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9mZnNldCBJbmRleCB0byBzdGFydCByZWFkIHZhbHVlLlxuICAgKiBAcmV0dXJucyB7TnVtYmVyfVxuICAgKi9cbiAgcmVhZFVJbnQzMihhcnJheSwgb2Zmc2V0KSB7XG4gICAgb2Zmc2V0ID0gb2Zmc2V0IHx8IDA7XG4gICAgcmV0dXJuIChhcnJheVtvZmZzZXRdIDw8IDI0KSArXG4gICAgICAoYXJyYXlbb2Zmc2V0ICsgMV0gPDwgMTYpICtcbiAgICAgIChhcnJheSBbb2Zmc2V0ICsgMl0gPDwgOCkgK1xuICAgICAgYXJyYXlbb2Zmc2V0ICsgM107XG4gIH0sXG5cbiAgLyoqXG4gICAqIFdyaXRlcyB1bnNpZ25lZCAxNiBiaXQgdmFsdWUgdG8gdHdvIGNvbnNlcXVlbnQgOC1iaXQgYXJyYXkgZWxlbWVudHMuXG4gICAqIEBwYXJhbSB7VWludDhBcnJheX0gYXJyYXkgQXJyYXkgdG8gd3JpdGUgdG8uXG4gICAqIEBwYXJhbSB7TnVtYmVyfSB2YWx1ZSAxNiBiaXQgdW5zaWduZWQgdmFsdWUgdG8gd3JpdGUgaW50byBhcnJheS5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9mZnNldCBJbmRleCB0byBzdGFydCB3cml0ZSB2YWx1ZS5cbiAgICogQHJldHVybnMge051bWJlcn1cbiAgICovXG4gIHdyaXRlVUludDE2KGFycmF5LCB2YWx1ZSwgb2Zmc2V0KSB7XG4gICAgYXJyYXlbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYwMCkgPj4gODtcbiAgICBhcnJheVtvZmZzZXQgKyAxXSA9IHZhbHVlICYgMHhmZjtcbiAgfSxcblxuICAvKipcbiAgICogV3JpdGVzIHVuc2lnbmVkIDE2IGJpdCB2YWx1ZSB0byB0d28gY29uc2VxdWVudCA4LWJpdCBhcnJheSBlbGVtZW50cy5cbiAgICogQHBhcmFtIHtVaW50OEFycmF5fSBhcnJheSBBcnJheSB0byB3cml0ZSB0by5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IHZhbHVlIDE2IGJpdCB1bnNpZ25lZCB2YWx1ZSB0byB3cml0ZSBpbnRvIGFycmF5LlxuICAgKiBAcGFyYW0ge051bWJlcn0gb2Zmc2V0IEluZGV4IHRvIHN0YXJ0IHdyaXRlIHZhbHVlLlxuICAgKiBAcmV0dXJucyB7TnVtYmVyfVxuICAgKi9cbiAgd3JpdGVVSW50MzIoYXJyYXksIHZhbHVlLCBvZmZzZXQpIHtcbiAgICBhcnJheVtvZmZzZXRdID0gKHZhbHVlICYgMHhmZjAwMDAwMCkgPj4gMjQ7XG4gICAgYXJyYXlbb2Zmc2V0ICsgMV0gPSAodmFsdWUgJiAweGZmMDAwMCkgPj4gMTY7XG4gICAgYXJyYXlbb2Zmc2V0ICsgMl0gPSAodmFsdWUgJiAweGZmMDApID4+IDg7XG4gICAgYXJyYXlbb2Zmc2V0ICsgM10gPSB2YWx1ZSAmIDB4ZmY7XG4gIH1cbn07XG5cbmV4cG9ydCBkZWZhdWx0IFdlYlNvY2tldFV0aWxzO1xuIiwiLyogZ2xvYmFsIFByb21pc2UsXG4gICAgICAgICAgbW96UlRDUGVlckNvbm5lY3Rpb24sXG4gICAgICAgICAgbW96UlRDU2Vzc2lvbkRlc2NyaXB0aW9uLFxuICAgICAgICAgIHdlYmtpdFJUQ1BlZXJDb25uZWN0aW9uLFxuICAgICAgICAgIHdlYmtpdFJUQ1Nlc3Npb25EZXNjcmlwdGlvblxuKi9cblxuaW1wb3J0IEV2ZW50RGlzcGF0Y2hlciBmcm9tICdldmVudC1kaXNwYXRjaGVyLWpzJztcblxudmFyIFJUQ1BlZXJDb25uZWN0aW9uID0gd2luZG93Lm1velJUQ1BlZXJDb25uZWN0aW9uIHx8XG4gIHdpbmRvdy53ZWJraXRSVENQZWVyQ29ubmVjdGlvbjtcblxudmFyIFJUQ1Nlc3Npb25EZXNjcmlwdGlvbiA9IHdpbmRvdy5tb3pSVENTZXNzaW9uRGVzY3JpcHRpb24gfHxcbiAgd2luZG93LndlYmtpdFJUQ1Nlc3Npb25EZXNjcmlwdGlvbjtcblxudmFyIHByaXZhdGVzID0ge1xuICBjb25uZWN0aW9uOiBTeW1ib2woJ2Nvbm5lY3Rpb24nKSxcblxuICBnZXRDb25uZWN0aW9uOiBTeW1ib2woJ2dldENvbm5lY3Rpb24nKVxufTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGVlckNvbm5lY3Rpb24ge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBFdmVudERpc3BhdGNoZXIubWl4aW4oXG4gICAgICB0aGlzLCBbJ2FkZC1zdHJlYW0nLCAnaWNlLWNhbmRpZGF0ZScsICdzaWduYWxpbmctc3RhdGUtY2hhbmdlJ11cbiAgICApO1xuXG4gICAgdmFyIGNvbm5lY3Rpb24gPSBuZXcgUlRDUGVlckNvbm5lY3Rpb24oe1xuICAgICAgaWNlU2VydmVyczogW3tcbiAgICAgICAgdXJsOiAnc3R1bjpzdHVuLmwuZ29vZ2xlLmNvbToxOTMwMicsXG4gICAgICAgIHVybHM6ICdzdHVuOnN0dW4ubC5nb29nbGUuY29tOjE5MzAyJ1xuICAgICAgfV1cbiAgICB9KTtcblxuICAgIGNvbm5lY3Rpb24uYWRkRXZlbnRMaXN0ZW5lcignaWNlY2FuZGlkYXRlJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgIHRoaXMuZW1pdCgnaWNlLWNhbmRpZGF0ZScsIGUuY2FuZGlkYXRlKTtcbiAgICB9LmJpbmQodGhpcykpO1xuXG4gICAgY29ubmVjdGlvbi5hZGRFdmVudExpc3RlbmVyKCdhZGRzdHJlYW0nLCBmdW5jdGlvbiAoZSkge1xuICAgICAgdGhpcy5lbWl0KCdhZGQtc3RyZWFtJywgZS5zdHJlYW0pO1xuICAgIH0uYmluZCh0aGlzKSk7XG5cbiAgICBjb25uZWN0aW9uLmFkZEV2ZW50TGlzdGVuZXIoJ3NpZ25hbGluZ3N0YXRlY2hhbmdlJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgIHRoaXMuZW1pdCgnc2lnbmFsaW5nLXN0YXRlLWNoYW5nZScsIGUpO1xuICAgIH0uYmluZCh0aGlzKSk7XG5cbiAgICB0aGlzW3ByaXZhdGVzLmNvbm5lY3Rpb25dID0gY29ubmVjdGlvbjtcbiAgfVxuXG4gIGdldExvY2FsRGVzY3JpcHRpb24oKSB7XG4gICAgcmV0dXJuIHRoaXNbcHJpdmF0ZXMuZ2V0Q29ubmVjdGlvbl0oKS5sb2NhbERlc2NyaXB0aW9uO1xuICB9XG5cbiAgYWRkU3RyZWFtKHN0cmVhbSkge1xuICAgIHJldHVybiB0aGlzW3ByaXZhdGVzLmdldENvbm5lY3Rpb25dKCkuYWRkU3RyZWFtKHN0cmVhbSk7XG4gIH1cblxuICBjcmVhdGVPZmZlcihvcHRpb25zKSB7XG4gICAgdmFyIGNvbm5lY3Rpb24gPSB0aGlzW3ByaXZhdGVzLmdldENvbm5lY3Rpb25dKCk7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgY29ubmVjdGlvbi5jcmVhdGVEYXRhQ2hhbm5lbCgnZGF0YS1jaGFubmVsJywgeyByZWxpYWJsZTogdHJ1ZSB9KTtcblxuICAgICAgY29ubmVjdGlvbi5jcmVhdGVPZmZlcihmdW5jdGlvbihsb2NhbERlc2NyaXB0aW9uKSB7XG4gICAgICAgIGNvbm5lY3Rpb24uc2V0TG9jYWxEZXNjcmlwdGlvbihsb2NhbERlc2NyaXB0aW9uLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXNvbHZlKGxvY2FsRGVzY3JpcHRpb24pO1xuICAgICAgICB9LCByZWplY3QpO1xuICAgICAgfSwgcmVqZWN0LCBvcHRpb25zKTtcbiAgICB9KTtcbiAgfVxuXG4gIGFjY2VwdE9mZmVyKG9mZmVyKSB7XG4gICAgdmFyIGNvbm5lY3Rpb24gPSB0aGlzW3ByaXZhdGVzLmdldENvbm5lY3Rpb25dKCk7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgdmFyIHJlbW90ZURlc2NyaXB0aW9uID0gbmV3IFJUQ1Nlc3Npb25EZXNjcmlwdGlvbihvZmZlcik7XG5cbiAgICAgIGNvbm5lY3Rpb24uc2V0UmVtb3RlRGVzY3JpcHRpb24ocmVtb3RlRGVzY3JpcHRpb24sIGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25uZWN0aW9uLmNyZWF0ZUFuc3dlcihmdW5jdGlvbihsb2NhbERlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgY29ubmVjdGlvbi5zZXRMb2NhbERlc2NyaXB0aW9uKGxvY2FsRGVzY3JpcHRpb24sIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmVzb2x2ZShsb2NhbERlc2NyaXB0aW9uKTtcbiAgICAgICAgICB9LCByZWplY3QpO1xuICAgICAgICB9LCByZWplY3QpO1xuICAgICAgfSwgcmVqZWN0KTtcbiAgICB9KTtcbiAgfVxuXG4gIGFjY2VwdEFuc3dlcihhbnN3ZXIpIHtcbiAgICB2YXIgY29ubmVjdGlvbiA9IHRoaXNbcHJpdmF0ZXMuZ2V0Q29ubmVjdGlvbl0oKTtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICBjb25uZWN0aW9uLnNldFJlbW90ZURlc2NyaXB0aW9uKFxuICAgICAgICBuZXcgUlRDU2Vzc2lvbkRlc2NyaXB0aW9uKGFuc3dlciksIGZ1bmN0aW9uKCkgeyByZXNvbHZlKCk7IH0sIHJlamVjdFxuICAgICAgKTtcbiAgICB9KTtcbiAgfVxuXG4gIGNsb3NlKCkge1xuICAgIHZhciBjb25uZWN0aW9uID0gdGhpc1twcml2YXRlcy5nZXRDb25uZWN0aW9uXSgpO1xuXG4gICAgY29ubmVjdGlvbi5nZXRMb2NhbFN0cmVhbXMoKS5mb3JFYWNoKGZ1bmN0aW9uKHN0cmVhbSkge1xuICAgICAgc3RyZWFtLnN0b3AoKTtcbiAgICB9KTtcblxuICAgIGNvbm5lY3Rpb24uY2xvc2UoKTtcblxuICAgIHRoaXNbcHJpdmF0ZXMuY29ubmVjdGlvbl0gPSBudWxsO1xuICB9XG5cbiAgW3ByaXZhdGVzLmdldENvbm5lY3Rpb25dKCkge1xuICAgIHZhciBjb25uZWN0aW9uID0gdGhpc1twcml2YXRlcy5jb25uZWN0aW9uXTtcblxuICAgIGlmICghY29ubmVjdGlvbikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb25uZWN0aW9uIGlzIGNsb3NlZCEnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY29ubmVjdGlvbjtcbiAgfVxufVxuIiwiaW1wb3J0IFV0aWxzIGZyb20gJ3dlYnNvY2tldC1zZXJ2ZXItdXRpbHMnO1xuXG5mdW5jdGlvbiBqb2luQmxvYnMoYmxvYnMpIHtcbiAgdmFyIHJlc3VsdCA9IHtcbiAgICB0b3RhbFNpemU6IDAsXG4gICAgbWV0YTogW10sXG4gICAgZGF0YTogbnVsbFxuICB9O1xuXG4gIHZhciBwcm9taXNlcyA9IGJsb2JzLm1hcChmdW5jdGlvbihibG9iKSB7XG4gICAgdmFyIHBvc2l0aW9uID0gcmVzdWx0LnRvdGFsU2l6ZTtcblxuICAgIHJlc3VsdC50b3RhbFNpemUgKz0gYmxvYi5zaXplO1xuXG4gICAgcmVzdWx0Lm1ldGEucHVzaCh7IHR5cGU6IGJsb2IudHlwZSwgc2l6ZTogYmxvYi5zaXplIH0pO1xuXG4gICAgcmV0dXJuIGJsb2JUb0FycmF5QnVmZmVyKGJsb2IpLnRoZW4oZnVuY3Rpb24oYnVmZmVyKSB7XG4gICAgICByZXN1bHQuZGF0YS5zZXQobmV3IFVpbnQ4QXJyYXkoYnVmZmVyKSwgcG9zaXRpb24pO1xuICAgIH0pO1xuICB9KTtcblxuICByZXN1bHQuZGF0YSA9IG5ldyBVaW50OEFycmF5KHJlc3VsdC50b3RhbFNpemUpO1xuXG4gIHJldHVybiBQcm9taXNlLmFsbChwcm9taXNlcykudGhlbihmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9KTtcbn1cblxuZnVuY3Rpb24gYmxvYlRvQXJyYXlCdWZmZXIoYmxvYikge1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSkge1xuICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuXG4gICAgcmVhZGVyLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWRlbmQnLCBmdW5jdGlvbigpIHtcbiAgICAgIHJlc29sdmUocmVhZGVyLnJlc3VsdCk7XG4gICAgfSk7XG5cbiAgICByZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIoYmxvYik7XG4gIH0pO1xufVxuXG5leHBvcnQgZGVmYXVsdCB7XG4gIHNlbmQ6IGZ1bmN0aW9uKG1lc3NhZ2UsIGJsb2JzKSB7XG4gICAgdmFyIGJsb2JzSm9pblByb21pc2UgPSAhYmxvYnMgfHwgIWJsb2JzLmxlbmd0aCA/XG4gICAgICBQcm9taXNlLnJlc29sdmUoKSA6IGpvaW5CbG9icyhibG9icyk7XG5cbiAgICByZXR1cm4gYmxvYnNKb2luUHJvbWlzZS50aGVuKGZ1bmN0aW9uKGJsb2JzKSB7XG4gICAgICBpZiAoYmxvYnMpIHtcbiAgICAgICAgbWVzc2FnZS5fX2Jsb2JzID0gYmxvYnMubWV0YTtcbiAgICAgIH1cblxuICAgICAgdmFyIHNlcmlhbGl6ZWRBcHBsaWNhdGlvbk1lc3NhZ2UgPSBVdGlscy5zdHJpbmdUb0FycmF5KFxuICAgICAgICBKU09OLnN0cmluZ2lmeShtZXNzYWdlKVxuICAgICAgKTtcblxuICAgICAgdmFyIGFwcGxpY2F0aW9uTWVzc2FnZUxlbmd0aCA9IHNlcmlhbGl6ZWRBcHBsaWNhdGlvbk1lc3NhZ2UubGVuZ3RoO1xuXG4gICAgICAvLyBUd28gYnl0ZXMgdG8gaGF2ZSBzaXplIG9mIGFwcGxpY2F0aW9uIG1lc3NhZ2UgaW4gam9pbmVkIGRhdGEgYXJyYXlcbiAgICAgIHZhciBkYXRhVG9TZW5kID0gbmV3IFVpbnQ4QXJyYXkoXG4gICAgICAgIDIgKyBhcHBsaWNhdGlvbk1lc3NhZ2VMZW5ndGggKyAoYmxvYnMgPyBibG9icy5kYXRhLmxlbmd0aCA6IDApXG4gICAgICApO1xuXG4gICAgICAvLyBXcml0ZSBzZXJpYWxpemVkIGFwcGxpY2F0aW9uIG1lc3NhZ2UgbGVuZ3RoXG4gICAgICBVdGlscy53cml0ZVVJbnQxNihkYXRhVG9TZW5kLCBhcHBsaWNhdGlvbk1lc3NhZ2VMZW5ndGgsIDApO1xuXG4gICAgICAvLyBXcml0ZSBzZXJpYWxpemVkIGFwcGxpY2F0aW9uIG1lc3NhZ2UgaXRzZWxmXG4gICAgICBkYXRhVG9TZW5kLnNldChzZXJpYWxpemVkQXBwbGljYXRpb25NZXNzYWdlLCAyKTtcblxuICAgICAgaWYgKGJsb2JzKSB7XG4gICAgICAgIGRhdGFUb1NlbmQuc2V0KGJsb2JzLmRhdGEsIDIgKyAgYXBwbGljYXRpb25NZXNzYWdlTGVuZ3RoKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGRhdGFUb1NlbmQ7XG4gICAgfSk7XG4gIH0sXG5cbiAgcmVjZWl2ZTogZnVuY3Rpb24obWVzc2FnZURhdGEpIHtcbiAgICB2YXIgZGF0YSA9IG5ldyBVaW50OEFycmF5KG1lc3NhZ2VEYXRhKTtcbiAgICB2YXIgZGF0YU9mZnNldCA9IDI7XG4gICAgdmFyIGFwcGxpY2F0aW9uTWVzc2FnZUxlbmd0aCA9IChkYXRhWzBdIDw8IDgpICsgZGF0YVsxXTtcblxuICAgIHZhciBhcHBsaWNhdGlvbk1lc3NhZ2UgPSBKU09OLnBhcnNlKFxuICAgICAgU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShcbiAgICAgICAgbnVsbCwgZGF0YS5zdWJhcnJheShkYXRhT2Zmc2V0LCBkYXRhT2Zmc2V0ICsgYXBwbGljYXRpb25NZXNzYWdlTGVuZ3RoKVxuICAgICAgKVxuICAgICk7XG5cbiAgICB2YXIgYmxvYnMsIHBvc2l0aW9uO1xuICAgIGlmIChhcHBsaWNhdGlvbk1lc3NhZ2UuX19ibG9icyAmJiBhcHBsaWNhdGlvbk1lc3NhZ2UuX19ibG9icy5sZW5ndGgpIHtcbiAgICAgIHBvc2l0aW9uID0gZGF0YU9mZnNldCArIGFwcGxpY2F0aW9uTWVzc2FnZUxlbmd0aDtcbiAgICAgIGJsb2JzID0gYXBwbGljYXRpb25NZXNzYWdlLl9fYmxvYnMubWFwKGZ1bmN0aW9uKG1ldGEpIHtcbiAgICAgICAgcG9zaXRpb24gKz0gbWV0YS5zaXplO1xuICAgICAgICByZXR1cm4gbmV3IEJsb2IoXG4gICAgICAgICAgW2RhdGEuc3ViYXJyYXkocG9zaXRpb24gLSBtZXRhLnNpemUsIHBvc2l0aW9uKV0sXG4gICAgICAgICAgeyB0eXBlOiBtZXRhLnR5cGUgfVxuICAgICAgICApO1xuICAgICAgfSk7XG5cbiAgICAgIGRlbGV0ZSBhcHBsaWNhdGlvbk1lc3NhZ2UuX19ibG9icztcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgbWVzc2FnZTogYXBwbGljYXRpb25NZXNzYWdlLFxuICAgICAgYmxvYnM6IGJsb2JzXG4gICAgfTtcbiAgfVxufTtcbiJdfQ==
