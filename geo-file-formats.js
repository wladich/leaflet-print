/* global L */
"use strict";

L.Util.parseGpx = function(txt){
    var getSegmentPoints = function(xml){
        var points_elements = xml.getElementsByTagName('trkpt');
        var points = [];
        for (var i = 0; i < points_elements.length; i++) {
            var point_element = points_elements[i];
            var lat = parseFloat(point_element.getAttribute('lat'));
            var lng = parseFloat(point_element.getAttribute('lon'));
            if (isNaN(lat) || isNaN(lng)) break;
            points.push({lat: lat, lng: lng});
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
    if (dom.getElementsByTagName('gpx').length === 0) {
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

L.Util.parseKml = function(txt) {
    var getSegmentPoints = function(xml){
        var coordinates_string = Array.prototype.slice.call(xml.childNodes)
            .map(function(node) {return node.nodeValue;})
            .join('');
        var points_strings = coordinates_string.split(/\s+/);
        var points = [];
        for (var i = 0; i < points_strings.length; i++) {
            if (points_strings[i].length) {
                var point = points_strings[i].split(',');
                var lat = parseFloat(point[1]);
                var lng = parseFloat(point[0]);
                if (isNaN(lat) || isNaN(lng)) {
                    break;
                }
                points.push({lat: lat, lng: lng});
            }
        }
        return points;
    };
    
    var getTrackSegments = function(xml) {
        var segments_elements = xml.getElementsByTagName('LineString');
        var segments = [];
        for (var i = 0; i < segments_elements.length; i++) {
            var coordinates_element = segments_elements[i].getElementsByTagName('coordinates');
            if (coordinates_element.length > 0) {
                segments.push(getSegmentPoints(coordinates_element[0]));
            }
        }
        return segments;
    };

    txt = txt.replace(/<([^ >]+):([^ >]+)/g, '<$1_$2');
    var dom = (new DOMParser()).parseFromString(txt,"text/xml");
    if (dom.documentElement.nodeName == 'parsererror') {
        throw "Not a KML file";
    }
    if (dom.getElementsByTagName('Document').length === 0) {
        throw "Not a KML file";
    }
    
    return {tracks: getTrackSegments(dom)};
};

L.Util.parseKmz = function(txt) {
    var uncompressed;
    var unzipper = new JSUnzip(txt);
    if (!unzipper.isZipFile()) {
        throw "Not a KMZ file"
    }
    unzipper.readEntries();
    for (var i=0; i < unzipper.entries.length; i++) {
        var entry = unzipper.entries[i];
        if (entry.fileName === 'doc.kml') {
            if (entry.uncompressedSize > 10000000) {
                throw "KML in KMZ is too big";
            }
            if (entry.compressionMethod === 0) {
                uncompressed = entry.data;
            } else if (entry.compressionMethod === 8) {
                uncompressed = RawDeflate.inflate(entry.data);
            } else {
                throw 'Bad zip file';
            }
            return L.Util.parseTrackFile(uncompressed, 'doc.kml');
        }
    }
    throw "Not a KMZ file";
};

L.Util.parseTrackFile = function(data, filename) {
        var parsers = {
                'gpx': L.Util.parseGpx,
                'plt': L.Util.parseOziPlt,
                'kml': L.Util.parseKml,
                'kmz': L.Util.parseKmz
            };
        var ext = filename.split('.').pop().toLowerCase();
        var track;
        if (ext in parsers) {
            var parser = parsers[ext];
            try {
                var geo_data = parser(data);
                if (!geo_data.tracks.length) {
                    alert('File contains no tracks');
                    return null;
                }
                return geo_data;
            } catch (e) {
                alert('Could not load file: ' + e);
                return null;
            }
        } else {
            alert('Could not load file, unknown extension');
            return null;
        }
};