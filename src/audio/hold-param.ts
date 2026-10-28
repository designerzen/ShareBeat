// Firefox does not implement cancelAndHoldAtTime. Read the current value before
// cancelling automation so retriggered envelopes and pitch glides stay continuous.
export function holdParam(param: AudioParam, time: number): void {
    if (typeof param.cancelAndHoldAtTime === 'function') {
        param.cancelAndHoldAtTime(time);
    } else {
        const value = param.value;
        param.cancelScheduledValues(time);
        param.setValueAtTime(value, time);
    }
}
