const cart = new Map();
let books = [];
let money;

const $ = (id) => document.getElementById(id);

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

function renderCart() {
  const list = $('cart-items');
  list.replaceChildren();
  let total = 0;
  for (const [lookupKey, quantity] of cart) {
    const book = books.find((b) => b.lookupKey === lookupKey);
    total += book.unitAmount * quantity;
    const remove = el('button', { textContent: 'Remove', onclick: () => { cart.delete(lookupKey); renderCart(); } });
    list.append(el('li', {}, el('span', { textContent: `${book.name} × ${quantity}` }), remove));
  }
  $('cart-total').textContent = cart.size ? `Estimated total: ${money.format(total / 100)}` : 'Your cart is empty.';
  $('checkout').disabled = cart.size === 0;
}

async function checkout() {
  $('checkout').disabled = true;
  $('error').textContent = '';
  try {
    const res = await fetch('/api/checkout-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [...cart].map(([lookupKey, quantity]) => ({ lookupKey, quantity })) }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error);
    window.location.assign(body.url);
  } catch (err) {
    $('error').textContent = err.message || 'Something went wrong.';
    $('checkout').disabled = false;
  }
}

async function init() {
  if (new URLSearchParams(location.search).has('canceled')) {
    $('notice').append(el('p', { className: 'notice', textContent: 'Checkout canceled. Your cart is still here.' }));
  }
  const res = await fetch('/api/books');
  const data = await res.json();
  books = data.books;
  money = new Intl.NumberFormat(undefined, { style: 'currency', currency: data.currency });
  for (const book of books) {
    const add = el('button', {
      textContent: 'Add to cart',
      onclick: () => { cart.set(book.lookupKey, Math.min((cart.get(book.lookupKey) ?? 0) + 1, 10)); renderCart(); },
    });
    $('books').append(el('article', { className: 'book' },
      el('span', { className: 'format', textContent: `${book.format === 'print' ? 'Paperback' : 'PDF eBook'} · ${book.category}` }),
      el('h2', { textContent: book.name }),
      el('p', { textContent: book.description }),
      el('span', { className: 'price', textContent: money.format(book.unitAmount / 100) }),
      add));
  }
  $('checkout').onclick = checkout;
  renderCart();
}

init();
