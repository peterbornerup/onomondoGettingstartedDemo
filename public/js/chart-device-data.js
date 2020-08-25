/* eslint-disable max-classes-per-file */
/* eslint-disable no-restricted-globals */
/* eslint-disable no-undef */
$(document).ready(() => {

  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);

  const simIDUser = urlParams.get('simID');


  // if deployed to a site supporting SSL, use wss://
  const protocol = document.location.protocol.startsWith('https') ? 'wss://' : 'ws://';
  const webSocket = new WebSocket(protocol + location.host);
  console.log(location.host)
  // A class for holding the last N points of telemetry for a device
  class DeviceData {
    constructor(deviceId) {
      this.deviceId = deviceId;
      this.maxLen = 50;
      this.timeData = new Array();
      this.voltageData = new Array();
      this.signalData = new Array();
    }

      addData(time, voltage, signal) {
      var temp = new Date(time);



      this.timeData.push(temp.getTime());

      console.log("time in ms",typeof temp.getTime(), temp.getTime());
        console.log(this.timeData);
      this.voltageData.push(voltage);
      this.signalData.push(signal || null);

      if (this.timeData.length > this.maxLen) {
        this.timeData.shift();
        this.voltageData.shift();
        this.signalData.shift();
      }
    }
  }

  // All the devices in the list (those that have been sending telemetry)
  class TrackedDevices {
    constructor() {
      this.devices = [];
    }

    // Find a device based on its Id
    findDevice(deviceId) {
      for (let i = 0; i < this.devices.length; ++i) {
        if (this.devices[i].deviceId === deviceId) {
          return this.devices[i];
        }
      }

      return undefined;
    }

    getDevicesCount() {
      return this.devices.length;
    }
  }

  const trackedDevices = new TrackedDevices();

  // Define the chart axes
  const chartData = {
    datasets: [
      {
        fill: false,
        label: 'Voltage',
        yAxisID: 'Voltage',
        borderColor: 'rgba(171,125,99,1)',
        pointBoarderColor: 'rgba(171,125,99, 1)',
        backgroundColor: 'rgba(171,125,99, 0.4)',
        pointHoverBackgroundColor: 'rgba(171,125,99, 1)',
        pointHoverBorderColor: 'rgba(171,125,99, 1)',
        spanGaps: true,
        lineTension: 0,
      },
      {
        fill: false,
        label: 'Signal',
        yAxisID: 'Signal',
        borderColor: 'rgba(255, 255, 255, 1)',
        pointBoarderColor: 'rgba(255, 255, 255, 1)',
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        pointHoverBackgroundColor: 'rgba(24, 120, 240, 1)',
        pointHoverBorderColor: 'rgba(24, 120, 240, 1)',
        spanGaps: true,
      }
    ]
  };

  const chartOptions = {
    scales: {
      xAxes: [{
        type: 'time',
        distribution: 'linear',
        ticks: {
          beginAtZero: false,
          autoSkip: true,
          maxTicksLimit: 5
        },
        time: {
          unit: 'second'
        }
      }],
      yAxes: [{
        id: 'Voltage',
        type: 'linear',
        ticks:{
          suggestedMin: 2,
          suggestedMax: 4.3
        },
        scaleLabel: {
          labelString: 'Battery voltage',
          display: true,
        },
        position: 'left',
      },
      {
        id: 'Signal',
        type: 'linear',
        ticks:{
          suggestedMin: 0,
          suggestedMax: 35
        },
        scaleLabel: {
          labelString: 'Signal quality',
          display: true,
        },
        ticks:{
          beginAtZero : true
        },
        position: 'right',
      }]
    },
  };

  // Get the context of the canvas element we want to select
  const ctx = document.getElementById('iotChart').getContext('2d');
  const myLineChart = new Chart(
    ctx,
    {
      type: 'line',
      data: chartData,
      options: chartOptions,
    });

  // Manage a list of devices in the UI, and update which device data the chart is showing
  // based on selection
  let needsAutoSelect = true;
  const deviceCount = document.getElementById('deviceCount');
  const listOfDevices = document.getElementById('listOfDevices');
  function OnSelectionChange() {
    const device = trackedDevices.findDevice(listOfDevices[listOfDevices.selectedIndex].text);
    console.log(listOfDevices[listOfDevices.selectedIndex].text)
    console.log("Found device:");
    console.log(device);

    chartData.labels = device.timeData;
    chartData.datasets[0].data = device.voltageData;
    chartData.datasets[1].data = device.signalData;
    myLineChart.update();
  }
 // listOfDevices.addEventListener('change', OnSelectionChange, false);
  
  // When a web socket message arrives:
  // 1. Unpack it
  // 2. Validate it has date/time and temperature
  // 3. Find or create a cached device to hold the telemetry data
  // 4. Append the telemetry data
  // 5. Update the chart UI
  webSocket.onmessage = function onMessage(message) {
    try {
      const messageData = JSON.parse(message.data);

      // time and either temperature or humidity are required
      if (!messageData.MessageDate || (!messageData.IotData.payload.battery && !messageData.IotData.payload.signal)) {
        return;
      }

      
      // find or add device to list of tracked devices
      var deviceID = messageData.IotData.sim_id.toString();
      var battery = messageData.IotData.payload.battery;
      var signal = messageData.IotData.payload.signal;
      
      
      if(deviceID != simIDUser){
        return;
      }


      const existingDeviceData = trackedDevices.findDevice(deviceID);



      if (existingDeviceData) {
        existingDeviceData.addData(Date(messageData.MessageDate), battery,signal);
      } else {
        const newDeviceData = new DeviceData(deviceID);
        const numDevices = trackedDevices.getDevicesCount();
        trackedDevices.devices.push(newDeviceData);




        newDeviceData.addData(Date(messageData.MessageDate), battery, signal);

        if(numDevices == 0){
          //then we wish to add the data..
          chartData.labels = newDeviceData.timeData;
          chartData.datasets[0].data = newDeviceData.voltageData;
          chartData.datasets[1].data = newDeviceData.signalData;
        }
      }

      myLineChart.update();
    } catch (err) {
      console.error(err);
    }
  };
});
