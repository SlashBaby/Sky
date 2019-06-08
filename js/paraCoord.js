const paraCoord = function() {
    dispatch.on('initparacoord', (move_and_stay, types) => {
        console.log('initparacoord', move_and_stay);
        clearMainVis();

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

        //处理数据，让平行坐标系可以用
        const dataMove = [],
            dataStay = [];

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

            for (let i = 0; i < log.length; i++) {
                const l = log[i];
                const sid = l[1];
                const time = l[0];
                const type = typeNameBySid.get(sid);

                if (!list[type]) {
                    list[type] = {
                        'stay': 0,
                        'move': 0
                    }
                }
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
            dataMove.push(dMove);
            dataStay.push(dStay);
        }

        console.log('dataMove', dataMove);
        console.log('dataStay', dataStay);

        //开始可视化
        // 基于准备好的dom，初始化echarts实例
        const { container, margin, content } = mainDimensions;

        d3.select('#main-vis')
            .append('div')
            .attr('id', 'paraCoord-vis')
            .style('height', `${content.height}px`)
            .style('width', `${content.width}px`);

        if (d3.select('#main-footer').empty()) {
            d3.select('#main-wrapper')
                .append('div')
                .attr('id', 'main-footer')
        }


        var myChart = echarts.init(document.getElementById('paraCoord-vis'));

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

        //添加选择
        const select = d3.select('#main-footer')
            .append('select')
            .attr('id', 'select-paraCoord')

        select.append('option')
            .text('停留时间')

        select.append('option')
            .text('进入次数')

        //绑定事件
        $("#select-paraCoord").change(function() {
            console.log('change', $(this).val());
            const val = $(this).val();
            let option;
            if (val === '停留时间') {
                option = getOptionByType(dataStay, maxStay);
            } else {
                option = getOptionByType(dataMove, maxMove);

            }
            myChart.setOption(option);
        });

        const option = getOptionByType(dataStay, maxStay);

        //获得选中的值
        myChart.on('axisareaselected', function() {
            var series0 = myChart.getModel().getSeries()[0];
            // var series1 = myChart.getModel().getSeries()[1];
            var indices0 = series0.getRawIndicesByActiveState('active');
            // var indices1 = series1.getRawIndicesByActiveState('active');
            console.log(indices0);
        });


        myChart.setOption(option);
        // 使用刚指定的配置项和数据显示图表。

        function getOptionByType(data, max) {
            const option = {
                backgroundColor: '#333',
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
                    right: '18%',
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