const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

function initTooltips() {
  const triggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  triggerList.forEach((el) => new bootstrap.Tooltip(el));
}

function showToast(message, kind = 'success') {
  const toastZone = document.getElementById('toastZone');
  if (!toastZone) return;

  const wrapper = document.createElement('div');
  wrapper.className = `toast align-items-center text-bg-${kind === 'success' ? 'success' : 'danger'} border-0 show mb-2`;
  wrapper.role = 'alert';
  wrapper.innerHTML = `<div class="d-flex"><div class="toast-body">${message}</div><button type="button" class="btn-close btn-close-white me-2 m-auto"></button></div>`;

  wrapper.querySelector('button').addEventListener('click', () => wrapper.remove());
  toastZone.appendChild(wrapper);
  setTimeout(() => wrapper.remove(), 4500);
}

function scorePassword(pwd) {
  let score = 0;
  if (pwd.length >= 8) score += 1;
  if (/[a-z]/.test(pwd)) score += 1;
  if (/[A-Z]/.test(pwd)) score += 1;
  if (/\d/.test(pwd)) score += 1;
  if (/[^A-Za-z\d]/.test(pwd)) score += 1;
  return score;
}

function updateStrengthUI(pwd) {
  const fill = document.getElementById('strengthFill');
  const label = document.getElementById('strengthLabel');
  if (!fill || !label) return;

  const score = scorePassword(pwd);
  const percent = (score / 5) * 100;
  fill.style.width = `${percent}%`;

  if (score <= 2) {
    fill.style.backgroundColor = '#dc2626';
    label.textContent = 'Strength: Weak';
  } else if (score === 3 || score === 4) {
    fill.style.backgroundColor = '#f59e0b';
    label.textContent = 'Strength: Medium';
  } else {
    fill.style.backgroundColor = '#16a34a';
    label.textContent = 'Strength: Strong';
  }
}

async function postJSON(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

function setupRegister() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  const password = document.getElementById('password');
  const repeatPassword = document.getElementById('repeatPassword');
  const matchMsg = document.getElementById('matchMsg');

  password.addEventListener('input', () => {
    updateStrengthUI(password.value);
  });

  repeatPassword.addEventListener('input', () => {
    matchMsg.textContent =
      repeatPassword.value && repeatPassword.value !== password.value ? 'Passwords do not match.' : '';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      firstName: document.getElementById('firstName').value.trim(),
      lastName: document.getElementById('lastName').value.trim(),
      email: document.getElementById('email').value.trim(),
      password: password.value,
      repeatPassword: repeatPassword.value
    };

    if (!passwordPattern.test(payload.password)) {
      showToast('Password policy not satisfied.', 'danger');
      return;
    }

    if (payload.password !== payload.repeatPassword) {
      showToast('Password and Repeat Password must match.', 'danger');
      return;
    }

    try {
      const result = await postJSON('/api/register', payload);
      showToast(result.message, 'success');
      form.reset();
      updateStrengthUI('');
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 1200);
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });
}

function setupLogin() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      email: document.getElementById('loginEmail').value.trim(),
      password: document.getElementById('loginPassword').value,
      rememberMe: document.getElementById('rememberMe').checked
    };

    try {
      const result = await postJSON('/api/login', payload);
      showToast(`Welcome ${result.fullName}`, 'success');
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });
}

function setupForgot() {
  const forgotForm = document.getElementById('forgotForm');
  const resetForm = document.getElementById('resetForm');

  if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('forgotEmail').value.trim();
      try {
        const result = await postJSON('/api/forgot-password', { email });
        showToast(result.message, 'success');
        if (result.resetCode) {
          showToast(`Demo reset code: ${result.resetCode}`, 'success');
          const resetCode = document.getElementById('resetCode');
          const resetEmail = document.getElementById('resetEmail');
          if (resetCode) resetCode.value = result.resetCode;
          if (resetEmail) resetEmail.value = email;
        }
      } catch (err) {
        showToast(err.message, 'danger');
      }
    });
  }

  if (resetForm) {
    resetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        email: document.getElementById('resetEmail').value.trim(),
        code: document.getElementById('resetCode').value.trim(),
        newPassword: document.getElementById('newPassword').value,
        repeatPassword: document.getElementById('repeatNewPassword').value
      };

      if (!passwordPattern.test(payload.newPassword)) {
        showToast('New password policy not satisfied.', 'danger');
        return;
      }

      if (payload.newPassword !== payload.repeatPassword) {
        showToast('New password and repeated one must match.', 'danger');
        return;
      }

      try {
        const result = await postJSON('/api/reset-password', payload);
        showToast(result.message, 'success');
        resetForm.reset();
        setTimeout(() => {
          window.location.href = '/login.html';
        }, 1200);
      } catch (err) {
        showToast(err.message, 'danger');
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initTooltips();
  setupRegister();
  setupLogin();
  setupForgot();
});
