var audiobus;
(function (audiobus) {
    ///<reference path="../definitions/waa.d.ts" />
    // interface IPlugs
    (function (instruments) {
        var Instrument = (function () {
            /*
            public set volume( vol:number=1 )
            {
            this.gain.gain = vol;
            }
            
            public get volume( ):number
            {
            return this.gain.gain;
            }
            */
            // create
            function Instrument(audioContext, outputTo) {
                this.context = audioContext;
                this.gain = audioContext.createGain();
                this.gain.connect(outputTo);
            }
            return Instrument;
        })();
        instruments.Instrument = Instrument;
    })(audiobus.instruments || (audiobus.instruments = {}));
    var instruments = audiobus.instruments;
})(audiobus || (audiobus = {}));
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var audiobus;
(function (audiobus) {
    ///<reference path="../definitions/waa.d.ts" />
    ///<reference path="Instrument.ts" />
    (function (instruments) {
        var BassDrum = (function (_super) {
            __extends(BassDrum, _super);
            // create
            function BassDrum(audioContext, outputTo) {
                _super.call(this, audioContext, outputTo);

                // Synthesize!
                this.osc1 = audioContext.createOscillator();
                this.osc1.type = 0;
                this.osc1.connect(this.gain);
            }
            // trigger!
            BassDrum.prototype.start = function (l, offsetA, offsetB, offsetC) {
                if (typeof l === "undefined") { l = 2050; }
                if (typeof offsetA === "undefined") { offsetA = 0.005; }
                if (typeof offsetB === "undefined") { offsetB = 0.01; }
                if (typeof offsetC === "undefined") { offsetC = 0.7; }
                var t = this.context.currentTime;

                this.gain.gain.cancelScheduledValues(t);

                this.gain.gain.setValueAtTime(1, t);
                this.gain.gain.linearRampToValueAtTime(1, t + offsetB);
                this.gain.gain.linearRampToValueAtTime(0.0, t + offsetC);

                this.osc1.frequency.setValueAtTime(l, t);
                this.osc1.frequency.exponentialRampToValueAtTime(80, t + offsetA);

                this.osc1.start(0);
            };
            return BassDrum;
        })(instruments.Instrument);
        instruments.BassDrum = BassDrum;
    })(audiobus.instruments || (audiobus.instruments = {}));
    var instruments = audiobus.instruments;
})(audiobus || (audiobus = {}));
var audiobus;
(function (audiobus) {
    ///<reference path="../definitions/waa.d.ts" />
    ///<reference path="Instrument.ts" />
    (function (instruments) {
        var Snare = (function (_super) {
            __extends(Snare, _super);
            // create
            function Snare(audioContext, outputTo) {
                _super.call(this, audioContext, outputTo);

                //	GENERATE NOISE
                this.noiseBuffer = audioContext.createBuffer(1, 22050, 22050);
                this.noiseData = this.noiseBuffer.getChannelData(0);

                for (var i = 0, l = this.noiseData.length; i < l; ++i) {
                    this.noiseData[i] = (Math.random() - 0.5) * 2;
                }

                this.noise = audioContext.createBufferSource();
                this.noise.loop = true;
                this.noise.buffer = this.noiseBuffer;
                this.noise.connect(this.gain);
            }
            // trigger!
            Snare.prototype.start = function (l, offsetA, offsetB, offsetC) {
                if (typeof l === "undefined") { l = 2050; }
                if (typeof offsetA === "undefined") { offsetA = 0.005; }
                if (typeof offsetB === "undefined") { offsetB = 0.01; }
                if (typeof offsetC === "undefined") { offsetC = 0.7; }
                var t = this.context.currentTime;

                this.gain.gain.cancelScheduledValues(t);
                this.gain.gain.setValueAtTime(1, t);
                this.gain.gain.linearRampToValueAtTime(1, t + 0.025);
                this.gain.gain.exponentialRampToValueAtTime(0.2, t + 0.050);
                this.gain.gain.linearRampToValueAtTime(0.0, t + 0.300);

                this.noise.start(0);
            };
            return Snare;
        })(instruments.Instrument);
        instruments.Snare = Snare;
    })(audiobus.instruments || (audiobus.instruments = {}));
    var instruments = audiobus.instruments;
})(audiobus || (audiobus = {}));
var audiobus;
(function (audiobus) {
    ///<reference path="../definitions/waa.d.ts" />
    ///<reference path="Instrument.ts" />
    (function (instruments) {
        var HiHat = (function (_super) {
            __extends(HiHat, _super);
            // create
            function HiHat(audioContext, outputTo) {
                _super.call(this, audioContext, outputTo);

                // Synthesize!
                //	GENERATE OSCILLATOR 5,6,7,8,9,A (square)
                this.osc5 = audioContext.createOscillator();
                this.osc5.type = 1;
                this.osc5.frequency.value = 600;

                this.osc6 = audioContext.createOscillator();
                this.osc6.type = 1;
                this.osc6.frequency.value = 900;

                this.osc7 = audioContext.createOscillator();
                this.osc7.type = 1;
                this.osc7.frequency.value = 1300;

                this.osc8 = audioContext.createOscillator();
                this.osc8.type = 1;
                this.osc8.frequency.value = 2000;

                this.osc9 = audioContext.createOscillator();
                this.osc9.type = 1;
                this.osc9.frequency.value = 2300;

                this.oscA = audioContext.createOscillator();
                this.oscA.type = 1;
                this.oscA.frequency.value = 2800;

                this.f1 = audioContext.createBiquadFilter();
                this.f1.type = 1;
                this.f1.frequency.value = 10000;

                this.f2 = audioContext.createBiquadFilter();
                this.f2.type = 1;
                this.f2.frequency.value = 10000;

                this.osc5.connect(this.f1);
                this.osc6.connect(this.f1);
                this.osc7.connect(this.f1);
                this.osc8.connect(this.f1);
                this.osc9.connect(this.f1);
                this.oscA.connect(this.f1);

                this.f1.connect(this.f2);
                this.f2.connect(this.gain);
            }
            // TRIGGERS
            HiHat.prototype.start = function () {
                var t = this.context.currentTime;

                // noise gain
                //this.noiseGain.gain.setValueAtTime(0.2, t);
                //this.noiseGain.gain.linearRampToValueAtTime(0,  t + 0.025);
                this.f1.frequency.setValueAtTime(20, t);
                this.f1.frequency.linearRampToValueAtTime(16000, t + 0.050);
                this.f2.frequency.setValueAtTime(20, t);
                this.f2.frequency.linearRampToValueAtTime(16000, t + 0.050);

                this.gain.gain.cancelScheduledValues(t);
                this.gain.gain.setValueAtTime(0.4, t);
                this.gain.gain.linearRampToValueAtTime(0.4, t + 0.025);
                this.gain.gain.exponentialRampToValueAtTime(0.1, t + 0.050);
                this.gain.gain.linearRampToValueAtTime(0.0, t + 0.300);

                //noise.start(0);
                this.osc5.start(0);
                this.osc6.start(0);
                this.osc7.start(0);
                this.osc8.start(0);
                this.osc9.start(0);
                this.oscA.start(0);
            };
            return HiHat;
        })(instruments.Instrument);
        instruments.HiHat = HiHat;
    })(audiobus.instruments || (audiobus.instruments = {}));
    var instruments = audiobus.instruments;
})(audiobus || (audiobus = {}));
var audiobus;
(function (audiobus) {
    ///<reference path="../definitions/waa.d.ts" />
    ///<reference path="Instrument.ts" />
    (function (instruments) {
        var Conga = (function (_super) {
            __extends(Conga, _super);
            // create
            function Conga(audioContext, outputTo) {
                _super.call(this, audioContext, outputTo);

                // Synthesize!
                this.osc2 = audioContext.createOscillator();
                this.osc2.type = 0;
                this.osc2.connect(this.gain);
            }
            Conga.prototype.start = function () {
                var t = this.context.currentTime;

                this.osc2.frequency.setValueAtTime(1200, t);
                this.osc2.frequency.linearRampToValueAtTime(800, t + 0.005);

                this.gain.gain.cancelScheduledValues(t);
                this.gain.gain.setValueAtTime(0.5, t);
                this.gain.gain.exponentialRampToValueAtTime(0.5, t + 0.010);
                this.gain.gain.linearRampToValueAtTime(0.0, t + 0.160);

                this.osc2.start(0);
            };
            return Conga;
        })(instruments.Instrument);
        instruments.Conga = Conga;
    })(audiobus.instruments || (audiobus.instruments = {}));
    var instruments = audiobus.instruments;
})(audiobus || (audiobus = {}));
var audiobus;
(function (audiobus) {
    ///<reference path="../definitions/waa.d.ts" />
    ///<reference path="Instrument.ts" />
    (function (instruments) {
        var CowBell = (function (_super) {
            __extends(CowBell, _super);
            // create
            function CowBell(audioContext, outputTo) {
                _super.call(this, audioContext, outputTo);

                // Synthesize!
                //	GENERATE COWBELL
                this.oscB = audioContext.createOscillator();
                this.oscB.type = 1;
                this.oscB.frequency.value = 900;

                this.oscC = audioContext.createOscillator();
                this.oscC.type = 1;
                this.oscC.frequency.value = 1400;

                this.oscB.connect(this.gain);
                this.oscC.connect(this.gain);
            }
            CowBell.prototype.start = function (offsetA, offsetB, offsetC) {
                if (typeof offsetA === "undefined") { offsetA = 0.025; }
                if (typeof offsetB === "undefined") { offsetB = 0.05; }
                if (typeof offsetC === "undefined") { offsetC = 0.4; }
                var t = this.context.currentTime;

                this.gain.gain.cancelScheduledValues(t);
                this.gain.gain.setValueAtTime(1, t);
                this.gain.gain.linearRampToValueAtTime(1, t + offsetA);
                this.gain.gain.exponentialRampToValueAtTime(0.2, t + offsetB);
                this.gain.gain.linearRampToValueAtTime(0.0, t + offsetC);

                this.oscB.start(0);
                this.oscC.start(0);
            };
            return CowBell;
        })(instruments.Instrument);
        instruments.CowBell = CowBell;
    })(audiobus.instruments || (audiobus.instruments = {}));
    var instruments = audiobus.instruments;
})(audiobus || (audiobus = {}));
///<reference path="definitions/waa.d.ts" />
///<reference path="instruments/BassDrum.ts" />
///<reference path="instruments/Snare.ts" />
///<reference path="instruments/HiHat.ts" />
///<reference path="instruments/Conga.ts" />
///<reference path="instruments/CowBell.ts" />
var audiobus;
(function (audiobus) {
    var DrumMachine = (function () {
        /*
        public set volume( vol:number=1 ):void
        {
        this.gain.gain = vol;
        }
        
        public get volume( ):number
        {
        return this.gain.gain;
        }
        */
        // starts here...
        function DrumMachine(audioContext, outputTo) {
            if (typeof audioContext === "undefined") { audioContext = null; }
            if (typeof outputTo === "undefined") { outputTo = null; }
            // shared variables
            this.bpm = 120;
            var available = this.initDSP(window);
            if (!available) {
                // END prematurely ;(
                alert('Web Audio API is not supported in this browser');
            } else {
                this.setup();
            }
        }
        DrumMachine.prototype.initDSP = function (window) {
            try  {
                // Fix up for prefixing
                window.AudioContext = window.AudioContext || window.webkitAudioContext || window.msAudioContext || window.mozAudioContext;
                this.dsp = new AudioContext();
                this.dsp.sampleRate = 22050;
                return true;
            } catch (error) {
                return false;
            }
        };

        DrumMachine.prototype.setup = function () {
            // Setup Main OUTPUT LEVEL
            this.gain = this.dsp.createGain();

            // Create Instruments
            this.bassdrum = new audiobus.instruments.BassDrum(this.dsp, this.gain);
            this.conga = new audiobus.instruments.Conga(this.dsp, this.gain);
            this.snare = new audiobus.instruments.Snare(this.dsp, this.gain);
            this.hihat = new audiobus.instruments.HiHat(this.dsp, this.gain);
            this.cowbell = new audiobus.instruments.CowBell(this.dsp, this.gain);

            // If you want to connect this DrumMachine machine to
            // another DrumMachine machine or to the Spectrum Analyser
            // this is the place to intercept it!
            // 	Route SIGNALS - MIX AND OUTPUT
            this.gain.connect(this.dsp.destination);
            // Fix FF
            //for legacy browsers
            //this.osc1.start = this.osc1.start || this.osc1.noteOn;
            //this.osc1.stop = this.osc1.stop || this.osc1.noteOff;
        };

        DrumMachine.prototype.trigger = function (id) {
            if (typeof id === "undefined") { id = 0; }
            switch (id) {
                case 1:
                    this.snare.start();
                    break;
                case 2:
                    this.hihat.start();
                    break;
                case 3:
                    this.conga.start();
                    break;
                case 4:
                    this.cowbell.start();
                    break;

                case 0:
                default:
                    this.bassdrum.start();
            }
        };
        return DrumMachine;
    })();
    audiobus.DrumMachine = DrumMachine;
})(audiobus || (audiobus = {}));
var audiobus;
(function (audiobus) {
    ///<reference path="../definitions/waa.d.ts" />
    (function (inputs) {
        var Microphone = (function () {
            // this will need to be removed once getUserMedia is more accepted
            // create
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
                //get mic in
                this.getUserMedia({ audio: true }, this.onMicAvailable, this.onMicUnAvailable);
            };

            // success callback when requesting audio input stream
            Microphone.prototype.onMicAvailable = function (stream) {
                // Create an AudioNode from the stream.
                var mediaStreamSource = this.context.createMediaStreamSource(stream);
                this.gain.connect(mediaStreamSource);
            };

            Microphone.prototype.onMicUnAvailable = function (error) {
                console.log("The following error occured: " + error);
            };
            return Microphone;
        })();
        inputs.Microphone = Microphone;
    })(audiobus.inputs || (audiobus.inputs = {}));
    var inputs = audiobus.inputs;
})(audiobus || (audiobus = {}));
var audiobus;
(function (audiobus) {
    ///<reference path="../definitions/waa.d.ts" />
    //<reference path="visualisers/" />
    (function (visualisation) {
        var SpectrumAnalyzer = (function () {
            function SpectrumAnalyzer(audioContext, outputTo) {
                this.context = audioContext;
                this.analyser = audioContext.createAnalyser();
                this.sampleRate = audioContext.sampleRate;

                // must be a power of two
                this.analyser.fftSize = 2048;

                //pipe to speakers
                this.analyser.connect(audioContext.destination);

                //create an empty array with 1024 items
                this.frequencyData = new Uint8Array(1024);

                this.gain = audioContext.createGain();
                this.gain.connect(outputTo);

                //connect to source
                this.gain.connect(this.analyser);
            }
            SpectrumAnalyzer.prototype.update = function () {
                //constantly getting feedback from data
                this.analyser.getByteFrequencyData(this.frequencyData);

                // Schedule the next update
                requestAnimationFrame(this.update);
            };
            return SpectrumAnalyzer;
        })();
        visualisation.SpectrumAnalyzer = SpectrumAnalyzer;
    })(audiobus.visualisation || (audiobus.visualisation = {}));
    var visualisation = audiobus.visualisation;
})(audiobus || (audiobus = {}));
///<reference path="audiobus/definitions/jquery.d.ts" />
///<reference path="audiobus/DrumMachine.ts" />
///<reference path="audiobus/inputs/Microphone.ts" />
///<reference path="audiobus/visualisation/SpectrumAnalyzer.ts" />
var Main = (function () {
    function Main() {
        var _this = this;
        this.drums = new audiobus.DrumMachine();
        this.drums.trigger();
        this.drums.trigger(1);
        this.drums.trigger(2);
        this.drums.trigger(3);
        this.drums.trigger(4);

        // var mic = new audiobus.inputs.Microphone( this.drums.dsp, this.drums.gain );
        // mic.getMic();
        var viz = new audiobus.visualisation.SpectrumAnalyzer(this.drums.dsp, this.drums.gain);

        // now hook into our analyser for updates
        // Attach key event
        document.onkeydown = function (event) {
            _this.keyListener(event);
        };
    }
    Main.main = function () {
        new Main();
    };

    Main.prototype.keyListener = function (e) {
        if (!e)
            e = window.event;

        switch (e.keyCode) {
            case 37:
                this.drums.trigger(1);
                break;
        }

        if (e.keyCode == 38) {
            //keyCode 38 is down arrow
            this.drums.trigger(2);
        }
        if (e.keyCode == 39) {
            //keyCode 39 is right arrow
            this.drums.trigger(3);
        }
        if (e.keyCode == 40) {
            //keyCode 40 is up arrow
            this.drums.trigger(4);
        }
    };
    return Main;
})();

/*

class Person {

constructor(name:string)
{
this.name=name;
}
name: string;
}

function greeter (person:Person){
return "hallo "+person.name;
}

var person=new Person("bert");
*/
$(document).ready(function () {
    // firstly inject boxes!
    //$("#status")[0].innerHTML=message;
});
