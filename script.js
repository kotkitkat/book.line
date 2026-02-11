// ========== ХРАНИЛИЩЕ ==========
let books = [];
const STORAGE_KEY = 'spoiler_books';

function loadBooks() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        books = JSON.parse(stored);
    } else {
        // Книги по умолчанию с полями firstLine, lastLine, quote
        books = [
            {
                id: generateId(),
                title: 'Мастер и Маргарита',
                author: 'Михаил Булгаков',
                firstLine: 'Однажды весною, в час небывало жаркого заката, в Москве, на Патриарших прудах...',
                lastLine: '...и оставался только покой.',
                rating: 5,
                isFavorite: true,
                quote: 'Никогда ничего не просите! Никогда и ничего, и в особенности у тех, кто сильнее вас.'
            },
            {
                id: generateId(),
                title: '1984',
                author: 'Джордж Оруэлл',
                firstLine: 'Был яркий холодный апрельский день, часы били тринадцать.',
                lastLine: 'Он любил Большого Брата.',
                rating: 8,
                isFavorite: false,
                quote: ''
            },
            {
                id: generateId(),
                title: 'Гордость и предубеждение',
                author: 'Джейн Остин',
                firstLine: 'Все знают, что молодой человек, располагающий средствами, должен подыскивать себе жену.',
                lastLine: '...и предались радостному обсуждению будущего.',
                rating: 9,
                isFavorite: true,
                quote: 'Тщеславие и гордость — разные вещи.'
            }
        ];
        saveBooks();
    }
}

function saveBooks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}

function generateId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
}

// ========== БУРГЕР ==========
function initBurger() {
    const burger = document.getElementById('burger');
    const nav = document.getElementById('nav');
    if (burger) {
        burger.addEventListener('click', () => {
            burger.classList.toggle('active');
            nav.classList.toggle('active');
        });
    }
    document.querySelectorAll('.nav__link').forEach(link => {
        link.addEventListener('click', () => {
            if (burger) burger.classList.remove('active');
            if (nav) nav.classList.remove('active');
        });
    });
}

// ========== БИБЛИОТЕКА (index.html) ==========
function renderBooks() {
    const container = document.getElementById('booksContainer');
    if (!container) return;
    if (books.length === 0) {
        container.innerHTML = '<div class="empty-favorites">Библиотека пуста. Добавьте первую книгу!</div>';
        return;
    }
    container.innerHTML = books.map(book => createBookCard(book)).join('');
    attachBookEvents();
}

function createBookCard(book) {
    // Заглушка обложки
    const coverHtml = `<div class="cover-placeholder">
                        <i class="fas fa-layer-group"></i>
                        <span>${book.title}</span>
                        <span class="cover-author">${book.author.split(' ').pop()}</span>
                    </div>`;

    // Первая и последняя строки
    const spoilerHtml = `<div class="spoiler-lines">
                            <div class="first-line"><span class="label">Первая строка:</span> «${book.firstLine}»</div>
                            <div class="last-line"><span class="label">Последняя строка:</span> «${book.lastLine}»</div>
                        </div>`;

    // Дополнительная цитата
    const quoteHtml = book.quote ? `<div class="quote-block"><span class="label">📜 Цитата:</span> ${book.quote}</div>` : '';

    // Рейтинг чашками
    let mugsHtml = '';
    for (let i = 1; i <= 10; i++) {
        const activeClass = i <= book.rating ? 'active' : '';
        const smokingClass = i === book.rating ? 'smoking' : '';
        mugsHtml += `<span class="mug-icon ${activeClass} ${smokingClass}" data-rating="${i}">
                        <i class="fas fa-mug-hot"></i>
                        <i class="fas fa-smog smoke"></i>
                    </span>`;
    }

    // Иконка избранного (стопка книг)
    const favActiveClass = book.isFavorite ? 'active' : '';

    return `<div class="book-card" data-book-id="${book.id}">
                <div class="book-card__cover">
                    ${coverHtml}
                </div>
                <div class="book-card__info">
                    <div class="book-card__header">
                        <div>
                            <h3 class="book-card__title">${book.title}</h3>
                            <p class="book-card__author">${book.author}</p>
                        </div>
                        <button class="favorite-btn ${favActiveClass}" data-book-id="${book.id}" title="В избранное">
                            <i class="fas fa-layer-group"></i>
                        </button>
                    </div>
                    ${spoilerHtml}
                    ${quoteHtml}
                    <div class="book-card__rating">
                        <span class="rating-label">Оцените:</span>
                        <div class="mug-rating" data-book-id="${book.id}">
                            ${mugsHtml}
                        </div>
                    </div>
                    <div class="book-actions">
                        <i class="action-icon fas fa-pencil-alt" data-action="edit" title="Редактировать"></i>
                        <i class="action-icon fas fa-trash-alt" data-action="delete" title="Удалить"></i>
                        <i class="action-icon fas fa-quote-right" data-action="quote" title="Добавить цитату"></i>
                    </div>
                </div>
            </div>`;
}

