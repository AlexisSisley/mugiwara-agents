/**
 * Mugiwara Dashboard v2 — D3.js chart rendering.
 * All chart functions are namespaced under window.MugiCharts.
 */

(function () {
    'use strict';

    var MugiCharts = {};

    /* ------------------------------------------------------------------ */
    /*  Sparkline                                                          */
    /* ------------------------------------------------------------------ */

    MugiCharts.renderSparkline = function (selector, data, color) {
        var container = document.querySelector(selector);
        if (!container || !data || !data.length) return;

        container.innerHTML = '';
        var rect = container.getBoundingClientRect();
        var w = rect.width || 300;
        var h = rect.height || 80;
        var margin = { top: 8, right: 8, bottom: 20, left: 8 };

        var svg = d3.select(selector)
            .append('svg')
            .attr('width', w)
            .attr('height', h);

        var x = d3.scalePoint()
            .domain(data.map(function (d) { return d.date; }))
            .range([margin.left, w - margin.right]);

        var y = d3.scaleLinear()
            .domain([0, d3.max(data, function (d) { return d.value; }) || 1])
            .range([h - margin.bottom, margin.top]);

        var line = d3.line()
            .x(function (d) { return x(d.date); })
            .y(function (d) { return y(d.value); })
            .curve(d3.curveMonotoneX);

        // Gradient fill
        var gradientId = 'grad-' + selector.replace(/[^a-z0-9]/gi, '');
        var defs = svg.append('defs');
        var grad = defs.append('linearGradient')
            .attr('id', gradientId)
            .attr('x1', '0%').attr('y1', '0%')
            .attr('x2', '0%').attr('y2', '100%');
        grad.append('stop').attr('offset', '0%')
            .attr('stop-color', color || '#8B5CF6').attr('stop-opacity', 0.3);
        grad.append('stop').attr('offset', '100%')
            .attr('stop-color', color || '#8B5CF6').attr('stop-opacity', 0.02);

        // Area
        var area = d3.area()
            .x(function (d) { return x(d.date); })
            .y0(h - margin.bottom)
            .y1(function (d) { return y(d.value); })
            .curve(d3.curveMonotoneX);

        svg.append('path')
            .datum(data)
            .attr('fill', 'url(#' + gradientId + ')')
            .attr('d', area);

        // Line
        svg.append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', color || '#8B5CF6')
            .attr('stroke-width', 2)
            .attr('d', line);

        // Dots
        svg.selectAll('.dot')
            .data(data)
            .enter().append('circle')
            .attr('cx', function (d) { return x(d.date); })
            .attr('cy', function (d) { return y(d.value); })
            .attr('r', 3)
            .attr('fill', color || '#8B5CF6')
            .attr('stroke', 'var(--bg-primary)')
            .attr('stroke-width', 1.5);

        // X-axis labels (date short)
        svg.selectAll('.x-label')
            .data(data)
            .enter().append('text')
            .attr('x', function (d) { return x(d.date); })
            .attr('y', h - 2)
            .attr('text-anchor', 'middle')
            .attr('fill', 'var(--text-muted)')
            .attr('font-size', '10px')
            .text(function (d) {
                var parts = d.date.split('-');
                return parts[2] + '/' + parts[1];
            });
    };

    /* ------------------------------------------------------------------ */
    /*  Heatmap (day-of-week × hour-of-day)                               */
    /* ------------------------------------------------------------------ */

    MugiCharts.renderHeatmap = function (selector, data) {
        var container = document.querySelector(selector);
        if (!container) return;

        container.innerHTML = '';
        var rect = container.getBoundingClientRect();
        var w = rect.width || 700;
        var cellSize = Math.floor((w - 60) / 24);
        var h = cellSize * 7 + 40;

        var svg = d3.select(selector)
            .append('svg')
            .attr('width', w)
            .attr('height', h);

        var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        var maxCount = d3.max(data, function (d) { return d.count; }) || 1;

        var colorScale = d3.scaleSequential(d3.interpolateRgbBasis([
            'rgba(139, 92, 246, 0.05)',
            'rgba(139, 92, 246, 0.3)',
            'rgba(236, 72, 153, 0.6)',
            'rgba(236, 72, 153, 1)'
        ])).domain([0, maxCount]);

        // Day labels
        svg.selectAll('.day-label')
            .data(days)
            .enter().append('text')
            .attr('x', 0)
            .attr('y', function (d, i) { return i * cellSize + cellSize / 2 + 20; })
            .attr('dominant-baseline', 'middle')
            .attr('fill', 'var(--text-muted)')
            .attr('font-size', '11px')
            .text(function (d) { return d; });

        // Hour labels
        for (var hr = 0; hr < 24; hr += 3) {
            svg.append('text')
                .attr('x', 50 + hr * cellSize + cellSize / 2)
                .attr('y', 10)
                .attr('text-anchor', 'middle')
                .attr('fill', 'var(--text-muted)')
                .attr('font-size', '10px')
                .text(hr + 'h');
        }

        // Cells
        svg.selectAll('.cell')
            .data(data)
            .enter().append('rect')
            .attr('x', function (d) { return 50 + d.hour * cellSize; })
            .attr('y', function (d) { return (d.dow - 1) * cellSize + 18; })
            .attr('width', cellSize - 2)
            .attr('height', cellSize - 2)
            .attr('rx', 3)
            .attr('fill', function (d) { return colorScale(d.count); })
            .attr('stroke', 'rgba(255,255,255,0.05)')
            .append('title')
            .text(function (d) { return days[d.dow - 1] + ' ' + d.hour + 'h: ' + d.count + ' invocations'; });
    };

    /* ------------------------------------------------------------------ */
    /*  Donut chart                                                        */
    /* ------------------------------------------------------------------ */

    MugiCharts.renderDonut = function (selector, data, colors) {
        var container = document.querySelector(selector);
        if (!container || !data || !data.length) return;

        container.innerHTML = '';
        var size = Math.min(container.getBoundingClientRect().width || 250, 250);
        var radius = size / 2;

        var svg = d3.select(selector)
            .append('svg')
            .attr('width', size)
            .attr('height', size)
            .append('g')
            .attr('transform', 'translate(' + radius + ',' + radius + ')');

        var arc = d3.arc()
            .innerRadius(radius * 0.6)
            .outerRadius(radius - 4);

        var pie = d3.pie()
            .value(function (d) { return d.value; })
            .sort(null);

        var defaultColors = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
        var colorFn = colors
            ? function (d, i) { return colors[d.data.label] || defaultColors[i % 5]; }
            : function (d, i) { return defaultColors[i % 5]; };

        var arcs = svg.selectAll('arc')
            .data(pie(data))
            .enter().append('g');

        arcs.append('path')
            .attr('d', arc)
            .attr('fill', colorFn)
            .attr('stroke', 'var(--bg-primary)')
            .attr('stroke-width', 2);

        // Labels
        arcs.append('text')
            .attr('transform', function (d) { return 'translate(' + arc.centroid(d) + ')'; })
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .attr('font-size', '11px')
            .text(function (d) { return d.data.value > 0 ? d.data.label : ''; });

        // Center total
        var total = d3.sum(data, function (d) { return d.value; });
        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', 'var(--text-primary)')
            .attr('font-size', '22px')
            .attr('font-weight', 'bold')
            .text(total);
    };

    /* ------------------------------------------------------------------ */
    /*  Horizontal bar chart                                               */
    /* ------------------------------------------------------------------ */

    MugiCharts.renderBarH = function (selector, data, color) {
        var container = document.querySelector(selector);
        if (!container || !data || !data.length) return;

        container.innerHTML = '';
        var rect = container.getBoundingClientRect();
        var w = rect.width || 400;
        var barHeight = 28;
        var margin = { top: 4, right: 40, bottom: 4, left: 120 };
        var h = data.length * barHeight + margin.top + margin.bottom;

        var svg = d3.select(selector)
            .append('svg')
            .attr('width', w)
            .attr('height', h);

        var x = d3.scaleLinear()
            .domain([0, d3.max(data, function (d) { return d.value; }) || 1])
            .range([margin.left, w - margin.right]);

        var y = d3.scaleBand()
            .domain(data.map(function (d) { return d.label; }))
            .range([margin.top, h - margin.bottom])
            .padding(0.2);

        // Bars
        svg.selectAll('.bar')
            .data(data)
            .enter().append('rect')
            .attr('x', margin.left)
            .attr('y', function (d) { return y(d.label); })
            .attr('width', function (d) { return x(d.value) - margin.left; })
            .attr('height', y.bandwidth())
            .attr('rx', 4)
            .attr('fill', color || '#8B5CF6')
            .attr('opacity', 0.8);

        // Labels (left)
        svg.selectAll('.label')
            .data(data)
            .enter().append('text')
            .attr('x', margin.left - 6)
            .attr('y', function (d) { return y(d.label) + y.bandwidth() / 2; })
            .attr('text-anchor', 'end')
            .attr('dominant-baseline', 'middle')
            .attr('fill', 'var(--text-secondary)')
            .attr('font-size', '12px')
            .text(function (d) { return d.label; });

        // Values (right of bar)
        svg.selectAll('.value')
            .data(data)
            .enter().append('text')
            .attr('x', function (d) { return x(d.value) + 6; })
            .attr('y', function (d) { return y(d.label) + y.bandwidth() / 2; })
            .attr('dominant-baseline', 'middle')
            .attr('fill', 'var(--text-muted)')
            .attr('font-size', '11px')
            .text(function (d) { return d.value; });
    };

    /* ------------------------------------------------------------------ */
    /*  Re-init charts in container (after HTMX swap)                      */
    /* ------------------------------------------------------------------ */

    MugiCharts.initChartsInContainer = function (container) {
        // Auto-init any [data-chart] elements inside the container
        container.querySelectorAll('[data-chart]').forEach(function (el) {
            var type = el.getAttribute('data-chart');
            var dataAttr = el.getAttribute('data-chart-data');
            var color = el.getAttribute('data-chart-color');
            if (!dataAttr) return;
            try {
                var chartData = JSON.parse(dataAttr);
                if (type === 'sparkline') MugiCharts.renderSparkline('#' + el.id, chartData, color);
                if (type === 'heatmap') MugiCharts.renderHeatmap('#' + el.id, chartData);
                if (type === 'donut') MugiCharts.renderDonut('#' + el.id, chartData);
                if (type === 'barh') MugiCharts.renderBarH('#' + el.id, chartData, color);
            } catch (e) { /* ignore parse errors */ }
        });
    };

    window.MugiCharts = MugiCharts;
})();
