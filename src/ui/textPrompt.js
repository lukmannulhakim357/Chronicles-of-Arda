// A real HTML <input> overlay for text entry. Phaser's canvas can't trigger
// a mobile keyboard on its own, so profile naming (and anything else needing
// typed text) uses a DOM modal layered above the game instead.

export function promptText({
  title,
  subtitle,
  placeholder = '',
  initial = '',
  maxLength = 24,
  confirmLabel = 'Continue',
  cancelLabel = 'Cancel',
  onSubmit,
  onCancel,
}) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 10000;
    background: rgba(5,6,15,0.82);
    display: flex; align-items: center; justify-content: center;
    font-family: Georgia, "Times New Roman", serif;
    padding: 16px; box-sizing: border-box;
  `;

  const box = document.createElement('div');
  box.style.cssText = `
    width: min(360px, 100%);
    background: #101830;
    border: 2px solid #3a4a7a;
    border-radius: 6px;
    padding: 22px 20px;
    box-sizing: border-box;
  `;
  overlay.appendChild(box);

  const h = document.createElement('div');
  h.textContent = title;
  h.style.cssText = 'color:#d9b968; font-size:19px; margin-bottom:4px;';
  box.appendChild(h);

  if (subtitle) {
    const sub = document.createElement('div');
    sub.textContent = subtitle;
    sub.style.cssText = 'color:#9aa4bc; font-size:12px; font-style:italic; margin-bottom:14px;';
    box.appendChild(sub);
  }

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = placeholder;
  input.value = initial;
  input.maxLength = maxLength;
  input.autocomplete = 'off';
  input.style.cssText = `
    width:100%; box-sizing:border-box; font-family:inherit;
    font-size:16px; padding:10px 12px; margin-top: ${subtitle ? '0' : '10px'};
    background:#0a1128; border:1px solid #3a4a7a; border-radius:4px;
    color:#e8e4d8; outline:none;
  `;
  box.appendChild(input);

  const row = document.createElement('div');
  row.style.cssText = 'display:flex; gap:10px; margin-top:18px;';
  box.appendChild(row);

  function makeBtn(label, primary) {
    const b = document.createElement('button');
    b.textContent = label;
    b.type = 'button';
    b.style.cssText = `
      flex:1; padding:12px 8px; font-family:inherit; font-size:15px;
      border-radius:4px; cursor:pointer;
      border:2px solid ${primary ? '#d9b968' : '#3a4a7a'};
      background:${primary ? '#1c2a50' : '#101830'};
      color:#e8e4d8;
    `;
    return b;
  }

  const cancelBtn = makeBtn(cancelLabel, false);
  const confirmBtn = makeBtn(confirmLabel, true);
  row.appendChild(cancelBtn);
  row.appendChild(confirmBtn);
  document.body.appendChild(overlay);

  function close() {
    overlay.remove();
  }
  function submit() {
    const val = input.value.trim();
    if (!val) {
      input.style.borderColor = '#a03030';
      input.focus();
      return;
    }
    close();
    onSubmit?.(val);
  }
  cancelBtn.addEventListener('click', () => {
    close();
    onCancel?.();
  });
  confirmBtn.addEventListener('click', submit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit();
    if (e.key === 'Escape') {
      close();
      onCancel?.();
    }
  });
  input.addEventListener('input', () => {
    input.style.borderColor = '#3a4a7a';
  });

  // focus after paint so mobile browsers reliably raise the keyboard
  requestAnimationFrame(() => input.focus());
}
