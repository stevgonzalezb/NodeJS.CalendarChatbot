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
          else if(fechaHoy.hour() >= 10 && fechaHoy.hour() < 18){
                try {
                  let res = await validateCalendar(psFecha, moment().tz('America/Costa_Rica').hour());
                  resolve(res);
                }
                catch (err) {
                  reject(err.message);
                }
              }   
            else{
              // eslint-disable-next-line prefer-promise-reject-errors
              reject(0);
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
  
          events.forEach((event, index) => { 
            if (index === 0 && new Date(startDate) < new Date(event.start)) {
                freeSlots.push({startDate: startDate, endDate: event.start});
            }
            if (index === 0) {
                startDate = event.end;
            }
            else if (events[index - 1].end < event.start) {
                freeSlots.push({startDate: events[index - 1].end, endDate: event.start});
            }
      
            if (events.length === (index + 1) && new Date(event.end) < endDate) {
                freeSlots.push({startDate: event.end, endDate: endDate});
            }
        });
      
      
        if (events.length === 0) {
            freeSlots.push({startDate: startDate, endDate: endDate});
        }
  
        freeSlots.forEach((free, index) => {
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

  module.exports={
      checkDatesCalendar,
      createCalendarEvent,
      validateCalendar
  }