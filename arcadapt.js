// arcadapt.js
//
// Author Brett L Kleinschmidt <brett@spacecurve.com>
// Copyright SpaceCurve, Inc. 2013

var routes = require('./routes');
var logger = require('morgan');
var express = require('express');
var app = express();

app.use(logger())
   .get(routes.infoUri, routes.infoAction)
   .get(routes.catalogUri, routes.catalogAction)
   .get(routes.mapServiceUri, routes.mapServiceAction)
   .get(routes.allLayersUri, routes.allLayersAction)
   .get(routes.layerUri, routes.layerAction)
   .get(routes.featureUri, routes.featureAction)
   .get(routes.identifyUri, routes.identifyAction)
   .get(routes.findUri, routes.findAction)
   .get(routes.queryUri, routes.queryAction)
   .listen(process.env.PORT || 4730);
