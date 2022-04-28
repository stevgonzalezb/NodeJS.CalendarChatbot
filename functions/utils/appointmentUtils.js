const {checkDatesCalendar,createCalendarEvent}=require('../utils/calendarUtils')

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


  async function searchAvailability(agent) {
    console.log('INFO: Inicia seachAvailability Method')
    try {
      let res = await checkDatesCalendar(pFecha);

      if(res.length === 0){
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
      if(err === 0)
      {
        agent.add('Disculpa, ya hoy no hay citas disponibles. Recuerda que nuestro horario es de las 10am a las 7pm. Puedes inetentar con otro día.')
        console.log('INFO: Finzaliza satisfactoriamente seachAvailability Method - Fuera de horario')
      }
    }
  }

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

  module.exports={
      confirmHour,
      makeAppointment,
      searchAvailability
  }