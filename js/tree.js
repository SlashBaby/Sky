const tree = function() {
    dispatch.on('inittree', tree => {
        console.log('[event]: init tree', tree);

        const { container, margin, content } = leftDimensions;

        const chart = treeChart()
            .width(content.width)
            .height(content.height)

        //准备需要绑定的DOM
        const svg = d3.select('#left-vis')
            .append('svg')
            .attr('id', 'svg-tree')
            .style("font", "10px sans-serif")
            .style('background', 'yellow')
            .style("user-select", "none")
            .datum(tree);

        svg.append('g')
            .attr('class', 'gLink')
            .attr('fill', 'none')
            .attr('stroke', '#555')
            .attr('stroke-opacity', 0.4)
            .attr('stroke-width', 1.5);

        svg.append('g')
            .attr('class', 'gNode')
            .attr('cursor', 'pointer');

        //some button listener
        d3.select('#btn-merge-node')
            .on('click', () => {
                console.log('[event] merge node');
                const list = tree.selectedNodeList();
                //获得名字
                const nodeName = $('#btn-merge-name').val();
                if (nodeName == "") {
                    alert("请输入名字");
                    return;
                }
                $('#btn-merge-name').val("");
                tree.mergeNode(nodeName, list);
            })

        d3.select('#btn-delete-node')
            .on('click', () => {
                console.log('[event] delete node');
                const list = tree.selectedNodeList();
                tree.deleteNode(list);
            })

        //监听事件
        dispatch.on('addnode', (nodeName, gridIdList) => {
            console.log('[event] addnode', nodeName, gridIdList);
            tree.addNode(nodeName, gridIdList);
        });


        //添加节点
        tree.addNode = (nodeName, idList) => {
            let flag = false;
            tree.eachAfter(d => {
                //如果没有找到父亲
                if (!flag) {
                    if (contain(d.gridIdList, idList)) {
                        const node = {
                            'name': nodeName,
                            'id': tree.nextId(),
                            'children': [],
                            'father': d.id,
                            'gridIdList': idList
                        }

                        d.children.push(node);
                        flag = true;
                    }
                }
            })

            if (!flag) {
                alert('选择区域有问题！');
                return;
            }

            tree.update();

            function contain(box, list) {
                let flag = true;
                list.forEach(d => {
                    //如果有一个点没有找到，说明不包含
                    if (box.indexOf(d) == -1) flag = false;
                })
                return flag;
            }

            dispatch.call('update', this, tree);

        }

        //删除选择的节点
        tree.deleteNode = nodeList => {
            console.log('[function] tree.deleteNode', nodeList);

            if (nodeList.length == 0) {
                alert('删除不能为空');
                return;
            }

            tree.eachBefore(d => {
                d.children = d.children.filter(d => nodeList.indexOf(d) == -1);
            })
            tree.update();
            dispatch.call('update', this, tree);
            alert("删除节点成功");
        }

        //合并选择的节点
        tree.mergeNode = (nodeName, nodeList) => {
            console.log('[function] mergeNode', nodeList);

            //判断是否有共同的节点
            const set = d3.set(nodeList.map(d => d.father));
            if (nodeList.length < 2 || set.size() != 1) {
                alert('节点必须有相同的父亲，且数量要大于等于2');
                return;
            }

            const father = tree.findById(+set.values()[0]);

            const node = {
                'name': nodeName,
                'id': tree.nextId(),
                'children': nodeList,
                'father': father.id,
                'gridIdList': nodeList.reduce((total, d) => [...total.gridIdList, ...d.gridIdList])
            }

            father.children = father.children.filter(d => {
                let flag = true;
                nodeList.forEach(item => {
                    if (item.id == d.id) flag = false;
                })
                return flag;
            })

            father.children.push(node);
            nodeList.forEach(d => d.father = node.id);

            tree.update();
            dispatch.call('update', this, tree);
            alert('合并成功');
        }

        //根据节点的id返回节点
        tree.findById = (nodeId) => {
            let node = null;
            tree.eachBefore(d => {
                if (d.id == nodeId) node = d;
            })
            return node;
        }

        //根据更新的数据来更新这棵树
        tree.update = () => {
            console.log('[function] tree.update', tree);
            d3.select('#svg-tree').remove();
            dispatch.call('inittree', this, tree);
            // svg.datum(tree)
            //     .call(chart);
        }

        tree.log = () => {
            tree.eachBefore(d => console.log(d));
        }

        //获得下一个节点的id
        tree.nextId = () => {
            let id = -1;
            tree.eachBefore(d => {
                id = d3.max([d.id, id]);
            })
            return id + 1;
        }

        //后续遍历
        tree.eachAfter = (callback) => {
            post(tree, callback);

            function post(node, callback) {
                if (!node.children) return;
                for (let child of node.children) {
                    post(child, callback);
                }
                callback(node);
            }
        }

        //前序遍历
        tree.eachBefore = (callback) => {
            pre(tree, callback);

            function pre(node, callback) {
                callback(node);
                if (!node.children) return;
                for (let child of node.children) {
                    pre(child, callback);
                }
            }
        }

        //获得需要保存的数据
        tree.raw = () => {
            return pre(tree);

            function pre(node) {
                const r = {
                    'name': node.name,
                    'children': [],
                    'gridIdList': node.gridIdList,
                    'id': node.id,
                    'father': node.father
                }

                for (let child of node._children) {
                    r.children.push(pre(child))
                }

                return r;
            }
        }


        //获得所有的后代
        tree.descendants = () => {
            const nodeList = [];
            tree.eachBefore(d => {
                nodeList.push(d);
            })
            return nodeList;
        }


        //获得需要连接的节点
        tree.links = () => {
            const linkList = [];
            let index = -1;
            tree.eachBefore(d => {
                if (!d.children) return;
                d.children.forEach(child => {
                    linkList.push({
                        'source': d,
                        'target': child,
                        'id': ++index
                    })
                })
            })
            return linkList;
        }

        //返回选择的节点
        tree.selectedNodeList = () => {
            return tree.descendants()
                .filter(d => d.isSelected);
        }

        //初始化这棵树的一些信息
        tree.init = () => {

            //初始化depth
            tree.eachBefore(d => {
                const father = tree.findById(d.father);
                if (father) {
                    d.depth = father.depth + 1;
                } else {
                    d.depth = 0;
                }
            })

            //初始化原来的位置
            tree.x0 = 0;
            tree.y0 = 0;

            //初始化孩子节点
            tree.descendants().forEach((d, i) => {
                d._children = d.children;
                d.isSelected = false;
            })
        }

        //返回所有的叶子节点
        tree.leaves = () => {
            const nodeList = [];
            tree.eachBefore(d => {

                if (!d.children || d.children.length == 0) {
                    nodeList.push(d);
                }

            })
            return nodeList;
        }

        svg.call(chart);

        //可视化树图
        function treeChart() {
            let width = 500,
                height = 600,
                dx = 20,
                dy = 10;

            function my(selection) {

                selection.each(function(d, i) {
                    console.log('[function] treeChart.init');
                    d.log();

                    const svg = d3.select(this);

                    const gNode = svg.select('.gNode')
                        .attr('transform', `translate(${dx}, ${dy})`);

                    const gLink = svg.select('.gLink')
                        .attr('transform', `translate(${dx}, ${dy})`);

                    tree.init();

                    update(tree);

                    function update(source) {
                        console.log('[function] treeChart.update', source);
                        const duration = d3.event && d3.event.altKey ? 2500 : 250;

                        const nodes = tree.descendants(); //.reverse();
                        const links = tree.links();

                        //Compute the new tree layout
                        let index = -1;
                        tree.eachBefore(d => {
                            d.x = ++index * dx;
                            d.y = d.depth * dy;
                        })

                        let left = tree;
                        let right = tree;
                        tree.eachBefore(node => {
                            if (node.x < left.x) left = node;
                            if (node.x > right.x) right = node;
                        })

                        const height = right.x - left.x + margin.top + margin.bottom;

                        const transition = svg.transition()
                            .duration(duration)
                            .attr('height', height)
                            .attr('viewBox', [0, left.x, width, height])
                            .tween('resize', window.ResizeObserver ? null : () => () => svg.dispatch("toggle"));

                        //Update the nodes...
                        const node = gNode.selectAll('g')
                            .data(nodes, d => d.id);

                        //Enter any new nodes at the parent's previous position
                        const nodeEnter = node.enter().append('g')
                            .attr('transform', d => `translate(${source.y0}, ${source.x0})`)
                            .attr('fill-opacity', 0)
                            .attr('stroke-opacity', 0)

                        nodeEnter.append('circle')
                            .attr('r', 4)
                            .on('click', d => {
                                d.children = d.children ? null : d._children;
                                update(d);
                                dispatch.call('update', this, tree);
                            });

                        nodeEnter.append('rect')
                            .attr('x', 4)
                            .attr('y', -6)
                            .attr('height', 12)
                            .attr('width', 100)
                            .on('click', d => {
                                d.isSelected = !d.isSelected;
                                update(d);
                                dispatch.call('update', this, tree);
                            });


                        nodeEnter.append('text')
                            .attr('dy', '0.31em')
                            .attr("x", 6)
                            .attr("text-anchor", "start")
                            .text(d => d.name)
                            .clone(true).lower()
                            .attr("stroke-linejoin", "round")
                            .attr("stroke-width", 3)
                            .attr("stroke", "white")

                        //Transition nodes to their new positions
                        const nodeUpdate = node.merge(nodeEnter)
                            .transition(transition)
                            .attr('transform', d => `translate(${d.y}, ${d.x})`)
                            .attr('fill-opacity', 1)
                            .attr('stroke-opacity', 1);

                        nodeUpdate.selectAll('rect')
                            .attr('fill', d => d.isSelected ? "#3182bd" : "#c6dbef")


                        nodeUpdate.selectAll('circle')
                            .attr('fill', d => d._children ? '#555' : '#999')


                        //Transition exiting nodes to the parent's new position

                        const nodeExit = node.exit()
                            .transition(transition)
                            .remove()
                            .attr('transform', d => `translate(${source.y}, ${source.x})`)
                            .attr('fill-opacity', 0)
                            .attr('stroke-opacity', 0);

                        //Update the links...
                        const diagonal = d3.linkHorizontal()
                            .x(d => d.y)
                            .y(d => d.x)

                        const link = gLink.selectAll('path')
                            .data(links, d => d.target.id);

                        //Enter any new links at the parent's previous position
                        const linkEnter = link.enter().append('path')
                            .attr('d', d => {
                                const o = { x: source.x0, y: source.y0 };
                                return diagonal({ source: o, target: o });
                            })

                        //Transition links to their new position.
                        link.merge(linkEnter).transition(transition)
                            .attr('d', diagonal)

                        //Transition exiting nodes to the parent's new position
                        link.exit().transition(transition).remove()
                            .attr('d', d => {
                                const o = { x: source.x, y: source.y };
                                return diagonal({ source: o, target: o })
                            })

                        //Stash the old positions for transition.
                        tree.eachBefore(d => {
                            d.x0 = d.x;
                            d.y0 = d.y;
                        })
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

            my.dx = function(value) {
                if (!arguments.length) return dx;
                dx = value;
                return my;
            }

            my.dy = function(value) {
                if (!arguments.length) return dy;
                dy = value;
                return my;
            }

            return my;
        }

    })
}();