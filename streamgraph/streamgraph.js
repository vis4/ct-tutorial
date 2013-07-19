var width = 960,
    height = 500;
var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);
d3.tsv('energymix.tsv', function(err, data) {
    var keys = d3.keys(data[0]).slice(1),
        layers = [];
    keys.forEach(function(key) {
        var layer = [];
        layers.push(layer);
        data.forEach(function(row) {
            layer.push({
                x: new Date(Number(row.Jahr), 0, 1),
                y: Number(row[key])
            });
        });
    });
    var stack = d3.layout.stack().offset("wiggle");
    layers = stack(layers);
    var x = d3.time.scale()
        .domain([layers[0][0].x, layers[0][data.length-1].x])
        .range([20, width]);
    var y = d3.scale.linear()
        .domain([0, d3.max(layers, function(layer) {
            return d3.max(layer, function(d) {
                return d.y0 + d.y;
            });
        })]).range([height-30, 0]);
    var area = d3.svg.area()
        .x(function(d) { return x(d.x); })
        .y0(function(d) { return y(d.y0); })
        .y1(function(d) { return y(d.y0 + d.y); })
        .interpolate('basis');
    svg.selectAll("path")
        .data(layers)
      .enter().append("path")
        .attr("d", area)
        .attr("class", function(d, i) { return keys[i]; });
    var labels = [
        { text: 'Steinkohle', x: 50, y: 315, size: 24 },
        { text: 'Braunkohle', x: 150, y: 410, size: 24 },
        { text: 'Mineralöl', x: 280, y: 230, size: 24 },
        { text: 'Erdgas', x: 580, y: 130, size: 20 },
        { text: 'Kernenergie', x: 670, y: 60, size: 18 },
        { text: 'Erneuerbare', x: 880, y: 35, size: 13 }
    ];
    svg.selectAll("text")
         .data(labels)
       .enter().append("text")
         .attr('x', function(d) { return d.x; })
         .attr('y', function(d) { return d.y; })
         .attr('class', function(d) { return 'label '+d.text; })
         .attr('style', function(d) { return 'font-size:'+d.size+'px'; })
         .text(function(d) { return d.text; });
    var xAxis = d3.svg.axis().scale(x);
    svg.append('svg:g')
        .attr('class', 'axis')
        .attr('transform', 'translate(0, '+(height-20)+')')
        .call(xAxis);
});
