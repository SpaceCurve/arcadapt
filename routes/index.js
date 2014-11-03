// routes/index.js
//
// Author Brett L Kleinschmidt <brett@spacecurve.com>
// Copyright SpaceCurve, Inc. 2013

// requires
var httpsync = require('httpsync');
var http = require('http');
var bigint = require('bigint');

// scdb server defaults
var hostname = '127.0.0.1';
var port = 8080;

// adapter defaults
var currentVersion = '0.0.0.0';
var epsgWgs = 4326;
var layerIdMap = { };

// resource: server info
exports.infoUri = '/:instanceName/rest/info';
exports.infoAction = function(request, response) {
    response.send({
        'currentVersion': currentVersion,
        'soapUrl': '',
        'secureSoapUrl': '',
        'authInfo' : { 'isTokenBasedSecurity' : false }
    });
};

// resource: catalog
exports.catalogUri = '/:instanceName/rest/services';
exports.catalogAction = function(request, response) {
    response.send({
        'currentVersion': currentVersion,
        'folders': [ ],
        'services': [ { "name" : "SpaceCurve", "type" : "MapServer" } ]
    });
};

// resource: map service
exports.mapServiceUri = exports.catalogUri + '/SpaceCurve/MapServer';
exports.mapServiceAction = function(request, response) {
    var initialExtent = {"xmin":-180.0,"ymin":-90.0,"xmax":180.0,"ymax":90.0,"spatialReference":{"wkid":4326}}
    var fullExtent = initialExtent;
    var object = {
        'currentVersion': currentVersion,
        'serviceDescription' : 'ArcGIS Server Adapter For SpaceCurve',
        'mapName' : 'SpaceCurve',
        'description': '',
        'copyrightText' : '',
        'supportsDynamicLayers' : false,
        'layers': getLayers(request.params.instanceName),
        'tables': [ ],
        'spatialReference' : { 'wkid' : epsgWgs },
        'singleFusedMapCache' : false,
        'initialExtent' : initialExtent,
        'fullExtent' : fullExtent,
        'capabilities': 'Query'
    };
    sendResponseWithCallback(response, object, request.query.callback);
};

// resource: all layers / tables
exports.allLayersUri = exports.mapServiceUri + '/layers';
exports.allLayersAction = function(request, response) {
    response.send({ 'layers': getLayers(request.params.instanceName), 'tables': [ ] });
};

// resource: layer / table
exports.layerUri = exports.mapServiceUri + '/:layerOrTableId(\\d+)';
exports.layerAction = function(request, response) {
    var layerOrTableId = parseInt(request.params.layerOrTableId);
    var layerOrTableName = getLayerName(request.params.instanceName, layerOrTableId);
    var fields = getFields(request.params.instanceName, layerOrTableId);
    var object = {
        'currentVersion': currentVersion,
        'id' : layerOrTableId,
        'name' : layerOrTableName,
        'type' : 'Feature Layer',
        'description' : '',
        'definitionExpression' : '',
        'objectIdField': 'OBJECTID',
        'globalIdField' : '',
        'displayField' : 'OBJECTID',
        'typeIdField' : '',
        'fields' : fields,
        'types' : [ ],
        'capabilities': 'Query',
        "supportedQueryFormats" : "JSON",
        "supportsAdvancedQueries" : true,
        "supportsStatistics" : true,
        "defaultVisibility" : true
    };
    sendResponseWithCallback(response, object, request.query.callback);
};

// resource: feature
exports.featureUri = exports.layerUri + '/:featureId(\\d+)';
exports.featureAction = function(request, response) { response.send({ 'feature': { } }); };

// operation: identify
exports.identifyUri = exports.mapServiceUri + '/identify';
exports.identifyAction = function(request, response) { response.send({ 'results': [ ] }); };

// operation: find
exports.findUri = exports.mapServiceUri + '/find';
exports.findAction = function(request, response) { response.send({ 'results': [ ] }); };

