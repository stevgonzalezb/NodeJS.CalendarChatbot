'use strict';

const functions = require('firebase-functions');
const {google} = require('googleapis');
const {WebhookClient} = require('dialogflow-fulfillment');
const { OAuth2 } = google.auth
const moment = require('moment-timezone');


//Credenciales de autenticación chatbotcr
const oAuth2Client = new OAuth2(
  '998451104891-nrac98l3pntj6tke4cm6q0k0ifeehqqt.apps.googleusercontent.com',
  'NmGZnzPN361EITV0UcpnaOew'
)
oAuth2Client.setCredentials({
  refresh_token: '1//044ZqEvaKN-dfCgYIARAAGAQSNwF-L9IrrySW-5SbHqJelBi-G4xbIbnqDsKv3MnC-MfISdGIJ49-aVmUgN2PlJt1SQDup5iD9KM',
})

const calendarId_Brandon = "s1tt67eiflb120io7tif3pmpp0@group.calendar.google.com"
const calendar = google.calendar({ version: 'v3', auth: oAuth2Client })
const timeZone = 'America/Costa_Rica';
const timeZoneOffset = '-06:00';
process.env.DEBUG = 'dialogflow:*'; // enables lib debugging statements


exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {

  const agent = new WebhookClient({ request, response });
  const pFecha = moment(agent.parameters.date).tz('America/Costa_Rica');

  function makeAppointment (agent) {

    const contextIn = agent.context.get('confirm-date');
    const dateTimeStart = moment(contextIn.parameters.date).tz('America/Costa_Rica');
    const dateTimeEnd =  moment(contextIn.parameters.date).tz('America/Costa_Rica').add(30, 'm'); //new Date(new Date(dateTimeStart).setHours(dateTimeStart.getHours() + 0,30));
    const appointmentTimeString = dateTimeStart.toLocaleString(
      'en-US',
      { month: 'short', day: 'numeric', hour: 'numeric', timeZone: timeZone }
    );

    const event = {
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
    console.log('FECHAS CREATE: ' + contextIn.parameters.name +' -- '+ moment(contextIn.parameters.date).tz('America/Costa_Rica') +' -- '+ new Date(contextIn.parameters.date));
    // Check the availibility of the time, and make an appointment if there is time on the calendar
    return createCalendarEvent(event, dateTimeStart, dateTimeEnd).then(() => {
      agent.add(`Perfecto hemos agendado tu cita!!.😀
      Te esperamos el ${appointmentTimeString}.`);
     return null;
    }).catch(() => {
      agent.add(`Disculpa, no hay espacio disponible a las ${appointmentTimeString}.`);
    });
  }

  function searchAvailability(agent) {

    return checkDatesCalendar(pFecha).then((res) =>{

      agent.add('Las horas disponibles son las siguientes: \n' +
                '*1* - ' + moment(res[0]).tz('America/Costa_Rica').format('D/MM/YYYY, h:mm a') +'\n'+
                '*2* - ' + moment(res[1]).tz('America/Costa_Rica').format('D/MM/YYYY, h:mm a') +'\n'+
                '*3* - ' + moment(res[2]).tz('America/Costa_Rica').format('D/MM/YYYY, h:mm a') +'\n'+
                '*4* - ' + moment(res[3]).tz('America/Costa_Rica').format('D/MM/YYYY, h:mm a'));

    }).catch((err) =>{

      agent.add(err.message);

    })
  }

  function confirmHour(agent) {

    const pFecha2 = agent.context.get('date');
    const name = agent.context.get('person-name');
    const num = parseInt(agent.parameters.number);
    console.log(name.parameters.name +' '+ toString(name.parameters.name));
    return checkDatesCalendar(moment(pFecha2.parameters.date).tz('America/Costa_Rica')).then((res) =>{ 

      agent.add(name.parameters.name.name + ', usted eligió: '+ moment(res[num-1]).tz('America/Costa_Rica').format('D/MM/YYYY, h:mm a') + 
                '\n*Sí* - Confirmar' + 
                '\n*No* - Cancelar');

      agent.context.set({name:"confirm-date", lifespan: 5, parameters:{date: res[num-1], name: name.parameters.name.name}});

    }).catch((err) =>{

      agent.add(err.message);

    })
  }

  //Mapeo de Intents - Funciones
  let intentMap = new Map();
  intentMap.set('Agendar Cita - Agendar - fecha', searchAvailability);
  intentMap.set('Agendar Cita - Agendar - fecha - select.number', confirmHour);
  intentMap.set('Agendar Cita - Agendar - fecha - select.number - yes', makeAppointment);
  agent.handleRequest(intentMap);
});



