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
            backgroundColor: '#EEEEEE',
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

    xhr.open('GET', 'd.json', false /* sync */);
    xhr.send();

    if (data_str == null) {
        alert("Failed to fetch 'd.json'");
        return(null);
    }

    var data_array;

    try {
        data_array = JSON.parse(data_str);
    } catch (e) {
        alert("Cannot parse 'd.json': ", e);
        return(null);
    }

    return(data_array);
}

function flight_timestamp(f) {
    return(Date.UTC(f.date.y, f.date.m - 1, f.date.d));
}

function calc_flight_entry(cur_flight_obj, prev_flight_obj, n_flights_today) {

    if (prev_flight_obj != null &&
        cur_flight_obj.date.y == prev_flight_obj.date.y &&
        cur_flight_obj.date.m == prev_flight_obj.date.m &&
        cur_flight_obj.date.d == prev_flight_obj.date.d) {

        n_flights_today.val++;
    } else {
        n_flights_today.val = 1;
    }

    var entry_main = {
        x: Date.UTC(Number(cur_flight_obj.date.y),
                    Number(cur_flight_obj.date.m) - 1,
                    Number(cur_flight_obj.date.d),
                    n_flights_today.val /* hour */),
        y: (Number(cur_flight_obj.duration.h) * 3600 +
            Number(cur_flight_obj.duration.m) * 60 +
            Number(cur_flight_obj.duration.s)) * 1000,
        name: cur_flight_obj.takeoff,
    };

    return(entry_main);
}

function add_flight_to_per_flight(entry, glider, per_flight) {
    if (glider == "b3") {
        per_flight.bright3_data.push(entry);
        per_flight.bright3_dur_ms += entry.y;
    } else if (glider == "f2") {
        per_flight.factor2_data.push(entry);
        per_flight.factor2_dur_ms += entry.y;
    } else if (glider == "s9") {
        per_flight.sigma9_data.push(entry);
        per_flight.sigma9_dur_ms += entry.y;
    } else if (glider == "m4") {
        per_flight.mentor4_data.push(entry);
        per_flight.mentor4_dur_ms += entry.y;
    } else if (glider == "t3") {
        per_flight.takoo3_data.push(entry);
        per_flight.takoo3_dur_ms += entry.y;
    } else if (glider == "s10a") {
        per_flight.sigma10a_data.push(entry);
        per_flight.sigma10a_dur_ms += entry.y;
    } else if (glider == "s10b") {
        per_flight.sigma10b_data.push(entry);
        per_flight.sigma10b_dur_ms += entry.y;
    } else {
        alert("Unknown glider: " + glider + ". Will not be shown.");
    }
}

function add_flight_to_navigator(entry, data) {
    data.push(entry);
}

function add_flight_to_per_year(cur_flight_obj, prev_flight_obj, data) {

    var cur_flight_seconds =
        cur_flight_obj.duration.h * 3600 +
        cur_flight_obj.duration.m * 60 +
        cur_flight_obj.duration.s;

    var cur_flight_timestamp = flight_timestamp(cur_flight_obj);

    if (prev_flight_obj == null) {
        /* This is the first flight, start with its date instead of Jan 1 on
        its year. */
        data.push({x: cur_flight_timestamp, y: cur_flight_seconds});
    } else if (cur_flight_obj.date.y == prev_flight_obj.date.y) {
        /* Same year, increment the amount. */
        data[data.length - 1].y += cur_flight_seconds;
    } else {
        /* New year, but not the very first one. */
        data.push({
            x: Date.UTC(cur_flight_obj.date.y, 1 - 1, 1),
            y: cur_flight_seconds,
        });
    }
}

function create_series(data_array) {

    var per_flight = {
        bright3_data: Array(),
        factor2_data: Array(),
        sigma9_data: Array(),
        mentor4_data: Array(),
        takoo3_data: Array(),
        sigma10a_data: Array(),
        sigma10b_data: Array(),
        bright3_dur_ms: 0,
        factor2_dur_ms: 0,
        sigma9_dur_ms: 0,
        mentor4_dur_ms: 0,
        takoo3_dur_ms: 0,
        sigma10a_dur_ms: 0,
        sigma10b_dur_ms: 0,
    };

    var navigator_data = Array();
    var per_year_data = Array();

    var prev_flight_obj = null;
    var n_flights_today = { val: 1 };
    for (var i = 0; i < data_array.length; i++) {

        var cur_flight_obj = data_array[i];

        var entry = calc_flight_entry(cur_flight_obj, prev_flight_obj,
                                      n_flights_today);

        add_flight_to_per_flight(entry, cur_flight_obj.glider, per_flight);

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
                color: '#FF9400',
                data: per_flight.factor2_data,
                name: 'Nova Factor 2 (' +
                    msec_to_hmm(per_flight.factor2_dur_ms) + ')',
                yAxis: 'per_flight_y_axis',
            },
            {
                color: '#A07800',
                data: per_flight.sigma9_data,
                name: 'Advance Sigma 9 (' +
                    msec_to_hmm(per_flight.sigma9_dur_ms) + ')',
                yAxis: 'per_flight_y_axis',
            },
            {
                color: '#3429FF',
                data: per_flight.mentor4_data,
                name: 'Nova Mentor 4 (' +
                    msec_to_hmm(per_flight.mentor4_dur_ms) + ')',
                yAxis: 'per_flight_y_axis',
            },
            {
                color: '#F4D746',
                data: per_flight.takoo3_data,
                name: 'Niviuk Takoo 3 (' +
                    msec_to_hmm(per_flight.takoo3_dur_ms) + ')',
                yAxis: 'per_flight_y_axis',
            },
            {
                color: '#FFFFFF',
                data: per_flight.sigma10a_data,
                name: 'Advance Sigma 10 blue/white/orange (' +
                    msec_to_hmm(per_flight.sigma10a_dur_ms) + ')',
                yAxis: 'per_flight_y_axis',
            },
            {
                color: '#FFFFFF',
                data: per_flight.sigma10b_data,
                name: 'Advance Sigma 10 orange/white/blue (' +
                    msec_to_hmm(per_flight.sigma10b_dur_ms) + ')',
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
