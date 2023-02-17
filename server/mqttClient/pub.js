/* eslint-disable */
const mqtt = require('./mqtt');

module.exports.pubToTopic = function(topic, payload, qos) {
    mqtt.publish(topic, payload, qos, (error) => {
        if (error) {
            console.log("Publish error", error);
        }
    });
}