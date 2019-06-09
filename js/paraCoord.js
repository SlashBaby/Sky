const paraCoord = function() {
    dispatch.on('initparacoord', (move_and_stay, types) => {
        console.log('initparacoord', move_and_stay);
        clearMainVis();
        currentVis = 'paraCoord';

        //监听更新事件
        dispatch.on('updatecurrent.paraCoord', () => {
            if (currentVis === 'paraCoord')
                dispatch.call('initparacoord', this, move_and_stay, types);
        })

        //获得需要聚类的空间
        let spaces = types.selectedNodeList();
        if (spaces.length === 0) spaces = types.leaves();

        //根据sid找到type
        typeNameBySid = d3.map();
        spaces.forEach(d => {
            d.gridIdList.forEach(id => {
                let sid;
                //如果该格子有传感器,根据传感器id获得type id
                if ((sid = sidByGid[id])) {
                    typeNameBySid.set(+sid, d.name);
                }
            })
        });

        let currentType = '停留时间';
        //处理数据，让平行坐标系可以用
        const dataMove = [],
            dataStay = [];
        const idByIndex = d3.map();

        //给每一个种类确定一个index
        const keys = spaces.map(d => d.name);
        const indexByKey = d3.map();
        keys.forEach((d, i) => {
            indexByKey.set(d, i);
        })


        for (let p of move_and_stay) {
            const id = p.id,
                log = p.l;
            const list = {}; //记录当前的room是否出现过

            //便利每一条log
            for (let i = 0; i < log.length; i++) {
                const l = log[i];
                const sid = l[1];
                const time = l[0];

                //更新最大和最小的时间
                // maxTime = d3.max([maxTime, time]);
                // minTime = d3.min([minTime, time]);
                const type = typeNameBySid.get(sid);

                if (!list[type]) {
                    list[type] = {
                        'stay': 0,
                        'move': 0
                    }
                }
                //筛选时间数据
                if (time > endTime || time < startTime)
                    continue;

                if (i === 0) {
                    //从外面进来
                    list[type].move += 1;
                    continue;
                }


                const pl = log[i - 1];
                const ptime = pl[0];
                const psid = pl[1];
                const ptype = typeNameBySid.get(psid);

                list[ptype].stay += time - ptime;


                if (type != ptype) //如果上一个时间的room和当前room的类型不同
                    list[type].move += 1;
            }


            const dMove = [],
                dStay = [];
            for (let s of spaces) {
                dMove.push(0);
                dStay.push(0);
            }

            for (let k in list) {
                const index = indexByKey.get(k);
                dMove[index] += list[k].move;
                dStay[index] += list[k].stay;
            }
            idByIndex.set(dataMove.length, id);
            dataMove.push(dMove);
            dataStay.push(dStay);
        }

        console.log('dataMove', dataMove);
        console.log('dataStay', dataStay);
        console.log('max', maxTime, 'min', minTime);

        //开始可视化
        // 基于准备好的dom，初始化echarts实例
        const { container, margin, content } = mainDimensions;

        if (d3.select('#main-footer').empty()) {
            d3.select('#main-wrapper')
                .append('div')
                .attr('id', 'main-footer')

        }


        var myChart = echarts.init(document.getElementById('main-vis'));

        var lineStyle = {
            normal: {
                width: 1,
                opacity: 0.5
            }
        };

        const parallelAxis = keys.map((d, i) => ({
            dim: i,
            name: d
        }))

        //找到最大的值和对应的列
        const maxMove = [-1, -1],
            maxStay = [-1, -1];
        for (let d of dataMove) {
            for (let i = 0; i < d.length; i++) {
                if (d[i] > maxMove[0]) {
                    maxMove[0] = d[i];
                    maxMove[1] = i;
                }
            }
        }

        for (let d of dataStay) {
            for (let i = 0; i < d.length; i++) {
                if (d[i] > maxStay[0]) {
                    maxStay[0] = d[i];
                    maxStay[1] = i;
                }
            }
        }

        const divbox = d3.select('#main-footer')
            .append('div')
            .attr('class', 'btn-toolbar')
            .append('div')
            .attr('class', 'input-group')
        //添加筛选框，一个起始时间一个结束时间
        // d3.select('#main-footer')
        divbox.append('label')
            .text('起始时间')

        const formatTime = time => {
            const h = Math.floor(time / 3600);
            const m = Math.floor((time % 3600) / 60);
            const s = (time % 3600) % 60;
            return `${wrap(h)}:${wrap(m)}:${wrap(s)}`;

            function wrap(n) {
                return n < 10 ? `0${n}` : `${n}`;
            }
        }

        const timeByValue = d3.map();
        const timelist = [];
        //30分钟为间隔
        const step = 60 * 30;
        for (let i = minTime; i < maxTime - step; i += step) {
            const t = formatTime(i);
            // console.log(i, t);
            timeByValue.set(t, i);
            timelist.push(t);
        }

        const t = formatTime(maxTime);
        timeByValue.set(t, maxTime);
        timelist.push(t);

        // const d3.select('#main-footer')
        select1 = divbox.append('select')
            .attr('id', 'select-startTime')
            .attr('class', 'select-color custom-select')

        select1.selectAll('option')
            .data(timelist)
            .join('option')
            .text(d => d);


        // d3.select('#main-footer')
        divbox.append('label')
            .text('结束时间')

        const select2 = divbox
            .append('select')
            .attr('class', 'select-color custom-select')
            .attr('id', 'select-endTime');

        select2.selectAll('option')
            .data(timelist.reverse())
            .join('option')
            .text(d => d);

        let selectedlist = [];


        //选择当前的起始和结束时间
        $("#select-startTime").val(formatTime(startTime));
        $("#select-endTime").val(formatTime(endTime));

        //添加选择
        // d3.select('#main-footer')
           divbox .append('label')
            .text('种类')
        // const select = d3.select('#main-footer')
          select =   divbox.append('select')
            .attr('class', 'select-color custom-select')
            .attr('id', 'select-paraCoord')

        select.append('option')
            .text('停留时间')

        select.append('option')
            .text('进入次数')

        // d3.select('#main-footer')
           divbox.append('div')
            .style('margin-left', `${20}px`)
            .append('button')
            .attr('class', 'btn btn-primary')
            .text('显示选择的人')
            .on('click', () => {
                console.log('选择', console.log(selectedlist));
                selectedlist.forEach(d => {
                    const p = peopleById.get(d);
                    p.isSelected = true;
                })
                dispatch.call('inittreemap', this, allpeople);
            })

        //绑定事件
        $("#select-paraCoord").change(function() {
            console.log('change', $(this).val());
            const val = $(this).val();
            let option;
            if (val === '停留时间') {
                option = getOptionByType(dataStay, maxStay);
                currentType = '停留时间';
            } else {
                option = getOptionByType(dataMove, maxMove);
                currentType = '移动次数';
            }
            myChart.setOption(option);
        });

        $("#select-startTime").change(function() {
            console.log('change start time');
            const _endTime = timeByValue.get($("#select-endTime").val());
            const _startTime = timeByValue.get($(this).val());
            if (_startTime > _endTime) {
                alert('开始时间不能大于结束时间');
                return;
            }
            startTime = _startTime;
        })

        $("#select-endTime").change(function() {
            console.log('change end time');
            const _startTime = timeByValue.get($("#select-startTime").val());
            const _endTime = timeByValue.get($(this).val());
            if (_startTime > _endTime) {
                alert('开始时间不能大于结束时间');
                return;
            }
            endTime = _endTime;
        })

        const option = getOptionByType(dataStay, maxStay);

        //获得选中的值
        myChart.on('axisareaselected', function() {
            console.log(myChart.getModel().getSeries());
            var series0 = myChart.getModel().getSeries()[0];
            // var series1 = myChart.getModel().getSeries()[1];
            var indices0 = series0.getRawIndicesByActiveState('active');
            // var indices1 = series1.getRawIndicesByActiveState('active');
            console.log(indices0);
            if (indices0.length > 0)
                selectedlist = indices0.map(d => idByIndex.get(d));
        });


        myChart.setOption(option);
        // 使用刚指定的配置项和数据显示图表。

        function getOptionByType(data, max) {
            const option = {
                backgroundColor: '#0b2631',
                parallelAxis: parallelAxis,
                visualMap: {
                    show: true,
                    min: 0,
                    max: max[0],
                    dimension: max[1],
                    inRange: {
                        color: ['#d94e5d', '#eac736', '#50a3ba'].reverse(),
                        // colorAlpha: [0, 1]
                    }
                },
                parallel: {
                    left: '5%',
                    right: '5%',
                    bottom: 100,
                    parallelAxisDefault: {
                        type: 'value',
                        name: 'AQI指数',
                        nameLocation: 'end',
                        nameGap: 20,
                        nameTextStyle: {
                            color: '#fff',
                            fontSize: 12
                        },
                        axisLine: {
                            lineStyle: {
                                color: '#aaa'
                            }
                        },
                        axisTick: {
                            lineStyle: {
                                color: '#777'
                            }
                        },
                        splitLine: {
                            show: false
                        },
                        axisLabel: {
                            textStyle: {
                                color: '#fff'
                            }
                        }
                    }
                },
                series: [{
                    name: '第一天',
                    type: 'parallel',
                    lineStyle: lineStyle,
                    data: data
                }]
            };
            return option;
        }

    })
}();