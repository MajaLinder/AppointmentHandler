var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var appointmentSchema = new Schema({
    issuance: {type: Number},
    request_id: {type : String},
    clinic_name: {type: String},
    date: {type: Object},
    time: {type: String},
    user_id: {type: Number},
    first_name: {type: String},
    last_name: {type: String},
});

module.exports = mongoose.model('Appointment', appointmentSchema);