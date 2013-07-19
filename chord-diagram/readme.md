XHTML Header: <script> $('pre').each(function() { var p = $(this); var id = p.prevAll('h5[id*="."],h4[id*="."],h3[id*="."],h2[id*="."],h1[id*="."]').attr('id'); id = id.split('.'); if (id.length > 1) p.addClass(id[1]); </script>

# Chord-Diagrams mit D3.js [chord.js]

Im zweiten Beispiel gucken wir uns einen Datensatz zu Fluggastverbindungen zwischen ausgewählten europäischen Ländern an. Diese Form von Daten wird als Graph bezeichnet: die Knoten sind die Länder und die Kanten zwischen den Ländern repräsentieren die Anzahl der Flugverbindungen. In diesem Fall sind die Kanten gerichtet und gewichtet.

Die Daten liegen in einer Tabelle vor, die die sog. [Adjazenzmatrix](https://de.wikipedia.org/wiki/Adjazenzmatrix) des Graphen enthält. Es gibt genau so viele Zeilen und Spalten wie es Länder gibt. Der Wert in der ersten Spalte der ersten Zeile enthält die Anzahl der innerdeutschen Flüge. Die zweite Spalte der ersten Zeile enthält die Anzahl der Flüge von deutschen zu französischen Flughäfen. Die erste Spalte der zweiten Zeile enthält die Anzahl der Flüge von Frankreich nach Deutschland. Da viele Flugreisenden im Anschluß an ihre Reise wieder in das Ursprungsland zurückfliegen, sind die. Im Fall von Deutschland und Frankreich sehen wir allerdings einen Überschuß von 600.000 Fluggästen aus Frankreich.

 |Deutschland|Frankreich|Großbritannien|Belgien
---|-------:|-------:|------:|-----:
**Deutschland**|23190096|3367759|5831566|690766
**Frankreich**|3952342|27070454|4783285|864660
**Großbritannien**|5520176|4241134|17832245|526376
**Belgien**|692005|611712|513185|15619

Diese Daten wollen wir nun mit D3.js in einem Chord-Diagram visualisieren.

Chord-Diagrams eignen sich besonders zur Visualisierung von gerichteten und gewichteter Graphen. Der Name kommt vom englischen Wort *chord* für Kreissehne, also eine Linie die zwei Punkte in einem Kreis verbinden.

Wir beginnen damit, die Breite und Höhe der Grafik festzulegen. Für die Länder-Bogen benötigen wir einen inneren und äußeren Radius, den wir so berechnen, dass der Kreis und die Beschriftungen gut in die Darstellung passt. Dann erzeugen wir ein neues SVG-Dokument und verschieben den Achsenursprung mit ``transform`` in die Mitte der Grafik.

    var width = 960,
        height = 750,
        innerRadius = Math.min(width, height) * .41,
        outerRadius = innerRadius * 1.1;

    var svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height)
      .append("g")
        .attr("transform", "translate("+width/2+","+height/2+")");


Wieder benutzen wir ``d3.tsv``, um die Tabelle einzulesen, und bringen die Daten zunächst in das benötigte Format: ein verschachteltes Array. Die Spaltenüberschriften sichern wir in der Variable ``countries``, wobei wir mittels ``slice(1)`` die erste Spalte auslassen. Anschließend laufen wir mit ``forEach`` einmal komplett über alle Zeilen der Tabelle. Für jede Zeile speichern wir die Werte für alle Ländern in dem Array ``mrow``, das wir dann an die Liste ``matrix`` hängen.


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

Nun können wir mittels ``d3.layout.chord()`` eine Funktion zur Berechnung des Diagramm-Layouts erzeugen, der wir die Matrix übergeben. Mit ``padding(0.05)`` setzen wir den Abstand zwischen den Ländern auf 5% des Kreisumfangs; mit ``sortSubgroups`` legen wir fest das Untergruppen absteigend sortiert werden sollen.

        var chord = d3.layout.chord()
            .matrix(matrix)
            .padding(0.05)
            .sortSubgroups(d3.descending);

        var fill = d3.scale.category10();


##### Länderbogen

Zunächst möchten wir für jedes Land einen beschrifteten Kreisbogen darstellen, ähnlich wie in einem ausgeschnitteten Tortendiagramm. Wir verknüpfen die Auswahl mit den Ländern (``data(chord.groups)``) und erzeugen für jedes Land (``enter()``) eine neue SVG-Gruppe (``append("svg:g")``). Wir geben der Gruppe die Klasse "group", damit wir sie beim aktualisieren der Darstellung wiederfinden.

        var g = svg.selectAll("g.group")
            .data(chord.groups)
          .enter().append("svg:g")
            .attr("class", "group");

Nun hängen wir in jede dieser Gruppen einen Kreisbogen, den uns die praktische Hilfsfunktion ``d3.svg.arc()`` erzeugt. Wir übergeben lediglich die inneren und äußeren Radii.

        var arc = d3.svg.arc()
            .innerRadius(innerRadius)
            .outerRadius(outerRadius);

        g.append("path")
            .attr("d", arc)
            .style("fill", function(d) { return fill(d.index); })
            .style("stroke", function(d) { return fill(d.index); })
            .attr("id", function(d, i) { return "group-" + d.index });;

Sowie den Namen des Landes.

        g.append("svg:text")
            .attr("x", 6)
            .attr("class", "country")
            .attr("dy", 15)

          .append("svg:textPath")
            .attr("xlink:href", function(d) { return "#group-" + d.index; })
            .text(function(d) { return countries[d.index]; });


![](step1.png)

##### Auch radiale Achsen gehören beschriftet

Um dem Betrachter das Ablesen von Werten zu erleichtern, beschriften wir die Kreisbogen mit einer radialen Wertachse. Zur Erzeugung der Beschriftungen schreiben wir die Hilfsfunktion ``groupTicks``.  ``d3.range()`` erzeugt uns eine Liste von Werten (Ticks) im Abstand von 1 Mio im Bereich zwischen 0 und dem Gesamtwert der Gruppe (``d.value``). Mit der Funktion ``map()`` wandeln wir die Werte in Objekte mit den Eigenschaften ``angle`` (für den Kreiswinkel) und ``label`` (für die Beschriftung). Für jeden nicht durch fünf teilbaren Wert (``i%5``) setzen wir die Beschriftung auf ``null``.

        function groupTicks(d) {
          var k = (d.endAngle - d.startAngle) / d.value;
          return d3.range(0, d.value, 1000000).map(function(v, i) {
            return {
              angle: v * k + d.startAngle,
              label: i % 5 != 0 ? null : v / 1000000 + "m"
            };
          });
        }

Für jeden dieser "Ticks" erzeugen wir eine SVG-Gruppe, die wir sogleich mit den Transformationen *rotate* und *translate* an den äußeren Radius verschieben und im den Kreis drehen.

        var ticks = g.selectAll("g")
            .data(groupTicks)
          .enter().append("g")
            .attr("transform", function(d) {
              return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")"
                  + "translate(" + outerRadius + ",0)";
            });

In jeder dieser Gruppe erzeugen wir nun eine fünf Pixel lange Linie und ein SVG-Text Element für die Beschriftung. Da die Gruppe bereits gedreht wurde, brauchen wir die Rotation hier nicht mehr berücksichtigen. Mit den SVG-Transformationen *rotate* und *translate* drehen wir die Beschriftungen auf der rechten Kreishälfte, damit wir sie besser lesbar sind.

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

![](step2.png)

##### Die Verbindungsbänder

Nachdem nun alles ordentlich beschriftet ist können wir die Verbindungslinien (oder besser: Verbindungsbänder) zwischen den Ländern einfügen. Die Funktion ``chordColor()`` berechnet die Farbe der Bänder. Um die Differenzen aus den Fluggastzahlen schnell erkennen zu können färben wir die Bänder jeweils in der Farbe des Landes, aus dem mehr Fluggäste in das andere Land reisen.

        function chordColor(d) {
            return fill(d.source.value > d.target.value ?
                d.source.index : d.target.index);
        }

Die Pfad-Koordinaten für die Bänder berechnet dankenswerterweise die Funktion ``d3.svg.chord()`` für uns, der wir nur den inneren Radius übergeben müssen.

        svg.append("g")
            .attr("class", "chord")
          .selectAll("path")
            .data(chord.chords)
          .enter().append("path")
            .attr("d", d3.svg.chord().radius(innerRadius))
            .style("fill", chordColor)
            .style("opacity", 1);


![](step3.png)

##### Hervorheben eines Landes

(dieser abschnitt kann ggf. im Hefttext weggelassen werden)

Um das Lesen des Diagramms zu erleichtern möchten wir dass der Betrachter mit der Maus den Fokus auf einzelne Länder richten kann. Beim Überfahren mit der Maus (*mouseover*) sollen alle Bänder ausgeblendet werden, die keine Verbindung zu dem ausgewählten Land haben. Dazu schreiben wir eine kleine Hilfsfunktion ``fade()``, die die Transparenz aller nicht ausgewählten Bänder auf den gegebenen Wert ``opacity`` setzt. Diese verknüpfen wir mit den entpsrechenden Events.

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


![](step4.png)

## Der HTML-Container[index.html]

(An dieser Stelle nur der Vollständigkeit halber, muss nicht in den Artikel).

    <!DOCTYPE html>
    <html>
        <head>
            <title>Chord-Diagramm</title>
            <meta charset="utf-8">
            <style>
                body {
                  font: 10px Helvetica, sans-serif;
                  width: 960px;
                  margin: auto;
                }
                h1 {text-align:center;font-size:32px}
                .chord path {
                  fill-opacity: .5;
                  stroke-width: .6px;
                }
                .group path { fill-opacity: 0.6; }
                text.country { font-size: 13px; }
            </style>
            <script type="text/javascript" src="../d3.v3.js"></script>
        </head>
        <body>
            <h1>Fluggastverbindungen in Europa</h1>
            <script type="text/javascript" src="chord.js"></script>
        </body>
        </html>



