'use strict';

define(
    [
        'flight/lib/component'
    ],

    function (defineComponent) {

        return defineComponent(aggregate);

        function aggregate() {
            var _this = this;
            var _data = [];
            var services = {};
            var dependencies = {};

            this.getAggregate = function(from, to) {
                var url = "/api/dependencies/"+from+'/'+to;
                $.ajax(url, {
                    type: "GET",
                    dataType: "json",
                    context: this,
                    success: function(data) {
                        _data = data;
                        console.log(data);
                        this.buildServiceData(data);
                        this.trigger('aggregateDataReceived', data);
                    },
                    failure: function(jqXHR, status, err){
                        var error = {
                            message: "Couldn't get dependency data from backend: "+err
                        };
                        this.trigger('aggregateDataFailed', error);
                    }
                });
            };

            this.buildServiceData = function(data) {
                services = {};
                dependencies = {};
                data.links.forEach(function(link){
                    var parent = link.parent;
                    var child = link.child;

                    dependencies[parent] = dependencies[parent] || {};
                    dependencies[parent][child] = link;

                    services[parent] = services[parent] || { serviceName: parent, uses: [], usedBy: [] };
                    services[child] = services[child] || { serviceName: child, uses: [], usedBy: [] };

                    services[parent].uses.push(child);
                    services[child].usedBy.push(parent);
                });
            };

            this.after('initialize', function() {
                this.on(document, 'aggregateDataRequested', function(args){
                    this.getAggregate(args.from, args.to)
                });

                this.on(document, 'serviceDataRequested', function(event, args){
                    this.getServiceData(args.serviceName, function(data){
                        this.trigger(document, 'serviceDataReceived', data);
                    }.bind(this));
                });

                this.on(document, 'dependencyDataRequested', function(event, args){
                    this.getDependencyData(args.parent, args.child, function(data){
                        this.trigger(document, 'dependencyDataReceived', data);
                    }.bind(this));
                });

                this.getAggregate(0, Date.now()*1000);
            });

            this.getServiceData = function(serviceName, callback){
                callback(services[serviceName]);
            };

            this.getDependencyData = function(parent, child, callback){
                callback(dependencies[parent][child]);
            };
        }
    }
);
