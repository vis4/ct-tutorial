
# D3.js Streamgraph

In diesem Beispiel visualisieren wir die Geschichte des deutschen Primärenergieverbrauch in einem Streamgraph. Der Datensatz enthält für jedes Jahr den Energieverbrauch aufgeschlüsselt nach Energieträger, die Einheit ist Mio Tonnen Steinkohleeinheiten (SKE).

Jahr | Braunkohle | Steinkohle | Mineralöl | Erdgas | Kernenergie | Erneuerbare | Sonstige
-----|-----:|------:|----:|----:|----:|----:|----:
1950 | 66,94 | 103,26 | 6,30 | 0,08 | 0,00 | 6,42 | 3,59
1951 | 70,86 | 116,20 | 7,19 | 0,10 | 0,00 | 6,28 | 3,31
1952 | 74,24 | 123,60 | 8,01 | 0,13 | 0,00 | 6,48 | 3,01

## JavaScript [streamgraph.js]

Wir definieren die zunächst die Breite und Höhe der Grafik, initialisieren ein neues SVG-Dokument und hängen es mit ``d3.select().append()`` an das Ende der HTML-Seite.

    var width = 960,
        height = 500;

    var svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height);


##### Daten einlesen und strukturieren

Der nächste Schritt besteht darin, die Datentabelle in unsere Visualisierung zu laden. Da die Spalten in diesem Fall durch Tabulatoren getrennt sind benutzen wir dazu die Funktion ``d3.tsv``. Dieser übergeben wir den Dateinamen und eine *Callback-*Funktion, die ausgeführt wird sobald die Daten geladen wurden.

    d3.tsv('energymix.tsv', function(err, data) {


Nun möchten wir die Daten in das von ``d3.layout.stack()`` benötigte Format bringen und in in der Variable ``layers`` speichern: Eine Liste von Spalten-Arrays, die für jede Zeile ein Objekt mit den Eigenschaften *x* und *y* enthält. Die Spaltenüberschriften speichern wir uns mit ``d3.keys()`` ab, wobei wir die erste Spalte auslassen.

        var keys = d3.keys(data[0]).slice(1),
            layers = [];

Für jede Spalte legen wir nun ein leeres Array ``layer`` an, das wir sogleich an ``layers`` anhängen. Nun laufen wir über alle Zeilen in der Tabelle und fügen jeweils einen neuen Punkt in den Layer ein. Das Jahr wandeln wir in ein JavaScript-Datum um, den Energieverbrauch wandeln wir in einen numerischen Wert.

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

##### Streamgraph-Layout berechnen

So vorbereitet können wir aus den Daten nun mittels ``d3.layout.stack`` das Streamgraph-Layout berechnen. Ein Streamgraph ist im Prinzip nichts anderes als Gestapelte Flächen, nur dass die Grundlinie (*offset*) nicht fest bei null liegt, sondern von einem komplizierten Algorithmus (*wiggle*) berechnet wird.

        var stack = d3.layout.stack().offset("wiggle");
        layers = stack(layers);

Ein wichtiges Prinzip von D3.js lautet, das Layout-Algorithmen unabhängig von der Darstellungsform arbeiten. Das stack-Layout macht an dieser Stelle deshalb nicht mehr als jedem Datenpunkt eine weitere Eigenschaft *y0* zuzuweisen.

##### Skalen definieren

Da wir Zeitreihen visualisieren benutzen wir ``d3.time.scale`` für die Berechnung der horizontalen Positionen. Das vereinfacht uns später das Darstellen der Zeitachse. Die vertikale Achse ist eine einfache Liniearskala. Wir verschachteln zwei ``d3.max`` Aufrufe um den größten Wert in allen Spalten und allen Zeilen zu ermitteln.

        var x = d3.time.scale()
            .domain([layers[0][0].x, layers[0][data.length-1].x])
            .range([20, width]);

        var y = d3.scale.linear()
            .domain([0, d3.max(layers, function(layer) {
                return d3.max(layer, function(d) {
                    return d.y0 + d.y;
                });
            })]).range([height-30, 0]);

##### Streamgraph-Flächen visualisieren

Die Generator-Funktion ``d3.svg.area()`` erzeugt uns eine Funktion mit der unsere gelayouteten Daten in einen SVG-Pfad umgewandelt werden. An dieser Stelle berechnen die Skalen Zahlen aus dem Wertebereich in den Bildbereich. So wird z.B. aus dem Jahr 1970 der Pixel-Wert 305.

        var area = d3.svg.area()
            .x(function(d) { return x(d.x); })
            .y0(function(d) { return y(d.y0); })
            .y1(function(d) { return y(d.y0 + d.y); })
            .interpolate('basis');

Über eine weitere Selektion erstellen wir neue SVG-Pfad Elemente und übergeben die soeben erstellte Funktion ``area`` zur Berechnung der Pfad-Koordinaten.

        svg.selectAll("path")
            .data(layers)
          .enter().append("path")
            .attr("d", area)
            .attr("class", function(d, i) { return keys[i]; });

##### Streamgraph und Achsen beschriften

Die Position der Etiketten automatisch zu berechnen übersteigt den Rahmen des Tutorials, deshalb seien die Koordinaten und Schriftgrößen an dieser Stelle fest definiert. Noch einmal benutzen wir ``d3.selectAll``

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

Zuletzt fügen wir noch eine Zeitachse hinzu, die uns praktischerweise komplett von ``d3.svg.axis()`` erzeugt wird. Wir kapseln die x-Achse in einer neuen SVG-Gruppe (svg:g), der wir die Klasse *axis* zuweisen und über das Attribut *transform* an das untere Ende der Grafik verschieben.

        var xAxis = d3.svg.axis().scale(x);

        svg.append('svg:g')
            .attr('class', 'axis')
            .attr('transform', 'translate(0, '+(height-20)+')')
            .call(xAxis);
    });

