import './css/main.less'

import Papa from 'papaparse'
import * as d3 from "d3";
import Plotly from 'plotly.js-dist'

import { DateTime, Settings } from 'luxon';
import BigNumber from "bignumber.js"

let hostname = location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '');

let tbody = d3.select("#buyback-data tbody");
let buybacks = [];

BigNumber.config({
  FORMAT: {
    // string to prepend
    prefix: '',
    // decimal separator
    decimalSeparator: '.',
    // grouping separator of the integer part
    groupSeparator: ',',
    // primary grouping size of the integer part
    groupSize: 3,
    // secondary grouping size of the integer part
    secondaryGroupSize: 0,
    // grouping separator of the fraction part
    fractionGroupSeparator: ' ',
    // grouping size of the fraction part
    fractionGroupSize: 0,
    // string to append
    suffix: ''
  }
});

Papa.parse(hostname + "/api/buyback", {
  header: true,
  worker: true,
  download: true,
  step: function (row) {
    if (row.data["DATE"]) {
      buybacks.push({
        date: DateTime.fromISO(row.data["DATE"]),
        orderId: row.data["ORDER ID"],
        batchId: row.data["BATCH ID"],
        type: row.data["TYPE"],
        price: new BigNumber(row.data["PRICE"]),
        quantityFilled: new BigNumber(row.data["QUANTITY FILLED"]),
        usdAmountFilled: new BigNumber(row.data["USD AMOUNT FILLED"])
      });
    }
  },
  complete: function () {
    let tr = tbody
      .selectAll("tr")
      .data(buybacks)
      .join("tr");

    tr
      .append("td")
      .attr("class", "border px-2 py-1")
      .text(d => d.date.toLocaleString(DateTime.DATETIME_SHORT));

    tr
      .append("td")
      .attr("class", "border px-2 py-1")
      .text(d => d.orderId);

    tr
      .append("td")
      .attr("class", "border px-2 py-1")
      .text(d => d.batchId);

    tr
      .append("td")
      .attr("class", "border px-2 py-1 text-center")
      .append("span")
      .text(d => d.type)
      .attr("class", d => "text-white rounded-sm px-1 text-sm " + (d.type == "Market" ? "bg-blue-500" : "bg-indigo-500"));

    tr
      .append("td")
      .attr("class", "border px-2 py-1 text-right")
      .text(d => d.price.isNaN() ? "" : d.price);

    tr
      .append("td")
      .attr("class", "border px-2 py-1 text-right")
      .text(d => d.quantityFilled.isNaN() ? "" : d.quantityFilled);

    tr
      .append("td")
      .attr("class", "border px-2 py-1 text-right")
      .text(d => d.usdAmountFilled.isNaN() ? "" : d.usdAmountFilled.toFormat(4));


    let buybacksByDay = d3.nest()
      .key(d => d.date.toISODate())
      .rollup(v => BigNumber.sum(...v.map(d => d.usdAmountFilled)).toNumber())
      .entries(buybacks);

    let totalAmount = BigNumber.sum(...buybacks.map(d => d.usdAmountFilled));

    d3.select("#total").text(totalAmount.toFormat(0) + ' USD');

    let yesterday = DateTime.local().minus({ days: 1 });

    let totalAmountLast24h = BigNumber.sum(...buybacks.filter(d => d.date > yesterday).map(d => d.usdAmountFilled));

    d3.select("#total-last24h").text(totalAmountLast24h.toFormat(0) + ' USD');

    let data = {
      x: buybacksByDay.map(d => d.key),
      y: buybacksByDay.map(d => d.value),
      type: 'bar',
      marker: {
        color: '#4299e1'
      }
    };

    let layout = {
      margin: {
        l: 0,
        r: 0,
        b: 50,
        t: 0,
        pad: 4
      }
    }

    Plotly.newPlot('days-graph', [data], layout, { displayModeBar: false, responsive: true });

    d3.select("#loading").remove();
  }
});
