dojo.require("esri.map");
dojo.require("esri.tasks.query");
dojo.require("esri.tasks.StatisticDefinition");
dojo.require("esri.layers.FeatureLayer");

dojo.ready(init);

// global variables
var map, mapExtentSymbol, infoTemplate, featureLayer, field;

// arcadapt web service info
var hostName = window.location.hostname,
    instanceName = 'ArcGIS',
    mapServiceUrl = "http://" + hostName + ":4730/" + instanceName + "/rest/services/SpaceCurve/MapServer/";

// init - called once when the dom is ready
function init() {
    map = new esri.Map("map", {
        basemap: "topo",
        center: [-98.5, 40.0], // long, lat
        zoom: 5,
        slider: false
    });

    mapExtentSymbol = new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_NULL,
                new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID,
                new dojo.Color([255,255,255]), 2));

    infoTemplate = new esri.InfoTemplate("Attributes", "${*}");

    setMapServiceLayer();

    // set bindings to dom elements
    dojo.connect(dojo.byId("execute"), "click", executeQuery);
    dojo.connect(dojo.byId("table"), "change", setQueryLayer);
    dojo.connect(dojo.byId("field"), "change", setQueryField);
}

// setMapServiceLayer - called once when the dom is ready
function setMapServiceLayer() {
    var mapServiceLayer = new esri.layers.ArcGISDynamicMapServiceLayer(mapServiceUrl);

    // populate the layer selector
    dojo.connect(mapServiceLayer, "onLoad", function() {
        dojo.empty("table");
        var layerInfos = mapServiceLayer.createDynamicLayerInfosFromLayerInfos();
        layerInfos.map(function(layer) {
            dojo.create("option", {value: layer.id, label: layer.name, innerHTML: layer.name}, dojo.byId("table"));
        });

        // default selection to first query layer
        setQueryLayer();
    });
}

// setQueryLayer - called when user selects a layer from the query form
function setQueryLayer() {
    // set featureLayer to selected
    featureLayer = new esri.layers.FeatureLayer(mapServiceUrl + dojo.byId("table").value, {
        mode : esri.layers.FeatureLayer.MODE_ONDEMAND,
        outFields : ["*"]
    });
    console.log("Switched to query layer", featureLayer);

    // populate the field selector
    dojo.connect(featureLayer, "onLoad", function() {
        dojo.empty("field");
        featureLayer.fields.map(function(field) {
            dojo.create("option", {value: field.name, label: field.name, innerHTML: field.name}, dojo.byId("field"));
        });
        setQueryField();
    });
}

// setQueryField - called when the user selects a field from the query form
function setQueryField() {
    // fetch the field object by name
    for (var i=0,len=featureLayer.fields.length; i<len; i++) {
        if (featureLayer.fields[i].name == dojo.byId("field").value)
        {
            field = featureLayer.fields[i];
            break;
        }
    }
    console.log("Switched to field", field);

    // populate the value placeholder with field typename
    dojo.attr(dojo.byId("value"), "placeholder", field.type);
}

// getSymbol - maps an Esri geometryType to a graphics symbol
function getSymbol(geometryType) {
    switch (geometryType) {
    case "esriGeometryPoint":
        return new esri.symbol.SimpleMarkerSymbol(esri.symbol.SimpleMarkerSymbol.STYLE_SQUARE, 10,
                    new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID,
                    new dojo.Color([255,0,0]), 1), new dojo.Color([0,255,0,0.25]));

    case "esriGeometryPolyline":
        return new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_DASH,
                    new dojo.Color([255,0,0]), 1);

    case "esriGeometryExtent":
    case "esriGeometryPolygon":
        return new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_SOLID,
                    new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_DASHDOT,
                    new dojo.Color([255,0,0]), 2), new dojo.Color([255,255,0,0.25]));

    case "esriGeometryMultipoint":
        return new esri.symbol.SimpleMarkerSymbol(esri.symbol.SimpleMarkerSymbol.STYLE_DIAMOND, 20,
                    new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID,
                    new dojo.Color([0,0,0]), 1), new dojo.Color([255,255,0,0.5]));

    default: return null;
    }
}

// executeQuery - called when the user presses the query button
function executeQuery() {
    var queryLng = parseFloat(dojo.byId("longitude").value),
        queryLat = parseFloat(dojo.byId("latitude").value),
        queryAng = parseFloat(dojo.byId("extent").value);

    var queryCenter = new esri.geometry.Point(queryLng, queryLat),
        queryExtent = new esri.geometry.Extent(0, 0, queryAng, queryAng).centerAt(queryCenter),
        queryGraphic = new esri.Graphic(queryExtent, mapExtentSymbol);

    var queryField = dojo.byId("field").value,
        queryValue = dojo.byId("value").value,
        queryVType = field.type,
        queryOper  = dojo.byId("operator").value;

    var query = new esri.tasks.Query();
    query.spatialRelationship = esri.tasks.Query.SPATIAL_REL_INTERSECTS;
    query.geometry = queryExtent;
    query.where = "properties.\"" + queryField + "\" " + queryOper + " " + queryValue;
    //query.where += ';SELECT * FROM schema.earthquakes WHERE "geometry".ST_Distance(ST_Geography(%{geometry})) < 1000.0';

    // example of geometry hexbinning
    //var statDef = esri.tasks.StatisticDefinition();
    //statDef.onStatisticField = "geometry";
    //statDef.outStatisticFieldName = "count";
    //statDef.statisticType = "count";
    //query.outStatistics = [ statDef ];
    //query.groupByFieldsForStatistics = [ "geometry" ];

    // example of geometry hexbinning
    //var statDef = esri.tasks.StatisticDefinition();
    //statDef.onStatisticField = "geometry";
    //statDef.outStatisticFieldName = "count";
    //statDef.statisticType = "count";
    //query.outStatistics = [ statDef ];
    //query.groupByFieldsForStatistics = [ "geometry" ];

    console.log("Executing query", query);

    map.graphics.clear();
    map.graphics.add(queryGraphic);
    map.setExtent(queryExtent.expand(1.25));

    featureLayer.queryFeatures(query, showResults, console.log);
}

// showResults - called when query results are ready to be displayed
function showResults(featureSet) {
    console.log("Displaying results", featureSet);

    featureSet.features.map(function(graphic) {
        graphic.setSymbol(getSymbol(featureSet.geometryType));
        graphic.setInfoTemplate(infoTemplate);
        map.graphics.add(graphic);
    });
}
