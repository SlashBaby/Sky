const grid = function() {
    dispatch.on('initgrids', (grids, sensors, tree) => {
        console.log('[event] init grid', grids, sensors);
        dispatch.call('inittreemap', this, allpeople);

        clearMainVis();

        //add buttons
        // d3.select('#main-footer')
        //     .append('button')
        //     .attr('class', 'btn btn-primary dom-grid')
        //     .attr('id', 'btn-grid-save')
        //     .text('保存数据')
        //     .on('click', saveTree)
        if (d3.select('#main-footer').empty()) {
            d3.select('#main-wrapper')
                .append('div')
                .attr('id', 'main-footer')
        }

        d3.select('#main-footer')
            .append('button')
            .attr('class', 'btn btn-primary dom-grid')
            .attr('id', 'btn-grid-addnode')
            .text('添加种类')
            .on('click', addType);

        d3.select('#main-footer')
            .append('input')
            .attr('class', 'dom-grid')
            .attr('type', 'text')
            .attr('id', 'grid-input-typename');

        updateType();

        const dataByFloor = floor => ({
            grids: grids.filter(d => +d.floor === floor),
            sensors: sensors.filter(d => +d.floor === floor)
        });

        const floor1 = dataByFloor(1),
            floor2 = dataByFloor(2);

        // vis
        const { container, margin, content } = mainDimensions;
        const chart = gridChart()
            .width(content.width)
            .height(content.height);

        // selections
        const svg = d3.select('#main-vis')
            .append('svg')
            .style('background', 'grey')
            .attr('width', container.width)
            .attr('height', container.height)

        const g = svg
            .selectAll('g')
            .data([floor1, floor2])
            .join('g')
            .attr('class', 'gGrid')
            .attr('transform', (d, i) => `translate(${content.width  / 2 - content.height / 2},${ 50 + content.height / 2 * i})`)

        g.append('g')
            .attr('class', 'grid-xAixs');

        g.append('g')
            .attr('class', 'grid-yAixs');

        g.append('g')
            .attr('class', 'grid-rect');

        g.append('g')
            .attr('class', 'grid-circle');

        g.call(chart);

        dispatch.on('update.grid', tree_data => {
            console.log('[event] update: grid', tree_data);

            clearMainVis();

            dispatch.call('initgrids', this, grids, sensors, tree_data);
        });

        function updateType() {
            console.log('[function] grids updateType');
            grids.forEach(d => d.isSelected = false);
            tree.eachBefore(d => {
                d.gridIdList.forEach(id => {
                    grids[id].type = d.name;
                    if (d.isSelected) grids[id].isSelected = true;
                })
            })
        }

        function selectedGridList() {
            return grids.filter(d => d.isSelected);
        }

        function addType() {
            //添加种类
            const list = selectedGridList();

            //获得名字
            const nodeName = $('#grid-input-typename').val();
            if (nodeName == "") {
                alert("请输入名字");
                return;
            }
            $('#grid-input-typename').val("");

            if (list.length == 0) {
                alert('选择不能为空');
                return;
            }
            dispatch.call('addnode', this, nodeName, list.map(d => d.id));
        }



        function gridChart() {
            let width, height;

            function my(selection) {

                selection.each(function(d, i) {
                    console.log('[function] init grid', d);
                    const g = d3.select(this);

                    const { grids, sensors } = d;

                    const y = d3.scaleBand()
                        .domain(d3.range(16))
                        .range([0, height / 2 - 30]);

                    const x = d3.scaleBand()
                        .domain(d3.range(30))
                        .rangeRound([0, height]);

                    const color = d3.scaleOrdinal(d3.schemeCategory10);

                    g.select(".grid-xAixs")
                        .call(d3.axisTop(x).tickSize(0))
                        .call(g => g.select(".domain").remove());

                    g.select(".grid-yAixs")
                        .call(d3.axisLeft(y).tickSize(0))
                        .call(g => g.select(".domain").remove());

                    const gRect = g.select('.grid-rect');
                    const gCircle = g.select('.grid-circle');

                    update(grids, sensors);

                    function update(selectedGrids, selectedSensors) {

                        const rect = gRect.selectAll('rect')
                            .data(selectedGrids, d => d.id);

                        const circle = gCircle.selectAll('circle')
                            .data(selectedSensors, d => d.id);

                        //rect 
                        const rectEnter = rect.enter().append('rect')
                            .attr('x', (d, i) => x(d.y))
                            .attr('y', (d, i) => y(d.x))
                            .attr("height", y.bandwidth())
                            .attr("width", x.bandwidth())
                            .on('click', d => {
                                d.isSelected = !d.isSelected;
                                update([d], []);
                            })

                        const rectUpdate = rect.merge(rectEnter)
                            .attr('stroke', 'black')
                            .attr('opacity', d => d.isSelected ? 0.4 : 1)
                            .attr('fill', d => color(d.type));

                        //circle
                        const circleEnter = circle.enter().append('circle')
                            .attr('cx', (d, i) => x(d.y) + y.bandwidth() / 4)
                            .attr('cy', (d, i) => y(d.x) + y.bandwidth() / 4)
                            .attr("r", (y.bandwidth() - 1) / 4)


                        const circleUpdate = circle.merge(circleEnter)
                            .attr('fill', 'black');
                    }
                })
            }

            my.width = function(value) {
                if (!arguments.length) return width;
                width = value;
                return my;
            }

            my.height = function(value) {
                if (!arguments.length) return height;
                height = value;
                return my;
            }
            return my

        }

    })
}();