const mongoose = require('mongoose');
const subscriber = require('./mqttClient/sub'); 
const appController = require('./controllers/appointments');

var mongoURI = 'mongodb+srv://team4:basili@cluster0.l4eth.mongodb.net/myFirstDatabase?retryWrites=true&w=majority';
let timerIntervalMilliseconds = 1;

subscriber.subToTopic('/bookingRequest', 2);
subscriber.subToTopic('/jsonDataToAppointment', 1);
appController.ListenRequests();


// Connect to MongoDB
mongoose.connect(mongoURI
    ,
    {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    },
    (err) => {
        if (err) {
            console.error(' >> Failed to connect to MongoDB.');
            console.error(err.stack);
            process.exit(1);
        }
        console.log(' >> Connected to MongoDB.');
    }
);


appController.freeQueue(timerIntervalMilliseconds); /// edit this number when we get the middle number from stress function