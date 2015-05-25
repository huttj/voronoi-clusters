(function () {

    var log = function log() {
        var stack;
        try {
            throw new Error();
        } catch (e) {
            stack = e.stack.split('\n')[2].match(/\s+at\s+(.+)/)[1] + ':\n\t';
        }
        var args = Array.prototype.slice.call(arguments);
        args.unshift(stack);
        console.log.apply(console, args);
    };

    //var map, layer;

    // Load data
    $.ajax({
        url: 'data.json',
        type: "get",
        success: decorateMap,
        dataType: "json"
    });

    // the map
    (function drawMap(data){

        map = L.map('map');

        // Use the setView method to set the lat/long and zoom of your map
        // syntax: VARIABLE.setView([LATITUDE, LONGITUDE], ZOOM)
        map.setView([47.6097, -122.3331], 10);

        // Create an OpenStreetMap tile layer variable using their url: 'http://{s}.tile.osm.org/{z}/{x}/{y}.png'
        // syntax: var LAYER_VARIABLE = L.tileLayer('URL')
        //layer = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png').addTo(map);
        layer = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png').addTo(map);

    })();

    function decorateMap(data) {
        var markers = clusterize(data);
        console.log(markers);
        addVoronoi(markers);
    }

    function getPointsFromClusters(markers) {
        points = [];
        forIn(markers._featureGroup._layers, function(cluster) {
            var point = map.latLngToLayerPoint([cluster._latlng.lat, cluster._latlng.lng]);
            points.push({
                point: point,
                latlng: cluster._latlng,
                data: cluster.getAllChildMarkers ? cluster.getAllChildMarkers().map(function(n) { return n.data; }) : cluster.data
            });
        });
        return points;
    }

    function clusterize(data) {
        var markers = new L.MarkerClusterGroup({
            singleMarkerMode: true,
            iconCreateFunction: function(cluster) {
                return new L.DivIcon({ html: cluster.getChildCount() });
            }
        });
        data.forEach(function(point) {
            var marker = new L.Marker([point.latitude, point.longitude]);
            marker.data = point;
            markers.addLayer(marker);
        });
        map.addLayer(markers);
        return markers;
    }

    function addVoronoi(sourceData) {

        var pointCount, data, biggestVisibleCluster, bounds;

        map.on("zoomstart", clear);
        map.on("dragend", dragend);
        sourceData.on('animationend', update);

        // オーバーレイレイヤ追加
        map._initPathRoot();
        var svg = d3.select("#map").select("svg");
        var g = svg.append("g").attr("class", "leaflet-zoom-hide");

        //ボロノイジェネレーター
        var voronoi = d3.geom.voronoi()
            .x(function(d) { return d.x; })
            .y(function(d) { return d.y; });

        update();

        function update(e) {
            clear();
            getPoints();
            redraw();
        }

        function dragend() {
            getPoints();
            redraw();
        }

        function clear() {
            svg.selectAll(".volonoi").remove();
        }

        function getPoints() {

            // For manually clustered data
            data = getPointsFromClusters(sourceData);

            pointCount = data.length;

            positions = data.map(function(d) {
                return d.point;
            });

            bounds = map.getBounds();

            biggestVisibleCluster = data.reduce(function(last, next) {
                var isVisible = bounds.contains(next.latlng);
                if (isVisible) {
                    last = Math.max(last, next.data.length || 1);
                }
                //log(last);
                return last;
            }, 1);
        }

        function redraw() {

            // ボロノイ変換関数
            // Voronoi conversion function
            var polygons = voronoi(positions);

            polygons.forEach(function(v) { v.cell = v; });

            svg.selectAll(".volonoi").remove();

            // Add path element
            svg.selectAll("path")
                .data(polygons)
                .enter()
                .append("svg:path")
                .attr("class", "volonoi")
                .attr({
                    "d": function (d) {
                        if (!d) return null;
                        return "M" + d.cell.join("L") + "Z";
                    },
                    stroke: "rgba(255,255,255,.33)",
                    fill: getFill
                });
        }

        function getFill(d) {
            if (!d) return 'none';

            for (var i = 0; i < data.length; i++) {
                if (data[i].point.x === d.point.x && data[i].point.y === d.point.y) {
                    var n = data[i].data.length || 1;
                    var tenth = biggestVisibleCluster / 10;
                    var centile = Math.ceil(n / tenth);
                    var c = Math.round(55 + (20 * centile));
                    return 'rgba(' + c + ', 0, 0, .25)';
                }
            }
            return 'none';
        }

    }

    function forIn(obj, fn) {
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                fn(obj[key]);
            }
        }
    }
}

)();