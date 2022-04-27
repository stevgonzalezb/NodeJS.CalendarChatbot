'use strict';

const functions = require('firebase-functions');
const {google} = require('googleapis');
const {WebhookClient} = require('dialogflow-fulfillment');
const moment = require('moment-timezone');
const { oAuth2Client } = require('./init/initialize_OAuth');
const {confirmHour,makeAppointment,searchAvailability}=require('./utils/appointmentUtils')



const calendarId_Brandon = ""
const calendar = google.calendar({ version: 'v3', auth: oAuth2Client })
const timeZone = 'America/Costa_Rica';
const timeZoneOffset = '-06:00';
process.env.DEBUG = 'dialogflow:*'; // enables lib debugging statements


exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {

  const agent = new WebhookClient({ request, response });
  const pFecha = moment(agent.parameters.date).tz('America/Costa_Rica');
  //Mapeo de Intents - Funciones
  let intentMap = new Map();
  intentMap.set('Agendar Cita-fecha', searchAvailability);
  intentMap.set('Agendar Cita-hora', confirmHour);
  intentMap.set('Agendar Cita-hora - yes', makeAppointment);
  agent.handleRequest(intentMap);
});

