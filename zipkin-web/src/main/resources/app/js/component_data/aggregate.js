'use strict';

define(
    [
        'flight/lib/component'
    ],

    function (defineComponent) {

        return defineComponent(aggregate);

        function aggregate() {
            var _this = this;
            this.getAggregate = function(from, to) {
                var url = "/api/dependencies/"+from+'/'+to;
                $.ajax(url, {
                    type: "GET",
                    dataType: "json",
                    context: this,
                    success: function(data) {
                        this.trigger(document, 'aggregateDataReceived', data);
                    },
                    failure: function(jqXHR, status, err){
                        var error = {
                            message: "Couldn't get dependency data from backend: "+err
                        };
                        this.trigger(document, 'aggregateDataFailed', error);
                    }
                });
            };

            this.after('initialize', function() {
                this.on(document, 'aggregateDataRequested', function(args){
                    this.getAggregate(args.from, args.to)
                });

                this.getAggregate(0, Date.now()*1000);
            });
        }

    }
);

