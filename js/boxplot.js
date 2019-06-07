const boxplot = function(){
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
    })
}();