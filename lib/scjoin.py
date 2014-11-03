#!/usr/bin/env python2
"""@file scjoin.py

@author Brett L Kleinschmidt <brett@spacecurve.com>
"""
import re
import os
import sys
import time
import json
import multiprocessing

from urllib import quote, urlencode
from urllib2 import Request, urlopen, HTTPError, URLError
from httplib import BadStatusLine
from contextlib import closing

from optparse import OptionParser

def to_wkt(geometry):
    geometry_type = geometry.get('type')
    geometry_data = geometry.get('coordinates')
    coord_string = ''
    coord_lambda = lambda coord: '%f %f' % tuple(coord)
    linear_lambda = lambda ring: '%s' % ', '.join(map(coord_lambda, ring))
    if geometry_type == 'Point':
        coord_string = coord_lambda(geometry_data)
    elif geometry_type == 'LineString':
        coord_string = linear_lambda(geometry_data)
    elif geometry_type == 'Polygon':
        coord_string = '(' + ', '.join(map(linear_lambda, geometry_data)) + ')'
    else:
        raise(TypeError)
    return '\'%s (%s)\'' % (geometry_type.upper(), coord_string)

def do_query(server, instance, sql, callback=None, headers={}):
    req = Request('http://%s/%s/%s' % (server, instance, quote(sql, safe='')), headers=headers)
    bgn = time.time()
    try:
        with closing(urlopen(req)) as rep:
            return callback(rep) if callback else list(rep)
    except HTTPError as e:                  # non-fatal errors (syntax, etc.)
        print e.read(), sql
    except (URLError, BadStatusLine) as e:  # fatal errors
        raise

class QueryFormatter(object):
    def __init__(self, query_pattern):
        self.format_string = self.get_format(query_pattern)
        self.keys = self.get_keys(query_pattern)
    def parse(self, obj):
        values = (self.literal_cast(self.get_values(obj, key)) for key in self.keys)
        return self.format_string % tuple(values)
    def get_values(self, obj, key):
        x = obj
        for k in key.split('.'): x = x[k]
        return x
    def get_keys(self, s):
        return tuple(s.translate(None, '%{}') for s in re.findall('%{.*?}', s))
    def get_format(self, s):
        return re.sub('%{.*?}', '%s', s)
    def literal_cast(self, x):
        if type(x) == type(dict()) and all(k in x for k in ('type', 'coordinates')):
            return to_wkt(x)
        else:
            return str(x)

class Query(object):
    def __init__(self, server, instance, query_pattern, headers):
        self.server = server
        self.headers = headers
        self.instance = instance
        self.formatter = QueryFormatter(query_pattern)
    def __call__(self, line):
        self.line = line
        (row_header, user_data) = json.loads(self.line)
        query = self.formatter.parse(user_data)
        return do_query(self.server, self.instance, query, self.callback, self.headers)
    def callback(self, rep):
        return [self.line] + list(rep)

class SCJoin(object):
    def __init__(self, server, instance, left_query, right_query, jobs, spatial_reference, **kwargs):
        self.server = server
        self.instance = instance
        self.left_query = left_query
        self.right_query = right_query
        self.headers = {'SCDB-SpatialReference' : spatial_reference} if spatial_reference else {}
        self.pool = multiprocessing.Pool(jobs)
    def main(self, args=sys.argv[1:]):
        query = Query(self.server, self.instance, self.right_query, self.headers)
        query_callback = lambda rep: self.pool.map(query, rep)
        map(lambda x: map(lambda y: sys.stdout.write(str(y)), x),
                do_query(self.server, self.instance, self.left_query, query_callback, self.headers))

if __name__ == '__main__':
    parser = OptionParser()
    parser.add_option('-s', '--server', action='store', default='127.0.0.1:8080')
    parser.add_option('-j', '--jobs', action='store', type='int', default=16)
    parser.add_option('-t', '--spatial_reference', action='store', default='')
    parser.add_option('-n', '--instance', action='store')
    parser.add_option('-l', '--left_query', action='store')
    parser.add_option('-r', '--right_query', action='store')
    opts = parser.parse_args()
    sys.exit(SCJoin(**vars(opts[0])).main())