// operation: query
exports.queryUri = exports.layerUri + '/query';
exports.queryAction = function(request, response) {
    console.log({ 'request' : request.query });

    if (request.query.where) {
        var extraParams = request.query.where.split(";");
        request.query.where = extraParams[0];
        request.query.join = extraParams[1];
    }

    var layerOrTableId = parseInt(request.params.layerOrTableId);
    var tableName = getLayerName(request.params.instanceName, layerOrTableId);
    var sql = queryToSql(tableName, request.query)

    console.log({ 'sql' : sql });

    var fields = getFields(request.params.instanceName, layerOrTableId);
    var fieldAliases = { };
    for (var index=0; index<fields.length; ++index)
        fieldAliases[fields[index].name] = fields[index].name;

    // Heatmap processing
    var gridRequested = false,
        groupByFields = [],
        gridSet = { },
        gridDelta = 10.0,
        statFieldName;

    if (request.query.groupByFieldsForStatistics) {
        var geoStatIndex = -1;
        groupByFields = request.query.groupByFieldsForStatistics.split(",");
        gridRequested = (geoStatIndex = groupByFields.indexOf("geometry")) > -1;
        if (gridRequested) {
            var outStatistics = JSON.parse(request.query.outStatistics);
            statFieldName = outStatistics[geoStatIndex].outStatisticFieldName;
            onStatFieldName = outStatistics[geoStatIndex].onStatisticField;
            if (onStatFieldName.indexOf(":") > -1)
                gridDelta = parseFloat(onStatFieldName.split(":")[1]);
        }
    }

    // HTTP request options
    var options = {
        hostname : hostname,
        port : port,
        path : '/' + request.params.instanceName + '/' + encodeURIComponent(sql),
        headers : getHeaders(request.query.inSR)
    };

    var prefix = '',
        features = [ ];

    var handleChunk = function (chunk) {
        // Read data chunks up to the final newline for processing. The string remainder
        // will become the prefix for the next chunk, and so on.
        var lines = (prefix + chunk.toString()).split('\r\n');
        prefix = lines.pop();
        var featureSet = lines.map(function(x) { return jsonToEsri(JSON.parse(x)) });

        if (gridRequested)
            computeGrid(featureSet, gridDelta, gridSet);
        else
            features = features.concat(featureSet);
    };

    var handleClose = function() {
        // Complete the aggregation operation.
        if (gridRequested)
            features = gridSetToFeatures(gridSet, gridDelta, request.query.inSR, statFieldName);

        console.log({ 'resultSize': features.length });

        var object = {
            'displayFieldName' : 'OBJECTID',
            'fields' : fields,
            'fieldAliases' : fieldAliases,
            'hasZ' : false,
            'hasM' : false,
            'spatialReference' : { 'wkid' : request.query.inSR },
            'features' : features
            };

        // ArcGIS for iOS blows up if we include a geometryType when it didn't ask for
        // geometry results, or if we don't include a geometryType when there are no results.
        if (request.query.returnGeometry != 'false')
            object['geometryType'] = features.length > 0? getGeometryType(features[0]): 'esriGeometryPoint';

        sendResponseWithCallback(response, object, request.query.callback);
    };

    var joinRequested = request.query.join != undefined;
    if (joinRequested) {
        var numJobs = 12;
        var cmd = [ "lib/scjoin.py"
                  , "-n",  request.params.instanceName
                  , "-j", numJobs.toString()
                  , "-l", sql
                  , "-r", request.query.join + ";"];
        if ("SCDB-SpatialReference" in options["headers"])
            cmd += [ "-t", options["headers"]["SCDB-SpatialReference"] ];
        console.log(cmd);
        var child = require('child_process').spawn('python2', cmd);
        child.stderr.on('data', function(chunk) {
            console.log({' python_error' : chunk.toString() });
        });
        child.stdout.on('data', handleChunk);
        child.on('close', handleClose);
    }
    else
    {
        // HTTP reponse callback
        var callback = function(res) {
            console.log({ 'status' : res.statusCode, 'headers' : res.headers });
            res.on('data', handleChunk);
            res.on('end', handleClose);
        };

        // Execute
        http.get(options, callback);
    }
};

// helper methods

function sendResponseWithCallback(response, object, callback) {
    // Sometimes ArcGIS applications send an (undocumented) parameter
    // `callback' with the request query. In this case, it expects us to
    // return a script which invokes the callback with the query result.

    if (callback) {
        response.send(callback + '(' + JSON.stringify(object) + ')');
    } else {
        response.send(object);
    }
}

function requestIdToObjectId(requestId) {
    var larget32BitPrime = 4294967291;
    var objectId = bigint(requestId).mod(larget32BitPrime).toNumber();
    return objectId;
}

