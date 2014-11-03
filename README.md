ArcGIS Server Adapter for SpaceCurve System
===========================================

The ArcGIS Server Adapter for the SpaceCurve System is a server application
written in JavaScript on the Node.js platform. The Adapter translates calls to
an ArcGIS REST API Map Service interface into REST API calls to the SpaceCurve
System. Using this Adapter, hundreds of applications that call ArcGIS REST APIs
can query data stored in a SpaceCurve System cluster.

This Adapter provides these ArcGIS Map Service interface features:

-   **All Layers and Tables**. This Adapter can retrieve metadata about tables
    from the SpaceCurve System.

-   **Layer / Table** resources. This Adapter can retrieve a table from the
    SpaceCurve System and present it as a Feature Layer.

-   **Query** operations. This Adapter allows both spatial and generic queries
    for Features from a Feature Layer, which the Adapter gathers from tables
    within an instance in the SpaceCurve System.

These instructions describe the steps you will take to use this
Adapter and two examples on the SpaceCurve QuickStart Virtual Machine.


Dependencies
--------------------

Before following these instructions, be sure you installed sample data
by following the instructions in the **Add Sample Data** section of *QuickStart for SpaceCurve Virtual Machine*.

Run Examples
------------

You can use two browser-based examples to show data stored in the SpaceCurve System. These examples use the ArcGIS REST API, which the ArcGIS Server Adapter translates into native SpaceCurve REST API calls.

### The hexbin Example

To run the hexbin example, enter this URL into the FireFox browser:

`http://localhost/examples/hexbin`

### The webmap Example

To run the webmap example, enter this URL into the FireFox browser:

`http://localhost/examples/webmap`

The `webmap` example shows geographic points in a dataset. You can choose a
table, a field in the table, an operator and a value. Matches on the field will
appear as squares on the map.

**Bounding Box**

This example only shows results within a degree-based extent, which centers on a
single latitude-longtitude point. By default, only points within 5 degrees both
north & south and 5 degrees both east & west of Seattle, Washington will appear.
A rectangle appears around this area. To show a larger area, set a larger
extent. To show a different area, enter a different center point, in
latitude-longtitude coordinates.

**See Cities that Start With S**

Enter these settings to query for cities near Seattle that start with the letter
S.

**Table:** schema.us\_cities

**Field:** NAME

**Operator:** LIKE

**Value:** 'S%'

Hit **Query** to view the results.

Limitations
-----------

This adapter has these limitations:

-   The adapter is only compatible with SpaceCurve tables that use a GeoJSON
    Feature object schema, e.g.

    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    {
    "type" : "Feature",  
    "geometry" : { ... },  
    "properties" : { ... }  
    }
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-   The adapter only implements a subset of the ArcGIS Server REST API. See the
    API reference in the `doc/` tree of this repository.

-   The adapter only transfers JSON and does not support tile exports.


License
---------------------

The ArcGIS Server Adapter for the SpaceCurve System is licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at

<http://www.apache.org/licenses/LICENSE-2.0>

Unless required by applicable law or agreed to in writing, software distributed
under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
CONDITIONS OF ANY KIND, either express or implied. See the License for the
specific language governing permissions and limitations under the License.
