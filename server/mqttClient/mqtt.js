const mqtt = require('mqtt');

const host =  'broker.emqx.io';
const port = 8083; 
const endpoint = '/mqtt';

const connectUrl = `ws://${host}:${port}${endpoint}`;

module.exports = mqtt.connect(connectUrl);