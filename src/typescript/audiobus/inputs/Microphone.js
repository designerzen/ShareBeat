///<reference path="../definitions/waa.d.ts" />
var audiobus;
(function (audiobus) {
    var inputs;
    (function (inputs) {
        var Microphone = (function () {
            function Microphone(audioContext, outputTo) {
                this.context = audioContext;
                this.gain = audioContext.createGain();
                this.gain.connect(outputTo);
            }
            Microphone.prototype.getUserMedia = function (options, success, error) {
                var n = navigator;
                n.getUserMedia = n.getUserMedia || n.webkitGetUserMedia || n.mozGetUserMedia || n.msGetUserMedia;
                return n.getUserMedia({ video: true, audio: true }, success, error);
            };
            Microphone.prototype.getMic = function () {
                this.getUserMedia({ audio: true }, this.onMicAvailable, this.onMicUnAvailable);
            };
            Microphone.prototype.onMicAvailable = function (stream) {
                var mediaStreamSource = this.context.createMediaStreamSource(stream);
                this.gain.connect(mediaStreamSource);
            };
            Microphone.prototype.onMicUnAvailable = function (error) {
                console.log("The following error occured: " + error);
            };
            return Microphone;
        })();
        inputs.Microphone = Microphone;
    })(inputs = audiobus.inputs || (audiobus.inputs = {}));
})(audiobus || (audiobus = {}));
