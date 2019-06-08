const boxplot = function() {
    dispatch.on('initboxplot', (move_and_stay, types) => {
        console.log('initboxplot', move_and_stay);
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


        //获得每个sensor的停留时间和移动次数
        // const data = [];
        const indexByTypeName = d3.map();
        const list = {};
        for (let p of move_and_stay) {
            const id = p.id,
                sensors = p.sensors;

            for (let s of sensors) {
                const sid = s[0],
                    stay = s[1],
                    move = s[2];
                const type = typeNameBySid.get(sid);
                if (list[type]) {
                    let sum = 0;
                    stay.forEach(d => sum += d[1]);
                    list[type].stay += sum;
                    list[type].move += move.length;
                } else {
                    let sum = 0;
                    stay.forEach(d => sum += d[1]);
                    list[type] = {
                        'stay': sum,
                        'move': move.length
                    }
                }
            }
        }

        console.log(list);


        //boxplot
        d3.json('../data/test.json').then(function(data) {
            console.log(data);
            var chart = new G2.Chart({
                container: 'main-vis',
                forceFit: true,
                height: 600,
                padding: [40, 80, 80, 80]
            });
            chart.source(data, {
                carat: {
                    sync: true
                },
                price: {
                    sync: true,
                    tickCount: 3
                },
                clarity: {
                    sync: true
                }
            });
            chart.facet('rect', {
                fields: [null, 'clarity'],
                eachView: function eachView(view) {
                    view.point().position('carat*price').color('clarity').shape('circle').opacity(0.3).size(3);
                }
            });
            chart.render();
        });
    })
}();