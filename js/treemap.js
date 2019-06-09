const treemap = function() {
    dispatch.on('inittreemap', data => {
        console.log('[event] treemap', data);
        clearLeftVis();
        const { container, margin, content } = leftDimensions;

        // currentLeftVis = 'treemap'
        currentLeftVis = 'treemap';

        d3.select('#left-footer')
            .append('button')
            .attr('class', 'btn btn-primary')
            .text('添加')
            .on('click', () => {
                const selected = data.filter(d => d.isSelected);
                if (selected.length === 0) {
                    alert('不能为空')
                }
                //获得名字
                const name = $('#btn-people-name').val();
                if (name == "") {
                    alert("请输入名字");
                    return;
                }
                $('#btn-people-name').val("");
                selected.forEach(d => { d.type = name;
                    d.isSelected = false })
                dispatch.call('inittreemap', this, data);
            })

        d3.select('#left-footer')
            .append('button')
            .attr('class', 'btn btn-primary')
            .text('删除')
            .on('click', () => {
                const selected = data.filter(d => d.isSelected);
                if (selected.length === 0) {
                    alert('不能为空')
                }
                selected.forEach(d => d.type = '普通人');
                dispatch.call('inittreemap', this, data);
            })

        d3.select('#left-footer')
            .append('button')
            .attr('class', 'btn btn-primary')
            .text('清空')
            .on('click', () => {
                data.forEach(d => d.isSelected = false);
                dispatch.call('inittreemap', this, data);
            })

        d3.select('#left-footer')
            .append('input')
            .attr('type', 'text')
            .attr('id', 'btn-people-name')
            .style('width', '50px')

        const svg = d3.select('#left-vis')
            .append('svg')
            .attr('width', container.width)
            .attr('height', container.height)
            .style('background', 'black')
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.right})`);




        //计算颜色比例尺
        const countByType = d3.map();
        for (let g of data) {
            const t = g.type;
            let c = countByType.get(t);
            if (!c) {
                countByType.set(t, 1);
                continue;
            }
            c++;
            countByType.set(t, c);
        }
        const range = [];
        const step = 1 / countByType.size();
        for (let i = 0; i < 1; i += step) {
            range.push(d3.interpolateCool(i))
        }
        const domain = countByType.keys()
        domain.sort((a, b) => countByType.get(a.type) - countByType.get(b.type));
        const color = d3.scaleOrdinal()
            .domain(countByType.keys())
            .range(range);

        //对数据进行排序， 从数量多到数量少排序
        data.sort((a, b) => countByType.get(a.type) - countByType.get(b.type));

        //50 X 220

        const w = content.width / 50;
        const h = (content.height - 100) / 220;
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
            .attr('height', h)
            .on('click', d => {
                console.log('click');
                data.forEach(item => { if (item.type === d.type) item.isSelected = !item.isSelected });
                dispatch.call('inittreemap', this, data);
            })
            .append('title')
            .text(d => `id:${d.id}, type:${d.type}`);
    })

}();