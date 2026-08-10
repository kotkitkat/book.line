// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let books = [];
const STORAGE_KEY = 'spoiler_books';
const BOOKS_PER_PAGE = 10;
let currentPage = 1;
let searchQuery = '';
let filterAuthor = '';
let filterRatingMin = 0;
let filterFavorite = false;
let sortBy = 'title';
let sortAsc = true;

// ========== ГЕНЕРАТОР ID ==========
function generateId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
}

// ========== ДЕМО-КНИГИ ==========
function getDefaultBooks() {
    return [
        {
            id: generateId(),
            title: 'Мастер и Маргарита',
            author: 'Михаил Булгаков',
            firstLine: 'Однажды весною, в час небывало жаркого заката, в Москве, на Патриарших прудах...',
            lastLine: '...и оставался только покой.',
            rating: 5,
            isFavorite: true,
            quotes: [
                'Никогда ничего не просите! Никогда и ничего, и в особенности у тех, кто сильнее вас.',
                'Тот, кто любит, должен разделять участь того, кого он любит.'
            ],
            review: ''
        },
        {
            id: generateId(),
            title: '1984',
            author: 'Джордж Оруэлл',
            firstLine: 'Был яркий холодный апрельский день, часы били тринадцать.',
            lastLine: 'Он любил Большого Брата.',
            rating: 8,
            isFavorite: false,
            quotes: [],
            review: ''
        },
        {
            id: generateId(),
            title: 'Гордость и предубеждение',
            author: 'Джейн Остин',
            firstLine: 'Все знают, что молодой человек, располагающий средствами, должен подыскивать себе жену.',
            lastLine: '...и предались радостному обсуждению будущего.',
            rating: 9,
            isFavorite: true,
            quotes: ['Тщеславие и гордость — разные вещи.'],
            review: ''
        }
    ];
}

// ========== ЗАГРУЗКА ИЗ FIRESTORE ==========
async function loadBooksFromFirestore() {
    showLoader();
    try {
        const snapshot = await db.collection('books').get();
        if (snapshot.empty) {
            books = getDefaultBooks();
            for (const book of books) {
                await db.collection('books').doc(book.id).set(book);
            }
        } else {
            books = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                if (!data.quotes) data.quotes = [];
                if (!data.review) data.review = '';
                books.push({ id: doc.id, ...data });
            });
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
        updateUI();
    } catch (error) {
        console.error('Firestore load error:', error);
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) books = JSON.parse(stored);
        else books = getDefaultBooks();
        updateUI();
    } finally {
        hideLoader();
    }
}

// ========== СОХРАНЕНИЕ ОДНОЙ КНИГИ ==========
async function saveBookToFirestore(book) {
    try {
        await db.collection('books').doc(book.id).set(book);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
    } catch (error) {
        console.error('Ошибка записи в Firestore:', error);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
    }
}

