
export class Netronome {
        static EPOCH = Date.UTC(2013, 0, 21, 6, 6, 6);
        public percentage = 0;
        public clockOffset = 0;
        private period = 300;
        private playing = false;
        private lastTick = -1;
        private frame = 0;
        constructor(private callOnBeat: (scope: any, time: number) => any,
                    private callOnProgress: (scope: any, percent: number) => any,
                    private callbackScope: any) {}
        private tick(): number {
            return (Date.now() + this.clockOffset - Netronome.EPOCH) / this.period;
        }
        public stepIndex(steps: number): number { return Math.floor(this.tick()) % steps; }
        public start(bpm: number = 90): void {
            this.period = 60000 / bpm;
            if (this.playing) return;
            this.playing = true;
            this.lastTick = -1;
            this.onTimer();
        }
        public stop(): void {
            this.playing = false;
            cancelAnimationFrame(this.frame);
        }
        private onTimer(): void {
            if (!this.playing) return;
            const tick = this.tick();
            const whole = Math.floor(tick);
            this.percentage = tick - whole;
            if (whole !== this.lastTick) {
                this.lastTick = whole;
                this.callOnBeat(this.callbackScope, Date.now());
            }
            this.callOnProgress(this.callbackScope, this.percentage);
            this.frame = requestAnimationFrame(() => this.onTimer());
        }
    }
