const boxplot = function() {
    dispatch.on('initboxplot', (move_and_stay, types) => {
        console.log('initboxplot', move_and_stay);
        clearMainVis();
        currentVis = 'boxplot';

        //监听更新事件
        dispatch.on('updatecurrent.boxplot', () => {
            if (currentVis === 'boxplot')
                dispatch.call('initboxplot', this, move_and_stay, types);
        })

        //获得需要聚类的空间
        let spaces = types.selectedNodeList();
        if (spaces.length === 0) spaces = types.leaves();
        console.log(spaces)

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

        let data = {};

        //根据停留时间确定id
        const idByStayTime = {}; //d3.map();

        for (let p of move_and_stay) {
            const id = p.id,
                log = p.l;
            const list = {}; //每个人的数据

            for (let i = 0; i < log.length; i++) {
                const l = log[i];
                const sid = l[1];
                const time = l[0];
                let type = typeNameBySid.get(sid) ? typeNameBySid.get(sid) : '其他';

                if (!list[type]) {
                    list[type] = {
                        'stay': 0,
                        'move': 0
                    }
                }
                if (!data[type]) {
                    data[type] = {
                        'move': [],
                        'stay': []
                    }
                }

                if (!idByStayTime[type]) {
                    idByStayTime[type] = d3.map();
                }
                if (i === 0) {
                    //从外面进来
                    list[type].move += 1;
                    continue;
                }


                const pl = log[i - 1];
                const ptime = pl[0];
                const psid = pl[1];
                const ptype = typeNameBySid.get(psid) ? typeNameBySid.get(psid) : '其他';


                if (type != ptype) { //如果上一个时间的room和当前room的类型不同，离开了房间
                    list[type].move += 1;
                    const stayTime = list[ptype].stay;
                    data[ptype].stay.push(stayTime);

                    //添加进map
                    const idlist = idByStayTime[ptype].get(stayTime);
                    if (!idlist) {
                        idByStayTime[ptype].set(stayTime, [id]);
                    } else {
                        idlist.push(id);
                    }

                } else {
                    list[ptype].stay += (time - ptime);
                }
            }


            for (let k in list) {
                if (!data[k]) {
                    data[k] = {
                        'move': [],
                        'stay': []
                    }
                }

                data[k].move.push(list[k].move);
            }

        }



        // let newData = {};
        // for(let key in data){
        //     console.log(key);
        //     if(key != null){
        //         newData[key] = data[key];
        //     }
        // }
        // data = newData;

        // console.log(newData)
        // console.log('data', data);

        const dataStay = [],
            dataMove = [];
        const keyByIndex = d3.map();
        let index = -1;
        for (let k in data) {
            if (k != '其他') {
                keyByIndex.set(++index, k);
                dataStay.push(data[k].stay);
                dataMove.push(data[k].move);
            }
        }

        console.log(dataStay)
        console.log(dataMove)
        const { container, margin, content } = mainDimensions;

        if (d3.select('#main-footer').empty()) {
            d3.select('#main-wrapper')
                .append('div')
                .attr('id', 'main-footer')
        }

        var myChart = echarts.init(document.getElementById('main-vis'), 'light');
        var dataBox = echarts.dataTool.prepareBoxplotData(dataStay);


        const option = {
            textStyle: {
                color: '#ddd'
            },
            title: [{
                text: '停留时长',
                left: 'center',
            }, ],
            tooltip: {
                trigger: 'item',
                axisPointer: {
                    type: 'shadow'
                }
            },
            grid: {
                left: '10%',
                right: '10%',
                bottom: '15%'
            },
            xAxis: {
                type: 'category',
                data: data.axisData,
                boundaryGap: true,
                nameGap: 30,
                splitArea: {
                    show: false
                },
                axisLabel: {
                    formatter: function(param) {
                        return `${keyByIndex.get(param)}`;
                    }
                },
                splitLine: {
                    show: false
                }
            },
            yAxis: {
                type: 'value',
                name: '时长/分钟',
                splitArea: {
                    show: true
                },
                axisLabel: {
                    formatter: function(param) {
                        return Math.floor(param / 60);
                    }
                },
            },
            series: [{
                    name: 'boxplot',
                    type: 'boxplot',
                    data: dataBox.boxData,
                    tooltip: {
                        formatter: function(param) {
                            const format = d => Math.floor(d / 60);
                            return [
                                'upper: ' + format(param.data[5]),
                                'Q3: ' + format(param.data[4]),
                                'median: ' + format(param.data[3]),
                                'Q1: ' + format(param.data[2]),
                                'lower: ' + format(param.data[1])
                            ].join('<br/>');
                        }
                    },
                },
                {
                    name: 'outlier',
                    type: 'scatter',
                    data: dataBox.outliers,
                    tooltip: {
                        formatter: function(param) {
                            const format = d => Math.floor(d / 60);
                            const i = param.data[0],
                                value = param.data[1];
                            const key = keyByIndex.get(i);
                            const m = idByStayTime[key];
                            return `id:${m.get(value)}, value:${format(param.data[1])}`
                        }
                    }
                }
            ]
        };

        let outerPid = [];
        for (let o of dataBox.outliers) {
            const i = o[0],
                value = o[1];
            const key = keyByIndex.get(i);
            const m = idByStayTime[key];
            outerPid = [...outerPid, ...m.get(value)];
        }

        allpeople.forEach(d => d.isSelected = false);
        //更新people
        for (let id of outerPid) {
            const p = peopleById.get(id);
            p.isSelected = true;
        }

        dispatch.call('inittreemap', this, allpeople);

        //获得所有有问题的人的sid
        // console.log(outerPid);
        myChart.setOption(option);
    })
}();