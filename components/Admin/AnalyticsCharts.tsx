
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface BarChartProps {
    data: { name: string; value: number }[];
    title: string;
}

export const BarChart: React.FC<BarChartProps> = ({ data, title }) => {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current || !data) return;

        const margin = { top: 20, right: 30, bottom: 40, left: 100 };
        const width = 450 - margin.left - margin.right;
        const height = 300 - margin.top - margin.bottom;

        d3.select(svgRef.current).selectAll('*').remove();

        const svg = d3.select(svgRef.current)
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleLinear()
            .domain([0, d3.max(data, (d) => d.value) || 10])
            .range([0, width]);

        const y = d3.scaleBand()
            .range([0, height])
            .domain(data.map((d) => d.name))
            .padding(0.2);

        // Axes
        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x).ticks(5))
            .selectAll('text')
            .attr('class', 'fill-text/40 text-[10px] uppercase font-bold');

        svg.append('g')
            .call(d3.axisLeft(y))
            .selectAll('text')
            .attr('class', 'fill-text/60 text-[10px] font-bold');

        // Remove axis lines
        svg.selectAll('.domain').remove();
        svg.selectAll('.tick line').attr('stroke', 'currentColor').attr('class', 'stroke-border-subtle opacity-20');

        // Bars
        svg.selectAll('rect')
            .data(data)
            .enter()
            .append('rect')
            .attr('x', x(0))
            .attr('y', (d) => y(d.name)!)
            .attr('width', (d) => x(d.value))
            .attr('height', y.bandwidth())
            .attr('class', 'fill-primary')
            .attr('rx', 4);

    }, [data]);

    return (
        <div className="bg-surface p-6 rounded-3xl border border-border-subtle">
            <h4 className="text-xs font-bold text-text/40 uppercase tracking-widest mb-4">{title}</h4>
            <div className="overflow-x-auto">
                <svg ref={svgRef}></svg>
            </div>
        </div>
    );
};

interface FunnelChartProps {
    data: { step: string; count: number }[];
}

export const FunnelChart: React.FC<FunnelChartProps> = ({ data }) => {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current || !data) return;

        // Define standard funnel order
        const order = ['session_start', 'search', 'frequency_click', 'countdown_activated'];
        const labels: Record<string, string> = {
            'session_start': 'Sesiones',
            'search': 'Búsquedas',
            'frequency_click': 'Clicks',
            'countdown_activated': 'Confirmados'
        };

        const sortedData = order.map(step => {
            const item = data.find(d => d.step === step);
            return { step: labels[step] || step, count: item?.count || 0 };
        });

        const margin = { top: 20, right: 20, bottom: 20, left: 20 };
        const width = 400 - margin.left - margin.right;
        const height = 300 - margin.top - margin.bottom;

        d3.select(svgRef.current).selectAll('*').remove();

        const svg = d3.select(svgRef.current)
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const maxCount = d3.max(sortedData, d => d.count) || 1;

        // Funnel shape points
        const points = sortedData.map((d, i) => {
            const w = (d.count / maxCount) * width;
            const x = (width - w) / 2;
            const y = (height / (sortedData.length - 1)) * i;
            return { x, y, w };
        });

        // Draw polygons
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];

            svg.append('polygon')
                .attr('points', `${p1.x},${p1.y} ${p1.x + p1.w},${p1.y} ${p2.x + p2.w},${p2.y} ${p2.x},${p2.y}`)
                .attr('class', 'fill-primary/20 stroke-primary stroke-1');

            svg.append('text')
                .attr('x', width / 2)
                .attr('y', (p1.y + p2.y) / 2)
                .attr('text-anchor', 'middle')
                .attr('class', 'fill-text font-bold text-[10px]')
                .text(`${sortedData[i].step}: ${sortedData[i].count}`);
        }

        // Last step label
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', height)
            .attr('text-anchor', 'middle')
            .attr('class', 'fill-text font-bold text-[10px]')
            .text(`${sortedData[sortedData.length - 1].step}: ${sortedData[sortedData.length - 1].count}`);

    }, [data]);

    return (
        <div className="bg-surface p-6 rounded-3xl border border-border-subtle">
            <h4 className="text-xs font-bold text-text/40 uppercase tracking-widest mb-4">Embudo de Conversión</h4>
            <div className="flex justify-center">
                <svg ref={svgRef}></svg>
            </div>
        </div>
    );
};
