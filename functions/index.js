'use strict';

const functions = require('firebase-functions');
const {google} = require('googleapis');
const {WebhookClient} = require('dialogflow-fulfillment');
const { OAuth2 } = google.auth
const moment = require('moment-timezone');


// Create a new instance of oAuth and set our Client ID & Client Secret.
const oAuth2Client = new OAuth2(
  '998451104891-nrac98l3pntj6tke4cm6q0k0ifeehqqt.apps.googleusercontent.com',
  'NmGZnzPN361EITV0UcpnaOew'
)
oAuth2Client.setCredentials({
  refresh_token: '1//044ZqEvaKN-dfCgYIARAAGAQSNwF-L9IrrySW-5SbHqJelBi-G4xbIbnqDsKv3MnC-MfISdGIJ49-aVmUgN2PlJt1SQDup5iD9KM',
})


// Enter your calendar ID below and service account JSON below
const calendarId_Brandon = "s1tt67eiflb120io7tif3pmpp0@group.calendar.google.com"

const calendar = google.calendar({ version: 'v3', auth: oAuth2Client })
process.env.DEBUG = 'dialogflow:*'; // enables lib debugging statements


const timeZone = 'America/Costa_Rica';
const timeZoneOffset = '-06:00';


exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {

  const agent = new WebhookClient({ request, response });

  const appointment_type = agent.parameters.AppointmentType

  function makeAppointment (agent) {
    // Calculate appointment start and end datetimes (end = +1hr from start)
    //console.log("Parameters", agent.parameters.date);
    const dateTimeStart = new Date(Date.parse(agent.parameters.date.split('T')[0] + 'T' + agent.parameters.time.split('T')[1].split('-')[0] + timeZoneOffset));
    const dateTimeEnd = new Date(new Date(dateTimeStart).setHours(dateTimeStart.getHours() + 0,30));
    const appointmentTimeString = dateTimeStart.toLocaleString(
      'en-US',
      { month: 'short', day: 'numeric', hour: 'numeric', timeZone: timeZone }
    );


    const event = {
      summary: `Cita ${appointment_type}`,
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

    const pFecha = new Date(Date.parse(agent.parameters.date.split('T')[0] + 'T' + agent.parameters.date.split('T')[1].split('-')[0] + timeZoneOffset));

    return checkDatesCalendar(pFecha).then((res) =>{

      agent.add('Las horas disponibles son las siguientes: \n' +
                '*1* - ' + moment(res[0]).tz('America/Costa_Rica').format('MM/D/YYYY, h:mm a') +'\n'+
                '*2* - ' + moment(res[1]).tz('America/Costa_Rica').format('MM/D/YYYY, h:mm a') +'\n'+
                '*3* - ' + moment(res[2]).tz('America/Costa_Rica').format('MM/D/YYYY, h:mm a') +'\n'+
                '*4* - ' + moment(res[3]).tz('America/Costa_Rica').format('MM/D/YYYY, h:mm a'));

    }).catch((err) =>{

      agent.add(err.message);

    })
  }

  function confirmHour(agent) {

    const pFecha = new Date(Date.parse(agent.parameters.date.split('T')[0] + 'T' + agent.parameters.date.split('T')[1].split('-')[0] + timeZoneOffset));
    
    return checkDatesCalendar(pFecha).then((res) =>{

      let num = parseInt(agent.parameters.number);
      agent.add('Usted eligió: ' + num);

      agent.add('Usted eligió: \n' +
                '*'+ num +'* - ' + moment(res[num-1]).tz('America/Costa_Rica').format('MM/D/YYYY, h:mm a'));

    }).catch((err) =>{

      agent.add(err.message);

    })
  }



  let intentMap = new Map();
  intentMap.set('Agendar Cita', makeAppointment);
  intentMap.set('Agendar Cita - Agendar - fecha', searchAvailability);
  intentMap.set('Agendar Cita - Agendar - fecha - select.number', confirmHour);
  agent.handleRequest(intentMap);
});



function checkDatesCalendar(psFecha){
  return new Promise((resolve, reject) => {

    const fechaHoy = moment().tz('America/Costa_Rica');


    switch(psFecha.getDate())
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

        //console.log('FREE BUSY: ' + events);

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


      /*for (let index = 0; index < hourSlots.length; index++) {
        console.log('FREE HOUR SLOTS ' + index + ': ' + moment(hourSlots[index]).tz('America/Costa_Rica').format('MMMM Do YYYY, h:mm:ss a'));
      }*/
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






//function createCalendarEvent_old (dateTimeStart, dateTimeEnd, appointment_type) {
//  return new Promise((resolve, reject) => {
//    calendar.events.list({
//      auth: serviceAccountAuth, // List events for time period
//      calendarId: calendarId,
//      timeMin: dateTimeStart.toISOString(),
//      timeMax: dateTimeEnd.toISOString()
//    }, (err, calendarResponse) => {
      // Check if there is a event already on the Calendar
//      if (err || calendarResponse.data.items.length > 0) {
//        reject(err || new Error('Requested time conflicts with another appointment'));
//      } else {
        // Create event for the requested time period
//        calendar.events.insert({ auth: serviceAccountAuth,
//          calendarId: calendarId,
//          resource: {summary: appointment_type +' Cita', description: appointment_type,
//            start: {dateTime: dateTimeStart},
//            end: {dateTime: dateTimeEnd}}
//        }, (err, event) => {
//          err ? reject(err) : resolve(event);
//        }
//        );
//      }
//    });
//  });
//}


 //function getPendientes(agent) {
 //   return getDataQueue().then (res =>{
 //       console.log(JSON.parse(res));
        
 //     res.data.map(dato => {
 //       console.log(dato[1]);
 //       agent.add(`Pendientes: ${dato[1]}.`);
 //       return null;
 //     });     
 //       return null;
 //   });
// }

 //function getDataQueue() {
 // return axios.get('https://sheets.googleapis.com/v4/spreadsheets/1EcJJ3kb2j1wBtn4GaWuil6OHex_6zY8UBHyMTj-AWic/values/B2/?key=AIzaSyDNQ4YIVBRbCj-jHpRBre4s7Luo0zY-rMI');
//}