function tableIdToLayerId(tableId, tableName) {
    // ArcGIS for iOS only supports 32-bit layerIds, so we must compress
    // the 64-bit tableIds given by SCDB. We do this by taking the tableId
    // modulo some large 32-bit prime to be the layerId.

    var larget32BitPrime = 4294967291;
    var layerId = tableId % larget32BitPrime;
    layerIdMap[layerId] = tableId;

    return layerId;
}

function layerIdToTableId(layerId) {
    return layerIdMap[layerId];
}

function getLayers(instanceName) {
    var sql = 'SELECT table_id, schema_name, table_name FROM scdb.scdb_tables WHERE table_id > 64;'
    var result = queryInstance(instanceName, sql);
    return result.map(function(record) {
        var user_data = record[1];
        var layerName = user_data.schema_name + '.' + user_data.table_name;
        var layerId = tableIdToLayerId(user_data.table_id);
        return {
            "id" : layerId,
            "name" : layerName,
            "defaultVisibility" : true,
            "parentLayerId" : -1,
            "subLayerIds" : null
        };
    });
};

function getType(typeElementDef) {
    // We don't currently output Esri typenames. None of the tested SDKs
    // seem to care.

    switch (typeElementDef) {
    case "TPBool":      return "esriFieldTypeString";
    case "TPChar":      return "esriFieldTypeString";
    case "TPInt8":      return "esriFieldTypeSmallInteger";
    case "TPInt16":     return "esriFieldTypeSmallInteger";
    case "TPInt32":     return "esriFieldTypeInteger";
    case "TPInt64":     return "esriFieldTypeInteger";
    case "TPUInt8":     return "esriFieldTypeSmallInteger";
    case "TPUInt16":    return "esriFieldTypeSmallInteger";
    case "TPUInt32":    return "esriFieldTypeInteger";
    case "TPUInt64":    return "esriFieldTypeInteger";
    case "TPFloat32":   return "esriFieldTypeSingle";
    case "TPFloat64":   return "esriFieldTypeDouble";

    // Not all type elements will return above. If we get here it means
    // the type element wasn't a primitive. In most cases this means VARCHAR.
    default:            return "esriFieldTypeString";
    }
};

function getFields(instanceName, layerId) {
    var sql, result;
    var tableId = layerIdToTableId(layerId);

    sql = 'SELECT table_id, "type" FROM scdb.scdb_tables WHERE table_id = ' + tableId + ';';
    result = queryInstance(instanceName, sql);

    var typeName = result[0][1].type;
    //console.log('typeName', typeName);

    sql = 'SELECT type_id FROM scdb.scdb_types WHERE type_name = \'' + typeName + '\';';
    result = queryInstance(instanceName, sql);

    var typeId = result[0][1].type_id;
    //console.log('typeId', typeId);

    sql = 'SELECT * FROM scdb.scdb_type_elements WHERE label = \'properties\' AND type_id = ' + typeId + ';'
    result = queryInstance(instanceName, sql);

    var typeElementRef = result[0][1].type_element_def.value;
    //console.log('typeElementRef', typeElementRef);

    sql = 'SELECT * FROM scdb.scdb_type_elements WHERE type_id = ' + typeElementRef + ';'
    result = queryInstance(instanceName, sql);

    fields = result.filter(function(record) {
        return !record[1].nullable;
    }).map(function(record) {
        return {
            'name' : record[1].label,
            'type' : getType(record[1].type_element_def.value),
            'alias' : record[1].label
        };
    });
    fields.push({
        'name' : 'OBJECTID',
        'type' : 'esriFieldTypeOID',
        'alias' : 'Object ID'
    });

    return fields;
};

function getHeaders(inSR) {
    switch (typeof(inSR) == 'undefined' ? epsgWgs : parseInt(inSR))
    {
    // Web Mercator
    case 102100: return { 'SCDB-SpatialReference' : 'urn:ogc:def:crs:EPSG::3857' };
    // WGS 1984
    default:     return {};
    }
}

function queryInstance(instanceName, sql, inSR) {
    var result = httpsync.get({
        'url' : 'http://' + hostname + ':' + port +'/' + instanceName + '/' + encodeURIComponent(sql),
        'headers' : getHeaders(inSR)
    }).end();
    if (result.statusCode == 200) {
        var lines = result.data.toString().split('\r\n');
        lines.pop();
        return lines.map(JSON.parse);
    }
    console.log('Query failed with status', result.statusCode, ':', sql);
    return [ ];
};

