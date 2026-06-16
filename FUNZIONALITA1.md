# Liberiamo la mente — Funzionalità della piattaforma
> Aggiornato al 2026-06-09

---

## UTENTI

### Accesso
- Registrazione con email (conferma via mail con template Anthea Delori)
- Login con email/password
- Accesso come ospite (anonimo) — lettura senza account
- 4 opzioni nella pagina auth: Lettore, Autore, Accedi, Ospite

### Profilo
- Pseudonimo, nome, cognome
- Profilo autore (bio, link, ecc.)
- Lingua preferita (per email multilingua: it/en/de/fr/es)

---

## CATALOGO

- Lista libri disponibili (gratuiti + riservati per utenti autorizzati)
- Filtri per genere, anno, tag, autore, accesso
- Ordinamento per letture, recenti, anno, rating
- Ricerca per titolo/tag
- Collane (raggruppamento opere)
- Esclusione automatica dei Libri Aperti (hanno sezione dedicata)
- Email normalizzata a lowercase per accesso libri riservati

---

## READER (`/leggi/$slug`)

- Reader a capitoli con navigazione
- Segnalibro automatico (riprende dall'ultimo capitolo letto)
- Visualizzatore fumetti (ComicViewer)
- Download PDF, EPUB, MOBI
- Allegati extra per opera
- Redirect automatico a `/libri-aperti/$slug` se il libro è "open"

---

## LIBRI APERTI (`/libri-aperti`)

- Lista opere in scrittura (status = "open") con badge "IN SCRITTURA"
- Contatore capitoli pubblicati
- Pagina dettaglio con tutti i capitoli pubblicati
- Testo capitoli renderizzato come HTML
- Pulsante **SEGUI** — salva iscrizione in `open_book_subscriptions`
- Email automatica al lettore ad ogni nuovo capitolo (via Resend + template `nuovo_capitolo`)
- Notifica con logo Anthea Delori, stile caldo/oro

---

## CESTINO DEGLI SCRITTI PERDUTI (`/cestino`)

- Libri cestinati dall'autore ma recuperabili dalla community
- Sistema di voto (1-5 stelle) per richiedere il recupero
- Voto disponibile solo a utenti registrati (ospiti vedono CTA registrazione)
- Tooltip su voto già registrato
- Filtro voti (0-4) invece del filtro autore
- Voto tracciato per userId (loggati) o visitorId (anonimi)

---

## COMMUNITY (`/community`)

- Pagina community generale
- Pagina opera (`/community/$slug`) con recensioni
- Rating stelle (1-5), testo recensione
- Reset rating a 1 dopo submit (evita blocco)
- Notifica email all'autore per nuova recensione (via `notify-review`)

---

## LIBRERIA (`/libreria`)

- Lista personale dei libri dell'utente (da Libreria)
- Stato lettura per ogni libro

---

## AREA AUTORE (`/area-autore`)

- Dashboard con statistiche: letture, recensioni recenti
- Gestione libri aperti: capitoli pubblicati, commenti in attesa
- Pubblicazione nuovi capitoli con notifica automatica agli iscritti
- Visualizzazione iscritti per libro aperto

---

## GESTIONE OPERE (`/gestione`) — solo autori

### Creazione/modifica opera
- Metadati: titolo, sottotitolo, genere, edizione, anno, lingua, ISBN
- Accesso: gratuito / riservato / premium
- Toggle **Libro Aperto** (status open/published)
- Tipo opera: romanzo, racconto, saggio, poesia, fumetto, ecc.
- Target: tutti, adulti, young adult, bambini
- Tag personalizzati
- Descrizione, sinossi, estratto

### Copertine
- Upload copertina manuale
- Generazione AI copertina (gpt-image-1, baking)
- Copertina teca (3D), copertina rotta (cestino), lastra
- Copertina da stampa (con spina, retro, alette, ISBN, prezzo)
- Preview spread copertina stampa

### Contenuto
- Upload PDF, EPUB, MOBI, DOCX
- Conversione automatica tra formati
- Gestione capitoli (titolo, testo HTML, ordine)
- Fumetto: formato A4/A5, pagine singole o doppie

### Gestione avanzata
- Lista accesso per libri riservati (email whitelist)
- Collane: raggruppamento opere
- Edizioni multiple
- Allegati extra (file scaricabili)
- Ticket supporto
- Archiviazione, cestinazione, recupero opere
- Pubblicazione/ritiro dalla piattaforma
- Notifica nuovi capitoli ai follower al salvataggio

---

## NAVIGAZIONE

- Header con link: Home, Catalogo, Autori, Libreria, Community, Libri Aperti, Regole
- Dropdown Autori
- Area Riservata (login) / ESCI (logout)
- Indicatore "CESTINO DEGLI SCRITTI PERDUTI" in alto a destra
- Barra status cyberpunk (SYS:ONLINE, NODE, SECTOR, UPLINK, PROTOCOL)
- Rilevamento lingua browser con modal suggerimento

---

## INFRASTRUTTURA

### Stack
- Frontend: React + TanStack Router + Vite + Tailwind
- Backend: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- Email: Resend
- Deploy: Netlify/Vercel (CI da GitHub push)
- Dominio: liberiamo2076.com

### Edge Functions (Supabase)
- `notify-review` — email autore per nuova recensione
- `notify-new-chapter` — email lettori iscritti per nuovo capitolo
- `notify-book-published` — notifica pubblicazione libro
- `notify-open-comment` — notifica commento su capitolo aperto
- `generate-cover` — generazione copertina AI
- `generate-full-cover` — copertina da stampa AI
- `generate-pdf` — conversione PDF
- `moderate-content` — moderazione contenuti
- `send-email` — invio generico
- `send-newsletter` — newsletter
- `cleanup-covers` — pulizia copertine orfane

### DB — tabelle principali
- `books` (status, disponibile, cestinato, accesso, collana_id, author_id)
- `capitoli` (book_id, ordine, titolo, testo)
- `profiles`, `book_access_list`, `libreria`
- `recensioni`, `recensioni_risposte`
- `collane`, `edizioni`, `allegati`
- `open_book_subscriptions`, `open_book_comments`, `open_book_chapters`
- `email_templates` (tipo, lingua, oggetto, corpo_html)
- `ai_cover_attempts`, `book_conversions`

### Costi fissi
- ~€43/mese (Supabase Pro + Resend + dominio)

---

## MONETIZZAZIONE (prevista)

- Prima opera gratuita per l'autore
- Quota annuale €12 per pubblicare opere successive
- Quota mantenimento per autori inattivi — **decisione aperta**, da rivalutare con utenza reale
