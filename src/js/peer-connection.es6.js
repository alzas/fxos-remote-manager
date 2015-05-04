/* global Promise,
          mozRTCPeerConnection,
          mozRTCSessionDescription,
          webkitRTCPeerConnection,
          webkitRTCSessionDescription
*/

import EventDispatcher from 'event-dispatcher-js';

var RTCPeerConnection = window.mozRTCPeerConnection ||
  window.webkitRTCPeerConnection;

var RTCSessionDescription = window.mozRTCSessionDescription ||
  window.webkitRTCSessionDescription;

var privates = {
  connection: Symbol('connection'),

  getConnection: Symbol('getConnection')
};

export default class PeerConnection {
  constructor() {
    EventDispatcher.mixin(
      this, ['add-stream', 'ice-candidate', 'signaling-state-change']
    );

    var connection = new RTCPeerConnection({
      iceServers: [{
        url: 'stun:stun.l.google.com:19302',
        urls: 'stun:stun.l.google.com:19302'
      }]
    });

    connection.addEventListener('icecandidate', function (e) {
      this.emit('ice-candidate', e.candidate);
    }.bind(this));

    connection.addEventListener('addstream', function (e) {
      this.emit('add-stream', e.stream);
    }.bind(this));

    connection.addEventListener('signalingstatechange', function (e) {
      this.emit('signaling-state-change', e);
    }.bind(this));

    this[privates.connection] = connection;
  }

  getLocalDescription() {
    return this[privates.getConnection]().localDescription;
  }

  addStream(stream) {
    return this[privates.getConnection]().addStream(stream);
  }

  createOffer(options) {
    var connection = this[privates.getConnection]();
    return new Promise(function(resolve, reject) {
      connection.createDataChannel('data-channel', { reliable: true });

      connection.createOffer(function(localDescription) {
        connection.setLocalDescription(localDescription, function() {
          resolve(localDescription);
        }, reject);
      }, reject, options);
    });
  }

  acceptOffer(offer) {
    var connection = this[privates.getConnection]();
    return new Promise(function(resolve, reject) {
      var remoteDescription = new RTCSessionDescription(offer);

      connection.setRemoteDescription(remoteDescription, function() {
        connection.createAnswer(function(localDescription) {
          connection.setLocalDescription(localDescription, function() {
            resolve(localDescription);
          }, reject);
        }, reject);
      }, reject);
    });
  }

  acceptAnswer(answer) {
    var connection = this[privates.getConnection]();
    return new Promise(function(resolve, reject) {
      connection.setRemoteDescription(
        new RTCSessionDescription(answer), function() { resolve(); }, reject
      );
    });
  }

  close() {
    var connection = this[privates.getConnection]();

    connection.getLocalStreams().forEach(function(stream) {
      stream.stop();
    });

    connection.close();

    this[privates.connection] = null;
  }

  [privates.getConnection]() {
    var connection = this[privates.connection];

    if (!connection) {
      throw new Error('Connection is closed!');
    }

    return connection;
  }
}