function getLayerName(instanceName, layerId) {
    var tableId = layerIdToTableId(layerId);
    var sql = 'SELECT schema_name, table_name FROM scdb.scdb_tables WHERE table_id = '+ tableId + ';'
    var result = queryInstance(instanceName, sql);
    return result[0][1].schema_name + '.' + result[0][1].table_name;
};

function esriToWkt(geometryType, geometry) {
    try {
        // JSON syntax
        geometry = JSON.parse(geometry)
    } catch(e) {
        var components = geometry.split(',');

        // Point simple syntax
        if (components.length == 2) {
            geometry = { 'x': components[0], 'y': components[1] };
        }
        // Envelope simple syntax
        else if (components.length == 4) {
            geometry = { 'xmin': components[0], 'ymin': components[1],
                         'xmax': components[2], 'ymax': components[3] };
        }
        else return null;
    }

    switch (geometryType) {
    default:
    case 'esriGeometryEnvelope':
        return 'POLYGON ((' +
        geometry.xmin + ' ' + geometry.ymin + ', ' +
        geometry.xmax + ' ' + geometry.ymin + ', ' +
        geometry.xmax + ' ' + geometry.ymax + ', ' +
        geometry.xmin + ' ' + geometry.ymax + ', ' +
        geometry.xmin + ' ' + geometry.ymin + '))'
    case 'esriGeometryPoint':
        return 'POINT (' + geometry.x + ' ' + geometry.y + ')';
    case 'esriGeometryPolyline':
        return 'LINESTRING (' + geometry.paths[0].map(function(s) { return s.join(' ') }).join(', ') + ')';
    case 'esriGeometryPolygon':
        return 'POLYGON ((' + geometry.rings[0].map(function(s) { return s.join(' ') }).join(', ') + '))';
    case 'esriGeometryMultiPoint':
        throw 'Unsupported geometry type: ' + geometryType;
    }
};

function esriToOgc(spatialRel) {
    switch (spatialRel) {
    // Default relation is ST_Intersects
    default: 
    case 'esriSpatialRelEnvelopeIntersects':
    case 'esriSpatialRelIntersects':    return 'ST_Intersects';
    case 'esriSpatialRelContains':      return 'ST_Contains';
    case 'esriSpatialRelCrosses':       return 'ST_Crosses';
    case 'esriSpatialRelOverlaps':      return 'ST_Overlaps';
    case 'esriSpatialRelTouches':       return 'ST_Touches';
    case 'esriSpatialRelWithin':        return 'ST_Within';

    // Unsupported relations
    case 'esriSpatialRelIndexIntersects':
    case 'esriSpatialRelRelation':
        throw 'Unsupported spatial relation: ' + spatialRel;
    }
};

function processOutFields(outFields) {
    // Ignoring projection operations for the moment
    return '*';
}

function queryToSql(layerName, query) {
    outFields = query.outFields && query.outFields.indexOf('*') < 0 ?  processOutFields(query.outFields) : '*';
    sql = 'SELECT ' + outFields + ' FROM ' + layerName + ' WHERE ';
    if (query.where) {
        sql += query.where + ' AND ';
    }
    if (query.text) {
        displayField = 'properties."NAME"'
        sql += displayField + ' LIKE \'%' + query.text + '%\' AND ';
    }
    if (query.geometry) {
        sql += '"geometry".' + esriToOgc(query.spatialRel) + '(ST_Geography(\'' + esriToWkt(query.geometryType, query.geometry) + '\')) AND ';
    }
    sql += 'TRUE';
    if (query.orderByFields) {
        sql += ' ORDER BY properties.' + query.orderByFields;
    }
    return sql + ';';
};

function parseGeometry(geometry) {
    if (geometry) {
        switch (geometry.type) {
        case 'Point':
            return {
                'x' : geometry.coordinates[0],
                'y' : geometry.coordinates[1],
                'spatialReference' : { 'wkid' : epsgWgs }
            };
        case 'LineString':
            return {
                'hasZ' : false,
                'hasM' : false,
                'paths' : [ geometry.coordinates ],
                'spatialReference' : { 'wkid' : epsgWgs }
            };
        case 'Polygon':
            return {
                'hasZ' : false,
                'hasM' : false,
                'rings' : geometry.coordinates,
                'spatialReference' : { 'wkid' : epsgWgs }
            };
        //default:
        //    throw 'Unsupported geometry type: ' + geometry.type;
        }
    }
    return null;
};

