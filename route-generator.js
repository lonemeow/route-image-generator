'use strict';

var TRKPT_DIST_THRESHOLD = 10.0;

var map;
var path_source;
var waypoint_source;

function parseGpxData(xml) {
  var result = {
    segments: [],
    waypoints: []
  };
  $('trkseg', xml).each(function() {
    var this_seg = [];
    $('trkpt', this).each(function() {
      var trkpt = $(this);
      this_seg.push({
        lat: parseFloat(trkpt.attr('lat')),
        lon: parseFloat(trkpt.attr('lon'))
      });
    });
    result.segments.push(this_seg);
  });
  $('wpt', xml).each(function() {
    var wpt = $(this);
    result.waypoints.push({
      lat: wpt.attr('lat'),
      lon: wpt.attr('lon'),
      name: $('name', wpt).text(),
      desc: $('desc', wpt).text()
    });
  });
  return result;
}

function convertPathSegments(segments) {
  return segments.reduce(function(result, segment) {
    result.push(new ol.Feature(segment.reduce(function(line, point) {
      line.appendCoordinate(ol.proj.fromLonLat([ point.lon, point.lat ]));
      return line;
    }, new ol.geom.LineString())));
    return result;
  }, []);
}

$(document).ready(function() {
  var path_source = new ol.source.Vector({
    wrapX: false
  });

  var path_layer = new ol.layer.Vector({
    source: path_source,
    style: new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: '#ff0000',
        width: 2
      })
    })
  });

  map = new ol.Map({
    target: 'map',
    layers: [
      new ol.layer.Tile({
        source: new ol.source.OSM({
          url: 'https://korona.geog.uni-heidelberg.de/tiles/roads/x={x}&y={y}&z={z}'
        })
      }),
      path_layer
    ],
    view: new ol.View({
      center: ol.proj.fromLonLat([0.0, 0.0]),
      zoom: 1
    }),
    controls: ol.control.defaults({
      attributionOptions: {
        collapsible: false
      }
    }),
  });

  $('#save').click(function() {
    map.once('postcompose', function(e) {
      var canvas = e.context.canvas;
      canvas.toBlob(function(blob) {
        saveAs(blob, 'route.png');
      }, 'image/png');
    });
    map.render();
  });

  $('#gpxfile').fileReaderJS({
    readAsDefault: 'Text',
    on: {
      load: function(e, file) {
        var data = parseGpxData($.parseXML(e.target.result));
        path_source.clear();
        path_source.addFeatures(convertPathSegments(data.segments));
        map.getView().fit(path_source.getExtent());
      }
    }
  });
});
