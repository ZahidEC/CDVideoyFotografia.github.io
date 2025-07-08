document.addEventListener('DOMContentLoaded', function() {
    // Configuración de Firebase (reemplaza con tus credenciales)
    const firebaseConfig = {
        apiKey: "TU_API_KEY",
        authDomain: "TU_PROYECTO.firebaseapp.com",
        projectId: "TU_PROYECTO",
        storageBucket: "TU_PROYECTO.appspot.com",
        messagingSenderId: "TU_SENDER_ID",
        appId: "TU_APP_ID"
    };

    // Inicializar Firebase
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const auth = firebase.auth();

    // Elementos del DOM
    const calendarEl = document.getElementById('calendar');
    const bookingForm = document.getElementById('bookingForm');
    const loginAlert = document.getElementById('loginAlert');
    const userDisplay = document.getElementById('userDisplay');
    const logoutBtn = document.getElementById('logoutBtn');

    // Verificar estado de autenticación
    auth.onAuthStateChanged(user => {
        if (user) {
            // Usuario logueado
            loginAlert.style.display = 'none';
            userDisplay.textContent = `Bienvenido, ${user.displayName || user.email}`;
            userDisplay.style.display = 'block';
            logoutBtn.style.display = 'block';
            initCalendar();
        } else {
            // Usuario no logueado
            loginAlert.style.display = 'block';
            userDisplay.style.display = 'none';
            logoutBtn.style.display = 'none';
            window.location.href = 'login.html';
        }
    });

    // Inicializar calendario
    function initCalendar() {
        const calendar = new FullCalendar.Calendar(calendarEl, {
            locale: 'es', // Configuración para español
            initialView: 'dayGridMonth',
            selectable: true,
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek'
            },
            businessHours: {
                daysOfWeek: [1, 2, 3, 4, 5], // Lunes a Viernes
                startTime: '09:00',
                endTime: '18:00'
            },
            dateClick: function(info) {
                if (info.date < new Date()) {
                    alert('No puedes seleccionar fechas pasadas');
                    return;
                }
                document.getElementById('selectedDate').value = info.dateStr;
                updateTimeSlots(info.dateStr);
            },
            events: function(fetchInfo, successCallback, failureCallback) {
                // Obtener eventos desde Firebase
                db.collection('bookings')
                    .where('date', '>=', fetchInfo.startStr)
                    .where('date', '<=', fetchInfo.endStr)
                    .get()
                    .then(querySnapshot => {
                        const events = [];
                        querySnapshot.forEach(doc => {
                            const data = doc.data();
                            events.push({
                                id: doc.id,
                                title: 'Reservado',
                                start: `${data.date}T${data.time}`,
                                backgroundColor: data.status === 'confirmed' ? '#28a745' : '#ffc107',
                                borderColor: data.status === 'confirmed' ? '#28a745' : '#ffc107',
                                extendedProps: {
                                    bookingData: data
                                }
                            });
                        });
                        successCallback(events);
                    })
                    .catch(error => {
                        console.error("Error al cargar eventos: ", error);
                        failureCallback(error);
                    });
            },
            eventDidMount: function(info) {
                // Mostrar tooltip con información de la reserva
                const tooltip = new bootstrap.Tooltip(info.el, {
                    title: `Cliente: ${info.event.extendedProps.bookingData.userName}<br>
                            Paquete: ${info.event.extendedProps.bookingData.package}<br>
                            Estado: ${info.event.extendedProps.bookingData.status}`,
                    html: true,
                    placement: 'top',
                    trigger: 'hover',
                    container: 'body'
                });
            }
        });

        calendar.render();

        // Cargar eventos al iniciar
        calendar.refetchEvents();
    }

    // Actualizar slots de tiempo disponibles
    function updateTimeSlots(date) {
        const timeSlotSelect = document.getElementById('timeSlot');
        timeSlotSelect.innerHTML = '<option value="" selected disabled>Selecciona una hora</option>';
        
        // Horas disponibles base
        const allSlots = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];
        
        // Obtener horas ya reservadas para esta fecha
        db.collection('bookings')
            .where('date', '==', date)
            .get()
            .then(querySnapshot => {
                const bookedSlots = [];
                querySnapshot.forEach(doc => {
                    bookedSlots.push(doc.data().time);
                });
                
                // Filtrar horas disponibles
                const availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot));
                
                if (availableSlots.length === 0) {
                    const option = document.createElement('option');
                    option.textContent = 'No hay horarios disponibles';
                    option.disabled = true;
                    timeSlotSelect.appendChild(option);
                } else {
                    availableSlots.forEach(slot => {
                        const option = document.createElement('option');
                        option.value = slot;
                        option.textContent = slot;
                        timeSlotSelect.appendChild(option);
                    });
                }
            })
            .catch(error => {
                console.error("Error al cargar horarios: ", error);
                alert('Error al cargar horarios disponibles');
            });
    }

    // Manejar reserva
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Procesando...';

        const user = auth.currentUser;
        if (!user) {
            alert('Por favor inicia sesión para reservar');
            window.location.href = 'login.html';
            return;
        }

        const bookingData = {
            date: document.getElementById('selectedDate').value,
            time: document.getElementById('timeSlot').value,
            package: document.getElementById('package').value,
            notes: document.getElementById('notes').value,
            userId: user.uid,
            userName: user.displayName || user.email,
            userEmail: user.email,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            // Verificar disponibilidad final
            const snapshot = await db.collection('bookings')
                .where('date', '==', bookingData.date)
                .where('time', '==', bookingData.time)
                .get();

            if (!snapshot.empty) {
                throw new Error('Este horario ya ha sido reservado. Por favor selecciona otro.');
            }

            // Crear reserva
            await db.collection('bookings').add(bookingData);
            
            // Mostrar confirmación
            const modal = new bootstrap.Modal(document.getElementById('confirmationModal'));
            document.getElementById('modalDate').textContent = formatDate(bookingData.date);
            document.getElementById('modalTime').textContent = bookingData.time;
            document.getElementById('modalPackage').textContent = document.getElementById('package').options[document.getElementById('package').selectedIndex].text;
            modal.show();

            // Resetear formulario
            bookingForm.reset();
            
            // Actualizar calendario
            const calendar = FullCalendar.getApi(calendarEl);
            calendar.refetchEvents();
        } catch (error) {
            console.error("Error al reservar: ", error);
            alert('Error al reservar: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Confirmar Reserva';
        }
    });

    // Cerrar sesión
    logoutBtn.addEventListener('click', () => {
        auth.signOut()
            .then(() => {
                window.location.href = 'login.html';
            })
            .catch(error => {
                alert('Error al cerrar sesión: ' + error.message);
            });
    });

    // Formatear fecha en español
    function formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }
});