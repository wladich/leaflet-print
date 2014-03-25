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

L.Control.PrintPages.Tracks = L.Control.extend({
    options: {position: 'topright'},
    
    parsers: {
        'gpx': L.Util.parseGpx,
        'plt': L.Util.parseOziPlt
    },

    colors: ['#f00', '#0f0', '#00f', '#f0f', '#0ff'],

    onAdd: function(map){
        this._map = map;
        this._tracks = [];
        var container = L.DomUtil.create('div', 'leaflet-control leaflet-printpages-dialog');
        container.innerHTML = '\
            <table class="form">\
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
        
        this.elements_grid = container.querySelector('table.form');
        return container;
    },
    
    onFileSelected: function() {
        this.addTrackFromFile(this.fileInput.files[0]);
        this.fileInput.value = '';
        },
    
    onDownloadButtonPressed: function() {
        var url = this.url_field.value.trim();
        if (url) {
            this.addTrackFromUrl(url);
        }
        this.url_field.value = '';
    },

    _parseTrackFile: function(file) {
        var ext = file.name.split('.').pop().toLowerCase();
        var track;
        if (ext in this.parsers) {
            var parser = this.parsers[ext];
            try {
                track = parser(file.data).tracks;
            } catch (e) {
                alert('Could not load file: ' + e);
                return null;
            }
        } else {
            alert('Could not load file, unknown extension');
            return null;
        }
        file.geodata = track;
        return file;
    },

    _getNextColor: function() {
        this._color_index = ((this._color_index | 0) + 1) % this.colors.length;
        return this.colors[this._color_index]
    },

    _createPolyline: function(segments, color){
        var track_lines = [];
        for (var i=0; i < segments.length; i++) {
            var segment = segments[i]
                .map(function(p){return {x: p.lng, y: p.lat}});
            var segment_filtered = L.LineUtil.simplify(segment, 0.0002)
                .map(function(p){return {lat: p.y, lng: p.x}});
            //track_lines.push(L.polyline(segments[i], {color: '#f00'}));
            track_lines.push(L.polyline(segment_filtered, {color: color}));
            //console.log(segments[i].length);
            //console.log(segment_filtered.length);
        }
        var trackfile_layer = L.featureGroup(track_lines);
        return trackfile_layer.addTo(this._map);
    },

    _createTrackGridItem: function(track_obj) {
        var el = L.DomUtil.create('tr', '', this.elements_grid);
        el.innerHTML = '\
        <td><input type="checkbox" checked="checked"></td>\
        <td><div class="track-color-selector"></div></td>\
        <td><span class="track-name" title="' + (track_obj.url || track_obj.name) + '">' + track_obj.name + '</span></td>\
        <td><a class="track-delete-button" title="Remove track">X</a></td>';
        var checkbox = el.querySelector('input');
        var delete_button = el.querySelector('a.track-delete-button');
        var color_legend =  el.querySelector('.track-color-selector');
        var track_name = el.querySelector('.track-name');
        
        color_legend.style.backgroundColor = track_obj.color;
        L.DomEvent.on(checkbox, 'click', function(e){
            this.setTrackVisibility(track_obj, e.target.checked);
        }, this);
        L.DomEvent.on(delete_button, 'click', function(){
            this.removeTrack(track_obj);
        }, this);
        L.DomEvent.on(track_name, 'click', function(){
            this.zoomToTrack(track_obj);
        }, this);
        return el;
    },

    zoomToTrack: function(track_obj) {
        this._map.fitBounds(track_obj.polyline.getBounds());
    },

    setTrackVisibility: function(track_obj, visible) {
        console.log(track_obj, visible);
        var isVisible = this._map.hasLayer(track_obj.polyline);
        if (Boolean(isVisible) !== Boolean(visible)) {
            if (visible) {
                this._map.addLayer(track_obj.polyline);
            } else {
                this._map.removeLayer(track_obj.polyline);
            }
        }
    },

    removeTrack: function(track_obj) {
        this._map.removeLayer(track_obj.polyline);
        this.elements_grid.removeChild(track_obj.grid_item);
        var i = this._tracks.indexOf(track_obj);
        this._tracks.splice(i, 1);
    },

    // options: name -- url or filename, retrivable -- if can be downloaded
    createTrackObj: function(segments, options) {
        var track_obj = L.extend({}, options);
        track_obj.color = this._getNextColor();
        track_obj.polyline = this._createPolyline(segments, track_obj.color);
        track_obj.grid_item = this._createTrackGridItem(track_obj);
        this._tracks.push(track_obj);
    },

    addTrackFromUrl: function(url) {
        // TODO: first try direct request, fallback to proxy if CORS not available
        // FIXME: error if https and using proxy and with other schemas
        url = url.replace(/^http:\/\//, 'http://www.corsproxy.com/');
        var _this = this;
        get(url)
            .then(function(xhr) {
                return _this._parseTrackFile({data: xhr.responseText, name: url.split('/').pop()});
            }).done(function(data)
            {
                _this.createTrackObj(data.geodata, {name: data.name, retrivable: true, url: url});
            });
    },

    // file -- js file object as retrievd from file input`s property "files"'
    addTrackFromFile: function(file) {
        readFile(file)
            .then(this._parseTrackFile.bind(this))
            .done(function(data){
                this.createTrackObj(data.geodata, {name: data.name, retrivable: false});
            }.bind(this));
    },

    addTrackFromEncodedString: function(s) {},

//    onFileLoaded: function(file){
//        console.log(this.createPolylinesFromFile(file.name, file.data));
//    }
});