// ========== СОБЫТИЯ НА КАРТОЧКАХ ==========
function attachBookEvents() {
    // Рейтинг
    document.querySelectorAll('.mug-rating').forEach(ratingDiv => {
        const bookId = ratingDiv.dataset.bookId;
        const mugs = ratingDiv.querySelectorAll('.mug-icon');
        mugs.forEach(mug => {
            mug.addEventListener('click', function(e) {
                e.stopPropagation();
                const rating = parseInt(this.dataset.rating);
                const book = books.find(b => b.id === bookId);
                if (book) {
                    book.rating = rating;
                    saveBooks();
                    renderBooks(); // перерисовка
                }
            });
        });
    });

    // Избранное
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const bookId = this.dataset.bookId;
            const book = books.find(b => b.id === bookId);
            if (book) {
                book.isFavorite = !book.isFavorite;
                saveBooks();
                renderBooks();
            }
        });
    });

    // Действия: редактировать, удалить, добавить цитату
    document.querySelectorAll('.action-icon').forEach(icon => {
        icon.addEventListener('click', function(e) {
            e.stopPropagation();
            const card = this.closest('.book-card');
            const bookId = card.dataset.bookId;
            const book = books.find(b => b.id === bookId);
            if (!book) return;

            const action = this.dataset.action;
            if (action === 'edit') {
                openEditModal(book);
            } else if (action === 'delete') {
                if (confirm('Удалить книгу навсегда?')) {
                    books = books.filter(b => b.id !== bookId);
                    saveBooks();
                    renderBooks();
                }
            } else if (action === 'quote') {
                openQuoteModal(bookId);
            }
        });
    });
}

// ========== МОДАЛКА РЕДАКТИРОВАНИЯ ==========
function openEditModal(book) {
    const modal = document.getElementById('editModal');
    document.getElementById('edit-id').value = book.id;
    document.getElementById('edit-title').value = book.title;
    document.getElementById('edit-author').value = book.author;
    document.getElementById('edit-firstLine').value = book.firstLine;
    document.getElementById('edit-lastLine').value = book.lastLine;
    document.getElementById('edit-quote').value = book.quote || '';
    modal.style.display = 'flex';
}

function initEditModal() {
    const modal = document.getElementById('editModal');
    const closeBtn = modal.querySelector('.close-modal');
    const form = document.getElementById('editForm');

    closeBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-id').value;
        const book = books.find(b => b.id === id);
        if (book) {
            book.title = document.getElementById('edit-title').value;
            book.author = document.getElementById('edit-author').value;
            book.firstLine = document.getElementById('edit-firstLine').value;
            book.lastLine = document.getElementById('edit-lastLine').value;
            book.quote = document.getElementById('edit-quote').value;
            saveBooks();
            modal.style.display = 'none';
            renderBooks();
        }
    });
}

// ========== МОДАЛКА ДОБАВЛЕНИЯ ЦИТАТЫ ==========
function openQuoteModal(bookId) {
    const modal = document.getElementById('quoteModal');
    document.getElementById('quote-book-id').value = bookId;
    document.getElementById('quote-text').value = '';
    modal.style.display = 'flex';
}

function initQuoteModal() {
    const modal = document.getElementById('quoteModal');
    const closeBtn = modal.querySelector('.close-modal');
    const form = document.getElementById('quoteForm');

    closeBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('quote-book-id').value;
        const book = books.find(b => b.id === id);
        if (book) {
            book.quote = document.getElementById('quote-text').value;
            saveBooks();
            modal.style.display = 'none';
            renderBooks();
        }
    });
}

