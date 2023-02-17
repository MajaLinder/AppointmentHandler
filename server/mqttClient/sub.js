/* eslint-disable */
const mqtt = require('./mqtt');

function subToTopic(topic, qos) {
  mqtt.subscribe(topic, { qos }, (error, res) => {
    if (error) {
      console.log("Subscribe to topics error", error);
      return;
    }
    console.log("Subscribed to: >>> ", res);
  });
}

function unSubToTopic(topic) { 
  mqtt.unsubscribe(topic, (error) => {
    if (error) {
      console.log("unsubscribtion failed: ", error);
      return;
    }
    this.end ()
  });
}

function end () {
  mqtt.end((error) => {
    if (error) {
      console.log("ending client failed: ", error);
      return;
    }
  });
}


module.exports = {
  subToTopic, 
  unSubToTopic,
  end
}