export const findNode = (ticks, fn) => {
    for (let i = 0, len = ticks.length; i < len; i++) {
        if (fn(ticks[i])) {
            return i;
        }
    }

    return -1;
};

export const e10 = Math.sqrt(50);
export const e5 = Math.sqrt(10);
export const e2 = Math.sqrt(2);

export function tickIncrement(start, stop, count) {
    const step = (stop - start) / Math.max(0, count);
    const power = Math.floor(Math.log(step) / Math.LN10);
    const error = step / Math.pow(10, power);
    const result = error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1;

    if (power >= 0) {
        return Math.pow(10, power) * result;
    }

    return -Math.pow(10, -power) / result;
}

export const createElementNS = (tag, attrs = {}) => {
    const elem = document.createElementNS(svgNS, tag);

    for (let attr in attrs) {
        if (attrs.hasOwnProperty(attr)) {
            elem.setAttribute(attr, attrs[attr]);
        }
    }

    return elem;
};

export const createElement = (tag, attrs = {}) => {
    const elem = document.createElement(tag);

    for (let attr in attrs) {
        if (attrs.hasOwnProperty(attr)) {
            elem.setAttribute(attr, attrs[attr]);
        }
    }

    return elem;
};

export const ease = t => t;

export const svgNS = 'http://www.w3.org/2000/svg';
export const findMaximum = array => array.reduce((acc, item) => item > acc ? item : acc, -Infinity);
export const findMinimum = array => array.reduce((acc, item) => item < acc ? item : acc, Infinity);
export const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec'
];
export const days = [
    'Sun',
    'Mon',
    'Tue',
    'Wen',
    'Thu',
    'Fri',
    'Sat'
];