// ========== РИСОВАННАЯ ПОЛКА (с удалением, отзывом и сворачиванием) ==========
function renderShelf() {
    const container = document.getElementById('shelfContainer');
    if (!container) return;
    
    const favoriteBooks = books.filter(b => b.isFavorite);
    
    let html = `<div class="shelf-container"><div class="books-shelf">`;
    
    if (favoriteBooks.length === 0) {
        html += `<div class="empty-shelf">✨ На полке пока пусто. Добавьте книги через иконку стопки книг в библиотеке.</div>`;
    } else {
        favoriteBooks.forEach(book => {
            const hasReview = book.review && book.review.trim() !== '';
            const expandedClass = hasReview ? 'expanded' : '';
            const reviewText = book.review || '';
            
            html += `
                <div class="shelf-book" data-book-id="${book.id}">
                    <button class="shelf-remove-btn" title="Убрать с полки">
                        <i class="fas fa-times-circle"></i>
                    </button>
                    <div class="shelf-book-title">${book.title}</div>
                    <div class="shelf-book-author">${book.author}</div>
                    <div class="shelf-book-snippet">«${book.firstLine.substring(0, 40)}…»</div>
                    <div class="review-toggle">
                        <span class="review-header">
                            <i class="fas fa-pencil-alt"></i> Моё мнение
                        </span>
                        <button class="toggle-review-btn" title="Развернуть/свернуть">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    </div>
                    <div class="review-wrapper ${expandedClass}">
                        <div class="shelf-review">
                            <textarea class="review-text" placeholder="Напишите отзыв..." rows="2">${reviewText}</textarea>
                            <button class="save-review-btn">Сохранить</button>
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    html += `</div></div>`;
    container.innerHTML = html;
    
    // Удаление с полки
    document.querySelectorAll('.shelf-remove-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const bookId = this.closest('.shelf-book').dataset.bookId;
            const book = books.find(b => b.id === bookId);
            if (book) {
                book.isFavorite = false;
                saveBooks();
                renderShelf();
            }
        });
    });
    
    // Сохранение отзыва
    document.querySelectorAll('.save-review-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const shelfBook = this.closest('.shelf-book');
            const bookId = shelfBook.dataset.bookId;
            const reviewText = shelfBook.querySelector('.review-text').value.trim();
            const book = books.find(b => b.id === bookId);
            if (book) {
                book.review = reviewText;
                saveBooks();
                this.textContent = 'Сохранено!';
                setTimeout(() => { this.textContent = 'Сохранить'; }, 1500);
            }
        });
    });
    
    // Сворачивание/разворачивание
    document.querySelectorAll('.toggle-review-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const shelfBook = this.closest('.shelf-book');
            const wrapper = shelfBook.querySelector('.review-wrapper');
            wrapper.classList.toggle('expanded');
            const icon = this.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-chevron-down');
                icon.classList.toggle('fa-chevron-up');
            }
        });
    });
}

// ========== ДОБАВЛЕНИЕ КНИГИ (add.html) ==========
function initAddBookForm() {
    const form = document.getElementById('addBookForm');
    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const title = document.getElementById('bookTitle').value.trim();
        const author = document.getElementById('bookAuthor').value.trim();
        const firstLine = document.getElementById('bookFirstLine').value.trim();
        const lastLine = document.getElementById('bookLastLine').value.trim();

        if (!title || !author || !firstLine || !lastLine) {
            alert('Пожалуйста, заполните все поля');
            return;
        }

        const newBook = {
            id: generateId(),
            title,
            author,
            firstLine,
            lastLine,
            rating: 0,
            isFavorite: false,
            quote: ''
        };

        books.push(newBook);
        saveBooks();
        window.location.href = 'index.html';
    });
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', function() {
    // Эти функции должны быть доступны глобально
    window.loadBooks = loadBooks;
    window.renderBooks = renderBooks;
    window.renderShelf = renderShelf;
    window.initAddBookForm = initAddBookForm;
    window.initBurger = initBurger;

    // Инициализируем модалки, если они есть на странице
    if (document.getElementById('editModal')) initEditModal();
    if (document.getElementById('quoteModal')) initQuoteModal();
});