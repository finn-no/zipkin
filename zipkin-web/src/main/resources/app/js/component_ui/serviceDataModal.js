'use strict';

define(
    [
        'flight/lib/component',
        'component_data/aggregate'
    ],

    function(defineComponent, aggregate){
        return defineComponent(serviceDataModal);

        function serviceDataModal() {
            this.after('initialize', function(){
                this.on(document, 'showServiceDataModal', this.showModal);
                this.on(document, 'serviceDataReceived', renderModal);
            });
            this.showModal = function(event, data){
                this.trigger(document, 'serviceDataRequested', {
                    serviceName: data.serviceName
                });
            };
        }

        function renderModal(event, data) {
            console.log("render", data);
            var $modal = $('#serviceModal');
            $modal.find('#serviceUsedByList').html('');
            data.usedBy.sort(function (a, b) {
                return a.toLowerCase().localeCompare(b.toLowerCase());
            });
            data.usedBy.forEach(function(usedBy){
                var $name = $('<li><a href="">' + usedBy + '</a></li>');
                $name.find('a').click(function(ev){
                    ev.preventDefault();
                    this.trigger(document, 'showServiceDataModal', {
                        serviceName: usedBy
                    });
                }.bind(this));
                $modal.find('#serviceUsedByList').append($name);
            }.bind(this));

            $modal.find('#serviceUsesList').html('');
            data.uses.sort(function (a, b) {
                return a.toLowerCase().localeCompare(b.toLowerCase());
            });

            data.uses.forEach(function(uses){
                var $name = $('<li><a href="">' + uses + '</a></li>');
                $name.find('a').click(function(ev){
                    ev.preventDefault();
                    this.trigger(document, 'showServiceDataModal', {
                        serviceName: uses
                    });
                }.bind(this));
                $modal.find('#serviceUsesList').append($name);
            }.bind(this));

            $modal.find('#serviceModalTitle').text(data.serviceName);

            $modal.modal();
        }
    }
);