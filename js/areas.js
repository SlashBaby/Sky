const areas = function() {
    dispatch.on('initareas', (logsBySid, types) => {
        console.log('[event] init areas', logsBySid);

        //清空画布
        clearMainVis();

        //获得需要聚类的空间
        let spaces = types.selectedNodeList()
        if (spaces.length === 0) spaces = types.leaves();
        // console.log(spaces);

        //计算每个空间的数据：每个时间点改变的人数
        let cnt = 0; //去了出口但是又没有出去的人数
        spaces.forEach(d => {
            const dataByTime = {};

            d.gridIdList.forEach(id => {
                let sid, log;

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

                        } else {
                            //如果是出口
                            if (change < 0) {
                                cnt++;
                            }
                        }

                    })
                }
            })
            d.dataByTime = dataByTime;
        });
        console.log('cnt', cnt);

        //计算每个空间的数据：每个时间点拥有的人数
        console.log(spaces);
        spaces.forEach(d => {
            let lastKey = null;
            let maxCnt = -1;
            let roomCnt = d.gridIdList.length;
            for (let key in d.dataByTime) {
                if (lastKey) {
                    d.dataByTime[key] += d.dataByTime[lastKey];
                    maxCnt = d3.max([maxCnt, d.dataByTime[key]])
                }
                lastKey = key;
            }
            d.maxCnt = maxCnt;
            d.maxRate = maxCnt / roomCnt;
        })

        //面积图的可视化需要的数据
        const data = [];
        spaces.map(d => {
            for (let key in d.dataByTime) {
                const time = key,
                    value = d.dataByTime[key]
                data.push({
                    'symbol': d.name,
                    'date': time,
                    'price': value
                })
            }
        });

        //bar chart 需要的数据
        const data1 = spaces.map(d => ({
            "label": d.name,
            "type": "最大密度",
            "value": Math.round(d.maxRate)
        }));


        //pie chart 需要的数据
        const data2 = spaces.map(d => ({
            "type": d.name,
            "value": d.maxCnt
        }))


        console.log(data1);


        var chart = new G2.Chart({
            container: 'main-vis',
            forceFit: true,
            height: 700,
            padding: [40, 80, 80, 80]
        });
        chart.source(data, {
            date: {
                sync: true,
                type: 'time',
                tickCount: 20
                //mask: 'm/dd hh:MM'
            },
            price: {
                sync: true,
                tickCount: 3
            },
            symbol: {
                sync: true
            }
        });
        chart.facet('rect', {
            fields: [null, 'symbol'],
            eachView: function eachView(view) {
                view.area().position('date*price').color('symbol', G2.Global.colors_pie_16).opacity(0.3);
            }
        });
        chart.legend(false);
        chart.render();


        //right vis
        clearRightVis();

        const rightVis = d3.select('#right-vis');
        rightVis.append('div')
            .attr('id', 'div-bar')

        rightVis.append('div')
            .attr('id', 'div-pie')


        //bar chart
        var chart = new G2.Chart({
            container: 'div-bar',
            forceFit: true,
            height: 400
        });
        chart.source(data1, {
            value: {
                alias: '最大人口密度'
            }
        });
        chart.axis('label', {
            label: {
                offset: 12,
            }
        });

        chart.axis('value', {
            label: null,
            title: {
                offset: 30,
                textStyle: {
                    fontSize: 12,
                    fontWeight: 300
                }
            }
        })
        chart.coord().transpose();
        chart.interval().position('label*value').color('label', G2.Global.colors_pie_16);
        chart.legend(false);
        chart.render();


        //pie chart
        var max = 0;
        data2.forEach(function(obj) {
            if (obj.value > max) {
                max = obj.value;
            }
        });
        // 自定义 other 的图形，增加两条线
        G2.Shape.registerShape('interval', 'sliceShape', {
            draw: function draw(cfg, container) {
                var points = cfg.points;
                var origin = cfg.origin._origin;
                var percent = origin.value / max;
                var xWidth = points[2].x - points[1].x;
                var width = xWidth * percent;
                var path = [];
                path.push(['M', points[0].x, points[0].y]);
                path.push(['L', points[1].x, points[1].y]);
                path.push(['L', points[0].x + width, points[2].y]);
                path.push(['L', points[0].x + width, points[3].y]);
                path.push('Z');
                path = this.parsePath(path);
                return container.addShape('path', {
                    attrs: {
                        fill: cfg.color,
                        path: path
                    }
                });
            }
        });

        var chart2 = new G2.Chart({
            container: 'div-pie',
            forceFit: true,
            height: 350
        });

        chart2.source(data2);
        chart2.coord('theta', {
            radius: 0.8
        });
        chart2.intervalStack().position('value').color('type', G2.Global.colors_pie_16).shape('sliceShape').label('type', {
            offset: -20
        });

        chart2.render();
    })

}();