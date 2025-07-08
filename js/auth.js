

    // ========== REGISTRO DE USUARIO ==========
    if(signupForm) {
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const firstName = document.getElementById('firstName').value;
            const lastName = document.getElementById('lastName').value;
            const phone = document.getElementById('phone').value;

            // Validaciones
            if (password !== confirmPassword) {
                showError(document.getElementById('confirmPassword'), 'Las contraseñas no coinciden');
                return;
            }

            if (password.length < 6) {
                showError(document.getElementById('registerPassword'), 'La contraseña debe tener al menos 6 caracteres');
                return;
            }

            // Registrar usuario
            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    return db.collection('users').doc(userCredential.user.uid).set({
                        firstName: firstName,
                        lastName: lastName,
                        phone: phone,
                        email: email,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        role: 'client'
                    });
                })
                .then(() => {
                    return auth.currentUser.sendEmailVerification();
                })
                .then(() => {
                    alert('¡Registro exitoso! Por favor verifica tu correo electrónico.');
                    return checkUserRole(auth.currentUser.uid);
                })
                .catch((error) => {
                    showError(signupForm, getErrorMessage(error.code));
                });
        });
    }

    // ========== INICIO DE SESIÓN ==========
    if(loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    if (!userCredential.user.emailVerified) {
                        auth.signOut();
                        showError(loginForm, 'Por favor verifica tu correo electrónico antes de iniciar sesión');
                        return;
                    }
                    
                    return checkUserRole(userCredential.user.uid);
                })
                .catch((error) => {
                    showError(loginForm, getErrorMessage(error.code));
                });
        });
    }


// Verificar rol de usuario
function checkUserRole(uid) {
    return db.collection('users').doc(uid).get()
        .then((doc) => {
            if (doc.exists) {
                const userData = doc.data();
                if (userData.role === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'reservas.html';
                }
            }
        });
}

// Mostrar errores
function showError(element, message) {
    // Limpiar errores previos
    const existingError = element.parentNode.querySelector('.alert-danger');
    if(existingError) existingError.remove();
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger mt-3';
    errorDiv.textContent = message;
    
    element.parentNode.insertBefore(errorDiv, element.nextSibling);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Mensajes de error
function getErrorMessage(errorCode) {
    const messages = {
        'auth/email-already-in-use': 'El correo ya está registrado',
        'auth/invalid-email': 'Correo electrónico inválido',
        'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
        'auth/user-not-found': 'Usuario no encontrado',
        'auth/wrong-password': 'Contraseña incorrecta',
        'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde',
        'auth/account-exists-with-different-credential': 'Este correo ya está registrado con otro método',
        'auth/popup-closed-by-user': 'El popup fue cerrado antes de completar la autenticación',
        'auth/cancelled-popup-request': 'Se inició un nuevo popup antes de que terminara el anterior',
        'auth/popup-blocked': 'El popup fue bloqueado por el navegador'
    };
    return messages[errorCode] || 'Ocurrió un error. Por favor intenta nuevamente.';
}