// ========== УДАЛЕНИЕ КНИГИ ==========
async function deleteBookFromFirestore(bookId) {
    try {
        await db.collection('books').doc(bookId).delete();
        books = books.filter(b => b.id !== bookId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
    } catch (error) {
        console.error('Ошибка удаления из Firestore:', error);
        books = books.filter(b => b.id !== bookId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
    }
}

// ========== ОБНОВЛЕНИЕ UI ==========
function updateUI() {
    if (document.getElementById('booksContainer')) {
        updateAuthorFilterOptions();
        initFiltersAndSort();
        renderBooks();
    }
    if (document.getElementById('shelfContainer')) {
        renderShelf();
    }
}

// ========== ЛОАДЕР ==========
function showLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.add('active');
}
function hideLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.remove('active');
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

// ========== ФИЛЬТРЫ И СОРТИРОВКА ==========
function getFilteredAndSortedBooks() {
    let filtered = books.filter(book => {
        const matchesSearch = searchQuery === '' || 
            book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            book.author.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesAuthor = filterAuthor === '' || book.author === filterAuthor;
        const matchesRating = filterRatingMin === 0 || book.rating >= filterRatingMin;
        const matchesFavorite = !filterFavorite || book.isFavorite;
        return matchesSearch && matchesAuthor && matchesRating && matchesFavorite;
    });
    filtered.sort((a, b) => {
        let valA, valB;
        if (sortBy === 'title') {
            valA = a.title.toLowerCase();
            valB = b.title.toLowerCase();
            return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        } else if (sortBy === 'rating') {
            valA = a.rating;
            valB = b.rating;
            return sortAsc ? valA - valB : valB - valA;
        } else if (sortBy === 'date') {
            valA = a.id;
            valB = b.id;
            return sortAsc ? valA - valB : valB - valA;
        }
        return 0;
    });
    return filtered;
}

function updateAuthorFilterOptions() {
    const select = document.getElementById('authorFilter');
    if (!select) return;
    const authors = [...new Set(books.map(b => b.author))].sort();
    const currentValue = filterAuthor;
    select.innerHTML = '<option value="">Все авторы</option>' +
        authors.map(a => `<option value="${a}">${a}</option>`).join('');
    if (authors.includes(currentValue)) select.value = currentValue;
    else filterAuthor = '';
}

function initFiltersAndSort() {
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearFiltersBtn');
    const authorSelect = document.getElementById('authorFilter');
    const ratingSelect = document.getElementById('ratingFilter');
    const favBtn = document.getElementById('favoriteFilterBtn');
    const sortSelect = document.getElementById('sortBySelect');
    const sortOrderBtn = document.getElementById('sortOrderBtn');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            currentPage = 1;
            renderBooks();
        });
    }
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            searchQuery = '';
            filterAuthor = '';
            filterRatingMin = 0;
            filterFavorite = false;
            sortBy = 'title';
            sortAsc = true;
            if (authorSelect) authorSelect.value = '';
            if (ratingSelect) ratingSelect.value = '0';
            if (favBtn) favBtn.classList.remove('active');
            if (sortSelect) sortSelect.value = 'title';
            if (sortOrderBtn) sortOrderBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
            currentPage = 1;
            renderBooks();
        });
    }
    if (authorSelect) {
        authorSelect.addEventListener('change', (e) => {
            filterAuthor = e.target.value;
            currentPage = 1;
            renderBooks();
        });
    }
    if (ratingSelect) {
        ratingSelect.addEventListener('change', (e) => {
            filterRatingMin = parseInt(e.target.value, 10) || 0;
            currentPage = 1;
            renderBooks();
        });
    }
    if (favBtn) {
        favBtn.addEventListener('click', () => {
            filterFavorite = !filterFavorite;
            favBtn.classList.toggle('active');
            currentPage = 1;
            renderBooks();
        });
    }
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            sortBy = e.target.value;
            currentPage = 1;
            renderBooks();
        });
    }
    if (sortOrderBtn) {
        sortOrderBtn.addEventListener('click', () => {
            sortAsc = !sortAsc;
            sortOrderBtn.innerHTML = sortAsc ? '<i class="fas fa-arrow-up"></i>' : '<i class="fas fa-arrow-down"></i>';
            currentPage = 1;
            renderBooks();
        });
    }
}

// ========== РЕНДЕР КНИГ (БИБЛИОТЕКА) ==========
function renderBooks() {
    const container = document.getElementById('booksContainer');
    if (!container) return;
    const filteredBooks = getFilteredAndSortedBooks();
    updateAuthorFilterOptions();

    if (filteredBooks.length === 0) {
        container.innerHTML = '<div class="empty-favorites">📚 Книги не найдены. Попробуйте изменить параметры поиска.</div>';
        return;
    }

    const totalPages = Math.ceil(filteredBooks.length / BOOKS_PER_PAGE);
    if (currentPage > totalPages) currentPage = Math.max(1, totalPages);
    const start = (currentPage - 1) * BOOKS_PER_PAGE;
    const end = start + BOOKS_PER_PAGE;
    const booksOnPage = filteredBooks.slice(start, end);

    let booksHtml = booksOnPage.map(book => createBookCard(book)).join('');
    let paginationHtml = '';
    if (totalPages > 1) {
        paginationHtml = '<div class="pagination">';
        if (currentPage > 1) {
            paginationHtml += `<button class="pagination-btn prev" data-page="${currentPage - 1}">←</button>`;
        }
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                paginationHtml += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
            } else if (i === currentPage - 2 || i === currentPage + 2) {
                paginationHtml += '<span class="pagination-dots">...</span>';
            }
        }
        if (currentPage < totalPages) {
            paginationHtml += `<button class="pagination-btn next" data-page="${currentPage + 1}">→</button>`;
        }
        paginationHtml += '</div>';
    }
    container.innerHTML = booksHtml + paginationHtml;
    attachBookEvents();
    attachPaginationEvents();
}

