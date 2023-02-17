const mqtt = require('../mqttClient/mqtt');
const publisher = require('../mqttClient/pub');
const subscriber = require('../mqttClient/sub');
const Appointment = require('../models/appointment');
const { MinPriorityQueue } = require('@datastructures-js/priority-queue');
const CircuitBreaker = require("opossum");


const bookingQueue = new MinPriorityQueue({ priority: (booking) => booking.issuance });
let clinicsInfo;
let nrOfDentists;
let intervalTimerObj;

function exitHandler(options, exitCode) {

    if (options.exit) {
        console.log(exitCode)
        subscriber.unSubToTopic('clinicData');
        console.log('Unsubscribed and ended the client');
        process.exit();
    }
}

//when app is closing
process.on('exit', exitHandler.bind(null, { exit: true }));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { exit: true }));


async function freeQueue(time) {
    publisher.pubToTopic('/requestAppointment', '', 1); // get the intitial list
    //timerIntervalMilliseconds = time;
    intervalTimerObj = setInterval(processNextElementFromQueue, time);
}

async function processNextElementFromQueue() {
    if (!bookingQueue.isEmpty()) {
        publisher.pubToTopic('/requestAppointment', '', 1); // update the list
        let bookingToprocess = bookingQueue.dequeue();
        getNumberOfDentists(clinicsInfo, bookingToprocess.element.clinic_name);
        
        await newBooking(bookingToprocess.element);
    } 
    else {
     
        //console.log('Nothing to handle for now')
    }
}

const ListenRequests = async () => {
    try {
        var bookingObj;
        mqtt.on('message', async function (topic, message) {
            if (topic === '/bookingRequest') {
                bookingObj = JSON.parse(message);
                bookingQueue.enqueue(bookingObj)
            }
            if (topic === '/jsonDataToAppointment') {
            clinicsInfo = JSON.parse(message);
            }
        });
    } catch (e) {
        console.log(e.stack);
    }
}

function getNumberOfDentists(clinics, clinic_name) {
    for (let i = 0; i < clinics.dentists.length; i++) {
        if (clinic_name === clinics.dentists[i].name) {
            nrOfDentists = clinics.dentists[i].dentists;
        }
    }
}

var _newBooking = async (bookingObj) => {
    try {
        var clinic = bookingObj.clinic_name;
        var date = bookingObj.date;
        var time = bookingObj.time;
        var jsonMessage = JSON.stringify(bookingObj);
        console.log("Handling booking request " + bookingObj.issuance);
        await Appointment.find({ clinic_name: clinic, date: date, time: time }, async function (err, res) {
            if (err) {
                console.log(err);
            } else if (res === null) {
                console.log('Something went wrong');
            } else {
                if (res.length < parseInt(nrOfDentists)) {
                    var theObject = new Appointment(bookingObj);
                    await theObject.save();
                    //triger availabilityChecker to resend the list of available time slots, so that UI can pick up and show the new list
                    var clinic = clinicsInfo.dentists.find(c => c.name == theObject.clinic_name);
                    publisher.pubToTopic('/clinicData', JSON.stringify(clinic), 1);

                    publisher.pubToTopic(`/Confirmation/${bookingObj.request_id}`, jsonMessage, 2);
                } else {
                    publisher.pubToTopic(`/Confirmation/${bookingObj.request_id}`, 'This appointment is already booked boo', 2);
                }
            }
        }).clone();
    } catch (error) {
        console.log(error);
    }
};


const circuiteBreakerOptions = {
    timeout: 3000, // If our function takes longer than 3 seconds, trigger a failure
    errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
    resetTimeout: 10000 // After 30 seconds, try again.
};

const newBookingCircuitBreaker = new CircuitBreaker(_newBooking, circuiteBreakerOptions);

async function newBooking(bookingObj) {
        newBookingCircuitBreaker.fire(bookingObj);
}

newBookingCircuitBreaker.fallback(
    (bookingObj) => {
        // check stats to see if circuit should be opened
        const stats = newBookingCircuitBreaker.stats;
        //console.log("Stats fires: " + newBookingCircuitBreaker.stats.fires + " Failures: " + newBookingCircuitBreaker.stats.failures);
        if ((stats.fires < newBookingCircuitBreaker.volumeThreshold) && !newBookingCircuitBreaker.halfOpen) return;
        const errorRate = stats.failures / stats.fires * 100;
        if (errorRate > newBookingCircuitBreaker.options.errorThresholdPercentage) {
                newBookingCircuitBreaker.open();
                
        }
    }
);

newBookingCircuitBreaker.on('open',
    () => {
        console.log("OUT OF SERVICE: Currently out of service. Will retry automatically after about " + circuiteBreakerOptions.resetTimeout / 1000 + " seconds. ");
        clearInterval(intervalTimerObj);
    });

newBookingCircuitBreaker.on("halfOpen",
    () => {
        console.log("HALF OPEN: Starting to proess again...");
        intervalTimerObj = setInterval(processNextElementFromQueue, timerIntervalMilliseconds);
    });

    newBookingCircuitBreaker.on("close",
    () => {
        console.log("BACK IN SERVICE: Service is working. ");
        intervalTimerObj = setInterval(processNextElementFromQueue, timerIntervalMilliseconds);
    });

const snooze = ms => new Promise(resolve => setTimeout(resolve, ms));

const sleep = async (milliseconds) => {
    await snooze(milliseconds);
};

module.exports = {
    ListenRequests,
    freeQueue
}