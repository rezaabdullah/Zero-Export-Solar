//**********************************************************************
//
// NPM MODULES
//
//**********************************************************************
//
// 1. Energy Parameters Query
// 2. Smartlogger Parameters Query
// 3. CONTROLLING MODBUS DEVICES
// 4. DATABASE
// 5. OFFLINE DATA MANAGEMENT
// 6. AUTO STARTUP NODE SCRIPT
//
//**********************************************************************

//**********************************************************************
//
// NPM MODULES
//
//**********************************************************************

const ModbusRTU = require("modbus-serial");
const firebase = require("firebase");

//**********************************************************************
//
// ADD-ON MODULES
//
//**********************************************************************

const getMeters = require("./getEnergyMeter.js");
const getSolar = require("./getPVSystem.js");
const solarOutputControl = require("./controlPowerOutput.js");
const manageDatabase = require("./manageDatabase.js");
const performanceData = require("./processData.js");

//**********************************************************************
//
// INITIAL CONFIGURATIONS: MODBUS-RTU RS-485
// DIGITAL POWER METER
//
//**********************************************************************

var energyMeter = new ModbusRTU();
energyMeter.connectRTUBuffered("/dev/ttyAMA0", {baudRate: 9600}, function(error, success) {
 	if (error) {
 		console.log("Serial Port initialization unsuccessful");
 	} else {
 		console.log("Serial port initialization successful");
 	}
});

//**********************************************************************
//
// INITIAL CONFIGURATIONS: MODBUS RTU TCP/IP
// HUAWEI SMARTLOGGER 
//
//**********************************************************************

var smartlogger = new ModbusRTU();
smartlogger.connectTCP("10.10.0.61", {port: 502}, function(error, data) {
	if (error) {
 		console.log("TCP/IP port initialization unsuccessful");
 	} else {
 		console.log("TCP/IP port initialization successful");
	}
});

//**********************************************************************
//
// INITIAL CONFIGURATIONS: FIREBASE
// REALTIME DATABASE
//
//**********************************************************************

var config = {
	apiKey: "AIzaSyBpzfNgXNeKz8X0CQBG29W3R8CsXVh8pwI",
	authDomain: "source-57d08.firebaseapp.com",
	databaseURL: "https://source-57d08.firebaseio.com",
	projectId: "source-57d08",
	storageBucket: "source-57d08.appspot.com",
};

/*
var config = {
	apiKey: "AIzaSyB-6YYD6W9-yN-E4wvFNpxtEL6IHX9nVuQ",
	authDomain: "prototype-test-development.firebaseapp.com",
	databaseURL: "https://prototype-test-development.firebaseio.com",
	projectId: "prototype-test-development",
	storageBucket: "prototype-test-development.appspot.com"
};
*/ 

firebase.initializeApp(config);
var projectDatabase = firebase.database();

//**********************************************************************
//
// CHECK INTERNET CONNECTION
//
//**********************************************************************

var connectionStatus = null;
const connectedRef = firebase.database().ref(".info/connected");
connectedRef.on("value", function(snap) {
	if (snap.val()) {
		connectionStatus = snap.val();
	} else {
		connectionStatus = false;
	}
});

//**********************************************************************
//
// CHECK BASELINE STATUS
//
//**********************************************************************

var baselineControl = null;
let baselineControlRef = projectDatabase.ref('/Customer/ThongGuanLot48/DatalogControl/');
baselineControlRef.once('value').then(function(snapshot) {
	baselineControl = snapshot.val().Baseline;
}).catch(error => {
	console.log(error);
});

//**********************************************************************
//
// CHECK CONFIGURATIONS OF PV SYSTEM
//
//**********************************************************************

var solarSystemConfig = new Object;
let configRef = projectDatabase.ref('/Customer/ThongGuanLot48/Config/');
configRef.once('value', function(snapshot) {
	snapshot.forEach(function(childSnapshot) {
		let key = childSnapshot.key;
		let value = childSnapshot.val();
		solarSystemConfig[key] = value;
	});
});

//**********************************************************************
//
// PROJECT CONFIGURATION: DIGITAL POWER METER
//
//**********************************************************************

const numberOfMeters = 1;
const numberOfInverters = 19;

//**********************************************************************
//
// MAIN FUNCTION
//
//**********************************************************************

const main = async () => {
	try {
		let allMeterParameters = await getMeters.getEnergyParameters(energyMeter, numberOfMeters);
		let weatherStationObject = await getSolar.getWeatherData(smartlogger);
		let allInverterParameters = await getSolar.getInverters(smartlogger, numberOfInverters);
		let allPVParameters = await getSolar.getSmartlogger(smartlogger);
		let limitPVOutput = await solarOutputControl.adjustSolarOutput(smartlogger, allMeterParameters.Meter1.intakeTNB, allPVParameters.SmartLogger);
		let systemPerformance = await performanceData.performanceParameters(allMeterParameters.Meter1, allPVParameters.SmartLogger, solarSystemConfig);
		console.log("IntakeTNBPower:", allMeterParameters.Meter1.intakeTNB);
		console.log("dailyMaxDemand:", systemPerformance.DailyReadings.dailyMaxDemand);
		manageDatabase.manageData(projectDatabase, connectionStatus, baselineControl, allMeterParameters, allPVParameters, systemPerformance);
	} catch (error) {
		console.log(error.message);
	} finally {
		await delay(60000);
		console.log('***** ITERATION COMPLETE *****');
		main();
	}
};

//**********************************************************************
//
// DELAY
//
//**********************************************************************

const delay = microSecond => new Promise(resolve => setTimeout(resolve, microSecond));

delay(20000).then(() => {
	console.log("Start app.js")
	main();
});
