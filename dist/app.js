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

    navigator.mozGetUserMedia({ video: true, fake: true }, function (stream) {
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

var RTCPeerConnection = mozRTCPeerConnection || webkitRTCPeerConnection;

var RTCSessionDescription = mozRTCSessionDescription || webkitRTCSessionDescription;

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvcHJvamVjdHMvZ2l0aHViL2Z4b3MtcmVtb3RlLW1hbmFnZXIvc3JjL2pzL2FwcC5lczYuanMiLCIvcHJvamVjdHMvZ2l0aHViL2Z4b3MtcmVtb3RlLW1hbmFnZXIvY29tcG9uZW50cy9ldmVudC1kaXNwYXRjaGVyLWpzL2V2ZW50LWRpc3BhdGNoZXIuZXM2LmpzIiwiL3Byb2plY3RzL2dpdGh1Yi9meG9zLXJlbW90ZS1tYW5hZ2VyL2NvbXBvbmVudHMvZnhvcy13ZWJzb2NrZXQtc2VydmVyL3NyYy91dGlscy5lczYuanMiLCIvcHJvamVjdHMvZ2l0aHViL2Z4b3MtcmVtb3RlLW1hbmFnZXIvc3JjL2pzL3BlZXItY29ubmVjdGlvbi5lczYuanMiLCIvcHJvamVjdHMvZ2l0aHViL2Z4b3MtcmVtb3RlLW1hbmFnZXIvc3JjL2pzL3RyYW5zcG9ydC5lczYuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozt5QkNJc0Isb0JBQW9COzs7OzhCQUNmLDBCQUEwQjs7OztBQUVyRCxNQUFNLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLFlBQVc7QUFDekMsTUFBSSxVQUFVLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQzs7QUFFdkQsTUFBSSxjQUFjLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUMzRCxNQUFJLGtCQUFrQixHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsQ0FBQzs7QUFFbkUsTUFBSSxNQUFNLEdBQUc7QUFDWCxtQkFBZSxFQUFFLFFBQVEsQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUM7QUFDNUQsZ0JBQVksRUFBRSxRQUFRLENBQUMsY0FBYyxDQUFDLHNCQUFzQixDQUFDO0dBQzlELENBQUM7O0FBRUYsTUFBSSxJQUFJLEdBQUc7QUFD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LENBQUMsVUFBUyxJQUFJLEVBQUU7QUFDcEQsZ0JBQVEsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDO0FBQ3RCLGVBQU8sSUFBSSxJQUFJLENBQ2IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDLEVBQy9DLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FDcEIsQ0FBQztPQUNILENBQUMsQ0FBQzs7QUFFSCxhQUFPLGtCQUFrQixDQUFDLE9BQU8sQ0FBQztLQUNuQzs7QUFFRCxXQUFPO0FBQ0wsYUFBTyxFQUFFLGtCQUFrQjtBQUMzQixXQUFLLEVBQUUsS0FBSztLQUNiLENBQUM7R0FDSDtDQUNGIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qIGdsb2JhbCBXZWJTb2NrZXQsXG4gICAgICAgICAgVVJMXG4qL1xuXG5pbXBvcnQgVHJhbnNwb3J0IGZyb20gJy4vdHJhbnNwb3J0LmVzNi5qcyc7XG5pbXBvcnQgUGVlckNvbm5lY3Rpb24gZnJvbSAnLi9wZWVyLWNvbm5lY3Rpb24uZXM2LmpzJztcblxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCBmdW5jdGlvbigpIHtcbiAgdmFyIGNvbm5lY3RCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnd3MtY29ubmVjdCcpO1xuXG4gIHZhciB3c0FkZHJlc3NJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd3cy1hZGRyZXNzJyk7XG4gIHZhciByZW1vdGVMb2dnaW5nSW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVtb3RlLWxvZ2dpbmcnKTtcblxuICB2YXIgc2NyZWVuID0ge1xuICAgIGJyaWdodG5lc3NJbnB1dDogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Bvd2VyLWJyaWdodG5lc3MnKSxcbiAgICBlbmFibGVkSW5wdXQ6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwb3dlci1zY3JlZW4tZW5hYmxlZCcpXG4gIH07XG5cbiAgdmFyIHBlZXIgPSB7XG4gICAgY29ubmVjdEJ0bjogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3J0Yy1jb25uZWN0JyksXG4gICAgZGlzY29ubmVjdEJ0bjogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3J0Yy1kaXNjb25uZWN0JyksXG4gICAgZmFjaW5nTW9kZTogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3J0Yy1mYWNpbmctbW9kZScpXG4gIH07XG5cbiAgdmFyIGNhbWVyYSA9IHtcbiAgICBmbGFzaE1vZGVTZWxlY3Q6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmbGFzaC1tb2RlJyksXG4gICAgdGFrZVBpY3R1cmVCdG46IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0YWtlLXBpY3R1cmUnKSxcbiAgICBjYW1lcmFQaWN0dXJlSW1nOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FtZXJhLXBpY3R1cmUnKSxcbiAgICBjYW1lcmFWaWRlbzogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbWVyYS12aWRlbycpXG4gIH07XG5cbiAgdmFyIGJhdHRlcnkgPSB7XG4gICAgbGV2ZWxMYWJlbDogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhdHRlcnktbGV2ZWwnKSxcbiAgICByZWZyZXNoQnRuOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVmcmVzaC1iYXR0ZXJ5LXN0YXR1cycpXG4gIH07XG5cbiAgdmFyIHN0b3JhZ2UgPSB7XG4gICAgcmV0cmlldmVCdG46IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXRyaWV2ZS1maWxlLWxpc3QnKSxcbiAgICBmaWxlTGlzdDogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ZpbGUtbGlzdCcpXG4gIH07XG5cbiAgdmFyIGNvbm5lY3Rpb25TdGF0dXNMYWJlbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd3cy1jb25uZWN0aW9uLXN0YXR1cycpO1xuXG4gIHZhciBjb25uZWN0aW9ucyA9IHdpbmRvdy5jb25uZWN0aW9ucyA9IHtcbiAgICB3ZWJzb2NrZXQ6IG51bGwsXG4gICAgcGVlcjogbnVsbFxuICB9O1xuXG4gIGZ1bmN0aW9uIGNsb3NlUGVlckNvbm5lY3Rpb24oKSB7XG4gICAgcGVlci5jb25uZWN0QnRuLmRpc2FibGVkID0gZmFsc2U7XG4gICAgcGVlci5kaXNjb25uZWN0QnRuLmRpc2FibGVkID0gdHJ1ZTtcbiAgICBwZWVyLmZhY2luZ01vZGUuZGlzYWJsZWQgPSBmYWxzZTtcblxuICAgIGlmIChjb25uZWN0aW9ucy5wZWVyKSB7XG4gICAgICBjb25uZWN0aW9ucy5wZWVyLmNsb3NlKCk7XG4gICAgICBjb25uZWN0aW9ucy5wZWVyID0gbnVsbDtcblxuICAgICAgY2FtZXJhLmNhbWVyYVZpZGVvLnBhdXNlKCk7XG4gICAgICBjYW1lcmEuY2FtZXJhVmlkZW8ubW96U3JjT2JqZWN0ID0gbnVsbDtcblxuICAgICAgc2VuZCh7XG4gICAgICAgIHR5cGU6ICdwZWVyJyxcbiAgICAgICAgbWV0aG9kOiAnY2xvc2UnXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBzZW5kKGFwcGxpY2F0aW9uTWVzc2FnZSwgYmxvYnMpIHtcbiAgICBUcmFuc3BvcnQuc2VuZChhcHBsaWNhdGlvbk1lc3NhZ2UsIGJsb2JzKS50aGVuKGZ1bmN0aW9uKGRhdGFUb1NlbmQpIHtcbiAgICAgIGNvbm5lY3Rpb25zLndlYnNvY2tldC5zZW5kKGRhdGFUb1NlbmQpO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0UmVhZHlTdGF0ZSgpIHtcbiAgICB2YXIgc3RhdHVzU3RyaW5nID0gJ1VOS05PV04nO1xuICAgIHZhciByZWFkeVN0YXRlID0gY29ubmVjdGlvbnMud2Vic29ja2V0LnJlYWR5U3RhdGU7XG5cbiAgICBzd2l0Y2ggKHJlYWR5U3RhdGUpIHtcbiAgICAgIGNhc2UgMDpcbiAgICAgICAgc3RhdHVzU3RyaW5nID0gJ0NPTk5FQ1RJTkcnO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAxOlxuICAgICAgICBzdGF0dXNTdHJpbmcgPSAnT1BFTic7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDI6XG4gICAgICAgIHN0YXR1c1N0cmluZyA9ICdDTE9TSU5HJztcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMzpcbiAgICAgICAgc3RhdHVzU3RyaW5nID0gJ0NMT1NFRCc7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGlmIChyZWFkeVN0YXRlID09PSAwIHx8IHJlYWR5U3RhdGUgPT09IDIpIHtcbiAgICAgIHNldFRpbWVvdXQoc2V0UmVhZHlTdGF0ZSwgNTAwKTtcbiAgICB9XG5cbiAgICBjb25uZWN0aW9uU3RhdHVzTGFiZWwudGV4dENvbnRlbnQgPSBzdGF0dXNTdHJpbmc7XG4gIH1cblxuICBjb25uZWN0QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgY29ubmVjdGlvbnMud2Vic29ja2V0ID0gbmV3IFdlYlNvY2tldChcbiAgICAgICd3czovL3thZGRyZXNzfTo4MDA4Jy5yZXBsYWNlKCd7YWRkcmVzc30nLCB3c0FkZHJlc3NJbnB1dC52YWx1ZSlcbiAgICApO1xuXG4gICAgY29ubmVjdGlvbnMud2Vic29ja2V0LmJpbmFyeVR5cGUgPSAnYXJyYXlidWZmZXInO1xuXG4gICAgc2V0UmVhZHlTdGF0ZSgpO1xuXG4gICAgY29ubmVjdGlvbnMud2Vic29ja2V0Lm9ubWVzc2FnZSA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgIHZhciBkYXRhID0gVHJhbnNwb3J0LnJlY2VpdmUoZS5kYXRhKTtcbiAgICAgIHZhciBtZXNzYWdlID0gZGF0YS5tZXNzYWdlO1xuXG4gICAgICBpZiAobWVzc2FnZS50eXBlID09PSAnY29uc29sZScpIHtcbiAgICAgICAgY29uc29sZVttZXNzYWdlLm1ldGhvZF0uYXBwbHkoY29uc29sZSwgbWVzc2FnZS5hcmdzKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAobWVzc2FnZS50eXBlID09PSAnYmF0dGVyeScpIHtcbiAgICAgICAgaWYgKG1lc3NhZ2UubWV0aG9kID09PSAnc3RhdHVzJykge1xuICAgICAgICAgIGJhdHRlcnkubGV2ZWxMYWJlbC50ZXh0Q29udGVudCA9IG1lc3NhZ2UudmFsdWUubGV2ZWw7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gJ2NhbWVyYScpIHtcbiAgICAgICAgaWYgKG1lc3NhZ2UubWV0aG9kID09PSAncGljdHVyZScpIHtcbiAgICAgICAgICBjYW1lcmEuY2FtZXJhUGljdHVyZUltZy5zcmMgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGRhdGEuYmxvYnNbMF0pO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtZXNzYWdlLm1ldGhvZCA9PT0gJ2NhcGFiaWxpdGllcycpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnY2FwYWJpbGl0aWVzOiAlcycsIEpTT04uc3RyaW5naWZ5KG1lc3NhZ2UudmFsdWUpKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChtZXNzYWdlLnR5cGUgPT09ICdwZWVyJykge1xuICAgICAgICBpZiAobWVzc2FnZS5tZXRob2QgPT09ICdhbnN3ZXInKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ0Fuc3dlciByZWNlaXZlZCAlcycsIEpTT04uc3RyaW5naWZ5KG1lc3NhZ2UudmFsdWUpKTtcbiAgICAgICAgICBjb25uZWN0aW9ucy5wZWVyLmFjY2VwdEFuc3dlcihtZXNzYWdlLnZhbHVlKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAobWVzc2FnZS50eXBlID09PSAnc3RvcmFnZScpIHtcbiAgICAgICAgaWYgKG1lc3NhZ2UubWV0aG9kID09PSAnbGlzdCcpIHtcbiAgICAgICAgICBtZXNzYWdlLnZhbHVlLm5hbWVzLmZvckVhY2goZnVuY3Rpb24obmFtZSwgaW5kZXgpIHtcbiAgICAgICAgICAgIHZhciBsaSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XG5cbiAgICAgICAgICAgIHZhciBibG9iVXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChkYXRhLmJsb2JzW2luZGV4XSk7XG5cbiAgICAgICAgICAgIHZhciBmaWxlTmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICAgICAgICAgIGZpbGVOYW1lLnRleHRDb250ZW50ID0gbmFtZTtcbiAgICAgICAgICAgIGZpbGVOYW1lLmhyZWYgPSBibG9iVXJsO1xuICAgICAgICAgICAgZmlsZU5hbWUuZG93bmxvYWQgPSBuYW1lO1xuXG4gICAgICAgICAgICB2YXIgaW1nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG4gICAgICAgICAgICBpbWcuc3JjID0gYmxvYlVybDtcblxuICAgICAgICAgICAgdmFyIGRlbGV0ZUJ1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpO1xuICAgICAgICAgICAgZGVsZXRlQnV0dG9uLnR5cGUgPSAnYnV0dG9uJztcbiAgICAgICAgICAgIGRlbGV0ZUJ1dHRvbi50ZXh0Q29udGVudCA9ICdEZWxldGUnO1xuICAgICAgICAgICAgZGVsZXRlQnV0dG9uLmRhdGFzZXQuaWQgPSBuYW1lO1xuXG4gICAgICAgICAgICBsaS5hcHBlbmRDaGlsZChmaWxlTmFtZSk7XG4gICAgICAgICAgICBsaS5hcHBlbmRDaGlsZChpbWcpO1xuICAgICAgICAgICAgbGkuYXBwZW5kQ2hpbGQoZGVsZXRlQnV0dG9uKTtcblxuICAgICAgICAgICAgc3RvcmFnZS5maWxlTGlzdC5hcHBlbmRDaGlsZChsaSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcblxuICBzY3JlZW4uYnJpZ2h0bmVzc0lucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgIHNlbmQoe1xuICAgICAgdHlwZTogJ3Bvd2VyJyxcbiAgICAgIG1ldGhvZDogJ2JyaWdodG5lc3MnLFxuICAgICAgdmFsdWU6IHNjcmVlbi5icmlnaHRuZXNzSW5wdXQudmFsdWVcbiAgICB9KTtcbiAgfSk7XG5cbiAgc2NyZWVuLmVuYWJsZWRJbnB1dC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICBzZW5kKHtcbiAgICAgIHR5cGU6ICdwb3dlcicsXG4gICAgICBtZXRob2Q6ICdzY3JlZW4tZW5hYmxlZCcsXG4gICAgICB2YWx1ZTogc2NyZWVuLmVuYWJsZWRJbnB1dC5jaGVja2VkXG4gICAgfSk7XG4gIH0pO1xuXG4gIHJlbW90ZUxvZ2dpbmdJbnB1dC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICBzZW5kKHtcbiAgICAgIHR5cGU6ICdsb2dnZXInLFxuICAgICAgbWV0aG9kOiByZW1vdGVMb2dnaW5nSW5wdXQuY2hlY2tlZCA/ICdvbicgOiAnb2ZmJ1xuICAgIH0pO1xuICB9KTtcblxuICBiYXR0ZXJ5LnJlZnJlc2hCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICBzZW5kKHsgdHlwZTogJ2JhdHRlcnknLCBtZXRob2Q6ICdzdGF0dXMnfSk7XG4gIH0pO1xuXG4gIGNhbWVyYS5mbGFzaE1vZGVTZWxlY3QuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgc2VuZCh7XG4gICAgICB0eXBlOiAnY2FtZXJhJyxcbiAgICAgIG1ldGhvZDogJ2ZsYXNoLW1vZGUnLFxuICAgICAgdmFsdWU6IGNhbWVyYS5mbGFzaE1vZGVTZWxlY3QudmFsdWVcbiAgICB9KTtcbiAgfSk7XG5cbiAgY2FtZXJhLnRha2VQaWN0dXJlQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgaWYgKGNvbm5lY3Rpb25zLnBlZXIpIHtcbiAgICAgIHZhciBjb25maXJtTWVzc2FnZSA9XG4gICAgICAgICdQZWVyIGNvbm5lY3Rpb24gaXMgYWN0aXZlISBEbyB5b3Ugd2FudCB0byBjbG9zZSBpdD8nO1xuICAgICAgaWYod2luZG93LmNvbmZpcm0oY29uZmlybU1lc3NhZ2UpKSB7XG4gICAgICAgIGNsb3NlUGVlckNvbm5lY3Rpb24oKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBzZW5kKHtcbiAgICAgIHR5cGU6ICdjYW1lcmEnLFxuICAgICAgbWV0aG9kOiAndGFrZS1waWN0dXJlJ1xuICAgIH0pO1xuICB9KTtcblxuICBwZWVyLmNvbm5lY3RCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICBjb25uZWN0aW9ucy5wZWVyID0gbmV3IFBlZXJDb25uZWN0aW9uKCk7XG5cbiAgICBjb25uZWN0aW9ucy5wZWVyLm9uKCdpY2UtY2FuZGlkYXRlJywgZnVuY3Rpb24oY2FuZGlkYXRlKSB7XG4gICAgICAvLyBGaXJpbmcgdGhpcyBjYWxsYmFjayB3aXRoIGEgbnVsbCBjYW5kaWRhdGUgaW5kaWNhdGVzIHRoYXQgdHJpY2tsZSBJQ0VcbiAgICAgIC8vIGdhdGhlcmluZyBoYXMgZmluaXNoZWQsIGFuZCBhbGwgdGhlIGNhbmRpZGF0ZXMgYXJlIG5vdyBwcmVzZW50IGluXG4gICAgICAvLyBcImxvY2FsRGVzY3JpcHRpb25cIi4gV2FpdGluZyB1bnRpbCBub3cgdG8gY3JlYXRlIHRoZSBhbnN3ZXIgc2F2ZXMgdXNcbiAgICAgIC8vIGZyb20gaGF2aW5nIHRvIHNlbmQgb2ZmZXIgKyBhbnN3ZXIgKyBpY2VDYW5kaWRhdGVzIHNlcGFyYXRlbHkuXG4gICAgICBpZiAoY2FuZGlkYXRlID09PSBudWxsKSB7XG4gICAgICAgIHZhciBvZmZlciA9IGNvbm5lY3Rpb25zLnBlZXIuZ2V0TG9jYWxEZXNjcmlwdGlvbigpO1xuXG4gICAgICAgIHNlbmQoe1xuICAgICAgICAgIHR5cGU6ICdwZWVyJyxcbiAgICAgICAgICBtZXRob2Q6ICdvZmZlcicsXG4gICAgICAgICAgdmFsdWU6IHtcbiAgICAgICAgICAgIHR5cGU6IG9mZmVyLnR5cGUsXG4gICAgICAgICAgICBzZHA6IG9mZmVyLnNkcFxuICAgICAgICAgIH0sXG4gICAgICAgICAgZmFjaW5nTW9kZTogcGVlci5mYWNpbmdNb2RlLnZhbHVlXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY29ubmVjdGlvbnMucGVlci5vbignYWRkLXN0cmVhbScsIGZ1bmN0aW9uKHN0cmVhbSkge1xuICAgICAgY2FtZXJhLmNhbWVyYVZpZGVvLm1velNyY09iamVjdCA9IHN0cmVhbTtcbiAgICAgIGNhbWVyYS5jYW1lcmFWaWRlby5wbGF5KCk7XG4gICAgfSk7XG5cbiAgICBuYXZpZ2F0b3IubW96R2V0VXNlck1lZGlhKHsgdmlkZW86IHRydWUsIGZha2U6IHRydWUgfSwgZnVuY3Rpb24oc3RyZWFtKSB7XG4gICAgICBjb25uZWN0aW9ucy5wZWVyLmFkZFN0cmVhbShzdHJlYW0pO1xuXG4gICAgICBjb25uZWN0aW9ucy5wZWVyLmNyZWF0ZU9mZmVyKHtcbiAgICAgICAgb2ZmZXJUb1JlY2VpdmVBdWRpbzogZmFsc2UsXG4gICAgICAgIG9mZmVyVG9SZWNlaXZlVmlkZW86IHRydWVcbiAgICAgIH0pO1xuICAgIH0sIGZ1bmN0aW9uKGUpIHt9KTtcblxuICAgIHBlZXIuY29ubmVjdEJ0bi5kaXNhYmxlZCA9IHRydWU7XG4gICAgcGVlci5kaXNjb25uZWN0QnRuLmRpc2FibGVkID0gZmFsc2U7XG4gICAgcGVlci5mYWNpbmdNb2RlLmRpc2FibGVkID0gdHJ1ZTtcbiAgfSk7XG5cbiAgcGVlci5kaXNjb25uZWN0QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgY2xvc2VQZWVyQ29ubmVjdGlvbigpO1xuICB9KTtcblxuICBzdG9yYWdlLnJldHJpZXZlQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgc3RvcmFnZS5maWxlTGlzdC50ZXh0Q29udGVudCA9ICcnO1xuXG4gICAgc2VuZCh7XG4gICAgICB0eXBlOiAnc3RvcmFnZScsXG4gICAgICBtZXRob2Q6ICdsaXN0JyxcbiAgICAgIHBhZ2VTaXplOiA1XG4gICAgfSk7XG4gIH0pO1xuXG4gIHN0b3JhZ2UuZmlsZUxpc3QuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgaWYgKGUudGFyZ2V0Lm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgPT09ICdidXR0b24nKSB7XG4gICAgICBzZW5kKHtcbiAgICAgICAgdHlwZTogJ3N0b3JhZ2UnLFxuICAgICAgICBtZXRob2Q6ICdkZWxldGUnLFxuICAgICAgICB2YWx1ZTogZS50YXJnZXQuZGF0YXNldC5pZFxuICAgICAgfSk7XG5cbiAgICAgIGUudGFyZ2V0LmNsb3Nlc3QoJ2xpJykucmVtb3ZlKCk7XG4gICAgfVxuICB9KTtcbn0pO1xuIiwiLypnbG9iYWwgTWFwLCBTZXQgKi9cblxuZnVuY3Rpb24gZW5zdXJlVmFsaWRFdmVudE5hbWUoZXZlbnROYW1lKSB7XG4gIGlmICghZXZlbnROYW1lIHx8IHR5cGVvZiBldmVudE5hbWUgIT09ICdzdHJpbmcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdFdmVudCBuYW1lIHNob3VsZCBiZSBhIHZhbGlkIG5vbi1lbXB0eSBzdHJpbmchJyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZW5zdXJlVmFsaWRIYW5kbGVyKGhhbmRsZXIpIHtcbiAgaWYgKHR5cGVvZiBoYW5kbGVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdIYW5kbGVyIHNob3VsZCBiZSBhIGZ1bmN0aW9uIScpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGVuc3VyZUFsbG93ZWRFdmVudE5hbWUoYWxsb3dlZEV2ZW50cywgZXZlbnROYW1lKSB7XG4gIGlmIChhbGxvd2VkRXZlbnRzICYmIGFsbG93ZWRFdmVudHMuaW5kZXhPZihldmVudE5hbWUpIDwgMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignRXZlbnQgXCInICsgZXZlbnROYW1lICsgJ1wiIGlzIG5vdCBhbGxvd2VkIScpO1xuICB9XG59XG5cbi8vIEltcGxlbWVudHMgcHVibGlzaC9zdWJzY3JpYmUgYmVoYXZpb3VyIHRoYXQgY2FuIGJlIGFwcGxpZWQgdG8gYW55IG9iamVjdCxcbi8vIHNvIHRoYXQgb2JqZWN0IGNhbiBiZSBsaXN0ZW5lZCBmb3IgY3VzdG9tIGV2ZW50cy4gXCJ0aGlzXCIgY29udGV4dCBpcyB0aGVcbi8vIG9iamVjdCB3aXRoIE1hcCBcImxpc3RlbmVyc1wiIHByb3BlcnR5IHVzZWQgdG8gc3RvcmUgaGFuZGxlcnMuXG52YXIgZXZlbnREaXNwYXRjaGVyID0ge1xuICAvKipcbiAgICogUmVnaXN0ZXJzIGxpc3RlbmVyIGZ1bmN0aW9uIHRvIGJlIGV4ZWN1dGVkIG9uY2UgZXZlbnQgb2NjdXJzLlxuICAgKiBAcGFyYW0ge3N0cmluZ30gZXZlbnROYW1lIE5hbWUgb2YgdGhlIGV2ZW50IHRvIGxpc3RlbiBmb3IuXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGhhbmRsZXIgSGFuZGxlciB0byBiZSBleGVjdXRlZCBvbmNlIGV2ZW50IG9jY3Vycy5cbiAgICovXG4gIG9uOiBmdW5jdGlvbihldmVudE5hbWUsIGhhbmRsZXIpIHtcbiAgICBlbnN1cmVWYWxpZEV2ZW50TmFtZShldmVudE5hbWUpO1xuICAgIGVuc3VyZUFsbG93ZWRFdmVudE5hbWUodGhpcy5hbGxvd2VkRXZlbnRzLCBldmVudE5hbWUpO1xuICAgIGVuc3VyZVZhbGlkSGFuZGxlcihoYW5kbGVyKTtcblxuICAgIHZhciBoYW5kbGVycyA9IHRoaXMubGlzdGVuZXJzLmdldChldmVudE5hbWUpO1xuXG4gICAgaWYgKCFoYW5kbGVycykge1xuICAgICAgaGFuZGxlcnMgPSBuZXcgU2V0KCk7XG4gICAgICB0aGlzLmxpc3RlbmVycy5zZXQoZXZlbnROYW1lLCBoYW5kbGVycyk7XG4gICAgfVxuXG4gICAgLy8gU2V0LmFkZCBpZ25vcmVzIGhhbmRsZXIgaWYgaXQgaGFzIGJlZW4gYWxyZWFkeSByZWdpc3RlcmVkXG4gICAgaGFuZGxlcnMuYWRkKGhhbmRsZXIpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIHJlZ2lzdGVyZWQgbGlzdGVuZXIgZm9yIHRoZSBzcGVjaWZpZWQgZXZlbnQuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBldmVudE5hbWUgTmFtZSBvZiB0aGUgZXZlbnQgdG8gcmVtb3ZlIGxpc3RlbmVyIGZvci5cbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gaGFuZGxlciBIYW5kbGVyIHRvIHJlbW92ZSwgc28gaXQgd29uJ3QgYmUgZXhlY3V0ZWRcbiAgICogbmV4dCB0aW1lIGV2ZW50IG9jY3Vycy5cbiAgICovXG4gIG9mZjogZnVuY3Rpb24oZXZlbnROYW1lLCBoYW5kbGVyKSB7XG4gICAgZW5zdXJlVmFsaWRFdmVudE5hbWUoZXZlbnROYW1lKTtcbiAgICBlbnN1cmVBbGxvd2VkRXZlbnROYW1lKHRoaXMuYWxsb3dlZEV2ZW50cywgZXZlbnROYW1lKTtcbiAgICBlbnN1cmVWYWxpZEhhbmRsZXIoaGFuZGxlcik7XG5cbiAgICB2YXIgaGFuZGxlcnMgPSB0aGlzLmxpc3RlbmVycy5nZXQoZXZlbnROYW1lKTtcblxuICAgIGlmICghaGFuZGxlcnMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBoYW5kbGVycy5kZWxldGUoaGFuZGxlcik7XG5cbiAgICBpZiAoIWhhbmRsZXJzLnNpemUpIHtcbiAgICAgIHRoaXMubGlzdGVuZXJzLmRlbGV0ZShldmVudE5hbWUpO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogUmVtb3ZlcyBhbGwgcmVnaXN0ZXJlZCBsaXN0ZW5lcnMgZm9yIHRoZSBzcGVjaWZpZWQgZXZlbnQuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBldmVudE5hbWUgTmFtZSBvZiB0aGUgZXZlbnQgdG8gcmVtb3ZlIGFsbCBsaXN0ZW5lcnMgZm9yLlxuICAgKi9cbiAgb2ZmQWxsOiBmdW5jdGlvbihldmVudE5hbWUpIHtcbiAgICBpZiAodHlwZW9mIGV2ZW50TmFtZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHRoaXMubGlzdGVuZXJzLmNsZWFyKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZW5zdXJlVmFsaWRFdmVudE5hbWUoZXZlbnROYW1lKTtcbiAgICBlbnN1cmVBbGxvd2VkRXZlbnROYW1lKHRoaXMuYWxsb3dlZEV2ZW50cywgZXZlbnROYW1lKTtcblxuICAgIHZhciBoYW5kbGVycyA9IHRoaXMubGlzdGVuZXJzLmdldChldmVudE5hbWUpO1xuXG4gICAgaWYgKCFoYW5kbGVycykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGhhbmRsZXJzLmNsZWFyKCk7XG5cbiAgICB0aGlzLmxpc3RlbmVycy5kZWxldGUoZXZlbnROYW1lKTtcbiAgfSxcblxuICAvKipcbiAgICogRW1pdHMgc3BlY2lmaWVkIGV2ZW50IHNvIHRoYXQgYWxsIHJlZ2lzdGVyZWQgaGFuZGxlcnMgd2lsbCBiZSBjYWxsZWRcbiAgICogd2l0aCB0aGUgc3BlY2lmaWVkIHBhcmFtZXRlcnMuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBldmVudE5hbWUgTmFtZSBvZiB0aGUgZXZlbnQgdG8gY2FsbCBoYW5kbGVycyBmb3IuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbWV0ZXJzIE9wdGlvbmFsIHBhcmFtZXRlcnMgdGhhdCB3aWxsIGJlIHBhc3NlZCB0b1xuICAgKiBldmVyeSByZWdpc3RlcmVkIGhhbmRsZXIuXG4gICAqL1xuICBlbWl0OiBmdW5jdGlvbihldmVudE5hbWUsIHBhcmFtZXRlcnMpIHtcbiAgICBlbnN1cmVWYWxpZEV2ZW50TmFtZShldmVudE5hbWUpO1xuICAgIGVuc3VyZUFsbG93ZWRFdmVudE5hbWUodGhpcy5hbGxvd2VkRXZlbnRzLCBldmVudE5hbWUpO1xuXG4gICAgdmFyIGhhbmRsZXJzID0gdGhpcy5saXN0ZW5lcnMuZ2V0KGV2ZW50TmFtZSk7XG5cbiAgICBpZiAoIWhhbmRsZXJzKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaGFuZGxlcnMuZm9yRWFjaChmdW5jdGlvbihoYW5kbGVyKSB7XG4gICAgICB0cnkge1xuICAgICAgICBoYW5kbGVyKHBhcmFtZXRlcnMpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59O1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIC8qKlxuICAgKiBNaXhlcyBkaXNwYXRjaGVyIG1ldGhvZHMgaW50byB0YXJnZXQgb2JqZWN0LlxuICAgKiBAcGFyYW0ge09iamVjdH0gdGFyZ2V0IE9iamVjdCB0byBtaXggZGlzcGF0Y2hlciBtZXRob2RzIGludG8uXG4gICAqIEBwYXJhbSB7QXJyYXkuPHN0cmluZz59IGFsbG93ZWRFdmVudHMgT3B0aW9uYWwgbGlzdCBvZiB0aGUgYWxsb3dlZCBldmVudFxuICAgKiBuYW1lcyB0aGF0IGNhbiBiZSBlbWl0dGVkIGFuZCBsaXN0ZW5lZCBmb3IuXG4gICAqIEByZXR1cm5zIHtPYmplY3R9IFRhcmdldCBvYmplY3Qgd2l0aCBhZGRlZCBkaXNwYXRjaGVyIG1ldGhvZHMuXG4gICAqL1xuICBtaXhpbjogZnVuY3Rpb24odGFyZ2V0LCBhbGxvd2VkRXZlbnRzKSB7XG4gICAgaWYgKCF0YXJnZXQgfHwgdHlwZW9mIHRhcmdldCAhPT0gJ29iamVjdCcpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignT2JqZWN0IHRvIG1peCBpbnRvIHNob3VsZCBiZSB2YWxpZCBvYmplY3QhJyk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBhbGxvd2VkRXZlbnRzICE9PSAndW5kZWZpbmVkJyAmJlxuICAgICAgICAhQXJyYXkuaXNBcnJheShhbGxvd2VkRXZlbnRzKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdBbGxvd2VkIGV2ZW50cyBzaG91bGQgYmUgYSB2YWxpZCBhcnJheSBvZiBzdHJpbmdzIScpO1xuICAgIH1cblxuICAgIE9iamVjdC5rZXlzKGV2ZW50RGlzcGF0Y2hlcikuZm9yRWFjaChmdW5jdGlvbihtZXRob2QpIHtcbiAgICAgIGlmICh0eXBlb2YgdGFyZ2V0W21ldGhvZF0gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAnT2JqZWN0IHRvIG1peCBpbnRvIGFscmVhZHkgaGFzIFwiJyArIG1ldGhvZCArICdcIiBwcm9wZXJ0eSBkZWZpbmVkISdcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIHRhcmdldFttZXRob2RdID0gZXZlbnREaXNwYXRjaGVyW21ldGhvZF0uYmluZCh0aGlzKTtcbiAgICB9LCB7IGxpc3RlbmVyczogbmV3IE1hcCgpLCBhbGxvd2VkRXZlbnRzOiBhbGxvd2VkRXZlbnRzIH0pO1xuXG4gICAgcmV0dXJuIHRhcmdldDtcbiAgfVxufTtcbiIsInZhciBXZWJTb2NrZXRVdGlscyA9IHtcbiAgLyoqXG4gICAqIE1hc2sgZXZlcnkgZGF0YSBlbGVtZW50IHdpdGggdGhlIG1hc2sgKFdlYlNvY2tldCBzcGVjaWZpYyBhbGdvcml0aG0pLlxuICAgKiBAcGFyYW0ge0FycmF5fSBtYXNrIE1hc2sgYXJyYXkuXG4gICAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IERhdGEgYXJyYXkgdG8gbWFzay5cbiAgICogQHJldHVybnMge0FycmF5fSBNYXNrZWQgZGF0YSBhcnJheS5cbiAgICovXG4gIG1hc2sobWFzaywgYXJyYXkpIHtcbiAgICBpZiAobWFzaykge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICBhcnJheVtpXSA9IGFycmF5W2ldIF4gbWFza1tpICUgNF07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBhcnJheTtcbiAgfSxcblxuICAvKipcbiAgICogR2VuZXJhdGVzIDQtaXRlbSBhcnJheSwgZXZlcnkgaXRlbSBvZiB3aGljaCBpcyBlbGVtZW50IG9mIGJ5dGUgbWFzay5cbiAgICogQHJldHVybnMge1VpbnQ4QXJyYXl9XG4gICAqL1xuICBnZW5lcmF0ZVJhbmRvbU1hc2soKSB7XG4gICAgdmFyIHJhbmRvbSA9IG5ldyBVaW50OEFycmF5KDQpO1xuXG4gICAgd2luZG93LmNyeXB0by5nZXRSYW5kb21WYWx1ZXMocmFuZG9tKTtcblxuICAgIHJldHVybiByYW5kb207XG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbnZlcnRzIHN0cmluZyB0byBVaW50OEFycmF5LlxuICAgKiBAcGFyYW0ge3N0cmluZ30gc3RyaW5nVmFsdWUgU3RyaW5nIHZhbHVlIHRvIGNvbnZlcnQuXG4gICAqIEByZXR1cm5zIHtVaW50OEFycmF5fVxuICAgKi9cbiAgc3RyaW5nVG9BcnJheShzdHJpbmdWYWx1ZSkge1xuICAgIGlmICh0eXBlb2Ygc3RyaW5nVmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3N0cmluZ1ZhbHVlIHNob3VsZCBiZSB2YWxpZCBzdHJpbmchJyk7XG4gICAgfVxuXG4gICAgdmFyIGFycmF5ID0gbmV3IFVpbnQ4QXJyYXkoc3RyaW5nVmFsdWUubGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN0cmluZ1ZhbHVlLmxlbmd0aDsgaSsrKSB7XG4gICAgICBhcnJheVtpXSA9IHN0cmluZ1ZhbHVlLmNoYXJDb2RlQXQoaSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFycmF5O1xuICB9LFxuXG4gIC8qKlxuICAgKiBDb252ZXJ0cyBhcnJheSB0byBzdHJpbmcuIEV2ZXJ5IGFycmF5IGVsZW1lbnQgaXMgY29uc2lkZXJlZCBhcyBjaGFyIGNvZGUuXG4gICAqIEBwYXJhbSB7VWludDhBcnJheX0gYXJyYXkgQXJyYXkgd2l0aCB0aGUgY2hhciBjb2Rlcy5cbiAgICogQHJldHVybnMge3N0cmluZ31cbiAgICovXG4gIGFycmF5VG9TdHJpbmcoYXJyYXkpIHtcbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShudWxsLCBhcnJheSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlYWRzIHVuc2lnbmVkIDE2IGJpdCB2YWx1ZSBmcm9tIHR3byBjb25zZXF1ZW50IDgtYml0IGFycmF5IGVsZW1lbnRzLlxuICAgKiBAcGFyYW0ge1VpbnQ4QXJyYXl9IGFycmF5IEFycmF5IHRvIHJlYWQgZnJvbS5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9mZnNldCBJbmRleCB0byBzdGFydCByZWFkIHZhbHVlLlxuICAgKiBAcmV0dXJucyB7TnVtYmVyfVxuICAgKi9cbiAgcmVhZFVJbnQxNihhcnJheSwgb2Zmc2V0KSB7XG4gICAgb2Zmc2V0ID0gb2Zmc2V0IHx8IDA7XG4gICAgcmV0dXJuIChhcnJheVtvZmZzZXRdIDw8IDgpICsgYXJyYXlbb2Zmc2V0ICsgMV07XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlYWRzIHVuc2lnbmVkIDMyIGJpdCB2YWx1ZSBmcm9tIGZvdXIgY29uc2VxdWVudCA4LWJpdCBhcnJheSBlbGVtZW50cy5cbiAgICogQHBhcmFtIHtVaW50OEFycmF5fSBhcnJheSBBcnJheSB0byByZWFkIGZyb20uXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBvZmZzZXQgSW5kZXggdG8gc3RhcnQgcmVhZCB2YWx1ZS5cbiAgICogQHJldHVybnMge051bWJlcn1cbiAgICovXG4gIHJlYWRVSW50MzIoYXJyYXksIG9mZnNldCkge1xuICAgIG9mZnNldCA9IG9mZnNldCB8fCAwO1xuICAgIHJldHVybiAoYXJyYXlbb2Zmc2V0XSA8PCAyNCkgK1xuICAgICAgKGFycmF5W29mZnNldCArIDFdIDw8IDE2KSArXG4gICAgICAoYXJyYXkgW29mZnNldCArIDJdIDw8IDgpICtcbiAgICAgIGFycmF5W29mZnNldCArIDNdO1xuICB9LFxuXG4gIC8qKlxuICAgKiBXcml0ZXMgdW5zaWduZWQgMTYgYml0IHZhbHVlIHRvIHR3byBjb25zZXF1ZW50IDgtYml0IGFycmF5IGVsZW1lbnRzLlxuICAgKiBAcGFyYW0ge1VpbnQ4QXJyYXl9IGFycmF5IEFycmF5IHRvIHdyaXRlIHRvLlxuICAgKiBAcGFyYW0ge051bWJlcn0gdmFsdWUgMTYgYml0IHVuc2lnbmVkIHZhbHVlIHRvIHdyaXRlIGludG8gYXJyYXkuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBvZmZzZXQgSW5kZXggdG8gc3RhcnQgd3JpdGUgdmFsdWUuXG4gICAqIEByZXR1cm5zIHtOdW1iZXJ9XG4gICAqL1xuICB3cml0ZVVJbnQxNihhcnJheSwgdmFsdWUsIG9mZnNldCkge1xuICAgIGFycmF5W29mZnNldF0gPSAodmFsdWUgJiAweGZmMDApID4+IDg7XG4gICAgYXJyYXlbb2Zmc2V0ICsgMV0gPSB2YWx1ZSAmIDB4ZmY7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFdyaXRlcyB1bnNpZ25lZCAxNiBiaXQgdmFsdWUgdG8gdHdvIGNvbnNlcXVlbnQgOC1iaXQgYXJyYXkgZWxlbWVudHMuXG4gICAqIEBwYXJhbSB7VWludDhBcnJheX0gYXJyYXkgQXJyYXkgdG8gd3JpdGUgdG8uXG4gICAqIEBwYXJhbSB7TnVtYmVyfSB2YWx1ZSAxNiBiaXQgdW5zaWduZWQgdmFsdWUgdG8gd3JpdGUgaW50byBhcnJheS5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9mZnNldCBJbmRleCB0byBzdGFydCB3cml0ZSB2YWx1ZS5cbiAgICogQHJldHVybnMge051bWJlcn1cbiAgICovXG4gIHdyaXRlVUludDMyKGFycmF5LCB2YWx1ZSwgb2Zmc2V0KSB7XG4gICAgYXJyYXlbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYwMDAwMDApID4+IDI0O1xuICAgIGFycmF5W29mZnNldCArIDFdID0gKHZhbHVlICYgMHhmZjAwMDApID4+IDE2O1xuICAgIGFycmF5W29mZnNldCArIDJdID0gKHZhbHVlICYgMHhmZjAwKSA+PiA4O1xuICAgIGFycmF5W29mZnNldCArIDNdID0gdmFsdWUgJiAweGZmO1xuICB9XG59O1xuXG5leHBvcnQgZGVmYXVsdCBXZWJTb2NrZXRVdGlscztcbiIsIi8qIGdsb2JhbCBQcm9taXNlLFxuICAgICAgICAgIG1velJUQ1BlZXJDb25uZWN0aW9uLFxuICAgICAgICAgIG1velJUQ1Nlc3Npb25EZXNjcmlwdGlvbixcbiAgICAgICAgICB3ZWJraXRSVENQZWVyQ29ubmVjdGlvbixcbiAgICAgICAgICB3ZWJraXRSVENTZXNzaW9uRGVzY3JpcHRpb25cbiovXG5cbmltcG9ydCBFdmVudERpc3BhdGNoZXIgZnJvbSAnZXZlbnQtZGlzcGF0Y2hlci1qcyc7XG5cbnZhciBSVENQZWVyQ29ubmVjdGlvbiA9IG1velJUQ1BlZXJDb25uZWN0aW9uIHx8IHdlYmtpdFJUQ1BlZXJDb25uZWN0aW9uO1xuXG52YXIgUlRDU2Vzc2lvbkRlc2NyaXB0aW9uID0gbW96UlRDU2Vzc2lvbkRlc2NyaXB0aW9uIHx8XG4gIHdlYmtpdFJUQ1Nlc3Npb25EZXNjcmlwdGlvbjtcblxudmFyIHByaXZhdGVzID0ge1xuICBjb25uZWN0aW9uOiBTeW1ib2woJ2Nvbm5lY3Rpb24nKSxcblxuICBnZXRDb25uZWN0aW9uOiBTeW1ib2woJ2dldENvbm5lY3Rpb24nKVxufTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGVlckNvbm5lY3Rpb24ge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBFdmVudERpc3BhdGNoZXIubWl4aW4oXG4gICAgICB0aGlzLCBbJ2FkZC1zdHJlYW0nLCAnaWNlLWNhbmRpZGF0ZScsICdzaWduYWxpbmctc3RhdGUtY2hhbmdlJ11cbiAgICApO1xuXG4gICAgdmFyIGNvbm5lY3Rpb24gPSBuZXcgUlRDUGVlckNvbm5lY3Rpb24oe1xuICAgICAgaWNlU2VydmVyczogW3tcbiAgICAgICAgdXJsOiAnc3R1bjpzdHVuLmwuZ29vZ2xlLmNvbToxOTMwMicsXG4gICAgICAgIHVybHM6ICdzdHVuOnN0dW4ubC5nb29nbGUuY29tOjE5MzAyJ1xuICAgICAgfV1cbiAgICB9KTtcblxuICAgIGNvbm5lY3Rpb24uYWRkRXZlbnRMaXN0ZW5lcignaWNlY2FuZGlkYXRlJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgIHRoaXMuZW1pdCgnaWNlLWNhbmRpZGF0ZScsIGUuY2FuZGlkYXRlKTtcbiAgICB9LmJpbmQodGhpcykpO1xuXG4gICAgY29ubmVjdGlvbi5hZGRFdmVudExpc3RlbmVyKCdhZGRzdHJlYW0nLCBmdW5jdGlvbiAoZSkge1xuICAgICAgdGhpcy5lbWl0KCdhZGQtc3RyZWFtJywgZS5zdHJlYW0pO1xuICAgIH0uYmluZCh0aGlzKSk7XG5cbiAgICBjb25uZWN0aW9uLmFkZEV2ZW50TGlzdGVuZXIoJ3NpZ25hbGluZ3N0YXRlY2hhbmdlJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgIHRoaXMuZW1pdCgnc2lnbmFsaW5nLXN0YXRlLWNoYW5nZScsIGUpO1xuICAgIH0uYmluZCh0aGlzKSk7XG5cbiAgICB0aGlzW3ByaXZhdGVzLmNvbm5lY3Rpb25dID0gY29ubmVjdGlvbjtcbiAgfVxuXG4gIGdldExvY2FsRGVzY3JpcHRpb24oKSB7XG4gICAgcmV0dXJuIHRoaXNbcHJpdmF0ZXMuZ2V0Q29ubmVjdGlvbl0oKS5sb2NhbERlc2NyaXB0aW9uO1xuICB9XG5cbiAgYWRkU3RyZWFtKHN0cmVhbSkge1xuICAgIHJldHVybiB0aGlzW3ByaXZhdGVzLmdldENvbm5lY3Rpb25dKCkuYWRkU3RyZWFtKHN0cmVhbSk7XG4gIH1cblxuICBjcmVhdGVPZmZlcihvcHRpb25zKSB7XG4gICAgdmFyIGNvbm5lY3Rpb24gPSB0aGlzW3ByaXZhdGVzLmdldENvbm5lY3Rpb25dKCk7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgY29ubmVjdGlvbi5jcmVhdGVEYXRhQ2hhbm5lbCgnZGF0YS1jaGFubmVsJywgeyByZWxpYWJsZTogdHJ1ZSB9KTtcblxuICAgICAgY29ubmVjdGlvbi5jcmVhdGVPZmZlcihmdW5jdGlvbihsb2NhbERlc2NyaXB0aW9uKSB7XG4gICAgICAgIGNvbm5lY3Rpb24uc2V0TG9jYWxEZXNjcmlwdGlvbihsb2NhbERlc2NyaXB0aW9uLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXNvbHZlKGxvY2FsRGVzY3JpcHRpb24pO1xuICAgICAgICB9LCByZWplY3QpO1xuICAgICAgfSwgcmVqZWN0LCBvcHRpb25zKTtcbiAgICB9KTtcbiAgfVxuXG4gIGFjY2VwdE9mZmVyKG9mZmVyKSB7XG4gICAgdmFyIGNvbm5lY3Rpb24gPSB0aGlzW3ByaXZhdGVzLmdldENvbm5lY3Rpb25dKCk7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgdmFyIHJlbW90ZURlc2NyaXB0aW9uID0gbmV3IFJUQ1Nlc3Npb25EZXNjcmlwdGlvbihvZmZlcik7XG5cbiAgICAgIGNvbm5lY3Rpb24uc2V0UmVtb3RlRGVzY3JpcHRpb24ocmVtb3RlRGVzY3JpcHRpb24sIGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25uZWN0aW9uLmNyZWF0ZUFuc3dlcihmdW5jdGlvbihsb2NhbERlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgY29ubmVjdGlvbi5zZXRMb2NhbERlc2NyaXB0aW9uKGxvY2FsRGVzY3JpcHRpb24sIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmVzb2x2ZShsb2NhbERlc2NyaXB0aW9uKTtcbiAgICAgICAgICB9LCByZWplY3QpO1xuICAgICAgICB9LCByZWplY3QpO1xuICAgICAgfSwgcmVqZWN0KTtcbiAgICB9KTtcbiAgfVxuXG4gIGFjY2VwdEFuc3dlcihhbnN3ZXIpIHtcbiAgICB2YXIgY29ubmVjdGlvbiA9IHRoaXNbcHJpdmF0ZXMuZ2V0Q29ubmVjdGlvbl0oKTtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICBjb25uZWN0aW9uLnNldFJlbW90ZURlc2NyaXB0aW9uKFxuICAgICAgICBuZXcgUlRDU2Vzc2lvbkRlc2NyaXB0aW9uKGFuc3dlciksIGZ1bmN0aW9uKCkgeyByZXNvbHZlKCk7IH0sIHJlamVjdFxuICAgICAgKTtcbiAgICB9KTtcbiAgfVxuXG4gIGNsb3NlKCkge1xuICAgIHZhciBjb25uZWN0aW9uID0gdGhpc1twcml2YXRlcy5nZXRDb25uZWN0aW9uXSgpO1xuXG4gICAgY29ubmVjdGlvbi5nZXRMb2NhbFN0cmVhbXMoKS5mb3JFYWNoKGZ1bmN0aW9uKHN0cmVhbSkge1xuICAgICAgc3RyZWFtLnN0b3AoKTtcbiAgICB9KTtcblxuICAgIGNvbm5lY3Rpb24uY2xvc2UoKTtcblxuICAgIHRoaXNbcHJpdmF0ZXMuY29ubmVjdGlvbl0gPSBudWxsO1xuICB9XG5cbiAgW3ByaXZhdGVzLmdldENvbm5lY3Rpb25dKCkge1xuICAgIHZhciBjb25uZWN0aW9uID0gdGhpc1twcml2YXRlcy5jb25uZWN0aW9uXTtcblxuICAgIGlmICghY29ubmVjdGlvbikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb25uZWN0aW9uIGlzIGNsb3NlZCEnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY29ubmVjdGlvbjtcbiAgfVxufVxuIiwiaW1wb3J0IFV0aWxzIGZyb20gJ3dlYnNvY2tldC1zZXJ2ZXItdXRpbHMnO1xuXG5mdW5jdGlvbiBqb2luQmxvYnMoYmxvYnMpIHtcbiAgdmFyIHJlc3VsdCA9IHtcbiAgICB0b3RhbFNpemU6IDAsXG4gICAgbWV0YTogW10sXG4gICAgZGF0YTogbnVsbFxuICB9O1xuXG4gIHZhciBwcm9taXNlcyA9IGJsb2JzLm1hcChmdW5jdGlvbihibG9iKSB7XG4gICAgdmFyIHBvc2l0aW9uID0gcmVzdWx0LnRvdGFsU2l6ZTtcblxuICAgIHJlc3VsdC50b3RhbFNpemUgKz0gYmxvYi5zaXplO1xuXG4gICAgcmVzdWx0Lm1ldGEucHVzaCh7IHR5cGU6IGJsb2IudHlwZSwgc2l6ZTogYmxvYi5zaXplIH0pO1xuXG4gICAgcmV0dXJuIGJsb2JUb0FycmF5QnVmZmVyKGJsb2IpLnRoZW4oZnVuY3Rpb24oYnVmZmVyKSB7XG4gICAgICByZXN1bHQuZGF0YS5zZXQobmV3IFVpbnQ4QXJyYXkoYnVmZmVyKSwgcG9zaXRpb24pO1xuICAgIH0pO1xuICB9KTtcblxuICByZXN1bHQuZGF0YSA9IG5ldyBVaW50OEFycmF5KHJlc3VsdC50b3RhbFNpemUpO1xuXG4gIHJldHVybiBQcm9taXNlLmFsbChwcm9taXNlcykudGhlbihmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9KTtcbn1cblxuZnVuY3Rpb24gYmxvYlRvQXJyYXlCdWZmZXIoYmxvYikge1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSkge1xuICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuXG4gICAgcmVhZGVyLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWRlbmQnLCBmdW5jdGlvbigpIHtcbiAgICAgIHJlc29sdmUocmVhZGVyLnJlc3VsdCk7XG4gICAgfSk7XG5cbiAgICByZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIoYmxvYik7XG4gIH0pO1xufVxuXG5leHBvcnQgZGVmYXVsdCB7XG4gIHNlbmQ6IGZ1bmN0aW9uKG1lc3NhZ2UsIGJsb2JzKSB7XG4gICAgdmFyIGJsb2JzSm9pblByb21pc2UgPSAhYmxvYnMgfHwgIWJsb2JzLmxlbmd0aCA/XG4gICAgICBQcm9taXNlLnJlc29sdmUoKSA6IGpvaW5CbG9icyhibG9icyk7XG5cbiAgICByZXR1cm4gYmxvYnNKb2luUHJvbWlzZS50aGVuKGZ1bmN0aW9uKGJsb2JzKSB7XG4gICAgICBpZiAoYmxvYnMpIHtcbiAgICAgICAgbWVzc2FnZS5fX2Jsb2JzID0gYmxvYnMubWV0YTtcbiAgICAgIH1cblxuICAgICAgdmFyIHNlcmlhbGl6ZWRBcHBsaWNhdGlvbk1lc3NhZ2UgPSBVdGlscy5zdHJpbmdUb0FycmF5KFxuICAgICAgICBKU09OLnN0cmluZ2lmeShtZXNzYWdlKVxuICAgICAgKTtcblxuICAgICAgdmFyIGFwcGxpY2F0aW9uTWVzc2FnZUxlbmd0aCA9IHNlcmlhbGl6ZWRBcHBsaWNhdGlvbk1lc3NhZ2UubGVuZ3RoO1xuXG4gICAgICAvLyBUd28gYnl0ZXMgdG8gaGF2ZSBzaXplIG9mIGFwcGxpY2F0aW9uIG1lc3NhZ2UgaW4gam9pbmVkIGRhdGEgYXJyYXlcbiAgICAgIHZhciBkYXRhVG9TZW5kID0gbmV3IFVpbnQ4QXJyYXkoXG4gICAgICAgIDIgKyBhcHBsaWNhdGlvbk1lc3NhZ2VMZW5ndGggKyAoYmxvYnMgPyBibG9icy5kYXRhLmxlbmd0aCA6IDApXG4gICAgICApO1xuXG4gICAgICAvLyBXcml0ZSBzZXJpYWxpemVkIGFwcGxpY2F0aW9uIG1lc3NhZ2UgbGVuZ3RoXG4gICAgICBVdGlscy53cml0ZVVJbnQxNihkYXRhVG9TZW5kLCBhcHBsaWNhdGlvbk1lc3NhZ2VMZW5ndGgsIDApO1xuXG4gICAgICAvLyBXcml0ZSBzZXJpYWxpemVkIGFwcGxpY2F0aW9uIG1lc3NhZ2UgaXRzZWxmXG4gICAgICBkYXRhVG9TZW5kLnNldChzZXJpYWxpemVkQXBwbGljYXRpb25NZXNzYWdlLCAyKTtcblxuICAgICAgaWYgKGJsb2JzKSB7XG4gICAgICAgIGRhdGFUb1NlbmQuc2V0KGJsb2JzLmRhdGEsIDIgKyAgYXBwbGljYXRpb25NZXNzYWdlTGVuZ3RoKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGRhdGFUb1NlbmQ7XG4gICAgfSk7XG4gIH0sXG5cbiAgcmVjZWl2ZTogZnVuY3Rpb24obWVzc2FnZURhdGEpIHtcbiAgICB2YXIgZGF0YSA9IG5ldyBVaW50OEFycmF5KG1lc3NhZ2VEYXRhKTtcbiAgICB2YXIgZGF0YU9mZnNldCA9IDI7XG4gICAgdmFyIGFwcGxpY2F0aW9uTWVzc2FnZUxlbmd0aCA9IChkYXRhWzBdIDw8IDgpICsgZGF0YVsxXTtcblxuICAgIHZhciBhcHBsaWNhdGlvbk1lc3NhZ2UgPSBKU09OLnBhcnNlKFxuICAgICAgU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShcbiAgICAgICAgbnVsbCwgZGF0YS5zdWJhcnJheShkYXRhT2Zmc2V0LCBkYXRhT2Zmc2V0ICsgYXBwbGljYXRpb25NZXNzYWdlTGVuZ3RoKVxuICAgICAgKVxuICAgICk7XG5cbiAgICB2YXIgYmxvYnMsIHBvc2l0aW9uO1xuICAgIGlmIChhcHBsaWNhdGlvbk1lc3NhZ2UuX19ibG9icyAmJiBhcHBsaWNhdGlvbk1lc3NhZ2UuX19ibG9icy5sZW5ndGgpIHtcbiAgICAgIHBvc2l0aW9uID0gZGF0YU9mZnNldCArIGFwcGxpY2F0aW9uTWVzc2FnZUxlbmd0aDtcbiAgICAgIGJsb2JzID0gYXBwbGljYXRpb25NZXNzYWdlLl9fYmxvYnMubWFwKGZ1bmN0aW9uKG1ldGEpIHtcbiAgICAgICAgcG9zaXRpb24gKz0gbWV0YS5zaXplO1xuICAgICAgICByZXR1cm4gbmV3IEJsb2IoXG4gICAgICAgICAgW2RhdGEuc3ViYXJyYXkocG9zaXRpb24gLSBtZXRhLnNpemUsIHBvc2l0aW9uKV0sXG4gICAgICAgICAgeyB0eXBlOiBtZXRhLnR5cGUgfVxuICAgICAgICApO1xuICAgICAgfSk7XG5cbiAgICAgIGRlbGV0ZSBhcHBsaWNhdGlvbk1lc3NhZ2UuX19ibG9icztcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgbWVzc2FnZTogYXBwbGljYXRpb25NZXNzYWdlLFxuICAgICAgYmxvYnM6IGJsb2JzXG4gICAgfTtcbiAgfVxufTtcbiJdfQ==
