import { Animate } from './animation'
import * as global from './globals'

export class Chart {
    constructor(mainContainer, data = { columns: [], types: [], names: [], colors: [] }, params = { name: 'Default chart' }) {
        this.chartContainer = global.createElement('div');
        this.chartContainer.classList.add('chart');
        mainContainer.appendChild(this.chartContainer);

        this.title = global.createElement('p');
        this.title.classList.add('title');
        this.title.innerText = params.title;
        this.chartContainer.appendChild(this.title);

        this.animations = new Animate();


        this.width = params.width || this.chartContainer.clientWidth;
        this.height = params.height || this.chartContainer.clientHeight;
        this.chartHeight = (params.height || this.chartContainer.clientHeight) - 25;
        this.chartWidth = (params.width || this.chartContainer.clientWidth) - 20;
        this.offsetHeight = 38

        this.createBigChart();
        this.createDefsForInfoBox();
        this.createMiniChart();

        this.UpdateDimensions();

        this.xContainer = null;
        this.yContainer = null;
        this.infoContainer = null;
        this.xCount = 0;
        this.yCount = 0;
        this.pointX = -1;
        this.offsetLeft = 0.7;
        this.offsetRight = 1;
        this.maximum = 0;
        this.minimum = 0;
        this.zoomRatio = 1;
        this.offsetMaximum = 0;
        this.offsetMinimum = 0;

        this.xAxisData = data.columns.find(column => data.types[column[0]] === 'x').slice(1);
        this.chartLinesData = data.columns.filter(column => data.types[column[0]] === 'line').map(line => {
            const id = line[0];

            return {
                id,
                name: data.names[id],
                data: line.slice(1),
                color: data.colors[id],
                viewport: null,
                offsetViewport: null,
                visible: true
            };
        });

        const resizeEvent = () => {
            document.body.classList.add('resize');
            this.UpdateDimensions();
            this.draw();
            document.body.classList.remove('resize');
        };

        if ('ResizeObserver' in window) {
            const ro = new ResizeObserver(resizeEvent);

            ro.observe(document.body);
        } else {
            window.addEventListener('resize', resizeEvent);
        }

        window.addEventListener('resize', () => {

        });

        this.getMinMax();
        this.getMinMaxOffset();

        this.createLinesContainer();
        this.createX();
        this.createY();
        this.createToggleButtons();
        this.createInfoBox();

        this.draw();
    }

    createBigChart() {
        this.bigChart = global.createElementNS('svg', {
            'preserveAspectRatio': 'xMidYMid meet'
        });
        this.bigChart.classList.add('bigChart');
        this.chartContainer.appendChild(this.bigChart);

        this.bigChart.addEventListener('mousemove', e => {
            e.stopPropagation();

            const selectedX = Math.floor((this.offsetLeft + e.clientX / this.width * (this.offsetRight - this.offsetLeft)) * this.xAxisData.length);

            if (selectedX === this.pointX) {
                return;
            }

            this.pointX = selectedX;

            this.drawInfoBox();
        });

        document.addEventListener('mousemove', () => {
            this.pointX = -1;

            if (this.infoContainer) {
                this.infoContainer.style.opacity = 0;
            }
        })
    }

    createDefsForInfoBox() {
        const defs = global.createElementNS('defs');

        const infoFilter = global.createElementNS('filter', {
            id: 'info-filter'
        });

        const feDropShadow = global.createElementNS('feDropShadow', {
            in: 'SourceGraphic',
            'flood-color': '#000000',
            'flood-opacity': '0.25',
            stdDeviation: '1',
            dx: '0',
            dy: '0.5',
            result: 'dropShadow'
        });

        const clipPath = global.createElementNS('clipPath', {
            id: 'lines-clip'
        });

        const clipRect = global.createElementNS('rect', {
            x: '0',
            y: '0',
            width: this.width,
            height: this.chartHeight
        });

        clipPath.appendChild(clipRect);

        infoFilter.appendChild(feDropShadow);
        defs.appendChild(clipPath);
        defs.appendChild(infoFilter);
        this.bigChart.appendChild(defs);
    }

    createLinesContainer() {
        this.linesContainer = global.createElementNS('g', {
            fill: 'none',
            'stroke-width': '2',
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round'
        });
        this.linesContainer.classList.add('linesContainer');
        this.bigChart.appendChild(this.linesContainer);
    }

