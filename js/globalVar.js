const dispatch = d3.dispatch(
    'addnode',
    'deletenode',
    'insertnode',
    'updategrid',
    'inittree',
    'updatetree',
    'initgrids',
    'savedata',
    'update',
    'initareas',
    'initbubbles',
    'initparacoord',
    'initboxplot',
    'inittreemap',
);

const leftDimensions = {
    container: { 'width': 250, 'height': 730 },
    margin: { 'left': 10, 'top': 10, 'right': 10, 'bottom': 10 },
};

leftDimensions.content = {
    'width': leftDimensions.container.width - leftDimensions.margin.left - leftDimensions.margin.right,
    'height': leftDimensions.container.height - leftDimensions.margin.top - leftDimensions.margin.bottom
};

const mainDimensions = {
    container: { 'width': 950, 'height': 650 },
    margin: { 'left': 30, 'top': 30, 'right': 30, 'bottom': 30 },
};

mainDimensions.content = {
    'width': mainDimensions.container.width - mainDimensions.margin.left - mainDimensions.margin.right,
    'height': mainDimensions.container.height - mainDimensions.margin.top - mainDimensions.margin.bottom
};

const rightDimensions = {
    container: { 'width': 400, 'height': 730 },
    margin: { 'left': 10, 'top': 10, 'right': 10, 'bottom': 10 },
};

rightDimensions.content = {
    'width': leftDimensions.container.width - leftDimensions.margin.left - leftDimensions.margin.right,
    'height': leftDimensions.container.height - leftDimensions.margin.top - leftDimensions.margin.bottom
};


//some maps
let sidByGid;
let typeNameBySid;

function clearMainVis() {
    $('#main-vis').children().remove();
    $('#main-footer').children().remove();
}

function clearRightVis(){
    $('#right-vis').children().remove();
}

function saveToJson(data, filename) {
    console.log('[function]:save data', data);
    const date = new Date();
    const file = new File([JSON.stringify(data)], `${filename}_${date.toLocaleString()}.json`, { type: "text/plain;charset=utf-8" });
    saveAs(file);
}


let markTimelist = [];


let allpeople = [];

let peopleById = d3.map();