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

L.Util.parseGPX = function(txt){
    var getSegmentPoints = function(xml){
        var points_elements = xml.getElementsByTagName('trkpt');
        var points = [];
        for (var i = 0; i < points_elements.length; i++) {
            var point_element = points_elements[i];
            points.push([
                parseFloat(point_element.getAttribute('lat')), 
                parseFloat(point_element.getAttribute('lon'))]);
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
    return {tracks: getTrackSegments(dom)};
};


L.Control.PrintPages.Tracks = L.Control.extend({
    options: {position: 'topright'},
    
    onAdd: function(map){
        this._map = map;
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
        var fileInput = L.DomUtil.create('input', undefined, document.body);
        fileInput.type = 'file';
        fileInput.style.left = '-100000px';
        
        L.DomEvent.on(openButton, 'click', fileInput.click, fileInput);
        
        L.DomEvent.on(fileInput, 'change', function() {
            var loader = new L.LocalFileLoader();
            loader.on('load', this.onFileLoaded, this);
            loader.load(fileInput.files[0]);
            fileInput.value = '';
        }, this);
        return container;
    },
    
    onFileLoaded: function(file){
        var ext = file.name.split('.').pop().toLower;
            var track_segments = L.Util.parseGPX(file.data).tracks;
        var track_lines = [];
        for (var i=0; i<track_segments.length; i++) {
            track_lines.push(L.polyline(track_segments[i]));
        }
        var trackfile_layer = L.featureGroup(track_lines);
        trackfile_layer.addTo(this._map);
    }
});


