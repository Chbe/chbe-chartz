import { ease } from './globals';
export class Animate {
    constructor() {
        this.started = false;
        this.animations = new Map();
    }

    animationIterator() {
        if (!this.animations.size) {
            this.started = false;
            return;
        }

        this.started = true;
        
        for (let [node, data] of this.animations) {
            const { start, duration, callback, style, from, to } = data;
            const p = (Date.now() - start) / duration;
            const result = Math.min(ease(p), 1);

            data.current = from > to ? from - result : from + result;
            node.style[style] = data.current;

            if (result >= 1) {
                this.animations.delete(node);

                if (callback && typeof callback === 'function') {
                    callback(node);
                }
            }
        }

        requestAnimationFrame(() => this.animationIterator());
    }

    animate(node, style, from, to, duration = 300, callback) {
        let animation = this.animations.get(node);

        if (animation) {
            if (style === animation.style && from === animation.from && to === animation.to) {
                return;
            }
            const start = Date.now();

            animation.duration = Math.max(animation.start - start + duration, 0);
            animation.start = Date.now();
            animation.from = from;
            animation.to = to;
            animation.callback = callback;
        } else {
            animation = {
                start: Date.now(),
                style,
                duration,
                callback,
                current: from,
                from,
                to
            };

            this.animations.set(node, animation);
        }

        if (!this.started) {
            requestAnimationFrame(() => this.animationIterator());
        }
    }

    fadeIn(node, duration, callback) {
        return this.animate(node, 'opacity', 0, 1, duration, callback);
    }

    fadeOut(node, duration, callback) {
        return this.animate(node, 'opacity', 1, 0, duration, callback);
    }
}
