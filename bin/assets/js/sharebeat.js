var audiobus;
(function (audiobus) {
    ///<reference path="../definitions/waa.d.ts" />
    ///<reference path="../definitions/greensock.d.ts" />
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
                this.isPlaying = false;
                this.hasInitialised = false;
                this.durationFadeIn = 0.15;
                this.durationFadeOut = 0.15;
                this.SILENCE = Number.MIN_VALUE + Number.MIN_VALUE;
                this.context = audioContext;
                this.gain = audioContext.createGain();
                this.gain.connect(outputTo);
            }
            Instrument.prototype.start = function () {
                var args = [];
                for (var _i = 0; _i < (arguments.length - 0); _i++) {
                    args[_i] = arguments[_i + 0];
                }
                var t = this.context.currentTime;

                this.isPlaying = true;
                this.hasInitialised = true;
                console.log('start ' + this.isPlaying);
            };

            Instrument.prototype.stop = function () {
                if (!this.hasInitialised)
                    return;

                //this.gain.gain.value = 0;
                //
                // An exception will be thrown if this value is less than or equal to 0,
                // or if the value at the time of the previous event is less than or equal to 0.
                //this.gain.gain.setValueAtTime(0.01, t + durationFadeOut);
                this.fadeOut(this.durationFadeOut);
                console.log('stop vol:', this.gain);

                //if (this.gain.gain.value > 0 ) console.error('could not stop'+this);
                this.isPlaying = false;
            };

            Instrument.prototype.fadeIn = function (time) {
                if (typeof time === "undefined") { time = 0.1; }
                TweenLite.to(this.gain, time, { gain: 1, onComplete: this.onFaded });
            };

            Instrument.prototype.onFaded = function () {
                alert("fade complete " + this.gain.gain);
            };
            Instrument.prototype.fadeOut = function (time) {
                if (typeof time === "undefined") { time = 0.1; }
                var t = this.context.currentTime;
                console.log("fading out in " + time);
                this.gain.gain.cancelScheduledValues(t);
                this.gain.gain.exponentialRampToValueAtTime(this.SILENCE, t + time);
            };
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

                if (!this.hasInitialised)
                    this.osc1.start(0);

                _super.prototype.start.call(this);
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
            Snare.prototype.start = function (l, attack, offsetB, offsetC) {
                if (typeof l === "undefined") { l = 2050; }
                if (typeof attack === "undefined") { attack = 0.025; }
                if (typeof offsetB === "undefined") { offsetB = 0.050; }
                if (typeof offsetC === "undefined") { offsetC = 0.3; }
                var t = this.context.currentTime;

                this.gain.gain.cancelScheduledValues(t);
                this.gain.gain.setValueAtTime(1, t);
                this.gain.gain.linearRampToValueAtTime(1, t + attack);
                this.gain.gain.exponentialRampToValueAtTime(0.2, t + offsetB);
                this.gain.gain.linearRampToValueAtTime(0.0, t + offsetC);

                if (!this.hasInitialised)
                    this.noise.start(0);

                _super.prototype.start.call(this);
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

                if (!this.hasInitialised) {
                    this.osc5.start(0);
                    this.osc6.start(0);
                    this.osc7.start(0);
                    this.osc8.start(0);
                    this.osc9.start(0);
                    this.oscA.start(0);
                }

                _super.prototype.start.call(this);
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
            Conga.prototype.start = function (f, offsetA) {
                if (typeof f === "undefined") { f = 1200; }
                if (typeof offsetA === "undefined") { offsetA = 0.160; }
                var t = this.context.currentTime;

                this.osc2.frequency.setValueAtTime(f, t);
                this.osc2.frequency.linearRampToValueAtTime(800, t + 0.005);

                this.gain.gain.cancelScheduledValues(t);
                this.gain.gain.setValueAtTime(0.5, t);
                this.gain.gain.exponentialRampToValueAtTime(0.5, t + 0.010);
                this.gain.gain.linearRampToValueAtTime(0.0, t + offsetA);

                if (!this.hasInitialised)
                    this.osc2.start(0);
                _super.prototype.start.call(this);
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
                if (!this.hasInitialised) {
                    this.oscB.start(0);
                    this.oscC.start(0);
                }

                _super.prototype.start.call(this);
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
                default:
                case 0:
                    this.bassdrum.start(2050, 0.005, 0.01, 0.7);
                    break;
                case 1:
                    this.bassdrum.start(4050, 0.007, 0.01, 0.6);

                    break;
                case 2:
                    this.bassdrum.start(8050, 0.008, 0.03, 0.5);

                    break;
                case 3:
                    this.bassdrum.start(12050, 0.005, 0.01, 0.4);

                    break;

                case 4:
                    this.snare.start(2050, 0.005, 0.01, 0.1);
                    break;
                case 5:
                    this.snare.start(2050, 0.006, 0.02, 0.1);
                    break;
                case 6:
                    this.snare.start(2050, 0.007, 0.03, 0.1);
                    break;

                case 7:
                    this.snare.start(2050, 0.008, 0.04, 0.1);
                    break;
                case 8:
                    this.conga.start(1200, 0.160);
                    break;
                case 9:
                    this.conga.start(2200, 0.260);

                    break;
                case 10:
                    this.conga.start(3200, 0.360);

                    break;
                case 11:
                    this.conga.start(4200, 0.460);

                    break;
                case 12:
                    this.cowbell.start(0.025, 0.05, 0.4);
                    break;
                case 13:
                    this.cowbell.start(0.020, 0.04, 0.3);
                    break;
                case 14:
                    this.cowbell.start(0.015, 0.03, 0.2);
                    break;
                case 15:
                    this.cowbell.start(0.010, 0.02, 0.3);
                    break;
                case 16:
                    this.cowbell.start(0.005, 0.01, 0.2);
                    break;
            }
        };
        return DrumMachine;
    })();
    audiobus.DrumMachine = DrumMachine;
})(audiobus || (audiobus = {}));
var audiobus;
(function (audiobus) {
    ///<reference path="../definitions/waa.d.ts" />
    ///<reference path="Instrument.ts" />
    ///<reference path="../ISoundControl.ts" />
    (function (instruments) {
        var Sine = (function (_super) {
            __extends(Sine, _super);
            // create
            function Sine(audioContext, outputTo) {
                _super.call(this, audioContext, outputTo);
                this.create();
            }
            Sine.prototype.create = function () {
                // Synthesize!
                this.osc = this.context.createOscillator();
                this.osc.type = 0;
                this.osc.connect(this.gain);
            };

            Sine.prototype.start = function (frequency) {
                //console.log("Sine commencing at f:"+frequency );
                var t = this.context.currentTime;

                this.osc.frequency.value = frequency;

                //this.osc.frequency.setValueAtTime(1200, t);
                //this.osc.frequency.linearRampToValueAtTime(800, t + 0.005);
                //this.gain.gain.cancelScheduledValues( t );
                this.gain.gain.cancelScheduledValues(t);

                if (this.isPlaying) {
                    // this note is already playing so don't tweak it.
                    this.gain.gain.value = .5;
                } else {
                    // freshly playing so ADSR it
                    //this.gain.gain.value = .5;
                    //this.gain.gain.setValueAtTime(0.0001, t);
                    // An exception will be thrown if this value is less than or equal to 0,
                    // or if the value at the time of the previous event is less than or equal to 0.
                    //this.gain.gain.exponentialRampToValueAtTime( 0.5, t + 0.001 );
                    //this.gain.gain.value = .5;
                    //this.gain.gain.setValueAtTime(0.0000000000001, t);
                    this.gain.gain.exponentialRampToValueAtTime(0.5, t + this.durationFadeIn);

                    console.log('trying to start ' + this.isPlaying + ' state:' + this.osc.playbackState);
                }

                if (!this.hasInitialised)
                    this.osc.start(t);
                _super.prototype.start.call(this);
            };

            Sine.prototype.stop = function () {
                if (!this.hasInitialised)
                    return;
                console.log('stop playing? ' + this.isPlaying + ' state:' + this.osc.playbackState);

                //this.osc.stop( 0 );
                _super.prototype.stop.call(this);
            };
            return Sine;
        })(instruments.Instrument);
        instruments.Sine = Sine;
    })(audiobus.instruments || (audiobus.instruments = {}));
    var instruments = audiobus.instruments;
})(audiobus || (audiobus = {}));
var audiobus;
(function (audiobus) {
    ///<reference path="../definitions/waa.d.ts" />
    ///<reference path="Instrument.ts" />
    (function (instruments) {
        var Saw = (function (_super) {
            __extends(Saw, _super);
            // create
            function Saw(audioContext, outputTo) {
                _super.call(this, audioContext, outputTo);
                this.create();
            }
            // Synthesize!
            Saw.prototype.create = function () {
                // Synthesize!
                this.osc = this.context.createOscillator();
                this.osc.type = 1;
                this.osc.connect(this.gain);
            };

            Saw.prototype.start = function (frequency) {
                console.log("Sine commencing at f:" + frequency);
                var t = this.context.currentTime;

                this.osc.frequency.value = frequency;

                //this.osc.frequency.setValueAtTime(1200, t);
                //this.osc.frequency.linearRampToValueAtTime(800, t + 0.005);
                this.gain.gain.value = .5;

                if (!this.hasInitialised)
                    this.osc.start(t);
                _super.prototype.start.call(this);
            };
            return Saw;
        })(instruments.Instrument);
        instruments.Saw = Saw;
    })(audiobus.instruments || (audiobus.instruments = {}));
    var instruments = audiobus.instruments;
})(audiobus || (audiobus = {}));
var audiobus;
(function (audiobus) {
    ///<reference path="../definitions/waa.d.ts" />
    (function (inputs) {
        var Microphone = (function () {
            // create
            function Microphone(audioContext, outputTo) {
                this.context = audioContext;
                this.gain = audioContext.createGain();
                this.gain.connect(outputTo);
            }
            // this will need to be removed once getUserMedia is more accepted
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
var audiobus;
(function (audiobus) {
    var Netronome = (function () {
        function Netronome(onBeatCallback, onProgressCallback, scope) {
            this.period = 6000;
            this.playing = false;
            this.percentage = 0;
            // Assign the method implementation here.
            this.callOnBeat = onBeatCallback;
            this.callOnProgress = onProgressCallback;

            /*
            this.callOnBeat = () => {
            onBeatCallback.apply(this, arguments);
            }
            
            this.callOnProgress = () => {
            onProgressCallback.apply(this, arguments);
            }
            */
            this.callbackScope = scope;
        }
        // INTERALS =======================================================
        // a way of converting a quantity of beats per minute into periods of bar length
        Netronome.prototype.setBpm = function (beatsPerMinute) {
            if (beatsPerMinute < 1)
                return this.getBpm();
            var seconds = 60 / beatsPerMinute;

            this.period = seconds * 1000;

            this.lastBarTimeStamp = this.determineStartTime();

            var elapsed = Date.now() - this.lastBarTimeStamp;
            this.percentage = elapsed / this.period;

            return beatsPerMinute;
        };

        Netronome.prototype.getBpm = function () {
            return (60 / (this.period * 0.001)) >> 0;
        };

        ////////////////////////////////////////////////////////////////////////
        // Begin & End the Netronome timer
        ////////////////////////////////////////////////////////////////////////
        Netronome.prototype.start = function (bpm) {
            if (typeof bpm === "undefined") { bpm = 90; }
            var _this = this;
            this.playing = true;
            this.setBpm(bpm);

            // begin!
            requestAnimationFrame(function () {
                return _this.onTimer();
            });
        };

        Netronome.prototype.stop = function () {
            this.playing = false;
        };

        ////////////////////////////////////////////////////////////////////////
        // Work out the timestamp that the last metronome ticked at -
        // This should synchronise across BPMS and periods. For that to occur
        ////////////////////////////////////////////////////////////////////////
        Netronome.prototype.determineStartTime = function () {
            // so we have a timestamp that shows the time now
            var now = Date.now();
            var timeSinceEpoch = now - Netronome.EPOCH;
            var elapsed = timeSinceEpoch % this.period;
            var remaining = this.period - elapsed;
            var lastTick = (now - elapsed);

            //trace( 'CREATING EPOCH now:'+now+" then:"+EPOCH);
            //	trace( ''+Std.int(timeSinceEpoch / period)+" Bars have occurred at "+get_bpm()+ " BPM");
            //	trace( ''+Std.int(elapsed)+" ms elapsed in this bar "+Std.int(elapsed*100/period)+'% Elapsed');
            //	trace( 'lastTick : ' + lastTick + " at " + get_bpm()+ " BPM");
            //trace( 'Remaining Time in Bar '+Std.int(remaining)+" ms "+Std.int(elapsed*100/period)+'% Elapsed');
            //trace( 'Left Over at '+remaining+" period : "+period+' remaining : ' + remaining + ' timestamp : '+( now - remaining) );
            console.log("lastTick : " + lastTick);
            return lastTick;
        };

        ////////////////////////////////////////////////////////////////////////
        //
        ////////////////////////////////////////////////////////////////////////
        Netronome.prototype.incrementCuePoints = function (now) {
            if (typeof now === "undefined") { now = -1; }
            // update the last timestamp to about now or before...
            this.lastBarTimeStamp += this.period;
        };

        ////////////////////////////////////////////////////////////////////////
        // Check the time to see if a beat has occurred
        ////////////////////////////////////////////////////////////////////////
        Netronome.prototype.onTimer = function () {
            var _this = this;
            // discover how much time has elapsed since our last timestamp...
            var time = Date.now();
            var elapsed = time - this.lastBarTimeStamp;
            var progress = elapsed / this.period;
            var barOccurred = elapsed >= this.period;

            if (barOccurred) {
                // update the last timestamp to about now or before...
                this.incrementCuePoints(time);
                this.percentage = 0;

                // callback! make sure that the scope is consistent
                //this.callOnBeat.apply( time );
                this.callOnBeat(this.callbackScope, time);

                // call this method immediately again without delay!
                // this should catch any quickly added cue points at low beats
                this.onTimer();
            }

            if (progress > this.percentage) {
                this.percentage = progress;
                this.callOnProgress(this.callbackScope, this.percentage);
            }

            if (this.playing)
                requestAnimationFrame(function () {
                    return _this.onTimer();
                });
        };
        Netronome.EPOCH = new Date(2012, 12, 21, 6, 6, 6).getTime();
        return Netronome;
    })();
    audiobus.Netronome = Netronome;
})(audiobus || (audiobus = {}));
///<reference path="audiobus/definitions/firebase.d.ts" />
var FireBaseAPI = (function () {
    function FireBaseAPI(onNoteCallback, onUserID) {
        this.firstRun = true;
        this.max = 4;
        // -1 means an EMPTY user, in the db we Check a ROOM to see
        // if there are any spaces
        this.userid = -1;
        this.roomName = "";
        this.tagChild = "users";
        this.tagData = "data";
        this.tagUser = "";
        this.callback = onNoteCallback;
        this.callbackID = onUserID;
    }
    FireBaseAPI.prototype.connect = function () {
        var _this = this;
        this.io = new Firebase('https://sharebeat.firebaseio.com/');
        this.usersRef = this.io.child(this.tagChild);
        this.dataRef = this.io.child('data');

        console.log("Frebase API connectin..." + this.io);

        // startup event : load whatever is in db
        this.io.on('child_added', function (s) {
            return _this.onChildAdded(s);
        });
        this.dataRef.on('value', function (s) {
            return _this.onAudioData(s);
        });
    };

    FireBaseAPI.prototype.disconnect = function () {
        if (this.userid != -1) {
            this.unregisterUser();
        }
    };

    FireBaseAPI.prototype.onChildAdded = function (s) {
        var n = s.name();
        var v = s.val();

        if ((this.firstRun == true) && (n == this.tagChild)) {
            //console.log('name = ' + n);
            //console.log('value = ' + print(val) );
            //console.table(v)
            console.log('New user found ============= ');
            this.firstRun = false;
            this.registerUser(v);
            return true;
        }
    };

    FireBaseAPI.prototype.onChildChanged = function (snapShot) {
        // var n = s.name();
        // var v = s.val();
        // v == -1 ?
        // console.log( n + ' just left!') :
        // console.log( n + ' just joined the community');
    };

    FireBaseAPI.prototype.onAudioData = function (snapShot) {
        var n = snapShot.name();
        var v = snapShot.val();

        if (v == null)
            return;

        // Check to see if this is YOUR data!
        var uid = parseInt(v.id);

        if (this.userid == uid)
            return;
        console.log(v);

        //var u = parseInt( n.substring( n.length -1 ) );
        /*
        
        // id
        v.id;
        // note
        v.n;
        // step
        v.s;
        */
        this.callback(uid, v.s, v.n);
    };

    FireBaseAPI.prototype.sendData = function (step, note) {
        this.dataRef.set({ 'id': this.userid, 's': step, 'n': note });
    };

    // register user in db and assign unique userid
    FireBaseAPI.prototype.registerUser = function (snapShot) {
        var ctr = 0;
        for (var x in snapShot) {
            if (snapShot[x] == -1) {
                console.log('a free slot was found for this user ' + ctr);
                this.userid = ctr;
                var tag = this.io.child(this.tagChild);
                tag.child('user' + this.userid).set(this.userid);
                tag.child('data').child('user' + this.userid).remove();
                this.callbackID(this.userid);
                return true;
            }
            ctr++;
        }
        this.callbackID(-1);
        return false;
    };

    // remove user presence and data from db
    FireBaseAPI.prototype.unregisterUser = function () {
        this.io.child('data').child('user' + this.userid).remove();
        this.io.child(this.tagChild).child('user' + this.userid).set(-1);
    };
    return FireBaseAPI;
})();
///<reference path="audiobus/definitions/jquery.d.ts" />
///<reference path="audiobus/definitions/greensock.d.ts" />
///<reference path="audiobus/DrumMachine.ts" />
//<reference path="audiobus/ISoundControl.ts" />
///<reference path="audiobus/instruments/Instrument.ts" />
///<reference path="audiobus/instruments/Sine.ts" />
///<reference path="audiobus/instruments/Saw.ts" />
///<reference path="audiobus/instruments/Snare.ts" />
///<reference path="audiobus/instruments/Conga.ts" />
///<reference path="audiobus/instruments/BassDrum.ts" />
///<reference path="audiobus/instruments/Conga.ts" />
///<reference path="audiobus/instruments/HiHat.ts" />
///<reference path="audiobus/inputs/Microphone.ts" />
///<reference path="audiobus/visualisation/SpectrumAnalyzer.ts" />
///<reference path="audiobus/Netronome.ts" />
///<reference path="FireBaseAPI.ts" />
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
        //var viz = new audiobus.visualisation.SpectrumAnalyzer( this.drums.dsp, this.drums.gain );
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

// jQuery Commence!
$(document).ready(function () {
    var $body = $('body'), $matrix = $('#matrix'), $content = $('#content'), $window = $(window), buttonHtml = 'article.button';

    var timeout;
    var steps = 16;
    var notes = 16;
    var quantity = steps * notes;
    var mouseDown = false;
    var isLoaded = false;

    var userNames = ["A", "B", "C", "D"];
    var colours = [""];

    var index = 0;
    var octave = -10;
    var bpm = 200;

    var drums = new audiobus.DrumMachine();
    var sine = new audiobus.instruments.Sine(drums.dsp, drums.gain);
    var sineB = new audiobus.instruments.Sine(drums.dsp, drums.gain);
    var saw = new audiobus.instruments.Saw(drums.dsp, drums.gain);

    var netronome = new audiobus.Netronome(onEveryBeat, onProgress, this);
    var db = new FireBaseAPI(onForeignBeat, onUserID);

    //var instruments:audiobus.instruments.Instrument[] = [ sine, kick, hihat, cowbell ];
    // fetch all foreign beats associated with
    function getOthersBeats(column) {
        var output = {};

        for (var n, l = userNames.length; n < l; ++n) {
            var userName = userNames[n];
            var data = userName + column;
            var $existing = $matrix.data(data);

            if ($existing) {
                output[userName] = true;
                //console.log("Found friend "+userName+" in this column");
            } else {
                //
                //console.log("There are no other nodes for this friend ");
            }
        }
        return output;
    }

    // fetch all foreign beats associated with
    function getOthersBeatString(column) {
        var output = "";

        for (var n, l = userNames.length; n < l; ++n) {
            var userName = userNames[n];
            var data = userName + column;
            var $existing = $matrix.data(data);

            if ($existing)
                output += userName + " ";
        }
        return output;
    }

    function selectBeat($element, user, save) {
        if (typeof user === "undefined") { user = 0; }
        if (typeof save === "undefined") { save = true; }
        var userName = userNames[user];
        var index = parseInt($element.attr("alt"));
        var column = index % steps;
        var originalKey = (index / steps) >> 0;
        var key = notes - originalKey;

        var data = userName + column;
        var $existing = $matrix.data(data);
        var className = "selected user" + userName + " ";

        if ($existing) {
            deselectBeat($existing, user);
            //console.log("Found previous in this column at key "+key );
        } else {
            //
            //console.log("There is no entry in this column currently at key "+key );
        }

        //var users = getOthersBeats( column );
        //console.log( users );
        // append other users onto this
        className += getOthersBeatString(column);

        // This is where we do the colour magic...
        $element.addClass(className);
        $element.data("active" + userName, key);

        //$element.css( "background-color", colour );
        // set in global data base
        $matrix.data(data, $element);

        if (save)
            db.sendData(column, originalKey);
    }

    function deselectBeat($element, user) {
        if (typeof user === "undefined") { user = 0; }
        var userName = userNames[user];
        var position = parseInt($element.attr("alt"));
        var column = position % steps;
        var data = userName + column;

        $element.removeClass("selected user" + userName);

        //$element.data( "active"+userNames[user], -1 );
        $element.removeData("active" + userName);

        // set in global data base
        $matrix.removeData(data);
    }

    // Privates
    // Beat commencing at point due to netronome...
    function playUserInstrument(user, key) {
        //var instrument:audiobus.instruments.Instrument = instruments[ user ];
        //var instrument = <audiobus.instruments.Instrument>instruments[ user ];
        var frequency;
        var note = key + octave;
        switch (user) {
            case 0:
                frequency = note / 12;
                frequency = 440 * frequency * frequency;
                sine.start(frequency);
                break;

            case 1:
                drums.trigger(key);
                break;

            case 2:
                frequency = (note - 12) / 12;
                frequency = 440 * frequency * frequency;
                sineB.start(frequency);
                break;

            case 3:
                frequency = note / 12;
                frequency = 440 * frequency * frequency;
                saw.start(frequency);
                break;
        }
        //console.log( frequency + "Hz" );
    }

    function stopInstrument(user) {
        switch (user) {
            case 0:
                sine.stop();
                break;

            case 1:
                break;

            case 2:
                sineB.stop();
                break;

            case 3:
                saw.stop();
                break;
        }
    }

    //
    function onEveryBeat(t) {
        for (var u = 0, l = userNames.length; u < l; ++u) {
            // fetch the user name
            var userName = userNames[u];
            var data = userName + index;

            var $element = $matrix.data(data);
            if ($element) {
                // so we have an element in our db!
                var position = parseInt($element.attr("alt"));
                var column = position % steps;
                var key = notes - (position / steps) >> 0;

                // console.log(userName+" Beat "+index+" in key "+key+" occurred checking "+data);
                // check to see if an existing note already exists
                //$element = $( $buttons[ index ] );
                // check to see if there are any nodes registered here
                //console.log( "Key found, not playing" );
                playUserInstrument(u, key);
            } else {
                //console.log("No Beat "+userName+" index:"+ index+" key:"+key);
                stopInstrument(u);
                //.stop();
            }
        }

        // move bar to correct position
        $bar.css("left", (index * 100 / steps) + "%");

        //console.log("Beat "+index+" occurred bar : "+(index*100/16));
        index = (index + 1) % steps;
        return index;
    }

    // Beat commencing at point due to netronome...
    function onProgress(percent) {
        // console.log("Progress : "+percent);
        return true;
    }

    // Beat has been pressed
    function onBeatSelected(element) {
        var $this = $(element);

        // check to see if it is already pressed...
        var isActive = $this.data("activeA") || false;

        if (isActive)
            onBeatDeselect($this);
else
            onBeatRequest($this);
    }

    // Inactive Beat has been pressed
    function onBeatRequest($element) {
        selectBeat($element, db.userid);
    }

    // Active Beat has been pressed
    function onBeatDeselect($element) {
        deselectBeat($element, db.userid);
    }

    function onBeatPressed(event) {
        var $this = $(this);
        var isActive = $this.data("activeA") || false;

        if (isActive)
            deselectBeat($this, db.userid);
else
            selectBeat($this, db.userid);
        //console.log("Beat pressed");
    }

    function onBeatRolledOver(event) {
        if (mouseDown)
            onBeatSelected(this);
else
            $(this).addClass("over");
    }

    function onBeatRolledOut() {
        //console.log("Beat out");
        $(this).removeClass("over");
        //$( this ).unbind( "mouseout" );
    }

    // Foreign events from web service!
    function onForeignBeat(user, step, key) {
        // figure out where the beat is on the system...
        var i = step + (notes * key);
        var $element = $($buttons[i]);

        selectBeat($element, user, false);
    }

    // Mouse events
    function onMouseDown(event) {
        mouseDown = true;
    }

    function onMouseUp(event) {
        mouseDown = false;
    }

    function onUserID(id) {
        id = id >> 0;
        switch (id) {
            case -1:
                onRoomFullError();
                return;

            case 0:
                $body.addClass('sine');
                break;

            case 1:
                $body.addClass('drums');
                break;

            case 2:
                $body.addClass('bass');
                break;

            case 3:
                $body.addClass('saw');
                break;
        }

        isLoaded = true;
        $body.removeClass("loading");
        netronome.start(bpm);

        var progress = netronome.percentage * steps;
        index = progress >> 0;

        $matrix.show();
    }
    function onRoomFullError() {
        var copy = "I'm sorry, we had to limit the quantity of people using this app, perhaps try again later!";
        alert(copy);
        $body.removeClass("loading").addClass("error");
        $matrix.html(copy);
    }

    // Screen resize
    function onMatrixResize(event) {
        if (timeout)
            clearTimeout(timeout);
        timeout = setTimeout(onActualResize, 400);
    }

    // Screen resize
    function onActualResize(event) {
        var screenWidth = $window.width();
        var screenHeight = $window.height();

        if (screenWidth < screenHeight) {
            // no scrollbar
            //console.log( "safe height for matrix "+screenHeight+" with "+$matrix.height() );
            $content.width("100%");
            $content.css("margin-left", 0);
        } else {
            // scroll bar so readjust size
            //console.log( "matrix exceeding height "+screenHeight+" with "+$matrix.height() );
            $content.width(screenHeight + "px");
            var leftOver = $(window).width() - screenHeight;
            $content.css("margin-left", leftOver * 0.5);
        }
    }
    function onUnloaded() {
        db.disconnect();
    }

    // BEGIN ----------------------------------------------------------------------
    $body.addClass("loading");

    // loop through here and create our 16 x 16 grid
    var boxes = "";
    for (var g = 0; g < quantity; ++g) {
        boxes += '<article alt="' + g + '" class="button"></article>';
    }

    // add in our progress bar
    boxes += '<div class="progress"></div>';

    // finally inject boxes!
    $matrix.html(boxes);
    $matrix.hide();

    var $buttons = $("article.button", $matrix);
    var $bar = $("div.progress", $matrix);

    // first check for mouse down
    $matrix.mousedown(onMouseDown);

    //$matrix.mouseup( onMouseUp );
    $window.mouseup(onMouseUp);

    // now convert each of these boxes into a specific ID
    $buttons.mouseover(onBeatRolledOver);
    $buttons.mouseout(onBeatRolledOut);
    $buttons.click(onBeatPressed);

    // now before we reveal the $matrix...
    // let's hide all our buttons then stagger them in with GSAP
    //TweenMax.staggerToFrom( $buttons, 1, { alpha:0 }, { alpha:1 }, 1 )//.onComplete( function(){ $matrix.show(); } );
    //TweenMax.staggerTo( $buttons, 1, {alpha:1 }, 1 , $matrix.show )//.onComplete( function(){ $matrix.show(); } );
    /*
    $window.keydown(
    function( event ) {
    
    if ( event.which == 13 ) {
    event.preventDefault();
    }
    var user = 1+(Math.random() * 3) >> 0;
    var step = ( Math.random() * 16 ) >> 0;
    var key = ( Math.random() * 16 ) >> 0;
    onForeignBeat( user, step, key );
    console.log("keypress "+event.which );
    }
    );
    */
    // when user closes the window
    window.onunload = onUnloaded;
    $window.resize(onMatrixResize);
    onActualResize(null);

    // Kick things off!
    db.connect();
});