function attachPaginationEvents() {
    document.querySelectorAll('.pagination-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const page = parseInt(this.dataset.page);
            if (!isNaN(page) && page !== currentPage) {
                currentPage = page;
                renderBooks();
                const booksSection = document.querySelector('.books');
                if (booksSection) booksSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// ========== СОЗДАНИЕ КАРТОЧКИ (С ЗАЩИТОЙ ОТ СПОЙЛЕРОВ) ==========
function createBookCard(book) {
    const authorLastName = book.author.split(' ').pop();
    // Если есть обложка — показываем её, иначе заглушку
    const coverHtml = book.coverUrl 
        ? `<img src="${book.coverUrl}" alt="${book.title}" style="width: 100%; height: 100%; object-fit: cover; display: block;">`
        : `<div class="cover-placeholder">
            <i class="fas fa-layer-group"></i>
            <span>${book.title}</span>
            <span class="cover-author">${authorLastName}</span>
          </div>`;

    //  ОБНОВЛЁННЫЙ БЛОК СПОЙЛЕРОВ (последняя строка скрыта)
    const spoilerHtml = `<div class="spoiler-lines">
                            <div class="first-line"><span class="label">Первая строка:</span> «${book.firstLine}»</div>
                              <div class="last-line spoiler-hidden" data-revealed="false">
                                <span class="label">Последняя строка:</span>
                            </div>
                            <div class="last-line spoiler-hidden" data-revealed="false">
                                <span class="spoiler-text">«${book.lastLine}»</span>
                                <span class="spoiler-overlay"><i class="fas fa-eye"></i> Нажмите, чтобы прочитать спойлер</span>
                            </div>
                        </div>`;

    let quotesHtml = '';
    if (book.quotes && book.quotes.length > 0) {
        const visibleQuotes = book.quotes.slice(0, 2).map(q => `<div class="quote-item">«${q}»</div>`).join('');
        const remainingCount = book.quotes.length - 2;
        quotesHtml = `
            <div class="book-card__quotes">
                <div class="quotes-list">
                    ${visibleQuotes}
                    ${remainingCount > 0 ? `<div class="quote-more">и ещё ${remainingCount} цитат(ы)...</div>` : ''}
                </div>
                <div class="quotes-actions">
                    <button class="btn-icon show-quotes-btn" data-book-id="${book.id}" title="Все цитаты">
                        <i class="fas fa-quote-right"></i> <span class="quote-count">${book.quotes.length}</span>
                    </button>
                    <button class="btn-icon add-quote-btn" data-book-id="${book.id}" title="Добавить цитату">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
        `;
    } else {
        quotesHtml = `
            <div class="book-card__quotes">
                <div class="quotes-actions">
                    <button class="btn-icon add-quote-btn" data-book-id="${book.id}" title="Добавить цитату">
                        <i class="fas fa-plus"></i> Добавить цитату
                    </button>
                </div>
            </div>
        `;
    }

    let mugsHtml = '';
    for (let i = 1; i <= 10; i++) {
        const activeClass = i <= book.rating ? 'active' : '';
        const smokingClass = i === book.rating ? 'smoking' : '';
        mugsHtml += `<span class="mug-icon ${activeClass} ${smokingClass}" data-rating="${i}">
                        <i class="fas fa-mug-hot"></i>
                    </span>`;
    }

    const favActiveClass = book.isFavorite ? 'active' : '';

    return `<div class="book-card" data-book-id="${book.id}">
                <div class="book-card__cover">${coverHtml}</div>
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
                    ${quotesHtml}
                    <div class="book-card__rating">
                        <span class="rating-label">Оцените:</span>
                        <div class="mug-rating" data-book-id="${book.id}">
                            ${mugsHtml}
                        </div>
                    </div>
                    <div class="book-actions">
                        <i class="action-icon fas fa-pencil-alt" data-action="edit" title="Редактировать"></i>
                        <i class="action-icon fas fa-trash-alt" data-action="delete" title="Удалить"></i>
                    </div>
                </div>
            </div>`;
}

// ========== СОБЫТИЯ НА КАРТОЧКАХ ==========
function attachBookEvents() {
    // Рейтинг (с возможностью сброса при повторном клике)
    document.querySelectorAll('.mug-rating').forEach(ratingDiv => {
        const bookId = ratingDiv.dataset.bookId;
        const mugs = ratingDiv.querySelectorAll('.mug-icon');
        mugs.forEach(mug => {
            mug.addEventListener('click', async function(e) {
                e.stopPropagation();
                const rating = parseInt(this.dataset.rating);
                const book = books.find(b => b.id === bookId);
                if (book) {
                    const newRating = (book.rating === rating) ? 0 : rating;
                    book.rating = newRating;
                    await saveBookToFirestore(book);
                    mugs.forEach((m, idx) => {
                        const mugIdx = idx + 1;
                        m.classList.toggle('active', mugIdx <= newRating);
                        m.classList.toggle('smoking', mugIdx === newRating);
                    });
                }
            });
        });
    });

    // Избранное
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.stopPropagation();
            const bookId = this.dataset.bookId;
            const book = books.find(b => b.id === bookId);
            if (book) {
                book.isFavorite = !book.isFavorite;
                await saveBookToFirestore(book);
                this.classList.toggle('active');
                if (document.getElementById('shelfContainer')) renderShelf();
            }
        });
    });

    // Действия: редактировать, удалить
    document.querySelectorAll('.action-icon').forEach(icon => {
        icon.addEventListener('click', async function(e) {
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
                    await deleteBookFromFirestore(bookId);
                    renderBooks();
                    if (document.getElementById('shelfContainer')) renderShelf();
                }
            }
        });
    });

    // Показать цитаты
    document.querySelectorAll('.show-quotes-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const bookId = this.dataset.bookId;
            const book = books.find(b => b.id === bookId);
            if (book) openQuotesModal(book);
        });
    });

    // Добавить цитату
    document.querySelectorAll('.add-quote-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const bookId = this.dataset.bookId;
            const book = books.find(b => b.id === bookId);
            if (book) {
                openQuotesModal(book);
                setTimeout(() => {
                    const textarea = document.getElementById('newQuoteText');
                    if (textarea) textarea.focus();
                }, 200);
            }
        });
    });

    // Обработчик клика для раскрытия спойлера (последняя строка)
    document.querySelectorAll('.spoiler-hidden').forEach(block => {
        block.removeEventListener('click', handleSpoilerClick);
        block.addEventListener('click', handleSpoilerClick);
    });
}

