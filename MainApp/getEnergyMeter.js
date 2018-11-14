//**********************************************************************
//
// IMPORTANT INFORMATION:
//
// Energy Meter		: Mikro DPM380
// Modbus Device	: Mikro DPM380
//
// NOTE: Pls change the register definition according to datasheet.
//
//**********************************************************************

//**********************************************************************
//
// DEFINE ENERGY METER OBJECTS
//
//**********************************************************************

var EnergyParameters = new Object;

//**********************************************************************
//
// HOLDING REGISTER MAP
//
//**********************************************************************

// First address of the register block
const holdingRegister_R = 4000;
// Total Number of Register to read from the register block		
const totalNumberOfRegister = 14;

//**********************************************************************
//
// QUERY ALL THE METERS
//
//**********************************************************************

const getEnergyParameters = async (energyMeter, totalNumberOfMeters) => {
	// console.log("Inside getMeters");
	try {
		for (let meterNumber = 1; meterNumber <= totalNumberOfMeters; meterNumber++) {
			await getEachMeter(energyMeter, meterNumber);
		}
	} catch (error) {
		console.log(error.message);
	} finally {
		return EnergyParameters;
	}
}

//**********************************************************************
//
// GET ENERGY PARAMETERS FROM EACH METER
//
//**********************************************************************

const getEachMeter = async (energyMeter, slaveId) => {
	let meterId = "Meter" + slaveId;
	try {
		await energyMeter.setID(slaveId);
		await energyMeter.setTimeout(1000);
		let energyParameters = await energyMeter.readHoldingRegisters(holdingRegister_R, totalNumberOfRegister);
		
		// Power and Energy
        activeEnergy = energyParameters.buffer.readUInt32BE(4);
        intakeTNB = energyParameters.buffer.readUInt32BE(24) / 1000;
        
		EnergyParameters[meterId] = {
			activeEnergy,
			intakeTNB,
			time: Date.now(),
			month: new Date().getMonth() + 1,
			year: new Date().getFullYear()
		};
	} catch (error) {
		EnergyParameters[meterId] = {
			error: error.message,
			time: Date.now()
		};
	}
};

//**********************************************************************
//
// EXPORT METHODS
//
//**********************************************************************

module.exports.getEnergyParameters = getEnergyParameters;