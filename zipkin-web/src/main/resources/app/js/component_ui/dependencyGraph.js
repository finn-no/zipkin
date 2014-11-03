'use strict';

define(
    [
        'flight/lib/component',
        'd3/d3',
        'dagre-d3'
    ],

    function (defineComponent,d3,  dagre) {

        return defineComponent(dependencyGraph);

        function dependencyGraph() {
            this.after('initialize', function(container, options) {
                this.on(document, 'aggregateDataReceived', function(ev, data){
                    var t = this;

                    // Find min/max number of calls for all dependency links
                    // to render different arrow widths depending on number of calls
                    var minNumberOfCalls = 0;
                    var maxNumberOfCalls = 0;
                    data.links.filter(function(link){
                        return link.parent != link.child;
                    }).forEach(function(link){
                        var numCalls = getMomentAnnotations(link.durationMoments).count;
                        if(minNumberOfCalls == 0 || numCalls < minNumberOfCalls) {
                            minNumberOfCalls = numCalls;
                        }
                        if(numCalls > maxNumberOfCalls) {
                            maxNumberOfCalls = numCalls;
                        }
                    });
                    var minLg = Math.log(minNumberOfCalls);
                    var maxLg = Math.log(maxNumberOfCalls);
                    function scale(i, startRange, endRange, minResult, maxResult) {
                        return minResult + (i - startRange) * (maxResult - minResult) / (endRange - startRange);
                    }
                    function arrowWidth(numberOfCalls) {
                        var lg = Math.log(numberOfCalls);
                        return scale(lg, minLg, maxLg, 0.3, 3);
                    }

                    Array.prototype.unique = function() {
                        return this.filter(
                            function(val, i, arr)
                            {
                                return (i <= arr.indexOf(val));
                            }
                        );
                    };

                    var parentNames = data.links.map(function(link){
                        return link.parent;
                    });
                    var childNames = data.links.map(function(link){
                        return link.child;
                    });

                    var allNames = parentNames.concat(childNames).unique();

                    var g = new dagre.Digraph();
                    var renderer = new dagreD3.Renderer();

                    allNames.forEach(function(name){
                        g.addNode(name, {label: name});
                    });

                    // A port of com.twitter.algebird.Moments functionality
                    function getMomentAnnotations(moments) {
                        var count = moments.m0;
                        var mean = moments.m1;
                        var variance = moments.m2 / count;
                        var stddev = Math.sqrt(variance);
                        var skewness = Math.sqrt(count) * moments.m3 / Math.pow(moments.m2, 1.5);
                        var kurtosis = count * moments.m4 / Math.pow(moments.m2, 2) - 3;
                        return {
                            count: count,
                            mean: mean,
                            variance: variance,
                            stddev: stddev,
                            skewness: skewness,
                            kurtosis: kurtosis
                        };
                    }

                    function flatten(arrayOfArrays) {
                        return arrayOfArrays.reduce(function(a,b){
                            return a.concat(b);
                        });
                    }

                    data.links.filter(function(link){
                        return link.parent != link.child;
                    }).forEach(function(link){
                        g.addEdge(link.parent+'->'+link.child, link.parent, link.child, {
                            annotations: getMomentAnnotations(link.durationMoments),
                            from: link.parent,
                            to: link.child
                        });
                    });

                    var svg = d3.select('svg'),
                        svgGroup = svg.append('g');

                    var layout = dagre.layout()
                        .nodeSep(30)
//                        .edgeSep(30)
                        .rankSep(200)
                        .rankDir("LR"); // LR or TB

                    // Override drawNodes to set up the hover.
                    var oldDrawNodes = renderer.drawNodes();
                    var oldDrawEdgePaths = renderer.drawEdgePaths();

                    var rootSvg = container.querySelector('svg');

                    renderer.drawEdgePaths(function(g, svg){
                        var svgNodes = oldDrawEdgePaths(g, svg);
                        svgNodes.each(function(edge){
                            var el = this;
                            var $el = $(el);

                            var numberOfCalls = g.edge(edge).annotations.count;
                            var arrowWidthPx = arrowWidth(numberOfCalls)+'px';

                            $el.hover(function(){
                                rootSvg.classList.add('dark');
                                var nodes = getIncidentNodeElements(el.getAttribute('data-from'), el.getAttribute('data-to'));
                                nodes.forEach(function(el){
                                    el.classList.add('hover');
                                });
                                el.classList.add('hover-edge');
                            },function(){
                                rootSvg.classList.remove('dark');
                                var nodes = getIncidentNodeElements(el.getAttribute('data-from'), el.getAttribute('data-to'));
                                nodes.forEach(function(el){
                                    el.classList.remove('hover');
                                });
                                el.classList.remove('hover-edge');
                            });

                            $el.css('stroke-width', arrowWidthPx);
                        });

                        svgNodes.attr('data-from', function(d){
                            return g.edge(d).from;
                        });
                        svgNodes.attr('data-to', function(d){
                            return g.edge(d).to;
                        });
//                        svgNodes.each(function(d, from, to){
//                            return g.node(d).label;
//                        });
                        return svgNodes;
                    });

//                    var svgEdges = renderer.drawEdgePaths(g, svg);
//                    console.log(svgEdges);

                    function getIncidentEdgeElements(nodeName) {
                        var selectedElements = rootSvg.querySelectorAll("[data-from='" + nodeName + "'],[data-to='" + nodeName + "']");
                        return Array.prototype.slice.call(selectedElements);
                    }

                    function getIncidentNodeElements(from, to) {
                        return [
                            rootSvg.querySelector("[data-node='"+from+"']"),
                            rootSvg.querySelector("[data-node='"+to+"']")
                        ];
                    }

                    function getAdjacentNodeElements(centerNode) {
                        var edges = g.incidentEdges(centerNode);
                        var nodes = flatten(edges.map(function(edge){
                            return g.incidentNodes(edge);
                        }));
                        var otherNodes = nodes.filter(function(node){
                            return node != centerNode;
                        }).unique();
                        var elements = otherNodes.map(function(name){
                            return rootSvg.querySelector("[data-node='"+name+"']");
                        });
                        return elements;
                    }

                    renderer.drawNodes(function(g, svg) {
                        var svgNodes = oldDrawNodes(g, svg);

//                        console.log(svgNodes);

                        // Set the title on each of the nodes and use tipsy to display the tooltip on hover
                        svgNodes.attr('data-node', function(d) { return d; })
                            .each(function(d) {
                                var $this = $(this);
                                var el = $this[0];
                                var rect = el.querySelector('rect');

                                var incidentEdges = g.incidentEdges(d).map(function(edgeId){
                                    return g.edge(edgeId);
                                });


                                $this.click(function(){
                                    console.log('clicked', d);
                                    t.trigger('showServiceDataModal', {
                                        serviceName: d
                                    });
                                });

                                $this.hover(function(){
                                    el.classList.add('hover');
                                    rootSvg.classList.add('dark');
                                    getIncidentEdgeElements(d).forEach(function(el){
                                        el.classList.add('hover-edge');
                                    });
                                    getAdjacentNodeElements(d).forEach(function(el){
                                        el.classList.add('hover-light');
                                    });
                                },function(){
                                    el.classList.remove('hover');
                                    rootSvg.classList.remove('dark');
                                    getIncidentEdgeElements(d).forEach(function(el){
                                        el.classList.remove('hover-edge');
                                    });
                                    getAdjacentNodeElements(d).forEach(function(el){

                                        el.classList.remove('hover-light');
                                    });
                                });
                            });
                        return svgNodes;
                    });
                    renderer
                        .layout(layout)
//                        .edgeInterpolate('monotone')
//                        .edgeTension(0.7)
                        .run(g, svgGroup);

                });
            });
        }
    }
);