function handleSpoilerClick(e) {
    e.stopPropagation();
    const block = this;
    if (block.dataset.revealed === 'false') {
        block.classList.add('revealed');
        block.dataset.revealed = 'true';
    } else {
        // можно снова скрыть, если раскомментировать:
        // block.classList.remove('revealed');
        // block.dataset.revealed = 'false';
    }
}

// ========== МОДАЛКА ЦИТАТ ==========
let currentQuotesBookId = null;

function openQuotesModal(book) {
    const modal = document.getElementById('quotesModal');
    if (!modal) return;
    currentQuotesBookId = book.id;
    document.getElementById('quotesBookTitle').textContent = book.title;
    renderQuotesList(book);
    modal.style.display = 'flex';
}

function renderQuotesList(book) {
    const container = document.getElementById('quotesListContainer');
    if (!container) return;
    let html = '';
    if (book.quotes.length === 0) {
        html = '<p class="empty-quotes">У этой книги пока нет цитат. Добавьте первую!</p>';
    } else {
        html = '<ul class="quotes-list-full">';
        book.quotes.forEach((quote, index) => {
            html += `
                <li class="quote-full-item">
                    <span class="quote-full-text">«${quote}»</span>
                    <button class="btn-icon remove-quote-btn" data-index="${index}" title="Удалить цитату">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </li>
            `;
        });
        html += '</ul>';
    }
    container.innerHTML = html;

    container.querySelectorAll('.remove-quote-btn').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.stopPropagation();
            const index = parseInt(this.dataset.index);
            const book = books.find(b => b.id === currentQuotesBookId);
            if (book && confirm('Удалить эту цитату?')) {
                book.quotes.splice(index, 1);
                await saveBookToFirestore(book);
                renderQuotesList(book);
                if (document.getElementById('booksContainer')) renderBooks();
                if (document.getElementById('shelfContainer')) renderShelf();
            }
        });
    });
}