Fertig ist die Grafik.

<!--BREAK-->

## Das Stylesheet[streamgraph.css]

Etwas weniger spannend, gehört aber trotzdem zur Visualisierung, da hier unter anderem Farben definiert werden.

Schriften definieren, Seitenbreite auf 960px festlegen und mittig zentrieren:

    body {
      font-family: Helvetica, Arial, sans-serif;
      font-size: 16px;
      margin: auto;
      position: relative;
      width: 960px;
    }
    h1 {
      position: absolute;
      top: 0px;
      left: 17px;
    }

SVG-Dokument etwas Abstand nach oben, damit die Überschrift Platz hat.

    svg { margin-top: 60px;}

Die Zeitachse:

    .axis { shape-rendering: crispEdges; }
    .axis line { stroke: #000; }
    .axis path { display: none; }

Die im Diagramm benutzten Farben:

    path.Braunkohle { fill: #693E3B; stroke: #693E3B; }
    path.Steinkohle { fill: #8C5B49; stroke: #8C5B49; }
    path.Mineralöl { fill: #BF9B7A; stroke: #BF9B7A; }
    path.Erdgas { fill: #EBDFCE; stroke: #EBDFCE; }
    path.Kernenergie { fill: #E6BF86; stroke: #D1AE78; }
    path.Erneuerbare { fill: #759B87; stroke: #799979; }
    path.Sonstige { fill: #ccc; stroke: #bbb; }

Die Etiketten:

    text.label {
      fill: #fff;
      text-shadow: 1px 1px 8px #000
    }

<!--BREAK-->
## Der HTML-Container[index.html]

Die HTML-Seite bindet die D3.js Biliothek sowie unsere JavaScript-Datei und die CSS-Definitionen ein:

    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Streamgraph</title>
        <script type="text/javascript" src="../d3.v3.js"></script>
        <link rel="stylesheet" type="text/css" href="streamgraph.css">
    </head>
    <body>
        <h1>Deutschlands Energiemix</h1>
        <script type="text/javascript" src="streamgraph.js"></script>
    </body>
    </html>

## Das Ergebnis

![](result.png)