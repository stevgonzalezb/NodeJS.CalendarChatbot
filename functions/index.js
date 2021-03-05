'use strict';

const functions = require('firebase-functions');
const {google} = require('googleapis');
const {WebhookClient} = require('dialogflow-fulfillment');
const { OAuth2 } = google.auth
const moment = require('moment-timezone');


//Credenciales de autenticación chatbotcr
const oAuth2Client = new OAuth2(
  '',
  ''
)
oAuth2Client.setCredentials({
  refresh_token: '',
})

const calendarId_Brandon = ""
const calendar = google.calendar({ version: 'v3', auth: oAuth2Client })
const timeZone = 'America/Costa_Rica';
const timeZoneOffset = '-06:00';
process.env.DEBUG = 'dialogflow:*'; // enables lib debugging statements


exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {

  const agent = new WebhookClient({ request, response });
  const pFecha = moment(agent.parameters.date).tz('America/Costa_Rica');

  async function makeAppointment (agent) {
    console.log('INFO: Inicia makeAppointment Method');

    let contextIn = agent.context.get('confirm-date');
    let dateTimeStart = moment(contextIn.parameters.date).tz('America/Costa_Rica');
    let dateTimeEnd =  moment(contextIn.parameters.date).tz('America/Costa_Rica').add(30, 'm');
    let appointmentTimeString = dateTimeStart.toLocaleString(
      'es-US',
      { month: 'short', day: 'numeric', hour: 'numeric' }
    );

    let event = {
      summary: `${contextIn.parameters.name} - CITA CHATBOT`,
      description: ` `,
      colorId: 1,
      start: {
        dateTime: dateTimeStart,
        timeZone: timeZone,
      },
      end: {
        dateTime: dateTimeEnd,
        timeZone: timeZone,
      },
    }

    console.log('INFO: Event Object Created - ' + event.summary);

    try {
      await createCalendarEvent(event, dateTimeStart, dateTimeEnd);
      agent.add(`Perfecto hemos agendado tu cita!!🤖📆 Te esperamos el ${moment(dateTimeStart).tz('America/Costa_Rica').format('D/MM/YYYY, h:mm a')}.\n\nRecuerda porfavor llegar 10 minutos antes de la cita e ir solamente la persona que se cortará el cabello. 🙂`);
      console.log('INFO: Finaliza satisfactoriamente makeAppointment Method');
      return null;
    }
    catch (e) {
      agent.add(`Disculpa, no hay espacio disponible a las ${appointmentTimeString}.`);
    }
  }

  async function searchAvailability(agent) {
    console.log('INFO: Inicia seachAvailability Method')
    try {
      let res = await checkDatesCalendar(pFecha);

      if(res.length == 0){
          agent.add('Lo lamento, este dia ya no hay citas diponibles, puedes intentar con otro. \n\n'+
                    '_Recuerda que me puedes decir el dia o fecha en específico_ 🕐✂️');
          console.log('INFO: Finzaliza satisfactoriamente seachAvailability Method - Dia Ocupado')
      }
      else{

        let arrHours = '';
        let topCitas = res.length;
        for (let index = 0; index < res.length; index++) {
          arrHours = arrHours + `*${index + 1}* - ${moment(res[index]).tz('America/Costa_Rica').format('D/MM/YYYY, h:mm a')} \n`;
        }
        agent.add('Revisando las citas, hay disponibilidad en las siguientes horas: 🕐✂️  \n\n' +
          '_Selecciona un número_' + '\n' + arrHours);
        agent.context.set({ name: "count-hours", lifespan: 2, parameters: { counter: topCitas} });
        console.log('INFO: Finzaliza satisfactoriamente seachAvailability Method')
      }
    }
    catch (err) {
      if(err == 0)
      {
        agent.add('Disculpa, ya hoy no hay citas disponibles. Recuerda que nuestro horario es de las 10am a las 7pm. Puedes inetentar con otro día.')
        console.log('INFO: Finzaliza satisfactoriamente seachAvailability Method - Fuera de horario')
      }
    }
  }

  async function confirmHour(agent) {

    console.log('INFO: Inicia confirmHour Method');

    let pFecha2 = agent.context.get('date');
    let name = agent.context.get('person-name');
    let inCounter = agent.context.get('count-hours');
    let num = parseInt(agent.parameters.number);
    let dateCounter = parseInt(inCounter.parameters.counter);

    console.log('INFO: Confirma hora cliente: ' + name.parameters.name.name);

    if(num<=dateCounter)
    {
      try {
        let res = await checkDatesCalendar(moment(pFecha2.parameters.date).tz('America/Costa_Rica'));
        agent.add('Excelente ' + name.parameters.name.name + ', guardaré la cita a su nombre el dia: ' + moment(res[num - 1]).tz('America/Costa_Rica').format('D/MM/YYYY, h:mm a') +
          '\n\n*Sí* - Confirmar' +
          '\n*A* - Agendar otra fecha');
        agent.context.set({ name: "confirm-date", lifespan: 3, parameters: { date: res[num - 1], name: name.parameters.name.name } });
        console.log('INFO: Finaliza satisfactoriamente confirmHour Method');
      } 
      catch (err) {
        agent.add(err.message);
      }
    }
    else{
      agent.add('Por favor ingresa un número de los que se encuentran en la lista.');
    }
  }

  //Mapeo de Intents - Funciones
  let intentMap = new Map();
  intentMap.set('Agendar Cita-fecha', searchAvailability);
  intentMap.set('Agendar Cita-hora', confirmHour);
  intentMap.set('Agendar Cita-hora - yes', makeAppointment);
  agent.handleRequest(intentMap);
});