function initQuotesModal() {
    const modal = document.getElementById('quotesModal');
    if (!modal) return;
    modal.querySelector('.close-modal').addEventListener('click', () => modal.style.display = 'none');
    document.getElementById('closeQuotesModalBtn').addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

    document.getElementById('addQuoteBtn').addEventListener('click', async function() {
        const textarea = document.getElementById('newQuoteText');
        const newQuote = textarea.value.trim();
        if (!newQuote) { alert('Введите текст цитаты'); return; }
        const book = books.find(b => b.id === currentQuotesBookId);
        if (book) {
            book.quotes.push(newQuote);
            await saveBookToFirestore(book);
            textarea.value = '';
            renderQuotesList(book);
            if (document.getElementById('booksContainer')) renderBooks();
            if (document.getElementById('shelfContainer')) renderShelf();
        }
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
    // Если есть поле для обложки, заполним его
    const coverInput = document.getElementById('edit-cover');
    const previewDiv = document.getElementById('edit-cover-preview');
    const previewImg = document.getElementById('edit-cover-preview-img');
    if (coverInput) {
        coverInput.value = ''; // сброс поля
        if (book.coverUrl) {
            if (previewImg) previewImg.src = book.coverUrl;
            if (previewDiv) previewDiv.style.display = 'block';
        } else {
            if (previewDiv) previewDiv.style.display = 'none';
        }
    }
    modal.style.display = 'flex';
}

function initEditModal() {
    const modal = document.getElementById('editModal');
    if (!modal) return;
    const closeBtn = modal.querySelector('.close-modal');
    const form = document.getElementById('editForm');

    closeBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

    // Обработка кнопки "Удалить обложку" (если есть)
    const removeCoverBtn = document.getElementById('edit-remove-cover-btn');
    if (removeCoverBtn) {
        removeCoverBtn.addEventListener('click', function() {
            const previewDiv = document.getElementById('edit-cover-preview');
            const coverInput = document.getElementById('edit-cover');
            if (previewDiv) previewDiv.style.display = 'none';
            if (coverInput) coverInput.value = '';
            // Флаг, что обложку удалили — будем использовать при сохранении
            const bookId = document.getElementById('edit-id').value;
            const book = books.find(b => b.id === bookId);
            if (book) {
                book.coverUrl = ''; // удаляем ссылку на обложку
            }
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-id').value;
        const book = books.find(b => b.id === id);
        if (book) {
            book.title = document.getElementById('edit-title').value;
            book.author = document.getElementById('edit-author').value;
            book.firstLine = document.getElementById('edit-firstLine').value;
            book.lastLine = document.getElementById('edit-lastLine').value;
            // Обложка: если есть поле для ввода URL, берём его
            const coverUrlInput = document.getElementById('edit-cover-url');
            if (coverUrlInput) {
                book.coverUrl = coverUrlInput.value.trim();
            } else {
                // Если нет отдельного поля, то используем cover из data (удаление уже обработано)
                // или не трогаем
            }
            await saveBookToFirestore(book);
            modal.style.display = 'none';
            renderBooks();
            if (document.getElementById('shelfContainer')) renderShelf();
        }
    });
}

// ========== МОДАЛКА ДОБАВЛЕНИЯ ЦИТАТЫ (старая) ==========
function initQuoteModal() {
    const modal = document.getElementById('quoteModal');
    if (!modal) return;
    const closeBtn = modal.querySelector('.close-modal');
    const form = document.getElementById('quoteForm');

    closeBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('quote-book-id').value;
        const book = books.find(b => b.id === id);
        if (book) {
            const newQuote = document.getElementById('quote-text').value.trim();
            if (newQuote) {
                book.quotes.push(newQuote);
                await saveBookToFirestore(book);
            }
            modal.style.display = 'none';
            renderBooks();
        }
    });
}

// ========== ПОЛКА ==========
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
            html += `
                <div class="shelf-book" data-book-id="${book.id}">
                    <button class="shelf-remove-btn" title="Убрать с полки">
                        <i class="fas fa-times-circle"></i>
                    </button>
                    <div class="shelf-book-title">${book.title}</div>
                    <div class="shelf-book-author">${book.author}</div>
                    <div class="shelf-book-snippet">«${book.firstLine.substring(0, 40)}…»</div>
                    <div class="review-toggle" data-book-id="${book.id}">
                        <span class="review-header">
                            <i class="fas fa-pencil-alt"></i> Моё мнение
                            ${hasReview ? '<i class="fas fa-check-circle has-review-icon"></i>' : ''}
                        </span>
                    </div>
                </div>
            `;
        });
    }
    html += `</div></div>`;
    container.innerHTML = html;

    document.querySelectorAll('.shelf-remove-btn').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.stopPropagation();
            const bookId = this.closest('.shelf-book').dataset.bookId;
            const book = books.find(b => b.id === bookId);
            if (book) {
                book.isFavorite = false;
                await saveBookToFirestore(book);
                renderShelf();
                if (document.getElementById('booksContainer')) renderBooks();
            }
        });
    });

    document.querySelectorAll('.review-toggle').forEach(el => {
        el.addEventListener('click', function(e) {
            e.stopPropagation();
            const bookId = this.dataset.bookId;
            const book = books.find(b => b.id === bookId);
            if (book) openReviewModal(book);
        });
    });
}