function jsonToEsri(record) {
    var object = { 'geometry': parseGeometry(record[1].geometry), 'attributes': record[1].properties };
    object.attributes['OBJECTID'] = requestIdToObjectId(record[0].request_id);
    return object;
};

function getGeometryType(feature) {
    if (feature) {
        if (feature.geometry.hasOwnProperty('x'))
            return 'esriGeometryPoint';
        if (feature.geometry.hasOwnProperty('paths'))
            return 'esriGeometryPolyline';
        if (feature.geometry.hasOwnProperty('rings'))
            return 'esriGeometryPolygon';
        if (feature.geometry.hasOwnProperty('xmin'))
            return 'esriGeometryExtent';
        if (feature.geometry.hasOwnProperty('points'))
            return 'esriGeometryMultipoint';
    }
    return null;
};

function computeGrid(featureSet, gridDelta, gridSet) {
    var r = gridDelta / 2,
        dx = r * 2 * Math.sin(Math.PI / 3),
        dy = r * 1.5;

    featureSet.map(function(feature) {
        var py = feature.geometry.y / dy, pj = Math.round(py),
            px = feature.geometry.x / dx - (pj & 1 ? .5 : 0), pi = Math.round(px),
            py1 = py - pj;

        if (Math.abs(py1) * 3 > 1) {
            var px1 = px - pi,
                pi2 = pi + (px < pi ? -1 : 1) / 2,
                pj2 = pj + (py < pj ? -1 : 1),
                px2 = px - pi2,
                py2 = py - pj2;
            if (px1 * px1 + py1 * py1 > px2 * px2 + py2 * py2) pi = pi2 + (pj & 1 ? 1 : -1) / 2, pj = pj2;
        }

        var key = [ (pi + (pj & 1 ? 1 / 2 : 0)) * dx, pj * dy ];

        gridSet[key] = key in gridSet ? gridSet[key] + 1 : 1;
    });
}

function computeHexagonRing(center, gridDelta) {
    var size = gridDelta * 0.5 / Math.sqrt(3),
        ring = [ ],
        x0 = 0,
        y0 = 0;

    for (var i=0; i<=7; ++i) {
        var angle = (i + 0.5) * 2 * Math.PI / 6;
        var x1 = Math.sin(angle) * size,
            y1 = -Math.cos(angle) * size,
            dx = x1 + x0,
            dy = y1 + y0,
            x0 = x1,
            y0 = y1;
        if (i > 0) ring.push([dx + center[0], dy + center[1]]);
    }

    return ring;
}

function computeRectangleRing(grid, gridDelta) {
    var size = gridDelta * 0.5;
    var ring = [ [grid[0] - size, grid[1] - size],
                 [grid[0] + size, grid[1] - size],
                 [grid[0] + size, grid[1] + size],
                 [grid[0] - size, grid[1] + size],
                 [grid[0] - size, grid[1] - size] ];
    return ring;
}

function gridSetToFeatures(gridSet, gridDelta, spatialReference, statFieldName) {
    // Compute mean and std dev
    var num = 0.0,
        sum = 0.0,
        sumSqr = 0.0;
    for (var gridKey in gridSet)
    {
        num += 1;
        sum += gridSet[gridKey];
        sumSqr += gridSet[gridKey] * gridSet[gridKey];
    }

    var mean = sum / num,
        stdDev = Math.sqrt((num * sumSqr) - (sum * sum)) / num;

    var gridFeatureSet = [ ];
    for (var gridKey in gridSet)
    {
        var grid = gridKey.split(',').map(parseFloat);
        //var ring = computeRectangleRing(grid, gridDelta);
        var ring = computeHexagonRing(grid, gridDelta);
        var geometry = { 'rings': [ ring ],
                         'hasZ' : false, 'hasM' : false,
                         'spatialReference' : spatialReference };
        var feature = { 'geometry' : geometry, 'attributes' : { } };
        feature.attributes[statFieldName] = gridSet[gridKey];
        feature.attributes['zscore'] = (gridSet[gridKey] - mean) / stdDev;
        feature.attributes['OBJECTID'] = Math.floor(Math.random() * 1e9);
        gridFeatureSet.push(feature);
    }
    return gridFeatureSet;
}