    createMiniChart() {
        this.miniChartContainer = global.createElement('div');
        this.miniChartContainer.classList.add('miniChartContainer');
        this.miniChartContainer.style.padding = `0 ${10}px`;
        this.chartContainer.appendChild(this.miniChartContainer);

        this.miniChart = global.createElementNS('svg');
        this.miniChart.classList.add('miniChart');
        this.miniChartContainer.appendChild(this.miniChart);

        const selector = global.createElementNS('rect', {
            fill: 'transparent'
        });
        selector.classList.add('selector');
        this.miniChart.appendChild(selector);

        const left = global.createElementNS('rect');
        left.classList.add('drag');
        left.classList.add('drag-left');
        this.miniChart.appendChild(left);

        const right = global.createElementNS('rect');
        right.classList.add('drag');
        right.classList.add('drag-right');
        this.miniChart.appendChild(right);

        this.miniChartLinesContainer = global.createElementNS('g', {
            fill: 'none',
            'stroke-width': '1',
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round'
        });
        this.miniChart.appendChild(this.miniChartLinesContainer);

        const afterLeft = global.createElementNS('rect', {
            x: '0'
        });
        afterLeft.classList.add('after');
        afterLeft.classList.add('after-left');
        this.miniChart.appendChild(afterLeft);

        const afterRight = global.createElementNS('rect');
        afterRight.classList.add('after');
        afterRight.classList.add('after-right');
        this.miniChart.appendChild(afterRight);

        this.handleDrag();
    }

    handleDrag() {
        let leftisDragging = false;
        let rightIsDragging = false;
        let leftCoord = 0;
        let rightCoord = 0;
        let fatFinger = 10;
        let border = 0.07;

        const mouseDownHandler = e => {
            const x = e.touches && e.touches.length ? e.touches[0].clientX : e.clientX;

            if ((x >= this.offsetLeft * this.width - fatFinger) && (x < this.offsetRight * this.width - fatFinger)) {
                e.stopPropagation();
                leftisDragging = true;
                leftCoord = x - this.offsetLeft * this.width;
            }
            if ((x > this.offsetLeft * this.width + fatFinger) && (x <= this.offsetRight * this.width + fatFinger)) {
                e.stopPropagation();
                rightIsDragging = true;
                rightCoord = x - this.offsetRight * this.width;
            }
        };
        const mouseUpHandler = function () {
            leftisDragging = false;
            rightIsDragging = false;
            leftCoord = 0;
            rightCoord = 0;
        };
        const mouseMoveHandler = e => {
            const x = e.changedTouches && e.changedTouches.length ? e.changedTouches[0].clientX : e.clientX;

            if (leftisDragging || rightIsDragging) {
                if (leftisDragging) {
                    let newLeft = x - leftCoord;

                    this.offsetLeft = newLeft / this.width;
                }

                if (rightIsDragging) {
                    let newRight = x - rightCoord;

                    this.offsetRight = newRight / this.width;
                }

                if (this.offsetRight - this.offsetLeft < border) {
                    if (leftisDragging) {
                        this.offsetRight = this.offsetLeft + border;
                    } else if (rightIsDragging) {
                        this.offsetLeft = this.offsetRight - border;
                    }
                }

                if (this.offsetRight < border) {
                    this.offsetRight = border;
                }

                if (this.offsetRight > 1) {
                    this.offsetRight = 1;
                }

                if (this.offsetLeft < 0) {
                    this.offsetLeft = 0;
                }

                if (this.offsetLeft > 1 - border) {
                    this.offsetLeft = 1 - border;
                }

                this.draw();
            }
        };

        if ('ontouchstart' in window) {
            this.miniChart.addEventListener('touchstart', function (e) { mouseDownHandler(e) });
            this.miniChart.addEventListener('touchmove', function (e) { mouseMoveHandler(e) });
            document.addEventListener('touchend', function () { mouseUpHandler() });
        } else {
            this.miniChart.addEventListener('mousedown', function (e) { mouseDownHandler(e) });
            this.miniChart.addEventListener('mousemove', function (e) { mouseMoveHandler(e) });
            document.addEventListener('mouseup', function () { mouseUpHandler() });
        }
    }

