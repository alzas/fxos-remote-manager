/* global EventDispatcher,
          Promise,
          mozRTCPeerConnection,
          mozRTCSessionDescription,
          webkitRTCPeerConnection,
          webkitRTCSessionDescription
*/

(function(exports) {
  'use strict';

  var RTCPeerConnection = window.mozRTCPeerConnection ||
        window.webkitRTCPeerConnection;

  var RTCSessionDescription = window.mozRTCSessionDescription ||
      window.webkitRTCSessionDescription;

  var PeerConnection = function() {
    EventDispatcher.mixin(
      this, ['add-stream', 'ice-candidate', 'signaling-state-change']
    );

    this.rtc = new RTCPeerConnection({
      iceServers: [{
        url: 'stun:stun.l.google.com:19302',
        urls: 'stun:stun.l.google.com:19302'
      }]
    });

    this.rtc.addEventListener('icecandidate', function(e) {
      this.emit('ice-candidate', e.candidate);
    }.bind(this));

    this.rtc.addEventListener('addstream', function(e) {
      this.emit('add-stream', e.stream);
    }.bind(this));

    this.rtc.addEventListener('signalingstatechange', function(e) {
      this.emit('signaling-state-change', e);
    }.bind(this));
  };

  PeerConnection.prototype.getLocalDescription = function() {
    return this.rtc.localDescription;
  };

  PeerConnection.prototype.addStream = function(stream) {
    this.rtc.addStream(stream);
  };

  PeerConnection.prototype.createOffer = function(options) {
    var rtc = this.rtc;
    return new Promise(function(resolve, reject) {
      rtc.createDataChannel('data-channel', { reliable: true });

      rtc.createOffer(function(localDescription) {
        rtc.setLocalDescription(localDescription, function() {
          resolve(localDescription);
        }, reject);
      }, reject, options);
    });
  };

  PeerConnection.prototype.acceptOffer = function(offer) {
    var rtc = this.rtc;
    return new Promise(function(resolve, reject) {
      var remoteDescription = new RTCSessionDescription(offer);

      rtc.setRemoteDescription(remoteDescription, function() {
        rtc.createAnswer(function(localDescription) {
          rtc.setLocalDescription(localDescription, function() {
            resolve(localDescription);
          }, reject);
        }, reject);
      }, reject);
    });
  };

  PeerConnection.prototype.acceptAnswer = function(answer) {
    var rtc = this.rtc;
    return new Promise(function(resolve, reject) {
      rtc.setRemoteDescription(new RTCSessionDescription(answer), function() {
        resolve();
      }, reject);
    });
  };

  PeerConnection.prototype.close = function() {
    this.rtc.getLocalStreams().forEach(function(stream) {
      stream.stop();
    });

    this.rtc.close();
  };

  exports.PeerConnection = {
    create: function() {
      return new PeerConnection();
    }
  };
})(window);