// ========== МОДАЛКА ОТЗЫВА ==========
let currentReviewBookId = null;

function openReviewModal(book) {
    const modal = document.getElementById('reviewModal');
    if (!modal) return;
    currentReviewBookId = book.id;
    document.getElementById('reviewBookInfo').innerHTML = `<strong>${book.title}</strong> — ${book.author}`;
    document.getElementById('reviewText').value = book.review || '';
    modal.style.display = 'flex';
}

function closeReviewModal() {
    document.getElementById('reviewModal').style.display = 'none';
    currentReviewBookId = null;
}

function initReviewModal() {
    const modal = document.getElementById('reviewModal');
    if (!modal) return;
    modal.querySelector('.close-modal').addEventListener('click', closeReviewModal);
    window.addEventListener('click', (e) => { if (e.target === modal) closeReviewModal(); });
    document.getElementById('saveReviewBtn').addEventListener('click', async function() {
        if (!currentReviewBookId) return;
        const book = books.find(b => b.id === currentReviewBookId);
        if (!book) return;
        book.review = document.getElementById('reviewText').value.trim();
        await saveBookToFirestore(book);
        closeReviewModal();
        renderShelf();
    });
    document.getElementById('cancelReviewBtn').addEventListener('click', closeReviewModal);
}

// ========== ДОБАВЛЕНИЕ КНИГИ ==========
function initAddBookForm() {
    const form = document.getElementById('addBookForm');
    if (!form) return;
    form.addEventListener('submit', async function(e) {
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
            quotes: [],
            review: '',
            coverUrl: '' // поле для обложки
        };
        // Если есть поле для обложки, берём значение
        const coverInput = document.getElementById('bookCoverUrl');
        if (coverInput) {
            newBook.coverUrl = coverInput.value.trim();
        }
        books.push(newBook);
        await saveBookToFirestore(newBook);
        showLoader();
        setTimeout(() => { window.location.href = 'index.html'; }, 80);
    });

    // Превью обложки (если есть поле)
    const coverUrlInput = document.getElementById('bookCoverUrl');
    const previewDiv = document.getElementById('coverPreview');
    const previewImg = document.getElementById('coverPreviewImg');
    if (coverUrlInput && previewDiv && previewImg) {
        coverUrlInput.addEventListener('input', function() {
            const url = this.value.trim();
            if (url) {
                previewImg.src = url;
                previewDiv.style.display = 'block';
            } else {
                previewDiv.style.display = 'none';
            }
        });
    }
}

// ========== ЛОАДЕР ПРИ ПЕРЕХОДАХ ==========
function initNavLoader() {
    document.querySelectorAll('.nav__link').forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.classList.contains('active')) return;
            e.preventDefault();
            showLoader();
            setTimeout(() => { window.location.href = this.href; }, 80);
        });
    });
}