function checkDatesCalendar(psFecha){
  return new Promise((resolve, reject) => {

    const fechaHoy = moment().tz('America/Costa_Rica');

    switch(psFecha.date())
    {
      case fechaHoy.date():

        //if (fechaHoy.hour < 20 & (fechaHoy.day() >= 1 && fechaHoy.day() < 7))
        //{
          return validateCalendar(psFecha).then((res) =>{

            resolve(res);
    
          }).catch((err) =>{
    
          reject(err.message);
    
          })
        //}
        //else
          //reject(new Error('Disculpa, hoy no hay citas disponibles. Recuerda que nuestro horario es de L-V hasta las 8PM.'));
        break;
      
      case fechaHoy.date()+1:
        return validateCalendar(psFecha).then((res) =>{

          resolve(res);
    
        }).catch((err) =>{
    
         reject(err.message);
    
        })
      break;

      default:
        return validateCalendar(psFecha).then((res) =>{

          resolve(res);
    
        }).catch((err) =>{
    
         reject(err.message);
    
        })
        break;
    }
  });
}


function validateCalendar (psDateTimeStart) {
  return new Promise((resolve, reject) => {
    var startDate = moment(psDateTimeStart).tz('America/Costa_Rica');//new Date(psDateTimeStart);
    startDate.hours(8);
    var endDate = moment(psDateTimeStart).tz('America/Costa_Rica');//new Date(psDateTimeStart);
    endDate.hours(20);

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
        // Check for errors in our query and log them if they exist.
        if (err) return console.error('Free Busy Query Error: ', err)

        events = res.data.calendars[calendarId_Brandon].busy

        events.forEach(function (event, index) { //calculate free from busy times
          //console.log('EVENT: ' + event.start +' // '+ event.end );
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
    
      //console.log('FREE SLOTS COUNT: ' + freeSlots.length );

      freeSlots.forEach(function(free, index){
        var freeHours = (((new Date(free.endDate).getTime() - new Date(free.startDate).getTime()) / 1000) / 60) / 30 
        let freeH = new Date(free.startDate);
        //console.log('FREE SLOTS: ' + free.startDate +' '+ free.endDate +' => '+ freeHours);
        
        for (let i = 0; i < freeHours ; i++) {
          if (i === 0){
            //console.log('PUSH: ' + new Date(free.startDate));
            hourSlots.push(free.startDate);
          }
          else{
            //console.log('PUSH: ' + new Date(freeH.setMinutes(freeH.getMinutes()+30)));
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
    console.log(moment(psDateTimeStart).tz('America/Costa_Rica').format('D/MM/YYYY, h:mm a') + ' // ' + moment(psDateTimeEnd).tz('America/Costa_Rica').format('D/MM/YYYY, h:mm a'));
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
      // Check for errors in our query and log them if they exist.
      if (err) return console.error('Free Busy Query Error: ', err)
  
      // Create an array of all events on our calendar during that time.
      const eventArr = res.data.calendars[calendarId_Brandon].busy;
  
      // Check if event array is empty which means we are not busy
      if (eventArr.length === 0)
        // If we are not busy create a new calendar event.
        return calendar.events.insert(
          { calendarId: calendarId_Brandon, resource: psEvent },
          err => {
            // Check for errors and log them if they exist.
            if (err) return console.error('Error Creating Calender Event:', err)
            // Else log that the event was created.
            resolve(psEvent)//console.log('Calendar event successfully created.')
          }
        )
  
      // If event array is not empty log that we are busy.
      reject(err || new Error('Requested time conflicts with another appointment')); //console.log(`Sorry I'm busy...`)
    }
  )
});
}
