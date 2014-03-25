"use strict";

L.LocalFileLoader = L.Class.extend({
    includes: L.Mixin.Events,
    
    load: function (file) {
         var reader = new FileReader();
         reader.onload = function (e) {
             this.fire('load', {name: file.name, data: e.target.result, isLocal: true});
         }.bind(this);
         reader.readAsText(file);
         return reader;    
    }
});

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
    }
    
    txt = txt.replace(/<([^ >]+):([^ >]+)/g, '<$1_$2');
    var dom = (new DOMParser()).parseFromString(txt,"text/xml");
    if (dom.documentElement.nodeName == 'parsererror') {
        throw "Not a GPX file";
    }
    return {tracks: getTrackSegments(dom)};
};

L.Util.parseOziPlt = function(txt) {
    var lines = txt.split('\n');
    if (lines[0].indexOf('OziExplorer Track Point File') != 0) {
        throw "Not an OZI track file";
    };
    var segments = [];
    var current_segment = [];
    for (var i = 6; i < lines.length; i++) {
        var line = lines[i].trim();
        var fields = line.split(',');
        var lat = parseFloat(fields[0]);
        var lon = parseFloat(fields[1]);
        var is_start_of_segment = parseInt(fields[2]);
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

L.Control.PrintPages.Tracks = L.Control.extend({
    options: {position: 'topright'},
    
    parsers: {
        'gpx': L.Util.parseGpx,
        'plt': L.Util.parseOziPlt
    },

    onAdd: function(map){
        this._map = map;
        var container = L.DomUtil.create('div', 'leaflet-control leaflet-printpages-dialog');
        container.innerHTML = '\
            <table class="form" class="print-page-tracks-items">\
                <tr>\
                    <td colspan="4">\
                        <a class="print-page-button print-page-open-file" title="Open file"></a>\
                        <a class="print-page-button print-page-download-file" title="Download URL"></a>\
                        <input type="text" class="print-page-url-field" size="10" placeholder="Track URL">\
                    </td>\
                </tr>\
            </table>\
         ';

        L.DomEvent.disableClickPropagation(container);

        var openButton = container.querySelector('.print-page-open-file');
        this.fileInput = L.DomUtil.create('input', undefined, document.body);
        this.fileInput.type = 'file';
        this.fileInput.style.left = '-100000px';
        L.DomEvent.on(openButton, 'click', this.fileInput.click, this.fileInput);
        L.DomEvent.on(this.fileInput, 'change', this.onFileSelected, this);

        var download_button = container.querySelector('.print-page-download-file');
        this.url_field = container.querySelector('input.print-page-url-field');
        L.DomEvent.on(download_button, 'click', this.onDownloadButtonPressed, this);
        
        this.elements_container = container.querySelector('table.print-page-tracks-items')
        return container;
    },
    
    onFileSelected: function() {
        this.addTrackItemFromFile(this.fileInput.files[0]);
        this.fileInput.value = '';
        },
    
    onDownloadButtonPressed: function() {
        var url = this.url_field.value.trim();
        if (url) {
            this.addTrackItemFromUrl(url);
        }
    },

    createPolylinesFromFile: function(filename, txt) {
        var ext = filename.split('.').pop().toLowerCase();
        if (ext in this.parsers) {
            var parser = this.parsers[ext];
            try {
                var track_segments = parser(txt).tracks;
            } catch (e) {
                alert('Could not load file: ' + e);
                return false;
            }
        } else {
            alert('Could not load file, unknown extension');
            return false;
        }
        var track_lines = [];
        for (var i=0; i<track_segments.length; i++) {
            var segment = track_segments[i]
                .map(function(p){return {x: p.lng, y: p.lat}});
            var segment_filtered = L.LineUtil.simplify(segment, 0.0002)
                .map(function(p){return {lat: p.y, lng: p.x}});
            track_lines.push(L.polyline(track_segments[i], {color: '#f00'}));
            track_lines.push(L.polyline(segment_filtered));
            console.log(track_segments[i].length);
            console.log(segment_filtered.length);
        }
        var trackfile_layer = L.featureGroup(track_lines);
        return trackfile_layer.addTo(this._map);
    },

    // options: url -- url or filename, retrivable -- if can be downloaded
    _createPolyline: function(segment, color){
        var track_lines = [];
        for (var i=0; isegments.length; i++) {
            var segment = track_segments[i]
                .map(function(p){return {x: p.lng, y: p.lat}});
            var segment_filtered = L.LineUtil.simplify(segment, 0.0002)
                .map(function(p){return {lat: p.y, lng: p.x}});
            track_lines.push(L.polyline(track_segments[i], {color: '#f00'}));
            track_lines.push(L.polyline(segment_filtered));
            console.log(track_segments[i].length);
            console.log(segment_filtered.length);
        }
        var trackfile_layer = L.featureGroup(track_lines);
        return trackfile_layer.addTo(this._map);
    },

    _addTrackItem: function(segments, options) {
        var polyline = this._createPolyline(segments)
    },

    addTrackItemFromUrl: function(url) {
        // TODO: first try direct request, fallback to proxy if CORS not available
        // FIXME: error if https and using proxy and with other schemas
        url = url.replace(/^http:\/\//, 'http://www.corsproxy.com/');
        get(url)
            .then(function(xhr) {
                this.onFileLoaded({
                    data: xhr.responseText,
                    name: url.split('/').pop()
                })
            }.bind(this))
    },

    // file -- js file object as retrievd from file input`s property "files"'
    addTrackItemFromFile: function(file) {
        var loader = new L.LocalFileLoader();
        loader.on('load', this.onFileLoaded, this);
        loader.load(file);
        this.fileInput.value = '';
    },

    addTrackItemFromEncodedString: function(s) {},

    onFileLoaded: function(file){
        console.log(this.createPolylinesFromFile(file.name, file.data));
    }
});
