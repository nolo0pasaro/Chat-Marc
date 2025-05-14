const firebaseConfig = {
    apiKey: "AIzaSyCZmfYwT85s26yf86X0RA-MV2zw0dk9itU",
    authDomain: "chat-social-57567.firebaseapp.com",
    databaseURL: "https://chat-social-57567-default-rtdb.firebaseio.com",
    projectId: "chat-social-57567",
    storageBucket: "chat-social-57567.firebasestorage.app",
    messagingSenderId: "244903451829",
    appId: "1:244903451829:web:a7bbfaef074bb78dc272fc"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION)
  .catch((error) => {
    console.error("Erro na configuração de persistência:", error);
  });

let currentUser = null;
let messagesListener = null;

// Controle de navegação
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');
}

// Monitorar mensagens em tempo real
function setupPublicChat() {
    if (messagesListener) {
        messagesListener.off();
    }

    const messagesRef = database.ref('publicMessages');
    messagesListener = messagesRef
        .orderByChild('timestamp')
        .limitToLast(100);
    
    messagesListener.on('child_added', (snapshot) => {
        const message = snapshot.val();
        // Verifica se a mensagem já existe antes de exibir
        if (!document.getElementById(`msg-${snapshot.key}`)) {
            displayMessage(message, snapshot.key);
        }
    });
}

// Exibir mensagens
function displayMessage(message, messageId) {
    const messagesContainer = document.getElementById('messages-container');
    const messageDiv = document.createElement('div');
    messageDiv.id = `msg-${messageId}`; // ID único para cada mensagem
    messageDiv.className = `message ${message.senderId === currentUser.uid ? 'own-message' : ''}`;
    messageDiv.innerHTML = `
        <div class="message-header">
            <strong>${message.senderName}</strong>
            <small>${new Date(message.timestamp).toLocaleTimeString()}</small>
        </div>
        <div class="message-text">${message.text}</div>
    `;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Autenticação
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        showSection('chat-section');
        setupPublicChat();
        
        database.ref(`users/${user.uid}`).update({
            email: user.email,
            lastOnline: firebase.database.ServerValue.TIMESTAMP
        });
    } else {
        // Limpa listeners ao deslogar
        if (messagesListener) {
            messagesListener.off('child_added');
            messagesListener = null;
        }
        showSection('auth-section');
    }
});

// Funções de login/cadastro
async function signUp() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        await database.ref(`users/${userCredential.user.uid}`).set({
            email: email,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
    } catch (error) {
        document.getElementById('auth-error').textContent = error.message;
    }
}

async function signIn() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        document.getElementById('auth-error').textContent = error.message;
    }
}

// Enviar mensagem
function sendMessage() {
    const messageInput = document.getElementById('message-input');
    const text = messageInput.value.trim();
    
    if (text && currentUser) {
        const newMessageRef = database.ref('publicMessages').push();
        newMessageRef.set({
            senderId: currentUser.uid,
            senderName: currentUser.email.split('@')[0], // Ou usar displayName se implementar
            text: text,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        messageInput.value = '';
    }
}

// Logout
function signOut() {
    if (messagesListener) {
        messagesListener.off('child_added');
    }
    auth.signOut();
}