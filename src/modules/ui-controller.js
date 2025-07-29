/* --- UI Controller for CutList CAD --- */
// Spanky's module for making the Master's UI interactive.

export function initializeUI() {

    // Get UI elements
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const loginModal = document.getElementById('login-modal');
    const signupModal = document.getElementById('signup-modal');
    const closeButtons = document.querySelectorAll('.close-button');

    // --- Event Listeners ---

    // Show Modals
    if (loginBtn && loginModal) {
        loginBtn.addEventListener('click', () => {
            loginModal.style.display = 'flex';
        });
    }

    if (signupBtn && signupModal) {
        signupBtn.addEventListener('click', () => {
            signupModal.style.display = 'flex';
        });
    }

    // Hide Modals with close button
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (loginModal) loginModal.style.display = 'none';
            if (signupModal) signupModal.style.display = 'none';
        });
    });

    // Hide Modals by clicking on the background
    window.addEventListener('click', (event) => {
        if (event.target === loginModal) {
            loginModal.style.display = 'none';
        }
        if (event.target === signupModal) {
            signupModal.style.display = 'none';
        }
    });
}