// ========== ПОИСК КНИГ ЧЕРЕЗ OPEN LIBRARY (БЕСПЛАТНО, БЕЗ КЛЮЧЕЙ) ==========
async function searchOpenLibrary(query) {
    if (!query.trim()) {
        alert('Введите поисковый запрос');
        return;
    }

    showLoader();

    try {
        const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=5`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        hideLoader();

        if (!data.docs || data.docs.length === 0) {
            renderOpenLibraryResults([]);
            return;
        }

        const booksData = data.docs.map(doc => {
            const title = doc.title || 'Без названия';
            const author = doc.author_name ? doc.author_name[0] : 'Неизвестный автор';
            const year = doc.first_publish_year || doc.publish_year?.[0] || '—';
            const isbn = doc.isbn ? doc.isbn[0] : null;
            let coverUrl = '';
            if (isbn) {
                coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
            }
            return {
                title: title,
                author_name: [author],
                first_publish_year: String(year),
                coverUrl: coverUrl,
                isbn: isbn
            };
        });

        renderOpenLibraryResults(booksData);
    } catch (error) {
        console.error('Open Library API error:', error);
        hideLoader();
        alert('Не удалось загрузить книги. Попробуйте позже.');
    }
}

function renderOpenLibraryResults(booksData) {
    const container = document.getElementById('openLibraryResults');
    if (!container) return;

    if (booksData.length === 0) {
        container.innerHTML = '<p style="color: var(--text-light); padding: 20px; text-align: center;">📚 Книги не найдены. Попробуйте другой запрос.</p>';
        return;
    }

    let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">';

    booksData.forEach(book => {
        const title = book.title || 'Без названия';
        const author = book.author_name?.[0] || 'Неизвестный автор';
        const year = book.first_publish_year || '—';
        const coverUrl = book.coverUrl || '';

        html += `
            <div class="book-card" style="flex-direction: column; margin: 0;">
                <div class="book-card__cover" style="flex: 0 0 160px; width: 100%;">
                    ${coverUrl 
                        ? `<img src="${coverUrl}" alt="${title}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'">`
                        : `<div class="cover-placeholder" style="height: 160px;">
                            <i class="fas fa-book"></i>
                            <span>${title.substring(0, 20)}…</span>
                           </div>`
                    }
                </div>
                <div class="book-card__info" style="padding: 16px;">
                    <h4 style="font-size: 1.2rem; margin-bottom: 4px;">${title}</h4>
                    <p style="color: var(--gold); margin-bottom: 8px;">${author}</p>
                    <p style="color: var(--text-light); font-size: 0.9rem;">Год: ${year}</p>
                    <button class="btn btn--primary import-openlibrary-btn" 
                            style="margin-top: 12px; padding: 8px 16px; font-size: 0.9rem;"
                            data-title="${title.replace(/"/g, '&quot;')}"
                            data-author="${author.replace(/"/g, '&quot;')}">
                        <i class="fas fa-plus"></i> Импортировать
                    </button>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;

    document.querySelectorAll('.import-openlibrary-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('bookTitle').value = this.dataset.title;
            document.getElementById('bookAuthor').value = this.dataset.author;
            document.getElementById('bookFirstLine').value = '';
            document.getElementById('bookLastLine').value = '';
            document.querySelector('.add-book__form').scrollIntoView({ behavior: 'smooth' });
            alert(`Книга "${this.dataset.title}" загружена! Теперь добавьте первую и последнюю строку.`);
        });
    });
}

let openLibrarySearchInitialized = false;
function initOpenLibrarySearch() {
    if (openLibrarySearchInitialized) return;
    const searchBtn = document.getElementById('openLibrarySearchBtn');
    const searchInput = document.getElementById('openLibrarySearchInput');
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => searchOpenLibrary(searchInput.value));
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); searchOpenLibrary(searchInput.value); }
        });
        openLibrarySearchInitialized = true;
    }
}

// ========== ЯНДЕКС ДИСК (резерв) ==========
const YANDEX_CLIENT_ID = 'b70d7d5e83b54b619990ef527def50e8';
const YANDEX_APP_FOLDER = 'app:/spoilery_backup/';
const YANDEX_BACKUP_FILE = 'my_books.json';

async function getYandexToken() {
    return new Promise((resolve, reject) => {
        const redirectUri = encodeURIComponent('https://kotkitkat.github.io/book.line/yandex-callback.html');
        const authUrl = `https://oauth.yandex.ru/authorize?response_type=token&client_id=${YANDEX_CLIENT_ID}&redirect_uri=${redirectUri}`;
        const authWindow = window.open(authUrl, 'authWindow', 'width=600,height=600');
        function handleMessage(event) {
            if (event.origin === 'https://kotkitkat.github.io' || event.origin === window.location.origin) {
                if (event.data && event.data.type === 'yandex-token') {
                    window.removeEventListener('message', handleMessage);
                    authWindow.close();
                    resolve(event.data.token);
                }
            }
        }
        window.addEventListener('message', handleMessage);
        const checkClosed = setInterval(() => {
            if (authWindow.closed) {
                clearInterval(checkClosed);
                window.removeEventListener('message', handleMessage);
                reject('Окно авторизации закрыто');
            }
        }, 500);
    });
}

async function saveToYandexDisk() {
    showLoader();
    try {
        let token = localStorage.getItem('yandex_token');
        if (!token) {
            token = await getYandexToken();
            if (token) localStorage.setItem('yandex_token', token);
        }
        const backupData = JSON.stringify(books, null, 2);
        const blob = new Blob([backupData], { type: 'application/json' });
        await fetch(`https://cloud-api.yandex.net/v1/disk/resources?path=${encodeURIComponent(YANDEX_APP_FOLDER)}`, {
            method: 'PUT', headers: { 'Authorization': `OAuth ${token}` }
        }).catch(() => {});
        const uploadUrlResponse = await fetch(
            `https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(YANDEX_APP_FOLDER + YANDEX_BACKUP_FILE)}&overwrite=true`,
            { headers: { 'Authorization': `OAuth ${token}` } }
        );
        const uploadData = await uploadUrlResponse.json();
        const uploadResponse = await fetch(uploadData.href, { method: 'PUT', body: blob });
        if (uploadResponse.ok) alert('✅ Данные успешно сохранены на Яндекс Диск!');
        else throw new Error('Ошибка при загрузке файла');
    } catch (error) {
        console.error('Ошибка Яндекс Диска:', error);
        alert('❌ Не удалось сохранить данные на Яндекс Диск');
    } finally { hideLoader(); }
}

