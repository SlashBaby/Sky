const grid = function() {
    dispatch.on('initgrids', (grids, sensors, tree) => {
        console.log('[event] init grid', grids, sensors);

        currentVis = 'grids';

        //界面处理
        clearMainVis();

        if (d3.select('#main-footer').empty()) {
            d3.select('#main-wrapper')
                .append('div')
                .attr('id', 'main-footer')
                .attr('class', 'row')
        }

        //left for svg
        const leftfooter = d3.select('#main-footer')
            .append('div')
            .attr('id', 'left-main-footer')
            .attr('class', 'col-6')
            .append('div')
            .attr('class', 'btn-toolbar')

        leftfooter.append('button')
            .attr('class', 'btn btn-color')
            .attr('id', 'btn-grid-addnode')
            .text('添加种类')
            .on('click', addType);
        $('#btn-grid-addnode')
            .after(`&nbsp;`);
        leftfooter.append('input')
            .attr('class', 'dom-grid')
            .attr('type', 'text')
            .attr('id', 'grid-input-typename');

        //right for canvans
        const rightfooter = d3.select('#main-footer')
            .append('div')
            .attr('id', 'right-main-footer')
            .attr('class', 'col-6')
            .append('div')
            .attr('class', 'btn-toolbar')
            .append('div')
            .attr('class', 'btn-group')

        rightfooter.append('button')
            .attr('class', 'btn btn-color')
            .text('初始化')
            .on('click', () => {
                draw_canvas();
            })

        //数据处理
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
        const leftdiv = d3.select('#main-vis')
            .append('div')
            .attr('class', 'col-6')

        const svg = leftdiv.append('svg')
            .style('background', '#0b2631')
            .attr('width', container.width / 2)
            .attr('height', container.height)

        const g = svg
            .selectAll('g')
            .data([floor1, floor2])
            .join('g')
            .attr('class', 'gGrid')
            .attr('transform', (d, i) => `translate(${0},${ 50 + content.height / 2 * i})`)

        g.append('g')
            .attr('class', 'grid-xAixs');

        g.append('g')
            .attr('class', 'grid-yAixs');

        g.append('g')
            .attr('class', 'grid-rect');

        g.append('g')
            .attr('class', 'grid-circle');

        //绘制左边的图
        g.call(chart);


        //绘制右边的图
        //添加两个canvans
        const rightdiv = d3.select('#main-vis')
            .append('div')
            .attr('class', 'col-6')
            .attr('id', 'right-div')

        const canvasDiv = rightdiv.append('div')
            .attr('id', 'can-div')


        canvasDiv
            .append('canvas')
            .attr('id', 'canvas')
            .attr('width', `${1800}px`)
            .attr('height', `${960}px`) //;height:300px


        canvasDiv
            .append('canvas')
            .attr('id', 'canvas2')
            .attr('width', `${1800}px`)
            .attr('height', `${960}px`)

        $('#can-div').after(`<div id='time-div'>
            <input id="time_range" type="range" class="custom-range" min="25000" max="73000" value="0" style="width: 570px;" oninput="change_time()" />
        </div>`)

        $('#time-div').after(`<div>
            <label id="show_time" style="width:100px">00 : 00 : 00</label>
            &nbsp;&nbsp;&nbsp;
            <label id="show_second" style="width:100px">00 : 00 : 00</label>
        </div>`)

        rightfooter.append('input')
            .attr('class', 'btn btn-color')
            .attr('id', 'stop_button')
            .attr('type', 'button')
            .attr('value', '停止')
            .on('click', () => {
                stop_button();
            })

        $('#stop_button').after(`<input id="show_heatmap" type="button" class="btn btn-color" value="热力图(关闭)" onclick="show_heatmap()" />`)
        $('#show_heatmap').after(`<input id="person_button" type="button" class="btn btn-color" value="个人轨迹(开启)" onclick="show_person();" />
            &nbsp; 
            <input type="button" class="btn-color btn" value="人员编号"/>
            <input id="id_num" type="number" value="19996" class="" style="width:70px">
            <input type="button" value="画轨迹" class="btn btn-color" onclick="change_id()" />`)
        //一些定义

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

                    const alltype = []
                    for (let g of grids) {
                        const t = g.type;
                        if (alltype.indexOf(t) === -1) {
                            alltype.push(t);
                        }
                    }

                    const range = [];
                    const step = 1 / alltype.length;
                    for (let i = 0; i < 1; i += step) {
                        range.push(d3.interpolateRdYlBu(i))
                    }
                     colorType = d3.scaleOrdinal()
                        .domain(alltype)
                        .range(range);

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
                            .attr('fill', d => ((d.type === '第一层') || (d.type === '第二层')) ? 'white' : colorType(d.type));

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