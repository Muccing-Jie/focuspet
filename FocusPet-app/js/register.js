/**
 * FocusPet - Register Page JavaScript
 * Validasi form registrasi dan toggle password visibility
 */

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('registerForm');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const passwordError = document.getElementById('passwordError');
    const registerButton = document.getElementById('registerButton');

    // Toggle password visibility
    const togglePassword = document.getElementById('togglePassword');
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');

    togglePassword.addEventListener('click', function () {
        togglePasswordField(passwordInput, this);
    });

    toggleConfirmPassword.addEventListener('click', function () {
        togglePasswordField(confirmPasswordInput, this);
    });

    function togglePasswordField(input, button) {
        const eyeIcon = button.querySelector('.eye-icon');
        const eyeOffIcon = button.querySelector('.eye-off-icon');

        if (input.type === 'password') {
            input.type = 'text';
            eyeIcon.style.display = 'none';
            eyeOffIcon.style.display = 'block';
            button.setAttribute('aria-label', 'Sembunyikan password');
        } else {
            input.type = 'password';
            eyeIcon.style.display = 'block';
            eyeOffIcon.style.display = 'none';
            button.setAttribute('aria-label', 'Tampilkan password');
        }
    }

    // Validasi real-time saat user mengetik konfirmasi password
    confirmPasswordInput.addEventListener('input', validatePasswordMatch);
    passwordInput.addEventListener('input', function () {
        // Jika konfirmasi sudah diisi, validasi ulang
        if (confirmPasswordInput.value.length > 0) {
            validatePasswordMatch();
        }
    });

    function validatePasswordMatch() {
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (confirmPassword.length === 0) {
            // Reset state jika kosong
            passwordError.classList.remove('visible');
            confirmPasswordInput.classList.remove('input-error', 'input-success');
            return false;
        }

        if (password !== confirmPassword) {
            // Password tidak cocok
            passwordError.textContent = 'Password tidak cocok!';
            passwordError.classList.add('visible');
            confirmPasswordInput.classList.add('input-error');
            confirmPasswordInput.classList.remove('input-success');
            return false;
        } else {
            // Password cocok
            passwordError.classList.remove('visible');
            confirmPasswordInput.classList.remove('input-error');
            confirmPasswordInput.classList.add('input-success');
            return true;
        }
    }
});

/**
 * Handle form submit registrasi
 */
function handleRegister(event) {
    event.preventDefault();

    const fullname = document.getElementById('fullname').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const passwordError = document.getElementById('passwordError');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const registerButton = document.getElementById('registerButton');

    // Validasi nama lengkap
    if (fullname.length < 2) {
        alert('Nama lengkap harus minimal 2 karakter.');
        document.getElementById('fullname').focus();
        return false;
    }

    // Validasi password minimal 6 karakter
    if (password.length < 6) {
        alert('Password harus minimal 6 karakter.');
        document.getElementById('password').focus();
        return false;
    }

    // Validasi password cocok
    if (password !== confirmPassword) {
        passwordError.textContent = 'Password tidak cocok!';
        passwordError.classList.add('visible');
        confirmPasswordInput.classList.add('input-error');
        confirmPasswordInput.classList.remove('input-success');
        confirmPasswordInput.focus();
        return false;
    }

    // Tampilkan loading state
    registerButton.textContent = 'Mendaftar...';
    registerButton.classList.add('loading');
    registerButton.disabled = true;

    // Kirim data ke API backend
    fetch('http://localhost/focuspet-api/register.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            fullname: fullname,
            email: email,
            password: password
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            alert('Registrasi berhasil! Silakan login.');
            window.location.href = 'login.html';
        } else {
            alert(data.message || 'Registrasi gagal. Silakan coba lagi.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Gagal terhubung ke server backend. Pastikan PHP Server sudah jalan!');
    })
    .finally(() => {
        // Reset button state
        registerButton.textContent = 'Daftar';
        registerButton.classList.remove('loading');
        registerButton.disabled = false;
    });

    return false;
}