    createToggleButtons() {
        const toggleContainer = global.createElement('div');
        toggleContainer.classList.add('toggleContainer');
        this.miniChartContainer.appendChild(toggleContainer);

        this.chartLinesData.forEach(line => {
            const label = global.createElement('label');
            const checkbox = global.createElement('input', {
                type: 'checkbox',
                checked: line.visible
            });
            const text = global.createElement('span');
            const icon = global.createElement('div');

            label.classList.add('toggle');
            text.innerText = line.name;
            icon.style.backgroundColor = line.color;
            icon.classList.add('toggle-icon');

            if (!line.visible) {
                label.classList.add('toggle-disabled');
            }

            checkbox.addEventListener('change', () => this.toggleLine(label, line));

            label.appendChild(checkbox);
            label.appendChild(icon);
            label.appendChild(text);
            toggleContainer.appendChild(label);
        });
    }

    createX() {
        this.xContainer = global.createElementNS('g', {
            transform: `translate(0, ${this.chartHeight + 15})`
        });
        this.xContainer.classList.add('xContainer');
        this.bigChart.appendChild(this.xContainer);
    }

    createY() {
        this.yContainer = global.createElementNS('g');
        this.yContainer.classList.add('yContainer');
        this.bigChart.appendChild(this.yContainer);
    }

    createInfoBox() {
        if (this.infoContainer) {
            return;
        }

        this.infoContainer = global.createElementNS('g');

        const xLine = global.createElementNS('line', {
            y1: '3px',
            y2: this.chartHeight + 'px',
            x1: '0',
            x2: '0',
            'stroke-width': '1px'
        });
        xLine.classList.add('xLine');
        this.infoContainer.appendChild(xLine);

        const infoContainer = global.createElementNS('g');
        infoContainer.classList.add('info-wrapper');

        this.chartLinesData.forEach(line => {
            const indicator = global.createElementNS('circle', {
                r: '4px',
                cx: '0',
                stroke: line.color,
                'stroke-width': '2px'
            });
            indicator.classList.add('indicator');
            indicator.dataset.id = line.id;

            this.infoContainer.appendChild(indicator);
        });

        this.infoContainer.appendChild(infoContainer);

        const infoBox = global.createElementNS('rect', {
            'stroke-width': '1px',
            rx: '5',
            ry: '5',
            y: '1px',
            x: '-25px'
        });
        infoBox.classList.add('infoBox');
        infoContainer.appendChild(infoBox);

        const dayLabel = global.createElementNS('text', {
            fill: 'black',
            y: '19px',
            x: '-17px'
        });
        dayLabel.classList.add('day');
        infoContainer.appendChild(dayLabel);

        const valueContainer = global.createElementNS('g');
        valueContainer.classList.add('valueContainer');
        infoContainer.appendChild(valueContainer);

        this.bigChart.appendChild(this.infoContainer);
    }

    drawSelector() {
        const selector = this.miniChart.querySelector('.selector');
        const left = this.miniChart.querySelector('.drag-left');
        const right = this.miniChart.querySelector('.drag-right');
        const afterLeft = this.miniChart.querySelector('.after-left');
        const afterRight = this.miniChart.querySelector('.after-right');

        if (!selector && !left && !right && !afterLeft && !afterRight) {
            return;
        }

        const leftOffset = this.width * this.offsetLeft;
        const rightOffset = this.width * this.offsetRight;
        const selectorWidth = rightOffset - leftOffset;

        left.setAttribute('x', leftOffset);
        selector.setAttribute('x', leftOffset);
        selector.setAttribute('width', selectorWidth);
        right.setAttribute('x', rightOffset - 3);
        afterLeft.setAttribute('width', leftOffset);
        afterRight.setAttribute('x', rightOffset);
        afterRight.setAttribute('width', this.width - selectorWidth);
    }

    getMinMax() {
        let elements = [];
        const lenth = this.xAxisData.length;
        for (let i = 0, len = this.chartLinesData.length; i < len; i++) {
            if (this.chartLinesData[i].visible) {
                elements.push(this.chartLinesData[i].data.slice(Math.floor(this.offsetLeft * lenth), Math.ceil(this.offsetRight * lenth)));
            }
        }

        this.maximum = global.findMaximum(elements.map(line => global.findMaximum(line)));

        this.zoomRatio = 1 / (this.offsetRight - this.offsetLeft);
    }

