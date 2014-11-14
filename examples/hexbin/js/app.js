// js/app.js
//
// Copyright SpaceCurve, Inc. 2013
//
// Portions of this source file are subject to the following license:
// Copyright (c) 2012-2014, Michael Bostock
// 
// All rights reserved.
// 
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
// 
// * Redistributions of source code must retain the above copyright notice, this
//   list of conditions and the following disclaimer.
// * Redistributions in binary form must reproduce the above copyright notice,
//   this list of conditions and the following disclaimer in the documentation
//   and/or other materials provided with the distribution.
// * The name Michael Bostock may not be used to endorse or promote products
//   derived from this software without specific prior written permission.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
// DISCLAIMED. IN NO EVENT SHALL MICHAEL BOSTOCK BE LIABLE FOR ANY DIRECT,
// INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
// BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
// OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
// NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
// EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


dojo.require("esri.map");
dojo.require("esri.tasks.query");
dojo.require("esri.layers.FeatureLayer");
dojo.require("esri.renderers.SimpleRenderer");
dojo.require("esri.dijit.Legend");

dojo.ready(init);

// global variables
var map;

// arcadapt web service info
var queryLayer = "schema.earthquakes",
    hostName = window.location.hostname,
    instanceName = 'ArcGIS',
    mapServiceUrl = "http://" + hostName + ":4730/" + instanceName + "/rest/services/SpaceCurve/MapServer/";

function init() {
    var lods = [
        /*
        { "level": 0, "resolution": 156543.03392800014, "scale": 5.91657527591555E8 },
        { "level": 1, "resolution": 78271.51696399994, "scale": 2.95828763795777E8 },
        { "level": 2, "resolution": 39135.75848200009, "scale": 1.47914381897889E8 },
        { "level": 3, "resolution": 19567.87924099992, "scale": 7.3957190948944E7 },
        { "level": 4, "resolution": 9783.93962049996, "scale": 3.6978595474472E7 },
        */
        { "level": 5, "resolution": 4891.96981024998, "scale": 1.8489297737236E7 },
        { "level": 6, "resolution": 2445.98490512499, "scale": 9244648.868618 },
        { "level": 7, "resolution": 1222.992452562495, "scale": 4622324.434309 },
        { "level": 8, "resolution": 611.4962262813797, "scale": 2311162.217155 },
        { "level": 9, "resolution": 305.74811314055756, "scale": 1155581.108577 },
        { "level": 10, "resolution": 152.87405657041106, "scale": 577790.554289 },
        { "level": 11, "resolution": 76.43702828507324, "scale": 288895.277144 },
        { "level": 12, "resolution": 38.21851414253662, "scale": 144447.638572 },
        { "level": 13, "resolution": 19.10925707126831, "scale": 72223.819286 },
        { "level": 14, "resolution": 9.554628535634155, "scale": 36111.909643 },
        { "level": 15, "resolution": 4.77731426794937, "scale": 18055.954822 },
        { "level": 16, "resolution": 2.388657133974685, "scale": 9027.977411 }
    ];

    map = new esri.Map("map", {
        basemap: "gray",
        center: [-98.5, 40.0],
        lods: lods,
        slider: false,
        wrapAround180: false
    });
    map.on("load", initMap);
}

function initMap(e) {
    var mapServiceLayer = new esri.layers.ArcGISDynamicMapServiceLayer(mapServiceUrl);
    mapServiceLayer.on("load", initMapServiceLayer);
}

function initMapServiceLayer(e) {
    // find the selected field, `queryLayer'
    var layerInfos = e.layer.createDynamicLayerInfosFromLayerInfos(),
        queryLayerId;

    for (var i=0,len=layerInfos.length; i<len; i++) {
        if (layerInfos[i].name == queryLayer)
        {
            queryLayerId = layerInfos[i].id;
            break;
        }
    }

    if (!queryLayerId) {
        alert("Layer " + queryLayer + " not found!");
        return;
    }

    // set featureLayer to selected
    var featureLayer = new esri.layers.FeatureLayer(mapServiceUrl + queryLayerId, {
        mode : esri.layers.FeatureLayer.MODE_SELECTION,
        outFields : ["*"],
    });

    featureLayer.on("selection-complete", selectionCallback);
    featureLayer.on("error", console.log);
    featureLayer.setRenderer(initRenderer());

    var legend = new esri.dijit.Legend({
        map: map,
        layerInfos: [{ title: "Density (Z-Score)", layer: featureLayer }]
    }, "legend");
    legend.startup();

    map.addLayer(featureLayer);
    featureLayer.on("load", initFeatureLayer);
}

function initFeatureLayer(e) {
    map.on("extent-change", function() {
        // TODO: Don't let the user pan too far north or south
        //var geo = map.geographicExtent;
        executeQuery(e.layer);
    });
}

function executeQuery(featureLayer) {
    var hexRadius = (map.extent.xmax - map.extent.xmin) / 100.0;

    var statDef = esri.tasks.StatisticDefinition();
    statDef.onStatisticField = "geometry:" + hexRadius.toString();
    statDef.outStatisticFieldName = "count";
    statDef.statisticType = "count";

    var selectQuery = new esri.tasks.Query();
    selectQuery.spatialRelationship = esri.tasks.Query.SPATIAL_REL_INTERSECTS;
    selectQuery.geometry = map.extent;
    selectQuery.outStatistics = [ statDef ];
    selectQuery.groupByFieldsForStatistics = [ "geometry" ];

    console.log("Executing query", selectQuery);
    featureLayer.selectFeatures(selectQuery, esri.layers.FeatureLayer.SELECTION_NEW);
}

function initRenderer() {
    var marker = new esri.symbol.SimpleFillSymbol();
    marker.setOutline(new esri.symbol.SimpleLineSymbol().setWidth(0.5));

    var renderer = new esri.renderer.SimpleRenderer(marker);
    renderer.setColorInfo({
        field: function(graphic) { return graphic.attributes.zscore; },
        minDataValue: -2.5,
        maxDataValue: 2.5,
        colors: [
            new dojo.Color([ 26, 170, 203, 0.5]),
            new dojo.Color([ 25, 118, 178, 0.5]),
            new dojo.Color([ 45,  38, 106, 0.5]),
            new dojo.Color([ 78,  40, 110, 0.5]),
            new dojo.Color([124,  45, 139, 0.5]),
            new dojo.Color([165,  78, 158, 0.5])
        ]
    });
    return renderer;
}

function selectionCallback(featureSet) {
    console.log("Displaying results", featureSet);
}
