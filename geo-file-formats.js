/* global L */
"use strict";

L.Util.parseGpx = function(txt){
    var getSegmentPoints = function(xml){
        var points_elements = xml.getElementsByTagName('trkpt');
        var points = [];
        for (var i = 0; i < points_elements.length; i++) {
            var point_element = points_elements[i];
            points.push({
                lat: parseFloat(point_element.getAttribute('lat')),
                lng: parseFloat(point_element.getAttribute('lon'))});
        }
        return points;
    };
    
    var getTrackSegments = function(xml) {
        var segments_elements = xml.getElementsByTagName('trkseg');
        var segments = [];
        for (var i = 0; i < segments_elements.length; i++) {
            segments.push(getSegmentPoints(segments_elements[i]));
        }
        return segments;
    };
    
    txt = txt.replace(/<([^ >]+):([^ >]+)/g, '<$1_$2');
    var dom = (new DOMParser()).parseFromString(txt,"text/xml");
    if (dom.documentElement.nodeName == 'parsererror') {
        throw "Not a GPX file";
    }
    return {tracks: getTrackSegments(dom)};
};

L.Util.parseOziPlt = function(txt) {
    var lines = txt.split('\n');
    if (lines[0].indexOf('OziExplorer Track Point File') !== 0) {
        throw "Not an OZI track file";
    }
    var segments = [];
    var current_segment = [];
    for (var i = 6; i < lines.length; i++) {
        var line = lines[i].trim();
        var fields = line.split(',');
        var lat = parseFloat(fields[0]);
        var lon = parseFloat(fields[1]);
        var is_start_of_segment = parseInt(fields[2], 10);
        if (isNaN(lat) || isNaN(lon) || isNaN(is_start_of_segment)) {
            break;
        }
        if (is_start_of_segment) {
            current_segment = [];
        }
        if (!current_segment.length) {
            segments.push(current_segment);
        }
        current_segment.push({lat: lat, lng:lon});
    }
    return {tracks: segments};
};

L.Util.parseTrackFile = function(data, filename) {
        var parsers = {
                'gpx': L.Util.parseGpx,
                'plt': L.Util.parseOziPlt
            };
        var ext = filename.split('.').pop().toLowerCase();
        var track;
        if (ext in parsers) {
            var parser = parsers[ext];
            try {
                return parser(data);
            } catch (e) {
                alert('Could not load file: ' + e);
                return null;
            }
        } else {
            alert('Could not load file, unknown extension');
            return null;
        }
};