    getMinMaxOffset() {
        let elements = [];
        for (let i = 0, len = this.chartLinesData.length; i < len; i++) {
            if (this.chartLinesData[i].visible) {
                elements.push(this.chartLinesData[i].data);
            }
        }

        this.offsetMaximum = global.findMaximum(elements.map(line => global.findMaximum(line)));
    }

    UpdateDimensions() {
        this.width = this.chartContainer.clientWidth;
        this.chartWidth = this.width - 20;

        this.bigChart.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);

        if (!this.miniChart) {
            return;
        }

        this.miniChart.setAttribute('viewBox', `0 0 ${this.width} ${this.offsetHeight}`);

        if (!this.yContainer) {
            return;
        }

        const lines = this.yContainer.querySelectorAll('line');

        lines.forEach(line => {
            line.setAttribute('x2', this.chartWidth + 10);
        })
    }

    drawX() {
        this.renderXTicks();

        const ticks = this.xContainer.querySelectorAll('text');

        for (let i = 0, len = ticks.length; i < len; i++) {
            const index = (ticks[i].dataset.index);
            let position = (index / (this.xAxisData.length - 1) - this.offsetLeft) * this.width * this.zoomRatio;
            position = position === 0 ? 25 : position;
            ticks[i].setAttribute('transform', `translate(${position}, 0)`);
        }
    }

    renderXTicks() {
        let ticks = this.xContainer.querySelectorAll('text');
        let animate = false;

        const countView = Math.floor(this.xAxisData.length / 5);
        const interval = Math.ceil(Math.log2(countView / this.zoomRatio));
        const count = Math.ceil(this.xAxisData.length / 2 ** interval * this.zoomRatio);

        if (this.xCount && this.xCount !== count) {
            animate = true;
            for (let i = 0, len = ticks.length; i < len; i++) {
                if (Number(ticks[i].dataset.index) % (2 ** interval) !== 0) {
                    this.animations.fadeOut(ticks[i], 300, function (node) { node && node.remove() });
                }
            }
        }

        this.xCount = count;
        const xLength = this.xAxisData.length;
        for (let i = 0; i < count; i++) {
            const newIndex = i * 2 ** interval;
            const position = (newIndex / (xLength - 1) - this.offsetLeft) * this.width * this.zoomRatio;
            const value = this.xAxisData[newIndex];

            if (!value) {
                continue;
            }

            const foundTick = global.findNode(ticks, tick => Number(tick.dataset.index) === newIndex);
            let tick = ticks[foundTick];

            if (position >= 0 && position <= this.width) {
                if (!tick) {
                    tick = this.createXTick(newIndex);

                    if (animate) {
                        this.animations.fadeIn(tick);
                    }

                    this.xContainer.appendChild(tick);
                }
            } else if (tick) {
                this.xContainer.removeChild(tick);
            }
        }
    }

    createXTick(index) {
        const tick = global.createElementNS('text');
        tick.textContent = this.getDateLabel(this.xAxisData[index]);
        tick.dataset.index = index;

        return tick;
    }

    drawY() {
        this.renderYTicks();

        const ticks = this.yContainer.querySelectorAll('g');

        if (this.maximum === -Infinity) {
            return;
        }

        for (let i = 0, len = ticks.length; i < len; i++) {
            const index = Number(ticks[i].dataset.id);
            const coord = (this.maximum - index) / (this.maximum - this.minimum) * this.chartHeight;

            ticks[i].setAttribute('transform', `translate(0, ${coord})`);
        }
    }

    renderYTicks() {
        const requiredTicks = 6;
        const yTickInterval = global.tickIncrement(this.minimum, this.maximum, requiredTicks);
        const yTicksCount = Math.ceil((this.maximum - this.minimum) / yTickInterval);

        if (this.yCount && yTickInterval * yTicksCount === this.yCount) {
            return;
        }

        this.yCount = yTickInterval * yTicksCount;

        let ticks = this.yContainer.querySelectorAll('g');
        const shouldAnimate = ticks.length !== 0;

        for (let i = 0, len = ticks.length; i < len; i++) {
            if (ticks && (Number(ticks[i].dataset.id) % yTickInterval !== 0) || this.maximum === -Infinity) {
                this.animations.fadeOut(ticks[i], 300, node => node && node.remove());
            }
        }

        if (this.maximum === -Infinity) {
            return;
        }

        for (let i = 0; i < yTicksCount; i++) {
            const value = this.minimum + i * yTickInterval;
            const tickIndex = global.findNode(ticks, tick => Number(tick.dataset.id) === value);
            let tick = ticks[tickIndex];

            if (!tick) {
                tick = this.createYTick(value);

                if (shouldAnimate) {
                    this.animations.fadeIn(tick, 300);
                }

                this.yContainer.appendChild(tick);
            }
        }
    }

    createYTick(value) {
        const tick = global.createElementNS('g');
        const tickLine = global.createElementNS('line', {
            x1: 10,
            y1: '0',
            x2: 10 + this.chartWidth,
            y2: '0'
        });
        const tickLabel = global.createElementNS('text', {
            x: 10,
            y: '-5px'
        });

        if (value === this.minimum) {
            tick.classList.add('.yLine');
        }

        tick.dataset.id = value;
        tickLabel.textContent = value;

        tick.appendChild(tickLine);
        tick.appendChild(tickLabel);

        return tick;
    }

    getDateLabel(time) {
        const date = new Date(time);

        return global.months[date.getMonth()] + ' ' + date.getDate();
    }

    drawLines() {
        this.getMinMax();
        this.chartLinesData.forEach(line => this.renderLine(line));

        this.linesContainer.setAttribute('transform', `translate(${10 + -this.offsetLeft * this.chartWidth * this.zoomRatio}, 0) scale(${this.zoomRatio}, 1)`);
    }

    renderLine(line, maximum = this.maximum, minimum = this.minimum) {
        if (!line.visible) {
            if (line.viewport) {
                line.viewport.style.opacity = 0;
            }
        } else {
            if (line.viewport) {
                line.viewport.style.opacity = 1;
            }
        }

        if (!line.viewport) {
            line.viewport = global.createElementNS('path', {
                stroke: line.color,
                'vector-effect': 'non-scaling-stroke'
            });
            this.linesContainer.appendChild(line.viewport);
        }

        if (this.maximum !== -Infinity && this.minimum !== Infinity) {
            const coords = this.convertLine(line.data, this.chartWidth, this.chartHeight, maximum, minimum);

            line.viewport.setAttribute('d', coords);
        }

        line.viewport.setAttribute('transform', ``);
    }

    drawMiniChartLines() {
        for (let i = 0, len = this.chartLinesData.length; i < len; i++) {
            this.drawMiniChartLine(this.chartLinesData[i]);
        }
    }

    drawMiniChartLine(line) {
        if (!line.visible) {
            if (line.offsetViewport) {
                line.offsetViewport.style.opacity = 0;
                return;
            }
        } else {
            if (line.offsetViewport) {
                line.offsetViewport.style.opacity = 1;
            }
        }

        if (!line.offsetViewport) {
            line.offsetViewport = global.createElementNS('path', {
                stroke: line.color
            });
            this.miniChartLinesContainer.appendChild(line.offsetViewport);
        }

        if (this.offsetMaximum !== -Infinity && this.offsetMinimum !== Infinity) {
            const coords = this.convertLine(line.data, this.width, this.offsetHeight, this.offsetMaximum, this.offsetMinimum);

            line.offsetViewport.setAttribute('d', coords);
        }
    }

    convertLine(data, width, height, maximum, minimum) {
        let tempArr = [];
        for (let index = 0, len = data.length; index < len; index++) {
            const x = (width / (len - 1) * index).toFixed(3);
            const yZoom = height / (maximum - minimum);
            const y = ((maximum - data[index]) * yZoom).toFixed(3);

            if (index === 0) {
                tempArr.push(`M${x},${y}`);
            }

            tempArr.push(`L${x},${y}`);
        }
        return tempArr.join();
    }

    toggleLine(label, line) {
        line.visible = !line.visible;

        label.classList.toggle('toggle-disabled');

        this.getMinMaxOffset();
        this.draw();
    }

    drawInfoBox() {
        if (this.pointX < 0 || this.pointX >= this.xAxisData.length || this.maximum === -Infinity) {
            if (this.infoContainer) {
                this.infoContainer.style.opacity = 0;
            }

            return;
        }

        this.infoContainer.style.opacity = 1;

        const weekLabel = this.infoContainer.querySelector('.day');
        const valuesG = this.infoContainer.querySelector('.valueContainer');
        const xInfoRect = this.infoContainer.querySelector('.infoBox');
        const xInfoWrapper = this.infoContainer.querySelector('.info-wrapper');

        const selectedElement = this.xAxisData[this.pointX];

        const week = new Date(selectedElement);
        const label = `${global.days[week.getDay()]}, ${global.months[week.getMonth()]} ${week.getDate()}`;
        const offset = 10 + (this.pointX / (this.xAxisData.length - 1) - this.offsetLeft) * this.chartWidth * this.zoomRatio;
        const elems = valuesG.querySelectorAll('text');

        let valuesLength = 0;
        let maxValuesLength = 0;

        this.infoContainer.setAttribute('transform', `translate(${offset}, 0)`);

        let invisibleItems = 0;

        this.chartLinesData
            .forEach((line, index) => {
                const foundElem = global.findNode(elems, elem => elem.dataset.id === line.id);
                let elem = elems[foundElem];

                if (!elem) {
                    elem = global.createElementNS('text', {
                        fill: line.color
                    });
                    elem.dataset.id = line.id;
                    const label = global.createElementNS('tspan');
                    label.classList.add('infoLabel');
                    label.textContent = line.name;
                    const value = global.createElementNS('tspan');
                    value.classList.add('infoValue');
                    elem.appendChild(value);
                    elem.appendChild(label);

                    valuesG.appendChild(elem);
                }

                const circles = this.infoContainer.querySelectorAll('.indicator');
                const lineCircle = global.findNode(circles, circle => circle.dataset.id === line.id);

                if (lineCircle >= 0) {
                    const circle = circles[lineCircle];

                    if (!line.visible) {
                        circle.style.opacity = 0;
                    } else {
                        circle.style.opacity = 1;
                    }

                    if (this.maximum === -Infinity) {
                        return;
                    }

                    const cy = (this.maximum - line.data[this.pointX]) / (this.maximum - this.minimum) * this.chartHeight;

                    circle.setAttribute('cy', cy + 'px');
                }

                if (!line.visible) {
                    elem.remove();
                    invisibleItems--;

                    return;
                }

                const currentIndex = index + invisibleItems;
                const value = elem.querySelector('.infoValue');
                const label = elem.querySelector('.infoLabel');

                if (!value || !label) {
                    return line.data[this.pointX];
                }

                const column = 2 % (currentIndex + 1) - 1;
                const x = -17 + Math.max(valuesLength, 30 * (currentIndex % 2));

                elem.setAttribute('x', x + 'px');
                elem.setAttribute('y', (65 + 18 * column) + 'px');
                label.setAttribute('x', x + 'px');
                label.setAttribute('y', (80 + 18 * column) + 'px');

                if (value.textContent !== String(line.data[this.pointX])) {
                    value.textContent = line.data[this.pointX];
                }

                if ((currentIndex + 1) % 2 === 0) {
                    valuesLength = 0;
                } else {
                    const elemLength = elem.getBBox().width + 10;

                    if (elemLength > maxValuesLength) {
                        maxValuesLength = elemLength;
                    }
                    valuesLength += Math.max(elemLength, maxValuesLength);
                }

                return line.data[this.pointX];
            });

        if (weekLabel.textContent !== label) {
            weekLabel.textContent = label;
        }

        const weekBB = weekLabel.getBBox();
        const labelsBB = valuesG.getBBox();

        const infoRectWidth = Math.round(Math.max(weekBB.width, labelsBB.width) + 20);
        const infoRectHeight = Math.round(weekBB.height + labelsBB.height + 25);

        if (offset + infoRectWidth > this.chartWidth + 10 * 3 + 5) {
            xInfoWrapper.setAttribute('transform', `translate(${-offset + this.chartWidth - infoRectWidth + 10 * 3 + 5}, 0)`);
        } else if (offset - 10 * 3 - 5 < 0) {
            xInfoWrapper.setAttribute('transform', `translate(${-offset + 10 * 3 + 5}, 0)`);
        } else {
            xInfoWrapper.removeAttribute('transform');
        }

        xInfoRect.setAttribute('width', infoRectWidth + 'px');
        xInfoRect.setAttribute('height', infoRectHeight + 'px');
    }

    draw() {
        this.drawLines();
        this.drawX();
        this.drawY();
        this.drawSelector();
        this.drawMiniChartLines();
        this.drawInfoBox();
    }
}