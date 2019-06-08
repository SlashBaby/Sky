const bubbles = function() {
    dispatch.on('initbubbles', (logsBySid, move_data, types) => {
        console.log('[event] initbubbles', move_data);
        currentVis = 'bubbles';
        //清空画布
        clearMainVis();
        if(d3.select('#main-footer').empty()){
            d3.select('#main-wrapper')
            .append('div')
            .attr('id', 'main-footer')
        }

        //添加按钮
        d3.select('#main-footer')
            .append('button')
            .attr('class', 'btn btn-primary dom-grid')
            .attr('id', 'btn-bubbles-run')
            .text('run')

        d3.select('#main-footer')
            .append('button')
            .attr('class', 'btn btn-primary dom-grid')
            .attr('id', 'btn-bubbles-stop')
            .text('stop')

        d3.select('#main-footer')
            .append('button')
            .attr('class', 'btn btn-primary dom-grid')
            .attr('id', 'btn-bubbles-add')
            .text('Mark time')

        d3.select('#main-footer')
            .append('button')
            .attr('class', 'btn btn-primary dom-grid')
            .attr('id', 'btn-bubbles-delete')
            .text('delete mark')


        //准备数据
        //获得需要聚类的空间
        let spaces = types.selectedNodeList()
        if (spaces.length === 0) spaces = types.leaves();

        //根据传感器的id获得对应的type
        typeNameBySid = d3.map();

        //计算每个空间的数据：每个房间每个时间点改变的人数
        spaces.forEach(d => {
            const dataByTime = {};

            d.gridIdList.forEach(id => {
                let sid, log;
                //如果该格子有传感器,根据传感器id获得type id
                if ((sid = sidByGid[id])) {
                    typeNameBySid.set(+sid, d.name);
                }

                //如果该格子有传感器，并且传感器返回了数据
                if ((sid = sidByGid[id]) && (log = logsBySid.get(sid))) {
                    log['l'].forEach(item => {
                        const time = +item[0],
                            change = +item[1];

                        const exit = [11505, 11515, 11517, 10019];



                        if (exit.indexOf(+sid) == -1) {
                            //如果不是出口
                            if (dataByTime[time]) {
                                dataByTime[time] += change;
                            } else {
                                dataByTime[time] = change;
                            }

                        }
                    })
                }
            })
            d.dataByTime = dataByTime;
        });

        //计算每个空间的数据：每个时间点拥有的人数
        spaces.forEach(d => {
            let lastKey = null;
            for (let key in d.dataByTime) {
                if (lastKey) {
                    d.dataByTime[key] += d.dataByTime[lastKey];
                }
                lastKey = key;
            }
        })

        //获得节点数据
        const nodes = spaces.map(d => {
            const name = d.name;
            const population = [];
            const area = d.gridIdList.length;
            for (let key in d.dataByTime) {
                population.push([+key, d.dataByTime[key]])
            }
            return {
                name: name,
                population: population,
                area: area
            }
        });


        //获得links的数据
        let changeByTime = [],
            links = [];
        for (let d of move_data) {
            const list = []
            for (let item of d.m) {
                const source = typeNameBySid.get(+item[0]);
                const target = typeNameBySid.get(+item[1]);
                if (source === target)
                    continue;
                list.push([source, target, item[2]]);

                //如果当前links没有这条边，就加入
                let flag = false;
                for (let l of links) {
                    if (l[0] === source && l[1] === target) {
                        flag = true;
                        break;
                    }
                }
                if (!flag) links.push([source, target]);
            }
            if (list.length > 0) {
                changeByTime.push({
                    time: d.time,
                    list: list
                })
            }
        }



        changeByTime = d3.map(changeByTime, d => d.time);


        //可视化
        const { container, margin, content } = mainDimensions;
        const svg = d3.select('#main-vis')
            .append('svg')
            // .style('background', 'grey')
            .attr('width', container.width)
            .attr('height', container.height)
            .append('g')
            .attr('transfrom', `translate(${margin.left}, ${margin.top})`);

        const chart = bubbleChart()
            .width(content.width)
            .height(content.height)

        svg
            .datum({
                nodes: nodes,
                links: links
            })
            .call(chart)

        function bubbleChart() {

            let width = 500,
                height = 500,
                isRunning = false,
                currentTime = 25240,
                marklist = [];

            function my(selection) {

                selection.each(function(d, i) {
                    console.log('bubbles', d);
                    const svg = d3.select(this);
                    const startTime = 25240,
                        endTime = 64858;
                    //绑定事件
                    d3.select('#btn-bubbles-run')
                        .on('click', start)

                    d3.select('#btn-bubbles-stop')
                        .on('click', pause)

                    d3.select('#btn-bubbles-add')
                        .on('click', mark)

                    d3.select('#btn-bubbles-delete')
                        .on('click', deleteMark)

                    //accessors
                    const color = d => d.name,
                        key = d => d.name,
                        radius = d => d.population;

                    const formatTime = time => {
                        const h = Math.floor(time / 3600);
                        const m = Math.floor((time % 3600) / 60);
                        const s = (time % 3600) % 60;
                        return `${wrap(h)}:${wrap(m)}:${wrap(s)}`;

                        function wrap(n){
                            return n < 10 ? `0${n}`:`${n}`;
                        }
                    }

                    const bisect = d3.bisector(d => d[0]);

                    //some scales
                    const durationScale = d3.scaleLinear([25240, 64858], [100000, 0]),
                        colorScale = d3.scaleOrdinal()
                        .domain(d.nodes.map(d => d.name))
                        .range(d3.schemeCategory10),
                        radiusScale = d3.scaleSqrt([0, 3000], [1, 150]),
                        scrollScale = d3.scaleLinear([0, 740], [startTime, endTime]);

                    //nodes
                    const { nodes, links } = interpolateTime(25240);
                    computeLayout(nodes, links);

                    //links
                    // const link = svg.append("g")
                    //     .attr("stroke-opacity", 0.6)
                    //     .selectAll("path")
                    //     .data(links)
                    //     .join("path")
                    //     .attr('class', 'link')
                    //     .attr("stroke-width", 2)
                    //     .call(linksUpdate)

                    //dots
                    const dot = svg.append('g')
                        .selectAll('.dot')
                        .data(nodes)
                        .join('circle')
                        .attr('class', 'dot')
                        .attr('fill', d => colorScale(color(d)))
                        .call(position);

                    dot.append('title')
                        .text(d => `${d.name}:${Math.floor(d.population)}`)


                    //time
                    const label = svg.append('text')
                        .attr("class", "year label")
                        .attr('text-anchor', 'end')
                        .attr("x", width - 60)
                        .attr("y", height - 24)
                        .text(formatTime(25240));


                    //scroll bar
                    const scroll = svg.append('g')
                        .attr('class', 'scroll')
                        .attr('transform', `translate(${500}, ${height + 20})`);

                    scroll.append('rect')
                        .attr('class', 'scroll-bar')
                        .attr('height', 10)
                        .attr('width', 740)

                    const scrollDot = scroll.append('circle')
                        .attr('class', 'scroll-dot')
                        .attr('cy', 5)
                        .attr('r', 7)
                        .call(drag())

                    const markCircle = scroll.selectAll('circle.mark')
                        .data(marklist, d => d.time)
                        .call(update);

                    const rectW = 30, rectH = 20;

                    //legends
                    const legend = svg.append('g')
                        .attr('class', 'legend')
                        .attr('transform', `translate(${10}, ${50})`)
                        .selectAll('g')
                        .data(nodes.map(d => ({name:d.name})))
                        .join('g')
                        .attr('transform', (d, i) => `translate(0, ${rectH * i})`);

                    //rects
                    legend.append('rect')
                        .attr('fill', d => colorScale(color(d)))
                        .attr('height', rectH * 0.9)
                        .attr('width', rectW)

                    //texts
                    legend.append('text')
                        .attr('x', rectW * 1.2)
                        .attr('dy', '1em')
                        .text(d => d.name);


                    function mark() {
                        marklist.push({
                            time: currentTime,
                            isSelected: false
                        });

                        markCircle
                            .data(marklist, d => d.time)
                            .call(update);
                    }

                    function update(selection) {
                        const enter = selection.enter()
                            .append('circle')
                            .attr('class', 'mark')
                            .on('click', function(d) {
                                pause();
                                currentTime = d.time;
                                displayTime(currentTime);
                                d.isSelected = true;

                                d3.select(this)
                                    .call(update);
                            });

                        selection.merge(enter)
                            .attr('cy', 5)
                            .attr('r', 3)
                            .attr('cx', d => scrollScale.invert(d.time))
                            .attr('fill', d => d.isSelected ? 'red' : 'steelblue');


                        selection.exit()
                            .remove();

                    }

                    function deleteMark() {
                        console.log('deleteMark')
                        marklist = marklist.filter(d => !d.isSelected);

                        scroll.selectAll('circle.mark')
                            .data(marklist, d => d.time)
                            .call(update)
                    }

                    function drag() {

                        function dragstarted(d) {
                            pause();
                            console.log(d);
                        }

                        function dragged(d) {
                            const mouse = d3.mouse(this);

                            let x = mouse[0];
                            if (x < 0) x = 0;
                            if (x > 740) x = 740;

                            const time = scrollScale(x);

                            currentTime = time;

                            scrollDot
                                .attr('cx', x);

                            displayTime(time);
                        }

                        function dragended(d) {
                            //start();
                        }

                        return d3.drag()
                            .on("start", dragstarted)
                            .on("drag", dragged)
                            .on("end", dragended);
                    }


                    function position(selection) {
                        selection.attr('cx', d => d.x)
                            .attr('cy', d => d.y)
                            .attr('r', d => d.r);
                    }

                    function linksUpdate(selection) {
                        selection
                            .attr('d', d => {
                                const mid = [(d.source.x + d.target.x) / 2, (d.source.y + d.target.y) / 2];
                                const index = d.source.index - d.target.index;
                                const path = `M${d.source.x} ${d.source.y} 
                                    Q ${mid[0]} 
                                    ${index > 0  ? mid[1] + 10 : mid[1] - 10}  
                                    ${d.target.x} ${d.target.y}`;
                                return path;
                            })
                            .attr('fill', "transparent")
                            .attr("stroke", d => d.change === 0 ? "#999" : "red");
                    }


                    function start() {
                        console.log('start');
                        svg.transition()
                            .ease(d3.easeLinear)
                            .duration(durationScale(currentTime))
                            .on('end', () => isRunnning = false)
                            .tween('time', tweenTime);
                        isRunning = true;
                    }

                    function pause() {
                        console.log('pause');
                        if (isRunning) {
                            selection.interrupt();
                            isRunning = false;
                        }
                    }

                    function tweenTime() {
                        const time = d3.interpolateNumber(currentTime, 64858);
                        return function(t) {
                            currentTime = time(t);
                            displayTime(currentTime);
                        }
                    }

                    function computeLayout(nodes, links) {

                        //compute radius
                        nodes.forEach(d => {
                            d.r = radiusScale(radius(d));
                            if (d.r < 0) {
                                console.log(radius(d))
                            }
                        });

                        //compute position
                        const simulation = d3.forceSimulation(nodes)
                            .force("center", d3.forceCenter(width / 2, height / 2))
                            .force("collide", forceCollide())
                            // .force("link", d3.forceLink(links).id(d => d.name));


                        //计算新的布局
                        for (var i = 0, n = Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay())); i < n; ++i) {
                            simulation.tick();
                        }
                    }

                    function displayTime(time) {
                        const { nodes, links } = interpolateTime(time);
                        computeLayout(nodes, links);

                        //重新渲染
                        dot.data(nodes, key)
                            .call(position);

                        // link.data(links, d => d.index)
                            //.call(linksUpdate)

                        dot.select('title').text(d => `${d.name}:${Math.floor(d.population)}`);

                        label.text(formatTime(Math.round(time)));

                        scrollDot.attr('cx', scrollScale.invert(time));

                    }

                    function forceCollide() {
                        const alpha = 0.4; // fixed for greater rigidity!
                        const padding1 = 2; // separation between same-color nodes
                        const padding2 = 6; // separation between different-color nodes
                        let nodes;
                        let maxRadius;

                        function force() {
                            const quadtree = d3.quadtree(nodes, d => d.x, d => d.y);
                            for (const d of nodes) {
                                const r = d.r + maxRadius;
                                const nx1 = d.x - r,
                                    ny1 = d.y - r;
                                const nx2 = d.x + r,
                                    ny2 = d.y + r;
                                quadtree.visit((q, x1, y1, x2, y2) => {
                                    if (!q.length)
                                        do {
                                            if (q.data !== d) {
                                                const r = d.r + q.data.r + (d.name === q.data.name ? padding1 : padding2);
                                                let x = d.x - q.data.x,
                                                    y = d.y - q.data.y,
                                                    l = Math.hypot(x, y);
                                                if (l < r) {
                                                    l = (l - r) / l * alpha;
                                                    d.x -= x *= l, d.y -= y *= l;
                                                    q.data.x += x, q.data.y += y;
                                                }
                                            }
                                        } while (q = q.next);
                                    return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
                                });
                            }
                        }

                        force.initialize = _ => maxRadius = d3.max(nodes = _, d => d.r) + Math.max(padding1, padding2);

                        return force;
                    }

                    function interpolateTime(time) {
                        //根据时间获得节点数据
                        const nodes = d.nodes.map(d => ({
                            name: d.name,
                            population: interpolateValues(d.population, time)
                        }));

                        let roundTime = Math.floor(time);
                        let changeLinks = changeByTime.get(roundTime);
                        if (!changeLinks) {
                            roundTime = Math.ceil(time);
                            changeLinks = changeByTime.get(roundTime);
                        }

                        //根据时间获得links数据
                        const links = d.links.map(d => {
                            const source = d[0],
                                target = d[1];
                            let change = 0;
                            if (changeLinks) {
                                changeLinks.list.forEach(item => {
                                    if (item[0] === source && item[1] === target)
                                        change += item[2]
                                })
                            }
                            return {
                                source: source,
                                target: target,
                                change: change
                            }
                        })

                        return {
                            nodes: nodes,
                            links: links
                        };

                    }

                    function interpolateValues(values, year) {
                        //线性插值
                        const i = bisect.left(values, year, 0, values.length - 1),
                            a = values[i];
                        
                        //如果是最后一个就返回0
                        if (i === values.length - 1) {
                            return 0;
                        }

                        if (i > 0) {
                            const b = values[i - 1],
                                t = (year - a[0]) / (b[0] - a[0]);
                            return a[1] * (1 - t) + b[1] * t;
                        }
                        return a[1];
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

            return my;
        }
    })
}();