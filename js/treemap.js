const treemap = function() {
    dispatch.on('inittreemap', data => {
        console.log('[event] treemap', data);
        clearRightVis();
        const { container, margin, content } = rightDimensions;


        const svg = d3.select('#right-vis')
            .append('svg')
            .attr('width', container.width)
            .attr('height', container.height)
            .style('background', 'black')
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.right})`);

        const color = d3.scaleOrdinal(d3.schemeCategory10);
        //对数据进行排序
        //50 X 220

        const w = (content.width + 120) / 50;
        const h = content.height / 220;
        svg.selectAll('rect')
            .data(data)
            .join('rect')
            .attr('stroke', 'black')
            .attr('fill', d => d.isSelected ? 'red' : color(d.type))
            .attr('x', (d, i) => w * (i % 50))
            .attr('y', (d, i) => {
            	return h * Math.floor(i / 50);
            })
            .attr('width', w)
            .attr('height',h)
            .append('title')
            .text(d => d.id);
    })

}();