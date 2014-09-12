'use strict';

define(
    [
        'component_data/aggregate',
        'component_ui/dependencyGraph'
    ],

    function(
        AggregateData,
        DependencyGraphUI
        ){

        return initialize;

        function initialize() {
            AggregateData.attachTo('#aggregate-container');
            DependencyGraphUI.attachTo('#aggregate-container');
        }
    }
);