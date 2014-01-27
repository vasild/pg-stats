function msec_to_hmm(msec) {
    var min = Math.round(msec % 3600000 / 60000);
    return(Math.floor(msec / 3600000) + ':' + (min < 10 ? '0' + min : min));
}

function sum_durations(data, min, max) {
    var sum_ms = 0;

    for (var i = 0; i < data.length; i++) {
        var cur_entry_date = data[i].x;

        if (cur_entry_date >= min) {
            if (cur_entry_date <= max) {
                /* Add the current entry's duration. */
                sum_ms += data[i].y;
            } else {
                break;
            }
        }
    }

    return(sum_ms);
}

function set_total(sum_ms) {
    document.getElementById('total').innerHTML =
        'Total hours: ' + msec_to_hmm(sum_ms);
}

function calc_and_set_total(data, min, max) {
    var sum_ms = sum_durations(data, min, max);

    set_total(sum_ms);
}

function create_the_chart(series_obj) {

    $("#chart_container").highcharts("StockChart", {
        chart: {
            type: 'column',
            zoomType: 'x',
        },
        navigator: {
            height: 30,
            series: series_obj.navigator,
        },
        rangeSelector: {
            /* From "1m, 3m, 6m, YTD, 1y, All" select "All". */
            selected: 5,
        },
        title: {
            text: 'Flights',
        },
        /*
        subtitle: {
            text: 'flights',
        },
        */
        xAxis: {
            events: {
                afterSetExtremes: function (e) {
                    // Here we have e.min, e.max, this.dataMin, this.dataMax
                    calc_and_set_total(
                        this.chart.options.navigator.series.data,
                        e.min,
                        e.max);
                },
            },
            labels: {
                formatter: function () {
                    return(Highcharts.dateFormat('%d %b %Y', this.value));
                },
            },
            ordinal: false,
            title: {
                text: 'date'
            },
            type: 'datetime',
        },
        yAxis: [
            {
                id: 'per_flight_y_axis',
                min: 0,
                type: 'datetime',
                labels: {
                    formatter: function () {
                        return(msec_to_hmm(this.value));
                    }
                },
                title: {
                    text: 'hours / flight'
                },
            },
            {
                id: 'per_year_y_axis',
                min: 0,
                type: 'linear',
                gridLineWidth: 0,
                opposite: true,
                title: {
                    text: 'hours / year'
                },
                labels: {
                    enabled: false,
                },
            },
        ],
        tooltip: {
            formatter: function() {
                return(
                    Highcharts.dateFormat('%b %d %Y', this.x) +
                    ', ' + this.points[0].point.options.name +
                    ': ' + msec_to_hmm(this.y));
            }
        },
        legend: {
            enabled: true,
            align: 'center',
            layout: 'vertical',
            verticalAlign: 'top',
            y: 50,
            borderWidth: 0
        },
        plotOptions: {
            column: {
                pointWidth: 2
            },
            series: {
                cursor: 'pointer',
                point: {
                    events: {
                        click: function () {
                            window.open(
                                "http://forum.skynomad.net/leonardo/tracks/" +
                                "world/" +
                                Highcharts.dateFormat('%Y.%m.%d', this.x) +
                                "/brand:all,cat:0,class:all," +
                                "xctype:all,club:all,pilot:0_2710,takeoff:all");
                        }
                    }
                },
                dataGrouping: {
                    enabled: false
                }
            }
        },
        series: series_obj.main,
    });
}

function fetch_data() {
    /* http://www.w3.org/TR/XMLHttpRequest/ */
    var xhr = new XMLHttpRequest();

    var data_str = null;

    xhr.onreadystatechange = function() {
        if (this.readyState == this.DONE) {
            if (this.status == 200) {
                data_str = this.responseText;
            }
        }
    }

    xhr.open('GET', 'data.json', false /* sync */);
    xhr.send();

    if (data_str == null) {
        alert("Failed to fetch 'data.json'");
        return(null);
    }

    var data_array;

    try {
        data_array = JSON.parse(data_str);
    } catch (e) {
        alert("Cannot parse 'data.json': ", e);
        return(null);
    }

    return(data_array);
}

function parse_data_entry_from_json(json_entry) {
    // ["2008.07.07-novachene-6-000416"],
    // ["2008.09.07-a-okolchica-2-014800"],
    // ["2008.09.07-b-montana-1-001700"],
    var re = /([0-9]{4})\.([0-9]{2})\.([0-9]{2})-([a-z]-){0,1}([^-]+).*([0-9]{2})([0-9]{2})([0-9]{2})/;

    var entries_array = re.exec(json_entry);

    if (entries_array == null) {
        alert("Cannot parse entry from data.json: " + json_entry);
        return(null);
    }

    var flight_obj = {
        year: entries_array[1],
        month: entries_array[2],
        day: entries_array[3],
        takeoff: entries_array[5],
        hh: Number(entries_array[6]),
        mm: Number(entries_array[7]),
        ss: Number(entries_array[8]),
    };

    return(flight_obj);
}

function flight_timestamp(f) {
    return(Date.UTC(f.year, f.month - 1, f.day));
}

