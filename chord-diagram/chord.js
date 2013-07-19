/*
 * for commented source please see readme.md
 */

var width = 960,
    height = 750,
    innerRadius = Math.min(width, height) * .41,
    outerRadius = innerRadius * 1.1;

var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height)
  .append("g")
    .attr("transform", "translate("+width/2+","+height/2+")");

d3.tsv('flugverbindungen.csv', function(err, data) {
    var matrix = [],  // <-- hierhin sollen die Daten
        countries = d3.keys(data[0]).slice(1);

    data.forEach(function(row) {
        var mrow = [];
        countries.forEach(function(c) {
            mrow.push(Number(row[c]));
        });
        matrix.push(mrow);
    });

    var chord = d3.layout.chord()
        .matrix(matrix)
        .padding(0.05)
        .sortSubgroups(d3.descending);

    var fill = d3.scale.category10();

    var g = svg.selectAll("g.group")
        .data(chord.groups)
      .enter().append("svg:g")
        .attr("class", "group");

   var arc = d3.svg.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);

    g.append("path")
        .attr("d", arc)
        .style("fill", function(d) { return fill(d.index); })
        .style("stroke", function(d) { return fill(d.index); })
        .attr("id", function(d, i) { return "group-" + d.index });;

    g.append("svg:text")
        .attr("x", 6)
        .attr("class", "country")
        .attr("dy", 15)
      .append("svg:textPath")
        .attr("xlink:href", function(d) { return "#group-" + d.index; })
        .text(function(d) { return countries[d.index]; });

    function groupTicks(d) {
      var k = (d.endAngle - d.startAngle) / d.value;
      return d3.range(0, d.value, 1000000).map(function(v, i) {
        return {
          angle: v * k + d.startAngle,
          label: i % 5 != 0 ? null : v / 1000000 + "m"
        };
      });
    }

    var ticks = g.selectAll("g")
        .data(groupTicks)
      .enter().append("g")
        .attr("transform", function(d) {
          return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")"
              + "translate(" + outerRadius + ",0)";
        });

    ticks.append("line")
        .attr("x1", 1)
        .attr("y1", 0)
        .attr("x2", 5)
        .attr("y2", 0)
        .style("stroke", "#000");

    ticks.append("text")
        .attr("x", 8)
        .attr("dy", ".35em")
        .attr("transform", function(d) {
            // Beschriftung drehen wenn Kreiswinkel > 180°
            return d.angle > Math.PI ?
                "rotate(180)translate(-16)" : null;
        })
        .style("text-anchor", function(d) {
            return d.angle > Math.PI ? "end" : null;
        })
        .text(function(d) { return d.label; });

    function chordColor(d) {
        return fill(d.source.value > d.target.value ?
            d.source.index : d.target.index);
    }

    svg.append("g")
        .attr("class", "chord")
      .selectAll("path")
        .data(chord.chords)
      .enter().append("path")
        .attr("d", d3.svg.chord().radius(innerRadius))
        .style("fill", chordColor)
        .style("opacity", 1);

    function fade(opacity) {
        return function(g, i) {
            svg.selectAll(".chord path")
               .filter(function(d) {
                    return d.source.index != i &&
                           d.target.index != i;
                })
               .transition()
               .style("opacity", opacity);
        };
    }
    g.on("mouseover", fade(0.1))
     .on("mouseout", fade(1));
});