function checkDatesCalendar(psFecha){
  return new Promise(async (resolve, reject) => {

    let fechaHoy = moment().tz('America/Costa_Rica');

    switch(psFecha.date())
    {
      case fechaHoy.date():
        if (fechaHoy.hour() < 10){
          try {
            let res = await validateCalendar(psFecha, 10);
            resolve(res);
          }
          catch (err) {
            reject(err.message);
          }
        }
        else {
            if(fechaHoy.hour() >= 10 && fechaHoy.hour() < 18){
              try {
                let res = await validateCalendar(psFecha, moment().tz('America/Costa_Rica').hour());
                resolve(res);
              }
              catch (err) {
                reject(err.message);
              }
            }   
          else{
            reject(0);
          }         
        }  
        break;
      
      case fechaHoy.date()+1:
        try {
          let res_1 = await validateCalendar(psFecha, 10);
          resolve(res_1);
        }
        catch (err_1) {
          reject(err_1.message);
        }
      break;

      default:
        try {
          let res_2 = await validateCalendar(psFecha, 10);
          resolve(res_2);
        }
        catch (err_2) {
          reject(err_2.message);
        }
        break;
    }
  });
}


function validateCalendar (psDateTimeStart, psInitialHour) {
  return new Promise((resolve, reject) => {
    var startDate = moment(psDateTimeStart).tz('America/Costa_Rica');
    startDate.hours(psInitialHour);
    var endDate = moment(psDateTimeStart).tz('America/Costa_Rica');
    endDate.hours(19);

    let freeSlots = []; 
    let hourSlots = [];
    let events;

    calendar.freebusy.query(
      {
        resource: {
          timeMin: startDate,
          timeMax: endDate,
          timeZone: timeZone,
          items: [{ id: calendarId_Brandon }],
        },
      },
      (err, res) => {
        if (err) return console.error('Free Busy Query Error: ', err)

        events = res.data.calendars[calendarId_Brandon].busy

        events.forEach(function (event, index) { 
          if (index == 0 && new Date(startDate) < new Date(event.start)) {
              freeSlots.push({startDate: startDate, endDate: event.start});
          }
          if (index == 0) {
              startDate = event.end;
          }
          else if (events[index - 1].end < event.start) {
              freeSlots.push({startDate: events[index - 1].end, endDate: event.start});
          }
    
          if (events.length == (index + 1) && new Date(event.end) < endDate) {
              freeSlots.push({startDate: event.end, endDate: endDate});
          }
      });
    
    
      if (events.length == 0) {
          freeSlots.push({startDate: startDate, endDate: endDate});
      }

      freeSlots.forEach(function(free, index){
        var freeHours = (((new Date(free.endDate).getTime() - new Date(free.startDate).getTime()) / 1000) / 60) / 30 
        let freeH = new Date(free.startDate);
        
        for (let i = 0; i < freeHours ; i++) {
          if (i === 0){
            hourSlots.push(free.startDate);
          }
          else{
            hourSlots.push(freeH.setMinutes(freeH.getMinutes()+30));  
          }
        }
      
      })
      resolve(hourSlots);
      }
    )

  });
}


function createCalendarEvent (psEvent, psDateTimeStart, psDateTimeEnd) {
  return new Promise((resolve, reject) => {
  calendar.freebusy.query(
    {
      resource: {
        timeMin: psDateTimeStart,
        timeMax: psDateTimeEnd,
        timeZone: timeZone,
        items: [{ id: calendarId_Brandon }],
      },
    },
    (err, res) => {
      if (err) return console.error('Free Busy Query Error: ', err)
  
      const eventArr = res.data.calendars[calendarId_Brandon].busy;

      if (eventArr.length === 0)
        return calendar.events.insert(
          { calendarId: calendarId_Brandon, resource: psEvent },
          err => {
            if (err) return console.error('Error Creating Calender Event:', err)
            resolve(psEvent)
          }
        )
      reject(err || new Error('Requested time conflicts with another appointment'));
    }
  )
});
}