async function loadFromYandexDisk() {
    showLoader();
    let downloadHref = null;
    try {
        let token = localStorage.getItem('yandex_token');
        if (!token) {
            token = await getYandexToken();
            if (token) localStorage.setItem('yandex_token', token);
        }
        const downloadUrlResponse = await fetch(
            `https://cloud-api.yandex.net/v1/disk/resources/download?path=${encodeURIComponent(YANDEX_APP_FOLDER + YANDEX_BACKUP_FILE)}`,
            { headers: { 'Authorization': `OAuth ${token}` } }
        );
        if (downloadUrlResponse.status === 404) {
            alert('Бекап не найден на Яндекс Диске. Сначала сохраните библиотеку.');
            hideLoader();
            return;
        }
        const downloadData = await downloadUrlResponse.json();
        downloadHref = downloadData.href;
        const proxy = 'https://api.codetabs.com/v1/proxy?quest=';
        let fileContent = null;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            const proxyResponse = await fetch(proxy + encodeURIComponent(downloadHref), { signal: controller.signal });
            clearTimeout(timeoutId);
            if (proxyResponse.ok) fileContent = await proxyResponse.json();
        } catch (err) {
            console.warn('Прокси не сработал:', err.message);
        }
        if (fileContent === null) {
            hideLoader();
            const userChoice = confirm('Не удалось автоматически загрузить данные с Яндекс.Диска.\nХотите скачать файл вручную и затем загрузить его через кнопку "Загрузить из файла"?');
            if (userChoice) {
                const link = document.createElement('a');
                link.href = downloadHref;
                link.download = YANDEX_BACKUP_FILE;
                link.click();
            }
            return;
        }
        books = fileContent;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
        alert('✅ Данные успешно загружены с Яндекс Диска!');
        updateUI();
    } catch (error) {
        console.error('Ошибка загрузки с Яндекс Диска:', error);
        if (downloadHref) {
            const userChoice = confirm('Произошла ошибка при автоматической загрузке.\nХотите скачать файл вручную?');
            if (userChoice) {
                const link = document.createElement('a');
                link.href = downloadHref;
                link.download = YANDEX_BACKUP_FILE;
                link.click();
            }
        } else {
            alert('❌ Не удалось подключиться к Яндекс.Диску. Проверьте авторизацию.');
        }
    } finally { hideLoader(); }
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', async function() {
    showLoader();
    await loadBooksFromFirestore();
    
    initBurger();
    
    if (document.getElementById('reviewModal')) initReviewModal();
    if (document.getElementById('editModal')) initEditModal();
    if (document.getElementById('quoteModal')) initQuoteModal();
    if (document.getElementById('quotesModal')) initQuotesModal();
    
    if (document.getElementById('booksContainer')) {
        updateAuthorFilterOptions();
        initFiltersAndSort();
        renderBooks();
    }
    if (document.getElementById('shelfContainer')) {
        renderShelf();
    }
    if (document.getElementById('addBookForm')) {
        initAddBookForm();
    }
    
    // Инициализация поиска через Open Library (вместо Google Books)
    initOpenLibrarySearch();
    
    initNavLoader();
    
    const saveYandexBtn = document.getElementById('saveToYandexBtn');
    const loadYandexBtn = document.getElementById('loadFromYandexBtn');
    if (saveYandexBtn) saveYandexBtn.addEventListener('click', saveToYandexDisk);
    if (loadYandexBtn) loadYandexBtn.addEventListener('click', loadFromYandexDisk);
    document.getElementById('importFromFileBtn')?.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const importedBooks = JSON.parse(event.target.result);
                    books = importedBooks;
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
                    for (const book of books) {
                        await db.collection('books').doc(book.id).set(book);
                    }
                    alert('✅ Данные успешно загружены из файла!');
                    updateUI();
                } catch (error) {
                    alert('❌ Ошибка при чтении файла. Убедитесь, что это правильный JSON.');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    });

    setTimeout(hideLoader, 300);
});

window.addEventListener('pageshow', hideLoader);