function calc_flight_entry(cur_flight_obj, prev_flight_obj, n_flights_today) {

    if (prev_flight_obj != null &&
        cur_flight_obj.year == prev_flight_obj.year &&
        cur_flight_obj.month == prev_flight_obj.month &&
        cur_flight_obj.day == prev_flight_obj.day) {

        n_flights_today.val++;
    } else {
        n_flights_today.val = 1;
    }

    var entry_main = {
        x: Date.UTC(Number(cur_flight_obj.year),
                    Number(cur_flight_obj.month) - 1,
                    Number(cur_flight_obj.day),
                    n_flights_today.val),
        y: (Number(cur_flight_obj.hh) * 3600 +
            Number(cur_flight_obj.mm) * 60 +
            Number(cur_flight_obj.ss)) * 1000,
        name: cur_flight_obj.takeoff,
    };

    return(entry_main);
}

function add_flight_to_per_flight(entry, per_flight) {
    /* Flights with Gradient Bright 3 are before Dec 9 2011. */
    if (entry.x < Date.UTC(2011, 12 - 1, 9)) {
        per_flight.bright3_data.push(entry);
        per_flight.bright3_dur_ms += entry.y;
    } else {
        per_flight.factor2_data.push(entry);
        per_flight.factor2_dur_ms += entry.y;
    }
}

function add_flight_to_navigator(entry, data) {
    data.push(entry);
}

function add_flight_to_per_year(cur_flight_obj, prev_flight_obj, data) {

    var cur_flight_seconds =
        cur_flight_obj.hh * 3600 +
        cur_flight_obj.mm * 60 +
        cur_flight_obj.ss;

    var cur_flight_timestamp = flight_timestamp(cur_flight_obj);

    if (prev_flight_obj == null) {
        /* This is the first flight, start with its date instead of Jan 1 on
        its year. */
        data.push({x: cur_flight_timestamp, y: cur_flight_seconds});
    } else if (cur_flight_obj.year == prev_flight_obj.year) {
        /* Same year, increment the amount. */
        data[data.length - 1].y += cur_flight_seconds;
    } else {
        /* New year, but not the very first one. */
        data.push({
            x: Date.UTC(cur_flight_obj.year, 1 - 1, 1),
            y: cur_flight_seconds,
        });
    }
}

function create_series(data_array) {

    var per_flight = {
        bright3_data: Array(),
        factor2_data: Array(),
        bright3_dur_ms: 0,
        factor2_dur_ms: 0,
    };

    var navigator_data = Array();
    var per_year_data = Array();

    var prev_flight_obj = null;
    var n_flights_today = { val: 1 };
    for (var i = 0; i < data_array.length; i++) {

        var cur_flight_obj = parse_data_entry_from_json(data_array[i]);

        var entry = calc_flight_entry(cur_flight_obj, prev_flight_obj,
                                      n_flights_today);

        add_flight_to_per_flight(entry, per_flight);

        add_flight_to_navigator(entry, navigator_data);

        add_flight_to_per_year(cur_flight_obj, prev_flight_obj, per_year_data);

        prev_flight_obj = cur_flight_obj;
    }
    /* For the last year, append an entry to the main-per-year series with the
    last flight's date and an amount of hours = the accumulated hours for the
    last year. */
    per_year_data.push({
        x: flight_timestamp(cur_flight_obj),
        y: per_year_data[per_year_data.length - 1].y,
        dataLabels: {
            enabled: false,
        },
    });

    var series_obj = {
        main: [
            {
                color: '#2F7ED8',
                data: per_flight.bright3_data,
                name: 'Gradient Bright 3 (' +
                    msec_to_hmm(per_flight.bright3_dur_ms) + ')',
                yAxis: 'per_flight_y_axis',
            },
            {
                color: '#FF6400',
                data: per_flight.factor2_data,
                name: 'Nova Factor 2 (' +
                    msec_to_hmm(per_flight.factor2_dur_ms) + ')',
                yAxis: 'per_flight_y_axis',
            },
            {
                color: '#CCCCCC',
                data: per_year_data,
                dataLabels: {
                    align: 'left',
                    backgroundColor: 'rgba(220, 220, 220, 0.9)',
                    borderRadius: 5,
                    enabled: true,
                    formatter: function () {
                        return(msec_to_hmm(this.y * 1000) + ' (' +
                               (new Date(this.x)).getFullYear() + ')');
                    },
                    x: 15,
                },
                enableMouseTracking: false,
                name: 'per year',
                step: true,
                type: 'line',
                yAxis: 'per_year_y_axis',
                zIndex: -1,
            },
        ],
        navigator: {
	    color: '#888888',
            data: navigator_data,
            type: 'column',
        },
    }

    return(series_obj);
}

/** Entry point, called onload. */
function fetch_data_and_create_the_chart() {

    var data_array = fetch_data();
    if (data_array == null) {
        return;
    }

    var series = create_series(data_array);

    calc_and_set_total(series.navigator.data, 0, Date.UTC(2100, 12 - 1, 31));

    create_the_chart(series);
}

