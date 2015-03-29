
QuickStart for SpaceCurve Virtual Machine on Azure
==================================================

The SpaceCurve QuickStart Virtual Machine on Azure lets you try an installation of the
SpaceCurve System on the Windows Azure cloud. You can load sample data, use the SpaceCurve SQL shell to
query data, and use browser-based example applications to query geographic data
and view results on an interactive world map.

The SpaceCurve System is a distributed and parallel geospatial data and
analytics platform. This example implementation runs a Master process, a Front
process, and two Worker processes on a single computer. SpaceCurve installations
can reach petabyte scales by adding both processes and computers to meet
increasing throughput demands.

Follow the instructions in this document to set up the QuickStart VM and sample
data.

Copyright
---------

By accessing the SpaceCurve QuickStart VM you indicate your agreement to the
conditions of use specified in the `COPYRIGHT.txt` file and in the EULA
agreement you agreed to before downloading this software.

Other Resources
---------------

The QuickStart download includes full software
documentation and release notes. The software documentation includes detailed
information about the SpaceCurve System, including its query language.

Boot the Virtual Machine
------------------------

Within the downloaded archive you will find a VMware Virtual Machine Disk Image
File (file extension `.vmwarevm`). Follow these steps to start the virtual
machine:

1.  Open this file in a compatible VMware player using the **File \> Open**
    menu.

    **Note:** The SpaceCurve Quickstart VM is a 64-bit operating system.
    VMware software might require changes to the BIOS/firmware settings
    of your computer to support this VM. If changes are necessary, VMware
    software will present steps you can follow to change the BIOS/firmware settings.

2.  Press the **Play** button to boot the VM.

Log In
------

The VM will boot and arrive at the login screen of this CentOS 6 installation.
Log in to the **spacecurve** account using the password *spacecurve*.

Add Sample Data
---------------

Follow these three steps to load any dataset into SpaceCurve:

1.  Transform the dataset to GeoJSON using GDAL.

2.  Run the schema discovery script to create a DDL for the dataset.

3.  Upload the dataset to SpaceCurve using an HTTP client such as cURL.

The virtual machine contains three sample datasets in both CSV and Shapefile
formats. Follow instructions in the following sub-sections to load sample data
into the SpaceCurve System.

### Open a Terminal Window

Double-click the Terminal icon at the top-center of the desktop, next to the Firefox
icon. You will use this terminal window to load sample data into the SpaceCurve
System, and to use the SpaceCurve SQL shell.

### Add Census Data

In the terminal window, enter these commands to load the census dataset into the
SpaceCurve System database:

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
$ cd ~/VM/datasets/census
$ sh scripts/1_transform.sh
$ sh scripts/2_schema.sh > /dev/null # Runs a min+ w/ no output
$ sh scripts/3_load.sh               # Runs a min or more
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

You can test this dataset by entering a query in the SpaceCurve SQL shell.

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
$ scctl shell -n ArcGIS      # runs the SpaceCurve SQL shell
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Enter this query in the SpaceCurve SQL shell to show all cities within 9
kilometers of Seattle:

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
SELECT * FROM schema.us_cities WHERE "geometry".ST_Distance(ST_Point(-122.3, 47.6)) <= 9000.0;
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

A result set of JSON data appears. This data desribes the cities around (and
including) Seattle. These include Bellevue, Mercer Island, and others.

Type `q` to exit the data view in the shell, and type `\q` to exit the shell
application.

### Add Earthquake Data

In the terminal window, enter these commands to load the earthquake dataset into
the SpaceCurve System database:

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
$ cd ~/VM/datasets/earthquakes
$ sh scripts/1_transform.sh
$ sh scripts/2_schema.sh > /dev/null # Runs a min+ w/ no output
$ sh scripts/3_load.sh         
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

You can test this dataset by entering a query in the SpaceCurve SQL shell.

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
$ scctl shell -n ArcGIS      # runs the SpaceCurve SQL shell
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Enter this query in the SpaceCurve SQL shell to show all earthquakes within 50
kilometers of Seattle:

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
SELECT * FROM schema.earthquakes WHERE "geometry".ST_Distance(ST_Point(-122.3, 47.6)) <= 30000.0;
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

A result set of JSON data appears. This data describes the earthquakes that
occured within 30 kilometers of Seattle.

Type `q` to exit the data view in the shell, and type `\q` to exit the shell
application.

### Add Zipcode Data

In the terminal window, enter these commands to load the zipcode dataset into
the SpaceCurve System database:

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
$ cd ~/VM/datasets/zipcodes
$ sh scripts/1_transform.sh
$ sh scripts/2_schema.sh > /dev/null # Runs a min+ w/ no output
$ sh scripts/3_load.sh         
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

You can test this dataset by entering a query in the SpaceCurve SQL shell.

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
$ scctl shell -n ArcGIS      # runs the SpaceCurve SQL shell
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Enter this query in the SpaceCurve SQL shell to show all zipcodes within 50
kilometers of Seattle:

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
SELECT * FROM schema.zipcodes WHERE "geometry".ST_Distance(ST_Point(-122.3, 47.6)) <= 2000.0;
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

A result set of JSON data appears. This data describes the zipcodes located
within 2 kilometers of Seattle.

Type `q` to exit the data view in the shell, and type `\q` to exit the shell
application.

### Use the Scripts with Your Data

You can use the three scripts to prepare and load your data into the SpaceCurve
System. Look at the script code to understand more about the data preparation
and load process. Be sure to examine the generated DDL (in the `.sql` file)
which is produced by the SchemaDiscovery tool in the **2\_schema.sh** script.
You can modify the schema in the `.sql` file before loading the data into the
SpaceCurve System using the **3\_load.sh** script.

Start Over
----------

You might wish to reset this installation of the SpaceCurve System. The simplest
way to start over form scratch is to shutdown SpaceCurve, erase its resources
(log files, volume files), and reinitialize the server. These scripts perform
these tasks.

**Note:** If you follow these steps to reset the installation, **you will need
to re-install sample data** by following the steps shown above.

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
$ cd ~/VM
$ scctl stop
$ sh scripts/cleanup.sh 
$ scctl start
$ sh scripts/init.sh 
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Next Steps
----------

Now that you have a running installation of the SpaceCurve System that includes
sample data, follow the instructions in these two pages:
 -  [ArcGIS Server Adapter for the
SpaceCurve System][1] to install and use example applications that call the ArcGIS API.
 - [Cesium with Data Streaming][2] to install and use an example application with Cesium.




[1]: <README.md>
[2]: <https://github.com/SpaceCurve/cesium/blob/master/README.md>
