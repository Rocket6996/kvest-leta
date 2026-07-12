// Книжная полка: настоящие рассказы (общественное достояние, тексты по
// академическому изданию), по 2–3 страницы, после чтения — испытание Летописца.
import { solvedInTopic } from './engine.js';

let booksCache = null;
export async function loadBooks() {
  if (!booksCache) booksCache = await (await fetch('content/books.json')).json();
  return booksCache;
}

export async function renderBook(container, bookId) {
  const books = await loadBooks();
  const book = books.topics.find((b) => b.id === bookId);
  if (!book) {
    container.innerHTML = `<a href="#subject/books" class="back-link">← Назад</a><p class="stub-note">Книга не найдена.</p>`;
    return;
  }

  let page = 0;

  function renderPage() {
    const solved = solvedInTopic('books', book.id);
    const isLast = page === book.pages.length - 1;
    container.innerHTML = `
      <a href="#subject/books" class="back-link">← Книжная полка</a>
      <div class="book-page">
        <h2>${book.title}</h2>
        <p class="book-author">${book.author}</p>
        ${book.pages[page].map((p) => `<p class="book-para">${p}</p>`).join('')}
        <div class="book-nav">
          <button class="block" id="book-prev" ${page === 0 ? 'disabled' : ''}>← стр.</button>
          <span class="book-pageno">${page + 1} / ${book.pages.length}</span>
          ${isLast
            ? `<a class="block hit-btn" href="#task/books/${book.id}">⛏ Испытание (${solved}/${book.tasks.length})</a>`
            : `<button class="block hit-btn" id="book-next">стр. →</button>`}
        </div>
      </div>`;

    container.querySelector('#book-prev')?.addEventListener('click', () => { page -= 1; renderPage(); scrollTop(); });
    container.querySelector('#book-next')?.addEventListener('click', () => { page += 1; renderPage(); scrollTop(); });
  }

  function scrollTop() {
    document.getElementById('screens').scrollTo(0, 0);
  }

  renderPage();
}

// «предмет» для движка заданий: испытания книг живут в progress под id "books"
export async function booksSubject() {
  const books = await loadBooks();
  return {
    id: 'books',
    title: 'Книги',
    place: 'Книжная полка',
    color: 'var(--mustard)',
    ready: true,
    books: true,
    topics: books.topics.map((b) => ({ id: b.id, title: `${b.title} · ${b.author}`, tasks: b.tasks.length })),
  };
}
