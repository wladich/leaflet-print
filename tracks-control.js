/* global L */
"use strict";

L.Control.TrackList = L.Control.extend({
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
                        <div class="download-pane">\
                            <input type="text" class="print-page-url-field" placeholder="Track URL">\
                            <a class="print-page-button print-page-download-file" title="Download URL"></a>\
                        </div>\
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
    
    getTracks: function() {
        return this._tracks;
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

    addTrackFromFileData: function(name, url, text) {
        var geo_data = L.Util.parseTrackFile(text, name);
        var color = this.getNextColor();
        if (geo_data.tracks) {
            var track = new L.Control.TrackList.Track(geo_data.tracks, this._map, color);
            var list_item = new L.Control.TrackList.ListItem(this.elements_grid, name, url, color);
            this._tracks.push(track);
            list_item.on('visibilitychanged', function(e){track.setVisibility(e.visible);});
            list_item.on('remove', function(){this.removeTrack(track, list_item);}, this);
            list_item.on('focus', track.focusMap, track);
        }
    },


    getNextColor: function() {
        this._color_index = ((this._color_index | 0) + 1) % this.colors.length;
        return this.colors[this._color_index];
    },

    
    removeTrack: function(track, list_item) {
        track.remove();
        this.elements_grid.removeChild(list_item.getElement());
        var i = this._tracks.indexOf(track);
        this._tracks.splice(i, 1);
    },


    addTrackFromUrl: function(url) {
        // TODO: first try direct request, fallback to proxy if CORS not available
        // FIXME: error if https and using proxy and with other schemas
        url = url.replace(/^http:\/\//, 'http://www.corsproxy.com/');
        var name = url.split('/').pop();
        var _this = this;
        get(url).done(function(xhr){
            var data = xhr.responseText;
            _this.addTrackFromFileData(name, url, data);
        });
    },

    // file -- js file object as retrievd from file input`s property "files"'
    addTrackFromFile: function(file) {
        var _this = this;
        readFile(file).done(
                function(resp){
                    _this.addTrackFromFileData(resp.name, null, resp.data);
                }.bind(this));
    },

    addTrackFromEncodedString: function(s) {},

//    onFileLoaded: function(file){
//        console.log(this.createPolylinesFromFile(file.name, file.data));
//    }
});


L.Control.TrackList.ListItem = L.Class.extend({
    includes: L.Mixin.Events,

    initialize: function(parent, name, url, color) {
        var el = this.element = L.DomUtil.create('tr', '', parent);
        el.innerHTML = '\
            <td><input type="checkbox" checked="checked"></td>\
            <td><div class="track-color-selector"></div></td>\
            <td><span class="track-name" title="' + (url || name) + '">' + name + '</span></td>\
            <td><a class="track-delete-button" title="Remove track">X</a></td>';
        this.visibility_checkbox = el.querySelector('input');
        this.color_legend =  el.querySelector('.track-color-selector');
        var delete_button = el.querySelector('a.track-delete-button');
        var track_name = el.querySelector('.track-name');
        this.setColor(color);

        L.DomEvent.on(this.visibility_checkbox, 'click', this.onVisibilityCheckboxClicked, this);
        L.DomEvent.on(delete_button, 'click', this.onRemoveButtonClicked, this);
        L.DomEvent.on(track_name, 'click', this.onNameClicked, this);
        return el;
    },

    onVisibilityCheckboxClicked: function() {
        this.visible = this.visibility_checkbox.checked;
        this.fire('visibilitychanged', {visible: this.visible});
    },

    onRemoveButtonClicked: function() {
        this.fire('remove');
    },

    onNameClicked: function() {
        this.fire('focus');
    },

    setColor: function(color) {
        this.color_legend.style.backgroundColor = color;
    },

    setVisibility: function(visible) {
        visible = !!visible;
        var was_visible = !!this.visible;
        if (was_visible !== visible) {
            this.visibility_checkbox.checked = visible;
        }
        this.visible = visible;
    },

    getElement: function() {
        return this.element;
    }
});

L.Control.TrackList.Track = L.Class.extend({
    includes: L.Mixin.Events,

    initialize: function(segments, map, color) {
        this.segments = segments.map(this._simplifySegment);
        this._map = map;
        this.polylines = this.segments.map(
            function(l) {
                return L.polyline(l, {color: color});
            });
        this.feature = L.featureGroup(this.polylines);
        this.setVisibility(true);
        this.color = color;
    },

    _simplifySegment: function(segment) {
        var segment_filtered;

        function latlngToXy(p) {
            return  {x: p.lng, y: p.lat};
        }
        function xyToLatlng(p) {
            return  {lat: p.y, lng: p.x};
        }
        segment = segment.map(latlngToXy);
        segment = L.LineUtil.simplify(segment, 0.0002).
        segment = segment.map(xyToLatlng);
        return segment;
    },

    setVisibility: function (visible) {
        var was_visible = !!this.visible;
        visible = !!visible;
        if (was_visible !== visible) {
            if (visible) {
                this._map.addLayer(this.feature);
            } else {
                this._map.removeLayer(this.feature);
            }
        }
        this.visible = visible;
    },

    remove: function() {
        this._map.removeLayer(this.feature);
    },

    setColor: function(color) {
        if (color !== this.color) {
            this.color = color;
            this.polylines.forEach(
                function(polyline) {
                    polyline.setStyle({color: color});
                });
        }
    },

    focusMap: function() {
        this._map.fitBounds(this.feature.getBounds());
    }
});
